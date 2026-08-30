import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  content = content.replace(/bg-\[#1C1C1E\]([^>]+?)text-black/g, (match) => {
    // If it's pure dark background without light bg component, text should not be black
    if (!match.includes("bg-white") && !match.includes("bg-[#F2F2F7]")) {
       return match.replace("text-black", "text-white");
    }
    return match;
  });
  
  content = content.replace(/bg-black([^>]+?)text-black/g, (match) => {
    // Same for pure black
    if (!match.includes("bg-white") && !match.includes("bg-[#F2F2F7]")) {
       return match.replace("text-black", "text-white");
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed invisible text 2 in: ${filePath}`);
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
console.log("Visibility Cleanup 2 completed.");
