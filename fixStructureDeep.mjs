import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Background and weird structure fixes
  content = content.replace(/className={`hig-card/g, 'className={`hig-card relative overflow-hidden bg-white dark:bg-[#1C1C1E] rounded-[20px] shadow-sm border border-black/5 dark:border-white/5');
  content = content.replace(/bg-\[#1C1C1E\]\/40/g, 'bg-white/5');
  content = content.replace(/bg-\[#F2F2F7\]\/50/g, 'bg-[#E5E5EA] dark:bg-[#3A3A3C]');
  content = content.replace(/bg-\[#F2F2F7\]\/80/g, 'bg-[#E5E5EA] dark:bg-[#3A3A3C]');
  content = content.replace(/shadow-xs/g, 'shadow-sm');
  content = content.replace(/bg-radial/g, 'bg-white');
  content = content.replace(/border-\[#1F1A35\]\/80/g, 'border-white/5');
  
  // Specific Pet Sanctuary layout updates
  content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-[20px]');
  content = content.replace(/rounded-full blur-3xl/g, 'hidden'); // Remove glowing blobs behind avatars
  content = content.replace(/btn-premium/g, ''); // Remove sketchy custom class
  content = content.replace(/active:scale-95 active:scale-95/g, 'active:scale-95');
  
  // Generic color replacements
  content = content.replace(/text-\[#FAF9F5\]/g, 'text-white');
  content = content.replace(/dark:bg-white\/10 dark:bg-\[#000000\]/g, 'dark:bg-white/10');
  content = content.replace(/dark:bg-\[#000000\] text-\white/g, 'dark:bg-white/10 text-white');
  content = content.replace(/text-[#8E8E93] text-[#8E8E93]/g, 'text-[#8E8E93]');
  
  // Check any `text-[13px] text-[#8E8E93]` that should just be `text-[#8E8E93]` if nested
  content = content.replace(/text-\[#8E8E93\]/g, 'text-[#8E8E93] dark:text-[#EBEBF599]');

  // Fix button text inside PetSanctuary
  content = content.replace(/text-\[13px\] text-\[#8E8E93\] font-semibold/g, 'text-[13px] font-semibold');

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
