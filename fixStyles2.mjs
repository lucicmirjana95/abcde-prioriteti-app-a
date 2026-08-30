import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Kill weird transparent backgrounds substituting real native components
  content = content.replace(/bg-black\/60/g, 'bg-[#F2F2F7] dark:bg-[#1C1C1E]');
  content = content.replace(/bg-black\/80/g, 'bg-[#F2F2F7] dark:bg-[#1C1C1E]');
  content = content.replace(/bg-black\/50/g, 'bg-[#F2F2F7] dark:bg-[#1C1C1E]');
  content = content.replace(/bg-white\/[0-9]+/g, 'bg-white dark:bg-[#1C1C1E]');
  
  // Borders
  content = content.replace(/border-slate-805/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-slate-800\/80/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-indigo-900\/60/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-indigo-900/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-slate-900\/40/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-slate-900/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-[#E2DFD6]/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/border-white\/5\/60/g, 'border-black/5 dark:border-white/5');

  // Odd text colors
  content = content.replace(/text-slate-900/g, 'text-black dark:text-white');
  content = content.replace(/text-[#1C1A17]/g, 'text-black dark:text-white');
  content = content.replace(/text-slate-100/g, 'text-black dark:text-white');
  content = content.replace(/text-slate-200/g, 'text-black dark:text-white');
  content = content.replace(/text-slate-300/g, 'text-[#8E8E93]');
  content = content.replace(/text-slate-400/g, 'text-[#8E8E93]');
  content = content.replace(/text-amber-[34]00/g, 'text-[#FF9500]');
  content = content.replace(/text-[#FAF9F5]/g, 'text-[#F2F2F7]');
  
  // Custom theme colors fallback to HIG standard light/dark 
  content = content.replace(/bg-\[#1C1A17\]/g, 'bg-black dark:bg-white');
  content = content.replace(/bg-slate-950/g, 'bg-[#1C1C1E]');
  content = content.replace(/bg-slate-900/g, 'bg-[#1C1C1E]');

  // Corners
  content = content.replace(/rounded-\[20px\]/g, 'rounded-[10px]');
  content = content.replace(/rounded-2xl/g, 'rounded-[10px]');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed more generic styles in: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath) : (dirPath.endsWith('.tsx') && fixFile(dirPath));
  });
}

walkDir('./src');
console.log("Cleanup 2 complete.");
