import fs from 'fs';
const file = 'src/components/VisionStrategy.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-black\/5 dark:bg-white\/5 text-\[#3C3C43\] dark:text-\[#EBEBF5\]\/80 hover:bg-black\/10 dark:hover:bg-white\/10/g, "bg-white dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]");
content = content.replace(/className={\`px-3 py-1.5 rounded-\[10px\] text-xs font-semibold cursor-pointer transition-all/g, "className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold cursor-pointer transition-all border");

fs.writeFileSync(file, content);
