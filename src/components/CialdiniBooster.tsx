import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  CheckCircle2, 
  Users, 
  Flame, 
  Clock, 
  PenTool, 
  Award, 
  ShieldCheck, 
  TrendingUp, 
  X,
  Bookmark
} from "lucide-react";
import { Task } from "../types";

interface CialdiniBoosterProps {
  language: "sr" | "en" | "tr";
  tasks: Task[];
  onAddTask: (title: string, description: string, category: "A" | "B" | "C" | "D" | "E") => void;
}

export const CialdiniBooster: React.FC<CialdiniBoosterProps> = ({
  language,
  tasks,
  onAddTask
}) => {
  const isEn = language === "en";
  const isTr = language === "tr";

  // State managers
  const [commitment, setCommitment] = useState("");
  const [isSigned, setIsSigned] = useState(() => {
    return localStorage.getItem("cialdini_is_signed") === "true";
  });
  const [savedCommitment, setSavedCommitment] = useState(() => {
    return localStorage.getItem("cialdini_commitment") || "";
  });
  const [consistencyStreak, setConsistencyStreak] = useState(() => {
    return parseInt(localStorage.getItem("cialdini_consistency_streak") || "4", 10);
  });
  const [joinedWave, setJoinedWave] = useState(() => {
    return localStorage.getItem("cialdini_joined_wave") === "true";
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<"commitment" | "social" | "scarcity">("commitment");

  // Fake live social statistics
  const [livePerformersCount, setLivePerformersCount] = useState(1482);
  const [teamSuccessRate, setTeamSuccessRate] = useState(93.4);

  // Scarcity countdown (morning cognitive window - reset daily)
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfWindow = new Date();
      endOfWindow.setHours(13, 0, 0, 0); // Morning window ends at 1 PM

      let diff = endOfWindow.getTime() - now.getTime();
      if (diff < 0) {
        // If past 1 PM, target next day's 1 PM
        endOfWindow.setDate(endOfWindow.getDate() + 1);
        diff = endOfWindow.getTime() - now.getTime();
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      const format = (num: number) => String(num).padStart(2, "0");
      setTimeLeft(`${format(h)}h ${format(m)}m ${format(s)}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Soft dynamic fluctuations for social proof to look "live"
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePerformersCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      setTeamSuccessRate(prev => {
        const change = (Math.random() - 0.5) * 0.2;
        return Math.min(99.8, Math.max(89.5, +(prev + change).toFixed(1)));
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Multi-language text maps
  const dict = {
    sr: {
      title: "Cialdini Akcelerator",
      subtitle: "Naučno dokazani pokretači visoke produktivnosti i fokusa",
      tabCommitment: "Doslednost",
      tabSocial: "Zajednica",
      tabScarcity: "Ekskluzivnost",
      
      // Commitment
      commHeader: "Psihološko Obavezivanje",
      commSub: "Cialdini dokazuje: Pismeni zavet povećava šansu za realizaciju za čak 82%!",
      commPlaceholder: "Danas se svečano obavezujem da ću završiti...",
      commAction: "Potpiši i zaključaj zavet",
      commSigned: "Svečani zavet je aktivan i zaključan",
      commStreak: "Indeks doslednosti",
      commStreakSub: "uzastopnih dana",
      commTaskAdded: "Zavet je automatski ubačen kao tvoj prioritet 'A'!",

      // Social Proof
      socialHeader: "Moć Društvenog Dokaza",
      socialSub: "Ljudski um kopira akcije uspešnih. Ti si deo elite sa visokim fokusom.",
      socialLive: "Aktivno na mreži",
      socialStat1: "korisnika trenutno u krugu maksimalnog rada",
      socialStat2: "stopa uspeha tvoje grupe danas",
      socialJoin: "Potvrdi svoj udeo u talasu",
      socialJoined: "Sinhronizovan sa 5AM Club zajednicom",

      // Scarcity & Authority
      scarcityHeader: "Kognitivni Prozor i Autoritet",
      scarcitySub: "Ušteda vremena kroz ekskluzivnost i autoritet dokazanih lidera.",
      scarcityTimerLabel: "Preostalo vreme kognitivnog vrhunca",
      scarcityTimerDesc: "Zatvori 'A' zadatke pre nego što se ovaj dopaminski prozor zatvori.",
      authorityQuote: "Naučni autoritet:",
      authoritySource: "Robert Cialdini, autor 'Uticaja'",
      authorityQuoteText: "\"Male promene u postavci tvog radnog okruženja kreiraju nesrazmerno velike skokove u kognitivnoj disciplini i završavanju zadataka.\"",
    },
    en: {
      title: "Cialdini Persuasion Booster",
      subtitle: "Science-backed triggers for bulletproof execution & productivity",
      tabCommitment: "Consistency",
      tabSocial: "Social Proof",
      tabScarcity: "Scarcity & Authority",

      // Commitment
      commHeader: "Active Commitment",
      commSub: "Cialdini's rule: Written, signed commitments increase follow-through by 82%!",
      commPlaceholder: "Today I solemnly commit to complete...",
      commAction: "Sign & Seal Commitment",
      commSigned: "Solemn commitment is locked & active",
      commStreak: "Consistency Index",
      commStreakSub: "consecutive days",
      commTaskAdded: "Commitment added as your highest Category A priority!",

      // Social Proof
      socialHeader: "Power of Peer Action",
      socialSub: "Our minds follow elite peers. You are part of the high-leverage group.",
      socialLive: "Active Online",
      socialStat1: "high-performers working alongside you right now",
      socialStat2: "success rate of your focus circle today",
      socialJoin: "Register My Sync with the Circle",
      socialJoined: "Synced with the 5AM High-Performers Club",

      // Scarcity & Authority
      scarcityHeader: "Cognitive Scarcity & Authority",
      scarcitySub: "Act quickly before bandwidth drops. Guided by proven cognitive leaders.",
      scarcityTimerLabel: "Peak Performance Window Left",
      scarcityTimerDesc: "Conquer your 'A' priorities before this dopamine window expires.",
      authorityQuote: "Scientific Authority:",
      authoritySource: "Robert Cialdini, PhD",
      authorityQuoteText: "\"Small structural changes in your immediate environment yield dramatically high returns in psychological consistency and goal completion.\"",
    },
    tr: {
      title: "Cialdini Davranışsal Aksettirici",
      subtitle: "Yüksek üretkenlik ve kilitlenme için bilimsel ikna tetikleyicileri",
      tabCommitment: "Tutarlılık",
      tabSocial: "Sosyal Kanıt",
      tabScarcity: "Sınırlılık & Otorite",

      // Commitment
      commHeader: "Psikolojik Bağlılık",
      commSub: "Cialdini kuralı: Yazılı ve imzalı taahhütler, başarı oranını %82 artırır!",
      commPlaceholder: "Bugün kararlılıkla tamamlamaya söz veriyorum...",
      commAction: "Taahhüdü İmzala ve Kilitle",
      commSigned: "Kararlılık taahhüdü aktif ve kilitli",
      commStreak: "Tutarlılık Endeksi",
      commStreakSub: "ardışık gün",
      commTaskAdded: "Taahhüdünüz en yüksek Kategori A önceliği olarak eklendi!",

      // Social Proof
      socialHeader: "Sosyal Kanıtın Gücü",
      socialSub: "Zihnimiz başarılı akranlarını kopyalar. Yüksek odaklı elit grubun parçasısınız.",
      socialLive: "Çevrimiçi Aktif",
      socialStat1: "üretken lider şu anda sizinle birlikte çalışıyor",
      socialStat2: "odak grubunuzun bugünkü başarı oranı",
      socialJoin: "Gruba Katılımımı Onayla",
      socialJoined: "5AM Club topluluğu ile senkronize edildi",

      // Scarcity & Authority
      scarcityHeader: "Bilişsel Sınırlılık ve Otorite",
      scarcitySub: "Zihinsel enerjiniz tükenmeden hızlı hareket edin. Otoritelerin rehberliği.",
      scarcityTimerLabel: "Kalan Bilişsel Zirve Süresi",
      scarcityTimerDesc: "Dopamin penceresi kapanmadan önce 'A' öncelikli görevlerinizi bitirin.",
      authorityQuote: "Bilimsel Otorite:",
      authoritySource: "Robert Cialdini, PhD",
      authorityQuoteText: "\"Çalışma ortamınızdaki küçük yapısal düzenlemeler kognitif tutarlılık ve hedef tamamlama oranlarında olağanüstü artışlar sağlar.\"",
    }
  }[language];

  const handleSignCommitment = () => {
    if (!commitment.trim()) return;
    
    // 1. Save to localStorage
    localStorage.setItem("cialdini_is_signed", "true");
    localStorage.setItem("cialdini_commitment", commitment);
    
    const newStreak = consistencyStreak + 1;
    setConsistencyStreak(newStreak);
    localStorage.setItem("cialdini_consistency_streak", String(newStreak));
    
    setSavedCommitment(commitment);
    setIsSigned(true);
    setShowConfetti(true);

    // 2. Add as a real category 'A' priority task! (Leverages Commitment & Consistency)
    onAddTask(
      `🔒 Zavet: ${commitment}`,
      `Psihološki potpisano obavezivanje na doslednost (Cialdini akcelerator). Indeks doslednosti: ${newStreak} dana.`,
      "A"
    );

    setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
  };

  const handleJoinWave = () => {
    localStorage.setItem("cialdini_joined_wave", "true");
    setJoinedWave(true);
    setLivePerformersCount(prev => prev + 1);
  };

  return (
    <div 
      className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm overflow-hidden text-left"
      id="cialdini-booster-container"
    >
      {/* HEADER SECTION - Apple HIG Standard typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/5 mb-5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="text-[17px] font-bold text-black dark:text-white leading-none tracking-tight">
              {dict.title}
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] text-[10px] font-bold rounded-full uppercase tracking-wider">
              Cialdini Expert
            </span>
          </div>
          <p className="text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium">
            {dict.subtitle}
          </p>
        </div>

        {/* Dynamic mini streak index indicator */}
        <div className="flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5">
          <Flame className="w-4 h-4 text-[#FF9500] fill-current animate-pulse" />
          <span className="text-xs font-bold text-black dark:text-white">
            {consistencyStreak}
          </span>
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {dict.commStreakSub}
          </span>
        </div>
      </div>

      {/* HIG Segmented Pill Switcher */}
      <div className="bg-black/5 dark:bg-white/5 p-1 rounded-xl flex items-center justify-between gap-1 w-full max-w-sm mx-auto mb-5 border border-black/5 dark:border-white/5">
        <button
          onClick={() => setActiveTab("commitment")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
            activeTab === "commitment"
              ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
              : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>{dict.tabCommitment}</span>
        </button>
        <button
          onClick={() => setActiveTab("social")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
            activeTab === "social"
              ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
              : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{dict.tabSocial}</span>
        </button>
        <button
          onClick={() => setActiveTab("scarcity")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
            activeTab === "scarcity"
              ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
              : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{dict.tabScarcity}</span>
        </button>
      </div>

      {/* TAB CONTENTS WITH SMOOTH ANIMATIONS */}
      <AnimatePresence mode="wait">
        {activeTab === "commitment" && (
          <motion.div
            key="tab-commitment"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div className="bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 border border-[#007AFF]/15 dark:border-[#0A84FF]/15 rounded-2xl p-4 flex items-start gap-3">
              <Bookmark className="w-5 h-5 text-[#007AFF] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#007AFF] dark:text-[#0A84FF]">
                  {dict.commHeader}
                </h4>
                <p className="text-[12.5px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-medium">
                  {dict.commSub}
                </p>
              </div>
            </div>

            {!isSigned ? (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={commitment}
                    onChange={(e) => setCommitment(e.target.value)}
                    placeholder={dict.commPlaceholder}
                    className="w-full bg-[#F2F2F7]/50 dark:bg-[#2C2C2E]/40 border border-black/5 dark:border-white/5 rounded-2xl py-3.5 px-4 text-sm text-black dark:text-white placeholder:text-[#8E8E93]/70 focus:border-[#007AFF] dark:focus:border-[#0A84FF] focus:bg-white dark:focus:bg-[#1C1C1E] outline-none transition-all shadow-xs pr-12 font-sans font-medium"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSignCommitment();
                    }}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <PenTool className="w-5 h-5 text-[#8E8E93]/60" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignCommitment}
                  disabled={!commitment.trim()}
                  className="w-full bg-[#007AFF] hover:bg-[#0062CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] disabled:opacity-35 disabled:pointer-events-none text-white font-bold text-xs py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{dict.commAction}</span>
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 rounded-2xl p-4 flex flex-col space-y-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#34C759]/20 flex items-center justify-center text-[#34C759] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-0.5 text-left">
                    <span className="text-[11px] font-bold text-[#34C759] uppercase tracking-wide">
                      {dict.commSigned}
                    </span>
                    <p className="text-[13.5px] font-bold text-black dark:text-white leading-relaxed italic pr-2">
                      "{savedCommitment}"
                    </p>
                  </div>
                </div>

                <div className="h-[0.5px] bg-black/5 dark:bg-white/10 w-full" />

                <div className="flex items-center justify-between text-[11px] text-[#3C3C43]/75 dark:text-[#EBEBF5]/60 font-semibold pl-1">
                  <span className="flex items-center gap-1">
                    🎉 {dict.commTaskAdded}
                  </span>
                  <button 
                    onClick={() => {
                      setIsSigned(false);
                      localStorage.setItem("cialdini_is_signed", "false");
                    }}
                    className="text-[#FF3B30] hover:underline cursor-pointer"
                  >
                    {language === "en" ? "Rewrite" : language === "tr" ? "Yeniden Yaz" : "Napiši ponovo"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "social" && (
          <motion.div
            key="tab-social"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div className="bg-[#AF52DE]/5 dark:bg-[#BF5AF2]/5 border border-[#AF52DE]/15 dark:border-[#BF5AF2]/15 rounded-2xl p-4 flex items-start gap-3">
              <Users className="w-5 h-5 text-[#AF52DE] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#AF52DE] dark:text-[#BF5AF2]">
                  {dict.socialHeader}
                </h4>
                <p className="text-[12.5px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-medium">
                  {dict.socialSub}
                </p>
              </div>
            </div>

            {/* Simulated Live Community Dashboard (Unified HIG Style) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F2F2F7]/60 dark:bg-[#2C2C2E]/40 border border-black/5 dark:border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/55 uppercase tracking-wide font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-ping" />
                  <span>{dict.socialLive}</span>
                </div>
                <div className="mt-2 text-xl font-bold text-black dark:text-white font-mono leading-none">
                  {livePerformersCount}
                </div>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                  {dict.socialStat1}
                </span>
              </div>

              <div className="bg-[#F2F2F7]/60 dark:bg-[#2C2C2E]/40 border border-black/5 dark:border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1 text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/55 uppercase tracking-wide font-bold">
                  <TrendingUp className="w-3.5 h-3.5 text-[#34C759]" />
                  <span>{language === "en" ? "Live Sync Rate" : language === "tr" ? "Canlı Oran" : "Kolektivni nivo"}</span>
                </div>
                <div className="mt-2 text-xl font-bold text-[#34C759] dark:text-[#30D158] font-mono leading-none">
                  {teamSuccessRate}%
                </div>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                  {dict.socialStat2}
                </span>
              </div>
            </div>

            {/* Overlapping premium avatars showing community scale */}
            <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
              <div className="flex -space-x-2.5 overflow-hidden shrink-0">
                <span className="inline-block h-7 w-7 rounded-full bg-blue-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#1C1C1E]">M</span>
                <span className="inline-block h-7 w-7 rounded-full bg-purple-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#1C1C1E]">A</span>
                <span className="inline-block h-7 w-7 rounded-full bg-green-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#1C1C1E]">V</span>
                <span className="inline-block h-7 w-7 rounded-full bg-[#FF9500] text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#1C1C1E]">S</span>
                <span className="inline-block h-7 w-7 rounded-full bg-gray-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#1C1C1E]">+</span>
              </div>
              
              {!joinedWave ? (
                <button
                  type="button"
                  onClick={handleJoinWave}
                  className="px-4 py-1.5 bg-[#AF52DE] hover:bg-[#9B3EC2] dark:bg-[#BF5AF2] dark:hover:bg-[#AC47DC] text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  {dict.socialJoin}
                </button>
              ) : (
                <span className="text-[11px] font-bold text-[#AF52DE] dark:text-[#BF5AF2] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-current text-white text-[#AF52DE]" />
                  {dict.socialJoined}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "scarcity" && (
          <motion.div
            key="tab-scarcity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Scarcity Countdown Area */}
            <div className="bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5 border border-[#FF9500]/15 dark:border-[#FF9F0A]/15 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#FF9500] shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-bold text-[#FF9500] dark:text-[#FF9F0A]">
                    {dict.scarcityTimerLabel}
                  </h4>
                  <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug font-medium">
                    {dict.scarcityTimerDesc}
                  </p>
                </div>
              </div>
              <div className="bg-[#FF9500]/10 border border-[#FF9500]/25 text-[#FF9500] font-mono text-base font-bold px-4 py-2 rounded-xl text-center shadow-xs select-none">
                {timeLeft}
              </div>
            </div>

            {/* Scientific Authority Trigger Block */}
            <div className="bg-[#F2F2F7]/50 dark:bg-[#2C2C2E]/40 border border-black/5 dark:border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/55 uppercase tracking-wide font-bold">
                <Award className="w-4 h-4 text-[#007AFF]" />
                <span>{dict.authorityQuote}</span>
              </div>
              <blockquote className="text-[13px] text-black dark:text-gray-100 italic leading-relaxed font-medium pl-1">
                {dict.authorityQuoteText}
              </blockquote>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-tight text-right pr-1">
                — {dict.authoritySource}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
