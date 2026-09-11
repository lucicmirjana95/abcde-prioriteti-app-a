const fs = require('fs');
let route = fs.readFileSync('server/app-a/daily-reset/route.ts', 'utf-8');
route = route.replace(
  'type Phase = "initial" | "clarification_resolve";',
  'type Phase = "initial" | "clarification_resolve" | "reevaluate";'
);
fs.writeFileSync('server/app-a/daily-reset/route.ts', route);
