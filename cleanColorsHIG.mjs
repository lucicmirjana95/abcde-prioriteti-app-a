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
  // Red
  { p: /bg-rose-500/g, r: 'bg-[#FF3B30] dark:bg-[#FF453A]' },
  { p: /text-rose-500/g, r: 'text-[#FF3B30] dark:text-[#FF453A]' },
  { p: /border-rose-500/g, r: 'border-[#FF3B30] dark:border-[#FF453A]' },
  { p: /bg-red-500/g, r: 'bg-[#FF3B30] dark:bg-[#FF453A]' },
  { p: /text-red-500/g, r: 'text-[#FF3B30] dark:text-[#FF453A]' },
  
  // Blue
  { p: /bg-indigo-500/g, r: 'bg-[#007AFF] dark:bg-[#0A84FF]' },
  { p: /text-indigo-500/g, r: 'text-[#007AFF] dark:text-[#0A84FF]' },
  { p: /border-indigo-500/g, r: 'border-[#007AFF] dark:border-[#0A84FF]' },
  { p: /bg-blue-500/g, r: 'bg-[#007AFF] dark:bg-[#0A84FF]' },
  { p: /text-blue-500/g, r: 'text-[#007AFF] dark:text-[#0A84FF]' },
  { p: /border-blue-500/g, r: 'border-[#007AFF] dark:border-[#0A84FF]' },

  // Green
  { p: /bg-emerald-500/g, r: 'bg-[#34C759] dark:bg-[#30D158]' },
  { p: /text-emerald-500/g, r: 'text-[#34C759] dark:text-[#30D158]' },
  { p: /border-emerald-500/g, r: 'border-[#34C759] dark:border-[#30D158]' },

  // Orange / Yellow
  { p: /bg-amber-500/g, r: 'bg-[#FF9500] dark:bg-[#FF9F0A]' },
  { p: /text-amber-500/g, r: 'text-[#FF9500] dark:text-[#FF9F0A]' },
  { p: /border-amber-500/g, r: 'border-[#FF9500] dark:border-[#FF9F0A]' },
  { p: /text-\[#FF9500\] text-\[#FF9500\] dark:text-\[#FF9F0A\]/g, r: 'text-[#FF9500] dark:text-[#FF9F0A]' }, // cleanup double inserts
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  // Remove tracking-tight or font-semibold from descriptions to look more iOS like
  content = content.replace(/tracking-tight/g, ''); // Apple typically uses neutral tracking
  content = content.replace(/shadow-sm/g, 'drop-shadow-sm'); // drop-shadow is smoother than shadow-sm often, wait maybe just omit this.

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated colors ${file}`);
  }
});
