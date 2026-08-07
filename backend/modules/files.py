"""
S Panel - File Manager Module
Browse, read, write, upload, and manage files.
"""

import os
import shutil
import stat
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel

from auth.middleware import get_current_user
from config import FILE_MANAGER_ROOT, MAX_UPLOAD_SIZE

router = APIRouter(prefix="/api/files", tags=["files"])


class FileWriteRequest(BaseModel):
    path: str
    content: str


class FileActionRequest(BaseModel):
    path: str
    destination: str = ""


class CreateRequest(BaseModel):
    path: str
    is_directory: bool = False


class RenameRequest(BaseModel):
    path: str
    new_name: str


class PermissionRequest(BaseModel):
    path: str
    mode: str  # e.g., "755"


def _get_file_info(filepath: str) -> dict:
    """Get detailed file information."""
    try:
        st = os.stat(filepath)
        is_dir = os.path.isdir(filepath)
        return {
            "name": os.path.basename(filepath),
            "path": filepath,
            "is_directory": is_dir,
            "size": st.st_size if not is_dir else 0,
            "modified": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
            "created": datetime.fromtimestamp(st.st_ctime, tz=timezone.utc).isoformat(),
            "permissions": stat.filemode(st.st_mode),
            "owner_uid": st.st_uid,
            "group_gid": st.st_gid,
            "is_symlink": os.path.islink(filepath),
            "extension": os.path.splitext(filepath)[1].lower() if not is_dir else "",
        }
    except (PermissionError, OSError) as e:
        return {
            "name": os.path.basename(filepath),
            "path": filepath,
            "is_directory": False,
            "size": 0,
            "error": str(e)
        }


@router.get("/list")
async def list_directory(
    path: str = Query(default="/", description="Directory path to list"),
    current_user=Depends(get_current_user)
):
    """List contents of a directory."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail=f"Not a directory: {path}")

    entries = []
    try:
        for entry in sorted(os.listdir(path)):
            full_path = os.path.join(path, entry)
            entries.append(_get_file_info(full_path))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Sort: directories first, then files
    entries.sort(key=lambda x: (not x.get("is_directory", False), x.get("name", "").lower()))

    return {
        "path": path,
        "parent": os.path.dirname(path) if path != "/" else None,
        "entries": entries,
        "total": len(entries)
    }


@router.get("/read")
async def read_file(
    path: str = Query(description="File path to read"),
    current_user=Depends(get_current_user)
):
    """Read file contents."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    if os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Path is a directory")

    # Check file size (limit to 10MB for reading)
    if os.path.getsize(path) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large to read (max 10MB)")

    try:
        with open(path, 'r', errors='replace') as f:
            content = f.read()
        return {"path": path, "content": content, "info": _get_file_info(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/write")
async def write_file(body: FileWriteRequest, current_user=Depends(get_current_user)):
    """Write content to a file."""
    try:
        # Use sudo tee for permission handling
        result = subprocess.run(
            ["sudo", "tee", body.path],
            input=body.content,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr)
        return {"message": "File saved", "path": body.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    path: str = Query(description="Target directory"),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    """Upload a file to the server."""
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Target path is not a directory")

    target = os.path.join(path, file.filename)

    try:
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="File too large")

        # Write via temp file then sudo mv
        temp_path = f"/tmp/spanel_upload_{file.filename}"
        with open(temp_path, 'wb') as f:
            f.write(content)

        subprocess.run(["sudo", "mv", temp_path, target], check=True)
        return {"message": "File uploaded", "path": target}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_file_or_dir(body: CreateRequest, current_user=Depends(get_current_user)):
    """Create a new file or directory."""
    if os.path.exists(body.path):
        raise HTTPException(status_code=400, detail="Path already exists")

    try:
        if body.is_directory:
            subprocess.run(["sudo", "mkdir", "-p", body.path], check=True)
        else:
            subprocess.run(["sudo", "touch", body.path], check=True)
        return {"message": "Created successfully", "path": body.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_file(
    path: str = Query(description="Path to delete"),
    current_user=Depends(get_current_user)
):
    """Delete a file or directory."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Path not found")
    if path in ['/', '/root', '/home', '/etc', '/var', '/usr', '/bin', '/sbin']:
        raise HTTPException(status_code=400, detail="Cannot delete system directory")

    try:
        subprocess.run(["sudo", "rm", "-rf", path], check=True)
        return {"message": "Deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename")
async def rename_file(body: RenameRequest, current_user=Depends(get_current_user)):
    """Rename a file or directory."""
    if not os.path.exists(body.path):
        raise HTTPException(status_code=404, detail="Path not found")

    new_path = os.path.join(os.path.dirname(body.path), body.new_name)
    try:
        subprocess.run(["sudo", "mv", body.path, new_path], check=True)
        return {"message": "Renamed successfully", "new_path": new_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/copy")
async def copy_file(body: FileActionRequest, current_user=Depends(get_current_user)):
    """Copy a file or directory."""
    if not os.path.exists(body.path):
        raise HTTPException(status_code=404, detail="Source not found")
    try:
        subprocess.run(["sudo", "cp", "-r", body.path, body.destination], check=True)
        return {"message": "Copied successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compress")
async def compress_files(body: FileActionRequest, current_user=Depends(get_current_user)):
    """Compress a file or directory."""
    if not os.path.exists(body.path):
        raise HTTPException(status_code=404, detail="Path not found")

    dest = body.destination or f"{body.path}.tar.gz"
    try:
        parent = os.path.dirname(body.path)
        name = os.path.basename(body.path)
        subprocess.run(
            ["sudo", "tar", "-czf", dest, "-C", parent, name],
            check=True
        )
        return {"message": "Compressed successfully", "archive": dest}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract")
async def extract_archive(body: FileActionRequest, current_user=Depends(get_current_user)):
    """Extract an archive."""
    if not os.path.exists(body.path):
        raise HTTPException(status_code=404, detail="Archive not found")

    dest = body.destination or os.path.dirname(body.path)
    try:
        subprocess.run(["sudo", "tar", "-xzf", body.path, "-C", dest], check=True)
        return {"message": "Extracted successfully", "destination": dest}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/permissions")
async def change_permissions(body: PermissionRequest, current_user=Depends(get_current_user)):
    """Change file permissions."""
    if not os.path.exists(body.path):
        raise HTTPException(status_code=404, detail="Path not found")
    try:
        subprocess.run(["sudo", "chmod", body.mode, body.path], check=True)
        return {"message": f"Permissions changed to {body.mode}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
