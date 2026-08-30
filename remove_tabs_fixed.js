import fs from 'fs';

let lines = fs.readFileSync('src/components/MindsetCoach.tsx', 'utf8').split('\n');
// We want to keep everything up to 1619 (index 1618)
let newLines = lines.slice(0, 1619);
newLines.push('      </>');
newLines.push('    </div>');
newLines.push('  );');
newLines.push('}');
newLines.push('');

fs.writeFileSync('src/components/MindsetCoach.tsx', newLines.join('\n'));
