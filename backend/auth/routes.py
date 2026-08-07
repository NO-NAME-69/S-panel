"""
S Panel - Auth Routes
Login, logout, session management endpoints.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import aiosqlite

from auth.models import (
    verify_password, get_user_by_username, record_login,
    update_login_attempts, log_activity, hash_password
)
from auth.middleware import create_access_token, get_current_user
from database import get_db
from config import LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(request: Request, body: LoginRequest, db=Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = await get_user_by_username(db, body.username)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if account is locked
    if user["locked_until"]:
        locked_until = datetime.fromisoformat(user["locked_until"])
        if datetime.now(timezone.utc) < locked_until:
            remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(
                status_code=423,
                detail=f"Account locked. Try again in {remaining} minutes."
            )

    # Verify password
    if not verify_password(body.password, user["password_hash"]):
        attempts = (user["login_attempts"] or 0) + 1
        locked_until = None

        if attempts >= LOGIN_MAX_ATTEMPTS:
            locked_until = (datetime.now(timezone.utc) + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)).isoformat()

        await update_login_attempts(db, user["id"], attempts, locked_until)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Successful login
    await record_login(db, user["id"])
    client_ip = request.client.host if request.client else "unknown"
    await log_activity(db, user["id"], "login", f"Login from {client_ip}", client_ip)

    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "is_admin": bool(user["is_admin"])
        }
    }


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    """Get current authenticated user info."""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "is_admin": bool(current_user["is_admin"]),
        "last_login": current_user["last_login"]
    }


@router.put("/password")
async def change_password(
    body: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Change the current user's password."""
    if not verify_password(body.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(body.new_password)
    await db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (new_hash, current_user["id"])
    )
    await db.commit()
    await log_activity(db, current_user["id"], "password_change", "Password changed")

    return {"message": "Password changed successfully"}


@router.get("/activity")
async def get_activity_log(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get recent activity log."""
    cursor = await db.execute(
        """
        SELECT a.*, u.username 
        FROM activity_log a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.created_at DESC 
        LIMIT ?
        """,
        (limit,)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]
