const fs = require('fs');
let code = fs.readFileSync('server/app-a/daily-reset/parseReevaluateResponse.ts', 'utf-8');

code = code.replace(
  'for (const ev of rawEvals) {',
  `for (const ev of rawEvals) {
    if (ev.proposedBlock && !["first_focus", "later_today", "if_capacity_remains", "deferred"].includes(ev.proposedBlock)) {
      return { success: false, code: "semantic_violation", error: "proposedBlock ima nepoznatu vrednost", rejectionReason: "invalid_proposed_block" };
    }`
);
fs.writeFileSync('server/app-a/daily-reset/parseReevaluateResponse.ts', code);
