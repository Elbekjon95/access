#!/bin/bash

# ACCSESS Server Setup Script (Ubuntu) for MongoDB & Nginx
# Usage: sudo bash setup_server.sh

set -e

echo "=== 1. Tizimni yangilash ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl gnupg git ca-certificates ufw

echo "=== 2. Node.js 20.x o'rnatish ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== 3. MongoDB 7.0 o'rnatish ==="
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor --yes

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

echo "=== 4. Nginx va Certbot (SSL) o'rnatish ==="
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "=== 5. PM2 o'rnatish ==="
sudo npm install -g pm2

echo "=== 6. Firewall (UFW) sozlash ==="
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "=== Serverni tayyorlash yakunlandi! ==="
