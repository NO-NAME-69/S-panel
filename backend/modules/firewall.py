"""
S Panel - Firewall Management Module
UFW firewall rule management.
"""

import subprocess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/firewall", tags=["firewall"])


def _run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


class FirewallRule(BaseModel):
    port: str  # e.g., "80", "443", "8080/tcp", "3000:3100"
    action: str = "allow"  # allow or deny
    direction: str = "in"  # in or out
    from_ip: str = ""  # e.g., "192.168.1.0/24"
    comment: str = ""


@router.get("/status")
async def firewall_status(current_user=Depends(get_current_user)):
    """Get firewall status."""
    # Check if ufw is installed
    result = _run_cmd("which ufw")
    if result.returncode != 0:
        return {"installed": False, "active": False, "rules": []}

    # Get status
    result = _run_cmd("sudo ufw status verbose")
    output = result.stdout

    active = "Status: active" in output

    return {
        "installed": True,
        "active": active,
        "output": output
    }


@router.get("/rules")
async def list_rules(current_user=Depends(get_current_user)):
    """List all firewall rules."""
    result = _run_cmd("sudo ufw status numbered")
    if result.returncode != 0:
        return []

    rules = []
    for line in result.stdout.strip().split('\n'):
        line = line.strip()
        if line.startswith('['):
            # Parse rule: [ 1] 80/tcp ALLOW IN Anywhere
            try:
                bracket_end = line.index(']')
                number = line[1:bracket_end].strip()
                rest = line[bracket_end + 1:].strip()
                parts = rest.split()
                if len(parts) >= 3:
                    rules.append({
                        "number": int(number),
                        "port": parts[0],
                        "action": parts[1],
                        "direction": parts[2] if len(parts) > 2 else "IN",
                        "from": parts[3] if len(parts) > 3 else "Anywhere",
                        "raw": rest
                    })
            except (ValueError, IndexError):
                pass

    return rules


@router.post("/rules")
async def add_rule(body: FirewallRule, current_user=Depends(get_current_user)):
    """Add a firewall rule."""
    cmd = f"sudo ufw {body.action}"
    if body.direction:
        cmd += f" {body.direction}"
    if body.from_ip:
        cmd += f" from {body.from_ip}"
    cmd += f" to any port {body.port}"
    if body.comment:
        cmd += f" comment '{body.comment}'"

    result = _run_cmd(cmd)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Rule added: {body.action} {body.port}"}


@router.delete("/rules/{number}")
async def delete_rule(number: int, current_user=Depends(get_current_user)):
    """Delete a firewall rule by number."""
    result = _run_cmd(f"echo 'y' | sudo ufw delete {number}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Rule {number} deleted"}


@router.post("/enable")
async def enable_firewall(current_user=Depends(get_current_user)):
    """Enable the firewall."""
    # First allow the panel port to not lock ourselves out
    _run_cmd("sudo ufw allow 8888/tcp comment 'S Panel'")
    _run_cmd("sudo ufw allow 22/tcp comment 'SSH'")

    result = _run_cmd("echo 'y' | sudo ufw enable")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": "Firewall enabled"}


@router.post("/disable")
async def disable_firewall(current_user=Depends(get_current_user)):
    """Disable the firewall."""
    result = _run_cmd("sudo ufw disable")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": "Firewall disabled"}


@router.post("/reset")
async def reset_firewall(current_user=Depends(get_current_user)):
    """Reset firewall to defaults."""
    result = _run_cmd("echo 'y' | sudo ufw reset")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": "Firewall reset to defaults"}
