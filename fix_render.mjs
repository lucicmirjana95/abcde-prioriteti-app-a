import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

const returnIndex = content.indexOf('      {/* STAGE & MAIN INTERACTION */}');
if (returnIndex !== -1) {
  content = content.substring(0, returnIndex);
}

const newRender = `      {/* STAGE & MAIN INTERACTION */}
      return (
        <div className="flex flex-col gap-6 w-full pb-12 max-w-3xl mx-auto">
          
          {/* 1. SCENE */}
          <div className="relative w-full h-[350px] md:h-[450px] overflow-hidden rounded-[2.5rem] bg-black border border-black/10 dark:border-white/10 shadow-lg flex flex-col shrink-0">
            <LivingBackground stage={getLumiraStageIndex(level)} isSleeping={isLumiSleeping} />
            
            {/* Top Stats HUD */}
            <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
              <div className="flex flex-col gap-2 pointer-events-auto">
                <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex gap-4 shadow-sm border border-black/5 dark:border-white/10 text-sm font-bold items-center">
                   <span title={t("Happiness", "Sreća", "Sreća")}>❤️ {Math.ceil(happiness / 20)}</span>
                   <span title={t("Energy", "Energija", "Energija")}>⚡ {Math.ceil(energy / 20)}</span>
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
            <div className="absolute inset-0 z-10 flex items-center justify-center pt-10" onClick={handlePet}>
              <DogCompanion 
                level={level}
                mood={activeMood}
                theme={habitatTheme}
                activeHat={activeHat}
                isSleeping={isLumiSleeping}
                isBathing={isLumiBathing}
                isFeeding={isLumiFeeding}
                isPetting={isLumiPetting}
                language={language}
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
          </div>

          {/* 2. SHOP & ACTIVITIES */}
          <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 shadow-sm flex flex-col w-full">
            <h4 className="text-lg font-black text-gray-800 dark:text-white mb-4">
              {t("Market & Care", "Nega i Prodavnica", "Bakım ve Market")}
            </h4>
            
            <div className="flex bg-[#F2F2F7] dark:bg-black/10 p-0.5 rounded-lg mb-4 text-[10px] font-bold overflow-x-auto scrollbar-none snap-x w-full">
              <button
                onClick={() => setShopTab("items")}
                className={\`px-4 py-2 shrink-0 rounded-md text-center cursor-pointer snap-start \${shopTab === "items" ? "bg-white dark:bg-[#1C1C1E] shadow-xs text-black dark:text-white" : "text-gray-400"}\`}
              >
                {t("Basic", "Osnovno", "Temel")}
              </button>
              <button
                onClick={() => setShopTab("decor")}
                className={\`px-4 py-2 shrink-0 rounded-md text-center cursor-pointer snap-start \${shopTab === "decor" ? "bg-white dark:bg-[#1C1C1E] shadow-xs text-black dark:text-white" : "text-gray-400"}\`}
              >
                {t("Nature", "Priroda", "Doğa")}
              </button>
              <button
                onClick={() => setShopTab("themes")}
                className={\`px-4 py-2 shrink-0 rounded-md text-center cursor-pointer snap-start \${shopTab === "themes" ? "bg-white dark:bg-[#1C1C1E] shadow-xs text-black dark:text-white" : "text-gray-400"}\`}
              >
                {t("House", "Kuća", "Ev")}
              </button>
              <button
                onClick={() => setShopTab("hats")}
                className={\`px-4 py-2 shrink-0 rounded-md text-center cursor-pointer snap-start \${shopTab === "hats" ? "bg-white dark:bg-[#1C1C1E] shadow-xs text-black dark:text-white" : "text-gray-400"}\`}
              >
                {t("Rare", "Retko", "Nadir")}
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shopTab === "items" && (
                <>
                  {/* Basic Actions Included Here */}
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">🍎</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                          {t("Feed (Basic)", "Hrana (Osnovno)", "Besle (Temel)")}
                        </h5>
                        <p className="text-[9px] text-[#8E8E93] truncate">+15XP • +Satiety</p>
                      </div>
                    </div>
                    <button onClick={() => { handleFeed(); showBubble(t("Yum! ❤️", "Mljac! ❤️", "Nefis! ❤️")); }} className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">15 🪙</button>
                  </div>
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">🛁</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                          {t("Organic Soap", "Organski Sapun", "Organik Sabun")}
                        </h5>
                        <p className="text-[9px] text-[#8E8E93] truncate">+10XP • +Hygiene</p>
                      </div>
                    </div>
                    <button onClick={handleBath} className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">10 🪙</button>
                  </div>
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">🧸</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                          {t("Plush Toy", "Plišana Igračka", "Peluş Oyuncak")}
                        </h5>
                        <p className="text-[9px] text-[#8E8E93] truncate">+35XP • +Joy</p>
                      </div>
                    </div>
                    <button onClick={handleBuyToys} className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">12 🪙</button>
                  </div>
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">💊</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                          {t("Elixir (Medicine)", "Eliksir (Lek)", "İksir (İlaç)")}
                        </h5>
                        <p className="text-[9px] text-[#8E8E93] truncate">Cures Toxicity</p>
                      </div>
                    </div>
                    <button onClick={handleMedicine} className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">50 🪙</button>
                  </div>
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">🛏️</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                          {t("Sleep", "San", "Uyku")}
                        </h5>
                        <p className="text-[9px] text-[#8E8E93] truncate">+Energy</p>
                      </div>
                    </div>
                    <button onClick={handleSleep} className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">FREE</button>
                  </div>
                  {/* Premium Items */}
                  {SHOP_ITEMS.map((item) => (
                    <div key={item.id} className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                            {t(item.nameEn, item.nameSr, item.nameSr)}
                          </h5>
                          <p className="text-[9px] text-[#8E8E93] truncate">
                            +{item.rxp}XP • +{item.rh}% {t("Joy", "Sreća", "Neşe")}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleBuyItem(item.cost, item.rxp, item.rh)} className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-extrabold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0">
                        {item.cost} 🪙
                      </button>
                    </div>
                  ))}
                </>
              )}

              {shopTab === "decor" && (
                DECOR_ITEMS.map((item) => (
                  <div key={item.id} className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                          {t(item.nameEn, item.nameSr, item.nameSr)}
                        </h5>
                      </div>
                    </div>
                    <button onClick={() => handleBuyDecor(item.id, item.cost)} className={\`py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all shadow-xs cursor-pointer shrink-0 \${purchasedDecor.includes(item.id) ? "bg-green-100 text-green-700 border-transparent cursor-default" : "bg-white dark:bg-[#2C2C2E] border-black/10 dark:border-white/10 text-[#FF9500] hover:scale-105 active:scale-95 border"}\`}>
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
                    <div key={theme.id} className={\`p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border flex items-center justify-between gap-2 \${isActive ? 'border-violet-500/50 bg-violet-50/50 dark:bg-violet-900/10' : 'border-black/5 dark:border-white/5'}\`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{theme.icon}</span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                            {t(theme.nameEn, theme.nameSr, theme.nameSr)}
                          </h5>
                          <p className="text-[9px] text-[#8E8E93] truncate">
                            {isActive ? t("Active", "Aktivno", "Aktif") : isOwned ? t("Owned", "Kupljeno", "Sahip") : t("Buy", "Kupi", "Satın Al")}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => isOwned ? setHabitatTheme(theme.id) : handleBuyTheme(theme.id, theme.cost)} className={\`py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all shadow-xs cursor-pointer shrink-0 \${isActive ? "bg-violet-100 text-violet-700 border-transparent cursor-default" : isOwned ? "bg-white dark:bg-[#2C2C2E] border-black/10 text-gray-900 border" : "bg-white dark:bg-[#2C2C2E] border-black/10 text-[#FF9500] border"}\`}>
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
                    <div key={hat.id} className={\`p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E]/40 rounded-xl border flex items-center justify-between gap-2 \${isActive ? 'border-violet-500/50 bg-violet-50/50 dark:bg-violet-900/10' : 'border-black/5 dark:border-white/5'}\`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{hat.icon}</span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-[11px] text-gray-800 dark:text-white leading-tight truncate">
                            {t(hat.nameEn, hat.nameSr, hat.nameSr)}
                          </h5>
                          <p className="text-[9px] text-[#8E8E93] truncate">
                            {isActive ? t("Active", "Aktivno", "Aktif") : isOwned ? t("Owned", "Kupljeno", "Sahip") : t("Buy", "Kupi", "Satın Al")}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => isOwned ? setActiveHat(isActive ? "" : hat.id) : handleBuyHat(hat.id, hat.cost)} className={\`py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all shadow-xs cursor-pointer shrink-0 \${isActive ? "bg-violet-100 text-violet-700 border-transparent cursor-default" : isOwned ? "bg-white dark:bg-[#2C2C2E] border-black/10 text-gray-900 border" : "bg-white dark:bg-[#2C2C2E] border-black/10 text-[#FF9500] border"}\`}>
                        {isActive ? t("Remove", "Skini", "Çıkar") : isOwned ? t("Wear", "Obuci", "Giy") : \`\${hat.cost} 🪙\`}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. PANTRY (OSTAVA) */}
          <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 shadow-sm flex flex-col w-full">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-black text-gray-800 dark:text-white">
                  {t("Storage", "Ostava", "Kiler")}
                </h4>
             </div>
             
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
                    className="relative bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center transition-all group cursor-pointer hover:shadow-md hover:-translate-y-1 active:scale-95"
                  >
                    <span className="text-4xl mb-2">{food.icon}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white mt-1 text-center">{food.label}</span>
                    <span className="text-[10px] font-semibold text-gray-400 mt-0.5 text-center leading-tight">{food.benefit}</span>
                    <span className="absolute -top-2 -right-2 bg-[#FF9500] text-white text-[11px] font-extrabold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-[#1C1C1E] shadow-sm">
                      {food.qty}
                    </span>
                  </button>
                ))}
             </div>
          </div>

        </div>
      );
    }`;

content += newRender;

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Applied vertical flow!");
