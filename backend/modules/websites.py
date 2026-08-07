"""
S Panel - Website Management Module
Nginx virtual host CRUD operations.
"""

import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.middleware import get_current_user
from database import get_db

router = APIRouter(prefix="/api/websites", tags=["websites"])

NGINX_SITES_AVAILABLE = "/etc/nginx/sites-available"
NGINX_SITES_ENABLED = "/etc/nginx/sites-enabled"
WEB_ROOT = "/var/www"


class WebsiteCreate(BaseModel):
    domain: str
    root_path: str = ""
    php_version: str = ""


class WebsiteUpdate(BaseModel):
    root_path: str = ""
    php_version: str = ""
    ssl_enabled: bool = False


def _generate_nginx_config(domain: str, root_path: str, php_version: str = "", ssl: bool = False) -> str:
    """Generate an Nginx virtual host configuration."""
    config = f"""server {{
    listen 80;
    listen [::]:80;
    server_name {domain};
    root {root_path};
    index index.html index.htm index.php;

    access_log /var/log/nginx/{domain}-access.log;
    error_log /var/log/nginx/{domain}-error.log;

    location / {{
        try_files $uri $uri/ /index.html;
    }}
"""
    if php_version:
        config += f"""
    location ~ \\.php$ {{
        fastcgi_pass unix:/run/php/php{php_version}-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }}
"""
    config += """
    location ~ /\\.ht {
        deny all;
    }
}
"""
    return config


def _run_cmd(cmd: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command with sudo."""
    return subprocess.run(
        f"sudo {cmd}", shell=True, capture_output=True, text=True, check=check
    )


@router.get("/")
async def list_websites(current_user=Depends(get_current_user), db=Depends(get_db)):
    """List all managed websites."""
    cursor = await db.execute("SELECT * FROM websites ORDER BY created_at DESC")
    rows = await cursor.fetchall()

    websites = []
    for row in rows:
        site = dict(row)
        # Check if nginx config exists and is enabled
        config_path = f"{NGINX_SITES_AVAILABLE}/{site['domain']}"
        enabled_path = f"{NGINX_SITES_ENABLED}/{site['domain']}"
        site["config_exists"] = os.path.exists(config_path)
        site["is_enabled"] = os.path.exists(enabled_path)
        websites.append(site)

    return websites


@router.post("/")
async def create_website(
    body: WebsiteCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Create a new website with Nginx configuration."""
    # Set default root path
    root_path = body.root_path or f"{WEB_ROOT}/{body.domain}"

    # Create web root directory
    try:
        _run_cmd(f"mkdir -p {root_path}")
        _run_cmd(f"chown -R www-data:www-data {root_path}")

        # Create default index.html
        default_html = f"""<!DOCTYPE html>
<html>
<head><title>Welcome to {body.domain}</title></head>
<body>
<h1>Welcome to {body.domain}</h1>
<p>This site is managed by S Panel.</p>
</body>
</html>"""
        _run_cmd(f"bash -c 'echo \"{default_html}\" > {root_path}/index.html'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create web root: {str(e)}")

    # Generate and write Nginx config
    config = _generate_nginx_config(body.domain, root_path, body.php_version)
    config_path = f"{NGINX_SITES_AVAILABLE}/{body.domain}"

    try:
        _run_cmd(f"bash -c 'cat > {config_path} << ENDOFCONFIG\n{config}\nENDOFCONFIG'")
        # Enable the site
        _run_cmd(f"ln -sf {config_path} {NGINX_SITES_ENABLED}/{body.domain}")
        # Test and reload nginx
        result = _run_cmd("nginx -t", check=False)
        if result.returncode == 0:
            _run_cmd("systemctl reload nginx", check=False)
        else:
            raise HTTPException(status_code=400, detail=f"Nginx config test failed: {result.stderr}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Nginx config: {str(e)}")

    # Save to database
    await db.execute(
        "INSERT INTO websites (domain, root_path, php_version, status) VALUES (?, ?, ?, 'active')",
        (body.domain, root_path, body.php_version)
    )
    await db.commit()

    return {"message": f"Website {body.domain} created successfully", "domain": body.domain}


@router.delete("/{domain}")
async def delete_website(
    domain: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Delete a website and its Nginx configuration."""
    _run_cmd(f"rm -f {NGINX_SITES_ENABLED}/{domain}", check=False)
    _run_cmd(f"rm -f {NGINX_SITES_AVAILABLE}/{domain}", check=False)
    _run_cmd("systemctl reload nginx", check=False)

    await db.execute("DELETE FROM websites WHERE domain = ?", (domain,))
    await db.commit()

    return {"message": f"Website {domain} deleted"}


@router.post("/{domain}/toggle")
async def toggle_website(
    domain: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Enable or disable a website."""
    enabled_path = f"{NGINX_SITES_ENABLED}/{domain}"

    if os.path.exists(enabled_path):
        _run_cmd(f"rm -f {enabled_path}", check=False)
        await db.execute("UPDATE websites SET status = 'disabled' WHERE domain = ?", (domain,))
        status = "disabled"
    else:
        config_path = f"{NGINX_SITES_AVAILABLE}/{domain}"
        _run_cmd(f"ln -sf {config_path} {enabled_path}", check=False)
        await db.execute("UPDATE websites SET status = 'active' WHERE domain = ?", (domain,))
        status = "active"

    _run_cmd("systemctl reload nginx", check=False)
    await db.commit()

    return {"message": f"Website {domain} is now {status}", "status": status}


@router.get("/{domain}/config")
async def get_website_config(domain: str, current_user=Depends(get_current_user)):
    """Get the Nginx configuration for a website."""
    config_path = f"{NGINX_SITES_AVAILABLE}/{domain}"
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Configuration not found")

    with open(config_path, 'r') as f:
        content = f.read()

    return {"config": content}
