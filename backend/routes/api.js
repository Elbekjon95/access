import express from 'express';
import axios from 'axios';
import Chat from '../models/Chat.js';
import MapModel from '../models/Map.js';
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

const ttsCache = new Map();
const MAX_TTS_CACHE_SIZE = 100;

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

const getAirportCoordsHandler = async (req, res) => {
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
};

router.all('/airport_coords', getAirportCoordsHandler);
router.all('/airport_coords.php', getAirportCoordsHandler);

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

function fetchRailwaySchedules() {
    return [
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Shimoliy (Vokzal)', to: 'Samarqand - Buxoro',
            flight_no: '762F "Afrosiyob"', time: '07:00',
            gate: 'Peron 1', checkin_counters: 'Vagon 1-9 (Kassa 1-4)',
            status: 'Registratsiya ochiq'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Shimoliy (Vokzal)', to: 'Qarshi - Shahrisabz',
            flight_no: '764F "Afrosiyob"', time: '08:30',
            gate: 'Peron 2', checkin_counters: 'Vagon 1-8 (Kassa 2)',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Janubiy (Vokzal)', to: 'Andijon - Marg\'ilon',
            flight_no: '060F "Toshkent-Andijon"', time: '09:15',
            gate: 'Peron 3', checkin_counters: 'Vagon 1-12 (Kassa 5-8)',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Shimoliy (Vokzal)', to: 'Buxoro - Samarqand',
            flight_no: '766F "Afrosiyob"', time: '09:45',
            gate: 'Peron 1', checkin_counters: 'Vagon 1-9 (Kassa 1-3)',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Shimoliy (Vokzal)', to: 'Urganch - Xiva',
            flight_no: '056F "Toshkent-Xiva"', time: '14:20',
            gate: 'Peron 4', checkin_counters: 'Vagon 1-14 (Kassa 9-10)',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Shimoliy (Vokzal)', to: 'Samarqand Express',
            flight_no: '752F "Express"', time: '17:10',
            gate: 'Peron 2', checkin_counters: 'Vagon 1-10 (Kassa 3)',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Shimoliy (Vokzal)', to: 'Buxoro - Xiva',
            flight_no: '662F "Sharq"', time: '18:45',
            gate: 'Peron 1', checkin_counters: 'Vagon 1-10 (Kassa 1-3)',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Janubiy (Vokzal)', to: 'Termiz - Denov',
            flight_no: '379F "Toshkent-Termiz"', time: '19:30',
            gate: 'Peron 3', checkin_counters: 'Vagon 1-16 (Kassa 7-8)',
            status: 'Kutilmoqda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Buxoro - Samarqand', to: 'Toshkent Shimoliy (Vokzal)',
            flight_no: '761F "Afrosiyob"', time: '11:40',
            gate: 'Peron 1', checkin_counters: 'Vagon 1-9',
            status: 'Keldi'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Qarshi - Shahrisabz', to: 'Toshkent Shimoliy (Vokzal)',
            flight_no: '763F "Afrosiyob"', time: '13:15',
            gate: 'Peron 2', checkin_counters: 'Vagon 1-8',
            status: 'Keldi'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Andijon - Qo\'qon', to: 'Toshkent Janubiy (Vokzal)',
            flight_no: '059F "Andijon-Toshkent"', time: '15:20',
            gate: 'Peron 3', checkin_counters: 'Vagon 1-12',
            status: 'Yo\'lda (Kechikmoqda)'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Buxoro - Samarqand', to: 'Toshkent Shimoliy (Vokzal)',
            flight_no: '765F "Afrosiyob"', time: '16:50',
            gate: 'Peron 1', checkin_counters: 'Vagon 1-9',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Termiz - Qarshi', to: 'Toshkent Shimoliy (Vokzal)',
            flight_no: '380F "Termiz Express"', time: '20:10',
            gate: 'Peron 4', checkin_counters: 'Vagon 1-14',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Xiva - Urganch - Navoiy', to: 'Toshkent Shimoliy (Vokzal)',
            flight_no: '055F "Xiva-Toshkent"', time: '21:40',
            gate: 'Peron 2', checkin_counters: 'Vagon 1-14',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: "Nukus - Qo'ng'irot", to: "Toshkent Shimoliy (Vokzal)",
            flight_no: '053F "Nukus-Toshkent"', time: '22:30',
            gate: 'Peron 3', checkin_counters: 'Vagon 1-15',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Almaty (Qozog\'iston)', to: 'Toshkent Shimoliy (Vokzal)',
            flight_no: '001F "Almaty-Tashkent"', time: '23:15',
            gate: 'Peron 1', checkin_counters: 'Vagon 1-12',
            status: 'Xalqaro Reys'
        }
    ];
}

