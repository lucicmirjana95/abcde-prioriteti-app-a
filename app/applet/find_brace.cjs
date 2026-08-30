const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
let stack = [];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') {
    stack.push(i);
  } else if (content[i] === '}') {
    if (stack.length === 0) {
      console.log('Extra } at index', i);
      const lines = content.slice(0, i).split('\n');
      console.log('Line number:', lines.length);
      process.exit(1);
    }
    stack.pop();
  }
}
console.log('Open braces remaining:', stack.length);
if (stack.length > 0) {
  const i = stack[stack.length - 1];
  const lines = content.slice(0, i).split('\n');
  console.log('Last unclosed { at line:', lines.length);
}
