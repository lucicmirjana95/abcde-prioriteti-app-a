const fs = require('fs');
let code = fs.readFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', 'utf-8');

// Replace imports
code = code.replace(
  /import React, { useState, useCallback, useMemo } from "react";/,
  `import React, { useState, useCallback, useMemo } from "react";\nimport { ReevaluationDialog } from "./ReevaluationDialog";`
);

// Remove the inline state for reeval
code = code.replace(/const \[reevalProposal, setReevalProposal\] = useState[\s\S]*?const executeReevaluate = async[\s\S]*?\} finally \{\n      setIsEvaluating\(false\);\n    \}\n  \};/, '');

// Add ReevalDialog state
code = code.replace(
  /const \[saveDiagnostic, setSaveDiagnostic\] = useState<string \| null>\(null\);/,
  `const [saveDiagnostic, setSaveDiagnostic] = useState<string | null>(null);\n  const [showReevalDialog, setShowReevalDialog] = useState(false);`
);

// Replace handlePreviewSort
code = code.replace(
  /const handlePreviewSort = \(\) => \{\n    setShowEnergyPrompt\(true\);\n    setReevalError\(null\);\n  \};/,
  `const handlePreviewSort = () => {\n    setShowReevalDialog(true);\n  };`
);

// Add handleConfirmReeval
code = code.replace(
  /const handleUndo = \(\) => \{/,
  `const handleConfirmReeval = async (proposal: import("../../screens/planReview").StructuredReevaluationProposal, modifications: { approvedDelegationIds: string[], approvedEliminationIds: string[], approvedManualOverrideIds: string[] }) => {
    const { applyReevaluationProposal } = await import("../../screens/planReview");
    const snapshot = createUndoSnapshot(reviewState);
    const finalDraft = applyReevaluationProposal(draft, proposal, modifications);
    markDirty();
    updateReviewState({ draft: finalDraft, error: null, undoDraft: snapshot });
    setShowReevalDialog(false);
  };
  
  const handleUndo = () => {`
);

// Remove the inline UI for reeval
const uiRegex = /\{\/\* AI Re-evaluation Energy Prompt \*\/\}[\s\S]*?\{\/\* AI Re-evaluation Modal \*\/\}[\s\S]*?\}\n    <\/div>\n  \);\n\}/;
const newUI = `      {showReevalDialog && (
        <ReevaluationDialog
          draft={draft}
          language={language}
          onClose={() => setShowReevalDialog(false)}
          onConfirm={handleConfirmReeval}
        />
      )}
    </div>
  );
}`;
code = code.replace(uiRegex, newUI);

// Wait, the regex might fail if it's too broad. I should be careful.
