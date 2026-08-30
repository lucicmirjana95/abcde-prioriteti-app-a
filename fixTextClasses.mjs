import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Kill weird text classes
  content = content.replace(/text-\[#8A8A8E\] dark:text-\[#EBEBF599\]/g, 'text-[#8E8E93]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF54D\]/g, 'text-[#8E8E93]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF599\]/g, 'text-[#8E8E93]');
  content = content.replace(/text-\[#EBEBF599\]/g, 'text-[#8E8E93]');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed more text classes in: ${filePath}`);
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
console.log("Cleanup 3 complete.");
