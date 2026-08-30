const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let original = content;

  // 1. Fix fonts
  content = content.replace(/font-serif/g, 'font-sans');
  content = content.replace(/font-black/g, 'font-bold');
  content = content.replace(/font-extrabold/g, 'font-bold');
  content = content.replace(/tracking-wider/g, 'tracking-normal');
  content = content.replace(/tracking-widest/g, 'tracking-normal');

  // 2. Fix contrasts
  // Text color 3C3C43 (dark gray, standard text secondary in light mode) needs lighter counterpart
  // If it's already followed by `dark:text-...`, don't append, but we can just blindly replace and then fix double darks.
  // Actually, let's use a replacer function for text-[#3C3C43]
  content = content.replace(/text-\[\#3C3C43\]/g, (match, offset, str) => {
    // Check if within the next 30 chars there is a dark:text-
    const following = str.slice(offset, offset + 40);
    if (following.includes('dark:text-')) {
      return match;
    }
    return 'text-[#3C3C43] dark:text-[#EBEBF5]/80';
  });

  // Same for placeholder
  content = content.replace(/placeholder:text-\[\#3C3C43\]/g, (match, offset, str) => {
    const following = str.slice(offset, offset + 40);
    if (following.includes('dark:placeholder:text-')) {
      return match;
    }
    return 'placeholder:text-[#3C3C43] dark:placeholder:text-[#EBEBF5]/60';
  });

  // Fix backgrounds that lack dark counterparts
  content = content.replace(/bg-\[\#F2F2F7\]/g, (match, offset, str) => {
    const following = str.slice(offset, offset + 40);
    if (following.includes('dark:bg-')) {
      return match;
    }
    return 'bg-[#F2F2F7] dark:bg-[#1C1C1E]';
  });
  
  content = content.replace(/bg-\[\#E5E5EA\]/g, (match, offset, str) => {
    const following = str.slice(offset, offset + 40);
    if (following.includes('dark:bg-')) {
      return match;
    }
    return 'bg-[#E5E5EA] dark:bg-[#2C2C2E]';
  });

  // Some components might have hardcoded dark text on dark background, fix generally if missing
  // text-black lacking dark:text-white
  content = content.replace(/text-black/g, (match, offset, str) => {
    const following = str.slice(Math.max(0, offset - 10), offset + 30);
    // don't replace if it's border-black/10 etc, only text-black
    if (following.includes('dark:text-')) return match;
    return 'text-black dark:text-white';
  });

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', f);
  }
}
