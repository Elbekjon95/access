# ✈️ ACCSESS4 - Aerovokzal & Transport Ma'lumot Kioski

> **National Transport Hackathon — Track 2 (Airport)** loyihasi uchun maxsus ishlab chiqilgan sun'iy intellektga asoslangan aerovokzal va transport kiosk tizimi.

🌐 **Ishlab turgan jonli sayt (Live Demo):**  
🔗 [**http://elbekroxmonov.uz**](http://elbekroxmonov.uz) *(yoki [http://13.48.58.207](http://13.48.58.207))*

---

## 🌟 Asosiy Imkoniyatlar va Funksionallik

1. **🤖 Gemini AI Voice Assistant (O'zbek tilida Ovozli Muloqot)**:
   - Yo'lovchilar uchun o'zbek tilida tabiiy ovozli muloqot va AI tavsiyalari (Gemini 2.5 Flash STT va TTS).
   - O'zbek tili nutqini aniq tanib olish (UzbekVoice.ai STT).
2. **✈️ Jonli Reyslar va Transport Ma'lumotlari**:
   - `UzAirports API` orqali real vaqtdagi parvozlar (Departures / Arrivals) jadvali va maqomi.
   - Tashbus API integratsiyasi orqali jamoat transporti va peron ma'lumotlari.
3. **🗺️ Interaktiv 3D Xarita & Navigatsiya**:
   - Aeroport va terminal hududida Three.js hamda Leaflet asosida oson navigatsiya.
4. **📋 Shikoyat va Takliflar Tizimi**:
   - OCR (Tesseract) va ovozli shaklda shikoyat/murojaatlarni qabul qilish.
5. **⚙️ Boshqaruv Admin Paneli**:
   - Adminlar uchun real vaqt statistikalari, chatlar tarixi, xarita tahrirchisi va murojaatlarni boshqarish (`/admin`).

---

## 🛠️ Texnologiyalar Steki

* **Frontend**: Vue 3 (Composition API), Vite, Three.js, Leaflet, Vue Router, TailwindCSS.
* **Backend**: Node.js, Express.js, REST API.
* **AI & Voice Services**: Google Gemini 2.5 Flash API (Streaming TTS/STT), UzbekVoice STT.
* **Database**: MongoDB (Mongoose) / PostgreSQL.
* **Web Server & Infrastructure**: Nginx, PM2, AWS EC2.

---

## 🚀 Mahalliy Ishga Tushirish (Local Setup)

### 1. Repository'ni yuklab olish
```bash
git clone https://github.com/National-transport-hackathon/track-2-aiport.git
cd track-2-aiport
```

### 2. Backend'ni ishga tushirish
```bash
cd backend
npm install
npm run dev
```
*(Backend port `3001`da ishga tushadi)*

### 3. Frontend'ni ishga tushirish
```bash
cd ../frontend
npm install
npm run dev
```
*(Frontend port `3000`da `http://localhost:3000` manzilida ishga tushadi)*

---

## 🏛️ Boshqaruv (Admin Panel)

* **Admin login**: [`http://elbekroxmonov.uz/admin/login`](http://elbekroxmonov.uz/admin/login)
* **Default Login**: `admin` / `admin123`

---

© 2026 National Transport Hackathon — ACCSESS Team
