import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function runImport() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'postgres',
        database: process.env.DB_NAME || 'acsess4',
        port: process.env.DB_PORT || 5432
    });

    try {
        await client.connect();
        console.log("Connected to server DB...");

        const data = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));

        console.log("Cleaning old data...");
        await client.query("TRUNCATE maps, map_points, map_barriers RESTART IDENTITY CASCADE");

        console.log("Importing maps...");
        for (const m of data.maps) {
            await client.query(
                "INSERT INTO maps (floor_name, image_path, width, height) VALUES ($1, $2, $3, $4)",
                [m.floor_name, m.image_path, m.width, m.height]
            );
        }

        console.log("Importing points...");
        // Asume map_id=1 for now as we only have one floor
        for (const p of data.points) {
            await client.query(
                "INSERT INTO map_points (map_id, name, type, pos_x, pos_y) VALUES ($1, $2, $3, $4, $5)",
                [1, p.name, p.type, p.pos_x, p.pos_y]
            );
        }

        console.log("Importing barriers...");
        for (const b of data.barriers) {
            await client.query(
                "INSERT INTO map_barriers (map_id, barrier_data) VALUES ($1, $2)",
                [1, b.barrier_data]
            );
        }

        console.log("Import completed successfully!");
        await client.end();
    } catch (err) {
        console.error("Import error:", err.message);
        process.exit(1);
    }
}

runImport();
