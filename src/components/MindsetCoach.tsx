import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2,
  Send,
  Brain,
  Scale,
  Sparkles,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Check,
  RefreshCw,
  Maximize2,
  Activity,
  X,
  Compass,
  History,
  Search,
  Copy,
  CheckSquare,
  ArrowUp,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import ZoomableCard from "./ZoomableCard";
import VoiceInputNode from "./VoiceInputNode";
import { getDiscoverySettings } from "../lib/discoveryEngine";

interface MindsetCoachProps {
  language: "sr" | "en" | "tr";
  isEvening?: boolean;
  activeAiTone?: string;
}

// iMessage-style Typing Indicator for better UX
const AnimatedTypingIndicator = ({ color = "#007AFF" }: { color?: string }) => (
  <div className="flex gap-1.5 items-center px-1.5 py-1 min-h-[22px]">
    <motion.div
      className="w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color }}
      animate={{ y: [0, -5, 0] }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0,
      }}
    />
    <motion.div
      className="w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color }}
      animate={{ y: [0, -5, 0] }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.15,
      }}
    />
    <motion.div
      className="w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color }}
      animate={{ y: [0, -5, 0] }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.3,
      }}
    />
  </div>
);

export default function MindsetCoach({
  language,
  isEvening = false,
  activeAiTone = "default",
}: MindsetCoachProps) {
  const isEn = language === "en";
  const [activeSubTab, setActiveSubTab] = useState<
    "Protocol" | "biohack" | "ta" | "trezor" | "rebt" | "omni"
  >("Protocol");
  const [rebtError, setRebtError] = useState<string>("");

  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [savedTasks, setSavedTasks] = useState<string[]>([]);

  // Cleanup synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (speakingText === text) {
      window.speechSynthesis.cancel();
      setSpeakingText(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown for smoother voice synthesis
    const plainText = text
      .replace(/[#*`_~\[\]()\-+\d\.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(plainText);

    if (language === "sr") {
      utterance.lang = "sr-RS";
    } else if (language === "tr") {
      utterance.lang = "tr-TR";
    } else {
      utterance.lang = "en-US";
    }

    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);

    setSpeakingText(text);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyText = (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      triggerHaptics("success");
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleSaveTask = (text: string) => {
    try {
      const key = "abcde_tasks";
      const raw = safeStorage.getItem(key) || "[]";
      const currentTasks = JSON.parse(raw);

      let cleanTitle = text
        .replace(/[#*`_~\[\]()\-+]/g, "")
        .trim()
        .split("\n")[0] || "";

      if (cleanTitle.length > 80) {
        cleanTitle = cleanTitle.substring(0, 77) + "...";
      }

      const newTask = {
        id: "task-" + Date.now(),
        title: cleanTitle,
        notes: text,
        done: false,
        category: "A",
        createdAt: new Date().toISOString(),
      };

      currentTasks.push(newTask);
      safeStorage.setItem(key, JSON.stringify(currentTasks));

      setSavedTasks((prev) => [...prev, text]);
      triggerHaptics("success");

      window.dispatchEvent(new Event("storage_sync"));
      window.dispatchEvent(new Event("storage"));

      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message:
              language === "en"
                ? "Saved to your Tasks list! 📝"
                : language === "tr"
                ? "Görevlerinize kaydedildi! 📝"
                : "Sačuvano u listu tvojih zadataka! 📝",
            type: "success",
          },
        }),
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeSubTab]);

  // Storytelling expanded state for each tool
  const [storyExpanded, setStoryExpanded] = useState<{
    Protocol: boolean;
    ta: boolean;
    biohack: boolean;
    trezor: boolean;
  }>({
    Protocol: true,
    ta: true,
    biohack: true,
    trezor: true,
  });

  // TA (Transactional Analysis) states
  const [taInput, setTaInput] = useState<string>("");
  const [taLoading, setTaLoading] = useState<boolean>(false);
  const [taErrorMsg, setTaErrorMsg] = useState<string>("");
  const [taMessages, setTaMessages] = useState<
    Array<{ role: "user" | "model" | "assistant"; content: string }>
  >(() => [
    {
      role: "assistant",
      content:
        language === "tr"
          ? "İçsel zihinsel harita rehberiniz hazır. Odağınızı şekillendiren iç sesleri ve gizli sürücüleri (örneğin 'Mükemmel Ol', 'Güçlü Ol') keşfediyoruz. Bugün hangi iç çatışmayı veya kalıbı aydınlatmak istersiniz?"
          : language === "sr"
          ? "Tvoj vodič kroz unutrašnju mentalnu mapu je spreman. Istražimo glasove i skrivene drajvere (npr. 'Budi Savršen', 'Budi Jak') koji oblikuju tvoj fokus. Koji unutrašnji konflikt ili obrazac želiš da osvetlimo danas?"
          : "Your inner mental map guide is ready. We explore the internal voices and hidden drivers (e.g., 'Be Perfect', 'Be Strong') that shape your focus. Which inner conflict or pattern would you like to illuminate today?",
    },
  ]);

  // REBT (Rational Emotive Behavior Therapy) states
  const [rebtInput, setRebtInput] = useState<string>("");
  const [rebtLoading, setRebtLoading] = useState<boolean>(false);
  const [rebtResult, setRebtResult] = useState<string>("");
  const [isDetailedRebt, setIsDetailedRebt] = useState<boolean>(false);
  const [lastRebtQuery, setLastRebtQuery] = useState<string>("");
  const [rebtHistory, setRebtHistory] = useState<Array<any>>([]);
  const [rebtAnimationStatus, setRebtAnimationStatus] = useState<string>("");
  const [rebtLoadingDetails, setRebtLoadingDetails] = useState<boolean>(false);

  const [rebtA, setRebtA] = useState<string>("");
  const [rebtB, setRebtB] = useState<string>("");
  const [rebtC, setRebtC] = useState<string>("");
  const [decodedA, setDecodedA] = useState<string>("");
  const [decodedB, setDecodedB] = useState<string>("");
  const [decodedC, setDecodedC] = useState<string>("");

  // Biohack states
  const [biohackInput, setBiohackInput] = useState<string>("");
  const [biohackLoading, setBiohackLoading] = useState<boolean>(false);
  const [biohackErrorMsg, setBiohackErrorMsg] = useState<string>("");
  const [biohackMessages, setBiohackMessages] = useState<
    Array<{ role: "user" | "model" | "assistant"; content: string }>
  >(() => [
    {
      role: "assistant",
      content:
        language === "tr"
          ? "Biohacker AI Uzmanı burada. Biyolojiniz psikolojinizi dikte eder. Bugün hangi enerji düşüşlerini, uyku sorunlarını veya odaklanma problemlerini hacklememiz gerekiyor?"
          : language === "sr"
          ? "Biohacker AI Expert ovde. Tvoja biologija diktira tvoju psihologiju. Kakve energetske padove, probleme sa snom ili dekoncentracijom želiš da hakujemo danas?"
          : "Biohacker AI Expert here. Your biology dictates your psychology. What energetic drops, sleep issues, or focus problems do we need to hack today?",
    },
  ]);

  // Subconscious Protocol Dialog states
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "model" | "assistant"; content: string }>
  >(() => [
    {
      role: "assistant",
      content:
        language === "sr"
          ? "Dobrodošli! Tu sam da vam pomognem da razbistrite um, razradite ideje i unapredite svoju dnevnu produktivnost. O čemu razmišljate danas?"
          : language === "tr"
          ? "Hoş geldiniz! Zihninizi netleştirmenize, fikirlerinizi geliştirmenize ve günlük üretkenliğinizi artırmanıza yardımcı olmak için buradayım. Bugün aklınızda ne var?"
          : "Welcome! I’m here to help you clear your mind, refine your ideas, and boost your daily productivity. What’s on your mind today?",
    },
  ]);

  useEffect(() => {
    if (chatMessages.length === 1) {
      setChatMessages([
        {
          role: "assistant",
          content:
            language === "sr"
              ? "Dobrodošli! Tu sam da vam pomognem da razbistrite um, razradite ideje i unapredite svoju dnevnu produktivnost. O čemu razmišljate danas?"
              : language === "tr"
              ? "Hoş geldiniz! Zihninizi netleştirmenize, fikirlerinizi geliştirmenize ve günlük üretkenliğinizi artırmanıza yardımcı olmak için buradayım. Bugün aklınızda ne var?"
              : "Welcome! I’m here to help you clear your mind, refine your ideas, and boost your daily productivity. What’s on your mind today?",
        },
      ]);
    }
    if (taMessages.length === 1) {
      setTaMessages([
        {
          role: "assistant",
          content:
            language === "tr"
              ? "İçsel zihinsel harita rehberiniz hazır. Odağınızı şekillendiren iç sesleri ve gizli sürücüleri (örneğin 'Mükemmel Ol', 'Güçlü Ol') keşfediyoruz. Bugün hangi iç çatışmayı veya kalıbı aydınlatmak istersiniz?"
              : language === "sr"
              ? "Tvoj vodič kroz unutrašnju mentalnu mapu je spreman. Istražimo glasove i skrivene drajvere (npr. 'Budi Savršen', 'Budi Jak') koji oblikuju tvoj fokus. Koji unutrašnji konflikt ili obrazac želiš da osvetlimo danas?"
              : "Your inner mental map guide is ready. We explore the internal voices and hidden drivers (e.g., 'Be Perfect', 'Be Strong') that shape your focus. Which inner conflict or pattern would you like to illuminate today?",
        },
      ]);
    }
    if (biohackMessages.length === 1) {
      setBiohackMessages([
        {
          role: "assistant",
          content:
            language === "tr"
              ? "Biohacker AI Uzmanı burada. Biyolojiniz psikolojinizi dikte eder. Bugün hangi enerji düşüşlerini, uyku sorunlarını veya odaklanma problemlerini hacklememiz gerekiyor?"
              : language === "sr"
              ? "Biohacker AI Expert ovde. Tvoja biologija diktira tvoju psihologiju. Kakve energetske padove, probleme sa snom ili dekoncentracijom želiš da hakujemo danas?"
              : "Biohacker AI Expert here. Your biology dictates your psychology. What energetic drops, sleep issues, or focus problems do we need to hack today?",
        },
      ]);
    }
  }, [language]);

  const protocolViewportRef = useRef<HTMLDivElement>(null);
  const biohackViewportRef = useRef<HTMLDivElement>(null);
  const taViewportRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize chat input height dynamically based on content length
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
      const scrollHeight = chatInputRef.current.scrollHeight;
      // Clamp between min-height 36px and max-height 180px
      const newHeight = Math.min(Math.max(scrollHeight, 36), 180);
      chatInputRef.current.style.height = `${newHeight}px`;
    }
  }, [chatInput]);

  // 🔑 Prompts and Reflections Vault states
  const [vaultOpen, setVaultOpen] = useState<boolean>(false);
  const [vaultSearch, setVaultSearch] = useState<string>("");
  const [vaultFilter, setVaultFilter] = useState<
    "all" | "nlp" | "biohack" | "ta"
  >("all");
  const [copiedId, setCopiedId] = useState<string>("");
  const [isDetailedOmni, setIsDetailedOmni] = useState<boolean>(false);

  const cards = [
    {
      key: "A",
      letter: "A",
      title: isEn ? "Activating Event" : language === "tr" ? "Etkinleştirme Etkinliği" : "Okidač (Situacija)",
      subtitle: isEn ? "Facts only, objective reality" : language === "tr" ? "Yalnızca gerçekler, nesnel gerçeklik" : "Samo objektivne činjenice",
      icon: "🔍",
      content:
        decodedA || (isEn ? "No event entered." : language === "tr" ? "Hiçbir etkinlik girilmedi." : "Nema unetog događaja."),
      colorClass:
        "from-blue-500/10 to-blue-600/5 dark:from-[#0B1C33] dark:to-[#08182E] border-blue-500/25",
      textBrand: "text-[#007AFF] dark:text-[#0A84FF]",
      bgAccent: "bg-[#007AFF]",
    },
    {
      key: "B",
      letter: "B",
      title: isEn ? "Beliefs & Demands" : language === "tr" ? "İnançlar ve Talepler" : "Uverenja i Moranja",
      subtitle: isEn ? "Absolute dogmas & expectations" : language === "tr" ? "Mutlak dogmalar ve beklentiler" : "Apsolutna očekivanja i pritisak",
      icon: "⚠️",
      content:
        decodedB ||
        (isEn ? "No specific irrational belief specified." : language === "tr" ? "Belirli bir irrasyonel inanç belirtilmemiştir." : "Nema unetog uverenja."),
      colorClass:
        "from-amber-500/10 to-amber-600/5 dark:from-[#36200A] dark:to-[#2B1808] border-amber-500/25",
      textBrand: "text-[#FF9500] dark:text-[#FF9F0A]",
      bgAccent: "bg-[#FF9500]",
    },
    {
      key: "C",
      letter: "C",
      title: isEn ? "Consequences" : language === "tr" ? "Sonuçlar" : "Posledice",
      subtitle: isEn ? "Emotional & behavioral results" : language === "tr" ? "Duygusal ve davranışsal sonuçlar" : "Emocionalni i ponašajni ishodi",
      icon: "🎯",
      content:
        decodedC ||
        (isEn ? "No consequence specified." : language === "tr" ? "Sonuç belirtilmedi." : "Nema unete posledice."),
      colorClass:
        "from-rose-500/10 to-rose-600/5 dark:from-[#330B1C] dark:to-[#2E0818] border-rose-500/25",
      textBrand: "text-[#FF3B30] dark:text-[#FF453A]",
      bgAccent: "bg-[#FF3B30]",
    },
  ];

  const parseRebtIntoCards = (text: string) => {
    const cards = [
      {
        key: "A",
        letter: "A",
        title: isEn ? "Activating Event" : language === "tr" ? "Etkinleştirme Etkinliği" : "Okidač (Situacija)",
        subtitle: isEn ? "Facts only, objective reality" : language === "tr" ? "Yalnızca gerçekler, nesnel gerçeklik" : "Samo objektivne činjenice",
        icon: "🔍",
        content:
          decodedA || (isEn ? "No event entered." : language === "tr" ? "Hiçbir etkinlik girilmedi." : "Nema unetog događaja."),
        colorClass:
          "from-blue-500/10 to-blue-600/5 dark:from-[#0B1C33] dark:to-[#08182E] border-blue-500/25",
        textBrand: "text-[#007AFF] dark:text-[#0A84FF]",
        bgAccent: "bg-[#007AFF]",
      },
      {
        key: "B",
        letter: "B",
        title: isEn ? "Beliefs & Demands" : language === "tr" ? "İnançlar ve Talepler" : "Uverenja i Moranja",
        subtitle: isEn ? "Absolute dogmas & expectations" : language === "tr" ? "Mutlak dogmalar ve beklentiler" : "Apsolutna očekivanja i pritisak",
        icon: "⚠️",
        content:
          decodedB ||
          (isEn ? "No specific irrational belief specified." : language === "tr" ? "Belirli bir irrasyonel inanç belirtilmemiştir." : "Nema unetog uverenja."),
        colorClass:
          "from-amber-500/10 to-amber-600/5 dark:from-[#36200A] dark:to-[#2B1808] border-amber-500/25",
        textBrand: "text-[#FF9500] dark:text-[#FF9F0A]",
        bgAccent: "bg-[#FF9500]",
      },
      {
        key: "C",
        letter: "C",
        title: isEn ? "Consequences" : language === "tr" ? "Sonuçlar" : "Posledice",
        subtitle: isEn ? "Feelings & behavior resulting" : language === "tr" ? "Ortaya çıkan duygu ve davranışlar" : "Emocionalne i bihejvioralne reakcije",
        icon: "👥",
        content:
          decodedC ||
          (isEn ? "No consequences entered." : language === "tr" ? "Hiçbir sonuç girilmedi." : "Nema unetih posledica."),
        colorClass:
          "from-red-500/10 to-red-600/5 dark:from-[#331111] dark:to-[#260B0B] border-red-500/25",
        textBrand: "text-[#FF3B30] dark:text-[#FF453A]",
        bgAccent: "bg-[#FF3B30]",
      },
      {
        key: "D",
        letter: "D",
        title: isEn ? "Disputing (AI Coach)" : language === "tr" ? "Sorgulama (Yapay Zeka Koçu)" : "Osporavanje uverenja",
        subtitle: isEn ? "Disputing & questioning dogmas" : language === "tr" ? "Dogmaları tartışmak ve sorgulamak" : "Zajedničko preispitivanje krutih uloga",
        icon: "⚖️",
        content: "",
        colorClass:
          "from-purple-500/10 to-purple-600/5 dark:from-[#25123A] dark:to-[#1C0D2C] border-purple-500/25",
        textBrand: "text-[#BF5AF2]",
        bgAccent: "bg-[#BF5AF2]",
      },
      {
        key: "E",
        letter: "E",
        title: isEn ? "New Perspective" : language === "tr" ? "Yeni Perspektif" : "Nova Fleksibilnost",
        subtitle: isEn ? "Effective new lifestyle philosophy" : language === "tr" ? "Etkili yeni yaşam tarzı felsefesi" : "Jednostavna i topla alternativa",
        icon: "✨",
        content: "",
        colorClass:
          "from-emerald-500/10 to-emerald-600/5 dark:from-[#0C2A18] dark:to-[#092011] border-emerald-500/25",
        textBrand: "text-[#34C759] dark:text-[#30D158]",
        bgAccent: "bg-[#34C759]",
      },
    ];

    if (!text) return cards;

    const parts = text.split(
      /(?=\d\.\s*[\u2000-\u206F\u2700-\u27BF🗄️🔍⚠️⚖️✨]|\n\d\.\s*|\*\*\d\.\s*)/g,
    );

    let partAC = "";
    let partB = "";
    let partD = "";
    let partE = "";

    parts.forEach((p) => {
      const lower = p.toLowerCase();
      if (
        lower.includes("a + c") ||
        lower.includes("razumevanje situacije") ||
        lower.includes("understanding the situation")
      ) {
        partAC = p.trim();
      } else if (
        lower.includes("uverenje b") ||
        lower.includes("unutrašnji obrazac") ||
        lower.includes("belief b") ||
        lower.includes("inner pattern")
      ) {
        partB = p.trim();
      } else if (
        lower.includes("preispitivanje") ||
        lower.includes("osporavanje") ||
        lower.includes("disputing") ||
        lower.includes("d)")
      ) {
        partD = p.trim();
      } else if (
        lower.includes("perspektiva") ||
        lower.includes("efektivna") ||
        lower.includes("new philosophy") ||
        lower.includes("e)")
      ) {
        partE = p.trim();
      }
    });

    if (partAC) {
      cards[0].content =
        (decodedA
          ? `**${isEn ? "Facts Entered:" : language === "tr" ? "Girilen Gerçekler:" : "Uneti Okidač:"}** ${decodedA}\n\n`
          : "") + partAC;
    } else {
      cards[0].content =
        decodedA || (isEn ? "No event entered." : language === "tr" ? "Hiçbir etkinlik girilmedi." : "Nema unetog događaja.");
    }

    if (partB) {
      cards[1].content =
        (decodedB
          ? `**${isEn ? "Demands Entered:" : language === "tr" ? "Girilen Talepler:" : "Uneto Moranje / Uverenje:"}** ${decodedB}\n\n`
          : "") + partB;
    } else {
      cards[1].content =
        decodedB ||
        (isEn ? "No specific irrational belief specified." : language === "tr" ? "Belirli bir irrasyonel inanç belirtilmemiştir." : "Nema unetog uverenja.");
    }

    if (decodedC) {
      cards[2].content =
        `**${isEn ? "Consequences Entered:" : language === "tr" ? "Girilen Sonuçlar:" : "Unete Posledice:"}** ${decodedC}\n\n` +
        (partAC
          ? `\n\n*${isEn ? "CBT Context Analysis:" : language === "tr" ? "TCMB Bağlam Analizi:" : "KBT Kontekst Analiza:"}*\n${partAC}`
          : "");
    } else if (partAC) {
      cards[2].content = partAC;
    } else {
      cards[2].content =
        decodedC ||
        (isEn ? "No consequences entered." : language === "tr" ? "Hiçbir sonuç girilmedi." : "Nema unetih posledica.");
    }

    if (partD) {
      cards[3].content = partD;
    } else {
      cards[3].content = text.substring(0, text.length / 2);
    }
    if (partE) {
      cards[4].content = partE;
    } else {
      cards[4].content = text.substring(text.length / 2);
    }

    return cards;
  };

  const [nlpHistory, setNlpHistory] = useState<
    Array<{ id: string; query: string; reply: string; date: string }>
  >(() => {
    try {
      const stored = safeStorage.getItem("mindset_nlp_history_v2");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [omniHistory, setOmniHistory] = useState<
    Array<{ query: string; reply: string; date: string }>
  >(() => {
    try {
      const stored = safeStorage.getItem("mindset_omni_history_v2");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [omniPrompt, setOmniPrompt] = useState("");
  const [omniLoading, setOmniLoading] = useState(false);
  const [omniError, setOmniError] = useState("");
  const [omniResult, setOmniResult] = useState("");
  const [omniAnimationStatus, setOmniAnimationStatus] = useState("idle");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(
    null,
  );
  const [suggestedOmniPrompts, setSuggestedOmniPrompts] = useState<string[]>(
    [],
  );

  useEffect(() => {
    try {
      const stored = safeStorage.getItem("omni_suggested_prompts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSuggestedOmniPrompts(parsed);
        }
      }
    } catch(e) {}
  }, []);




  const [biohackHistory, setBiohackHistory] = useState<
    Array<{ query: string; reply: string; date: string }>
  >(() => {
    try {
      const stored = safeStorage.getItem("mindset_biohack_history_v2");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [taHistory, setTaHistory] = useState<
    Array<{ query: string; reply: string; date: string }>
  >(() => {
    try {
      const stored = safeStorage.getItem("mindset_ta_history_v2");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDeleteFromVault = (type: string, idString: string) => {
    const idx = parseInt(idString.split("-")[1], 10);
    if (type === "nlp") {
      const newHistory = [...nlpHistory];
      newHistory.splice(idx, 1);
      setNlpHistory(newHistory);
      safeStorage.setItem("mindset_nlp_history_v2", JSON.stringify(newHistory));
    } else if (type === "omni") {
      const newHistory = [...omniHistory];
      newHistory.splice(idx, 1);
      setOmniHistory(newHistory);
      safeStorage.setItem(
        "mindset_omni_history_v2",
        JSON.stringify(newHistory),
      );
    } else if (type === "biohack") {
      const newHistory = [...biohackHistory];
      newHistory.splice(idx, 1);
      setBiohackHistory(newHistory);
      safeStorage.setItem(
        "mindset_biohack_history_v2",
        JSON.stringify(newHistory),
      );
    } else if (type === "ta") {
      const newHistory = [...taHistory];
      newHistory.splice(idx, 1);
      setTaHistory(newHistory);
      safeStorage.setItem("mindset_ta_history_v2", JSON.stringify(newHistory));
    }
  };

  const getAllSavedPrompts = () => {
    const all: Array<{
      id: string;
      type: "nlp" | "rebt" | "biohack" | "ta";
      query: string;
      reply: string;
      date: string;
    }> = [];

    nlpHistory.forEach((item, idx) => {
      all.push({
        id: `nlp-${idx}`,
        type: "nlp",
        query: item.query,
        reply: item.reply,
        date: item.date,
      });
    });

    rebtHistory.forEach((item, idx) => {
      all.push({
        id: `rebt-${idx}`,
        type: "rebt",
        query: item.query,
        reply: item.reply,
        date: item.date,
      });
    });

    biohackHistory.forEach((item, idx) => {
      all.push({
        id: `biohack-${idx}`,
        type: "biohack",
        query: item.query,
        reply: item.reply,
        date: item.date,
      });
    });

    taHistory.forEach((item, idx) => {
      all.push({
        id: `ta-${idx}`,
        type: "ta",
        query: item.query,
        reply: item.reply,
        date: item.date,
      });
    });

    return all;
  };

  const handleRestoreFromVault = (item: {
    type: string;
    query: string;
    reply: string;
    date: string;
  }) => {
    if (item.type === "nlp") {
      setChatMessages([
        {
          role: "assistant",
          content: isEn ? "Restored from history session." : language === "tr" ? "Geçmiş oturumundan geri yüklendi." : "Vraćeno iz prethodne seanse.",
        },
        { role: "user", content: item.query },
        { role: "assistant", content: item.reply },
      ]);
      setActiveSubTab("Protocol");
    } else if (item.type === "omni") {
      setOmniResult(item.reply);
      setOmniPrompt(item.query);
      setIsDetailedOmni(false);
      if (item.query.includes("[A - Događaj")) {
        const parsePart = (tag: string) => {
          const idxMatch = item.query.indexOf(tag);
          if (idxMatch === -1) return "";
          const textAfter = item.query.substring(idxMatch + tag.length);
          const nextTagIndex = textAfter.indexOf("[");
          return nextTagIndex !== -1
            ? textAfter.substring(0, nextTagIndex).trim()
            : textAfter.trim();
        };
        const valA = parsePart("[A - Događaj / Activating Event]: ");
        const valC = parsePart("[C - Posledica / Consequence]: ");
        const valB = parsePart(
          "[B - Moja trenutna blokada/uverenje / Belief]: ",
        );
        setRebtA(valA);
        setRebtC(valC);
        setRebtB(valB);
        setDecodedA(valA);
        setDecodedC(valC);
        setDecodedB(valB);
      } else {
        setRebtA(item.query);
        setRebtB("");
        setRebtC("");
        setDecodedA(item.query);
        setDecodedB("");
        setDecodedC("");
      }
      setActiveSubTab("rebt");
    } else if (item.type === "biohack") {
      setBiohackMessages([
        {
          role: "assistant",
          content: isEn ? "Restored Biohacker session." : language === "tr" ? "Biohacker oturumu geri yüklendi." : "Vraćena biohakerska seansa.",
        },
        { role: "user", content: item.query },
        { role: "assistant", content: item.reply },
      ]);
      setActiveSubTab("biohack");
    } else if (item.type === "ta") {
      setTaMessages([
        {
          role: "assistant",
          content: isEn ? "Restored Mindmap session." : language === "tr" ? "Zihin Haritası oturumu geri yüklendi." : "Vraćena seansa Mape Uma.",
        },
        { role: "user", content: item.query },
        { role: "assistant", content: item.reply },
      ]);
      setActiveSubTab("ta");
    }
    setVaultOpen(false);
    triggerHaptics("success");
    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn ? `Restored past reflection in ${item.type === "rebt" ? "Beliefs" : item.type === "ta" ? "Mindmap" : item.type === "nlp" ? "Chat" : "Body & Energy"} module! 🔑` : language === "tr" ? `${item.type === "rebt" ? "İnançlar" : item.type === "ta" ? "Zihin Haritası" : item.type === "nlp" ? "Sohbet" : "Beden & Enerji"} modülündeki geçmiş yansıma geri yüklendi! 🔑` : `Vraćena refleksija unutar ${item.type === "rebt" ? "Uverenja" : item.type === "ta" ? "Mape Uma" : item.type === "nlp" ? "Razgovora" : "Tela i Energije"} modula! 🔑`,
          type: "success",
        },
      }),
    );
  };

  const triggerHaptics = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error",
  ) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        switch (type) {
          case "light":
            navigator.vibrate(10);
            break;
          case "medium":
            navigator.vibrate(30);
            break;
          case "heavy":
            navigator.vibrate(60);
            break;
          case "success":
            navigator.vibrate([30, 50, 30]);
            break;
          case "warning":
            navigator.vibrate([40, 60, 40]);
            break;
          case "error":
            navigator.vibrate([60, 100, 60, 100]);
            break;
        }
      } catch (e) {
        console.warn("Haptics blocked inside iframe", e);
      }
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (protocolViewportRef.current) {
      protocolViewportRef.current.scrollTop =
        protocolViewportRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (biohackViewportRef.current) {
      biohackViewportRef.current.scrollTop =
        biohackViewportRef.current.scrollHeight;
    }
  }, [biohackMessages, biohackLoading]);

  useEffect(() => {
    if (taViewportRef.current) {
      taViewportRef.current.scrollTop = taViewportRef.current.scrollHeight;
    }
  }, [taMessages, taLoading]);

  const [inboxThoughts, setInboxThoughts] = useState<string[]>([]);
  const [inboxTaInsights, setInboxTaInsights] = useState<string>("");

  // Load deep linked thought from Storage
  useEffect(() => {
    const pendingTab = safeStorage.getItem("abcde_pending_mindset_tab");
    if (pendingTab) {
      if (
        pendingTab === "Protocol" ||
        pendingTab === "rebt" ||
        pendingTab === "biohack" ||
        pendingTab === "ta"
      ) {
        setActiveSubTab(pendingTab as any);
      }
      safeStorage.removeItem("abcde_pending_mindset_tab");
    }

    let pending: string[] = [];
    try {
      const stored = safeStorage.getItem("abcde_pending_mindset_thoughts");
      if (stored) pending = JSON.parse(stored);
    } catch (e) {}

    // Legacy single thought support
    const legacy = safeStorage.getItem("abcde_pending_mindset_thought");
    if (legacy) {
      pending.push(legacy);
      safeStorage.removeItem("abcde_pending_mindset_thought");
    }

    const taInsight = safeStorage.getItem("abcde_pending_ta_insight") || "";
    safeStorage.removeItem("abcde_pending_ta_insight");

    if (pending.length > 0) {
      setInboxThoughts(pending);
      // Clean storage immediately
      safeStorage.removeItem("abcde_pending_mindset_thoughts");
    }
    if (taInsight) {
      setInboxTaInsights(taInsight);
    }
  }, []);

  const handleSendChatMessage = async (textOverride?: string) => {
    const textToSend = textOverride !== undefined ? textOverride : chatInput;
    if (!textToSend.trim()) return;

    triggerHaptics("light");

    if (!textOverride) {
      setChatInput("");
    }

    setErrorMsg("");
    setChatLoading(true);

    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: textToSend },
    ];
    setChatMessages(newMessages);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "assistant" ? "model" : m.role,
            content: m.content,
          })),
          language,
          mode: "omni",
          aiTone: activeAiTone,
        }),
      });

      if (!response.ok) {
        let errMsg = isEn ? "Failed to communicate with AI Mentor" : language === "tr" ? "AI Mentor ile iletişim kurulamadı" : "Greška u konekciji. Pokušajte ponovo.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const responseText =
        data.content ||
        data.reply ||
        (isEn ? "Mentor answered silently." : language === "tr" ? "Mentor sessizce cevap verdi." : "Nema odgovora od mentora.");
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: responseText },
      ]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("companion-add-xp", { detail: { amount: 15 } }),
        );
      }

      const newHistoryItem = {
        id: crypto.randomUUID(),
        query: textToSend,
        reply: responseText,
        date:
          new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }) +
          " - " +
          new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          }),
      };
      setNlpHistory((prev) => {
        const updated = [newHistoryItem, ...prev].slice(0, 10);
        safeStorage.setItem("mindset_nlp_history_v2", JSON.stringify(updated));
        return updated;
      });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendBiohackMessage = async (textOverride?: string) => {
    const textToSend = textOverride !== undefined ? textOverride : biohackInput;
    if (!textToSend.trim()) return;

    triggerHaptics("light");

    if (!textOverride) {
      setBiohackInput("");
    }

    setBiohackErrorMsg("");
    setBiohackLoading(true);

    const newMessages = [
      ...biohackMessages,
      { role: "user" as const, content: textToSend },
    ];
    setBiohackMessages(newMessages);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "assistant" ? "model" : m.role,
            content: m.content,
          })),
          language,
          mode: "biohack",
          aiTone: activeAiTone,
        }),
      });

      if (!response.ok) {
        let errMsg = isEn ? "Failed to communicate with AI Mentor" : language === "tr" ? "AI Mentor ile iletişim kurulamadı" : "Greška u konekciji. Pokušajte ponovo.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const responseText =
        data.content ||
        data.reply ||
        (isEn ? "Mentor answered silently." : language === "tr" ? "Mentor sessizce cevap verdi." : "Nema odgovora od mentora.");
      setBiohackMessages([
        ...newMessages,
        { role: "assistant", content: responseText },
      ]);

      const newHistoryItem = {
        query: textToSend,
        reply: responseText,
        date:
          new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }) +
          " - " +
          new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          }),
      };
      setBiohackHistory((prev) => {
        const updated = [newHistoryItem, ...prev].slice(0, 10);
        safeStorage.setItem(
          "mindset_biohack_history_v2",
          JSON.stringify(updated),
        );
        return updated;
      });
    } catch (e: any) {
      setBiohackErrorMsg(e.message);
    } finally {
      setBiohackLoading(false);
    }
  };

  const handleREBTDecode = async (overrideText?: string) => {
    let textToDecode = overrideText !== undefined ? overrideText : "";

    if (overrideText === undefined) {
      if (!rebtA.trim()) {
        setRebtError(
          isEn ? "Please describe the event and your feelings." : language === "tr" ? "Lütfen olayı ve duygularınızı anlatın." : "Molimo opišite situaciju i kako se osećate.",
        );
        return;
      }
      textToDecode = `[Opis situacije i osećanja / Situation desc]: ${rebtA}`;
    }

    setRebtLoading(true);
    setRebtAnimationStatus("loading");
    triggerHaptics("medium");
    setRebtError("");
    setRebtResult("");
    setIsDetailedRebt(false);
    setLastRebtQuery(textToDecode);

    try {
      const response = await fetch("/api/rebt-decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToDecode,
          language,
        }),
      });

      if (!response.ok) {
        let errMsg = isEn ? "Failed to analyze belief patterns." : language === "tr" ? "İnanç kalıpları analiz edilemedi." : "Neuspešna dekonstrukcija uverenja.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const replyText = data.reply || "";
      setRebtResult(replyText);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("companion-add-xp", { detail: { amount: 25 } }),
        );
      }
      if (overrideText) {
        setDecodedA(overrideText);
        setDecodedB("");
        setDecodedC("");
      } else {
        setDecodedA(rebtA);
        setDecodedB(rebtB);
        setDecodedC(rebtC);
        setRebtA("");
        setRebtC("");
        setRebtB("");
      }
      setRebtAnimationStatus("success");
      triggerHaptics("success");

      const newHistoryItem = {
        query: textToDecode,
        reply: replyText,
        date:
          new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }) +
          " - " +
          new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          }),
      };
      setRebtHistory((prev) => {
        const updated = [newHistoryItem, ...prev].slice(0, 10);
        safeStorage.setItem("mindset_rebt_history_v2", JSON.stringify(updated));
        return updated;
      });

      setTimeout(() => {
        setRebtAnimationStatus("idle");
      }, 2500);
    } catch (e: any) {
      setRebtError(isEn ? "Failed: " + e.message : "Greška: " + e.message);
      setRebtAnimationStatus("error");
      triggerHaptics("error");
      setTimeout(() => {
        setRebtAnimationStatus("idle");
      }, 2500);
    } finally {
      setRebtLoading(false);
    }
  };

  const handleLoadMoreREBTDetails = async () => {
    triggerHaptics("light");
    setRebtLoadingDetails(true);
    setRebtError("");
    try {
      const response = await fetch("/api/rebt-decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: lastRebtQuery,
          language,
          moreDetails: true,
        }),
      });

      if (!response.ok) {
        let errMsg = isEn ? "Failed to load deeper belief analysis." : language === "tr" ? "Daha derin inanç analizi yüklenemedi." : "Neuspešno učitavanje dublje analize uverenja.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setRebtResult(data.reply || "");
      setIsDetailedRebt(true);
    } catch (e: any) {
      setRebtError(
        isEn
          ? "Failed to expand: " + e.message
          : "Greška pri proširivanju: " + e.message,
      );
    } finally {
      setRebtLoadingDetails(false);
    }
  };

  const handleSendTaMessage = async (textOverride?: string) => {
    const textToSend = textOverride !== undefined ? textOverride : taInput;
    if (!textToSend.trim()) return;

    triggerHaptics("light");

    if (!textOverride) {
      setTaInput("");
    }

    setTaErrorMsg("");
    setTaLoading(true);

    const newMessages = [
      ...taMessages,
      { role: "user" as const, content: textToSend },
    ];
    setTaMessages(newMessages);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "assistant" ? "model" : m.role,
            content: m.content,
          })),
          language,
          mode: "ta",
          aiTone: activeAiTone,
        }),
      });

      if (!response.ok) {
        let errMsg = isEn ? "Failed to communicate with TA Expert" : language === "tr" ? "TA Uzmanı ile iletişim kurulamadı" : "Greška u konekciji sa AI mentorom. Pokušajte ponovo.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const responseText =
        data.content ||
        data.reply ||
        (isEn ? "TA Expert answered silently." : language === "tr" ? "TA Uzmanı sessizce cevap verdi." : "Nema odgovora od stručnjaka.");
      setTaMessages([
        ...newMessages,
        { role: "assistant", content: responseText },
      ]);

      const newHistoryItem = {
        query: textToSend,
        reply: responseText,
        date:
          new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }) +
          " - " +
          new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          }),
      };
      setTaHistory((prev) => {
        const updated = [newHistoryItem, ...prev].slice(0, 10);
        safeStorage.setItem("mindset_ta_history_v2", JSON.stringify(updated));
        return updated;
      });
    } catch (e: any) {
      setTaErrorMsg(e.message);
    } finally {
      setTaLoading(false);
    }
  };

  const routeInboxItem = (
    index: number,
    target: "Protocol" | "rebt" | "biohack" | "ta",
  ) => {
    const itemText = inboxThoughts[index];
    if (!itemText) return;

    // Remove from inbox queue
    const updated = [...inboxThoughts];
    updated.splice(index, 1);
    setInboxThoughts(updated);

    let finalPayload = itemText;
    if (inboxTaInsights) {
      finalPayload += `\n[Context/TA Insight]: ${inboxTaInsights}`;
    }

    if (target === "rebt") {
      setActiveSubTab("rebt");
      setRebtA(finalPayload);
      setRebtB("");
      setRebtC("");
      // Automatically decode
      handleREBTDecode(finalPayload);
      triggerHaptics("success");
    } else if (target === "biohack") {
      setActiveSubTab("biohack");
      setBiohackInput(finalPayload);
      // Automatically trigger biohacker ai response
      handleSendBiohackMessage(finalPayload);
      triggerHaptics("success");
    } else if (target === "ta") {
      setActiveSubTab("ta");
      setTaInput(finalPayload);
      // Automatically trigger TA response
      handleSendTaMessage(finalPayload);
      triggerHaptics("success");
    } else {
      setActiveSubTab("Protocol");
      setChatInput("");
      handleSendChatMessage(finalPayload);
      triggerHaptics("success");
    }
  };

  const getDynamicSuggestedPrompts = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    let morningData: any = null;
    try {
      const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
      if (saved) {
        morningData = JSON.parse(saved);
      }
    } catch (e) {}

    const isEn = language === "en";
    const isTr = language === "tr";

    const standardPrompts = [
      {
        en: "How do I release old mental blockages?",
        tr: "Eski zihinsel engelleri ve blokajları nasıl serbest bırakabilirim?",
        sr: "Kako da oslobodim stare mentalne i energetske blokade?",
      },
      {
        en: "Create a powerful sleep meditation affirmation for me",
        tr: "Uykudan önce bilinçaltım için güçlü bir olumlama hazırlar mısın?",
        sr: "Formuliši mi moćnu autosugestiju i afirmaciju pre spavanja",
      },
      {
        en: "Reprogram my fear of failure with neuro-linguistic framing",
        tr: "Başarısızlık korkumu nöro-linguistik çerçeveleme ile yeniden programla",
        sr: "Strah od neuspeha me paralizuje, reprogramiraj moju podsvest",
      }
    ];

    const biohackDefaults = isEn ? [
      "🧬 Optimize my morning dopamine baseline & light exposure",
      "🧘 How to lower cortisol in the evening for deeper non-REM sleep?",
      "⚡ Protocol for 90-min deep focus blocks without mental fatigue",
      "🍏 Biohack brain fog: Cold exposure & hydration routine",
    ] : isTr ? [
      "🧬 Sabah dopamin seviyemi ve ışık maruziyetimi nasıl optimize ederim?",
      "🧘 Derin non-REM uykusu için akşam kortizol seviyesini nasıl düşürürüm?",
      "⚡ Zihinsel yorgunluk olmadan 90 dakikalık derin odaklanma protokolü",
      "🍏 Beyin sisini gider: Soğuk maruziyeti ve hidrasyon rutini",
    ] : [
      "🧬 Kako da optimizujem jutarnji dopamin i izloženost svetlosti?",
      "🧘 Kako smanjiti kortizol uveče za dublji ne-REM san?",
      "⚡ Protokol za 90-minutne blokove dubokog fokusa bez zamora",
      "🍏 Reši se magle u glavi: Hladan tuš i hidratacioni protokol",
    ];

    const dynamicPrompts: string[] = [];

    // 1. Add custom prompts from AI suggestions (Vance)
    if (suggestedOmniPrompts && suggestedOmniPrompts.length > 0) {
      suggestedOmniPrompts.forEach(p => {
        if (p && !dynamicPrompts.includes(p)) {
          dynamicPrompts.push(p);
        }
      });
    }

    // 2. Add dynamic prompts from today's morning reset data
    if (morningData) {
      const worries = morningData.worries || [];
      const goals = morningData.goals || [];
      const emotion = morningData.selectedEmotion || (morningData.emotions && morningData.emotions[0]);
      const drivers = morningData.confirmedDrivers || morningData.drivers || [];

      if (worries.length > 0) {
        const firstWorry = worries[0];
        const p = isEn 
          ? `Help me release my worry about "${firstWorry}" using cognitive reframing.`
          : isTr 
            ? `"${firstWorry}" hakkındaki endişemi bilişsel yeniden çerçeveleme ile dönüştürmeme yardım et.`
            : `Pomogni mi da transformišem brigu o "${firstWorry}" kroz kognitivno preuokviravanje.`;
        if (!dynamicPrompts.includes(p)) dynamicPrompts.push(p);
      }

      if (goals.length > 0) {
        const firstGoal = goals[0];
        const p = isEn 
          ? `What is a precise biohacking protocol to help me focus and achieve "${firstGoal}" today?`
          : isTr 
            ? `Bugün "${firstGoal}" hedefime odaklanıp başarmam için bana tam bir biohacking protokolü önerir misin?`
            : `Predloži mi konkretan biohacking protokol koji će mi pomoći da ostvarim cilj "${firstGoal}" danas?`;
        if (!dynamicPrompts.includes(p)) dynamicPrompts.push(p);
      }

      if (emotion) {
        const p = isEn 
          ? `I feel "${emotion}" today. Recommend a quick physical NSDR or biohack to regulate my nervous system.`
          : isTr 
            ? `Bugün kendimi "${emotion}" hissediyorum. Sinir sistemimi düzenlemek için hızlı bir NSDR veya biyohak öner.`
            : `Danas se osećam "${emotion}". Preporuči mi brzi NSDR ili biohack za regulaciju nervnog sistema.`;
        if (!dynamicPrompts.includes(p)) dynamicPrompts.push(p);
      }

      if (drivers.length > 0) {
        const firstDriver = drivers[0];
        const p = isEn 
          ? `How do I bypass the "${firstDriver}" driver to find peace and work in Adult state today?`
          : isTr 
            ? `Bugün "${firstDriver}" baskısından sıyrılıp huzur bulmak ve Yetişkin modunda çalışmak için ne yapmalıyım?`
            : `Kako da prevaziđem drajver "${firstDriver}" kako bih radio iz smirenog stanja Odraslog danas?`;
        if (!dynamicPrompts.includes(p)) dynamicPrompts.push(p);
      }
    }

    const finalPrompts: string[] = [...dynamicPrompts];

    // 3. Populate remaining slots with biohack defaults
    for (const p of biohackDefaults) {
      if (!finalPrompts.includes(p) && finalPrompts.length < 6) {
        finalPrompts.push(p);
      }
    }

    // 4. Populate remaining slots with standard prompts
    for (const p of standardPrompts) {
      const localized = isEn ? p.en : isTr ? p.tr : p.sr;
      if (!finalPrompts.includes(localized) && finalPrompts.length < 6) {
        finalPrompts.push(localized);
      }
    }

    return finalPrompts.slice(0, 6);
  };

  return (
    <div
      className="space-y-6 select-none max-w-5xl mx-auto pb-10 text-left"
      id="mindset-coach-root"
    >
      {/* HEADER SECTION WITH TITLE AND PROMPT VAULT TRIGGER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            ✨ {isEn ? "Omni AI Assistant" : language === "tr" ? "Omni AI Asistanı" : "Omni AI Asistent"}
          </h2>
          <p className="text-[11px] text-[#8E8E93] dark:text-[#EBEBF5]/60/80 font-semibold leading-relaxed">
            {isEn ? "Your personal guide to clarity. Overcome challenges, brainstorm ideas, and organize your day." : language === "tr" ? "Netliğe giden kişisel rehberiniz. Zorlukların üstesinden gelin, beyin fırtınası yapın ve gününüzü organize edin." : "Tvoj lični asistent za uspeh. Reši izazove, pronađi ideje i organizuj svoj dan."}
          </p>
        </div>
      </div>

      {/* PRIJEMNO SANDUČE (MINDSET INBOX) */}
      <AnimatePresence>
        {inboxThoughts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#007AFF]/10 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📥</span>
                <div>
                  <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-normal">
                    {isEn ? "SMART INBOX" : language === "tr" ? "AKILLI GELEN KUTUSU" : "PAMETNO SANDUČE"}
                  </h4>
                  <p className="text-[12px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60">
                    {isEn ? "Organize your thoughts into actionable steps and review them:" : language === "tr" ? "Düşüncelerinizi eyleme geçirilebilir adımlara dönüştürün ve inceleyin:" : "Pretvori misli u jasne zadatke i pošalji ih asistentu na analizu:"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInboxThoughts([]);
                  triggerHaptics("medium");
                }}
                className="text-[11px] font-bold text-[#FF3B30] dark:text-[#FF453A] hover:opacity-80 px-2 py-1 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 rounded-lg transition-all"
              >
                {isEn ? "Clear All" : language === "tr" ? "Tümünü Temizle" : "Isprazni sve"}
              </button>
            </div>

            <div className="space-y-3">
              {inboxThoughts.map((thought, idx) => {
                // Smart auto-routing tags
                const isBiohackingMatch =
                  /weight|smršam|smrsam|mršavljenje|mrsavljenje|kilogram|težina|diet|tezin|san|umor|spavanje|hrana|ishrana|body|biolog|trening/i.test(
                    thought,
                  );
                const isREBTMatch =
                  /moram|treba|must|uvek|nikad|always|never|grozno|ne podnosim|kritik|uspeh/i.test(
                    thought,
                  );
                const isTAMatch =
                  /dijete|dete|roditelj|parent|child|adult|odrasli|drajver|savrsen|savršen|budi jak|udovolji|krivica|trougao|karpman|zrtva|žrtva|analiz/i.test(
                    thought,
                  );

                return (
                  <motion.div
                    key={`inbox-${idx}`}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-3.5 bg-[#F2F2F7] dark:bg-[#1C1C1E]/50 dark:bg-[#000000]/30 border border-black/5 dark:border-white/5 rounded-xl space-y-3 transition-all hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] dark:hover:bg-black/40"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xs text-[#007AFF] mt-0.5">▪</span>
                      <p className="text-[13px] font-medium leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {thought}
                      </p>
                    </div>

                    {/* Routing Options */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 flex items-center gap-1">
                        ⚡ {isEn ? "Recommended Route:" : language === "tr" ? "Önerilen Rota:" : "Preporučena ruta:"}{" "}
                        <span className="text-[#007AFF] font-bold">
                          {isEn ? "Omni AI" : "Omni AI"}
                        </span>
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => routeInboxItem(idx, "Protocol")}
                          className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border bg-[#007AFF] text-white border-[#007AFF] shadow-sm"
                        >
                          🧠 Omni AI
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...inboxThoughts];
                            updated.splice(idx, 1);
                            setInboxThoughts(updated);
                            triggerHaptics("light");
                          }}
                          className="px-1.5 py-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 text-[#FF3B30] dark:text-[#FF453A] font-semibold rounded-lg transition-all text-xs"
                          title={isEn ? "Discard" : language === "tr" ? "At" : "Odbaci"}
                        >
                          <span className="text-lg">×</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBTAB 1: Protocol CONVERSATION DIALOGUE */}
      <>
        <motion.div
          key="tab-Protocol"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className={`h-[760px] flex flex-col rounded-[32px] relative overflow-hidden transition-colors duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${
            isEvening
              ? "bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/5"
              : "bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-3xl border border-black/5 dark:border-white/10"
          }`}
        >
          {/* iOS-style Header */}
          <div className="flex flex-col items-center justify-center space-y-1.5 pt-6 pb-4 border-b border-black/5 dark:border-white/5">
            <div className="relative flex items-center justify-center w-12 h-12 mb-1">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8E2DE2] via-[#4A00E0] to-[#007AFF] rounded-full blur-[10px] opacity-60 animate-pulse" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-[#8E2DE2] via-[#4A00E0] to-[#007AFF] rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
            </div>
            <h3 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
              Omni
            </h3>
            <p className="text-[13px] font-medium text-[#8E8E93] dark:text-[#EBEBF5]/60">
              {isEn ? "Apple Intelligence Style Coach" : language === "tr" ? "Yapay Zeka Koçunuz" : "Tvoj AI asistent"}
            </p>
          </div>

          {/* Messages container */}
          <div
            ref={protocolViewportRef}
            className="flex-1 overflow-y-auto px-6 sm:px-8 pt-6 pb-4 space-y-7 custom-scrollbar"
          >
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center opacity-80 pb-10">
                <p className="text-[15px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 max-w-[260px] leading-relaxed">
                  {isEn ? "How can I help you focus today?" : language === "tr" ? "Bugün odaklanmanıza nasıl yardımcı olabilirim?" : "Kako mogu da ti pomognem danas?"}
                </p>
              </div>
            )}

            {chatMessages.map((m, idx) => {
              const isAssistant = m.role === "assistant" || m.role === "model";
              return (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  key={`chat-${m.role}-${idx}`}
                  className="w-full flex flex-col"
                >
                  <div
                    className={`flex flex-col max-w-[92%] ${
                      isAssistant
                        ? "self-start items-start"
                        : "self-end items-end"
                    }`}
                  >
                    <div
                      className={`relative px-5 py-3.5 text-[15px] leading-relaxed ${
                        isAssistant
                          ? "w-full text-black dark:text-[#EBEBF5]"
                          : "bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-[22px] rounded-br-[6px] shadow-sm"
                      }`}
                    >
                      {isAssistant && (
                        <>
                          <div className="absolute inset-0 rounded-[22px] rounded-bl-[6px] p-[1px] bg-gradient-to-r from-[#007AFF] via-[#8E2DE2] to-[#FF2D55] opacity-30 dark:opacity-50 pointer-events-none">
                            <div className="w-full h-full bg-white dark:bg-[#1C1C1E] rounded-[21px] rounded-bl-[5px]"></div>
                          </div>
                          <div className="absolute inset-0 rounded-[22px] rounded-bl-[6px] bg-white/60 dark:bg-[#1C1C1E]/60 backdrop-blur-md -z-10"></div>
                        </>
                      )}
                      
                      <div className={`relative z-10 ${isAssistant ? "markdown-body text-[15px]" : "whitespace-pre-wrap"}`}>
                        {isAssistant ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </ReactMarkdown>
                        ) : (
                          m.content
                        )}
                      </div>
                    </div>

                    {/* Apple HIG Message Actions Row */}
                    {isAssistant ? (
                      <div className="flex flex-wrap items-center gap-2 mt-2 px-1 text-[#8E8E93] dark:text-[#EBEBF5]/60 z-20">
                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(m.content)}
                          className="flex items-center gap-1.5 text-xs font-semibold hover:text-[#007AFF] dark:hover:text-[#0A84FF] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer bg-black/[0.04] dark:bg-white/[0.04] py-1 px-3 rounded-full border border-black/5 dark:border-white/5"
                        >
                          {copiedText === m.content ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#34C759]" />
                              <span className="text-[#34C759]">{language === "en" ? "Copied" : language === "tr" ? "Kopyalandı" : "Kopirano"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{language === "en" ? "Copy" : language === "tr" ? "Kopyala" : "Kopiraj"}</span>
                            </>
                          )}
                        </button>

                        {/* Listen/Speak Button */}
                        <button
                          type="button"
                          onClick={() => handleSpeak(m.content)}
                          className="flex items-center gap-1.5 text-xs font-semibold hover:text-[#007AFF] dark:hover:text-[#0A84FF] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer bg-black/[0.04] dark:bg-white/[0.04] py-1 px-3 rounded-full border border-black/5 dark:border-white/5"
                        >
                          {speakingText === m.content ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-[#FF3B30] animate-pulse" />
                              <span className="text-[#FF3B30]">{language === "en" ? "Stop" : language === "tr" ? "Durdur" : "Zaustavi"}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{language === "en" ? "Listen" : language === "tr" ? "Dinle" : "Slušaj"}</span>
                            </>
                          )}
                        </button>

                        {/* Save task Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveTask(m.content)}
                          className="flex items-center gap-1.5 text-xs font-semibold hover:text-[#007AFF] dark:hover:text-[#0A84FF] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer bg-black/[0.04] dark:bg-white/[0.04] py-1 px-3 rounded-full border border-black/5 dark:border-white/5"
                        >
                          {savedTasks.includes(m.content) ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#34C759]" />
                              <span className="text-[#34C759]">{language === "en" ? "Saved" : language === "tr" ? "Kaydedildi" : "Sačuvano"}</span>
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>{language === "en" ? "To Tasks" : language === "tr" ? "Görevlere" : "U zadatke"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 mt-1.5 px-1 text-[#8E8E93] dark:text-[#EBEBF5]/60 z-20">
                        <button
                          type="button"
                          onClick={() => handleCopyText(m.content)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer bg-black/[0.03] dark:bg-white/[0.03] py-0.5 px-2.5 rounded-full border border-black/5 dark:border-white/5"
                        >
                          {copiedText === m.content ? (
                            <>
                              <Check className="w-3 h-3 text-[#34C759]" />
                              <span className="text-[#34C759]">{language === "en" ? "Copied" : language === "tr" ? "Kopyalandı" : "Kopirano"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{language === "en" ? "Copy" : language === "tr" ? "Kopyala" : "Kopiraj"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {chatLoading && (
              <div className="flex max-w-[92%] self-start">
                <div className="px-5 py-3.5 rounded-[20px] rounded-bl-[4px] bg-[#F2F2F7] dark:bg-[#2C2C2E]/80 flex items-center justify-center min-w-[60px]">
                  <AnimatedTypingIndicator color="#8E8E93" />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-[14px] text-[13px] text-[#FF3B30] font-medium self-center max-w-md w-full text-center mx-auto">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="px-4 sm:px-6 pb-5 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-[#1C1C1E] dark:via-[#1C1C1E] z-10 border-t border-black/5 dark:border-white/5 font-sans">
            {/* Recommendations */}
            <div className="flex gap-2 w-max px-1 overflow-x-auto scrollbar-none pb-3 mb-1">
              {getDynamicSuggestedPrompts().map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendChatMessage(promptText)}
                  disabled={chatLoading}
                  className={`px-4 py-1.5 text-[13px] whitespace-nowrap font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95 border ${
                    isEvening
                      ? "bg-[#2C2C2E]/50 border-white/5 text-[#EBEBF5] hover:bg-[#3A3A3C]"
                      : "bg-[#F2F2F7]/80 dark:bg-[#2C2C2E]/50 border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]"
                  }`}
                >
                  {promptText}
                </button>
              ))}
            </div>

            {/* Input field */}
            <div className="relative">
              <div
                className={`relative flex items-end rounded-[28px] pl-4 pr-2 py-1.5 transition-all border border-black/10 dark:border-white/10 shadow-xs ${
                  isEvening
                    ? "bg-[#2C2C2E]"
                    : "bg-[#F4F4F6] dark:bg-[#2C2C2E]"
                }`}
              >
                <textarea
                  ref={chatInputRef}
                  rows={1}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full bg-transparent resize-none outline-none text-[15px] py-1.5 font-normal text-black dark:text-white placeholder-[#8E8E93] dark:placeholder-[#EBEBF5]/50 leading-relaxed max-h-[160px] custom-scrollbar"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      chatInput.trim() &&
                      !chatLoading
                    ) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder={isEn ? "Message Omni..." : language === "tr" ? "Omni'ye Mesaj Yaz..." : "Poruka za Omni..."}
                  disabled={chatLoading}
                />

                {/* Voice Input and Send Action Controls */}
                <div className="flex items-center gap-1.5 mb-[3px] ml-1.5 shrink-0 z-10">
                  <VoiceInputNode
                    onTranscript={(text) => {
                      setChatInput((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + text);
                    }}
                    isEvening={isEvening}
                    language={language}
                    inline={true}
                  />

                  <button
                    type="button"
                    onClick={() => handleSendChatMessage()}
                    disabled={!chatInput.trim() || chatLoading}
                    className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      chatInput.trim()
                        ? "bg-black text-white dark:bg-white dark:text-black hover:scale-[1.05] active:scale-95 shadow-sm"
                        : "bg-black/5 dark:bg-white/5 text-black/25 dark:text-white/25 cursor-not-allowed"
                    }`}
                    title={isEn ? "Send" : language === "tr" ? "Gönder" : "Pošalji"}
                  >
                    <ArrowUp className="w-[18px] h-[18px] stroke-[2.5px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* NLP History */}
          {nlpHistory.length > 0 && (
            <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 tracking-normal uppercase flex items-center gap-1.5 label-sans-history">
                  ⏱️{" "}
                  {isEn ? "PREVIOUS CHATS" : language === "tr" ? "GEÇMİŞ SOHBETLER" : "PRETHODNI RAZGOVORI"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNlpHistory([]);
                    safeStorage.removeItem("mindset_nlp_history_v2");
                    triggerHaptics("medium");
                  }}
                  className="text-[10px] font-bold text-[#FF3B30] hover:underline cursor-pointer"
                >
                  {isEn ? "Clear history" : language === "tr" ? "Geçmişi temizle" : "Očisti istoriju"}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nlpHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F2F2F7] dark:bg-[#1C1C1E]/50 dark:bg-[#000000]/30 rounded-xl border border-black/5 dark:border-white/5 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-mono">
                      <span>{item.date}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setChatMessages([
                            {
                              role: "assistant",
                              content: isEn ? "Restored from history session." : language === "tr" ? "Geçmiş oturumundan geri yüklendi." : "Vraćeno iz prethodne seanse.",
                            },
                            { role: "user", content: item.query },
                            { role: "assistant", content: item.reply },
                          ]);
                          triggerHaptics("success");
                        }}
                        className="text-[#007AFF] hover:underline cursor-pointer font-bold"
                      >
                        {isEn ? "Restore" : language === "tr" ? "Eski haline getirmek" : "Vrati"}
                      </button>
                    </div>
                    <p className="font-bold text-black dark:text-white line-clamp-1">
                      Q: {item.query}
                    </p>
                    <p className="opacity-75 line-clamp-2 text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {item.reply.replace(/[#*`_]/g, "").substring(0, 150)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </>
    </div>
  );
}
