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

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Simple deduplication
  content = content.replace(/dark:bg-\[#1C1C1E\] dark:bg-\[#1C1C1E\]/g, 'dark:bg-[#1C1C1E]');
  content = content.replace(/dark:text-white dark:text-white/g, 'dark:text-white');
  content = content.replace(/dark:border-white\/5 dark:border-white\/5/g, 'dark:border-white/5');
  content = content.replace(/bg-white bg-white/g, 'bg-white');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Cleaned duplicates ${file}`);
  }
});
