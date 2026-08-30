import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf-8');
c = c.replace(/bg-\[#FFFFFF\] dark:bg-\[#000000\]/g, 'hig-bg');
fs.writeFileSync('src/App.tsx', c);
