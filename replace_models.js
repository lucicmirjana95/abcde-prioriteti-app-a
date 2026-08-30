const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/gemini-2.5-flash/g, 'gemini-2.0-flash');
content = content.replace(/gemini-3.5-flash/g, 'gemini-2.0-flash');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced all deprecated model references.');
