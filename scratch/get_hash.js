import bcrypt from 'bcrypt';
const pass = 'tasffxh';
const hash = await bcrypt.hash(pass, 10);
console.log('HASH:', hash);
