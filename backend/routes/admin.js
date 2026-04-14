import express from 'express';
import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'acsess_secret_key_2024';

// Login API
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.status(401).json({ error: 'Parol noto\'g\'ri' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Dashboard Statistika API
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const chatStats = await db.query('SELECT COUNT(*) as total FROM chats');
        const complaintStats = await db.query('SELECT COUNT(*) as total FROM complaints WHERE status = \'new\'');
        const userStats = await db.query('SELECT COUNT(*) as total FROM users');
        const recentChats = await db.query('SELECT * FROM chats ORDER BY created_at DESC LIMIT 5');
        
        // Oxirgi 7 kunlik statistika (Infografika uchun)
        const dailyStats = await db.query(`
            SELECT TO_CHAR(created_at, 'DD.MM') as date, COUNT(*) as count 
            FROM chats 
            WHERE created_at > CURRENT_DATE - INTERVAL '7 days' 
            GROUP BY date, created_at 
            ORDER BY created_at ASC
        `);
        
        res.json({
            total_chats: parseInt(chatStats.rows[0].total),
            new_complaints: parseInt(complaintStats.rows[0].total),
            total_users: parseInt(userStats.rows[0].total),
            recent_chats: recentChats.rows,
            daily_stats: dailyStats.rows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Admin Foydalanuvchilar Boshqaruvi ---

// Barcha foydalanuvchilarni olish
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, full_name, role, created_at FROM users ORDER BY id ASC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Yangi admin qo'shish (Bootstrap rejimi bilan)
router.post('/users', async (req, res, next) => {
    try {
        const { rows: countRows } = await db.query('SELECT COUNT(*) as total FROM users');
        const userCount = parseInt(countRows[0].total);
        
        // Agar bazada user bo'lsa, tokenni tekshiramiz. Agar bo'lmasa (bootstrap), o'tkazib yuboramiz.
        if (userCount > 0) {
            return authenticateToken(req, res, next);
        }
        next();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}, async (req, res) => {
    const { username, password, full_name, role = 'admin' } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await db.query(
            'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hashedPassword, full_name, role]
        );
        res.json({ success: true, id: rows[0].id });
    } catch (e) {
        console.error('[Admin Register Error]:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Adminni o'chirish
router.delete('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Asosiy adminni o'chirib bo'lmaydi (username: admin)
        const check = await db.query('SELECT username FROM users WHERE id = $1', [id]);
        if (check.rows.length && check.rows[0].username === 'admin') {
            return res.status(403).json({ error: 'Asosiy adminni o\'chirib bo\'lmaydi' });
        }
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Chatlar va Shikoyatlar ---

router.get('/chats', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM chats ORDER BY created_at DESC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/complaints', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM complaints ORDER BY created_at DESC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Shikoyat holatini o'zgartirish
router.post('/complaints/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE complaints SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Map Editor APIs (Original) ---

router.get('/map/points', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM map_points ORDER BY id ASC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/map/points', authenticateToken, async (req, res) => {
    const { id, name, type, pos_x, pos_y, map_id = 1 } = req.body;
    try {
        if (id) {
            await db.query(
                'UPDATE map_points SET name = $1, type = $2, pos_x = $3, pos_y = $4 WHERE id = $5',
                [name, type, pos_x, pos_y, id]
            );
            res.json({ success: true, id });
        } else {
            const { rows } = await db.query(
                'INSERT INTO map_points (map_id, name, type, pos_x, pos_y) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [map_id, name, type, pos_x, pos_y]
            );
            res.json({ success: true, id: rows[0].id });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/map/points/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM map_points WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/map/barriers', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM map_barriers ORDER BY id ASC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/map/barriers', authenticateToken, async (req, res) => {
    const { barrier_data, map_id = 1 } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO map_barriers (map_id, barrier_data) VALUES ($1, $2) RETURNING id',
            [map_id, typeof barrier_data === 'string' ? barrier_data : JSON.stringify(barrier_data)]
        );
        res.json({ success: true, id: rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/map/barriers/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM map_barriers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
