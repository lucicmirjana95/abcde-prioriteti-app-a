const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');

// The errors are because deferredItems, longTermIdeas, nonActionItems are ClassifiedBrainDumpItem[]
code = code.replace(
  'draft.deferredItems = deferredItems;',
  'draft.deferredItems = deferredItems as any;'
);
code = code.replace(
  'const filterOut = (items: DailyPlanItem[]) => items.filter(i => !elimSet.has(i.id));',
  'const filterOut = (items: any[]) => items.filter(i => !elimSet.has(i.id));'
);
code = code.replace(
  'draft.longTermIdeas = filterOut(draft.longTermIdeas || []);',
  'draft.longTermIdeas = filterOut(draft.longTermIdeas || []) as any;'
);
code = code.replace(
  'draft.nonActionItems = filterOut(draft.nonActionItems || []).concat(newNonAction);',
  'draft.nonActionItems = filterOut(draft.nonActionItems || []).concat(newNonAction) as any;'
);

fs.writeFileSync('src/app-a/screens/planReview.ts', code);
