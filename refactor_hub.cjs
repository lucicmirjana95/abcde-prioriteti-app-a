const fs = require('fs');
let content = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf-8');

const gridStartToken = '{/* NEW ALL-MODULES INTERACTIVE HUB GRID SECTION FOR FREE CHOICE & AI RECOMMENDATION */}';
const nextTokenAfterChain = '{/* COGNITIVE PROTOCOLS CARD */}';

const gridStartIndex = content.indexOf(gridStartToken);
const nextTokenIndex = content.indexOf(nextTokenAfterChain, gridStartIndex);

if (gridStartIndex !== -1 && nextTokenIndex !== -1) {
    let extractedSection = content.substring(gridStartIndex, nextTokenIndex).trim();
    
    // Add margin to top of extractedSection to separate it visually
    extractedSection = '<div className="pt-8 mb-4 border-t border-black/5 dark:border-white/5" />\n' + extractedSection;

    const navButtonsStartToken = '{/* Navigation buttons */}';
    
    const step5Token = 'id="morning-screen-5"';
    const step5Index = content.indexOf(step5Token);
    let step5NavIndex = content.indexOf(navButtonsStartToken, step5Index);
    
    if (step5NavIndex !== -1) {
       let newContent = content.slice(0, step5NavIndex) + 
              extractedSection + "\n\n              " + 
              content.slice(step5NavIndex);
       
       const step7Token = '{/* SCREEN 7: THE FINAL OPERATING DASHBOARD / CENTRAL POWERHOUSE STATION */}';
       const step7Start = newContent.indexOf(step7Token);
       if (step7Start !== -1) {
            const endToken = '</AnimatePresence>';
            const endTokenIndex = newContent.indexOf(endToken, step7Start);
            if (endTokenIndex !== -1) {
                 // Remove step 7 completely up to before </AnimatePresence>
                 newContent = newContent.slice(0, step7Start) + newContent.slice(endTokenIndex);
                 fs.writeFileSync('src/components/MorningAIHub.tsx', newContent);
                 console.log("SUCCESS");
                 process.exit(0);
            } else {
                 console.log("endToken not found");
            }
       } else {
            console.log("step7Token not found");
       }
    } else {
       console.log("step5NavIndex not found");
    }
} else {
    console.log("Tokens not found.", gridStartIndex, nextTokenIndex);
}
