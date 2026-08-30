const fs = require('fs');
let c = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf8');

c = c.replace(/renderFormattedBiohack\([\s\S]*?\)\s*\)/g, (match) => {
  return match + `
                            {suggestedBiohackHabit && !isGeneratingBiohack && (
                              <button
                                onClick={() => {
                                  onAddTask(
                                    \`⚡ Biohack: \${suggestedBiohackHabit.name}\`,
                                    \`\${isEn ? 'Micro-routine:' : 'Mikrorutina:'} \${suggestedBiohackHabit.twoMinVersion}\`,
                                    'B'
                                  );
                                  window.dispatchEvent(
                                    new CustomEvent("trigger-toast", {
                                      detail: { message: isEn ? "Added micro-routine to today's plan! 📑" : "Dodata mikrorutina današnjem planu! 📑", type: "success" },
                                    }),
                                  );
                                }}
                                className="mt-3 px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors active:scale-95"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                {isEn ? "Add Micro-routine to Today" : "Dodaj mikrorutinu u današnji plan"}
                              </button>
                            )}`;
});

fs.writeFileSync('src/components/MorningAIHub.tsx', c);
console.log("Done");
