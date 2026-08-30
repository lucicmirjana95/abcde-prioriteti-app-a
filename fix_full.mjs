import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

const returnStart = content.indexOf('      {/* STAGE & MAIN INTERACTION */}');
if (returnStart !== -1) {
  content = content.substring(0, returnStart);
}

const renderStr = `      {/* STAGE & MAIN INTERACTION */}
      return (
        <div className="relative w-full h-full flex-1 overflow-hidden md:rounded-[2.5rem] bg-black md:border border-[#00000010] dark:border-white/10 md:shadow-2xl flex flex-col transition-all duration-500">
          
          <LivingBackground stage={getLumiraStageIndex(level)} isSleeping={isLumiSleeping} />
          
          {/* Top Stats HUD */}
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
              <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex gap-4 shadow-sm border border-black/5 dark:border-white/10 text-sm font-bold items-center">
                 <span title={t("Happiness", "Sreća", "Sreća")}>❤️ {Math.ceil(happiness / 20)}</span>
                 <span title={t("Energy", "Energija", "Energija")}>⚡ {Math.ceil(energy / 20)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pointer-events-auto items-end">
              <div className="bg-[#FF9500] text-white px-4 py-2 rounded-full flex gap-2 shadow-sm font-black text-sm items-center">
                 <span>🪙 {coins}</span>
              </div>
            </div>
          </div>

          {/* Lumi Today Message */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full flex justify-center px-4">
             <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 text-center max-w-[80%]"
             >
               <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 block mb-0.5">
                 {t("Lumi says:", "Lumi kaže:", "Lumi diyor:")}
               </span>
               <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                 {bubbleText || getLumiMessage(activeMood, toxicity, satiety, energy)}
               </p>
             </motion.div>
          </div>

          {/* LUMI COMPANION COMPONENT */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pt-10 cursor-pointer" onClick={handlePet}>
            <CompanionGraphic 
              level={level}
              mood={activeMood}
              size={220}
              isBathing={isLumiBathing}
              isFeeding={isLumiFeeding}
              isPetting={isLumiPetting}
              isSick={toxicity > 70}
              rarity={rarity}
              bondLevel={bondLevel}
              isAscended={isAscended}
            />
          </div>
          
          <AnimatePresence>
            {showConfetti && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
              >
                <div className="text-6xl animate-bounce">✨</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Bar (Bottom) */}
          <div className={\`absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-4 px-4 transition-all duration-300 \${lumiTab === "dom" ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-10 opacity-0 pointer-events-none"}\`}>
            <button onClick={() => setLumiTab("gradnja")} className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-6 py-3 rounded-full font-bold shadow-lg text-sm border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center gap-2">
              <span className="text-xl">🛒</span> {t("Market & Care", "Nega i Prodavnica", "Market")}
            </button>
            <button onClick={() => setLumiTab("ostava")} className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-6 py-3 rounded-full font-bold shadow-lg text-sm border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center gap-2">
              <span className="text-xl">🎒</span> {t("Storage", "Ostava", "Kiler")}
            </button>
          </div>

          <AnimatePresence>
            {lumiTab !== "dom" && (
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-40 flex flex-col justify-end pointer-events-auto"
              >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLumiTab("dom")} />
                <div className="relative w-full h-[85%] bg-[#F2F2F7] dark:bg-[#121214] rounded-t-[3rem] p-6 sm:p-8 overflow-y-auto shadow-[0_-20px_60px_rgba(0,0,0,0.3)] border-t border-white/10 flex flex-col gap-6 pb-24">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                       <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                         {lumiTab === "gradnja" ? t("Market & Care", "Nega i Prodavnica", "Bakım ve Market") : t("Storage", "Ostava", "Kiler")}
                       </h3>
                    </div>
                    <button 
                      onClick={() => setLumiTab("dom")}
                      className="bg-black/5 dark:bg-white/5 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <span className="text-gray-500 dark:text-gray-400 font-bold">✕</span>
                    </button>
                  </div>

                  {lumiTab === "gradnja" && (
                    <div className="w-full flex flex-col gap-6">
                      <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl mb-2 text-[10px] font-bold overflow-x-auto scrollbar-none snap-x w-full">
                        <button
                          onClick={() => setShopTab("items")}
                          className={\`px-4 py-2 shrink-0 rounded-lg text-center cursor-pointer snap-start \${shopTab === "items" ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}\`}
                        >
                          {t("Basic", "Osnovno", "Temel")}
                        </button>
                        <button
                          onClick={() => setShopTab("decor")}
                          className={\`px-4 py-2 shrink-0 rounded-lg text-center cursor-pointer snap-start \${shopTab === "decor" ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}\`}
                        >
                          {t("Nature", "Priroda", "Doğa")}
                        </button>
                        <button
                          onClick={() => setShopTab("themes")}
                          className={\`px-4 py-2 shrink-0 rounded-lg text-center cursor-pointer snap-start \${shopTab === "themes" ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}\`}
                        >
                          {t("House", "Kuća", "Ev")}
                        </button>
                        <button
                          onClick={() => setShopTab("hats")}
                          className={\`px-4 py-2 shrink-0 rounded-lg text-center cursor-pointer snap-start \${shopTab === "hats" ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}\`}
                        >
                          {t("Rare", "Retko", "Nadir")}
                        </button>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {shopTab === "items" && (
                          <>
                            {/* Basic Actions Included Here */}
                            <div className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl shrink-0">🍎</span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                    {t("Feed (Basic)", "Hrana (Osnovno)", "Besle (Temel)")}
                                  </h5>
                                  <p className="text-[10px] text-[#8E8E93] truncate">+15XP • +Satiety</p>
                                </div>
                              </div>
                              <button onClick={() => { handleFeed(); showBubble(t("Yum! ❤️", "Mljac! ❤️", "Nefis! ❤️")); }} className="py-2 px-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl text-[11px] font-black text-[#FF9500] hover:bg-[#FF9500] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0">15 🪙</button>
                            </div>
                            <div className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl shrink-0">🛁</span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                    {t("Organic Soap", "Organski Sapun", "Organik Sabun")}
                                  </h5>
                                  <p className="text-[10px] text-[#8E8E93] truncate">+10XP • +Hygiene</p>
                                </div>
                              </div>
                              <button onClick={handleBath} className="py-2 px-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl text-[11px] font-black text-[#FF9500] hover:bg-[#FF9500] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0">10 🪙</button>
                            </div>
                            <div className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl shrink-0">🧸</span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                    {t("Plush Toy", "Plišana Igračka", "Peluş Oyuncak")}
                                  </h5>
                                  <p className="text-[10px] text-[#8E8E93] truncate">+35XP • +Joy</p>
                                </div>
                              </div>
                              <button onClick={handlePlayGame} className="py-2 px-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl text-[11px] font-black text-[#FF9500] hover:bg-[#FF9500] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0">12 🪙</button>
                            </div>
                            <div className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl shrink-0">💊</span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                    {t("Elixir (Medicine)", "Eliksir (Lek)", "İksir (İlaç)")}
                                  </h5>
                                  <p className="text-[10px] text-[#8E8E93] truncate">Cures Toxicity</p>
                                </div>
                              </div>
                              <button onClick={handleHeal} className="py-2 px-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl text-[11px] font-black text-[#FF9500] hover:bg-[#FF9500] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0">50 🪙</button>
                            </div>
                            <div className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl shrink-0">🛏️</span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                    {t("Sleep", "San", "Uyku")}
                                  </h5>
                                  <p className="text-[10px] text-[#8E8E93] truncate">+Energy</p>
                                </div>
                              </div>
                              <button onClick={handleSleep} className="py-2 px-4 bg-gray-100 dark:bg-black/40 border border-black/5 dark:border-white/10 rounded-xl text-[11px] font-black text-gray-800 dark:text-gray-200 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0">FREE</button>
                            </div>
                            {/* Premium Items */}
                            {SHOP_ITEMS.map((item) => (
                              <div key={item.id} className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-3xl shrink-0">{item.icon}</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t(item.nameEn, item.nameSr, item.nameSr)}
                                    </h5>
                                    <p className="text-[10px] text-[#8E8E93] truncate">
                                      +{item.rxp}XP • +{item.rh}% {t("Joy", "Sreća", "Neşe")}
                                    </p>
                                  </div>
                                </div>
                                <button onClick={() => handleBuyItem(item.cost, item.rxp, item.rh)} className="py-2 px-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl text-[11px] font-black text-[#FF9500] hover:bg-[#FF9500] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0">
                                  {item.cost} 🪙
                                </button>
                              </div>
                            ))}
                          </>
                        )}

                        {shopTab === "decor" && (
                          DECOR_ITEMS.map((item) => (
                            <div key={item.id} className="p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl shrink-0">{item.icon}</span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                    {t(item.nameEn, item.nameSr, item.nameSr)}
                                  </h5>
                                </div>
                              </div>
                              <button onClick={() => handleBuyDecor(item.id, item.cost)} className={\`py-2 px-4 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 \${purchasedDecor.includes(item.id) ? "bg-green-100 text-green-700 border-transparent cursor-default shadow-none" : "bg-[#FF9500]/10 border border-[#FF9500]/20 text-[#FF9500] hover:bg-[#FF9500] hover:text-white active:scale-95 shadow-sm"}\`}>
                                {purchasedDecor.includes(item.id) ? t("Owned", "Kupljeno", "Sahip") : \`\${item.cost} 🪙\`}
                              </button>
                            </div>
                          ))
                        )}

                        {shopTab === "themes" && (
                          SHOP_THEMES.map((theme) => {
                            const isOwned = purchasedThemes.includes(theme.id);
                            const isActive = habitatTheme === theme.id;
                            return (
                              <div key={theme.id} className={\`p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-sm \${isActive ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-900/20' : 'bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5'}\`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-3xl shrink-0">{theme.icon}</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t(theme.nameEn, theme.nameSr, theme.nameSr)}
                                    </h5>
                                    <p className="text-[10px] text-[#8E8E93] truncate">
                                      {isActive ? t("Active", "Aktivno", "Aktif") : isOwned ? t("Owned", "Kupljeno", "Sahip") : t("Buy", "Kupi", "Satın Al")}
                                    </p>
                                  </div>
                                </div>
                                <button onClick={() => isOwned ? setHabitatTheme(theme.id) : handleBuyTheme(theme.id, theme.cost)} className={\`py-2 px-4 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 \${isActive ? "bg-violet-100 text-violet-700 border-transparent cursor-default shadow-none" : isOwned ? "bg-gray-100 dark:bg-black/40 border border-black/10 dark:border-white/10 text-gray-900 dark:text-gray-100 shadow-sm" : "bg-[#FF9500]/10 border border-[#FF9500]/20 text-[#FF9500] hover:bg-[#FF9500] hover:text-white shadow-sm active:scale-95"}\`}>
                                  {isActive ? t("Active", "Aktivno", "Aktif") : isOwned ? t("Use", "Koristi", "Kullan") : \`\${theme.cost} 🪙\`}
                                </button>
                              </div>
                            );
                          })
                        )}

                        {shopTab === "hats" && (
                          [
                            { id: "wizard", cost: 150, icon: "🧙‍♂️", nameEn: "Wizard Hat", nameSr: "Čarobnjački Šešir" },
                            { id: "crown", cost: 200, icon: "👑", nameEn: "Golden Crown", nameSr: "Zlatna Kruna" },
                            { id: "visor", cost: 120, icon: "🕶️", nameEn: "Cyberpunk Visor", nameSr: "Cyber Visir" },
                            { id: "santa", cost: 100, icon: "🧑‍🎄", nameEn: "Santa Hat", nameSr: "Novogodišnja Kapa" },
                            { id: "detective", cost: 140, icon: "🕵️‍♂️", nameEn: "Detective Hat", nameSr: "Detektivski Šešir" },
                          ].map((hat) => {
                            const isOwned = ownedHats.includes(hat.id);
                            const isActive = activeHat === hat.id;
                            return (
                              <div key={hat.id} className={\`p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-sm \${isActive ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-900/20' : 'bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5'}\`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-3xl shrink-0">{hat.icon}</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-[13px] text-gray-800 dark:text-white leading-tight truncate">
                                      {t(hat.nameEn, hat.nameSr, hat.nameSr)}
                                    </h5>
                                    <p className="text-[10px] text-[#8E8E93] truncate">
                                      {isActive ? t("Active", "Aktivno", "Aktif") : isOwned ? t("Owned", "Kupljeno", "Sahip") : t("Buy", "Kupi", "Satın Al")}
                                    </p>
                                  </div>
                                </div>
                                <button onClick={() => isOwned ? setActiveHat(isActive ? "" : hat.id) : handleBuyHat(hat.id, hat.cost)} className={\`py-2 px-4 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 \${isActive ? "bg-violet-100 text-violet-700 border-transparent cursor-default shadow-none" : isOwned ? "bg-gray-100 dark:bg-black/40 border border-black/10 dark:border-white/10 text-gray-900 dark:text-gray-100 shadow-sm" : "bg-[#FF9500]/10 border border-[#FF9500]/20 text-[#FF9500] hover:bg-[#FF9500] hover:text-white shadow-sm active:scale-95"}\`}>
                                  {isActive ? t("Remove", "Skini", "Çıkar") : isOwned ? t("Wear", "Obuci", "Giy") : \`\${hat.cost} 🪙\`}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {lumiTab === "ostava" && (
                    <div className="w-full flex flex-col gap-6">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { id: "avocado", label: "Avocado", icon: "🥑", qty: foodAvocado, benefit: "+30 Feed, +10 Joy" },
                            { id: "salmon", label: "Salmon", icon: "🍣", qty: foodSalmon, benefit: "+40 Feed, +20 Energy" },
                            { id: "berries", label: "Berries", icon: "🍓", qty: foodBerries, benefit: "+20 Feed, +15 Hygiene" },
                            { id: "stardust", label: "Stardust", icon: "🌟", qty: foodStardust, benefit: "+25 Feed, +25XP" }
                          ].map((food) => (
                            <button
                              key={food.id}
                              onClick={() => handleFeedCustom(food.id as any)}
                              className="relative bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-3xl p-6 flex flex-col items-center transition-all group cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-95 shadow-sm"
                            >
                              <span className="text-5xl mb-3 drop-shadow-sm group-hover:scale-110 transition-transform">{food.icon}</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-white mt-1 text-center">{food.label}</span>
                              <span className="text-[11px] font-semibold text-gray-400 mt-1 text-center leading-tight">{food.benefit}</span>
                              <span className="absolute -top-2 -right-2 bg-[#FF9500] text-white text-xs font-extrabold w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#F2F2F7] dark:border-[#121214] shadow-sm">
                                {food.qty}
                              </span>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      );
    }
`;

content += renderStr;

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Restored full screen layout.");
