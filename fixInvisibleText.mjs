import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  content = content.replace(/bg-white([^>]+?)text-white/g, (match) => {
    // if there is a dark:bg-[#1C1C1E], the text should be black dark:text-white
    if (match.includes("dark:bg-[#1C1C1E]") || match.includes("dark:bg-black")) {
       return match.replace("text-white", "text-black dark:text-white");
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed invisible text in: ${filePath}`);
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
console.log("Visibility Cleanup completed.");
