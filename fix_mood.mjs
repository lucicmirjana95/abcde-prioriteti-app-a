import fs from 'fs';

let content = fs.readFileSync('src/components/MorningAIHub.tsx', 'utf8');

const hookStr = `
  useEffect(() => {
    if (moodConfirmed) {
      const today = new Date().toISOString().split("T")[0];
      const lastCoinDate = safeStorage.getItem("lumi_last_mood_coins_date");
      if (lastCoinDate !== today) {
        const currentCoins = Number(safeStorage.getItem("lumi_coins") || "120");
        safeStorage.setItem("lumi_coins", String(currentCoins + 10));
        safeStorage.setItem("lumi_last_mood_coins_date", today);
        window.dispatchEvent(new Event("companion-sync"));
        window.dispatchEvent(new Event("storage"));
      }
    }
  }, [moodConfirmed]);
`;

content = content.replace(
  /const \[moodConfirmed, setMoodConfirmed\] = useState<boolean>\(false\);/,
  `const [moodConfirmed, setMoodConfirmed] = useState<boolean>(false);\n${hookStr}`
);

fs.writeFileSync('src/components/MorningAIHub.tsx', content);
console.log("Hook added");
