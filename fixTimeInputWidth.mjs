import fs from 'fs';
let content = fs.readFileSync('./src/components/SettingsPanel.tsx', 'utf8');
content = content.replace(/w-\[65px\]/g, 'w-[80px]');
fs.writeFileSync('./src/components/SettingsPanel.tsx', content, 'utf8');
