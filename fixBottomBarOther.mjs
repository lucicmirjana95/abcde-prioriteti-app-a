import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

content = content.replace(/<span className={`text-\[10px\] font-medium tracking-normal text-inherit \$\{.*? \? 'font-semibold' : ''\}`}>\s*\{language === 'en' \? '.*?' : '.*?'\}\s*<\/span>/g, function(match) {
  // Extract the specific labels
  let enLabel = match.match(/language === 'en' \? '(.*?)'/)[1];
  let srLabel = match.match(/: '(.*?)'\}/)[1];
  return `<span className="text-[10px] font-medium tracking-normal text-inherit">{language === 'en' ? '${enLabel}' : '${srLabel}'}</span>`;
});

// Also replace the "More/Meni" button icon
content = content.replace(/<span className="w-6 h-6 flex justify-center items-center gap-\[4px\] mb-1">/g, '<span className="w-[22px] h-[22px] flex justify-center items-center gap-[3px] mb-0.5">');

fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Updated other tabs font size.");
