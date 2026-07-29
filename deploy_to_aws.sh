#!/bin/bash

# ACCSESS AWS Deployment Script
# This script clones the repo, sets up the DB, builds frontend, and starts backend.

# 1. Clone Repo
echo "Cloning repository..."
git clone https://github.com/Elbekjon95/access.git || cd access && git pull
cd access

# 2. Database Setup
echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE acsess4;"
sudo -u postgres psql acsess4 < database_pg.sql

# 3. Backend Setup
echo "Installing Backend dependencies..."
cd backend
npm install

echo "Creating .env file..."
cat << 'EOF' > .env
# ACCSESS - Production Environment Settings
DB_HOST=localhost
DB_NAME=acsess4
DB_USER=postgres
DB_PASS=postgres
DB_PORT=5432
JWT_SECRET=acsess_secret_key_2024

GEMINI_API_KEY=AIzaSyAj_gBvpBzvofJvtWJVrDZpFtmpD4iDYaM
GEMINI_MODEL=gemini-3.1-pro-preview
GEMINI_TTS_MODEL=gemini-2.5-flash-tts-preview

UZBEKVOICE_API_KEY=0339da5f-d50b-43c6-add1-a2de75ed26ef:10a96f0e-c05b-48c2-8725-9ca77ad04095

FLIGHT_API_URL=https://bot.uzairports.com/api/awery/v2?key_token=lDLh3Wdawi7SLNtUn4iMA4QZn5SopdIZ&airport_code=TAS&flight_type=DEPARTURE&is_paxservice=0&is_local=0
OPENWEATHER_API_KEY=632d58e8a4089f301e5451fa87f23d18
TELEGRAM_BOT_TOKEN=7967164892:AAEyTebWsPG8x3BK0DJrIdcrUc2Czo_q-HQ
TELEGRAM_CHAT_ID=-1002669864097
COMPLAINT_EMAIL=elbekroxmonov@gmail.com

TESSERACT_PATH=/usr/bin/tesseract
EOF

echo "Initializing database..."
node scripts/init_pg_db.js

# 4. Frontend Setup
echo "Building Frontend..."
cd ../frontend
npm install
npm run build

# 5. Nginx Configuration
echo "Configuring Nginx..."
sudo cat << 'EOF' > /tmp/nginx_access
server {
    listen 80;
    server_name _;

    root /home/ubuntu/access/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo mv /tmp/nginx_access /etc/nginx/sites-available/default
sudo systemctl restart nginx

# 6. PM2 Start
echo "Starting Backend with PM2..."
cd ../backend
pm2 delete all || true
pm2 start server.js --name "access-backend"
pm2 save
pm2 startup

echo "Deployment finished! Access site at: http://13.62.45.119"
