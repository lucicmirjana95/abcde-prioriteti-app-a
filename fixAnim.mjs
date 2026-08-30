import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Remove generic tailwind animations
  content = content.replace(/animate-pulse/g, 'transition-opacity');
  content = content.replace(/animate-bounce/g, 'transition-transform');
  content = content.replace(/animate-ping/g, 'transition-opacity');
  content = content.replace(/hover:scale-\s*[0-9]+/g, 'active:scale-95'); // HIG uses active state shrinkage more than hover state growth
  content = content.replace(/ hover:rotate-\s*[0-9]+/g, ''); 
  
  // Clean up
  content = content.replace(/text-\[#8E8E93\] text-\[#8E8E93\]/g, 'text-[#8E8E93]');
  content = content.replace(/font-semibold font-semibold/g, 'font-semibold');
  content = content.replace(/shadow-xs shadow-xs/g, 'shadow-xs');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned animations in: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath) : (dirPath.endsWith('.tsx') && fixFile(dirPath));
  });
}

walkDir('./src');
console.log("Animation Cleanup completed.");
