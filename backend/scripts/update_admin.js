import db from '../config/db.js';
import bcrypt from 'bcrypt';

async function update() {
    const newLogin = 'tasffxh';
    const newPass = 'tasffxh';
    const hash = await bcrypt.hash(newPass, 10);
    
    try {
        const res = await db.query(
            'UPDATE users SET username = $1, password = $2 WHERE username = $3 OR username = $4 RETURNING id',
            [newLogin, hash, 'admin', 'tasffxh']
        );
        
        if (res.rowCount > 0) {
            console.log(`[Success] Admin credentials updated to: ${newLogin}`);
        } else {
            // Agar topilmasa, yaratamiz
            await db.query(
                'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)',
                [newLogin, hash, 'Administrator', 'admin']
            );
            console.log(`[Success] Admin user created with: ${newLogin}`);
        }
    } catch (e) {
        console.error('[Error] DB update failed:', e.message);
    } finally {
        process.exit(0);
    }
}

update();
