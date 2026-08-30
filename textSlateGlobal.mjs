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
    
    // Remaining slates
    content = content.replace(/text-slate-900/g, 'text-black dark:text-white');
    content = content.replace(/text-slate-850/g, 'text-black dark:text-white');
    content = content.replace(/text-slate-800/g, 'text-black dark:text-white');
    content = content.replace(/text-slate-750/g, 'text-black dark:text-white');
    content = content.replace(/text-slate-705/g, 'text-[#3C3C43] dark:text-[#EBEBF599]');
    content = content.replace(/text-slate-700/g, 'text-[#3C3C43] dark:text-[#EBEBF599]');
    content = content.replace(/text-slate-650/g, 'text-[#3C3C43] dark:text-[#EBEBF599]');
    content = content.replace(/text-slate-600/g, 'text-[#3C3C43] dark:text-[#EBEBF599]');
    content = content.replace(/text-slate-500/g, 'text-[#8E8E93] dark:text-[#EBEBF54D]');
    content = content.replace(/text-slate-400/g, 'text-[#8E8E93] dark:text-[#EBEBF54D]');
    content = content.replace(/text-slate-350/g, 'text-[#8A8A8E] dark:text-[#EBEBF54D]');
    content = content.replace(/text-slate-300/g, 'text-[#8A8A8E] dark:text-[#EBEBF54D]');
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log("Global text-slate replacement complete");
