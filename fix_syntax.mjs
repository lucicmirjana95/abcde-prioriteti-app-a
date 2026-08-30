import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// The fragment for "gradnja" was never closed before AnimatePresence ended.
// I'll close it right at the end of the first AnimatePresence.
content = content.replace(
  /                  <\/div>\n                <\/div>\n\n              <\/div>\n                  <\/div>\n                <\/div>\n              <\/motion\.div>\n            \)\}\n          <\/AnimatePresence>\n        <\/div>/,
  `                  </div>\n                </div>\n\n              </div>\n                  </div>\n                </div>\n              </>\n              )}\n              </motion.div>\n            )}\n          </AnimatePresence>\n        </div>`
);

// Now I need to fix the EVOLUTION PHASES INFO & SELECTOR
// I replaced: {/* EVOLUTION PHASES INFO & SELECTOR */}
// With: </>\n              )}\n\n              {lumiTab === "detalji" && (\n              <>\n              {/* EVOLUTION PHASES INFO & SELECTOR */}
// I will undo this because Evolution Guide is a completely separate overlay.
content = content.replace(
  /<\/>\n              \)\}\n\n              \{lumiTab === "detalji" && \(\n              <>\n              \{\/\* EVOLUTION PHASES INFO & SELECTOR \*\/\}/g,
  `{/* EVOLUTION PHASES INFO & SELECTOR */}`
);

// The bottom part of the second AnimatePresence was messed up because I had a regex replace for the end of the file.
// Wait, my regex for the end of the file was:
// `                  </div>\n\n                </div>\n              </div>\n              </>\n              )}\n\n            </motion.div>\n          </motion.div>\n        )}\n      </AnimatePresence>`
// That was targeting the second AnimatePresence!
// Because the second AnimatePresence ended with `</AnimatePresence>`!
// Let's restore the end of the file to what it should be.

content = content.replace(
  /                  <\/div>\n\n                <\/div>\n              <\/div>\n              <\/>\n              \)\}\n\n            <\/motion\.div>\n          <\/motion\.div>\n        \)\}\n      <\/AnimatePresence>/,
  `                  </div>\n\n                </div>\n              </div>\n\n            </motion.div>\n          </motion.div>\n        )}\n      </AnimatePresence>`
);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Fixed JSX syntax!");
