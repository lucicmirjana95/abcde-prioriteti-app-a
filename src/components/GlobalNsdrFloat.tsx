import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Pause,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { nsdrEngine } from "../lib/audioEngine";

interface GlobalNsdrFloatProps {
  language: string;
  isScrolledDown?: boolean;
}

export default function GlobalNsdrFloat({ language, isScrolledDown }: GlobalNsdrFloatProps) {
  const [isPlaying, setIsPlaying] = useState(nsdrEngine.getIsPlaying());
  const [volume, setVolume] = useState(nsdrEngine.getVolume());
  const [sessionType, setSessionType] = useState<'theta' | 'delta'>(nsdrEngine.getType());
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync state with singleton engine
  useEffect(() => {
    const handleStateChange = (e: any) => {
      const { isPlaying: engPlaying, volume: engVol, type: engType } = e.detail;
      setIsPlaying(engPlaying);
      setVolume(engVol);
      setSessionType(engType);
    };

    window.addEventListener("nsdr-state-change", handleStateChange);
    setIsPlaying(nsdrEngine.getIsPlaying());
    setVolume(nsdrEngine.getVolume());
    setSessionType(nsdrEngine.getType());

    return () => {
      window.removeEventListener("nsdr-state-change", handleStateChange);
    };
  }, []);

  if (!isPlaying) {
    return null;
  }

  const isEn = language === "en";
  const isTr = language === "tr";

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    nsdrEngine.stop();
    setIsPlaying(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    nsdrEngine.setVolume(newVol);
  };

  const toggleType = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextType = sessionType === "theta" ? "delta" : "theta";
    setSessionType(nextType);
    nsdrEngine.setType(nextType);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 260 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed md:bottom-6 right-4 z-50 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[22px] shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden cursor-pointer select-none max-w-sm w-[92%] sm:w-80 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isScrolledDown ? "bottom-[68px]" : "bottom-[88px]"}`}
      >
        <div className="p-3.5 flex flex-col gap-3">
          {/* Main Pill Header / Compact View */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {/* Pulsing Visual Wave Indicator */}
              <div className="relative w-8 h-8 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 flex items-center justify-center shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/20"
                />
                <Brain className={`w-4.5 h-4.5 text-[#007AFF] dark:text-[#0A84FF] relative z-10 ${isPlaying ? "animate-pulse" : ""}`} />
              </div>

              {/* Text Info */}
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block leading-none mb-1">
                  {isEn ? "NSDR Active" : isTr ? "NSDR Aktif" : "NSDR Aktivan"}
                </span>
                <span className="text-[13px] font-bold text-black dark:text-white leading-none block">
                  {sessionType === "theta"
                    ? (isEn ? "Theta Focus (4Hz)" : isTr ? "Theta Odak (4Hz)" : "Teta Fokus (4Hz)")
                    : (isEn ? "Delta Rest (2Hz)" : isTr ? "Delta Uyku (2Hz)" : "Delta Rest (2Hz)")}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handlePause}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                title={isEn ? "Pause" : isTr ? "Durdur" : "Pauziraj"}
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#8E8E93] hover:text-black dark:hover:text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Options Panel */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="border-t border-black/5 dark:border-white/5 pt-3 space-y-3.5"
            >
              {/* Type Switcher Option */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
                  {isEn ? "Frequency Mode" : isTr ? "Frekans Modu" : "Režim Frekvencije"}
                </span>
                <button
                  onClick={toggleType}
                  className="px-2.5 py-1 bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF] text-[11px] font-bold rounded-lg cursor-pointer hover:bg-[#007AFF]/20 transition-colors"
                >
                  {isEn ? "Switch Protocol" : isTr ? "Protokolü Değiştir" : "Promeni protokol"}
                </button>
              </div>

              {/* Volume Slider Option */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#30D158]" />
                    {isEn ? "Volume" : isTr ? "Ses" : "Jačina"}
                  </span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newVol = volume > 0 ? 0 : 0.4;
                      setVolume(newVol);
                      nsdrEngine.setVolume(newVol);
                    }}
                    className="text-[#8E8E93] hover:text-black dark:hover:text-white"
                  >
                    {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                  />
                </div>
              </div>

              {/* Helpful Tips on Rest */}
              <div className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-[11px] text-[#8E8E93] dark:text-[#EBEBF5]/60 leading-relaxed text-left">
                {sessionType === "theta"
                  ? (isEn
                      ? "💡 Theta state is perfect for restorative learning, calming stress, and reclaiming sharp focal focus."
                      : isTr
                        ? "💡 Theta modu zihni canlandırmak, stresi azaltmak ve net odağı geri kazanmak için mükemmeldir."
                        : "💡 Teta stanje je idealno za regeneraciju fokusa, učenje i smirivanje stresa.")
                  : (isEn
                      ? "💡 Delta state triggers deep parasympathetic shutdown, simulating slow-wave rest to prepare for sleep."
                      : isTr
                        ? "💡 Delta modu, uykudan önce derin parasempatik sakinleşmeyi ve yavaş dalga dinlenmesini tetikler."
                        : "💡 Delta stanje pokreće duboki parasimpatikus, oponašajući spori talasni san za lakši ulazak u san.")}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
