import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Clean text duplication caused by my regex
  content = content.replace(/dark:bg-white\/5\/(\d+)/g, 'dark:bg-white/5');
  content = content.replace(/bg-black\/5\/(\d+)/g, 'bg-black/5');
  content = content.replace(/shadow-sm\/3/g, 'shadow-sm');

  // Any remaining 'animate-bounce' or 'animate-pulse' or 'animate-ping' in the whole codebase? Let's just remove 'animate-pulse' on text
  content = content.replace(/animate-pulse/g, 'transition-opacity');
  content = content.replace(/animate-bounce/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned artifacts in: ${filePath}`);
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
