import fs from 'fs';

let content = fs.readFileSync('src/components/HomePortal.tsx', 'utf-8');

// fix conflicting text colors
content = content.replace(/text-\[#8E8E93\] font-semibold text-\[#007AFF\] dark:text-\[#0A84FF\] dark:text-\[#007AFF\] dark:text-\[#0A84FF\]/g, 'text-[#007AFF] dark:text-[#0A84FF] font-semibold');
content = content.replace(/text-white rounded-lg text-\[13px\] font-medium text-\[#8E8E93\]/g, 'text-white rounded-md text-[13px] font-medium');

content = content.replace(/bg-white dark:bg-\[#1C1C1E\] border-black\/5 dark:border-white\/5 hover:border-black\/5 dark:border-white\/5 text-black dark:text-white/g, 'text-black dark:text-white');

fs.writeFileSync('src/components/HomePortal.tsx', content, 'utf-8');

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
appContent = appContent.replace(/text-black dark:text-\[#8E8E93\] dark:text-\[#8E8E93\]/g, 'text-black dark:text-[#8E8E93]');
appContent = appContent.replace(/dark:text-white dark:text-white/g, 'dark:text-white');
fs.writeFileSync('src/App.tsx', appContent, 'utf-8');
