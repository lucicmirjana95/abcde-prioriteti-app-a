const fs = require('fs');
let code = fs.readFileSync('src/components/DogCompanion.tsx', 'utf-8');

// Inside useEffect for synchronization, we can add a listener for companion-add-xp.
// The easiest is just replacing the end of the sync useEffect.
const xpBlockOld = `
    const handleSync = () => {
      const savedXp = Number(localStorage.getItem("bobi_xp") || "0");
      if (savedXp !== xp) {
        setXp(savedXp);
      }
`;

// It's probably easier to just find the entire effect or put it in a new one. Let's add a new useEffect.
code = code.replace(
  /const addExperience = \(amount: number\) => \{/,
  `useEffect(() => {
    const handleAddXp = (e: any) => {
      if (e.detail && typeof e.detail.amount === 'number') {
        addExperience(e.detail.amount);
        triggerSound();
      }
    };
    window.addEventListener("companion-add-xp", handleAddXp);
    
    // Daily login bonus logic
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = localStorage.getItem("bobi_last_login_date");
    if (lastLogin !== today) {
      localStorage.setItem("bobi_last_login_date", today);
      setTimeout(() => {
        addExperience(30);
        window.dispatchEvent(
            new CustomEvent("trigger-toast", {
              detail: {
                title: language === "en" ? "Daily Companion Bonus!" : "Dnevni bonus za ljubimca!",
                message: language === "en" ? "Here's 30 XP for checking in today." : "Evo 30 XP poena za današnju aktivaciju.",
                type: "success",
              },
            }),
          );
      }, 2000);
    }
    
    return () => {
      window.removeEventListener("companion-add-xp", handleAddXp);
    };
  }, [level]);\n\n  const addExperience = (amount: number) => {`
);

fs.writeFileSync('src/components/DogCompanion.tsx', code);
console.log("Added XP listeners and daily login.");
