import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace {language === "en" ? item.labelEn : item.labelSr} 
// with {language === "en" ? item.labelEn : language === "tr" ? item.labelTr : item.labelSr}
content = content.replace(
  '{language === "en" ? item.labelEn : item.labelSr}', 
  '{language === "en" ? item.labelEn : language === "tr" ? item.labelTr : item.labelSr}'
);

content = content.replace(
  'labelEn: "Companion",\n                      labelSr: "Saputnik",',
  'labelEn: "Companion",\n                      labelSr: "Saputnik",\n                      labelTr: "Yol Arkadaşı",'
);

content = content.replace(
  'labelEn: "Cognitive Lab",\n                      labelSr: "Kognitivni AI",',
  'labelEn: "Cognitive Lab",\n                      labelSr: "Kognitivni AI",\n                      labelTr: "Bilişsel Yapay Zeka",'
);

content = content.replace(
  'labelEn: "80/20 Analyzer",\n                      labelSr: "Fokus 80/20",',
  'labelEn: "80/20 Analyzer",\n                      labelSr: "Fokus 80/20",\n                      labelTr: "Odak 80/20",'
);

content = content.replace(
  'labelEn: "Strategic Visions",\n                      labelSr: "Strateške Vizije",',
  'labelEn: "Strategic Visions",\n                      labelSr: "Strateške Vizije",\n                      labelTr: "Stratejik Vizyon",'
);

content = content.replace(
  'labelEn: "Micro-Routines",\n                      labelSr: "Mikro Rutine",',
  'labelEn: "Micro-Routines",\n                      labelSr: "Mikro Rutine",\n                      labelTr: "Mikro Rutinler",'
);

content = content.replace(
  'labelEn: "Dopamine Check",\n                      labelSr: "Dopamin Protokol",',
  'labelEn: "Dopamine Check",\n                      labelSr: "Dopamin Protokol",\n                      labelTr: "Dopamin Protokolü",'
);

content = content.replace(
  'labelEn: "Settings",\n                      labelSr: "Podešavanja",',
  'labelEn: "Settings",\n                      labelSr: "Podešavanja",\n                      labelTr: "Ayarlar",'
);

fs.writeFileSync('src/App.tsx', content);
