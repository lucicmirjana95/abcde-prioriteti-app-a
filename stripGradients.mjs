import fs from 'fs';

function cleanColors(file) {
  let content = fs.readFileSync(file, 'utf-8');
  // strip all `from-... to-... via-...` gradients
  content = content.replace(/(from|to|via)-([a-zA-Z0-9]+)-([0-9]{2,3})(\/[0-9]+)?/g, '');
  // strip duplicated or trailing classes
  content = content.replace(/ +/g, ' ');

  fs.writeFileSync(file, content, 'utf-8');
}

cleanColors('./src/components/MorningAIHub.tsx');
cleanColors('./src/components/ProgressMatrix.tsx');
cleanColors('./src/components/DogCompanion.tsx');

