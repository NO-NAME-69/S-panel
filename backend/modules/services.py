"""
S Panel - Service Management Module
Systemd service management.
"""

import subprocess
from fastapi import APIRouter, Depends, HTTPException, Query
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/services", tags=["services"])


def _run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


# Common services to track
TRACKED_SERVICES = [
    "nginx", "apache2", "mysql", "mariadb", "postgresql",
    "mongod", "redis-server", "docker",
    "php8.3-fpm", "php8.2-fpm", "php8.1-fpm",
    "ssh", "cron", "ufw", "fail2ban",
    "supervisor", "pm2-root"
]


@router.get("/")
async def list_services(
    all_services: bool = Query(default=False, alias="all"),
    current_user=Depends(get_current_user)
):
    """List system services."""
    if all_services:
        # List all services
        result = _run_cmd(
            "systemctl list-units --type=service --all --no-pager --plain --no-legend"
        )
        if result.returncode != 0:
            return []

        services = []
        for line in result.stdout.strip().split('\n'):
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 4:
                name = parts[0].replace('.service', '')
                services.append({
                    "name": name,
                    "load": parts[1],
                    "active": parts[2],
                    "sub": parts[3],
                    "description": ' '.join(parts[4:]) if len(parts) > 4 else ""
                })
        return services
    else:
        # Return tracked services with status
        services = []
        for svc in TRACKED_SERVICES:
            result = _run_cmd(f"systemctl is-active {svc} 2>/dev/null")
            active = result.stdout.strip()
            
            # Special case for UFW: systemctl reports active even if firewall is disabled
            if svc == "ufw":
                ufw_status = _run_cmd("sudo ufw status")
                if "Status: inactive" in ufw_status.stdout:
                    active = "inactive"
            
            if active in ['active', 'inactive', 'failed', 'activating', 'deactivating']:
                # Get enabled status
                enabled_result = _run_cmd(f"systemctl is-enabled {svc} 2>/dev/null")
                enabled = enabled_result.stdout.strip()

                services.append({
                    "name": svc,
                    "active": active,
                    "enabled": enabled == "enabled",
                    "running": active == "active"
                })
        return services


@router.post("/{name}/start")
async def start_service(name: str, current_user=Depends(get_current_user)):
    """Start a service."""
    result = _run_cmd(f"sudo systemctl start {name}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Service {name} started"}


@router.post("/{name}/stop")
async def stop_service(name: str, current_user=Depends(get_current_user)):
    """Stop a service."""
    result = _run_cmd(f"sudo systemctl stop {name}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Service {name} stopped"}


@router.post("/{name}/restart")
async def restart_service(name: str, current_user=Depends(get_current_user)):
    """Restart a service."""
    result = _run_cmd(f"sudo systemctl restart {name}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Service {name} restarted"}


@router.post("/{name}/enable")
async def enable_service(name: str, current_user=Depends(get_current_user)):
    """Enable a service to start on boot."""
    result = _run_cmd(f"sudo systemctl enable {name}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Service {name} enabled"}


@router.post("/{name}/disable")
async def disable_service(name: str, current_user=Depends(get_current_user)):
    """Disable a service from starting on boot."""
    result = _run_cmd(f"sudo systemctl disable {name}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Service {name} disabled"}


@router.get("/{name}/logs")
async def get_service_logs(
    name: str,
    lines: int = Query(default=100),
    current_user=Depends(get_current_user)
):
    """Get service logs from journalctl."""
    result = _run_cmd(f"sudo journalctl -u {name} -n {lines} --no-pager")
    if result.returncode != 0:
        return {"logs": result.stderr or "No logs available"}
    return {"logs": result.stdout}


@router.get("/{name}/status")
async def get_service_status(name: str, current_user=Depends(get_current_user)):
    """Get detailed service status."""
    result = _run_cmd(f"systemctl status {name} --no-pager")
    return {
        "name": name,
        "output": result.stdout,
        "active": "active (running)" in result.stdout
    }
