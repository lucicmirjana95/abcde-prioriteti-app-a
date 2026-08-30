const fs = require('fs');
const content = fs.readFileSync('src/components/DopamineTracker.tsx', 'utf-8');

const replacement = `const ASRS_QUESTIONS = [
  {
    id: "q1",
    textEn: "Starting difficult tasks",
    textSr: "Započinjanje teških zadataka",
    descEn: "How often do you avoid or delay getting started on a task that requires a lot of thought?",
    descSr: "Koliko često izbegavate ili odlažete početak zadatka koji zahteva mnogo razmišljanja?",
    options: [
      { labelEn: "Never (Clean baseline)", labelSr: "Nikada (Čista baza)", focus: 10, stimulation: 2, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 4, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 6, stimulation: 6, restfulness: 6 },
      { labelEn: "Often", labelSr: "Često", focus: 4, stimulation: 8, restfulness: 4 },
      { labelEn: "Very Often (Dopamine starved)", labelSr: "Veoma često (Nedostatak dopamina)", focus: 2, stimulation: 10, restfulness: 2 },
    ]
  },
  {
    id: "q2",
    textEn: "Finishing final details",
    textSr: "Završavanje poslednjih detalja",
    descEn: "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
    descSr: "Koliko često imate problema sa završavanjem poslednjih detalja projekta, nakon što su najteži delovi odrađeni?",
    options: [
      { labelEn: "Never", labelSr: "Nikada", focus: 10, stimulation: 2, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 4, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 6, stimulation: 6, restfulness: 6 },
      { labelEn: "Often", labelSr: "Često", focus: 4, stimulation: 8, restfulness: 4 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 2, stimulation: 10, restfulness: 2 },
    ]
  },
  {
    id: "q3",
    textEn: "Organization & Order",
    textSr: "Organizacija i red",
    descEn: "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
    descSr: "Koliko često imate poteškoća da dovedete stvari u red kada treba da uradite zadatak koji zahteva organizaciju?",
    options: [
      { labelEn: "Never", labelSr: "Nikada", focus: 10, stimulation: 2, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 4, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 6, stimulation: 6, restfulness: 6 },
      { labelEn: "Often", labelSr: "Često", focus: 4, stimulation: 8, restfulness: 4 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 2, stimulation: 10, restfulness: 2 },
    ]
  },
  {
    id: "q4",
    textEn: "Memory & Obligations",
    textSr: "Pamćenje i obaveze",
    descEn: "How often do you have problems remembering appointments or obligations?",
    descSr: "Koliko često imate problema da se setite dogovora ili obaveza?",
    options: [
      { labelEn: "Never", labelSr: "Nikada", focus: 10, stimulation: 2, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 4, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 6, stimulation: 6, restfulness: 6 },
      { labelEn: "Often", labelSr: "Često", focus: 4, stimulation: 8, restfulness: 4 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 2, stimulation: 10, restfulness: 2 },
    ]
  },
  {
    id: "q5",
    textEn: "Restlessness & Hyperactivity",
    textSr: "Nemir i hiperaktivnost",
    descEn: "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
    descSr: "Koliko često se meškoljite ili tresete nogom/rukom kada morate dugo da sedite?",
    options: [
      { labelEn: "Never", labelSr: "Nikada", focus: 10, stimulation: 2, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 4, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 6, stimulation: 6, restfulness: 6 },
      { labelEn: "Often", labelSr: "Često", focus: 4, stimulation: 8, restfulness: 4 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 2, stimulation: 10, restfulness: 2 },
    ]
  },
  {
    id: "q6",
    textEn: "Motor-Driven Impulsivity",
    textSr: "Motorna impulsivnost",
    descEn: "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
    descSr: "Koliko često se osećate prekomerno aktivno, kao da vas pokreće neki unutrašnji motor?",
    options: [
      { labelEn: "Never", labelSr: "Nikada", focus: 10, stimulation: 2, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 4, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 6, stimulation: 6, restfulness: 6 },
      { labelEn: "Often", labelSr: "Često", focus: 4, stimulation: 8, restfulness: 4 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 2, stimulation: 10, restfulness: 2 },
    ]
  }
];`;

let newContent = content.replace(/const ALL_AUDIT_POOL = \[\s*\{[\s\S]*?\}\s*\];\s*/m, replacement + "\n\n");
newContent = newContent.replace(/ALL_AUDIT_POOL/g, "ASRS_QUESTIONS");
newContent = newContent.replace(/const shuffled = \[\.\.\.ASRS_QUESTIONS\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\);\s*return shuffled\.slice\(0, 7\);/g, "return [...ASRS_QUESTIONS];");
newContent = newContent.replace(/const shuffled = \[\.\.\.ASRS_QUESTIONS\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\);\s*setActiveQuestions\(shuffled\.slice\(0, 7\)\);/g, "setActiveQuestions([...ASRS_QUESTIONS]);");

fs.writeFileSync('src/components/DopamineTracker.tsx', newContent);
