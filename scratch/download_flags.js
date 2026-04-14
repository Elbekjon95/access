const https = require('https');
const fs = require('fs');
const path = require('path');

const codes = ["uz", "ru", "us", "tr", "sa", "cn", "kr", "jp", "de", "fr", "es", "it", "pt", "tj", "kz", "kg", "tm", "in", "pk", "az"];
const destDir = path.join(__dirname, '../frontend/public/img/flags');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

function download(code) {
    const url = `https://flagcdn.com/${code}.svg`;
    const filePath = path.join(destDir, `${code}.svg`);
    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`[DONE] ${code}.svg yuklandi.`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        console.error(`[ERR] ${code}.svg: ${err.message}`);
    });
}

console.log("Bayroqlarni yuklash boshlandi...");
codes.forEach(code => download(code));
