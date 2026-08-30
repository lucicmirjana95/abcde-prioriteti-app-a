const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.push('../App.tsx'); // adding App.tsx as well

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  let original = content;

  // Process className strings or template literals: className="..." or className={`...`}
  // We'll write a replacer that replaces within anything matched by /text-\[#[0-9a-fA-F]+\]/ or similar.
  // Actually, to be safe, just replace specific colors if the same block of string between quotes/backticks doesn't have it.
  
  // Let's do a simple replace, but we don't care about duplicates of `dark:text-[#EBEBF5]/80` if we remove existing related dark:text for that color? No, just find text-[#3C3C43], if the string doesn't contain dark:text-, add it.
  
  content = content.replace(/text-\[\#3C3C43\]/g, 'TEXT_3C3C43');
  content = content.replace(/TEXT_3C3C43(\s+dark:text-\[[a-zA-Z0-9#\/]+\])+/g, 'TEXT_3C3C43');
  content = content.replace(/TEXT_3C3C43(?!\s+dark:text-)/g, 'text-[#3C3C43] dark:text-[#EBEBF5]/80');
  
  content = content.replace(/text-\[\#8E8E93\]/g, 'TEXT_8E8E93');
  content = content.replace(/TEXT_8E8E93(\s+dark:text-\[[a-zA-Z0-9#\/]+\])+/g, 'TEXT_8E8E93');
  content = content.replace(/TEXT_8E8E93(?!\s+dark:text-)/g, 'text-[#8E8E93] dark:text-[#EBEBF5]/60');

  // Also placeholder
  content = content.replace(/placeholder:text-\[\#3C3C43\]/g, 'PLACEHOLDER_3C');
  content = content.replace(/PLACEHOLDER_3C(?!\s+dark:placeholder:)/g, 'placeholder:text-[#3C3C43] dark:placeholder:text-[#EBEBF5]/60');
  content = content.replace(/PLACEHOLDER_3C/g, 'placeholder:text-[#3C3C43]');

  // placeholder 8E8E93
  content = content.replace(/placeholder:text-\[\#8E8E93\]/g, 'placeholder:text-[#8E8E93] dark:placeholder:text-[#EBEBF5]/50');

  // Fix generic backgrounds
  content = content.replace(/bg-\[\#F2F2F7\](?!\s+dark:bg-)/g, 'bg-[#F2F2F7] dark:bg-[#1C1C1E]');
  content = content.replace(/bg-\[\#E5E5EA\](?!\s+dark:bg-)/g, 'bg-[#E5E5EA] dark:bg-[#2C2C2E]');
  content = content.replace(/border-black\/5(?!\s+dark:border-)/g, 'border-black/5 dark:border-white/5');

  // Make sure we didn't add duplicate text-[#3C3C43]
  content = content.replace(/TEXT_3C3C43/g, 'text-[#3C3C43]');
  content = content.replace(/TEXT_8E8E93/g, 'text-[#8E8E93]');
  content = content.replace(/PLACEHOLDER_3C/g, 'placeholder:text-[#3C3C43]');

  // Hardcode missing `dark:text-white` for `text-black` where missing
  content = content.replace(/\btext-black(?!\s+dark:text-white|\s+dark:text-\[.*\])\b/g, 'text-black dark:text-white');

  // Ensure backgrounds inside App are not too bright in dark mode
  content = content.replace(/bg-white(?!\s+dark:bg-|\/)/g, 'bg-white dark:bg-[#1C1C1E]');

  // More font fixes: replace explicitly any occurrences of font-serif, font-black with font-sans, font-bold 
  content = content.replace(/font-serif/g, 'font-sans');
  content = content.replace(/font-black/g, 'font-bold');

  // Fix some dark:text-white next to dark:text-[#EBEBF5] clashes
  content = content.replace(/(dark:text-[^\s]+)\s+dark:text-[^\s"'}]+/g, '$1');

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed contrasts in', f);
  }
}
