"""
S Panel - System Monitoring Module
CPU, RAM, Disk, Network stats with real-time streaming.
"""

import asyncio
import json
import platform
import time
from datetime import datetime, timezone

import psutil
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from auth.middleware import get_current_user

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/info")
async def get_system_info(current_user=Depends(get_current_user)):
    """Get static system information."""
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    uptime_seconds = time.time() - psutil.boot_time()

    days = int(uptime_seconds // 86400)
    hours = int((uptime_seconds % 86400) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)

    return {
        "hostname": platform.node(),
        "os": f"{platform.system()} {platform.release()}",
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor() or "Unknown",
        "python_version": platform.python_version(),
        "boot_time": boot_time.isoformat(),
        "uptime": f"{days}d {hours}h {minutes}m",
        "uptime_seconds": int(uptime_seconds),
        "cpu_count": psutil.cpu_count(),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "total_memory": psutil.virtual_memory().total,
        "total_swap": psutil.swap_memory().total,
    }


@router.get("/stats")
async def get_system_stats(current_user=Depends(get_current_user)):
    """Get current system resource usage."""
    cpu_percent = psutil.cpu_percent(interval=0.5, percpu=True)
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()

    # Top processes
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
        try:
            info = proc.info
            if info['cpu_percent'] is not None and info['cpu_percent'] > 0:
                processes.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)

    return {
        "cpu": {
            "percent": sum(cpu_percent) / len(cpu_percent) if cpu_percent else 0,
            "per_cpu": cpu_percent,
            "count": len(cpu_percent)
        },
        "memory": {
            "total": memory.total,
            "used": memory.used,
            "available": memory.available,
            "percent": memory.percent,
            "cached": getattr(memory, 'cached', 0),
            "buffers": getattr(memory, 'buffers', 0)
        },
        "swap": {
            "total": swap.total,
            "used": swap.used,
            "free": swap.free,
            "percent": swap.percent
        },
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        },
        "network": {
            "bytes_sent": net.bytes_sent,
            "bytes_recv": net.bytes_recv,
            "packets_sent": net.packets_sent,
            "packets_recv": net.packets_recv
        },
        "top_processes": processes[:10],
        "load_average": list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else [0, 0, 0],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/stats/stream")
async def stream_stats(current_user=Depends(get_current_user)):
    """Server-Sent Events stream for real-time stats."""
    async def generate():
        prev_net = psutil.net_io_counters()
        while True:
            cpu_percent = psutil.cpu_percent(interval=0)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            net = psutil.net_io_counters()

            # Calculate network speed
            net_sent_speed = net.bytes_sent - prev_net.bytes_sent
            net_recv_speed = net.bytes_recv - prev_net.bytes_recv
            prev_net = net

            data = {
                "cpu": round(cpu_percent, 1),
                "memory": round(memory.percent, 1),
                "memory_used": memory.used,
                "memory_total": memory.total,
                "disk": round(disk.percent, 1),
                "disk_used": disk.used,
                "disk_total": disk.total,
                "net_sent": net_sent_speed,
                "net_recv": net_recv_speed,
                "net_total_sent": net.bytes_sent,
                "net_total_recv": net.bytes_recv,
                "load": list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else [0, 0, 0],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/processes")
async def get_processes(current_user=Depends(get_current_user)):
    """Get all running processes."""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent',
                                       'status', 'create_time', 'cmdline']):
        try:
            info = proc.info
            info['memory_rss'] = proc.memory_info().rss
            processes.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    return processes


@router.post("/processes/{pid}/kill")
async def kill_process(pid: int, current_user=Depends(get_current_user)):
    """Kill a process by PID."""
    try:
        proc = psutil.Process(pid)
        proc.terminate()
        return {"message": f"Process {pid} terminated"}
    except psutil.NoSuchProcess:
        return {"error": f"Process {pid} not found"}
    except psutil.AccessDenied:
        return {"error": f"Permission denied to kill process {pid}"}
