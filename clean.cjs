const fs = require('fs');
let code = fs.readFileSync('src/components/MindsetCoach.tsx', 'utf8');
code = code.replace(/( dark:disabled:text-\[#707074\])+/g, ' dark:disabled:text-[#707074]');
fs.writeFileSync('src/components/MindsetCoach.tsx', code);
