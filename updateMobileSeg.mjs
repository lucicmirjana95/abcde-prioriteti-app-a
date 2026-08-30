import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* Mobile Sub-Navigation Tabs inside Board[^\}]+id="board-mobile-sub-tabs"[\s\S]+?<\/div>/m;
const replacement = `{/* Mobile Sub-Navigation Tabs inside Board - only shown on mobile screen 'md:hidden' */}
        <div className="flex md:hidden bg-[#7676801F] dark:bg-[#7676803D] p-[2px] rounded-[9px] gap-[2px] mb-4" id="board-mobile-sub-tabs">
          <button
            type="button"
            onClick={() => setBoardSubTab('matrix')}
            className={\`flex-1 py-1.5 px-2 text-[13px] tracking-[-0.08px] font-medium rounded-[7px] transition-all flex flex-row items-center justify-center gap-1.5 cursor-pointer \${
              boardSubTab === 'matrix' 
                ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]'
                : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 bg-transparent'
            }\`}
          >
            <LayoutGrid className="w-[15px] h-[15px]" strokeWidth={boardSubTab === 'matrix' ? 2.5 : 2} />
            <span className="truncate">{language === 'en' ? 'Matrix' : 'Matrica'}</span>
          </button>
          <button
            type="button"
            onClick={() => setBoardSubTab('add')}
            className={\`flex-1 py-1.5 px-2 text-[13px] tracking-[-0.08px] font-medium rounded-[7px] transition-all flex flex-row items-center justify-center gap-1.5 cursor-pointer \${
              boardSubTab === 'add' 
                ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]'
                : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 bg-transparent'
            }\`}
          >
            <Sparkles className="w-[15px] h-[15px]" strokeWidth={boardSubTab === 'add' ? 2.5 : 2} />
            <span className="truncate">{language === 'en' ? 'Add' : 'Unos'}</span>
          </button>
          <button
            type="button"
            onClick={() => setBoardSubTab('list')}
            className={\`flex-1 py-1.5 px-2 text-[13px] tracking-[-0.08px] font-medium rounded-[7px] transition-all flex flex-row items-center justify-center gap-1.5 cursor-pointer \${
              boardSubTab === 'list' 
                ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]'
                : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 bg-transparent'
            }\`}
          >
            <CheckSquare className="w-[15px] h-[15px]" strokeWidth={boardSubTab === 'list' ? 2.5 : 2} />
            <span className="truncate">{language === 'en' ? 'List' : 'Lista'}</span>
          </button>
        </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
