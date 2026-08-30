const fs = require('fs');

let content = fs.readFileSync('src/components/MindsetCoach.tsx', 'utf8');

const trezorPattern = /\{activeSubTab === "trezor" && \([\s\S]*?\{vaultOpen && \(/;
if (trezorPattern.test(content)) {
    // This is not matching the entire block.
    // Let's just find the indexes.
    const trezorIdx = content.indexOf('{activeSubTab === "trezor" && (');
    const vaultOpenIdx = content.indexOf('{vaultOpen && (');
    const endIdx = content.indexOf('</AnimatePresence>', vaultOpenIdx);
    
    if (trezorIdx !== -1 && endIdx !== -1) {
       content = content.substring(0, trezorIdx) + content.substring(endIdx);
       fs.writeFileSync('src/components/MindsetCoach.tsx', content);
       console.log("Deleted trezor tab and vault drawer.");
    }
}
