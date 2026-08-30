import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Clean text duplication caused by my regex
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF599\] dark:text-\[#EBEBF599\]/g, 'text-[#8E8E93] dark:text-[#EBEBF599]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF599\] dark:text-\[#EBEBF599\]/g, 'text-[#8E8E93] dark:text-[#EBEBF599]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF599\]/g, 'text-[#8E8E93]'); 

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Deep structural styling updated in: ${filePath}`);
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
console.log("Structure Cleanup completed.");
