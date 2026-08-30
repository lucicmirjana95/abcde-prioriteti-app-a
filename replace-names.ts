import * as fs from 'fs';

function replaceInFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Sent to Disney Inbox/gi, 'Sent to Vision Chamber')
                   .replace(/Poslato u Dizni Inboks/gi, 'Poslato u Stratešku Sobu')
                   .replace(/Diznilejd Strateška Soba/gi, 'Strateška Soba Vizija')
                   .replace(/Diznilejd/gi, 'Strateška')
                   .replace(/Dizni/gi, '')
                   .replace(/Disney/gi, 'Vision')
                   .replace(/Istraži Marfijev Protokol/gi, 'Istraži Protokol Izdržljivosti')
                   .replace(/Explore Murphy's Anti-Fragility Plan/gi, 'Explore Anti-Fragility Plan')
                   .replace(/Murphy's Law Defense Plan/gi, 'Anti-Fragility Master Plan')
                   .replace(/Marfijev protokol za odbranu/gi, 'Plan Izdržljivosti i Odbrane')
                   .replace(/Dr\.\s*Nikola\s*Green/gi, 'Biohacker AI Expert')
                   .replace(/Dr\s*Nikola\s*Grin/gi, 'Biohacker AI Ekspert')
                   .replace(/Dr\.\s*Green/gi, 'Biohacker AI')
                   .replace(/Dr\s*Grin/gi, 'Biohacker AI')
                   .replace(/Martha Jenkins/gi, 'Sistemski Savetnik')
                   .replace(/Marti Jenkins/gi, 'Sistemskom Savetniku')
                   .replace(/Martha/gi, 'Savetnik')
                   .replace(/Džozef Marfi/gi, 'Ekspert za podsvest')
                   .replace(/Joseph Murphy/gi, 'Subconscious Expert')
                   .replace(/Marfijev/gi, 'Protokol')
                   .replace(/Murphy/gi, 'Protocol');
  fs.writeFileSync(file, content);
}

const files = [
  'src/components/MorningAIHub.tsx',
  'src/components/MindsetCoach.tsx',
  'src/components/HomePortal.tsx',
  'src/components/DisneyStrategy.tsx',
  'src/App.tsx',
  'server.ts'
];

files.forEach(replaceInFile);
console.log('Done!');
