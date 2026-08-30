import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The mobile header is currently showing "K+" button on the left, and we hide the text.
// Apple HIG standard navigation bar: Title in center, trailing items on right.
// Let's rewrite the header completely to feel like a standard Apple Navigation Bar.

const newHeader = `{/* Top Header navbar with digital clock and statistics */}
      <header className={\`border-b sticky top-0 z-30 py-2.5 px-4 transition-all duration-300 hig-glass flex items-center justify-center md:hidden min-h-[44px]\`}>
        <div className="absolute left-4">
           {/* If we had a back button, it would go here */}
        </div>
        
        {/* Centered Title */}
        <h1 className="text-[17px] font-semibold tracking-tight text-center truncate text-black dark:text-white">
          {activeTab === 'home' ? (language === 'en' ? 'Strategy Hub' : 'Početna') : 
           activeTab === 'board' || activeTab === 'braindump_inbox' ? (language === 'en' ? 'Tasks' : 'Zadaci') :
           activeTab === 'wheel' ? (language === 'en' ? 'Life' : 'Život') :
           (language === 'en' ? 'Tools' : 'Alati')}
        </h1>
        
        {/* Trailing actions */}
        <div className="absolute right-4 flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
             <Settings className="w-[22px] h-[22px] text-[#007AFF] transition-all" strokeWidth={2} />
          </div>
        </div>
      </header>`;

// We will replace the entire <header> element in App.tsx
content = content.replace(/\{\/\* Top Header navbar with digital clock and statistics \*\/\}[\s\S]*?<\/header>/, newHeader);

fs.writeFileSync('./src/App.tsx', content, 'utf8');
console.log("Header updated to HIG.");
