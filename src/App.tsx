import { useState, useEffect, useRef } from "react";
import { Task, AIRasterizedTask, SavedBoard } from "./types";
import TaskForm from "./components/TaskForm";
import FocusState from "./components/FocusState";
import MatrixOverview from "./components/MatrixOverview";
import TaskList from "./components/TaskList";
import NotificationToast from "./components/NotificationToast";
import { AmbientPlayer } from "./components/AmbientPlayer";
import PinWall from "./components/PinWall";
import {
  ListTodo,
  CheckSquare,
  Calendar,
  Sparkles,
  BookOpen,
  Clock,
  Settings,
  Volume2,
  Globe,
  Moon,
  CheckCircle,
  Sun,
  LayoutGrid,
  Users,
  ChevronDown,
  X,
  Compass,
  Brain,
  Filter,
  Activity,
  Flame,
  LogIn,
  LogOut,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, handleFirestoreError, OperationType } from "./lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  onSnapshot,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import CollabPanel from "./components/CollabPanel";
import { triggerDiscoveryEvent } from "./lib/discoveryEngine";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalNsdrFloat from "./components/GlobalNsdrFloat";
import {
  translations,
  Language,
  DEFAULT_TASKS_SR,
  DEFAULT_TASKS_EN,
} from "./translations";
import NotificationManager from "./components/NotificationManager";
import VisionStrategy from "./components/VisionStrategy";
import WheelOfLife from "./components/WheelOfLife";
import ParetoAnalyzer from "./components/ParetoAnalyzer";
import ProgressMatrix from "./components/ProgressMatrix";
import HomePortal, { TabType } from "./components/HomePortal";
import AuthModal from "./components/AuthModal";
import DopamineTracker from "./components/DopamineTracker";
import MindsetCoach from "./components/MindsetCoach";
import TacticalBreathing from "./components/TacticalBreathing";
import { ZoomableGroup } from "./components/ZoomableGroup";
import { renderCleanText } from "./lib/formatter";
import AdrenalineModal, { AdrenalineType } from "./components/AdrenalineModal";
import VoiceInputNode from "./components/VoiceInputNode";
import SettingsPanel from "./components/SettingsPanel";
import { DiscoveryLab } from "./components/DiscoveryLab";
import { getDiscoverySettings, subscribeToDiscovery, updateDiscoverySetting } from "./lib/discoveryEngine";
import EveningReflection from "./components/EveningReflection";

export interface UniversalInboxTask {
  id: string;
  title: string;
  description?: string;
  source: string;
  linkedGoal?: string;
  lifeArea?: string;
  category?: "A" | "B" | "C" | "D" | "E";
  stateContext?: string;
  emotionContext?: string;
  aiExplanation?: string;
  processed?: boolean;
}

export const getNormalizedTokens = (text: string): string[] => {
  const noDiacritics = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/dj/g, "d");
    
  return noDiacritics
    // Remove common punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    // Filter out short filler/stop words
    .filter(w => w.length > 2)
    // Simple stemming by taking the first 5 characters
    .map(w => w.length > 5 ? w.slice(0, 5) : w);
};

