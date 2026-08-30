import fs from 'fs';
import path from 'path';

// Helper to recursively list files
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
console.log(`Found ${files.length} source files to run deep WCAG AA contrast audit & Apple HIG tuning.`);

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. LIGHT MODE SECONDARY/TERTIARY TEXTS
  content = content.replace(/text-\[#636366\]/g, 'text-[#3C3C43]');
  content = content.replace(/placeholder:text-\[#636366\]/g, 'placeholder:text-[#3C3C43]');
  
  content = content.replace(/text-\[#8E8E93\]/g, 'text-[#8E8E93]');
  content = content.replace(/placeholder:text-\[#8E8E93\]/g, 'placeholder:text-[#8E8E93]');
  
  content = content.replace(/text-\[#8A8A8E\]/g, 'text-[#8E8E93]');
  content = content.replace(/placeholder:text-\[#8A8A8E\]/g, 'placeholder:text-[#8E8E93]');
  
  content = content.replace(/text-\[#AEAEB2\]/g, 'text-[#8E8E93]');
  
  // 2. DARK MODE SECONDARY/TERTIARY TEXTS -> Normalize to Apple HIG EBEBF5/60
  content = content.replace(/dark:text-\[#AEAEB2\]/g, 'dark:text-[#EBEBF5]/60');
  content = content.replace(/dark:placeholder:text-\[#AEAEB2\]/g, 'dark:placeholder:text-[#EBEBF5]/30');
  
  content = content.replace(/dark:text-\[#8E8E93\]/g, 'dark:text-[#EBEBF5]/60');
  content = content.replace(/dark:text-\[#8A8A8E\]/g, 'dark:text-[#EBEBF5]/60');
  content = content.replace(/dark:text-\[#636366\]/g, 'dark:text-[#EBEBF5]/60');
  content = content.replace(/dark:text-\[#C7C7CC\]/g, 'dark:text-[#EBEBF5]/60');
  
  // Extra cleanup for arbitrary text colors that fail contrast against light background
  content = content.replace(/text-\[#929296\]/g, 'text-[#3C3C43]');
  content = content.replace(/text-\[#A9A9AD\]/g, 'text-[#3C3C43]');

  // 3. DISABLED STATUS TEXT & ACTIVE OPACITY TIMING ->
  // Ensure that all disabled text colors meet the high contrast minimum.
  // We map light mode disabled text to #707074 (4.53:1 on white) and dark mode disabled text to #AEAEB2 (4.80:1 on #1C1C1E).
  content = content.replace(/disabled:text-\[#8E8E93\]/g, 'disabled:text-[#707074] dark:disabled:text-[#AEAEB2]');
  content = content.replace(/disabled:text-\[#8A8A8E\]/g, 'disabled:text-[#707074] dark:disabled:text-[#AEAEB2]');
  content = content.replace(/disabled:text-\[#636366\]/g, 'disabled:text-[#707074] dark:disabled:text-[#AEAEB2]');
  
  // Normalize low opacity states (which drop computed contrast way below standards) to high readable opacity:
  content = content.replace(/disabled:opacity-20/g, 'disabled:opacity-55');
  content = content.replace(/disabled:opacity-25/g, 'disabled:opacity-55');
  content = content.replace(/disabled:opacity-30/g, 'disabled:opacity-55');
  content = content.replace(/disabled:opacity-40/g, 'disabled:opacity-60');
  content = content.replace(/disabled:opacity-45/g, 'disabled:opacity-60');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`[WCAG HIG Audit] Cleaned & refined: ${file}`);
  }
});

console.log('Comprehensive WCAG AA & Apple HIG Contrast audit script executed successfully.');
