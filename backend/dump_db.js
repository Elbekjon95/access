import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const { Client } = pg;

async function dump() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'postgres',
        database: process.env.DB_NAME || 'acsess4',
        port: process.env.DB_PORT || 5432
    });

    try {
        await client.connect();
        console.log("Connected to local DB...");

        const maps = await client.query("SELECT * FROM maps");
        const points = await client.query("SELECT * FROM map_points");
        const barriers = await client.query("SELECT * FROM map_barriers");

        const data = {
            maps: maps.rows,
            points: points.rows,
            barriers: barriers.rows
        };

        fs.writeFileSync('seed_data.json', JSON.stringify(data, null, 2));
        console.log("Successfully dumped data to seed_data.json");
        
        await client.end();
    } catch (err) {
        console.error("Dump error:", err.message);
        process.exit(1);
    }
}

dump();
