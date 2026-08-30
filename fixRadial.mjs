import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/bg-radial from-\[[^\]]+\] to-\[[^\]]+\]/g, 'bg-white dark:bg-[#1C1C1E]');
  content = content.replace(/bg-radial from-[a-z0-9-]+ to-[a-z0-9-]+/g, 'bg-white dark:bg-[#1C1C1E]');
  content = content.replace(/border-\[#[A-Fa-f0-9]+\](\/[0-9]+)?/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/shadow-lg shadow-sm\/3/g, 'shadow-sm');

  // Fix button text inside PetSanctuary
  content = content.replace(/text-\[13px\] text-\[#8E8E93\] font-semibold/g, 'text-[13px] font-semibold');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned radial background & borders in: ${filePath}`);
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
console.log("Radial Cleanup completed.");
