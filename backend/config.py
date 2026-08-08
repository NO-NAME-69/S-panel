"""
S Panel - Configuration Module
Centralized configuration for the S Panel server management application.
"""

import os
import secrets
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
DATABASE_DIR = BASE_DIR / "data"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_PATH = DATABASE_DIR / "spanel.db"

# JWT Configuration
JWT_SECRET_KEY = os.environ.get("SPANEL_JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Server Configuration
PANEL_HOST = os.environ.get("SPANEL_HOST", "0.0.0.0")
PANEL_PORT = int(os.environ.get("SPANEL_PORT", "8888"))
PANEL_NAME = "S Panel"
PANEL_VERSION = "1.0.0"

# Default Admin Credentials
DEFAULT_ADMIN_USERNAME = "shubh"
DEFAULT_ADMIN_PASSWORD = "Shubh@2402"

# Rate Limiting
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

# Logging
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "spanel.log"

# File Manager
FILE_MANAGER_ROOT = "/"
MAX_UPLOAD_SIZE = 1024 * 1024 * 500  # 500MB

# Terminal
TERMINAL_SHELL = "/bin/bash"

# Software catalog
SOFTWARE_CATALOG = {
    "nginx": {
        "name": "Nginx",
        "description": "High-performance HTTP server and reverse proxy",
        "package": "nginx",
        "service": "nginx",
        "icon": "🌐",
        "category": "Web Server"
    },
    "mysql": {
        "name": "MySQL",
        "description": "Popular open-source relational database",
        "package": "mysql-server",
        "service": "mysql",
        "icon": "🗄️",
        "category": "Database"
    },
    "mongodb": {
        "name": "MongoDB",
        "description": "NoSQL document database",
        "package": "mongodb-org",
        "service": "mongod",
        "icon": "🍃",
        "category": "Database"
    },
    "nodejs": {
        "name": "Node.js",
        "description": "JavaScript runtime for server-side applications",
        "package": "nodejs",
        "service": None,
        "icon": "💚",
        "category": "Runtime"
    },
    "php": {
        "name": "PHP",
        "description": "Server-side scripting language",
        "package": "php-fpm",
        "service": "php8.3-fpm",
        "icon": "🐘",
        "category": "Runtime"
    },
    "redis": {
        "name": "Redis",
        "description": "In-memory data structure store",
        "package": "redis-server",
        "service": "redis-server",
        "icon": "⚡",
        "category": "Cache"
    },
    "docker": {
        "name": "Docker",
        "description": "Container runtime platform",
        "package": "docker.io",
        "service": "docker",
        "icon": "🐳",
        "category": "Container"
    },
    "certbot": {
        "name": "Certbot",
        "description": "Let's Encrypt SSL certificate tool",
        "package": "certbot",
        "service": None,
        "icon": "🔒",
        "category": "Security"
    },
    "ufw": {
        "name": "UFW",
        "description": "Uncomplicated Firewall",
        "package": "ufw",
        "service": "ufw",
        "icon": "🛡️",
        "category": "Security"
    },
    "postgresql": {
        "name": "PostgreSQL",
        "description": "Advanced open-source relational database",
        "package": "postgresql",
        "service": "postgresql",
        "icon": "🐘",
        "category": "Database"
    },
    "apache2": {
        "name": "Apache",
        "description": "Popular open-source HTTP web server",
        "package": "apache2",
        "service": "apache2",
        "icon": "🪶",
        "category": "Web Server"
    },
    "mariadb": {
        "name": "MariaDB",
        "description": "Community-developed fork of MySQL",
        "package": "mariadb-server",
        "service": "mariadb",
        "icon": "🦭",
        "category": "Database"
    },
    "ssh": {
        "name": "OpenSSH",
        "description": "Secure shell (SSH) protocol suite",
        "package": "openssh-server",
        "service": "ssh",
        "icon": "🔑",
        "category": "Security"
    },
    "fail2ban": {
        "name": "Fail2ban",
        "description": "Intrusion prevention software framework",
        "package": "fail2ban",
        "service": "fail2ban",
        "icon": "🛡️",
        "category": "Security"
    },
    "supervisor": {
        "name": "Supervisor",
        "description": "Process control system for Linux",
        "package": "supervisor",
        "service": "supervisor",
        "icon": "⚙️",
        "category": "Management"
    },
    "phpmyadmin": {
        "name": "phpMyAdmin",
        "description": "Web interface for managing MySQL databases",
        "package": "phpmyadmin",
        "service": None,
        "icon": "🐘",
        "category": "Database"
    },
    "mongo-express": {
        "name": "Mongo-Express",
        "description": "Web-based MongoDB admin interface",
        "package": "nodejs",  # Since it installs via npm
        "service": None,
        "icon": "🍃",
        "category": "Database"
    }
}
