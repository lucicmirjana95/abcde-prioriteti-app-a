import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Flame,
  Target,
  HelpCircle,
  MessageSquare,
  History,
  Sparkles,
  TrendingUp,
  Plus,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Zap,
  Info,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Copy,
  Shield,
  Sun,
  Moon,
  Brain,
} from "lucide-react";
import Markdown from "react-markdown";
import ZoomableCard from "./ZoomableCard";
import DopamineEducation from "./DopamineEducation";

interface Task {
  id: string;
  title: string;
  category: string;
  isCompleted?: boolean;
}

interface DopamineTrackerProps {
  language: "en" | "sr" | "tr";
  tasks: Task[];
  isDark: boolean;
  onAddTask?: (title: string, description?: string, category?: string) => void;
}

interface DecisionQuestionOption {
  value: string;
  label: string;
}

interface DecisionQuestion {
  id: string;
  text: string;
  options: DecisionQuestionOption[];
}

interface AnalysisResult {
  needsMoreInfo: boolean;
  questions: DecisionQuestion[];
  determinedCategory: "impulsive" | "delayed" | "escapism" | null;
  explanation: string;
  actionableStrategy?: string;
}

interface SavedDecision {
  id: string;
  text: string;
  category: "impulsive" | "delayed" | "escapism";
  explanation: string;
  timestamp: string;
}

