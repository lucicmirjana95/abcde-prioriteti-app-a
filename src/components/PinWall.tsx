import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ArrowLeft,
  Delete,
  KeyRound,
  Unlock,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translations, Language } from "../translations";

interface PinWallProps {
  title: string;
  expectedPin: string;
  onUnlockSuccess: () => void;
  onCancel: () => void;
  language: Language;
  isLocalMode: boolean;
}

export default function PinWall({
  title,
  expectedPin,
  onUnlockSuccess,
  onCancel,
  language,
  isLocalMode,
}: PinWallProps) {
  const [pinCode, setPinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isWiggling, setIsWiggling] = useState(false);

  const t = translations[language];

  // Monitor physical keyboard key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        if (pinCode.length < 4) {
          setPinCode((prev) => prev + e.key);
          setErrorMessage("");
        }
      } else if (e.key === "Backspace") {
        setPinCode((prev) => prev.slice(0, -1));
        setErrorMessage("");
      } else if (e.key === "Enter") {
        if (pinCode.length === 4) {
          verifyPin(pinCode);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinCode]);

  // Clean-room validation logic
  const verifyPin = (codeToVerify: string) => {
    if (codeToVerify === expectedPin) {
      onUnlockSuccess();
    } else {
      // Wiggle on error
      setIsWiggling(true);
      setErrorMessage(t.incorrectPinErr);
      setPinCode("");
      setTimeout(() => setIsWiggling(false), 500);
    }
  };

  // Process clicking the screen keypad buttons
  const handleKeypadPress = (num: string) => {
    if (pinCode.length < 4) {
      const nextPin = pinCode + num;
      setPinCode(nextPin);
      setErrorMessage("");

      // Auto-submit once 4 digits are completed for ultra fluid feeling
      if (nextPin.length === 4) {
        // slight timeout so the user sees the final bullet dot filled
        setTimeout(() => {
          verifyPin(nextPin);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPinCode((prev) => prev.slice(0, -1));
    setErrorMessage("");
  };

  return (
    <div
      className="fixed inset-0 bg-[#1C1C1E]/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      id="privacy-pinwall"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#1C1C1E] rounded-xl w-full max-w-md p-6 sm:p-8 relative border border-black/5 dark:border-white/5"
      >
        {/* Back navigation option */}
        <button
          onClick={onCancel}
          className="absolute top-5 left-5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white transition-colors p-2 rounded-xl hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          id="pinwall-btn-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isLocalMode ? "" : t.leaveBoard}</span>
        </button>

        {/* Security Crest */}
        <div className="flex flex-col items-center text-center mt-4">
          <div className="relative mb-4">
            <div className="w-16 h-16 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] border border-black/5 dark:border-white/5">
              <Lock className="w-8 h-8 transition-opacity text-[#007AFF] dark:text-[#0A84FF]" />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20 px-1.5 py-0.5 rounded-md text-[13px] font-semibold flex items-center gap-0.5 tracking-wide">
              {t.appLocked}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-black dark:text-white leading-tight">
            {t.enterPinToAccess}
          </h2>
          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-2 font-medium px-4 py-1.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-full tracking-wide inline-block max-w-xs truncate">
            🔒 {title}
          </p>
        </div>

        {/* Bullet Indicator Lights */}
        <motion.div
          animate={isWiggling ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="my-8 flex justify-center items-center gap-4"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isActive = pinCode.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-black/5 dark:border-white/5 transition-all duration-150 ${
                  isActive
                    ? "bg-[#007AFF] border-black/5 dark:border-white/5 scale-120"
                    : "border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E]"
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error Notification banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-center text-xs text-[#FF3B30] font-semibold mb-4 flex items-center justify-center gap-1 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 p-2.5 rounded-xl"
              id="pinwall-error-text"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.p>
          )}
        </AnimatePresence>

        {/* High visual fidelity tactical on-screen keyboard */}
        <div
          className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-2"
          id="pinwall-keypad"
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeypadPress(num)}
              className="w-16 h-16 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] active:opacity-70 border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer hover:text-[#007AFF] dark:text-[#0A84FF]"
              id={`keypad-${num}`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPinCode("")}
            className="w-16 h-16 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] font-medium text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            id="keypad-clear"
          >
            CLR
          </button>
          <button
            onClick={() => handleKeypadPress("0")}
            className="w-16 h-16 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] active:opacity-70 border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            id="keypad-0"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={pinCode.length === 0}
            className="w-16 h-16 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            id="keypad-backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal max-w-[240px] mx-auto tracking-wide font-semibold">
            {language === "en" ? "Keys masked for protection. Automatically authorized upon entering values." : language === "tr" ? "Keys masked for protection. Automatically authorized upon entering values." : "Tasteri maskirani radi bezbednosti. Automatska provera nakon unosa."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
