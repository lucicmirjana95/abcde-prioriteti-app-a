import React, { useState, useEffect } from "react";
import { Bell, BellRing, X, Check, Clock, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationManagerProps {
  language: "en" | "sr" | "tr";
}

export default function NotificationManager({
  language,
}: NotificationManagerProps) {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);

      if (
        Notification.permission === "default" &&
        !safeStorage.getItem("notification_prompt_dismissed")
      ) {
        const timer = setTimeout(() => setShowPrompt(true), 5000); // Ask after 5 seconds
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    // Schedule checks for morning (08:00) and evening (20:00) reminders
    if (permission !== "granted") return;

    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      const lastMorningDate = safeStorage.getItem("last_morning_notification");
      const lastEveningDate = safeStorage.getItem("last_evening_notification");
      const todayDate = now.toDateString();

      // Morning notification at 08:XX
      if (hours === 8 && lastMorningDate !== todayDate) {
        try {
          new Notification(
            language === "sr" ? "Jutarnji Reset ☀️" : "Morning Reset ☀️",
            {
              body:
                language === "sr"
                  ? "Vreme je za tvoj jutarnji dnevnik. Isplaniraj dan, postavi fokus i uhvati zamah!"
                  : "Time for your morning brain dump. Plan the day, set focus and build momentum!",
              icon: "/favicon.ico",
            },
          );
        } catch (e) {
          console.warn("Notification error:", e);
        }
        safeStorage.setItem("last_morning_notification", todayDate);
      }

      // Evening notification at 20:XX
      if (hours === 20 && lastEveningDate !== todayDate) {
        try {
          new Notification(
            language === "sr" ? "Večernji Pregled 🌙" : "Evening Review 🌙",
            {
              body:
                language === "sr"
                  ? "Vreme je za večernji unos. Zatvori radni dan, očisti um i prepoznaj najveće pobede."
                  : "Time for your evening entry. Close the workday, clear your mind, and recognize wins.",
              icon: "/favicon.ico",
            },
          );
        } catch (e) {
          console.warn("Notification error:", e);
        }
        safeStorage.setItem("last_evening_notification", todayDate);
      }
    };

    const interval = setInterval(checkTime, 60000); // check every minute
    checkTime(); // check immediately

    return () => clearInterval(interval);
  }, [permission, language]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === "granted") {
        new Notification(
          language === "sr" ? "Podsetnici Uključeni!" : "Reminders Enabled!",
          {
            body:
              language === "sr"
                ? "Dobijaćeš obaveštenja za jutarnji i večernji plan."
                : "You will receive notifications for morning and evening routines.",
            icon: "/favicon.ico",
          },
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    safeStorage.setItem("notification_prompt_dismissed", "true");
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-6 right-6 z-[150] w-full max-w-[340px] pointer-events-auto"
        >
          <div className="bg-black/95 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 rounded-xl text-white overflow-hidden relative">
            {/* Ambient background glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#007AFF]/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2.5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 rounded-xl border border-black/5 dark:border-white/10">
                <BellRing className="w-5 h-5 text-[#0A84FF]" />
              </div>
              <button
                onClick={dismissPrompt}
                className="p-1.5 hover:bg-black/5 dark:bg-white/5 rounded-full transition-colors text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-1.5 relative z-10 mb-6">
              <h4 className="text-base font-semibold">
                {language === "sr"
                  ? "Jutarnji i Večernji Podsetnici"
                  : "Morning & Evening Reminders"}
              </h4>
              <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-relaxed">
                {language === "sr"
                  ? "Pusti aplikaciji da te podseti ujutru na planiranje i uveče na dekompresiju za savršen dan."
                  : "Let the app remind you to plan in the morning and decompress in the evening for a perfect day."}
              </p>
            </div>

            {/* Visual breakdown */}
            <div className="flex gap-2 mb-6 relative z-10">
              <div className="flex-1 bg-[#1C1C1E]/50 border border-white/5 rounded-xl p-3 flex flex-col items-center text-center gap-1.5">
                <Sun className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />
                <span className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  08:00
                </span>
              </div>
              <div className="flex-1 bg-[#1C1C1E]/50 border border-white/5 rounded-xl p-3 flex flex-col items-center text-center gap-1.5">
                <Moon className="w-4 h-4 text-[#0A84FF]" />
                <span className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  20:00
                </span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={requestPermission}
              className="w-full py-3 bg-[#007AFF] active:opacity-70 text-white text-[17px] font-semibold tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 relative z-10 active:scale-95"
            >
              <Check className="w-4 h-4" />
              {language === "sr" ? "Uključi Podsetnike" : "Enable Reminders"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
