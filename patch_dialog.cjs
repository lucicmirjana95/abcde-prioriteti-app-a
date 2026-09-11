const fs = require('fs');
let code = fs.readFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', 'utf-8');

if (!code.includes("ReevaluationDialog")) {
  code = code.replace(
    'import React, { useState, useCallback, useMemo } from "react";',
    'import React, { useState, useCallback, useMemo } from "react";\nimport { ReevaluationDialog } from "./ReevaluationDialog";'
  );
  
  // Also append to the end of the file or somewhere
  code = code.replace(
    '  return (\n    <div className="mx-auto w-full max-w-[760px] px-5 sm:px-6">',
    '  return (\n    <div className="mx-auto w-full max-w-[760px] px-5 sm:px-6">\n      {showReevalDialog && (\n        <ReevaluationDialog\n          draft={draft}\n          language={language}\n          onClose={() => setShowReevalDialog(false)}\n          onConfirm={handleConfirmReeval}\n        />\n      )}'
  );
  fs.writeFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', code);
}
