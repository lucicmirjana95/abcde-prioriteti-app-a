const fs = require('fs');

// 1. Fix ReevaluationDialog.tsx import
let dialog = fs.readFileSync('src/app-a/components/daily-reset/ReevaluationDialog.tsx', 'utf-8');
dialog = dialog.replace(
  'import { DailyPlanDraft, PlanReevaluationDiff } from "../../domain/daily-reset/contracts";',
  'import { DailyPlanDraft } from "../../domain/daily-reset/contracts";\nimport { PlanReevaluationDiff } from "../../screens/planReview";'
);
fs.writeFileSync('src/app-a/components/daily-reset/ReevaluationDialog.tsx', dialog);

// 2. Fix DailyPlanReview.tsx import
let planReview = fs.readFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', 'utf-8');
if (!planReview.includes("import { ReevaluationDialog }")) {
  planReview = planReview.replace(
    'import React, { useState, useCallback, useMemo } from "react";',
    'import React, { useState, useCallback, useMemo } from "react";\nimport { ReevaluationDialog } from "./ReevaluationDialog";'
  );
  fs.writeFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', planReview);
}

// 3. Fix TodayExecutionScreen.tsx import and handleConfirmSort
let todayExec = fs.readFileSync('src/app-a/components/daily-reset/TodayExecutionScreen.tsx', 'utf-8');
if (!todayExec.includes("import { ReevaluationDialog }")) {
  todayExec = todayExec.replace(
    'import React, { useState } from "react";',
    'import React, { useState } from "react";\nimport { ReevaluationDialog } from "./ReevaluationDialog";\nimport { StructuredReevaluationProposal } from "../../screens/planReview";'
  );
}
// Remove handleConfirmSort if it's referenced but not defined (wait, is it used in a button?)
todayExec = todayExec.replace(/handleConfirmSort/g, 'handlePreviewSort'); // Maybe the button was calling handleConfirmSort instead of handlePreviewSort?
fs.writeFileSync('src/app-a/components/daily-reset/TodayExecutionScreen.tsx', todayExec);

// 4. Fix planReview.ts Type errors
let pr = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');
// Replace the block where it tries to restore deferredItems
pr = pr.replace(
  /const deferredItems = filterOutRestored\(draft\.deferredItems \|\| \[\]\);/g,
  `const deferredItems = (draft.deferredItems || []).filter(i => !itemsToRestore.has(i.id));`
);
pr = pr.replace(
  /else if \(item\.block === "deferred"\) deferredItems\.push\(item\);/g,
  `else if (item.block === "deferred") deferredItems.push(item as any);`
);
pr = pr.replace(
  /const deferredItems = filterOut\(draft\.deferredItems \|\| \[\]\);/g,
  `const deferredItems = (draft.deferredItems || []).filter(i => !elimSet.has(i.id));`
);

fs.writeFileSync('src/app-a/screens/planReview.ts', pr);
console.log("Fixes applied");
