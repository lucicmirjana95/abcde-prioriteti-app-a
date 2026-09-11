const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');

code = code.replace(
  'if (item.dependsOnItemIds && item.dependsOnItemIds.length > 0) {',
  'if ("dependsOnItemIds" in item && item.dependsOnItemIds && (item.dependsOnItemIds as any).length > 0) {'
);
code = code.replace(
  'for (const depId of item.dependsOnItemIds) {',
  'for (const depId of item.dependsOnItemIds as any) {'
);
code = code.replace(
  /\${item\.title}/g,
  '${(item as any).title}'
);
fs.writeFileSync('src/app-a/screens/planReview.ts', code);

let testCode = fs.readFileSync('src/app-a/screens/planReview.test.ts', 'utf-8');
testCode = testCode.replace(
  'const currentDraft: DailyPlanDraft = {',
  'const currentDraft: any = {'
);
testCode = testCode.replace(
  'const proposal: StructuredReevaluationProposal = {',
  'const proposal: any = {'
);
fs.writeFileSync('src/app-a/screens/planReview.test.ts', testCode);
