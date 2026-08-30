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

  // Fix invalid multiple opacities
  content = content.replace(/bg-\[#007AFF\]\/10\/50/g, 'bg-[#007AFF]/10');
  content = content.replace(/bg-\[#007AFF\]\/10\/30/g, 'bg-[#007AFF]/10');
  content = content.replace(/bg-\[#007AFF\]\/10\/20/g, 'bg-[#007AFF]/10');
  content = content.replace(/bg-\[#007AFF\]\/10\/40/g, 'bg-[#007AFF]/10');
  content = content.replace(/bg-\[#007AFF\]\/10\/70/g, 'bg-[#007AFF]/10');
  
  // Replace hover states for primary buttons with iOS touch behavior
  content = content.replace(/hover:bg-indigo-[0-9]+/g, 'active:opacity-70 transition-opacity');
  content = content.replace(/hover:bg-\[#007AFF\]/g, 'active:opacity-70 transition-opacity');
  
  // Fix text-sm on primary buttons. iOS uses text-[17px] font-semibold
  content = content.replace(/bg-\[#007AFF\]([^>]*?)text-sm/g, 'bg-[#007AFF]$1text-[17px] font-semibold');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated buttons in ${file}`);
  }
});