const DOPAMINE_DIAGNOSTIC_QUESTIONS = [
  {
    id: "dop1",
    textEn: "Morning Baseline & Phone Checking",
    textSr: "Jutarnja baza i provera telefona",
    textTr: "Sabah Temeli ve Telefon Kontrolü",
    descEn: "How soon after waking up do you feel the urge to check your phone or consume digital content?",
    descSr: "Koliko brzo nakon buđenja osetiš snažnu potrebu da proveriš telefon ili društvene mreže?",
    descTr: "Uyandıktan ne kadar süre sonra telefonunuzu kontrol etme veya dijital içerik tüketme dürtüsü hissediyorsunuz?",
    options: [
      { labelEn: "Instantly (0-5 min)", labelSr: "Trenutno (0-5 min)", labelTr: "Anında (0-5 dk)", focus: 1, stimulation: 10, restfulness: 1 },
      { labelEn: "Soon (5-15 min)", labelSr: "Ubrzo (5-15 min)", labelTr: "Yakında (5-15 dk)", focus: 3, stimulation: 8, restfulness: 3 },
      { labelEn: "After morning routine", labelSr: "Nakon jutarnje rutine", labelTr: "Sabah rutininden sonra", focus: 6, stimulation: 5, restfulness: 6 },
      { labelEn: "After 1+ hours", labelSr: "Posle 1+ sata", labelTr: "1+ saat sonra", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "Only when needed", labelSr: "Samo kad moram", labelTr: "Sadece gerektiğinde", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop2",
    textEn: "Tolerance to Boredom",
    textSr: "Tolerancija na dosadu",
    textTr: "Sıkıntıya Tolerans",
    descEn: "When you have to wait in line or sit without your phone, how quickly do you feel restless or anxious?",
    descSr: "Kada moraš da čekaš u redu ili sediš bez telefona, koliko brzo osetiš nemir ili anksioznost?",
    descTr: "Sırada beklemeniz veya telefonunuz olmadan oturmanız gerektiğinde, ne kadar çabuk huzursuz veya endişeli hissediyorsunuz?",
    options: [
      { labelEn: "Under 10 seconds", labelSr: "Ispod 10 sekundi", labelTr: "10 saniyenin altında", focus: 1, stimulation: 10, restfulness: 0 },
      { labelEn: "A minute or two", labelSr: "Minut ili dva", labelTr: "Bir veya iki dakika", focus: 3, stimulation: 8, restfulness: 3 },
      { labelEn: "After 5 minutes", labelSr: "Nakon 5 minuta", labelTr: "5 dakika sonra", focus: 5, stimulation: 6, restfulness: 5 },
      { labelEn: "I can wait calmly", labelSr: "Mogu mirno da čekam", labelTr: "Sakinleşerek bekleyebilirim", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "I enjoy the silence", labelSr: "Uživam u tišini", labelTr: "Sessizliğin tadını çıkarırım", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop3",
    textEn: "Cognitive Friction & Initiation",
    textSr: "Kognitivno trenje i početak rada",
    textTr: "Bilişsel Sürtünme ve Başlama",
    descEn: "How much mental resistance do you feel before starting a hard task that offers no immediate reward?",
    descSr: "Koliko mentalnog otpora (trenja) osećaš pre nego što započneš težak zadatak koji nema trenutnu nagradu?",
    descTr: "Anında ödül sunmayan zor bir göreve başlamadan önce ne kadar zihinsel direnç hissediyorsunuz?",
    options: [
      { labelEn: "Paralyzing resistance", labelSr: "Parališući otpor", labelTr: "Felç edici direnç", focus: 1, stimulation: 9, restfulness: 1 },
      { labelEn: "Very high, I procrastinate", labelSr: "Veoma visok, prokrastiniram", labelTr: "Çok yüksek, erteliyorum", focus: 3, stimulation: 7, restfulness: 3 },
      { labelEn: "Moderate, but I push through", labelSr: "Umeren, ali preguram", labelTr: "Orta, ama atlatıyorum", focus: 6, stimulation: 5, restfulness: 5 },
      { labelEn: "Slight resistance", labelSr: "Blag otpor", labelTr: "Hafif direnç", focus: 8, stimulation: 3, restfulness: 7 },
      { labelEn: "I start immediately", labelSr: "Krećem odmah", labelTr: "Hemen başlarım", focus: 10, stimulation: 0, restfulness: 9 },
    ],
  },
  {
    id: "dop4",
    textEn: "Content Consumption Speed",
    textSr: "Brzina konzumacije sadržaja",
    textTr: "İçerik Tüketim Hızı",
    descEn: "Do you frequently speed up videos (1.5x/2x) or skip forward because normal pace feels too slow?",
    descSr: "Da li često ubrzavaš videe (1.5x/2x) ili preskačeš unapred jer ti normalna brzina deluje presporo?",
    descTr: "Videoları sık sık hızlandırıyor musunuz (1.5x/2x) veya normal hız çok yavaş geldiği için ileri sarıyor musunuz?",
    options: [
      { labelEn: "Always (I can't watch 1x)", labelSr: "Uvek (ne mogu na 1x)", labelTr: "Her zaman (1x izleyemem)", focus: 1, stimulation: 10, restfulness: 1 },
      { labelEn: "Most of the time", labelSr: "Većinu vremena", labelTr: "Çoğu zaman", focus: 3, stimulation: 8, restfulness: 3 },
      { labelEn: "Sometimes", labelSr: "Ponekad", labelTr: "Bazen", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", labelTr: "Nadiren", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "Never (Normal pace)", labelSr: "Nikad (Normalna brzina)", labelTr: "Asla (Normal hız)", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop5",
    textEn: "Task Switching & Multitasking",
    textSr: "Skakanje sa zadatka na zadatak",
    textTr: "Görev Değiştirme ve Çoklu Görev",
    descEn: "How often do you switch to a different tab or app while you are in the middle of reading or doing something else?",
    descSr: "Koliko često pređeš na drugi tab ili aplikaciju dok si usred čitanja ili rada na nečemu?",
    descTr: "Okuma yaparken veya başka bir şey yaparken ne sıklıkla farklı bir sekmeye veya uygulamaya geçersiniz?",
    options: [
      { labelEn: "Every few minutes", labelSr: "Svakih par minuta", labelTr: "Birkaç dakikada bir", focus: 1, stimulation: 10, restfulness: 1 },
      { labelEn: "Several times an hour", labelSr: "Više puta na sat", labelTr: "Saatte birkaç kez", focus: 3, stimulation: 8, restfulness: 3 },
      { labelEn: "Occasionally", labelSr: "Povremeno", labelTr: "Bazen", focus: 6, stimulation: 5, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", labelTr: "Nadiren", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "I stay single-focused", labelSr: "Imam pun fokus na jedno", labelTr: "Tek odaklı kalırım", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop6",
    textEn: "Reward Saturation",
    textSr: "Zasićenost nagradama",
    textTr: "Ödül Doygunluğu",
    descEn: "Do everyday simple pleasures (a good meal, a walk, a normal conversation) feel bland or uninteresting?",
    descSr: "Da li ti obična svakodnevna zadovoljstva (dobar obrok, šetnja, normalan razgovor) deluju prazno ili nezanimljivo?",
    descTr: "Gündelik basit zevkler (iyi bir yemek, yürüyüş, normal bir konuşma) yavan veya ilginç gelmiyor mu?",
    options: [
      { labelEn: "Yes, everything feels dull", labelSr: "Da, sve mi deluje bledo", labelTr: "Evet, her şey sıkıcı geliyor", focus: 2, stimulation: 10, restfulness: 0 },
      { labelEn: "Mostly, need high thrills", labelSr: "Uglavnom, tražim jače draži", labelTr: "Çoğunlukla, yüksek heyecanlara ihtiyacım var", focus: 4, stimulation: 8, restfulness: 2 },
      { labelEn: "Sometimes", labelSr: "Ponekad", labelTr: "Bazen", focus: 6, stimulation: 5, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", labelTr: "Nadiren", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "I enjoy simple things", labelSr: "Uživam u jednostavnim stvarima", labelTr: "Basit şeylerden zevk alırım", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop7",
    textEn: "Energy Crashes & Willpower",
    textSr: "Energetski padovi i volja",
    textTr: "Enerji Çöküşleri ve İrade",
    descEn: "How do you feel in the late afternoon regarding your willpower and cognitive energy?",
    descSr: "Kako se osećaš kasno popodne u pogledu tvoje volje i kognitivne energije?",
    descTr: "Öğleden sonraları iradeniz ve bilişsel enerjiniz konusunda nasıl hissediyorsunuz?",
    options: [
      { labelEn: "Completely exhausted & burned out", labelSr: "Potpuno iscrpljeno i prazno", labelTr: "Tamamen tükenmiş", focus: 1, stimulation: 9, restfulness: 1 },
      { labelEn: "Heavy brain fog, seeking sugar/caffeine", labelSr: "Jaka magla, tražim šećer/kafu", labelTr: "Şeker/kafein arayışı", focus: 3, stimulation: 8, restfulness: 2 },
      { labelEn: "Noticeably tired but functional", labelSr: "Primetno umorno, ali funkcionišem", labelTr: "Yorgun ama işlevsel", focus: 6, stimulation: 4, restfulness: 5 },
      { labelEn: "Mild dip, easy to recover", labelSr: "Blagi pad, lako se oporavim", labelTr: "Hafif düşüş, toparlanması kolay", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "Stable and clear energy", labelSr: "Stabilna i jasna energija", labelTr: "Kararlı ve net enerji", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop8",
    textEn: "Dopamine Stacking",
    textSr: "Slaganje stimulansa (Stacking)",
    textTr: "Dopamin İstiflemesi",
    descEn: "Do you need multiple layers of stimulation to enjoy an activity? (e.g. eating + watching Netflix + checking phone)",
    descSr: "Da li ti treba više slojeva stimulacije da bi uživao u nečemu? (npr. jedeš + gledaš Netflix + proveravaš telefon)",
    descTr: "Bir aktiviteden zevk almak için birden fazla uyarım katmanına ihtiyacınız var mı? (örn. yemek yemek + Netflix izlemek + telefona bakmak)",
    options: [
      { labelEn: "Always, cannot do just one", labelSr: "Uvek, ne mogu samo jedno", labelTr: "Her zaman, sadece birini yapamam", focus: 1, stimulation: 10, restfulness: 0 },
      { labelEn: "Often, it feels empty otherwise", labelSr: "Često, inače mi je prazno", labelTr: "Sıklıkla, aksi takdirde boş hissettirir", focus: 3, stimulation: 8, restfulness: 2 },
      { labelEn: "Sometimes", labelSr: "Ponekad", labelTr: "Bazen", focus: 5, stimulation: 5, restfulness: 5 },
      { labelEn: "Rarely, I prefer separation", labelSr: "Retko, volim da ih odvojim", labelTr: "Nadiren, ayırmayı tercih ederim", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "Never, I do one thing at a time", labelSr: "Nikad, radim jednu po jednu stvar", labelTr: "Asla, her seferinde tek bir şey yaparım", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop9",
    textEn: "End-of-Day Revenge Procrastination",
    textSr: "Večernja osvetnička prokrastinacija",
    textTr: "Günün Sonu İntikam Ertelemesi",
    descEn: "Do you stay up late scrolling or watching videos, feeling like you must 'reclaim' your free time?",
    descSr: "Da li ostaješ budan kasno skrolujući, osećajući da moraš da 'nadoknadiš' i ukradeš slobodno vreme za sebe?",
    descTr: "Geç saatlere kadar kaydırarak veya video izleyerek uyanık kalıyor ve boş zamanınızı 'geri almanız' gerektiğini hissediyor musunuz?",
    options: [
      { labelEn: "Yes, every single night", labelSr: "Da, svako bogato veče", labelTr: "Evet, her gece", focus: 1, stimulation: 10, restfulness: 0 },
      { labelEn: "Multiple times a week", labelSr: "Više puta nedeljno", labelTr: "Haftada birkaç kez", focus: 3, stimulation: 8, restfulness: 3 },
      { labelEn: "Occasionally", labelSr: "Povremeno", labelTr: "Bazen", focus: 6, stimulation: 5, restfulness: 5 },
      { labelEn: "Rarely", labelSr: "Retko", labelTr: "Nadiren", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "No, I wind down and sleep peacefully", labelSr: "Ne, opustim se i spavam mirno", labelTr: "Hayır, sakinleşir ve huzur içinde uyurum", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
  {
    id: "dop10",
    textEn: "Deep Work Capacity",
    textSr: "Kapacitet za duboki rad",
    textTr: "Derin Çalışma Kapasitesi",
    descEn: "How long can you focus intensely on a complex, challenging task before your brain forces you to check for distractions?",
    descSr: "Koliko dugo možeš intenzivno da se fokusiraš na težak zadatak, pre nego što te mozak natera da potražiš distrakciju?",
    descTr: "Beyniniz sizi dikkat dağıtıcı şeyler aramaya zorlamadan önce karmaşık, zorlu bir göreve ne kadar süre yoğun bir şekilde odaklanabilirsiniz?",
    options: [
      { labelEn: "Less than 5 minutes", labelSr: "Manje od 5 minuta", labelTr: "5 dakikadan az", focus: 1, stimulation: 10, restfulness: 1 },
      { labelEn: "Around 15 minutes", labelSr: "Oko 15 minuta", labelTr: "Yaklaşık 15 dakika", focus: 3, stimulation: 7, restfulness: 3 },
      { labelEn: "About 30 minutes", labelSr: "Oko 30 minuta", labelTr: "Yaklaşık 30 dakika", focus: 6, stimulation: 4, restfulness: 6 },
      { labelEn: "45 - 60 minutes", labelSr: "45 - 60 minuta", labelTr: "45 - 60 dakika", focus: 8, stimulation: 2, restfulness: 8 },
      { labelEn: "90+ minutes (Flow state)", labelSr: "90+ minuta (Flow stanje)", labelTr: "90+ dakika (Akış durumu)", focus: 10, stimulation: 0, restfulness: 10 },
    ],
  },
];

export default function DopamineTracker({
  language,
  tasks,
  isDark,
  onAddTask,
}: DopamineTrackerProps) {
  const isEn = language === "en";
  const [activeTab, setActiveTab] = useState<
    "analyser" | "audit" | "education" | "agent" | "history" | "shield" | "circadian"
  >("analyser");

  // 🛡️ Impulse Shield (Urge Surfer) States
  const [shieldPhase, setShieldPhase] = useState<"not_started" | "running" | "completed">("not_started");
  const [shieldSeconds, setShieldSeconds] = useState(180); // 3-minute challenge
  const [selectedUrge, setSelectedUrge] = useState("scrolling");
  const [customUrgeText, setCustomUrgeText] = useState("");

  // ⏰ Circadian Rhythm Planner States
  const [wakingHour, setWakingHour] = useState<number>(() => {
    const saved = safeStorage.getItem("kaizen_circadian_waking_hour");
    return saved ? parseInt(saved, 10) : 7;
  });
  const [lightExposureCompleted, setLightExposureCompleted] = useState<boolean>(() => {
    return safeStorage.getItem("kaizen_circadian_light_exposure") === "true";
  });
  const [caffeineDelayedCompleted, setCaffeineDelayedCompleted] = useState<boolean>(() => {
    return safeStorage.getItem("kaizen_circadian_caffeine_delay") === "true";
  });
  const [circadianScienceOpen, setCircadianScienceOpen] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Premium design helpers for dark/evening contrast and Apple HIG sizing/margins
  const secTextClass = isDark
    ? "text-gray-400"
    : "text-gray-500 dark:text-gray-400";
  const primTextClass = isDark ? "text-white" : "text-black dark:text-white";
  const cardBgClass = isDark
    ? "bg-[#2C2C2E] border-white/10"
    : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 dark:border-white/10";
  const borderClass = isDark
    ? "border-white/10"
    : "border-black/5 dark:border-white/5 dark:border-white/10";
  const subBgClass = isDark
    ? "bg-[#1C1C1E]"
    : "bg-[#F4F4F6] dark:bg-[#1C1C1E]";

  // Dopamine Audit / Test states
  const [auditFocus, setAuditFocus] = useState<number>(() =>
    Number(safeStorage.getItem("abcde_dopamine_focusLevel") || "0"),
  );
  const [auditStimulation, setAuditStimulation] = useState<number>(() =>
    Number(safeStorage.getItem("abcde_dopamine_stimulation") || "0"),
  );
  const [auditRestfulness, setAuditRestfulness] = useState<number>(() =>
    Number(safeStorage.getItem("abcde_dopamine_restfulness") || "0"),
  );
  const [auditSavedMessage, setAuditSavedMessage] = useState<string>("");
  const [auditCompleted, setAuditCompleted] = useState<boolean>(
    () => safeStorage.getItem("dopamine_audit_completed") === "true",
  );
  const [copiedChatMsgIdx, setCopiedChatMsgIdx] = useState<number | null>(null);

  // Pool of active questions selected randomly without repeating
  const [activeQuestions, setActiveQuestions] = useState<typeof DOPAMINE_DIAGNOSTIC_QUESTIONS>(
    () => {
      return DOPAMINE_DIAGNOSTIC_QUESTIONS; // Using all questions
    },
  );

  // Interactive Diagnostic Wizard States
  const [auditWizardStep, setAuditWizardStep] = useState<number>(0);
  const [auditWizardAnswers, setAuditWizardAnswers] = useState<number[]>(() => {
    // Return empty by default as requested so that answers are not pre-selected on load
    return [];
  });

  const handleRestartAudit = () => {
    setActiveQuestions(DOPAMINE_DIAGNOSTIC_QUESTIONS);
    setAuditWizardStep(0);
    setAuditWizardAnswers([]);
    setAuditSavedMessage("");
    setAuditFocus(5);
    setAuditStimulation(5);
    setAuditRestfulness(5);
    safeStorage.removeItem("dopamine_wizard_answers");
    safeStorage.removeItem("abcde_dopamine_focusLevel");
    safeStorage.removeItem("abcde_dopamine_stimulation");
    safeStorage.removeItem("abcde_dopamine_restfulness");
    safeStorage.setItem("dopamine_audit_completed", "false");

    // Sync immediate states
    window.dispatchEvent(new Event("dopamine-updated"));
    triggerHaptics("success");
  };

  // Decision Analyser States
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [animationStatus, setAnimationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );

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
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Array<{ id: string; text: string; label: string; value: string }>
  >([]);

  // Local Storage Saved Decisions History
  const [savedDecisions, setSavedDecisions] = useState<SavedDecision[]>([]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // AI Assistant Chat States
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "model"; content: string }>
  >([]);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Initialize and load saved decisions from safeStorage (Durable Persistence)
  useEffect(() => {
    const raw = safeStorage.getItem("dopamine_decisions");
    if (raw) {
      try {
        setSavedDecisions(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to load decisions", e);
      }
    }
  }, []);

  const saveToHistory = (decision: SavedDecision) => {
    const updated = [decision, ...savedDecisions];
    setSavedDecisions(updated);
    safeStorage.setItem("dopamine_decisions", JSON.stringify(updated));
  };

  useEffect(() => {
    let interval: any = null;
    if (shieldPhase === "running" && shieldSeconds > 0) {
      interval = setInterval(() => {
        setShieldSeconds((prev) => {
          if (prev <= 1) {
            setShieldPhase("completed");
            triggerHaptics("success");
            // Save recovery to history
            const recoveryRecord: SavedDecision = {
              id: Math.random().toString(),
              text: isEn 
                ? `Bypassed urge: ${selectedUrge === 'custom' ? customUrgeText || 'My own temptation' : selectedUrge === 'scrolling' ? 'Infinite scrolling' : selectedUrge === 'junkfood' ? 'Sugary snacks / Fast food' : selectedUrge === 'procrastination' ? 'Procrastination loop' : selectedUrge === 'shopping' ? 'Impulsive shopping' : selectedUrge} (Urge Surfing Completed!)`
                : language === "tr"
                  ? `Dürtüyü atlattım: ${selectedUrge === 'custom' ? customUrgeText || 'Benim engelim' : selectedUrge === 'scrolling' ? 'Sonsuz kaydırma' : selectedUrge === 'junkfood' ? 'Şekerli atıştırmalıklar' : selectedUrge === 'procrastination' ? 'Erteleme döngüsü' : selectedUrge === 'shopping' ? 'Dürtüsel alışveriş' : selectedUrge} (Dürtü Sörfü Tamamlandı!)`
                  : `Uspešno premošćen impuls: ${selectedUrge === 'custom' ? customUrgeText || 'Moje iskušenje' : selectedUrge === 'scrolling' ? 'Beskonačno skrolovanje' : selectedUrge === 'junkfood' ? 'Slatkiši / Brza hrana' : selectedUrge === 'procrastination' ? 'Prokrastinacija i beg' : selectedUrge === 'shopping' ? 'Impulsivna kupovina' : selectedUrge} (3 min svesnog jahanja talasa!)`,
              category: "delayed",
              explanation: isEn 
                ? "Resisted cheap dopamine hit via Alan Marlatt's clinical Urge Surfing method. Prefrontal cortex baseline focus increased!"
                : language === "tr"
                  ? "Alan Marlatt'ın klinik Dürtü Sörfü yöntemiyle ucuz dopaminden kaçınıldı. Prefrontal korteks temel odaklanması arttı!"
                  : "Uspeli ste da prevaziđete impuls za jeftinim dopaminom koristeći klinički dokazanu metodu Urge Surfing. Vaš bazni fokus je ojačan i prefrontalni korteks je odneo pobedu nad impulsivnim limbičkim sistemom!",
              timestamp: new Date().toLocaleDateString(isEn ? "en-US" : language === "tr" ? "tr-TR" : "sr-RS", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            
            // Perform safe state save
            const updatedDecisions = [recoveryRecord, ...savedDecisions];
            setSavedDecisions(updatedDecisions);
            safeStorage.setItem("dopamine_decisions", JSON.stringify(updatedDecisions));
            
            // Dispatch event to sync immediately across modules
            window.dispatchEvent(new Event("dopamine-updated"));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [shieldPhase, shieldSeconds, selectedUrge, customUrgeText, savedDecisions]);

  const deleteFromHistory = (id: string) => {
    const updated = savedDecisions.filter((d) => d.id !== id);
    setSavedDecisions(updated);
    safeStorage.setItem("dopamine_decisions", JSON.stringify(updated));
    if (historyIdx >= updated.length && updated.length > 0) {
      setHistoryIdx(updated.length - 1);
    } else if (updated.length === 0) {
      setHistoryIdx(0);
    }
  };

  // Handler for Dopamine Classifier / Analyser API Call
  const handleAnalyzeDecision = async (
    overrideText?: string,
    previousAnswers?: typeof answeredQuestions,
  ) => {
    const textToAnalyze = overrideText || inputText;
    if (!textToAnalyze.trim()) return;

    setIsAnalyzing(true);
    setAnimationStatus("loading");
    triggerHaptics("medium");
    try {
      const response = await fetch("/api/analyze-dopamine-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToAnalyze,
          language,
          answers: previousAnswers || [],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "HTTP error on analysis");
      }
      if (data) {
        setAnalysisResult({
          needsMoreInfo: data.needsMoreInfo ?? false,
          questions: data.questions ?? [],
          determinedCategory:
            data.determinedCategory === "null" || data.determinedCategory === ""
              ? null
              : data.determinedCategory,
          explanation: data.explanation ?? "",
          actionableStrategy: data.actionableStrategy ?? "",
        });
      }
      setAnimationStatus("success");
      triggerHaptics("success");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } catch (error) {
      console.error("Failed to analyze decision:", error);
      setAnimationStatus("error");
      triggerHaptics("error");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handling question choice clicks
  const handleAnswerQuestion = (
    question: DecisionQuestion,
    option: DecisionQuestionOption,
  ) => {
    const newAnswers = [
      ...answeredQuestions,
      {
        id: question.id,
        questionText: question.text, // Backend aligns with questionText or text
        answeredLabel: option.label,
        answeredValue: option.value,
        // Fallback fields for schema
        text: question.text,
        label: option.label,
        value: option.value,
      },
    ];
    setAnsweredQuestions(newAnswers as any);
    // Submit with updated answers history
    handleAnalyzeDecision(inputText, newAnswers as any);
  };

  // Reset core analyzer panel
  const handleResetAnalyzer = () => {
    setInputText("");
    setAnalysisResult(null);
    setAnsweredQuestions([]);
  };

  // Handle application hard reset
  useEffect(() => {
    const handleHardReset = () => {
      setAuditFocus(0);
      setAuditStimulation(0);
      setAuditRestfulness(0);
      setAuditCompleted(false);
      handleResetAnalyzer();
    };
    window.addEventListener("trigger-hard-reset", handleHardReset);
    return () => {
      window.removeEventListener("trigger-hard-reset", handleHardReset);
    };
  }, []);

  // Saved Classified item wrapper
  const handleKeepDecision = () => {
    if (!analysisResult || !analysisResult.determinedCategory) return;
    const newRecord: SavedDecision = {
      id: Math.random().toString(),
      text: inputText,
      category: analysisResult.determinedCategory,
      explanation: analysisResult.explanation,
      timestamp: new Date().toLocaleDateString(isEn ? "en-US" : language === "tr" ? "tr-TR" : "sr-RS", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    saveToHistory(newRecord);
    handleResetAnalyzer();
  };

  // Dopamine Chat submit trigger
  const handleSendChat = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : chatInput;
    if (!textToSend.trim()) return;

    if (overrideText === undefined) {
      setChatInput("");
    }

    const userMsg = { role: "user" as const, content: textToSend };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setIsSendingChat(true);

    try {
      const response = await fetch("/api/dopamine-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          language,
        }),
      });

      if (!response.ok) {
        let errMsg = "Chat call abnormal response";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (data && data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: "model", content: data.reply },
        ]);
      }
    } catch (e: any) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: `⚠️ ${e.message || "Connection error."}`,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Pre-seed instant chat cues
  const chatCues = [
    {
      titleEn: "Scrolling break fix",
      titleSr: "Prekid skrolovanja",
      promptEn:
        "I cannot stop scrolling on Instagram Reels. Help me break this loop now.",
      promptSr:
        "Ne mogu da prestanem da skrolujem Reels na Instagramu. Pomogni mi da odmah izađem iz ove petlje.",
    },
    {
      titleEn: "High-friction starting",
      titleSr: "Otpor za učenje",
      promptEn:
        "I have a difficult exam to prepare but I feel tremendous mental friction starting.",
      promptSr:
        "Imam težak test da spremim, ali osećam ogroman otpor i kognitivno trenje na samom startu.",
    },
    {
      titleEn: "Durable dopamine detox",
      titleSr: "Protokol detoksikacije",
      promptEn:
        "Explain how to structure a full 90-minute digital dopamine detox isolation block.",
      promptSr:
        "Objasni mi kako da strukturiram puni 90-minutni blok izolacije i digitalnog detoksa.",
    },
  ];

  return (
    <div
      className={`p-4 md:p-8 rounded-[20px] border overflow-hidden relative transition-colors duration-300 ${
        isDark
          ? "bg-[#1C1C1E] border-white/10 text-white"
          : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 dark:border-white/10 text-[#8E8E93] dark:text-white"
      }`}
      id="dopamine-tracker-panel-root"
    >
      <div className="relative z-10 space-y-6">
        {/* Module Header block */}
        <div
          className={`flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 ${isDark ? "border-white/10" : "border-black/5 dark:border-white/5 dark:border-white/10"} gap-4 text-left`}
        >
          <div className="space-y-1">
            <span className="text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-bold block font-sans tracking-wide">
              {isEn ? "RESOURCE FOCUSE ENGINE" : language === "tr" ? "KAYNAK ODAKLI MOTOR" : "UPRAVLJANJE NEUROTRANSMITERIMA"}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF] transition-opacity shrink-0" />
              {isEn ? "Energy & Focus Protocol" : language === "tr" ? "Enerji ve Odak Protokolü" : "Protokol energije i pažnje"}
            </h3>
            <p className={`text-xs ${secTextClass} font-semibold font-sans`}>
              {isEn ? "Evaluate decisions, calculate your focus budget, and bypass standard biological traps." : language === "tr" ? "Kararları değerlendirin, odak bütçenizi hesaplayın ve standart biyolojik tuzakları aşın." : "Klasifikujte dnevne akcije, simulirajte neurohemiju i svesno izađite iz lažnih stimulacija."}
            </p>
          </div>

          {/* Module navigation tabs selector */}
          <div
            className={`flex flex-wrap gap-1 p-1 rounded-xl select-none shrink-0 font-sans ${isDark ? "bg-white dark:bg-[#1C1C1E]/5 border border-white/10" : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-transparent"}`}
          >
            {[
              { id: "analyser", label: isEn ? "🔬 Evaluator" : language === "tr" ? "🔬 Değerlendirici" : "🔬 Evaluator" },
              {
                id: "circadian",
                label: isEn ? "⏰ Circadian" : language === "tr" ? "⏰ Sirkadiyen" : "⏰ Cirkadijalni",
              },
              {
                id: "shield",
                label: isEn ? "🛡️ Impulse Shield" : language === "tr" ? "🛡️ Dürtü Kalkanı" : "🛡️ Štit od impulsa",
              },
              {
                id: "audit",
                label: isEn ? "🧪 Focus Audit" : language === "tr" ? "🧪 Odak Denetimi" : "🧪 Provera Fokusa",
              },
              {
                id: "education",
                label: isEn ? "📚 Science & Resets" : language === "tr" ? "📚 Bilim ve Sıfırlamalar" : "📚 Nauka & Reset",
              },
              {
                id: "agent",
                label: isEn ? "🤖 Neuro AI Coach" : language === "tr" ? "🤖 Nöro Yapay Zeka Koçu" : "🤖 Neuro Asistent",
              },
              {
                id: "history",
                label: isEn ? "📋 Saved Logs" : language === "tr" ? "📋 Kayıtlı Günlükler" : "📋 Sačuvano",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#007AFF] text-white shadow"
                    : `${isDark ? "text-[#8E8E93] hover:text-white hover:bg-white dark:bg-[#1C1C1E]/10" : "text-[#8E8E93] hover:text-[#007AFF] hover:bg-black/5 dark:bg-white/5 dark:text-[#EBEBF5]/60 dark:hover:text-white dark:hover:bg-white dark:bg-[#1C1C1E]/5"}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab display deck */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* TAB 1: DECISION CLASSIFY EVALUATOR */}
            {activeTab === "analyser" && (
              <motion.div
                key="tab-analyser"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <div className="text-center space-y-2 max-w-md mx-auto">
                  <h4 className="font-semibold text-base text-black dark:text-white">
                    {isEn ? "Real-time Bio-Decision Evaluator" : language === "tr" ? "Gerçek Zamanlı Biyo-Karar Değerlendirici" : "Klasifikuj i sačuvaj trenutni impuls"}
                  </h4>
                  <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold">
                    {isEn ? "Evaluator strictly logs and classifies your recent actions to track your impulses over time. (For general questions and theories, use the Neuro AI Coach tab)." : language === "tr" ? "Değerlendirici, zaman içindeki dürtülerinizi takip etmek için son eylemlerinizi kesin bir şekilde günlüğe kaydeder ve sınıflandırır. (Genel sorular ve teoriler için Neuro AI Coach sekmesini kullanın)." : "Evaluator konkretan postupak klasifikuje u naviku i trajno beleži u dnevnik. (Za edukaciju i teorijska pitanja koristite tab Neuro Asistent)."}
                  </p>
                </div>

                {/* 🧪 INTERACTIVE DIAGNOSTIC AUDIT PORTAL TRIGGER */}
                <div
                  onClick={() => setActiveTab("audit")}
                  className="p-4 rounded-xl border bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-left hover:scale-[1.01] active:scale-99 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-white dark:bg-[#1C1C1E] rounded-xl">
                      🧪
                    </span>
                    <div className="space-y-0.5">
                      <h5 className="text-xs sm:text-sm font-semibold text-black dark:text-white tracking-wide">
                        {isEn ? "DO THE DIAGNOSTIC FOCUS AUDIT" : language === "tr" ? "TEŞHİS ODAK DENETİMİNİ YAPIN" : "URADITE DIJAGNOSTIČKI AUDIT FOKUSA"}
                      </h5>
                      <p className="text-[13px] sm:text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                        {isEn ? "Take the precise 10-step interactive test to analyze your baseline receptors level." : language === "tr" ? "Temel reseptör seviyenizi analiz etmek için hassas 10 adımlı etkileşimli testi yapın." : "Pokrenite precizni interaktivni test od 10 pitanja i saznajte nivo svojih dopaminskih receptora."}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF] transition-transform group-hover:translate-x-1" />
                </div>

                {/* Input block */}
                <div className="space-y-3 text-left">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isEn ? "Write your decision here (e.g. I played computer games for 3 hours to avoid preparing a presentation...)" : language === "tr" ? "Kararınızı buraya yazın (örneğin sunum hazırlamaktan kaçınmak için 3 saat bilgisayar oyunu oynadım...)" : "Unesite akciju ovde (npr. 'Otišao sam na brz trening hladnog tuširanja' ili 'Skrolovala sam telefon u krevetu ujutru')..."
                    }
                    className="w-full h-24 p-4 rounded-xl border bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[15px] font-normal leading-relaxed text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:outline-none focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-sm"
                    disabled={isAnalyzing}
                  />

                  <div className="flex justify-between items-center gap-4">
                    <button
                      type="button"
                      onClick={handleResetAnalyzer}
                      className="px-3.5 py-2.5 rounded-xl border border-black/5 dark:border-white/5 text-xs font-medium hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] dark:hover:bg-white/10 dark:bg-white/5 cursor-pointer text-[#3C3C43] dark:text-[#EBEBF5]/80"
                      disabled={isAnalyzing}
                    >
                      {isEn ? "Clear" : language === "tr" ? "Temizlemek" : "Isprazni"}
                    </button>

                    <motion.button
                      type="button"
                      disabled={isAnalyzing || !inputText.trim()}
                      onClick={() => handleAnalyzeDecision()}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{
                        scale: inputText.trim() && !isAnalyzing ? 1.02 : 1,
                      }}
                      animate={{
                        backgroundColor:
                          animationStatus === "success"
                            ? "rgba(52, 199, 89, 1)"
                            : animationStatus === "error"
                              ? "rgba(255, 59, 48, 1)"
                              : "rgba(0, 122, 255, 1)",
                      }}
                      className="px-5 py-2.5 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      id="btn-analyze-neurochemistry"
                    >
                      <AnimatePresence mode="wait">
                        {animationStatus === "loading" && (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              {isEn ? "Diagnosing..." : language === "tr" ? "Teşhis ediliyor..." : "Analiziram..."}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "success" && (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5 font-bold"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            <span>{isEn ? "Complete!" : language === "tr" ? "Tamamlamak!" : "Završeno!"}</span>
                          </motion.div>
                        )}
                        {animationStatus === "error" && (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5 font-bold"
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                            <span>{isEn ? "Error" : language === "tr" ? "Hata" : "Greška"}</span>
                          </motion.div>
                        )}
                        {animationStatus === "idle" && (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5 animate-pulse"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {isEn ? "Analyze Neurochemistry" : language === "tr" ? "Nörokimyayı Analiz Edin" : "Analiziraj neurohemiju"}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>

                {/* Analysis results visual feedback */}
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pt-2 text-left"
                  >
                    {/* CASE A: Needs More Info (Interactive follow-up questions) */}
                    {analysisResult.needsMoreInfo &&
                    analysisResult.questions &&
                    analysisResult.questions.length > 0 ? (
                      <div className="p-5 rounded-xl border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 bg-[#FF9500] dark:bg-[#FF9F0A]/5 space-y-4">
                        <div className="flex gap-2 items-center text-[#FF9500] font-medium text-xs">
                          <AlertTriangle className="w-4 h-4 text-[#FF9500] shrink-0" />
                          <span>
                            {isEn ? "ADDITIONAL MOTIVE DETAILS REQUIRED" : language === "tr" ? "EK MOTİF DETAYLARI GEREKLİ" : "POTREBNA POJASNJENJA MOTIVA"}
                          </span>
                        </div>

                        {analysisResult.questions.map((q) => (
                          <div key={q.id} className="space-y-2.5">
                            <p className="text-xs sm:text-sm font-semibold text-black dark:text-[#FF9F0A]">
                              {q.text}
                            </p>
                            <div className="flex flex-col gap-2">
                              {q.options.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleAnswerQuestion(q, opt)}
                                  className="w-full text-left p-3 rounded-xl border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] font-semibold text-xs transition-colors cursor-pointer active:scale-99"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // CASE B: Final Classification Card wrapped in ZoomableCard
                      <ZoomableCard
                        title={
                          isEn ? "Neuro Analysis Result" : language === "tr" ? "Nöro Analiz Sonucu" : "Rezultat neuro-analize"
                        }
                      >
                        <div className="p-5 sm:p-6 space-y-5">
                          {/* Banner category */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {analysisResult.determinedCategory ===
                              "delayed" ? (
                                <span className="px-3 py-1 bg-[#34C759]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 rounded-full text-[13px] font-medium flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5" />
                                  {isEn ? "Delayed Satisfaction" : language === "tr" ? "Gecikmiş Memnuniyet" : "Odloženo zadovoljstvo"}
                                </span>
                              ) : analysisResult.determinedCategory ===
                                "escapism" ? (
                                <span className="px-3 py-1 bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 rounded-full text-[13px] font-medium flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {isEn ? "Protective Escapism" : language === "tr" ? "Koruyucu Kaçış" : "Beg od neprijatnosti"}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20 rounded-full text-[13px] font-medium flex items-center gap-1.5">
                                  <Flame className="w-3.5 h-3.5" />
                                  {isEn ? "Cheap Dopamine Spike" : language === "tr" ? "Ucuz Dopamin Yükselişi" : "Jeftina kradljivica pažnje"}
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] font-medium tracking-wide text-[#3C3C43] dark:text-[#EBEBF5]/80 uppercase">
                              {isEn ? "Classified Protocol" : language === "tr" ? "Gizli Protokol" : "Neuro-Analitički Protokol"}
                            </span>
                          </div>

                          {/* Explanation text */}
                          <p className="text-[14px] leading-relaxed font-normal text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-[#F2F2F7] dark:bg-[#1C1C1E]/50 dark:bg-[#1C1C1E] px-4 py-3.5 rounded-xl border border-black/5 dark:border-white/5">
                            {analysisResult.explanation}
                          </p>
                      
                          {/* NEW: Parameter Explanation & Practical Advice */}
                          <div className="mt-6 p-4 rounded-xl bg-black/5 dark:bg-white/5 space-y-4">
                            <h6 className="font-bold text-xs uppercase tracking-wider text-[#8E8E93]">
                              {isEn ? "Understanding Your Results" : language === "tr" ? "Sonuçlarınızı Anlamak" : "Razumevanje vaših rezultata"}
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                              <div>
                                <span className="font-bold text-[#007AFF]">Focus:</span> {isEn ? "Mental energy and resistance to distraction." : language === "tr" ? "Zihinsel enerji ve dikkat dağıtıcı unsurlara karşı direnç." : "Mentalna energija i otpornost na distrakcije."}
                              </div>
                              <div>
                                <span className="font-bold text-[#FF9500]">Stimulation:</span> {isEn ? "Need for high-intensity rewards." : language === "tr" ? "Yüksek yoğunluklu ödül ihtiyacı." : "Potreba za visoko-intenzivnim nagradama."}
                              </div>
                              <div>
                                <span className="font-bold text-[#34C759]">Restfulness:</span> {isEn ? "Ability to unwind without external stimuli." : language === "tr" ? "Dış uyaranlar olmadan gevşeme yeteneği." : "Sposobnost opuštanja bez spoljnih stimulanata."}
                              </div>
                            </div>
                            <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed pt-2 border-t border-black/5 dark:border-white/5">
                              {isEn ? "Practical Tip: If your Focus is low, try breaking tasks into 15-minute blocks. If Stimulation is high, avoid phone usage in the first hour of the day. If Restfulness is low, practice mindful breathing for 5 minutes." 
                                    : language === "tr" ? "Pratik İpucu: Odaklanma seviyeniz düşükse, görevleri 15 dakikalık bloklara ayırmayı deneyin. Uyarım seviyeniz yüksekse, günün ilk saatinde telefon kullanmaktan kaçının. Gevşeme seviyeniz düşükse, 5 dakika bilinçli nefes egzersizi yapın." 
                                    : "Praktičan savet: Ako je Fokus nizak, pokušajte da razbijete zadatke na blokove od 15 minuta. Ako je Stimulacija visoka, izbegavajte telefon u prvom satu dana. Ako je Opuštenost niska, praktikujte svesno disanje 5 minuta."}
                            </p>
                          </div>

                          {/* Actionable Strategy */}
                          {analysisResult.actionableStrategy && (
                            <div className="bg-[#007AFF]/5 dark:bg-[#0A84FF]/10 p-4 rounded-xl flex items-start gap-3">
                              <Zap className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF] shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <h6 className="text-[14px] font-medium text-[#007AFF] dark:text-[#0A84FF]">
                                  {isEn ? "Rescue Action" : language === "tr" ? "Kurtarma Eylemi" : "Brza akcija"}
                                </h6>
                                <p className="text-[13px] font-normal text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                  {analysisResult.actionableStrategy}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Quick actionable button controls */}
                          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 w-full">
                            <button
                              type="button"
                              onClick={handleResetAnalyzer}
                              className="flex-1 sm:flex-none px-5 py-3.5 sm:py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] active:scale-[0.98] rounded-xl text-[15px] sm:text-[14px] font-medium transition-all text-[#FF3B30] dark:text-[#FF453A] text-center"
                            >
                              {isEn ? "Discard" : language === "tr" ? "At" : "Poništi"}
                            </button>

                            <button
                              type="button"
                              onClick={handleKeepDecision}
                              className="flex-1 sm:flex-none px-5 py-3.5 sm:py-2.5 bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-[0.98] transition-all text-white rounded-xl text-[15px] sm:text-[14px] font-medium cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {isEn ? "Save to Logs" : language === "tr" ? "Günlüklere Kaydet" : "Sačuvaj u zapisnik"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </ZoomableCard>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* TAB 1.5: INTERACTIVE DOPAMINE AUDIT TEST */}
            {activeTab === "audit" && (
              <motion.div
                key="tab-audit"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-8 max-w-4xl mx-auto px-1 pb-16"
              >
                {/* Visual Header */}
                <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-linear-to-br from-[#007AFF]/8 to-[#5856D6]/8 border border-[#007AFF]/15 dark:border-white/5 shadow-sm text-center md:text-left md:flex md:items-center md:justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] text-[10px] font-bold uppercase tracking-normal">
                      <Zap className="w-3 h-3 animate-pulse" />
                      {isEn ? "Energy Diagnostics" : language === "tr" ? "Enerji Teşhisi" : "Dijagnostika Energije"}
                    </div>
                    <h4 className="font-bold text-xl md:text-2xl text-[#8E8E93] dark:text-white tracking-tight font-sans">
                      {isEn ? "Interactive Focus Audit" : language === "tr" ? "İnteraktif Odaklanma Denetimi" : "Interaktivni test fokusa"}
                    </h4>
                    <p className="text-xs md:text-sm text-[#8E8E93] dark:text-[#EBEBF5]/60 leading-relaxed font-medium">
                      {isEn ? "Check your energy level. Select your daily actions to see how they impact your focus, stimulation, and rest below." : language === "tr" ? "Enerji seviyenizi kontrol edin. Günlük eylemlerinizin odak, uyarım ve dinlenmenizi nasıl etkilediğini görmek için aşağıdan seçim yapın." : "Proverite nivo energije. Izaberite svoje dnevne akcije da vidite kako utiču na fokus, stimulaciju i odmor."}
                    </p>
                  </div>
                  <div className="hidden md:flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-[#000000]/20 backdrop-blur-xs rounded-2xl border border-white/50 dark:border-white/5 w-28 text-center shadow-xs">
                    <span className="text-xl text-[#3C3C43]">🧠</span>
                    <span className="text-[10px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal mt-2">
                      {isEn ? "BIOMETRY" : language === "tr" ? "BİYOMETRİ" : "BIOMED"}
                    </span>
                  </div>
                </div>

                {/* Audit Grid (Wizard + Live Calibration Display) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Interactive Wizard (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* The Wizard progress indicator - elegant line with custom states */}
                    <div className="bg-black/5 dark:bg-white/5 dark:bg-[#000000]/25 rounded-2xl p-4 border border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 shadow-xs">
                      <div className="flex justify-between items-center max-w-md mx-auto relative">
                        {/* Connecting line */}
                        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 -z-1" />

                        {activeQuestions.map((q, idx) => {
                          const isCurrent = auditWizardStep === idx;
                          const isCompleted =
                            idx < auditWizardStep ||
                            auditWizardAnswers[idx] !== undefined;

                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                setAuditWizardStep(idx);
                                if (
                                  typeof window !== "undefined" &&
                                  (window as any).triggerHaptics
                                ) {
                                  (window as any).triggerHaptics("light");
                                }
                              }}
                              className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                                isCurrent
                                  ? "bg-[#007AFF] text-white ring-4 ring-[#007AFF]/25 scale-110 shadow-md"
                                  : isCompleted
                                    ? "bg-[#34C759] text-white border border-[#34C759] shadow-xs hover:bg-[#34C759]/90"
                                    : "bg-white dark:bg-[#000000]/5 dark:bg-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 border border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-black/5 dark:bg-white/5"
                              }`}
                            >
                              {isCompleted && !isCurrent ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}

                              {/* Pulse wave for active state */}
                              {isCurrent && (
                                <span className="absolute inset-0 rounded-full bg-[#007AFF]/20 animate-ping opacity-60 pointer-events-none" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Question Box */}
                    {(() => {
                      const activeQuestion =
                        activeQuestions[auditWizardStep] || activeQuestions[0];
                      const selectedOptIdx =
                        auditWizardAnswers[auditWizardStep];

                      return (
                        <div className="overflow-hidden bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-xs transition-all">
                          {/* Banner Header */}
                          <div className="bg-black/5 dark:bg-white/5 dark:bg-[#000000]/30 px-6 py-4 border-b border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-[#007AFF] dark:text-[#0A84FF] uppercase tracking-normal flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" />
                              {isEn ? `Diagnostic step ${auditWizardStep + 1} of ${activeQuestions.length}` : language === "tr" ? `Teşhis adımı ${auditWizardStep + 1} / ${activeQuestions.length}` : `Korak ${auditWizardStep + 1} od ${activeQuestions.length}`}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal">
                              {activeQuestion.id.toUpperCase()}
                            </span>
                          </div>

                          <div className="p-6 space-y-5">
                            <div className="space-y-1 font-sans">
                              <h5 className="font-bold text-base md:text-lg text-[#8E8E93] dark:text-white leading-snug">
                                {auditWizardStep + 1}.{" "}
                                {isEn ? activeQuestion.textEn : language === "tr" ? activeQuestion.textTr : activeQuestion.textSr}
                              </h5>
                              <p className="text-xs md:text-sm text-[#8E8E93] dark:text-[#EBEBF5]/60 leading-relaxed font-medium">
                                {isEn ? activeQuestion.descEn : language === "tr" ? activeQuestion.descTr : activeQuestion.descSr}
                              </p>
                            </div>

                            {/* Options with live effect hover tooltips and premium accents */}
                            <div className="grid grid-cols-1 gap-3 pt-1">
                              {activeQuestion.options.map((opt, optIdx) => {
                                const isSelected = selectedOptIdx === optIdx;
                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => {
                                      const nextAnswers = [
                                        ...auditWizardAnswers,
                                      ];
                                      nextAnswers[auditWizardStep] = optIdx;
                                      setAuditWizardAnswers(nextAnswers);
                                      safeStorage.setItem(
                                        "dopamine_wizard_answers",
                                        JSON.stringify(nextAnswers),
                                      );

                                      // Calibrate scores based on average mapping of answered questions
                                      let totalFocus = 0;
                                      let totalStimulation = 0;
                                      let totalRestfulness = 0;
                                      let answeredCount = 0;
                                      nextAnswers.forEach((ansIdx, qIdx) => {
                                        if (
                                          ansIdx !== undefined &&
                                          ansIdx !== null &&
                                          activeQuestions[qIdx]
                                        ) {
                                          const o =
                                            activeQuestions[qIdx].options[
                                              ansIdx
                                            ];
                                          if (o) {
                                            totalFocus += o.focus;
                                            totalStimulation += o.stimulation;
                                            totalRestfulness += o.restfulness;
                                            answeredCount++;
                                          }
                                        }
                                      });

                                      const divisor = answeredCount || 1;
                                      const finalFocus = Math.max(
                                        1,
                                        Math.min(
                                          10,
                                          Math.round(totalFocus / divisor),
                                        ),
                                      );
                                      const finalStimulation = Math.max(
                                        1,
                                        Math.min(
                                          10,
                                          Math.round(
                                            totalStimulation / divisor,
                                          ),
                                        ),
                                      );
                                      const finalRestfulness = Math.max(
                                        1,
                                        Math.min(
                                          10,
                                          Math.round(
                                            totalRestfulness / divisor,
                                          ),
                                        ),
                                      );

                                      setAuditFocus(finalFocus);
                                      setAuditStimulation(finalStimulation);
                                      setAuditRestfulness(finalRestfulness);

                                      safeStorage.setItem(
                                        "abcde_dopamine_focusLevel",
                                        finalFocus.toString(),
                                      );
                                      safeStorage.setItem(
                                        "abcde_dopamine_stimulation",
                                        finalStimulation.toString(),
                                      );
                                      safeStorage.setItem(
                                        "abcde_dopamine_restfulness",
                                        finalRestfulness.toString(),
                                      );

                                      setAuditSavedMessage("");

                                      // Dispatch event to sync immediately
                                      window.dispatchEvent(
                                        new Event("dopamine-updated"),
                                      );

                                      if (
                                        typeof window !== "undefined" &&
                                        (window as any).triggerHaptics
                                      ) {
                                        (window as any).triggerHaptics(
                                          "medium",
                                        );
                                      }

                                      if (
                                        auditWizardStep <
                                        activeQuestions.length - 1
                                      ) {
                                        setTimeout(() => {
                                          setAuditWizardStep(
                                            (prev) => prev + 1,
                                          );
                                        }, 250);
                                      }
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between group gap-4 relative overflow-hidden ${
                                      isSelected
                                        ? "bg-[#007AFF]/8 dark:bg-[#0A84FF]/10 border-[#007AFF] dark:border-[#0A84FF] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
                                        : "bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-black/5 dark:bg-white/5"
                                    }`}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs md:text-sm font-bold leading-relaxed">
                                        {isEn ? opt.labelEn : language === "tr" ? opt.labelTr : opt.labelSr}
                                      </span>

                                      {/* Small impact vector visualizer inside option */}
                                      <span className="text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-mono tracking-tight font-semibold break-words whitespace-normal">
                                        {isEn ? `Vector Impact: Focus ${opt.focus}/10 | Stimulation ${opt.stimulation}/10` : language === "tr" ? `Vektör Etkisi: Odak ${opt.focus}/10 | Uyarım ${opt.stimulation}/10` : `Uticaj vektora: Fokus ${opt.focus}/10 | Stimulacija ${opt.stimulation}/10`}
                                      </span>
                                    </div>

                                    {/* Select circle indicator */}
                                    <div
                                      className={`w-6 h-6 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                                        isSelected
                                          ? "border-[#007AFF]/80 dark:border-[#0A84FF]/80 bg-[#007AFF]"
                                          : "border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 group-hover:border-black/5 dark:border-white/5 dark:group-hover:border-black/5 dark:border-white/5"
                                      }`}
                                    >
                                      {isSelected && (
                                        <div className="w-2 h-2 bg-white dark:bg-[#1C1C1E] rounded-full" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Horizontal navigation controls */}
                            <div className="flex justify-between items-center pt-3 border-t border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5">
                              <button
                                type="button"
                                disabled={auditWizardStep === 0}
                                onClick={() => {
                                  setAuditWizardStep((p) => Math.max(0, p - 1));
                                  if (
                                    typeof window !== "undefined" &&
                                    (window as any).triggerHaptics
                                  ) {
                                    (window as any).triggerHaptics("light");
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-black/5 dark:bg-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"}</span>
                              </button>

                              <button
                                type="button"
                                disabled={
                                  auditWizardStep === activeQuestions.length - 1
                                }
                                onClick={() => {
                                  setAuditWizardStep((p) =>
                                    Math.min(activeQuestions.length - 1, p + 1),
                                  );
                                  if (
                                    typeof window !== "undefined" &&
                                    (window as any).triggerHaptics
                                  ) {
                                    (window as any).triggerHaptics("light");
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-black/5 dark:bg-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all"
                              >
                                <span>{isEn ? "Next" : language === "tr" ? "Sonraki" : "Sledeće"}</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Live Cognitive Diagnostics (5 cols) */}
                  <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                    <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 shadow-xs space-y-6 text-left">
                      <div className="space-y-1">
                        <h5 className="font-bold text-sm text-[#8E8E93] dark:text-white uppercase tracking-normal">
                          {isEn ? "Live Calibration Display" : language === "tr" ? "Canlı Kalibrasyon Ekranı" : "Kalibracija Receptora U Realnom Vremenu"}
                        </h5>
                        <p className="text-[11px] font-medium text-[#8E8E93] dark:text-[#EBEBF5]/60">
                          {isEn ? "Calculated live as you choose answers" : language === "tr" ? "Cevapları seçtiğinizde canlı olarak hesaplanır" : "Prerađuje se istog sekunda kada unesete promenu"}
                        </p>
                      </div>

                      {/* Scientific Circular Progress Bars Display */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* 1. FOCUS */}
                        <div className="flex flex-col items-center bg-black/5 dark:bg-white/5 dark:bg-[#000000]/15 p-3 rounded-2xl border border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 text-center">
                          <span className="text-[10px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal mb-2">
                            {isEn ? "Focus" : language === "tr" ? "Odak" : "Fokus"}
                          </span>
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            {/* SVG Ring */}
                            <svg className="absolute w-full h-full transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke="rgba(0,122,255,0.12)"
                                strokeWidth="4.5"
                                fill="transparent"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke="#007AFF"
                                strokeWidth="4.5"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 26}
                                strokeDashoffset={
                                  2 * Math.PI * 26 * (1 - auditFocus / 10)
                                }
                                className="transition-all duration-500 ease-out"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="text-[11px] font-black text-[#007AFF] dark:text-[#0A84FF] tracking-tighter">
                              {auditFocus}/10
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold mt-2 text-[#8E8E93] dark:text-[#EBEBF5]/60">
                            {auditFocus >= 8
                              ? isEn ? "Pristine" : language === "tr" ? "Bozulmamış" : "Odlično"
                              : auditFocus >= 5
                                ? isEn ? "Stable" : language === "tr" ? "Stabil" : "Umereno"
                                : isEn ? "Low" : language === "tr" ? "Düşük" : "Oslabljeno"}
                          </span>
                        </div>

                        {/* 2. STIMULATION */}
                        <div className="flex flex-col items-center bg-black/5 dark:bg-white/5 dark:bg-[#000000]/15 p-3 rounded-2xl border border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 text-center">
                          <span className="text-[10px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal mb-2">
                            {isEn ? "Stimulation" : language === "tr" ? "Uyarım" : "Stim."}
                          </span>
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="absolute w-full h-full transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke="rgba(255,45,85,0.12)"
                                strokeWidth="4.5"
                                fill="transparent"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke="#FF2D55"
                                strokeWidth="4.5"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 26}
                                strokeDashoffset={
                                  2 * Math.PI * 26 * (1 - auditStimulation / 10)
                                }
                                className="transition-all duration-500 ease-out"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="text-[11px] font-black text-[#FF2D55] tracking-tighter">
                              {auditStimulation}/10
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold mt-2 text-[#8E8E93] dark:text-[#EBEBF5]/60">
                            {auditStimulation >= 8
                              ? isEn ? "Spiked" : language === "tr" ? "Çivili" : "Saturacija"
                              : auditStimulation >= 5
                                ? isEn ? "Balanced" : language === "tr" ? "Dengeli" : "Balans"
                                : isEn ? "Calm" : language === "tr" ? "Sakinlik" : "Smireno"}
                          </span>
                        </div>

                        {/* 3. RESTFULNESS */}
                        <div className="flex flex-col items-center bg-black/5 dark:bg-white/5 dark:bg-[#000000]/15 p-3 rounded-2xl border border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 text-center">
                          <span className="text-[10px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal mb-2">
                            {isEn ? "Rest" : language === "tr" ? "Dinlenmek" : "Buffer"}
                          </span>
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="absolute w-full h-full transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke="rgba(52,199,89,0.12)"
                                strokeWidth="4.5"
                                fill="transparent"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke="#34C759"
                                strokeWidth="4.5"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 26}
                                strokeDashoffset={
                                  2 * Math.PI * 26 * (1 - auditRestfulness / 10)
                                }
                                className="transition-all duration-500 ease-out"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="text-[11px] font-black text-[#34C759] tracking-tighter">
                              {auditRestfulness}/10
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold mt-2 text-[#8E8E93] dark:text-[#EBEBF5]/60">
                            {auditRestfulness >= 8
                              ? isEn ? "Deep" : language === "tr" ? "Derin" : "Dovoljan"
                              : auditRestfulness >= 5
                                ? isEn ? "Optimal" : language === "tr" ? "Optimum" : "Uredan"
                                : isEn ? "None" : language === "tr" ? "Hiçbiri" : "Iscrpljen"}
                          </span>
                        </div>
                      </div>

                      {/* Integrated Dopamine State Formula and Bio Report */}
                      {(() => {
                        const status = (() => {
                          const f = auditFocus;
                          const s = auditStimulation;
                          const r = auditRestfulness;

                          // Pure mathematical precision mapping for dopamine stability index
                          // High focus (40%), High restfulness (30%), Low stimulation (30%)
                          const preciseScore = Math.round(
                            (f / 10) * 40 + (r / 10) * 30 + ((10 - s) / 10) * 30
                          );

                          let finalScore = Math.max(0, Math.min(100, preciseScore));
                          
                          let state: "spiked" | "low" | "balanced" = "balanced";
                          if (finalScore >= 75) {
                            state = "balanced";
                          } else if (s >= 7 || (s >= 6 && f <= 4)) {
                            state = "spiked";
                          } else {
                            state = "low";
                          }

                          return { state, score: finalScore };
                        })();

                        let profileTitle = isEn ? "High Over-Stimulation (Crash Risk)" : language === "tr" ? "Yüksek Aşırı Stimülasyon (Çöküş Riski)" : "Pregrejanost Receptora (Rizik od Sloma Krila)";
                        let profileDescEn =
                          "Your receptors are bombarded with rapid digital feedback loops. This spikes motivation instantly but exhausts willpower rapidly, leading to major evening dopamine crashes.";
                        let profileDescSr =
                          "Vaši receptori su izloženi stalnom bombardovanju brzim nadražajima. To trenutno diže motivaciju, ali stvara brzi mentalni zamor i pad volje u popodnevnim satima.";
                        let profileDescTr =
                          "Alıcılarınız hızlı dijital geri bildirim döngüleriyle bombardıman ediliyor. Bu, motivasyonu anında yükseltir ancak iradeyi hızla tüketerek akşam saatlerinde büyük dopamin çökmelerine neden olur.";
                        let visualAccent =
                          "from-rose-500/10 to-transparent border-rose-200/40 dark:border-rose-500/20";
                        let progressFill = "bg-rose-500";
                        let statusColor = "text-[#FF3B30]";
                        let icon = "⚡";

                        if (status.state === "low") {
                          profileTitle = isEn ? "Depleted Baseline (Low Impulse Res.)" : language === "tr" ? "Tükenmiş Taban Çizgisi (Düşük İmpuls Direnci)" : "Iscrpljenost Baznog Kruga (Pad Elana)";
                          profileDescEn =
                            "Base dopamine reserve values are deeply depleted. High task friction creates instant procrastination tendencies and excessive mental resistance.";
                          profileDescSr =
                            "Bazne dopaminske rezerve su na minimumu. Svaki teži zadatak izaziva prokrastinaciju jer mozak nema neurohemijsko gorivo za pokretanje fokusa.";
                          profileDescTr =
                            "Temel dopamin rezervi değerleri derinlemesine tükenmiştir. Yüksek görev sürtünmesi, anında erteleme eğilimleri ve aşırı zihinsel direnç yaratır.";
                          visualAccent =
                            "from-amber-500/10 to-transparent border-amber-200/40 dark:border-amber-500/20";
                          progressFill = "bg-amber-500";
                          statusColor = "text-[#FF9500]";
                          icon = "⚠️";
                        } else if (status.state === "balanced") {
                          profileTitle = isEn ? "Master Focus Baseline" : language === "tr" ? "Ana Odak Temel Çizgisi" : "Stabilan i Izbalansiran Kognitivni Balans";
                          profileDescEn =
                            "Excellent structural alignment. Clear, sustained cognitive performance with protective buffer spaces for mental recovery.";
                          profileDescSr =
                            "Odličan balans baze. Održivi mentalni rad sa dovoljno prirodnog prostora za oporavak i odmor.";
                          profileDescTr =
                            "Mükemmel yapısal uyum. Zihinsel toparlanma için koruyucu tampon alanlarla net, sürdürülebilir bilişsel performans.";
                          visualAccent =
                            "from-emerald-500/10 to-transparent border-emerald-200/40 dark:border-emerald-500/20";
                          progressFill = "bg-emerald-500";
                          statusColor = "text-[#34C759]";
                          icon = "🛡️";
                        }

                        return (
                          <>
                            <div className="space-y-4">
                            {/* Calculated state card with visual gradient and telemetry line */}
                            <div
                              className={`rounded-3xl border bg-gradient-to-br p-6 shadow-xl ${visualAccent} relative overflow-hidden group`}
                            >
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Activity className="w-20 h-20" />
                              </div>
                              
                              <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm text-sm">
                                      {icon}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8E8E93] dark:text-[#EBEBF5]/60">
                                      {isEn ? "COGNITIVE SPECTRUM STATUS" : language === "tr" ? "BİLİŞSEL SPEKTRUM DURUMU" : "STATUS KOGNITIVNOG SPEKTRA"}
                                    </span>
                                  </div>
                                  <h6 className="font-black text-lg text-[#1C1C1E] dark:text-white leading-tight max-w-[200px]">
                                    {profileTitle}
                                  </h6>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-baseline justify-end gap-0.5">
                                    <span className={`text-4xl font-black ${statusColor} tracking-tighter`}>
                                      {status.score}
                                    </span>
                                    <span className={`text-lg font-black ${statusColor}`}>%</span>
                                  </div>
                                  <span className="block text-[9px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 tracking-wider">
                                    {isEn ? "DOPAMINE CAPACITY" : language === "tr" ? "DOPAMİN KAPASİTESİ" : "NIVO DOPAMINA"}
                                  </span>
                                </div>
                              </div>

                              {/* Progress metric bar line */}
                              <div className="relative h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mb-5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${status.score}%` }}
                                  className={`absolute inset-y-0 left-0 ${progressFill} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.1)]`}
                                />
                              </div>

                              <div className="relative z-10 p-4 rounded-2xl bg-white/40 dark:bg-[#1C1C1E]/20 backdrop-blur-md border border-white/10">
                                <p className="text-[12px] font-bold leading-relaxed text-[#1C1C1E] dark:text-[#F2F2F7] font-sans italic">
                                  "{language === "en" ? profileDescEn : language === "tr" ? profileDescTr : profileDescSr}"
                                </p>
                              </div>
                            </div>

                            {/* EXPLANATORY PRACTICAL MATRIX AND PARAMETER BREAKDOWN */}
                            <div className="p-5 bg-white dark:bg-[#1C1C1E]/40 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-5 text-left">
                              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                                <h5 className="text-[11px] font-black uppercase tracking-widest text-[#8E8E93]">
                                  {isEn ? "PARAMETER DIAGNOSIS" : language === "tr" ? "PARAMETRE TEŠHİSİ" : "DIJAGNOZA PARAMETARA"}
                                </h5>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" />
                                  <span className="text-[10px] font-bold text-[#007AFF] uppercase">{isEn ? "Live" : "Uživo"}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-start gap-4 p-3 rounded-2xl bg-[#007AFF]/5 border border-[#007AFF]/10">
                                  <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm text-xl">🎯</div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-black text-[#007AFF] uppercase tracking-tight">
                                      {isEn ? "Focus Baseline" : language === "tr" ? "Odak Temeli" : "Fokusni Nivo"}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug">
                                      {isEn 
                                        ? "Measures your ability to stay on one task without 'itchy' brain distractions." 
                                        : language === "tr" 
                                          ? "Beynin 'kaşınan' dikkat dağıtıcıları olmadan tek bir görevde kalma yeteneğinizi ölçer." 
                                          : "Meri tvoju sposobnost da ostaneš na jednom zadatku bez unutrašnjeg nemira i potrebe za skrolovanjem."}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded-2xl bg-[#FF2D55]/5 border border-[#FF2D55]/10">
                                  <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm text-xl">⚡</div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-black text-[#FF2D55] uppercase tracking-tight">
                                      {isEn ? "Stimulation Saturation" : language === "tr" ? "Stimülasyon Doygunluğu" : "Zasićenost Nadražajima"}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug">
                                      {isEn 
                                        ? "Shows if your brain is over-saturated with fast, cheap digital feedback loops." 
                                        : language === "tr" 
                                          ? "Beyninizin hızlı, ucuz dijital geri bildirim döngüleriyle aşırı doygun olup olmadığını gösterir." 
                                          : "Pokazuje da li je tvoj mozak 'pregoreo' od previše brzih, jeftinih digitalnih informacija i notifikacija."}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded-2xl bg-[#34C759]/5 border border-[#34C759]/10">
                                  <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm text-xl">🛡️</div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-black text-[#34C759] uppercase tracking-tight">
                                      {isEn ? "Rest & Buffer Capacity" : language === "tr" ? "Dinlenme ve Tampon" : "Kapacitet Oporavka (Buffer)"}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug">
                                      {isEn 
                                        ? "Your 'battery' for dealing with boredom. Essential for long-term strategic thinking." 
                                        : language === "tr" 
                                          ? "Sıkıntıyla başa çıkmak için 'piliniz'. Uzun vadeli stratejik düşünme için gereklidir." 
                                          : "Tvoja 'baterija' za podnošenje dosade i tišine. Ključno za duboko razmišljanje i mirnu svest."}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-3">
                                <span className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                                  <Zap className="w-3 h-3" />
                                  {isEn ? "PRACTICAL ACTION PLAN" : language === "tr" ? "PRATİK EYLEM PLANI" : "PRAKTIČNI AKCIONI PLAN"}
                                </span>
                                <ul className="space-y-2.5">
                                  {status.state === "spiked" && (
                                    <>
                                      <li className="flex gap-2 text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] mt-1 shrink-0" />
                                        <span><strong>{isEn ? "Unstack Dopamine:" : language === "tr" ? "Dopamin İstifini Çözün:" : "Razdvoj stimuluse:"}</strong> {isEn ? "One screen at a time. No phone while eating or working." : "Jedna stvar u isto vreme. Bez telefona uz obrok ili rad."}</span>
                                      </li>
                                      <li className="flex gap-2 text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] mt-1 shrink-0" />
                                        <span><strong>{isEn ? "Monotasking blocks:" : "Fokus blokovi:"}</strong> {isEn ? "45 mins of work with zero tab switching." : "45 minuta rada bez otvaranja sporednih tabova."}</span>
                                      </li>
                                    </>
                                  )}
                                  {status.state === "low" && (
                                    <>
                                      <li className="flex gap-2 text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500] mt-1 shrink-0" />
                                        <span><strong>{isEn ? "Low Friction Start:" : "Laki start:"}</strong> {isEn ? "Use 2-minute micro-versions of hard tasks to build momentum." : "Kreni sa 2-minutnom verzijom najtežeg zadatka."}</span>
                                      </li>
                                      <li className="flex gap-2 text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500] mt-1 shrink-0" />
                                        <span><strong>{isEn ? "Dopamine Fasting:" : "Dopaminski post:"}</strong> {isEn ? "No digital content for the first hour after waking up." : "Bez digitalnog sadržaja u prvih sat vremena nakon buđenja."}</span>
                                      </li>
                                    </>
                                  )}
                                  {status.state === "balanced" && (
                                    <>
                                      <li className="flex gap-2 text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#34C759] mt-1 shrink-0" />
                                        <span><strong>{isEn ? "Deep Flow Blocks:" : "Deep Flow:"}</strong> {isEn ? "Schedule one 90-minute block for high-value strategic work today." : "Zakaži jedan blok od 90 minuta za najbitniji zadatak dana."}</span>
                                      </li>
                                      <li className="flex gap-2 text-[11px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#34C759] mt-1 shrink-0" />
                                        <span><strong>{isEn ? "Guard Buffers:" : "Čuvaj buffer:"}</strong> {isEn ? "Protect your offline breaks to keep receptors fresh." : "Ne preskači offline pauze kako bi receptori ostali odmorni."}</span>
                                      </li>
                                    </>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {/* The Synchronizer Action bar */}
                            <div className="space-y-3 pt-2">
                              {/* Sync and Save Button with premium layout */}
                              <button
                                type="button"
                                onClick={() => {
                                  safeStorage.setItem(
                                    "abcde_dopamine_focusLevel",
                                    auditFocus.toString(),
                                  );
                                  safeStorage.setItem(
                                    "abcde_dopamine_stimulation",
                                    auditStimulation.toString(),
                                  );
                                  safeStorage.setItem(
                                    "abcde_dopamine_restfulness",
                                    auditRestfulness.toString(),
                                  );
                                  safeStorage.setItem(
                                    "dopamine_audit_completed",
                                    "true",
                                  );

                                  // Dispatch global event for floating pet, center svesnosti, header to detect instant updating
                                  window.dispatchEvent(
                                    new Event("dopamine-updated"),
                                  );

                                  if (
                                    typeof window !== "undefined" &&
                                    (window as any).triggerHaptics
                                  ) {
                                    (window as any).triggerHaptics("success");
                                  }

                                  setAuditSavedMessage(
                                    isEn ? "🧬 Dopamine & Focus status synchronized successfully across your active Morning AI mindmap!" : language === "tr" ? "🧬 Dopamin ve Odaklanma durumu, aktif Sabah Yapay Zekası zihin haritanızda başarıyla senkronize edildi!" : "🧬 Dopaminski status i nivo fokusa su sinhronizovani! Centar Svesti u mapi uma je osvežen.",
                                  );

                                  setTimeout(() => {
                                    setAuditSavedMessage("");
                                  }, 4500);
                                }}
                                className="w-full py-3 bg-linear-to-r from-[#007AFF] to-[#5856D6] hover:from-[#0A84FF] hover:to-[#5E5CE6] text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 duration-250 cursor-pointer flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {isEn ? "Save & Sync to Neural Mindmap" : language === "tr" ? "Kaydet ve Nöral Zihin Haritasına Senkronize Et" : "Sačuvaj i Sinhronizuj u Mapu Uma"}
                                </span>
                              </button>

                              {/* Reset Diagnostic Button */}
                              <button
                                type="button"
                                onClick={handleRestartAudit}
                                className="w-full py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 dark:hover:bg-black/5 dark:bg-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 rounded-2xl text-xs font-bold transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2 border border-black/5 dark:border-white/5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>
                                  {isEn ? "Reset & Take Fresh Diagnostic" : language === "tr" ? "Sıfırla ve Yeni Tanılamayı Al" : "Resetuj i Pokreni Fresh Dijagnostiku"}
                                </span>
                              </button>

                              {auditSavedMessage && (
                                <p className="text-xs font-bold text-[#34C759] dark:text-[#32D74B] text-center bg-[#34C759]/10 p-2.5 rounded-xl border border-[#34C759]/20 transition-all duration-300">
                                  {auditSavedMessage}
                                </p>
                              )}
                            </div>

                            {/* Suggestive habits based on results */}
                            <div className="space-y-3.5 pt-4 border-t border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5">
                              <span className="text-[10px] font-bold uppercase text-[#8E8E93] dark:text-[#EBEBF5]/60 tracking-normal">
                                {isEn ? "Adaptive Action Prescriptions" : language === "tr" ? "Uyarlanabilir Eylem Reçeteleri" : "Prilagođeni Korektivni Recepti"}
                              </span>

                              <div className="grid grid-cols-1 gap-3.5">
                                {status.state === "spiked" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddTask) {
                                          onAddTask(
                                            isEn ? "90-Min Dopamine Reset: silent walk offline" : language === "tr" ? "90 Dakikalık Dopamin Sıfırlaması: çevrimdışı sessiz yürüyüş" : "90 min oporavka: tiha šetnja u prirodi bez ekrana",
                                            isEn ? "Complete receptor upregulation reset. Walk fully unplugged for optimal optic flow." : language === "tr" ? "Reseptör düzenlemesinin sıfırlanması tamamlandı. Optimum optik akış için tamamen fişe takılı olmadan yürüyün." : "Obnova receptora. Prošetajte 25 minuta napolju bez telefona ili slušalica da relaksirate amigdalu.",
                                          );
                                          if (
                                            typeof window !== "undefined" &&
                                            (window as any).triggerHaptics
                                          ) {
                                            (window as any).triggerHaptics(
                                              "light",
                                            );
                                          }
                                        }
                                      }}
                                      className="group p-4 text-left rounded-2xl border border-rose-200/50 dark:border-rose-900/30 bg-rose-50/10 dark:bg-rose-950/10 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 text-rose-800 dark:text-rose-300 cursor-pointer active:scale-[0.98] transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-rose-700 dark:text-rose-400">
                                        <span className="text-base group-hover:scale-125 transition-transform">
                                          ➕ 🥾
                                        </span>
                                        <span>
                                          {isEn ? "Add analog silent walk reset" : language === "tr" ? "Analog sessiz yürüyüş sıfırlama ekle" : "Dodaj tihu šetnju u prirodi"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                                        {isEn ? "Triggers visual optical flow and lowers adrenaline level instantly." : language === "tr" ? "Görsel optik akışı tetikler ve adrenalin seviyesini anında düşürür." : "Obnavlja normalan prag osetljivosti receptora. Isključite uređaje tokom pauze."}
                                      </p>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddTask) {
                                          onAddTask(
                                            isEn ? "Neuro-reset: Cold shower exposure block" : language === "tr" ? "Nöro sıfırlama: Soğuk duşa maruz kalma bloğu" : "Neuro-reset: Voljno izlaganje hladnoj vodi (hladan tuš)",
                                            isEn ? "Triggers sustained long lasting clean dopamine release up to +250% over hours." : language === "tr" ? "Tetikleyiciler, saatlerce +%250'ye kadar uzun süreli temiz dopamin salınımını sürdürdü." : "Pokreće postepeno i dugotrajno oslobađanje čistog dopamina bez ikakvog kraha na nivo baze.",
                                          );
                                          if (
                                            typeof window !== "undefined" &&
                                            (window as any).triggerHaptics
                                          ) {
                                            (window as any).triggerHaptics(
                                              "light",
                                            );
                                          }
                                        }
                                      }}
                                      className="group p-4 text-left rounded-2xl border border-rose-200/50 dark:border-rose-900/30 bg-rose-50/10 dark:bg-rose-950/10 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 text-rose-800 dark:text-rose-300 cursor-pointer active:scale-[0.98] transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-rose-700 dark:text-rose-400">
                                        <span className="text-base group-hover:scale-125 transition-transform">
                                          ➕ ❄️
                                        </span>
                                        <span>
                                          {isEn ? "Add cold shock friction reset" : language === "tr" ? "Soğuk şok sürtünme sıfırlaması ekle" : "Dodaj hladan tuš (neuroreset)"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                                        {isEn ? "Unlocks up to 2.5x increase in clean, un-spiked continuous neurotransmitter release." : language === "tr" ? "Temiz, artırılmamış sürekli nörotransmitter salınımında 2,5 kata kadar artışın kilidini açar." : "Pokreće lučenje stabilnog i dugotrajnog dopamina podstičući voljnu otpornost organizma."}
                                      </p>
                                    </button>
                                  </>
                                ) : status.state === "low" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddTask) {
                                          onAddTask(
                                            isEn ? "Sleep hygiene: bedrooms unplugged" : language === "tr" ? "Uyku hijyeni: yatak odalarının fişi çekilmiş" : "Spavanje bez telefona: 45 min analognog opuštanja",
                                            isEn ? "Store your cellular devices outside bedroom. Let adenosine process clean sleep baseline." : language === "tr" ? "Hücresel cihazlarınızı yatak odasının dışında saklayın. Adenozin sürecinin uyku temel çizgisini temizlemesine izin verin." : "Izbaci sve ekrane iz spavaće sobe tačno 45 minuta pre spavanja da obnoviš bazne rezerve.",
                                          );
                                          if (
                                            typeof window !== "undefined" &&
                                            (window as any).triggerHaptics
                                          ) {
                                            (window as any).triggerHaptics(
                                              "light",
                                            );
                                          }
                                        }
                                      }}
                                      className="group p-4 text-left rounded-2xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/10 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 text-amber-800 dark:text-amber-300 cursor-pointer active:scale-[0.98] transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400">
                                        <span className="text-base group-hover:scale-125 transition-transform">
                                          ➕ 📴
                                        </span>
                                        <span>
                                          {isEn ? "Add screen-free bedroom habit" : language === "tr" ? "Ekransız yatak odası alışkanlığı ekleyin" : "Spavanje bez ekrana"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                                        {isEn ? "Store devices outside sleeping quarters for clean deep sleep cycles and receptor clearing." : language === "tr" ? "Temiz derin uyku döngüleri ve reseptör temizliği için cihazları uyku alanlarının dışında saklayın." : "Spavanje u sobi bez telefona dramatično poboljšava kvalitet sporog talasnog sna."}
                                      </p>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddTask) {
                                          onAddTask(
                                            isEn ? "Anaerobic dopamine lift: gym session" : language === "tr" ? "Anaerobik dopamin kaldırma: spor salonu seansı" : "Namerni fizički trening i podizanje tonusa",
                                            isEn ? "Intense exercise or cardio running to trigger natural baseline upregulation." : language === "tr" ? "Doğal taban çizgisi düzenlemesini tetiklemek için yoğun egzersiz veya kardiyo koşusu." : "Fizički rad i treniranje podstiču dugotrajno i svesno oslobađanje neurotransmitera.",
                                          );
                                          if (
                                            typeof window !== "undefined" &&
                                            (window as any).triggerHaptics
                                          ) {
                                            (window as any).triggerHaptics(
                                              "light",
                                            );
                                          }
                                        }
                                      }}
                                      className="group p-4 text-left rounded-2xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/10 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 text-amber-800 dark:text-amber-300 cursor-pointer active:scale-[0.98] transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400">
                                        <span className="text-base group-hover:scale-125 transition-transform">
                                          ➕ 🏋️
                                        </span>
                                        <span>
                                          {isEn ? "Add dynamic physical training" : language === "tr" ? "Dinamik fiziksel antrenman ekleyin" : "Dodaj fizički trening snage"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                                        {isEn ? "Intense physical training triggers natural, sustainable baseline upregulation." : language === "tr" ? "Yoğun fiziksel antrenman, doğal, sürdürülebilir temel düzenlemeyi tetikler." : "Fizička aktivnost stimuliše cirkulaciju, rad srca i prirodnu sintezu neurotransmitera."}
                                      </p>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddTask) {
                                          onAddTask(
                                            isEn ? "Mono-focus block: 45-min strategic deep work" : language === "tr" ? "Tek odaklı blok: 45 dakikalık stratejik derin çalışma" : "Mono-fokus: Blok od 45-min dubokog rada",
                                            isEn ? "Pristine focus on single active browser tab. Lock out social networking loops." : language === "tr" ? "Tek aktif tarayıcı sekmesine kusursuz odaklanma. Sosyal ağ döngülerini kilitleyin." : "Enforisaj samo 1 otvoren tab tokom rada bez multitaskinga za cementiranje baze.",
                                          );
                                          if (
                                            typeof window !== "undefined" &&
                                            (window as any).triggerHaptics
                                          ) {
                                            (window as any).triggerHaptics(
                                              "light",
                                            );
                                          }
                                        }
                                      }}
                                      className="group p-4 text-left rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/10 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 cursor-pointer active:scale-[0.98] transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400">
                                        <span className="text-base group-hover:scale-125 transition-transform">
                                          ➕ 🎯
                                        </span>
                                        <span>
                                          {isEn ? "Add mono-focus Deep Work block" : language === "tr" ? "Tek odaklı Derin Çalışma bloğu ekleyin" : "Dodaj mono-fokus blok dubokog rada"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                                        {isEn ? "A 45-minute sprint with single browser tab active. Calms mental noise." : language === "tr" ? "Tek tarayıcı sekmesinin etkin olduğu 45 dakikalık bir sürat koşusu. Zihinsel gürültüyü yatıştırır." : "Jedan jedini otvoren tab tokom 45 minuta učvršćuje kognitivne staze."}
                                      </p>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddTask) {
                                          onAddTask(
                                            isEn ? "Baseline maintenance: Delay first coffee by 90m" : language === "tr" ? "Temel bakım: İlk kahveyi 90 dakika geciktirin" : "Očuvanje baze: Odlaganje kofeina 90 min od buđenja",
                                            isEn ? "Allows adenosine clearing naturally, dodging afternoon exhaustion crash." : language === "tr" ? "Adenozinin doğal olarak temizlenmesine izin vererek öğleden sonraki yorgunluk krizinden kaçınır." : "Pusti da se adenozinski receptori očiste prirodno nakon ustajanja, sprečavajući pad u 15h.",
                                          );
                                          if (
                                            typeof window !== "undefined" &&
                                            (window as any).triggerHaptics
                                          ) {
                                            (window as any).triggerHaptics(
                                              "light",
                                            );
                                          }
                                        }
                                      }}
                                      className="group p-4 text-left rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/10 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 cursor-pointer active:scale-[0.98] transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400">
                                        <span className="text-base group-hover:scale-125 transition-transform">
                                          ➕ ☕
                                        </span>
                                        <span>
                                          {isEn ? "Add delayed caffeine routine" : language === "tr" ? "Gecikmeli kafein rutini ekleyin" : "Odloži prvu kafu za 90 min"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                                        {isEn ? "Allows physiological cortisol synthesis to wake you before adenosine blockage." : language === "tr" ? "Adenozin blokajından önce fizyolojik kortizol sentezinin sizi uyandırmasını sağlar." : "Odlaganjem prve šoljice kafe sprečavate popodnevni neurološki slom snage."}
                                      </p>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
            )}

            {/* TAB 1.5: IMPULSE SHIELD (URGE SURFER) */}
            {activeTab === "shield" && (
              <motion.div
                key="tab-shield"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                {shieldPhase === "not_started" && (
                  <div className="space-y-6 text-left">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-transparent p-6 rounded-2xl border border-indigo-500/15 dark:border-indigo-500/20 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-indigo-500/15 rounded-xl text-indigo-500">
                          <Shield className="w-5 h-5 animate-pulse" />
                        </span>
                        <h4 className="font-bold text-base text-black dark:text-white">
                          {isEn ? "Impulse Shield & Urge Surfer" : language === "tr" ? "Dürtü Kalkanı ve Sörfçüsü" : "Štit od impulsa (Urge Surfer)"}
                        </h4>
                      </div>
                      <p className="text-xs md:text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold">
                        {isEn 
                          ? "When hit by an impulse to check social media, eat sugar, or procrastinate, you experience a dopamine spike that peaks and naturally decays in about 3 minutes. Under Alan Marlatt's clinical method, you do not suppress the urge; you 'surf' it consciously." 
                          : language === "tr"
                            ? "Sosyal medyayı kontrol etme, şeker yeme veya erteleme dürtüsü geldiğinde, yaklaşık 3 dakika içinde zirveye ulaşan ve doğal olarak azalan bir dopamin dalgalanması yaşarsınız. Alan Marlatt'ın klinik yönteminde, dürtüyü bastırmaz, bilinçli olarak 'sörf' yaparsınız."
                            : "Kada osetite snažnu želju da skrolujete Reels, jedete šećer ili prokrastinirate, vaš limbički sistem stvara impuls koji dostiže vrhunac i prirodno bledi u roku od 3 minuta. Naučni klinički metod Urge Surfing vas uči da se ne borite protiv talasa već da ga svesno 'jašete' dok ne prođe."}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#EBEBF5]/60 block">
                          {isEn ? "What is your current urge or temptation?" : language === "tr" ? "Şu anki dürtünüz veya ayartıcınız nedir?" : "Koji impuls trenutno osećate?"}
                        </label>
                        
                        <div className="grid grid-cols-1 gap-2.5">
                          {[
                            { id: "scrolling", emoji: "📱", labelEn: "Infinite Scrolling (Instagram, TikTok, Reels, Feeds)", labelTr: "Sonsuz Kaydırma (Sosyal Medya, Haberler)", labelSr: "Beskonačno skrolovanje (Instagram Reels, TikTok, vesti)" },
                            { id: "junkfood", emoji: "🍩", labelEn: "Emotional Eating (Sugar, Candy, Fast Food)", labelTr: "Duygusal Yeme (Şeker, Abur Cubur)", labelSr: "Emocionalno prejedanje (Šećer, slatkiši, brza hrana)" },
                            { id: "procrastination", emoji: "🙈", labelEn: "Escapism & Procrastination (Avoiding Hard Work)", labelTr: "Erteleme ve Kaçış (Zor Görevlerden Kaçınma)", labelSr: "Prokrastinacija i beg (Odlaganje teških obaveza)" },
                            { id: "shopping", emoji: "🛍️", labelEn: "Impulsive Shopping or Endless Browsing", labelTr: "Dürtüsel Alışveriş veya Sürekli Göz Atma", labelSr: "Impulsivna kupovina ili besciljno pretraživanje sajtova" },
                            { id: "custom", emoji: "✨", labelEn: "Write My Own Specific Urge", labelTr: "Kendi Özel Dürtümü Yaz", labelSr: "Unesi sopstveno iskušenje" },
                          ].map((opt) => {
                            const isSel = selectedUrge === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUrge(opt.id);
                                  triggerHaptics("light");
                                }}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                  isSel
                                    ? "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border-[#007AFF] text-[#007AFF] dark:text-[#0A84FF] font-bold"
                                    : "bg-black/5 dark:bg-white/5 border-transparent text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:bg-black/10 dark:hover:bg-white/10"
                                }`}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span className="text-lg">{opt.emoji}</span>
                                  <span className="text-xs sm:text-sm">
                                    {isEn ? opt.labelEn : language === "tr" ? opt.labelTr : opt.labelSr}
                                  </span>
                                </span>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSel ? "border-[#007AFF] bg-[#007AFF]" : "border-black/10 dark:border-white/10"
                                }`}>
                                  {isSel && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedUrge === "custom" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2 pt-2"
                        >
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#EBEBF5]/60">
                            {isEn ? "Describe your specific temptation:" : language === "tr" ? "Özel ayartıcınızı tanımlayın:" : "Opišite detaljnije šta vas iskušava:"}
                          </label>
                          <input
                            type="text"
                            value={customUrgeText}
                            onChange={(e) => setCustomUrgeText(e.target.value)}
                            placeholder={isEn ? "E.g., Checking my trading portfolio every 5 minutes..." : language === "tr" ? "Örn. Her 5 dakikada bir portföyümü kontrol etmek..." : "Npr. Proveravanje oglasa ili poruka svaka dva minuta..."}
                            className="w-full p-3 rounded-xl border bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-xs sm:text-sm text-black dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                          />
                        </motion.div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShieldSeconds(180);
                          setShieldPhase("running");
                          triggerHaptics("heavy");
                        }}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-white" />
                        <span>
                          {isEn ? "🚀 ACTIVATE SHIELD & SURF THE WAVE" : language === "tr" ? "🚀 KALKANI ETKİNLEŞTİR VE DALGAYA SÖRF YAP" : "🚀 AKTIVIRAJ ŠTIT I JAHAJ TALAS (3 MIN)"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {shieldPhase === "running" && (
                  <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl p-6 space-y-6 shadow-xl text-center text-left">
                    {/* Pulsating Ocean Wave Circle Visualizer */}
                    <div className="relative w-44 h-44 mx-auto flex items-center justify-center select-none">
                      {/* Animating Wave Layers */}
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/10 animate-ping opacity-70 pointer-events-none" />
                      <div className="absolute inset-2 rounded-full border-2 border-indigo-500/20 animate-pulse pointer-events-none" />
                      <div className="absolute inset-4 rounded-full border border-indigo-500/30 pointer-events-none" />
                      
                      {/* Dynamic breathing guide container sizing */}
                      {(() => {
                        const pulseScale = shieldSeconds % 12 < 4 ? "scale-110" : shieldSeconds % 12 >= 8 ? "scale-90" : "scale-100";
                        const pulseColor = shieldSeconds % 12 < 4 ? "border-indigo-500" : "border-violet-500";
                        return (
                          <div className={`absolute inset-8 rounded-full border-4 ${pulseColor} bg-indigo-500/5 backdrop-blur-xs flex flex-col items-center justify-center transition-all duration-1000 ${pulseScale}`}>
                            <span className="text-3xl font-bold font-mono tracking-tighter text-black dark:text-white">
                              {Math.floor(shieldSeconds / 60)}:{String(shieldSeconds % 60).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-1">
                              {isEn ? "SHIELD TIME" : language === "tr" ? "KALKAN SÜRESİ" : "VREME ŠTITA"}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Instruction Box based on Seconds Remaining */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={shieldSeconds >= 120 ? "swell" : shieldSeconds >= 60 ? "peak" : "subsidence"}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="bg-indigo-500/5 border border-indigo-500/15 p-4 rounded-xl text-left space-y-1.5"
                      >
                        <h5 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                          {shieldSeconds >= 120 ? (
                            <>🌊 {isEn ? "Phase 1: The Swell" : language === "tr" ? "Aşama 1: Dalga Yükseliyor" : "Faza 1: Nalet talasa (The Swell)"}</>
                          ) : shieldSeconds >= 60 ? (
                            <>🏔️ {isEn ? "Phase 2: The Peak" : language === "tr" ? "Aşama 2: Zirve Noktası" : "Faza 2: Vrhunac pritiska (The Peak)"}</>
                          ) : (
                            <>🍃 {isEn ? "Phase 3: The Subsidence" : language === "tr" ? "Aşama 3: Dalganın Alçalması" : "Faza 3: Opadanje žudnje (The Subsidence)"}</>
                          )}
                        </h5>
                        <p className="text-[12px] sm:text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-relaxed font-sans">
                          {shieldSeconds >= 120 ? (
                            isEn 
                              ? "Do not fight or try to suppress the thought. Suppression feeds tension. Locate where you feel the urge physically (chest, stomach, or throat) and breathe calmly into it." 
                              : language === "tr"
                                ? "Dürtüyü bastırmaya çalışmayın. Bastırmak gerilimi artırır. Dürtüyü fiziksel olarak nerede hissettiğinizi (göğüs, mide veya boğaz) belirleyin ve sakin nefesler alın."
                                : "Ne pokušavajte da potisnete želju niti da se svađate sa sopstvenim mozgom. Primetite gde tačno u telu osećate iskušenje (npr. stezanje u stomaku, suvo grlo ili napetost u grudima). Samo dišite."
                          ) : shieldSeconds >= 60 ? (
                            isEn 
                              ? "This is the point of maximum neurochemical urge. Relax your jaw, face, and fingers. Picture yourself as a surfer – riding high on top of the craving wave, watching it without acting." 
                              : language === "tr"
                                ? "Bu, maksimum nörokimyasal dürtü anıdır. Çenenizi, yüzünüzü ve parmaklarınızı gevşetin. Kendinizi dalganın üzerinde sörf yapan biri olarak hayal edin – harekete geçmeden dalgayı izleyin."
                                : "Ovo je tačka najveće hemijske tenzije. Opustite vilicu, ramena i dlanove. Zamislite sebe kao surfera koji stoji mirno na talasu – posmatrate žudnju iz ptičije perspektive kako raste i lomi se bez preduzimanja akcije."
                          ) : (
                            isEn 
                              ? "The chemical wave is losing strength. The adrenaline is clearing. Shift focus slowly back to your physical room. Feel your feet flat on the ground. You are back in command." 
                              : language === "tr"
                                ? "Kimyasal dalga gücünü kaybediyor. Adrenalin temizleniyor. Odağınızı yavaşça fiziksel odanıza kaydırın. Ayaklarınızı yerde hissedin. Kontrol sizde."
                                : "Hemijski impuls gubi na snazi. Adrenalin se smiruje. Vratite svest u fizičku prostoriju oko vas. Osetite tlo pod nogama i vazduh na koži. Vaš prefrontalni korteks je u potpunosti povratio kontrolu."
                          )}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    {/* Interactive breathing guidance bar */}
                    <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-xl space-y-2 text-left">
                      <div className="text-xs font-bold text-gray-500 dark:text-[#EBEBF5]/60 flex justify-between items-center">
                        <span>
                          {shieldSeconds % 12 < 4 ? (
                            isEn ? "🌬️ Inhale deeply..." : language === "tr" ? "🌬️ Derin nefes al..." : "🌬️ Udahni svesno kroz nos..."
                          ) : shieldSeconds % 12 >= 8 ? (
                            isEn ? "😤 Exhale fully..." : language === "tr" ? "😤 Tamamen nefes ver..." : "😤 Izdahni polako i do kraja..."
                          ) : (
                            isEn ? "⏸️ Hold and relax..." : language === "tr" ? "⏸️ Tut ve gevşe..." : "⏸️ Zadrži dah i opusti ramena..."
                          )}
                        </span>
                        <span className="font-mono text-[10px]">
                          {4 - (shieldSeconds % 4)}s
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          animate={{
                            width: shieldSeconds % 12 < 4 
                              ? `${((shieldSeconds % 4 + 1) / 4) * 100}%` 
                              : shieldSeconds % 12 >= 8 
                                ? `${(1 - (shieldSeconds % 4) / 4) * 100}%` 
                                : "100%"
                          }}
                          transition={{ duration: 1, ease: "linear" }}
                          className="h-full bg-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Abort button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShieldPhase("not_started");
                        setShieldSeconds(180);
                        triggerHaptics("warning");
                      }}
                      className="w-full py-3 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold text-xs rounded-xl hover:bg-red-500/5 cursor-pointer active:scale-95 transition-all"
                    >
                      {isEn ? "❌ Give In To Urge (Abort)" : language === "tr" ? "❌ Dürtüye Yenil (İptal Et)" : "❌ Poklekni pred impulsom (Prekini)"}
                    </button>
                  </div>
                )}

                {shieldPhase === "completed" && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-[#1C1C1E] border border-[#34C759]/20 rounded-2xl p-6 text-center space-y-6 shadow-xl"
                  >
                    <div className="w-20 h-20 bg-[#34C759]/10 dark:bg-[#32D74B]/10 rounded-full mx-auto flex items-center justify-center border border-[#34C759]/20 text-[#34C759]">
                      <Sparkles className="w-10 h-10 animate-bounce" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-lg text-black dark:text-[#32D74B]">
                        {isEn ? "🎉 Prefrontal Cortex Victory!" : language === "tr" ? "🎉 Prefrontal Korteks Zaferi!" : "🎉 POBEDA PREFRONTALNOG KORTEKSA!"}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold">
                        {isEn 
                          ? "Congratulations! You successfully surfed the craving wave for 3 minutes. Your prefrontal cortex has achieved a pure victory over the impulsive limbic system! Your receptors have settled back to their stable baseline (+10 focus budget)." 
                          : language === "tr"
                            ? "Tebrikler! 3 dakika boyunca istek dalgasına sörf yaptınız. Prefrontal korteksiniz dürtüsel limbik sisteme karşı mutlak bir zafer kazandı! Alıcılarınız kararlı temel seviyelerine döndü (+10 odak bütçesi)."
                            : "Čestitamo! Uspešno ste izdržali 3 minuta i svesno 'jahali' talas žudnje. Tvoj prefrontalni korteks je odneo čistu pobedu nad impulsivnim limbičkim sistemom! Receptori su uspešno vraćeni u stabilan bazni nivo (+10 poena za svesni fokus)."}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShieldPhase("not_started");
                          setShieldSeconds(180);
                          setActiveTab("history");
                          triggerHaptics("light");
                        }}
                        className="flex-1 py-3 bg-[#34C759] hover:bg-[#28a745] text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        {isEn ? "View Saved Log 📋" : language === "tr" ? "Günlüğü Görüntüle 📋" : "Pogledaj u istoriji 📋"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShieldPhase("not_started");
                          setShieldSeconds(180);
                          triggerHaptics("light");
                        }}
                        className="flex-1 py-3 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#8E8E93] dark:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        {isEn ? "Surf Another Urge 🌊" : language === "tr" ? "Başka Bir Dalgaya Sörf Yap 🌊" : "Novi impuls 🌊"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* TAB 2: MODULAR EDUCATION SECTION (DopamineEducation.tsx) */}
            {activeTab === "education" && (
              <motion.div
                key="tab-education"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DopamineEducation
                  language={language}
                  isDark={isDark}
                  onAddTask={(tTask) => {
                    if (onAddTask) {
                      if (tTask && typeof tTask === "object") {
                        // Pass category if it exists in tTask, otherwise default to description
                        const title = tTask.title;
                        const description = tTask.description;
                        const category = tTask.category;
                        onAddTask(title, description, category);
                      } else {
                        onAddTask(tTask);
                      }
                    }
                  }}
                />
              </motion.div>
            )}

            {/* TAB 3: NEURO AI CHAT ASSISTANT */}
            {activeTab === "agent" && (
              <motion.div
                key="tab-agent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 max-w-2xl mx-auto"
              >
                {/* Visual Chat Hub layout */}
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col h-[420px]">
                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <MessageSquare className="w-10 h-10 text-[#007AFF] dark:text-[#0A84FF] opacity-40 transition-opacity" />
                        <h5 className="font-semibold text-sm">
                          {isEn ? "Neuro-Agent Chat Session" : language === "tr" ? "Nöro-Ajan Sohbet Oturumu" : "Ćaskanje sa Neuro-Agentom"}
                        </h5>
                        <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 max-w-sm leading-relaxed font-semibold">
                          {isEn ? "Unlike the Evaluator which logs actions, this AI Assistant is purely for educational neuroscience guidance. Ask about baseline resets, theory, or focus protocols." : language === "tr" ? "Eylemleri kaydeden Değerlendiricinin aksine, bu Yapay Zeka Asistanı tamamen eğitimsel sinirbilim rehberliği içindir. Temel sıfırlamalar, teori veya odak protokolleri hakkında bilgi alın." : "Neuro Asistent ne beleži akcije već pruža edukaciju i teorijsko znanje o dopaminu, skrolovanju i protokolima za reset fokusa."}
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isAssistant = msg.role === "model";
                        return (
                          <div key={idx} className="space-y-1">
                            <div
                              className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                            >
                              <span
                                className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 select-none ${
                                  msg.role === "user"
                                    ? "bg-[#007AFF] text-white"
                                    : "bg-black/5 dark:bg-white/5 text-white"
                                }`}
                              >
                                {msg.role === "user" ? "U" : "🧠"}
                              </span>

                              <div
                                className={`p-3.5 rounded-xl text-xs sm:text-[13px] leading-relaxed font-semibold text-black dark:text-white border font-sans relative ${
                                  msg.role === "user"
                                    ? "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 dark:bg-white/5 border-black/5 dark:border-white/10 dark:border-white/5"
                                    : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 pr-10"
                                }`}
                              >
                                {isAssistant && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        msg.content,
                                      ).catch(() => {});
                                      setCopiedChatMsgIdx(idx);
                                      if (
                                        typeof window !== "undefined" &&
                                        (window as any).triggerHaptics
                                      ) {
                                        (window as any).triggerHaptics("light");
                                      }
                                      setTimeout(
                                        () => setCopiedChatMsgIdx(null),
                                        1500,
                                      );
                                    }}
                                    className="absolute top-2.5 right-2.5 p-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white dark:bg-[#1C1C1E]/20 transition-all text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-[#007AFF] cursor-pointer"
                                    title={
                                      isEn ? "Copy advice" : language === "tr" ? "Tavsiyeyi kopyala" : "Kopiraj savet"
                                    }
                                  >
                                    {copiedChatMsgIdx === idx ? (
                                      <Check className="w-3 h-3 text-[#34C759]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                                <Markdown>{msg.content}</Markdown>
                              </div>
                            </div>

                            {isAssistant && idx === chatMessages.length - 1 && (
                              <div className="pl-10 text-left">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendChat(
                                      isEn ? "Can you give me a more detailed neurobiological breakdown or dopamine reset protocol?" : language === "tr" ? "Bana daha ayrıntılı bir nörobiyolojik analiz veya dopamin sıfırlama protokolü verebilir misiniz?" : "Molim te za detaljniji neurobiološki opis ili personalizovani protokol reseta dopamina.",
                                    )
                                  }
                                  disabled={isSendingChat}
                                  className="text-[10px] text-[#007AFF] dark:text-[#0A84FF] font-bold hover:underline cursor-pointer flex items-center gap-1 active:scale-95 transition-transform"
                                >
                                  <span>
                                    🔍{" "}
                                    {isEn ? "Get Reset Protocol / Deeper Insight" : language === "tr" ? "Sıfırlama Protokolü / Daha Derin Bilgi Alın" : "Više detalja / Protokol reseta"}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Typing Indicator */}
                  {isSendingChat && (
                    <div className="px-5 py-2.5 text-left text-[13px] font-medium text-[#007AFF] transition-opacity">
                      {isEn ? "🧬 NEURO-AGENT SYNTHESIZING RESPONSE..." : language === "tr" ? "🧬 NÖRO-AJAN SENTEZLEME CEVAPLARI..." : "🧬 RECEPTORI U RADU, AGENT FORMULIŠE SAVET..."}
                    </div>
                  )}

                  {/* Input form */}
                  <div className="p-3 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#0c0a12] flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] rounded-xl px-4 py-2.5 text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder={
                        isEn ? "Ask advisor about neurobiology..." : language === "tr" ? "Danışmanınıza nörobiyolojiyi sorun..." : "Upiši pitanje za biologa pažnje..."
                      }
                      disabled={isSendingChat}
                    />
                    <button
                      type="button"
                      onClick={() => handleSendChat()}
                      disabled={isSendingChat || !chatInput.trim()}
                      className="px-4 py-2 bg-[#007AFF] active:opacity-70 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer select-none active:scale-95 disabled:opacity-60"
                    >
                      {isEn ? "Send" : language === "tr" ? "Göndermek" : "Pitaj"}
                    </button>
                  </div>
                </div>

                {/* Instant prompt chips */}
                <div className="space-y-1.5 text-left">
                  <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 opacity-50 pl-1 font-semibold">
                    {isEn ? "INSTANT STRATEGIC TOPICS:" : language === "tr" ? "ANLIK STRATEJİK KONULAR:" : "IZDVOJENE PRAKTIČNE TEME:"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {chatCues.map((cue, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setChatInput(isEn ? cue.promptEn : cue.promptSr);
                        }}
                        className="p-2 text-left rounded-xl border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug cursor-pointer active:scale-99"
                      >
                        {isEn ? cue.titleEn : cue.titleSr} →
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: HISTORICAL COGNITIVE LOGS FEED */}
            {activeTab === "history" && (
              <motion.div
                key="tab-history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 max-w-2xl mx-auto text-left"
              >
                <div className="flex justify-between items-center sm:border-b dark:border-white/10 pb-3 gap-4">
                  <h4 className="font-semibold text-base">
                    {isEn ? "Saved Biometric Decision Logs" : language === "tr" ? "Kaydedilen Biyometrik Karar Günlükleri" : "Sačuvana istorija odluka"}
                  </h4>
                  <span className="text-xs font-medium text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-lg">
                    {savedDecisions.length} {isEn ? "logged" : language === "tr" ? "oturum açıldı" : "zapisa"}
                  </span>
                </div>

                {savedDecisions.length === 0 ? (
                  <div className="p-12 text-center border border-dashed rounded-xl border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs sm:text-sm font-semibold max-w-md mx-auto">
                    {isEn ? "No decisions logged yet. Head to the Evaluator tab to analyze and save your patterns." : language === "tr" ? "Henüz herhangi bir karar kaydedilmedi. Desenlerinizi analiz etmek ve kaydetmek için Değerlendirici sekmesine gidin." : "Još uvek nema unetih svedočanstava o odlukama. Koristite Evaluator tab da proanalizirate i sačuvate prve akcije."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const idx = Math.min(
                        Math.max(0, historyIdx),
                        savedDecisions.length - 1,
                      );
                      const item = savedDecisions[idx];
                      if (!item) return null;

                      return (
                        <div className="space-y-4">
                          <ZoomableCard
                            key={item.id}
                            title={`${idx + 1} / ${savedDecisions.length} — ${
                              item.category === "delayed"
                                ? isEn ? "Earned Motivation" : language === "tr" ? "Kazanılan Motivasyon" : "Zasluženi dopamin"
                                : item.category === "escapism"
                                  ? isEn ? "Mental Escapism" : language === "tr" ? "Zihinsel Kaçış" : "Mentalni eskapizam"
                                  : isEn ? "Cheap Spike" : language === "tr" ? "Ucuz Başak" : "Jeftini pik"
                            }`}
                          >
                            <div className="p-5.5 space-y-3 text-left">
                              <div className="flex justify-between items-start gap-4">
                                <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold transition-opacity">
                                  {item.timestamp}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering card zoom from parent
                                    deleteFromHistory(item.id);
                                  }}
                                  className="text-[13px] font-medium text-[#FF3B30] hover:text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30] hover:bg-[#FF3B30] dark:bg-[#FF453A]/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  {isEn ? "Delete Log" : language === "tr" ? "Günlüğü Sil" : "Ukloni zapis"}
                                </button>
                              </div>

                              <p className="text-xs sm:text-[13.5px] font-semibold text-black dark:text-[#0A84FF] leading-snug">
                                "{item.text}"
                              </p>

                              <div className="p-3 bg-[#F2F2F7] dark:bg-[#1C1C1E]0/5 rounded-xl border border-black/5 dark:border-white/10 space-y-1">
                                <span className="text-[13px] text-[#5E5CE6] font-semibold">
                                  {isEn ? "NEURO-ANALYSIS MECHANISM:" : language === "tr" ? "NÖRO-ANALİZ MEKANİZMASI:" : "MEHANIZAM REGULACIJE:"}
                                </span>
                                <p className="text-[13px] leading-relaxed font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 animate-fade-in">
                                  {item.explanation}
                                </p>
                              </div>
                            </div>
                          </ZoomableCard>

                          {/* Navigation Buttons and Page Circles */}
                          <div className="flex items-center justify-between px-1 pt-1 font-sans select-none">
                            <button
                              type="button"
                              onClick={() =>
                                setHistoryIdx((prev) =>
                                  prev === 0
                                    ? savedDecisions.length - 1
                                    : prev - 1,
                                )
                              }
                              className={`px-3 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                isDark
                                  ? "bg-[#14121a] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                                  : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                              }`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>{isEn ? "Previous" : language === "tr" ? "Öncesi" : "Prethodni"}</span>
                            </button>

                            <div className="flex gap-1.5 max-w-[130px] overflow-hidden justify-center py-1">
                              {savedDecisions.map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setHistoryIdx(i)}
                                  className={`w-2 h-2 rounded-full cursor-pointer transition-all shrink-0 ${
                                    idx === i
                                      ? "bg-[#007AFF] scale-125"
                                      : "bg-black/5 dark:bg-white/5"
                                  }`}
                                />
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setHistoryIdx((prev) =>
                                  prev === savedDecisions.length - 1
                                    ? 0
                                    : prev + 1,
                                )
                              }
                              className={`px-3 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                isDark
                                  ? "bg-[#14121a] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                                  : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                              }`}
                            >
                              <span>{isEn ? "Next" : language === "tr" ? "Sonraki" : "Sledeći"}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: CIRCADIAN NEURO-ENERGY PLANNER */}
            {activeTab === "circadian" && (
              <motion.div
                key="tab-circadian"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-2xl mx-auto text-left"
              >
                {/* Intro Card */}
                <div className={`p-5 rounded-2xl border ${cardBgClass} space-y-3`}>
                  <div className="flex items-center gap-2.5 text-left">
                    <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                      <Sun className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-base text-black dark:text-white">
                        {isEn ? "Circadian Neuro-Energy Rhythm" : language === "tr" ? "Sirkadiyen Nöro-Enerji Ritmi" : "Cirkadijalni Neuro-Energetski Ritam"}
                      </h4>
                      <p className="text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium font-sans">
                        {isEn ? "Synchronize your peak cognitive focus and recovery blocks based on Huberman's chronobiology protocols." : language === "tr" ? "Maksimum bilişsel odaklanma ve yenilenme bloklarınızı sirkadiyen biyolojiye göre senkronize edin." : "Sinhronizujte vrhunce kognitivnog fokusa i blokove oporavka na osnovu hronobioloških protokola."}
                      </p>
                    </div>
                  </div>

                  {/* Sleep/Wake Input Slider */}
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] space-y-3 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                        ⏰ {isEn ? "Target Wake Time" : language === "tr" ? "Hedef Uyanma Saati" : "Planirano vreme buđenja"}
                      </span>
                      <span className="text-sm font-mono font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-0.5 rounded-lg">
                        {wakingHour < 10 ? `0${wakingHour}` : wakingHour}:00
                      </span>
                    </div>
                    
                    <input
                      type="range"
                      min="4"
                      max="11"
                      value={wakingHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setWakingHour(val);
                        safeStorage.setItem("kaizen_circadian_waking_hour", val.toString());
                      }}
                      className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                    />
                    <div className="flex justify-between text-[10px] text-[#8E8E93] font-semibold font-mono">
                      <span>04:00 AM</span>
                      <span>07:00 AM</span>
                      <span>11:00 AM</span>
                    </div>
                  </div>
                </div>

                {/* Biometric Integration: Today's Tasks & Compliance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Daily Somatic Checklist */}
                  <div className={`p-4.5 rounded-2xl border ${cardBgClass} space-y-3.5`}>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#EBEBF5]/60">
                      ☀️ {isEn ? "Somatic Compliance" : language === "tr" ? "Somatik Uyumluluk" : "Somatska sinhronizacija"}
                    </h5>
                    
                    <div className="space-y-2.5">
                      {/* Morning Light */}
                      <button
                        onClick={() => {
                          const nextVal = !lightExposureCompleted;
                          setLightExposureCompleted(nextVal);
                          safeStorage.setItem("kaizen_circadian_light_exposure", String(nextVal));
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          lightExposureCompleted 
                            ? "border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-600 dark:text-emerald-400" 
                            : "border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] text-black dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Sun className={`w-4 h-4 shrink-0 ${lightExposureCompleted ? "text-emerald-500" : "text-amber-500"}`} />
                          <div className="text-xs text-left">
                            <div className="font-bold">{isEn ? "10m Morning Sunlight" : language === "tr" ? "10dk Sabah Güneşi" : "10m jutarnjeg sunca"}</div>
                            <div className="text-[10px] opacity-75">{isEn ? "Directly anchors cortisol curve" : language === "tr" ? "Kortizol eğrisini sabitler" : "Direktno sidri krivu kortizola"}</div>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${lightExposureCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 dark:border-white/20"}`}>
                          {lightExposureCompleted && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>

                      {/* Caffeine Delay */}
                      <button
                        onClick={() => {
                          const nextVal = !caffeineDelayedCompleted;
                          setCaffeineDelayedCompleted(nextVal);
                          safeStorage.setItem("kaizen_circadian_caffeine_delay", String(nextVal));
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          caffeineDelayedCompleted 
                            ? "border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-600 dark:text-emerald-400" 
                            : "border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] text-black dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Zap className={`w-4 h-4 shrink-0 ${caffeineDelayedCompleted ? "text-emerald-500" : "text-[#007AFF]"}`} />
                          <div className="text-xs text-left">
                            <div className="font-bold">{isEn ? "90-Min Caffeine Delay" : language === "tr" ? "90dk Kafein Geciktirme" : "90 min odlaganje kofeina"}</div>
                            <div className="text-[10px] opacity-75">{isEn ? "Prevents afternoon energy crash" : language === "tr" ? "Öğleden sonra çöküşünü önler" : "Sprečava popodnevni pad energije"}</div>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${caffeineDelayedCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 dark:border-white/20"}`}>
                          {caffeineDelayedCompleted && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Circular Curve visualization / score */}
                  <div className={`p-4.5 rounded-2xl border ${cardBgClass} flex flex-col justify-between space-y-3`}>
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#EBEBF5]/60">
                        ⚖️ {isEn ? "Circadian Alignment" : language === "tr" ? "Sirkadiyen Hizalama" : "Usaglašenost ritma"}
                      </h5>
                      <p className="text-[11px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium leading-snug mt-1">
                        {isEn ? "Your alignment score affects sleep onset latency and morning dopamine sensitivity." : language === "tr" ? "Hizalama puanınız uykuya dalma süresini ve sabah dopamin hassasiyetini etkiler." : "Rezultat sinhronizacije utiče na brzinu uspavljivanja i jutarnju osetljivost na dopamin."}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-black/[0.01] dark:bg-white/[0.01] p-3 rounded-xl border border-black/[0.03] dark:border-white/[0.03]">
                      <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                        {/* Circle meter */}
                        <svg className="w-14 h-14 -rotate-90">
                          <circle cx="28" cy="28" r="24" fill="transparent" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="4" />
                          <circle 
                            cx="28" 
                            cy="28" 
                            r="24" 
                            fill="transparent" 
                            stroke="#10B981" 
                            strokeWidth="4" 
                            strokeDasharray={150.7} 
                            strokeDashoffset={150.7 - (150.7 * (Number(lightExposureCompleted) + Number(caffeineDelayedCompleted)) * 50) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute font-mono text-xs font-bold text-black dark:text-white">
                          {(Number(lightExposureCompleted) + Number(caffeineDelayedCompleted)) * 50}%
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-black dark:text-white">
                          {((Number(lightExposureCompleted) + Number(caffeineDelayedCompleted)) === 2) 
                            ? (isEn ? "Perfect Alignment" : language === "tr" ? "Mükemmel Uyum" : "Vrhunska usaglašenost")
                            : ((Number(lightExposureCompleted) + Number(caffeineDelayedCompleted)) === 1)
                              ? (isEn ? "Moderate Alignment" : language === "tr" ? "Orta Derece Uyum" : "Delimična usaglašenost")
                              : (isEn ? "Desynchronized" : language === "tr" ? "Senkronize Değil" : "Niste usaglašeni")
                          }
                        </div>
                        <div className="text-[10px] text-[#8E8E93] leading-tight font-medium">
                          {((Number(lightExposureCompleted) + Number(caffeineDelayedCompleted)) === 2) 
                            ? (isEn ? "Melatonin release will occur naturally." : language === "tr" ? "Melatonin salgısı doğal olarak gerçekleşecektir." : "Melatonin će se lučiti prirodno i duboko.")
                            : (isEn ? "Complete tasks to anchor your biological clock." : language === "tr" ? "Biyolojik saatinizi sabitlemek için görevleri tamamlayın." : "Završite zadatke da stabilizujete biološki sat.")
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE 24-HOUR INTERACTIVE VISUAL TIMELINE */}
                <div className={`p-5 rounded-2xl border ${cardBgClass} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
                      📈 {isEn ? "Neurochemical Forecast Map" : language === "tr" ? "Nörokimyasal Tahmin Haritası" : "Predviđanje nivoa neurotransmitera"}
                    </h5>
                    <button 
                      onClick={() => setCircadianScienceOpen(!circadianScienceOpen)}
                      className="text-xs text-[#007AFF] dark:text-[#0A84FF] font-bold hover:underline cursor-pointer"
                    >
                      {circadianScienceOpen ? (isEn ? "Hide Science" : language === "tr" ? "Bilimi Gizle" : "Sakrij nauku") : (isEn ? "View Neurobiology" : language === "tr" ? "Nörobiyolojiyi Gör" : "Pogledaj mehanizam")}
                    </button>
                  </div>

                  {circadianScienceOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs p-4 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10 text-[#3C3C43] dark:text-[#EBEBF5]/90 space-y-2 leading-relaxed"
                    >
                      <div className="font-bold text-[#5E5CE6] flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5 text-[#5E5CE6]" />
                        {isEn ? "Biological Mechanics (Dr. Andrew Huberman)" : language === "tr" ? "Biyolojik Mekanizmalar (Dr. Andrew Huberman)" : "Biološki mehanizam (Dr Endru Huberman)"}
                      </div>
                      <p>
                        {isEn ? "1. Waking triggers a massive cortisol pulse. This spike must occur as early as possible to start an internal timer that triggers melatonin release 14-16 hours later." : language === "tr" ? "1. Uyanma büyük bir kortizol darbesini tetikler. This artış, 14-16 saat sonra melatonin salınımını tetikleyecek dahili bir zamanlayıcıyı başlatmak için olabildiğince erken gerçekleşmelidir." : "1. Buđenje pokreće snažan talas kortizola. Ovaj pik mora nastati što ranije kako bi pokrenuo unutrašnji sat koji 14-16 sati kasnije aktivira lučenje melatonina."}
                      </p>
                      <p>
                        {isEn ? "2. Delaying caffeine for 90-120 minutes allows adenosine (sleepiness chemical) to fully clear from receptors. Drinking coffee instantly blocks receptors, causing a massive energy crash later when the coffee wears off." : language === "tr" ? "2. Kafeini 90-120 dakika geciktirmek, adenozinin (uykululuk kimyasalı) reseptörlerden tamamen temizlenmesini sağlar. Kahve içmek reseptörleri anında bloke ederek kahvenin etkisi geçtiğinde büyük bir enerji çöküşüne neden olur." : "2. Odlaganje kofeina za 90-120 minuta omogućava da se adenozin (molekul umora) potpuno očisti iz receptora umesto da se maskira, čime trajno eliminišete popodnevni pad energije."}
                      </p>
                    </motion.div>
                  )}

                  {/* GORGEOUS SVG GRAPH SHAPE OF CORTISOL, DOPAMINE, MELATONIN */}
                  <div className="relative w-full h-32 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/[0.04] dark:border-white/[0.04] overflow-hidden flex items-end">
                    {/* SVG Curve drawing */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(128,128,128,0.1)" strokeDasharray="3,3" />
                      
                      {/* Cortisol curve (Orange) - peaks right after waking up, then falls down */}
                      <path 
                        d="M 0,90 Q 15,10 30,55 T 60,85 T 100,90" 
                        fill="none" 
                        stroke="#FF9500" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        opacity="0.8" 
                      />
                      
                      {/* Dopamine focus curve (Green) - peaks in the morning (W+3h) and small wave late afternoon (W+10h) */}
                      <path 
                        d="M 0,85 Q 10,75 25,25 T 45,80 T 65,35 T 85,75 T 100,85" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        opacity="0.85" 
                      />
                      
                      {/* Melatonin curve (Purple) - flat all day, spikes in evening */}
                      <path 
                        d="M 0,95 L 60,95 Q 75,90 85,25 T 100,10" 
                        fill="none" 
                        stroke="#8B5CF6" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        opacity="0.8" 
                      />
                    </svg>

                    {/* Chart Legend overlay */}
                    <div className="absolute top-2.5 left-3 flex flex-wrap gap-3.5 text-[10px] font-bold uppercase tracking-wider font-sans">
                      <span className="flex items-center gap-1.5 text-[#FF9500]">
                        <span className="w-2.5 h-1 bg-[#FF9500] rounded-full inline-block" />
                        {isEn ? "Cortisol" : language === "tr" ? "Kortizol" : "Kortizol"}
                      </span>
                      <span className="flex items-center gap-1.5 text-[#10B981]">
                        <span className="w-2.5 h-1 bg-[#10B981] rounded-full inline-block" />
                        {isEn ? "Dopamine" : language === "tr" ? "Dopamin" : "Dopamin"}
                      </span>
                      <span className="flex items-center gap-1.5 text-[#8B5CF6]">
                        <span className="w-2.5 h-1 bg-[#8B5CF6] rounded-full inline-block" />
                        {isEn ? "Melatonin" : language === "tr" ? "Melatonin" : "Melatonin"}
                      </span>
                    </div>

                    {/* Wake indicator dashed line */}
                    <div className="absolute inset-y-0 left-[15%] border-l border-dashed border-[#FF9500]/40 flex flex-col justify-between items-start pl-1 text-[8px] font-mono font-bold text-[#FF9500] uppercase">
                      <span>{isEn ? "Wake" : language === "tr" ? "Uyanma" : "Buđenje"}</span>
                      <span>{wakingHour}:00</span>
                    </div>

                    <div className="absolute inset-y-0 left-[35%] border-l border-dashed border-[#10B981]/40 flex flex-col justify-between items-start pl-1 text-[8px] font-mono font-bold text-[#10B981] uppercase">
                      <span>{isEn ? "Deep Work" : language === "tr" ? "Derin Odak" : "Duboki rad"}</span>
                      <span>{(wakingHour + 3) % 24}:00</span>
                    </div>

                    <div className="absolute inset-y-0 left-[60%] border-l border-dashed border-sky-400/40 flex flex-col justify-between items-start pl-1 text-[8px] font-mono font-bold text-sky-400 uppercase">
                      <span>{isEn ? "NSDR" : language === "tr" ? "NSDR" : "NSDR"}</span>
                      <span>{(wakingHour + 7.5) % 24}:00</span>
                    </div>

                    <div className="absolute inset-y-0 left-[85%] border-l border-dashed border-[#8B5CF6]/40 flex flex-col justify-between items-start pl-1 text-[8px] font-mono font-bold text-[#8B5CF6] uppercase">
                      <span>{isEn ? "Sleep" : language === "tr" ? "Uyku" : "San"}</span>
                      <span>{(wakingHour + 14) % 24}:00</span>
                    </div>
                  </div>

                  {/* List of Calculated checkpoints */}
                  <div className="space-y-2">
                    {[
                      {
                        hourOffset: 0.5,
                        icon: <Sun className="w-4 h-4 text-amber-500" />,
                        titleEn: "Cortisol Peak & Light Exposure",
                        titleSr: "Vrhunac kortizola i fototerapija",
                        titleTr: "Kortizol Zirvesi ve Işık Alımı",
                        descEn: "View outdoor light for 10 minutes immediately. Starts the physiological clock and stops melatonin production.",
                        descSr: "Izađite napolje i pogledajte u pravcu prirodnog svetla 10-15 minuta. Ovo zaustavlja preostali melatonin i pokreće sat.",
                        descTr: "Hemen 10 dakika dışarıdaki ışığa bakın. Fizyolojik saati başlatır ve melatonin üretimini durdurur.",
                        tagEn: "LIGHT IN",
                        tagSr: "SVETLOST",
                        tagTr: "IŞIK",
                        color: "border-amber-500/10 hover:bg-amber-500/[0.02]"
                      },
                      {
                        hourOffset: 2,
                        icon: <Zap className="w-4 h-4 text-[#007AFF]" />,
                        titleEn: "Adenosine Clear & Caffeine Gate",
                        titleSr: "Čišćenje adenozina i prva kafa",
                        titleTr: "Adenozin Temizliği ve İlk Kahve",
                        descEn: "Delay caffeine intake until this point (90-120 min post-wake). This prevents the typical 2 PM energy crash.",
                        descSr: "Tek nakon ovog trenutka unesite kofein. Odlaganje sprečava da se adenozin naglo nakupi popodne.",
                        descTr: "Kafein alımını bu noktaya kadar geciktirin (uyandıktan 90-120 dk sonra). Bu, tipik öğleden sonra çöküşünü önler.",
                        tagEn: "CAFFEINE",
                        tagSr: "KOFEIN",
                        tagTr: "KAFEİN",
                        color: "border-blue-500/10 hover:bg-blue-500/[0.02]"
                      },
                      {
                        hourOffset: 3,
                        icon: <Brain className="w-4 h-4 text-emerald-500" />,
                        titleEn: "Focus Block 1: Category A Heavy Work",
                        titleSr: "Blok fokusa 1: Kategorija A (Najteži rad)",
                        titleTr: "Odak Bloğu 1: Kategori A Ağır İşler",
                        descEn: "Your biology is primed for high neurotransmitter activity. Dive into high-leverage critical goals.",
                        descSr: "Optimalan nivo dopamina i acetilholina. Iskoristite ga za najteže i najvažnije zadatke (kategorija A).",
                        descTr: "Biyolojiniz yüksek nörotransmitter aktivitesi için hazırlanmıştır. Yüksek kaldıraçlı kritik hedeflere odaklanın.",
                        tagEn: "DEEP WORK",
                        tagSr: "DUBOKI FOKUS",
                        tagTr: "DERİN ODAK",
                        color: "border-emerald-500/10 hover:bg-emerald-500/[0.02]"
                      },
                      {
                        hourOffset: 7.5,
                        icon: <Activity className="w-4 h-4 text-[#FF9500]" />,
                        titleEn: "Postprandial Slump & Somatic Recovery",
                        titleSr: "Popodnevni pad energije & NSDR oporavak",
                        titleTr: "Yemek Sonrası Düşüş ve Somatik İyileşme",
                        descEn: "Core temperature rises, dopamine dips. Excellent window for a 10-15m NSDR session or breathing box reset.",
                        descSr: "Prirodni pad budnosti u toku popodneva. Idealno vreme za 10-15 minuta NSDR relaksacije ili kvadratnog disanja.",
                        descTr: "Vücut ısısı yükselir, dopamin düşer. 10-15 dakikalık bir NSDR seansı veya kutu nefesi için mükemmel bir zaman.",
                        tagEn: "RECOVERY / NSDR",
                        tagSr: "RESETOVANJE DAHOM",
                        tagTr: "NSDR/YENİLENME",
                        color: "border-orange-500/10 hover:bg-orange-500/[0.02]"
                      },
                      {
                        hourOffset: 14,
                        icon: <Moon className="w-4 h-4 text-indigo-500" />,
                        titleEn: "Melatonin Onset & Light Hygiene",
                        titleSr: "Lučenje melatonina i večernje opuštanje",
                        titleTr: "Melatonin Başlangıcı ve Işık Hijyeni",
                        descEn: "Block bright overhead lights. Complete your Evening Reflection and plan your goals for tomorrow.",
                        descSr: "Prigušite svetla i isključite plave ekrane. Popunite Večernju refleksiju i upišite tri cilja za sutra.",
                        descTr: "Parlak tepeden gelen ışıkları kapatın. Akşam Yansımanızı tamamlayın ve yarınki hedeflerinizi planlayın.",
                        tagEn: "WIND DOWN",
                        tagSr: "VEČERNJA REFLEKSIJA",
                        tagTr: "AKŞAM GEÇİŞİ",
                        color: "border-indigo-500/10 hover:bg-indigo-500/[0.02]"
                      }
                    ].map((item, idx) => {
                      const calculatedHour = (wakingHour + item.hourOffset) % 24;
                      const formattedTime = `${calculatedHour < 10 ? '0' : ''}${Math.floor(calculatedHour)}:00`;
                      const currentHourSystem = new Date().getHours();
                      const isActiveNow = Math.abs(currentHourSystem - calculatedHour) <= 1;

                      return (
                        <div 
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 transition-all ${item.color} ${
                            isActiveNow 
                              ? "border-[#007AFF] bg-[#007AFF]/5 text-black dark:text-white" 
                              : "border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#2C2C2E]/40"
                          }`}
                        >
                          <div className="flex items-start gap-3 text-left">
                            <span className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/5 mt-0.5 shrink-0">
                              {item.icon}
                            </span>
                            <div className="space-y-0.5 text-left">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-bold text-[13px] text-black dark:text-white leading-tight">
                                  {isEn ? item.titleEn : item.titleSr}
                                </span>
                                {isActiveNow && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500 text-white animate-pulse">
                                    {isEn ? "ACTIVE" : language === "tr" ? "AKTİF" : "TRENUTNI BLOK"}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] ${secTextClass} leading-snug font-medium`}>
                                {isEn ? item.descEn : item.descSr}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1 shrink-0 font-mono text-right">
                            <span className="text-xs font-bold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-md">
                              {formattedTime}
                            </span>
                            <span className="text-[9px] text-[#8E8E93] font-bold tracking-wider uppercase mt-1">
                              {isEn ? item.tagEn : item.tagSr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