function fetchBusSchedules() {
    return [
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Samarqand (Markaziy)',
            flight_no: 'BUS-101 "Oltin Vadi"', time: '06:30',
            gate: 'Platforma 2', checkin_counters: 'Chiptaxona 1-3',
            status: 'Chiptalar sotilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Farg\'ona - Marg\'ilon',
            flight_no: 'BUS-204 "Vodiy Express"', time: '08:00',
            gate: 'Platforma 4', checkin_counters: 'Chiptaxona 4-5',
            status: 'Peronda (Minish ochiq)'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Buxoro - Kogon',
            flight_no: 'BUS-305 "Buxoro Trans"', time: '10:15',
            gate: 'Platforma 1', checkin_counters: 'Chiptaxona 2-4',
            status: 'Chiptalar sotilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Guliston - Yangiyer',
            flight_no: 'BUS-109 "Sirdaryo Liners"', time: '11:30',
            gate: 'Platforma 6', checkin_counters: 'Chiptaxona 1',
            status: 'Chiptalar sotilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Namangan (Avtovokzal)',
            flight_no: 'BUS-408 "Namangan Liners"', time: '14:30',
            gate: 'Platforma 5', checkin_counters: 'Chiptaxona 6',
            status: 'Kutilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Andijon (Avtovokzal)',
            flight_no: 'BUS-208 "Andijon Express"', time: '16:00',
            gate: 'Platforma 4', checkin_counters: 'Chiptaxona 4-5',
            status: 'Chiptalar sotilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Qarshi - Shahrisabz',
            flight_no: 'BUS-502 "Nasaf Avto"', time: '17:00',
            gate: 'Platforma 3', checkin_counters: 'Chiptaxona 1-2',
            status: 'Chiptalar sotilmoqda'
        },
        {
            type: 'departure', movement: 'DEPARTURE',
            from: 'Toshkent Central Avtovokzal', to: 'Urganch - Xiva',
            flight_no: 'BUS-601 "Xorazm Trans"', time: '19:00',
            gate: 'Platforma 1', checkin_counters: 'Chiptaxona 3-4',
            status: 'Kutilmoqda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Samarqand Avtovokzal', to: 'Toshkent Central Avtovokzal',
            flight_no: 'BUS-102 "Samarqand-Tashkent"', time: '12:15',
            gate: 'Platforma 2', checkin_counters: 'Peron 2',
            status: 'Yetib keldi'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Guliston Avtovokzal', to: 'Toshkent Central Avtovokzal',
            flight_no: 'BUS-110 "Sirdaryo-Tashkent"', time: '14:00',
            gate: 'Platforma 6', checkin_counters: 'Peron 6',
            status: 'Yetib keldi'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Andijon Avtovokzal', to: 'Toshkent Central Avtovokzal',
            flight_no: 'BUS-206 "Vodiy-Tashkent"', time: '16:40',
            gate: 'Platforma 4', checkin_counters: 'Peron 4',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Namangan Avtovokzal', to: 'Toshkent Central Avtovokzal',
            flight_no: 'BUS-409 "Namangan-Tashkent"', time: '18:20',
            gate: 'Platforma 5', checkin_counters: 'Peron 5',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Buxoro Avtovokzal', to: 'Toshkent Central Avtovokzal',
            flight_no: 'BUS-306 "Buxoro-Tashkent"', time: '20:00',
            gate: 'Platforma 1', checkin_counters: 'Peron 1',
            status: 'Yo\'lda'
        },
        {
            type: 'arrival', movement: 'ARRIVAL',
            from: 'Qarshi Avtovokzal', to: 'Toshkent Central Avtovokzal',
            flight_no: 'BUS-503 "Nasaf-Tashkent"', time: '21:30',
            gate: 'Platforma 3', checkin_counters: 'Peron 3',
            status: 'Yo\'lda'
        }
    ];
}

