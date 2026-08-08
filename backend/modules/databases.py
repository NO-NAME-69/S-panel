"""
S Panel - Database Management Module
MySQL and MongoDB database management.
"""

import subprocess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/databases", tags=["databases"])


def _run_cmd(cmd: str, check: bool = False) -> subprocess.CompletedProcess:
    """Run a shell command."""
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)


def _is_mysql_installed() -> bool:
    """Check if MySQL is installed and running."""
    result = _run_cmd("which mysql")
    return result.returncode == 0


def _is_mongodb_installed() -> bool:
    """Check if MongoDB is installed."""
    result = _run_cmd("which mongosh || which mongo")
    return result.returncode == 0


# --- MySQL ---

class MySQLDatabaseCreate(BaseModel):
    name: str
    charset: str = "utf8mb4"
    collation: str = "utf8mb4_unicode_ci"


class MySQLUserCreate(BaseModel):
    username: str
    password: str
    database: str = ""
    host: str = "localhost"


@router.get("/mysql/status")
async def mysql_status(current_user=Depends(get_current_user)):
    """Check MySQL status."""
    installed = _is_mysql_installed()
    running = False
    if installed:
        result = _run_cmd("sudo systemctl is-active mysql")
        running = result.stdout.strip() == "active"
    return {"installed": installed, "running": running}


@router.get("/mysql/databases")
async def list_mysql_databases(current_user=Depends(get_current_user)):
    """List all MySQL databases."""
    if not _is_mysql_installed():
        raise HTTPException(status_code=400, detail="MySQL is not installed")

    result = _run_cmd("sudo mysql -e 'SHOW DATABASES;' -s -N")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    databases = [db for db in result.stdout.strip().split('\n') if db]
    db_info = []
    for db_name in databases:
        size_result = _run_cmd(
            f"sudo mysql -e \"SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = '{db_name}';\" -s -N"
        )
        size_str = size_result.stdout.strip()
        size = 0
        if size_result.returncode == 0 and size_str and size_str != 'NULL':
            try:
                size = int(size_str)
            except ValueError:
                size = 0

        tables_result = _run_cmd(
            f"sudo mysql -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{db_name}';\" -s -N"
        )
        tables_str = tables_result.stdout.strip()
        tables = 0
        if tables_result.returncode == 0 and tables_str and tables_str != 'NULL':
            try:
                tables = int(tables_str)
            except ValueError:
                tables = 0

        db_info.append({
            "name": db_name,
            "size": size,
            "tables": tables,
            "system": db_name in ['information_schema', 'mysql', 'performance_schema', 'sys']
        })

    return db_info


@router.post("/mysql/databases")
async def create_mysql_database(body: MySQLDatabaseCreate, current_user=Depends(get_current_user)):
    """Create a new MySQL database."""
    result = _run_cmd(
        f"sudo mysql -e \"CREATE DATABASE IF NOT EXISTS \\`{body.name}\\` CHARACTER SET {body.charset} COLLATE {body.collation};\""
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Database '{body.name}' created successfully"}


@router.delete("/mysql/databases/{name}")
async def delete_mysql_database(name: str, current_user=Depends(get_current_user)):
    """Delete a MySQL database."""
    if name in ['information_schema', 'mysql', 'performance_schema', 'sys']:
        raise HTTPException(status_code=400, detail="Cannot delete system database")

    result = _run_cmd(f"sudo mysql -e \"DROP DATABASE IF EXISTS \\`{name}\\`;\"")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"Database '{name}' deleted"}


@router.get("/mysql/users")
async def list_mysql_users(current_user=Depends(get_current_user)):
    """List MySQL users."""
    result = _run_cmd("sudo mysql -e \"SELECT User, Host FROM mysql.user;\" -s -N")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    users = []
    for line in result.stdout.strip().split('\n'):
        if line:
            parts = line.split('\t')
            if len(parts) >= 2:
                users.append({"username": parts[0], "host": parts[1]})
    return users


@router.post("/mysql/users")
async def create_mysql_user(body: MySQLUserCreate, current_user=Depends(get_current_user)):
    """Create a MySQL user."""
    result = _run_cmd(
        f"sudo mysql -e \"CREATE USER IF NOT EXISTS '{body.username}'@'{body.host}' IDENTIFIED BY '{body.password}';\""
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    if body.database:
        _run_cmd(
            f"sudo mysql -e \"GRANT ALL PRIVILEGES ON \\`{body.database}\\`.* TO '{body.username}'@'{body.host}'; FLUSH PRIVILEGES;\""
        )

    return {"message": f"User '{body.username}' created"}


# --- MongoDB ---

@router.get("/mongodb/status")
async def mongodb_status(current_user=Depends(get_current_user)):
    """Check MongoDB status."""
    installed = _is_mongodb_installed()
    running = False
    if installed:
        result = _run_cmd("sudo systemctl is-active mongod")
        running = result.stdout.strip() == "active"
    return {"installed": installed, "running": running}


@router.get("/mongodb/databases")
async def list_mongodb_databases(current_user=Depends(get_current_user)):
    """List MongoDB databases."""
    if not _is_mongodb_installed():
        raise HTTPException(status_code=400, detail="MongoDB is not installed")

    result = _run_cmd("mongosh --quiet --eval 'JSON.stringify(db.adminCommand({listDatabases: 1}))'")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    try:
        import json
        data = json.loads(result.stdout.strip())
        return data.get("databases", [])
    except Exception:
        return []


@router.post("/mongodb/databases")
async def create_mongodb_database(body: MySQLDatabaseCreate, current_user=Depends(get_current_user)):
    """Create a MongoDB database (creates a collection inside it)."""
    result = _run_cmd(
        f"mongosh --quiet --eval 'use {body.name}; db.createCollection(\"init\"); print(\"created\")'"
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"MongoDB database '{body.name}' created"}


@router.delete("/mongodb/databases/{name}")
async def delete_mongodb_database(name: str, current_user=Depends(get_current_user)):
    """Delete a MongoDB database."""
    result = _run_cmd(f"mongosh --quiet --eval 'use {name}; db.dropDatabase(); print(\"dropped\")'")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": f"MongoDB database '{name}' deleted"}
