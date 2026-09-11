const fs = require('fs');
let code = fs.readFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', 'utf-8');

// The UI block starts with {/* AI Re-evaluation Energy Prompt */} and ends at </header>
// Actually we can just find it and replace it. Let's use regex or string replace.
const startIdx = code.indexOf('{/* AI Re-evaluation Energy Prompt */}');
if (startIdx !== -1) {
  let endIdx = code.indexOf('<header className="mb-7">');
  if (endIdx !== -1) {
    code = code.substring(0, startIdx) + code.substring(endIdx);
    fs.writeFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', code);
    console.log("Stripped UI");
  }
}

// Ensure the new component is imported
if (!code.includes("ReevaluationDialog")) {
  code = code.replace(
    'import React, { useState, useCallback, useMemo } from "react";',
    'import React, { useState, useCallback, useMemo } from "react";\nimport { ReevaluationDialog } from "./ReevaluationDialog";'
  );
  fs.writeFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', code);
}
