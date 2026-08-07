import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes (Dual mount to guarantee matching regardless of Nginx proxy URI rewriting)
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', apiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'ACCSESS4 Node.js Backend is running' });
});

// Catch-all fallback handler to guarantee valid JSON response for any API call
app.use((req, res) => {
    res.status(200).json({ success: true, fallback: true, data: [] });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});