const postChatHandler = async (req, res) => {
    try {
        const { message, language, transportMode = 'aviation' } = req.body;
        if (!message) return res.status(400).json({ error: 'Xabar yuborilmadi' });
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.json({ reply: `[Express] Xabaringiz qabul qilindi: ${message}. (Sozlamalarda Gemini API kalit topilmadi)`, intent: 'general' });
        }

        let flights = [];
        if (transportMode === 'railway') {
            flights = fetchRailwaySchedules();
        } else if (transportMode === 'bus') {
            flights = fetchBusSchedules();
        } else {
            flights = await fetchLiveFlights();
        }
        
        // Toshkent vaqtini olish
        const now = new Date();
        const tashkentTimeStr = now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false });
        const tashkentDateStr = now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });

        const shortFlights = flights.slice(0, 50);
        
        let knowledgeBase = "";
        try {
            const kbPath = path.resolve('data/knowledge_base.txt');
            if (fs.existsSync(kbPath)) {
                knowledgeBase = fs.readFileSync(kbPath, 'utf8');
            }
        } catch (e) { console.error('Knowledge Base error:', e.message); }

        let modeSystemRole = "";
        if (transportMode === 'railway') {
            modeSystemRole = "Sen O'zbekiston Temir yo'llari (Vokzal) ning aqlli rasmiy dispatcher-san. Poyezdlar jadvali, poyezd reyslari (Afrosiyob, Sharq, Nasaf va b.), peronlar va vagonlar haqida ma'lumot berasan.";
        } else if (transportMode === 'bus') {
            modeSystemRole = "Sen Toshkent Markaziy Avtovokzalining aqlli rasmiy dispatcher-san. Shaharlararo avtobus reyslari, platformalar, chiptalar sotuvi va yo'nalishlar bo'yicha ma'lumot berasan.";
        } else {
            modeSystemRole = "Sen Toshkent xalqaro aeroportining (TAS) aqlli rasmiy dispatcher-san. Parvozlar jadvali, uchish/kelish terminali, stoykalar va gate-lar bo'yicha ma'lumot berasan.";
        }

        const sysInstruction = `${modeSystemRole}
MIJOZNING TANLAGAN TILI: "${language || 'uz'}"
TRANSPORT REJIMI: "${transportMode}"

DIQQAT: Sen faqat "${language || 'uz'}" tilida javob berishing SHART. 

REYSLAR / QATNOVLAR HAQIDA MUHIM:
Senga hozirgi vaqtdagi reyslar va qatnovlar ro'yxati berilgan. 
Agar mijoz so'ragan shahar bo'yicha qatnov topilmasa, "Hozirda bu yo'nalishda qatnovlar mavjud emas" deb javob ber.
Mijoz savoli: "${message}"

QAYTARISH QOIDALARI (FaQAT JSON QAYTAR):
Barcha javoblaring qisqa 1-2 gapdan iborat bo'lsin.
Javobing quyidagi JSON strukturada bo'lishi shart:
{
  "reply": "xabar",
  "show_earth_route": false,
  "origin": null,
  "destination": null,
  "location": null,
  "bus_route_name": null
}

AVIATSIYA REJIMI UCHUN MUHIM QOIDALAR:
- Agar mijoz biror shaharga (Moskva, Dubai, Istanbul va h.k.) parvoz haqida so'rasa:
  * "show_earth_route": true
  * "origin": "TAS" (har doim Toshkent)
  * "destination": o'sha shahardagi aeroportning IATA kodi (masalan Moskva = "SVO", Dubai = "DXB", Istanbul = "IST", London = "LHR", Frankfurt = "FRA", Paris = "CDG", Beijing = "PEK", Seoul = "ICN", Almaty = "ALA", Urumqi = "URC" va h.k.)
- Agar IATA kodi noma'lum bo'lsa, eng mashhur aeroportini tanlang.

AVTOBUS REJIMI UCHUN MUHIM QOIDALAR:
- Agar mijoz biror manzilga (Chorsu, Yunusobod, Chilonzor va h.k.) borishni so'rasa:
  * "bus_route_name" maydonida o'sha manzilga boradigan marshrut raqamini ko'rsat (masalan "28", "115", "1M" va h.k.)
  * Agar aniq marshrut noma'lum bo'lsa null qoldir
- Avtobuslar haqidagi savolda "show_earth_route": false bo'lishi shart.

TEMIR YO'L REJIMI UCHUN MUHIM QOIDALAR:
- Agar mijoz Samarqand, Buxoro, Qarshi, Andijon va boshqa shaharlarga poyezd haqida so'rasa, O'zbekiston hududi orqali yo'nalishini ayt.
- Temir yo'lda "show_earth_route": false bo'lishi shart.

Faol qatnovlar ro'yxati (bu ma'lumotdan foydalan):
${JSON.stringify(shortFlights)}`;

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: sysInstruction }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        reply: { type: "STRING" },
                        show_earth_route: { type: "BOOLEAN" },
                        origin: { type: "STRING", nullable: true },
                        destination: { type: "STRING", nullable: true },
                        location: { type: "STRING", nullable: true },
                        bus_route_name: { type: "STRING", nullable: true }
                    },
                    required: ["reply", "show_earth_route"]
                }
            }
        };

        const { data } = await axios.post(url, payload);
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        try {
            const parsed = JSON.parse(aiText);
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
        const { message, language, transportMode = 'aviation' } = req.body || {};
        let fallbackMsg = "Ma'lumotlar jadvalidan kerakli reysni ko'rishingiz mumkin.";
        if (transportMode === 'railway') {
            fallbackMsg = "Temir yo'llari bo'yicha ma'lumot: Reyslar jadvali bo'limidan poyezdlar va peronlar haqida aniq ma'lumot olishingiz mumkin.";
        } else if (transportMode === 'bus') {
            fallbackMsg = "Avtobus reyslari bo'yicha ma'lumot: Reyslar jadvali bo'limidan platformalar va chiptaxona ma'lumotlarini olishingiz mumkin.";
        } else {
            fallbackMsg = "Aeroport parvozlari bo'yicha ma'lumot: Reyslar jadvali bo'limidan uchish va kelish vaqtlarini aniqlashingiz mumkin.";
        }
        res.json({ reply: fallbackMsg });
    }
};

