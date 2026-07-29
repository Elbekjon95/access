#!/bin/bash

# ACCSESS AWS Deployment Script for elbekroxmonov.uz
# Domain: elbekroxmonov.uz

set -e

DOMAIN="elbekroxmonov.uz"
PROJECT_DIR="/home/ubuntu/access"

# Home directory ruxsatlarini to'g'rilash (Nginx 500 error ni oldini olish uchun)
sudo chmod 755 /home/ubuntu

echo "=== 1. Git loyihasini olish / yangilash ==="
if [ -d "$PROJECT_DIR" ]; then
    echo "Loyiha papkasi mavjud, git pull qilinmoqda..."
    cd "$PROJECT_DIR"
    git pull origin main || true
else
    echo "Loyiha clone qilinmoqda..."
    git clone https://github.com/Elbekjon95/access.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo "=== 2. Backend sozlash ==="
cd "$PROJECT_DIR/backend"
npm install

echo "Creating backend .env..."
cat << 'EOF' > .env
MONGODB_URI=mongodb://127.0.0.1:27017/acsess4
JWT_SECRET=acsess_secret_key_2024

GEMINI_API_KEY=AIzaSyAj_gBvpBzvofJvtWJVrDZpFtmpD4iDYaM
GEMINI_MODEL=gemini-1.5-flash
GEMINI_STT_MODEL=gemini-1.5-flash
GEMINI_TTS_MODEL=gemini-2.5-flash-tts-preview

UZBEKVOICE_API_KEY=0339da5f-d50b-43c6-add1-a2de75ed26ef:10a96f0e-c05b-48c2-8725-9ca77ad04095

FLIGHT_API_URL=https://bot.uzairports.com/api/awery/v2?key_token=lDLh3Wdawi7SLNtUn4iMA4QZn5SopdIZ&airport_code=TAS&flight_type=DEPARTURE&is_paxservice=0&is_local=0
OPENWEATHER_API_KEY=632d58e8a4089f301e5451fa87f23d18
TELEGRAM_BOT_TOKEN=7967164892:AAEyTebWsPG8x3BK0DJrIdcrUc2Czo_q-HQ
TELEGRAM_CHAT_ID=-1002669864097
COMPLAINT_EMAIL=elbekroxmonov@gmail.com

TESSERACT_PATH=/usr/bin/tesseract
EOF

echo "MongoDB initializatsiya va seed skriptini yurgizish..."
node scripts/init_mongo_db.js

echo "=== 3. Frontend Build ==="
cd "$PROJECT_DIR/frontend"
npm install
npm run build

echo "=== 4. Nginx Sozlash ==="
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN _;

    root $PROJECT_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true

sudo nginx -t
sudo systemctl restart nginx

echo "=== 5. PM2 Backend ishga tushirish ==="
cd "$PROJECT_DIR/backend"
pm2 delete access-backend || true
pm2 start server.js --name "access-backend"
pm2 save
pm2 startup || true

echo "=== 6. SSL Sertifikat (Certbot HTTPS) ==="
echo "Certbot HTTPS o'rnatish..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m elbekroxmonov@gmail.com || echo "DNS sozlanmagan bo'lsa Certbot o'tkazib yuborildi."

echo "=== LOYIHA MUVAFFAQIYATLI JOYLASHTIRILDI! ==="
