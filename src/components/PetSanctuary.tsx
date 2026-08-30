import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Coins,
  Heart,
  Zap,
  Hand,
  ShowerHead,
  Gamepad2,
  CheckCircle,
  ShoppingBag,
  Activity,
  Moon
} from "lucide-react";
import { Task } from "../types";
import { safeStorage } from "../lib/safeStorageSetup";
import CompanionVisual from "./CompanionGraphic";

const SHOP_ITEMS = [
  {
    id: "treat",
    rxp: 40,
    rh: 30,
    cost: 45,
    icon: "🍇",
    nameEn: "Aether Treats",
    nameSr: "Eterski zalogaj",
    nameTr: "Aether İkramları"
  },
  {
    id: "toy",
    rxp: 80,
    rh: 10,
    cost: 85,
    icon: "🧩",
    nameEn: "Brain Puzzle",
    nameSr: "Slagalica uma",
    nameTr: "Zihin Yapbozu"
  },
  {
    id: "spa",
    rxp: 20,
    rh: 100,
    cost: 150,
    icon: "🫧",
    nameEn: "Lulu Spa",
    nameSr: "Lumi Banjski tretman",
    nameTr: "Lumi Spa Bakımı"
  }
];

interface PetSanctuaryProps {
  language: "sr" | "en" | "tr";
  isEvening?: boolean;
  tasks?: Task[];
  onToggleTask?: (id: string) => void;
}