export const areSimilarTitles = (t1: string, t2: string): boolean => {
  const clean1 = t1.trim().toLowerCase();
  const clean2 = t2.trim().toLowerCase();
  if (clean1 === clean2) return true;

  if (clean1.includes(clean2) && clean2.length > 5) return true;
  if (clean2.includes(clean1) && clean1.length > 5) return true;

  const tokens1 = getNormalizedTokens(t1);
  const tokens2 = getNormalizedTokens(t2);
  if (tokens1.length === 0 || tokens2.length === 0) return false;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  
  const minSize = Math.min(set1.size, set2.size);
  if (minSize === 0) return false;
  
  const overlap = intersection.size / minSize;

  return overlap >= 0.6;
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

export default function App() {
  // Synchronously handle first-time visitor reset to guarantee 100% clean state on publish
  const hasOpened = safeStorage.getItem("abcde_has_opened_before");
  if (!hasOpened) {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch (e) {}
    safeStorage.clear();
    safeStorage.setItem("abcde_has_opened_before", "true");
    safeStorage.setItem("abcde_show_onboarding_tour", "true");
  }

  const [activeTab, setActiveTab] = useState<
    TabType | "home" | "mindset" | "settings"
  >("home");
  const [dopamineTrigger, setDopamineTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [newUnlockedItem, setNewUnlockedItem] = useState<any | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  const [discoverySettings, setDiscoverySettings] = useState(() => getDiscoverySettings());

  useEffect(() => {
    const unsubscribe = subscribeToDiscovery(() => {
      setDiscoverySettings(getDiscoverySettings());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
      }
    }, 10);
  }, [activeTab]);

  // Monitor Firebase Auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      setGeneralToast({
        message:
          language === "en" ? "Successfully signed in with Google!" : language === "tr" ? "Google'da başarıyla oturum açıldı!" : "Uspešno ste se prijavili preko Google naloga!",
        type: "success",
      });
    } catch (err: any) {
      console.error("Sign in error:", err);
      setGeneralToast({
        message:
          language === "en" ? `Sign-in failed: ${err.message}` : language === "tr" ? `Oturum açma başarısız oldu: ${err.message}` : `Greška pri prijavi: ${err.message}`,
        type: "error",
      });
      throw err;
    }
  };

  const handleEmailSignUp = async (
    email: string,
    pass: string,
    name: string,
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pass,
    );
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      setCurrentUser({ ...userCredential.user, displayName: name });
    }
    setGeneralToast({
      message:
        language === "en" ? "Successfully registered account!" : language === "tr" ? "Hesap başarıyla kaydedildi!" : "Nalog je uspešno registrovan!",
      type: "success",
    });
  };

  const handleEmailSignIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    setGeneralToast({
      message:
        language === "en" ? "Successfully signed in with Email!" : language === "tr" ? "E-posta ile başarıyla oturum açıldı!" : "Uspešno ste se prijavili sa email-om!",
      type: "success",
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setGeneralToast({
        message:
          language === "en" ? "Signed out successfully!" : language === "tr" ? "Oturum başarıyla kapatıldı!" : "Uspešno ste se odjavili!",
        type: "success",
      });
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  };

  const handleResetUserData = async () => {
    if (!currentUser) return;
    try {
      const tasksCol = collection(db, "users", currentUser.uid, "tasks");
      const tasksSnapshot = await getDocs(tasksCol);
      const batch = writeBatch(db);
      tasksSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      const archiveCol = collection(db, "users", currentUser.uid, "archive");
      const archiveSnapshot = await getDocs(archiveCol);
      archiveSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      console.log("Cleared active user Firestore data.");
    } catch (err) {
      console.error("Failed to delete user's firestore data:", err);
    }
  };

  useEffect(() => {
    const handleDopamineUpdate = () => {
      setDopamineTrigger((prev) => prev + 1);
    };
    window.addEventListener("dopamine-updated", handleDopamineUpdate);
    window.addEventListener("companion-sync", handleDopamineUpdate);
    window.addEventListener("storage_sync", handleDopamineUpdate);
    return () => {
      window.removeEventListener("dopamine-updated", handleDopamineUpdate);
      window.removeEventListener("companion-sync", handleDopamineUpdate);
      window.removeEventListener("storage_sync", handleDopamineUpdate);
    };
  }, []);

  const getDopamineStatus = () => {
    // Reference a reactive trigger state to force recalculation on storage changes
    const _forceReload = dopamineTrigger;
    const focusLevel = Number(
      safeStorage.getItem("abcde_dopamine_focusLevel") || "5",
    );
    const stimulation = Number(
      safeStorage.getItem("abcde_dopamine_stimulation") || "5",
    );
    const restfulness = Number(
      safeStorage.getItem("abcde_dopamine_restfulness") || "5",
    );

    const f = focusLevel;
    const s = stimulation;
    const r = restfulness;

    let state: "spiked" | "low" | "balanced" = "balanced";
    let finalScore = 50;

    if (s >= 7 || (s >= 6 && f <= 5)) {
      state = "spiked";
      finalScore = Math.min(100, Math.round(70 + (s - 6) * 7.5));
    } else if (f <= 4 || r <= 4) {
      state = "low";
      finalScore = Math.max(10, Math.round(10 + r * 2 + f * 2 + s * 1.5));
    } else {
      state = "balanced";
      // for perfect peace (f=10, r=10), we drift slightly above 40, to around 50
      finalScore = Math.min(60, Math.round(40 + (f - 5) * 2 + (10 - s)));
    }

    return { state, score: finalScore };
  };

  const dopamineStatus = getDopamineStatus();

  const [mindsetInitialThought, setMindsetInitialThought] =
    useState<string>("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [boardSubTab, setBoardSubTab] = useState<"matrix" | "add" | "list">(
    "matrix",
  );
  const [isBrainDumpProcessing, setIsBrainDumpProcessing] = useState(false);
  const [collabExpanded, setCollabExpanded] = useState(false);
  const [adrenalineTrigger, setAdrenalineTrigger] =
    useState<AdrenalineType | null>(null);

  const checkAdrenalineReward = () => {
    const today = new Date().toISOString().split("T")[0];
    const hour = new Date().getHours();

    let triggeredType: AdrenalineType = null;

    // Morning: 5 AM to 11 AM
    if (hour >= 5 && hour < 12) {
      if (!safeStorage.getItem(`adrenaline_morning_${today}`)) {
        safeStorage.setItem(`adrenaline_morning_${today}`, "true");
        triggeredType = "morning";
      }
    }

    // Evening: 18 PM to 23 PM
    if (hour >= 18 && hour <= 23) {
      if (!safeStorage.getItem(`adrenaline_evening_${today}`)) {
        safeStorage.setItem(`adrenaline_evening_${today}`, "true");
        triggeredType = "evening";
      }
    }

    if (triggeredType) {
      setAdrenalineTrigger(triggeredType);
    }
  };

  useEffect(() => {
    window.addEventListener("trigger-adrenaline", checkAdrenalineReward);
    return () =>
      window.removeEventListener("trigger-adrenaline", checkAdrenalineReward);
  }, []);

  useEffect(() => {
    setModuleZoom(1.0);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("board") || urlParams.get("boardId") || null;
  });

  const [language, setLanguage] = useState<Language>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang");
    if (urlLang === "en" || urlLang === "sr") return urlLang;
    const saved = safeStorage.getItem("abcde_lang");
    return (saved as Language) || "sr";
  });

  const [universalInbox, setUniversalInbox] = useState<UniversalInboxTask[]>(
    () => {
      try {
        const saved = safeStorage.getItem("abcde_universal_inbox");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    },
  );

  const [kaizenState, setKaizenState] = useState<
    "OVERLOADED" | "DRAINED" | "FOCUSED" | "BALANCED"
  >(() => {
    return (safeStorage.getItem("abcde_kaizen_state") as any) || "BALANCED";
  });

  useEffect(() => {
    safeStorage.setItem(
      "abcde_universal_inbox",
      JSON.stringify(universalInbox),
    );
  }, [universalInbox]);

  useEffect(() => {
    safeStorage.setItem("abcde_kaizen_state", kaizenState);
  }, [kaizenState]);

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const boardId =
        urlParams.get("board") || urlParams.get("boardId") || null;
      const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
      const saved = safeStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((t) => t && t.title) : [];
      }
    } catch (e) {}
    return [];
  });

  const t = translations[language];

  const [appFontSize, setAppFontSize] = useState<
    "standard" | "large" | "extra"
  >(() => {
    return (
      (safeStorage.getItem("komorebi_font_size") as
        | "standard"
        | "large"
        | "extra") || "standard"
    );
  });

  const [moduleZoom, setModuleZoom] = useState<number>(1.0);

  useEffect(() => {
    safeStorage.setItem("komorebi_font_size", appFontSize);

    let scalePercent = "112%";
    let headerScale = "1rem";
    if (appFontSize === "large") {
      scalePercent = "132%";
      headerScale = "0.88rem";
    } else if (appFontSize === "extra") {
      scalePercent = "155%";
      headerScale = "0.74rem";
    }

    // 1. Direct inline styling on root
    const root = document.documentElement;
    root.style.fontSize = scalePercent;

    // 2. Dynamic style tag injection to override any deep CSS or iframe-derived style constraints with high specificity
    let styleEl = document.getElementById("dynamic-font-scale-block");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-font-scale-block";
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
 html {
 font-size: ${scalePercent} !important;
 }
 /* Ensure header scales gently to prevent elements from wrapping under the branding logo */
 header {
 font-size: ${headerScale} !important;
 }
 `;
  }, [appFontSize]);

  const [activeAlarms, setActiveAlarms] = useState<
    { id: string; taskTitle: string; time: string }[]
  >([]);
  const [triggeredAlarmKeys, setTriggeredAlarmKeys] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clear advisor advice history and processed tasks on app startup
  useEffect(() => {
    safeStorage.removeItem("mindset_nlp_history_v2");
    safeStorage.removeItem("mindset_omni_history_v2");
    safeStorage.removeItem("mindset_biohack_history_v2");
    safeStorage.removeItem("mindset_ta_history_v2");
    safeStorage.removeItem("abcde_processed_tasks_preview");
    safeStorage.removeItem("abcde_ai_recommended_habits");
    
    // Clear Vault / Arhiva
    safeStorage.removeItem("abcde_tasks_archive");
    safeStorage.removeItem("kaizen_morning_resets_history");
    safeStorage.removeItem("mindset_nlp_history_v2");
    safeStorage.removeItem("mindset_rebt_history_v2");
    safeStorage.removeItem("mindset_biohack_history_v2");
    safeStorage.removeItem("mindset_ta_history_v2");
    
    // Reset Dopamine Tracker (Laboratorija Uma i Dopamina)
    safeStorage.setItem("abcde_dopamine_focusLevel", "0");
    safeStorage.setItem("abcde_dopamine_stimulation", "0");
    safeStorage.setItem("abcde_dopamine_restfulness", "0");
    safeStorage.setItem("dopamine_audit_completed", "false");
    safeStorage.removeItem("dopamine_decisions");
    
    // Reset Wheel of Life (Krug života)
    safeStorage.removeItem("abcde_wheel_categories");
    safeStorage.removeItem("abcde_wheel_scores");

    window.dispatchEvent(new Event("trigger-hard-reset"));
  }, []);

  // Ask for notification permission on start
  useEffect(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        const promise = Notification.requestPermission();
        if (promise && typeof promise.then === "function") {
          promise.catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Notification request permission error:", e);
    }
  }, []);

  // Listen for custom tab switching events (helps our pet companions navigate users)
  useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (
          typeof customEvent.detail === "object" &&
          customEvent.detail.tab === "mindset"
        ) {
          setMindsetInitialThought(customEvent.detail.thought || "");
          setActiveTab("mindset");
        } else {
          setActiveTab(customEvent.detail);
        }
      }
    };
    window.addEventListener("switch-tab", handleSwitchTab);

    const handleHardReset = () => {
      setTasks([]);
      setUniversalInbox([]);
      setCurrentBoardId(null);

      // Perform an absolute master wipe of both local storage and session storage
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch (e) {}
      safeStorage.clear();
      safeStorage.setItem("abcde_has_opened_before", "true");
      safeStorage.setItem("abcde_show_onboarding_tour", "true");

      // Sign out current user
      try {
        signOut(auth).catch((authErr) => {
          console.error("Auth signout error during hard reset:", authErr);
        });
      } catch (authErr) {
        console.error("Auth signout exception during hard reset:", authErr);
      }

      // Sync active components instantly
      window.dispatchEvent(new Event("companion-sync"));

      // Finally, reload the browser to ensure all react states are fully reset to their initial configuration
      setTimeout(() => {
        window.location.reload();
      }, 50);
    };
    window.addEventListener("trigger-hard-reset", handleHardReset);

    const handleOpenAuthGlobal = () => {
      setShowAuthModal(true);
    };
    window.addEventListener("open-auth", handleOpenAuthGlobal);

    return () => {
      window.removeEventListener("switch-tab", handleSwitchTab);
      window.removeEventListener("trigger-hard-reset", handleHardReset);
      window.removeEventListener("open-auth", handleOpenAuthGlobal);
    };
  }, []);

  // Listen for custom trigger-toast events to allow decoupled sub-components to fire feedback toasts
  useEffect(() => {
    const handleTriggerToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.message) {
        setGeneralToast({
          message: customEvent.detail.message,
          type: customEvent.detail.type || "success",
        });
      }
    };
    
    const handleDiscoveryUnlock = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.name) {
        setNewUnlockedItem(customEvent.detail);
      }
    };

    window.addEventListener("trigger-toast", handleTriggerToastEvent);
    window.addEventListener("discovery_new_unlock", handleDiscoveryUnlock);
    
    return () => {
      window.removeEventListener("trigger-toast", handleTriggerToastEvent);
      window.removeEventListener("discovery_new_unlock", handleDiscoveryUnlock);
    };
  }, [language]);

  // Local directory and security PIN states
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>(() => {
    try {
      const saved = safeStorage.getItem("abcde_saved_boards");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [unlockedBoards, setUnlockedBoards] = useState<string[]>([]);
  const [appPin, setAppPin] = useState(() => {
    return safeStorage.getItem("abcde_app_pin") || "";
  });
  const [isExpandedAdvice, setIsExpandedAdvice] = useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [generalToast, setGeneralToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  const [duplicateTaskWarning, setDuplicateTaskWarning] = useState<{
    isOpen: boolean;
    taskData: any;
    existingTaskTitle: string;
  } | null>(null);

  useEffect(() => {
    if (generalToast) {
      const timer = setTimeout(() => {
        setGeneralToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [generalToast]);

  useEffect(() => {
    const handleFirestoreErrorToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setGeneralToast(customEvent.detail);
      }
    };
    window.addEventListener("firestore-error-toast", handleFirestoreErrorToast);
    return () => {
      window.removeEventListener("firestore-error-toast", handleFirestoreErrorToast);
    };
  }, []);

  // Evening Reflection states
  const [eveningWin, setEveningWin] = useState(() => {
    if (safeStorage.getItem("abcde_day_locked") === "true") return "";
    return safeStorage.getItem("abcde_evening_win") || "";
  });
  const [eveningLoss, setEveningLoss] = useState(() => {
    if (safeStorage.getItem("abcde_day_locked") === "true") return "";
    return safeStorage.getItem("abcde_evening_loss") || "";
  });
  const [eveningAdvice, setEveningAdvice] = useState(
    () => safeStorage.getItem("abcde_evening_advice") || "",
  );
  const [isEveningProcessing, setIsEveningProcessing] = useState(false);
  const [isEveningExpanded, setIsEveningExpanded] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = useRef(0);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY <= 10) {
      setIsScrolledDown(false);
      lastScrollY.current = currentScrollY;
      return;
    }
    if (currentScrollY > lastScrollY.current + 8) {
      setIsScrolledDown(true);
    } else if (currentScrollY < lastScrollY.current - 12) {
      setIsScrolledDown(false);
    }
    lastScrollY.current = currentScrollY;
  };

  const [isDayLocked, setIsDayLocked] = useState(
    () => safeStorage.getItem("abcde_day_locked") === "true",
  );

  const [bedtimePrep, setBedtimePrep] = useState<{
    noScreens: boolean;
    coolRoom: boolean;
    valerianOrTea: boolean;
    breath478: boolean;
  }>(() => {
    try {
      const saved = safeStorage.getItem("abcde_bedtime_prep");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      noScreens: false,
      coolRoom: false,
      valerianOrTea: false,
      breath478: false,
    };
  });

  const handleToggleBedtime = (
    key: "noScreens" | "coolRoom" | "valerianOrTea" | "breath478",
  ) => {
    setBedtimePrep((prev) => {
      const current = { ...prev, [key]: !prev[key] };
      safeStorage.setItem("abcde_bedtime_prep", JSON.stringify(current));
      return current;
    });
  };

  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">(() => {
    return (
      (safeStorage.getItem("abcde_theme_mode") as "auto" | "light" | "dark") ||
      "auto"
    );
  });

  const [followSystemTheme, setFollowSystemTheme] = useState<boolean>(() => {
    const saved = safeStorage.getItem("abcde_follow_system_theme");
    return saved !== null ? saved === "true" : true;
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPrefersDark(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handler);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler);
      } else if ((mediaQuery as any).removeListener) {
        (mediaQuery as any).removeListener(handler);
      }
    };
  }, []);

  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [forceMorningHub, setForceMorningHub] = useState(false);
  const [autoProcessVoice, setAutoProcessVoice] = useState<boolean>(() => {
    const saved = safeStorage.getItem("abcde_auto_process_voice");
    return saved !== null ? saved === "true" : false;
  });

  const [sunriseTime, setSunriseTime] = useState(
    () => safeStorage.getItem("abcde_sunrise_time") || "06:00",
  );
  const [sunsetTime, setSunsetTime] = useState(
    () => safeStorage.getItem("abcde_sunset_time") || "20:30",
  );

  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.trim().split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const sunriseMinutes = parseTimeToMinutes(sunriseTime);
  const sunsetMinutes = parseTimeToMinutes(sunsetTime);

  // Night/Evening is active outside sunrise/sunset window
  const isNightTime =
    currentMinutes < sunriseMinutes || currentMinutes >= sunsetMinutes;

  // Decide if visual theme styling is dark or light
  const isDarkUi =
    themeMode === "dark" ||
    (themeMode === "auto" && (followSystemTheme ? systemPrefersDark : isNightTime));

  // Decide if the physical Evening Reflection view is active on the Home tab
  const isEvening = isNightTime && !forceMorningHub;
  const isMorning = !isNightTime && currentTime.getHours() < 12;

  // Sync Tailwind CSS dark mode class dynamically with the computed isDarkUi state
  useEffect(() => {
    if (isDarkUi) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkUi]);

  // Day lock status automatically managed based on active daytime hours

  const handleSendEveningReflection = async () => {
    setIsEveningProcessing(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const filteredTasks = tasks.filter((t) => {
        if (!t.done) return true; // keep active tasks for context
        if (!t.completedTime) return false; // filter out old tasks without completedTime
        return new Date(t.completedTime) >= todayStart;
      });

      const response = await fetch("/api/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisorId: "marta",
          message: `JA: Danas sam ostvario pobedu: "${eveningWin}". Energiju sam prosuo ovde: "${eveningLoss}". Daj mi koristan savet za bolju higijenu sna i zatvaranje dana.`,
          tasks: filteredTasks,
          language,
          aiTone: "default",
        }),
      });

      if (!response.ok) throw new Error("Reflection advice failed");
      const data = await response.json();
      const adviceText =
        data.text ||
        "Zatvori oči, opusti ramena i duboko udahni. Tvoj Saputnik te čuva.";

      setEveningAdvice(adviceText);
      safeStorage.setItem("abcde_evening_advice", adviceText);
      safeStorage.setItem("abcde_evening_win", eveningWin);
      safeStorage.setItem("abcde_evening_loss", eveningLoss);

      // Empty text fields as soon as analysis is received
      setEveningWin("");
      setEveningLoss("");

      setIsDayLocked(true);
      safeStorage.setItem("abcde_day_locked", "true");
      
      triggerDiscoveryEvent("evening_reflection_streak");

      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error(e);
    } finally {
      setIsEveningProcessing(false);
    }
  };

  const handleUnlockDay = () => {
    safeStorage.removeItem("abcde_day_locked");
    safeStorage.removeItem("abcde_evening_advice");
    safeStorage.removeItem("abcde_evening_win");
    safeStorage.removeItem("abcde_evening_loss");
    setIsDayLocked(false);
    setEveningAdvice("");
    setEveningWin("");
    setEveningLoss("");
    window.dispatchEvent(new Event("storage"));
  };

  // Unlocking day lock status automatically during daytime
  useEffect(() => {
    if (!isNightTime && safeStorage.getItem("abcde_day_locked") === "true") {
      handleUnlockDay();
    }
  }, [isNightTime]);

  // Global Zoom State for cards & fine print representation
  const [globalZoomData, setGlobalZoomData] = useState<{
    title: string;
    subtitle?: string;
    content: React.ReactNode | string;
    emoji?: string;
  } | null>(null);

  useEffect(() => {
    const handleGlobalZoom = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setGlobalZoomData(customEvent.detail);
      }
    };
    (window as any).triggerGlobalZoom = (
      title: string,
      content: React.ReactNode | string,
      emoji?: string,
      subtitle?: string,
    ) => {
      window.dispatchEvent(
        new CustomEvent("trigger-global-zoom", {
          detail: { title, content, emoji, subtitle },
        }),
      );
    };
    window.addEventListener("trigger-global-zoom", handleGlobalZoom);
    return () => {
      window.removeEventListener("trigger-global-zoom", handleGlobalZoom);
      delete (window as any).triggerGlobalZoom;
    };
  }, []);



  const fallbackCopyApp = (text: string): boolean => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return !!successful;
    } catch (err) {
      console.error("Fallback copy failed: ", err);
      return false;
    }
  };

  const handleCopyPublicAppLink = () => {
    let shareUrl =
      "https://ai.studio/apps/5a58e7bf-e554-4acd-a888-0e5b63aad263";
    if (currentBoardId) {
      shareUrl += `?board=${currentBoardId}`;
    }

    const triggerSuccessStates = () => {
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 4500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          triggerSuccessStates();
        })
        .catch(() => {
          if (fallbackCopyApp(shareUrl)) {
            triggerSuccessStates();
          }
        });
    } else {
      if (fallbackCopyApp(shareUrl)) {
        triggerSuccessStates();
      }
    }
  };

  // Sync security parameters dynamically when changed in sub-settings
  useEffect(() => {
    const handlePinChange = () => {
      setAppPin(safeStorage.getItem("abcde_app_pin") || "");
    };

    const handleSavedBoardsChange = () => {
      try {
        const saved = safeStorage.getItem("abcde_saved_boards");
        setSavedBoards(saved ? JSON.parse(saved) : []);
      } catch (e) {
        setSavedBoards([]);
      }
    };

    window.addEventListener("local-pin-changed", handlePinChange);
    window.addEventListener("saved-boards-changed", handleSavedBoardsChange);

    return () => {
      window.removeEventListener("local-pin-changed", handlePinChange);
      window.removeEventListener(
        "saved-boards-changed",
        handleSavedBoardsChange,
      );
    };
  }, []);

  // Save to LocalStorage under separate namespaces to ensure total persistence of both offline and collaborative tasks
  useEffect(() => {
    const key = currentBoardId
      ? `abcde_tasks_${currentBoardId}`
      : "abcde_tasks";
    safeStorage.setItem(key, JSON.stringify(tasks));
  }, [tasks, currentBoardId]);

  // Keep live clock updated
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Synchronize habits to task list every morning & upon changes
  useEffect(() => {
    const syncHabitsToTasks = () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Refresh tasks state from storage
        const boardId = new URLSearchParams(window.location.search).get("board");
        const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
        const tasksRaw = safeStorage.getItem(key) || "[]";
        let tasksLocal = JSON.parse(tasksRaw);

        // 2. Sync habit completion status from logs
        const logsRaw = safeStorage.getItem("abcde_calendar_logs");
        const habitsRaw = safeStorage.getItem("abcde_calendar_habits");
        
        if (logsRaw && habitsRaw) {
          const logs = JSON.parse(logsRaw);
          const habits = JSON.parse(habitsRaw);
          const todayLogs = logs[todayStr] || [];
          
          tasksLocal = tasksLocal.map((t: any) => {
            if (t.isHabit && t.habitId) {
              const isDone = todayLogs.includes(t.habitId);
              if (t.done !== isDone) {
                return { ...t, done: isDone };
              }
            }
            return t;
          });
          safeStorage.setItem(key, JSON.stringify(tasksLocal));
        }

        // 3. Reset completed recurring tasks if calendar day changed
        const lastReset = safeStorage.getItem("abcde_last_repeat_reset_date");
        if (lastReset !== todayStr) {
          tasksLocal = tasksLocal.map((task: any) => {
              if (task.done && task.repeat) {
                if (task.repeat === "daily") {
                  return {
                    ...task,
                    done: false,
                    createdTime: new Date().toISOString(),
                  };
                } else if (task.repeat === "weekly") {
                  const daysDiff =
                    (Date.now() - new Date(task.createdTime).getTime()) /
                    (1000 * 60 * 60 * 24);
                  if (daysDiff >= 7) {
                    return {
                      ...task,
                      done: false,
                      createdTime: new Date().toISOString(),
                    };
                  }
                } else if (task.repeat === "monthly") {
                  const daysDiff =
                    (Date.now() - new Date(task.createdTime).getTime()) /
                    (1000 * 60 * 60 * 24);
                  if (daysDiff >= 30) {
                    return {
                      ...task,
                      done: false,
                      createdTime: new Date().toISOString(),
                    };
                  }
                }
              }
              return task;
            });
          safeStorage.setItem("abcde_last_repeat_reset_date", todayStr);
          safeStorage.setItem(key, JSON.stringify(tasksLocal));
        }
        
        // 4. Add missing habits
        const habitsSaved = safeStorage.getItem("abcde_calendar_habits");
        if (habitsSaved) {
          const habitsList = JSON.parse(habitsSaved);
          if (Array.isArray(habitsList) && habitsList.length > 0) {
            const activeHabits = habitsList.filter((h: any) => h && h.name);
            if (activeHabits.length > 0) {
              let addedAny = false;

              activeHabits.forEach((habit: any) => {
                const alreadyExists = tasksLocal.some(
                  (t: any) =>
                    t.habitId === habit.id ||
                    (t.isHabit && t.title.includes(habit.name)),
                );
                if (!alreadyExists) {
                  const titleValue =
                    language === "en" ? `⚡ ${habit.isTwoMinActive ? "[Micro-routine]" : "[Habit]"} ${habit.isTwoMinActive ? habit.twoMinVersion : habit.name}` : language === "tr" ? `⚡ ${habit.isTwoMinActive ? "[Micro-routine]" : "[Habit]"} ${habit.isTwoMinActive ? habit.twoMinVersion : habit.name}` : `⚡ ${habit.isTwoMinActive ? "[Mikro-korak]" : "[Navika]"} ${habit.isTwoMinActive ? habit.twoMinVersion : habit.name}`;

                  const newTask = {
                    id: "task-habit-" + habit.id + "-" + Date.now(),
                    title: titleValue,
                    category: "A" as const,
                    subPriority:
                      tasksLocal.filter((t: any) => t.category === "A").length + 1,
                    done: false,
                    isHabit: true,
                    habitId: habit.id,
                    createdTime: new Date().toISOString(),
                  };
                  tasksLocal.push(newTask);
                  addedAny = true;
                }
              });
              
              if (addedAny) {
                safeStorage.setItem("abcde_last_habit_sync_date", todayStr);
                safeStorage.setItem(key, JSON.stringify(tasksLocal));
              }
            }
          }
        }

        // 5. Update tasks state exactly once in a single unified operation
        setTasks(tasksLocal);
      } catch (err) {
        console.error("Greška pri sinhronizaciji jutarnjih navika:", err);
      }
    };

    // Run on mount
    syncHabitsToTasks();

    // Listen to local storage sync event
    window.addEventListener("storage_sync", syncHabitsToTasks);
    return () => {
      window.removeEventListener("storage_sync", syncHabitsToTasks);
    };
  }, [language]);

  // Sync window URL with currentBoardId state
  const handleJoinBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
    try {
      const newUrl = `${window.location.origin}${window.location.pathname}?board=${boardId}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
    } catch (e) {
      console.warn("Could not pushState:", e);
    }
    // Load board tasks from safeStorage immediately to prevent layout shifts before Firestore replies
    try {
      const saved = safeStorage.getItem(`abcde_tasks_${boardId}`);
      setTasks(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setTasks([]);
    }
  };

  const handleLeaveBoard = () => {
    setCurrentBoardId(null);
    try {
      const newUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
    } catch (e) {
      console.warn("Could not pushState:", e);
    }
    // Reload local tasks from safeStorage
    try {
      const saved = safeStorage.getItem("abcde_tasks");
      setTasks(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setTasks([]);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    safeStorage.setItem("abcde_lang", newLang);
  };

  // Helper: ensure collaboration board doc exists in Firestore
  const ensureBoardExists = async (boardId: string) => {
    try {
      const boardRef = doc(db, "boards", boardId);
      await setDoc(
        boardRef,
        {
          id: boardId,
          name: `Tabla ${boardId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `boards/${boardId}`);
      } catch (logErr) {
        console.warn("Muted background Firestore CREATE error to prevent unhandledrejection:", logErr);
      }
    }
  };

  // Helper: Get Firestore path for a task
  const getTaskDocRef = (taskId: string) => {
    if (currentBoardId) {
      return doc(db, "boards", currentBoardId, "tasks", taskId);
    } else if (currentUser) {
      return doc(db, "users", currentUser.uid, "tasks", taskId);
    }
    return null;
  };

  // Helper: Save general tasks list to Firestore under active board or active user account
  const saveTasksListToFirestore = async (list: Task[]) => {
    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;
    if (!isCollab && !isUser) return;

    try {
      if (isCollab) {
        await ensureBoardExists(currentBoardId);
      }
      const batch = writeBatch(db);
      list.forEach((t) => {
        const ref = getTaskDocRef(t.id);
        if (ref) {
          batch.set(ref, {
            id: t.id,
            title: t.title,
            description: t.description || "",
            category: t.category,
            subPriority: t.subPriority,
            done: t.done,
            createdTime: t.createdTime || new Date().toISOString(),
            reminderTime: t.reminderTime || "",
            deadline: t.deadline || "",
            delegatedTo: t.delegatedTo || "",
            eliminationReason: t.eliminationReason || "",
            aiSuggested: !!t.aiSuggested,
            aiExplanation: t.aiExplanation || "",
            repeat: t.repeat || "",
            ownerId: isUser ? currentUser.uid : "",
          });
        }
      });
      await batch.commit();
    } catch (err) {
      const path = isCollab
        ? `boards/${currentBoardId}/tasks`
        : `users/${currentUser?.uid}/tasks`;
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Helper: Delete single task doc from Firestore
  const deleteTaskFromFirestore = async (taskId: string) => {
    const ref = getTaskDocRef(taskId);
    if (ref) {
      try {
        await deleteDoc(ref);
      } catch (err) {
        const path = currentBoardId
          ? `boards/${currentBoardId}/tasks/${taskId}`
          : `users/${currentUser?.uid}/tasks/${taskId}`;
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  // Listen to Firestore tasks for logged-in user if not on a shared board
  useEffect(() => {
    if (!currentUser || currentBoardId) return;

    const userTasksCol = collection(db, "users", currentUser.uid, "tasks");
    const q = query(userTasksCol);

    let isInitial = true;
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const taskList: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          taskList.push({
            id: doc.id,
            title: data.title || "",
            description: data.description || undefined,
            category: data.category as "A" | "B" | "C" | "D" | "E",
            subPriority: data.subPriority || 1,
            done: !!data.done,
            createdTime: data.createdTime || new Date().toISOString(),
            reminderTime: data.reminderTime || undefined,
            deadline: data.deadline || undefined,
            delegatedTo: data.delegatedTo || undefined,
            eliminationReason: data.eliminationReason || undefined,
            aiSuggested: !!data.aiSuggested,
            aiExplanation: data.aiExplanation || undefined,
            repeat: data.repeat || undefined,
          });
        });

        // On first load, if remote collection is empty but we have local tasks,
        // upload local tasks to Firestore to keep them persistent and avoid empty state!
        if (isInitial && taskList.length === 0) {
          isInitial = false;
          const localTasksRaw = safeStorage.getItem("abcde_tasks");
          let localTasks: Task[] = [];
          try {
            localTasks = localTasksRaw ? JSON.parse(localTasksRaw) : [];
            if (!Array.isArray(localTasks)) localTasks = [];
          } catch (e) {
            localTasks = [];
          }
          if (localTasks.length > 0) {
            const batch = writeBatch(db);
            localTasks.forEach((tItem) => {
              const docRef = doc(
                db,
                "users",
                currentUser.uid,
                "tasks",
                tItem.id,
              );
              batch.set(docRef, {
                title: tItem.title,
                description: tItem.description || "",
                category: tItem.category,
                subPriority: tItem.subPriority,
                done: tItem.done,
                createdTime: tItem.createdTime || new Date().toISOString(),
                reminderTime: tItem.reminderTime || "",
                deadline: tItem.deadline || "",
                delegatedTo: tItem.delegatedTo || "",
                eliminationReason: tItem.eliminationReason || "",
                aiSuggested: !!tItem.aiSuggested,
                aiExplanation: tItem.aiExplanation || "",
                repeat: tItem.repeat || "",
                ownerId: currentUser.uid,
              });
            });
            try {
              await batch.commit();
            } catch (err) {
              console.error("Failed to commit initial user batch upload:", err);
            }
            return;
          }
        }
        isInitial = false;

        const sortedTaskList = [...taskList].sort((a, b) => {
          const catA = a.category || "";
          const catB = b.category || "";
          if (catA !== catB) {
            return catA.localeCompare(catB);
          }
          return (a.subPriority || 0) - (b.subPriority || 0);
        });
        setTasks(sortedTaskList);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${currentUser.uid}/tasks`,
        );
      },
    );

    return () => unsubscribe();
  }, [currentUser, currentBoardId]);

  // Listen to Firestore tasks in real-time if collab is enabled
  useEffect(() => {
    if (!currentBoardId) return;

    // Proactively initialize board representation
    ensureBoardExists(currentBoardId).catch((err) => {
      console.error("Failed to proactively initialize board:", err);
    });

    const q = query(collection(db, "boards", currentBoardId, "tasks"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const taskList: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          taskList.push({
            id: doc.id,
            title: data.title || "",
            description: data.description || undefined,
            category: data.category as "A" | "B" | "C" | "D" | "E",
            subPriority: data.subPriority || 1,
            done: !!data.done,
            createdTime: data.createdTime || new Date().toISOString(),
            reminderTime: data.reminderTime || undefined,
            deadline: data.deadline || undefined,
            delegatedTo: data.delegatedTo || undefined,
            eliminationReason: data.eliminationReason || undefined,
            aiSuggested: !!data.aiSuggested,
            aiExplanation: data.aiExplanation || undefined,
            repeat: data.repeat || undefined,
          });
        });
        // Sort tasks locally to match current priority values (Category: A to E, then SubPriority ascending)
        const sortedTaskList = [...taskList].sort((a, b) => {
          const catA = a.category || "";
          const catB = b.category || "";
          if (catA !== catB) {
            return catA.localeCompare(catB);
          }
          return (a.subPriority || 0) - (b.subPriority || 0);
        });
        setTasks(sortedTaskList);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `boards/${currentBoardId}/tasks`,
        );
      },
    );

    return () => unsubscribe();
  }, [currentBoardId]);

  // Periodic alarm checks triggered safely on currentTime update
  useEffect(() => {
    const currentHHMM = currentTime.toTimeString().slice(0, 5); // Format "HH:MM"

    tasks.forEach((task) => {
      if (!task.done && task.reminderTime === currentHHMM) {
        const alarmKey = `${task.id}_${currentHHMM}`;
        if (!triggeredAlarmKeys.includes(alarmKey)) {
          // Add to system state active alarms with priority category included
          setActiveAlarms((prev) => [
            ...prev,
            {
              id: task.id,
              taskTitle: task.title,
              time: currentHHMM,
              category: task.category,
            },
          ]);
          // Track that it has already keyed in so we never trigger it again in this minute
          setTriggeredAlarmKeys((prev) => [...prev, alarmKey]);

          // Display Native browser notification if allowed
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              const categoryLabel = task.category
                ? ` [${task.category.toUpperCase()}]`
                : "";
              const notificationTitle =
                language === "en" ? `Task Reminder${categoryLabel}! ⏰` : language === "tr" ? `Görev Hatırlatıcı${categoryLabel}! ⏰` : `Podsetnik za zadatak${categoryLabel}! ⏰`;

              // Generate tailored advice matching the user's focus requirement
              let adviceBody = "";
              const isEn = language === "en";
              const cat = (task.category || "A").toUpperCase();
              if (cat === "A") {
                adviceBody = isEn ? "CRITICAL PRIORITY: Focus 100% of your energy and crush this goal! 🎯" : language === "tr" ? "KRİTİK ÖNCELİK: Enerjinizin %100'üne odaklanın ve bu hedefi ezin! 🎯" : "KLJUČNI PRIORITET: Fokusiraj svu svoju energiju i reši ovo odmah! 🎯";
              } else if (cat === "B") {
                adviceBody = isEn ? "HIGH LEVERAGE: Dedicate a clean, uninterrupted block to make progress! ⚡" : language === "tr" ? "YÜKSEK KALDIRAÇ: İlerleme kaydetmek için temiz, kesintisiz bir blok ayırın! ⚡" : "VAŽAN ZADATAK: Odvoj čist, neometan vremenski blok za napredak! ⚡";
              } else if (cat === "C") {
                adviceBody = isEn ? "QUICK ACTION: Keep it simple, get it done, and preserve active energy! ⏳" : language === "tr" ? "HIZLI EYLEM: Basit tutun, tamamlayın ve aktif enerjiyi koruyun! ⏳" : "LAGAN ZADATAK: Odradi brzo i jednostavno, sačuvaj kognitivnu snagu! ⏳";
              } else {
                adviceBody = isEn ? "Protect your schedule and complete or delegate this task. 👥" : language === "tr" ? "Programınızı koruyun ve bu görevi tamamlayın veya devredin. 👥" : "Zaštiti svoj raspored i završi ili delegiraj ovaj zadatak. 👥";
              }

              new Notification(notificationTitle, {
                body: `"${task.title}" (${currentHHMM})\n${adviceBody}`,
                tag: task.id,
                requireInteraction: true,
              });
            } catch (err) {
              console.warn("Failed to dispatch browser notification:", err);
            }
          }
        }
      }
    });
  }, [tasks, currentTime, triggeredAlarmKeys, language]);

  // Recalculate / Close gaps in subPriorities inside a single category
  // This maintains strict consecutive ranks: 1, 2, 3...
  const normalizeSubPriorities = (
    taskList: Task[],
    category: "A" | "B" | "C" | "D" | "E",
  ): Task[] => {
    const isMatched = (t: Task) => t.category === category && !t.done;
    const isCompletedMatched = (t: Task) => t.category === category && t.done;

    // Normalize active tasks first (1, 2, 3...)
    const normalizedActive = taskList
      .filter(isMatched)
      .sort((a, b) => a.subPriority - b.subPriority)
      .map((t, idx) => ({ ...t, subPriority: idx + 1 }));

    // Keep completed tasks inside categories stacked with separate index rank or normal order
    const normalizedCompleted = taskList
      .filter(isCompletedMatched)
      .sort((a, b) => a.subPriority - b.subPriority)
      .map((t, idx) => ({ ...t, subPriority: idx + 1 }));

    // Recombine back with other categories' tasks
    const otherTasks = taskList.filter((t) => t.category !== category);

    return [...otherTasks, ...normalizedActive, ...normalizedCompleted];
  };

  const handleSendToMichaelVance = async (rawText: string) => {
    setIsBrainDumpProcessing(true);
    try {
      let stateContext = "neutralno";
      let emotionContext = "normalno";
      
      if (kaizenState === "DRAINED") {
        stateContext = "umoran, nizak fokus, niska energija";
        emotionContext = "iscrpljeno";
      } else if (kaizenState === "OVERLOADED") {
        stateContext = "pod stresom, preopterećen, hitno";
        emotionContext = "anksiozno";
      } else if (kaizenState === "FOCUSED") {
        stateContext = "visok fokus, produktivno";
        emotionContext = "motivisano";
      }

      const existingTaskTitles = tasks.filter(t => !t.done).map(t => t.title);

      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: rawText, 
          language,
          stateContext,
          emotionContext,
          existingTasks: existingTaskTitles
        }),
      });

      if (!res.ok) {
        let errMsg = "Failed context processing.";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          /* Fallback if not JSON */
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        await handleAddMultipleTasks(data.tasks);
      }
      checkAdrenalineReward();
      setActiveTab("board");
    } catch (e: any) {
      console.error("Vance parsing error:", e);
      setGeneralToast({
        message: e.message || "Failed to process brain dump. Please try again.",
        type: "error",
      });
    } finally {
      setIsBrainDumpProcessing(false);
    }
  };

  // Add highly personalized, verified task
  const handleAddTask = async (
    taskData: Omit<Task, "id" | "createdTime" | "subPriority" | "done"> & {
      sourceId?: string;
    },
    skipDuplicateCheck?: boolean
  ) => {
    // Prevent duplicate active tasks
    if (!skipDuplicateCheck) {
      const existingActiveTasks = tasks.filter((t) => !t.done);
      const duplicateTask = existingActiveTasks.find((t) => areSimilarTitles(t.title, taskData.title));
      
      if (duplicateTask) {
        setDuplicateTaskWarning({
          isOpen: true,
          taskData,
          existingTaskTitle: duplicateTask.title,
        });
        return;
      }
    }

    // Determine next subPriority in category
    const categoryTasksCount = tasks.filter(
      (t) => t.category === taskData.category && !t.done,
    ).length;
    const id =
      "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

    const newTask: Task = {
      ...taskData,
      id,
      subPriority: categoryTasksCount + 1,
      done: false,
      createdTime: new Date().toISOString(),
    };

    // Sync to routines if repeatable
    if (newTask.repeat && newTask.repeat !== "none") {
      try {
        const existingHabits = JSON.parse(
          safeStorage.getItem("abcde_calendar_habits") || "[]",
        );
        if (!existingHabits.some((h: any) => h.title === newTask.title)) {
          existingHabits.push({
            id: "habit-" + Date.now(),
            title: newTask.title,
            tier: newTask.category,
            logs: {},
          });
          safeStorage.setItem(
            "abcde_calendar_habits",
            JSON.stringify(existingHabits),
          );
        }
      } catch (e) {}
    }

    // Sync to Universal inbox if from inbox
    if (taskData.sourceId) {
      try {
        const inboxItems = JSON.parse(
          safeStorage.getItem("abcde_universal_inbox") || "[]",
        );
        const idx = inboxItems.findIndex(
          (i: any) => i.id === taskData.sourceId,
        );
        if (idx !== -1) {
          inboxItems[idx].processed = true;
          safeStorage.setItem(
            "abcde_universal_inbox",
            JSON.stringify(inboxItems),
          );
          setUniversalInbox(inboxItems); // Also sync local react state if accessible
        }
      } catch (e) {}
    }

    // Optimistically update local tasks state immediately for instant rendering and offline support
    const key = currentBoardId
      ? `abcde_tasks_${currentBoardId}`
      : "abcde_tasks";
    try {
      const savedTasksRaw = safeStorage.getItem(key) || "[]";
      let savedTasks = JSON.parse(savedTasksRaw);
      if (!Array.isArray(savedTasks)) savedTasks = [];
      savedTasks.push(newTask);
      safeStorage.setItem(key, JSON.stringify(savedTasks));
    } catch (e) {}
    setTasks((prev) => [...prev, newTask]);

    const docReference = getTaskDocRef(id);
    if (docReference) {
      try {
        if (currentBoardId) {
          await ensureBoardExists(currentBoardId);
        }
        await setDoc(docReference, {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description || "",
          category: newTask.category,
          subPriority: newTask.subPriority,
          done: newTask.done,
          createdTime: newTask.createdTime || new Date().toISOString(),
          reminderTime: newTask.reminderTime || "",
          deadline: newTask.deadline || "",
          delegatedTo: newTask.delegatedTo || "",
          eliminationReason: newTask.eliminationReason || "",
          aiExplanation: newTask.aiExplanation || "",
          repeat: newTask.repeat || "",
          ownerId: currentUser?.uid || "",
        });
      } catch (err) {
        const path = currentBoardId
          ? `boards/${currentBoardId}/tasks/${id}`
          : `users/${currentUser?.uid}/tasks/${id}`;
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    checkAdrenalineReward();
  };

  const handleShiftAndAddRogueTask = async (rogueTask: Task) => {
    // Shift other category A active tasks
    const updatedTasks = tasks.map((t) => {
      if (t.category === "A" && !t.done) {
        return { ...t, subPriority: t.subPriority + 1 };
      }
      return t;
    });

    const finalTasksList = [...updatedTasks, rogueTask];

    // Optimistically update local react tasks state immediately
    setTasks(finalTasksList);

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      try {
        if (isCollab) {
          await ensureBoardExists(currentBoardId);
        }
        const batch = writeBatch(db);

        // Update each shifted active class A task
        tasks.forEach((t) => {
          if (t.category === "A" && !t.done) {
            const taskRef = getTaskDocRef(t.id);
            if (taskRef) {
              batch.update(taskRef, {
                subPriority: t.subPriority + 1,
              });
            }
          }
        });

        // Insert rogue task
        const rogueRef = getTaskDocRef(rogueTask.id);
        if (rogueRef) {
          batch.set(rogueRef, {
            ...rogueTask,
            description: rogueTask.description || "",
            reminderTime: rogueTask.reminderTime || "",
            deadline: rogueTask.deadline || "",
            delegatedTo: rogueTask.delegatedTo || "",
            eliminationReason: rogueTask.eliminationReason || "",
            aiExplanation: rogueTask.aiExplanation || "",
            ownerId: isUser ? currentUser.uid : "",
          });
        }

        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  // Add multiple categorized tasks imported from AI parser directly to tasks
  // Refined with Sales Psychology/Behavioral science and Apple HIG standard state continuity:
  // Performs intelligent title overlap checking and dynamically moves/updates existing non-completed tasks
  // instead of inserting cluttering duplicate task cards.
  const handleAddMultipleTasks = async (newAITasks: AIRasterizedTask[]) => {
    const boardTasksToSync = newAITasks;
    const tasksToUpdate: Task[] = [];
    const tasksToCreate: Task[] = [];
    
    if (boardTasksToSync.length > 0) {
      const boardId = currentBoardId || new URLSearchParams(window.location.search).get("board");
      const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
      
      const categoryCounts: Record<string, number> = {};

      const existingActiveTasks = tasks.filter((t) => !t.done);
      
      boardTasksToSync.forEach((ct) => {
        const rawCat = ct.category ? String(ct.category).toUpperCase() : "A";
        const cat = (["A", "B", "C", "D", "E"].includes(rawCat) ? rawCat : "A") as "A" | "B" | "C" | "D" | "E";

        if (categoryCounts[cat] === undefined) {
          categoryCounts[cat] = tasks.filter((t) => t.category === cat && !t.done).length;
        }

        // Look for any existing uncompleted task that is semantically highly similar
        const matchingTask = existingActiveTasks.find((t) => areSimilarTitles(t.title, ct.title));

        if (matchingTask) {
          // Instead of creating a duplicate, we update this existing task's category, explanation, and description
          // This elegantly represents a "re-prioritization" based on their latest mood/energy state!
          tasksToUpdate.push({
            ...matchingTask,
            category: cat, // dynamically move the task on the board
            aiExplanation: ct.explanation || matchingTask.aiExplanation,
            description: ct.description || matchingTask.description || "",
            aiSuggested: true,
          });
        } else {
          categoryCounts[cat] += 1;
          tasksToCreate.push({
            id: "task-ai-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            title: ct.title,
            description: ct.description || "",
            category: cat,
            subPriority: categoryCounts[cat],
            done: false,
            createdTime: new Date().toISOString(),
            aiSuggested: true,
            aiExplanation: ct.explanation,
            isHabit: ct.isHabit,
            habitId: ct.habitId,
            ownerId: currentUser?.uid || ""
          });
        }
      });

      setTasks((prev) => {
        const updatedList = prev.map((t) => {
          const match = tasksToUpdate.find((ut) => ut.id === t.id);
          return match ? match : t;
        });
        const finalTasks = [...updatedList, ...tasksToCreate];
        
        safeStorage.setItem(key, JSON.stringify(finalTasks));
        // Dispatch event after storage is updated for state continuity across views
        setTimeout(() => window.dispatchEvent(new Event("storage_sync")), 0);
        return finalTasks;
      });

      // Sync to Firestore if authenticated
      if (currentUser) {
        try {
          const batch = writeBatch(db);
          tasksToCreate.forEach(nt => {
            const docRef = getTaskDocRef(nt.id);
            if (docRef) batch.set(docRef, nt);
          });
          tasksToUpdate.forEach(ut => {
            const docRef = getTaskDocRef(ut.id);
            if (docRef) batch.set(docRef, ut);
          });
          await batch.commit();
        } catch (e) {
          console.error("Error syncing multiple tasks (deduplicated/new) to Firestore:", e);
        }
      }
    }

    // Determine customizable language toast messages for confirmation
    let confirmMsg = "";
    if (tasksToUpdate.length > 0 && tasksToCreate.length > 0) {
      confirmMsg = language === "en" 
        ? `Added ${tasksToCreate.length} new and updated ${tasksToUpdate.length} existing tasks!` 
        : language === "tr" 
          ? `${tasksToCreate.length} yeni eklendi ve ${tasksToUpdate.length} mevcut görev güncellendi!`
          : `Dodato ${tasksToCreate.length} novih i ažurirano ${tasksToUpdate.length} postojećih zadataka!`;
    } else if (tasksToUpdate.length > 0) {
      confirmMsg = language === "en" 
        ? `Updated priority of ${tasksToUpdate.length} existing tasks based on your mood!` 
        : language === "tr" 
          ? `Mevcut ${tasksToUpdate.length} görevin önceliği ruh halinize göre güncellendi!`
          : `Ažuriran prioritet za ${tasksToUpdate.length} postojeća zadatka na osnovu tvog raspoloženja!`;
    } else {
      confirmMsg = language === "en" 
        ? "Tasks successfully added to the board!" 
        : language === "tr" 
          ? "Görevler başarıyla panoya eklendi!" 
          : "Zadaci uspešno dodati na tablu i u matrice!";
    }

    setGeneralToast({
      message: confirmMsg,
      type: "success",
    });
  };

  const handleAddInboxTask = (
    title: string,
    description: string = "",
    source: string = "Manual",
    metadata?: any,
  ) => {
    // Instead of universalInbox, we add directly to 'tasks' as a "C" task (or "A" if it's super important based on source)
    let defaultCat: "A" | "B" | "C" | "D" | "E" = "C";
    if (metadata && metadata.category && ["A", "B", "C", "D", "E"].includes(metadata.category)) {
      defaultCat = metadata.category as "A" | "B" | "C" | "D" | "E";
    } else {
      defaultCat = source.includes("Mindset") || source.includes("Dopamine") ? "B" : "C";
    }
    
    const newTask: Task = {
      id: "task-inbox-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      title: title,
      description: `${source ? `[${source}] ` : ""}${description}`,
      category: defaultCat,
      subPriority: tasks.filter((t) => t.category === defaultCat && !t.done).length + 1,
      done: false,
      createdTime: new Date().toISOString(),
      ownerId: currentUser?.uid || ""
    };

    const boardId = currentBoardId || new URLSearchParams(window.location.search).get("board");
    const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";

    setTasks((prev) => {
      const updated = [...prev, newTask];
      safeStorage.setItem(key, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event("storage_sync")), 0);
      return updated;
    });

    if (currentUser) {
      try {
        const docRef = getTaskDocRef(newTask.id);
        if (docRef) {
          setDoc(docRef, newTask).catch((e) => {
            console.error("Error syncing task from Inbox push:", e);
          });
        }
      } catch (e) {
        console.error("Sync try/catch error from Inbox push:", e);
      }
    }

    const isEng = language === "en";
    const sourceLabel = isEng
      ? source
      : source === "Vision Strategy"
        ? "Vision Strategija"
        : source === "Life Balance"
          ? "Krug Života"
          : source === "Pareto 80/20"
            ? "Pareto 80/20"
            : source === "Dopamine Focus"
              ? "Dopaminski Audit"
              : source === "Mindset Coach"
                ? "Mindset Trener"
                : source;

    const msg = isEng
      ? `Task "${title.substring(0, 32)}${title.length > 32 ? "..." : ""}" from ${sourceLabel} was added directly to your tasks! ⚡`
      : language === "tr"
        ? `Görev "${title.substring(0, 32)}${title.length > 32 ? "..." : ""}" ${sourceLabel} modülünden doğrudan görevlerinize eklendi! ⚡`
        : `Zadatak "${title.substring(0, 32)}${title.length > 32 ? "..." : ""}" iz modula "${sourceLabel}" je dodat u zadatke i matrice! ⚡`;

    setGeneralToast({
      message: msg,
      type: "success",
    });
  };

  const handleRemoveInboxTask = (id: string) => {
    // Legacy support kept intact to avoid crashes if called
  };

  const handleClearInbox = () => {
    // Legacy support kept intact
  };

  const handleSyncToABCDEBoard = async (processed: any[]) => {
    const extractTags = (text: string) => {
      const regex = /#[\w\u00C0-\u024F]+/g;
      const matches = text.match(regex);
      return matches ? matches.map((t) => t.toLowerCase()) : [];
    };

    const newTasksList: Task[] = processed.map((pt, idx) => {
      const combinedText = `${pt.title || ""} ${pt.description || ""}`;
      const tags = extractTags(combinedText);
      return {
        id:
          "task-ai-" +
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2, 6) +
          "-" +
          idx,
        title: pt.title,
        description: pt.description || undefined,
        category: pt.category as "A" | "B" | "C" | "D" | "E",
        subPriority: pt.subPriority || idx + 1,
        done: false,
        createdTime: new Date().toISOString(),
        aiSuggested: true,
        aiExplanation: pt.aiExplanation,
        urgency: pt.urgency,
        importance: pt.importance,
        consequence: pt.consequence,
        energyFit: pt.energyFit,
        goalAlignment: pt.goalAlignment,
        emotionalRelief: pt.emotionalRelief,
        totalScore: pt.totalScore,
        tags: tags.length > 0 ? tags : undefined,
      };
    });

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      try {
        if (isCollab) {
          await ensureBoardExists(currentBoardId);
        }
        const batch = writeBatch(db);
        newTasksList.forEach((t) => {
          const docRef = getTaskDocRef(t.id);
          if (docRef) {
            batch.set(docRef, {
              ...t,
              ownerId: isUser ? currentUser.uid : "",
            });
          }
        });
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setTasks((prev) => {
        const updated = [...prev, ...newTasksList];
        safeStorage.setItem("abcde_tasks", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Toggle checklist complete
  const handleToggleTask = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;

    const targetDoneState = !targetTask.done;

    if (targetDoneState && ["A", "B", "C", "D", "E"].includes(targetTask.category)) {
       targetTask.done = true;
       // We'll proceed to save this state below.
    } else {
       targetTask.done = targetDoneState;
    }

    if (targetDoneState) {
      checkAdrenalineReward();
      window.dispatchEvent(new Event("storage"));
      
      // Trigger Discovery Lab event for task completion
      triggerDiscoveryEvent("task_completed", {
        isHighLeverage: ["A", "B"].includes(targetTask.category),
        category: targetTask.category,
        aiSuggested: targetTask.aiSuggested,
      });
      
      if (["A", "B"].includes(targetTask.category) || (targetTask.impact && targetTask.impact >= 7)) {
        triggerDiscoveryEvent("high_leverage_task_completed");
      }
      
      if (targetTask.category === "D") {
        triggerDiscoveryEvent("task_deferred_then_completed");
      }
    }

    const updatedList = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            done: targetDoneState,
            completedTime: targetDoneState
              ? new Date().toISOString()
              : undefined,
          }
        : t,
    );
    const normalizedList = normalizeSubPriorities(
      updatedList,
      targetTask.category,
    );

    // Optimistically update local react tasks state immediately for seamless performance
    setTasks(normalizedList);

    // Cross-sync: Tasks -> Habits
    if (targetTask.isHabit && targetTask.habitId) {
      try {
        const habitsRaw = safeStorage.getItem("abcde_calendar_habits");
        if (habitsRaw) {
          let habits = JSON.parse(habitsRaw);
          const habitIdx = habits.findIndex((h: any) => h.id === targetTask.habitId);
          if (habitIdx !== -1) {
            // Log completion for today
            const todayStr = new Date().toISOString().split("T")[0];
            habits[habitIdx].logs = habits[habitIdx].logs || {};
            habits[habitIdx].logs[todayStr] = targetDoneState;
            safeStorage.setItem("abcde_calendar_habits", JSON.stringify(habits));
            
            // Also update abcde_calendar_logs
            const logsRaw = safeStorage.getItem("abcde_calendar_logs") || "{}";
            let logsObj = JSON.parse(logsRaw);
            let todayLogs = logsObj[todayStr] || [];
            
            if (targetDoneState) {
              if (!todayLogs.includes(targetTask.habitId)) {
                todayLogs.push(targetTask.habitId);
                triggerDiscoveryEvent("micro_habit_completed", { habitId: targetTask.habitId });
              }
            } else {
              todayLogs = todayLogs.filter((id: string) => id !== targetTask.habitId);
            }
            logsObj[todayStr] = todayLogs;
            safeStorage.setItem("abcde_calendar_logs", JSON.stringify(logsObj));
            
            window.dispatchEvent(new Event("storage_sync"));
          }
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    }

    // PERSIST TO SAFE STORAGE
    const boardId = new URLSearchParams(window.location.search).get("board");
    const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
    safeStorage.setItem(key, JSON.stringify(normalizedList));
    window.dispatchEvent(new Event("storage_sync"));

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      normalizedList.forEach((t) => {
        const dRef = getTaskDocRef(t.id);
        if (dRef) {
          batch.set(
            dRef,
            {
              ...t,
              description: t.description || "",
              reminderTime: t.reminderTime || "",
              deadline: t.deadline || "",
              delegatedTo: t.delegatedTo || "",
              eliminationReason: t.eliminationReason || "",
              aiExplanation: t.aiExplanation || "",
              repeat: t.repeat || "",
              ownerId: isUser ? currentUser.uid : "",
            },
            { merge: true },
          );
        }
      });

      batch.commit().catch((err) => {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      });
    }
  };

  // Delete task and shift downstream tasks upward
  const handleDeleteTask = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) {
      console.error("Task not found for deletion! ID was:", id);
      return;
    }

    const remaining = tasks.filter((t) => t.id !== id);
    const normalizedList = normalizeSubPriorities(
      remaining,
      targetTask.category,
    );

    if (targetTask.isHabit && targetTask.habitId) {
      const habitsRaw = safeStorage.getItem("abcde_calendar_habits");
      if (habitsRaw) {
        const habitsList = JSON.parse(habitsRaw);
        const updatedHabits = habitsList.filter((h: any) => h.id !== targetTask.habitId);
        safeStorage.setItem("abcde_calendar_habits", JSON.stringify(updatedHabits));
      }
    }

    // Optimistically update local react tasks state immediately
    setTasks(normalizedList);
    
    // PERSIST TO SAFE STORAGE
    const boardId = new URLSearchParams(window.location.search).get("board");
    const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
    safeStorage.setItem(key, JSON.stringify(normalizedList));
    window.dispatchEvent(new Event("storage_sync"));

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      console.log("Syncing deletion to Firebase for:", id);
      const batch = writeBatch(db);
      // Delete document
      const targetDocRef = getTaskDocRef(id);
      console.log("Target doc ref:", targetDocRef);
      if (targetDocRef) {
        batch.delete(targetDocRef);
      } else {
        console.warn("No doc ref found for task ID:", id);
      }

      // Re-normalize indices
      normalizedList.forEach((t) => {
        const dRef = getTaskDocRef(t.id);
        if (dRef) {
          batch.set(
            dRef,
            {
              ...t,
              description: t.description || "",
              reminderTime: t.reminderTime || "",
              deadline: t.deadline || "",
              delegatedTo: t.delegatedTo || "",
              eliminationReason: t.eliminationReason || "",
              aiExplanation: t.aiExplanation || "",
              ownerId: isUser ? currentUser.uid : "",
            },
            { merge: true },
          );
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Dismiss associated alarms if triggered
    setActiveAlarms((prev) => prev.filter((alarm) => alarm.id !== id));
  };

  // Delete multiple tasks
  const handleDeleteMultipleTasks = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;

    let currentList = [...tasks];
    const categoriesAffected = new Set<"A" | "B" | "C" | "D" | "E">();

    ids.forEach((id) => {
      const task = currentList.find((t) => t.id === id);
      if (task) categoriesAffected.add(task.category);
    });

    currentList = currentList.filter((t) => !ids.includes(t.id));

    const habitsRaw = safeStorage.getItem("abcde_calendar_habits");
    if (habitsRaw) {
      let habitsList = JSON.parse(habitsRaw);
      ids.forEach((id) => {
        const task = tasks.find((t) => t.id === id);
        if (task && task.isHabit && task.habitId) {
          habitsList = habitsList.filter((h: any) => h.id !== task.habitId);
        }
      });
      safeStorage.setItem("abcde_calendar_habits", JSON.stringify(habitsList));
    }

    categoriesAffected.forEach((cat) => {
      currentList = normalizeSubPriorities(currentList, cat);
    });

    // Optimistically update
    setTasks(currentList);

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);

      ids.forEach((id) => {
        const targetDocRef = getTaskDocRef(id);
        if (targetDocRef) {
          batch.delete(targetDocRef);
        }
      });

      currentList.forEach((t) => {
        const dRef = getTaskDocRef(t.id);
        if (dRef) {
          batch.set(
            dRef,
            {
              ...t,
              description: t.description || "",
              reminderTime: t.reminderTime || "",
              deadline: t.deadline || "",
              delegatedTo: t.delegatedTo || "",
              eliminationReason: t.eliminationReason || "",
              aiExplanation: t.aiExplanation || "",
              ownerId: isUser ? currentUser?.uid || "" : "",
            },
            { merge: true },
          );
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    setActiveAlarms((prev) => prev.filter((alarm) => !ids.includes(alarm.id)));
  };

  const handleClearCompleted = async () => {
    const completedTasks = tasks.filter((t) => t.done);
    if (completedTasks.length === 0) return;

    const activeOnly = tasks.filter((t) => !t.done);
    let normalized = [...activeOnly];
    (["A", "B", "C", "D", "E"] as const).forEach((cat) => {
      normalized = normalizeSubPriorities(normalized, cat);
    });

    // Optimistically update local react tasks state immediately
    setTasks(normalized);

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      // Delete completed tasks
      completedTasks.forEach((t) => {
        const docRef = getTaskDocRef(t.id);
        if (docRef) {
          batch.delete(docRef);
        }
      });
      // Save normalized indexes
      normalized.forEach((t) => {
        const dRef = getTaskDocRef(t.id);
        if (dRef) {
          batch.set(
            dRef,
            {
              ...t,
              description: t.description || "",
              reminderTime: t.reminderTime || "",
              deadline: t.deadline || "",
              delegatedTo: t.delegatedTo || "",
              eliminationReason: t.eliminationReason || "",
              aiExplanation: t.aiExplanation || "",
              ownerId: isUser ? currentUser.uid : "",
            },
            { merge: true },
          );
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  // Automatically or manually archive completed tasks older than 30 days to separate collection
  const archiveOldCompletedTasks = async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Filters tasks completed more than 30 days ago
    const oldCompleted = tasks.filter((t) => {
      if (!t.done) return false;
      const compTime = t.completedTime || t.createdTime;
      if (!compTime) return false;
      return new Date(compTime).getTime() < thirtyDaysAgo;
    });

    if (oldCompleted.length === 0) {
      return;
    }

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);

      oldCompleted.forEach((t) => {
        // Active doc reference to delete
        const activeRef = getTaskDocRef(t.id);
        if (activeRef) {
          batch.delete(activeRef);
        }

        // Archive subcollection reference to write
        let archiveRef = null;
        if (isCollab && currentBoardId) {
          archiveRef = doc(db, "boards", currentBoardId, "archive", t.id);
        } else if (isUser && currentUser) {
          archiveRef = doc(db, "users", currentUser.uid, "archive", t.id);
        }

        if (archiveRef) {
          batch.set(archiveRef, {
            ...t,
            description: t.description || "",
            reminderTime: t.reminderTime || "",
            deadline: t.deadline || "",
            delegatedTo: t.delegatedTo || "",
            eliminationReason: t.eliminationReason || "",
            aiExplanation: t.aiExplanation || "",
            archivedAt: new Date().toISOString(),
          });
        }
      });

      try {
        await batch.commit();

        // Local state cleanup for instant response
        setTasks((prev) =>
          prev.filter(
            (item) => !oldCompleted.some((old) => old.id === item.id),
          ),
        );

        setGeneralToast({
          message:
            language === "en" ? `Successfully archived ${oldCompleted.length} tasks completed over 30 days ago to separate collection in Firestore.` : language === "tr" ? `Firestore'da koleksiyonu ayırmak için 30 günden uzun bir süre önce tamamlanan ${oldCompleted.length} görev başarıyla arşivlendi.` : `Uspešno arhivirano ${oldCompleted.length} završenih zadataka starijih od 30 dana u zasebnu arhivsku kolekciju u Firestore-u.`,
          type: "success",
        });
      } catch (err: any) {
        console.error("Firestore archiving error:", err);
        const path = isCollab
          ? `boards/${currentBoardId}/archive`
          : `users/${currentUser?.uid}/archive`;
        try {
          handleFirestoreError(err, OperationType.WRITE, path);
        } catch (logErr) {
          console.warn("Muted background archiving error to prevent unhandledrejection:", logErr);
        }
      }
    } else {
      // Guest mode: fallback archiving to a separate local storage structure
      try {
        const archivedLocalRaw =
          safeStorage.getItem("abcde_tasks_archive") || "[]";
        const archivedLocal = JSON.parse(archivedLocalRaw);
        const newLocalArchive = [...archivedLocal, ...oldCompleted];

        safeStorage.setItem(
          "abcde_tasks_archive",
          JSON.stringify(newLocalArchive),
        );

        // Clean up current active list
        const remaining = tasks.filter(
          (item) => !oldCompleted.some((old) => old.id === item.id),
        );
        setTasks(remaining);

        // Save local active list
        const key = currentBoardId
          ? `abcde_tasks_${currentBoardId}`
          : "abcde_tasks";
        safeStorage.setItem(key, JSON.stringify(remaining));

        setGeneralToast({
          message:
            language === "en" ? `Successfully archived ${oldCompleted.length} tasks completed over 30 days ago to local storage.` : language === "tr" ? `30 günden uzun bir süre önce tamamlanan ${oldCompleted.length} görev yerel depolama alanında başarıyla arşivlendi.` : `Uspešno arhivirano ${oldCompleted.length} završenih zadataka starijih od 30 dana u lokalnu arhivu.`,
          type: "success",
        });
      } catch (err) {
        console.error("Guest archiving error:", err);
      }
    }
  };

  // Automatically archive old completed tasks older than 30 days once tasks have loaded
  useEffect(() => {
    // Check session storage so we only run this once per app boot/session to avoid infinite update loops
    let hasArchivedThisSession = false;
    try {
      hasArchivedThisSession =
        sessionStorage.getItem("abcde_initial_archived") === "true";
    } catch (e) {}

    if (tasks.length > 0 && !hasArchivedThisSession) {
      try {
        sessionStorage.setItem("abcde_initial_archived", "true");
      } catch (e) {}
      // Allow minor delay so standard initializations set up cleanly
      const timer = setTimeout(() => {
        archiveOldCompletedTasks().catch((err) => {
          console.error("Failed to archive old completed tasks:", err);
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  // Manual reordering logic (Move Up within its category, e.g. from subPriority 2 to 1)
  const handleMoveUp = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.done) return;

    const cat = task.category;
    const categoryTasks = tasks
      .filter((t) => t.category === cat && !t.done)
      .sort((a, b) => (a.subPriority || 0) - (b.subPriority || 0));

    const currentIndex = categoryTasks.findIndex((t) => t.id === id);
    if (currentIndex <= 0) return; // Already at the top

    const sibling = categoryTasks[currentIndex - 1];

    const updatedCategoryTasks = [...categoryTasks];
    updatedCategoryTasks[currentIndex - 1] = categoryTasks[currentIndex];
    updatedCategoryTasks[currentIndex] = sibling;

    const updates = updatedCategoryTasks.map((t, idx) => ({
      id: t.id,
      subPriority: idx + 1,
    }));

    // Optimistically update local react tasks state immediately
    setTasks((prev) => {
      return prev.map((t) => {
        const update = updates.find((u) => u.id === t.id);
        if (update) {
          return { ...t, subPriority: update.subPriority };
        }
        return t;
      });
    });

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      updates.forEach((u) => {
        const taskRef = getTaskDocRef(u.id);
        if (taskRef) {
          batch.update(taskRef, { subPriority: u.subPriority });
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  // Manual reordering logic (Move Down within its category, e.g. from 1 to 2)
  const handleMoveDown = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.done) return;

    const cat = task.category;
    const categoryTasks = tasks
      .filter((t) => t.category === cat && !t.done)
      .sort((a, b) => (a.subPriority || 0) - (b.subPriority || 0));

    const currentIndex = categoryTasks.findIndex((t) => t.id === id);
    if (currentIndex === -1 || currentIndex >= categoryTasks.length - 1) return; // Already at bottom

    const sibling = categoryTasks[currentIndex + 1];

    const updatedCategoryTasks = [...categoryTasks];
    updatedCategoryTasks[currentIndex + 1] = categoryTasks[currentIndex];
    updatedCategoryTasks[currentIndex] = sibling;

    const updates = updatedCategoryTasks.map((t, idx) => ({
      id: t.id,
      subPriority: idx + 1,
    }));

    // Optimistically update local react tasks state immediately
    setTasks((prev) => {
      return prev.map((t) => {
        const update = updates.find((u) => u.id === t.id);
        if (update) {
          return { ...t, subPriority: update.subPriority };
        }
        return t;
      });
    });

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      updates.forEach((u) => {
        const taskRef = getTaskDocRef(u.id);
        if (taskRef) {
          batch.update(taskRef, { subPriority: u.subPriority });
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleReorderTasks = async (draggedId: string, targetId: string) => {
    const draggedTask = tasks.find((t) => t.id === draggedId);
    const targetTask = tasks.find((t) => t.id === targetId);

    if (
      !draggedTask ||
      !targetTask ||
      draggedTask.category !== targetTask.category ||
      draggedTask.done ||
      targetTask.done
    )
      return;
    if (draggedTask.subPriority === targetTask.subPriority) return;

    const categoryTasks = tasks
      .filter((t) => t.category === draggedTask.category && !t.done)
      .sort((a, b) => a.subPriority - b.subPriority);

    const oldIndex = categoryTasks.findIndex((t) => t.id === draggedId);
    const newIndex = categoryTasks.findIndex((t) => t.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newCategoryTasks = [...categoryTasks];
    const [removed] = newCategoryTasks.splice(oldIndex, 1);
    newCategoryTasks.splice(newIndex, 0, removed);

    const updates = newCategoryTasks.map((t, idx) => ({
      id: t.id,
      subPriority: idx + 1,
    }));

    // Optimistically update local react tasks state immediately
    setTasks((prev) => {
      return prev.map((t) => {
        const update = updates.find((u) => u.id === t.id);
        if (update) {
          return { ...t, subPriority: update.subPriority };
        }
        return t;
      });
    });

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      updates.forEach((u) => {
        const taskRef = getTaskDocRef(u.id);
        if (taskRef) {
          batch.update(taskRef, { subPriority: u.subPriority });
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  // Quick reminder time modifier
  const handleSetReminder = async (id: string, time: string | undefined) => {
    // Optimistically update local react tasks state immediately for seamless performance
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, reminderTime: time } : t)),
    );

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      try {
        const docRef = getTaskDocRef(id);
        if (docRef) {
          await updateDoc(docRef, {
            reminderTime: time || "",
          });
        }
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks/${id}`
          : `users/${currentUser?.uid}/tasks/${id}`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  // Quick deadline date modifier
  const handleSetDeadline = async (
    id: string,
    deadlineDate: string | undefined,
  ) => {
    // Optimistically update local react tasks state immediately for seamless performance
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, deadline: deadlineDate } : t)),
    );

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      try {
        const docRef = getTaskDocRef(id);
        if (docRef) {
          await updateDoc(docRef, {
            deadline: deadlineDate || "",
          });
        }
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks/${id}`
          : `users/${currentUser?.uid}/tasks/${id}`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleUpdateTask = async (id: string, fields: Partial<Task>) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const extractTags = (text: string) => {
      const regex = /#[\w\u00C0-\u024F]+/g;
      const matches = text.match(regex);
      return matches ? matches.map((t) => t.toLowerCase()) : [];
    };

    let newTags = task.tags;
    if (fields.title !== undefined || fields.description !== undefined) {
      const combinedText = `${fields.title !== undefined ? fields.title : task.title} ${fields.description !== undefined ? fields.description : task.description || ""}`;
      const extracted = extractTags(combinedText);
      newTags = extracted.length > 0 ? extracted : undefined;
    }

    let updatedList = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          ...fields,
          tags: newTags,
        };
      }
      return t;
    });

    // If category has changed, we must normalize the subPriorities of the old category and new category
    if (fields.category && fields.category !== task.category) {
      const oldCategory = task.category;
      const newCategory = fields.category;
      const isDone = task.done;

      // First place the task at the end of the new category's subPriority order
      const targetCategoryActiveCount = tasks.filter(
        (t) => t.category === newCategory && t.done === isDone,
      ).length;
      const nextSubPriority = targetCategoryActiveCount + 1;

      updatedList = updatedList.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            subPriority: nextSubPriority,
          };
        }
        return t;
      });

      // Normalize indices for both categories to ensure sequential ranks are preserved correctly
      updatedList = normalizeSubPriorities(updatedList, oldCategory);
      updatedList = normalizeSubPriorities(updatedList, newCategory);
    }

    // Optimistically update local react tasks state immediately
    setTasks(updatedList);

    // PERSIST TO SAFE STORAGE
    const boardId = new URLSearchParams(window.location.search).get("board");
    const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
    safeStorage.setItem(key, JSON.stringify(updatedList));
    window.dispatchEvent(new Event("storage_sync"));

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      updatedList.forEach((t) => {
        const dRef = getTaskDocRef(t.id);
        if (dRef) {
          batch.set(
            dRef,
            {
              ...t,
              description: t.description || "",
              reminderTime: t.reminderTime || "",
              deadline: t.deadline || "",
              delegatedTo: t.delegatedTo || "",
              eliminationReason: t.eliminationReason || "",
              aiExplanation: t.aiExplanation || "",
              ownerId: isUser ? currentUser.uid : "",
            },
            { merge: true },
          );
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleBulkUpdateTasks = async (updates: { id: string; fields: Partial<Task> }[]) => {
    if (updates.length === 0) return;

    let updatedList = [...tasks];

    const extractTags = (text: string) => {
      const regex = /#[\w\u00C0-\u024F]+/g;
      const matches = text.match(regex);
      return matches ? matches.map((t) => t.toLowerCase()) : [];
    };

    updates.forEach(({ id, fields }) => {
      const taskIndex = updatedList.findIndex((t) => t.id === id);
      if (taskIndex === -1) return;
      const task = updatedList[taskIndex];

      let newTags = task.tags;
      if (fields.title !== undefined || fields.description !== undefined) {
        const combinedText = `${fields.title !== undefined ? fields.title : task.title} ${fields.description !== undefined ? fields.description : task.description || ""}`;
        const extracted = extractTags(combinedText);
        newTags = extracted.length > 0 ? extracted : undefined;
      }

      updatedList[taskIndex] = {
        ...task,
        ...fields,
        tags: newTags,
      };

      // Category changes in bulk updates shouldn't happen from ParetoAnalyzer, but if they do:
      if (fields.category && fields.category !== task.category) {
        const oldCategory = task.category;
        const newCategory = fields.category;
        const isDone = task.done;

        const targetCategoryActiveCount = updatedList.filter(
          (t) => t.category === newCategory && t.done === isDone,
        ).length;
        const nextSubPriority = targetCategoryActiveCount + 1;

        updatedList[taskIndex].subPriority = nextSubPriority;

        updatedList = normalizeSubPriorities(updatedList, oldCategory);
        updatedList = normalizeSubPriorities(updatedList, newCategory);
      }
    });

    // Optimistically update local react tasks state immediately
    setTasks(updatedList);

    // PERSIST TO SAFE STORAGE
    const boardId = new URLSearchParams(window.location.search).get("board");
    const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
    safeStorage.setItem(key, JSON.stringify(updatedList));
    window.dispatchEvent(new Event("storage_sync"));

    const isCollab = !!currentBoardId;
    const isUser = !currentBoardId && !!currentUser;

    if (isCollab || isUser) {
      const batch = writeBatch(db);
      updatedList.forEach((t) => {
        const dRef = getTaskDocRef(t.id);
        if (dRef) {
          batch.set(
            dRef,
            {
              ...t,
              description: t.description || "",
              reminderTime: t.reminderTime || "",
              deadline: t.deadline || "",
              delegatedTo: t.delegatedTo || "",
              eliminationReason: t.eliminationReason || "",
              aiExplanation: t.aiExplanation || "",
              ownerId: isUser ? currentUser.uid : "",
            },
            { merge: true },
          );
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        const path = isCollab
          ? `boards/${currentBoardId}/tasks`
          : `users/${currentUser?.uid}/tasks`;
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleDismissAlarm = (id: string) => {
    setActiveAlarms((prev) => prev.filter((alarm) => alarm.id !== id));
  };

  // Retrieve the SINGLE uncompleted task that has highest PRIORITY index hierarchy:
  // First look for A1, A2, A3... then B1... then C1... D1... E1...
  const getNextFocusTask = (): Task | null => {
    const activeTasks = tasks.filter((t) => !t.done);
    if (activeTasks.length === 0) return null;

    return activeTasks.sort((a, b) => {
      const catA = a.category || "";
      const catB = b.category || "";
      if (catA !== catB) {
        return catA.localeCompare(catB);
      }
      return (a.subPriority || 0) - (b.subPriority || 0);
    })[0];
  };

  const nextFocusTask = getNextFocusTask();

  // Translation constants for clock display
  const getDayName = (dayIdx: number) => {
    const daysSr = [
      "Nedelja",
      "Ponedeljak",
      "Utorak",
      "Sreda",
      "Četvrtak",
      "Petak",
      "Subota",
    ];
    const daysEn = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return language === "en" ? daysEn[dayIdx] : daysSr[dayIdx];
  };

  const formatClockTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatClockDate = (date: Date) => {
    const dayName = getDayName(date.getDay());
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return language === "en" ? `${dayName}, ${month}/${day}/${year}` : language === "tr" ? `${dayName}, ${month}/${day}/${year}` : `${dayName}, ${day}.${month}.${year}.`;
  };

  // Compute daily completion statistics
  const activeCount = tasks.filter((tItem) => !tItem.done).length;
  const completedCount = tasks.filter((tItem) => tItem.done).length;
  const totalCount = tasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Specific "A" metrics
  const criticalTasks = tasks.filter((tItem) => tItem.category === "A");
  const completedCritical = criticalTasks.filter((tItem) => tItem.done).length;

  const themeClass = discoverySettings.activeTheme && discoverySettings.activeTheme !== "default"
    ? `theme-${discoverySettings.activeTheme}`
    : "";

  return (
    <div
      className={`h-screen w-full flex overflow-hidden transition-all duration-300 hig-bg ${themeClass}`}
      id="application-root"
    >
      {/* HIG Sidebar (Desktop/iPad) */}
      <aside className="hidden md:flex lg:flex flex-col w-[200px] lg:w-[260px] border-r border-black/5 dark:border-white/5 hig-bg z-40 shrink-0 h-full overflow-y-auto">
        <div className="p-5 pl-6 pt-8">
          <div
            className="flex items-center gap-2 mb-6 cursor-pointer"
            onClick={() => setActiveTab("home")}
          >
            <div className="relative flex items-center justify-center bg-black dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-white w-7 h-7 rounded-[8px] font-semibold text-xs overflow-hidden">
              <span>K⁺</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[15px] font-semibold leading-none text-black dark:text-white">
                {t.title}
              </h1>
              <span className="text-[11px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5">
                {t.subtitle}
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => {
                setActiveTab("home");
                setIsNavOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors ${activeTab === "home" ? "bg-[#007AFF] text-white font-medium" : "hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
            >
              <LayoutGrid className="w-5 h-5 mb-0.5" strokeWidth={2} />{" "}
              {language === "en" ? "Hub" : language === "tr" ? "Merkez" : "Home"}
            </button>
            <button
              onClick={() => {
                setActiveTab("board");
                setIsNavOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors ${activeTab === "board" ? "bg-[#007AFF] text-white font-medium" : "hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
            >
              <CheckSquare className="w-5 h-5" strokeWidth={2} />{" "}
              {language === "en" ? "Tasks" : language === "tr" ? "Görevler" : "Zadaci"}
            </button>
            <button
              onClick={() => {
                setActiveTab("mindset");
                setIsNavOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-colors ${activeTab === "mindset" ? "bg-[#007AFF] text-white font-medium" : "hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8v12l3-3h10a8 8 0 0 0 0-16z"/><path d="m8 10 2 2 4-4"/></svg>
              {language === "en" ? "Coach" : language === "tr" ? "Koç" : "Mentor"}
            </button>
          </nav>
        </div>
      </aside>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 hig-bg border-l border-black/5 dark:border-white/5">
        <AmbientPlayer
          activeAmbient={discoverySettings.activeAmbient}
          enabled={discoverySettings.soundsEnabled}
        />
        {/* Toast notifications */}
        <NotificationToast
          alarms={activeAlarms}
          onDismiss={handleDismissAlarm}
          language={language}
          soundsEnabled={discoverySettings.soundsEnabled}
          activeSoundPack={discoverySettings.activeSoundPack}
        />

        {/* Copy notification toast */}
        <AnimatePresence>
          {showCopyToast && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] bg-[#1C1C1E] border border-white/5 text-white rounded-xl p-4 flex items-start gap-3.5"
            >
              <div className="p-2 bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] rounded-xl shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-[#34C759] transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-relaxed">
                  {t.copiedPublicLink}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] dark:bg-[#30D158] transition-opacity" />
                  <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block">
                    Safari & iOS 100% OK
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {generalToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92%] p-4 rounded-xl border flex items-start gap-3.5 backdrop-blur-md ${
                isEvening
                  ? "bg-[#1C1C1E]/95 border-black/5 dark:border-white/5/80 text-white"
                  : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white"
              }`}
              id="general-system-toast"
            >
              <div className="p-2.5 bg-[#007AFF]/10 text-[#007AFF] rounded-xl shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 transition-opacity text-[#007AFF]" />
              </div>
              <div className="flex-1 min-w-0 pr-2 select-none text-left">
                <h5 className="text-[13px] font-semibold text-[#007AFF]">
                  {language === "en" ? "INTEGRATED LIFE FLOW" : language === "tr" ? "ENTEGRE YAŞAM AKIŞI" : "SINHRONIZACIJA MODULA"}
                </h5>
                <p className="text-xs font-semibold leading-relaxed mt-1 text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {generalToast.message}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => setGeneralToast(null)}
                  className="text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab("board");
                    setGeneralToast(null);
                  }}
                  className="px-2.5 py-1.5 bg-[#007AFF] active:opacity-70 text-white text-[13px] font-semibold rounded-xl transition-all cursor-pointer select-none active:scale-95"
                >
                  {language === "en" ? "Open Board" : language === "tr" ? "Açık Pano" : "Vidi Tablu"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header navbar with digital clock and statistics */}
        <header
          className="border-b border-black/10 dark:border-white/10 sticky top-0 z-30 px-4 transition-all duration-300 hig-glass flex items-center justify-center md:hidden h-[44px]"
        >
          <div className="absolute left-4">
            {/* If we had a back button, it would go here */}
          </div>

          {/* Centered Title */}
          <h1 className="text-[17px] font-semibold tracking-[-0.41px] text-center truncate text-black dark:text-white leading-[44px]">
            {activeTab === "home"
              ? language === "en" ? "Strategy Hub" : language === "tr" ? "Strateji Merkezi" : "Početna"
              : activeTab === "board"
                ? language === "en" ? "Tasks" : language === "tr" ? "Görevler" : "Zadaci"
                : activeTab === "mindset"
                  ? language === "en" ? "AI Coach" : language === "tr" ? "Yapay Zeka Koçu" : "AI Mentor"
                  : language === "en" ? "Tools" : language === "tr" ? "Aletler" : "Alati"}
          </h1>

          {/* Trailing actions */}
          <div className="absolute right-4 flex items-center gap-3"></div>
        </header>

        {/* Main Container */}
        <ZoomableGroup>
          <main
            ref={mainScrollRef}
            onScroll={handleMainScroll}
            className={`flex-1 overflow-y-auto pb-24 md:pb-12 w-full mx-auto ${activeTab === "settings" ? "max-w-3xl p-0 md:p-4" : "max-w-[1200px] p-4 sm:p-6 lg:p-8 space-y-8"} transition-all duration-300 flex flex-col`}
          >
            {/* Top-Level Sub Navigation pill-bars based on current active tab */}
            {(activeTab === "board" || activeTab === "pareto" || activeTab === "progress" || activeTab === "Vision") && (
              <div
                className="flex flex-wrap items-center justify-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full max-w-fit mx-auto mb-6 border border-black/5 dark:border-white/5"
                id="tab-sub-nav-1-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("board");
                    triggerHaptics("light");
                  }}
                  className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer active:scale-95 ${
                    activeTab === "board"
                      ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
                      : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  📋 {language === "en" ? "1. Smart Board" : language === "tr" ? "1. Akıllı Pano" : "1. Pametna Tabla"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("pareto");
                    triggerHaptics("light");
                  }}
                  className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer active:scale-95 ${
                    activeTab === "pareto"
                      ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
                      : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  📊 {language === "en" ? "2. Smart Filter" : language === "tr" ? "2. Akıllı Filtre" : "2. Pametni Filter"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("progress");
                    triggerHaptics("light");
                  }}
                  className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer active:scale-95 ${
                    activeTab === "progress"
                      ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
                      : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  ⚡ {language === "en" ? "3. Habits" : language === "tr" ? "3. Rutinler" : "3. Somatske Navike"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("Vision");
                    triggerHaptics("light");
                  }}
                  className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer active:scale-95 ${
                    activeTab === "Vision"
                      ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs"
                      : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  🌟 {language === "en" ? "4. Vision" : language === "tr" ? "4. Vizyon" : "4. Kreativni Plan"}
                </button>
              </div>
            )}
            <div className="transition-all duration-300">
              <AnimatePresence mode="wait">
                {activeTab === "home" && (
                  <motion.div
                    key="home-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* EVENING REFLECTION PANEL SYSTEM (Noćni režim) */}
                    {isEvening ? (
                      <EveningReflection
                        language={language}
                        isEvening={isEvening}
                        isEveningExpanded={isEveningExpanded}
                        setIsEveningExpanded={setIsEveningExpanded}
                        setForceMorningHub={setForceMorningHub}
                        setActiveTab={setActiveTab}
                        tasks={tasks}
                        eveningWin={eveningWin}
                        setEveningWin={setEveningWin}
                        eveningLoss={eveningLoss}
                        setEveningLoss={setEveningLoss}
                        eveningAdvice={eveningAdvice}
                        setEveningAdvice={setEveningAdvice}
                        isEveningProcessing={isEveningProcessing}
                        handleSendEveningReflection={handleSendEveningReflection}
                        isDayLocked={isDayLocked}
                        setIsDayLocked={setIsDayLocked}
                        handleUnlockDay={handleUnlockDay}
                        bedtimePrep={bedtimePrep}
                        handleToggleBedtime={handleToggleBedtime}
                      />
                    ) : (
                      <div className="space-y-4 text-left">
                        {isNightTime && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 p-4 rounded-xl">
                            <div className="space-y-0.5 text-left">
                              <span className="text-xs font-semibold text-[#FF9500] dark:text-[#FF9F0A] flex items-center gap-1">
                                🌙{" "}
                                {language === "en" ? "Mindsync Night Override Active" : language === "tr" ? "Mindsync Geceyi Geçersiz Kılma Etkin" : "Noćni režim aktivan (Prisilna Dnevna Tabla)"}
                              </span>
                              <p className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                {language === "en" ? "You have temporarily bypassed Night Mode. You can complete your day or do a reset anytime." : language === "tr" ? "Gece Modunu geçici olarak atladınız. İstediğiniz zaman gününüzü tamamlayabilir veya sıfırlama yapabilirsiniz." : "Privremeno ste prešli na dnevnu tablu. Možete završiti analize ili zadatke, pa se vratiti."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setForceMorningHub(false)}
                              className="px-4 py-2 bg-[#FF9500] dark:bg-[#FF9F0A] text-white dark:text-black hover:opacity-95 active:scale-95 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
                            >
                              🌙{" "}
                              {language === "en" ? "Return to Evening Reflection" : language === "tr" ? "Akşam Yansımasına Dönüş" : "Prikaži Večernju Refleksiju"}
                            </button>
                          </div>
                        )}
                        <HomePortal
                          language={language}
                          activeTab={activeTab}
                          tasks={tasks}
                          onNavigateToTab={(tab) => {
                            setActiveTab(tab);
                          }}
                          onAddTask={(title, description, category) =>
                            handleAddTask({
                              title,
                              description: description || undefined,
                              category,
                            })
                          }
                          onAddMultipleTasks={handleAddMultipleTasks}
                          tasksCount={{
                            total: tasks.length,
                            completed: tasks.filter((t) => t.done).length,
                            critical: tasks.filter(
                              (t) => t.category === "A" && !t.done,
                            ).length,
                          }}
                          isDayLocked={isDayLocked}
                          isEvening={isEvening}
                          eveningAdvice={eveningAdvice}
                          eveningWin={eveningWin}
                          eveningLoss={eveningLoss}
                          onSendToMichaelVance={handleSendToMichaelVance}
                          isBrainDumpProcessing={isBrainDumpProcessing}
                          onToggleTask={handleToggleTask}
                          onMoveUp={handleMoveUp}
                          onUnlockDay={handleUnlockDay}
                          currentUser={currentUser}
                          activeAiTone={discoverySettings.activeAiTone}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "board" && (
                  <motion.div
                    key="board-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 animate-fade-in"
                  >
                    {/* Header block with Collaboration Icon Toggle */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5"
                      id="abcde-collaborative-header"
                    >
                      <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-black dark:text-white flex items-center gap-2">
                          📋{" "}
                          {language === "en" ? "Priority Control Chamber" : language === "tr" ? "Öncelik Kontrol Odası" : "Glavni centar prioriteta"}
                        </h2>
                        <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                          {language === "en" ? "Streamlined list-prioritization and daily execution tracking." : language === "tr" ? "Kolaylaştırılmış liste önceliklendirme ve günlük yürütme takibi." : "Efikasno sortiranje vaših obaveza i svedena kontrola dnevnog fokusa."}
                        </p>
                      </div>

                      {/* Collaboration Interactive Icon - Clicking it gives more details */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCollabExpanded(!collabExpanded)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                            collabExpanded
                              ? "bg-[#007AFF] text-white border-black/5 dark:border-white/5"
                              : currentBoardId
                                ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20"
                                : "bg-[#007AFF]/60 text-[#007AFF] border-black/5 dark:border-white/5 active:opacity-70 transition-opacity duration-150"
                          }`}
                          id="collab-header-toggle-icon"
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          <span>
                            {language === "en" ? "Team Sync" : language === "tr" ? "Takım Senkronizasyonu" : "Sinhronizacija"}
                          </span>
                          <span className="w-2 h-2 rounded-full relative flex">
                            <span className="transition-opacity absolute inline-flex h-full w-full rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/10 opacity-75" />
                            <span
                              className={`relative inline-flex rounded-full h-2 w-2 ${currentBoardId ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-[#007AFF]"}`}
                            />
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Collaboration Panel Detail view */}
                    <AnimatePresence initial={false}>
                      {collabExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 sm:p-5 bg-[#007AFF]/10 dark:bg-[#000000]/25 rounded-xl border border-black/5 dark:border-white/5/45 mb-2">
                            <CollabPanel
                              currentBoardId={currentBoardId}
                              onJoinBoard={handleJoinBoard}
                              onLeaveBoard={handleLeaveBoard}
                              language={language}
                              currentUser={currentUser}
                              onGoogleSignIn={() => setShowAuthModal(true)}
                              onSignOut={handleSignOut}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>



                    {/* Metric stats and the Iron Rule (inside Priorities) */}
                    <div
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4"
                      id="metric-widgets"
                    >
                      {/* Progress Circle Panel */}
                      <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block">
                            {t.todayProgress}
                          </span>
                          <h4 className="text-xl font-semibold text-black dark:text-white">
                            {completedCount} / {totalCount} {t.completed}
                          </h4>
                          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            {t.clearedText.replace(
                              "{percent}",
                              String(progressPercent),
                            )}
                          </p>
                        </div>
                        {/* Visual Ring */}
                        <div className="relative w-14 h-14 shrink-0">
                          <svg
                            className="w-full h-full transform -rotate-90"
                            viewBox="0 0 36 36"
                          >
                            <path
                              className="text-white dark:text-[#F2F2F7]"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-[#34C759]"
                              strokeDasharray={`${progressPercent}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#1C1C1E] dark:text-white">
                            {progressPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Critical Priorities Stats */}
                      <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-4 flex items-center gap-3">
                        <div className="p-3 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] rounded-lg shrink-0">
                          <CheckSquare className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block">
                            {t.categoryATasks}
                          </span>
                          <h4 className="text-xl font-semibold text-black dark:text-white">
                            {completedCritical} / {criticalTasks.length}{" "}
                            {t.completed}
                          </h4>
                          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            {t.criticalTasksLeft.replace(
                              "{count}",
                              String(criticalTasks.length - completedCritical),
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Guide Quick-Info block */}
                      <div className="bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border border-[#007AFF]/20 dark:border-[#0A84FF]/20 rounded-xl p-4 flex items-start gap-4 md:col-span-2 xl:col-span-1">
                        <div className="p-3 bg-[#007AFF] text-white rounded-xl shrink-0 mt-0.5">
                          <BookOpen className="w-5.5 h-5.5" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block break-words">
                            ⭐ {t.goldenRule}
                          </span>
                          <h5 className="text-sm font-semibold text-black dark:text-white break-words">
                            {t.ironDisciplineRule}
                          </h5>
                          <p className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed break-words">
                            {t.goldenRuleText}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Sub-Navigation Tabs inside Board - only shown on mobile screen 'md:hidden' */}
                    <div
                      className="flex md:hidden bg-[#007AFF]/10 p-1 rounded-xl gap-1 mb-4 border border-black/5 dark:border-white/5/40"
                      id="board-mobile-sub-tabs"
                    >
                      <button
                        type="button"
                        onClick={() => setBoardSubTab("matrix")}
                        className={`flex-1 py-3 text-[13px] font-semibold rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          boardSubTab === "matrix"
                            ? "bg-[#007AFF] text-white"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#1C1C1E] dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5"
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span>
                          {language === "en" ? "Priority Matrix" : language === "tr" ? "Öncelik Matrisi" : "Matrica prioriteta"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoardSubTab("add")}
                        className={`flex-1 py-3 text-[13px] font-semibold rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          boardSubTab === "add"
                            ? "bg-[#007AFF] text-white"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#1C1C1E] dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {language === "en" ? "Add & Focus" : language === "tr" ? "Ekle ve Odaklan" : "Unos i Fokus"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoardSubTab("list")}
                        className={`flex-1 py-3 text-[13px] font-semibold rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          boardSubTab === "list"
                            ? "bg-[#007AFF] text-white"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#1C1C1E] dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5"
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          {language === "en" ? "Task List" : language === "tr" ? "Görev Listesi" : "Lista zadataka"}
                        </span>
                      </button>
                    </div>

                    {/* Priority Matrix Overview Dashboard Display */}
                    <section
                      id="bento-matrix"
                      className={`w-full ${boardSubTab === "matrix" ? "block" : "hidden md:block"}`}
                    >
                      <MatrixOverview
                        tasks={tasks}
                        language={language}
                        onUpdateTask={handleUpdateTask}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        onAddTask={(title, description, category) =>
                          handleAddTask({
                            title,
                            description: description || undefined,
                            category,
                          })
                        }
                        onViewTaskList={() => setBoardSubTab("list")}
                      />
                    </section>

                    {/* Dashboard split content area */}
                    <div
                      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                      id="split-dashboard-area"
                    >
                      {/* Left Column (Forms & Active Spotlight) - takes 5 cols */}
                      <div
                        className={`lg:col-span-5 space-y-6 ${boardSubTab === "add" ? "block" : "hidden md:block"}`}
                      >
                        <TaskForm
                          onAddTask={handleAddTask}
                          onAddMultipleTasks={handleAddMultipleTasks}
                          language={language}
                        />
                        <FocusState
                          nextTask={nextFocusTask}
                          onCompleteTask={handleToggleTask}
                          language={language}
                        />
                      </div>

                      {/* Right Column (The comprehensive master sorting list) - takes 7 cols */}
                      <div
                        className={`lg:col-span-7 ${boardSubTab === "list" ? "block" : "hidden md:block"}`}
                      >
                        <TaskList
                          tasks={tasks}
                          onToggleTask={handleToggleTask}
                          onDeleteTask={handleDeleteTask}
                          onDeleteMultipleTasks={handleDeleteMultipleTasks}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          onReorderTasks={handleReorderTasks}
                          onClearCompleted={handleClearCompleted}
                          onSetReminder={handleSetReminder}
                          onSetDeadline={handleSetDeadline}
                          onUpdateTask={handleUpdateTask}
                          onTabChange={setActiveTab}
                          language={language}
                          soundsEnabled={discoverySettings.soundsEnabled}
                          activeSoundPack={discoverySettings.activeSoundPack}
                          hapticsEnabled={discoverySettings.hapticsEnabled}
                          minimalModeEnabled={discoverySettings.minimalModeEnabled}
                          activeAnimationSet={discoverySettings.activeAnimationSet}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "Vision" && (
                  <motion.div
                    key="Vision-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <VisionStrategy
                      language={language}
                      onAddTask={(title, description, category) =>
                        handleAddTask({
                          title,
                          description: description || "",
                          category,
                        })
                      }
                      onAddMultipleTasks={handleAddMultipleTasks}
                      onSaveToInbox={(title, description, lifeArea) =>
                        handleAddInboxTask(
                          title,
                          description || "",
                          "Vision Strategy",
                          { lifeArea: lifeArea || "Vision" },
                        )
                      }
                      onSendToREBT={(obstacle) => {
                        try {
                          const stored = safeStorage.getItem(
                            "abcde_pending_mindset_thoughts",
                          );
                          const current = stored ? JSON.parse(stored) : [];
                          current.push(obstacle);
                          safeStorage.setItem(
                            "abcde_pending_mindset_thoughts",
                            JSON.stringify(current),
                          );
                          safeStorage.setItem(
                            "abcde_pending_mindset_tab",
                            "rebt",
                          );

                          setGeneralToast({
                            message:
                              language === "en" ? `Obstacle sent to Mindset Coach! 🧠` : language === "tr" ? "Zihniyet Koçu'na engel gönderildi! 🧠" : `Prepreka uspešno sačuvana u tvoj Mindset! 🧠`,
                            type: "success",
                          });

                          // Navigate directly to mindset tab to open REBT processing
                          setActiveTab("mindset");
                        } catch (e) {}
                      }}
                      isEvening={isEvening}
                    />
                  </motion.div>
                )}

                {activeTab === "dopamine" && (
                  <motion.div
                    key="dopamine-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <DopamineTracker
                      language={language}
                      tasks={tasks}
                      isDark={isDarkUi}
                      onAddTask={(title, description, category) =>
                        handleAddInboxTask(
                          title,
                          description || "",
                          "Dopamine Focus",
                          { lifeArea: "Health", category },
                        )
                      }
                    />
                  </motion.div>
                )}

                {activeTab === "wheel" && (
                  <motion.div
                    key="wheel-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <WheelOfLife
                      language={language}
                      currentUser={currentUser}
                      onAddTask={(title, description, category) =>
                        handleAddInboxTask(
                          title,
                          description || "",
                          "Life Balance",
                          { lifeArea: category },
                        )
                      }
                      isEvening={isEvening}
                    />
                  </motion.div>
                )}

                {activeTab === "pareto" && (
                  <motion.div
                    key="pareto-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                      <ParetoAnalyzer
                        language={language}
                        tasks={tasks}
                        onAddTask={(title, description, category, effort, impact) =>
                          handleAddTask({
                            title,
                            description: description || undefined,
                            category,
                            aiSuggested: true,
                            effort,
                            impact
                          })
                        }
                        isEvening={isEvening}
                        onUpdateTask={handleUpdateTask}
                        onBulkUpdateTasks={handleBulkUpdateTasks}
                        onDeleteTask={handleDeleteTask}
                      />
                  </motion.div>
                )}

                {activeTab === "progress" && (
                  <motion.div
                    key="progress-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ProgressMatrix
                      tasks={tasks}
                      language={language}
                      isEvening={isEvening}
                      onAddMultipleTasks={handleAddMultipleTasks}
                    />
                  </motion.div>
                )}



                {activeTab === "discovery" && (
                  <motion.div
                    key="discovery-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <DiscoveryLab language={language} isEvening={isEvening} onPreviewStart={() => setActiveTab("home")} />
                  </motion.div>
                )}

                {activeTab === "mindset" && (
                  <motion.div
                    key="mindset-tab"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <MindsetCoach language={language} isEvening={isEvening} activeAiTone={discoverySettings.activeAiTone} />
                  </motion.div>
                )}

                {activeTab === "settings" && (
                  <motion.div
                    key="settings-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <SettingsPanel
                      language={language}
                      onLanguageChange={(lang) => handleLanguageChange(lang)}
                      currentUser={currentUser}
                      onSignIn={() => setShowAuthModal(true)}
                      onSignOut={handleSignOut}
                      themeMode={themeMode}
                      onThemeChange={(mode) => {
                        setThemeMode(mode);
                        safeStorage.setItem("abcde_theme_mode", mode);
                      }}
                      sunriseTime={sunriseTime}
                      onSunriseChange={(time) => {
                        setSunriseTime(time);
                        safeStorage.setItem("abcde_sunrise_time", time);
                      }}
                      sunsetTime={sunsetTime}
                      onSunsetChange={(time) => {
                        setSunsetTime(time);
                        safeStorage.setItem("abcde_sunset_time", time);
                      }}
                      followSystemTheme={followSystemTheme}
                      onFollowSystemThemeChange={(follow) => {
                        setFollowSystemTheme(follow);
                        safeStorage.setItem(
                          "abcde_follow_system_theme",
                          String(follow),
                        );
                      }}
                      autoProcessVoice={autoProcessVoice}
                      onAutoProcessVoiceChange={(autoProcess) => {
                        setAutoProcessVoice(autoProcess);
                        safeStorage.setItem(
                          "abcde_auto_process_voice",
                          String(autoProcess),
                        );
                      }}
                      onResetUserData={handleResetUserData}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </ZoomableGroup>

        {/* Footer footer */}
        <footer
          className={`border-t py-2.5 text-center text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-all duration-300 mt-4 select-none ${
            isEvening
              ? "border-white/10 bg-black/40 text-[#3C3C43] dark:text-[#EBEBF5]/80"
              : "border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E]/20 text-[#3C3C43] dark:text-[#EBEBF5]/80"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 flex flex-row items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold px-1.5 py-0.5 rounded bg-[#007AFF]/10 text-[#007AFF]/80 border border-black/5 dark:border-white/5 select-none">
                v2.4
              </span>
              <p className="font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                {t.footerText}
              </p>
            </div>
            <div className="flex gap-1.5 items-center shrink-0">
              <div className="w-1 h-1 rounded-full bg-[#34C759] dark:bg-[#30D158]/80"></div>
              <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                {t.footerSubtext}
              </span>
            </div>
          </div>
        </footer>

        {/* Dynamic Privacy PIN Overlays */}
        {(() => {
          // 1. Check if on collaborative board that requires PIN
          const currentBoardConfig = currentBoardId
            ? savedBoards.find((b) => b.id === currentBoardId)
            : null;
          const boardRequiresPin = currentBoardConfig?.pinCode;
          const isBoardUnlocked = currentBoardId
            ? unlockedBoards.includes(currentBoardId)
            : false;

          if (boardRequiresPin && !isBoardUnlocked) {
            return (
              <PinWall
                title={currentBoardConfig.name}
                expectedPin={currentBoardConfig.pinCode!}
                onUnlockSuccess={() =>
                  setUnlockedBoards((prev) => [...prev, currentBoardId!])
                }
                onCancel={handleLeaveBoard}
                language={language}
                isLocalMode={false}
              />
            );
          }

          // 2. Check if local default task list is locked/protected
          const isLocalMode = currentBoardId === null;
          const localRequiresPin = isLocalMode && appPin;
          const isLocalUnlocked = isAppUnlocked;

          if (localRequiresPin && !isLocalUnlocked) {
            return (
              <PinWall
                title={
                  language === "en" ? "Local Workspace" : language === "tr" ? "Yerel Çalışma Alanı" : "Lokalni privatni prostor"
                }
                expectedPin={appPin}
                onUnlockSuccess={() => setIsAppUnlocked(true)}
                onCancel={() => setIsAppUnlocked(false)}
                language={language}
                isLocalMode={true}
              />
            );
          }

          return null;
        })()}

        {/* Dropdown / More Action Menu */}
        <AnimatePresence>
          {isNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNavOpen(false)}
                className="fixed inset-0 bg-black/20 dark:bg-[#000000]/40 backdrop-blur-sm z-[55] cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-80 md:right-auto z-[60] overflow-hidden rounded-xl border ${
                  isEvening
                    ? "bg-[#1C1C1E] border-black/5 dark:border-white/5"
                    : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                }`}
              >
                <div className="p-2 space-y-1">
                  {[
                    {
                      id: "discovery",
                      icon: (
                        <Compass
                          className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#007AFF]/10 dark:bg-[#0A84FF]/15",
                      labelEn: "Discovery Lab",
                      labelSr: "Discovery Lab",
                      labelTr: "Keşif Laboratuvarı",
                    },
                    {
                      id: "mindset",
                      icon: (
                        <Brain
                          className="w-5 h-5 text-[#AF52DE] dark:text-[#BF5AF2]"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/15",
                      labelEn: "Cognitive Lab",
                      labelSr: "Kognitivni AI",
                      labelTr: "Bilişsel Yapay Zeka",
                    },
                    {
                      id: "pareto",
                      icon: (
                        <Filter
                          className="w-5 h-5 text-[#FF9500] dark:text-[#FF9F0A]"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/15",
                      labelEn: "Smart Filter",
                      labelSr: "Pametni Filter",
                      labelTr: "Akıllı Filtre",
                    },
                    {
                      id: "Vision",
                      icon: (
                        <Sparkles
                          className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#007AFF]/10 dark:bg-[#0A84FF]/15",
                      labelEn: "Strategic Visions",
                      labelSr: "Strateške Vizije",
                      labelTr: "Stratejik Vizyon",
                    },
                    {
                      id: "progress",
                      icon: (
                        <Activity
                          className="w-5 h-5 text-[#34C759] dark:text-[#30D158]"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#34C759]/10 dark:bg-[#30D158]/15",
                      labelEn: "Micro-Routines",
                      labelSr: "Mikro Rutine",
                      labelTr: "Mikro Rutinler",
                    },
                    {
                      id: "dopamine",
                      icon: (
                        <Flame
                          className="w-5 h-5 text-[#FF3B30] dark:text-[#FF453A]"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#FF3B30]/10 dark:bg-[#FF453A]/15",
                      labelEn: "Dopamine Check",
                      labelSr: "Dopamin Protokol",
                      labelTr: "Dopamin Protokolü",
                    },
                    {
                      id: "settings",
                      icon: (
                        <Settings
                          className="w-5 h-5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                          strokeWidth={2}
                        />
                      ),
                      bgClass: "bg-[#8E8E93]/10 dark:bg-[#8E8E93]/15",
                      labelEn: "Settings",
                      labelSr: "Podešavanja",
                      labelTr: "Ayarlar",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as TabType);
                        setIsNavOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                        activeTab === item.id
                          ? isEvening
                            ? "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-white font-semibold"
                            : "bg-[#007AFF]/10 text-[#007AFF] font-semibold"
                          : isEvening
                            ? "hover:bg-black/5 dark:bg-white/5 text-[#EBEBF5]"
                            : "hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-[7px] flex items-center justify-center shrink-0 ${item.bgClass}`}
                      >
                        {item.icon}
                      </div>
                      <span className="text-[14px] font-semibold">
                        {language === "en" ? item.labelEn : language === "tr" ? item.labelTr : item.labelSr}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Bar */}
        <div
          className={`md:hidden fixed left-0 right-0 z-50 flex justify-center transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
            isScrolledDown
              ? "bottom-2"
              : "bottom-0"
          }`}
          id="bottom-navigation-bar"
        >
          <div
            className={`flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
              isScrolledDown
                ? "justify-center gap-8 rounded-full px-8 py-3 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-lg mb-[env(safe-area-inset-bottom,8px)] w-auto mx-auto"
                : "justify-around w-full px-2 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,16px))] bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-2xl border-t border-black/10 dark:border-white/10"
            }`}
          >
          {/* Tab 1: Strategy Hub */}
          <button
            onClick={() => {
              setActiveTab("home");
              setIsNavOpen(false);
            }}
            className={`group flex flex-col items-center pt-1 pb-1 px-3 cursor-pointer transition-all active:scale-95 ${
              activeTab === "home"
                ? isEvening
                  ? "text-[#0A84FF]"
                  : "text-[#007AFF]"
                : isEvening
                  ? "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                  : "text-[#999999]"
            }`}
            id="btn-nav-hub"
          >
            <LayoutGrid
              className={`transition-all duration-300 group-active:scale-90 ${isScrolledDown ? "w-[20px] h-[20px] mb-0" : "w-[24px] h-[24px] mb-1.5"}`}
              strokeWidth={2}
            />
            <span className={`font-medium tracking-wide text-inherit transition-all duration-300 overflow-hidden ${isScrolledDown ? "text-[0px] opacity-0 h-0" : "text-[11px] opacity-100 h-auto"}`}>
              {language === "en" ? "Hub" : language === "tr" ? "Merkez" : "Početna"}
            </span>
          </button>

          {/* Tab 2: Execution Engine */}
          <button
            onClick={() => {
              setActiveTab("board");
              setIsNavOpen(false);
            }}
            className={`group flex flex-col items-center pt-1 pb-1 px-3 cursor-pointer transition-all active:scale-95 ${
              ["board"].includes(activeTab)
                ? isEvening
                  ? "text-[#0A84FF]"
                  : "text-[#007AFF]"
                : isEvening
                  ? "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                  : "text-[#999999]"
            }`}
            id="btn-nav-execution"
          >
            <CheckSquare
              className={`transition-all duration-300 group-active:scale-90 ${isScrolledDown ? "w-[20px] h-[20px] mb-0" : "w-[24px] h-[24px] mb-1.5"}`}
              strokeWidth={2}
            />
            <span className={`font-medium tracking-wide text-inherit transition-all duration-300 overflow-hidden ${isScrolledDown ? "text-[0px] opacity-0 h-0" : "text-[11px] opacity-100 h-auto"}`}>
              {language === "en" ? "Tasks" : language === "tr" ? "Görevler" : "Zadaci"}
            </span>
          </button>

          {/* Tab 3: Mindset Coach */}
          <button
            onClick={() => {
              setActiveTab("mindset");
              setIsNavOpen(false);
            }}
            className={`group flex flex-col items-center pt-1 pb-1 px-3 cursor-pointer transition-all active:scale-95 ${
              activeTab === "mindset"
                ? isEvening
                  ? "text-[#0A84FF]"
                  : "text-[#007AFF]"
                : isEvening
                  ? "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                  : "text-[#999999]"
            }`}
            id="btn-nav-coach"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 group-active:scale-90 ${isScrolledDown ? "w-[20px] h-[20px] mb-0" : "w-[24px] h-[24px] mb-1.5"}`}><path d="M12 2a8 8 0 0 0-8 8v12l3-3h10a8 8 0 0 0 0-16z"/><path d="m8 10 2 2 4-4"/></svg>
            <span className={`font-medium tracking-wide text-inherit transition-all duration-300 overflow-hidden ${isScrolledDown ? "text-[0px] opacity-0 h-0" : "text-[11px] opacity-100 h-auto"}`}>
              {language === "en" ? "Coach" : language === "tr" ? "Koç" : "Mentor"}
            </span>
          </button>
          </div>
        </div>

        {/* Auth Modal overlay for sign up and sign in */}
        <AnimatePresence>
          {showAuthModal && (
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              language={language}
              isEvening={isEvening}
              onGoogleSignIn={handleGoogleSignIn}
              onEmailSignUp={handleEmailSignUp}
              onEmailSignIn={handleEmailSignIn}
            />
          )}
        </AnimatePresence>

        {/* System-wide floating NSDR controller */}
        <GlobalNsdrFloat language={language} isScrolledDown={isScrolledDown} />
      </div>{" "}
      {/* End of Main Content Area */}
      {/* Global Card Zoom Overlay (Delightful, Premium Full Screen) */}
      <AnimatePresence>
        {globalZoomData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 dark:bg-white/0 backdrop-blur-md"
            onClick={() => setGlobalZoomData(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-2xl w-full rounded-xl p-6 md:p-8 overflow-hidden border bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white dark:bg-[#1C1C1E] dark:border-white/5 dark:text-[#F2F2F7] text-left max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button top-right */}
              <button
                type="button"
                onClick={() => setGlobalZoomData(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/5 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#1C1C1E] dark:text-[#EBEBF5]/60 dark:hover:text-[#FFF] transition-all cursor-pointer active:scale-95"
                title={language === "en" ? "Close Dialog" : language === "tr" ? "İletişim Kutusunu Kapat" : "Zatvori prozor"}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header inside popup */}
              <div className="flex items-center gap-4 border-b border-black/5 dark:border-white/5/80 pb-4 shrink-0 pr-8">
                {globalZoomData.emoji && (
                  <div className="text-xl text-[#3C3C43] md:text-[#3C3C43] dark:text-[#EBEBF5]/80xl p-3 bg-white dark:bg-[#000000] rounded-xl border border-black/5 dark:border-white/5 select-none">
                    {globalZoomData.emoji}
                  </div>
                )}
                <div className="min-w-0">
                  {globalZoomData.subtitle && (
                    <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block mb-1">
                      {globalZoomData.subtitle}
                    </span>
                  )}
                  <h3 className="text-lg md:text-xl font-semibold leading-tight font-sans">
                    {globalZoomData.title}
                  </h3>
                </div>
              </div>

              {/* Scrollable Immersive Detail Content */}
              <div className="flex-grow overflow-y-auto pt-5 text-sm md:text-base leading-relaxed font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 space-y-4 pr-1 scrollbar-thin">
                {typeof globalZoomData.content === "string" ? (
                  <p className="whitespace-pre-line">
                    {globalZoomData.content}
                  </p>
                ) : (
                  globalZoomData.content
                )}
              </div>

              {/* Scientific Trust Badge & Dismiss action */}
              <div className="border-t border-black/5 dark:border-white/5/80 pt-4 mt-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 select-none text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  <span>🔬</span>
                  <span>
                    {language === "en" ? "Validated Scientific Concept" : language === "tr" ? "Doğrulanmış Bilimsel Konsept" : "Validovana Naučna Baza"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalZoomData(null)}
                  className="px-4 py-2 bg-[#007AFF] active:opacity-70 text-white font-semibold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  {language === "en" ? "Proceed" : language === "tr" ? "İlerlemek" : "Razumem, idemo dalje"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Duplicate Task Confirmation Modal */}
      <AnimatePresence>
        {duplicateTaskWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mb-2">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === "en" 
                    ? "Similar Task Found" 
                    : language === "tr" 
                      ? "Benzer Görev Bulundu" 
                      : "Pronađen Sličan Zadatak"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === "en" 
                    ? `You already have a task similar to this on your board: "${duplicateTaskWarning.existingTaskTitle}". Do you still want to add the new task?` 
                    : language === "tr" 
                      ? `Panonuzda buna benzer bir görev zaten var: "${duplicateTaskWarning.existingTaskTitle}". Yeni görevi yine de eklemek istiyor musunuz?` 
                      : `Već imate sličan zadatak na tabli: "${duplicateTaskWarning.existingTaskTitle}". Da li ipak želite da dodate novi zadatak?`}
                </p>
                <div className="flex w-full gap-3 mt-4">
                  <button
                    onClick={() => setDuplicateTaskWarning(null)}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {language === "en" ? "Cancel" : language === "tr" ? "İptal" : "Odustani"}
                  </button>
                  <button
                    onClick={() => {
                      const data = duplicateTaskWarning.taskData;
                      setDuplicateTaskWarning(null);
                      handleAddTask(data, true);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    {language === "en" ? "Add Anyway" : language === "tr" ? "Yine de Ekle" : "Ipak Dodaj"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Discovery Lab Unlock Modal */}
      <AnimatePresence>
        {newUnlockedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-[#AF52DE] opacity-10 blur-3xl pointer-events-none rounded-full" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#AF52DE]/10 text-[#AF52DE] text-[10px] font-bold uppercase tracking-wider rounded-full mb-6">
                  <Sparkles className="w-3 h-3" />
                  <span>{language === "sr" ? "Novo Otključano" : "New Item Unlocked!"}</span>
                </div>
                
                <div className="text-6xl p-6 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[24px] inline-block shadow-sm mb-6 border border-black/5 dark:border-white/5">
                  {newUnlockedItem.rewardIcon}
                </div>
                
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                  {newUnlockedItem.name}
                </h3>
                <p className="text-sm text-[#8E8E93] mb-8 max-w-[260px] mx-auto">
                  {language === "sr" ? newUnlockedItem.conditionDescriptionSr : newUnlockedItem.conditionDescription}
                </p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      // Apply it
                      if (newUnlockedItem.category === "theme") {
                        updateDiscoverySetting("activeTheme", newUnlockedItem.rewardValue);
                      } else if (newUnlockedItem.category === "animation") {
                        updateDiscoverySetting("activeAnimationSet", newUnlockedItem.rewardValue);
                      } else if (newUnlockedItem.category === "ambient") {
                        updateDiscoverySetting("activeAmbient", newUnlockedItem.rewardValue);
                      }
                      setNewUnlockedItem(null);
                      setGeneralToast({
                        message: language === "sr" ? "Uspešno primenjeno!" : "Successfully applied!",
                        type: "success",
                      });
                    }}
                    className="w-full py-3.5 bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-95 text-white text-[13px] font-bold rounded-xl transition-all"
                  >
                    {language === "sr" ? "Primeni Odmah" : "Apply Now"}
                  </button>
                  <button
                    onClick={() => {
                      setNewUnlockedItem(null);
                      setActiveTab("settings");
                    }}
                    className="w-full py-3.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 active:scale-95 text-black dark:text-white text-[13px] font-bold rounded-xl transition-all"
                  >
                    {language === "sr" ? "Pogledaj (Discovery Lab)" : "Preview"}
                  </button>
                  <button
                    onClick={() => setNewUnlockedItem(null)}
                    className="w-full py-3 text-[#8E8E93] hover:text-black dark:hover:text-white active:scale-95 text-[13px] font-bold rounded-xl transition-all"
                  >
                    {language === "sr" ? "Odbaci" : "Dismiss"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Tactical Reset (Breathing) FAB */}
      {!showBreathing && (
        <button
          onClick={() => setShowBreathing(true)}
          className={`fixed right-4 z-40 p-4 bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-full shadow-lg border border-black/10 dark:border-white/10 hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] md:bottom-8 ${isScrolledDown ? "bottom-[68px]" : "bottom-[90px]"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c-4.5 0-9-4.5-9-9s4.5-9 9-9 9 4.5 9 9-4.5 9-9 9z"/><path d="M10.5 5c-4.5 0-9 4.5-9 9s4.5 9 9 9 9-4.5 9-9-4.5-9-9-9z"/></svg>
        </button>
      )}

      {/* Tactical Breathing Overlay */}
      <AnimatePresence>
        {showBreathing && (
          <TacticalBreathing 
            language={language} 
            onClose={() => setShowBreathing(false)} 
            activeSoundPack={discoverySettings.activeSoundPack}
          />
        )}
      </AnimatePresence>

      {/* Global Notification Manager for morning/evening reminders */}
      <NotificationManager language={language} />
    </div>
  );
}
