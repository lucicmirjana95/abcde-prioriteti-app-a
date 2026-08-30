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

const replacements = [
  { p: /className="bg-white rounded-\[10px\]/g, r: 'className="bg-white dark:bg-[#1C1C1E] rounded-[10px]' },
  { p: /bg-[#F2F2F7] flex items-center gap-3/g, r: 'bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center gap-3' },
  { p: /bg-[#F2F2F7] dark:bg-\[#3A3A3C\] flex items-center/g, r: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center' },
  { p: /bg-\[#F2F2F7\] dark:bg-\[#3A3A3C\]/g, r: 'bg-[#F2F2F7] dark:bg-[#2C2C2E]' },
  { p: /bg-\[#E5E5EA\] dark:bg-\[#3A3A3C\]/g, r: 'bg-[#E5E5EA] dark:bg-[#3A3A3C]' }, // this is fine (tertiary)
  { p: /bg-white border/g, r: 'bg-white dark:bg-[#1C1C1E] border' },
  { p: /bg-white dark:bg-\[#1C1C1E\] dark:bg-\[#1C1C1E\]/g, r: 'bg-white dark:bg-[#1C1C1E]' },
  { p: /bg-white dark:bg-\[#1C1C1E\] border border-black\/5 rounded-\[10px\]/g, r: 'bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[10px]' },
  { p: /dark:bg-white\/5 dark:bg-white\/5/g, r: 'dark:bg-white/5' },
  { p: /dark:text-white dark:text-white/g, r: 'dark:text-white' },
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated white bgs ${file}`);
  }
});
