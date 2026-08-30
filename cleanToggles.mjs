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
  { 
    p: /<div className="w-11 h-6 bg-\[#E5E5EA\] dark:bg-\[#3A3A3C\] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-\[''\] after:absolute after:top-\[2px\] after:left-\[2px\] after:bg-white after:border-black\/5 dark:border-white\/5 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-\[#007AFF\]"><\/div>/g, 
    r: `<div className="relative w-[51px] h-[31px]">
                    <div className="absolute inset-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-colors duration-300 peer-checked:bg-[#34C759]"></div>
                    <div className="absolute left-[2px] top-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 peer-checked:translate-x-[20px]"></div>
                  </div>` 
  },
  { 
    p: /<div className="w-11 h-6 bg-\[#E5E5EA\] dark:bg-\[#3A3A3C\] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-\[''\] after:absolute after:top-\[2px\] after:left-\[2px\] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-\[#007AFF\]"><\/div>/g, 
    r: `<div className="relative w-[51px] h-[31px]">
                    <div className="absolute inset-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-colors duration-300 peer-checked:bg-[#34C759]"></div>
                    <div className="absolute left-[2px] top-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 peer-checked:translate-x-[20px]"></div>
                  </div>` 
  }
];

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  for (const { p, r } of replacements) {
    content = content.replace(p, r);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated toggles ${file}`);
  }
});
