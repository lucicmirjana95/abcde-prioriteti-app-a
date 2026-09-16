import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Lightbulb,
  ClipboardList,
  AlertTriangle,
  Plus,
  Loader2,
  Check,
  Trash2,
  Calendar,
  Compass,
  ArrowRight,
  CheckCircle2,
  Activity,
  Smile,
  Zap,
  Repeat,
  ArrowDownToLine,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ZoomableCard from "./ZoomableCard";

import VoiceInputNode from "./VoiceInputNode";
import { triggerDiscoveryEvent } from "../lib/discoveryEngine";

interface VisionStrategyProps {
  language: "en" | "sr" | "tr";
  onAddTask: (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => void;
  onAddMultipleTasks?: (
    tasks: {
      title: string;
      description?: string;
      category: "A" | "B" | "C" | "D" | "E";
      explanation?: string;
    }[],
  ) => Promise<void>;
  onSaveToInbox?: (
    title: string,
    description: string,
    lifeArea?: string,
  ) => void;
  onSendToREBT?: (obstacleText: string) => void;
  isEvening?: boolean;
}

interface Milestone {
  title: string;
  description: string;
  estimatedDate: string;
  weight: number; // 1 = Lako, 2 = Srednje, 3 = Teško
}

interface ImmediateTask {
  title: string;
  description: string;
  category: "A" | "B" | "C" | "D" | "E";
}

interface SubDecompositionResult {
  subTasks: ImmediateTask[];
  cheerQuote: string;
}

interface SavedVision {
  id: string;
  title: string;
  category: string;
  originalDream: string;
  refinedDream: string;
  targetPeriod: string;
  chambersResult: {
    dreamerText?: string;
    realistText?: string;
    criticText?: string;
    strategicDirection: string;
    riskAssessment: string;
    actionSteps: string[];
  };
  roadmapResult: {
    milestones: Milestone[];
    coachingQuote: string;
    durationYears: number;
  } | null;
  dateSaved: string;
}

const woopTemplates: Record<string, {
  wish: { en: string; sr: string; tr: string };
  outcome: { en: string; sr: string; tr: string };
  obstacle: { en: string; sr: string; tr: string };
  plan: { en: string; sr: string; tr: string };
}> = {
  career: {
    wish: {
      en: "Launch a sustainable online business with organic products",
      sr: "Pokrenuti održiv online biznis sa sopstvenim ekološkim proizvodima",
      tr: "Organik ürünlerle sürdürülebilir bir çevrimiçi işletme kurmak"
    },
    outcome: {
      en: "Having decision-making freedom, passive income, and doing what I love",
      sr: "Imam slobodu odlučivanja, pasivni prihod i radim ono što volim",
      tr: "Karar verme özgürlüğüne, pasif gelire sahip olmak ve sevdiğim işi yapmak"
    },
    obstacle: {
      en: "Perfectionism and fear of failure preventing me from launching the first page",
      sr: "Perfekcionizam i strah od neuspeha koji me sprečavaju da objavim prvu stranicu",
      tr: "Mükemmeliyetçilik ve başarısızlık korkusunun ilk sayfayı yayınlamamı engellemesi"
    },
    plan: {
      en: "I will immediately launch an imperfect landing page and test market demand!",
      sr: "Odmah ću objaviti nesavršenu prvu stranicu (Landing Page) i testirati potražnju bez odlaganja!",
      tr: "Hemen kusurlu bir açılış sayfası yayınlayıp pazar talebini gecikmeden test edeceğim!"
    }
  },
  finance: {
    wish: {
      en: "Save and invest €5,000 into secure index funds this year",
      sr: "Uštedeti i investirati 5000€ u sigurne indeksne fonove ove godine",
      tr: "Bu yıl güvenli endeks fonlarına 5.000 € tasarruf etmek ve yatırım yapmak"
    },
    outcome: {
      en: "Peace of mind knowing I have a solid financial shield and safe future",
      sr: "Mir u glavi jer gradim čvrst finansijski štit i sigurnu budućnost",
      tr: "Sağlam bir finansal kalkana ve güvenli bir geleceğe sahip olmanın getirdiği huzur"
    },
    obstacle: {
      en: "Impulsive buying of unneeded tech gadgets and subscriptions",
      sr: "Impulsivne kupovine nepotrebnih tehničkih sitnica i pretplata",
      tr: "Gereksiz teknolojik aletlerin ve aboneliklerin dürtüsel olarak satın alınması"
    },
    plan: {
      en: "I will set up automatic 15% transfers on pay day before spending anything!",
      sr: "Odmah ću podesiti automatski prenos 15% prihoda čim legne plata, pre nego što potrošim išta!",
      tr: "Maaş gününde herhangi bir şey harcamadan önce otomatik %15 transferi ayarlayacağım!"
    }
  },
  health: {
    wish: {
      en: "Run 5k without stopping 3 times a week",
      sr: "Redovno trčati 5km bez pauze tri puta nedeljno",
      tr: "Haftada 3 kez durmadan 5 km koşmak"
    },
    outcome: {
      en: "Feeling vital, healthy, and having 2x more energy throughout the day",
      sr: "Osećam se vitalno, zdravo i imam dvostruko više energije tokom dana",
      tr: "Gün boyunca zinde, sağlıklı hissetmek ve 2 kat daha fazla enerjiye sahip olmak"
    },
    obstacle: {
      en: "Morning laziness and making excuses to stay warm in bed",
      sr: "Umor i lenjost rano ujutru kada zazvoni alarm",
      tr: "Sabah tembelliği ve yatakta sıcak kalmak için bahaneler üretmek"
    },
    plan: {
      en: "I will immediately put on my running shoes and walk out without second-guessing!",
      sr: "Istog momenta ću obući patike i istrčati bez previše razmišljanja!",
      tr: "Hiç düşünmeden hemen spor ayakkabılarımı giyip dışarı çıkacağım!"
    }
  },
  biohacking: {
    wish: {
      en: "Lower resting heart rate below 55 bpm and average 2h of deep sleep",
      sr: "Smanjiti puls u mirovanju ispod 55 bpm i optimizovati duboki san na 2h proseka",
      tr: "Dinlenme kalp atış hızını 55 bpm'in altına düşürmek ve ortalama 2 saat derin uyku"
    },
    outcome: {
      en: "Superb cognitive focus, cellular regeneration, and high daily output",
      sr: "Izuzetan kognitivni fokus, ćelijska regeneracija i visoka energija tokom dana",
      tr: "Harika bilişsel odaklanma, hücresel yenilenme ve yüksek günlük verimlilik"
    },
    obstacle: {
      en: "Scrolling social media in bed and eating heavy meals past 8 PM",
      sr: "Gledanje u ekran telefona u krevetu i kasni obroci posle 20h",
      tr: "Yatakta sosyal medyada gezinmek ve akşam saat 8'den sonra ağır yemekler yemek"
    },
    plan: {
      en: "I will charge my phone in the kitchen and brew chamomile tea at 9:30 PM!",
      sr: "Staviću telefon da se puni u kuhinji i popiti čaj od kamilice tačno u 21:30h!",
      tr: "Telefonumu mutfakta şarj edeceğim ve saat 21:30'da papatya çayı demleyeceğim!"
    }
  },
  personal: {
    wish: {
      en: "Read 24 books on psychology and business strategy this year",
      sr: "Pročitati 24 knjige iz oblasti psihologije i biznisa ove godine",
      tr: "Bu yıl psikoloji ve iş stratejisi üzerine 24 kitap okumak"
    },
    outcome: {
      en: "Deep understanding of human behavior, better negotiation, and crystal focus",
      sr: "Duboko razumevanje ljudske prirode, bolje pregovaranje i jasan fokus",
      tr: "İnsan davranışlarını derinlemesine anlama, daha iyi müzakere ve net odaklanma"
    },
    obstacle: {
      en: "Wasting time on short-form videos instead of reading before bed",
      sr: "Gubljenje vremena na kratke video klipove pre spavanja",
      tr: "Yatmadan önce kitap okumak yerine kısa videolarda vakit kaybetmek"
    },
    plan: {
      en: "I will leave my phone in the living room and place the book on my pillow!",
      sr: "Ostaviću telefon u dnevnoj sobi, a knjigu staviti direktno na jastuk pre spavanja!",
      tr: "Telefonumu oturma odasında bırakacağım ve kitabı yastığımın üzerine koyacağım!"
    }
  },
  custom: {
    wish: {
      en: "Learn conversational Spanish for my upcoming vacation",
      sr: "Naučiti konverzacijski španski jezik za predstojeće putovanje",
      tr: "Gelecek tatilim için pratik İspanyolca öğrenmek"
    },
    outcome: {
      en: "Chatting freely with locals and experiencing authentic cultural connection",
      sr: "Slobodno ćaskanje sa lokalcima i autentično iskustvo kulture",
      tr: "Yerel halkla özgürce sohbet etmek ve otantik kültürel bağ kurmak"
    },
    obstacle: {
      en: "Forgetting or procrastinating on my daily lesson during busy days",
      sr: "Zaboravljanje da uradim lekciju ili odlaganje zbog dnevnih obaveza",
      tr: "Yoğun günlerde günlük dersimi unutmak veya ertelemek"
    },
    plan: {
      en: "I will set a reminder at 1 PM and practice for 10 minutes over my coffee!",
      sr: "Podesiću podsetnik u 13:00h i uraditi makar 10 minuta vežbe uz popodnevnu kafu!",
      tr: "Saat 13:00'e bir hatırlatıcı kurup kahve içerken 10 dakika pratik yapacağım!"
    }
  }
};

export default function VisionStrategy({
  language,
  onAddTask,
  onAddMultipleTasks,
  onSaveToInbox,
  onSendToREBT,
  isEvening = false,
}: VisionStrategyProps) {
  const isEn = language === "en";

  // Categories of life dreams
  const categories = [
    {
      key: "inbox",
      labelEn: "Idea Vault & Mind Maps",
      labelSr: "Trezor ideja & Mape Uma",
      labelTr: "Fikir Kasası ve Zihin Haritaları",
      icon: "📥",
    },
    {
      key: "career",
      labelEn: "Career & Business",
      labelSr: "Posao i Biznis",
      labelTr: "Kariyer ve İş",
      icon: "💼",
    },
    {
      key: "finance",
      labelEn: "Finances & Assets",
      labelSr: "Finansije i Sredstva",
      labelTr: "Finans ve Varlıklar",
      icon: "💰",
    },
    {
      key: "health",
      labelEn: "Health & Energy",
      labelSr: "Zdravlje i Vitalnost",
      labelTr: "Sağlık ve Enerji",
      icon: "🥗",
    },
    {
      key: "biohacking",
      labelEn: "Biohacking & Optimization",
      labelSr: "Biohacking i Optimizacija",
      labelTr: "Biohacking ve Optimizasyon",
      icon: "🧬",
    },
    {
      key: "personal",
      labelEn: "Personal Growth",
      labelSr: "Lični Razvoj i Duh",
      labelTr: "Kişisel Gelişim",
      icon: "🌱",
    },
    {
      key: "custom",
      labelEn: "Custom Dream",
      labelSr: "Slobodni San",
      labelTr: "Özel Rüya",
      icon: "✨",
    },
  ];

  const [activeCategory, setActiveCategory] = useState(() => {
    return safeStorage.getItem("abcde_vchamber_active_category") || "inbox";
  });

  const [inboxItems, setInboxItems] = useState<string[]>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_inbox");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Save/Load user draft
  const [dreams, setDreams] = useState<Record<string, string>>(() => {
    const defaultDreams = {
      career: "",
      finance: "",
      health: "",
      biohacking: "",
      personal: "",
      custom: "",
    };
    try {
      const stored = safeStorage.getItem("abcde_vchamber_dreams");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Corrupted state from previous bug, drop it or map it to custom
          safeStorage.removeItem("abcde_vchamber_dreams");
          return defaultDreams;
        }
        return { ...defaultDreams, ...parsed };
      }
    } catch {}
    return defaultDreams;
  });

  const [dreamContexts, setDreamContexts] = useState<Record<string, string>>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_dream_contexts");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  // Listen and sync with storage events for easy contextual redirects
  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = safeStorage.getItem("abcde_vchamber_dreams");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!Array.isArray(parsed)) {
            setDreams((prev) => ({ ...prev, ...parsed }));
          }
        }
        const storedContexts = safeStorage.getItem("abcde_vchamber_dream_contexts");
        if (storedContexts) {
          try {
            const parsedCtxs = JSON.parse(storedContexts);
            setDreamContexts(parsedCtxs);
          } catch {}
        }
        const storedInbox = safeStorage.getItem("abcde_vchamber_inbox");
        if (storedInbox) {
          const parsedInbox = JSON.parse(storedInbox);
          if (Array.isArray(parsedInbox)) setInboxItems(parsedInbox);
        }
        const storedCat = safeStorage.getItem("abcde_vchamber_active_category");
        if (storedCat) {
          setActiveCategory(storedCat);
          setWizardStep(1); // Reset to input sheet to show imported dream/task!
        }
      } catch (e) {
        console.error("Error reading stored Vision dreams data:", e);
      }
    };

    handleSync();

    window.addEventListener("storage_sync", handleSync);
    window.addEventListener("companion-sync", handleSync);

    return () => {
      window.removeEventListener("storage_sync", handleSync);
      window.removeEventListener("companion-sync", handleSync);
    };
  }, []);

  // Steps in the Wizard:
  // 1 = Enter Dream/Concept
  // 2 = Strategic Chambers feedback
  // 3 = Interactive Roadmap
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // loading state for chambers
  const [chambersLoading, setChambersLoading] = useState(false);
  const [chambersError, setChambersError] = useState<string | null>(null);

  // Vision strategic feedback parsed result
  const [chambersResult, setChambersResult] = useState<{
    dreamerText?: string;
    realistText?: string;
    criticText?: string;
    strategicDirection: string;
    riskAssessment: string;
    actionSteps: string[];
  } | null>(null);

  // Editable refined dream state
  const [refinedDreams, setRefinedDreams] = useState<Record<string, string>>(
    {},
  );
  const [targetPeriod, setTargetPeriod] = useState<string>("5 godina");

  // Realism check fields
  const [isCheckingRealism, setIsCheckingRealism] = useState(false);
  const [realismCheckResult, setRealismCheckResult] = useState<{
    isUnrealistic: boolean;
    originalGoal: string;
    adjustedGoal: string;
    reasonText: string;
  } | null>(null);

  // Timeline Roadmap fields
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  // Saved Roadmap state (milestones & coaching advice)
  const [roadmapResult, setRoadmapResult] = useState<
    Record<
      string,
      {
        milestones: Milestone[];
        coachingQuote: string;
        durationYears: number;
      }
    >
  >(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_roadmaps");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  // Done milestones tracking
  const [completedMilestones, setCompletedMilestones] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_completed_milestones");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  // Saved Visions State
  const [savedVisions, setSavedVisions] = useState<SavedVision[]>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_saved_visions");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // WOOP Method states (Wish, Outcome, Obstacle, Plan)
  const [isWoopActive, setIsWoopActive] = useState<Record<string, boolean>>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_is_woop_active");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const [woopWish, setWoopWish] = useState<Record<string, string>>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_woop_wish");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const [woopOutcome, setWoopOutcome] = useState<Record<string, string>>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_woop_outcome");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const [woopObstacle, setWoopObstacle] = useState<Record<string, string>>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_woop_obstacle");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const [woopPlan, setWoopPlan] = useState<Record<string, string>>(() => {
    try {
      const stored = safeStorage.getItem("abcde_vchamber_woop_plan");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_is_woop_active", JSON.stringify(isWoopActive));
  }, [isWoopActive]);

  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_woop_wish", JSON.stringify(woopWish));
  }, [woopWish]);

  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_woop_outcome", JSON.stringify(woopOutcome));
  }, [woopOutcome]);

  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_woop_obstacle", JSON.stringify(woopObstacle));
  }, [woopObstacle]);

  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_woop_plan", JSON.stringify(woopPlan));
  }, [woopPlan]);

  // Parser to split conversational morning reset suggestion seeds into clean strategic goals
  const parseInboxItem = (itemText: string) => {
    const colonIndex = itemText.indexOf(":");
    if (colonIndex !== -1 && colonIndex < 120) {
      const title = itemText.substring(0, colonIndex).trim();
      const body = itemText.substring(colonIndex + 1).trim();
      return { title, body, isMorningSeed: true };
    }
    return { title: itemText, body: "", isMorningSeed: false };
  };

  const handleSaveCurrentVision = () => {
    if (!chambersResult) return;

    const uDream = dreams[activeCategory] || "";
    // Search if we already have a saved vision for this refined dream or category to update or save new
    const existingIdx = savedVisions.findIndex(
      (v) => v.category === activeCategory && v.originalDream === uDream,
    );

    const activeRoad = roadmapResult[activeCategory];

    const newVision: SavedVision = {
      id:
        existingIdx >= 0
          ? savedVisions[existingIdx].id
          : "vision-" + Date.now(),
      title:
        (refinedDreams[activeCategory] || "").substring(0, 50) +
        ((refinedDreams[activeCategory] || "").length > 50 ? "..." : ""),
      category: activeCategory,
      originalDream: uDream,
      refinedDream: refinedDreams[activeCategory] || "",
      targetPeriod: targetPeriod,
      chambersResult: chambersResult,
      roadmapResult: activeRoad
        ? {
            milestones: activeRoad.milestones,
            coachingQuote: activeRoad.coachingQuote,
            durationYears: activeRoad.durationYears || 5,
          }
        : null,
      dateSaved: new Date().toLocaleDateString(isEn ? "en-US" : language === "tr" ? "tr-TR" : "sr-RS", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    let updatedList: SavedVision[];
    if (existingIdx >= 0) {
      updatedList = [...savedVisions];
      updatedList[existingIdx] = newVision;
    } else {
      updatedList = [newVision, ...savedVisions];
    }

    setSavedVisions(updatedList);
    safeStorage.setItem(
      "abcde_vchamber_saved_visions",
      JSON.stringify(updatedList),
    );

    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn ? "Vision and Roadmap successfully saved to your personal Archive! 💾" : language === "tr" ? "Vizyon ve Yol Haritası başarıyla kişisel Arşivinize kaydedildi! 💾" : "Vizija i prateća Strateška Mapa Puta su uspešno sačuvane u vašu arhivu! 💾",
          type: "success",
        },
      }),
    );
  };

  const handleDeleteSavedVision = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const updatedList = savedVisions.filter((v) => v.id !== id);
    setSavedVisions(updatedList);
    safeStorage.setItem(
      "abcde_vchamber_saved_visions",
      JSON.stringify(updatedList),
    );
  };

  const handleLoadSavedVision = (vision: SavedVision) => {
    setActiveCategory(vision.category);
    setDreams((prev) => ({ ...prev, [vision.category]: vision.originalDream }));
    setRefinedDreams((prev) => ({
      ...prev,
      [vision.category]: vision.refinedDream,
    }));
    setTargetPeriod(vision.targetPeriod);
    setChambersResult(vision.chambersResult);

    if (vision.roadmapResult) {
      setRoadmapResult((prev) => ({
        ...prev,
        [vision.category]: {
          milestones: vision.roadmapResult!.milestones,
          coachingQuote: vision.roadmapResult!.coachingQuote,
          durationYears: vision.roadmapResult!.durationYears || 5,
        },
      }));
      setWizardStep(3);
    } else {
      setRoadmapResult((prev) => {
        const next = { ...prev };
        delete next[vision.category];
        return next;
      });
      setWizardStep(2);
    }
  };

  // On-demand child micro-task decomposition tracking
  const [activeDecompIdx, setActiveDecompIdx] = useState<number | null>(null);
  const [decompActiveSlide, setDecompActiveSlide] = useState<number>(0);
  const [decompLoading, setDecompLoading] = useState(false);
  const [decompResult, setDecompResult] =
    useState<SubDecompositionResult | null>(null);
  const [decompError, setDecompError] = useState<string | null>(null);

  // On-demand Atomic Habit suggestion tracking
  const [alsoAddAsHabits, setAlsoAddAsHabits] = useState(false);
  const [activeHabitSuggestIdx, setActiveHabitSuggestIdx] = useState<
    number | null
  >(null);
  const [habitSuggestLoading, setHabitSuggestLoading] = useState(false);
  const [habitSuggestResult, setHabitSuggestResult] = useState<
    { name: string; twoMinVersion: string }[] | null
  >(null);
  const [habitSuggestError, setHabitSuggestError] = useState<string | null>(
    null,
  );

  // Checklist of decomposed items chosen by the user
  const [selectedDecompIndexes, setSelectedDecompIndexes] = useState<number[]>(
    [],
  );

  // Task confirmation modal states
  const [taskToConfirm, setTaskToConfirm] = useState<{
    title: string;
    description: string;
    category: "A" | "B" | "C" | "D" | "E";
  } | null>(null);

  const [multipleTasksToConfirm, setMultipleTasksToConfirm] = useState<
    ImmediateTask[] | null
  >(null);
  const [confirmedTasksSelected, setConfirmedTasksSelected] = useState<
    number[]
  >([]);
  const [importActiveSlide, setImportActiveSlide] = useState<number>(0);

  // Local preservation on change
  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_dreams", JSON.stringify(dreams));
  }, [dreams]);

  useEffect(() => {
    safeStorage.setItem("abcde_vchamber_dream_contexts", JSON.stringify(dreamContexts));
  }, [dreamContexts]);

  useEffect(() => {
    safeStorage.setItem(
      "abcde_vchamber_roadmaps",
      JSON.stringify(roadmapResult),
    );
  }, [roadmapResult]);

  useEffect(() => {
    safeStorage.setItem(
      "abcde_vchamber_completed_milestones",
      JSON.stringify(completedMilestones),
    );
  }, [completedMilestones]);

  const handleUpdateDream = (text: string) => {
    setDreams((prev) => ({ ...prev, [activeCategory]: text }));
    // If the user manually edits the dream to something completely different, clear the context
    if (dreamContexts[activeCategory] && !text.toLowerCase().includes(dreams[activeCategory].substring(0, 10).toLowerCase())) {
      setDreamContexts((prev) => ({ ...prev, [activeCategory]: "" }));
    }
  };

  const handleWoopChange = (
    field: "wish" | "outcome" | "obstacle" | "plan",
    value: string,
  ) => {
    let w = field === "wish" ? value : woopWish[activeCategory] || "";
    let o = field === "outcome" ? value : woopOutcome[activeCategory] || "";
    let obs = field === "obstacle" ? value : woopObstacle[activeCategory] || "";
    let p = field === "plan" ? value : woopPlan[activeCategory] || "";

    if (field === "wish") setWoopWish((prev) => ({ ...prev, [activeCategory]: value }));
    if (field === "outcome") setWoopOutcome((prev) => ({ ...prev, [activeCategory]: value }));
    if (field === "obstacle") setWoopObstacle((prev) => ({ ...prev, [activeCategory]: value }));
    if (field === "plan") setWoopPlan((prev) => ({ ...prev, [activeCategory]: value }));

    // Compile into cohesive dream statement
    let compiled = "";
    if (language === "sr") {
      compiled = `Cilj (Wish): ${w}`;
      if (o) compiled += `\nIshod (Outcome): ${o}`;
      if (obs) compiled += `\nPrepreka (Obstacle): ${obs}`;
      if (p) compiled += `\nPlan (Plan): Ako se javi "${obs}", onda ću "${p}"`;
    } else if (language === "tr") {
      compiled = `Hedef (Wish): ${w}`;
      if (o) compiled += `\nSonuç (Outcome): ${o}`;
      if (obs) compiled += `\nEngel (Obstacle): ${obs}`;
      if (p) compiled += `\nPlan (Plan): Eğer "${obs}" ortaya çıkarsa, o zaman "${p}"`;
    } else {
      compiled = `Goal (Wish): ${w}`;
      if (o) compiled += `\nOutcome (Outcome): ${o}`;
      if (obs) compiled += `\nObstacle (Obstacle): ${obs}`;
      if (p) compiled += `\nPlan (Plan): If "${obs}", then I will "${p}"`;
    }
    setDreams((prev) => ({ ...prev, [activeCategory]: compiled }));
  };

  const handleLoadWoopTemplate = () => {
    const template = woopTemplates[activeCategory];
    if (!template) return;

    const langKey = language === "sr" ? "sr" : language === "tr" ? "tr" : "en";
    const w = template.wish[langKey];
    const o = template.outcome[langKey];
    const obs = template.obstacle[langKey];
    const p = template.plan[langKey];

    setWoopWish((prev) => ({ ...prev, [activeCategory]: w }));
    setWoopOutcome((prev) => ({ ...prev, [activeCategory]: o }));
    setWoopObstacle((prev) => ({ ...prev, [activeCategory]: obs }));
    setWoopPlan((prev) => ({ ...prev, [activeCategory]: p }));

    // Compile into cohesive dream statement
    let compiled = "";
    if (language === "sr") {
      compiled = `Cilj (Wish): ${w}`;
      if (o) compiled += `\nIshod (Outcome): ${o}`;
      if (obs) compiled += `\nPrepreka (Obstacle): ${obs}`;
      if (p) compiled += `\nPlan (Plan): Ako se javi "${obs}", onda ću "${p}"`;
    } else if (language === "tr") {
      compiled = `Hedef (Wish): ${w}`;
      if (o) compiled += `\nSonuç (Outcome): ${o}`;
      if (obs) compiled += `\nEngel (Obstacle): ${obs}`;
      if (p) compiled += `\nPlan (Plan): Eğer "${obs}" ortaya çıkarsa, o zaman "${p}"`;
    } else {
      compiled = `Goal (Wish): ${w}`;
      if (o) compiled += `\nOutcome (Outcome): ${o}`;
      if (obs) compiled += `\nObstacle (Obstacle): ${obs}`;
      if (p) compiled += `\nPlan (Plan): If "${obs}", then I will "${p}"`;
    }
    setDreams((prev) => ({ ...prev, [activeCategory]: compiled }));

    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn
            ? "Magical WOOP template loaded! Customize it as you like. ✨"
            : language === "tr"
              ? "Sihirli WOOP şablonu yüklendi! Dilediğiniz gibi özelleştirin. ✨"
              : "Magični WOOP šablon je uspešno učitan! Prilagodite ga po želji. ✨",
          type: "success",
        },
      }),
    );
  };

  const handleLoadDreamWithContext = (title: string, context: string, categoryKey: string) => {
    setDreams((prev) => ({ ...prev, [categoryKey]: title }));
    setDreamContexts((prev) => ({ ...prev, [categoryKey]: context }));
  };

  // 1. Analyze Dream through 3 Chambers (Sanjar, Realista, Kritičar) with prior Realism Guard
  const handleAnalyzeDreamWithRealismCheck = async () => {
    if (isWoopActive[activeCategory]) {
      const w = (woopWish[activeCategory] || "").trim();
      const o = (woopOutcome[activeCategory] || "").trim();
      const obs = (woopObstacle[activeCategory] || "").trim();
      const p = (woopPlan[activeCategory] || "").trim();

      if (!w || !o || !obs || !p) {
        setChambersError(
          isEn 
            ? "Please fill in all 4 WOOP sections (Wish, Outcome, Obstacle, Plan) to generate a complete scientific plan." 
            : language === "tr"
              ? "Tam bir bilimsel plan oluşturmak için lütfen 4 WOOP bölümünü de (Dilek, Sonuç, Engel, Plan) doldurun."
              : "Molimo vas da popunite sva 4 WOOP polja (Želja, Ishod, Prepreka, Plan) kako biste generisali potpun naučni plan."
        );
        return;
      }
    }

    const currentDream = (dreams[activeCategory] || "").trim();
    if (!currentDream) {
      setChambersError(
        isEn ? "Please enter your vision/goal first before analyzing." : language === "tr" ? "Lütfen analiz etmeden önce vizyonunuzu/hedefinizi girin." : "Molimo vas da prvo unesete svoju viziju/cilj pre analize.",
      );
      return;
    }

    setIsCheckingRealism(true);
    setChambersError(null);
    setRealismCheckResult(null);

    try {
      const context = dreamContexts[activeCategory] || "";
      const ideaPayload = context ? `${currentDream} (Kontekst: ${context})` : currentDream;

      const resp = await fetch("/api/check-Vision-realism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaPayload,
          timeframe: targetPeriod,
          language,
        }),
      });

      const valData = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(
          valData.error ||
            (isEn ? "Failed to check realism" : language === "tr" ? "Gerçekçilik kontrol edilemedi" : "Greška pri proveri realnosti."),
        );
      }

      if (valData.error) throw new Error(valData.error);

      if (valData.isUnrealistic) {
        // If unrealistic, store results and display checkpoint screen!
        setRealismCheckResult(valData);
      } else {
        // Goal is realistic, proceed straight to Strategic Visions!
        await triggerChambersAnalysis(currentDream);
      }
    } catch (err: any) {
      setChambersError(
        err.message ||
          (isEn ? "Error checking goal feasibility." : language === "tr" ? "Hedefin uygulanabilirliği kontrol edilirken hata oluştu." : "Greška pri proveravanju ostvarivosti cilja."),
      );
    } finally {
      setIsCheckingRealism(false);
    }
  };

  const triggerChambersAnalysis = async (goalText: string) => {
    setChambersLoading(true);
    setChambersError(null);
    setChambersResult(null);

    try {
      const currentDream = (dreams[activeCategory] || "").trim();
      const context = dreamContexts[activeCategory] || "";
      const ideaPayload = (goalText === currentDream && context) ? `${goalText} (Kontekst: ${context})` : goalText;

      const response = await fetch("/api/Vision-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaPayload,
          language,
          timeframe: targetPeriod,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            (isEn ? "Failed to filter thoughts. Please try again." : language === "tr" ? "Düşünceler filtrelenemedi. Lütfen tekrar deneyin." : "Greška pri filtriranju misli. Pokušajte ponovo."),
        );
      }

      if (data.error) throw new Error(data.error);
      setChambersResult(data);
      setRefinedDreams((prev) => ({ ...prev, [activeCategory]: goalText })); // Autofill refined dreams with original
      setWizardStep(2); // Jump to three rooms step
      setRealismCheckResult(null); // Clear checkpoint result
    } catch (err: any) {
      setChambersError(
        err.message ||
          (isEn ? "Error communicating with AI model." : language === "tr" ? "Yapay zeka modeliyle iletişimde hata oluştu." : "Greška u komunikaciji sa AI modelom."),
      );
    } finally {
      setChambersLoading(false);
    }
  };

  // 2. Generate weight-based Timeline/Roadmap
  const handleGenerateRoadmap = async () => {
    const finalDream = (refinedDreams[activeCategory] || "").trim();

    if (!finalDream) {
      setRoadmapError(
        isEn ? "Please completely formulate your refined vision first." : language === "tr" ? "Lütfen önce rafine vizyonunuzu tamamen formüle edin." : "Molimo vas da prvo dovršite svoju rafinisanu viziju.",
      );
      return;
    }

    setRoadmapLoading(true);
    setRoadmapError(null);

    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: finalDream,
          durationYears: 5,
          timeframe: targetPeriod,
          category: activeCategory,
          language,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate strategic timeline");
      }

      if (data.error) throw new Error(data.error);

      setRoadmapResult((prev) => {
        const next = {
          ...prev,
          [activeCategory]: {
            milestones: data.milestones,
            coachingQuote: data.coachingQuote,
            durationYears: 5,
          },
        };
        return next;
      });

      // Clear completed status for category's milestones
      setCompletedMilestones((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${activeCategory}-`)) {
            delete next[k];
          }
        });
        return next;
      });

      triggerDiscoveryEvent("goal_created", { category: activeCategory });

      setWizardStep(3); // Jump to roadmap timeline step
    } catch (err: any) {
      setRoadmapError(
        isEn ? "Error formulating Roadmap timelines." : language === "tr" ? "Yol Haritası zaman çizelgeleri formüle edilirken hata oluştu." : "Greška prilikom sklapanja strateške Mape Puta.",
      );
    } finally {
      setRoadmapLoading(false);
    }
  };

  // 3. Decompose milestone on demand
  const handleDecomposeMilestone = async (idx: number, text: string) => {
    if (activeDecompIdx === idx) {
      // Toggle off
      setActiveDecompIdx(null);
      setDecompResult(null);
      setDecompError(null);
      setDecompActiveSlide(0);
      return;
    }

    setActiveDecompIdx(idx);
    setDecompActiveSlide(0);
    setDecompLoading(true);
    setDecompResult(null);
    setDecompError(null);
    setSelectedDecompIndexes([]);

    try {
      const response = await fetch("/api/decompose-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneText: text,
          category: activeCategory,
          language,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Milestone decomposition failed");
      }

      setDecompResult(data);
      triggerDiscoveryEvent("goal_broken_down", { category: activeCategory });
      // Select all indexes by default
      if (data.subTasks) {
        setSelectedDecompIndexes(
          data.subTasks.map((_: any, sIdx: number) => sIdx),
        );
      }
    } catch (err: any) {
      setDecompError(
        isEn ? "Failed to break down goal into small chunks." : language === "tr" ? "Hedefi küçük parçalara bölmek başarısız oldu." : "Neuspešno razbijanje prekretnice na sitne korake.",
      );
    } finally {
      setDecompLoading(false);
    }
  };

  const toggleDecompSelection = (sIdx: number) => {
    setSelectedDecompIndexes((prev) => {
      if (prev.includes(sIdx)) {
        return prev.filter((i) => i !== sIdx);
      } else {
        return [...prev, sIdx];
      }
    });
  };

  // 3b. Suggest atomic habits for milestone on demand
  const handleSuggestAtomicHabits = async (idx: number, text: string) => {
    if (activeHabitSuggestIdx === idx) {
      setActiveHabitSuggestIdx(null);
      setHabitSuggestResult(null);
      setHabitSuggestError(null);
      return;
    }

    setActiveHabitSuggestIdx(idx);
    setHabitSuggestLoading(true);
    setHabitSuggestResult(null);
    setHabitSuggestError(null);

    try {
      const response = await fetch("/api/suggest-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone: text,
          category: activeCategory,
          language,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Habit suggestions failed");
      }

      setHabitSuggestResult(data.habits || []);
    } catch (err: any) {
      setHabitSuggestError(
        isEn ? "Failed to formulate custom habits." : language === "tr" ? "Özel alışkanlıkları formüle edemedik." : "Neuspešno formiranje predloga atomskih navika.",
      );
    } finally {
      setHabitSuggestLoading(false);
    }
  };

  const handleImportCustomHabit = (name: string, twoMinVersion: string) => {
    try {
      const hSaved = safeStorage.getItem("abcde_calendar_habits");
      const currentHabits = hSaved ? JSON.parse(hSaved) : [];

      const newHabitId =
        "habit-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5);
      const cleanTitle = name.replace(/[🎯🚀⚡🌱💼💰🥗]/g, "").trim();

      const newHabit = {
        id: newHabitId,
        name: cleanTitle,
        twoMinVersion:
          twoMinVersion ||
          (isEn ? `Execute micro-version of "${cleanTitle.substring(0, 30)}"` : language === "tr" ? `"${cleanTitle.substring(0, 30)}" dosyasının mikro sürümünü yürütün` : `Započni mikro-korak: "${cleanTitle.substring(0, 30)}"`),
        isTwoMinActive: !!twoMinVersion,
      };

      const updatedHabits = [...currentHabits, newHabit];
      safeStorage.setItem(
        "abcde_calendar_habits",
        JSON.stringify(updatedHabits),
      );

      // Trigger standard system sync event so other views refresh automatically
      window.dispatchEvent(new Event("storage_sync"));

      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: isEn ? `"${cleanTitle}" successfully imported into your Routines loop! ⚡` : language === "tr" ? `"${cleanTitle}" başarıyla Rutinler döngünüze aktarıldı! ⚡` : `"${cleanTitle}" je uspešno sačuvano i prebačeno kao nova disciplina u tvoje navike! ⚡`,
            type: "success",
          },
        }),
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: { 
            message: isEn 
              ? "Error adding habit." 
              : language === "tr"
                ? "Alışkanlık eklenirken hata oluştu."
                : "Greška pri dodavanju navike.", 
            type: "error" 
          },
        }),
      );
    }
  };

  // 4. Turn milestone into daily routine loop in one click!
  const handleTransferToHabits = (title: string) => {
    try {
      const hSaved = safeStorage.getItem("abcde_calendar_habits");
      const currentHabits = hSaved ? JSON.parse(hSaved) : [];

      const newHabitId = "habit-" + Date.now();
      const cleanTitle = title.replace(/[🎯🚀⚡🌱💼💰🥗]/g, "").trim();

      const newHabit = {
        id: newHabitId,
        name: cleanTitle,
        twoMinVersion: isEn ? `Read, review or execute micro-routine of "${cleanTitle.substring(0, 30)}"` : language === "tr" ? `"${cleanTitle.substring(0, 30)}" mikro rutinini okuyun, inceleyin veya yürütün` : `Započni prepolovljen, mikro-korak: "${cleanTitle.substring(0, 30)}" (Zakon lakoće)`,
        isTwoMinActive: false,
      };

      const updatedHabits = [...currentHabits, newHabit];
      safeStorage.setItem(
        "abcde_calendar_habits",
        JSON.stringify(updatedHabits),
      );

      // Trigger standard system sync event so other views refresh automatically
      window.dispatchEvent(new Event("storage_sync"));

      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: isEn ? `"${cleanTitle}" successfully imported into your Routines loop! ⚡` : language === "tr" ? `"${cleanTitle}" başarıyla Rutinler döngünüze aktarıldı! ⚡` : `"${cleanTitle}" je uspešno sačuvano i prebačeno kao nova disciplina u tvoje navike! ⚡`,
            type: "success",
          },
        }),
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: { 
            message: isEn 
              ? "Error adding habit." 
              : language === "tr"
                ? "Alışkanlık eklenirken hata oluştu."
                : "Greška pri dodavanju navike.", 
            type: "error" 
          },
        }),
      );
    }
  };

  // Step helper trigger task confirmation before adding to list
  const promptAddTaskConfirmation = (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => {
    setTaskToConfirm({ title, description, category });
  };

  const promptMultipleTasksConfirmation = (tasks: ImmediateTask[]) => {
    setMultipleTasksToConfirm(tasks);
    setConfirmedTasksSelected(tasks.map((_, i) => i));
    setImportActiveSlide(0);
  };

  // Final actions to inject tasks into board
  const executeConfirmSingleTask = () => {
    if (!taskToConfirm) return;
    onAddTask(
      taskToConfirm.title,
      taskToConfirm.description,
      taskToConfirm.category,
    );
    setTaskToConfirm(null);
  };

  const executeConfirmMultipleTasks = async () => {
    if (!multipleTasksToConfirm) return;
    const itemsToAdd = multipleTasksToConfirm.filter((_, i) =>
      confirmedTasksSelected.includes(i),
    );

    // 1. Add to the ABCDE board
    if (onAddMultipleTasks) {
      await onAddMultipleTasks(itemsToAdd);
    } else {
      itemsToAdd.forEach((task) => {
        onAddTask(task.title, task.description || "", task.category);
      });
    }

    // 2. Also register as Atomic Habits loop if chosen by user
    if (alsoAddAsHabits) {
      try {
        const hSaved = safeStorage.getItem("abcde_calendar_habits");
        const currentHabits = hSaved ? JSON.parse(hSaved) : [];
        let updatedHabits = [...currentHabits];

        itemsToAdd.forEach((task, index) => {
          const newHabitId = "habit-decomp-" + Date.now() + "-" + index;
          const cleanTitle = task.title.replace(/[🎯🚀⚡🌱💼💰🥗]/g, "").trim();

          updatedHabits.push({
            id: newHabitId,
            name: cleanTitle,
            twoMinVersion: isEn ? `Read, do or execute micro-routine "${cleanTitle.substring(0, 30)}"` : language === "tr" ? `"${cleanTitle.substring(0, 30)}" mikro rutinini okuyun, yapın veya yürütün` : `Započni mikro-korak: "${cleanTitle.substring(0, 30)}" (Zakon lakoće)`,
            isTwoMinActive: false,
          });
        });

        safeStorage.setItem(
          "abcde_calendar_habits",
          JSON.stringify(updatedHabits),
        );
        window.dispatchEvent(new Event("storage_sync"));
      } catch (err) {
        console.error("Greška pri kopiranju u navike:", err);
      }
    }

    setMultipleTasksToConfirm(null);
  };

  // Toggle milestone completion checkbox
  const toggleMilestoneCompleted = (idx: number) => {
    const key = `${activeCategory}-${idx}`;
    setCompletedMilestones((prev) => {
      const isNowCompleted = !prev[key];
      
      if (isNowCompleted) {
        triggerDiscoveryEvent("milestone_completed", { category: activeCategory });
      }
      
      return {
        ...prev,
        [key]: isNowCompleted,
      };
    });
  };

  // Math calculation for weight-based timeline completed percentage
  const activeRoadmap = roadmapResult[activeCategory];
  const activeMilestones = activeRoadmap?.milestones || [];

  let totalWeight = 0;
  let completedWeight = 0;
  activeMilestones.forEach((m, idx) => {
    totalWeight += m.weight || 1;
    if (completedMilestones[`${activeCategory}-${idx}`]) {
      completedWeight += m.weight || 1;
    }
  });

  const percentageProgress =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const t = {
    title: isEn ? "Strategic Visions & Roadmap Gateway" : language === "tr" ? "Stratejik Vizyon ve Yol Haritası Ağ Geçidi" : "Strateške Vizije i Mape Puta",
    subtitle: isEn ? "Validate your life-altering aspirations through the 3 Creative rooms, and structure highly adaptive, weight-based checklists." : language === "tr" ? "3 Yaratıcı oda aracılığıyla hayatınızı değiştirecek arzularınızı doğrulayın ve son derece uyarlanabilir, ağırlığa dayalı kontrol listeleri oluşturun." : "Proverite svoje životne ciljeve kroz 3 kreativne odaje i formirajte hronološke akcione planove sa težinama.",
    dreamLabel: isEn ? "Enter your core life dream or vision" : language === "tr" ? "Temel yaşam hayalinize veya vizyonunuza girin" : "Upišite vaš suštinski cilj ili životni san",
    inputHelp: isEn ? "First, we check your concept across 3 perspectives before formulating actual timelines." : language === "tr" ? "İlk olarak, gerçek zaman çizelgelerini formüle etmeden önce konseptinizi 3 perspektifte kontrol ediyoruz." : "Prvo proveravamo vaš koncept iz 3 ugla kako bismo izbegli slepe tačke pre sklapanja timeline-a.",
    btnAnalyze: isEn ? "Walk Through Chambers" : language === "tr" ? "Odalardan Geçin" : "Kreni kroz kreativne odaje",
    roomDreamer: isEn ? "🎯 Dreamer Chamber (Sanjar)" : language === "tr" ? "🎯 Hayalperest Odası (Sencer)" : "🎯 Odaja Sanjara (Dreamer)",
    roomRealist: isEn ? "⚡ Realist Chamber (Realista)" : language === "tr" ? "⚡ Realist Odası (Realista)" : "⚡ Odaja Realiste (Realist)",
    roomCritic: isEn ? "🔍 Critic Chamber (Kritičar)" : language === "tr" ? "🔍 Eleştirmen Odası (Kritičar)" : "🔍 Odaja Kritičara (Critic)",
    refineTitle: isEn ? "Refine & Tweak Your Core Vision" : language === "tr" ? "Temel Vizyonunuzu İyileştirin ve İnce Ayarlayın" : "Precizirajte i korigujte svoj san na osnovu provere",
    refinePlaceholder: isEn ? "Formulate the final confirmed dream text..." : language === "tr" ? "Onaylanmış son rüya metnini formüle edin..." : "Doterajte i upišite konačnu potvrđenu verziju svog cilja ovde...",
    durLabel: isEn ? "Choose Roadmap Span" : language === "tr" ? "Yol Haritası Kapsamını Seçin" : "Izaberite vremenski opseg mape puta",
    yearsEn: "Years",
    yearsSr: "Godina",
    btnBuild: isEn ? "Confirm & Settle Roadmap Timeline" : language === "tr" ? "Yol Haritası Zaman Çizelgesini Onaylayın ve Yerleştirin" : "Potvrdi i generiši vremensku osu / milestones",
    timelineAnchor: isEn ? "Timeline Progression Roadmap" : language === "tr" ? "Zaman Çizelgesi İlerleme Yol Haritası" : "Hronološka Mapa Puta & Prekretnice",
    progressDetails: isEn ? "Weighted completion progress bar (based on milestone difficulty level)" : language === "tr" ? "Ağırlıklı tamamlama ilerleme çubuğu (kilometre taşı zorluk seviyesine göre)" : "Progres popunjenosti na osnovu težine prekretnica (lakši i teži koraci se vrednuju srazmerno naporu)",
    weightLabel: isEn ? "Difficulty Level:" : language === "tr" ? "Zorluk Seviyesi:" : "Stepen težine:",
    weightLako: isEn ? "Easy (Weight 1)" : language === "tr" ? "Kolay (Ağırlık 1)" : "Lako (Težina 1)",
    weightSrednje: isEn ? "Medium (Weight 2)" : language === "tr" ? "Orta (Ağırlık 2)" : "Srednje (Težina 2)",
    weightTeško: isEn ? "Hard (Weight 3)" : language === "tr" ? "Sert (Ağırlık 3)" : "Teško (Težina 3)",
    btnDecompose: isEn ? "Decompose Step" : language === "tr" ? "Ayrıştırma Adımı" : "Razloži u korake",
    btnHabit: isEn ? "Make Daily Habit" : language === "tr" ? "Günlük Alışkanlık Yapın" : "Pretvori u naviku",
    noTimeline: isEn ? "Chambers are ready! Touch the button below to generate your timeline roadmap." : language === "tr" ? "Odalar hazır! Zaman çizelgesi yol haritanızı oluşturmak için aşağıdaki düğmeye dokunun." : "Kreativna provera je obavljena! Pritisnite dugme ispod da formirate hronološku mapu puta.",
    roadmapInstructions: isEn ? "Step back and view milestones calculated from today. Complete harder ones to boost progress faster!" : language === "tr" ? "Geri adım atın ve bugünden itibaren hesaplanan kilometre taşlarını görüntüleyin. İlerlemeyi daha hızlı artırmak için daha zor olanları tamamlayın!" : "Analizirajte korake od današnjeg datuma. Ostvarite teže ciljeve da znatno brže popunite progres traku!",
    coachingAdvice: isEn ? "Strategic Coach Insight" : language === "tr" ? "Stratejik Koç İçgörüsü" : "Strateški savet mentora",
  };

  return (
    <div
      className={`border rounded-xl sm:rounded-[1.5rem] p-3.5 sm:p-6 space-y-6 transition-all duration-300 ${
        isEvening
          ? "bg-[#1C1C1E] border-white/5 text-white"
          : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white"
      }`}
      id="vision-chamber-panel-root"
    >
      {/* Horizontal Header Section - Only progress pills */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 ${
          isEvening
            ? "border-black/5 dark:border-white/5"
            : "border-black/5 dark:border-white/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`p-2 rounded-xl shrink-0 ${
              isEvening
                ? "bg-white dark:bg-[#1C1C1E]/5 text-[#0A84FF] border border-black/5 dark:border-white/5/40"
                : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#FF9500] dark:text-[#FF9F0A] border border-black/5 dark:border-white/5"
            }`}
          >
            <Compass className="w-5 h-5 font-semibold animate-spin-slow" />
          </span>
        </div>

        {/* Step progress pills helper */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setWizardStep(1)}
            className={`px-3 py-1.5 rounded-lg text-[13px] sm:text-xs font-medium transition-colors cursor-pointer ${
              wizardStep === 1
                ? "bg-black dark:bg-[#1C1C1E] text-white dark:text-white"
                : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"
            }`}
          >
            1. {isEn ? "Room Concept" : language === "tr" ? "Oda Konsepti" : "Koncept vizije"}
          </button>
          <button
            disabled={!chambersResult}
            onClick={() => setWizardStep(2)}
            className={`px-3 py-1.5 rounded-lg text-[13px] sm:text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer ${
              wizardStep === 2
                ? "bg-black dark:bg-[#1C1C1E] text-white dark:text-white"
                : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"
            }`}
          >
            2. {isEn ? "Chambers Check" : language === "tr" ? "Oda Kontrolü" : "Tri odaje"}
          </button>
          <button
            disabled={!activeRoadmap}
            onClick={() => setWizardStep(3)}
            className={`px-3 py-1.5 rounded-lg text-[13px] sm:text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer ${
              wizardStep === 3
                ? "bg-black dark:bg-[#1C1C1E] text-white dark:text-white"
                : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"
            }`}
          >
            3. {isEn ? "Roadmap Plan" : language === "tr" ? "Yol Haritası Planı" : "Strateški put"}
          </button>
        </div>
      </div>

      {/* Interactive Areas Category Selector pills */}
      <div
        className="flex flex-wrap sm:flex-nowrap overflow-x-auto scrollbar-none gap-2 pb-1"
        id="Vision-category-selector-pills"
      >
        {categories.map((cat) => {
          const hasTimeline = !!roadmapResult[cat.key];
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                setDecompResult(null);
                setActiveDecompIdx(null);
                setChambersResult(null);
                // Switch wizard step context depending on content availability
                if (roadmapResult[cat.key]) {
                  setWizardStep(3);
                } else {
                  setWizardStep(1);
                }
              }}
              className={`p-2 px-3 sm:px-3.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 border cursor-pointer transition-all ${
                activeCategory === cat.key
                  ? isEvening
                    ? "bg-white dark:bg-[#1C1C1E] border-white text-[#3C3C43] dark:text-[#EBEBF5]/80"
                    : "bg-black dark:bg-white/10 border-black/5 dark:border-white/5 text-white"
                  : isEvening
                    ? "bg-black border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#1C1C1E]"
                    : "bg-[#F2F2F7] dark:bg-[#1C1C1E]/80 border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:text-black dark:text-white"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{isEn ? cat.labelEn : language === "tr" ? cat.labelTr : cat.labelSr}</span>
              {isWoopActive[cat.key] && (
                <span className="text-[9px] font-extrabold tracking-wider bg-[#FF9500]/15 dark:bg-[#FF9F0A]/15 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/25 dark:border-[#FF9F0A]/25 rounded px-1 scale-95 shrink-0 select-none">
                  WOOP
                </span>
              )}
              {hasTimeline && (
                <span className="w-2 h-2 rounded-full bg-[#34C759] dark:bg-[#30D158] transition-opacity shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeCategory === "inbox" && (
          <motion.div
            key="wizard-inbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-[#007AFF]/10 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-6 sm:p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white dark:bg-white/5 rounded-xl">
                  <span className="text-2xl">📥</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black dark:text-white tracking-wide">
                    {isEn ? "Idea Vault" : language === "tr" ? "Fikir Kasası" : "Trezor Strateških ideja"}
                  </h3>
                  <p className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {isEn ? "Incoming ideas and mental nodes from the Mind Map." : language === "tr" ? "Zihin Haritasından gelen fikirler ve zihinsel düğümler." : "Pristigle ideje iz mapa uma spremne za realizaciju."}
                  </p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    isEn ? "Add a new idea..." : language === "tr" ? "Yeni bir fikir ekle..." : "Upišite i dodajte novu ideju..."
                  }
                  className={`w-full text-[14px] pl-4 pr-12 py-3 rounded-xl font-medium outline-none border transition-all focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm ${
                    isEvening
                      ? "bg-[#1C1C1E] border-white/5 text-white placeholder-white/40"
                      : "bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      const val = e.currentTarget.value.trim();
                      const newInbox = [val, ...inboxItems];
                      setInboxItems(newInbox);
                      safeStorage.setItem(
                        "abcde_vchamber_inbox",
                        JSON.stringify(newInbox),
                      );
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF] hover:text-white transition-all active:scale-95"
                  onClick={(e) => {
                    const input = e.currentTarget
                      .previousElementSibling as HTMLInputElement;
                    if (input && input.value.trim()) {
                      const val = input.value.trim();
                      const newInbox = [val, ...inboxItems];
                      setInboxItems(newInbox);
                      safeStorage.setItem(
                        "abcde_vchamber_inbox",
                        JSON.stringify(newInbox),
                      );
                      input.value = "";
                    }
                  }}
                  title={isEn ? "Add Idea" : language === "tr" ? "Fikir Ekle" : "Dodaj ideju"}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {inboxItems.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <span className="text-xl text-[#3C3C43] grayscale opacity-50 mb-3">
                    📭
                  </span>
                  <p className="text-sm font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 max-w-sm">
                    {isEn ? "Your Idea Vault is empty. Add ideas above or send from the Mind Map." : language === "tr" ? "Fikir Kasanız boş. Yukarıya fikir ekleyin veya Zihin Haritasından gönderin." : "Vaš Trezor je prazan. Dodajte ideju iznad ili iz Mape Uma na razradu."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {inboxItems.map((item, idx) => {
                      const parsed = parseInboxItem(item);
                      return (
                        <motion.div
                          key={`inbox-item-${item}`}
                          initial={{ opacity: 0, y: 15, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          layout
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="p-5 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5 group hover:border-black/5 dark:border-white/5 transition-all"
                        >
                          <div className="flex-1">
                            {parsed.isMorningSeed ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF9500] dark:text-[#FF9F0A] uppercase tracking-wider">
                                  <span>🌤️</span>
                                  <span>
                                    {isEn
                                      ? "Morning Reset Inspiration"
                                      : language === "tr"
                                        ? "Sabah Sıfırlama Tohumu"
                                        : "Inspiracija iz Jutarnjeg Reseta"}
                                  </span>
                                </div>
                                <h5 className="text-[14px] font-bold text-[#1C1C1E] dark:text-white leading-snug">
                                  {parsed.title}
                                </h5>
                                <div className="p-3 bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5 border-l-2 border-[#FF9500]/40 dark:border-[#FF9F0A]/40 rounded-r-lg text-xs text-[#3C3C43]/80 dark:text-[#EBEBF5]/70 italic leading-relaxed">
                                  {parsed.body}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white leading-relaxed break-words">
                                {item}
                              </p>
                            )}

                            <div className="mt-3">
                              <span className="text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 uppercase tracking-normal block mb-1.5">
                                {isEn ? "Activate for Life Area:" : language === "tr" ? "Yaşam Alanı için Etkinleştir:" : "Prebaci u oblast života:"}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {categories
                                  .filter((cat) => cat.key !== "inbox")
                                  .map((cat) => (
                                    <button
                                      key={cat.key}
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        // Remove item from inbox
                                        let newInbox = [...inboxItems];
                                        newInbox.splice(idx, 1);
                                        setInboxItems(newInbox);
                                        safeStorage.setItem(
                                          "abcde_vchamber_inbox",
                                          JSON.stringify(newInbox),
                                        );

                                        // Set directly as the dream/vision with context
                                        handleLoadDreamWithContext(parsed.title, parsed.body, cat.key);

                                        safeStorage.setItem(
                                          "abcde_vchamber_active_category",
                                          cat.key,
                                        );
                                        setActiveCategory(cat.key);
                                        setWizardStep(1);
                                      }}
                                      className="px-2.5 py-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/25 dark:bg-[#1C1C1E]/60 dark:hover:bg-[#1C1C1E] text-[#007AFF] dark:text-[#0A84FF] font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-[#007AFF]/10 dark:border-white/5"
                                    >
                                      <span>{cat.icon}</span>
                                      <span>
                                        {isEn
                                          ? cat.labelEn.split(" ")[0]
                                          : language === "tr" ? cat.labelTr.split(" ")[0] : cat.labelSr.split(" ")[0]}
                                      </span>
                                    </button>
                                  ))}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSaveToInbox) {
                                    onSaveToInbox(
                                      isEn ? "Strategic Node" : language === "tr" ? "Stratejik Düğüm" : "Strateški Čvor",
                                      item,
                                      isEn ? "Mind Map Idea" : language === "tr" ? "Zihin Haritası Fikri" : "Ideja Mape Uma",
                                    );
                                  }
                                  let newInbox = [...inboxItems];
                                  newInbox.splice(idx, 1);
                                  setInboxItems(newInbox);
                                  safeStorage.setItem(
                                    "abcde_vchamber_inbox",
                                    JSON.stringify(newInbox),
                                  );
                                }}
                                className="px-2.5 py-1.5 bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] dark:bg-[#3A3A3C] dark:hover:bg-[#48484A] text-[#3C3C43] dark:text-white font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-black/5 dark:border-white/5"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>
                                  {isEn ? "To Daily ABCDE" : language === "tr" ? "Günlük ABCDE'ye" : "U Dnevni Plan"}
                                </span>
                              </button>
                              {onSendToREBT && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSendToREBT(item);
                                    let newInbox = [...inboxItems];
                                    newInbox.splice(idx, 1);
                                    setInboxItems(newInbox);
                                    safeStorage.setItem(
                                      "abcde_vchamber_inbox",
                                      JSON.stringify(newInbox),
                                    );
                                  }}
                                  className="px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] dark:bg-[#FF453A]/10 dark:hover:bg-[#FF453A]/20 font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  title={
                                    isEn ? "Send to Mindset Coach" : language === "tr" ? "Zihniyet Koçu'na gönder" : "Pošalji Mentoru na obradu"
                                  }
                                >
                                  <span>🧠</span>
                                  <span>{isEn ? "To Mindset" : language === "tr" ? "Zihniyet'e" : "U Mindset"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 self-end md:self-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              let newInbox = [...inboxItems];
                              newInbox.splice(idx, 1);
                              setInboxItems(newInbox);
                              safeStorage.setItem(
                                "abcde_vchamber_inbox",
                                JSON.stringify(newInbox),
                              );
                            }}
                            className="p-2.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] dark:bg-[#FF453A]/10 dark:hover:bg-[#FF453A]/20 rounded-xl transition-all cursor-pointer"
                            title={isEn ? "Delete Idea" : language === "tr" ? "Fikri Sil" : "Obriši ideju"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 1: INPUT ORIGINAL DREAM / CHOOSE CATEGORY */}
        {activeCategory !== "inbox" && wizardStep === 1 && (
          <motion.div
            key="wizard-concept-input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div
              className={`p-4 border rounded-xl space-y-3 ${
                isEvening
                  ? "bg-black border-white/5"
                  : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
              }`}
            >
              <div className="flex justify-between items-center relative mb-1">
                <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-2">
                  🌌 {categories.find((c) => c.key === activeCategory)?.icon}{" "}
                  {t.dreamLabel}
                </span>
                <div className="flex items-center gap-2">
                  {!isWoopActive[activeCategory] && (
                    <VoiceInputNode
                      isEvening={isEvening}
                      language={language}
                      onTranscript={(text) => handleUpdateDream((dreams[activeCategory] || "") + text)}
                      onStartRecording={() => handleUpdateDream("")}
                      inline={true}
                    />
                  )}
                  <span className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    Step 1 / 3
                  </span>
                </div>
              </div>

              {/* Segmented Control for standard vs WOOP */}
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsWoopActive(prev => ({ ...prev, [activeCategory]: false }))}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    !isWoopActive[activeCategory]
                      ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm"
                      : "text-[#3C3C43]/70 dark:text-[#EBEBF5]/60 hover:text-black dark:hover:text-white"
                  }`}
                >
                  {language === "sr" ? "Standardni san" : language === "tr" ? "Standart Rüya" : "Standard Dream"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsWoopActive(prev => ({ ...prev, [activeCategory]: true }))}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isWoopActive[activeCategory]
                      ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm"
                      : "text-[#3C3C43]/70 dark:text-[#EBEBF5]/60 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[#FF9500]" />
                  <span>{language === "sr" ? "Naučni WOOP" : language === "tr" ? "Bilimsel WOOP" : "Scientific WOOP"}</span>
                </button>
              </div>

              {!isWoopActive[activeCategory] ? (
                <div className="relative">
                  <textarea
                    value={dreams[activeCategory] || ""}
                    onChange={(e) => handleUpdateDream(e.target.value)}
                    rows={4}
                    placeholder={
                      isEn ? "E.g., Complete fully active fitness programs, increase energy, and sleep 8 hours..." : language === "tr" ? "Örneğin, tamamen aktif fitness programlarını tamamlayın, enerjiyi artırın ve 8 saat uyuyun..." : "Npr., Pokrenuti održiv online biznis sa sopstvenim ekološkim proizvodima i dostići visoku stabilnost..."
                    }
                    className={`w-full text-xs sm:text-sm py-4 pl-4 pr-4 rounded-xl font-medium leading-relaxed outline-none focus:ring-2 resize-y shadow-sm ${
                      isEvening
                        ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-white/40 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                        : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                    }`}
                    id="dream-textarea-input"
                  />
                </div>
              ) : (
                <div className="space-y-4 pt-1 text-left">
                  <div className="p-3 bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 rounded-xl border border-[#007AFF]/10 dark:border-[#0A84FF]/15 text-xs text-[#007AFF] dark:text-[#0A84FF] leading-relaxed flex gap-2">
                    <span className="text-sm">💡</span>
                    <span>
                      {language === "sr" 
                        ? "WOOP (Wish, Outcome, Obstacle, Plan) je naučni model psihologa Gabriele Oettingen. Kombinuje vizuelizaciju uspeha sa prepoznavanjem unutrašnjih prepreka i 'ako-onda' akcijom." 
                        : language === "tr"
                          ? "WOOP (Wish, Outcome, Obstacle, Plan), psikolog Gabriele Oettingen'in bilimsel modelidir. Başarı görselleştirmesini içsel engelleri tanıma ve 'eğer-o zaman' eylemiyle birleştirir."
                          : "WOOP (Wish, Outcome, Obstacle, Plan) is psychologist Gabriele Oettingen's scientific framework. It pairs positive visualization with real obstacle planning and 'if-then' implementation intentions."}
                    </span>
                  </div>

                  {woopTemplates[activeCategory] && (
                    <button
                      type="button"
                      onClick={handleLoadWoopTemplate}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/10 hover:bg-[#FF9500]/15 dark:bg-[#FF9F0A]/10 dark:hover:bg-[#FF9F0A]/15 border border-[#FF9500]/25 dark:border-[#FF9F0A]/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FF9500] dark:text-[#FF9F0A] animate-pulse" />
                      <span>
                        {language === "sr"
                          ? "💫 Učitaj magični WOOP primer za ovu oblast"
                          : language === "tr"
                            ? "💫 Bu alan için sihirli WOOP örneğini yükle"
                            : "💫 Load magical WOOP example for this area"}
                      </span>
                    </button>
                  )}

                  {/* WISH */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3C3C43] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-[10px]">W</span>
                      <span>{language === "sr" ? "Wish (Želja) — Tvoj ambiciozan ali dostižan cilj" : language === "tr" ? "Wish (Dilek) — Zorlayıcı ama dostižan hedefiniz" : "Wish (Wish) — Your challenging yet realistic goal"}</span>
                    </label>
                    <input
                      type="text"
                      value={woopWish[activeCategory] || ""}
                      onChange={(e) => handleWoopChange("wish", e.target.value)}
                      placeholder={language === "sr" ? "Npr. Redovno trčati 5km bez pauze za 3 meseca" : language === "tr" ? "Örn. 3 ay boyunca kesintisiz 5 km koşmak" : "E.g. Run a 5k without stopping in 3 months"}
                      className={`w-full text-xs sm:text-sm px-4 py-3 rounded-xl font-medium outline-none border focus:ring-2 ${
                        isEvening
                          ? "bg-[#1C1C1E] border-white/5 text-white placeholder:text-white/30 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                          : "bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/40 focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                      }`}
                    />
                  </div>

                  {/* OUTCOME */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3C3C43] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold text-[10px]">O</span>
                      <span>{language === "sr" ? "Outcome (Najbolji ishod) — Koji je krajnji benefit?" : language === "tr" ? "Outcome (Sonuç) — En iyi sonuç nedir?" : "Outcome (Outcome) — What is the ultimate benefit or feeling?"}</span>
                    </label>
                    <input
                      type="text"
                      value={woopOutcome[activeCategory] || ""}
                      onChange={(e) => handleWoopChange("outcome", e.target.value)}
                      placeholder={language === "sr" ? "Npr. Osećam se vitalno, zdravo i imam 2x više energije tokom dana" : language === "tr" ? "Örn. Gün boyunca daha sağlıklı hissetmek ve 2 kat daha fazla enerjiye sahip olmak" : "E.g. Feeling vital, healthy, and having 2x more energy throughout the day"}
                      className={`w-full text-xs sm:text-sm px-4 py-3 rounded-xl font-medium outline-none border focus:ring-2 ${
                        isEvening
                          ? "bg-[#1C1C1E] border-white/5 text-white placeholder:text-white/30 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                          : "bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/40 focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                      }`}
                    />
                  </div>

                  {/* OBSTACLE */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3C3C43] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center font-bold text-[10px]">O</span>
                      <span>{language === "sr" ? "Obstacle (Unutrašnja prepreka) — Šta te unutar tebe sabotira?" : language === "tr" ? "Obstacle (Engel) — Seni sabote eden içsel engeliniz nedir?" : "Obstacle (Obstacle) — What internal thought/habit could hold you back?"}</span>
                    </label>
                    <input
                      type="text"
                      value={woopObstacle[activeCategory] || ""}
                      onChange={(e) => handleWoopChange("obstacle", e.target.value)}
                      placeholder={language === "sr" ? "Npr. Osećaj lenjosti rano ujutru i opravdanja za spavanje" : language === "tr" ? "Örn. Sabahları tembellik hissi ve uyuma bahaneleri" : "E.g. Morning laziness and finding excuses to stay in bed"}
                      className={`w-full text-xs sm:text-sm px-4 py-3 rounded-xl font-medium outline-none border focus:ring-2 ${
                        isEvening
                          ? "bg-[#1C1C1E] border-white/5 text-white placeholder:text-white/30 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                          : "bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/40 focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                      }`}
                    />
                  </div>

                  {/* PLAN */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3C3C43] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center font-bold text-[10px]">P</span>
                      <span>{language === "sr" ? "Plan (Ako-Onda) — Tvoj odbrambeni akcioni plan" : language === "tr" ? "Plan (Eğer-O Zaman) — Savunma planınız" : "Plan (If-Then Plan) — Your execution intention"}</span>
                    </label>

                    {woopObstacle[activeCategory] && (
                      <div className="flex gap-2 items-center bg-[#FF3B30]/5 dark:bg-[#FF453A]/5 px-3 py-2 rounded-xl border border-[#FF3B30]/10 dark:border-[#FF453A]/10 text-[11px] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="font-bold text-[#FF3B30] uppercase shrink-0">{language === "sr" ? "AKO:" : language === "tr" ? "EĞER:" : "IF:"}</span>
                        <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 italic truncate">{woopObstacle[activeCategory]}</span>
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <span className="text-[11px] font-bold text-[#34C759] uppercase shrink-0">{language === "sr" ? "ONDA:" : language === "tr" ? "O ZAMAN:" : "THEN:"}</span>
                      <input
                        type="text"
                        value={woopPlan[activeCategory] || ""}
                        onChange={(e) => handleWoopChange("plan", e.target.value)}
                        placeholder={language === "sr" ? "Npr. Istog momenta ću obući patike i istrčati bez razmišljanja" : language === "tr" ? "Örn. Hiç düşünmeden hemen spor ayakkabılarımı giyip çıkacağım" : "E.g. I will immediately put on my running shoes and walk out without thinking"}
                        className={`flex-1 text-xs sm:text-sm px-4 py-3 rounded-xl font-medium outline-none border focus:ring-2 ${
                          isEvening
                            ? "bg-[#1C1C1E] border-white/5 text-white placeholder:text-white/30 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                            : "bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/40 focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {dreamContexts[activeCategory] && (
                <div className="p-3 bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/20 dark:border-amber-400/15 rounded-xl flex flex-col gap-1 text-left animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <span>🌤️</span>
                    <span>
                      {isEn
                        ? "Morning Reset Context Included"
                        : language === "tr"
                          ? "Sabah Sıfırlama Bağlamı Dahil"
                          : "Uključen Kontekst Jutarnjeg Reseta"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#3C3C43]/90 dark:text-[#EBEBF5]/70 italic leading-relaxed">
                    {dreamContexts[activeCategory]}
                  </p>
                </div>
              )}

              {/* Quick Access from Idea Vault (Morning Reset sync) */}
              {inboxItems.length > 0 && (
                <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-[1px] flex-1 bg-black/5 dark:bg-white/10" />
                    <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-normal whitespace-nowrap">
                      {isEn ? "Suggested from Morning Reset" : language === "tr" ? "Morning Reset'ten önerildi" : "Predloženo iz jutarnjeg zapisa"}
                    </span>
                    <div className="h-[1px] flex-1 bg-black/5 dark:bg-white/10" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inboxItems.slice(0, 3).map((item, idx) => {
                      const parsed = parseInboxItem(item);
                      return (
                        <button
                          key={`quick-vision-idea-${idx}`}
                          type="button"
                          onClick={() => {
                            handleLoadDreamWithContext(parsed.title, parsed.body, activeCategory);
                            window.dispatchEvent(
                              new CustomEvent("trigger-toast", {
                                detail: {
                                  message: isEn 
                                    ? "Idea successfully refined and loaded! 💡" 
                                    : language === "tr" 
                                      ? "Fikir başarıyla arıtıldı ve yüklendi! 💡" 
                                      : "Ideja uspešno prečišćena i učitana! 💡",
                                  type: "success",
                                },
                              }),
                            );
                          }}
                          className={`text-[11px] font-semibold px-3 py-2 rounded-xl transition-all active:scale-95 text-left flex items-center gap-2 max-w-[280px] border truncate shadow-sm hover:shadow-md ${
                            isEvening
                              ? "bg-[#1C1C1E] border-white/10 text-white/80 hover:bg-black/40"
                              : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] dark:text-white dark:border-white/10"
                          }`}
                          title={parsed.isMorningSeed ? parsed.body : item}
                        >
                          <span className="shrink-0 bg-[#007AFF]/10 p-1 rounded-md">
                            {parsed.isMorningSeed ? "🌤️" : "💡"}
                          </span>
                          <span className="truncate">{parsed.title}</span>
                        </button>
                      );
                    })}
                    {inboxItems.length > 3 && (
                      <button
                        onClick={() => setActiveCategory("inbox")}
                        className="text-[11px] font-bold text-[#007AFF] px-2 py-2 hover:underline"
                      >
                        +{inboxItems.length - 3} {isEn ? "more..." : language === "tr" ? "Daha..." : "više..."}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Target timeframe picker */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                  >
                    {isEn ? "Target Period for Achievement" : language === "tr" ? "Başarı için Hedef Dönem" : "Ciljani period za ostvarenje"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: isEn ? "3 Months" : language === "tr" ? "3 Ay" : "3 Meseca",
                      valEn: "3 Months",
                      valSr: "3 Meseca",
                      num: 3,
                    },
                    {
                      label: isEn ? "6 Months" : language === "tr" ? "6 Ay" : "6 Meseci",
                      valEn: "6 Months",
                      valSr: "6 Meseci",
                      num: 6,
                    },
                    {
                      label: isEn ? "1 Year" : language === "tr" ? "1 Yıl" : "1 Godina",
                      valEn: "1 Year",
                      valSr: "1 Godina",
                      num: 12,
                    },
                    {
                      label: isEn ? "2 Years" : language === "tr" ? "2 Yıl" : "2 Godine",
                      valEn: "2 Years",
                      valSr: "2 Godine",
                      num: 24,
                    },
                    {
                      label: isEn ? "3 Years" : language === "tr" ? "3 Yıl" : "3 Godine",
                      valEn: "3 Years",
                      valSr: "3 Godine",
                      num: 36,
                    },
                    {
                      label: isEn ? "5 Years" : language === "tr" ? "5 Yıl" : "5 Godina",
                      valEn: "5 Years",
                      valSr: "5 Godina",
                      num: 60,
                    },
                    {
                      label: isEn ? "10 Years" : language === "tr" ? "10 Yıl" : "10 Godina",
                      valEn: "10 Years",
                      valSr: "10 Godina",
                      num: 120,
                    },
                  ].map((period) => {
                    const isSelected =
                      targetPeriod === period.valEn ||
                      targetPeriod === period.valSr ||
                      targetPeriod === period.label;
                    return (
                      <button
                        key={period.label}
                        type="button"
                        onClick={() => {
                          setTargetPeriod(period.label);
                          if (period.num >= 12)
                            setSelectedDuration(period.num / 12);
                          else setSelectedDuration(1); // Default to 1 year approx for smaller
                        }}
                        className={`py-1.5 px-3 rounded-[8px] text-[13px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#007AFF] text-white"
                            : isEvening
                              ? "bg-white dark:bg-[#1C1C1E]/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-white"
                              : "bg-[#7676801F] text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#7676802E]"
                        }`}
                      >
                        {period.label}
                      </button>
                    );
                  })}

                  <div
                    className={`flex items-center rounded-[8px] overflow-hidden ${
                      isEvening
                        ? "bg-white dark:bg-[#1C1C1E]/5 focus-within:ring-2 focus-within:ring-[#0A84FF]"
                        : "bg-[#7676801F] focus-within:ring-2 focus-within:ring-[#007AFF]"
                    }`}
                  >
                    <input
                      type="text"
                      className="text-[14px] font-medium w-32 px-3 py-1.5 bg-transparent outline-none text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                      placeholder={isEn ? "Custom (e.g. 8 Mo)" : language === "tr" ? "Özel (ör. 8 Ay)" : "Prilagođeno"}
                      value={targetPeriod}
                      onChange={(e) => setTargetPeriod(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <span className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-[#0A84FF]" />
                  {t.inputHelp}
                </span>

                <button
                  onClick={handleAnalyzeDreamWithRealismCheck}
                  disabled={chambersLoading || isCheckingRealism}
                  className={`py-2.5 px-6 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 tracking-wide cursor-pointer transition-all active:scale-95 ${
                    isEvening
                      ? "bg-white dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 disabled:bg-black/5 dark:bg-white/5 disabled:text-[#3C3C43] dark:text-[#EBEBF5]/80"
                      : "bg-black hover:bg-[#1C1C1E] text-white disabled:bg-[#E5E5EA] dark:bg-[#3A3A3C] disabled:text-[#3C3C43] dark:text-[#EBEBF5]/80"
                  }`}
                  id="btn-trigger-chambers"
                >
                  {isCheckingRealism ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FF9500]" />
                      <span>
                        {isEn ? "Verifying Feasibility..." : language === "tr" ? "Fizibilite Doğrulanıyor..." : "Provera ostvarivosti..."}
                      </span>
                    </>
                  ) : chambersLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#007AFF]" />
                      <span>
                        {isEn ? "Parsing Core Concept..." : language === "tr" ? "Çekirdek Kavramı Ayrıştırılıyor..." : "Analiza u kreativnim odajama..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#FF9500] transition-opacity" />
                      <span>{t.btnAnalyze}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Goal Feasibility/Realism Guard Checkpoint Drawer */}
              {realismCheckResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-5 rounded-xl border mt-4 ${
                    isEvening
                      ? "bg-black border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                      : "bg-white dark:bg-[#1C1C1E] border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                  } space-y-4`}
                >
                  <div className="flex items-center gap-3 border-b border-white/5/40 pb-2">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="text-xs font-semibold text-[#FF9500]">
                        {isEn ? "Goal Feasibility Guard" : language === "tr" ? "Hedef Fizibilite Koruması" : "ODSTUPANJE OD REALNIH OKVIRA"}
                      </h4>
                      <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium mt-0.5">
                        {isEn ? "Is this goal realistic for the chosen timeframe?" : language === "tr" ? "Bu hedef seçilen zaman dilimi için gerçekçi mi?" : "Da li je ovaj cilj ostvariv za izabrani rok?"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div
                      className={`p-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] space-y-1`}
                    >
                      <p className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        🧐{" "}
                        {isEn ? "AI ASSESSMENT & WHY" : language === "tr" ? "Yapay Zeka Değerlendirmesi ve Nedeni" : "AI PROLOG - OBRAZLOŽENJE ZAŠTO:"}
                      </p>
                      <p
                        className={`font-semibold leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                      >
                        {realismCheckResult.reasonText}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original Goal card */}
                      <div
                        className={`p-4 border rounded-xl flex flex-col justify-between gap-3 ${
                          isEvening
                            ? "bg-[#1C1C1E]/30 border-white/5"
                            : "bg-[#E5E5EA] dark:bg-[#3A3A3C] border-black/5 dark:border-white/5"
                        }`}
                      >
                        <div className="space-y-1 mt-1">
                          <span className="text-[13px] font-semibold text-[#FF3B30] block">
                            🔴{" "}
                            {isEn ? "ORIGINAL AMBITION" : language === "tr" ? "ORİJİNAL Hırs" : "PRVOBITNA AMBICIJA"}
                          </span>
                          <p
                            className={`font-medium leading-relaxed text-black dark:text-white`}
                          >
                            "{realismCheckResult.originalGoal}"
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerChambersAnalysis(
                              realismCheckResult.originalGoal,
                            );
                          }}
                          disabled={chambersLoading}
                          className={`w-full py-2.5 px-4 font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                            isEvening
                              ? "bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5 text-white border border-black/5 dark:border-white/5"
                              : "bg-[#E5E5EA] dark:bg-[#3A3A3C] hover:bg-black/5 dark:bg-white/5 text-black dark:text-white border border-black/5 dark:border-white/5"
                          }`}
                        >
                          {chambersLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>
                              {isEn ? "Keep original goal" : language === "tr" ? "Orijinal hedefi koru" : "Zadrži originalni cilj"}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Adjusted Goal card */}
                      <div
                        className={`p-4 border rounded-xl flex flex-col justify-between gap-3 ${
                          isEvening
                            ? "bg-[#1C1C1E]/20 border-black/5 dark:border-white/5"
                            : "bg-[#007AFF]/10 border-black/5 dark:border-white/5"
                        }`}
                      >
                        <div className="space-y-1 mt-1">
                          <span className="text-[13px] font-semibold text-[#007AFF] block transition-opacity">
                            🟢{" "}
                            {isEn ? "PRESCRIBED REALISTIC GOAL" : language === "tr" ? "ÖNCEDEN BELİRTİLEN GERÇEKÇİ HEDEF" : "PREPORUČEN REALNIJI CILJ"}
                          </span>
                          <p
                            className={`font-semibold leading-relaxed text-[#007AFF] dark:text-[#0A84FF]`}
                          >
                            "{realismCheckResult.adjustedGoal}"
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDreams((prev) => ({
                              ...prev,
                              [activeCategory]: realismCheckResult.adjustedGoal,
                            }));
                            triggerChambersAnalysis(
                              realismCheckResult.adjustedGoal,
                            );
                          }}
                          disabled={chambersLoading}
                          className="w-full py-2.5 px-4 font-semibold text-[13px] text-white rounded-xl bg-[#007AFF] active:opacity-70 transition-opacity active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-black/5 dark:border-white/5"
                        >
                          {chambersLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>
                              {isEn ? "Adopt adjusted goal" : language === "tr" ? "Düzeltilmiş hedefi benimseyin" : "Usvoji realniji cilj"}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {chambersError && (
              <div className="p-3 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] font-medium text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{chambersError}</span>
              </div>
            )}

            {/* SAVED VISIONS ARCHIVE LIST */}
            {savedVisions.length > 0 && (
              <div
                className={`p-4 border rounded-xl space-y-3 mt-4 ${
                  isEvening
                    ? "bg-black border-black/5 dark:border-white/5"
                    : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                }`}
                id="saved-visions-archive-card"
              >
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🗄️</span>
                    <h4 className="text-xs font-semibold text-[#007AFF]">
                      {isEn ? "Archived Saved Visions" : language === "tr" ? "Arşivlenmiş Kaydedilmiş Vizyonlar" : "Arhiva Sačuvanih Vizija i Planova"}
                    </h4>
                  </div>
                  <span className="text-[13px] font-medium text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-0.5 rounded-md border border-black/5 dark:border-white/5">
                    {savedVisions.length} {isEn ? "saved" : language === "tr" ? "kaydedildi" : "sačuvano"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto scrollbar-none pr-1">
                  {savedVisions.map((vision) => {
                    const catInfo = categories.find(
                      (c) => c.key === vision.category,
                    );
                    const isCurrent =
                      activeCategory === vision.category &&
                      refinedDreams[activeCategory] === vision.refinedDream;
                    return (
                      <div
                        key={vision.id}
                        onClick={() => handleLoadSavedVision(vision)}
                        className={`p-3.5 border rounded-xl flex flex-col justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                          isEvening
                            ? isCurrent
                              ? "bg-[#1C1C1E] border-black/5 dark:border-white/5"
                              : "bg-white dark:bg-[#1C1C1E]/5 border-black/5 dark:border-white/5 hover:bg-[#1C1C1E]"
                            : isCurrent
                              ? "bg-[#007AFF]/10 border-black/5 dark:border-white/5/80 border-black/5 dark:border-white/5"
                              : "bg-[#E5E5EA] dark:bg-[#3A3A3C] border-black/5 dark:border-white/5 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/70"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 bg-[#E5E5EA] dark:bg-[#1C1C1E] px-1.5 py-0.5 rounded">
                              <span>{catInfo?.icon}</span>
                              <span>
                                {isEn ? catInfo?.labelEn : language === "tr" ? catInfo?.labelTr : catInfo?.labelSr}
                              </span>
                            </span>
                            <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                              ⏱️ {vision.targetPeriod}
                            </span>
                          </div>

                          <p
                            className={`text-xs font-medium leading-normal line-clamp-2 ${
                              isCurrent
                                ? isEvening
                                  ? "text-[#007AFF] dark:text-[#0A84FF] font-semibold"
                                  : "text-[#007AFF] dark:text-[#0A84FF] font-semibold"
                                : isEvening
                                  ? "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                                  : "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                            }`}
                          >
                            "{vision.refinedDream}"
                          </p>

                          <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            {vision.originalDream
                              ? (isEn ? "Original draft: " : language === "tr" ? "Orijinal taslak:" : "Prvobitno uneto: ") +
                                `"${vision.originalDream.substring(0, 40)}${vision.originalDream.length > 40 ? "..." : ""}"`
                              : ""}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10 flex-wrap gap-1.5">
                          <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block">
                            📅 {vision.dateSaved}
                          </span>

                          <div className="flex items-center gap-2">
                            {vision.roadmapResult && (
                              <span className="text-[13px] bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] border border-[#34C759] dark:border-[#30D158]/30 font-semibold rounded p-1 px-1.5 leading-none">
                                🗺️ {isEn ? "Roadmap Ready" : language === "tr" ? "Yol Haritası Hazır" : "Vremenska osa"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDeleteSavedVision(vision.id, e)
                              }
                              className={`p-1.5 rounded-lg border text-[#FF3B30] dark:text-[#FF453A] hover:text-[#FF3B30] cursor-pointer transition-colors ${
                                isEvening
                                  ? "bg-black border-white/5 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10"
                                  : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10"
                              }`}
                              title={
                                isEn ? "Delete from archive" : language === "tr" ? "Arşivden sil" : "Izbriši iz arhive"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: SHOW STRATEGIC FEEDBACK + EDITABLE RESOLUTION */}
        {activeCategory !== "inbox" && wizardStep === 2 && chambersResult && (
          <motion.div
            key="wizard-chambers-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* The beautiful grid representing Vision's perspectives */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Box 1: Dreamer (Sanjar) */}
              <ZoomableCard
                className={`p-4.5 space-y-2.5 h-full ${
                  isEvening
                    ? "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                    : "bg-[#007AFF]/10 border-black/5 dark:border-white/5"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[13px] font-bold text-[#007AFF] flex items-center gap-1.5 uppercase tracking-wide">
                    {t.roomDreamer}
                  </h4>
                </div>
                <p
                  className={`text-xs font-sans leading-relaxed italic text-black dark:text-white`}
                >
                  "
                  {chambersResult.dreamerText ||
                    chambersResult.strategicDirection}
                  "
                </p>
              </ZoomableCard>

              {/* Box 2: Realist (Realista) */}
              <ZoomableCard
                className={`p-4.5 space-y-2.5 h-full ${
                  isEvening
                    ? "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                    : "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[13px] font-bold text-[#FF9500] flex items-center gap-1.5 uppercase tracking-wide">
                    {t.roomRealist}
                  </h4>
                </div>
                <p
                  className={`text-xs font-sans leading-relaxed italic text-black dark:text-white`}
                >
                  "{chambersResult.realistText || chambersResult.riskAssessment}
                  "
                </p>
              </ZoomableCard>

              {/* Box 3: Critic (Kritičar) */}
              <ZoomableCard
                className={`p-4.5 space-y-2.5 h-full ${
                  isEvening
                    ? "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                    : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[13px] font-bold text-[#FF3B30] flex items-center gap-1.5 uppercase tracking-wide">
                    {t.roomCritic}
                  </h4>
                </div>
                <p
                  className={`text-xs font-sans leading-relaxed italic text-black dark:text-white`}
                >
                  "
                  {chambersResult.criticText ||
                    (language === "en" ? "Critic's Perspective and potential failure vectors are active." : language === "tr" ? "Eleştirmenin Perspektifi ve potansiyel başarısızlık vektörleri aktiftir." : "Kritički uvid: Analizirajte i predupredite potencijalna mesta greške u svom cilju.")}
                  "
                </p>
              </ZoomableCard>
            </div>

            {/* Interactive User-friendly text editor where they edit their core dream based on the pro/con feedback */}
            <div
              className={`p-4 border rounded-xl space-y-3 shadow-sm ${
                isEvening
                  ? "bg-black border-white/5"
                  : "bg-white border-black/5"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  ✍️ {t.refineTitle}
                </span>
                <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  Step 2 / 3
                </span>
              </div>

              <textarea
                value={refinedDreams[activeCategory] || ""}
                onChange={(e) =>
                  setRefinedDreams((prev) => ({
                    ...prev,
                    [activeCategory]: e.target.value,
                  }))
                }
                placeholder={t.refinePlaceholder}
                rows={3}
                className={`w-full text-xs sm:text-sm p-4 rounded-xl leading-relaxed font-medium outline-none border focus:ring-2 resize-y shadow-sm ${
                  isEvening
                    ? "bg-[#1C1C1E] border-white/5 text-white placeholder:text-white/40 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                    : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                }`}
                id="refined-dream-textarea"
              />

              {/* Slider / Buttons or Duration selector + Build plan button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1 border-t border-black/5 dark:border-white/5">
                {/* Duration select block */}
                <div className="space-y-1">
                  <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    ⏱️ {t.durLabel}
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      isEn ? "3 Months" : language === "tr" ? "3 Ay" : "3 Meseca",
                      isEn ? "6 Months" : language === "tr" ? "6 Ay" : "6 Meseci",
                      isEn ? "1 Year" : language === "tr" ? "1 Yıl" : "1 Godina",
                      isEn ? "2 Years" : language === "tr" ? "2 Yıl" : "2 Godine",
                      isEn ? "3 Years" : language === "tr" ? "3 Yıl" : "3 Godine",
                      isEn ? "5 Years" : language === "tr" ? "5 Yıl" : "5 Godina",
                      isEn ? "10 Years" : language === "tr" ? "10 Yıl" : "10 Godina",
                    ].map((period) => {
                      const isSelected = targetPeriod === period;
                      return (
                        <button
                          key={`step2-period-${period}`}
                          type="button"
                          onClick={() => setTargetPeriod(period)}
                          className={`py-1 px-2.5 rounded-lg text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 sm:text-[13px] font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#007AFF] text-white scale-105"
                              : isEvening
                                ? "bg-[#1C1C1E] border border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-white"
                                : "bg-white dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border border-black/5 dark:border-white/5 hover:bg-[#FDFCF9] hover:text-black dark:text-white"
                          }`}
                        >
                          {period}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto pt-2 sm:pt-0 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 sm:flex-initial py-2.5 px-4 bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"}
                  </button>

                  <button
                    onClick={handleSaveCurrentVision}
                    className="flex-1 sm:flex-initial py-2.5 px-4 bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-black dark:text-white border border-black/5 dark:border-white/5 font-semibold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    id="btn-save-draft-chambers"
                    title={
                      isEn ? "Save current vision to Archive" : language === "tr" ? "Mevcut vizyonu Arşive kaydet" : "Sačuvaj trenutnu viziju u arhivu"
                    }
                  >
                    <span>💾</span>
                    <span>{isEn ? "Save" : language === "tr" ? "Kaydetmek" : "Sačuvaj"}</span>
                  </button>

                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={roadmapLoading}
                    className={`flex-1 sm:flex-initial py-2.5 px-6 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 tracking-wide cursor-pointer transition-all active:scale-95 ${
                      isEvening
                        ? "bg-white dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 disabled:bg-black/5 dark:bg-white/5"
                        : "bg-black hover:bg-[#1C1C1E] text-white disabled:bg-[#E5E5EA] dark:bg-[#3A3A3C]"
                    }`}
                    id="btn-build-roadmap"
                  >
                    {roadmapLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#007AFF]" />
                        <span>
                          {isEn ? "Formulating Steps..." : language === "tr" ? "Adımları Formüle Etmek..." : "Sklapanje vremenske ose..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 text-[#34C759] stroke-[3.5]" />
                        <span>{t.btnBuild}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {roadmapError && (
              <div className="p-3 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] font-medium text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{roadmapError}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: RENDER THE BEAUTIFUL CHRONOLOGICAL TIMELINE MAP WITH DIFFICULTY WEIGHTS */}
        {activeCategory !== "inbox" && wizardStep === 3 && activeRoadmap && (
          <motion.div
            key="wizard-roadmap-display"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Weight-Based Progress Bar Panel */}
            <div
              className={`p-4 border rounded-xl ${
                isEvening
                  ? "bg-black border-black/5 dark:border-white/5"
                  : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
              }`}
              id="weighted-roadmap-progress-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    📈 {t.timelineAnchor}
                  </span>
                  <p className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal max-w-lg">
                    {t.progressDetails}
                  </p>
                </div>

                <div className="text-xs font-semibold text-[#007AFF] bg-[#007AFF]/10 border border-black/5 dark:border-white/5 rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                  <span>
                    {isEn ? "Completed weight" : language === "tr" ? "Tamamlanan ağırlık" : "Ostvarena težina"}:{" "}
                    <strong className="text-[#007AFF] dark:text-[#0A84FF] font-semibold">
                      {completedWeight} / {totalWeight}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Progress bar utilizing weight counts */}
              <div className="w-full bg-[#E5E5EA] dark:bg-[#3A3A3C]/60 h-3.5 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentageProgress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-white dark:bg-[#1C1C1E] rounded-full"
                />
              </div>

              <div className="flex justify-between items-center pt-1.5 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                <span>0% {isEn ? "Start" : language === "tr" ? "Başlangıç" : "Početak"}</span>
                <span className="text-[#007AFF] font-semibold text-xs transition-opacity bg-[#007AFF]/10 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/5">
                  {percentageProgress}% {isEn ? "Complete" : language === "tr" ? "Tamamlamak" : "Efikasnosti"}
                </span>
                <span>100% {isEn ? "Dream Mastered" : language === "tr" ? "Rüyalarda Ustalaşıldı" : "Cilj ostvaren"}</span>
              </div>
            </div>

            {/* Grid Layout: Timeline Roadmap of nodes & Right column instructions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Chronological Timeline Road (8 Cols) */}
              <div
                className={`lg:col-span-8 space-y-6 relative border-l pl-5 ml-4 ${
                  isEvening
                    ? "border-white/5"
                    : "border-black/5 dark:border-white/5"
                }`}
                id="chronological-timeline-path"
              >
                {/* Node present: Confirmed Core Dream */}
                <div className="space-y-1 relative" id="timeline-initial-node">
                  <div
                    className={`absolute -left-[29px] top-1 w-4 h-4 rounded-full flex items-center justify-center text-[13px] font-semibold border-black/5 dark:border-white/5 ${
                      isEvening
                        ? "bg-white dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-white/5"
                        : "bg-black text-white border-white"
                    }`}
                  >
                    ★
                  </div>
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {isEn ? "ULTIMATE DREAM GOAL" : language === "tr" ? "NİHAİ RÜYA HEDEFİ" : "SREDIŠNJI CILJ I VIZIJA"}
                    </span>
                    <span className="p-1 px-2.5 rounded-lg text-[13px] leading-none bg-[#007AFF]/10 text-[#007AFF] border border-black/5 dark:border-white/5">
                      {(refinedDreams[activeCategory] || "").length > 35
                        ? (refinedDreams[activeCategory] || "").substring(
                            0,
                            35,
                          ) + "..."
                        : refinedDreams[activeCategory] || ""}
                    </span>
                  </h4>
                  <p
                    className={`p-3.5 rounded-xl border font-medium text-xs select-all text-justify tracking-wide leading-relaxed ${
                      isEvening
                        ? "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                        : "bg-[#E5E5EA] dark:bg-[#3A3A3C] border-black/5 dark:border-white/5 text-[#1C1C1E] dark:text-[#FFFFFF]"
                    }`}
                  >
                    {refinedDreams[activeCategory] || ""}
                  </p>
                </div>

                {/* Road nodes: Milestones list */}
                <AnimatePresence mode="popLayout">
                  {activeMilestones.map((m, idx) => {
                    const mKey = `${activeCategory}-${idx}`;
                    const isChecked = !!completedMilestones[mKey];
                    const isDecompressed = activeDecompIdx === idx;

                    return (
                      <motion.div
                        key={`milestone-${activeCategory}-${idx}`}
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        layout
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className={`relative flex flex-col gap-3 p-4 pl-4 border rounded-xl transition-all ${
                          isChecked
                            ? "bg-[#E5E5EA] dark:bg-[#3A3A3C] border-[#34C759]/20 dark:border-[#30D158]/20 opacity-60"
                            : isDecompressed
                              ? isEvening
                                ? "bg-[#1C1C1E] border-black/5 dark:border-white/5 ring-1 "
                                : "bg-[#007AFF]/10 border-black/5 dark:border-white/5"
                              : isEvening
                                ? "bg-white dark:bg-[#1C1C1E]/5 border-black/5 dark:border-white/5 hover:bg-[#1C1C1E]"
                                : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Node circle on the timing timeline road */}
                          <div
                            className={`absolute -left-[30px] sm:-left-[31px] top-5 w-5 h-5 rounded-full border-black/5 dark:border-white/5 flex items-center justify-center text-[13px] font-semibold transition-colors cursor-pointer ${
                              isChecked
                                ? "bg-[#34C759] dark:bg-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20 text-white transition-opacity"
                                : isEvening
                                  ? "bg-black border-white/5 text-[#0A84FF]"
                                  : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium hover:border-black/5 dark:border-white/5"
                            }`}
                            onClick={() => toggleMilestoneCompleted(idx)}
                          >
                            {isChecked ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          {/* Title and date text */}
                          <div className="flex items-start gap-2.5 min-w-0 flex-1 pl-1 sm:pl-1.5">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[13px] font-semibold px-1.5 py-0.5 rounded ${
                                    isChecked
                                      ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158]"
                                      : "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF]"
                                  }`}
                                >
                                  {m.estimatedDate}
                                </span>

                                {/* Weight Badge Indicator (Weight difficulty) */}
                                <span
                                  className={`text-[13px] font-semibold tracking-normal px-2 py-0.5 rounded-sm flex items-center gap-1 ${
                                    m.weight === 3
                                      ? "bg-[#FF3B30] dark:bg-[#FF453A] text-white border border-[#FF3B30]/20 dark:border-[#FF453A]/20 transition-opacity"
                                      : m.weight === 2
                                        ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                                        : "bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 border border-black/5 dark:border-white/5"
                                  }`}
                                  title={
                                    m.weight === 3
                                      ? t.weightTeško
                                      : m.weight === 2
                                        ? t.weightSrednje
                                        : t.weightLako
                                  }
                                >
                                  <Zap className="w-2.5 h-2.5 shrink-0 text-[#FF9500]" />
                                  <span className="text-[13px] font-semibold">
                                    {m.weight === 3
                                      ? "Težak (3)"
                                      : m.weight === 2
                                        ? "Srednji (2)"
                                        : "Lak (1)"}
                                  </span>
                                </span>
                              </div>

                              <div
                                className="group/title relative cursor-pointer"
                                onClick={() => {
                                  (window as any).triggerGlobalZoom?.(
                                    m.title,
                                    <div className="space-y-4 pt-1">
                                      <div className="p-4 bg-[#007AFF]/10 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                                        <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block mb-1">
                                          ⏱️{" "}
                                          {isEn ? "ESTIMATED COMPLETION DATE:" : language === "tr" ? "TAHMİNİ BİTİŞ TARİHİ:" : "PROCENJENI ROK REALIZACIJE:"}
                                        </span>
                                        <p className="text-sm font-medium text-black dark:text-white">
                                          {m.estimatedDate}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 rounded-xl">
                                        <span className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9500] block mb-1">
                                          📝{" "}
                                          {isEn ? "MILESTONE DESCRIPTION & METRIC WEIGHTS:" : language === "tr" ? "DÖNÜM NOKTASI AÇIKLAMASI VE METRİK AĞIRLIKLAR:" : "DETALJAN OPIS ETAPE I TEŽINA:"}
                                        </span>
                                        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#E5E5EA] leading-relaxed">
                                          {m.description}
                                        </p>
                                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#FF3B30]">
                                          <span>⚡</span>
                                          <span>
                                            {isEn ? `Difficulty factor count: ${m.weight}/3` : language === "tr" ? `Zorluk faktörü sayısı: ${m.weight}/3` : `Faktor složenosti etape: ${m.weight}/3`}
                                          </span>
                                        </div>
                                      </div>
                                    </div>,
                                    "🎯",
                                    isEn ? "Roadmap Milestone" : language === "tr" ? "Yol Haritası Kilometre Taşı" : "Etapa na Mapi Puta",
                                  );
                                }}
                              >
                                <h5
                                  className={`text-sm tracking-wide font-semibold font-sans leading-tight mt-1 flex items-center gap-1.5 ${
                                    isChecked
                                      ? "text-[#3C3C43] dark:text-[#EBEBF5]/80 line-through decoration-emerald-500 decoration-2"
                                      : isEvening
                                        ? "text-white"
                                        : "text-black dark:text-white"
                                  }`}
                                >
                                  <span>{m.title}</span>
                                  <span className="text-[13px] text-[#007AFF] opacity-0 group-hover/title:opacity-100 active:scale-95 transition-all">
                                    🔍 ZOOM
                                  </span>
                                </h5>

                                <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold tracking-normal leading-relaxed mt-0.5">
                                  {m.description}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons on nodes */}
                          <div className="flex items-center gap-1.5 shrink-0 self-start pl-1.5 sm:pl-0 flex-wrap">
                            {/* AI decomp trigger button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDecomposeMilestone(idx, m.title)
                              }
                              className={`p-1 px-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                                isDecompressed
                                  ? "bg-[#007AFF] border-black/5 dark:border-white/5 text-white"
                                  : isEvening
                                    ? "bg-black border-white/5 text-[#0A84FF] hover:bg-[#1C1C1E]"
                                    : "bg-[#007AFF]/10 border-black/5 dark:border-white/5 text-[#007AFF] active:opacity-70 transition-opacity"
                              }`}
                            >
                              <Sparkles className="w-3 h-3 text-[#FF9500]" />
                              <span>{t.btnDecompose}</span>
                            </button>

                            {/* AI habit suggestor trigger button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleSuggestAtomicHabits(idx, m.title)
                              }
                              className={`p-1 px-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                                activeHabitSuggestIdx === idx
                                  ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759]/20 dark:border-[#30D158]/20 text-white"
                                  : isEvening
                                    ? "bg-black border-white/5 text-[#34C759] hover:bg-black/5 dark:bg-white/5"
                                    : "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] hover:bg-[#34C759]/10 dark:bg-[#30D158]/10"
                              }`}
                            >
                              <Repeat className="w-3 h-3 text-[#34C759] animate-spin-slow" />
                              <span>{isEn ? "Habit Plan" : language === "tr" ? "Alışkanlık Planı" : "Navika"}</span>
                            </button>

                            {/* Direct to Inbox shortcut */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onSaveToInbox) {
                                  const currentCat = categories.find(
                                    (c) => c.key === activeCategory,
                                  );
                                  const lifeAreaLabel = currentCat
                                    ? isEn
                                      ? currentCat.labelEn
                                      : language === "tr" ? currentCat.labelTr : currentCat.labelSr
                                    : undefined;
                                  onSaveToInbox(
                                    m.title,
                                    isEn ? `Milestone step for vision roadmap: ${m.description}` : language === "tr" ? `Vizyon yol haritasının kilometre taşı adımı: ${m.description}` : `Etapa na strateškom putu: ${m.description}`,
                                    lifeAreaLabel,
                                  );
                                }
                              }}
                              className={`p-1 px-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                                isEvening
                                  ? "bg-black border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-white"
                                  : "bg-[#E5E5EA] dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#D1D1D6]"
                              }`}
                              title={
                                isEn ? "Send directly to Daily ABCDE" : language === "tr" ? "Doğrudan Daily ABCDE'ye gönder" : "Pošalji direktno u Dnevni Plan"
                              }
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                              <span>
                                {isEn ? "To Daily ABCDE" : language === "tr" ? "Günlük ABCDE'ye" : "U Dnevni Plan"}
                              </span>
                            </button>

                            {onSendToREBT && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSendToREBT(m.title + " - " + m.description);
                                }}
                                className={`p-1 px-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                                  isEvening
                                    ? "bg-[#FF3B30]/10 border-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/20"
                                    : "bg-[#FF3B30]/10 border-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/20"
                                }`}
                                title={
                                  isEn ? "Send obstacle to Mindset Coach" : language === "tr" ? "Zihniyet Koçu'na engel gönder" : "Pošalji kao prepreku u Mindset Coach"
                                }
                              >
                                <span>🧠</span>
                                <span>{isEn ? "To Mindset" : language === "tr" ? "Zihniyet'e" : "U Mindset"}</span>
                              </button>
                            )}

                            {/* Habit converter loop shortcut */}
                            <button
                              type="button"
                              onClick={() => handleTransferToHabits(m.title)}
                              className="p-2 active:opacity-70 hover:text-[#007AFF] text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded-xl cursor-pointer transition-colors active:scale-95 border border-transparent hover:border-black/5 dark:border-white/5"
                              title={t.btnHabit}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80" />
                            </button>
                          </div>
                        </div>

                        {/* Display Decomposition panel dynamically inline inside the milestone card */}
                        {isDecompressed && (
                          <div
                            className={`p-3.5 rounded-xl border-t mt-1.5 space-y-3.5 ${
                              isEvening
                                ? "border-black/5 dark:border-white/5 bg-black/20"
                                : "border-black/5 dark:border-white/5 bg-[#007AFF]/10/5"
                            }`}
                          >
                            {decompLoading && (
                              <div
                                className="flex items-center gap-2 text-xs text-[#007AFF] dark:text-[#0A84FF] font-medium py-1.5 transition-opacity"
                                id="decomp-loading-badge"
                              >
                                <Loader2 className="w-4 h-4 animate-spin text-[#007AFF]" />
                                <span>
                                  {isEn ? "AI analyzing & breaking milestone down..." : language === "tr" ? "Yapay zeka analiz ediyor ve kilometre taşlarını parçalıyor..." : "AI strateški razlaže korak na manje zadatke..."}
                                </span>
                              </div>
                            )}

                            {decompError && (
                              <div className="p-2.5 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] font-medium text-xs rounded-xl">
                                {decompError}
                              </div>
                            )}

                            {decompResult && (
                              <div
                                className="space-y-3"
                                id="decomp-results-display"
                              >
                                <div className="space-y-0.5">
                                  <h6 className="text-[13px] font-semibold text-[#007AFF] block">
                                    ⚡{" "}
                                    {isEn ? "AI Actionable Checklist" : language === "tr" ? "Yapay Zeka Uygulanabilir Kontrol Listesi" : "AI predloženi pod-zadaci (ABCDE)"}
                                  </h6>
                                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-normal">
                                    {isEn ? "Select which mikro-tasks you want to import directly onto your work priority list:" : language === "tr" ? "Hangi mikro görevleri doğrudan iş önceliği listenize aktarmak istediğinizi seçin:" : "Označite kvačicom koje sitne korake želite odmah da uvezete u svoju ABCDE tabelu obaveza:"}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 pb-2">
                                  <AnimatePresence mode="popLayout">
                                    {decompResult?.subTasks?.map((sub, sIdx) => {
                                      const isCheckedSub =
                                        selectedDecompIndexes.includes(sIdx);
                                      const isA = sub.category === "A";
                                      const isB = sub.category === "B";

                                      return (
                                        <motion.div
                                          key={`decomp-sub-${idx}-${sIdx}`}
                                          initial={{
                                            opacity: 0,
                                            y: 12,
                                            scale: 0.96,
                                          }}
                                          animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                          }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          layout
                                          transition={{
                                            duration: 0.25,
                                            delay: sIdx * 0.05,
                                            ease: "easeOut",
                                          }}
                                          onClick={() =>
                                            toggleDecompSelection(sIdx)
                                          }
                                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                                            isCheckedSub
                                              ? isEvening
                                                ? "bg-[#007AFF]/15 border-[#007AFF]/35"
                                                : "bg-[#007AFF]/10 border-[#007AFF]/30"
                                              : isEvening
                                                ? "bg-black border-white/5 hover:border-white/10"
                                                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                                          }`}
                                        >
                                          <div className="mt-0.5 no-zoom shrink-0 flex items-center justify-center">
                                            <input
                                              type="checkbox"
                                              checked={isCheckedSub}
                                              onChange={() => {}} // toggled by parent click for native feeling
                                              className="h-4.5 w-4.5 text-[#007AFF] bg-white dark:bg-[#1C1C1E] border-black/15 dark:border-white/15 rounded-md focus:ring-[#007AFF]/30 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 leading-none text-white ${
                                                  isA
                                                    ? "bg-[#FF3B30] dark:bg-[#FF453A]"
                                                    : isB
                                                      ? "bg-[#FF9500] dark:bg-[#FF9F0A]"
                                                      : "bg-[#34C759] dark:bg-[#30D158]"
                                                }`}
                                              >
                                                {isEn ? `Priority ${sub.category}` : language === "tr" ? `Öncelik ${sub.category}` : `Prvoklasna ${sub.category}`}
                                              </span>
                                              <h6
                                                className={`text-xs font-bold leading-tight break-words font-sans text-black dark:text-white`}
                                              >
                                                {sub.title}
                                              </h6>
                                            </div>
                                            <p className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold break-words">
                                              {sub.description}
                                            </p>
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                  </AnimatePresence>
                                </div>

                                {/* Multi-add import button */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                                  <span className="text-[13px] font-sans italic text-[#FF9500] font-medium leading-relaxed">
                                    "{decompResult.cheerQuote}"
                                  </span>

                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const selectedTasks =
                                          decompResult.subTasks.filter(
                                            (_, idx) =>
                                              selectedDecompIndexes.includes(
                                                idx,
                                              ),
                                          );
                                        if (selectedTasks.length === 0) return;

                                        if (onSaveToInbox) {
                                          const currentCat = categories.find(
                                            (c) => c.key === activeCategory,
                                          );
                                          const lifeAreaLabel = currentCat
                                            ? isEn
                                              ? currentCat.labelEn
                                              : language === "tr" ? currentCat.labelTr : currentCat.labelSr
                                            : undefined;
                                          selectedTasks.forEach((task) => {
                                            onSaveToInbox(
                                              task.title,
                                              task.description,
                                              lifeAreaLabel,
                                            );
                                          });
                                        }

                                        // Clear decomp after saving
                                        setDecompResult(null);
                                        setActiveDecompIdx(null);
                                      }}
                                      disabled={
                                        selectedDecompIndexes.length === 0
                                      }
                                      className="flex-1 sm:flex-none py-2.5 sm:py-2 px-4 bg-[#E5E5EA] dark:bg-[#3A3A3C] hover:bg-[#D1D1D6] dark:hover:bg-[#48484A] active:scale-[0.98] font-semibold text-[14px] sm:text-[13px] text-[#3C3C43] dark:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 touch-manipulation"
                                    >
                                      <ArrowDownToLine className="w-4 h-4" />
                                      <span>
                                        {isEn ? "To Daily ABCDE" : language === "tr" ? "Günlük ABCDE'ye" : "U Dnevni Plan"}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const selectedTasks =
                                          decompResult.subTasks.filter(
                                            (_, idx) =>
                                              selectedDecompIndexes.includes(
                                                idx,
                                              ),
                                          );
                                        if (selectedTasks.length === 0) return;
                                        promptMultipleTasksConfirmation(
                                          selectedTasks,
                                        );
                                      }}
                                      disabled={
                                        selectedDecompIndexes.length === 0
                                      }
                                      className="flex-1 sm:flex-none py-2.5 sm:py-2 px-5 bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-[0.98] font-semibold text-[14px] sm:text-[13px] text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 touch-manipulation"
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>
                                        {isEn ? "Import to ABCDE" : language === "tr" ? "ABCDE'ye aktar" : "U ABCDE"}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Display Atomic Habit Suggestions panel dynamically inline inside the milestone card */}
                        {activeHabitSuggestIdx === idx && (
                          <div
                            className={`p-3.5 rounded-xl border-t mt-1.5 space-y-3.5 ${
                              isEvening
                                ? "border-black/5 dark:border-white/5 bg-black/20"
                                : "border-[#34C759]/20 dark:border-[#30D158]/20 bg-[#34C759]/10 dark:bg-[#30D158]/10"
                            }`}
                          >
                            {habitSuggestLoading && (
                              <div
                                className="flex items-center gap-2 text-xs text-[#34C759] font-medium py-1.5 transition-opacity"
                                id="habit-suggest-loading-badge"
                              >
                                <Loader2 className="w-4 h-4 animate-spin text-[#34C759]" />
                                <span>
                                  {isEn ? "AI discovering high-impact routines..." : language === "tr" ? "Yapay zeka yüksek etkili rutinleri keşfediyor..." : "AI pretražuje i sklapa nove mikrorutine i obrasce ponašanja..."}
                                </span>
                              </div>
                            )}

                            {habitSuggestError && (
                              <div className="p-2.5 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] font-medium text-xs rounded-xl">
                                {habitSuggestError}
                              </div>
                            )}

                            {habitSuggestResult && (
                              <div
                                className="space-y-3"
                                id="habit-suggest-results-display"
                              >
                                <div className="space-y-0.5">
                                  <h6 className="text-[13px] font-semibold text-[#34C759] block">
                                    ⚡{" "}
                                    {isEn ? "AI Routine Recommendations" : language === "tr" ? "Yapay Zeka Rutin Önerileri" : "AI preporučene dnevne navike"}
                                  </h6>
                                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-normal">
                                    {isEn ? "These identity-based routines ensure consistency. Click to import them into your Habits routines:" : language === "tr" ? "Bu kimliğe dayalı rutinler tutarlılığı sağlar. Bunları Alışkanlık rutinlerinize aktarmak için tıklayın:" : "Ove dnevne rutine obezbeđuju dugoročan uspeh. Kliknite da ih prebacite i usavršite u sekciji navika:"}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <AnimatePresence mode="popLayout">
                                    {habitSuggestResult?.map((habit, hIdx) => (
                                      <motion.div
                                        key={`suggested-habit-${idx}-${hIdx}`}
                                        initial={{
                                          opacity: 0,
                                          y: 12,
                                          scale: 0.96,
                                        }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        layout
                                        transition={{
                                          duration: 0.25,
                                          delay: hIdx * 0.05,
                                          ease: "easeOut",
                                        }}
                                        className={`p-3 border rounded-xl flex flex-col justify-between gap-3 ${
                                          isEvening
                                            ? "bg-black/40 border-black/5 dark:border-white/5"
                                            : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                                        }`}
                                      >
                                        <div className="space-y-1">
                                          <h6
                                            className={`text-xs font-semibold leading-snug text-black dark:text-white`}
                                          >
                                            ⚙️ {habit.name}
                                          </h6>
                                          <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold">
                                            <strong className="text-[#34C759]">
                                              {isEn ? "Micro-routine:" : language === "tr" ? "Mikro rutin:" : "Mikro-korak:"}
                                            </strong>{" "}
                                            {habit.twoMinVersion}
                                          </p>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleImportCustomHabit(
                                              habit.name,
                                              habit.twoMinVersion,
                                            )
                                          }
                                          className="w-full py-1.5 bg-[#34C759]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>
                                            {isEn ? "Adopt Habit" : language === "tr" ? "Alışkanlık Edinin" : "Usvoji naviku"}
                                          </span>
                                        </button>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Mentoring and Coaching Quote Column Panel (4 Cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Visual Roadmap Advice Card */}
                {activeRoadmap.coachingQuote && (
                  <div
                    className={`p-4 border rounded-xl flex gap-3 relative overflow-hidden ${
                      isEvening
                        ? "bg-[#1C1C1E]/25 border-black/5 dark:border-white/5/35 text-[#007AFF] dark:text-[#0A84FF]"
                        : "bg-[#007AFF]/10 border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF]"
                    }`}
                    id="roadmaps-coaching-box"
                  >
                    <div className="absolute right-[-10px] bottom-[-15px] text-black dark:text-whitexl font-sans italic leading-none pointer-events-none select-none">
                      “
                    </div>
                    <span className="text-xl shrink-0 select-none">☀️</span>
                    <div className="space-y-1 z-1">
                      <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block">
                        {t.coachingAdvice}
                      </span>
                      <p className="text-xs font-sans italic font-semibold leading-relaxed">
                        "{activeRoadmap.coachingQuote}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Expandable 3 Chambers review */}
                {chambersResult && (
                  <div
                    className={`p-4 border rounded-xl space-y-3.5 ${
                      isEvening
                        ? "bg-black border-black/5 dark:border-white/5"
                        : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white"
                    }`}
                    id="roadmaps-chambers-review-box"
                  >
                    <div className="flex items-center justify-between">
                      <h6 className="font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        🏛️{" "}
                        {isEn ? "3 Creative Chambers Check" : language === "tr" ? "3 Yaratıcı Oda Kontrolü" : "Pregled 3 Kreativne Odaje"}
                      </h6>
                      <span className="text-[13px] bg-[#007AFF]/10 text-[#007AFF] px-1.5 py-0.5 rounded font-medium">
                        {isEn ? "Verified" : language === "tr" ? "Doğrulandı" : "Provereno"}
                      </span>
                    </div>

                    <div className="space-y-2 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-medium">
                      <details className="group cursor-pointer">
                        <summary className="font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:opacity-80 list-none flex justify-between items-center transition-all">
                          <span>{t.roomDreamer}</span>
                          <span className="transition-transform group-open:rotate-180 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            ▼
                          </span>
                        </summary>
                        <p
                          className={`mt-1.5 font-medium pl-2 border-l border-black/5 dark:border-white/5 italic text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                        >
                          "
                          {chambersResult.dreamerText ||
                            chambersResult.strategicDirection}
                          "
                        </p>
                      </details>

                      <details className="group cursor-pointer pt-1">
                        <summary className="font-semibold text-[#FF9500] dark:text-[#FF9F0A] hover:opacity-80 list-none flex justify-between items-center transition-all">
                          <span>{t.roomRealist}</span>
                          <span className="transition-transform group-open:rotate-180 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            ▼
                          </span>
                        </summary>
                        <p
                          className={`mt-1.5 font-medium pl-2 border-l border-black/5 dark:border-white/5 italic text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                        >
                          "
                          {chambersResult.realistText ||
                            chambersResult.riskAssessment}
                          "
                        </p>
                      </details>

                      <details className="group cursor-pointer pt-1">
                        <summary className="font-semibold text-[#FF3B30] dark:text-[#FF453A] hover:opacity-80 list-none flex justify-between items-center transition-all">
                          <span>{t.roomCritic}</span>
                          <span className="transition-transform group-open:rotate-180 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            ▼
                          </span>
                        </summary>
                        <p
                          className={`mt-1.5 font-medium pl-2 border-l border-black/5 dark:border-white/5 italic text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                        >
                          "
                          {chambersResult.criticText ||
                            (language === "en" ? "Critic's perspective is populated here." : language === "tr" ? "Eleştirmenin bakış açısı burada doldurulur." : "Kritički osvrt je dostupan.")}
                          "
                        </p>
                      </details>
                    </div>
                  </div>
                )}

                {/* Guide instructions block */}
                <div
                  className={`p-4 rounded-xl border text-xs font-semibold leading-relaxed space-y-2.5 ${
                    isEvening
                      ? "bg-black border-black/5 dark:border-white/5"
                      : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                  }`}
                >
                  <h6 className="font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    🛠️{" "}
                    {isEn ? "Roadmap Guidelines" : language === "tr" ? "Yol Haritası Yönergeleri" : "Uputstvo za Strateški Put"}
                  </h6>
                  <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {t.roadmapInstructions}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 font-medium text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    <span className="bg-[#34C759] dark:bg-[#30D158] text-white px-2 py-0.5 rounded">
                      Weight: completed weights count
                    </span>
                    <span className="bg-[#007AFF] text-white px-2 py-0.5 rounded">
                      Instant Habits Sync
                    </span>
                  </div>

                  {/* Save plan & Reset plan triggers in a unified actions row */}
                  <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={handleSaveCurrentVision}
                      className="py-1.5 px-3 bg-[#34C759]/10 hover:bg-[#34C759] dark:bg-[#30D158] font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
                    >
                      <span>💾</span>
                      <span>
                        {isEn ? "Save Vision & Roadmap" : language === "tr" ? "Vizyonu ve Yol Haritasını Kaydet" : "Sačuvaj viziju i put"}
                      </span>
                    </button>

                    <button
                      onClick={() => setWizardStep(1)}
                      className="text-[13px] font-medium text-[#FF3B30] tracking-wide hover:underline cursor-pointer"
                    >
                      {isEn ? "Reset Concept" : language === "tr" ? "Konsepti Sıfırla" : "Koriguj iz početka"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TASK IMPORT CONFIRMATION MODALS (STRICT COMPANION SYSTEM FOR ABCDE TASK INJECTIONS) --- */}
      <AnimatePresence>
        {/* Modal 1: Confirm Single Task Import */}
        {taskToConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 max-w-sm w-full overflow-hidden text-black dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 flex items-center justify-center text-[#007AFF]">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-black dark:text-white text-sm">
                    {isEn ? "Integrate New Task?" : language === "tr" ? "Yeni Görev Entegre Edilsin mi?" : "Uvezi zadatak u tabelu?"}
                  </h3>
                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium mt-0.5">
                    {isEn ? "Task import verification" : language === "tr" ? "Görev içe aktarma doğrulaması" : "Provera uvoza obaveze"}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold border rounded px-2 py-0.5 ${
                      taskToConfirm.category === "A"
                        ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A]"
                        : taskToConfirm.category === "B"
                          ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500]/20 dark:border-[#FF9F0A]/20 text-[#FF9500] dark:text-[#FF9F0A]"
                          : "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158]"
                    }`}
                  >
                    Kategorija {taskToConfirm.category}
                  </span>
                  <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    Preporučeni nivo
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-black dark:text-white select-all leading-snug">
                    {taskToConfirm.title}
                  </h4>
                  <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium select-all leading-relaxed">
                    {taskToConfirm.description}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E]/60 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTaskToConfirm(null)}
                  className="px-4 py-2 text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl transition-all cursor-pointer"
                >
                  {isEn ? "Cancel" : language === "tr" ? "İptal etmek" : "Otkaži"}
                </button>
                <button
                  type="button"
                  onClick={executeConfirmSingleTask}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#007AFF] active:opacity-70 rounded-xl transition-all cursor-pointer"
                >
                  {isEn ? "Import Task" : language === "tr" ? "Görevi İçe Aktar" : "Upiši zadatak"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Confirm Multiple Tasks Import (Allows checkboxes checklist inside popup!) */}
        {multipleTasksToConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 max-w-md w-full overflow-hidden text-black dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 flex items-center justify-center text-[#007AFF] shrink-0">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-black dark:text-white text-sm">
                      {isEn ? "Confirm Injected Tasks" : language === "tr" ? "Yerleştirilen Görevleri Onayla" : "Potvrda uvoza zadataka"}
                    </h3>
                    <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium mt-0.5">
                      Izaberite zadatke koji idu u ABCDE listu
                    </p>
                  </div>
                </div>

                {/* Select/deselect all buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmedTasksSelected(
                        multipleTasksToConfirm.map((_, i) => i),
                      )
                    }
                    className="text-[13px] font-semibold text-[#007AFF] hover:underline"
                  >
                    {isEn ? "All" : language === "tr" ? "Tüm" : "Sve"}
                  </button>
                  <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-medium">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmedTasksSelected([])}
                    className="text-[13px] font-semibold text-[#FF3B30] hover:underline"
                  >
                    {isEn ? "None" : language === "tr" ? "Hiçbiri" : "Ništa"}
                  </button>
                </div>
              </div>

              {/* Interactive checklist styled as SLIDES (step-by-step slideshow) */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-2 rounded-xl text-xs font-medium">
                  <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {isEn ? "Card Preview" : language === "tr" ? "Kart Önizlemesi" : "Pregled zadatka"}:
                  </span>
                  <span
                    className="text-[#007AFF] font-semibold"
                    id="import-active-slide-badge"
                  >
                    {importActiveSlide + 1} / {multipleTasksToConfirm.length}
                  </span>
                </div>

                <div className="relative overflow-hidden w-full min-h-[140px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={importActiveSlide}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      {(() => {
                        const i = importActiveSlide;
                        const task = multipleTasksToConfirm[i];
                        if (!task) return null;
                        const isSelected = confirmedTasksSelected.includes(i);
                        return (
                          <div
                            onClick={() => {
                              setConfirmedTasksSelected((prev) => {
                                if (prev.includes(i)) {
                                  return prev.filter((idx) => idx !== i);
                                } else {
                                  return [...prev, i];
                                }
                              });
                            }}
                            className={`p-5 border-black/5 dark:border-white/5 rounded-xl flex flex-col gap-4 transition-all cursor-pointer select-none active:scale-[0.99] ${
                              isSelected
                                ? "bg-[#007AFF]/10/45 border-black/5 dark:border-white/5"
                                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold border rounded px-2.5 py-1 leading-none ${
                                  task.category === "A"
                                    ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] font-semibold"
                                    : task.category === "B"
                                      ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500]/20 dark:border-[#FF9F0A]/20 text-[#FF9500] dark:text-[#FF9F0A] font-semibold"
                                      : "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] font-semibold"
                                }`}
                              >
                                Priority {task.category}
                              </span>

                              <div className="flex items-center gap-1.5 text-xs font-semibold pr-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // custom handled in container click
                                  className="h-4 w-4 text-[#007AFF] bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 rounded focus:ring-[#5856D6]/50 dark:ring-[#5E5CE6]/50 cursor-pointer shrink-0"
                                />
                                <span
                                  className={
                                    isSelected
                                      ? "text-[#007AFF]"
                                      : "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                                  }
                                >
                                  {isSelected
                                    ? isEn ? "Will Import ✓" : language === "tr" ? "İthalat Yapılacak ✓" : "Uvozi se ✓"
                                    : isEn ? "Skipped" : language === "tr" ? "Atlandı" : "Preskočeno"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <h5 className="text-sm font-semibold text-black dark:text-white leading-snug break-words">
                                {task.title}
                              </h5>
                              <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold break-words">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Slider Navigation Controls */}
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setImportActiveSlide((prev) => Math.max(0, prev - 1))
                    }
                    disabled={importActiveSlide === 0}
                    className="p-2 px-3 text-[13px] font-semibold rounded-lg bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] disabled:opacity-55 disabled:hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] cursor-pointer transition-colors flex items-center gap-1 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                  >
                    <span>←</span>
                    <span>{isEn ? "Prev" : language === "tr" ? "Önceki" : "Prethodni"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {multipleTasksToConfirm?.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setImportActiveSlide(i)}
                        className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                          importActiveSlide === i
                            ? "bg-[#007AFF] w-5"
                            : "bg-[#E5E5EA] dark:bg-[#3A3A3C] hover:bg-black/5 dark:bg-white/5"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setImportActiveSlide((prev) =>
                        Math.min(multipleTasksToConfirm.length - 1, prev + 1),
                      )
                    }
                    disabled={
                      importActiveSlide === multipleTasksToConfirm.length - 1
                    }
                    className="p-2 px-3 text-[13px] font-semibold rounded-lg bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] disabled:opacity-55 disabled:hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] cursor-pointer transition-colors flex items-center gap-1 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                  >
                    <span>{isEn ? "Next" : language === "tr" ? "Sonraki" : "Sledeći"}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Optional secondary integration into Atomic Habits loop */}
              <div className="mx-5 mb-4 p-3.5 bg-[#007AFF]/10 border border-black/5 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 text-black dark:text-white">
                <div className="flex-1 min-w-0">
                  <h6 className="text-[13px] font-semibold text-[#007AFF]">
                    ⚡{" "}
                    {isEn ? "Habit Loop Synchronization" : language === "tr" ? "Alışkanlık Döngüsü Senkronizasyonu" : "Ubacivanje u planer navika"}
                  </h6>
                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-normal mt-0.5">
                    {isEn ? "Also register these checked steps into your Habits & Routines Loop?" : language === "tr" ? "Ayrıca işaretlenen bu adımları Alışkanlıklar ve Rutinler Döngünüze kaydetmek istiyor musunuz?" : "Da li želiš da se ovi manji zadaci uvezu i kao tvoje nove navike?"}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={alsoAddAsHabits}
                    onChange={(e) => setAlsoAddAsHabits(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-[51px] h-[31px]">
                    <div className="absolute inset-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-colors duration-300 peer-checked:bg-[#34C759]"></div>
                    <div className="absolute left-[2px] top-[2px] bg-white dark:bg-[#1C1C1E] w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 peer-checked:translate-x-[20px]"></div>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E]/60 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMultipleTasksToConfirm(null)}
                  className="px-4 py-2 text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl transition-all cursor-pointer hover:text-[#3C3C43] dark:text-[#EBEBF5]/80"
                >
                  {isEn ? "Cancel" : language === "tr" ? "İptal etmek" : "Otkaži"}
                </button>
                <button
                  type="button"
                  onClick={executeConfirmMultipleTasks}
                  disabled={confirmedTasksSelected.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#007AFF] active:opacity-70 rounded-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {isEn ? `Import ${confirmedTasksSelected.length} Tasks` : language === "tr" ? `${confirmedTasksSelected.length} Görevi İçe Aktar` : `Uvezi (${confirmedTasksSelected.length}) zadataka`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
