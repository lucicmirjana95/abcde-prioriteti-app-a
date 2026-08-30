import fs from 'fs';

const a = `const ASRS_QUESTIONS = [
  {
    id: "asrs1",
    textEn: "Task Completion & Follow-through",
    textSr: "Završavanje zadataka (Follow-through)",
    textTr: "Görev Tamamlama ve Takip",
    descEn:
      "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
    descSr:
      "Koliko često imate problema da privedete projekat kraju i rešite poslednje detalje, nakon što su najteži delovi već završeni?",
    descTr:
      "Zor kısımları tamamlandıktan sonra, bir projenin son detaylarını toparlamakta ne sıklıkla sorun yaşıyorsunuz?",
    options: [
      {
        labelEn: "Never",
        labelSr: "Nikad",
        labelTr: "Hiçbir zaman",
        focus: 10,
        stimulation: 0,
        restfulness: 5,
      },
      {
        labelEn: "Rarely",
        labelSr: "Retko",
        labelTr: "Nadiren",
        focus: 8,
        stimulation: 2,
        restfulness: 5,
      },
      {
        labelEn: "Sometimes",
        labelSr: "Ponekad",
        labelTr: "Bazen",
        focus: 5,
        stimulation: 5,
        restfulness: 5,
      },
      {
        labelEn: "Often",
        labelSr: "Često",
        labelTr: "Sıklıkla",
        focus: 3,
        stimulation: 8,
        restfulness: 5,
      },
      {
        labelEn: "Very Often",
        labelSr: "Veoma često",
        labelTr: "Çok Sıklıkla",
        focus: 0,
        stimulation: 10,
        restfulness: 5,
      },
    ],
  },
  {
    id: "asrs2",
    textEn: "Organization & Sequencing",
    textSr: "Organizacija i redosled prioriteta",
    textTr: "Organizasyon ve Sıralama",
    descEn:
      "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
    descSr:
      "Koliko često imate poteškoća da organizujete stvari kada morate da radite posao koji zahteva sistemski pristup?",
    descTr: "Organizasyon gerektiren bir görev yapmanız gerektiğinde, işleri yoluna koymakta ne sıklıkla zorluk yaşıyorsunuz?",
    options: [
      {
        labelEn: "Never",
        labelSr: "Nikad",
        labelTr: "Hiçbir zaman",
        focus: 10,
        stimulation: 0,
        restfulness: 5,
      },
      {
        labelEn: "Rarely",
        labelSr: "Retko",
        labelTr: "Nadiren",
        focus: 8,
        stimulation: 2,
        restfulness: 5,
      },
      {
        labelEn: "Sometimes",
        labelSr: "Ponekad",
        labelTr: "Bazen",
        focus: 5,
        stimulation: 5,
        restfulness: 5,
      },
      {
        labelEn: "Often",
        labelSr: "Često",
        labelTr: "Sıklıkla",
        focus: 3,
        stimulation: 8,
        restfulness: 5,
      },
      {
        labelEn: "Very Often",
        labelSr: "Veoma često",
        labelTr: "Çok Sıklıkla",
        focus: 0,
        stimulation: 10,
        restfulness: 5,
      },
    ],
  },
  {
    id: "asrs3",
    textEn: "Recall & Obligations",
    textSr: "Pamćenje i svakodnevne obaveze",
    textTr: "Hatırlama ve Yükümlülükler",
    descEn:
      "How often do you have problems remembering appointments or obligations?",
    descSr:
      "Koliko često imate problema da se setite dogovora ili obaveza koje ste preuzeli?",
    descTr: "Randevuları veya yükümlülükleri hatırlamakta ne sıklıkla sorun yaşıyorsunuz?",
    options: [
      {
        labelEn: "Never",
        labelSr: "Nikad",
        labelTr: "Hiçbir zaman",
        focus: 10,
        stimulation: 0,
        restfulness: 5,
      },
      {
        labelEn: "Rarely",
        labelSr: "Retko",
        labelTr: "Nadiren",
        focus: 8,
        stimulation: 2,
        restfulness: 5,
      },
      {
        labelEn: "Sometimes",
        labelSr: "Ponekad",
        labelTr: "Bazen",
        focus: 5,
        stimulation: 5,
        restfulness: 5,
      },
      {
        labelEn: "Often",
        labelSr: "Često",
        labelTr: "Sıklıkla",
        focus: 3,
        stimulation: 8,
        restfulness: 5,
      },
      {
        labelEn: "Very Often",
        labelSr: "Veoma često",
        labelTr: "Çok Sıklıkla",
        focus: 0,
        stimulation: 10,
        restfulness: 5,
      },
    ],
  },
  {
    id: "asrs4",
    textEn: "Task Avoidance & Execution",
    textSr: "Izbegavanje zahtevnih zadataka",
    textTr: "Görevden Kaçınma ve Uygulama",
    descEn:
      "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
    descSr:
      "Kada imate zadatak koji zahteva mnogo razmišljanja, koliko često izbegavate ili odlažete početak rada?",
    descTr: "Çok fazla düşünmeyi gerektiren bir göreviniz olduğunda, başlamaktan ne sıklıkla kaçınır veya ertelersiniz?",
    options: [
      {
        labelEn: "Never",
        labelSr: "Nikad",
        labelTr: "Hiçbir zaman",
        focus: 10,
        stimulation: 0,
        restfulness: 5,
      },
      {
        labelEn: "Rarely",
        labelSr: "Retko",
        labelTr: "Nadiren",
        focus: 8,
        stimulation: 2,
        restfulness: 5,
      },
      {
        labelEn: "Sometimes",
        labelSr: "Ponekad",
        labelTr: "Bazen",
        focus: 5,
        stimulation: 5,
        restfulness: 5,
      },
      {
        labelEn: "Often",
        labelSr: "Često",
        labelTr: "Sıklıkla",
        focus: 3,
        stimulation: 8,
        restfulness: 5,
      },
      {
        labelEn: "Very Often",
        labelSr: "Veoma često",
        labelTr: "Çok Sıklıkla",
        focus: 0,
        stimulation: 10,
        restfulness: 5,
      },
    ],
  },
  {
    id: "asrs5",
    textEn: "Motor Restlessness (Fidgeting)",
    textSr: "Fizički i motorni nemir (Fidgeting)",
    textTr: "Motor Huzursuzluk (Kıpır Kıpır Olma)",
    descEn:
      "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
    descSr:
      "Koliko često se meškoljite ili nemirno pomerate ruke i noge kada morate dugo da sedite na istom mestu?",
    descTr: "Uzun süre oturmanız gerektiğinde ellerinizi veya ayaklarınızı ne sıklıkla kıpırdatır veya hareket ettirirsiniz?",
    options: [
      {
        labelEn: "Never",
        labelSr: "Nikad",
        labelTr: "Hiçbir zaman",
        focus: 10,
        stimulation: 0,
        restfulness: 10,
      },
      {
        labelEn: "Rarely",
        labelSr: "Retko",
        labelTr: "Nadiren",
        focus: 8,
        stimulation: 2,
        restfulness: 8,
      },
      {
        labelEn: "Sometimes",
        labelSr: "Ponekad",
        labelTr: "Bazen",
        focus: 5,
        stimulation: 5,
        restfulness: 5,
      },
      {
        labelEn: "Often",
        labelSr: "Često",
        labelTr: "Sıklıkla",
        focus: 3,
        stimulation: 8,
        restfulness: 3,
      },
      {
        labelEn: "Very Often",
        labelSr: "Veoma često",
        labelTr: "Çok Sıklıkla",
        focus: 0,
        stimulation: 10,
        restfulness: 0,
      },
    ],
  },
];`;

let content = fs.readFileSync('src/components/DopamineTracker.tsx', 'utf8');
const startIndex = content.indexOf('const ASRS_QUESTIONS = [');
const endIndex = content.indexOf('];', startIndex) + 2;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + a + content.substring(endIndex);
}

// Replace in JSX usages
content = content.replace(
  '{isEn ? q.textEn : q.textSr}',
  '{isEn ? q.textEn : language === "tr" ? q.textTr : q.textSr}'
);
content = content.replace(
  '{isEn ? q.descEn : q.descSr}',
  '{isEn ? q.descEn : language === "tr" ? q.descTr : q.descSr}'
);
// In options map
content = content.replace(
  '{isEn ? opt.labelEn : opt.labelSr}',
  '{isEn ? opt.labelEn : language === "tr" ? opt.labelTr : opt.labelSr}'
);

fs.writeFileSync('src/components/DopamineTracker.tsx', content);

