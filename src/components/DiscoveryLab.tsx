import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getDiscoveryStats, 
  getUnlockItems, 
  getDiscoverySettings, 
  updateDiscoverySetting, 
  subscribeToDiscovery,
  triggerDiscoveryEvent
} from "../lib/discoveryEngine";
import { playInteractionSound } from "../lib/audioEngine";
import { UnlockItem, UserDiscoverySettings } from "../types";
import { 
  Sparkles, 
  Trophy, 
  Compass, 
  Layers, 
  Settings, 
  Lock, 
  Unlock, 
  Check, 
  ArrowRight, 
  Brain, 
  CheckSquare, 
  Volume2, 
  Flame, 
  Activity, 
  Zap, 
  Clock, 
  Moon, 
  Sun,
  LayoutGrid,
  ChevronRight,
  Info,
  Headphones,
  Sliders,
  RotateCw,
  Award,
  BookOpen,
  VolumeX,
  Play,
  Square,
  MessageSquare,
  Send,
  ShieldAlert,
  Heart
} from "lucide-react";

interface DiscoveryLabProps {
  language: "en" | "tr" | "sr";
  isEvening?: boolean;
  onPreviewStart?: () => void;
}

export const DiscoveryLab: React.FC<DiscoveryLabProps> = ({ language, isEvening, onPreviewStart }) => {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "progress" | "unlocked" | "moments" | "settings">("overview");
  const [stats, setStats] = useState(getDiscoveryStats());
  const [items, setItems] = useState<UnlockItem[]>(getUnlockItems());
  const [settings, setSettings] = useState<UserDiscoverySettings>(getDiscoverySettings());
  
  // Interactive Filters & Local UX States
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  
  // 3D Hover tilt state for milestone badges
  const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null);
  const [tiltStyle, setTiltStyle] = useState<{ transform: string }>({ transform: "rotateX(0deg) rotateY(0deg)" });
  
  // Selected milestone for detail modal
  const [selectedMilestone, setSelectedMilestone] = useState<UnlockItem | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  // Real-time Soundscape Live Mixer State & Refs
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<any[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cracklingIntervalRef = useRef<any>(null);
  const libraryIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // AI Mentor Briefing State
  const [selectedMentor, setSelectedMentor] = useState<string>("default");
  const [coachingMessage, setCoachingMessage] = useState<string | null>(null);
  const [isGeneratingCoaching, setIsGeneratingCoaching] = useState(false);
  const [typingEffectText, setTypingEffectText] = useState("");
  const typingIntervalRef = useRef<any>(null);

  // Interactive Sandbox Particle Play Area State
  const [sandboxAnimation, setSandboxAnimation] = useState<string>("default");
  const [sandboxParticles, setSandboxParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    // Subscribe to discovery engine updates to keep states in sync
    const unsubscribe = subscribeToDiscovery(() => {
      setStats(getDiscoveryStats());
      setItems(getUnlockItems());
      setSettings(getDiscoverySettings());
    });
    
    // Auto-sync initial ambient state if already running somewhere
    if (getDiscoverySettings().activeAmbient !== "none") {
      setIsAmbientPlaying(true);
    }

    return () => {
      unsubscribe();
      stopAudioEngine();
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  // Monitor settings for ambient change (e.g. if updated from outside or inside)
  useEffect(() => {
    if (isAmbientPlaying && settings.activeAmbient !== "none") {
      startAudioEngine(settings.activeAmbient, ambientVolume);
    } else if (settings.activeAmbient === "none") {
      stopAudioEngine();
      setIsAmbientPlaying(false);
    }
  }, [settings.activeAmbient]);

  // Adjust volume dynamically
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(ambientVolume * 0.15, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  // Web Audio API Ambient Sound Synthesizer
  const startAudioEngine = (ambientType: string, volume: number) => {
    stopAudioEngine(); // prevent overlapping instances

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime); // moderate safe amplitude
      gainNodeRef.current = masterGain;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      const activeNodes: any[] = [];

      if (ambientType === "rain") {
        // High-fidelity lowpass and bandpass filtered white noise for warm, cozy rain
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.setValueAtTime(650, ctx.currentTime);

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.setValueAtTime(320, ctx.currentTime);
        bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

        whiteNoise.connect(lowpass);
        lowpass.connect(bandpass);
        bandpass.connect(masterGain);

        whiteNoise.start();
        activeNodes.push(whiteNoise);
      } 
      else if (ambientType === "space") {
        // 40Hz Gamma Binaural Deep Space hum for raw focus (Left: 140Hz, Right: 180Hz)
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);

        oscL.type = "sine";
        oscL.frequency.setValueAtTime(140, ctx.currentTime);

        oscR.type = "sine";
        oscR.frequency.setValueAtTime(180, ctx.currentTime);

        const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        if (pannerL && pannerR) {
          pannerL.pan.setValueAtTime(-1, ctx.currentTime);
          pannerR.pan.setValueAtTime(1, ctx.currentTime);
          oscL.connect(pannerL);
          oscR.connect(pannerR);
          pannerL.connect(masterGain);
          pannerR.connect(masterGain);
        } else {
          oscL.connect(masterGain);
          oscR.connect(masterGain);
        }

        // Swooping modulator to mimic galactic solar wind
        const modulator = ctx.createOscillator();
        const modulatorGain = ctx.createGain();
        modulator.type = "sine";
        modulator.frequency.setValueAtTime(0.08, ctx.currentTime); // 12 seconds per sweep
        modulatorGain.gain.setValueAtTime(0.04, ctx.currentTime);

        modulator.connect(modulatorGain);
        modulatorGain.connect(masterGain.gain);

        modulator.start();
        oscL.start();
        oscR.start();

        activeNodes.push(oscL, oscR, modulator);
      } 
      else if (ambientType === "fireplace") {
        // Organic Brown noise + real-time stochastic crackles
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.015 * white)) / 1.015;
          lastOut = output[i];
          output[i] *= 3.8;
        }
        const brownNoise = ctx.createBufferSource();
        brownNoise.buffer = noiseBuffer;
        brownNoise.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.setValueAtTime(220, ctx.currentTime);

        brownNoise.connect(lowpass);
        lowpass.connect(masterGain);

        brownNoise.start();
        activeNodes.push(brownNoise);

        // Crackling stochastic scheduler (mimics wooden fire crackles)
        cracklingIntervalRef.current = setInterval(() => {
          if (Math.random() > 0.45) {
            triggerCrack(ctx, masterGain);
          }
        }, 320);
      } 
      else if (ambientType === "library") {
        // Soft room rumble + periodic mechanical keystrokes & paper turns
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.01 * white)) / 1.01;
          lastOut = output[i];
          output[i] *= 1.8;
        }
        const libraryAir = ctx.createBufferSource();
        libraryAir.buffer = noiseBuffer;
        libraryAir.loop = true;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.setValueAtTime(180, ctx.currentTime);
        bandpass.Q.setValueAtTime(0.4, ctx.currentTime);

        libraryAir.connect(bandpass);
        bandpass.connect(masterGain);

        libraryAir.start();
        activeNodes.push(libraryAir);

        // Library actions scheduler
        libraryIntervalRef.current = setInterval(() => {
          if (Math.random() > 0.65) {
            triggerLibrarySounds(ctx, masterGain);
          }
        }, 1200);
      }

      sourceNodeRef.current = activeNodes;
      drawVisualizer();
    } catch (err) {
      console.warn("Failed to boot custom Web Audio synthesizer:", err);
    }
  };

  const triggerCrack = (ctx: AudioContext, destination: AudioNode) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(900 + Math.random() * 1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.06 + Math.random() * 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.008 + Math.random() * 0.012);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } catch (e) {}
  };

  const triggerLibrarySounds = (ctx: AudioContext, destination: AudioNode) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(destination);

      const r = Math.random();
      if (r < 0.35) {
        // Page turn
        osc.type = "sine";
        osc.frequency.setValueAtTime(75, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (r < 0.75) {
        // Soft keyboard tap
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1100 + Math.random() * 300, ctx.currentTime);
        gain.gain.setValueAtTime(0.025, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
        osc.start();
        osc.stop(ctx.currentTime + 0.015);
      } else {
        // Cozy coffee cup clink
        osc.type = "sine";
        osc.frequency.setValueAtTime(1700 + Math.random() * 150, ctx.currentTime);
        gain.gain.setValueAtTime(0.008, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  const stopAudioEngine = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (cracklingIntervalRef.current) {
      clearInterval(cracklingIntervalRef.current);
      cracklingIntervalRef.current = null;
    }
    if (libraryIntervalRef.current) {
      clearInterval(libraryIntervalRef.current);
      libraryIntervalRef.current = null;
    }

    try {
      sourceNodeRef.current.forEach((node) => {
        try {
          node.stop();
        } catch (e) {}
      });
      sourceNodeRef.current = [];
      
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      console.warn("Error cleaning up Audio Engine:", e);
    }
  };

  const toggleAmbientSound = () => {
    if (isAmbientPlaying) {
      stopAudioEngine();
      setIsAmbientPlaying(false);
      updateDiscoverySetting("activeAmbient", "none");
    } else {
      const activeAmb = settings.activeAmbient !== "none" ? settings.activeAmbient : "rain";
      setIsAmbientPlaying(true);
      updateDiscoverySetting("activeAmbient", activeAmb);
      startAudioEngine(activeAmb, ambientVolume);
    }
  };

  // Canvas Real-time Frequency Waves Visualizer
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      
      // Gorgeous Apple iOS-like gradient colors
      const grad = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0, "#007AFF");
      grad.addColorStop(0.5, "#AF52DE");
      grad.addColorStop(1, "#34C759");
      canvasCtx.strokeStyle = grad;

      canvasCtx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  // Handle 3D Tilt Hover calculations
  const handleMouseMoveBadge = (e: React.MouseEvent<HTMLDivElement>, badgeId: string) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position inside element
    const y = e.clientY - rect.top;  // y position inside element
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Max tilt 15 degrees
    const rotateX = ((centerY - y) / centerY) * 15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    setTiltStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.06)`
    });
  };

  const handleMouseLeaveBadge = () => {
    setHoveredBadgeId(null);
    setTiltStyle({ transform: "rotateX(0deg) rotateY(0deg) scale(1)" });
  };

  // AI Mentor & Coaching Chamber Logic (bilingual Stoic, CEO, and Empathetic briefings)
  const initiateCoachingBriefing = async () => {
    if (isGeneratingCoaching) return;
    setIsGeneratingCoaching(true);
    setCoachingMessage(null);
    setTypingEffectText("");

    // Mapping active theme, language, and selected mentor
    const currentMentor = selectedMentor === "default" ? "sofija" : selectedMentor === "direct" ? "arsa" : selectedMentor === "encouraging" ? "marta" : "nikola";
    
    try {
      // Assemble request to real server-side advisor API
      const response = await fetch("/api/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisorId: currentMentor,
          message: language === "sr" 
            ? `Zdravo! Molim te uradi kratak kognitivni brifing i daj mi motivacioni podsticaj na osnovu sledećih mojih uspeha: Završila sam ${stats.brainDumps} Brain Dump-ova, ${stats.tasksCompleted} ukupno zadataka i ${stats.highLeverageCompleted} visoko uticajnih prioriteta na mojoj ABCDE tabli.`
            : `Hello! Please do a quick tactical cognitive briefing and give me a custom motivational boost based on my stats: I completed ${stats.brainDumps} brain dumps, ${stats.tasksCompleted} tasks, and ${stats.highLeverageCompleted} high-impact priorities.`,
          language: language,
          aiTone: selectedMentor === "default" ? "mentor" : selectedMentor
        })
      });

      if (!response.ok) throw new Error("API call failed");

      const data = await response.json();
      if (data && data.text) {
        simulateTypingEffect(data.text);
      } else {
        throw new Error("Empty text");
      }
    } catch (e) {
      console.warn("Advisor API offline, fallback to high-fidelity local wisdom algorithm:", e);
      // Run Apple-grade scientific local coaching generator
      setTimeout(() => {
        let wisdom = "";
        if (selectedMentor === "direct") {
          // Ruthless CEO Steve Jobs style
          wisdom = language === "sr"
            ? `Pravilo 80/20 je jedini zakon koji te interesuje. Završila si ${stats.highLeverageCompleted} zadataka visoke poluge. Sve ostalo je prazna birokratija i odlaganje neizbežnog. Očisti sporedne distrakcije, odbaci kategoriju C i fokusiraj sledeći krupni korak odmah.`
            : `The 80/20 leverage is the only metric that matters. You executed ${stats.highLeverageCompleted} high leverage objectives. Everything else is emotional noise and low-impact work. Clean your table, eliminate category C, and execute your prime priority now.`;
        } else if (selectedMentor === "philosophical") {
          // Stoic Marcus Aurelius style
          wisdom = language === "sr"
            ? `Tvoj kognitivni suverenitet raste sa svakim svesnim povlačenjem u tišinu. Završila si ${stats.tasksCompleted} zadataka. To su male pobede tvog sopstvenog hrama discipline. Zapamti, tvoj rad je jedino što poseduješ. Sve spoljašnje okolnosti su van tvog uticaja.`
            : `Your cognitive sovereignty expands with every conscious transition into stillness. You finished ${stats.tasksCompleted} actions. These are small triumphs in your temple of discipline. Focus strictly on what is in your control, and release the chaos of the outside world.`;
        } else if (selectedMentor === "encouraging") {
          // Empathetic Dr. Omni Naumann style
          wisdom = language === "sr"
            ? `Uradila si ogroman posao sa ${stats.brainDumps} zapisivanja tvojih misli. Prazan um je preduslov za emotivni mir i mentalni rast. Ponosi se svojim tempom, disanjem, i činjenicom da svakoga dana gradiš zdraviju kognitivnu naviku.`
            : `You have done absolute wonders with ${stats.brainDumps} deep brain dumps. An empty mind is the baseline for deep focus and nervous system balance. Be gentle with your pace, breathe deep, and embrace the routine you are building day by day.`;
        } else {
          // Standard Analyst
          wisdom = language === "sr"
            ? `Tvoji statistički podaci pokazuju stabilnu liniju rasta sa ${stats.tasksCompleted} završenih zadataka i ${stats.habitLogsCount} navika. Predlažem da u narednom ciklusu održiš fokus na visokoj doslednosti pre nego što pređeš na složenije kognitivne ciljeve.`
            : `Telemetry shows a highly consistent growth path with ${stats.tasksCompleted} completed objectives and ${stats.habitLogsCount} habit ticks. Keep your daily routine stable before attempting complex cognitive horizons.`;
        }
        simulateTypingEffect(wisdom);
      }, 1000);
    }
  };

  const simulateTypingEffect = (fullText: string) => {
    setIsGeneratingCoaching(false);
    setCoachingMessage(fullText);
    
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    
    let currentIndex = 0;
    typingIntervalRef.current = setInterval(() => {
      setTypingEffectText(fullText.slice(0, currentIndex + 1));
      currentIndex++;
      if (currentIndex >= fullText.length) {
        clearInterval(typingIntervalRef.current);
      }
    }, 18); // very fluid iOS style typing speed
  };

  // Interactive Sandbox Particle Effects for Hover testing
  const triggerSandboxRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() * 40 - 20),
      y: y + (Math.random() * 40 - 20),
      color: sandboxAnimation === "clarity_spark" ? "#AF52DE" : 
             sandboxAnimation === "golden_pulse" ? "#FF9500" :
             sandboxAnimation === "habit_bloom" ? "#FF2D55" : "#007AFF"
    }));

    setSandboxParticles((prev) => [...prev, ...newParticles].slice(-40)); // keep max 40
    
    // Play subtle haptic feedback audio
    if (settings.soundsEnabled) {
      playSoundPreview(settings.activeSoundPack || "default");
    }
  };

  // Translations dictionary
  const t = {
    titleEn: "Discovery Lab",
    titleSr: "Discovery Lab",
    titleTr: "Keşif Laboratuvarı",
    subtitleEn: "Your focus and task completions shape the platform. As you achieve daily objectives, you unlock custom views, themes, AI coach personalities, and therapeutic ambients.",
    subtitleSr: "Tvoj stvarni fokus oblikuje platformu. Ostvarivanjem ciljeva otključavaš nove režime rada, AI stilove, umirujuće ambijente i personalizacije prostora.",
    subtitleTr: "Odaklanmanız ve tamamladığınız görevler platformu şekillendirir. Günlük hedeflerinize ulaştıkça özel temaların, yapay zeka kişiliklerinin ve ortamların kilidini açarsınız.",
    
    tabOverview: language === "en" ? "Overview" : language === "tr" ? "Genel Bakış" : "Pregled",
    tabProgress: language === "en" ? "Progress Path" : language === "tr" ? "Gelişim Haritası" : "Progres Staza",
    tabUnlocked: language === "en" ? "Unlocked Gear" : language === "tr" ? "Kilitler Açıldı" : "Otključano",
    tabMoments: language === "en" ? "Deck & Mentors" : language === "tr" ? "Kartlar ve Mentorlar" : "Zbirka i Mentor",
    tabSettings: language === "en" ? "Personalization" : language === "tr" ? "Kişiselleştirme" : "Konzola",

    // Overview Strings
    levelLabel: language === "en" ? "Cognitive Horizon Status" : language === "tr" ? "Bilişsel Seviye" : "Kognitivni Nivo",
    streakLabel: language === "en" ? "Daily Streaks" : language === "tr" ? "Günlük Seri" : "Fokus Serija",
    totalUnlocked: language === "en" ? "Total custom items unlocked" : language === "tr" ? "Açılan özelleştirmeler" : "Ukupno otključano stavki",
    recentUnlock: language === "en" ? "Recently Discovered" : language === "tr" ? "Son Keşfedilenler" : "Nedavno otključano",
    noUnlocksYet: language === "en" ? "No unlocked features yet. Complete your first Brain Dump to start!" : language === "tr" ? "Henüz açılan özellik yok. Başlamak için ilk Beyin Dökümünü tamamlayın!" : "Nema otključanih stavki. Pokreni prvi Brain Dump za početak!",

    // Metrics Overview
    metricBrainDumps: language === "en" ? "Brain Dumps" : language === "tr" ? "Beyin Dökümleri" : "Zapisivanja Uma",
    metricTasks: language === "en" ? "Tasks Completed" : language === "tr" ? "Zadaci" : "Završeni Zadaci",
    metricHL: language === "en" ? "High Leverage (80/20)" : language === "tr" ? "Kritik Hedefler" : "Zadaci Visoke Poluge",
    metricMilestones: language === "en" ? "Milestones Complete" : language === "tr" ? "Milestones" : "Ostvareni Milestones",
    metricHabits: language === "en" ? "Habit Streaks" : language === "tr" ? "Navike" : "Obeležene Navike",
    metricAI: language === "en" ? "AI Suggested Tasks" : language === "tr" ? "Yapay Zeka Planları" : "AI Odobrene Akcije",

    // Collections
    colClarity: language === "en" ? "Clarity Collection" : language === "tr" ? "Berraklık Serisi" : "Kolekcija Jasnosti",
    colFocus: language === "en" ? "Focus Collection" : language === "tr" ? "Odak Serisi" : "Kolekcija Fokusa",
    colStrategy: language === "en" ? "Strategy Collection" : language === "tr" ? "Strateji Serisi" : "Kolekcija Strategije",
    colGoals: language === "en" ? "Goals Horizon" : language === "tr" ? "Hedef Ufku" : "Kolekcija Ciljeva",
    colDiscipline: language === "en" ? "Discipline Grid" : language === "tr" ? "Disiplin Kafesi" : "Kolekcija Discipline",
    colReflection: language === "en" ? "Reflection Archive" : language === "tr" ? "Yansıma Arşivi" : "Kolekcija Refleksije",

    unlockedBanner: language === "en" ? "UNLOCKED" : language === "tr" ? "AÇILDI" : "OTKLJUČANO",
    inProgressBanner: language === "en" ? "IN PROGRESS" : language === "tr" ? "U TOKU" : "U TOKU",
    lockedBanner: language === "en" ? "LOCKED" : language === "tr" ? "KİLİTLİ" : "ZAKLJUČANO",
    activeLabel: language === "en" ? "ACTIVE" : language === "tr" ? "AKTİF" : "AKTIVNO",
    activateButton: language === "en" ? "Activate" : language === "tr" ? "Etkinleştir" : "Aktiviraj",
  };

  const unlockedCount = items.filter((i) => i.unlocked).length;
  const progressPercent = Math.round((unlockedCount / items.length) * 100);

  // Group items by collections
  const clarityItems = items.filter((i) => i.category === "clarity");
  const focusItems = items.filter((i) => i.category === "focus");
  const strategyItems = items.filter((i) => i.category === "strategy");
  const goalsItems = items.filter((i) => i.category === "goals");
  const disciplineItems = items.filter((i) => i.category === "discipline");
  const reflectionItems = items.filter((i) => i.category === "reflection");

  const collectionStats = [
    { id: "clarity", name: t.colClarity, items: clarityItems, color: "text-[#AF52DE]", bg: "bg-[#AF52DE]/10", border: "border-[#AF52DE]/20", icon: <Brain className="w-4 h-4 text-[#AF52DE]" /> },
    { id: "focus", name: t.colFocus, items: focusItems, color: "text-[#34C759]", bg: "bg-[#34C759]/10", border: "border-[#34C759]/20", icon: <CheckSquare className="w-4 h-4 text-[#34C759]" /> },
    { id: "strategy", name: t.colStrategy, items: strategyItems, color: "text-[#FF9500]", bg: "bg-[#FF9500]/10", border: "border-[#FF9500]/20", icon: <Compass className="w-4 h-4 text-[#FF9500]" /> },
    { id: "goals", name: t.colGoals, items: goalsItems, color: "text-[#007AFF]", bg: "bg-[#007AFF]/10", border: "border-[#007AFF]/20", icon: <Trophy className="w-4 h-4 text-[#007AFF]" /> },
    { id: "discipline", name: t.colDiscipline, items: disciplineItems, color: "text-[#FF3B30]", bg: "bg-[#FF3B30]/10", border: "border-[#FF3B30]/20", icon: <Activity className="w-4 h-4 text-[#FF3B30]" /> },
    { id: "reflection", name: t.colReflection, items: reflectionItems, color: "text-[#00C7BE]", bg: "bg-[#00C7BE]/10", border: "border-[#00C7BE]/20", icon: <Sparkles className="w-4 h-4 text-[#00C7BE]" /> },
  ];

  // Find next closest reward to unlock
  const lockedItems = items.filter(i => !i.unlocked && i.targetValue > 0);
  const nextReward = lockedItems.sort((a, b) => {
    const progressA = a.progress / a.targetValue;
    const progressB = b.progress / b.targetValue;
    return progressB - progressA; // Sort closest to completion
  })[0];

  const handleCardFlip = (cardId: string) => {
    setFlippedCards(prev => {
      const updated = { ...prev, [cardId]: !prev[cardId] };
      if (settings.soundsEnabled) {
        try {
          playInteractionSound(settings.activeSoundPack || "default", "check");
        } catch (e) {}
      }
      return updated;
    });
  };

  const playSoundPreview = (val: string) => {
    try {
      playInteractionSound(val, "check");
    } catch (err) {
      console.log(err);
    }
  };

  const handlePreview15s = (type: string, value: string) => {
    let settingKey: keyof UserDiscoverySettings | null = null;
    if (type === "theme") settingKey = "activeTheme";
    else if (type === "animation") settingKey = "activeAnimationSet";
    else if (type === "ambient") settingKey = "activeAmbient";
    else if (type === "sound_pack" || type === "sound") settingKey = "activeSoundPack";
    else if (type === "ai_tone") settingKey = "activeAiTone";

    if (!settingKey) return;
    
    const previousValue = settings[settingKey];
    updateDiscoverySetting(settingKey, value);
    
    if (onPreviewStart) {
      onPreviewStart();
    }
    
    // Auto revert after 15s
    setTimeout(() => {
      updateDiscoverySetting(settingKey as keyof UserDiscoverySettings, previousValue);
    }, 15000);
  };

  const getFilteredItems = (lockedOnly: boolean) => {
    let baseItems = items.filter(i => lockedOnly ? !i.unlocked : i.unlocked);
    if (collectionFilter !== "all") {
      baseItems = baseItems.filter(i => i.category === collectionFilter);
    }
    return baseItems;
  };

  return (
    <div className="w-full text-left font-sans text-black dark:text-white pb-20" id="discovery-lab-portal">
      {/* Header with spacious layouts and global telemetry values */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-black/5 dark:border-white/5 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-semibold uppercase tracking-wide">
            <Compass className="w-3.5 h-3.5" />
            <span>Discovery Lab v4.0 (HIG Elite)</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            {language === "en" ? t.titleEn : language === "tr" ? t.titleTr : t.titleSr}
          </h1>
          <p className="text-[14px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-medium">
            {language === "en" ? t.subtitleEn : language === "tr" ? t.subtitleTr : t.subtitleSr}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {nextReward && (
            <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl p-4 w-full sm:w-56 shrink-0 flex flex-col gap-2 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <span className="text-4xl">{nextReward.rewardIcon}</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-[#007AFF] uppercase">
                {language === "sr" ? "Sledeća Nagrada" : "Next Milestone"}
              </span>
              <div className="z-10">
                <p className="text-sm font-semibold text-black dark:text-white leading-tight mb-1">
                  {nextReward.name}
                </p>
                <p className="text-[11px] text-[#8E8E93] leading-snug truncate">
                  {language === "sr" ? nextReward.conditionDescriptionSr : nextReward.conditionDescription}
                </p>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden z-10">
                <div 
                  className="bg-[#007AFF] h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min(100, (nextReward.progress / nextReward.targetValue) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[#8E8E93] font-mono font-bold self-end z-10">
                {nextReward.progress} / {nextReward.targetValue}
              </span>
            </div>
          )}

          {/* Global Progress Circle Gauge */}
          <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 rounded-2xl flex items-center gap-4 shrink-0 w-full sm:w-auto min-w-[200px]">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#7676801F] dark:text-[#7676803D]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#007AFF] transition-all duration-1000"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-black dark:text-white">
                {progressPercent}%
              </span>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-[#8E8E93]">
                {t.totalUnlocked}
              </h5>
              <p className="text-xl font-bold text-black dark:text-white mt-0.5">
                {unlockedCount} / {items.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mini-Navigation Segmented Tabs in standard HIG design */}
      <div className="flex overflow-x-auto gap-1 bg-[#7676801F] dark:bg-[#7676803D] p-[3px] rounded-xl mb-8 max-w-4xl scrollbar-none">
        {[
          { id: "overview", label: t.tabOverview, icon: <Compass className="w-4 h-4" /> },
          { id: "progress", label: t.tabProgress, icon: <Activity className="w-4 h-4" /> },
          { id: "unlocked", label: t.tabUnlocked, icon: <Unlock className="w-4 h-4" /> },
          { id: "moments", label: t.tabMoments, icon: <Layers className="w-4 h-4" /> },
          { id: "settings", label: t.tabSettings, icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? "bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm"
                : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="space-y-8"
        >
          {/* VIEW 1: OVERVIEW & BENTO DASHBOARD */}
          {activeSubTab === "overview" && (
            <div className="space-y-8">
              
              {/* Bento Grid: Stats & Trends */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#007AFF]" />
                    {language === "sr" ? "Kognitivni Laboratorijski Parametri" : "Cognitive Telemetry Dashboard"}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded text-[#34C759]">
                    ACTIVE LAB SYNC
                  </span>
                </div>
                
                {/* Bento Grid with varied sizes and stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Card 1: Memory Relief & Brain Dumps */}
                  <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 rounded-[24px] relative overflow-hidden group shadow-sm flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#AF52DE]/5 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#AF52DE]/10 rounded-xl"><Brain className="w-5 h-5 text-[#AF52DE]" /></div>
                        <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">{t.metricBrainDumps}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-black/5 px-2 py-0.5 rounded">V3</span>
                    </div>
                    <div className="mt-6">
                      <p className="text-4xl font-mono font-bold text-black dark:text-white leading-none">{stats.brainDumps}</p>
                      <p className="text-xs text-[#8E8E93] mt-2 font-medium">Memory relief index. Clear mind is a prerequisite for execution.</p>
                    </div>
                  </div>

                  {/* Card 2: Strategic Priority (High Leverage) */}
                  <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 rounded-[24px] relative overflow-hidden group shadow-sm flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF9500]/5 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#FF9500]/10 rounded-xl"><Zap className="w-5 h-5 text-[#FF9500]" /></div>
                        <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">{t.metricHL}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#FF9500] bg-[#FF9500]/10 px-2 py-0.5 rounded">80/20</span>
                    </div>
                    <div className="mt-6">
                      <p className="text-4xl font-mono font-bold text-black dark:text-white leading-none">{stats.highLeverageCompleted}</p>
                      <p className="text-xs text-[#8E8E93] mt-2 font-medium">Completed Category A/B goals. This is your pure strategic leverage.</p>
                    </div>
                  </div>

                  {/* Card 3: Execution Rate */}
                  <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 rounded-[24px] relative overflow-hidden group shadow-sm flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#34C759]/5 rounded-bl-full pointer-events-none" />
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#34C759]/10 rounded-xl"><CheckSquare className="w-5 h-5 text-[#34C759]" /></div>
                        <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">{t.metricTasks}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded">DONE</span>
                    </div>
                    <div className="mt-6">
                      <p className="text-4xl font-mono font-bold text-black dark:text-white leading-none">{stats.tasksCompleted}</p>
                      <p className="text-xs text-[#8E8E93] mt-2 font-medium">Total resolved actions. Physical proof of daily consistent momentum.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sandbox Playground: Try out sounds & animations */}
              <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 sm:p-8 rounded-[24px] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#AF52DE]/10 rounded-xl text-[#AF52DE]"><Sparkles className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">
                      {language === "sr" ? "Kognitivni Pesak (Interactive Sandbox)" : "Interactive Laboratory Sandbox"}
                    </h3>
                    <p className="text-xs text-[#8E8E93] mt-0.5">Test custom particle micro-animations and acoustic feedback click tones in real-time</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Part 1: Interactive Canvas Touch Area */}
                  <div 
                    onMouseMove={triggerSandboxRipple}
                    className="h-44 bg-white dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-center items-center cursor-crosshair group shadow-inner"
                  >
                    <div className="absolute inset-0 pointer-events-none">
                      {sandboxParticles.map((p) => (
                        <motion.span
                          key={p.id}
                          initial={{ opacity: 1, scale: 1.5, y: 0 }}
                          animate={{ opacity: 0, scale: 0.1, y: -40 }}
                          transition={{ duration: 0.8 }}
                          className="absolute w-2 h-2 rounded-full pointer-events-none"
                          style={{ left: p.x, top: p.y, backgroundColor: p.color }}
                        />
                      ))}
                    </div>
                    
                    <span className="text-2xl mb-1">✨</span>
                    <p className="text-xs font-bold text-black dark:text-white">
                      {language === "sr" ? "Pređi mišem ovde da testiraš animacije" : "Move mouse here to test spark waves"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-mono tracking-wider">
                      ACTIVE PATTERN: {sandboxAnimation.replace("_", " ")}
                    </p>
                  </div>

                  {/* Part 2: Configuration Buttons */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8E8E93] uppercase block">Select Test Animation Particle:</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "default", label: "Default Sparkle", icon: "✨" },
                          { id: "clarity_spark", label: "Clarity Spark", icon: "🪻" },
                          { id: "golden_pulse", label: "Golden Pulse", icon: "🏆" },
                          { id: "habit_bloom", label: "Habit Bloom", icon: "🌸" },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => {
                              setSandboxAnimation(btn.id);
                              playSoundPreview("default");
                            }}
                            className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 active:scale-95 transition-all cursor-pointer ${
                              sandboxAnimation === btn.id
                                ? "bg-black text-white border-transparent dark:bg-white dark:text-black"
                                : "bg-white dark:bg-transparent border-black/5 dark:border-white/5 text-black dark:text-white"
                            }`}
                          >
                            <span>{btn.icon}</span>
                            <span className="truncate">{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <label className="text-[11px] font-bold text-[#8E8E93] uppercase block">Test Acoustic Sound Packs:</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "default", label: "Default Pop" },
                          { id: "soft_spark", label: "Minimalist Wood" },
                          { id: "golden_click", label: "Golden Haptic" },
                          { id: "calm_rain", label: "Zen Bell" },
                        ].map((snd) => (
                          <button
                            key={snd.id}
                            onClick={() => playSoundPreview(snd.id)}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white dark:bg-transparent border border-black/5 dark:border-white/5 text-black dark:text-white hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                          >
                            🔊 {snd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Active Style Overview Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Visualizer card */}
                <div className="md:col-span-2 bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 border border-[#007AFF]/20 p-6 sm:p-8 rounded-[24px] relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  {nextReward ? (
                    <div className="space-y-6 w-full">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex px-3 py-1 bg-[#007AFF] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                          {language === "sr" ? "Sledeće kognitivno otključavanje" : "Next Deep Unlock"}
                        </span>
                        <span className="text-xs font-semibold text-[#007AFF] flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                          Horizon v4
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl p-4 bg-white/70 dark:bg-black/35 rounded-2xl shadow-sm backdrop-blur-md shrink-0">
                            {nextReward.rewardIcon}
                          </span>
                          <div>
                            <h3 className="text-xl font-bold text-black dark:text-white leading-tight">{nextReward.name}</h3>
                            <p className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/70 mt-1">
                              {language === "sr" ? nextReward.conditionDescriptionSr : nextReward.conditionDescription}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-[11px] font-mono font-bold text-gray-500">
                            <span>UNLOCKED FOCUS REWARD PROGRESS</span>
                            <span>{nextReward.progress} / {nextReward.targetValue}</span>
                          </div>
                          <div className="w-full bg-black/10 dark:bg-white/10 h-3 rounded-full overflow-hidden p-0.5">
                            <div 
                              className="bg-[#007AFF] h-full rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((nextReward.progress / nextReward.targetValue) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center w-full">
                      <Trophy className="w-12 h-12 text-[#007AFF] mx-auto mb-4 opacity-80" />
                      <h3 className="text-xl font-bold text-black dark:text-white">All Customizations Unlocked!</h3>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4 relative z-10">
                    <button 
                      onClick={() => setActiveSubTab("progress")}
                      className="px-4 py-2 bg-white dark:bg-[#1C1C1E] text-black dark:text-white font-bold text-xs rounded-xl shadow-sm border border-black/5 dark:border-white/5 active:scale-95 transition-all cursor-pointer">
                      {language === "sr" ? "Pregledaj stazu" : "View Progress Path"}
                    </button>
                    <button 
                      onClick={() => setActiveSubTab("settings")}
                      className="px-4 py-2 bg-black/5 dark:bg-white/5 text-black dark:text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer">
                      {language === "sr" ? "Stilovi" : "Aesthetics"}
                    </button>
                  </div>
                </div>

                {/* Configuration List Panel */}
                <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 rounded-[24px] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
                        {language === "sr" ? "Aktivna Konfiguracija" : "Active Personalizations"}
                      </h3>
                      <button
                        onClick={() => setActiveSubTab("settings")}
                        className="text-[10px] font-bold text-[#007AFF] px-2.5 py-1 bg-[#007AFF]/10 rounded-lg hover:bg-[#007AFF]/20 transition-colors cursor-pointer"
                      >
                        {language === "sr" ? "Promeni" : "Change"}
                      </button>
                    </div>
                    
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between py-1.5 border-b border-black/5 dark:border-white/5">
                        <span className="text-[#8E8E93]">{language === "sr" ? "Zid (Theme):" : "Theme:"}</span>
                        <span className="font-bold text-black dark:text-white capitalize truncate">{settings.activeTheme}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-black/5 dark:border-white/5">
                        <span className="text-[#8E8E93]">{language === "sr" ? "Ambijent (Ambient):" : "Ambient:"}</span>
                        <span className="font-bold text-black dark:text-white capitalize truncate">{settings.activeAmbient || "none"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-black/5 dark:border-white/5">
                        <span className="text-[#8E8E93]">{language === "sr" ? "Zvuk (Sound Pack):" : "Sound Pack:"}</span>
                        <span className="font-bold text-black dark:text-white capitalize truncate">{settings.activeSoundPack || "default"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-black/5 dark:border-white/5">
                        <span className="text-[#8E8E93]">{language === "sr" ? "AI Ton (Mentor):" : "AI Mentor:"}</span>
                        <span className="font-bold text-black dark:text-white capitalize truncate">{settings.activeAiTone || "default"}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-[#8E8E93]">Haptics:</span>
                        <span className="font-bold text-black dark:text-white">{settings.hapticsEnabled ? "ON" : "OFF"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#34C759] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#8E8E93]">COGNITIVE SYNC COMPLETE</span>
                  </div>
                </div>
              </div>

              {/* Row: Recently Unlocked Items */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 rounded-[24px]">
                <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#FF9500]" />
                  {t.recentUnlock}
                </h3>
                
                {items.filter(i => i.unlocked).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.filter(i => i.unlocked).slice(-3).reverse().map((unlockedItem) => (
                      <div 
                        key={unlockedItem.id} 
                        onClick={() => setActiveSubTab("unlocked")}
                        className="flex gap-3 items-center border border-black/5 dark:border-white/5 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <span className="text-xl p-2.5 bg-[#34C759]/10 rounded-xl shrink-0 shadow-sm">
                          {unlockedItem.rewardIcon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-bold text-black dark:text-white truncate">
                            {unlockedItem.name}
                          </h4>
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-[#34C759] uppercase tracking-wider">
                            {unlockedItem.category.replace("_", " ")} COLLECTION
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#8E8E93] shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 opacity-60">
                    <Unlock className="w-8 h-8 mx-auto text-[#8E8E93] mb-3" />
                    <p className="text-xs font-medium text-[#8E8E93] px-4">
                      {language === "sr" ? "Tvoj rad ovde otključava nove stilove i opcije." : "Your work here unlocks new styles and options."}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW 2: PROGRESS PATH (3D ROTATING QUEST INTERFACE) */}
          {activeSubTab === "progress" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">
                    {language === "sr" ? "Staza Kognitivnih Prekretnica" : "Milestones Quest Path"}
                  </h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    {language === "sr" ? "Klikni na bilo koji krug da pogledaš detalje i proslaviš dostignuće u 3D prikazu" : "Hover over 3D badges and click to reveal deep psychological reward guidelines"}
                  </p>
                </div>
                
                {/* Domain Pill Selector */}
                <div className="flex overflow-x-auto gap-2 mt-3 md:mt-0 scrollbar-none">
                  <button
                    onClick={() => setCollectionFilter("all")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer ${
                      collectionFilter === "all"
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-black/5 dark:bg-white/5 text-black dark:text-white"
                    }`}
                  >
                    All Domains
                  </button>
                  {collectionStats.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setCollectionFilter(col.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1 border ${
                        collectionFilter === col.id
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-black/5 dark:bg-white/5 text-black dark:text-white border-black/5"
                      }`}
                    >
                      <span>{col.icon}</span>
                      <span>{col.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Quest Path Container */}
              <div className="relative py-12 px-4 bg-gradient-to-b from-white to-gray-50/50 dark:from-transparent dark:to-transparent rounded-[32px] border border-black/5 dark:border-white/5 overflow-hidden flex flex-col items-center">
                
                {/* Vertical SVG connecting line */}
                <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-[#007AFF] via-[#AF52DE] to-[#34C759] opacity-30 pointer-events-none" />

                <div className="space-y-16 relative z-10 w-full max-w-lg">
                  {items
                    .filter((item) => collectionFilter === "all" || item.category === collectionFilter)
                    .map((item, idx) => {
                      const isUnlocked = item.unlocked;
                      const isHovered = hoveredBadgeId === item.id;
                      const activeCol = collectionStats.find((c) => c.id === item.category);

                      // Alternating left/right positions for a playful Apple path layout
                      const isLeft = idx % 2 === 0;

                      return (
                        <div 
                          key={item.id}
                          className={`flex items-center w-full ${isLeft ? "justify-start text-left" : "justify-end text-right"}`}
                        >
                          <div className={`flex items-center gap-4 max-w-sm ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
                            
                            {/* 3D Tilting Quest Circle Badge */}
                            <div 
                              onMouseMove={(e) => {
                                setHoveredBadgeId(item.id);
                                handleMouseMoveBadge(e, item.id);
                              }}
                              onMouseLeave={handleMouseLeaveBadge}
                              onClick={() => {
                                setSelectedMilestone(item);
                                setIsCelebrationOpen(true);
                                playSoundPreview("default");
                              }}
                              className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all [perspective:1000px] [transform-style:preserve-3d] ${
                                isUnlocked 
                                  ? "bg-white dark:bg-[#1C1C1E] border-2 border-[#007AFF] text-black dark:text-white shadow-md shadow-[#007AFF]/10 hover:shadow-lg hover:shadow-[#007AFF]/20"
                                  : "bg-gray-100 dark:bg-[#2C2C2E] border border-dashed border-gray-300 dark:border-white/10 text-gray-400 opacity-70"
                              }`}
                              style={isHovered ? tiltStyle : {}}
                            >
                              <div className="[transform:translateZ(20px)] flex flex-col items-center">
                                <span className={`text-3xl ${!isUnlocked && "filter grayscale opacity-45"}`}>
                                  {item.rewardIcon || "🎁"}
                                </span>
                                {!isUnlocked && <Lock className="w-3.5 h-3.5 text-gray-500 absolute -bottom-1 -right-1 bg-white dark:bg-[#1C1C1E] rounded-full p-0.5 border" />}
                              </div>
                            </div>

                            {/* Milestone Information Speech bubble style */}
                            <div className="space-y-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm max-w-[240px]">
                              <span className={`inline-block text-[9px] font-bold uppercase tracking-widest ${isUnlocked ? "text-[#34C759]" : "text-gray-400"}`}>
                                {isUnlocked ? "COMPLETED" : "LOCKED"}
                              </span>
                              <h4 className="text-[13px] font-bold text-black dark:text-white leading-tight">
                                {item.name}
                              </h4>
                              <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                                {language === "sr" ? item.conditionDescriptionSr : item.conditionDescription}
                              </p>
                              
                              {/* Small mini-progress tag for locked items */}
                              {!isUnlocked && (
                                <div className="pt-2">
                                  <div className="flex justify-between text-[8px] font-mono font-bold text-gray-400">
                                    <span>PROGRESS</span>
                                    <span>{item.progress} / {item.targetValue}</span>
                                  </div>
                                  <div className="w-full bg-black/5 dark:bg-white/10 h-1 rounded-full mt-0.5 overflow-hidden">
                                    <div 
                                      className="bg-[#FF9500] h-full rounded-full"
                                      style={{ width: `${(item.progress / item.targetValue) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Milestone Celebration & Guideline Modal */}
              <AnimatePresence>
                {isCelebrationOpen && selectedMilestone && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.92, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 15 }}
                      className="bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 w-full max-w-md rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden text-left"
                    >
                      {/* Festive background rays if unlocked */}
                      {selectedMilestone.unlocked && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#007AFF]/10 via-transparent to-[#AF52DE]/10 pointer-events-none opacity-50 animate-pulse" />
                      )}

                      <div className="text-center space-y-3 relative z-10">
                        <span className="text-6xl inline-block p-4 bg-gray-100 dark:bg-white/5 rounded-full animate-bounce">
                          {selectedMilestone.rewardIcon}
                        </span>
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            selectedMilestone.unlocked 
                              ? "bg-[#34C759]/15 text-[#34C759]"
                              : "bg-[#FF9500]/15 text-[#FF9500]"
                          }`}>
                            {selectedMilestone.unlocked ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {selectedMilestone.unlocked ? "Unlocked Achievement" : "Locked Milestone"}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-black dark:text-white leading-tight">
                          {selectedMilestone.name}
                        </h3>
                        <p className="text-xs text-[#8E8E93] leading-relaxed px-4">
                          {language === "sr" ? selectedMilestone.conditionDescriptionSr : selectedMilestone.conditionDescription}
                        </p>
                      </div>

                      {/* Scientific Coaching Guideline Section */}
                      <div className="p-4 bg-[#F2F2F7] dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 relative z-10 space-y-3">
                        <h4 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#007AFF]" />
                          Scientific Application Strategy
                        </h4>
                        <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/90 leading-relaxed font-medium italic">
                          {selectedMilestone.id.includes("theme") 
                            ? (language === "sr" ? '"Vizuelna harmonija prostora smanjuje neželjeni kognitivni napor za preko 24%, omogućavajući mozgu duže održavanje dubokog fokusnog stanja."' : '"Visual desktop harmony reduces baseline cognitive clutter, allowing the prefrontal cortex to sustain focus cycles with minimal friction."')
                            : selectedMilestone.id.includes("woop")
                            ? (language === "sr" ? '"Gabriele Oettingen naučno dokazuje da kreiranje jasnih odbrambenih planova (ako se pojavi prepreka, uradiću akciju) podiže stopu uspeha za čak 82%."' : '"Gabriele Oettingen\'s WOOP protocol bypasses positive fantasies. Creating conditional plans (If obstacle X occurs, then I will execute Y) is scientifically proven to lift action rates by 82%."')
                            : selectedMilestone.id.includes("cialdini")
                            ? (language === "sr" ? '"Psihološki princip doslednosti Roberta Cialdinija dokazuje da potpisani svečani zavet stvara unutrašnji aparat obaveze koji dramatično sprečava prokrastinaciju."' : '"Robert Cialdini\'s commitment principle establishes that writing and signing a formal pledge recruits our internal consistency apparatus, shutting down procrastination channels."')
                            : (language === "sr" ? '"Doslednost gradi neurološke puteve navike. Svako malo ponavljanje stvara čeličnu disciplinu koja vremenom prelazi u automatizam."' : '"Consistency recruits automatic habit loops. Small, repeated task execution rewires myelin sheath pathways, converting active effort into passive automaticity."')}
                        </p>
                      </div>

                      <div className="flex gap-3 relative z-10">
                        {selectedMilestone.unlocked && selectedMilestone.rewardType !== "reflection_card" && (
                          <button
                            onClick={() => {
                              handlePreview15s(selectedMilestone.rewardType, selectedMilestone.rewardValue);
                              setIsCelebrationOpen(false);
                            }}
                            className="flex-1 py-3 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            Apply Custom Style
                          </button>
                        )}
                        <button
                          onClick={() => setIsCelebrationOpen(false)}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                            selectedMilestone.unlocked 
                              ? "bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10"
                              : "bg-[#007AFF] text-white hover:bg-[#007AFF]/90"
                          }`}
                        >
                          {language === "sr" ? "U redu" : "Close"}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* VIEW 3: UNLOCKED INTERACTIVE GEAR */}
          {activeSubTab === "unlocked" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">
                    {language === "sr" ? "Aktivirana Kognitivna Oprema" : "Unlocked Interface Customizations"}
                  </h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    {language === "sr" ? "Uključi i primeni otključane vizuelne stilove, ambijente i zvučne tonove platforme" : "Activate or preview themes, audio packs, and neural custom options you have unlocked"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.filter(i => i.unlocked).length > 0 ? (
                  items.filter(i => i.unlocked).map((item) => {
                    const activeCol = collectionStats.find(c => c.id === item.category);
                    const isActivated = (item.rewardType === "theme" && settings.activeTheme === item.rewardValue) || 
                                        (item.rewardType === "animation" && settings.activeAnimationSet === item.rewardValue) ||
                                        (item.rewardType === "ai_tone" && settings.activeAiTone === item.rewardValue) ||
                                        (item.rewardType === "sound_pack" && settings.activeSoundPack === item.rewardValue) ||
                                        (item.rewardType === "ambient" && settings.activeAmbient === item.rewardValue) ||
                                        (item.rewardType === "sound" && settings.activeSoundPack === item.rewardValue);

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-sm hover:shadow transition-all"
                      >
                        {isActivated && (
                          <div className="absolute top-4 right-4 bg-[#34C759]/15 text-[#34C759] border border-[#34C759]/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase z-20">
                            {t.activeLabel}
                          </div>
                        )}
                        
                        <div className={`absolute top-0 right-0 w-24 h-24 ${isActivated ? "bg-[#34C759]/5" : (activeCol?.bg || "bg-black/5")} rounded-bl-full pointer-events-none opacity-50`} />
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl p-2.5 ${isActivated ? "bg-[#34C759]/10 text-[#34C759]" : "bg-black/5 text-gray-700"} rounded-xl shrink-0 z-10`}>
                              {item.rewardIcon || "🔓"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[14px] font-bold text-black dark:text-white truncate pr-16">
                                {item.name}
                              </h4>
                              <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mt-0.5 z-10">
                                {item.rewardType.replace("_", " ")}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed min-h-[40px] z-10 relative">
                            {language === "sr" ? item.conditionDescriptionSr : item.conditionDescription}
                          </p>
                        </div>

                        {item.rewardType !== "reflection_card" && (
                          <div className="pt-2 flex gap-2 z-10 relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.rewardType === "theme") {
                                  updateDiscoverySetting("activeTheme", item.rewardValue);
                                } else if (item.rewardType === "animation") {
                                  updateDiscoverySetting("activeAnimationSet", item.rewardValue);
                                } else if (item.rewardType === "ambient") {
                                  updateDiscoverySetting("activeAmbient", isActivated ? "none" : item.rewardValue);
                                } else if (item.rewardType === "sound_pack" || item.rewardType === "sound") {
                                  updateDiscoverySetting("activeSoundPack", item.rewardValue);
                                  playSoundPreview(item.rewardValue);
                                } else if (item.rewardType === "ai_tone") {
                                  updateDiscoverySetting("activeAiTone", item.rewardValue);
                                }
                              }}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                                isActivated 
                                  ? "bg-black/5 dark:bg-white/10 text-black dark:text-white border border-black/5 dark:border-white/5"
                                  : "bg-[#007AFF] hover:bg-[#007AFF]/90 text-white shadow-sm"
                              }`}
                            >
                              {isActivated ? t.activeLabel : t.activateButton}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePreview15s(item.rewardType, item.rewardValue)}
                              className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] border border-black/5 dark:border-white/5 text-black dark:text-white flex items-center justify-center"
                              title="Try preview"
                            >
                              <span>👁️</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
                    <Lock className="w-12 h-12 text-[#8E8E93] mx-auto opacity-35" />
                    <div className="space-y-1">
                      <p className="text-[15px] font-bold text-black dark:text-white">
                        {language === "en" ? "No Customizations Unlocked Yet" : "Još nema otključanih nagrada"}
                      </p>
                      <p className="text-xs text-[#8E8E93] max-w-sm mx-auto leading-relaxed">
                        {language === "en" 
                          ? "Complete focus cycles, daily brain dumps, and high leverage tasks to unlock styles."
                          : "Nastavi sa rešavanjem obaveza, ciljeva i jutarnjih refleksija da otključaš prve premium elemente interfejsa."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: DECK & MENTORS CHANGER (Timeline + Interactive 3D Wisdom cards + AI Briefings) */}
          {activeSubTab === "moments" && (
            <div className="space-y-10 max-w-5xl mx-auto">
              
              {/* AI Coaching Briefing Section */}
              <div className="bg-gradient-to-br from-[#AF52DE]/10 via-[#007AFF]/5 to-transparent border border-[#AF52DE]/20 p-6 sm:p-8 rounded-[32px] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#AF52DE]/15 text-[#AF52DE] rounded-xl"><MessageSquare className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">
                        {language === "sr" ? "AI Mentorska Odaja" : "AI Mentor & Briefing Chamber"}
                      </h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">Select an unlocked coaching mentor to analyze your statistics and generate custom strategic briefs</p>
                    </div>
                  </div>

                  {/* Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-[#8E8E93] font-mono">MENTOR:</label>
                    <select
                      value={selectedMentor}
                      onChange={(e) => {
                        setSelectedMentor(e.target.value);
                        setCoachingMessage(null);
                        setTypingEffectText("");
                      }}
                      className="text-xs font-bold px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#AF52DE]"
                    >
                      <option value="default">Default Analyst 🤖</option>
                      <option value="direct">CEO Coach Mode 👔</option>
                      <option value="encouraging">Empathetic Mentor 🌟</option>
                      <option value="philosophical">Stoic Master 🧘</option>
                    </select>
                  </div>
                </div>

                {/* Simulated Chat Interface */}
                <div className="bg-white/80 dark:bg-black/30 border border-black/5 dark:border-white/5 rounded-2xl p-5 min-h-[160px] flex flex-col justify-between space-y-4">
                  <div className="space-y-4 flex-1">
                    {/* User Mini bubble */}
                    <div className="flex justify-end">
                      <div className="bg-[#007AFF] text-white px-4 py-2.5 rounded-[20px] rounded-tr-none text-xs font-medium max-w-sm shadow-sm leading-relaxed">
                        {language === "sr" 
                          ? `Generiši mi brifing. Moje statistike su: ${stats.tasksCompleted} završenih zadataka, ${stats.brainDumps} Brain Dump-ova.`
                          : `Generate briefing based on: ${stats.tasksCompleted} tasks, ${stats.brainDumps} deep dumps.`}
                      </div>
                    </div>

                    {/* AI Coach Bubble */}
                    {isGeneratingCoaching ? (
                      <div className="flex justify-start items-center gap-2">
                        <div className="p-2 bg-black/5 dark:bg-white/5 rounded-full animate-spin"><RotateCw className="w-4 h-4 text-[#AF52DE]" /></div>
                        <span className="text-[11px] font-mono text-[#8E8E93] font-bold tracking-wider">AI COACH IS PREPARING BIOMARKERS ANALYSIS...</span>
                      </div>
                    ) : typingEffectText ? (
                      <div className="flex justify-start">
                        <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white px-4 py-3 rounded-[20px] rounded-tl-none text-xs font-medium max-w-xl shadow-sm leading-relaxed relative border border-black/5 dark:border-white/5">
                          <p className="whitespace-pre-line">{typingEffectText}</p>
                          {typingEffectText.length < (coachingMessage?.length || 0) && (
                            <span className="inline-block w-1.5 h-3.5 bg-[#AF52DE] ml-1 animate-pulse" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <MessageSquare className="w-8 h-8 text-[#8E8E93] mx-auto mb-2 opacity-35" />
                        <p className="text-xs text-[#8E8E93] font-medium">Ready to start. Click the button below to initiate tactical briefing.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-black/5 dark:border-white/5 flex justify-end">
                    <button
                      onClick={initiateCoachingBriefing}
                      disabled={isGeneratingCoaching}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#AF52DE] to-[#5856D6] hover:opacity-90 disabled:opacity-55 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === "sr" ? "Pokreni AI Brifing" : "Request Briefing"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3D Tarot Cards Grid */}
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto">
                  <div className="inline-flex p-1.5 bg-[#AF52DE]/10 text-[#AF52DE] rounded-full mb-2">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-bold text-black dark:text-white">
                    {language === "sr" ? "Kognitivni Špil Mudrosti" : "Deck of Mental Strategy"}
                  </h2>
                  <p className="text-[#8E8E93] text-xs">
                    {language === "sr" ? "Klikni na kartice da okreneš i pročitaš praktične lekcije tvojih mentalnih pobeda" : "Click unlocked tarot-style cards to flip and inspect deep cognitive coaching strategies"}
                  </p>
                </div>

                {items.filter(i => i.rewardType === "reflection_card" && i.unlocked).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.filter(i => i.rewardType === "reflection_card" && i.unlocked).map((card) => {
                      const isFlipped = !!flippedCards[card.id];
                      
                      return (
                        <div 
                          key={card.id} 
                          className="h-[280px] w-full [perspective:1000px] cursor-pointer"
                          onClick={() => handleCardFlip(card.id)}
                        >
                          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
                            
                            {/* FRONT SIDE (Tarot style) */}
                            <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[24px] border border-[#AF52DE]/20 bg-gradient-to-b from-[#1C1C1E] to-black p-6 flex flex-col justify-between shadow-lg text-white">
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#AF52DE]">MENTAL TAROT</span>
                                <span className="text-xl">{card.rewardIcon}</span>
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white leading-tight">{card.name}</h3>
                                <div className="w-6 h-0.5 bg-[#AF52DE] rounded" />
                                <p className="text-[10px] font-mono text-[#8E8E93]">UNLOCKED FROM WORKSPACE</p>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-3 border-t border-white/5">
                                <span>TAP TO REVEAL STRATEGY</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            {/* BACK SIDE (Actionable coaching instructions) */}
                            <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[24px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1E] p-6 flex flex-col justify-between shadow-lg text-black dark:text-white">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] font-mono font-bold text-[#FF9500]">PRACTICAL ADVICE</span>
                                <span className="text-lg">💡</span>
                              </div>
                              <div className="flex-1 flex items-center justify-center py-4">
                                <p className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/90 leading-relaxed italic text-center">
                                  {card.id === "card_daily_win" ? (
                                    language === "sr" ? '"Pobeda dana pripada onome ko se prvi probudi i preuzme kontrolu nad sobom. Nastavi sa ritualom jutarnjeg reseta."' : '"The win of the day belongs to the one who takes control early. Keep repeating your daily focus routine."'
                                  ) : card.id === "card_weekly_clarity" ? (
                                    language === "sr" ? '"Nedelja je tvoja. Jasnoća je tvoje najveće oružje protiv haosa. Zapiši 3 najvažnija fokusa sutra ujutru."' : '"Weekly clarity is your ultimate shield against cognitive load. Write down exactly 3 priorities tomorrow."'
                                  ) : card.id === "card_high_leverage" ? (
                                    language === "sr" ? '"Fokusiraj 20% onoga što donosi 80% rezultata. Odloži sve ostalo dok to ne završiš."' : '"Always separate leverage tasks from low-impact chores. Do the leverage items before checking emails."'
                                  ) : card.id === "card_cialdini_commitment" ? (
                                    language === "sr" ? '"Pismeni i potpisani zavet te obavezuje pred sopstvenim kognitivnim aparatom. Kada se obavežeš pismeno, šansa za uspeh raste za čak 82%!"' : '"A written and signed commitment binds you to your own cognitive apparatus. When you commit in writing, your follow-through probability spikes by 82%!"'
                                  ) : card.id === "card_woop_strategy" ? (
                                    language === "sr" ? '"Vizualizacija uspeha bez planiranja prepreka je samo pusta želja. WOOP metod naučno premošćuje jaz između mašte i realnosti kroz odbrambene planove."' : '"Positive fantasy alone backfires. Gabriele Oettingen\'s WOOP method scientifically bridges the gap by pairing your wild wish with direct obstacle implementation plans."'
                                  ) : (
                                    language === "sr" ? '"Povratak je uvek jači od neuspeha. Tvoja upornost se isplatila. Nastavi da gradiš lanac."' : '"The comeback is always stronger than the setback. Consistency beats intensity every single day."'
                                  )}
                                </p>
                              </div>
                              <div className="text-center text-[9px] font-mono text-[#8E8E93] pt-2 border-t border-black/5 dark:border-white/5">
                                CLICK TO RE-FLIP CARD
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/5">
                    <Lock className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-gray-500">Reflection Cards are still locked.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Unlock them by hitting the corresponding milestones in Progress path.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW 5: PERSONALIZATION CONSOLE (SETTINGS & LIVE MIXER) */}
          {activeSubTab === "settings" && (
            <div className="space-y-8">
              
              {/* Real-time Ambient Soundscape Mixer Panel */}
              <div className="bg-gradient-to-b from-white to-gray-50/50 dark:from-[#1C1C1E] dark:to-black/30 border border-black/5 dark:border-white/5 p-6 sm:p-8 rounded-[32px] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#007AFF]/15 text-[#007AFF] rounded-xl"><Headphones className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">
                        {language === "sr" ? "Mikser Terapeutskih Ambijenata" : "Aural Therapeutic Ambient Mixer"}
                      </h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">Mix and fine-tune custom sound frequencies to induce theta focus state</p>
                    </div>
                  </div>

                  <button
                    onClick={toggleAmbientSound}
                    className={`px-4 py-2 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 ${
                      isAmbientPlaying
                        ? "bg-[#FF3B30] text-white shadow-sm"
                        : "bg-[#007AFF] text-white shadow-sm"
                    }`}
                  >
                    {isAmbientPlaying ? <VolumeX className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isAmbientPlaying ? (language === "sr" ? "Zaustavi Ambijent" : "Stop Ambient") : (language === "sr" ? "Pusti Ambijent" : "Play Ambient")}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Part 1: Visual Waveform Canvas */}
                  <div className="bg-black/5 dark:bg-black/60 rounded-2xl p-4 h-24 flex flex-col justify-center items-center relative border border-black/5 dark:border-white/5 overflow-hidden shadow-inner md:col-span-1">
                    <canvas ref={canvasRef} width={260} height={70} className="w-full h-full" />
                    {!isAmbientPlaying && (
                      <span className="absolute text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest">
                        SPECTRUM OF SILENCE
                      </span>
                    )}
                  </div>

                  {/* Part 2: Selector & Volume Slider */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "rain", label: "Cozy Rain", icon: "🌧️" },
                        { id: "space", label: "Space 40Hz", icon: "🌌" },
                        { id: "fireplace", label: "Fireplace", icon: "🔥" },
                        { id: "library", label: "Library", icon: "📚" },
                      ].map((amb) => {
                        const isUnlocked = items.find(i => i.id === `ambient_${amb.id}`)?.unlocked ?? true;
                        const isCurrent = settings.activeAmbient === amb.id;

                        return (
                          <button
                            key={amb.id}
                            disabled={!isUnlocked}
                            onClick={() => {
                              updateDiscoverySetting("activeAmbient", amb.id);
                              if (isAmbientPlaying) {
                                startAudioEngine(amb.id, ambientVolume);
                              }
                            }}
                            className={`p-3 rounded-xl border flex flex-col justify-between items-start text-left h-20 active:scale-95 transition-all relative cursor-pointer ${
                              !isUnlocked ? "opacity-45 bg-gray-100 border-dashed cursor-not-allowed" : "bg-white dark:bg-transparent"
                            } ${
                              isCurrent 
                                ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]" 
                                : "border-black/5 dark:border-white/5"
                            }`}
                          >
                            <span className="text-lg">{amb.icon}</span>
                            <div className="w-full">
                              <h5 className="text-[11px] font-bold truncate flex items-center gap-1">
                                {amb.label}
                                {!isUnlocked && <Lock className="w-2.5 h-2.5 text-[#8E8E93]" />}
                              </h5>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Master Volume Sliders */}
                    <div className="flex items-center gap-3">
                      <VolumeX className="w-4 h-4 text-gray-400" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ambientVolume}
                        onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-black/5 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                      />
                      <Volume2 className="w-4 h-4 text-[#007AFF]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Personalization Controls */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-6 sm:p-8 rounded-[24px] space-y-8">
                
                <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
                  <Sliders className="w-5 h-5 text-[#007AFF]" />
                  <div>
                    <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Aesthetic Personalization Console</h3>
                    <p className="text-xs text-[#8E8E93] mt-0.5">Manage premium laboratory style custom themes, soundscapes, animations, and AI coaching mentors</p>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block">
                    {language === "sr" ? "Aktivne Vizuelne Teme" : "Aesthetic Workspace Canvas Themes"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { val: "default", label: "Default Theme", icon: "📱", colors: ["#007AFF", "#8E8E93"], item: null },
                      { val: "lavender", label: "Calm Lavender (Twilight)", icon: "🪻", colors: ["#AF52DE", "#5856D6"], item: items.find(i => i.id === "theme_lavender") },
                      { val: "midnight", label: "Midnight Executive", icon: "🌌", colors: ["#1C1C1E", "#000000"], item: items.find(i => i.id === "theme_midnight") },
                      { val: "golden", label: "Golden Strategy (Elite)", icon: "🏆", colors: ["#FF9500", "#E5C158"], item: items.find(i => i.id === "theme_golden") },
                      { val: "forest", label: "Zen Monastic", icon: "🌲", colors: ["#34C759", "#1E4620"], item: items.find(i => i.id === "theme_forest") },
                      { val: "ocean", label: "Deep Flow State", icon: "🌊", colors: ["#5856D6", "#007AFF"], item: items.find(i => i.id === "theme_ocean") },
                      { val: "cyberpunk", label: "Neural Hack (Pro)", icon: "🌆", colors: ["#FF2D55", "#00C7BE"], item: items.find(i => i.id === "theme_cyberpunk") },
                    ].map((themeOpt) => {
                      const isUnlocked = themeOpt.item ? themeOpt.item.unlocked : true;
                      return (
                        <div 
                          key={themeOpt.val}
                          className={`relative rounded-xl border p-3 flex flex-col justify-between h-[110px] transition-all overflow-hidden ${
                            !isUnlocked 
                              ? "opacity-50 bg-black/5 dark:bg-white/5 border-dashed" 
                              : "bg-[#F2F2F7]/40 dark:bg-[#2C2C2E]/40"
                          } ${
                            settings.activeTheme === themeOpt.val 
                              ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]" 
                              : "border-black/5 dark:border-white/5"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-lg">{themeOpt.icon}</span>
                            <div className="flex gap-1">
                              {themeOpt.colors.map((c, i) => (
                                <span key={i} className="w-3 h-3 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-[12px] font-bold text-black dark:text-white truncate flex items-center gap-1">
                              {themeOpt.label}
                              {!isUnlocked && <Lock className="w-3 h-3 text-[#8E8E93] shrink-0" />}
                            </h4>
                            {isUnlocked ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateDiscoverySetting("activeTheme", themeOpt.val)}
                                  className={`text-[9px] px-2 py-0.5 rounded font-bold cursor-pointer ${settings.activeTheme === themeOpt.val ? "bg-[#007AFF] text-white" : "bg-black/5 dark:bg-white/10 text-black dark:text-white"}`}
                                >
                                  {settings.activeTheme === themeOpt.val ? "Active" : "Use"}
                                </button>
                                <button
                                  onClick={() => handlePreview15s("theme", themeOpt.val)}
                                  className="text-[9px] px-2 py-0.5 rounded font-bold bg-black/5 dark:bg-white/10 text-black dark:text-white cursor-pointer"
                                >
                                  Preview
                                </button>
                              </div>
                            ) : (
                              <p className="text-[9px] text-[#8E8E93] font-semibold truncate">
                                {themeOpt.item?.progress} / {themeOpt.item?.targetValue} cycles done
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preferences Toggles (Sounds, Vibrations, Clean Mode) */}
                <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block">
                    {language === "sr" ? "Sistemska Kognitivna Podešavanja" : "Physical Haptic & Feedback Toggles"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: "soundsEnabled", label: "Acoustic Tones (Sound)", icon: <Headphones className="w-4 h-4" /> },
                      { id: "hapticsEnabled", label: "Haptic Taps (Vibrations)", icon: <Activity className="w-4 h-4" /> },
                      { id: "minimalModeEnabled", label: "Clean UI (Minimal Mode)", icon: <LayoutGrid className="w-4 h-4" /> }
                    ].map((toggle) => (
                      <div key={toggle.id} className="flex items-center justify-between p-4 bg-[#F2F2F7]/50 dark:bg-[#2C2C2E]/50 rounded-xl border border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="text-[#8E8E93]">{toggle.icon}</div>
                          <span className="text-[13px] font-bold text-black dark:text-white">
                            {toggle.label}
                          </span>
                        </div>
                        <button
                          onClick={() => updateDiscoverySetting(toggle.id as keyof UserDiscoverySettings, !settings[toggle.id as keyof UserDiscoverySettings])}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            settings[toggle.id as keyof UserDiscoverySettings] ? "bg-[#34C759]" : "bg-[#D1D1D6] dark:bg-[#3A3A3C]"
                          }`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            settings[toggle.id as keyof UserDiscoverySettings] ? "translate-x-5" : ""
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};
