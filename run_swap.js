import fs from 'fs';

const file = 'src/components/MorningAIHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const energyStr = `              {/* ENERGY AND PLEASANTNESS MOOD ASSESSMENT (RULER METHOD) */}`;
const brainDumpStr = `              {/* Raw Brain Dump Input Block */}`;
const analysisErrorStr = `              {analysisError && (`;

const energyIdx = content.indexOf(energyStr);
const brainDumpIdx = content.indexOf(brainDumpStr);
const analysisIdx = content.indexOf(analysisErrorStr);

if (energyIdx > -1 && brainDumpIdx > -1 && analysisIdx > -1) {
  const energyBlock = content.substring(energyIdx, brainDumpIdx);
  const brainDumpBlock = content.substring(brainDumpIdx, analysisIdx);

  // Enhance BrainDumpBlock HIG Style
  let newBrainDump = brainDumpBlock
        .replace('className="space-y-3.5 text-left"', 'className="space-y-4 text-left p-5 sm:p-6 bg-white dark:bg-[#1C1C1E]/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-[#007AFF]/10 relative"')
        .replace('bg-white dark:bg-[#1C1C1E] border border-black/5 rounded-xl text-xs font-semibold', 'bg-[#F2F2F7] dark:bg-[#2C2C2E]/60 border-none rounded-2xl text-[15px] leading-relaxed font-medium')
        .replace('focus:border-black/5', 'focus:ring-2 focus:ring-[#007AFF]/30')
        .replace('h-52', 'h-64 resize-none shadow-inner')
        .replace('text-[13px] text-[#FF9500] block font-medium', 'text-[11px] text-[#007AFF] block font-bold uppercase tracking-wider')
        .replace('text-xs font-semibold text-black dark:text-white tracking-wide', 'text-[17px] sm:text-lg font-bold text-black dark:text-white mb-2');

  const newEnergyBlock = energyBlock.replace(
      'className="p-5 bg-white dark:bg-[#1C1C1E]/60 rounded-xl border border-black/5 dark:border-white/5 space-y-4 my-2"',
      'className="p-5 bg-[#F2F2F7]/50 dark:bg-[#1C1C1E]/40 rounded-xl border border-black/5 dark:border-white/5 space-y-4 my-2 opacity-90 transition-opacity hover:opacity-100"'
  );

  const combined = newBrainDump + '\n' + newEnergyBlock;
  content = content.substring(0, energyIdx) + combined + content.substring(analysisIdx);
  fs.writeFileSync(file, content);
  console.log('Swapped effectively.');
}
