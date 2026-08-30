const fs = require('fs');
let s = fs.readFileSync('server.ts', 'utf8');
s = s.replace(/gemini-1\.5-flash/g, 'gemini-3.5-flash');
s = s.replace(/gemini-1\.5-pro/g, 'gemini-3.1-pro-preview');
fs.writeFileSync('server.ts', s, 'utf8');
