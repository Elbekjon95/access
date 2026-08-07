import fs from 'fs';
import path from 'path';

try {
    const jsonPath = path.resolve('../VEHICLE TRACKING TELECOM.json');
    const collection = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    function extractItems(items, folder = '') {
        for (const item of items) {
            if (item.item) {
                extractItems(item.item, folder ? `${folder} > ${item.name}` : item.name);
            } else if (item.request) {
                const req = item.request;
                const method = req.method;
                const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';
                const headers = req.header;
                const body = req.body?.raw || '';
                console.log(`[${folder}] ${item.name} -> ${method} ${url}`);
                if (headers && headers.length) console.log('  Headers:', headers);
                if (body) console.log('  Body:', body.substring(0, 100));
            }
        }
    }

    if (collection.item) {
        extractItems(collection.item);
    }
} catch (e) {
    console.error(e.message);
}
