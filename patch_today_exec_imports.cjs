const fs = require('fs');
let text = fs.readFileSync('src/app-a/components/daily-reset/TodayExecutionScreen.tsx', 'utf-8');
text = 'import { ReevaluationDialog } from "./ReevaluationDialog";\nimport { StructuredReevaluationProposal } from "../../screens/planReview";\n' + text;
fs.writeFileSync('src/app-a/components/daily-reset/TodayExecutionScreen.tsx', text);
