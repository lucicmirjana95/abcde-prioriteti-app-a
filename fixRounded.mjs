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

  content = content.replace(/rounded-\[2rem\]/g, 'rounded-[20px]');
  content = content.replace(/rounded-\[1.5rem\]/g, 'rounded-2xl');
  content = content.replace(/rounded-\[10px\]/g, 'rounded-xl'); // Standard iOS is around 10-12px, rounded-xl is 12px
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated rounded in ${file}`);
  }
});