export default function PetSanctuary({
  language,
  isEvening = false,
  tasks = [],
  onToggleTask
}: PetSanctuaryProps) {
  const isEn = language === "en";

  const t = (en: string, sr: string, tr: string) => {
    if (language === "en") return en;
    if (language === "tr") return tr;
    return sr;
  };

  const [coins, setCoins] = useState(120);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [satiety, setSatiety] = useState(80);
  const [happiness, setHappiness] = useState(75);
  const [energy, setEnergy] = useState(90);
  const [hygiene, setHygiene] = useState(85);
  const [bubbleText, setBubbleText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLumiSleeping, setIsLumiSleeping] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      setCoins(Number(safeStorage.getItem("bobi_coins") || "120"));
      setLevel(Number(safeStorage.getItem("bobi_level") || "1"));
      setXp(Number(safeStorage.getItem("bobi_xp") || "0"));
      setSatiety(Number(safeStorage.getItem("bobi_satiety") || "80"));
      setHappiness(Number(safeStorage.getItem("bobi_happiness") || "75"));
      setEnergy(Number(safeStorage.getItem("bobi_energy") || "90"));
      setHygiene(Number(safeStorage.getItem("bobi_hygiene") || "85"));
    };
    handleSync();
    window.addEventListener("companion-sync", handleSync);
    return () => window.removeEventListener("companion-sync", handleSync);
  }, []);

  const saveAndSync = (updatedValues: Record<string, any>) => {
    Object.entries(updatedValues).forEach(([key, value]) => {
      safeStorage.setItem(key, String(value));
    });
    window.dispatchEvent(new Event("companion-sync"));
  };

  const showBubble = (text: string) => {
    setBubbleText(text);
    setTimeout(() => setBubbleText(""), 3500);
  };

  const addXP = (amount: number, nextCoins = coins) => {
    const nextXp = xp + amount;
    const requiredXp = level * 80;
    if (nextXp >= requiredXp) {
      const nextLevel = level + 1;
      const leftoverXp = nextXp - requiredXp;
      setLevel(nextLevel);
      setXp(leftoverXp);
      saveAndSync({
        bobi_coins: nextCoins,
        bobi_level: nextLevel,
        bobi_xp: leftoverXp
      });
      showBubble(
        t(
          `🎉 LEVEL UP! Lumi is now Lv. ${nextLevel}! ✨`,
          `🎉 NOVI NIVO! Lumi je sada nivo ${nextLevel}! ✨`,
          `🎉 SEVİYE YÜKSELT! Lumi artık Lv. ${nextLevel}! ✨`
        )
      );
    } else {
      setXp(nextXp);
      saveAndSync({
        bobi_coins: nextCoins,
        bobi_xp: nextXp
      });
    }
  };

  const handleFeed = () => {
    if (coins < 15) {
      showBubble(
        t(
          "Not enough coins! Spend focus on tasks.",
          "Nemaš dovoljno novčića! Uradi zadatke.",
          "Yeterli para yok! Görevlere odaklanın."
        )
      );
      return;
    }
    const nextFeed = Math.min(100, satiety + 25);
    const nextCoins = coins - 15;
    setCoins(nextCoins);
    setSatiety(nextFeed);
    saveAndSync({
      bobi_satiety: nextFeed,
      bobi_coins: nextCoins
    });
    addXP(15, nextCoins);
    showBubble(
      t(
        "Yummy! Satiety +25%, +15 XP 🌟",
        "Mmm, ukusno! Sitost +25%, +15 XP 🌟",
        "Lezzetli! Doyma +%25, +15 XP 🌟"
      )
    );
  };

  const handlePet = () => {
    const nextHap = Math.min(100, happiness + 15);
    setHappiness(nextHap);
    saveAndSync({ bobi_happiness: nextHap });
    addXP(5);
    showBubble(
      t(
        "Purr... happiness +15%! Lumi loves you! 💞",
        "Maza... Sreća +15%! Lumi te obožava! 💞",
        "Mırıltı... mutluluk +%15! Lumi seni seviyor! 💞"
      )
    );
  };

  const handleBath = () => {
    if (coins < 10) {
      showBubble(
        t(
          "Need 10 coins for organic soap!",
          "Treba ti 10 novčića za sapun!",
          "Organik sabun için 10 jetona ihtiyacınız var!"
        )
      );
      return;
    }
    const nextHyg = Math.min(100, hygiene + 30);
    const nextCoins = coins - 10;
    setCoins(nextCoins);
    setHygiene(nextHyg);
    saveAndSync({
      bobi_hygiene: nextHyg,
      bobi_coins: nextCoins
    });
    addXP(10, nextCoins);
    showBubble(
      t(
        "Splish splash! Cleanliness +30%! 🫧",
        "Trandža, kupačica! Čistoća +30%! 🫧",
        "Splash sıçrama! Temizlik +%30! 🫧"
      )
    );
  };

  const handleSleep = () => {
    if (energy >= 95) {
      showBubble(
        t(
          "Lumi is fully awake and energetic!",
          "Lumi je već skroz odmorna i spremna za igru!",
          "Lumi tamamen uyanık ve enerjik!"
        )
      );
      return;
    }
    setIsLumiSleeping(true);
    const nextEnergy = Math.min(100, energy + 40);
    setEnergy(nextEnergy);
    saveAndSync({ bobi_energy: nextEnergy });
    showBubble(
      t(
        "Zzz... Lumi is sleeping. Energy +40%! 💤",
        "Pst... Lumi spava slatkim snom. Energija +40%! 💤",
        "Zzz... Lumi uyuyor. Enerji +%40! 💤"
      )
    );
    setTimeout(() => {
      setIsLumiSleeping(false);
    }, 4000);
  };

  const handlePlayGame = () => {
    if (energy < 25) {
      showBubble(
        t(
          "Too tired to play! Put Lumi to bed.",
          "Previše umorna za igru! Uspavaj Lumi.",
          "Oynamak için çok yorgunum! Lumi'yi yatağına yatır."
        )
      );
      return;
    }
    if (coins < 12) {
      showBubble(
        t(
          "Needs 12 coins for toys!",
          "Potrebno je 12 novčića za igračku.",
          "Oyuncaklar için 12 jeton gerekiyor!"
        )
      );
      return;
    }
    const nextEnergy = Math.max(10, energy - 20);
    const nextCoins = coins - 12;
    const nextHap = Math.min(100, happiness + 30);
    setEnergy(nextEnergy);
    setCoins(nextCoins);
    setHappiness(nextHap);
    saveAndSync({
      bobi_energy: nextEnergy,
      bobi_coins: nextCoins,
      bobi_happiness: nextHap
    });
    addXP(35, nextCoins);
    showBubble(
      t(
        "Wheee! Had so much fun! +35 XP, Energy -20% 🎮",
        "Jupiii! Super zabavno! +35 XP, Energija -20% 🎮",
        "Wheee! Çok eğlendim! +35 XP, Enerji -%20 🎮"
      )
    );
  };

  const triggerToggleTaskWithReward = (id: string) => {
    if (!onToggleTask) return;
    onToggleTask(id);
    const bonus = 25;
    const nextCoins = coins + bonus;
    setCoins(nextCoins);
    saveAndSync({ bobi_coins: nextCoins });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    showBubble(
      t(
        `Task completed! +${bonus} Coins 🪙`,
        `Zadatak rešen! +${bonus} Novčića 🪙`,
        `Görev tamamlandı! +${bonus} Para 🪙`
      )
    );
  };

  const handleBuyItem = (cost: number, rewardXp: number, rewardHap: number) => {
    if (coins < cost) {
      showBubble(
        t(
          "Need more coins!",
          "Nemaš dovoljno novčića!",
          "Daha fazla paraya ihtiyacınız var!"
        )
      );
      return;
    }
    const nextCoins = coins - cost;
    setCoins(nextCoins);
    setHappiness(Math.min(100, happiness + rewardHap));
    saveAndSync({
      bobi_coins: nextCoins,
      bobi_happiness: Math.min(100, happiness + rewardHap)
    });
    addXP(rewardXp, nextCoins);
    showBubble(
      t(
        `Wow, amazing! +${rewardXp} XP 🌟`,
        `Vau, sjajno! +${rewardXp} XP 🌟`,
        `Vay, muhteşem! +${rewardXp} XP 🌟`
      )
    );
  };

  const pendingTasks = tasks.filter((t) => !t.done);
  const xpPercentage = Math.min(100, (xp / (level * 80)) * 100);
  const activeMood = isLumiSleeping
    ? "sleeping"
    : happiness > 80
    ? "happy"
    : happiness < 40
    ? "sad"
    : "neutral";

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pt-2 pb-24 font-sans px-4 sm:px-0 text-left">
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <motion.div
          whileHover={{ y: -1 }}
          className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs border border-black/5 dark:border-white/5 transition-all"
        >
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#9575CD] mb-1" strokeWidth={2.5} />
          <p className="text-[10px] sm:text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
            {t("Level", "Nivo", "Seviye")}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-black dark:text-white leading-none mt-1 tracking-tight">
            {level}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -1 }}
          className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs border border-black/5 dark:border-white/5 relative overflow-hidden transition-all"
        >
          {showConfetti && (
            <div className="absolute inset-0 bg-[#FF9500]/10 animate-pulse pointer-events-none" />
          )}
          <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF9500] mb-1" strokeWidth={2.5} />
          <p className="text-[10px] sm:text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
            {t("Coins", "Novčići", "Paralar")}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-black dark:text-white leading-none mt-1 tracking-tight">
            {coins}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -1 }}
          className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs border border-black/5 dark:border-white/5 transition-all"
        >
          <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF2D55] mb-1" strokeWidth={2.5} />
          <p className="text-[10px] sm:text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
            {t("Happiness", "Sreća", "Mutluluk")}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-black dark:text-white leading-none mt-1 tracking-tight">
            {happiness}%
          </p>
        </motion.div>
      </div>

      <div className="relative w-full rounded-[2.5rem] overflow-hidden border border-[#00000010] dark:border-white/10 bg-[#F5F5F7] dark:bg-[#121214] shadow-inner flex flex-col items-center pt-14 pb-12 px-4 transition-colors">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-[#9575CD]/10 to-[#CE93D8]/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/60 dark:bg-[#2C2C2E]/60 backdrop-blur-2xl px-5 py-2 rounded-full shadow-sm flex items-center gap-2 border border-[#00000010] dark:border-white/10 z-20">
          <span className="font-bold text-sm text-[#1C1C1E] dark:text-[#EBEBF5]/90 tracking-tight">
            Lumi
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(52,199,89,0.8)] ${
              isLumiSleeping ? "bg-amber-400" : "bg-[#34C759]"
            }`}
          />
        </div>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0000000A] dark:bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-[#9575CD] to-[#CE93D8]"
            initial={{ width: 0 }}
            animate={{ width: `${xpPercentage}%` }}
            transition={{ type: "spring", bounce: 0.2 }}
          />
        </div>
        <div className="relative z-10 mt-12 mb-6">
          <AnimatePresence mode="wait">
            {bubbleText && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 px-6 py-3 bg-white dark:bg-[#3A3A3C] backdrop-blur-xl rounded-[1.25rem] text-[13px] font-bold text-[#1C1C1E] dark:text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#0000000A] dark:border-white/10 whitespace-nowrap z-30 tracking-tight"
              >
                {bubbleText}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#3A3A3C] rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handlePet}
            className="w-64 h-64 sm:w-80 sm:h-80 cursor-pointer relative z-20 flex items-center justify-center pt-8"
          >
            <div className="drop-shadow-[0_20px_35px_rgba(149,117,205,0.15)] dark:drop-shadow-[0_20px_40px_rgba(149,117,205,0.3)] transition-all">
              <CompanionVisual level={level} mood={activeMood} size={200} />
            </div>
            {happiness >= 90 && (
              <div className="absolute -inset-6 animate-pulse pointer-events-none opacity-80 flex items-start justify-between z-0">
                <Heart className="w-8 h-8 text-[#FF2D55] fill-[#FF2D55] absolute -top-4 left-4" />
                <Heart className="w-6 h-6 text-[#FF2D55] fill-[#FF2D55] absolute top-16 -right-6" />
              </div>
            )}
            {isLumiSleeping && (
              <div className="absolute top-1/3 right-1/4 select-none pointer-events-none font-bold text-lg text-indigo-400 flex flex-col gap-1 z-50">
                <span className="animate-bounce [animation-delay:0.1s]">Z z</span>
                <span className="animate-bounce [animation-delay:0.3s] ml-2">z</span>
              </div>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-2xl mt-4 z-20 relative px-6">
          <button
            onClick={handleFeed}
            className="flex flex-col items-center justify-center py-3.5 bg-white/95 dark:bg-[#2C2C2E]/95 border border-black/5 dark:border-white/5 rounded-2xl shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all text-[#9575CD] group cursor-pointer"
          >
            <Zap className="w-5 h-5 mb-1 text-[#9575CD] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">{t("Feed", "Nahrani", "Besle")}</span>
            <span className="text-[10px] font-extrabold text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-0.5">
              -15 {t("Coins", "Novčića", "Para")}
            </span>
          </button>

          <button
            onClick={handlePet}
            className="flex flex-col items-center justify-center py-3.5 bg-white/95 dark:bg-[#2C2C2E]/95 border border-black/5 dark:border-white/5 rounded-2xl shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all text-[#CE93D8] group cursor-pointer"
          >
            <Hand className="w-5 h-5 mb-1 text-[#CE93D8] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">{t("Pet", "Pomazi", "Sev")}</span>
            <span className="text-[10px] font-extrabold text-[#CE93D8]/80 mt-0.5">
              {t("Free", "Besplatno", "Ücretsiz")}
            </span>
          </button>

          <button
            onClick={handleBath}
            className="flex flex-col items-center justify-center py-3.5 bg-white/95 dark:bg-[#2C2C2E]/95 border border-black/5 dark:border-white/5 rounded-2xl shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all text-[#007AFF] group cursor-pointer"
          >
            <ShowerHead className="w-5 h-5 mb-1 text-[#007AFF] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">{t("Bath", "Okupaj", "Yıka")}</span>
            <span className="text-[10px] font-extrabold text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-0.5">
              -10 {t("Coins", "Novčića", "Para")}
            </span>
          </button>

          <button
            onClick={handleSleep}
            className="flex flex-col items-center justify-center py-3.5 bg-white/95 dark:bg-[#2C2C2E]/95 border border-black/5 dark:border-white/5 rounded-2xl shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all text-[#FF9500] group cursor-pointer"
          >
            <Moon className="w-5 h-5 mb-1 text-[#FF9500] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">{t("Sleep", "Uspavaj", "Uyut")}</span>
            <span className="text-[10px] font-extrabold text-[#FF9500]/80 mt-0.5">
              {t("Free", "Besplatno", "Ücretsiz")}
            </span>
          </button>

          <button
            onClick={handlePlayGame}
            className="col-span-2 md:col-span-1 flex flex-col items-center justify-center py-3.5 bg-white/95 dark:bg-[#2C2C2E]/95 border border-black/5 dark:border-white/5 rounded-2xl shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all text-[#34C759] group cursor-pointer"
          >
            <Gamepad2 className="w-5 h-5 mb-1 text-[#34C759] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">{t("Play", "Igraj se", "Oyna")}</span>
            <span className="text-[10px] font-extrabold text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-0.5">
              -12 {t("Coins", "Novčića", "Para")}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start mt-2">
        <div className="lg:col-span-1 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[2rem] p-6 shadow-sm min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-[#1C1C1E] dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#34C759]" />
              {t("Daily Tasks", "Zadaci za nagradu", "Günlük Görevler")}
            </h3>
            <span className="text-[#FF9500] bg-[#FF9500]/10 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase">
              REWARDS
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[220px] scrollbar-none">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-[#8E8E93] text-xs font-semibold">
                🎉{" "}
                {t(
                  "All tasks resolved! Masterful focus!",
                  "Svi zadaci rešeni! Genijalan rad!",
                  "Tüm görevler çözüldü! Ustaca odaklanma!"
                )}
              </div>
            ) : (
              pendingTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => triggerToggleTaskWithReward(task.id)}
                  className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer border border-transparent hover:border-black/5 dark:border-white/5"
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="font-bold text-xs sm:text-[13px] text-gray-800 dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-[10px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-0.5">
                      {task.category === "A" ? "🔥 VIP A" : "🌱 Base"} • {task.timeRequired || 25}min
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1C1C1E] shadow-xs flex items-center justify-center text-xs shrink-0 font-bold text-[#FF9500]">
                    +25
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[2rem] p-6 shadow-sm min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-[#1C1C1E] dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#FF9500]" />
              {t("Eter-Market", "Eterska Prodavnica", "Eter-Market")}
            </h3>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {SHOP_ITEMS.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-[#F2F2F7] dark:bg-[#000000]/20 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h5 className="font-bold text-xs sm:text-[13px] text-gray-800 dark:text-white leading-tight">
                      {t(item.nameEn, item.nameSr, item.nameTr)}
                    </h5>
                    <p className="text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-bold mt-0.5">
                      +{item.rxp}XP • +{item.rh}% {t("Joy", "Sreća", "Neşe")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleBuyItem(item.cost, item.rxp, item.rh)}
                  className="py-1.5 px-3 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-xl text-xs font-bold text-[#FF9500] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  {item.cost} 🪙
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[2rem] p-6 shadow-sm min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-[#1C1C1E] dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#9575CD]" />
              {t("Lumi's Biological Index", "Lumi Biološki Indeks", "Lumi'nin Biyolojik İndeksi")}
            </h3>
          </div>
          <div className="flex-1 space-y-3.5 pb-2">
            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#8E8E93] uppercase mb-1">
                <span>🍖 {t("Satiety", "Sitost", "Tokluk")}</span>
                <span className={satiety < 30 ? "text-[#FF3B30]" : "text-[#8E8E93] dark:text-white"}>
                  {satiety}%
                </span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[#9575CD]" style={{ width: `${satiety}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#8E8E93] uppercase mb-1">
                <span>❤️ {t("Happiness", "Sreća", "Mutluluk")}</span>
                <span className={happiness < 30 ? "text-[#FF3B30]" : "text-[#8E8E93] dark:text-white"}>
                  {happiness}%
                </span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[#CE93D8]" style={{ width: `${happiness}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#8E8E93] uppercase mb-1">
                <span>⚡ {t("Energy", "Energija", "Enerji")}</span>
                <span className={energy < 30 ? "text-[#FF3B30]" : "text-[#8E8E93] dark:text-white"}>
                  {energy}%
                </span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[#FF9500]" style={{ width: `${energy}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#8E8E93] uppercase mb-1">
                <span>🚿 {t("Hygiene", "Higijena", "Hijyen")}</span>
                <span className={hygiene < 30 ? "text-[#FF3B30]" : "text-[#8E8E93] dark:text-white"}>
                  {hygiene}%
                </span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[#007AFF]" style={{ width: `${hygiene}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
