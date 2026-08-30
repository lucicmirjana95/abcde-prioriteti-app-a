import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// 1. Remove the "detalji" tab from state
content = content.replace(
  /const \[lumiTab, setLumiTab\] = useState<"dom" \| "gradnja" \| "ostava" \| "detalji">/,
  `const [lumiTab, setLumiTab] = useState<"dom" | "gradnja" | "ostava">`
);

// 2. Remove the "detalji" button from navigation
const navRegex = /<button[^>]+onClick=\{\(\) => setLumiTab\("detalji"\)\}[^>]*>[\s\S]*?<\/button>/;
content = content.replace(navRegex, '');

// 3. Remove the entire "detalji" block
const detaljiIndex = content.indexOf('{lumiTab === "detalji" && (');
if (detaljiIndex !== -1) {
  // Find where it ends
  const endingPoint = content.indexOf('{/* ================================================================= */}', detaljiIndex);
  if (endingPoint !== -1) {
    content = content.substring(0, detaljiIndex) + content.substring(endingPoint);
  }
}

// 4. Update the "items" shop tab to include standard actions
const shopItemsMapStr = `SHOP_ITEMS.map((item) => (`;
const basicItemsStr = `
                              {/* Basic Actions */}
                              <div className="p-2 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xl shrink-0">🍎</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[10px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t("Feed (Basic)", "Hrana (Osnovno)", "Besle (Temel)")}
                                    </h5>
                                    <p className="text-[8px] text-[#8E8E93] truncate">+15XP • +Satiety</p>
                                  </div>
                                </div>
                                <button onClick={() => { handleFeed(); showBubble(t("Yum! ❤️", "Mljac! ❤️", "Nefis! ❤️")); }} className="py-1 px-2.5 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[9px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">15 🪙</button>
                              </div>
                              <div className="p-2 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xl shrink-0">🛁</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[10px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t("Organic Soap", "Organski Sapun", "Organik Sabun")}
                                    </h5>
                                    <p className="text-[8px] text-[#8E8E93] truncate">+10XP • +Hygiene</p>
                                  </div>
                                </div>
                                <button onClick={handleBath} className="py-1 px-2.5 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[9px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">10 🪙</button>
                              </div>
                              <div className="p-2 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xl shrink-0">🧸</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[10px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t("Plush Toy", "Plišana Igračka", "Peluş Oyuncak")}
                                    </h5>
                                    <p className="text-[8px] text-[#8E8E93] truncate">+35XP • +Joy</p>
                                  </div>
                                </div>
                                <button onClick={handleBuyToys} className="py-1 px-2.5 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[9px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">12 🪙</button>
                              </div>
                              <div className="p-2 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xl shrink-0">💊</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[10px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t("Elixir (Medicine)", "Eliksir (Lek)", "İksir (İlaç)")}
                                    </h5>
                                    <p className="text-[8px] text-[#8E8E93] truncate">Cures Toxicity</p>
                                  </div>
                                </div>
                                <button onClick={handleMedicine} className="py-1 px-2.5 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[9px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">50 🪙</button>
                              </div>
                              {/* Premium SHOP_ITEMS */}
                              `;

content = content.replace(shopItemsMapStr, basicItemsStr + shopItemsMapStr);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Applied list continuation");
