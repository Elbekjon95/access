#!/bin/bash

# ACCSESS Server Setup Script (Ubuntu)
# Usage: sudo bash setup_server.sh

# 1. Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18
echo "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PostgreSQL
echo "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. Install Tesseract OCR
echo "Installing Tesseract OCR..."
sudo apt install -y tesseract-ocr libtesseract-dev

# 6. Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# 7. Configure Firewall
echo "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw allow ssh

echo "Server setup complete! Please proceed with database setup and git clone."
