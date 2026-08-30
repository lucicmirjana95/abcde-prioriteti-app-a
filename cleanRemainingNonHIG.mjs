import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

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
  { p: /bg-(slate|gray|zinc|stone|neutral)-[a-zA-Z0-9\-\/]+/g, r: 'bg-black/5 dark:bg-white/5' },
  { p: /text-(slate|gray|zinc|stone|neutral)-[a-zA-Z0-9\-\/]+/g, r: 'text-[#8E8E93]' },
  { p: /border-(slate|gray|zinc|stone|neutral)-[a-zA-Z0-9\-\/]+/g, r: 'border-black/5 dark:border-white/5' },
  { p: /ring-(slate|gray|zinc|stone|neutral)-[a-zA-Z0-9\-\/]+/g, r: '' },
  { p: /placeholder-(slate|gray|zinc|stone|neutral)-[a-zA-Z0-9\-\/]+/g, r: 'placeholder:text-[#8E8E93] dark:placeholder:text-[#8E8E93]' },
  { p: /shadow-(slate|gray|zinc|stone|neutral)-[a-zA-Z0-9\-\/]+/g, r: 'shadow-sm' },
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  // General cleanup
  content = content.replace(/dark:border-white\/5 dark:border-white\/5/g, 'dark:border-white/5');
  content = content.replace(/bg-black\/5 dark:bg-white\/5 dark:bg-white\/5/g, 'bg-black/5 dark:bg-white/5');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
