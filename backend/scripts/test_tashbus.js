import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testTashbusAPI() {
    const username = process.env.TASHBUS_USERNAME || 'hackathon';
    const password = process.env.TASHBUS_PASSWORD || 'H@cK@t0#';

    console.log('Credentials:', { username, password });

    const hosts = [
        'https://bmapi.dtransport.uz',
        'http://bmapi.dtransport.uz',
        'http://bmapi.dtransport.uz:8080',
        'http://bmapi.dtransport.uz:8000',
        'http://bmapi.dtransport.uz:3000'
    ];

    for (const host of hosts) {
        console.log('\n--- Testing host:', host, '---');
        
        // 1. Try login
        try {
            const res = await axios.post(`${host}/api/v1/auth/login`, { username, password }, { timeout: 5000 });
            console.log('LOGIN SUCCESS!', res.status, res.data);
            
            const token = res.data?.data?.accessToken || res.data?.accessToken || res.data?.token;
            if (token) {
                console.log('TOKEN ACQUIRED:', token.substring(0, 30) + '...');
                const rRes = await axios.get(`${host}/api/v1/routes/points`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('ROUTES POINTS SUCCESS:', rRes.data?.data?.length || rRes.data?.length);
            }
        } catch (e) {
            console.log('Login err:', host, e.response?.status, e.response?.data || e.message);
        }

        // 2. Try unauthenticated routes/points
        try {
            const res = await axios.get(`${host}/api/v1/routes/points`, { timeout: 3000 });
            console.log('Public routes success:', res.status, res.data?.data?.length);
        } catch (e) {}
    }
}

testTashbusAPI();
