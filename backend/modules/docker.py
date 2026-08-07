"""
S Panel - Docker Management Module
Container, image, volume, and network management.
"""

import json
import subprocess
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/docker", tags=["docker"])


def _run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


def _docker_installed() -> bool:
    result = _run_cmd("which docker")
    return result.returncode == 0


@router.get("/status")
async def docker_status(current_user=Depends(get_current_user)):
    """Check Docker status."""
    installed = _docker_installed()
    running = False
    version = ""

    if installed:
        result = _run_cmd("sudo docker info --format '{{.ServerVersion}}' 2>/dev/null")
        running = result.returncode == 0
        version = result.stdout.strip() if running else ""

    return {"installed": installed, "running": running, "version": version}


# --- Containers ---

@router.get("/containers")
async def list_containers(
    all_containers: bool = Query(default=True, alias="all"),
    current_user=Depends(get_current_user)
):
    """List Docker containers."""
    if not _docker_installed():
        raise HTTPException(status_code=400, detail="Docker is not installed")

    flag = "-a" if all_containers else ""
    result = _run_cmd(
        f"sudo docker ps {flag} --format '{{{{json .}}}}'"
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    containers = []
    for line in result.stdout.strip().split('\n'):
        if line:
            try:
                containers.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    return containers


@router.post("/containers/{container_id}/start")
async def start_container(container_id: str, current_user=Depends(get_current_user)):
    result = _run_cmd(f"sudo docker start {container_id}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Container {container_id} started"}


@router.post("/containers/{container_id}/stop")
async def stop_container(container_id: str, current_user=Depends(get_current_user)):
    result = _run_cmd(f"sudo docker stop {container_id}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Container {container_id} stopped"}


@router.post("/containers/{container_id}/restart")
async def restart_container(container_id: str, current_user=Depends(get_current_user)):
    result = _run_cmd(f"sudo docker restart {container_id}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Container {container_id} restarted"}


@router.delete("/containers/{container_id}")
async def remove_container(
    container_id: str,
    force: bool = Query(default=False),
    current_user=Depends(get_current_user)
):
    flag = "-f" if force else ""
    result = _run_cmd(f"sudo docker rm {flag} {container_id}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Container {container_id} removed"}


@router.get("/containers/{container_id}/logs")
async def container_logs(
    container_id: str,
    tail: int = Query(default=100),
    current_user=Depends(get_current_user)
):
    result = _run_cmd(f"sudo docker logs --tail {tail} {container_id}")
    return {"logs": result.stdout + result.stderr}


@router.get("/containers/{container_id}/stats")
async def container_stats(container_id: str, current_user=Depends(get_current_user)):
    result = _run_cmd(
        f"sudo docker stats {container_id} --no-stream --format '{{{{json .}}}}'"
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    try:
        return json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return {"raw": result.stdout}


# --- Images ---

@router.get("/images")
async def list_images(current_user=Depends(get_current_user)):
    if not _docker_installed():
        raise HTTPException(status_code=400, detail="Docker is not installed")

    result = _run_cmd("sudo docker images --format '{{json .}}'")
    images = []
    for line in result.stdout.strip().split('\n'):
        if line:
            try:
                images.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return images


class PullImage(BaseModel):
    image: str  # e.g., "nginx:latest"


@router.post("/images/pull")
async def pull_image(body: PullImage, current_user=Depends(get_current_user)):
    result = _run_cmd(f"sudo docker pull {body.image}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Image {body.image} pulled", "output": result.stdout}


@router.delete("/images/{image_id}")
async def remove_image(
    image_id: str,
    force: bool = Query(default=False),
    current_user=Depends(get_current_user)
):
    flag = "-f" if force else ""
    result = _run_cmd(f"sudo docker rmi {flag} {image_id}")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Image {image_id} removed"}


# --- Volumes ---

@router.get("/volumes")
async def list_volumes(current_user=Depends(get_current_user)):
    result = _run_cmd("sudo docker volume ls --format '{{json .}}'")
    volumes = []
    for line in result.stdout.strip().split('\n'):
        if line:
            try:
                volumes.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return volumes


# --- Networks ---

@router.get("/networks")
async def list_networks(current_user=Depends(get_current_user)):
    result = _run_cmd("sudo docker network ls --format '{{json .}}'")
    networks = []
    for line in result.stdout.strip().split('\n'):
        if line:
            try:
                networks.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return networks
