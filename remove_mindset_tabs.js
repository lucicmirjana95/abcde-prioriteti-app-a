import fs from 'fs';

let content = fs.readFileSync('src/components/MindsetCoach.tsx', 'utf8');

// 1. Remove SUB-TABS SELECTOR
const selectorStart = content.indexOf('{/* 1. SUB-TABS SELECTOR');
const selectorEnd = content.indexOf('{/* SUBTAB 1: Protocol CONVERSATION DIALOGUE */}');
if (selectorStart !== -1 && selectorEnd !== -1) {
  content = content.substring(0, selectorStart) + content.substring(selectorEnd);
}

// 2. Remove the condition {activeSubTab === "Protocol" && (
content = content.replace('{activeSubTab === "Protocol" && (', '<>');

// We need to replace the closing parenthesis of activeSubTab === "Protocol"
// It's before `{/* SUBTAB 2: REBT PANEL */}`
const rebtTabStart = content.indexOf('{/* SUBTAB 2: REBT PANEL */}');
if (rebtTabStart !== -1) {
  let beforeRebt = content.substring(0, rebtTabStart);
  let lastParenIndex = beforeRebt.lastIndexOf(')}');
  if (lastParenIndex !== -1) {
    beforeRebt = beforeRebt.substring(0, lastParenIndex) + '</>' + beforeRebt.substring(lastParenIndex + 2);
    // 3. Remove SUBTAB 2, 3, 4
    // We want to delete everything from rebtTabStart up to the end minus the last two closing tags `    </div>\n  );\n}\n`
    
    // So the new content will be beforeRebt + closing tags
    const endTags = `
    </div>
  );
}
`;
    content = beforeRebt + endTags;
  }
}

fs.writeFileSync('src/components/MindsetCoach.tsx', content);
