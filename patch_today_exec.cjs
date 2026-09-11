const fs = require('fs');
let code = fs.readFileSync('src/app-a/components/daily-reset/TodayExecutionScreen.tsx', 'utf-8');

if (!code.includes("ReevaluationDialog")) {
  code = code.replace(
    'import React, { useState } from "react";',
    'import React, { useState } from "react";\nimport { ReevaluationDialog } from "./ReevaluationDialog";\nimport { StructuredReevaluationProposal } from "../../screens/planReview";'
  );
  
  // Replace the previewError and handlePreviewSort
  code = code.replace(
    /const \[previewError, setPreviewError\] = useState<string \| null>\(null\);[\s\S]*?const handleConfirmSort = \(\) => \{[\s\S]*?setPreviewDraft\(null\);\n  \};/,
    `const [showReevalDialog, setShowReevalDialog] = useState(false);

  const handlePreviewSort = () => {
    setShowReevalDialog(true);
  };

  const handleConfirmReeval = async (
    proposal: StructuredReevaluationProposal,
    modifications: {
      approvedDelegationIds: string[];
      approvedEliminationIds: string[];
      approvedManualOverrideIds: string[];
    }
  ) => {
    const { applyReevaluationProposal } = await import("../../screens/planReview");
    const finalDraft = applyReevaluationProposal(draft, proposal, modifications);
    if (onReevaluatePriorities) {
      onReevaluatePriorities(finalDraft);
    }
    setShowReevalDialog(false);
  };`
  );

  // Strip out {previewError && ...}
  code = code.replace(
    /\{previewError && <p className="text-\[12px\] text-\[\#FF3B30\]">\{previewError\}<\/p>\}/,
    ''
  );

  // Add the dialog at the root
  code = code.replace(
    '  return (\n    <div className="mx-auto w-full max-w-[760px] px-5 sm:px-6">',
    '  return (\n    <div className="mx-auto w-full max-w-[760px] px-5 sm:px-6">\n      {showReevalDialog && (\n        <ReevaluationDialog\n          draft={draft}\n          language={language}\n          onClose={() => setShowReevalDialog(false)}\n          onConfirm={handleConfirmReeval}\n        />\n      )}'
  );

  fs.writeFileSync('src/app-a/components/daily-reset/TodayExecutionScreen.tsx', code);
  console.log("Patched TodayExecutionScreen");
}
