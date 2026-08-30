import fs from 'fs';
const contents = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf8');
const lines = contents.split('\n');
const newLines = [...lines.slice(0, 3476), ...lines.slice(4403)];
fs.writeFileSync('src/components/MorningAIHub.tsx', newLines.join('\n'));
