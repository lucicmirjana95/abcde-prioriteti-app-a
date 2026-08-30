import fs from 'fs';

let content = fs.readFileSync('./src/components/TaskList.tsx', 'utf8');

// 1. Text overrides:
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]\s+font-mono\s+font-bold\s+text-slate-400/g, 'text-[11px] font-mono font-medium text-[#8A8A8E]');
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]\s+font-mono/g, 'text-[11px] font-mono');
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]/g, 'text-[11px]');
content = content.replace(/text-\[13px\]/g, 'text-[12px]'); // HIG detail text is usually 12pt

// 2. BG Slate fixes
content = content.replace(/bg-slate-100 dark:bg-\[#1C1C1E\]/g, 'bg-[#F2F2F7] dark:bg-[#1C1C1E]');
content = content.replace(/bg-slate-100/g, 'bg-[#E5E5EA]'); // 3rd level gray
content = content.replace(/border-slate-100/g, 'border-[#E5E5EA]');
content = content.replace(/text-slate-500/g, 'text-[#8E8E93]');
content = content.replace(/text-slate-450/g, 'text-[#8E8E93]');
content = content.replace(/text-slate-400/g, 'text-[#8E8E93]');
content = content.replace(/text-slate-350/g, 'text-[#EBEBF599]');
content = content.replace(/text-slate-300/g, 'text-[#EBEBF599]');
content = content.replace(/text-slate-600/g, 'text-[#3C3C43]');
content = content.replace(/text-slate-650/g, 'text-[#3C3C43]');
content = content.replace(/text-slate-700/g, 'text-black');
content = content.replace(/text-slate-750/g, 'text-black');
content = content.replace(/text-slate-800/g, 'text-black');
content = content.replace(/text-slate-900/g, 'text-black');
content = content.replace(/border-slate-205/g, 'border-transparent');
content = content.replace(/border-slate-200/g, 'border-[#C6C6C8]');
content = content.replace(/border-slate-300/g, 'border-[#C6C6C8]');
content = content.replace(/focus:border-slate-400/g, 'focus:border-[#8E8E93]');
content = content.replace(/focus:ring-slate-350/g, 'focus:ring-[#8E8E93]/30');
content = content.replace(/bg-slate-200/g, 'bg-[#C6C6C8]');
content = content.replace(/bg-slate-300/g, 'bg-[#AEAEB2]');
content = content.replace(/hover:bg-slate-100/g, 'hover:bg-[#E5E5EA]');

// primary buttons
content = content.replace(/bg-\[#007AFF\] hover:bg-indigo-700/g, 'bg-[#007AFF] hover:opacity-90');

// Segmented overrides from custom code inside `TaskList`
content = content.replace(/bg-\[#1C1C1E\] text-white shadow-xs/g, 'bg-white shadow-sm dark:bg-[#636366] text-black dark:text-white');

// also segmented control wrappers
content = content.replace(/<div className="flex bg-\[#F2F2F7\] border border-transparent rounded-xl p-1 text-xs">/g, '<div className="flex bg-[#7676801F] p-[2px] rounded-[9px] text-xs">');
content = content.replace(/<div className="flex bg-\[#F2F2F7\] border border-transparent rounded-xl p-1 text-xs items-center justify-center">/g, '<div className="flex bg-[#7676801F] p-[2px] rounded-[9px] text-xs items-center justify-center">');

fs.writeFileSync('./src/components/TaskList.tsx', content, 'utf8');
console.log("TaskList cleaned up.");
