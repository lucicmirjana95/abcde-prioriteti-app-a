const fs = require('fs');

const content = fs.readFileSync('src/components/DopamineEducation.tsx', 'utf-8');

// We will find the return statement and replace the whole block with our new one
const beforeReturn = content.substring(0, content.indexOf('return ('));

const newReturn = `return (
    <div className="space-y-10 pb-12">
      {/* HEADER */}
      <div className="text-left px-2 mb-2 mt-4">
        <h3 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-2">
          {isEn ? "Neurobiology of Focus" : "Naučni principi fokusa"}
        </h3>
        <p className="text-[15px] leading-relaxed font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
          {isEn 
            ? "Explore the mechanics of focus, simulate dopamine baselines, and rebuild cognitive resilience." 
            : "Istraži mehanizme pažnje, simuliraj biološki otpor i uči kroz naučno dokazane modele kognitivnih nauka."}
        </p>
      </div>

      {/* 1. HORIZONTAL SIMULATOR CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-semibold text-[17px] text-black dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#007AFF]"/>
            {isEn ? "Simulator: Dopamine Paths" : "Simulator ponašanja"}
          </h4>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-2 no-scrollbar">
          {(["scrolling", "cold", "gaming", "focus"] as const).map(act => {
            const data = simData[act];
            return (
              <div 
                key={act}
                className="min-w-[85vw] sm:min-w-[320px] snap-center shrink-0 border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] rounded-2xl flex flex-col pt-6 pb-6 px-6 relative"
              >
                 <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-[10px] bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-xl">
                      {act === "scrolling" ? "📱" : act === "cold" ? "🧊" : act === "gaming" ? "🎮" : "⏱️"}
                   </div>
                   <div>
                     <h5 className="font-bold text-[15px] text-black dark:text-white leading-tight">
                       {isEn ? data.titleEn : data.titleSr}
                     </h5>
                   </div>
                 </div>
                 
                 <p className="text-[14px] font-medium leading-relaxed opacity-80 text-black dark:text-white mb-6 flex-1">
                   {isEn ? data.neuroEn : data.neuroSr}
                 </p>

                 <div className="pt-4 space-y-2 border-t border-black/5 dark:border-white/5">
                   <p className={\`text-[13px] font-semibold \${data.color}\`}>{isEn ? data.peakEn : data.peakSr}</p>
                   <p className="text-[12px] font-semibold text-[#8E8E93]">{isEn ? data.crashEn : data.crashSr}</p>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CONTRAST-CORRECTED RED/GREEN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
         <div className={\`p-6 text-left h-full rounded-2xl border \${isEvening ? "bg-[#2C2C2E] border-white/5 text-white" : "bg-white border-[#FF3B30]/20 text-black"}\`}>
           <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FF3B30]/10 flex items-center justify-center shrink-0">
                 <Flame className="w-5 h-5 text-[#FF3B30]"/>
              </div>
              <div>
                 <h5 className="font-bold text-[17px] text-[#FF3B30]">
                   {isEn ? "Unearned Novelty" : "Brza Uzbuđenja (Pici bez truda)"}
                 </h5>
                 <p className="text-[13px] mt-2 font-medium leading-relaxed opacity-80">
                   {isEn 
                      ? "High dopamine burst with zero physical/cognitive effort. Drains baseline rapidly, leaving exhaustion." 
                      : "Zasićenje neurotransmitera za nulu uloženog mentalnog truda. Iscrpljuje bazu i ostavlja snažan pad i nedostatak volje za pravi rad."}
                 </p>
              </div>
           </div>
         </div>
         <div className={\`p-6 text-left h-full rounded-2xl border \${isEvening ? "bg-[#2C2C2E] border-white/5 text-white" : "bg-white border-[#34C759]/20 text-black"}\`}>
           <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#34C759]/10 flex items-center justify-center shrink-0">
                 <Target className="w-5 h-5 text-[#34C759]"/>
              </div>
              <div>
                 <h5 className="font-bold text-[17px] text-[#34C759]">
                   {isEn ? "Earned Gratification" : "Zasluženi Rezultat"}
                 </h5>
                 <p className="text-[13px] mt-2 font-medium leading-relaxed opacity-80">
                   {isEn 
                      ? "Requires cognitive friction to begin. Smooth, healthy baseline climb. Leaves a lasting sense of satisfaction." 
                      : "Zahteva kognitivno trenje (napor) za start. Zida čvrst i stabilan rast neuro-mreža, dajući trajno poboljšanje baze i osećaja elana."}
                 </p>
              </div>
           </div>
         </div>
      </div>

      {/* 3. GOLDEN LAWS HORIZONTAL SCROLL */}
      <div className="space-y-4 pt-8 border-t border-black/5 dark:border-white/5">
        <div className="px-2">
          <h4 className="font-semibold text-[17px] text-black dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#5E5CE6]" />
            {isEn ? "Biological Underpinnings" : "Zlatni zakoni fokusa (Upregulacija)"}
          </h4>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-2 no-scrollbar">
          {mechanics.map((item, idx) => (
             <div key={idx} className="min-w-[80vw] sm:min-w-[300px] snap-center shrink-0 p-6 border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] rounded-2xl text-left flex flex-col justify-center gap-3">
               <span className="text-3xl mb-2">{item.icon}</span>
               <h5 className="font-bold text-[16px] text-black dark:text-white leading-tight">
                  {isEn ? item.titleEn : item.titleSr}
               </h5>
               <p className="text-[14px] font-medium leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {isEn ? item.descEn : item.descSr}
               </p>
             </div>
          ))}
        </div>
      </div>

      {/* 4. 7-DAY RESET */}
      <div className="space-y-4 pt-8 border-t border-black/5 dark:border-white/5">
        <div className="px-2">
          <h4 className="font-semibold text-[17px] text-black dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#FF9500]" />
            {isEn ? "7-Day Reborn Protocol" : "7-Dnevni Reset Protokol"}
          </h4>
          <p className="text-[14px] font-medium mt-1.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 max-w-lg">
            {isEn ? "Incorporate one rule step per day to progressively rebuild baseline cognitive stamina." : "Ispuni strogo po jednu rutinu dnevno. Postani potpuno funkcionalan nakon isteka nedelje."}
          </p>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-2 no-scrollbar">
          {resetDays.map((d, idx) => (
             <div key={idx} className="min-w-[70vw] sm:min-w-[280px] snap-center shrink-0 flex flex-col p-6 border border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl text-left relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-[#007AFF] opacity-30 group-hover:opacity-100 transition-opacity"/>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-[14px]">
                    {d.day}
                 </div>
                 <h5 className="font-bold text-[15px] text-black dark:text-white leading-snug">
                    {isEn ? d.titleEn : d.titleSr}
                 </h5>
               </div>
               <p className="text-[14px] font-medium leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {isEn ? d.descEn : d.descSr}
               </p>
               
               {onAddTask && (
                 <button
                   onClick={() => onAddTask({
                     title: \`(\${d.day}/7) \${isEn ? d.titleEn : d.titleSr}\`,
                     description: isEn ? d.descEn : d.descSr,
                     category: "A",
                     complexity: 3,
                     isTimebox: true,
                     timeLimit: 30
                   })}
                   className="mt-6 py-2 px-3 self-start bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-sm rounded-xl text-[13px] font-semibold text-[#007AFF] active:scale-95 transition-all"
                 >
                    {isEn ? "+ Try Routine Today" : "+ Isprobaj ovu rutinu danas"}
                 </button>
               )}
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;

const finalPath = beforeReturn + newReturn + '\n}\n';

fs.writeFileSync('src/components/DopamineEducation.tsx', finalPath, 'utf-8');
console.log('Successfully rewrote DopamineEducation.tsx');
