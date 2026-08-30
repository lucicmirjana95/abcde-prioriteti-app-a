import React, { useState, useEffect } from "react";
import { 
  Moon, 
  CheckCircle, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  Lock, 
  X, 
  Wind, 
  Check, 
  ListTodo, 
  Coffee,
  RotateCcw,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  Activity,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NsdrPlayer from "./NsdrPlayer";
import { Task } from "../types";
import VoiceInputNode from "./VoiceInputNode";
import { renderCleanText } from "../lib/formatter";
import { safeStorage } from "../lib/safeStorageSetup";

interface EveningReflectionProps {
  language: "en" | "tr" | "sr";
  isEvening: boolean;
  isEveningExpanded: boolean;
  setIsEveningExpanded: (expanded: boolean) => void;
  setForceMorningHub: (force: boolean) => void;
  setActiveTab: (tab: any) => void;
  tasks: Task[];
  eveningWin: string;
  setEveningWin: (val: string) => void;
  eveningLoss: string;
  setEveningLoss: (val: string) => void;
  eveningAdvice: string;
  setEveningAdvice: (val: string) => void;
  isEveningProcessing: boolean;
  handleSendEveningReflection: () => Promise<void>;
  isDayLocked: boolean;
  setIsDayLocked: (locked: boolean) => void;
  handleUnlockDay: () => void;
  bedtimePrep: {
    noScreens: boolean;
    coolRoom: boolean;
    valerianOrTea: boolean;
    breath478: boolean;
  };
  handleToggleBedtime: (key: "noScreens" | "coolRoom" | "valerianOrTea" | "breath478") => void;
}

export default function EveningReflection({
  language,
  isEvening,
  isEveningExpanded,
  setIsEveningExpanded,
  setForceMorningHub,
  setActiveTab,
  tasks,
  eveningWin,
  setEveningWin,
  eveningLoss,
  setEveningLoss,
  eveningAdvice,
  setEveningAdvice,
  isEveningProcessing,
  handleSendEveningReflection,
  isDayLocked,
  setIsDayLocked,
  handleUnlockDay,
  bedtimePrep,
  handleToggleBedtime,
}: EveningReflectionProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [tomorrowGoal1, setTomorrowGoal1] = useState(() => safeStorage.getItem("kaizen_tomorrow_goal_1") || "");
  const [tomorrowGoal2, setTomorrowGoal2] = useState(() => safeStorage.getItem("kaizen_tomorrow_goal_2") || "");
  const [tomorrowGoal3, setTomorrowGoal3] = useState(() => safeStorage.getItem("kaizen_tomorrow_goal_3") || "");
  
  // Apple Health Style Mood selection (1 to 5)
  const [selectedMood, setSelectedMood] = useState<number>(() => {
    const saved = safeStorage.getItem("kaizen_evening_mood");
    return saved ? parseInt(saved, 10) : 3;
  });

  // Breathing simulation states for Apple Breathe-like visualizer
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale" | "idle">("idle");
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(0);
  const [completedBreathingCycles, setCompletedBreathingCycles] = useState(0);
  const [ritualTool, setRitualTool] = useState<"breath" | "nsdr">("breath");

  // Sync state to safeStorage
  useEffect(() => {
    safeStorage.setItem("kaizen_tomorrow_goal_1", tomorrowGoal1);
  }, [tomorrowGoal1]);
  useEffect(() => {
    safeStorage.setItem("kaizen_tomorrow_goal_2", tomorrowGoal2);
  }, [tomorrowGoal2]);
  useEffect(() => {
    safeStorage.setItem("kaizen_tomorrow_goal_3", tomorrowGoal3);
  }, [tomorrowGoal3]);
  useEffect(() => {
    safeStorage.setItem("kaizen_evening_mood", String(selectedMood));
  }, [selectedMood]);

  // Breathing interval effect
  useEffect(() => {
    if (!isBreathingActive) {
      setBreathingPhase("idle");
      return;
    }

    let interval: any = null;
    let seconds = 4;
    setBreathingPhase("inhale");
    setBreathingSecondsLeft(4);

    interval = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        // transition handled inside state functions below
      } else {
        setBreathingSecondsLeft(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathingActive]);

  // Handle phase changes with exact timing matching standard 4-7-8 ratio
  useEffect(() => {
    if (!isBreathingActive) return;

    let timer: any;
    if (breathingPhase === "inhale") {
      setBreathingSecondsLeft(4);
      timer = setTimeout(() => {
        setBreathingPhase("hold");
      }, 4000);
    } else if (breathingPhase === "hold") {
      setBreathingSecondsLeft(7);
      timer = setTimeout(() => {
        setBreathingPhase("exhale");
      }, 7000);
    } else if (breathingPhase === "exhale") {
      setBreathingSecondsLeft(8);
      timer = setTimeout(() => {
        setCompletedBreathingCycles((prev) => {
          const next = prev + 1;
          if (next >= 4) {
            setIsBreathingActive(false);
            setBreathingPhase("idle");
            if (!bedtimePrep.breath478) {
              handleToggleBedtime("breath478");
            }
            return 0;
          }
          setBreathingPhase("inhale");
          return next;
        });
      }, 8000);
    }

    // Countdown within phase
    const countdown = setInterval(() => {
      setBreathingSecondsLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdown);
    };
  }, [breathingPhase, isBreathingActive]);

  // Multi-language translation dictionary
  const t = {
    en: {
      title: "Evening Reflection",
      subtitle: "Close today with clarity, mindfulness, and scientific sleep prep.",
      closeBtn: "Collapse Chamber",
      expandHint: "DELIBERATE EVENING SHUTDOWN",
      expandDesc: "Unlock deep non-REM recovery, offload working memory, and safely archive today's achievements.",
      startBtn: "Begin Evening Review",
      unlockBtn: "Start New Day / Reset",
      step1: "Harvest",
      step2: "Offload",
      step3: "Ritual",
      step4: "Summary",
      moodLabel: "How is your state of mind tonight?",
      moods: ["Tired", "Anxious", "Neutral", "Grateful", "Inspired"],
      winLabel: "Golden Victory Today",
      winPlaceholder: "What went exceptionally well? What made you proud?",
      lossLabel: "Energy Leak / Adaptation Area",
      lossPlaceholder: "Where did you prostrate focus or drift? What did you learn?",
      tomorrowGoals: "Tomorrow's Top 3 Strategic Anchors",
      tomorrowPlaceholder: "Enter high-impact task...",
      todayWins: "Today's Golden Achievements",
      bedtimeProtocol: "Science-Backed Sleep Hygiene",
      digitalSunset: "Digital Sunset (No Screens) 📵",
      digitalSunsetDesc: "Bypasses high-energy dopamine triggers to allow natural melatonin synthesis.",
      thermalDrop: "Thermal Regulation (18°C Room) ❄️",
      thermalDropDesc: "Mimics the circadian core body temperature plunge required for deep non-REM sleep.",
      herbalTea: "Soothing Herbal Infusion 🍵",
      herbalTeaDesc: "Chamomile or lemon balm lowers heart rate and muscular tension.",
      breathing478: "Vagus Nerve Activation (4-7-8 Breath) 🌬️",
      breathing478Desc: "Triggers immediate parasympathetic dominance to stop racing thoughts.",
      breathingExercise: "Guided 4-7-8 Breathing",
      startBreathing: "Start Breathing",
      stopBreathing: "Stop Exercise",
      inhale: "Inhale through your nose...",
      hold: "Hold and preserve the breath...",
      exhale: "Exhale with a soft 'whoosh'...",
      breathCompleted: "Cycle complete! Feeling calmer.",
      morningHubBtn: "Go to Morning Hub",
      sendReflection: "Formulate Sleep Strategy & Lock Day",
      processingAdvice: "Synthesizing neurological sleep protocol...",
      advisorAdvice: "System Sleep Recommender:",
      unlockedAll: "Everything is archived! Sweet dreams.",
      lockedStatus: "Day Securely Locked & Archived ✓",
      nextBtn: "Next",
      backBtn: "Back",
      breatheCycles: "Cycles:",
      completedTasks: "Completed Today:",
      noCompleted: "No tasks completed today yet. Keep shining tomorrow!",
      reflectionQuote: "Matthew Walker, Ph.D.: 'Writing a specific to-do list for tomorrow reduces bedtime anxiety and speeds up sleep onset by 37%.'"
    },
    sr: {
      title: "Večernja Refleksija",
      subtitle: "Zatvorite dan sa mirom, svesnošću i naučno dokazanom pripremom za dubok san.",
      closeBtn: "Skupi Komoru",
      expandHint: "SVEČANA VEČERNJA REFLEKSIJA",
      expandDesc: "Otvorite komoru za oporavak, proslavite pobede, rasteretite um pred san i arhivirajte dan.",
      startBtn: "Započni Večernji Pregled",
      unlockBtn: "Započni Novi Dan / Resetuj",
      step1: "Žetva",
      step2: "Rasterećenje",
      step3: "Ritual",
      step4: "Rezime",
      moodLabel: "Kako se osećaš večeras?",
      moods: ["Umoran", "Napet", "Neutralno", "Zahvalno", "Inspirisano"],
      winLabel: "Zlatna pobeda dana",
      winPlaceholder: "Koji uspeh ili preduzeti korak te danas čini ponosnim?",
      lossLabel: "Gde je iscurela energija / Lekcija",
      lossPlaceholder: "Koje navike ili prokrastinacija su ti odvukli fokus?",
      tomorrowGoals: "Sutrašnja tri ključna sidra",
      tomorrowPlaceholder: "Unesi zadatak visokog uticaja...",
      todayWins: "Današnja Žetva i Pobede",
      bedtimeProtocol: "Naučno Dokazana Higijena Sna",
      digitalSunset: "Digitalni zalazak sunca (Bez ekrana) 📵",
      digitalSunsetDesc: "Sprečava stimulaciju dopamina i omogućava prirodno lučenje melatonina.",
      thermalDrop: "Sveža i provetrena soba (18°C) ❄️",
      thermalDropDesc: "Olakšava termoregulaciju tela, što je preduslov za duboki non-REM san.",
      herbalTea: "Umirujući biljni čaj ili Magnezijum 🍵",
      herbalTeaDesc: "Magnezijum glicinat ili kamilica smanjuju broj otkucaja srca i opuštaju mišiće.",
      breathing478: "Vagusna aktivacija (Disanje 4-7-8) 🌬️",
      breathing478Desc: "Aktivira parasimpatikus i momentalno zaustavlja rojeve misli u glavi.",
      breathingExercise: "Interaktivni 4-7-8 Vodič za Disanje",
      startBreathing: "Započni Disanje",
      stopBreathing: "Zaustavi Disanje",
      inhale: "Udiši lagano na nos...",
      hold: "Zadrži dah u miru...",
      exhale: "Ispusti vazduh sa šumom...",
      breathCompleted: "Ciklus završen! Um je opušten.",
      morningHubBtn: "Idi na Dnevnu Tablu",
      sendReflection: "Zapečati Dan i Sastavi Savet za San",
      processingAdvice: "Sistemski savetnik analizira tvoj dan...",
      advisorAdvice: "Sistemski Savetnik preporučuje za večeras:",
      unlockedAll: "Sve je bezbedno arhivirano! Lepo spavaj.",
      lockedStatus: "Dan je Svečano Zaključan i Arhiviran ✓",
      nextBtn: "Sledeće",
      backBtn: "Nazad",
      breatheCycles: "Ciklusi:",
      completedTasks: "Završeno danas:",
      noCompleted: "Nema završenih zadataka danas. Sutra je nova prilika za sjaj!",
      reflectionQuote: "Dr. Matthew Walker: 'Zapisivanje tačnih planova za sutra smanjuje anksioznost pred spavanje i ubrzava tonjenje u san za 37%.'"
    },
    tr: {
      title: "Akşam Değerlendirmesi",
      subtitle: "Günü netlik, farkındalık ve bilimsel uyku hazırlığıyla kapatın.",
      closeBtn: "Odayı Kapat",
      expandHint: "BİLİNÇLİ AKŞAM KAPANIŞI",
      expandDesc: "Derin non-REM uykusunu açın, çalışan belleğinizi boşaltın ve bugünün başarılarını güvenle arşivleyin.",
      startBtn: "Akşam Değerlendirmesini Başlat",
      unlockBtn: "Yeni Günü Başlat / Sıfırla",
      step1: "Kazanım",
      step2: "Boşaltma",
      step3: "Ritüel",
      step4: "Özet",
      moodLabel: "Bu gece zihinsel durumunuz nasıl?",
      moods: ["Yorgun", "Gergin", "Nötr", "Minnettar", "İlhamlı"],
      winLabel: "Günün Altın Zaferi",
      winPlaceholder: "Bugün ne fevkalade iyi gitti? Sizi ne gururlandırdı?",
      lossLabel: "Enerji Sızıntısı / Gelişim Alanı",
      lossPlaceholder: "Odağınızı nerede kaybettiniz? Ne öğrendiniz?",
      tomorrowGoals: "Yarının En Önemli 3 Hedefi",
      tomorrowPlaceholder: "Yüksek etkili görevi girin...",
      todayWins: "Bugünün Altın Kazanımları",
      bedtimeProtocol: "Bilimsel Destekli Uyku Hijyeni",
      digitalSunset: "Dijital Gün Batımı (Ekran Yok) 📵",
      digitalSunsetDesc: "Doğal melatonin sentezine izin vermek için yüksek enerjili dopamin tetikleyicilerini devre dışı bırakır.",
      thermalDrop: "Isı Düzenlemesi (18°C Oda) ❄️",
      thermalDropDesc: "Derin non-REM uykusu için gereken sirkadiyen çekirdek vücut ısısı düşüşünü taklit eder.",
      herbalTea: "Yatıştırıcı Bitki Çayı 🍵",
      herbalTeaDesc: "Papatya veya melisa kalp atış hızını ve kas gerginliğini düşürür.",
      breathing478: "Vagus Siniri Aktivasyonu (4-7-8 Nefesi) 🌬️",
      breathing478Desc: "Yarışan düşünceleri durdurmak için hemen parasempatik baskınlığı tetikler.",
      breathingExercise: "Kılavuzlu 4-7-8 Nefes Egzersizi",
      startBreathing: "Nefes Almayı Başlat",
      stopBreathing: "Egzersizi Durdur",
      inhale: "Burnunuzdan nefes alın...",
      hold: "Nefesi tutun ve koruyun...",
      exhale: "Yumuşak bir sesle üfleyerek nefes verin...",
      breathCompleted: "Döngü tamamlandı! Daha sakin hissediyorum.",
      morningHubBtn: "Sabah Paneline Git",
      sendReflection: "Uyku Stratejisini Oluştur ve Günü Kilitle",
      processingAdvice: "Nörolojik uyku protokolü sentezleniyor...",
      advisorAdvice: "Sistem Uyku Danışmanı Önerisi:",
      unlockedAll: "Her şey arşivlendi! Tatlı rüyalar.",
      lockedStatus: "Gün Güvenli Bir Şekilde Kilitlendi ve Arşivlendi ✓",
      nextBtn: "İleri",
      backBtn: "Geri",
      breatheCycles: "Döngüler:",
      completedTasks: "Bugün Tamamlananlar:",
      noCompleted: "Bugün henüz tamamlanan görev yok. Yarın parlamaya devam edin!",
      reflectionQuote: "Matthew Walker, Ph.D.: 'Yarın için spesifik bir yapılacaklar listesi yazmak uyku öncesi kaygıyı azaltır ve uykuya dalışı %37 hızlandırır.'"
    }
  };

  const cur = t[language] || t.en;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCompletedTasks = tasks.filter(
    (t) => t.done && t.completedTime && new Date(t.completedTime) >= todayStart
  );

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Custom iOS-style Switch Toggle Component
  const AppleToggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => {
    return (
      <button
        type="button"
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none relative flex items-center shrink-0 cursor-pointer ${
          checked ? "bg-[#34C759]" : "bg-[#E9E9EB] dark:bg-[#39393D]"
        }`}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
          className="w-5 h-5 rounded-full bg-white shadow-sm absolute left-0.5"
          animate={{ x: checked ? "20px" : "0px" }}
        />
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* COLLAPSED STATE - APPLE CARD */}
      {!isEveningExpanded ? (
        <div
          onClick={() => setIsEveningExpanded(true)}
          className="w-full max-w-2xl mx-auto rounded-[24px] p-6 bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5856D6]/10 dark:bg-[#5856D6]/20 flex items-center justify-center text-[#5856D6] dark:text-[#7D7AFF]">
                <Moon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider text-[#8E8E93] uppercase block">
                  {cur.expandHint}
                </span>
                <h3 className="text-lg font-semibold text-black dark:text-white mt-0.5">
                  {cur.title}
                </h3>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] group-hover:text-black dark:group-hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[13px] text-[#3C3C43]/70 dark:text-[#EBEBF5]/60 mt-3 leading-normal">
            {cur.expandDesc}
          </p>
        </div>
      ) : (
        /* EXPANDED MODAL CONTAINER - APPLE HIG HIGHEST POLISH - SINGLE VIEW UNIFIED DASHBOARD */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="w-full max-w-4xl mx-auto rounded-[32px] bg-[#FAFAFA] dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.06] shadow-xl overflow-hidden text-left flex flex-col"
        >
          {/* Header Bar */}
          <div className="px-6 py-5 flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#1C1C1E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5856D6]/10 dark:bg-[#5856D6]/20 flex items-center justify-center text-[#5856D6] dark:text-[#7D7AFF]">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-black dark:text-white">
                  {cur.title}
                </h2>
                <p className="text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-0.5">
                  {cur.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEveningExpanded(false)}
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Unified Content Grid */}
          <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* LEFT COLUMN: HARVEST & OFFLOAD (DIARY & PLAN) */}
              <div className="space-y-6">
                
                {/* section: reflection */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] space-y-4 shadow-xs">
                  <span className="text-[11px] font-bold tracking-wider text-[#5856D6] dark:text-[#7D7AFF] uppercase block">
                    ✨ {language === "sr" ? "Dnevna Žetva & Svesnost" : language === "tr" ? "Günlük Değerlendirme & Farkındalık" : "Daily Harvest & Mindfulness"}
                  </span>

                  {/* Mood Selector */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#3C3C43]/80 dark:text-[#EBEBF5]/80 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-[#FF2D55]" />
                      {cur.moodLabel}
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((mIdx) => {
                        const isSelected = selectedMood === mIdx;
                        const labelText = cur.moods[mIdx - 1];
                        return (
                          <button
                            key={mIdx}
                            type="button"
                            onClick={() => setSelectedMood(mIdx)}
                            className={`flex flex-col items-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#5856D6]/10 dark:bg-[#5856D6]/20 border-[#5856D6] text-[#5856D6] dark:text-[#7D7AFF] scale-102 shadow-xs font-semibold"
                                : "bg-[#F2F2F7]/40 dark:bg-[#2C2C2E]/20 border-black/[0.03] dark:border-white/[0.03] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]/60 text-[#8E8E93]"
                            }`}
                          >
                            <span className="text-lg mb-1">
                              {mIdx === 1 ? "😔" : mIdx === 2 ? "😰" : mIdx === 3 ? "😐" : mIdx === 4 ? "🙏" : "✨"}
                            </span>
                            <span className="text-[9px] font-medium tracking-tight">
                              {labelText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Golden Win Box */}
                  <div className="space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-[#3C3C43]/80 dark:text-[#EBEBF5]/80">
                        🏆 {cur.winLabel}
                      </label>
                      <VoiceInputNode
                        onTranscript={(text) => setEveningWin(eveningWin + (eveningWin ? " " : "") + text)}
                        language={language}
                        isEvening={true}
                        inline={true}
                      />
                    </div>
                    <textarea
                      value={eveningWin}
                      onChange={(e) => setEveningWin(e.target.value)}
                      placeholder={cur.winPlaceholder}
                      rows={2}
                      className="w-full p-3 text-[13px] rounded-xl border border-black/[0.05] dark:border-white/[0.05] bg-[#F2F2F7]/30 dark:bg-[#2C2C2E]/20 focus:bg-white dark:focus:bg-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#5856D6] transition-all text-black dark:text-white placeholder-[#8E8E93]/70 resize-none"
                    />
                  </div>

                  {/* Loss / Adaptation Area */}
                  <div className="space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-[#3C3C43]/80 dark:text-[#EBEBF5]/80">
                        💡 {cur.lossLabel}
                      </label>
                      <VoiceInputNode
                        onTranscript={(text) => setEveningLoss(eveningLoss + (eveningLoss ? " " : "") + text)}
                        language={language}
                        isEvening={true}
                        inline={true}
                      />
                    </div>
                    <textarea
                      value={eveningLoss}
                      onChange={(e) => setEveningLoss(e.target.value)}
                      placeholder={cur.lossPlaceholder}
                      rows={2}
                      className="w-full p-3 text-[13px] rounded-xl border border-black/[0.05] dark:border-white/[0.05] bg-[#F2F2F7]/30 dark:bg-[#2C2C2E]/20 focus:bg-white dark:focus:bg-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#5856D6] transition-all text-black dark:text-white placeholder-[#8E8E93]/70 resize-none"
                    />
                  </div>
                </div>

                {/* section: tomorrow goals & today's summary */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] space-y-4 shadow-xs">
                  <span className="text-[11px] font-bold tracking-wider text-[#34C759] uppercase block">
                    🎯 {language === "sr" ? "Rasterećenje & Plan" : language === "tr" ? "Yarının Hazırlığı & Boşaltma" : "Offload & Planning"}
                  </span>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#3C3C43]/80 dark:text-[#EBEBF5]/80 flex items-center gap-1.5">
                      <ListTodo className="w-4 h-4 text-[#5856D6]" />
                      {cur.tomorrowGoals}
                    </label>
                    <div className="space-y-2">
                      {[
                        { val: tomorrowGoal1, setVal: setTomorrowGoal1, index: 1 },
                        { val: tomorrowGoal2, setVal: setTomorrowGoal2, index: 2 },
                        { val: tomorrowGoal3, setVal: setTomorrowGoal3, index: 3 }
                      ].map((item) => (
                        <div key={item.index} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center text-[10px] text-[#8E8E93] font-bold shrink-0">
                            {item.index}
                          </span>
                          <input
                            type="text"
                            value={item.val}
                            onChange={(e) => item.setVal(e.target.value)}
                            placeholder={cur.tomorrowPlaceholder}
                            className="w-full px-3 py-1.5 text-[13px] rounded-xl border border-black/[0.05] dark:border-white/[0.05] bg-[#F2F2F7]/30 dark:bg-[#2C2C2E]/20 focus:bg-white dark:focus:bg-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#5856D6] text-black dark:text-white placeholder-[#8E8E93]/60"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Today's Completed Tasks Archive */}
                  <div className="space-y-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-[11px] font-bold text-[#8E8E93] block uppercase tracking-wider">
                      {cur.completedTasks}
                    </span>
                    {todayCompletedTasks.length > 0 ? (
                      <div className="max-h-[100px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {todayCompletedTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-green-500/[0.03] dark:bg-green-500/[0.06] border border-green-500/10 text-left"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                            <span className="text-[12px] text-gray-600 dark:text-gray-400 line-through opacity-80 truncate">
                              {t.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#8E8E93] italic">
                        {cur.noCompleted}
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: RITUALS & BREATHING/NSDR */}
              <div className="space-y-6">
                
                {/* section: sleep hygiene checklists */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] space-y-4 shadow-xs">
                  <span className="text-[11px] font-bold tracking-wider text-[#FF9500] uppercase block">
                    💤 {cur.bedtimeProtocol}
                  </span>
                  
                  <div className="space-y-2.5">
                    {[
                      { key: "noScreens" as const, title: cur.digitalSunset, desc: cur.digitalSunsetDesc },
                      { key: "coolRoom" as const, title: cur.thermalDrop, desc: cur.thermalDropDesc },
                      { key: "valerianOrTea" as const, title: cur.herbalTea, desc: cur.herbalTeaDesc },
                      { key: "breath478" as const, title: cur.breathing478, desc: cur.breathing478Desc }
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#F2F2F7]/30 dark:bg-[#2C2C2E]/20 border border-black/[0.02] dark:border-white/[0.02]"
                      >
                        <div className="space-y-0.5 text-left">
                          <h4 className="text-[12.5px] font-semibold text-black dark:text-white">
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-[#8E8E93] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <AppleToggle
                          checked={bedtimePrep[item.key]}
                          onChange={() => handleToggleBedtime(item.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* section: breathing guide or nsdr inside evening */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] space-y-4 shadow-xs relative">
                  {/* Tiny segmented tab switcher */}
                  <div className="flex items-center gap-1.5 p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl text-[11px] font-bold z-10 w-full">
                    <button
                      type="button"
                      onClick={() => setRitualTool("breath")}
                      className={`flex-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                        ritualTool === "breath"
                          ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs"
                          : "text-[#8E8E93] hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {language === "sr" ? "Disanje 4-7-8 🌬️" : language === "tr" ? "Nefes 4-7-8 🌬️" : "Breathing 4-7-8 🌬️"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRitualTool("nsdr")}
                      className={`flex-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                        ritualTool === "nsdr"
                          ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs"
                          : "text-[#8E8E93] hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {language === "sr" ? "NSDR Protokol 🧠" : language === "tr" ? "NSDR Protokolü 🧠" : "NSDR Protocol 🧠"}
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[180px] relative w-full pt-2">
                    {ritualTool === "breath" ? (
                      <div className="flex flex-col items-center justify-center w-full relative">
                        {isBreathingActive && (
                          <span className="absolute -top-3 right-0 text-[10px] text-[#5856D6] dark:text-[#7D7AFF] font-bold font-mono">
                            {cur.breatheCycles} {completedBreathingCycles}/4
                          </span>
                        )}

                        {/* Concentric expanding spheres visually imitating Apple Watch Breathe app */}
                        <div className="w-24 h-24 flex items-center justify-center relative mb-3 mt-1">
                          <AnimatePresence>
                            {isBreathingActive && (
                              <>
                                {/* Inner core circle */}
                                <motion.div
                                  className="absolute w-10 h-10 rounded-full bg-[#5856D6]/30 dark:bg-[#5856D6]/40 blur-xs"
                                  animate={{
                                    scale: breathingPhase === "inhale" ? 2.2 : breathingPhase === "hold" ? 2.2 : 1.0,
                                  }}
                                  transition={{
                                    duration: breathingPhase === "inhale" ? 4 : breathingPhase === "exhale" ? 8 : 0.5,
                                    ease: "easeInOut"
                                  }}
                                />
                                {/* Expanding ripple ring 1 */}
                                <motion.div
                                  className="absolute w-14 h-14 rounded-full border border-[#5856D6]/20 dark:border-[#7D7AFF]/30"
                                  animate={{
                                    scale: breathingPhase === "inhale" ? 2.5 : breathingPhase === "hold" ? 2.5 : 1.0,
                                    opacity: breathingPhase === "exhale" ? [0.6, 0] : 0.4
                                  }}
                                  transition={{
                                    duration: breathingPhase === "inhale" ? 4 : breathingPhase === "exhale" ? 8 : 0.5,
                                    ease: "easeInOut"
                                  }}
                                />
                              </>
                            )}
                          </AnimatePresence>

                          {/* Constant core button indicator */}
                          <div className="w-9 h-9 rounded-full bg-[#5856D6] flex items-center justify-center shadow-lg text-white relative z-10">
                            <Wind className={`w-4 h-4 ${isBreathingActive ? "animate-spin-slow" : ""}`} />
                          </div>
                        </div>

                        <div className="space-y-0.5 text-center max-w-[200px] z-10">
                          <p className="text-[12px] font-semibold text-black dark:text-white h-5">
                            {isBreathingActive ? (
                              breathingPhase === "inhale" ? cur.inhale :
                              breathingPhase === "hold" ? cur.hold :
                              breathingPhase === "exhale" ? cur.exhale : ""
                            ) : (
                              "4-7-8 Deep Somatic Reset"
                            )}
                          </p>
                          {isBreathingActive && (
                            <p className="text-[9px] text-[#5856D6] dark:text-[#7D7AFF] font-bold font-mono">
                              {breathingSecondsLeft}s
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsBreathingActive(!isBreathingActive);
                            if (isBreathingActive) {
                              setBreathingPhase("idle");
                            }
                          }}
                          className={`mt-3 px-3.5 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                            isBreathingActive
                              ? "bg-[#FF3B30] text-white hover:bg-[#FF453A]"
                              : "bg-[#5856D6] text-white hover:bg-[#4F46E5]"
                          }`}
                        >
                          {isBreathingActive ? cur.stopBreathing : cur.startBreathing}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <NsdrPlayer language={language} isCompact={true} />
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Matthew Walker Science quote block */}
            <div className="bg-[#5856D6]/5 dark:bg-[#5856D6]/10 p-4 rounded-2xl border border-[#5856D6]/10 text-left">
              <p className="text-[11px] italic text-[#5856D6] dark:text-[#7D7AFF] leading-relaxed">
                {cur.reflectionQuote}
              </p>
            </div>

            {/* LOWER SECTION: AI STATUS & DECISION AND LOCKED STATE */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-6 space-y-4">
              {isDayLocked ? (
                <div className="p-5 rounded-2xl bg-green-500/[0.05] dark:bg-green-500/[0.1] border border-green-500/10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#34C759]/10 dark:bg-[#34C759]/20 flex items-center justify-center text-[#34C759] mx-auto">
                    <Check className="w-6 h-6 stroke-[3px]" />
                  </div>
                  <h3 className="text-md font-bold text-[#34C759]">
                    {cur.lockedStatus}
                  </h3>
                  <p className="text-xs text-[#8E8E93]">
                    {cur.unlockedAll}
                  </p>
                  <button
                    type="button"
                    onClick={handleUnlockDay}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:scale-[1.03] active:scale-95 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {cur.unlockBtn}
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-black/[0.05] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col items-center justify-center space-y-3 py-6">
                  <p className="text-[12px] text-[#8E8E93] text-center max-w-md">
                    {language === "sr" 
                      ? "Proslavili ste pobede, kognitivno se rasteretili i aktivirali parasimpatikus. Zapečatite ovaj dan kako biste oslobodili sutrašnji prostor."
                      : language === "tr"
                        ? "Kazanımlarınızı kutladınız, zihninizi boşalttınız ve parasempatik sistemi aktive ettiniz. Günü kapatmak için kilitleyin."
                        : "You've celebrated wins, offloaded cognitive load, and activated parasympathetic tone. Lock this day to release space for tomorrow."}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendEveningReflection}
                    disabled={isEveningProcessing}
                    className="px-6 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all text-xs font-semibold cursor-pointer shadow-sm w-full max-w-xs flex items-center justify-center gap-2"
                  >
                    {isEveningProcessing ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black animate-spin" />
                        <span>{cur.processingAdvice}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>{cur.sendReflection}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Scientific sleep advice box */}
              {eveningAdvice && (
                <div className="p-4 rounded-2xl bg-[#5856D6]/5 dark:bg-[#5856D6]/10 border border-[#5856D6]/10 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-[#5856D6] dark:text-[#7D7AFF]">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {cur.advisorAdvice}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-gray-800 dark:text-gray-200">
                    {renderCleanText(eveningAdvice, language === "en")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t border-black/[0.04] dark:border-white/[0.04] bg-[#F2F2F7]/30 dark:bg-[#1C1C1E]/30 flex items-center justify-between">
            <button
              onClick={() => setIsEveningExpanded(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-black dark:hover:text-white transition-all cursor-pointer"
            >
              {language === "sr" ? "Zatvori Komoru" : language === "tr" ? "Komor kapat" : "Close Chamber"}
            </button>

            <button
              onClick={() => {
                setForceMorningHub(true);
                setIsEveningExpanded(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5856D6] dark:text-[#7D7AFF] hover:bg-[#5856D6]/5 dark:hover:bg-[#5856D6]/10 transition-colors cursor-pointer"
            >
              {cur.morningHubBtn}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
