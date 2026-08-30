import fs from 'fs';

const file = 'src/components/MorningAIHub.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Biological Reset Core Needs Clickable
const bioresetOld = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#000000]/40 p-3.5 rounded-xl border border-white/50 dark:border-white/5">`;
const bioresetNew = `<div 
                    onClick={() => setExpandedCard({
                      type: isEn ? "Cognitive Need" : "Kognitivna Potreba",
                      title: parsedData.cognitive_chain.need,
                      description: isEn ? "Biological reset focus based on your current state." : "Fokus biološkog reseta na osnovu vašeg stanja."
                    })}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#000000]/40 p-3.5 rounded-xl border border-white/50 dark:border-white/5 cursor-pointer hover:border-[#007AFF]/50 transition-colors">`;

content = content.replace(bioresetOld, bioresetNew);

// 2. Mentors Advice Clickable
const mentorsOld = `<div className="p-4.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[#3C3C43] rounded-xl font-semibold text-xs space-y-1 font-sans">`;
const mentorsNew = `<div 
                onClick={() => setExpandedCard({
                  type: isEn ? "Mindset Coach Insight" : "Sistemski Savetnik Uvid",
                  title: isEn ? "Mentors Advice" : "Savet",
                  description: parsedData.mindset.details
                })}
                className="p-4.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[#3C3C43] rounded-xl font-semibold text-xs space-y-1 font-sans cursor-pointer hover:border-[#FF9500]/50 transition-colors">`;

content = content.replace(mentorsOld, mentorsNew);

// 3. TA Insight Clickable
const taOld = `<div className="p-4.5 bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 text-[#AF52DE] dark:text-[#BF5AF2] rounded-xl font-semibold text-xs space-y-1 font-sans">`;
const taNew = `<div 
                  onClick={() => setExpandedCard({
                    type: isEn ? "Transactional Analysis" : "Transakciona Analiza",
                    title: isEn ? "TA Insight" : "Ego Stanja",
                    description: parsedData.mindset.ta_insight
                  })}
                  className="p-4.5 bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 text-[#AF52DE] dark:text-[#BF5AF2] rounded-xl font-semibold text-xs space-y-1 font-sans cursor-pointer hover:border-[#AF52DE]/50 transition-colors">`;

content = content.replace(taOld, taNew);

// 4. Also fix Biohack tip click problem where react-markdown might block pointer events. Actually, let's just make the whole container area clickable via an absolute positioned overlay.
// Wait, react-markdown doesn't block pointer events unless they're anchor tags. But just to be sure, I'll update the Biohack Advice onClick. 
const biohackOld = `onClick={() => setExpandedCard({
                            type: isEn ? "Biohack Advice" : "Biohaking Savet",
                            description: biohackTip || (isEn ? "No tip generated." : "Nema generisanog saveta.")
                          })}`;
const biohackNew = `onClick={(e) => { 
                            e.stopPropagation();
                            setExpandedCard({
                                type: isEn ? "Biohack Advice" : "Biohaking Savet",
                                description: biohackTip || (isEn ? "Wait for generation..." : "Sačekaj da se generiše..."),
                                explanation: isEn ? "Drawn from current biological profile." : "Zasnovano na unetom nivou energije."
                            });
                          }}`;
content = content.replace(biohackOld, biohackNew);

fs.writeFileSync(file, content);
console.log("Cards patched");
