const fs = require('fs');
let content = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf-8');

// Extract the modules grid and cognitive chain from step 7
const gridStartToken = '{/* NEW ALL-MODULES INTERACTIVE HUB GRID SECTION FOR FREE CHOICE & AI RECOMMENDATION */}';
const nextTokenAfterChain = '{/* COGNITIVE PROTOCOLS CARD */}';

const gridStartIndex = content.indexOf(gridStartToken);
const nextTokenIndex = content.indexOf(nextTokenAfterChain, gridStartIndex);

if (gridStartIndex !== -1 && nextTokenIndex !== -1) {
    let extractedSection = content.substring(gridStartIndex, nextTokenIndex).trim();
    
    // In extractedSection, replace buttons that say "onNavigateToTab" with something else? No, `onNavigateToTab` works perfectly!
    
    const navButtonsStartToken = '{/* Navigation buttons */}';
    
    // Find the NEXT navButtonsStartToken after "Step 5" started
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
            const endToken = '{/* GLOBAL ZOOM FOCUS MODAL */}';
            const endTokenIndex = newContent.indexOf(endToken, step7Start);
            if (endTokenIndex !== -1) {
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
