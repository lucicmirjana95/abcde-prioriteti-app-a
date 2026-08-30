import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// The Drawer is now a full screen overlay when not "dom"
content = content.replace(
  /<div className="relative w-full h-\[85%\] bg-\[#F2F2F7\] dark:bg-\[#121214\] rounded-t-\[3rem\] p-6 sm:p-8 overflow-y-auto shadow-\[0_-20px_60px_rgba\(0,0,0,0\.3\)\] border-t border-white\/10 flex flex-col gap-6">/,
  `<div className="relative w-full h-[85%] bg-[#F2F2F7] dark:bg-[#121214] rounded-t-[3rem] p-6 sm:p-8 overflow-y-auto shadow-[0_-20px_60px_rgba(0,0,0,0.3)] border-t border-white/10 flex flex-col gap-6 pb-24">`
);

// We have 4 main sections inside the drawer.
// 1. DASHBOARD CARD (Vitals & Stats, Personality, Care History) -> Should be visible ONLY on "detalji"
content = content.replace(
  /\{\/\* DASHBOARD CARD: Level, Coins, Health & Vitals \*\/\}/,
  `{lumiTab === "detalji" && (\n              <>\n              {/* DASHBOARD CARD: Level, Coins, Health & Vitals */}`
);

// We need to close the "detalji" block. It ends right before {/* PANTRY STORAGE SHELF CARD */}
content = content.replace(
  /\{\/\* PANTRY STORAGE SHELF CARD \*\/\}/,
  `              </>\n              )}\n\n              {lumiTab === "ostava" && (\n              <>\n              {/* PANTRY STORAGE SHELF CARD */}`
);

// PANTRY ends before TWO-COLUMN NESTED BENTO GRID FOR TABS AND GAMES
content = content.replace(
  /\{\/\* TWO-COLUMN NESTED BENTO GRID FOR TABS AND GAMES \*\/\}/,
  `              </>\n              )}\n\n              {lumiTab === "gradnja" && (\n              <>\n              {/* TWO-COLUMN NESTED BENTO GRID FOR TABS AND GAMES */}`
);

// TWO-COLUMN NESTED BENTO GRID FOR TABS AND GAMES ends before EVOLUTION PHASES INFO & SELECTOR
content = content.replace(
  /\{\/\* EVOLUTION PHASES INFO & SELECTOR \*\/\}/,
  `              </>\n              )}\n\n              {lumiTab === "detalji" && (\n              <>\n              {/* EVOLUTION PHASES INFO & SELECTOR */}`
);

// EVOLUTION PHASES INFO & SELECTOR ends at the end of the drawer content
content = content.replace(
  /\{\/\* Bottom perfect for badges \*\/\}/,
  `{/* Bottom perfect for badges */}`
);

content = content.replace(
  /<\/div>\n\n                <\/div>\n              <\/div>\n\n            <\/motion.div>\n          <\/motion.div>\n        \)\}\n      <\/AnimatePresence>/,
  `                  </div>\n\n                </div>\n              </div>\n              </>\n              )}\n\n            </motion.div>\n          </motion.div>\n        )}\n      </AnimatePresence>`
);


fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Sections isolated!");
