import fs from 'fs';
import path from 'path';
import { twMerge } from 'tailwind-merge';

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

  // Process standard className="string"
  content = content.replace(/className="([^"]+)"/g, (match, classStr) => {
    return `className="${twMerge(classStr)}"`;
  });

  // Process template string className={`string`} ignoring complex logic inside it for now
  // A simple heuristic for \`...\`
  content = content.replace(/className=\{`([^`]+)`\}/g, (match, classStr) => {
     // only if it doesn't contain dynamic ${} portions that disrupt twMerge
     if (!classStr.includes('${')) {
       return `className={\`${twMerge(classStr)}\`}`;
     }
     // if it does, split by space and only twMerge chunks that have no ${, but that's complex
     return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Merged Tailwind classes in ${file}`);
  }
});
