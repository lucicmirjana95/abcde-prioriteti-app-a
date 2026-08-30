import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Clock,
  Settings,
  Headphones,
  Eye,
  Wind,
  Moon
} from "lucide-react";
import { nsdrEngine } from "../lib/audioEngine";
import { safeStorage } from "../lib/safeStorageSetup";

// TTS Speech Synthesis Helper
function speakNsdrPrompt(text: string, lang: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    let matchingVoice: SpeechSynthesisVoice | undefined = undefined;
    
    if (lang === "sr") {
      // Look for Serbian first (sr-RS, sr-SP, sr)
      matchingVoice = voices.find(v => {
        const vl = v.lang.toLowerCase();
        return vl === "sr-rs" || vl === "sr-sp" || vl === "sr" || vl.startsWith("sr");
      });
      
      // Fallback to Croatian (hr) or Bosnian (bs) which sound phonetically identical to Serbian and have natural speech
      if (!matchingVoice) {
        matchingVoice = voices.find(v => {
          const vl = v.lang.toLowerCase();
          return vl === "hr-hr" || vl === "hr" || vl.startsWith("hr");
        });
      }
      if (!matchingVoice) {
        matchingVoice = voices.find(v => {
          const vl = v.lang.toLowerCase();
          return vl === "bs-ba" || vl === "bs" || vl.startsWith("bs");
        });
      }
      if (!matchingVoice) {
        // Fallback to Slovenian (sl) or Bulgarian (bg) as closer phonetic relatives
        matchingVoice = voices.find(v => {
          const vl = v.lang.toLowerCase();
          return vl === "sl-si" || vl === "sl" || vl === "bg-bg" || vl === "bg" || vl.startsWith("sl") || vl.startsWith("bg");
        });
      }
    } else if (lang === "tr") {
      matchingVoice = voices.find(v => {
        const vl = v.lang.toLowerCase();
        return vl === "tr-tr" || vl === "tr" || vl.startsWith("tr");
      });
    } else {
      matchingVoice = voices.find(v => {
        const vl = v.lang.toLowerCase();
        return vl === "en-us" || vl === "en-gb" || vl === "en" || vl.startsWith("en");
      });
    }
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    } else {
      utterance.lang = lang === "sr" ? "sr-RS" : lang === "tr" ? "tr-TR" : "en-US";
    }
    
    utterance.rate = 0.82; // Calming, slow pace
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis failed:", e);
  }
}

interface NsdrPlayerProps {
  language: string;
  isCompact?: boolean;
}

