import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Clean remaining bad colors 
  content = content.replace(/dark:bg-white\/10 text/g, 'dark:bg-[#1C1C1E] text');
  content = content.replace(/bg-indigo-50/g, 'bg-[#007AFF]/10');
  content = content.replace(/text-indigo-700/g, 'text-[#007AFF]');
  content = content.replace(/text-indigo-650/g, 'text-[#007AFF]');
  content = content.replace(/bg-indigo-650/g, 'bg-[#007AFF]');
  content = content.replace(/text-indigo-600/g, 'text-[#007AFF]');
  content = content.replace(/text-rose-500/g, 'text-[#FF3B30]');
  content = content.replace(/text-emerald-500/g, 'text-[#34C759]');
  content = content.replace(/text-amber-500/g, 'text-[#FF9500]');

  content = content.replace(/dark:bg-black/g, 'dark:bg-[#000000]');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned bad colors in: ${filePath}`);
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
console.log("Cleanup completed!");
