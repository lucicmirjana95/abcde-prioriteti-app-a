import fs from 'fs';

const file = 'src/components/MorningAIHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const refreshOld = `onClick={() =>
                      fetchBiohackTip(
                        parsedData.cognitive_chain.need,
                        biohackTip,
                      )
                    }`;

const refreshNew = `onClick={(e) => {
                      e.stopPropagation();
                      fetchBiohackTip(
                        parsedData.cognitive_chain.need,
                        biohackTip,
                      );
                    }}`;

content = content.replace(refreshOld, refreshNew);

fs.writeFileSync(file, content);
console.log("Stop propagation patched");
