import express from 'express';
import axios from 'axios';
import Chat from '../models/Chat.js';
import Map from '../models/Map.js';
import MapPoint from '../models/MapPoint.js';
import MapBarrier from '../models/MapBarrier.js';
import CustomerCapture from '../models/CustomerCapture.js';
import Complaint from '../models/Complaint.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import FormData from 'form-data';

import os from 'os';

const upload = multer({ dest: os.tmpdir() });

const router = express.Router();

// Airports local cache map
const airportsJsonPath = path.resolve('airports.json');
const iataMap = {};
try {
    const rawData = JSON.parse(fs.readFileSync(airportsJsonPath, 'utf8'));
    for (const key in rawData) {
        const a = rawData[key];
        if (a.iata && a.iata.length === 3) iataMap[a.iata.toUpperCase()] = a;
    }
} catch (e) { console.error('airports.json topilmadi', e.message); }

router.all(['/airport_coords.php', '/airport_coords'], async (req, res) => {
    try {
        let codes = req.method === 'POST' ? (req.body.codes || []) : (req.query.codes || '').split(',').filter(Boolean);
        codes = [...new Set(codes.map(c => c.trim().toUpperCase()).filter(c => c.length === 3))];
        if (!codes.length) return res.status(400).json({ error: 'Codes required' });
        
        const result = {};
        for (const code of codes) {
            if (iataMap[code]) {
                result[code] = { lat: iataMap[code].lat, lon: iataMap[code].lon };
            }
        }
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

async function fetchLiveFlights() {
    const types = ['DEPARTURE', 'ARRIVAL'];
    let allFlights = [];
    try {
        for (const type of types) {
            const url = `https://bot.uzairports.com/fids/schedule?airport=TAS2&flight_type=${type}`;
            const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            const $ = cheerio.load(data);
            
            $('table.flights-table tbody tr').each((i, el) => {
                if ($(el).hasClass('date-row')) return;
                const time = $(el).find('.flight-time').text().trim();
                const flight_no = $(el).find('.flight-number').text().trim().replace(/\s+/g, ' ');
                const to_city = $(el).find('.flight-destination .city').text().trim() || $(el).find('.flight-destination').text().trim();
                const to_code = $(el).find('.flight-destination .code').text().trim();
                const status = $(el).find('.flight-status .status-badge').text().trim();
                const gateOrCounter = $(el).find('.flight-gate').text().trim() || '-';
                if (!flight_no) return;
                const fullCity = to_code ? `${to_city} ${to_code}` : to_city.split('\n')[0];
                allFlights.push({
                    type: type.toLowerCase(), movement: type,
                    from: type === 'DEPARTURE' ? 'Tashkent (TAS)' : fullCity,
                    to: type === 'ARRIVAL' ? 'Tashkent (TAS)' : fullCity,
                    flight_no, time,
                    gate: type === 'ARRIVAL' ? '-' : gateOrCounter,
                    checkin_counters: type === 'DEPARTURE' ? gateOrCounter : '-',
                    status
                });
            });
        }
    } catch(e) { console.error('fetchLiveFlights:', e.message); }
    return allFlights;
}

// Chat Endpoint
router.post(['/chat.php', '/chat'], async (req, res) => {
    try {
        const { message, language } = req.body;
        if (!message) return res.status(400).json({ error: 'Xabar yuborilmadi' });
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.json({ reply: `[Express] Xabaringiz qabul qilindi: ${message}. (Sozlamalarda Gemini API kalit topilmadi)`, intent: 'general' });
        }

        const flights = await fetchLiveFlights();
        
        // Toshkent vaqtini olish
        const now = new Date();
        const tasTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tashkent"}));
        const nowMin = tasTime.getHours() * 60 + tasTime.getMinutes();

        // Reyslarni vaqt bo'yicha saralash va 6 soatlik oynaga filtrlaymiz
        const sortedFlights = flights
            .filter(f => {
                try {
                    const [h, m] = f.time.split(':').map(Number);
                    const fMin = h * 60 + m;
                    let diff = fMin - nowMin;
                    
                    if (diff < -120) diff += 1440; // Keyingi kun uchun

                    // Status bo'yicha qo'shimcha logic
                    const s = (f.status || "").toLowerCase();
                    const isStillActive = s.includes("delayed") || s.includes("kechik") || s.includes("boarding") || s.includes("gate") || s.includes("check");
                    
                    // O'tib ketgan bo'lsa ham, agar 90 daqiqa ichida bo'lsa yoki statusi faol bo'lsa qoldiramiz
                    if (diff < 0) {
                        return diff >= -90 || isStillActive; 
                    }
                    
                    return diff <= 360; // Faqat yaqin 6 soat
                } catch (e) { return true; }
            })
            .sort((a, b) => {
                try {
                    const [h1, m1] = a.time.split(':').map(Number);
                    const [h2, m2] = b.time.split(':').map(Number);
                    return (h1 * 60 + m1) - (h2 * 60 + m2);
                } catch (e) { return 0; }
            });

        const shortFlights = sortedFlights.slice(0, 80); // Context uchun yetarli hajm
        
        // Knowledge base yuklash
        let knowledgeBase = "";
        try {
            const kbPath = path.resolve('data/knowledge_base.txt');
            if (fs.existsSync(kbPath)) {
                knowledgeBase = fs.readFileSync(kbPath, 'utf8');
            }
        } catch (e) { console.error('Knowledge Base error:', e.message); }

        const sysInstruction = `Sen Toshkent xalqaro aeroportining (TAS) aqlli rasmiy dispatcher-san. 
MIJOZNING TANLAGAN TILI: "${language || 'uz'}"

DIQQAT: Sen faqat "${language || 'uz'}" tilida javob berishing SHART. 

REYSLAR HAQIDA MUHIM:
Senga faqat hozirgi vaqtdan boshlab yaqin 6 soat ichidagi reyslar ro'yxati berilgan. 
Agar mijoz so'ragan shahar bo'yicha reys topilmasa, "Yaqin 6 soat ichida bu yo'nalishda reyslar mavjud emas" deb javob ber.
Mijoz savoli: "${message}"

QAYTARISH QOIDALARI (FaQAT JSON QAYTAR):
Barcha javoblaring qisqa 1-2 gapdan iborat bo'lsin.
 Agar topilgan qatnov haqida gapirsan, uning holatiga qarab javob ber:
- Agar DEPARTURE (uchish) bo'lsa: "reysi 16:50 da uchib ketadi. Registratsiya 16-18 stoykalarida ochiq" deb ayt.
- Agar ARRIVAL (uchib kelish) bo'lsa: "reysi 14:20 da qo'nadi. Yuklarni olish 4-karuselda" deb ayt (agar karusel/gate ma'lumoti bo'lsa).
Agar biror shaharga reys haqida ma'lumot bersang, o'sha shahardagi hozirgi ob-havoni ham o'sha tilda javobing oxiriga qo'shib ayt.

Javobing quyidagi JSON strukturada bo'lishi shart:
{
  "reply": "xabar",
  "show_earth_route": true/false (agar biror aniq shaharga reys haqida gapirsang true qil),
  "origin": "TAS",
  "destination": "uchish shahri (faqat aniq kodi, masalan DME, VKO, ICN)",
  "location": "faqat agar mijoz bino ichidagi obyekt (masjid, zal, hojatxona) qayerdaligini so'rasa shu nomni yoz. DIQQAT: Agar savol REYSLAR haqida bo'lsa (uchish, kelish, stoykalar) bu qatorni mutlaqo null qoldir!"
}

BILIMLAR BAZASI (Xizmatlar, narxlar va qoidalar):
${knowledgeBase}

Faol reyslar ro'yxati (bu ma'lumotdan foydalan):
${JSON.stringify(shortFlights)}`;

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: sysInstruction }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const { data } = await axios.post(url, payload);
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        try {
            const parsed = JSON.parse(aiText);
            
            // Chatni bazaga saqlash
            try {
                await Chat.create({
                    user_message: message,
                    ai_response: parsed.reply,
                    language: language || 'uz'
                });
            } catch (dbErr) {
                console.error('Chatni bazaga saqlashda xato:', dbErr.message);
            }

            res.json(parsed);
        } catch(e) {
            res.json({ reply: aiText || "Kechirasiz, aniq javob bera olmadim.", intent: 'general' });
        }
    } catch (error) {
        console.error("Chat Error:", error?.response?.data || error.message);
        res.status(500).json({ error: 'Ichki tizim xatosi yuz berdi' });
    }
});

// Flights Scraping Endpoint
router.get(['/flights.php', '/flights'], async (req, res) => {
    try {
        const allFlights = await fetchLiveFlights();
        res.json(allFlights);
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Server xatosi: uzairports ishlamayapti' });
    }
});

// Missing Map endpoints
router.get(['/map_settings.php', '/map_settings'], async (req, res) => {
    try {
        const mapDoc = await Map.findOne();
        res.json({ path: mapDoc ? mapDoc.image_path : 'img/airport_map.jpg' });
    } catch(err) {
        res.json({ path: 'img/airport_map.jpg' });
    }
});

router.get(['/scanner.php', '/scanner'], async (req, res) => {
    try {
        const points = await MapPoint.find();
        res.json(points);
    } catch(err) {
        res.json([]);
    }
});

router.get(['/barriers.php', '/barriers'], async (req, res) => {
    try {
        const rows = await MapBarrier.find();
        const barriers = rows.map(b => ({
            id: b.id,
            barrier_data: typeof b.barrier_data === 'string' ? JSON.parse(b.barrier_data) : b.barrier_data
        }));
        res.json(barriers);
    } catch(err) {
        res.json([]);
    }
});

router.get(['/weather.php', '/weather'], async (req, res) => {
    try {
        if (req.query.cities) {
            const cities = req.query.cities.split(',');
            const results = cities.map(city => {
                const temp = Math.floor(Math.random() * 20) + 10;
                return {
                    city: city,
                    temp: temp,
                    condition: "Clear",
                    description: "Ochiq havo",
                    humidity: Math.floor(Math.random() * 50) + 30,
                    icon: temp > 20 ? "01d" : "02d"
                };
            });
            return res.json({ success: true, results });
        } else {
            // Hozirgi iqlim uchun mock weather. 
            res.json({ success: true, data: { temp: 25, condition: "Clear", icon: "01d" } });
        }
    } catch(err) {
        res.json({ success: false, error: 'Weather err' });
    }
});

router.get(['/destination_cities.php', '/destination_cities'], async (req, res) => {
    try {
        const { data } = await axios.get("https://bot.uzairports.com/fids/schedule?airport=TAS2&flight_type=DEPARTURE", { headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = cheerio.load(data);
        const cities = new Set();
        $('table.flights-table tbody tr').each((i, el) => {
            if ($(el).hasClass('date-row')) return;
            const to_city = $(el).find('.flight-destination .city').text().trim() || $(el).find('.flight-destination').text().trim();
            const cleanCity = to_city.split('\n')[0].trim();
            if (cleanCity && cleanCity !== 'Tashkent' && cleanCity !== 'N/A') {
                cities.add(cleanCity);
            }
        });
        res.json({ success: true, cities: Array.from(cities).sort() });
    } catch(err) {
        res.json({ success: false, cities: [] });
    }
});

router.post(['/capture.php', '/capture'], async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ status: 'error', message: 'No image data received' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '').replace(/ /g, '+');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const folder = path.join(process.cwd(), '../frontend/public/img/captures');
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        const fileName = `capture_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = path.join(folder, fileName);
        
        fs.writeFileSync(filePath, buffer);
        res.json({ status: 'success', path: `img/captures/${fileName}` });
    } catch(err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

router.post(['/stt.php', '/stt'], upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Audio fayl yuborilmadi' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY .env faylida topilmadi' });
        }

        const audioBuffer = fs.readFileSync(req.file.path);
        const base64Audio = audioBuffer.toString('base64');
        const langCode = req.body.language || 'uz';

        let mimeType = (req.file.mimetype || "audio/webm").split(';')[0].trim();
        if (mimeType === 'application/octet-stream' || !mimeType) {
            mimeType = 'audio/webm';
        }

        const model = process.env.GEMINI_STT_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: `Ushbu ovozli xabarni (audio) diqqat bilan eshitib, undagi gaplarni "${langCode}" tilida matnga o'girib ber (transcription). Faqat matnni o'zini qaytar, hech qanday qo'shimcha izoh yozma.` },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Audio
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1
            }
        };

        const { data } = await axios.post(url, payload);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        const transcription = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[Gemini STT] Success (${model}): "${transcription}"`);

        if (!transcription.trim()) {
            res.json({ error: "Ovozni taniy olmadim. Qaytadan urinib ko'ring." });
        } else {
            res.json({ text: transcription.trim(), language: langCode, engine: 'gemini-multimodal' });
        }
    } catch(err) {
        if(req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch(e) {}
        }
        console.error("Gemini STT Error Details: ", err.response?.status, err.response?.data || err.message);
        const errorDetails = err.response?.data?.error?.message || err.message || 'Gemini STT xizmatida xatolik yuz berdi.';
        res.status(500).json({ error: errorDetails });
    }
});

export default router;

async function synthesizeGeminiTTS(text, voiceName, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName }
                }
            }
        }
    };
    try {
        const { data } = await axios.post(url, payload);
        const pcmBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!pcmBase64) return null;
        
        const pcmBuffer = Buffer.from(pcmBase64, 'base64');
        const sampleRate = 24000;
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(pcmBuffer.length + 36, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20);
        wavHeader.writeUInt16LE(1, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(sampleRate * 2, 28);
        wavHeader.writeUInt16LE(2, 32);
        wavHeader.writeUInt16LE(16, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(pcmBuffer.length, 40);
        
        return Buffer.concat([wavHeader, pcmBuffer]);
    } catch (e) {
        console.error("TTS synth err:", e?.response?.data || e.message);
        return null;
    }
}

router.post(['/gemini_voice.php', '/gemini_voice'], async (req, res) => {
    try {
        const { text, voice_name = 'Aoede' } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "No API KEY" });
        
        const wavBuffer = await synthesizeGeminiTTS(text, voice_name, apiKey);
        if (wavBuffer) {
            res.json({
                success: true,
                audioContent: wavBuffer.toString('base64'),
                mimeType: 'audio/wav',
                model: 'gemini-2.5-flash-24k'
            });
        } else {
            res.status(500).json({ error: "No audio generated" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post(['/gemini_stream_tts.php', '/gemini_stream_tts'], async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        const { text, voice_name = 'Aoede' } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            res.write('event: error\ndata: {"message": "No API KEY"}\n\n');
            res.end();
            return;
        }

        // Matnni gaplarga bo'lish
        const rawSentences = text.split(/(?<=[.!?;])\s+/);
        const sentences = [];
        
        // Juda qisqa gaplarni birlashtirish (tezlikni oshirish uchun)
        let currentChunk = "";
        for (const s of rawSentences) {
            currentChunk += (currentChunk ? " " : "") + s;
            if (currentChunk.length > 40 || s.match(/[.!?;]$/)) {
                sentences.push(currentChunk);
                currentChunk = "";
            }
        }
        if (currentChunk) sentences.push(currentChunk);

        res.write(`event: start\ndata: {"totalChunks": ${sentences.length}, "voice": "${voice_name}"}\n\n`);

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            if (!sentence.trim()) continue;
            
            const wavBuffer = await synthesizeGeminiTTS(sentence, voice_name, apiKey);
            if (wavBuffer) {
                res.write(`event: chunk\ndata: {"index": ${i}, "total": ${sentences.length}, "audio": "${wavBuffer.toString('base64')}", "mime": "audio/wav", "text": ${JSON.stringify(sentence)}}\n\n`);
            } else {
                res.write(`event: chunk_error\ndata: {"index": ${i}, "total": ${sentences.length}, "error": "TTS Error", "text": ${JSON.stringify(sentence)}}\n\n`);
            }
        }
        
        res.write(`event: done\ndata: {"totalChunks": ${sentences.length}}\n\n`);
        res.end();
    } catch (e) {
        res.write(`event: error\ndata: {"message": "${e.message}"}\n\n`);
        res.end();
    }
});
