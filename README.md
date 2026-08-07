# S Panel

**S Panel** is a lightweight, high-performance, and modern server management panel inspired by aaPanel. It provides a sleek web-based graphical interface for managing your server environments, websites, databases, files, and more, all without the overhead of heavy frontend frameworks.

---

## 🚀 Features & Capabilities

- **Modern Single-Page Application (SPA)**: Custom-built vanilla JS frontend for lightning-fast, seamless navigation without page reloads. Built with modern glassmorphism and a beautiful dark mode aesthetic.
- **System Monitoring**: Live CPU, memory, and disk usage tracking using dynamic Canvas charts that update in real-time.
- **Websites & Nginx Management**: Create and manage Nginx virtual hosts easily. Configure domains, document roots, and SSL directly from the UI.
- **Database Management**: Support for MySQL/MariaDB and MongoDB setup, administration, and monitoring.
- **File Manager**: Fully featured web-based file browser. Create, edit, delete, upload, and move files with an integrated, syntax-highlighting text editor.
- **Web Terminal**: Fully interactive live SSH terminal in your browser using xterm.js and WebSockets.
- **Docker Integration**: View, start, stop, and pull Docker containers and images directly from the panel.
- **Software Store**: One-click installation and removal of common server software (e.g., PHP, Node.js, Redis, MySQL, Apache, OpenSSH, Fail2ban). S-Panel intercepts default Linux installation behaviors to prevent port conflicts automatically.
- **Service Configuration**: Directly edit raw configuration files (like `nginx.conf`, `ports.conf`) from the browser to resolve conflicts instantly.
- **Security & Firewall**: Built-in UFW firewall management to open/close ports and manage security policies with visual indicators.
- **SSL Management**: Automated SSL certificate generation via Let's Encrypt integration.
- **Cron Jobs**: Schedule and manage automated background tasks natively.

---

## 🏗️ Architecture

- **Backend**: Python 3.12 + FastAPI (High performance async framework). WebSockets are used for terminal streams and real-time installation logs.
- **Frontend**: Vanilla HTML5, CSS3 (CSS Variables for tokens, animations), and modular JavaScript. No React/Vue overhead.
- **Database**: SQLite (for panel configuration, users, websites, databases, and cron job records).
- **Security**: JWT-based session management with automatic expiration handling, bcrypt password hashing, and strict Linux user isolation.

---

## ⚙️ Installation Instructions

> **Note:** S Panel is designed to run natively on Ubuntu 20.04/22.04/24.04 servers or inside a Windows Subsystem for Linux (WSL) Ubuntu environment.

### 1. Clone the repository
First, pull the codebase onto your Linux server:
```bash
git clone https://github.com/NO-NAME-69/S-panel.git
cd S-panel
```

### 2. Run the Automated Installer Script
The included installation script will automatically update your system, install necessary system dependencies (Nginx, Python 3.12, UFW), configure a Python virtual environment, install PIP dependencies, and create a permanent systemd service (`spanel.service`).
```bash
sudo ./install.sh
```

### 3. Check the Service Status
Verify that the backend service has started successfully:
```bash
sudo systemctl status spanel
```

---

## 🌐 Usage Guide

By default, the panel backend runs on port **8888**. The installer script automatically allows this port through the UFW firewall.

### Logging In
1. Open your web browser.
2. Navigate to: `http://<your-server-ip>:8888` (or `http://localhost:8888` if running locally/WSL).
3. Log in with your unique credentials:
   - During the installation process (`install.sh`), a **random, highly-secure username and password** are automatically generated for you.
   - Please check the final terminal output of the installer to find your unique login credentials.

> **Warning:** Please save these credentials safely! You can change your password anytime after logging in via the Settings panel.

### Common Workflows

- **Installing Software**: Navigate to the **Software Store** tab. Click "Install" on packages like Nginx, MySQL, or Node.js. S Panel prevents them from auto-starting to avoid port conflicts.
- **Configuring Ports**: Navigate to the **Services** tab. Click the **⚙️ Config** button next to a stopped service to edit its configuration file (e.g., changing Apache to port 8080) before starting it.
- **Managing Websites**: Go to the **Websites** tab. Click "Add Website", enter your domain, and S Panel will automatically generate the Nginx configuration blocks and reload the web server.

---

## 🛠️ Development & Manual Setup

If you'd like to run the backend manually for development, debugging, or contributing to the codebase:

```bash
# Ensure you are in the project root
cd S-panel

# (Optional) Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server natively using uvicorn
python3 backend/main.py
```
The server will start on `0.0.0.0:8888` with hot-reloading disabled by default. 

---

## 📝 License

This software and its documentation are the proprietary property of **SHASHWAT SINGH PATEL**. All Rights Reserved. 

You may not use, copy, modify, distribute, or sell this software, in whole or in part, without the express written permission of the author. This software is provided "as is", without warranty of any kind. In no event shall the author be liable for any claim, damages or other liability arising from, out of or in connection with the software.
