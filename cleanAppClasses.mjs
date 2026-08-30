import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

// Helpers to walk dir
function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p, callback);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      callback(p);
    }
  }
}

// Clean un-HIG classnames
const replacements = [
  { p: /bg-slate-[1-9]00(?:[a-zA-Z\/-]*)/g, r: 'bg-black/5 dark:bg-white/5' },
  { p: /bg-slate-50/g, r: 'bg-white border-black/5' },
  { p: /bg-stone-[1-9]00(?:[a-zA-Z\/-]*)/g, r: 'bg-black/5 dark:bg-white/5' },
  { p: /bg-stone-50/g, r: 'bg-white border-black/5' },
  { p: /text-slate-[1-9]00(?:[a-zA-Z\/-]*)/g, r: 'text-[#3C3C43] dark:text-[#EBEBF5]' },
  { p: /border-slate-[1-9]00(?:[a-zA-Z\/-]*)/g, r: 'border-black/5 dark:border-white/5' },
  { p: /hover:bg-slate-[1-9]00(?:[a-zA-Z\/-]*)/g, r: 'hover:bg-black/10 dark:hover:bg-white/10' },
  { p: /shadow-slate-[1-9]00(?:[a-zA-Z\/-]*)/g, r: 'shadow-sm' },
  { p: /ring-slate-[1-9]00(?:[a-zA-Z\/-]*)/g, r: '' },
  
  // Clean up weird colors
  { p: /ring-indigo-[0-9]{3}\/[0-9]{1,2}/g, r: '' },
  { p: /shadow-indigo-[0-9]{3}\/[0-9]{1,2}/g, r: 'shadow-sm' },
  
  { p: /text-black dark:text-black dark:text-white/g, r: 'text-black dark:text-white' },
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  // General cleanup of redundant classes
  content = content.replace(/dark:text-\[#8E8E93\] dark:text-\[#8E8E93\]/g, 'dark:text-[#8E8E93]');
  content = content.replace(/text-\[#8E8E93\] dark:text-\[#8E8E93\]/g, 'text-[#8E8E93]');
  content = content.replace(/dark:text-\[#8E8E93\] shadow-sm/g, 'dark:text-[#8E8E93]');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
