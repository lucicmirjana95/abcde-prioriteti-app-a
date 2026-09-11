const fs = require('fs');
let pr = fs.readFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', 'utf-8');
pr = 'import { ReevaluationDialog } from "./ReevaluationDialog";\n' + pr;
fs.writeFileSync('src/app-a/components/daily-reset/DailyPlanReview.tsx', pr);
