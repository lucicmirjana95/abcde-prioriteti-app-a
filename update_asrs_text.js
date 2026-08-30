import fs from 'fs';

let content = fs.readFileSync('src/components/DopamineTracker.tsx', 'utf8');

// Replace question text
content = content.replace(
  `{isEn
                                  ? activeQuestion.textEn
                                  : activeQuestion.textSr}`,
  `{isEn ? activeQuestion.textEn : language === "tr" ? activeQuestion.textTr : activeQuestion.textSr}`
);

// Replace question desc
content = content.replace(
  `{isEn
                                  ? activeQuestion.descEn
                                  : activeQuestion.descSr}`,
  `{isEn ? activeQuestion.descEn : language === "tr" ? activeQuestion.descTr : activeQuestion.descSr}`
);

fs.writeFileSync('src/components/DopamineTracker.tsx', content);
