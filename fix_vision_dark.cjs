const fs = require('fs');

const fixDarkText = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/isEvening \? "(text-\[#3C3C43\][^"]*)"/g, 'isEvening ? "text-[#EBEBF5]/80"');
  fs.writeFileSync(filePath, content, 'utf-8');
};

fixDarkText('src/components/VisionStrategy.tsx');
fixDarkText('src/components/WheelOfLife.tsx');
fixDarkText('src/components/ProgressMatrix.tsx');
fixDarkText('src/components/MindsetCoach.tsx');
fixDarkText('src/components/DopamineTracker.tsx');
console.log("Fixed text-[#3C3C43] dark mode issue!");