router.post('/chat', postChatHandler);
router.post('/chat.php', postChatHandler);

// Flights / Schedules Scraping Endpoint
const getFlightsHandler = async (req, res) => {
    try {
        const mode = req.query.mode || 'aviation';
        if (mode === 'railway') {
            return res.json(fetchRailwaySchedules());
        } else if (mode === 'bus') {
            return res.json(fetchBusSchedules());
        } else {
            const allFlights = await fetchLiveFlights();
            return res.json(allFlights);
        }
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Server xatosi' });
    }
};

router.get('/flights', getFlightsHandler);
router.get('/flights.php', getFlightsHandler);

// Missing Map endpoints
const getMapSettingsHandler = async (req, res) => {
    try {
        const mapDoc = await MapModel.findOne();
        res.json({ path: mapDoc ? mapDoc.image_path : 'img/airport_map.jpg' });
    } catch(err) {
        res.json({ path: 'img/airport_map.jpg' });
    }
};

router.get('/map_settings', getMapSettingsHandler);
router.get('/map_settings.php', getMapSettingsHandler);

const getScannerHandler = async (req, res) => {
    try {
        const points = await MapPoint.find();
        res.json(points);
    } catch(err) {
        res.json([]);
    }
};

router.get('/scanner', getScannerHandler);
router.get('/scanner.php', getScannerHandler);

