import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk("./src");
files.push("./server.ts");

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;
  
  // Find all ternaries like: isEn ? `...${foo}...` : language === "tr" ? "..." : `...`
  // Actually, we can just match language === "tr" ? "..." where we know it has a template variable inside.
  
  // Match the full ternary to get the English backtick string
  const regex = /(isEn|language\s*===\s*['"]en['"])\s*\?\s*(`[^`]*`)\s*:\s*language\s*===\s*['"]tr['"]\s*\?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
  
  content = content.replace(regex, (match, condition, engQuote, trQuote, srQuote) => {
      if (engQuote.includes('${')) {
          // It has variables
          let trStr = trQuote;
          if (trQuote.startsWith('"') || trQuote.startsWith("'") || trQuote.startsWith('`')) {
              trStr = trStr.slice(1, -1);
              // unescape
              trStr = trStr.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, "`");
          }
          
          // Extract variables from English string
          const variables = [];
          const varRegex = /\$\{([^}]+)\}/g;
          let m;
          while ((m = varRegex.exec(engQuote)) !== null) {
              variables.push(m[0]);
          }
          
          // Extract variables from Turkish string (which might be translated)
          const trVariables = [];
          let m2;
          while ((m2 = varRegex.exec(trStr)) !== null) {
              trVariables.push(m2[0]);
          }
          
          // Replace Turkish variables with English ones in order
          let newTrStr = trStr;
          if (trVariables.length === variables.length) {
              for (let i = 0; i < variables.length; i++) {
                  newTrStr = newTrStr.replace(trVariables[i], variables[i]);
              }
          } else {
              // If count mismatches, just fallback to English string to avoid crashing
              console.warn("Variable count mismatch in", file, "Eng:", variables, "Tr:", trVariables);
              newTrStr = engQuote.slice(1, -1);
          }
          
          // Escape backticks
          newTrStr = newTrStr.replace(/`/g, '\\`');
          
          return `${condition} ? ${engQuote} : language === "tr" ? \`${newTrStr}\` : ${srQuote}`;
      }
      return match;
  });

  if (content !== fs.readFileSync(file, 'utf8')) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed variables in ${file}`);
  }
}
