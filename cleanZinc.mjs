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
  { p: /dark:text-zinc-[0-9a-zA-Z]+/g, r: '' },
  { p: /text-zinc-[0-9a-zA-Z]+/g, r: '' },
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }
  
  // Also clean up duplicate tailwind class spaces that may have been created
  content = content.replace(/ +/g, ' ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated zinc ${file}`);
  }
});
