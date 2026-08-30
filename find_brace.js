const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
let stack = [];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') {
    stack.push(i);
  } else if (content[i] === '}') {
    if (stack.length === 0) {
      console.log('Extra } at index', i);
      process.exit(1);
    }
    stack.pop();
  }
}
