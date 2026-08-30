import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// The ternary ends with:
// `) : shopTab === "themes" ? (\n                             SHOP_THEMES.map... \n                           ) : (`
// And then the HATS mapping starts.

content = content.replace(
  /\) : \(\n                            \[\n                              \{ id: "wizard"/,
  `) : shopTab === "hats" ? (\n                            [\n                              { id: "wizard"`
);

// The hats mapping ends with:
// `                              </div>\n                            );\n                          })\n                        )}`
// We need to add the empty states.
content = content.replace(
  /                            \}\)\n                          \)\}/,
  `                            })\n                          ) : (\n                            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">\n                              <span className="text-3xl mb-2">✨</span>\n                              <p className="text-[10px] font-bold uppercase tracking-wider">{t("Coming soon! 🚧", "Uskoro! 🚧", "Yakında! 🚧")}</p>\n                            </div>\n                          )}`
);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Empty states added");
