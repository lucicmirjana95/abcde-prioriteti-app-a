import fs from 'fs';

const file = 'src/components/ProgressMatrix.tsx';
let content = fs.readFileSync(file, 'utf8');

const snippetStart = content.indexOf(`              const isChecked = activeDayLogs.includes(habit.id);`);
const snippetEnd = content.indexOf(`                  {/* Delete option for non-standard routines */}`);

if (snippetStart > -1 && snippetEnd > -1) {
    let block = content.substring(snippetStart, snippetEnd);
    
    // Fix container: bg-black uses text-white, let's just make it a soft grey check
    block = block.replace(
        'isChecked\n                      ? "bg-black border-black/5 dark:border-white/5 text-white"\n                      : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 text-black dark:text-white hover:border-black/5 dark:border-white/5"',
        'isChecked ? "bg-black/5 dark:bg-white/5 border-transparent text-[#3C3C43] dark:text-white/50 opacity-70" : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white shadow-sm hover:shadow-md transition-shadow"'
    );
    
    // Fix number badge
    block = block.replace(
        'isChecked\n                            ? "bg-white dark:bg-[#1C1C1E] border-white/20 text-white dark:text-white"\n                            : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43]"',
        'isChecked ? "bg-transparent text-[#8E8E93]" : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60"'
    );

    // Fix name label
    block = block.replace(
        'className={`text-[12.5px] truncate font-semibold ${isChecked ? "text-[#3C3C43]" : "text-black dark:text-white"}`}',
        'className={`text-[13px] font-semibold transition-all ${isChecked ? "text-[#8E8E93] dark:text-white/40 line-through" : "text-black dark:text-white"} ${habit.isTwoMinActive && !isChecked ? "text-[#FF9500] dark:text-[#FF9F0A]" : ""}`}'
    );

    // Fix 2-min toggle container block
    const twoMinBlockStart = block.indexOf('{/* Show 2-Min Version toggle option */}');
    const newTwoMinBlock = `
                    <div className="pl-9 flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleTwoMinActive(habit.id); }}
                        className={\`text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer \${
                          habit.isTwoMinActive
                            ? "bg-[#FF9500] dark:bg-[#FF9F0A]/15 text-white dark:text-[#FF9F0A] shadow-sm"
                            : "bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 text-[#8E8E93] hover:text-black dark:hover:text-white"
                        }\`}
                      >
                        {habit.isTwoMinActive
                          ? t.twoMinActiveBadge
                          : t.activateTwoMin}
                      </button>
                      
                      {!habit.isTwoMinActive && (
                         <span className="text-[12px] text-[#8E8E93] italic block mt-1 sm:mt-0">
                           {t.twoMinLabel} {habit.twoMinVersion}
                         </span>
                      )}
                    </div>
                  </div>
`;
    block = block.substring(0, twoMinBlockStart) + newTwoMinBlock;

    content = content.substring(0, snippetStart) + block + content.substring(snippetEnd);
    fs.writeFileSync(file, content);
    console.log("Fixes applied.");
} else {
    console.log("Snippet markers not found.");
}
