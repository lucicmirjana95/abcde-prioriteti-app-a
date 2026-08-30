const fs = require('fs');

const file = 'src/components/MorningAIHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const energyBlockStart = content.indexOf('{/* ENERGY AND PLEASANTNESS MOOD ASSESSMENT (RULER METHOD) */}');
const energyBlockEnd = content.indexOf('              {/* Raw Brain Dump Input Block */}');

const brainDumpBlockStart = content.indexOf('              {/* Raw Brain Dump Input Block */}');
const brainDumpBlockEnd = content.indexOf('              {/* Screen Actions Footer */}');

if (energyBlockStart !== -1 && energyBlockEnd !== -1 && brainDumpBlockStart !== -1 && brainDumpBlockEnd !== -1) {
    const energyCode = content.substring(energyBlockStart, energyBlockEnd);
    const brainDumpCode = content.substring(brainDumpBlockStart, brainDumpBlockEnd);
    
    // Enhance BrainDumpCode HIG style
    let newBrainDumpCode = brainDumpCode
        .replace('bg-white dark:bg-[#1C1C1E] border border-black/5 rounded-xl text-xs font-semibold', 'bg-white dark:bg-[#1C1C1E] border-2 border-[#007AFF]/20 shadow-[0_2px_12px_rgba(0,122,255,0.08)] rounded-xl text-[14px] leading-relaxed font-medium')
        .replace('focus:border-black/5 dark:border-white/5', 'focus:border-[#007AFF] dark:border-white/5')
        .replace('h-52', 'h-64')
        .replace('text-[13px] text-[#FF9500] block font-medium', 'text-[11px] text-[#007AFF] block font-bold uppercase tracking-wider')
        .replace('text-xs font-semibold text-black dark:text-white tracking-wide', 'text-[17px] font-bold text-black dark:text-white mt-1');

    const combined = newBrainDumpCode + '\n' + energyCode;
    
    content = content.substring(0, energyBlockStart) + combined + content.substring(brainDumpBlockEnd);
    fs.writeFileSync(file, content);
    console.log('Successfully swapped and enhanced!');
} else {
    console.log('Failed to find markers.');
}
