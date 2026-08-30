import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Top Header fixes
content = content.replace(
  /className=\{`border-b sticky top-0 z-30 py-2.5 px-4 transition-all duration-300 hig-glass flex items-center justify-center md:hidden min-h-\[44px\]`\}/g,
  'className={`border-b border-black/10 dark:border-white/10 sticky top-0 z-30 px-4 transition-all duration-300 hig-glass flex items-center justify-center md:hidden h-[44px]`}'
);

content = content.replace(
  /className="text-\[17px\] font-semibold text-center truncate text-black dark:text-white"/g,
  'className="text-[17px] font-semibold tracking-[-0.41px] text-center truncate text-black dark:text-white leading-[44px]"'
);

// Tab bar fixes:
// Apple HIG uses ~11px font for active, 10px for inactive, no gap actually, tight column
content = content.replace(
  /className=\{`group flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-95 duration-200 /g,
  'className={`group flex flex-col items-center pt-1.5 pb-0.5 cursor-pointer transition-none active:opacity-60 '
);

content = content.replace(
  /<LayoutGrid [\s\S]*?\/>/m,
  '<LayoutGrid className="w-6 h-6 mb-0.5" strokeWidth={activeTab === "home" ? 2 : 1.5} />'
);

content = content.replace(
  /<ListTodo [\s\S]*?\/>/m,
  '<ListTodo className="w-6 h-6 mb-0.5" strokeWidth={(activeTab === "braindump_inbox" || activeTab === "board") ? 2 : 1.5} />'
);

content = content.replace(
  /<Cat [\s\S]*?\/>/m,
  '<Cat className="w-6 h-6 mb-0.5" strokeWidth={activeTab === "wheel" ? 2 : 1.5} />'
);

// We had text-[10px] for the tab bar labels. Let's make it text-[10px] with specific font weights
content = content.replace(
  /className="text-\[10px\] font-medium tracking-normal text-inherit"/g,
  'className="text-[10px] font-medium tracking-normal text-inherit"'
);

// Ensure the bottom tab bar has the exact glass look:
content = content.replace(
  /className=\{`md:hidden fixed bottom-0 left-0 right-0 w-full hig-glass border-t py-2 px-4 pb-\[env\(safe-area-inset-bottom\)\] z-50 flex justify-around items-center transition-all duration-300`\}/g,
  'className={`md:hidden fixed bottom-0 left-0 right-0 w-full hig-glass border-t border-black/10 dark:border-white/10 pt-1 px-4 pb-[env(safe-area-inset-bottom,20px)] z-50 flex justify-around items-center transition-all duration-300`}'
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
