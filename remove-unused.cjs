const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
let lines = content.split('\n');

// Arrays of [startLine, endLine] (1-indexed, inclusive)
// Note: delete from bottom to top to avoid line numbers shifting
const ranges = [
  [3836, 4037],
  [3685, 3835],
  [2047, 2164],
  [1766, 1971],
  [934, 1049],
];

// Sort ranges descending
ranges.sort((a, b) => b[0] - a[0]);

for (const [start, end] of ranges) {
  lines.splice(start - 1, end - start + 1);
}

fs.writeFileSync('server.ts', lines.join('\n'));
