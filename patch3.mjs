import fs from 'fs';
const file = 'src/components/ProgressMatrix.tsx';
let content = fs.readFileSync(file, 'utf8');

// Container
content = content.replace(
    'isChecked ? "bg-black/5 dark:bg-white/5 border-transparent text-[#3C3C43] dark:text-white/50 opacity-70" : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white shadow-sm hover:shadow-md transition-shadow"',
    'isChecked ? "bg-[#cce3cb]/40 dark:bg-[#34C759]/10 border-transparent text-black/60 dark:text-white/70" : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white shadow-sm hover:shadow-md transition-shadow"'
);

// Number pad
content = content.replace(
    'isChecked ? "bg-transparent text-[#8E8E93]" : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60"',
    'isChecked ? "bg-black/5 dark:bg-black/20 text-black/50 dark:text-white/50 border-black/5 dark:border-white/5" : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60"'
);

// Title text 
content = content.replace(
    'isChecked ? "text-[#8E8E93] dark:text-white/40 line-through" : "text-black dark:text-white"',
    'isChecked ? "text-black/60 dark:text-white/60 line-through" : "text-black dark:text-white"'
);

// Button styling for TwoMin toggle working
content = content.replace(
    `onClick={(e) => { e.stopPropagation(); handleToggleTwoMinActive(habit.id); }}`,
    `onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleTwoMinActive(habit.id); }}`
);

fs.writeFileSync(file, content);
