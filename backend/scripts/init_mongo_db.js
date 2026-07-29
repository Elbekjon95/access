import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import User from '../models/User.js';
import Map from '../models/Map.js';
import MapPoint from '../models/MapPoint.js';
import MapBarrier from '../models/MapBarrier.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/acsess4';

async function initMongo() {
    try {
        console.log(`[MongoDB Init] ${MONGODB_URI} ga ulanilmoqda...`);
        await mongoose.connect(MONGODB_URI);
        console.log(`[MongoDB Init] Ulanish hosil qilindi.`);

        // 1. Admin foydalanuvchilarini yaratish
        const adminUsers = [
            { username: 'tasffxh', pass: 'tasffxh', name: 'Administrator' },
            { username: 'admin', pass: 'admin', name: 'System Admin' }
        ];

        for (const u of adminUsers) {
            const exists = await User.findOne({ username: u.username });
            if (!exists) {
                const hashedPassword = await bcrypt.hash(u.pass, 10);
                await User.create({
                    username: u.username,
                    password: hashedPassword,
                    full_name: u.name,
                    role: 'admin'
                });
                console.log(`[Data] Admin yaratildi (Login: ${u.username} / Parol: ${u.pass})`);
            } else {
                console.log(`[Data] Admin '${u.username}' allaqachon mavjud.`);
            }
        }

        // 2. Seed datadan xarita va nuqtalarni yuklash
        const seedPath = path.resolve('../seed_data.json');
        if (fs.existsSync(seedPath)) {
            const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

            // Xaritalar
            const mapCount = await Map.countDocuments();
            if (mapCount === 0 && seedData.maps) {
                for (const m of seedData.maps) {
                    await Map.create({
                        map_id: m.id || 1,
                        floor_name: m.floor_name || 'Aerovokzal',
                        image_path: m.image_path || '/img/airport_map.jpg',
                        width: m.width || 1000,
                        height: m.height || 1000
                    });
                }
                console.log(`[Data] Xaritalar seed qilindi.`);
            }

            // Map Points
            const pointCount = await MapPoint.countDocuments();
            if (pointCount === 0 && seedData.points) {
                for (const p of seedData.points) {
                    await MapPoint.create({
                        map_id: 1,
                        name: p.name,
                        type: p.type || 'other',
                        pos_x: p.pos_x,
                        pos_y: p.pos_y
                    });
                }
                console.log(`[Data] Xarita nuqtalari seed qilindi (${seedData.points.length} ta).`);
            }

            // Map Barriers
            const barrierCount = await MapBarrier.countDocuments();
            if (barrierCount === 0 && seedData.barriers) {
                for (const b of seedData.barriers) {
                    const parsedData = typeof b.barrier_data === 'string' ? JSON.parse(b.barrier_data) : b.barrier_data;
                    await MapBarrier.create({
                        map_id: b.map_id || 1,
                        barrier_data: parsedData
                    });
                }
                console.log(`[Data] Xarita to'siqlari seed qilindi (${seedData.barriers.length} ta).`);
            }
        }

        console.log(`\n--- MongoDB initializatsiyasi muvaffaqiyatli yakunlandi ---`);
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error(`[XATO] Initializatsiyada xatolik:`, err.message);
        process.exit(1);
    }
}

initMongo();
