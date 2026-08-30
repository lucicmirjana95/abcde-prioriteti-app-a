import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Background
  content = content.replace(/\bbg-slate-50\b|\bbg-slate-100\b|\bbg-slate-200\b/g, 'bg-[#E5E5EA] dark:bg-[#3A3A3C]');
  content = content.replace(/\bbg-slate-800\b|\bbg-slate-900\b|\bbg-slate-950\b/g, 'bg-black/5 dark:bg-white/5');
  
  // Borders
  content = content.replace(/\bborder-slate-\d+\b/g, 'border-black/5 dark:border-white/5');
  content = content.replace(/\bborder-black\/5\/[0-9]+/g, 'border-black/5');
  content = content.replace(/\bdark:border-\[#[A-Fa-f0-9]+\](\/[0-9]+)?/g, 'dark:border-white/5');
  content = content.replace(/\bborder-indigo-\d+\b/g, 'border-black/5 dark:border-white/5');

  // Text Colors
  content = content.replace(/\btext-slate-[3-6]00\b/g, 'text-[#8E8E93]');
  content = content.replace(/\btext-slate-[7-9]00\b/g, 'text-black dark:text-white');
  content = content.replace(/\btext-indigo-[4-6]00\b|\btext-blue-[4-6]00\b/g, 'text-[#007AFF]');
  content = content.replace(/\btext-rose-[4-6]00\b|\btext-red-[4-6]00\b/g, 'text-[#FF3B30]');
  content = content.replace(/\btext-emerald-[4-6]00\b|\btext-green-[4-6]00\b/g, 'text-[#34C759]');
  content = content.replace(/\btext-amber-[4-6]00\b|\btext-yellow-[4-6]00\b/g, 'text-[#FF9500]');
  
  // Corners (except full)
  content = content.replace(/\brounded-3xl\b|\brounded-2xl\b|\brounded-xl\b/g, 'rounded-[10px]');
  content = content.replace(/\brounded-\[2\.5rem\]|\brounded-\[20px\]/g, 'rounded-[12px]');

  // Clean redundant utility strings injected accidentally
  content = content.replace(/dark:text-\[#EBEBF599\] dark:text-\[#EBEBF54D\]/g, 'dark:text-[#EBEBF599]');
  content = content.replace(/dark:text-\[#8E8E93\] dark:text-\[#8E8E93\]/g, 'dark:text-[#EBEBF599]');
  content = content.replace(/text-\[#8E8E93\] text-\[#8E8E93\]/g, 'text-[#8E8E93]');
  content = content.replace(/bg-white dark:bg-\[#1C1C1E\] dark:bg-\[#1C1C1E\]/g, 'bg-white dark:bg-[#1C1C1E]');
  content = content.replace(/dark:text-\[#8E8E93\] dark:text-\[#EBEBF599\]/g, 'dark:text-[#EBEBF599]');
  content = content.replace(/text-\[#8A8A8E\] dark:text-\[#EBEBF599\] dark:text-\[#EBEBF54D\]/g, 'text-[#8E8E93]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#EBEBF54D\]/g, 'text-[#8E8E93]');
  content = content.replace(/font-sans text-\[#3C3C43\]/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed HIG styling in: ${filePath}`);
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
console.log("HIG Cleanup completed.");
