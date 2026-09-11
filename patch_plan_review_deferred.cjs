const fs = require('fs');
let pr = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');
pr = pr.replace(
  /const newNonAction: ClassifiedBrainDumpItem\[\] = toEliminate\.map\(\(item\) => \(\{/g,
  `const newNonAction: any[] = toEliminate.map((item) => ({`
);
fs.writeFileSync('src/app-a/screens/planReview.ts', pr);
