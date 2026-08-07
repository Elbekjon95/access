import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/acsess4';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`[MongoDB] Muvaffaqiyatli ulandi: ${conn.connection.host}`);
    } catch (error) {
        console.warn(`[MongoDB Warning] Ulanishda ogohlantirish: ${error.message}. Server to'xtamaydi.`);
    }
};

export default mongoose;
