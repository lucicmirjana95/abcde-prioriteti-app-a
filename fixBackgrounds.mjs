import fs from 'fs';
const file = 'src/components/MorningAIHub.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace bg-[#F2F2F7] with bg-white + shadow-sm for cards
content = content.replace(/bg-\[#F2F2F7\] dark:bg-\[#1C1C1E\] border border-black\/5/g, "bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]");
content = content.replace(/bg-\[#F2F2F7\] dark:bg-\[#1C1C1E\]/g, "bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]");

fs.writeFileSync(file, content);
