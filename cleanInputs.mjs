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
  { p: /bg-\[#F2F2F7\] border border-black\/5 dark:border-white\/5 focus:bg-white focus:border-black\/5 dark:border-white\/5/g, r: 'bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:focus:border-white/5' },
  { p: /bg-\[#F2F2F7\] hover:bg-\[#E5E5EA\] dark:bg-\[#3A3A3C\] border border-black\/5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500\/10 focus:border-black\/5 dark:border-white\/5/g, r: 'bg-[#7676801F] dark:bg-[#7676803D] border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] focus:outline-hidden focus:border-black/5 dark:focus:border-white/5' },
  { p: /bg-white dark:bg-\[#1C1C1E\] border-black\/5 dark:border-white\/5 border focus:bg-white focus:outline-hidden focus:ring-[^ ]+/g, r: 'bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 focus:outline-hidden' },
  { p: /drop-shadow-sm drop-shadow-sm/g, r: 'drop-shadow-sm' }
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated form inputs ${file}`);
  }
});
