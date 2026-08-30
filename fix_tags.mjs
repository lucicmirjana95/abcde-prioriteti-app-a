import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

const regex = /\{\/\* RIGHT COLUMN STUFF STARTS HERE \*\/\}\n                  <div className="w-full flex flex-col gap-6 text-left">\n                     \{\/\* Temporarily preserving original dashboard stats \*\/\}\n\n\n              \n              \{\/\* ================================================================= \*\/\}/;

const replacement = `{/* RIGHT COLUMN STUFF STARTS HERE */}
                  <div className="w-full flex flex-col gap-6 text-left">
                     {/* Temporarily preserving original dashboard stats */}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* ================================================================= */}`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Fixed broken tags!");
