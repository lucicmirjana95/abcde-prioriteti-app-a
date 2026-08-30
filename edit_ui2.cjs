const fs = require('fs');
let c = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf8');

c = c.replace(/renderFormattedBiohack\([\s\S]*?\)\s*\)\s*\{suggestedBiohackHabit[\s\S]*?<\/button>\s*\)\}/g, (match) => {
  return "<>" + match + "</>";
});

fs.writeFileSync('src/components/MorningAIHub.tsx', c);
console.log("Done");
