import fs from 'fs';

let content = fs.readFileSync('./src/components/HomePortal.tsx', 'utf8');

// Fix primary buttons using custom "#1C1A17" or "indigo-400"
content = content.replace(/bg-\[#1C1A17\] hover:bg-indigo-805 text-\[#FAF9F5\] shadow-slate-900\/15/g, 'bg-black text-white dark:bg-white dark:text-black shadow-sm');
content = content.replace(/bg-\[#007AFF\] hover:bg-indigo-400 text-white shadow-indigo-500\/20/g, 'bg-[#007AFF] text-white hover:opacity-90 shadow-sm');
content = content.replace(/bg-\[#007AFF\] hover:bg-indigo-700/g, 'bg-[#007AFF] hover:opacity-90');

// Fix text duplicates
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]\s+font-semibold\s+px-2\.5/g, 'text-[13px] font-medium px-2.5 text-inherit');
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]\s+font-mono\s+text-indigo-550 dark:text-\[#0A84FF\] font-extrabold/g, 'text-[13px] font-mono font-semibold dark:text-[#0A84FF]');
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]\s+font-mono\s+font-bold\s+bg-\[#007AFF\]\/10\s+px-2\s+py-0\.5\s+rounded-md\s+text-\[#007AFF\]/g, 'text-[11px] font-mono font-medium bg-[#007AFF]/10 px-2 py-0.5 rounded-md text-[#007AFF]');
content = content.replace(/text-\[13px\] text-\[#8A8A8E\] dark:text-\[#EBEBF599\]\s+font-extrabold/g, 'text-[13px] font-medium text-[#8A8A8E] dark:text-[#EBEBF599]');

// Fix border colors
content = content.replace(/border-\[#1F1A35\]/g, 'border-transparent');
content = content.replace(/hover:bg-slate-850\/90/g, 'hover:bg-[#2C2C2E]');
content = content.replace(/hover:border-amber-400/g, 'hover:border-amber-500/50');
content = content.replace(/hover:border-emerald-400/g, 'hover:border-emerald-500/50');
content = content.replace(/hover:bg-slate-850/g, 'hover:bg-[#2C2C2E]');
content = content.replace(/dark:bg-slate-850/g, 'dark:bg-[#2C2C2E]');

content = content.replace(/bg-slate-300 dark:bg-slate-800/g, 'bg-black/10 dark:bg-white/10');
content = content.replace(/hover:bg-slate-400 dark:hover:bg-slate-700/g, 'hover:bg-black/20 dark:hover:bg-white/20');
content = content.replace(/bg-\[#11101E\] border-white\/5 text-\[#C1C9F5\]/g, 'bg-[#1C1C1E] border-white/10 text-white');

// Fix `bg-[#F2F2F7]0/5` typo (assuming it was `bg-slate-900/5` before)
content = content.replace(/bg-\[#F2F2F7\]0\/5/g, 'bg-black/5');

// text sizes 
content = content.replace(/font-extrabold/g, 'font-semibold');
content = content.replace(/font-bold/g, 'font-semibold');

fs.writeFileSync('./src/components/HomePortal.tsx', content, 'utf8');
console.log("HomePortal cleaned up.");
