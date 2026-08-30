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
  // Text color 3C3C43
  content = content.replace(/text-\[\#3C3C43\]/g, (match, offset, str) => {
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
    return 'placeholder:text-[#3C3C43] dark:placeholder:text-[#ECECF5]/60';
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

  // text-black
  content = content.replace(/\btext-black\b/g, (match, offset, str) => {
    const following = str.slice(offset, offset + 30);
    if (following.includes('dark:text-')) return match;
    return 'text-black dark:text-white';
  });
  
  content = content.replace(/bg-white/g, (match, offset, str) => {
    const following = str.slice(offset, offset + 30);
    const before = str.slice(Math.max(0, offset - 10), offset);
    if (before.includes('dark:')) return match;
    if (following.includes('dark:bg-')) return match;
    return 'bg-white dark:bg-[#1C1C1E]';
  });

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', f);
  }
}
