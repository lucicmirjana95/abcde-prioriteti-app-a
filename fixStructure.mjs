import fs from 'fs';
import path from 'path';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Update application-root classes
content = content.replace(
  /className=\{`min-h-screen flex flex-col transition-all duration-300 hig-bg`\}/,
  'className={`h-screen w-full flex overflow-hidden transition-all duration-300 hig-bg`}'
);

// 2. We need to wrap everything starting from <AdrenalineModal ... > down to the end of <div id="bottom-navigation-bar"> 
// into an inner flex container. And PREPEND the md-sidebar before that container.

// Let's locate the <AdrenalineModal
const mainStartSplit = content.split('<AdrenalineModal type={adrenalineTrigger}');
if (mainStartSplit.length === 2) {
  // Let's create the sidebar markup
  const sidebar = `
      {/* HIG Sidebar (Desktop/iPad) */}
      <aside className="hidden md:flex flex-col w-[260px] border-r border-black/5 dark:border-white/5 hig-bg z-40 shrink-0 h-full overflow-y-auto">
        <div className="p-5 pl-6 pt-8">
          <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setActiveTab('home')}>
             <div className="relative flex items-center justify-center bg-black dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-white w-7 h-7 rounded-[8px] shadow-sm font-semibold text-xs overflow-hidden">
                <span>K⁺</span>
             </div>
             <div className="flex flex-col">
               <h1 className="text-[15px] font-semibold tracking-tight leading-none text-black dark:text-white">{t.title}</h1>
               <span className="text-[11px] font-medium text-[#8A8A8E] mt-0.5">{t.subtitle}</span>
             </div>
          </div>
          
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => { setActiveTab('home'); setIsNavOpen(false); }}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors \${activeTab === 'home' ? 'bg-[#007AFF] text-white font-medium shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF599]'}\`}
            >
              <LayoutGrid className="w-5 h-5" /> {language === 'en' ? 'Hub' : 'Home'}
            </button>
            <button
              onClick={() => { setActiveTab('board'); setIsNavOpen(false); }}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors \${['braindump_inbox', 'board'].includes(activeTab) ? 'bg-[#007AFF] text-white font-medium shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF599]'}\`}
            >
              <CheckSquare className="w-5 h-5" /> {language === 'en' ? 'Tasks' : 'Zadaci'}
            </button>
            <button
              onClick={() => { setActiveTab('wheel'); setIsNavOpen(false); }}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors \${activeTab === 'wheel' ? 'bg-[#007AFF] text-white font-medium shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF599]'}\`}
            >
              <Globe className="w-5 h-5" /> {language === 'en' ? 'Life' : 'Život'}
            </button>
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors \${isNavOpen || ['habitat', 'mindset', 'pareto', 'Vision', 'progress', 'dopamine'].includes(activeTab) ? 'bg-[#007AFF] text-white font-medium shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF599]'}\`}
            >
               <span className="w-5 h-5 flex flex-col items-center justify-center gap-[3px]">
                <span className="w-1 h-1 rounded-full bg-current"></span>
                <span className="w-1 h-1 rounded-full bg-current"></span>
                <span className="w-1 h-1 rounded-full bg-current"></span>
              </span>
              {language === 'en' ? 'More' : 'Meni'}
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-[#FFFFFF] dark:bg-[#000000] border-l border-black/5 dark:border-white/5">
        <AdrenalineModal type={adrenalineTrigger}`;

  content = mainStartSplit[0] + sidebar + mainStartSplit[1];
}

// 3. Close the new <div className="flex-1 ..."> right after AnimatePresence of AuthModal or before Zoom global data.
content = content.replace(
  /(\{\/\* Auth Modal overlay for sign up and sign in \*\/}[\s\S]*?<\/AnimatePresence>)/,
  '$1\n\n      </div> {/* End of Main Content Area */}'
);

// 4. Update the bottom-navigation-bar to hide on medium and up, and span the bottom safely.
content = content.replace(
  /className=\{`fixed bottom-0 left-0 right-0 md:bottom-4 md:left-1\/2 md:-translate-x-1\/2 md:max-w-max md:w-full hig-glass border-t md:border py-2 px-4 md:px-6 z-50 flex justify-center gap-6 items-center transition-all duration-300 md:rounded-\[24px\]`\}/,
  'className={`md:hidden fixed bottom-0 left-0 right-0 w-full hig-glass border-t py-2 px-4 pb-safe z-50 flex justify-around items-center transition-all duration-300`}'
);

// 5. Update main tag's wrapper & padding
content = content.replace(
  /className=\{`flex-1 max-w-\[1200px\] w-full mx-auto p-4 sm:p-8 pb-28 md:pb-36 space-y-8 transition-all duration-300`\}/,
  'className={`flex-1 overflow-y-auto max-w-[1200px] w-full mx-auto p-4 sm:p-8 pb-24 md:pb-12 space-y-8 transition-all duration-300`}'
);

// We need to change the header so it blends or holds the translucent bar
// Actually, HIG header just sits sticky at the top. Let's make it fixed/sticky.
// It is already sticky.
content = content.replace(
  /className=\{`border-b sticky top-0 z-30 py-2\.5 sm:py-3 px-4 sm:px-6 transition-all duration-300 hig-glass`\}/,
  'className={`border-b sticky top-0 z-30 py-3 px-4 sm:px-6 transition-all duration-300 hig-glass`}'
);

fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Structure updated");
