import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');
content = content.replace(/setIsSettingsOpen\(true\)/g, "setActiveTab('settings')");
fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Fixed settings tap target in mobile header.");
