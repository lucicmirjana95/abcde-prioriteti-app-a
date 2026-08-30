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

const replacements = [
  // Backgrounds with opacity
  { p: /bg-indigo-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/10' },
  { p: /bg-sky-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/10' },
  { p: /bg-emerald-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#34C759]/10 dark:bg-[#30D158]/10' },
  { p: /bg-amber-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10' },
  { p: /bg-rose-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#FF3B30]/10 dark:bg-[#FF453A]/10' },
  { p: /bg-fuchsia-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10' },
  { p: /bg-purple-[0-9a-zA-Z\-\/]+/g, r: 'bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10' },

  // Text
  { p: /text-indigo-[0-9a-zA-Z\-\/]+/g, r: 'text-[#007AFF] dark:text-[#0A84FF]' },
  { p: /text-sky-[0-9a-zA-Z\-\/]+/g, r: 'text-[#007AFF] dark:text-[#0A84FF]' },
  { p: /text-emerald-[0-9a-zA-Z\-\/]+/g, r: 'text-[#34C759] dark:text-[#30D158]' },
  { p: /text-amber-[0-9a-zA-Z\-\/]+/g, r: 'text-[#FF9500] dark:text-[#FF9F0A]' },
  { p: /text-rose-[0-9a-zA-Z\-\/]+/g, r: 'text-[#FF3B30] dark:text-[#FF453A]' },
  { p: /text-fuchsia-[0-9a-zA-Z\-\/]+/g, r: 'text-[#AF52DE] dark:text-[#BF5AF2]' },
  { p: /text-purple-[0-9a-zA-Z\-\/]+/g, r: 'text-[#AF52DE] dark:text-[#BF5AF2]' },

  // Borders
  { p: /border-indigo-[0-9a-zA-Z\-\/]+/g, r: 'border-[#007AFF]/20 dark:border-[#0A84FF]/20' },
  { p: /border-sky-[0-9a-zA-Z\-\/]+/g, r: 'border-[#007AFF]/20 dark:border-[#0A84FF]/20' },
  { p: /border-emerald-[0-9a-zA-Z\-\/]+/g, r: 'border-[#34C759]/20 dark:border-[#30D158]/20' },
  { p: /border-amber-[0-9a-zA-Z\-\/]+/g, r: 'border-[#FF9500]/20 dark:border-[#FF9F0A]/20' },
  { p: /border-rose-[0-9a-zA-Z\-\/]+/g, r: 'border-[#FF3B30]/20 dark:border-[#FF453A]/20' },
  { p: /border-fuchsia-[0-9a-zA-Z\-\/]+/g, r: 'border-[#AF52DE]/20 dark:border-[#BF5AF2]/20' },
  { p: /border-purple-[0-9a-zA-Z\-\/]+/g, r: 'border-[#AF52DE]/20 dark:border-[#BF5AF2]/20' },

  { p: /bg-gradient-to-[a-zA-Z0-9\-\/]+\s*(from-[a-zA-Z0-9\-\/]+\s*)?(via-[a-zA-Z0-9\-\/]+\s*)?(to-[a-zA-Z0-9\-\/]+)?/g, r: 'border border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E]' }
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated colors in ${file}`);
  }
});
