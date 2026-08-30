const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.push('../App.tsx');

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  let original = content;

  // Fix /80/80 or any repeated opacities like /60/80
  content = content.replace(/(\/80|\/60|\/50|\/40)(\/80|\/60|\/50|\/40)+/g, (match) => {
    // If it's something like /80/80, reduce to /80
    if (match.includes('/80')) return '/80';
    if (match.includes('/60')) return '/60';
    if (match.includes('/50')) return '/50';
    if (match.includes('/40')) return '/40';
    return match;
  });

  // Ensure there's no dark:text-[#EBEBF5]/80/80 etc
  content = content.replace(/dark:text-\[#EBEBF5\]\/80\/80/g, 'dark:text-[#EBEBF5]/80');
  content = content.replace(/dark:text-\[#EBEBF5\]\/[0-9]{2}\/[0-9]{2}/g, 'dark:text-[#EBEBF5]/80');

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed opacities in', f);
  }
}
