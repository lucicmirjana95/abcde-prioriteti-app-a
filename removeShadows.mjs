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

  content = content.replace(/ drop-shadow-sm/g, '');
  content = content.replace(/ drop-shadow-[a-zA-Z0-9\-]+/g, '');
  content = content.replace(/ shadow-sm/g, '');
  content = content.replace(/ shadow-[a-zA-Z0-9\-]+/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Removed shadows from ${file}`);
  }
});
