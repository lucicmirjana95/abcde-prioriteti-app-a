import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Clean duplicates and weird combos
  content = content.replace(/dark:bg-black\/5 dark:bg-white\/5/g, 'dark:bg-white/5');
  content = content.replace(/dark:bg-white\/5 dark:bg-white\/5/g, 'dark:bg-white/5');
  content = content.replace(/dark:bg-white dark:bg-\[#1C1C1E\]/g, 'dark:bg-[#1C1C1E]');
  content = content.replace(/dark:hover:bg-white dark:bg-white/g, 'dark:hover:bg-white');
  content = content.replace(/dark:bg-white dark:text-white/g, 'dark:bg-[#1C1C1E] dark:text-white');
  content = content.replace(/dark:bg-black dark:bg-white/g, 'dark:bg-black');
  content = content.replace(/bg-black dark:bg-white text/g, 'bg-black dark:bg-white/10 text');
  content = content.replace(/dark:text-[#8E8E93] dark:text-white/g, 'dark:text-[#8E8E93]');
  content = content.replace(/dark:text-[#8E8E93] dark:text-\[#8A8A8E\] dark:text-\[#EBEBF54D\]/g, 'dark:text-[#EBEBF54D]');
  content = content.replace(/dark:text-[#8E8E93] dark:text-\[#EBEBF54D\]/g, 'dark:text-[#EBEBF54D]');
  content = content.replace(/bg-\[#E5E5EA\] dark:bg-\[#3A3A3C\] dark:bg-white\/5/g, 'bg-[#E5E5EA] dark:bg-[#3A3A3C]');
  content = content.replace(/text-black dark:text-\[#8E8E93\]/g, 'text-black dark:text-[#EBEBF599]');
  content = content.replace(/text-black dark:text-white dark:text-[#8E8E93]/g, 'text-black dark:text-[#8E8E93]');
  content = content.replace(/text-[#3C3C43] dark:text-\[#8E8E93\] dark:text-white/g, 'text-[#3C3C43] dark:text-white');
  content = content.replace(/text-[#3C3C43] dark:text-\[#8E8E93\] dark:text-\[#EBEBF54D\]/g, 'text-[#3C3C43] dark:text-[#8E8E93]');
  content = content.replace(/text-[#8E8E93] text-[#8E8E93]/g, 'text-[#8E8E93]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF599\] dark:text-\[#EBEBF54D\]/g, 'text-[#8E8E93]');

  // Check pure "bg-white" in dark mode. Typically dark mode should not have bold bright white backgrounds.
  content = content.replace(/bg-black dark:bg-white\b(?!(\/| dark:hover))/g, 'bg-black dark:bg-white/10');
  content = content.replace(/dark:bg-white\b(?!(\/))/g, 'dark:bg-[#1C1C1E]');

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
console.log("Cleanup completed.");
