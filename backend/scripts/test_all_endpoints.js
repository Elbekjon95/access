import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testAll() {
    const baseUrl = process.env.TASHBUS_URL || 'https://bmapi.dtransport.uz';
    const username = process.env.TASHBUS_USERNAME || 'hackathon';
    const password = process.env.TASHBUS_PASSWORD || 'H@cK@t0#';

    console.log('Testing Base URL:', baseUrl);
    console.log('Credentials:', { username, password });

    // Try login variations
    const loginPayloads = [
        { username, password },
        { email: username, password },
        { user: username, pass: password },
        { username: 'hackathon@dtransport.uz', password }
    ];

    for (const payload of loginPayloads) {
        try {
            const res = await axios.post(`${baseUrl}/api/v1/auth/login`, payload, {
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
            });
            console.log('LOGIN SUCCESS with payload:', payload, res.data);
        } catch (e) {
            console.log('Login failed for:', payload.username || payload.email, e.response?.status, e.response?.data);
        }
    }

    // Try fetching unauthenticated endpoints
    const endpoints = [
        '/api/v1/vehicles/current/position',
        '/api/v1/vehicles/current/position/xml',
        '/api/v1/routes/points',
        '/api/v2/routes/points',
        '/api/v1/routes',
        '/api/v1/buses'
    ];

    for (const ep of endpoints) {
        try {
            const res = await axios.get(`${baseUrl}${ep}`, { timeout: 5000 });
            console.log('EP SUCCESS:', ep, res.status, (typeof res.data === 'object' ? JSON.stringify(res.data) : res.data).substring(0, 300));
        } catch (e) {
            console.log('EP err:', ep, e.response?.status, e.message);
        }
    }
}

testAll();
