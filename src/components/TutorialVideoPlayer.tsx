import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Tv, 
  Subtitles, 
  Sparkles, 
  Battery, 
  CheckCircle, 
  Zap, 
  Flame, 
  User, 
  Compass, 
  HelpCircle,
  HelpCircle as HelpIcon,
  ChevronRight
} from "lucide-react";
const playPetChime = (sound: string) => {
  // Simple sound player helper
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (sound === "click") {
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (sound === "hatch") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio Context blocked or unsupported
  }
};

interface TutorialVideoPlayerProps {
  language: "sr" | "en" | "tr";
  onClose?: () => void;
}

interface Scene {
  start: number;
  end: number;
  title: { en: string; sr: string; tr: string };
  subtitle: { en: string; sr: string; tr: string };
}

export default function TutorialVideoPlayer({ language, onClose }: TutorialVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  
  const videoDuration = 80; // 1 minute 20 seconds total length
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const scenes: Scene[] = [
    {
      start: 0,
      end: 20,
      title: {
        en: "1. Write down your chores! (Brain Dump) 🧠",
        sr: "1. Upiši sve obaveze u kutiju! 🧠",
        tr: "1. Yapacaklarını buraya yaz! 🧠"
      },
      subtitle: {
        en: "First, perform a cognitive Brain Dump. Writing down thoughts clears working memory, while Omni structures inputs into priorities.",
        sr: "Prvo uradi kognitivno zapisivanje (Brain Dump). Pisanje oslobađa radnu memoriju, dok Omni automatski raspoređuje prioritete.",
        tr: "Önce zihinsel bir boşaltma yapın. Yazmak çalışan belleği rahatlatırken, Omni işleri önceliklerine göre yapılandırır."
      }
    },
    {
      start: 20,
      end: 40,
      title: {
        en: "2. Set your battery and mood! 🔋",
        sr: "2. Podesi bateriju i raspoloženje! 🔋",
        tr: "2. Pilini ve neşeni ayarla! 🔋"
      },
      subtitle: {
        en: "Calibrate your energy battery. Aligning duties with your nervous system prevents exhaustion and procrastination cycles.",
        sr: "Kalibriši bateriju energije. Usklađivanje obaveza sa tvojim nervnim sistemom sprečava iscrpljenost i prokrastinaciju.",
        tr: "Enerji pilinizi ayarlayın. İşleri sinir sisteminizle uyumlu hale getirmek, tükenmişliği ve erteleme döngülerini önler."
      }
    },
    {
      start: 40,
      end: 60,
      title: {
        en: "3. Do tasks and win gold! 📋",
        sr: "3. Radi zadatke i uzmi zlatnike! 📋",
        tr: "3. İşleri yap ve altın kazan! 📋"
      },
      subtitle: {
        en: "Click the circle when you finish a task to win shiny gold coins. Tasks are sorted nicely from A to E!",
        sr: "Klikni na kružić pored završenog zadatka da osvojiš zlatne novčiće. Zadaci su poređani od A do E!",
        tr: "Bir işi bitirdiğinde daireye tıkla ve altın kazan. Görevlerin A'dan E'ye kadar sıralanmıştır!"
      }
    },
    {
      start: 60,
      end: 80,
      title: {
        en: "4. Access the Discovery Lab! 🔮",
        sr: "4. Otvori Discovery Lab! 🔮",
        tr: "4. Keşif Laboratuvarına Erişin! 🔮"
      },
      subtitle: {
        en: "As you work, unlock premium workspace themes, custom views, adaptive AI coaching styles, and relaxing ambient sounds!",
        sr: "Tokom rada otključavaj premium teme radnog prostora, nove kognitivne stilove AI asistenta i relaksirajuće pozadinske zvukove!",
        tr: "Çalışırken birinci sınıf çalışma alanı temalarının, özel görünümlerin, uyarlanabilir yapay zeka koçluk stillerinin ve rahatlatıcı ortam seslerinin kilidini açın!"
      }
    }
  ];

  // Auto-play progress loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 100 / playbackSpeed;
      progressInterval.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= videoDuration) {
            // Loop or stop
            setIsPlaying(false);
            if (!isMuted) playPetChime("hatch");
            return 0;
          }
          return prev + 0.1;
        });
      }, intervalMs);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, playbackSpeed, isMuted]);

  // Sync active scene based on currentTime
  useEffect(() => {
    const activeIdx = scenes.findIndex(s => currentTime >= s.start && currentTime < s.end);
    if (activeIdx !== -1 && activeIdx !== activeSceneIndex) {
      setActiveSceneIndex(activeIdx);
      if (!isMuted) {
        playPetChime("click");
      }
    }
  }, [currentTime]);

  const activeScene = scenes[activeSceneIndex];

  // Formatting helpers
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handlePlayToggle = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (!isMuted) {
      playPetChime("click");
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const handleSpeedToggle = () => {
    const speeds: (1 | 1.5 | 2)[] = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
    if (!isMuted) playPetChime("click");
  };

  return (
    <div className="w-full bg-[#1C1C1E] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col font-sans select-none">
      {/* Video Title Header */}
      <div className="px-5 py-3.5 bg-black/40 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase">
            {language === "en" ? "Interactive Video Tutorial" : language === "tr" ? "Etkileşimli Video Kılavuzu" : "Interaktivni Video Vodič"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded font-mono text-white/70">
            SOPHIA AI NARRATOR: {isMuted ? "MUTED" : "ACTIVE"}
          </span>
        </div>
      </div>

      {/* Main Video Viewport Screen */}
      <div className="relative aspect-video bg-[#0C0C0E] overflow-hidden flex flex-col justify-between p-6 group">
        
        {/* Subtle Ambient Vignette & Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,rgba(0,0,0,0.4)_100%)] z-10" />

        {/* Dynamic Interactive Presentation Scenes */}
        <div className="flex-1 w-full flex items-center justify-center relative z-20">
          <AnimatePresence mode="wait">
            
            {/* SCENE 1: SOMATIC ENERGY & WELCOME */}
            {activeSceneIndex === 0 && (
              <motion.div
                key="scene0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                {/* Visual Battery Simulator */}
                <div className="relative w-44 h-24 border-4 border-emerald-400/30 rounded-2xl flex items-center p-1.5 justify-start bg-black/20">
                  <motion.div 
                    className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 relative overflow-hidden"
                    animate={{ 
                      width: ["30%", "85%", "30%"],
                      backgroundColor: ["#f43f5e", "#10b981", "#f43f5e"]
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="absolute inset-0 bg-white/20 skew-x-12 animate-pulse" />
                  </motion.div>
                  {/* Battery Cap */}
                  <div className="absolute -right-3.5 w-2.5 h-10 bg-emerald-400/40 rounded-r-md" />

                  {/* Floating Percentage Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span 
                      className="text-lg font-bold font-mono tracking-tight text-white drop-shadow-md text-center px-2"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {language === "en" ? "MY BATTERY" : language === "tr" ? "BENİM PİLİM" : "MOJA BATERIJA"}
                    </motion.span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === "en" ? "How do you feel today?" : language === "tr" ? "Bugün nasıl hissediyorsun?" : "Kako se osećaš danas?"}</span>
                </div>
              </motion.div>
            )}

            {/* SCENE 2: THE BRAIN DUMP & AUTO CATEGORIZING */}
            {activeSceneIndex === 1 && (
              <motion.div
                key="scene1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full h-full flex flex-col justify-center space-y-4 px-6"
              >
                {/* Simulated Mind Input Field */}
                <div className="w-full bg-[#18181B] border border-white/10 rounded-2xl p-4 shadow-inner">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">
                    ✍️ {language === "en" ? "WRITE EVERYTHING HERE" : language === "tr" ? "HER ŞEYİ BURAYA YAZ" : "ZAPIŠI SVE OVDE"}
                  </span>
                  <div className="text-sm font-mono text-white/90 border-r-2 border-white/60 w-fit pr-1 animate-typing overflow-hidden whitespace-nowrap">
                    {language === "en" 
                      ? "Do homework (A), buy milk (C), watch cartoon (E)" 
                      : language === "tr"
                      ? "Ödev yap (A), süt al (C), çizgi film izle (E)"
                      : "Uradi domaći (A), kupi mleko (C), gledaj crtani (E)"}
                  </div>
                </div>

                {/* Flying / Sorting Animation Demo */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-center"
                  >
                    <span className="text-[10px] font-bold text-rose-400 block">{language === "en" ? "A - SUPER IMPORTANT" : language === "tr" ? "A - ÇOK ÖNEMLİ" : "A - BAŠ VAŽNO"}</span>
                    <span className="text-xs font-semibold text-white truncate block">{language === "en" ? "Do homework" : language === "tr" ? "Ödev yap" : "Uradi domaći"}</span>
                  </motion.div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center"
                  >
                    <span className="text-[10px] font-bold text-amber-400 block">{language === "en" ? "C - CAN WAIT" : language === "tr" ? "C - BEKLEYEBİLİR" : "C - MOŽE KASNIJE"}</span>
                    <span className="text-xs font-semibold text-white truncate block">{language === "en" ? "Buy milk" : language === "tr" ? "Süt al" : "Kupi mleko"}</span>
                  </motion.div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 3 }}
                    className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-2.5 text-center"
                  >
                    <span className="text-[10px] font-bold text-indigo-400 block">{language === "en" ? "E - IF I WANT" : language === "tr" ? "E - İSTERSEM" : "E - AKO STIGNEM"}</span>
                    <span className="text-xs font-semibold text-white truncate block">{language === "en" ? "Watch cartoon" : language === "tr" ? "Çizgi film" : "Gledaj crtani"}</span>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* SCENE 3: PARETO 80/20 ANALYSIS */}
            {activeSceneIndex === 2 && (
              <motion.div
                key="scene2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full h-full flex flex-col justify-center items-center space-y-4"
              >
                {/* Pareto Chart Simulator */}
                <div className="w-72 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      {language === "en" ? "EASY & IMPORTANT TASKS" : language === "tr" ? "EN KOLAY VE ÖNEMLİLER" : "NAJLAKŠE I NAJVAŽNIJE STVARI"}
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      ⭐ SUPER STAR
                    </span>
                  </div>

                  {/* Horizontal Bar Chart Representation */}
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-white/70">
                        <span>🚀 {language === "en" ? "Learn magic trick" : language === "tr" ? "Sihirbazlık öğren" : "Nauči magični trik"}</span>
                        <span className="font-bold text-emerald-400">{language === "en" ? "Huge Success!" : language === "tr" ? "Büyük Başarı!" : "Veliki uspeh!"}</span>
                      </div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-white/50">
                        <span>💬 {language === "en" ? "Tidy up toys" : language === "tr" ? "Oyuncakları topla" : "Skloni igračke"}</span>
                        <span className="font-medium text-white/50">{language === "en" ? "Boring!" : language === "tr" ? "Sıkıcı!" : "Dosadno!"}</span>
                      </div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gray-600" 
                          initial={{ width: "0%" }}
                          animate={{ width: "15%" }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Cursor clicking "Add to Board" */}
                <div className="relative">
                  <div className="px-3.5 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>{language === "en" ? "SEND TO BOARD ➔" : language === "tr" ? "PANOSUNA GÖNDER ➔" : "POŠALJI NA TABLU ➔"}</span>
                  </div>
                  {/* Neon Cursor simulation */}
                  <motion.div
                    className="absolute w-5 h-5 bg-cyan-400 rounded-full border border-white filter blur-[2px] opacity-70"
                    animate={{
                      x: [50, 0, 50],
                      y: [40, 0, 40],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ pointerEvents: "none" }}
                  />
                </div>
              </motion.div>
            )}

            {/* SCENE 4: GAMEPLAY / COGNITIVE EVOLUTION */}
            {activeSceneIndex === 3 && (
              <motion.div
                key="scene3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full h-full flex flex-col justify-center items-center space-y-4"
              >
                {/* Visual Pet Avatar growing dynamically */}
                <div className="relative flex items-center justify-center p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20 w-32 h-32">
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 0.95, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 flex items-center justify-center"
                  >
                    {/* Simplified cute vector representations depending on timeline */}
                    {currentTime < 65 ? (
                      /* CLASSIC CANVAS stage */
                      <svg viewBox="0 0 100 80" className="w-24 h-20">
                        <rect x="5" y="5" width="90" height="70" rx="6" fill="#F4F4F4" stroke="#CCCCCC" strokeWidth="2.5" />
                        <rect x="15" y="15" width="70" height="15" rx="3" fill="#EAEAEA" />
                        <circle cx="25" cy="45" r="8" fill="#D2D2D2" />
                        <rect x="40" y="41" width="45" height="8" rx="2.5" fill="#D2D2D2" />
                      </svg>
                    ) : currentTime < 72 ? (
                      /* LAVENDER MOOD Stage */
                      <svg viewBox="0 0 100 80" className="w-24 h-20">
                        <rect x="5" y="5" width="90" height="70" rx="6" fill="#F3E5F5" stroke="#AB47BC" strokeWidth="2.5" />
                        <rect x="15" y="15" width="70" height="15" rx="3" fill="#E1BEE7" />
                        <circle cx="25" cy="45" r="8" fill="#CE93D8" />
                        <rect x="40" y="41" width="45" height="8" rx="2.5" fill="#CE93D8" />
                      </svg>
                    ) : (
                      /* MIDNIGHT PRESTIGE Stage */
                      <svg viewBox="0 0 100 80" className="w-24 h-20">
                        <rect x="5" y="5" width="90" height="70" rx="6" fill="#0A0A0C" stroke="#007AFF" strokeWidth="2.5" />
                        <rect x="15" y="15" width="70" height="15" rx="3" fill="#1C1C1E" />
                        <circle cx="25" cy="45" r="8" fill="#0A84FF" />
                        <rect x="40" y="41" width="45" height="8" rx="2.5" fill="#0A84FF" />
                      </svg>
                    )}
                  </motion.div>
                  
                  {/* Floating magic dust */}
                  <motion.div 
                    className="absolute w-2 h-2 rounded-full bg-yellow-400"
                    animate={{ y: [-10, -40], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ left: "20%", bottom: "20%" }}
                  />
                  <motion.div 
                    className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300"
                    animate={{ y: [-15, -45], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    style={{ right: "20%", bottom: "30%" }}
                  />
                </div>

                <div className="flex gap-2">
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                    COINS +25
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full">
                    XP +50
                  </span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Real-time Subtitles / Video Captions Overlay */}
        {showCaptions && activeScene && (
          <div className="absolute bottom-16 left-6 right-6 bg-black/75 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center min-h-[56px] flex items-center justify-center z-30">
            <p className="text-[13px] leading-snug font-medium text-white/95">
              {language === "en" ? activeScene.subtitle.en : language === "tr" ? activeScene.subtitle.tr : activeScene.subtitle.sr}
            </p>
          </div>
        )}

        {/* Hover-reveal Overlay Play Button if Paused */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-25">
            <button
              onClick={handlePlayToggle}
              className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Play className="w-8 h-8 fill-white translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Video Control Player Bar */}
      <div className="px-5 py-4 bg-black/60 border-t border-white/5 flex flex-col gap-3">
        {/* Timeline Slider Track */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-mono text-white/60 w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={videoDuration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
          />
          <span className="text-xs font-mono text-white/60 w-8 text-left">
            {formatTime(videoDuration)}
          </span>
        </div>

        {/* Playback Button Actions & Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayToggle}
              className="text-white hover:text-rose-400 transition-colors p-1"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Reset Video button */}
            <button
              onClick={() => {
                setCurrentTime(0);
                if (!isMuted) playPetChime("click");
              }}
              className="text-white/60 hover:text-white transition-colors p-1"
              title="Replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/60 hover:text-white transition-colors p-1"
              title={isMuted ? "Unmute Omni narrator" : "Mute Omni narrator"}
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Right Controls: CC, Speed, and Close */}
          <div className="flex items-center gap-3">
            {/* Speed Toggle */}
            <button
              onClick={handleSpeedToggle}
              className="text-xs font-mono bg-white/10 hover:bg-white/20 px-2 py-1 rounded font-bold transition-all text-white/90"
              title="Playback speed"
            >
              {playbackSpeed === 1 ? "1.0x" : playbackSpeed === 1.5 ? "1.5x" : "2.0x"}
            </button>

            {/* Captions Toggle */}
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`p-1 transition-colors ${showCaptions ? "text-rose-400" : "text-white/40 hover:text-white"}`}
              title="Subtitles / Captions"
            >
              <Subtitles className="w-4.5 h-4.5" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 hover:text-white rounded-lg text-xs font-bold transition-all text-white/85 flex items-center gap-1"
              >
                <span>{language === "en" ? "Exit Guide" : "Zatvori vodič"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
