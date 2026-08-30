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

  content = content.replace(/ hover:drop-shadow-sm/g, '');
  content = content.replace(/ filter drop-drop-shadow-sm/g, '');
  content = content.replace(/ drop-drop-shadow-sm/g, '');
  content = content.replace(/ hover:shadow-lg/g, '');
  content = content.replace(/ focus:drop-shadow-sm/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Cleaned bad shadows ${file}`);
  }
});
