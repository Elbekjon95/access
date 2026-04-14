import db from '../config/db.js';

async function clear() {
    try {
        console.log('[Database] Foydalanuvchilar o\'chirilmoqda...');
        await db.query('TRUNCATE users CASCADE');
        console.log('[Success] Barcha foydalanuvchilar o\'chirib tashlandi.');
    } catch (e) {
        console.error('[Error] Tozalashda xato:', e.message);
    } finally {
        process.exit(0);
    }
}

clear();
