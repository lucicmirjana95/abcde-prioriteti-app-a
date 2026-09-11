const fs = require('fs');
let code = fs.readFileSync('server/app-a/daily-reset/semantics.test.ts', 'utf-8');

code = code.replace(
  /consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId/g,
  'confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId'
);

fs.writeFileSync('server/app-a/daily-reset/semantics.test.ts', code);
