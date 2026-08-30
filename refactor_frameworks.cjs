const fs = require('fs');
let content = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf-8');

const targetSectionStart = '{/* DYNAMIC COMPREHENSIVE FRAMEWORK (REBT / MARFI / BIOHACKING) */}';
const targetSectionEnd = '{/* Navigation buttons */}';

const startIndex = content.indexOf(targetSectionStart);
const endIndex = content.indexOf(targetSectionEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
   let newFrameworkSection = `              {/* COMPREHENSIVE FRAMEWORKS (REBT / PROTOCOL / BIOHACKING) */}
              {parsedData.frameworks_data && (
                <div className="pt-2 space-y-4">
                  {/* REBT Framework */}
                  {parsedData.frameworks_data.rebt && parsedData.frameworks_data.rebt.irrational_belief && (
                    <div className="p-5.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5/20 rounded-xl space-y-3.5 text-left animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl select-none">🧘</span>
                        <div>
                          <span className="text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block select-none">
                            COGNITIVE RESTRUCTURING SYSTEM
                          </span>
                          <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">
                            {isEn
                              ? "Albert Ellis's REBT Cognitive Reframing"
                              : "Racionalno-emotivna kognitivna rekonstrukcija (REBT)"}
                          </h4>
                        </div>
                      </div>
                      <p className="text-[13px] font-semibold leading-relaxed">
                        {isEn
                          ? "Deconstruct disabling irrational demands ('musts' & 'shoulds') into constructive, high-resilience commitments."
                          : "Razložite blokirajuće iracionalne zahteve ('moram' i 'trebam') u visoko otporne, realistične akcije."}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-1.5 select-none font-sans">
                        {/* A */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5/60 space-y-1">
                          <span className="w-5.5 h-5.5 rounded-lg bg-[#F2F2F7] dark:bg-[#1C1C1E]0/10 text-[#3C3C43] dark:text-[#EBEBF5]/60 font-semibold text-xs flex items-center justify-center">A</span>
                          <p className="text-[13px] text-[#3C3C43] font-semibold">{isEn ? "Event (Trigger)" : "Događaj (Okidač)"}</p>
                          <p className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/60 leading-snug">{parsedData.frameworks_data.rebt.activating_event}</p>
                        </div>
                        {/* B */}
                        <div className="p-3.5 rounded-xl bg-[#FF3B30] dark:bg-[#FF453A]/5 border border-[#FF3B30] dark:border-[#FF453A]/15 space-y-1">
                          <span className="w-5.5 h-5.5 rounded-lg bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] font-semibold text-xs flex items-center justify-center">B</span>
                          <p className="text-[13px] text-[#FF3B30] font-semibold">{isEn ? "Irrational Belief" : "Iracionalno uverenje"}</p>
                          <p className="text-xs font-medium text-[#FF3B30] dark:text-[#FF3B30] leading-snug">{parsedData.frameworks_data.rebt.irrational_belief}</p>
                        </div>
                        {/* C */}
                        <div className="p-3.5 rounded-xl bg-[#FF9500] dark:bg-[#FF9F0A]/5 border border-[#FF9500] dark:border-[#FF9F0A]/15 space-y-1">
                          <span className="w-5.5 h-5.5 rounded-lg bg-[#FF9500] dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] font-semibold text-xs flex items-center justify-center">C</span>
                          <p className="text-[13px] text-[#FF9500] font-semibold">{isEn ? "Consequences" : "Posledice"}</p>
                          <p className="text-xs font-medium text-[#FF9500] dark:text-[#FF9500] leading-snug">{parsedData.frameworks_data.rebt.consequences}</p>
                        </div>
                        {/* D */}
                        <div className="p-3.5 rounded-xl bg-[#007AFF]/5 border border-black/5 dark:border-white/5 space-y-1">
                          <span className="w-5.5 h-5.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] font-semibold text-xs flex items-center justify-center">D</span>
                          <p className="text-[13px] text-[#007AFF] font-semibold">{isEn ? "Disputing (Debate)" : "Osporavanje (Debata)"}</p>
                          <p className="text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] leading-snug italic">"{parsedData.frameworks_data.rebt.disputing}"</p>
                        </div>
                        {/* E */}
                        <div className="p-3.5 rounded-xl bg-[#34C759] dark:bg-[#30D158]/5 border border-[#34C759] dark:border-[#30D158]/15 space-y-1">
                          <span className="w-5.5 h-5.5 rounded-lg bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] font-semibold text-xs flex items-center justify-center">E</span>
                          <p className="text-[13px] text-[#34C759] font-semibold">{isEn ? "Effective Belief" : "Novo zdravo uverenje"}</p>
                          <p className="text-xs font-medium text-[#34C759] dark:text-[#34C759] leading-snug">{parsedData.frameworks_data.rebt.effective_belief}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Protocol Framework */}
                  {parsedData.frameworks_data.protocol && parsedData.frameworks_data.protocol.potential_failure && (
                    <div className="p-5.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5/20 rounded-xl space-y-3.5 text-left animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl select-none">🛡️</span>
                        <div>
                          <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/60 font-semibold block select-none">PRE-MORTEM ANTI-FRAGILITY</span>
                          <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">{isEn ? "Anti-Fragility Master Plan" : "Plan Izdržljivosti i Odbrane"}</h4>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1.5 font-sans">
                        <div className="p-3.5 rounded-xl bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 space-y-1">
                          <p className="text-[13px] text-[#FF3B30] font-semibold">{isEn ? "What could go wrong?" : "Šta može krenuti po zlu?"}</p>
                          <p className="text-xs font-medium text-[#FF3B30] dark:text-[#FF3B30] leading-snug">{parsedData.frameworks_data.protocol.potential_failure}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border border-black/5 dark:border-white/5/50 space-y-1">
                          <p className="text-[13px] text-[#007AFF] font-semibold">{isEn ? "Preventative Action" : "Preventivna akcija"}</p>
                          <p className="text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] leading-snug">{parsedData.frameworks_data.protocol.preventative_action}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 space-y-1">
                          <p className="text-[13px] text-[#34C759] font-semibold">{isEn ? "Recovery Plan" : "Plan oporavka"}</p>
                          <p className="text-xs font-medium text-[#34C759] dark:text-[#34C759] leading-snug">{parsedData.frameworks_data.protocol.recovery_plan}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BIOHACKING Framework */}
                  {parsedData.frameworks_data.biohacking && parsedData.frameworks_data.biohacking.protocol_name && (
                    <div className="p-5.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5/20 rounded-xl space-y-3.5 text-left animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl select-none">🧬</span>
                        <div>
                          <span className="text-[13px] text-[#34C759] dark:text-[#34C759] font-semibold block select-none">PHYSIOLOGICAL PROTOCOL</span>
                          <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">{isEn ? "Targeted Biohack" : "Ciljani biohakerski protokol"}</h4>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3 bg-white dark:bg-[#000000] p-4 border border-black/5 dark:border-white/5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#34C759] px-2 py-1 rounded-md text-xs font-semibold">
                            {parsedData.frameworks_data.biohacking.protocol_name}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] text-[#3C3C43]">{isEn ? "Why it helps" : "Zašto ovo pomaže"}</p>
                          <p className="text-sm font-serif italic text-[#3C3C43] dark:text-[#EBEBF5]/60">"{parsedData.frameworks_data.biohacking.why_it_helps}"</p>
                        </div>
                        <div className="pt-2 border-t border-black/5 dark:border-white/5">
                          <p className="text-[13px] text-[#007AFF] font-semibold mb-1">{isEn ? "How to execute" : "Kako da ovo izvedeš"}</p>
                          <p className="text-sm font-semibold text-black dark:text-white whitespace-pre-line leading-relaxed">{parsedData.frameworks_data.biohacking.how_to_do_it}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

`;

   let result = content.slice(0, startIndex) + newFrameworkSection + content.slice(endIndex);
   fs.writeFileSync('src/components/MorningAIHub.tsx', result);
   console.log("SUCCESS");
} else {
   console.log("NOT FOUND", startIndex, endIndex);
}
