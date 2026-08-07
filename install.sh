#!/bin/bash
# S Panel Installation Script

set -e

echo "==============================================="
echo " S Panel - Server Management Panel Installer   "
echo "==============================================="

# Check root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Set directory
INSTALL_DIR="/mnt/c/shubh/website/s panel"
cd "$INSTALL_DIR" || exit 1

echo "Installing system dependencies..."
apt-get update
apt-get install -y python3-pip python3-venv python3-dev ufw curl wget nginx

echo "Installing Python dependencies..."
pip install --break-system-packages -r backend/requirements.txt

echo "Creating systemd service..."
cat > /etc/systemd/system/spanel.service << EOF
[Unit]
Description=S Panel Service
After=network.target

[Service]
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 backend/main.py
Restart=always
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and starting service..."
systemctl daemon-reload
systemctl enable spanel.service
systemctl restart spanel.service

echo "Configuring firewall..."
ufw allow 8888/tcp comment 'S Panel'
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

echo "==============================================="
echo " Installation Complete!"
echo " S Panel is running on port 8888"
echo " Default Username: shubh"
echo " Default Password: Shubh@2402"
echo " Access URL: http://localhost:8888"
echo "==============================================="
