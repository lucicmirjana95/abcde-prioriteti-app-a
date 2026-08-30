const fs = require('fs');
let code = fs.readFileSync('src/components/DopamineTracker.tsx', 'utf-8');

const newQuestions = `const ASRS_QUESTIONS = [
  {
    id: "asrs1",
    textEn: "Task Completion & Follow-through",
    textSr: "Završavanje zadataka (Follow-through)",
    descEn: "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
    descSr: "Koliko često imate problema da privedete projekat kraju i rešite poslednje detalje, nakon što su najteži delovi već završeni?",
    options: [
      { labelEn: "Never", labelSr: "Nikad", focus: 10, stimulation: 0, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 2, restfulness: 5 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Often", labelSr: "Često", focus: 3, stimulation: 8, restfulness: 5 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 0, stimulation: 10, restfulness: 5 },
    ],
  },
  {
    id: "asrs2",
    textEn: "Organization & Sequencing",
    textSr: "Organizacija i redosled prioriteta",
    descEn: "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
    descSr: "Koliko često imate poteškoća da organizujete stvari kada morate da radite posao koji zahteva sistemski pristup?",
    options: [
      { labelEn: "Never", labelSr: "Nikad", focus: 10, stimulation: 0, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 2, restfulness: 5 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Often", labelSr: "Često", focus: 3, stimulation: 8, restfulness: 5 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 0, stimulation: 10, restfulness: 5 },
    ],
  },
  {
    id: "asrs3",
    textEn: "Recall & Obligations",
    textSr: "Pamćenje i svakodnevne obaveze",
    descEn: "How often do you have problems remembering appointments or obligations?",
    descSr: "Koliko često imate problema da se setite dogovora ili obaveza koje ste preuzeli?",
    options: [
      { labelEn: "Never", labelSr: "Nikad", focus: 10, stimulation: 0, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 2, restfulness: 5 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Often", labelSr: "Često", focus: 3, stimulation: 8, restfulness: 5 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 0, stimulation: 10, restfulness: 5 },
    ],
  },
  {
    id: "asrs4",
    textEn: "Task Avoidance & Execution",
    textSr: "Izbegavanje zahtevnih zadataka",
    descEn: "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
    descSr: "Kada imate zadatak koji zahteva mnogo razmišljanja, koliko često izbegavate ili odlažete početak rada?",
    options: [
      { labelEn: "Never", labelSr: "Nikad", focus: 10, stimulation: 0, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 2, restfulness: 5 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Often", labelSr: "Često", focus: 3, stimulation: 8, restfulness: 5 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 0, stimulation: 10, restfulness: 5 },
    ],
  },
  {
    id: "asrs5",
    textEn: "Motor Restlessness (Fidgeting)",
    textSr: "Fizički i motorni nemir (Fidgeting)",
    descEn: "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
    descSr: "Koliko često se meškoljite ili nemirno pomerate ruke i noge kada morate dugo da sedite na istom mestu?",
    options: [
      { labelEn: "Never", labelSr: "Nikad", focus: 10, stimulation: 0, restfulness: 10 },
      { labelEn: "Rarely", labelSr: "Retko", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "Sometimes", labelSr: "Ponekad", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Often", labelSr: "Često", focus: 3, stimulation: 8, restfulness: 3 },
      { labelEn: "Very Often", labelSr: "Veoma često", focus: 0, stimulation: 10, restfulness: 0 },
    ],
  }
];`;

code = code.replace(/const ASRS_QUESTIONS = \[[\s\S]*?\];\n\nexport default function DopamineTracker/m, newQuestions + '\n\nexport default function DopamineTracker');
fs.writeFileSync('src/components/DopamineTracker.tsx', code, 'utf-8');
console.log('Done!');
