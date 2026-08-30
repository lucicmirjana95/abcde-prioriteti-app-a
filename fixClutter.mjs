import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/dark:hover:bg-white dark:bg-\[#1C1C1E\]/g, 'dark:hover:bg-white/5');
  content = content.replace(/dark:bg-white dark:bg-\[#1C1C1E\]/g, 'dark:bg-white/5');
  content = content.replace(/dark:text-white dark:text-\[#F2F2F7\]/g, 'dark:text-[#F2F2F7]');
  content = content.replace(/text-\[#3C3C43\] dark:text-\[#8E8E93\] dark:text-white/g, 'text-[#3C3C43] dark:text-white');
  content = content.replace(/text-\[13px\] text-\[#8E8E93\]/g, 'text-[13px] text-[#8E8E93]');
  content = content.replace(/text-\[#8E8E93\] font-medium text-\[#007AFF\]/g, 'font-medium text-[#007AFF]');
  content = content.replace(/text-\[#8E8E93\] font-mono font-semibold text-\[#007AFF\]/g, 'font-mono font-semibold text-[#007AFF]');
  content = content.replace(/text-\[13px\] text-\[#8E8E93\] text-\[#3C3C43\] dark:text-\[#8E8E93\]/g, 'text-[13px] text-[#3C3C43] dark:text-[#8E8E93]');
  content = content.replace(/text-\[#3C3C43\] dark:text-\[#8E8E93\] dark:text-\[#F2F2F7\]/g, 'text-[#3C3C43] dark:text-[#EBEBF5]');

  // Strip duplicate bg entries
  content = content.replace(/bg-black\/10 dark:bg-white\/5 dark:bg-white\/5/g, 'bg-black/10 dark:bg-white/5');
  content = content.replace(/bg-black\/5 dark:bg-\[#1C1C1E\]/g, 'bg-black/5 dark:bg-white/5');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned up classes in: ${filePath}`);
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
console.log("Clutter cleaning completed.");
