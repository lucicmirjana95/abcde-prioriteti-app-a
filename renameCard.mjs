import fs from 'fs';

let contentHome = fs.readFileSync('./src/components/HomePortal.tsx', 'utf8');
contentHome = contentHome.replace(/premium-card-dark/g, 'hig-card');
contentHome = contentHome.replace(/premium-card/g, 'hig-card');
fs.writeFileSync('./src/components/HomePortal.tsx', contentHome, 'utf8');

let contentPet = fs.readFileSync('./src/components/PetSanctuary.tsx', 'utf8');
contentPet = contentPet.replace(/premium-card-dark/g, 'hig-card');
contentPet = contentPet.replace(/premium-card/g, 'hig-card');
fs.writeFileSync('./src/components/PetSanctuary.tsx', contentPet, 'utf8');

console.log("Renamed premium-card to hig-card");