export default function NsdrPlayer({ language, isCompact = false }: NsdrPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(nsdrEngine.getIsPlaying());
  const [volume, setVolume] = useState(nsdrEngine.getVolume());
  const [sessionType, setSessionType] = useState<'theta' | 'delta'>(nsdrEngine.getType());
  const [timerDuration, setTimerDuration] = useState<number>(600); // 10 minutes default
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(() => {
    return safeStorage.getItem("kaizen_nsdr_voice_guide") === "true";
  });

  const lastSpokenRef = useRef<number | null>(null);

  // Pre-load SpeechSynthesis voices for Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      };
    }
  }, []);

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

  // Timer Tick
  useEffect(() => {
    if (!isPlaying || timeLeft === null) return;
    if (timeLeft <= 0) {
      if (voiceGuideEnabled) {
        const endPrompt = language === "sr" 
          ? "Protokol je završen. Kada budete spremni, lagano pomerite prste i otvorite oči. Osećate se osveženo i smireno."
          : language === "tr"
            ? "Protokol tamamlandı. Hazır olduğunuzda parmaklarınızı hafifçe oynatın ve gözlerinizi açın. Yenilenmiş ve huzurlusunuz."
            : "The protocol is complete. When you are ready, gently wiggle your fingers and open your eyes. You are refreshed and calm.";
        speakNsdrPrompt(endPrompt, language);
      }
      nsdrEngine.stop();
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, voiceGuideEnabled, language]);

  // Voice guide prompts scheduling based on elapsed seconds
  useEffect(() => {
    if (!isPlaying || timeLeft === null || !voiceGuideEnabled) {
      if (!isPlaying) {
        lastSpokenRef.current = null;
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
      return;
    }

    const elapsed = timerDuration - timeLeft;
    
    const voicePrompts: { [sec: number]: { sr: string, en: string, tr: string } } = {
      0: {
        sr: "Započinjemo NSDR protokol. Zatvorite oči. Dišite prirodno i osetite kako vam telo postaje lakše i mirnije sa svakim izdahom.",
        en: "We are beginning the NSDR protocol. Gently close your eyes. Breathe naturally and feel your body settle into the surface beneath you.",
        tr: "NSDR protokolüne başlıyoruz. Gözlerinizi hafifçe kapatın. Doğal bir şekilde nefes alın ve bedeninizin gevşediğini hissedin."
      },
      15: {
        sr: "Sada uradite fiziološki uzdah. Udahnite dvaput brzo kroz nos... i onda dugo i polako izdahnite kroz usta. Ponovite ovo nekoliko puta za duboko opuštanje.",
        en: "Let's perform a physiological sigh. Take a double inhale through your nose... followed by a long, slow exhale through your mouth. Repeat.",
        tr: "Şimdi fizyolojik iç çekiş yapın. Burnunuzdan derin ve hızlı iki nefes alın... ve ağzınızdan uzun, yavaş bir nefes verin. Birkaç kez tekrarlayın."
      },
      60: {
        sr: "Usmerite pažnju na svoja stopala. Osetite kako se tabani, prsti i gležnjevi potpuno opuštaju, postajući teški i mirni.",
        en: "Bring your awareness to your feet. Feel your soles, your toes, and your ankles completely relaxing, getting heavy.",
        tr: "Dikkatinizi ayaklarınıza getirin. Tabanlarınızın, parmaklarınızın ve ayak bileklerinizin tamamen gevşediğini ve ağırlaştığını hissedin."
      },
      120: {
        sr: "Sada opustite lice. Otpustite vilicu. Neka vam oči i čelo postanu potpuno mekani, oslobođeni svake napetosti.",
        en: "Now relax your face. Release your jaw. Let your eyes and forehead soften completely, letting go of any micro-tension.",
        tr: "Şimdi yüzünüzü gevşetin. Çenenizi serbest bırakın. Gözleriniz ve alnınız tamamen yumuşasın, tüm mikro gerilimi bırakın."
      },
      180: {
        sr: "Spustite ramena. Osetite ugodnu toplinu i težinu u dlanovima i prstima ruku. Prepustite se gravitaciji i tlu.",
        en: "Drop your shoulders. Feel a warm heaviness in your palms and fingers. Give in to gravity and let yourself go.",
        tr: "Omuzlarınızı düşürün. Avuç içlerinizde ve parmaklarınızda sıcak bir ağırlık hissedin. Kendinizi yerçekimine bırakın."
      },
      240: {
        sr: "Sada otpustite svaku kontrolu nad disanjem i mislima. Dopustite svom umu da pluta u dubokom, lekovitom i regenerativnom odmoru.",
        en: "Release all control over your breath and thoughts. Let your mind drift into deep, healing and restorative rest.",
        tr: "Nefesiniz ve düşünceleriniz üzerindeki tüm kontrolü bırakın. Zihninizin derin, iyileştirici bir dinlenmeye akmasına izin verin."
      },
      400: {
        sr: "Vi ste potpuno bezbedni i mirni. Vaš mozak se obnavlja, a nivo dopamina se vraća u savršenu ravnotežu.",
        en: "You are completely safe and still. Your nervous system is restoring itself, replenishing your baseline dopamine.",
        tr: "Tamamen güvendesiniz. Sinir sisteminiz kendini yeniliyor ve dopamin depolarınız doluyor."
      }
    };

    // Find the closest cue point that we just passed
    const cuePoints = Object.keys(voicePrompts).map(Number).sort((a, b) => b - a);
    const currentCue = cuePoints.find(cue => elapsed >= cue && elapsed < cue + 5);

    if (currentCue !== undefined && lastSpokenRef.current !== currentCue) {
      lastSpokenRef.current = currentCue;
      const activePromptObj = voicePrompts[currentCue];
      const promptText = activePromptObj[language as 'sr' | 'en' | 'tr'] || activePromptObj['en'];
      speakNsdrPrompt(promptText, language);
    }
  }, [isPlaying, timeLeft, voiceGuideEnabled, language, timerDuration]);

  // Persist voice guide settings
  const handleToggleVoiceGuide = () => {
    const nextVal = !voiceGuideEnabled;
    setVoiceGuideEnabled(nextVal);
    safeStorage.setItem("kaizen_nsdr_voice_guide", nextVal ? "true" : "false");
    
    // Test voice right away
    if (nextVal && isPlaying) {
      const testText = language === "sr" ? "Glasovni vodič aktiviran." : language === "tr" ? "Sesli rehber aktif." : "Voice guide activated.";
      speakNsdrPrompt(testText, language);
    }
  };

  const isEn = language === "en";
  const isTr = language === "tr";

  const handleTogglePlay = () => {
    if (isPlaying) {
      nsdrEngine.stop();
      setTimeLeft(null);
    } else {
      nsdrEngine.start(sessionType, volume);
      setTimeLeft(timerDuration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    nsdrEngine.setVolume(newVol);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const elapsed = timeLeft !== null ? timerDuration - timeLeft : 0;
  
  // Calculate current stage
  const stage = elapsed < 60 ? "sigh" : elapsed < 240 ? "scan" : "rest";

  // Translate stage info
  const stagesConfig = {
    en: {
      sigh: {
        title: "Physiological Sighs",
        desc: "Double-inhale through your nose, then release with a long, slow sigh out the mouth.",
        label: "Breath Cycle"
      },
      scan: {
        title: "Somatic Body Scan",
        desc: "Scan down your body. Release tension from your feet, face, jaw, hands, and shoulders.",
        label: "Mental Scan"
      },
      rest: {
        title: "Deep Integration",
        desc: "Your nervous system is in a deep restorative state. Let your mind float with zero effort.",
        label: "Pure Rest"
      }
    },
    sr: {
      sigh: {
        title: "Fiziološki uzdasi",
        desc: "Udahnite dvaput brzo kroz nos, zatim otpustite dugim, sporim uzdahom kroz usta.",
        label: "Ciklus disanja"
      },
      scan: {
        title: "Skeniranje tela",
        desc: "Mentalno prođite kroz svoje telo. Opustite stopala, lice, vilicu, šake i ramena.",
        label: "Mentalni fokus"
      },
      rest: {
        title: "Duboka integracija",
        desc: "Vaš nervni sistem je u stanju dubokog oporavka. Pustite um da pluta u tišini.",
        label: "Potpuni odmor"
      }
    },
    tr: {
      sigh: {
        title: "Fizyolojik İç Çekiş",
        desc: "Burnunuzdan iki kez hızlıca nefes alın, ardından ağzınızdan uzun ve yavaş bir nefesle bırakın.",
        label: "Nefes Döngüsü"
      },
      scan: {
        title: "Beden Taraması",
        desc: "Zihinsel olarak bedeninizi tarayın. Ayaklarınızdaki, çenenizdeki ve omuzlarınızdaki tüm gerilimi bırakın.",
        label: "Zihinsel Odak"
      },
      rest: {
        title: "Derin Dinlenme",
        desc: "Sinir sisteminiz derin bir yenilenme evresinde. Sıfır çaba ile zihninizi dingin bir boşluğa bırakın.",
        label: "Saf Dinlenme"
      }
    }
  };

  const currentStageInfo = (stagesConfig[language as 'sr' | 'en' | 'tr'] || stagesConfig.en)[stage as 'sigh' | 'scan' | 'rest'];

  // Calculate sub-phase of physiological sigh (10 second loop: 4s inhale, 1.5s hold/top-off, 4.5s exhale)
  const subSec = elapsed % 10;
  const sighSubPhase = subSec < 4 
    ? (language === "sr" ? "Udisaj kroz nos..." : language === "tr" ? "Burundan nefes al..." : "Inhale through nose...") 
    : subSec < 5.5 
      ? (language === "sr" ? "Dodatni brzi udah!" : language === "tr" ? "Bir kez daha çek!" : "Quick top-off inhale!") 
      : (language === "sr" ? "Dugi uzdah olakšanja..." : language === "tr" ? "Uzun ve rahat iç çekiş..." : "Long sighing exhale...");

  // Translations
  const t = {
    title: isEn ? "NSDR Huberman Protocol" : isTr ? "NSDR Huberman Protokolü" : "NSDR Huberman Protokol",
    subtitle: isEn
      ? "Non-Sleep Deep Rest (Binaural Drone)"
      : isTr
        ? "Uykusuz Derin Dinlenme (Binaural Akış)"
        : "Duboki odmor bez spavanja (Binauralni talasi)",
    startBtn: isEn ? "Start Protocol" : isTr ? "Protokolü Başlat" : "Pokreni Protokol",
    stopBtn: isEn ? "Pause Rest" : isTr ? "Pauziraj Odmor" : "Pauziraj Odmor",
    volumeLabel: isEn ? "Intensity" : isTr ? "Yoğunluk" : "Intenzitet zvuka",
    scientificTip: isEn
      ? "NSDR reduces anxiety, accelerates motor learning, and can replenish dopamine levels in the brain by up to 60% with zero effort."
      : isTr
        ? "NSDR stresi azaltır, motor öğrenmeyi hızlandırır ve sıfır eforla beyindeki dopamin seviyelerini %60'a kadar geri kazandırır."
        : "NSDR smanjuje anksioznost, ubrzava motoričko učenje i podiže nivo dopamina u mozgu do 60% bez ikakvog napora.",
    voiceGuide: isEn ? "Guided Voice Over" : isTr ? "Sesli Rehber" : "Glasovni vodič",
    headphonesAdvice: isEn ? "Use headphones for full binaural benefit" : isTr ? "Tam binaural etki için kulaklık takın" : "Koristite slušalice za pun binauralni efekat"
  };

  if (isCompact) {
    return (
      <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF]">
              <Brain className={`w-5 h-5 ${isPlaying ? "animate-pulse" : ""}`} />
            </div>
            <div className="text-left">
              <h5 className="text-xs font-bold text-black dark:text-white leading-tight">NSDR Protocol</h5>
              <p className="text-[10px] text-[#8E8E93] leading-none mt-0.5">
                {isPlaying ? currentStageInfo.title : (sessionType === "theta" ? "Theta Focus (4Hz)" : "Delta Sleep (2Hz)")}
              </p>
            </div>
          </div>

          <button
            onClick={handleTogglePlay}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 ${
              isPlaying
                ? "bg-[#FF3B30] text-white hover:bg-[#FF453A]"
                : "bg-[#007AFF] text-white hover:bg-[#0062CC]"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? "Stop" : "Start"}</span>
          </button>
        </div>

        {isPlaying && timeLeft !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 px-2.5 py-1.5 rounded-lg border border-black/[0.02] dark:border-white/[0.02]">
              <span className="font-semibold">{isEn ? "Time Remaining" : isTr ? "Kalan Süre" : "Preostalo vreme"}</span>
              <span className="font-bold">{formatTime(timeLeft)}</span>
            </div>
            
            {/* Minimal Stage Visual in Compact */}
            <div className="p-2 rounded-lg bg-white/50 dark:bg-[#1C1C1E]/50 border border-black/[0.03] dark:border-white/[0.03] text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">{currentStageInfo.label}</span>
                {stage === "sigh" && (
                  <span className="text-[9px] font-bold text-[#30D158] animate-pulse">{sighSubPhase}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-tight mt-0.5 truncate">{currentStageInfo.desc}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-[#1C1C1E]/40 p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
            <Brain className={`w-6 h-6 ${isPlaying ? "animate-pulse text-[#30D158]" : ""}`} />
          </div>
          <div className="text-left">
            <h4 className="text-[16px] font-bold tracking-tight text-black dark:text-white leading-tight">
              {t.title}
            </h4>
            <p className="text-xs text-[#8E8E93] mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 rounded-xl text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title={isEn ? "Settings" : isTr ? "Ayarlar" : "Podešavanja"}
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Settings / Configuration Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-black/5 dark:border-white/5 pb-4 space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <button
                onClick={() => {
                  setSessionType("theta");
                  nsdrEngine.setType("theta");
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  sessionType === "theta"
                    ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]"
                    : "border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1">Theta Mode</div>
                <div className="text-xs font-semibold">{isEn ? "Focus & Recall" : isTr ? "Odak ve Yenilenme" : "Fokus i Oporavak"}</div>
              </button>

              <button
                onClick={() => {
                  setSessionType("delta");
                  nsdrEngine.setType("delta");
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  sessionType === "delta"
                    ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]"
                    : "border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1">Delta Mode</div>
                <div className="text-xs font-semibold">{isEn ? "Slow-wave Rest" : isTr ? "Derin Uyku Hazırlığı" : "Duboki Odmor"}</div>
              </button>
            </div>

            {/* Timer Presets */}
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider block">
                {isEn ? "Timer Preset" : isTr ? "Süre Seçimi" : "Dužina trajanja"}
              </span>
              <div className="flex gap-2">
                {[300, 600, 900, 1200].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => {
                      setTimerDuration(dur);
                      if (isPlaying) setTimeLeft(dur);
                    }}
                    className={`flex-1 py-1.5 text-xs rounded-xl border font-mono font-semibold ${
                      timerDuration === dur
                        ? "bg-[#007AFF] text-white border-transparent"
                        : "border-black/5 dark:border-white/5 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {dur / 60}m
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVE SOMATIC GUIDANCE SUITE */}
      <AnimatePresence mode="wait">
        {isPlaying && (
          <motion.div
            key="somatic-suite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] space-y-4"
          >
            {/* Header Stage Selector Indicator */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-[#8E8E93] dark:text-[#EBEBF5]/60">
                {currentStageInfo.label}
              </span>
              
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeLeft ?? 0)}</span>
              </div>
            </div>

            {/* Breathing Circle Simulator & Stage graphics */}
            <div className="flex flex-col items-center justify-center py-4 bg-white/40 dark:bg-black/10 rounded-2xl border border-black/[0.02] dark:border-white/[0.02] relative overflow-hidden">
              <div className="w-28 h-28 flex items-center justify-center relative">
                {/* Glowing breathing rings */}
                <motion.div
                  className="absolute w-12 h-12 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/25 blur-xs"
                  animate={{
                    scale: stage === "sigh" 
                      ? (subSec < 4 ? [1, 1.8] : subSec < 5.5 ? [1.8, 2.1] : [2.1, 1]) 
                      : [1, 1.3, 1],
                  }}
                  transition={{
                    duration: stage === "sigh" ? (subSec < 4 ? 4 : subSec < 5.5 ? 1.5 : 4.5) : 6,
                    ease: "easeInOut",
                    repeat: stage === "sigh" ? 0 : Infinity
                  }}
                />
                
                <motion.div
                  className="absolute w-20 h-20 rounded-full border border-[#007AFF]/15 dark:border-[#0A84FF]/20"
                  animate={{
                    scale: stage === "sigh" 
                      ? (subSec < 4 ? [1, 2.1] : subSec < 5.5 ? [2.1, 2.3] : [2.3, 1]) 
                      : [1, 1.4, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: stage === "sigh" ? (subSec < 4 ? 4 : subSec < 5.5 ? 1.5 : 4.5) : 6,
                    ease: "easeInOut",
                    repeat: stage === "sigh" ? 0 : Infinity
                  }}
                />

                {/* Core solid icon */}
                <div className="w-11 h-11 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg text-white z-10">
                  {stage === "sigh" ? <Wind className="w-5 h-5 animate-pulse" /> : stage === "scan" ? <Brain className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </div>
              </div>

              {/* In-app Sub-phase instruction overlay */}
              <div className="text-center mt-3.5 max-w-xs px-4">
                <h6 className="text-xs font-bold text-black dark:text-white tracking-tight">
                  {stage === "sigh" ? sighSubPhase : currentStageInfo.title}
                </h6>
                <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-1">
                  {currentStageInfo.desc}
                </p>
              </div>
            </div>

            {/* Voice Over Controller Row (Apple Switch layout) */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/50 dark:bg-black/20 border border-black/[0.03] dark:border-white/[0.03]">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-[#30D158]/10 text-[#30D158]">
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-bold text-black dark:text-white block leading-tight">
                    {t.voiceGuide}
                  </span>
                  <span className="text-[9px] text-[#8E8E93] block mt-0.5">
                    {language === "sr" ? "Uključite za predivni glasovni vodič" : language === "tr" ? "Mükemmel sesli rehberlik" : "Comforting guidance in your language"}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleToggleVoiceGuide}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative flex items-center shrink-0 ${
                  voiceGuideEnabled ? "bg-[#30D158]" : "bg-black/15 dark:bg-white/15"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    voiceGuideEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            
            {/* Starry headphone advice */}
            <div className="text-[10px] text-[#8E8E93] flex items-center justify-center gap-1.5 font-semibold">
              <Headphones className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>{t.headphonesAdvice}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Play Action Button & Time Left */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={handleTogglePlay}
          className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 ${
            isPlaying
              ? "bg-[#FF3B30] hover:bg-[#FF453A] text-white shadow-lg shadow-[#FF3B30]/10"
              : "bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-lg shadow-[#007AFF]/10"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>{t.stopBtn}</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>{t.startBtn}</span>
            </>
          )}
        </button>

        {!isPlaying && (
          <div className="w-full sm:w-auto px-4 py-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5 font-mono text-sm font-bold text-black dark:text-white shrink-0 justify-center">
            <Clock className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF]" />
            <span>{timerDuration / 60}:00</span>
          </div>
        )}
      </div>

      {/* Volume Intensity Slider */}
      <div className="space-y-1.5 text-left">
        <div className="flex items-center justify-between text-xs text-[#8E8E93] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-[#30D158]" />
            {t.volumeLabel}
          </span>
          <span>{Math.round(volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const newVol = volume > 0 ? 0 : 0.4;
              setVolume(newVol);
              nsdrEngine.setVolume(newVol);
            }}
            className="text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors"
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
            className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
          />
        </div>
      </div>

      {/* Scientific/Educational Fact Box */}
      <div className="p-3.5 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 text-[11px] leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-start gap-2.5 text-left">
        <Info className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF] shrink-0 mt-0.5" />
        <p>{t.scientificTip}</p>
      </div>
    </div>
  );
}
