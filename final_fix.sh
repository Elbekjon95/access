#!/bin/bash
# ACCSESS - Final Deployment Fix Script
set -e

echo "--- Step 1: Upgrading Node.js to 22 ---"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

echo "--- Step 2: Re-configuring PostgreSQL ---"
cd /home/ubuntu/access
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS acsess4;"
sudo -u postgres psql -c "CREATE DATABASE acsess4;"
sudo -u postgres psql acsess4 < database_pg.sql

echo "--- Step 3: Backend Setup ---"
cd /home/ubuntu/access/backend
npm install
sed -i 's/DB_HOST=.*/DB_HOST=localhost/g' .env
echo "Initializing DB tables..."
node scripts/init_pg_db.js

echo "--- Step 4: Frontend Build ---"
cd /home/ubuntu/access/frontend
npm install --no-audit --no-fund
npm run build

echo "--- Step 5: Finalizing Services ---"
sudo systemctl restart nginx
cd /home/ubuntu/access/backend
pm2 delete all || true
pm2 start server.js --name "access-backend"
pm2 save
pm2 startup

echo "Deployment Fixed and Live at: http://13.62.45.119"
