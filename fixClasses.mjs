import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if(filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Typography fixes (Apple HIG mandates minimum 11pt, normal capitalization, normal tracking)
    content = content.replace(/text-\[(?:8|8\.5|9|9\.5|10|10\.5|11|11\.5)px\]/g, 'text-[13px] text-[#8A8A8E] dark:text-[#EBEBF599]');
    content = content.replace(/tracking-widest/g, '');
    content = content.replace(/tracking-wider/g, '');
    content = content.replace(/ uppercase /g, ' ');
    content = content.replace(/"uppercase /g, '"');
    content = content.replace(/ uppercase"/g, '"');
    
    // 2. HIG Primary Semantic Color (System Blue)
    content = content.replace(/bg-indigo-600/g, 'bg-[#007AFF]');
    content = content.replace(/bg-indigo-500/g, 'bg-[#007AFF]');
    content = content.replace(/text-indigo-600/g, 'text-[#007AFF]');
    content = content.replace(/text-indigo-500/g, 'text-[#007AFF]');
    content = content.replace(/text-indigo-400/g, 'text-[#0A84FF]');
    content = content.replace(/border-indigo-600/g, 'border-[#007AFF]');
    content = content.replace(/border-indigo-500/g, 'border-[#007AFF]');
    
    // 3. Remove heavy custom shadows (Apple uses subtle spread or native OS blurs)
    content = content.replace(/shadow-\[.*?\]/g, 'shadow-sm');
    content = content.replace(/shadow-xl/g, 'shadow-md');
    content = content.replace(/shadow-2xl/g, 'shadow-md');
    
    // 4. Rounded corners (Apple's squircle is continuous, typically rounded-xl/2xl is closest)
    content = content.replace(/rounded-3xl/g, 'rounded-[20px]');
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log("HIG Cleanup pass complete");
