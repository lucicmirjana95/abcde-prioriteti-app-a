const fs = require('fs');
let code = fs.readFileSync('server/app-a/daily-reset/route.ts', 'utf-8');

code = code.replace(
  'error: localizeAiError(language, parsedReeval.rejectionReason),',
  'error: parsedReeval.error || localizeAiError(language, parsedReeval.rejectionReason),'
);
fs.writeFileSync('server/app-a/daily-reset/route.ts', code);
