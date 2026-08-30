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
  // Remove font-mono from general text classes
  { p: / font-mono /g, r: ' ' },
  { p: /font-mono/g, r: '' },
  { p: / drop-shadow-sm/g, r: '' }, // remove excessive drop shadows
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Cleaned HIG ${file}`);
  }
});
