const fs = require('fs');
let route = fs.readFileSync('server/app-a/daily-reset/route.ts', 'utf-8');
route = route.replace(
  'let phaseType: "initial" | "clarification_resolve" = "initial";',
  'let phaseType: "initial" | "clarification_resolve" | "reevaluate" = "initial";'
);
fs.writeFileSync('server/app-a/daily-reset/route.ts', route);
