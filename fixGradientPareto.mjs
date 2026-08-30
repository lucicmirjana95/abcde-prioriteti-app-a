import fs from 'fs';

let content = fs.readFileSync('src/components/TaskList.tsx', 'utf-8');

content = content.replace(
  /bg-linear-to-r from-[a-z0-9\-]+ to-[a-z0-9\-]+/g,
  'bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5'
);

content = content.replace(
  /before:bg-\[#FF9500\]\/10 dark:bg-\[#FF9F0A\]\/10/g,
  'before:bg-[#FF9500] dark:before:bg-[#FF9F0A]'
);

fs.writeFileSync('src/components/TaskList.tsx', content);
