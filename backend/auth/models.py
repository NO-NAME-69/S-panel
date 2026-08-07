"""
S Panel - Auth Models
User management with password hashing.
"""

from passlib.context import CryptContext
import aiosqlite
from config import DATABASE_PATH, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


async def create_default_admin():
    """Create the default admin user if it doesn't exist."""
    async with aiosqlite.connect(str(DATABASE_PATH)) as db:
        db.row_factory = aiosqlite.Row

        # Check if admin exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE username = ?",
            (DEFAULT_ADMIN_USERNAME,)
        )
        existing = await cursor.fetchone()

        if not existing:
            hashed = hash_password(DEFAULT_ADMIN_PASSWORD)
            await db.execute(
                "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)",
                (DEFAULT_ADMIN_USERNAME, hashed)
            )
            await db.commit()
            print(f"[S Panel] Default admin user '{DEFAULT_ADMIN_USERNAME}' created.")
        else:
            print(f"[S Panel] Admin user '{DEFAULT_ADMIN_USERNAME}' already exists.")


async def get_user_by_username(db, username: str):
    """Get a user by username."""
    cursor = await db.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
    )
    return await cursor.fetchone()


async def get_user_by_id(db, user_id: int):
    """Get a user by ID."""
    cursor = await db.execute(
        "SELECT * FROM users WHERE id = ?",
        (user_id,)
    )
    return await cursor.fetchone()


async def update_login_attempts(db, user_id: int, attempts: int, locked_until=None):
    """Update login attempt counter and lock status."""
    await db.execute(
        "UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?",
        (attempts, locked_until, user_id)
    )
    await db.commit()


async def record_login(db, user_id: int):
    """Record successful login."""
    await db.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL WHERE id = ?",
        (user_id,)
    )
    await db.commit()


async def log_activity(db, user_id: int, action: str, details: str = None, ip: str = None):
    """Log an activity."""
    await db.execute(
        "INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
        (user_id, action, details, ip)
    )
    await db.commit()
