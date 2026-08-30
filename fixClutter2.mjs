import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/dark:border-white\/5\/30/g, 'dark:border-white/5');
  content = content.replace(/dark:border-black\/5/g, '');
  content = content.replace(/dark:bg-\[#F2F2F7\]/g, '');
  content = content.replace(/dark:bg-\[#1C1C1E\] dark:bg-\[#1C1C1E\]/g, 'dark:bg-[#1C1C1E]');
  content = content.replace(/dark:border-white\/5 dark:border-white\/5/g, 'dark:border-white/5');
  content = content.replace(/border-black\/5 dark:border-white\/5 dark:border-white\/5/g, 'border-black/5 dark:border-white/5');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned up classes 2 in: ${filePath}`);
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
console.log("Clutter 2 cleaning completed.");
