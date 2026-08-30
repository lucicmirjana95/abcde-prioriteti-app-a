const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/language === "tr" \? "İngilizce" : "Serbian"/g, 'language === "tr" ? "Turkish" : "Serbian"');
fs.writeFileSync('server.ts', code);
