import { useState, useEffect } from "react";
import { Bell, X, Volume2 } from "lucide-react";
import { animate, motion } from "motion/react";
import { translations, Language } from "../translations";

interface ActiveAlarm {
  id: string;
  taskTitle: string;
  time: string;
  category?: string;
}

const getCategoryAdvice = (category: string | undefined, language: string) => {
  const isEn = language === 'en';
  if (!category) {
    return isEn ? "Time to focus on this task and get it done! ⚡" : language === "tr" ? "Bu göreve odaklanmanın ve onu tamamlamanın zamanı geldi! ⚡" : "Vreme je da se fokusiraš na ovaj zadatak i završiš ga! ⚡";
  }
  switch (category.toUpperCase()) {
    case "A":
      return isEn ? "🎯 CRITICAL A-PRIORITY: Focus 100% of your energy and crush this primary goal now!" : language === "tr" ? "🎯 KRİTİK ÖNCELİK: Enerjinizin %100'üne odaklanın ve bu birincil hedefi hemen ezin!" : "🎯 KLJUČNI PRIORITET A: Fokusiraj svu svoju energiju i završi glavni cilj odmah!";
    case "B":
      return isEn ? "⚡ HIGH LEVERAGE B-TASK: Important secondary goal. Dedicate a clean block of time." : language === "tr" ? "⚡ YÜKSEK KALDIRAÇ B-GÖREVİ: Önemli ikincil hedef. Temiz bir zaman bloğu ayırın." : "⚡ VAŽAN ZADATAK B: Važan za podršku glavnom cilju. Odvoj fokusiran blok vremena.";
    case "C":
      return isEn ? "⏳ LIGHTWEIGHT C-TASK: Simple, quick activity. Keep it lightweight and fast!" : language === "tr" ? "⏳ HAFİF C-GÖREVİ: Basit, hızlı aktivite. Hafif ve hızlı tutun!" : "⏳ LAGAN ZADATAK C: Brza i jednostavna stvar. Reši je odmah i sačuvaj snagu!";
    case "D":
      return isEn ? "👥 DELEGATE D-TASK: Protect your peak focus stream. Delegate or handle rapidly." : language === "tr" ? "👥 D-GÖREVİNİ DELEGATE: En yoğun odak akışınızı koruyun. Hızla devredin veya halledin." : "👥 DELEGIRAJ ZADATAK D: Zaštiti svoje vreme i energiju. Delegiraj ili reši brzo.";
    case "E":
      return isEn ? "🗑️ ELIMINATE E-TASK: Low priority. Consider dropping or delaying relative to others." : language === "tr" ? "🗑️ E-GÖREVİ ORTADAN KALDIRIN: Düşük öncelik. Diğerlerine göre bırakmayı veya geciktirmeyi düşünün." : "🗑️ ELIMINIŠI ZADATAK E: Nizak prioritet. Razmisli o brisanju ili odlaganju.";
    default:
      return isEn ? "Time to focus on this task and get it done! ⚡" : language === "tr" ? "Bu göreve odaklanmanın ve onu tamamlamanın zamanı geldi! ⚡" : "Vreme je da se fokusiraš na ovaj zadatak i završiš ga! ⚡";
  }
};

export default function NotificationToast({
  alarms,
  onDismiss,
  language,
  soundsEnabled = true,
  activeSoundPack = "default",
}: {
  alarms: ActiveAlarm[];
  onDismiss: (id: string) => void;
  language: Language;
  soundsEnabled?: boolean;
  activeSoundPack?: string;
}) {
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const t = translations[language];

  // Synthesize a retro notification chime when a new alarm triggers
  useEffect(() => {
    alarms.forEach((alarm) => {
      if (!playedIds.includes(alarm.id)) {
        if (soundsEnabled) {
          playChime();
        }
        setPlayedIds((prev) => [...prev, alarm.id]);
      }
    });
  }, [alarms, playedIds, soundsEnabled]);

  const playChime = () => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();

      // Chime note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.1, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Chime note 2 (harmonized slightly later)
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.5);
        } catch (e) {}
      }, 150);
    } catch (err) {
      console.warn(
        "Audio context not allowed by browser autoplay rules yet:",
        err,
      );
    }
  };

  if (alarms.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full font-sans">
      {alarms.map((alarm) => (
        <motion.div
          key={alarm.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-4 flex items-start gap-3 backdrop-blur-md"
          id={`alarm-toast-${alarm.id}`}
        >
          <div className="p-2 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] rounded-lg shrink-0 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#FF9500] dark:text-[#FF9F0A] font-semibold flex items-center gap-1.5">
                {t.reminderHeader} ({alarm.time})
                {alarm.category && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      alarm.category.toUpperCase() === "A"
                        ? "bg-[#FF3B30]/10 text-[#FF3B30] dark:text-[#FF453A]"
                        : alarm.category.toUpperCase() === "B"
                          ? "bg-[#FF9500]/10 text-[#FF9500]"
                          : "bg-[#34C759]/10 text-[#34C759] dark:text-[#30D158]"
                    }`}
                  >
                    {alarm.category.toUpperCase()}
                  </span>
                )}
              </span>
              <button
                onClick={() => onDismiss(alarm.id)}
                className="text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-colors p-0.5 rounded-lg hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]"
                id={`dismiss-alarm-${alarm.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-black dark:text-white text-sm font-medium mt-1 truncate">
              {alarm.taskTitle}
            </h4>
            <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-[12px] mt-1 leading-relaxed font-semibold">
              {getCategoryAdvice(alarm.category, language)}
            </p>
            <button
              onClick={playChime}
              className="mt-2 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white flex items-center gap-1 cursor-pointer bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 px-2.5 py-1 rounded-lg"
              id={`test-chime-${alarm.id}`}
            >
              <Volume2 className="w-3" /> {t.chimeSound}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
