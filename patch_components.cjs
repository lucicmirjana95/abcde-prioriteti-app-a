const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf-8');
  code = code.replace(
    'const finalDraft = applyReevaluationProposal(draft, proposal, modifications);',
    `const finalDraft = applyReevaluationProposal(draft, proposal, modifications);
    if ((finalDraft as any).error) {
      alert((finalDraft as any).error);
      return; // Do not close modal or persist
    }`
  );
  fs.writeFileSync(filepath, code);
}

patchFile('src/app-a/components/daily-reset/TodayExecutionScreen.tsx');
patchFile('src/app-a/components/daily-reset/DailyPlanReview.tsx');
