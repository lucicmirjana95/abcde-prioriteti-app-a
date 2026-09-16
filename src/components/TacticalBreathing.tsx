import React, { useState, useEffect, useRef } from "react";
import { X, Wind, Play, Square, Info, Brain } from "lucide-react";
import { motion } from "motion/react";
import NsdrPlayer from "./NsdrPlayer";
import { unlockIosSilentSwitch } from "../lib/audioEngine";

interface TacticalBreathingProps {
  language: "en" | "sr" | "tr";
  onClose: () => void;
  activeSoundPack?: string;
}

export default function TacticalBreathing({
  language,
  onClose,
  activeSoundPack = "default",
}: TacticalBreathingProps) {
  const [activeTab, setActiveTab] = useState<"breathe" | "nsdr">("breathe");
  const [isActive, setIsActive] = useState(false);
  const [ticks, setTicks] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const t = {
    en: {
      title: activeTab === "breathe" ? "Tactical Box Reset" : "NSDR Deep Reset",
      subtitle: activeTab === "breathe"
        ? "Square box breathing (4-4-4-4) to regulate cortisol, lower heart rate, and restore immediate cognitive control. Inhale through your nose, exhale through your mouth."
        : "Non-Sleep Deep Rest protocol by Dr. Andrew Huberman. A scientific technique to deeply relax the nervous system, recover focus, and prep for sleep.",
      start: "Begin Box Reset",
      stop: "Stop Exercise",
      cycles: "Cycles completed",
      scienceTitle: "Neurobiological Mechanism",
      scienceDesc: activeTab === "breathe"
        ? "By maintaining identical intervals of inhalation, retention, exhalation, and suspension, you artificially match the vagus nerve rhythm. This triggers instant parasympathetic dominance, lowering blood pressure and clearing adrenaline loops within 2 cycles."
        : "NSDR combines targeted breathing and body scanning to down-regulate the sympathetic nervous system and up-regulate parasympathetic tone. Studies show just 10-20 minutes of NSDR can restore striatal dopamine levels by 60% and accelerate cognitive recovery.",
    },
    sr: {
      title: activeTab === "breathe" ? "Kvadratni Reset" : "NSDR Duboki Reset",
      subtitle: activeTab === "breathe"
        ? "Kvadratno disanje u kutiji (4-4-4-4) za regulaciju kortizola, smirivanje otkucaja i trenutni povratak fokusa. Udahnite duboko kroz nos, a izdahnite sporo kroz usta."
        : "Protokol dubokog odmora bez spavanja (dr Endru Huberman). Naučna tehnika za duboku relaksaciju nervnog sistema, obnovu fokusa i pripremu za san.",
      start: "Započni Reset",
      stop: "Zaustavi vežbu",
      cycles: "Završenih ciklusa",
      scienceTitle: "Neurobiološki Mehanizam",
      scienceDesc: activeTab === "breathe"
        ? "Održavanjem jednakih intervala udaha, zadržavanja, izdaha i pauze, veštački stimulišete nervus vagus. Ovo aktivira parasimpatikus, smanjuje pritisak i zaustavlja nagomilavanje adrenalina za manje od 2 puna ciklusa."
        : "NSDR kombinuje usmereno disanje i skeniranje tela kako bi smanjio tonus simpatikusa i podstakao parasimpatičku aktivnost. Istraživanja pokazuju da samo 10-20 minuta NSDR-a može obnoviti nivo dopamina u strijatumu za 60% i ubrzati kognitivni oporavak.",
    },
    tr: {
      title: activeTab === "breathe" ? "Taktiksel Kutu Sıfırlaması" : "NSDR Derin Dinlenme",
      subtitle: activeTab === "breathe"
        ? "Kortizolü düzenlemek, nabzı düşürmek ve bilişsel kontrolü geri kazanmak için kutu nefesi (4-4-4-4). Burundan nefes alın, ağızdan nefes verin."
        : "Dr. Andrew Huberman tarafından geliştirilen Uyku Dışı Derin Dinlenme protokolü. Sinir sistemini derinlemesine rahatlatmak, odağı geri kazanmak ve uykuya hazırlanmak için bilimsel bir teknik.",
      start: "Kutu Sıfırlamasını Başlat",
      stop: "Egzersizi Durdur",
      cycles: "Tamamlanan döngüler",
      scienceTitle: "Nörobiyolojik Mekanizma",
      scienceDesc: activeTab === "breathe"
        ? "Eşit nefes alma, tutma, verme ve boş tutma aralıklarını koruyarak vagus sinirini uyarır ve parasempatik sistemi aktive edersiniz. Bu durum kan basıncını düşürür ve adrenalin döngülerini 2 döngü içinde kırar."
        : "NSDR, sempatik sinir sistemini aşağı yönlü düzenlemek ve parasempatik tonusu yukarı yönlü düzenlemek için hedeflenmiş nefes alma ve vücut taramasını birleştirir. Çalışmalar, sadece 10-20 dakikalık NSDR'nin striyatal dopamin seviyelerini %60 oranında geri yükleyebildiğini ve bilişsel iyileşmeyi hızlandırabildiğini göstermektedir.",
    },
  }[language];

  const initAudio = () => {
    try {
      unlockIosSilentSwitch();
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } catch (err) {
      console.warn("Failed to initialize Web Audio:", err);
    }
  };

  const playNoiseSweep = (direction: "up" | "down", duration: number) => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") return;

      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate soothing white/pink-ish filtered noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Simple pink-like filtering for softer texture
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // Bring to comfortable level
        b6 = white * 0.115926;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Resonant Low-Pass Filter
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.setValueAtTime(2.0, now);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);

      if (direction === "up") {
        // Inhale wind sweep upwards
        filter.frequency.setValueAtTime(180, now);
        filter.frequency.exponentialRampToValueAtTime(720, now + duration);
        
        gainNode.gain.linearRampToValueAtTime(0.04, now + 0.8);
        gainNode.gain.setValueAtTime(0.04, now + duration - 0.8);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
      } else {
        // Exhale wind sweep downwards
        filter.frequency.setValueAtTime(720, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + duration);
        
        gainNode.gain.linearRampToValueAtTime(0.04, now + 0.6);
        gainNode.gain.setValueAtTime(0.04, now + duration - 0.8);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
      }

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch (e) {
      console.warn("Breath simulator error:", e);
    }
  };

  const playCornerChime = (phaseName: "inhale" | "hold1" | "exhale" | "hold2") => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.035, now);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      
      let freq = 440;
      if (phaseName === "inhale") freq = 523.25; // C5 (Positive beginning)
      else if (phaseName === "hold1") freq = 659.25; // E5 (Suspended air)
      else if (phaseName === "exhale") freq = 392.00; // G4 (Letting go, deep)
      else if (phaseName === "hold2") freq = 329.63; // E4 (Grounded low)

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 2.2);

      // Warm Overtone
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(freq * 1.5, now); // Sweet perfect fifth
      overtoneGain.gain.setValueAtTime(0.25, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      overtone.connect(overtoneGain);
      overtoneGain.connect(masterGain);
      overtone.start(now);
      overtone.stop(now + 1.4);
    } catch (e) {
      console.warn("Chime synthesizer error:", e);
    }
  };

  useEffect(() => {
    if (!isActive) {
      setTicks(0);
      return;
    }

    const interval = setInterval(() => {
      setTicks((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const cycleTicks = ticks % 16;
  let phase: "idle" | "inhale" | "hold1" | "exhale" | "hold2" = "idle";
  
  if (isActive) {
    if (cycleTicks >= 0 && cycleTicks < 4) phase = "inhale";
    else if (cycleTicks >= 4 && cycleTicks < 8) phase = "hold1";
    else if (cycleTicks >= 8 && cycleTicks < 12) phase = "exhale";
    else if (cycleTicks >= 12 && cycleTicks < 16) phase = "hold2";
  }

  const timeLeft = isActive ? 4 - (cycleTicks % 4) : 0;
  const cycles = isActive ? Math.floor(ticks / 16) : 0;

  // Trigger audio elements on exact phase transitions
  useEffect(() => {
    if (isActive) {
      const remainder = cycleTicks % 4;
      if (remainder === 0 && phase !== "idle") {
        // We just hit a phase corner transition
        playCornerChime(phase);
        
        if (phase === "inhale") {
          playNoiseSweep("up", 4);
        } else if (phase === "exhale") {
          playNoiseSweep("down", 4);
        }
      }
    }
  }, [ticks, isActive]);

  const startBreathing = () => {
    initAudio();
    setIsActive(true);
  };

  const stopBreathing = () => {
    setIsActive(false);
  };

  const phaseText = {
    idle: "",
    inhale: language === "en" ? "Inhale (Nose)..." : language === "tr" ? "Nefes Al (Burun)..." : "Udahni na nos...",
    hold1: language === "en" ? "Hold..." : language === "tr" ? "Nefesi Tut..." : "Zadrži...",
    exhale: language === "en" ? "Exhale (Mouth)..." : language === "tr" ? "Nefes Ver (Ağız)..." : "Izdahni na usta...",
    hold2: language === "en" ? "Rest..." : language === "tr" ? "Boş Tut..." : "Pauza...",
  }[phase];

  const edgeLabels = {
    en: {
      left: "INHALE (4s)",
      top: "HOLD BREATH (4s)",
      right: "EXHALE (4s)",
      bottom: "HOLD EMPTY (4s)"
    },
    sr: {
      left: "UDAH (4s)",
      top: "ZADRŽI DAH (4s)",
      right: "IZDAH (4s)",
      bottom: "ZADRŽI PRAZNINU (4s)"
    },
    tr: {
      left: "NEFES AL (4sn)",
      top: "TUT (4sn)",
      right: "NEFES VER (4sn)",
      bottom: "BOŞ TUT (4sn)"
    }
  }[language];

  // Fluid bubble scale
  const getBubbleScale = () => {
    if (!isActive) return 0.85;
    switch (phase) {
      case "inhale":
        return 0.85 + (cycleTicks % 4) * 0.15; // smooth expansion from 0.85 to 1.45
      case "hold1":
        return 1.45;
      case "exhale":
        return 1.45 - (cycleTicks % 4) * 0.15; // smooth contraction from 1.45 to 0.85
      case "hold2":
        return 0.85;
      default:
        return 0.85;
    }
  };

  const getBubbleColor = () => {
    if (!isActive) return "from-slate-100 to-slate-200 dark:from-[#2C2C2E] dark:to-[#1C1C1E] text-slate-400";
    switch (phase) {
      case "inhale":
        // Healing Sage/Mint Green
        return "from-emerald-400/80 to-teal-500/80 dark:from-emerald-500/60 dark:to-teal-600/60 text-white shadow-[0_0_30px_rgba(16,185,129,0.35)]";
      case "hold1":
        // Calm Sky/Celestial Azure
        return "from-sky-400/80 to-blue-500/80 dark:from-sky-500/60 dark:to-blue-600/60 text-white shadow-[0_0_30px_rgba(14,165,233,0.35)]";
      case "exhale":
        // Relaxing Dusty Coral/Rose
        return "from-rose-400/80 to-orange-400/80 dark:from-rose-500/60 dark:to-orange-500/60 text-white shadow-[0_0_30px_rgba(244,63,94,0.35)]";
      case "hold2":
        // Deep Twilight/Indigo
        return "from-slate-400/80 to-indigo-500/80 dark:from-slate-600/60 dark:to-indigo-600/60 text-white shadow-[0_0_30px_rgba(99,102,241,0.25)]";
      default:
        return "from-slate-100 to-slate-200 dark:from-[#2C2C2E] dark:to-[#1C1C1E] text-slate-400";
    }
  };

  // Glider Dot position around perimeter (0% to 100%) - maps to precise corners based on phase
  const getDotPosition = () => {
    if (!isActive) return { left: "0%", top: "100%" };
    switch (phase) {
      case "inhale":
        return { left: "0%", top: "0%" };
      case "hold1":
        return { left: "100%", top: "0%" };
      case "exhale":
        return { left: "100%", top: "100%" };
      case "hold2":
        return { left: "0%", top: "100%" };
      default:
        return { left: "0%", top: "100%" };
    }
  };

  const dotGlowClass = 
    phase === "inhale"
      ? "bg-emerald-400 shadow-[0_0_15px_#34D399]"
      : phase === "hold1"
        ? "bg-sky-400 shadow-[0_0_15px_#38BDF8]"
        : phase === "exhale"
          ? "bg-rose-400 shadow-[0_0_15px_#FB7185]"
          : phase === "hold2"
            ? "bg-indigo-400 shadow-[0_0_15px_#818CF8]"
            : "bg-slate-300 dark:bg-white/30";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#FAFAFA] dark:bg-[#121214] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative border border-black/5 dark:border-white/5 flex flex-col max-h-[92vh]"
      >
        {/* Header bar */}
        <div className="p-6 pb-2 flex items-center justify-between border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF]">
              {activeTab === "breathe" ? (
                <Wind className="w-5 h-5 animate-pulse" />
              ) : (
                <Brain className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight text-black dark:text-white">
              {t.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-black/5 dark:bg-white/10 rounded-full text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            id="btn-close-breathing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center">
          {/* Segmented Control */}
          <div className="flex w-full bg-black/[0.05] dark:bg-white/[0.05] p-1 rounded-2xl mb-4 text-[13px] font-bold shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("breathe");
              }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === "breathe"
                  ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs"
                  : "text-[#8E8E93] hover:text-black dark:hover:text-white"
              }`}
            >
              <Wind className="w-4 h-4" />
              <span>
                {language === "sr" ? "Disanje (4-4-4-4)" : language === "tr" ? "Nefes (4-4-4-4)" : "Breathing (4-4-4-4)"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("nsdr");
                setIsActive(false); // Stop breathing to prevent audio overlap
              }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === "nsdr"
                  ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs"
                  : "text-[#8E8E93] hover:text-black dark:hover:text-white"
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>
                {language === "sr" ? "NSDR Protokol" : language === "tr" ? "NSDR Protokolü" : "NSDR Protocol"}
              </span>
            </button>
          </div>

          <p className="text-[13px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 text-center max-w-sm mb-3">
            {t.subtitle}
          </p>

          {activeTab === "breathe" ? (
            <>
              {/* THE BOX BREATHING STAGE - Optimized to be compact to prevent scrolling */}
              <div className="relative w-[200px] h-[200px] min-w-[200px] min-h-[200px] my-4 flex items-center justify-center shrink-0 aspect-square" id="box-breathing-stage">
                {/* Elegant Dashed Square Box Boundary */}
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.01]" />

                {/* Visual Corner Anchors */}
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-[#121214] border-2 border-black/15 dark:border-white/25 z-10" />
                <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-[#121214] border-2 border-black/15 dark:border-white/25 z-10" />
                <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-[#121214] border-2 border-black/15 dark:border-white/25 z-10" />
                <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-[#121214] border-2 border-black/15 dark:border-white/25 z-10" />

                {/* Active Edge Text Labels */}
                {/* Left Edge: Udahni */}
                <div
                  className={`absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-300 origin-center ${
                    phase === "inhale"
                      ? "text-emerald-500 dark:text-emerald-400 scale-105 font-extrabold"
                      : "text-[#8E8E93]/40 dark:text-[#EBEBF5]/20"
                  }`}
                >
                  {edgeLabels.left}
                </div>

                {/* Top Edge: Zadrzi */}
                <div
                  className={`absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-300 ${
                    phase === "hold1"
                      ? "text-sky-500 dark:text-sky-400 scale-105 font-extrabold"
                      : "text-[#8E8E93]/40 dark:text-[#EBEBF5]/20"
                  }`}
                >
                  {edgeLabels.top}
                </div>

                {/* Right Edge: Izdahni */}
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[9px] font-bold tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-300 origin-center ${
                    phase === "exhale"
                      ? "text-rose-500 dark:text-rose-400 scale-105 font-extrabold"
                      : "text-[#8E8E93]/40 dark:text-[#EBEBF5]/20"
                  }`}
                >
                  {edgeLabels.right}
                </div>

                {/* Bottom Edge: Zadrzi prazno */}
                <div
                  className={`absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-300 ${
                    phase === "hold2"
                      ? "text-indigo-500 dark:text-indigo-400 scale-105 font-extrabold"
                      : "text-[#8E8E93]/40 dark:text-[#EBEBF5]/20"
                  }`}
                >
                  {edgeLabels.bottom}
                </div>

                {/* Continuous Smooth Glider Dot along the perimeter boundary */}
                <motion.div
                  animate={getDotPosition()}
                  transition={{
                    duration: isActive ? 4.0 : 0.3,
                    ease: "linear"
                  }}
                  className={`absolute w-4.5 h-4.5 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center transition-colors duration-300 ${dotGlowClass}`}
                >
                  <div className="w-2 h-2 bg-white rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] animate-pulse" />
                </motion.div>

                {/* CENTRAL ORGANIC MORPHING BUBBLE - Optimized for smaller size */}
                <motion.div
                  animate={{
                    borderRadius: [
                      "42% 58% 70% 30% / 45% 45% 55% 55%",
                      "70% 30% 52% 48% / 60% 40% 60% 40%",
                      "42% 58% 70% 30% / 45% 45% 55% 55%",
                    ],
                    rotate: [0, 360],
                    scale: getBubbleScale(),
                  }}
                  transition={{
                    borderRadius: {
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    rotate: {
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    },
                    scale: {
                      duration: 1.0,
                      ease: "easeInOut",
                    }
                  }}
                  className={`absolute w-24 h-24 bg-gradient-to-tr transition-colors duration-500 z-10 backdrop-blur-xs ${getBubbleColor()}`}
                />

                {/* FOREGROUND STATIC INFO LABELS - SEPARATE FROM ROTATING SHAPE TO PREVENT ROTATING TEXT */}
                <div className="absolute z-20 flex flex-col items-center justify-center pointer-events-none">
                  {!isActive ? (
                    <Wind className="w-8 h-8 text-slate-400 dark:text-slate-300 animate-pulse" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-black font-mono tracking-tighter tabular-nums text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]">
                        {timeLeft}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIVE STEP DETAILS BANNER - Ultra clear instructions for Nose vs Mouth */}
              {isActive && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 border border-[#007AFF]/10 dark:border-[#0A84FF]/10 rounded-2xl p-3.5 text-center my-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    {phase === "inhale" && (
                      <>
                        <span className="text-xl">👃</span>
                        <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                          {language === "en" ? "Breathe in deeply through your NOSE" : language === "tr" ? "BURUNDAN derin nefes alın" : "Udahnite duboko kroz NOS"}
                        </span>
                      </>
                    )}
                    {phase === "hold1" && (
                      <>
                        <span className="text-xl">⏱️</span>
                        <span className="text-[13px] font-bold text-sky-600 dark:text-sky-400">
                          {language === "en" ? "Hold your breath calmly" : language === "tr" ? "Nefesinizi sakince tutun" : "Zadržite dah u miru"}
                        </span>
                      </>
                    )}
                    {phase === "exhale" && (
                      <>
                        <span className="text-xl">👄</span>
                        <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400">
                          {language === "en" ? "Breathe out slowly through your MOUTH" : language === "tr" ? "AĞIZDAN yavaşça nefes verin" : "Izdahnite polako na USTA"}
                        </span>
                      </>
                    )}
                    {phase === "hold2" && (
                      <>
                        <span className="text-xl">🧘</span>
                        <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">
                          {language === "en" ? "Rest empty before the next cycle" : language === "tr" ? "Diğer döngüden önce boş bekleyin" : "Odmorite pre sledećeg udaha"}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Cycles Indicator - Right above the button with small margin */}
              {isActive && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[12px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 my-2 flex items-center gap-2 bg-[#76768012] dark:bg-white/5 px-4 py-1.5 rounded-full"
                >
                  <span>{t.cycles}:</span>
                  <span className="font-extrabold text-black dark:text-white bg-white dark:bg-[#2C2C2E] px-2.5 py-0.5 rounded-md shadow-xs border border-black/5 dark:border-white/5">
                    {cycles}
                  </span>
                </motion.div>
              )}

              {/* Action Trigger Button - Moved up to prevent scrolling */}
              <div className="w-full mt-2 mb-4">
                {!isActive ? (
                  <button
                    onClick={startBreathing}
                    className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0062CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] text-white font-bold rounded-2xl transition-all active:scale-95 text-[14px] shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-start-breathing"
                  >
                    <Play className="w-4 h-4 fill-white animate-pulse" />
                    <span>{t.start}</span>
                  </button>
                ) : (
                  <button
                    onClick={stopBreathing}
                    className="w-full py-3.5 bg-[#FF3B30] hover:bg-[#E02E24] text-white font-bold rounded-2xl transition-all active:scale-95 text-[14px] shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-stop-breathing"
                  >
                    <Square className="w-4 h-4 fill-white text-white" />
                    <span>{t.stop}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full my-4">
              <NsdrPlayer language={language} />
            </div>
          )}

          {/* Scientific Bio-explanation section - Placed at the bottom to stay out of the way of the start button */}
          <div className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl p-4 border border-black/5 dark:border-white/5 mt-2 text-left shrink-0">
            <div className="flex items-center gap-2 mb-1.5 text-black dark:text-white">
              <Info className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF] shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#007AFF] dark:text-[#0A84FF]">
                {t.scienceTitle}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-[#3A3A3C] dark:text-[#E5E5EA] font-normal">
              {t.scienceDesc}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
