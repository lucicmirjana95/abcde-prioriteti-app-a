import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// 1. Add lumiTab state
content = content.replace(
  /const \[showDetails, setShowDetails\] = useState\(false\);/,
  `const [lumiTab, setLumiTab] = useState<"dom" | "gradnja" | "ostava" | "detalji">("dom");`
);

// 2. Remove the top right Details button
content = content.replace(
  /<button \n              onClick=\{[^}]+\}\n              className="bg-white\/90[^"]+"\n            >\n              📊 \{t\("Details", "Detalji", "Detalji"\)\}\n            <\/button>/s,
  ``
);

// 3. Move the Action Bar up
content = content.replace(
  /<div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-4 pointer-events-none px-4">/g,
  `<div className="absolute bottom-28 left-0 right-0 z-20 flex justify-center gap-4 px-4 transition-all duration-300 \${lumiTab === 'dom' ? 'opacity-100 translate-y-0 pointer-events-none' : 'opacity-0 translate-y-10 pointer-events-none' }">`
);

// 4. Update the Drawer to use lumiTab
content = content.replace(
  /\{showDetails && \(/g,
  `{lumiTab !== "dom" && (`
);

content = content.replace(
  /<div className="absolute inset-0 bg-black\/40 backdrop-blur-sm" onClick=\{[^}]+\} \/>/g,
  `<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLumiTab("dom")} />`
);

content = content.replace(
  /onClick=\{[^}]+\} \n                      className="bg-black\/5 dark:bg-white\/5 p-3 rounded-full hover:bg-black\/10 dark:hover:bg-white\/10 transition-colors cursor-pointer"/g,
  `onClick={() => setLumiTab("dom")}\n                      className="bg-black/5 dark:bg-white/5 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"`
);

// 5. Add Bottom Navigation before the closing of the main component
const bottomNavCode = `
          {/* Main Bottom Navigation */}
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl border-t border-black/5 dark:border-white/5 flex justify-around px-2 pb-6 pt-3 md:pb-4 rounded-b-[2.5rem]">
            {[
              { id: "dom", label: t("Home", "Dom", "Ev"), icon: "🏠" },
              { id: "gradnja", label: t("Build", "Gradnja", "İnşa"), icon: "🔨" },
              { id: "ostava", label: t("Pantry", "Ostava", "Kiler"), icon: "📦" },
              { id: "detalji", label: t("Details", "Detalji", "Detaylar"), icon: "📊" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLumiTab(tab.id as any)}
                className={\`flex flex-col items-center justify-center gap-1 w-20 p-2 rounded-2xl transition-all cursor-pointer \${lumiTab === tab.id ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 scale-105" : "text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"}\`}
              >
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>
`;

content = content.replace(
  /<\/AnimatePresence>\n      <\/>/g,
  `</AnimatePresence>\n${bottomNavCode}\n      </>`
);

// 6. Rename shop items from Rewards to Gradnja / Build
content = content.replace(
  /t\("Rewards", "Nagrade", "Ödüller"\)/g,
  `t("Build", "Gradnja", "İnşa")`
);
content = content.replace(
  /t\("Advanced Metrics & Inventory", "Napredna Statistika i Inventar", "Gelişmiş İstatistikler ve Envanter"\)/g,
  `t("Manage your sanctuary", "Upravljaj staništem", "Sığınağınızı yönetin")`
);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Done");
