import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // HIG uses bold sparingly. Let's make most bold things medium or semibold.
    content = content.replace(/font-extrabold/g, 'font-semibold');
    content = content.replace(/font-bold/g, 'font-medium');
    content = content.replace(/text-slate-905/g, 'text-black dark:text-white');
    content = content.replace(/text-slate-\d+/g, 'text-[#8E8E93]');
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log("Boldness mapped to HIG medium/semibold.");
