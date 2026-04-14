# ACCSESS - Serverga Joylashtirish Qo'llanmasi

Ushbu loyihani serverga (VPS/AWS/Ubuntu) joylashtirish uchun quyidagi qadamlarni bajaring:

## 1. Tizim talablari
- Node.js (v18+)
- PostgreSQL
- Tesseract OCR (agar shikoyatlar funksiyasi kerak bo'lsa)

## 2. O'rnatish
Repository'ni serverga clone qiling:
```bash
git clone https://github.com/Elbekjon95/access.git
cd access
```

## 3. Backend Sozlash
```bash
cd backend
npm install
cp .env.example .env
```
`.env` faylini tahrirlang:
- Ma'lumotlar bazasi (DB) ma'lumotlarini kiriting.
- `GEMINI_API_KEY` ni qo'shing.

Ma'lumotlar bazasini tayyorlash:
```bash
node scripts/init_pg_db.js
```

## 4. Frontend Sozlash
```bash
cd ../frontend
npm install
npm run build
```
Nginx yoki Apache orqali `frontend/dist` papkasini serverda static fayllar sifatida e'lon qiling.

## 5. Ishga tushirish
PM2 ishlatish tavsiya etiladi:
```bash
cd ../backend
pm2 start server.js --name "access-backend"
```

## 6. Ma'lumotlar Bazasi
`database_pg.sql` faylidan foydalanib, PostgreSQL'da jadvallarni yaratishingiz mumkin.