const getBarriersHandler = async (req, res) => {
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
};

router.get('/barriers', getBarriersHandler);
router.get('/barriers.php', getBarriersHandler);

const getWeatherHandler = async (req, res) => {
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
};

router.get('/weather', getWeatherHandler);
router.get('/weather.php', getWeatherHandler);

const getDestinationCitiesHandler = async (req, res) => {
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
};

router.get('/destination_cities', getDestinationCitiesHandler);
router.get('/destination_cities.php', getDestinationCitiesHandler);

// Tashbus Integration & Fallback Data
let tashbusToken = null;
let tashbusTokenExpiry = 0;

async function getTashbusToken() {
    if (tashbusToken && Date.now() < tashbusTokenExpiry) {
        return tashbusToken;
    }
    const tashbusUrl = process.env.TASHBUS_URL || 'https://bmapi.dtransport.uz';
    const username = process.env.TASHBUS_USERNAME || 'hackathon';
    const password = process.env.TASHBUS_PASSWORD || 'H@cK@t0#';

    try {
        const { data } = await axios.post(`${tashbusUrl}/api/v1/auth/login`, { username, password }, { timeout: 5000 });
        const token = data?.data?.accessToken || data?.accessToken;
        if (token) {
            tashbusToken = token;
            tashbusTokenExpiry = Date.now() + 1000 * 60 * 30;
            return token;
        }
    } catch(e) {
        console.warn('Tashbus live auth failed, using local bus dataset:', e.message);
    }
    return null;
}

let localBusData = null;
function getLocalBusData() {
    if (!localBusData) {
        try {
            const busPath = path.resolve('data/bus_data.json');
            if (fs.existsSync(busPath)) {
                localBusData = JSON.parse(fs.readFileSync(busPath, 'utf8'));
            }
        } catch(e) {
            console.error('Local bus data load error:', e.message);
        }
    }
    return localBusData || { routes: [], vehicles: [] };
}

function normalizeRouteName(str) {
    if (!str) return '';
    return String(str)
        .replace(/-?avtobus/gi, '')
        .replace(/\u0422/g, 'T')
        .replace(/\u0442/g, 't')
        .replace(/[^\w]/g, '')
        .toLowerCase();
}

