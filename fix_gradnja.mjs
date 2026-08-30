import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// I want to replace the `lumiTab === "gradnja"` block up to `RIGHT CARD: Shop`
const startIndex = content.indexOf('{lumiTab === "gradnja" && (');
const shopIndex = content.indexOf('{/* RIGHT CARD: Shop & Cognitive Brain Training Game */}');

if (startIndex !== -1 && shopIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(shopIndex);
  
  content = before + `{lumiTab === "gradnja" && (\n              <>\n              ` + after;
  
  // Now replace the wrapper for the right card to be full width
  content = content.replace(
    /\{\/\* RIGHT CARD: Shop & Cognitive Brain Training Game \*\/\}\n                <div className="bg-white dark:bg-\[#1C1C1E\] border border-black\/5 dark:border-white\/5 rounded-\[2\.5rem\] p-5 shadow-sm flex flex-col justify-between min-h-\[350px\]">/,
    `{/* BUILD FULL PAGE */}\n                <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 shadow-sm flex flex-col w-full h-full max-w-2xl mx-auto mt-2">`
  );

  // We need to remove the closing `</div>` that belonged to the grid wrapper
  // The grid wrapper was: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">`
  // We removed the opening, so we need to remove the closing before `</>`
  
  const endOfGradnja = content.indexOf(`</>\n              )}\n\n              {lumiTab === "detalji" && (`);
  if (endOfGradnja !== -1) {
    const sectionStr = content.substring(startIndex, endOfGradnja);
    // Find the last </div> before </>.
    const lastDivIdx = sectionStr.lastIndexOf('</div>');
    if (lastDivIdx !== -1) {
      const newSection = sectionStr.substring(0, lastDivIdx) + sectionStr.substring(lastDivIdx + 6);
      content = content.substring(0, startIndex) + newSection + content.substring(endOfGradnja);
    }
  }
}

// Rename Tabs to User's specification in the UI
content = content.replace(/t\("Market", "Zalogaji", "Pazar"\)/g, 't("Basic", "Osnovno", "Temel")');
content = content.replace(/t\("Hats", "Kape", "Şapkalar"\)/g, 't("Rare", "Retko", "Nadir")');
content = content.replace(/t\("Decor", "Dekor", "Dekor"\)/g, 't("Nature", "Priroda", "Doğa")');
content = content.replace(/t\("Themes", "Teme", "Temalar"\)/g, 't("House", "Kuća", "Ev")');

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Gradnja fixed");
