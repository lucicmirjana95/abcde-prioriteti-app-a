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

const colorMap = {
  blue:  { light: '#007AFF', dark: '#0A84FF' },
  cyan:  { light: '#32ADE6', dark: '#64D2FF' }, // HIG Cyan
  teal:  { light: '#00C7BE', dark: '#59DCE0' }, // HIG Teal 
  green: { light: '#34C759', dark: '#30D158' },
  emerald:{light: '#34C759', dark: '#30D158' },
  yellow: { light: '#FFCC00', dark: '#FFD60A' },
  orange: { light: '#FF9500', dark: '#FF9F0A' },
  amber:  { light: '#FF9500', dark: '#FF9F0A' }, 
  red:    { light: '#FF3B30', dark: '#FF453A' },
  rose:   { light: '#FF3B30', dark: '#FF453A' },
  pink:   { light: '#FF2D55', dark: '#FF375F' },
  purple: { light: '#AF52DE', dark: '#BF5AF2' },
  violet: { light: '#AF52DE', dark: '#BF5AF2' },
  indigo: { light: '#5856D6', dark: '#5E5CE6' }
};

walk(SRC_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  Object.entries(colorMap).forEach(([colorName, hex]) => {
    // Backgrounds 
    content = content.replace(new RegExp(`bg-${colorName}-[0-9]{2,3}`, 'g'), `bg-[${hex.light}]/10 dark:bg-[${hex.dark}]/10`);
    
    // Text
    content = content.replace(new RegExp(`text-${colorName}-[0-9]{2,3}`, 'g'), `text-[${hex.light}] dark:text-[${hex.dark}]`);
    
    // Border
    content = content.replace(new RegExp(`border-${colorName}-[0-9]{2,3}`, 'g'), `border-[${hex.light}]/20 dark:border-[${hex.dark}]/20`);
    
    // Ring
    content = content.replace(new RegExp(`ring-${colorName}-[0-9]{2,3}`, 'g'), `ring-[${hex.light}]/50 dark:ring-[${hex.dark}]/50`);
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Sanitized colors in ${file}`);
  }
});
