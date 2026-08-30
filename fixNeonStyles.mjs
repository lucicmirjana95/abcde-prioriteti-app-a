import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Kill purple/indigo neon gradients
  content = content.replace(/bg-gradient-to-[a-z]+ from-[a-z]+-\d+ via-[a-z]+-\d+ to-[a-z]+-\d+/g, "bg-white dark:bg-[#1C1C1E]");
  content = content.replace(/bg-gradient-to-[a-z]+ from-[a-z]+-\d+ to-[a-z]+-\d+/g, "bg-white dark:bg-[#1C1C1E]");
  
  // Evening specific overrides
  content = content.replace(/bg-indigo-950/g, 'bg-[#1C1C1E]');
  content = content.replace(/text-indigo-300/g, 'text-[#8E8E93]');
  content = content.replace(/text-emerald-400/g, 'text-[#34C759]');
  content = content.replace(/text-yellow-300/g, 'text-[#FFCC00]');
  content = content.replace(/bg-indigo-900\/60/g, 'bg-[#1C1C1E]');
  content = content.replace(/text-[#EBEBF599]/g, 'text-[#8E8E93]');
  
  // Shadows
  content = content.replace(/shadow-purple-500\/10/g, 'shadow-sm');
  content = content.replace(/shadow-purple-500\/20/g, 'shadow-sm');
  content = content.replace(/shadow-md/g, 'shadow-sm');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed neon styles in: ${filePath}`);
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
console.log("Cleanup complete.");
