import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function init() {
    const dbName = process.env.DB_NAME || 'acsess4';
    
    // 1. Dastlab 'postgres' bazasiga ulanib, yangi bazani yaratamiz
    const client = new Client({
        host: process.env.DB_HOST || 'PostgreSQL-16',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'postgres',
        database: 'postgres',
        port: 5432
    });

    try {
        await client.connect();
        
        // Baza borligini tekshirish
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
        
        if (res.rowCount === 0) {
            console.log(`[Database] '${dbName}' yaratilmoqda...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`[Database] '${dbName}' muvaffaqiyatli yaratildi.`);
        } else {
            console.log(`[Database] '${dbName}' allaqachon mavjud.`);
        }
        await client.end();

        // 2. Endi yangi yaratilgan bazaga ulanib, jadvallarni yaratamiz
        const dbClient = new Client({
            host: process.env.DB_HOST || 'PostgreSQL-16',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASS || 'postgres',
            database: dbName,
            port: 5432
        });

        await dbClient.connect();
        console.log(`[Schema] Jadvallar yaratilmoqda...`);

        const schema = `
            -- Users
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(10) CHECK (role IN ('admin', 'user')) DEFAULT 'user',
                face_encoding TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Maps
            CREATE TABLE IF NOT EXISTS maps (
                id SERIAL PRIMARY KEY,
                floor_name VARCHAR(50) NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                width INT DEFAULT 0,
                height INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Map Points
            CREATE TABLE IF NOT EXISTS map_points (
                id SERIAL PRIMARY KEY,
                map_id INT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(20) CHECK (type IN ('gate', 'fids', 'toilet', 'reception', 'other', 'kiosk_start', 'entrance', 'exit', 'cafe', 'restaurant', 'info', 'counter', 'mosque', 'shop', 'cip', 'vip')) DEFAULT 'other',
                pos_x FLOAT NOT NULL,
                pos_y FLOAT NOT NULL
            );

            -- Map Barriers
            CREATE TABLE IF NOT EXISTS map_barriers (
                id SERIAL PRIMARY KEY,
                map_id INT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
                barrier_data TEXT NOT NULL
            );

            -- Customer Captures
            CREATE TABLE IF NOT EXISTS customer_captures (
                id SERIAL PRIMARY KEY,
                image_path VARCHAR(255) NOT NULL,
                captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Chats
            CREATE TABLE IF NOT EXISTS chats (
                id SERIAL PRIMARY KEY,
                capture_id INT REFERENCES customer_captures(id) ON DELETE SET NULL,
                user_message TEXT NOT NULL,
                ai_response TEXT NOT NULL,
                language VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Complaints
            CREATE TABLE IF NOT EXISTS complaints (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NULL,
                contact VARCHAR(100) NULL,
                message TEXT NOT NULL,
                status VARCHAR(10) CHECK (status IN ('new', 'seen', 'resolved')) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await dbClient.query(schema);
        console.log(`[Schema] Barcha jadvallar muvaffaqiyatli yaratildi.`);

        // 3. Admin foydalanuvchisini qo'shish (tasffxh / tasffxh)
        const checkAdmin = await dbClient.query(`SELECT 1 FROM users WHERE username = 'tasffxh'`);
        if (checkAdmin.rowCount === 0) {
            console.log(`[Data] Admin foydalanuvchisi yaratilmoqda...`);
            // bcrypt hash for 'tasffxh': $2b$10$TX5XMl33U4PNbtPuZiq9vuHJRZiqmMfIGsKsL.eaAeF1eEkYDx.FS
            await dbClient.query(`
                INSERT INTO users (username, password, full_name, role) 
                VALUES ('tasffxh', '$2b$10$TX5XMl33U4PNbtPuZiq9vuHJRZiqmMfIGsKsL.eaAeF1eEkYDx.FS', 'Administrator', 'admin')
            `);
            console.log(`[Data] Admin yaratildi (Login: tasffxh / Parol: tasffxh).`);
        }

        await dbClient.end();
        console.log(`\n--- Barcha ishlar yakunlandi ---`);

    } catch (err) {
        console.error(`[XATO] Ayrim bosqichlarda xatolik yuz berdi:`, err.message);
        process.exit(1);
    }
}

init();
