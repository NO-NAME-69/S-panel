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
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

echo "Creating systemd service..."
cat > /etc/systemd/system/spanel.service << EOF
[Unit]
Description=S Panel Service
After=network.target

[Service]
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/venv/bin/python3 backend/main.py
Restart=always
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and starting service..."
systemctl daemon-reload
systemctl enable spanel.service
systemctl restart spanel.service

echo "Generating secure administrator credentials..."
ADMIN_USER=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)
ADMIN_PASS=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w 12 | head -n 1)

# Inject credentials into config.py before starting the service
sed -i "s/DEFAULT_ADMIN_USERNAME = .*/DEFAULT_ADMIN_USERNAME = \"$ADMIN_USER\"/" backend/config.py
sed -i "s/DEFAULT_ADMIN_PASSWORD = .*/DEFAULT_ADMIN_PASSWORD = \"$ADMIN_PASS\"/" backend/config.py

echo "Configuring firewall..."
ufw allow 8888/tcp comment 'S Panel'
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

echo "==============================================="
echo " Installation Complete!"
echo " S Panel is running on port 8888"
echo " Access URL: http://localhost:8888"
echo " "
echo " --- YOUR LOGIN CREDENTIALS ---"
echo " Default Username: $ADMIN_USER"
echo " Default Password: $ADMIN_PASS"
echo " "
echo " Please save these credentials safely!"
echo "==============================================="
