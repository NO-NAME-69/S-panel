# S Panel

**S Panel** is a lightweight, high-performance, and modern server management panel inspired by aaPanel. It provides a sleek web-based graphical interface for managing your server environments, websites, databases, files, and more, all without the overhead of heavy frontend frameworks.

## 🚀 Features

- **Modern Single-Page Application (SPA)**: Custom-built vanilla JS frontend for lightning-fast, seamless navigation without page reloads.
- **System Monitoring**: Live CPU, memory, and disk usage tracking using dynamic Canvas charts.
- **Websites & Nginx Management**: Create and manage Nginx virtual hosts easily.
- **Database Management**: Support for MySQL and MongoDB setup and administration.
- **File Manager**: Fully featured web-based file browser with an integrated text editor.
- **Web Terminal**: Fully interactive live SSH terminal in your browser using xterm.js and WebSockets.
- **Docker Integration**: Manage Docker containers, images, and networks directly from the panel.
- **Software Store**: One-click installation and removal of common server software (e.g., PHP, Node.js, Redis, MySQL).
- **Security & Firewall**: Built-in UFW firewall management to open/close ports and manage security policies.
- **SSL Management**: Automated SSL certificate generation and Let's Encrypt integration.
- **Cron Jobs**: Schedule and manage automated background tasks.

## 🏗️ Architecture

- **Backend**: Python 3.12 + FastAPI (High performance async framework).
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism & dark mode aesthetics), and JavaScript. 
- **Database**: SQLite (for panel configuration and user data).
- **Security**: JWT-based session management, bcrypt password hashing.

## ⚙️ Installation

> **Note:** Currently designed to run natively on Ubuntu servers or inside a Windows Subsystem for Linux (WSL) Ubuntu environment.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NO-NAME-69/S-panel.git
   cd S-panel
   ```

2. **Run the Installer Script:**
   The installation script will automatically update your system, install necessary packages (Nginx, Python, UFW), set up Python dependencies, and create the `spanel.service`.
   ```bash
   sudo ./install.sh
   ```

3. **Check the Service Status:**
   ```bash
   sudo systemctl status spanel
   ```

## 🌐 Usage

By default, the panel runs on port **8888** and is automatically allowed through the UFW firewall during installation.

1. Open your web browser.
2. Navigate to: `http://<your-server-ip>:8888` (or `http://localhost:8888` if running locally/WSL).
3. Log in with the default credentials:
   - **Username**: `shubh`
   - **Password**: `Shubh@2402`

> **Warning:** It is highly recommended to change the default password immediately after logging in for the first time!

## 🛠️ Development

If you'd like to run the backend manually for development or debugging:

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
python3 backend/main.py
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
