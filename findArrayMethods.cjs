const fs = require('fs');

function check(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = dir + '/' + file;
    if (fs.statSync(fullPath).isDirectory()) {
      check(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('JSON.parse')) {
           console.log("---", fullPath, "line", i+1);
           for(let j=i; j<Math.min(lines.length, i+5); j++) console.log(lines[j]);
        }
      }
    }
  }
}

check('./src');
