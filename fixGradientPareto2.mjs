import fs from 'fs';

let content = fs.readFileSync('src/components/TaskList.tsx', 'utf-8');

content = content.replace(
  /bg-linear-to-r from-amber-500\/5 to-purple-500\/5/g,
  'bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5'
);

fs.writeFileSync('src/components/TaskList.tsx', content);
