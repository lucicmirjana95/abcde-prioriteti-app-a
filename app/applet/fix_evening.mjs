import fs from 'fs';
const files = ['src/components/HomePortal.tsx','src/components/ParetoAnalyzer.tsx','src/components/ProgressMatrix.tsx','src/components/VisionStrategy.tsx','src/components/WheelOfLife.tsx', 'src/App.tsx'];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\$\{isEvening\s*\?\s*"[^"]*"\s*:\s*"([^"]*)"\}/g, '$1');
  fs.writeFileSync(f, c);
});
