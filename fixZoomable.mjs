import fs from 'fs';
let content = fs.readFileSync('src/components/ZoomableCard.tsx', 'utf-8');

content = content.replace(
  /: "hover:drop-shadow-sm hover:border-black\/5 dark:border-white\/5 dark:hover:border-black\/5 dark:border-white\/5\/60"/,
  ': "hover:border-[#C7C7CC] dark:hover:border-[#3A3A3C]"'
);

content = content.replace(
  /className="text-\[13px\] text-\[#8E8E93\] font-semibold text-\[#8E8E93\] bg-\[#E5E5EA\] dark:bg-\[#3A3A3C\]\/50 dark:bg-white\/5 px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none"/,
  'className="text-[13px] font-semibold text-[#8E8E93] bg-[#E5E5EA] dark:bg-[#3A3A3C]/50 px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none"'
);

fs.writeFileSync('src/components/ZoomableCard.tsx', content);
