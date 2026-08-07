"""
S Panel - Software Store Module
Install/uninstall server software via apt.
"""

import asyncio
import json
import subprocess
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from auth.middleware import get_current_user, get_current_user_ws
from config import SOFTWARE_CATALOG

router = APIRouter(prefix="/api/software", tags=["software"])


def _run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


def _is_installed(package: str) -> bool:
    """Check if a package is installed."""
    result = _run_cmd(f"dpkg -l {package} 2>/dev/null | grep '^ii'")
    return result.returncode == 0 and bool(result.stdout.strip())


def _get_version(package: str) -> str:
    """Get installed package version."""
    result = _run_cmd(f"dpkg -l {package} 2>/dev/null | grep '^ii' | awk '{{print $3}}'")
    return result.stdout.strip() if result.returncode == 0 else ""


@router.get("/catalog")
async def get_catalog(current_user=Depends(get_current_user)):
    """Get the software catalog with installation status."""
    catalog = []
    for key, info in SOFTWARE_CATALOG.items():
        installed = _is_installed(info["package"])
        version = _get_version(info["package"]) if installed else ""
        running = False

        if installed and info.get("service"):
            result = _run_cmd(f"systemctl is-active {info['service']} 2>/dev/null")
            running = result.stdout.strip() == "active"

        catalog.append({
            "id": key,
            **info,
            "installed": installed,
            "version": version,
            "running": running
        })

    return catalog


class InstallRequest(BaseModel):
    software_id: str


@router.post("/install")
async def install_software(body: InstallRequest, current_user=Depends(get_current_user)):
    """Install a software package."""
    if body.software_id not in SOFTWARE_CATALOG:
        raise HTTPException(status_code=404, detail="Software not found in catalog")

    info = SOFTWARE_CATALOG[body.software_id]
    package = info["package"]

    # Special installation procedures for certain software
    if body.software_id == "nodejs":
        # Use NodeSource for latest LTS
        result = _run_cmd(
            "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && "
            "sudo apt-get install -y nodejs"
        )
    elif body.software_id == "mongodb":
        # MongoDB requires special repo
        result = _run_cmd(
            "curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | "
            "sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg && "
            "echo 'deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] "
            "https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse' | "
            "sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list && "
            "sudo apt-get update && sudo apt-get install -y mongodb-org"
        )
    elif body.software_id == "docker":
        result = _run_cmd(
            "sudo apt-get update && sudo apt-get install -y docker.io && "
            "sudo systemctl enable docker && sudo systemctl start docker && "
            "sudo usermod -aG docker $USER"
        )
    else:
        result = _run_cmd(f"sudo apt-get update && sudo apt-get install -y {package}")

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Installation failed: {result.stderr}")

    # Start service if applicable
    if info.get("service"):
        _run_cmd(f"sudo systemctl enable {info['service']}")
        _run_cmd(f"sudo systemctl start {info['service']}")

    return {"message": f"{info['name']} installed successfully"}


@router.post("/uninstall")
async def uninstall_software(body: InstallRequest, current_user=Depends(get_current_user)):
    """Uninstall a software package."""
    if body.software_id not in SOFTWARE_CATALOG:
        raise HTTPException(status_code=404, detail="Software not found in catalog")

    info = SOFTWARE_CATALOG[body.software_id]
    package = info["package"]

    # Stop service first
    if info.get("service"):
        _run_cmd(f"sudo systemctl stop {info['service']}")
        _run_cmd(f"sudo systemctl disable {info['service']}")

    result = _run_cmd(f"sudo apt-get remove -y {package}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Uninstall failed: {result.stderr}")

    return {"message": f"{info['name']} uninstalled successfully"}


@router.websocket("/install/ws")
async def install_stream(websocket: WebSocket, software_id: str = "", token: str = ""):
    """WebSocket endpoint for streaming installation progress."""
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    if software_id not in SOFTWARE_CATALOG:
        await websocket.close(code=4004, reason="Software not found")
        return

    try:
        await websocket.accept()
        connected = True
    except Exception:
        return

    info = SOFTWARE_CATALOG[software_id]
    package = info["package"]

    try:
        if connected:
            try:
                await websocket.send_json({"status": "starting", "message": f"Installing {info['name']}..."})
            except Exception:
                connected = False

        if software_id == "nodejs":
            cmd = (
                "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && "
                "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs"
            )
        elif software_id == "mongodb":
            cmd = (
                "curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | "
                "sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg --yes && "
                "echo 'deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] "
                "https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse' | "
                "sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list && "
                "sudo DEBIAN_FRONTEND=noninteractive apt-get update && "
                "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org"
            )
        elif software_id == "docker":
            cmd = (
                "sudo DEBIAN_FRONTEND=noninteractive apt-get update && "
                "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io && "
                "sudo systemctl enable docker && sudo systemctl start docker && "
                "sudo usermod -aG docker $USER"
            )
        else:
            cmd = f"sudo DEBIAN_FRONTEND=noninteractive apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y {package}"

        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )

        while True:
            line = await process.stdout.readline()
            if not line:
                break
            if connected:
                try:
                    await websocket.send_json({
                        "status": "progress",
                        "message": line.decode('utf-8', errors='replace').strip()
                    })
                except Exception:
                    connected = False  # Stop trying to send, but keep reading stdout

        await process.wait()

        if process.returncode == 0:
            if info.get("service"):
                _run_cmd(f"sudo systemctl enable {info['service']}")
                _run_cmd(f"sudo systemctl start {info['service']}")
            if connected:
                try:
                    await websocket.send_json({"status": "complete", "message": f"{info['name']} installed successfully"})
                except Exception:
                    pass
        else:
            if connected:
                try:
                    await websocket.send_json({"status": "error", "message": "Installation failed"})
                except Exception:
                    pass

    finally:
        if connected:
            try:
                await websocket.close()
            except Exception:
                pass
