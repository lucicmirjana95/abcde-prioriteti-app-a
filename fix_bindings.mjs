import fs from 'fs';

let content = fs.readFileSync('src/components/PetSanctuary.tsx', 'utf8');

// Fix DogCompanion -> CompanionGraphic
content = content.replace(
  /<DogCompanion/g,
  '<CompanionGraphic'
);

// Fix handleBuyToys -> handlePlayGame
content = content.replace(
  /onClick=\{handleBuyToys\}/g,
  'onClick={handlePlayGame}'
);

// Fix handleMedicine -> handleHeal
content = content.replace(
  /onClick=\{handleMedicine\}/g,
  'onClick={handleHeal}'
);

fs.writeFileSync('src/components/PetSanctuary.tsx', content);
console.log("Fixed bindings!");
