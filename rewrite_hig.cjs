const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const initialContent = content;
  
  content = content.replace(/bg-gray-100/g, 'bg-[#F2F2F7]');
  content = content.replace(/bg-gray-800/g, 'bg-[#2C2C2E]');
  content = content.replace(/bg-gray-900/g, 'bg-[#1C1C1E]');
  content = content.replace(/bg-gray-950/g, 'bg-[#111111]');
  content = content.replace(/border-gray-300/g, 'border-black/5');
  content = content.replace(/border-white\/20/g, 'border-white/10');
  content = content.replace(/border-white\/25/g, 'border-white/10');
  content = content.replace(/dark:bg-black/g, 'dark:bg-[#1C1C1E]');
  
  if (content !== initialContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  });
}

walkDir('./src');
