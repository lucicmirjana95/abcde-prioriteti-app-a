const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');

code = code.replace(
  'if (targetArray[sourceIndex].capacityType === "fixed") return { draft, error: "cannot_move_fixed_task" };\n  // Remove from source block',
  '// Remove from source block'
);

code = code.replace(
  'const newArray = [...targetArray];',
  'if (targetArray[index].capacityType === "fixed") return { draft, error: "cannot_move_fixed_task" };\n  const newArray = [...targetArray];'
);

fs.writeFileSync('src/app-a/screens/planReview.ts', code);
