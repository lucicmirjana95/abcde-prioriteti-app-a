const fs = require('fs');

function findUnsafeJSONParse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = dir + '/' + file;
    if (fs.statSync(fullPath).isDirectory()) {
      findUnsafeJSONParse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('JSON.parse(safeStorage.getItem')) {
          // Check if it's inside a try catch block
          let hasTryCatch = false;
          for (let j = Math.max(0, i - 10); j <= i; j++) {
            if (lines[j].includes('try {')) {
              hasTryCatch = true;
              break;
            }
          }
          if (!hasTryCatch) {
            console.log(fullPath + ':' + (i + 1) + ' - ' + lines[i].trim());
          }
        }
      }
    }
  }
}

findUnsafeJSONParse('./src');
