import fs from 'fs';
import path from 'path';

const twPrefixGroup = [
  'text', 'bg', 'border', 'ring', 'fill', 'stroke'
];

function deduplicateClasses(className) {
  let classes = className.split(/\s+/).filter(Boolean);
  let classMap = {};
  
  classes.forEach(cls => {
    // Determine the base group, e.g., 'text' for 'text-[#FFF]', 'dark:text' for 'dark:text-white'
    let parts = cls.split('-');
    if (parts.length > 1) {
      // Find the utility core
      let prefix = parts[0];
      if (prefix === 'dark:text' || prefix === 'focus:text' || prefix === 'hover:text') prefix = cls.substring(0, cls.indexOf('text') + 4);
      if (prefix === 'dark:bg' || prefix === 'focus:bg' || prefix === 'hover:bg') prefix = cls.substring(0, cls.indexOf('bg') + 2);
      
      let matchedBase = twPrefixGroup.find(group => cls.includes(`${group}-`));
      
      if (matchedBase) {
        let colonSplit = cls.split(':');
        let modifier = colonSplit.length > 1 ? colonSplit[0] + ':' : '';
        let baseWithModifier = modifier + matchedBase;
        
        // Let's overwrite this baseWithModifier
        classMap[baseWithModifier] = cls;
      } else {
        classMap[cls] = cls;
      }
    } else {
      classMap[cls] = cls;
    }
  });

  return Object.values(classMap).join(' ');
}

function processJSX(content) {
  return content.replace(/className=(["`])(.*?)\1/g, (match, quote, classNames) => {
    // Not using the advanced tailwind-merge logic as it's complex, just simple manual cleanup
    // if there are multiple text- white / text-[#1C1] then the last one replaces
    // Actually tailwind merge is the best.
    return `className=${quote}${classNames}${quote}`; // Fallback simple return
  });
}

// Actually let's just install tailwind-merge and run it on all source files!
