const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');

code = code.replace(
  'const itemsToRestore = new Map<string, DailyPlanItem>();',
  'const itemsToRestore = new Map<string, any>();'
);
fs.writeFileSync('src/app-a/screens/planReview.ts', code);