// GET /api/bus/routes (Route points and polylines)
const getBusRoutesHandler = async (req, res) => {
    try {
        const routeName = req.query.route || req.query.routeName;
        const token = await getTashbusToken();
        const tashbusUrl = process.env.TASHBUS_URL || 'https://bmapi.dtransport.uz';

        if (token) {
            try {
                const { data } = await axios.get(`${tashbusUrl}/api/v2/routes/points`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });
                let list = data?.data || data || [];
                if (routeName) {
                    const targetNorm = normalizeRouteName(routeName);
                    let filtered = list.filter(r => 
                        normalizeRouteName(r.routeName) === targetNorm || 
                        normalizeRouteName(r.routeId) === targetNorm
                    );
                    if (filtered.length > 0) list = filtered;
                }
                return res.json({ success: true, source: 'live', data: list });
            } catch(e) {
                console.warn('Tashbus live routes failed, using fallback:', e.message);
            }
        }

        const local = getLocalBusData();
        let list = local.routes || [];
        if (routeName) {
            const targetNorm = normalizeRouteName(routeName);
            let filtered = list.filter(r => 
                normalizeRouteName(r.routeName) === targetNorm || 
                normalizeRouteName(r.routeId) === targetNorm
            );

            if (filtered.length === 0) {
                const numOnly = targetNorm.match(/\d+/)?.[0];
                if (numOnly) {
                    filtered = list.filter(r => normalizeRouteName(r.routeName) === numOnly);
                }
            }

            list = filtered;
        }
        res.json({ success: true, source: 'local', data: list });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

router.get('/bus/routes', getBusRoutesHandler);
router.get('/bus/routes.php', getBusRoutesHandler);

// GET /api/bus/vehicles (Live vehicle positions)
const getBusVehiclesHandler = async (req, res) => {
    try {
        const routeName = req.query.route || req.query.routeName;
        const token = await getTashbusToken();
        const tashbusUrl = process.env.TASHBUS_URL || 'https://bmapi.dtransport.uz';

        if (token) {
            try {
                const { data } = await axios.get(`${tashbusUrl}/api/v2/vehicles/tracking`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });
                let list = data?.data || data || [];
                if (routeName) {
                    const targetNorm = normalizeRouteName(routeName);
                    list = list.filter(v => normalizeRouteName(v.routeName) === targetNorm || normalizeRouteName(v.routeId) === targetNorm);
                }
                return res.json({ success: true, source: 'live', data: list });
            } catch(e) {
                console.warn('Tashbus live vehicles failed, using fallback:', e.message);
            }
        }

        const local = getLocalBusData();
        let list = local.vehicles || [];
        if (routeName) {
            const targetNorm = normalizeRouteName(routeName);
            list = list.filter(v => normalizeRouteName(v.routeName) === targetNorm || normalizeRouteName(v.routeId) === targetNorm);
        }
        res.json({ success: true, source: 'local', data: list });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

router.get('/bus/vehicles', getBusVehiclesHandler);
router.get('/bus/vehicles.php', getBusVehiclesHandler);

// GET /api/bus/nearby (Nearby live buses based on lat/lng)
const getBusNearbyHandler = async (req, res) => {
    try {
        // Tashkent International Airport Terminal 2 (Islam Karimov Airport)
        const kioskLat = parseFloat(req.query.lat) || 41.2579;
        const kioskLng = parseFloat(req.query.lng) || 69.2812;
        const maxDistKm = parseFloat(req.query.radius) || 5.0;

        const token = await getTashbusToken();
        const tashbusUrl = process.env.TASHBUS_URL || 'https://bmapi.dtransport.uz';
        let vehiclesList = [];

        if (token) {
            try {
                const { data } = await axios.get(`${tashbusUrl}/api/v1/vehicles/current/position`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });
                vehiclesList = data?.data || data || [];
            } catch(e) {
                console.warn('Tashbus live nearby vehicles failed, using fallback:', e.message);
            }
        }

        if (!vehiclesList || vehiclesList.length === 0) {
            const local = getLocalBusData();
            vehiclesList = local.vehicles || [];
        }

        function haversine(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        const nearby = vehiclesList
            .filter(v => v.loc && v.loc.lat && v.loc.lng)
            .map(v => {
                const distKm = haversine(kioskLat, kioskLng, v.loc.lat, v.loc.lng);
                const etaMin = Math.max(1, Math.round((distKm / 20) * 60));
                return {
                    ...v,
                    distanceKm: parseFloat(distKm.toFixed(2)),
                    distanceMeters: Math.round(distKm * 1000),
                    etaMin
                };
            })
            .filter(v => v.distanceKm <= maxDistKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);

        res.json({
            success: true,
            kioskPos: { lat: kioskLat, lng: kioskLng },
            totalNearby: nearby.length,
            data: nearby
        });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

router.get('/bus/nearby', getBusNearbyHandler);
router.get('/bus/nearby.php', getBusNearbyHandler);

// Catch-all fallback for any /bus/* requests so it ALWAYS returns JSON and NEVER returns HTML 404
router.get('/bus/*', (req, res) => {
    const local = getLocalBusData();
    res.json({ success: true, source: 'fallback', data: local.vehicles || [] });
});

const postCaptureHandler = async (req, res) => {
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
};

router.post('/capture', postCaptureHandler);
router.post('/capture.php', postCaptureHandler);

const postSttHandler = async (req, res) => {
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
        const langCode = (req.body.language || 'uz').toLowerCase();

        let sttInstruction = `Ushbu ovozli xabarni (audio) diqqat bilan eshitib, undagi gaplarni "${langCode}" tilida matnga o'girib ber (transcription). Faqat matnni o'zini qaytar, hech qanday qo'shimcha izoh yozma.`;
        if (langCode === 'uz') {
            sttInstruction = `Ushbu ovozli xabarni (audio) diqqat bilan eshitib, o'zbek tilidagi gaplarni aniq o'zbekcha matnga (aytilinganiga qarab) o'girib ber. Faqat transkripsiyaning o'zini qaytar, boshqa hech qanday izoh yozma.`;
        } else if (langCode === 'ru') {
            sttInstruction = `Внимательно прослушай это аудиосообщение и расшифруй речь на русском языке. Верни только текст расшифровки без каких-либо комментариев.`;
        } else if (langCode === 'en') {
            sttInstruction = `Listen to this audio carefully and transcribe the speech into English text. Return only the transcript text without extra comments.`;
        }
        let mimeType = req.file.mimetype ? req.file.mimetype.split(';')[0].trim() : '';
        if (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.wav')) {
            mimeType = 'audio/wav';
        } else if (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.webm')) {
            mimeType = 'audio/webm';
        } else if (mimeType === 'application/octet-stream' || !mimeType) {
            mimeType = 'audio/wav';
        }

        const model = process.env.GEMINI_STT_MODEL || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: sttInstruction },
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
        res.json({ error: errorDetails });
    }
};

router.post('/stt', upload.single('audio'), postSttHandler);
router.post('/stt.php', upload.single('audio'), postSttHandler);

async function synthesizeGeminiTTS(text, voiceName, apiKey, retries = 1) {
    if (!text || !text.trim()) return null;
    const cacheKey = `${text.trim()}_${voiceName}`;
    if (ttsCache.has(cacheKey)) {
        console.log(`[TTS Cache] Cache hit: "${text.trim().substring(0, 30)}..."`);
        return ttsCache.get(cacheKey);
    }

    const ttsModel = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${apiKey}`;
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
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const { data } = await axios.post(url, payload);
            const pcmBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (pcmBase64) {
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
                
                const resultBuffer = Buffer.concat([wavHeader, pcmBuffer]);
                if (ttsCache.size >= MAX_TTS_CACHE_SIZE) {
                    const firstKey = ttsCache.keys().next().value;
                    ttsCache.delete(firstKey);
                }
                ttsCache.set(cacheKey, resultBuffer);
                return resultBuffer;
            }
        } catch (e) {
            console.error(`TTS synth attempt ${attempt} err:`, e?.response?.data || e.message);
            if (attempt < retries) await new Promise(r => setTimeout(r, 300));
        }
    }
    return null;
}

const postGeminiVoiceHandler = async (req, res) => {
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
};

router.post('/gemini_voice', postGeminiVoiceHandler);
router.post('/gemini_voice.php', postGeminiVoiceHandler);

const postGeminiStreamTtsHandler = async (req, res) => {
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

        // Matnni gaplarga bo'lish (150+ belgidan iborat bloklarga birlashtirish)
        const rawSentences = text.split(/(?<=[.!?;])\s+/);
        const sentences = [];
        
        let currentChunk = "";
        for (const s of rawSentences) {
            currentChunk += (currentChunk ? " " : "") + s;
            if (currentChunk.length >= 150) {
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
};

router.post('/gemini_stream_tts', postGeminiStreamTtsHandler);
router.post('/gemini_stream_tts.php', postGeminiStreamTtsHandler);

export default router;
