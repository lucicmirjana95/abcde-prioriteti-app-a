import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// Update Sub Navigation pill-bars (Segmented Controls) wrapper
// Wait, the wrapper is currently: `<div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl md:max-w-fit md:mx-auto">`
// Let's change the wrapper and the buttons.
content = content.replace(
  /<div className="flex bg-slate-100 dark:bg-slate-900\/50 p-1 rounded-2xl md:max-w-fit md:mx-auto">/g,
  '<div className="flex bg-[#7676801F] dark:bg-[#7676803D] p-[2px] rounded-[9px] md:max-w-fit md:mx-auto w-full">'
);

// We have 4 buttons with logic like this:
// ? (isEvening ? 'bg-slate-800 text-indigo-300 shadow-md' : 'bg-[#1C1A17] text-[#FAF9F5] shadow-xs') 
// : (isEvening ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-[#1C1A17] hover:bg-black/[0.03]')

const buttonRegex = /className=\{`flex-1 py-2 sm:py-2\.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300 \$\{\s*activeSubTab === '.*?'\s*\? \(isEvening \? '.*?' : '.*?'\)\s*: \(isEvening \? '.*?' : '.*?'\)\s*\}`\}/g;

// Let's replace the whole class expression:
content = content.replace(buttonRegex, function(match){
  // what's the condition?
  const cond = match.match(/activeSubTab === '.*?'/)[0];
  return `className={\`flex-1 py-1.5 px-3 rounded-[7px] text-[13px] font-medium tracking-tight transition-all duration-200 \${${cond} ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-[#8E8E93] dark:text-[#EBEBF599]'}\`}`;
});

fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Updated Segmented Control.");
