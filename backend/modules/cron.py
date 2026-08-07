"""
S Panel - Cron Job Management Module
"""

import subprocess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/cron", tags=["cron"])


def _run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


class CronJob(BaseModel):
    minute: str = "*"
    hour: str = "*"
    day: str = "*"
    month: str = "*"
    weekday: str = "*"
    command: str
    user: str = "root"
    description: str = ""


class CronJobUpdate(BaseModel):
    old_line: str
    new_line: str
    user: str = "root"


@router.get("/")
async def list_cron_jobs(current_user=Depends(get_current_user)):
    """List all cron jobs."""
    jobs = []

    # Get cron jobs for common users
    for user in ["root", "www-data", "shubh"]:
        result = _run_cmd(f"sudo crontab -u {user} -l 2>/dev/null")
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(None, 5)
                    if len(parts) >= 6:
                        jobs.append({
                            "user": user,
                            "minute": parts[0],
                            "hour": parts[1],
                            "day": parts[2],
                            "month": parts[3],
                            "weekday": parts[4],
                            "command": parts[5],
                            "schedule": f"{parts[0]} {parts[1]} {parts[2]} {parts[3]} {parts[4]}",
                            "raw": line
                        })

    # System cron files
    result = _run_cmd("ls /etc/cron.d/ 2>/dev/null")
    if result.returncode == 0:
        for f in result.stdout.strip().split('\n'):
            if f:
                jobs.append({
                    "user": "system",
                    "command": f"/etc/cron.d/{f}",
                    "schedule": "system",
                    "type": "system_file"
                })

    return jobs


@router.post("/")
async def add_cron_job(body: CronJob, current_user=Depends(get_current_user)):
    """Add a new cron job."""
    schedule = f"{body.minute} {body.hour} {body.day} {body.month} {body.weekday}"
    cron_line = f"{schedule} {body.command}"

    if body.description:
        cron_line = f"# {body.description}\n{cron_line}"

    # Get existing crontab and append
    result = _run_cmd(f"sudo crontab -u {body.user} -l 2>/dev/null")
    existing = result.stdout if result.returncode == 0 else ""

    new_crontab = existing.rstrip() + "\n" + cron_line + "\n"

    # Write new crontab
    result = _run_cmd(f"echo '{new_crontab}' | sudo crontab -u {body.user} -")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    return {"message": "Cron job added", "schedule": schedule, "command": body.command}


@router.delete("/")
async def delete_cron_job(
    line: str,
    user: str = "root",
    current_user=Depends(get_current_user)
):
    """Delete a cron job by its line content."""
    result = _run_cmd(f"sudo crontab -u {user} -l 2>/dev/null")
    if result.returncode != 0:
        raise HTTPException(status_code=404, detail="No crontab found")

    lines = result.stdout.strip().split('\n')
    new_lines = [l for l in lines if l.strip() != line.strip()]

    new_crontab = '\n'.join(new_lines) + '\n'
    result = _run_cmd(f"echo '{new_crontab}' | sudo crontab -u {user} -")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    return {"message": "Cron job deleted"}
