import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Flame, Trophy, Coins, Star, BatteryCharging } from "lucide-react";
import { triggerDiscoveryEvent } from "../lib/discoveryEngine";

export type AdrenalineType = "morning" | "evening" | null;

interface AdrenalineModalProps {
  type: AdrenalineType;
  onClose: () => void;
  language: string;
}

export default function AdrenalineModal({
  type,
  onClose,
  language,
}: AdrenalineModalProps) {
  const [explosion, setExplosion] = useState(false);
  const isEn = language === 'en';

  useEffect(() => {
    if (type) {
      setExplosion(true);
      // Discovery Lab Routine Reward
      try {
        triggerDiscoveryEvent("morning_reflection", { source: "adrenaline" });
        window.dispatchEvent(new Event("companion-sync"));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}
    }
  }, [type]);

  if (!type) return null;

  const isMorning = type === "morning";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E] backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.2, rotate: -15, y: 100 }}
          animate={
            explosion
              ? {
                  scale: [0.8, 1.2, 1],
                  rotate: [15, -10, 0],
                  y: 0,
                }
              : { scale: 1, rotate: 0, y: 0 }
          }
          transition={{ type: "spring", damping: 12, stiffness: 100 }}
          className={`relative max-w-sm w-full overflow-hidden p-8 rounded-[3rem] text-center border-4 ${
            isMorning
              ? "bg-white dark:bg-[#1C1C1E] border-[#FFCC00]/20 dark:border-[#FFD60A]/20"
              : "bg-white dark:bg-[#1C1C1E] border-[#AF52DE]/20 dark:border-[#BF5AF2]/20"
          } text-black dark:text-white`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Intense animated background elements */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute inset-x-0 bottom-0 h-1/2 border border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className={`absolute top-1/2 left-1/2 -ml-32 -mt-32 w-64 h-64 opacity-50 hidden ${isMorning ? "bg-[#FFCC00]/10 dark:bg-[#FFD60A]/10" : "bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10"}`}
            />
          </div>

          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="relative z-10 mx-auto w-24 h-24 mb-4 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center backdrop-blur-md dark:border-white/5 border-white/40"
          >
            {isMorning ? (
              <Flame className="w-12 h-12 text-[#FFCC00]" />
            ) : (
              <Zap className="w-12 h-12 text-[#AF52DE] dark:text-[#BF5AF2]" />
            )}
          </motion.div>

          <h2
            className="relative z-10 text-xl text-[#3C3C43] dark:text-white font-semibold mb-2"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
          >
            {isMorning
              ? isEn ? "Morning Adrenaline!" : language === "tr" ? "Sabah Adrenalini!" : "Jutarnji Adrenalin!"
              : isEn ? "Evening Dominance!" : language === "tr" ? "Akşam Hakimiyeti!" : "Večernja Dominacija!"}
          </h2>

          <p className="relative z-10 text-[#3C3C43] dark:text-[#EBEBF5]/90 font-medium mb-6 text-sm">
            {isMorning
              ? isEn ? "You took an action first thing in the morning! Epic start!" : language === "tr" ? "Sabah ilk iş harekete geçtiniz! Destansı başlangıç!" : "Tvoja prva akcija jutros pokreće nezadrživ rast energije!"
              : isEn ? "You are closing the day with an epic execution!" : language === "tr" ? "Günü destansı bir infazla kapatıyorsunuz!" : "Završavaš dan sa herojskim fokusom i dominacijom!"}
          </p>

          <div className="relative z-10 bg-black/30 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/10 space-y-3">
            <h4 className="text-[13px] font-semibold text-white/60 mb-2">
              {isEn ? "Massive Rewards Unlocked" : language === "tr" ? "Büyük Ödüllerin Kilidi Açıldı" : "Ogromne Nagrade Otključane"}
            </h4>

            <div className="flex items-center justify-between font-semibold text-lg">
              <span className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FFCC00]" /> XP{" "}
                {isEn ? "Boost" : language === "tr" ? "Artırmak" : "Skok"}
              </span>
              <span className="text-[#FFCC00]">+500</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-lg">
              <span className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#FF9500] dark:text-[#FF9F0A]" />{" "}
                {isEn ? "Coins" : language === "tr" ? "Paralar" : "Novčića"}
              </span>
              <span className="text-[#FF9500] dark:text-[#FF9F0A]">+300</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-lg">
              <span className="flex items-center gap-2">
                <BatteryCharging className="w-5 h-5 text-[#34C759] dark:text-[#30D158]" />{" "}
                {isEn ? "Health" : language === "tr" ? "Sağlık" : "Zdravlje"}
              </span>
              <span className="text-[#34C759] dark:text-[#30D158]">MAX</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 w-full py-4 rounded-xl bg-white dark:bg-[#1C1C1E] text-black dark:text-white font-semibold hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isEn ? "Claim & Dominate" : language === "tr" ? "İddia Edin ve Hakim Olun" : "Preuzmi & Dominiraj"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
