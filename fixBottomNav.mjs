import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The bottom navigation tab elements have: <div className={`p-2 rounded-xl transition-colors ...`}> <LayoutGrid className="w-5 h-5" /> </div>
content = content.replace(
  /<div className=\{\`p-2 rounded-xl transition-colors[^`]+`\}>\s*<LayoutGrid className="w-5 h-5" \/>\s*<\/div>/g,
  '<LayoutGrid className="w-6 h-6 mb-1" />'
);

content = content.replace(
  /<div className=\{\`p-2 rounded-xl transition-colors[^`]+`\}>\s*<CheckSquare className="w-5 h-5" \/>\s*<\/div>/g,
  '<CheckSquare className="w-6 h-6 mb-1" />'
);

content = content.replace(
  /<div className=\{\`p-2 rounded-xl transition-colors[^`]+`\}>\s*<Globe className="w-5 h-5" \/>\s*<\/div>/g,
  '<Globe className="w-6 h-6 mb-1" />'
);

content = content.replace(
  /<div className=\{\`p-2 rounded-xl transition-colors[^`]+`\}>\s*<span className="w-5 h-5 flex flex-col items-center justify-center gap-\[3px\]">\s*<span className="w-1 h-1 rounded-full bg-current"><\/span>\s*<span className="w-1 h-1 rounded-full bg-current"><\/span>\s*<span className="w-1 h-1 rounded-full bg-current"><\/span>\s*<\/span>\s*<\/div>/g,
  '<span className="w-6 h-6 flex justify-center items-center gap-[4px] mb-1"><span className="w-1.5 h-1.5 rounded-full bg-current"></span><span className="w-1.5 h-1.5 rounded-full bg-current"></span><span className="w-1.5 h-1.5 rounded-full bg-current"></span></span>'
);

// We should also replace the custom color logic to just `#007AFF` for active tab in bottom nav.
// For example:
// (isEvening ? 'text-[#0A84FF] scale-105' : 'text-[#007AFF] scale-105') -> (isEvening ? 'text-[#0A84FF]' : 'text-[#007AFF]')
// 'text-amber-600 scale-105' -> 'text-[#007AFF]'
content = content.replace(/\(isEvening \? 'text-\[#0A84FF\] scale-105' : 'text-\[#007AFF\] scale-105'\)/g, "(isEvening ? 'text-[#0A84FF]' : 'text-[#007AFF]')");
content = content.replace(/\(isEvening \? 'text-amber-400 scale-105' : 'text-amber-600 scale-105'\)/g, "(isEvening ? 'text-[#0A84FF]' : 'text-[#007AFF]')");
content = content.replace(/\(isEvening \? 'text-emerald-400 scale-105' : 'text-emerald-600 scale-105'\)/g, "(isEvening ? 'text-[#0A84FF]' : 'text-[#007AFF]')");
content = content.replace(/\(isEvening \? 'text-pink-400 scale-105' : 'text-pink-600 scale-105'\)/g, "(isEvening ? 'text-[#0A84FF]' : 'text-[#007AFF]')");

content = content.replace(/\(isEvening \? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800'\)/g, "(isEvening ? 'text-[#8E8E93]' : 'text-[#999999]')");


fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Bottom nav cleaned");
