import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// The incorrect CompanionGraphic JSX block
const incorrectProps = /<CompanionGraphic[\s\S]*?\/>/;

const correctProps = `<CompanionGraphic 
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
              />`;

content = content.replace(incorrectProps, correctProps);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Fixed CompanionGraphic props!");
