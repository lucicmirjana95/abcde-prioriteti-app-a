import fs from 'fs';

let content = fs.readFileSync('src/components/TaskList.tsx', 'utf-8');

content = content.replace(
  /\? "bg-\[#34C759\]\/10 dark:bg-\[#30D158\]\/10 border-\[#34C759\]\/20 dark:border-\[#30D158\]\/20 text-white"/g,
  '? "bg-[#34C759] border-transparent text-white shadow-sm"'
);

// also fix circle instead of square (iOS Reminders uses circles)
content = content.replace(
  /className=\{`mt-1 h-5 w-5 rounded-md flex items-center justify-center border transition-all cursor-pointer shrink-0 \$\{/g,
  'className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${'
);

content = content.replace(
  /: "border-black\/5 dark:border-white\/5 hover:border-black\/5 dark:border-white\/5 bg-\[#F2F2F7\]"/g,
  ': "border-[#C7C7CC] dark:border-[#3A3A3C] bg-transparent"'
);

fs.writeFileSync('src/components/TaskList.tsx', content);
