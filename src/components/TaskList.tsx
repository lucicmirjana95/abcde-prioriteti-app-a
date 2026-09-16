import { useState } from "react";
import { Task } from "../types";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Bell,
  Search,
  Sparkles,
  Filter,
  CheckCircle,
  Clock,
  Check,
  RefreshCw,
  Calendar,
  Zap,
  BarChart3,
  GripVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translations, Language } from "../translations";
import { playInteractionSound } from "../lib/audioEngine";
import { safeStorage } from "../lib/safeStorageSetup";
import VoiceReminderNode from "./VoiceReminderNode";

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeleteMultipleTasks?: (ids: string[]) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onReorderTasks?: (draggedId: string, targetId: string) => void;
  onClearCompleted: () => void;
  onSetReminder: (id: string, time: string | undefined) => void;
  onSetDeadline: (id: string, deadline: string | undefined) => void;
  onUpdateTask: (id: string, fields: Partial<Task>) => void;
  onTabChange?: (tab: any) => void;
  language: Language;
  soundsEnabled?: boolean;
  activeSoundPack?: string;
  hapticsEnabled?: boolean;
  minimalModeEnabled?: boolean;
  activeAnimationSet?: string;
}

interface EmptyStateVisualProps {
  catFilter: "ALL" | "A" | "B" | "C" | "D" | "E";
  statusFilter: "ALL" | "ACTIVE" | "COMPLETED";
  totalTasks: number;
  language: Language;
  onResetFilters: () => void;
}

function EmptyStateVisual({
  catFilter,
  statusFilter,
  totalTasks,
  language,
  onResetFilters,
}: EmptyStateVisualProps) {
  const isEn = language === "en";

  // Determine context
  const isSystemEmpty = totalTasks === 0;
  const isFilteredOut = !isSystemEmpty;
  const isCompletedSelected = statusFilter === "COMPLETED";
  const isActiveSelected = statusFilter === "ACTIVE";

  // Custom text and graphics based on empty state cause
  let emojiVal = "📭";
  let title = isEn ? "No tasks to display" : language === "tr" ? "Görüntülenecek görev yok" : "Nema zadataka za prikaz";
  let desc = isEn ? "Adjust your filters or add a new priority task to begin" : language === "tr" ? "Filtrelerinizi ayarlayın veya başlamak için yeni bir öncelikli görev ekleyin" : "Prilagodite filtere ili dodajte novi zadatak da započnete";
  let badgeText = "";
  let accentColorClass = "text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/20";

  if (isSystemEmpty) {
    emojiVal = "🌤️";
    title = isEn ? "Absolute Clean Slate" : language === "tr" ? "Mutlak Temiz Sayfa" : "Potpuno čist horizont";
    desc = isEn ? "Your day is perfectly clear. Use Quick Entry, Brain Dump, or AI agent to capture your next focus targets." : language === "tr" ? "Gününüz son derece net. Bir sonraki odak hedeflerinizi yakalamak için Hızlı Giriş, Beyin Dökümü veya AI aracısını kullanın." : "Vaša operativna tabla je prazna. Iskoristite Brzi unos, Brain Dump Inbox ili AI agenta da postavite ciljeve.";
    badgeText = isEn ? "Zen Mode" : language === "tr" ? "Zen Modu" : "Zen Stanje";
    accentColorClass =
      "text-[#34C759] bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-400/10";
  } else if (isActiveSelected) {
    emojiVal = "🏆";
    title = isEn ? "All Clear & Done" : language === "tr" ? "Hepsi Temizlendi ve Tamamlandı" : "Sve je završeno!";
    desc = isEn ? "Fantastic! Every single active task has been processed and checked off. Take a moment to celebrate this victory!" : language === "tr" ? "Fantastik! Her bir etkin görev işlendi ve işaretlendi. Bu zaferi kutlamak için bir dakikanızı ayırın!" : "Sjajno organizovano! Svi aktivni zadaci su u potpunosti rešeni i obeleženi. Uživajte u dobro zasluženom dopaminu!";
    badgeText = isEn ? "Victory" : language === "tr" ? "Zafer" : "Pobeda";
    accentColorClass = "text-[#FF9500] bg-[#FF9500]/10 border-[#FF9500]/20";
  } else if (catFilter !== "ALL") {
    const catTitles = {
      A: isEn ? "Must Do (A)" : language === "tr" ? "Yapılmalıdır (A)" : "Prioritet (A)",
      B: isEn ? "Should Do (B)" : language === "tr" ? "Yapmalı (B)" : "Trebalo bi (B)",
      C: isEn ? "Nice to Do (C)" : language === "tr" ? "Yapması Güzel (C)" : "Bilo bi lepo (C)",
      D: isEn ? "Delegate (D)" : language === "tr" ? "Delege (D)" : "Delegiraj (D)",
      E: isEn ? "Eliminate (E)" : language === "tr" ? "Ortadan kaldır (E)" : "Eliminiši (E)",
    };
    emojiVal =
      catFilter === "A"
        ? "🏅"
        : catFilter === "B"
          ? "✨"
          : catFilter === "C"
            ? "🌱"
            : catFilter === "D"
              ? "🤝"
              : "🧹";
    title = isEn ? `${catTitles[catFilter]} Clear!` : language === "tr" ? `${catTitles[catFilter]} Temizle!` : `${catTitles[catFilter]} je slobodan!`;
    desc = isEn ? `No active items left in this category. You have strategically managed and cleared this sector!` : language === "tr" ? "Bu kategoride aktif öğe kalmadı. Bu sektörü stratejik olarak yönettiniz ve temizlediniz!" : `Nema otvorenih zadataka u ovoj kategoriji. Uspešno ste rešili i raščistili ovaj prioritetni sektor!`;
    badgeText = isEn ? `Category ${catFilter}` : language === "tr" ? `Kategori ${catFilter}` : `Kategorija ${catFilter}`;
    accentColorClass =
      catFilter === "A"
        ? "text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/20"
        : catFilter === "B"
          ? "text-[#FF9500] bg-[#FF9500]/10 border-[#FF9500]/20"
          : catFilter === "C"
            ? "text-[#34C759] bg-[#34C759]/10 border-[#34C759]/20"
            : "text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/20";
  } else if (isCompletedSelected) {
    emojiVal = "🚀";
    title = isEn ? "Awaiting Done Tasks" : language === "tr" ? "Tamamlanan Görevler Bekleniyor" : "Prvi korak čeka na vas";
    desc = isEn ? "No tasks completed yet on this setup. Lock in your energy, check off your first action item and feel the momentum!" : language === "tr" ? "Bu kurulumda henüz tamamlanmış görev yok. Enerjinizi kilitleyin, ilk eylem öğenizi işaretleyin ve ivmeyi hissedin!" : "Zadaci još uvek nisu završeni. Obeležite prvi završen zadatak i aktivirajte zamajac produktivnosti!";
    badgeText = isEn ? "Getting Started" : language === "tr" ? "Başlarken" : "Pokretanje";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative text-center py-14 px-6 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col items-center justify-center space-y-4"
      id="task-list-empty"
    >
      {/* Absolute Decorative Pulse Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.08, 0.02, 0.08],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-64 h-64 border border-dashed rounded-full border-[#007AFF]/30 absolute"
        />
        <motion.div
          animate={{
            scale: [1, 1.45, 1],
            opacity: [0.04, 0.01, 0.04],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="w-96 h-96 border border-[#34C759]/25 rounded-full absolute"
        />
      </div>

      {/* Floating Animated Mascot / Badge */}
      <div className="relative z-10">
        {/* Sparkles around mascot */}
        <div className="absolute inset-0 -m-6 pointer-events-none">
          <motion.div
            animate={{
              scale: [0.6, 1.1, 0.6],
              opacity: [0.3, 0.9, 0.3],
              rotate: [0, 180, 360],
              x: [-15, 15, -15],
              y: [-10, 10, -10],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute left-1 top-1 text-amber-400 text-xs"
          >
            ✦
          </motion.div>
          <motion.div
            animate={{
              scale: [0.8, 0.5, 0.8],
              opacity: [0.2, 0.7, 0.2],
              x: [18, -18, 18],
              y: [12, -12, 12],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute right-2 bottom-1 text-[#007AFF] text-sm"
          >
            ✧
          </motion.div>
          <motion.div
            animate={{
              scale: [0.5, 1, 0.5],
              opacity: [0.1, 0.8, 0.1],
              rotate: [0, -360],
              x: [-8, 8, -8],
              y: [16, -16, 16],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.5,
            }}
            className="absolute left-1/2 bottom-0 text-[#AF52DE] text-xs"
          >
            ✦
          </motion.div>
        </div>

        {/* Central interactive orb with bounce animation */}
        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          whileHover={{ scale: 1.12, rotate: 5 }}
          className="w-16 h-16 rounded-2xl bg-[#7676801F] flex items-center justify-center text-xl text-[#3C3C43] shadow-sm border border-black/5 dark:border-white/5 cursor-pointer relative"
        >
          {emojiVal}
          {/* Gentle glow effect behind symbol */}
          <div className="absolute inset-0 bg-[#007AFF]/5 rounded-2xl blur-md -z-10 animate-pulse" />
        </motion.div>
      </div>

      {/* Decorative Text & Category Badge */}
      <div className="relative z-10 space-y-1.5 max-w-sm">
        {badgeText && (
          <div className="flex justify-center">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-normal uppercase border ${accentColorClass}`}
            >
              {badgeText}
            </span>
          </div>
        )}
        <h3 className="text-black dark:text-white font-semibold text-base tracking-tight leading-tight">
          {title}
        </h3>
        <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs leading-relaxed">
          {desc}
        </p>
      </div>

      {/* Action Button: offering value on filtered out results */}
      {isFilteredOut && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onResetFilters}
          className="relative z-10 px-4 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-black dark:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-black/5 dark:border-white/5 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80" />
          {isEn ? "Reset Applied Filters" : language === "tr" ? "Uygulanan Filtreleri Sıfırla" : "Ukloni filtere"}
        </motion.button>
      )}
    </motion.div>
  );
}

export default function TaskList({
  tasks,
  onToggleTask,
  onDeleteTask,
  onDeleteMultipleTasks,
  onMoveUp,
  onMoveDown,
  onReorderTasks,
  onClearCompleted,
  onSetReminder,
  onSetDeadline,
  onUpdateTask,
  onTabChange,
  language,
  soundsEnabled = true,
  activeSoundPack = "default",
  hapticsEnabled = true,
  minimalModeEnabled = false,
  activeAnimationSet = "default",
}: TaskListProps) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<
    "ALL" | "A" | "B" | "C" | "D" | "E"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "COMPLETED"
  >("ALL");
  const [selectedTasksIds, setSelectedTasksIds] = useState<string[]>([]);
  const t = translations[language];

  const triggerHaptics = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error",
  ) => {
    if (!hapticsEnabled) return;
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

  const handleToggleWithHaptic = (task: Task) => {
    onToggleTask(task.id);
    const taskSoundEnabled = safeStorage.getItem("abcde_task_complete_sound") !== "false";
    if (!task.done) {
      // Toggle to Completed (Success / Achievement case)
      if (soundsEnabled && taskSoundEnabled) {
        playInteractionSound(activeSoundPack, "check");
      }

      const activeCount = tasks.filter((t) => !t.done).length;
      const isDailyGoalAchievement = activeCount === 1; // It was the last active task

      const leverageInfo = getLeverageInfo(task);
      const isHighLeverage = leverageInfo?.isHigh;

      triggerHaptics("success");
    } else {
      if (soundsEnabled && taskSoundEnabled) {
        playInteractionSound(activeSoundPack, "uncheck");
      }
      triggerHaptics("light"); // Back to active
    }
  };

  // Pareto 80/20 states
  const [expandedParetoTaskId, setExpandedParetoTaskId] = useState<
    string | null
  >(null);
  const [highlightPareto, setHighlightPareto] = useState<boolean>(true); // on by default to gently guide the user
  const [sortByPareto, setSortByPareto] = useState<boolean>(false);

  // Helper inside TaskList to check high impact leverage
  const getLeverageInfo = (task: Task) => {
    const effort = task.effort || 0;
    const impact = task.impact || 0;
    if (!effort || !impact) return null;

    // Synchronized scoring with ParetoAnalyzer.tsx
    const score = parseFloat((Math.pow(impact, 1.8) / Math.max(1, effort)).toFixed(1));
    const isHigh = score >= 8;

    let labelEn = isHigh ? "🔥 High Impact" : "Medium Impact";
    let labelSr = isHigh ? "🔥 Visok Uticaj" : "Srednji Uticaj";
    
    if (score < 4) {
      labelEn = "🐌 Low Impact";
      labelSr = "🐌 Nizak Uticaj";
    }

    let colorClass = isHigh
      ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
      : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5";

    return { ratio: score, labelEn, labelSr, colorClass, isHigh };
  };

  // Drag and Drop States & Handlers
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetTask.id) return;

    const draggedTask = tasks.find((t) => t.id === draggedId);
    if (
      draggedTask &&
      draggedTask.category === targetTask.category &&
      !draggedTask.done &&
      !targetTask.done
    ) {
      setDragOverId(targetTask.id);
      e.dataTransfer.dropEffect = "move";
    } else {
      setDragOverId(null);
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent, dropTask: Task) => {
    e.preventDefault();
    if (!draggedId || draggedId === dropTask.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedTask = tasks.find((t) => t.id === draggedId);
    if (
      draggedTask &&
      draggedTask.category === dropTask.category &&
      !draggedTask.done &&
      !dropTask.done
    ) {
      if (onReorderTasks) {
        onReorderTasks(draggedId, dropTask.id);
      }
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // States for dynamic custom modals to prevent cross-origin iframe window.prompt / alert blocks
  const [activeReminderTask, setActiveReminderTask] = useState<Task | null>(
    null,
  );
  const [reminderTimeVal, setReminderTimeVal] = useState("");
  const [reminderErrorMsg, setReminderErrorMsg] = useState("");

  const [activeDeadlineTask, setActiveDeadlineTask] = useState<Task | null>(
    null,
  );
  const [deadlineDateVal, setDeadlineDateVal] = useState("");
  const [deadlineErrorMsg, setDeadlineErrorMsg] = useState("");

  // Helper inside TaskList to check if task is overdue or coming up
  const getDeadlineStatus = (deadlineStr?: string, isDone?: boolean) => {
    if (!deadlineStr || isDone) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: t.overdue,
        className:
          "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border-[#FF3B30]/20 dark:border-[#FF453A]/20",
      };
    } else if (diffDays === 0) {
      return {
        label: t.dueToday,
        className:
          "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border-[#FF9500]/20 dark:border-[#FF9F0A]/20 transition-opacity font-semibold",
      };
    } else if (diffDays === 1) {
      return {
        label: t.dueTomorrow,
        className:
          "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] border-black/5 dark:border-white/5 font-semibold",
      };
    } else {
      return {
        label: t.daysRemaining.replace("{days}", String(diffDays)),
        className:
          "bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5",
      };
    }
  };

  // Filter & Sort Tasks
  // Sorting rule:
  // Categories alphabetically: A, B, C, D, E.
  // Within category: sorted by subPriority asc: 1, 2, 3...
  // Wait, what about completed tasks? To make it neat, let's keep them sorted normally or we can sort them below uncompleted. Usually, it's nice to sort uncompleted first by priority, then completed at the very bottom, but keep priority ordering so they see exactly what they solved!
  const filteredTasks = tasks
    .filter((tItem) => {
      const safeTitle = typeof tItem.title === "string" ? tItem.title : "";
      const matchSearch =
        safeTitle.toLowerCase().includes(search.toLowerCase()) ||
        (tItem.description &&
          typeof tItem.description === "string" &&
          tItem.description.toLowerCase().includes(search.toLowerCase())) ||
        (Array.isArray(tItem.tags) &&
          tItem.tags.some((tag) =>
            (typeof tag === "string" ? tag.toLowerCase() : "").includes(
              search.toLowerCase(),
            ),
          ));
      const matchCat = catFilter === "ALL" || tItem.category === catFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && !tItem.done) ||
        (statusFilter === "COMPLETED" && tItem.done);
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      // Done state sorting (optional, let's put uncompleted first, then completed)
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }

      // If sortByPareto is ON, we sort primarily by calculated 80/20 leverage ratio (descending)
      if (sortByPareto) {
        const ratioA = a.impact && a.effort ? a.impact / a.effort : 0;
        const ratioB = b.impact && b.effort ? b.impact / b.effort : 0;
        if (ratioA !== ratioB) {
          return ratioB - ratioA; // Higher ratio = better leverage, goes first
        }
      }

      // Category alphabetical
      const catA = a.category || "";
      const catB = b.category || "";
      if (catA !== catB) {
        return catA.localeCompare(catB);
      }
      // subPriority asc
      return (a.subPriority || 0) - (b.subPriority || 0);
    });

  const getCategoryTheme = (category: "A" | "B" | "C" | "D" | "E") => {
    switch (category) {
      case "A":
        return "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20";
      case "B":
        return "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/20 dark:border-[#FF9F0A]/20";
      case "C":
        return "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20";
      case "D":
        return "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/20 dark:border-[#0A84FF]/20";
      case "E":
        return "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20";
    }
  };

  return (
    <div
      className="space-y-4 font-sans text-black dark:text-white"
      id="task-list-panel"
    >
      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#3C3C43] dark:text-[#EBEBF5]/80 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchTasks}
              className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-transparent focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] rounded-xl py-2 pl-9 pr-4 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-sm transition-all focus:border-black/5 dark:border-white/5 focus:ring-1 focus:ring-[#8E8E93]/30"
              id="task-search-input"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Category Filter */}
            <div className="flex bg-[#7676801F] p-[2px] rounded-[9px] text-xs items-center justify-center">
              {(["ALL", "A", "B", "C", "D", "E"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`w-11 py-1 rounded-lg font-medium transition-all text-center flex items-center justify-center cursor-pointer ${
                    catFilter === cat
                      ? "bg-white dark:bg-[#636366] text-black dark:text-white"
                      : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white"
                  }`}
                  id={`filter-cat-${cat}`}
                >
                  {cat === "ALL" ? t.all : cat}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex bg-[#7676801F] p-[2px] rounded-[9px] text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-[#636366] text-black dark:text-white"
                    : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white"
                }`}
                id="filter-status-all"
              >
                {t.all}
              </button>
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === "ACTIVE"
                    ? "bg-white dark:bg-[#636366] text-black dark:text-white"
                    : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white"
                }`}
                id="filter-status-active"
              >
                {t.active}
              </button>
              <button
                onClick={() => setStatusFilter("COMPLETED")}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === "COMPLETED"
                    ? "bg-white dark:bg-[#636366] text-black dark:text-white"
                    : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white"
                }`}
                id="filter-status-completed"
              >
                {t.completedTab}
              </button>
            </div>
          </div>
        </div>

        {/* High Impact Options Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 pb-0.5 border-t border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 transition-all">
          <span className="text-[11px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 shrink-0">
            📊{" "}
            {language === "en" ? "Smart Guidance:" : language === "tr" ? "Akıllı Rehberlik:" : "Pametno usmeravanje:"}
          </span>

                  <button
            type="button"
            onClick={() => {
              triggerHaptics("light");
              
              const hasEvaluatedTasks = filteredTasks.some(t => t.effort && t.impact);
              
              if (!hasEvaluatedTasks && !highlightPareto) {
                window.dispatchEvent(
                  new CustomEvent("trigger-toast", {
                    detail: {
                      message: language === "en" ? "Analyze tasks in Smart Filter to see impact keys! 💡" : language === "tr" ? "Etki anahtarlarını görmek için görevleri Akıllı Filtrede analiz edin! 💡" : "Analiziraj zadatke u modulu 'Pametni Filter' da vidiš procene! 💡",
                      type: "info",
                    },
                  })
                );
                if (onTabChange) onTabChange("pareto");
              }

              setHighlightPareto(!highlightPareto);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
              highlightPareto
                ? "bg-[#FF9500] text-white border-transparent shadow-[0_4px_12px_rgba(255,149,0,0.3)] scale-[1.02]"
                : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-transparent hover:bg-[#E5E5EA] dark:bg-[#2C2C2E]"
            }`}
            title={
              language === "en" ? "Highlight high impact/easy tasks visually" : language === "tr" ? "Yüksek etkili/kolay görevleri görsel olarak vurgulayın" : "Obeleži obaveze sa visokim uticajem a malim trudom"
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />
            <span>
              {language === "en" ? "Highlight Impact Keys" : language === "tr" ? "Etki Anahtarlarını Vurgula" : "Obeleži ključne zadatke"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptics("light");

              const hasEvaluatedTasks = filteredTasks.some(t => t.effort && t.impact);
              
              if (!hasEvaluatedTasks && !sortByPareto) {
                window.dispatchEvent(
                  new CustomEvent("trigger-toast", {
                    detail: {
                      message: language === "en" ? "Analyze tasks in Smart Filter to enable impact sorting! 📊" : language === "tr" ? "Etki sıralamasını etkinleştirmek için Akıllı Filtredeki görevleri analiz edin! 📊" : "Analiziraj zadatke u modulu 'Pametni Filter' za sortiranje po važnosti! 📊",
                      type: "info",
                    },
                  })
                );
                if (onTabChange) onTabChange("pareto");
              }

              setSortByPareto(!sortByPareto);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
              sortByPareto
                ? "bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 text-[#AF52DE] dark:text-[#BF5AF2] border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 shadow-[0_0_12px_rgba(175,82,222,0.15)] scale-[1.02]"
                : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-transparent hover:bg-[#E5E5EA] dark:bg-[#2C2C2E]"
            }`}
            title={
              language === "en" ? "Sort list to show greatest leverage ratio first" : language === "tr" ? "Listeyi en yüksek kaldıraç oranını ilk gösterecek şekilde sıralayın" : "Sortiraj listu tako da najproduktivniji zadaci budu na vrhu"
            }
          >
            <Clock className="w-3.5 h-3.5 text-[#AF52DE] dark:text-[#BF5AF2] shrink-0" />
            <span>
              {language === "en" ? "Sort by Leverage Ratio" : language === "tr" ? "Kaldıraç Oranına Göre Sırala" : "Sortiraj po indeksu poluge"}
            </span>
          </button>
        </div>

        {/* Clear Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-1 gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
              {t.foundCount.replace("{count}", String(filteredTasks.length))}
            </span>
            {filteredTasks.length > 0 && (
              <label className="flex items-center gap-1.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer cursor-pointer hover:opacity-80 border-l border-black/10 dark:border-white/10 pl-3">
                <input
                  type="checkbox"
                  checked={
                    selectedTasksIds.length > 0 &&
                    selectedTasksIds.length === filteredTasks.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTasksIds(
                        filteredTasks.map((tItem) => tItem.id),
                      );
                    } else {
                      setSelectedTasksIds([]);
                    }
                  }}
                  className="rounded border-black/5 dark:border-white/5 text-[#007AFF] focus:ring-[#007AFF] w-3.5 h-3.5"
                />
                <span className="font-medium">
                  {language === "en" ? "Select All" : language === "tr" ? "Tümünü Seç" : "Izaberi sve"}
                </span>
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedTasksIds.length > 0 && (
              <button
                onClick={() => {
                  triggerHaptics("medium");
                  if (onDeleteMultipleTasks) {
                    onDeleteMultipleTasks(selectedTasksIds);
                    setSelectedTasksIds([]);
                  }
                }}
                className="text-[#FF3B30] hover:text-[#FF3B30] dark:text-[#FF453A] font-medium cursor-pointer py-1 px-2.5 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-transparent transition-all hover:scale-105 active:scale-95"
              >
                {language === "en" ? `Delete Selected (${selectedTasksIds.length})` : language === "tr" ? `Seçileni Sil (${selectedTasksIds.length})` : `Obriši izabrano (${selectedTasksIds.length})`}
              </button>
            )}
            {tasks.some((tItem) => tItem.done) && (
              <button
                onClick={() => {
                  triggerHaptics("medium");
                  onClearCompleted();
                }}
                className="text-[#FF3B30] hover:text-[#FF3B30] dark:text-[#FF453A] font-medium cursor-pointer py-1 px-2.5 rounded-lg bg-[#FF3B30]/10 hover:bg-white dark:bg-[#1C1C1E] border border-transparent hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20 transition-all hover:scale-105 active:scale-95"
                id="btn-clear-completed"
              >
                {t.removeCompletedBtn}
              </button>
            )}
          </div>
        </div>

        {/* Category Color Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-2 pb-1 text-[11px] font-medium border-t border-black/5 dark:border-white/5">
          <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 mr-1">
            {language === "en" ? "Category Legend:" : language === "tr" ? "Kategori Açıklaması:" : "Legenda kategorija:"}
          </span>
          <div
            className="flex items-center gap-1.5 p-1 px-1.5 rounded-md bg-[#FF3B30]/[0.05] dark:bg-[#FF453A]/[0.08] border border-[#FF3B30]/20 text-[#FF3B30] dark:text-[#FF453A]"
            title={language === "en" ? "Must Do" : language === "tr" ? "Yapılmalıdır" : "Moraju se uraditi"}
          >
            A
          </div>
          <div
            className="flex items-center gap-1.5 p-1 px-1.5 rounded-md bg-[#007AFF]/[0.05] dark:bg-[#0A84FF]/[0.08] border border-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF]"
            title={language === "en" ? "Should Do" : language === "tr" ? "Yapmalı" : "Trebalo bi uraditi"}
          >
            B
          </div>
          <div
            className="flex items-center gap-1.5 p-1 px-1.5 rounded-md bg-[#34C759]/[0.05] dark:bg-[#32D74B]/[0.08] border border-[#34C759]/20 text-[#34C759] dark:text-[#32D74B]"
            title={language === "en" ? "Nice to Do" : language === "tr" ? "Yapılması güzel" : "Bilo bi lepo uraditi"}
          >
            C
          </div>
          <div
            className="flex items-center gap-1.5 p-1 px-1.5 rounded-md bg-[#FF9500]/[0.05] dark:bg-[#FF9F0A]/[0.08] border border-[#FF9500]/20 text-[#FF9500] dark:text-[#FF9F0A]"
            title={language === "en" ? "Delegate" : language === "tr" ? "Temsilci" : "Delegiraj"}
          >
            D
          </div>
          <div
            className="flex items-center gap-1.5 p-1 px-1.5 rounded-md bg-[#8E8E93]/[0.05] dark:bg-[#8E8E93]/[0.08] border border-[#8E8E93]/20 text-[#3C3C43] dark:text-[#EBEBF5]/80"
            title={language === "en" ? "Eliminate" : language === "tr" ? "Elemek" : "Eliminiši"}
          >
            E
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="space-y-2.5" id="task-list-rows">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const subTasksCount = tasks.filter(
                (tItem) => tItem.category === task.category,
              ).length;

              return (
                <motion.div
                  layout
                  key={task.id}
                  layoutId={`task-row-${task.id}`}
                  onDragOver={(e) =>
                    handleDragOver(e as unknown as React.DragEvent, task)
                  }
                  onDrop={(e) =>
                    handleDrop(e as unknown as React.DragEvent, task)
                  }
                  onDragLeave={(e: any) => {
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    // Only clear drag over if leaving the current element completely
                    if (!e.currentTarget.contains(relatedTarget)) {
                      setDragOverId(null);
                    }
                  }}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{
                    opacity: task.done ? 0.4 : draggedId === task.id ? 0.5 : 1,
                    scale: draggedId === task.id ? 1.02 : 1,
                    y: 0,
                    x: task.done ? 3 : 0,
                  }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{
                    duration: 0.25,
                    ease: "easeOut",
                    layout: { type: "spring", stiffness: 350, damping: 30 },
                  }}
                  className={`relative rounded-xl touch-pan-y transition-colors overflow-hidden ${
                    dragOverId === task.id
                      ? "ring-2 ring-[#007AFF] shadow-sm"
                      : ""
                  } ${
                    draggedId === task.id
                      ? "pointer-events-none shadow-md z-10"
                      : ""
                  }`}
                  id={`task-row-container-${task.id}`}
                >
                  {/* Swipe Actions Background */}
                  <div className="absolute inset-0 flex items-center justify-between text-white z-0 rounded-xl overflow-hidden pointer-events-none">
                    <div className="bg-[#34C759] w-1/2 h-full flex items-center justify-start pl-6 font-semibold">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {language === "en" ? "Complete" : language === "tr" ? "Tamamlamak" : "Završi"}
                    </div>
                    <div className="bg-[#FF3B30] w-1/2 h-full flex items-center justify-end pr-6 font-semibold">
                      {language === "en" ? "Delete" : language === "tr" ? "Silmek" : "Obriši"}
                      <Trash2 className="w-5 h-5 ml-2" />
                    </div>
                  </div>

                  {/* Foreground Draggable Card */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.7}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 80) {
                        handleToggleWithHaptic(task);
                      } else if (info.offset.x < -80) {
                        triggerHaptics("medium");
                        onDeleteTask(task.id);
                      }
                    }}
                    className={`bg-white dark:bg-[#1C1C1E] rounded-2xl flex items-center justify-between shadow-sm transition-shadow relative z-10 ${minimalModeEnabled ? "p-3 gap-3" : "p-4 gap-4"}`}
                  >
                    {/* Category Border & Tint Overlay */}
                    {!task.done && !dragOverId && (
                      <div
                        className={`absolute inset-0 pointer-events-none transition-colors border rounded-xl ${
                          highlightPareto && getLeverageInfo(task)?.isHigh
                            ? "border-[#FF9500]/30 dark:border-[#FF9F0A]/30 bg-[#FF9500]/[0.08] dark:bg-[#FF9F0A]/[0.1] border-l-4 border-l-[#FF9500] dark:border-l-[#FF9F0A]"
                            : minimalModeEnabled
                              ? "border-transparent bg-transparent border-l-2 " + (
                                  task.category === "A" ? "border-l-[#FF3B30] dark:border-l-[#FF453A]" :
                                  task.category === "B" ? "border-l-[#007AFF] dark:border-l-[#0A84FF]" :
                                  task.category === "C" ? "border-l-[#34C759] dark:border-l-[#32D74B]" :
                                  task.category === "D" ? "border-l-[#FF9500] dark:border-l-[#FF9F0A]" : "border-l-[#8E8E93]"
                                )
                              : task.category === "A"
                                ? "bg-[#FF3B30]/[0.05] dark:bg-[#FF453A]/[0.08] border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                                : task.category === "B"
                                  ? "bg-[#007AFF]/[0.05] dark:bg-[#0A84FF]/[0.08] border-[#007AFF]/20 dark:border-[#0A84FF]/20"
                                  : task.category === "C"
                                    ? "bg-[#34C759]/[0.05] dark:bg-[#32D74B]/[0.08] border-[#34C759]/20 dark:border-[#32D74B]/20"
                                    : task.category === "D"
                                      ? "bg-[#FF9500]/[0.05] dark:bg-[#FF9F0A]/[0.08] border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                                      : task.category === "E"
                                        ? "bg-[#8E8E93]/[0.05] dark:bg-[#8E8E93]/[0.08] border-[#8E8E93]/20 dark:border-[#8E8E93]/20"
                                        : "border-transparent"
                        }`}
                      />
                    )}

                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1 group z-10 relative">
                      {/* Drag Handle (Visual cue) */}
                      {!task.done && (
                        <div
                          className="mt-1 items-center justify-center opacity-30 sm:opacity-0 sm:group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab text-[#3C3C43] dark:text-[#EBEBF5]/80 shrink-0 hidden sm:flex"
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(
                              e as unknown as React.DragEvent,
                              task.id,
                            )
                          }
                          onDragEnd={handleDragEnd}
                        >
                          <GripVertical className="w-4 h-4 pointer-events-none" />
                        </div>
                      )}
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedTasksIds.includes(task.id)}
                        onChange={() => {
                          setSelectedTasksIds((prev) =>
                            prev.includes(task.id)
                              ? prev.filter((id) => id !== task.id)
                              : [...prev, task.id],
                          );
                        }}
                        className="mt-1.5 h-4 w-4 rounded border-[#C7C7CC] dark:border-[#3A3A3C] text-[#007AFF] focus:ring-[#007AFF] cursor-pointer shrink-0 transition-all opacity-60 hover:opacity-100 checked:opacity-100"
                      />
                      <VoiceReminderNode
                        onNoteSaved={(note) => {
                          onUpdateTask(task.id, { description: (task.description || "") + (task.description ? "\n" : "") + note });
                        }}
                        language={language}
                        isEvening={false}
                      />
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleWithHaptic(task)}
                        className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 pb-px relative ${
                          task.done
                            ? `text-white shadow-sm border-transparent ${
                                activeAnimationSet === "clarity_spark"
                                  ? "bg-[#34C759] scale-110 shadow-[0_0_12px_rgba(52,199,89,0.6)]"
                                  : activeAnimationSet === "golden_pulse"
                                    ? "bg-gradient-to-br from-[#FFD60A] to-[#FF9F0A] shadow-[0_0_12px_rgba(255,214,10,0.6)] animate-pulse scale-105"
                                    : activeAnimationSet === "habit_bloom"
                                      ? "bg-gradient-to-tr from-[#FF375F] to-[#FF2D55] shadow-[0_0_15px_rgba(255,55,95,0.4)] scale-110 rotate-6"
                                      : activeAnimationSet === "goal_glow"
                                        ? "bg-[#34C759] shadow-[0_0_15px_rgba(52,199,89,0.9)] scale-110"
                                        : "bg-[#34C759] scale-95"
                              }`
                            : "border-[#C7C7CC] dark:border-[#3A3A3C] bg-transparent hover:scale-105 active:scale-95"
                        }`}
                        id={`btn-checkbox-toggle-${task.id}`}
                      >
                        {task.done && (
                          <Check className="w-3.5 h-3.5 stroke-[3] relative z-10" />
                        )}
                        {task.done && activeAnimationSet === "clarity_spark" && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-[#34C759]/60" />
                        )}
                        {task.done && activeAnimationSet === "habit_bloom" && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-[#FF375F]/60" style={{ animationDuration: '2s' }} />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Interactive Priority Category Changer */}
                          <div className="relative inline-flex items-center gap-1 shrink-0">
                            <select
                              value={task.category}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  category: e.target.value as
                                    | "A"
                                    | "B"
                                    | "C"
                                    | "D"
                                    | "E",
                                })
                              }
                              className={`w-11 text-center text-[12px] font-medium py-0.5 rounded tracking-wide cursor-pointer outline-none border border-transparent focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all ${getCategoryTheme(task.category)}`}
                              title={
                                language === "en" ? "Change category" : language === "tr" ? "Kategoriyi değiştir" : "Promeni kategoriju"
                              }
                            >
                              <option
                                value="A"
                                className="text-black dark:text-white bg-white dark:bg-[#1C1C1E]"
                              >
                                A
                              </option>
                              <option
                                value="B"
                                className="text-black dark:text-white bg-white dark:bg-[#1C1C1E]"
                              >
                                B
                              </option>
                              <option
                                value="C"
                                className="text-black dark:text-white bg-white dark:bg-[#1C1C1E]"
                              >
                                C
                              </option>
                              <option
                                value="D"
                                className="text-black dark:text-white bg-white dark:bg-[#1C1C1E]"
                              >
                                D
                              </option>
                              <option
                                value="E"
                                className="text-black dark:text-white bg-white dark:bg-[#1C1C1E]"
                              >
                                E
                              </option>
                            </select>
                            <span className="text-[11px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-[#E5E5EA] dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-sm px-1 py-0.5">
                              #{task.subPriority}
                            </span>
                          </div>

                          {/* Inline Recurrence Changer */}
                          <div className="relative inline-flex items-center gap-1 shrink-0 pb-0.5">
                            <select
                              value={task.repeat || "none"}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  repeat:
                                    e.target.value === "none"
                                      ? undefined
                                      : (e.target.value as any),
                                })
                              }
                              className="text-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] rounded px-1.5 py-0.5 text-black dark:text-[#EBEBF5]/90 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all cursor-pointer font-medium flex items-center"
                              title={
                                language === "en" ? "Change repeat setting" : language === "tr" ? "Tekrarlama ayarını değiştir" : "Promeni ponavljanje"
                              }
                            >
                              <option value="none">
                                🔁 {language === "en" ? "Once" : language === "tr" ? "Bir kere" : "Jednom"}
                              </option>
                              <option value="daily">
                                🔁 {language === "en" ? "Daily" : language === "tr" ? "Günlük" : "Dnevno"}
                              </option>
                              <option value="weekly">
                                🔁 {language === "en" ? "Weekly" : language === "tr" ? "Haftalık" : "Nedeljno"}
                              </option>
                              <option value="monthly">
                                🔁 {language === "en" ? "Monthly" : language === "tr" ? "Aylık" : "Mesečno"}
                              </option>
                            </select>
                          </div>

                          {task.aiSuggested && (
                            <span className="bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20 rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1 shrink-0 font-semibold">
                              <Sparkles className="w-3 h-3" /> AI
                            </span>
                          )}

                          {typeof task.timeRequired === "number" && (
                            <span className="bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white border border-transparent rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1 shrink-0 font-medium">
                              ⏱️ {task.timeRequired}m
                            </span>
                          )}

                          {task.energyRequired && (
                            <span
                              className={`border rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1 shrink-0 font-semibold ${
                                task.energyRequired === "High"
                                  ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                                  : task.energyRequired === "Medium"
                                    ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                                    : "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20"
                              }`}
                            >
                              ⚡{" "}
                              {task.energyRequired === "High"
                                ? language === "en" ? "HIGH" : language === "tr" ? "YÜKSEK" : "VISOKA"
                                : task.energyRequired === "Medium"
                                  ? language === "en" ? "MEDIUM" : language === "tr" ? "ORTA" : "SREDNJA"
                                  : language === "en" ? "LOW" : language === "tr" ? "DÜŞÜK" : "NISKA"}
                            </span>
                          )}

                          {task.reminderTime && (
                            <span className="bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" /> {task.reminderTime}
                            </span>
                          )}

                          {task.deadline && (
                            <span className="bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] border border-black/5 dark:border-white/5 rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1 shrink-0">
                              <Calendar className="w-3 h-3" /> {task.deadline}
                            </span>
                          )}

                          {task.repeat && task.repeat !== "none" && (
                            <span className="bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20 rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1 shrink-0">
                              <RefreshCw className="w-3 h-3 text-[#34C759]" />{" "}
                              {t.repeatOptions[task.repeat]}
                            </span>
                          )}

                          {/* Relative Status Badge */}
                          {(() => {
                            const status = getDeadlineStatus(
                              task.deadline,
                              task.done,
                            );
                            if (!status) return null;
                            return (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] border font-semibold tracking-wide shrink-0 ${status.className}`}
                              >
                                {status.label}
                              </span>
                            );
                          })()}

                          {/* Pareto 80/20 Leverage Badge */}
                          {(() => {
                            const lInfo = getLeverageInfo(task);
                            if (!lInfo) return null;
                            return (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] border font-semibold tracking-normal shrink-0 flex items-center gap-0.5 transition-all ${lInfo.colorClass}`}
                              >
                                📊{" "}
                                {language === "en"
                                  ? lInfo.labelEn.split(" (")[0]
                                  : lInfo.labelSr.split(" (")[0]}{" "}
                                ({lInfo.ratio.toFixed(1)}x)
                              </span>
                            );
                          })()}
                        </div>

                        <h4
                          className={`text-sm md:text-base font-medium text-black dark:text-white mt-1.5 leading-snug break-words ${
                            task.done
                              ? "line-through text-[#3C3C43] dark:text-[#EBEBF5]/80 font-normal"
                              : ""
                          }`}
                        >
                          {task.title}
                        </h4>

                        {task.description && (
                          <p
                            className={`text-xs text-black dark:text-white mt-1 pb-1 leading-relaxed break-words ${task.done ? "text-[#3C3C43] dark:text-[#EBEBF5]/80 font-normal" : "font-medium"}`}
                          >
                            {task.description}
                          </p>
                        )}

                        {Array.isArray(task.tags) && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map((tag) => (
                              <button
                                type="button"
                                key={tag}
                                onClick={() => setSearch(tag)}
                                className="bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] dark:hover:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 py-0.5 rounded text-[10px] font-semibold border border-transparent tracking-wide cursor-pointer transition-colors active:scale-95"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Display delegation/elimination footnotes with built-in inline editing */}
                        {task.category === "D" && (
                          <div className="mt-2 text-xs text-[#007AFF] font-medium bg-[#007AFF]/10 px-2.5 py-1.5 rounded-xl inline-flex flex-wrap items-center gap-2 border border-black/5 dark:border-white/5">
                            <span>{t.delegatedToLabel}</span>
                            <input
                              type="text"
                              placeholder={
                                language === "en" ? "Assignee name..." : language === "tr" ? "Vekilin adı..." : "Ime saradnika..."
                              }
                              value={task.delegatedTo || ""}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  delegatedTo: e.target.value,
                                })
                              }
                              className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-white rounded px-2 py-0.5 font-semibold text-xs outline-none focus:ring-2 focus: focus:border-black/5 dark:border-white/5 max-w-[150px] transition-all"
                            />
                          </div>
                        )}
                        {task.category === "E" && (
                          <div className="mt-2 text-xs text-[#FF3B30] dark:text-[#FF453A] font-medium bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 px-2.5 py-1.5 rounded-xl inline-flex flex-wrap items-center gap-2 border border-[#FF3B30]/20 dark:border-[#FF453A]/20">
                            <span>{t.eliminationReasonLabel}</span>
                            <input
                              type="text"
                              placeholder={
                                language === "en" ? "Elimination reason..." : language === "tr" ? "Tasfiye nedeni..." : "Razlog brisanja..."
                              }
                              value={task.eliminationReason || ""}
                              onChange={(e) =>
                                onUpdateTask(task.id, {
                                  eliminationReason: e.target.value,
                                })
                              }
                              className="bg-white dark:bg-[#1C1C1E] border border-[#FF3B30]/20 text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded px-2 py-0.5 font-semibold text-xs outline-none focus:ring-2 focus:ring-[#FF3B30]/50 dark:ring-[#FF453A]/50/20 focus:border-[#FF3B30] dark:border-[#FF453A] min-w-[200px] flex-1 transition-all"
                            />
                          </div>
                        )}

                        {/* AI explanation tooltip box */}
                        {task.aiExplanation && (
                          <div className="mt-2 text-[11px] bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 py-1.5 px-2.5 rounded-xl border border-black/5 dark:border-white/5 flex items-start gap-1">
                            <Sparkles className="w-3 h-3 mt-0.5 text-[#34C759] shrink-0" />
                            <span>
                              <strong>{t.analysisResultLabel}</strong>{" "}
                              {task.aiExplanation}
                            </span>
                          </div>
                        )}

                        {/* Expanded Pareto sliding controls for custom effort and impact */}
                        {expandedParetoTaskId === task.id && (
                          <div className="mt-3 p-3.5 bg-[#AF52DE]/10 dark:bg-[#000000]/40 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#AF52DE] dark:text-[#BF5AF2] flex items-center gap-1">
                                ⚡{" "}
                                {language === "en" ? "Pareto 80/20 Slider" : language === "tr" ? "Pareto 80/20 Kaydırıcısı" : "Regulator 80/20 Poluge"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpandedParetoTaskId(null)}
                                className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {/* Impact Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                    {language === "en" ? "🎯 Impact (Result value)" : language === "tr" ? "🎯 Etki (Sonuç değeri)" : "🎯 Uticaj (Vrednost rezultata)"}
                                  </span>
                                  <span className="font-semibold text-[#AF52DE] dark:text-[#BF5AF2] bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 px-1.5 py-0.25 rounded text-[11px]">
                                    {task.impact || 5}/10
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={task.impact || 5}
                                  onChange={(e) =>
                                    onUpdateTask(task.id, {
                                      impact: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full accent-[#007AFF] dark:accent-[#0A84FF] h-1.5 bg-[#C6C6C8] rounded-lg cursor-pointer transition-all hover:bg-[#AEAEB2]"
                                />
                              </div>

                              {/* Effort Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                    {language === "en" ? "💪 Effort (Input pain)" : language === "tr" ? "💪 Çaba (Giriş ağrısı)" : "💪 Trud (Uloženi napor)"}
                                  </span>
                                  <span className="font-semibold text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/10 dark:bg-[#0A84FF]/65 px-1.5 py-0.25 rounded text-[11px]">
                                    {task.effort || 5}/10
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={task.effort || 5}
                                  onChange={(e) =>
                                    onUpdateTask(task.id, {
                                      effort: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full accent-[#007AFF] dark:accent-[#0A84FF] h-1.5 bg-[#C6C6C8] rounded-lg cursor-pointer transition-all hover:bg-[#AEAEB2]"
                                />
                              </div>
                            </div>

                            {/* Pre-sets */}
                            <div className="flex flex-wrap gap-1.5 pt-1.5 items-center">
                              <span className="text-[11px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                {language === "en" ? "PRESETS:" : language === "tr" ? "ÖN AYARLAR:" : "ŠABLONI:"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTask(task.id, {
                                    impact: 9,
                                    effort: 2,
                                  })
                                }
                                className="px-2 py-0.5 bg-[#34C759]/10 text-[#34C759] dark:text-[#34C759] font-medium border border-[#34C759]/20 dark:border-[#30D158]/20 rounded text-[11px] hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 active:scale-95 transition-all cursor-pointer"
                              >
                                ✨{" "}
                                {language === "en" ? "High Leverage (9/2)" : language === "tr" ? "Yüksek Kaldıraç (9/2)" : "Visoka poletnost (9/2)"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTask(task.id, {
                                    impact: 7,
                                    effort: 5,
                                  })
                                }
                                className="px-2 py-0.5 bg-[#FF9500]/10 text-[#FF9500] dark:text-[#FF9500] font-medium border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 rounded text-[11px] hover:bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 active:scale-95 transition-all cursor-pointer"
                              >
                                🏃{" "}
                                {language === "en" ? "Standard (7/5)" : language === "tr" ? "Standart (7/5)" : "Standardno (7/5)"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTask(task.id, {
                                    impact: 3,
                                    effort: 8,
                                  })
                                }
                                className="px-2 py-0.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium border border-black/5 dark:border-white/5 rounded text-[11px] hover:bg-[#C6C6C8] active:scale-95 transition-all cursor-pointer"
                              >
                                🐌{" "}
                                {language === "en" ? "Low Leverage (3/8)" : language === "tr" ? "Düşük Kaldıraç (3/8)" : "Niska poluga (3/8)"}
                              </button>
                            </div>

                            {/* Calculated analysis readout */}
                            {(() => {
                              const lInfo = getLeverageInfo(task);
                              if (!lInfo) {
                                return (
                                  <div className="pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium leading-none">
                                    <span className="text-[#3C3C43] dark:text-[#EBEBF5]/50 italic">
                                      {language === "en" ? "Impact not evaluated..." : language === "tr" ? "Etki değerlendirilmedi..." : "Važnost još nije analizirana..."}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onTabChange) onTabChange("pareto");
                                      }}
                                      className="text-[#AF52DE] dark:text-[#BF5AF2] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <BarChart3 className="w-3 h-3" />
                                      {language === "en" ? "Analyze deeper in Smart Filter" : language === "tr" ? "Akıllı Filtrede derinlemesine analiz et" : "Detaljna analiza u Pametnom Filteru"}
                                    </button>
                                  </div>
                                );
                              }
                              return (
                                <div className="pt-2.5 border-t border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 flex items-center justify-between text-xs font-medium leading-none">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                                      {language === "en" ? "Impact Score:" : language === "tr" ? "Etki Puanı:" : "Procena važnosti:"}
                                    </span>
                                    <span className="text-[#AF52DE] dark:text-[#BF5AF2] bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 px-1.5 py-0.5 rounded border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 font-bold">
                                      {lInfo.ratio.toFixed(1)}x
                                    </span>
                                  </div>
                                  <span
                                    className={`px-2 py-1 rounded-md text-[11px] border font-semibold ${lInfo.colorClass}`}
                                  >
                                    {language === "en"
                                      ? lInfo.labelEn
                                      : lInfo.labelSr}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions (Reprioritize / Reminders / Delete) */}
                    <div className="flex items-center justify-end gap-1 px-1 py-1 sm:px-0 sm:py-0 border-t border-black/5 dark:border-white/5 sm:border-none pt-2.5 sm:pt-0 sm:gap-1.5 shrink-0 self-stretch sm:self-center relative z-10">
                      {/* Toggle quick reminder alarm */}
                      <button
                        onClick={() => {
                          if (task.reminderTime) {
                            onSetReminder(task.id, undefined); // remove
                          } else {
                            setActiveReminderTask(task);
                            // Default to current hour:minute
                            const now = new Date();
                            const hrs = String(now.getHours()).padStart(2, "0");
                            const mins = String(now.getMinutes()).padStart(
                              2,
                              "0",
                            );
                            setReminderTimeVal(`${hrs}:${mins}`);
                            setReminderErrorMsg("");
                          }
                        }}
                        className={`p-1.5 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded transition-colors cursor-pointer ${
                          task.reminderTime
                            ? "text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white"
                        }`}
                        id={`btn-set-reminder-time-${task.id}`}
                        title={
                          task.reminderTime ? t.removeReminder : t.addReminder
                        }
                      >
                        <Bell className="w-4 h-4" />
                      </button>

                      {/* Toggle quick deadline */}
                      <button
                        onClick={() => {
                          if (task.deadline) {
                            onSetDeadline(task.id, undefined); // remove
                          } else {
                            setActiveDeadlineTask(task);
                            setDeadlineDateVal(
                              new Date().toISOString().split("T")[0],
                            );
                            setDeadlineErrorMsg("");
                          }
                        }}
                        className={`p-1.5 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded transition-colors cursor-pointer ${
                          task.deadline
                            ? "text-[#007AFF] bg-[#007AFF]/10 border border-black/5 dark:border-white/5"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80"
                        }`}
                        id={`btn-set-deadline-date-${task.id}`}
                        title={
                          task.deadline
                            ? language === "en" ? "Remove deadline" : language === "tr" ? "Son tarihi kaldır" : "Ukloni krajnji rok"
                            : language === "en" ? "Add deadline" : language === "tr" ? "Son tarih ekle" : "Dodaj krajnji rok"
                        }
                      >
                        <Calendar className="w-4 h-4" />
                      </button>

                      {/* Toggle High Impact sliders */}
                      <button
                        onClick={() => {
                          setExpandedParetoTaskId(
                            expandedParetoTaskId === task.id ? null : task.id,
                          );
                        }}
                        className={`p-1.5 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded transition-colors cursor-pointer ${
                          task.effort && task.impact
                            ? "text-[#AF52DE] dark:text-[#BF5AF2] bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80"
                        }`}
                        id={`btn-toggle-pareto-${task.id}`}
                        title={
                          language === "en" ? "Smart Impact Analysis" : language === "tr" ? "Akıllı Etki Analizi" : "Pametna analiza prioriteta"
                        }
                      >
                        <Zap className="w-4 h-4" />
                      </button>

                      {/* Trash Delete */}
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] rounded transition-colors cursor-pointer"
                        id={`btn-delete-${task.id}`}
                        title={t.deleteTask}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })
          ) : (
            <EmptyStateVisual
              catFilter={catFilter}
              statusFilter={statusFilter}
              totalTasks={tasks.length}
              language={language}
              onResetFilters={() => {
                setCatFilter("ALL");
                setStatusFilter("ALL");
                setSearch("");
                triggerHaptics("medium");
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* --- RENDER CUSTOM DIALOG MODALS --- */}
      <AnimatePresence>
        {activeReminderTask && (
          <div className="fixed inset-0 bg-white dark:bg-[#1C1C1E]/5 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 flex items-center justify-center text-[#FF9500]">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-black dark:text-white text-sm">
                    {language === "en" ? "Set Custom Reminder" : language === "tr" ? "Özel Hatırlatıcı Ayarla" : "Postavi podsetnik za zadatak"}
                  </h3>
                  <p className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5 truncate">
                    {activeReminderTask.title}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {language === "en" ? "Select Time" : language === "tr" ? "Zamanı Seçin" : "Izaberi vreme (HH:MM)"}
                  </label>
                  <input
                    type="time"
                    value={reminderTimeVal}
                    onChange={(e) => {
                      setReminderTimeVal(e.target.value);
                      setReminderErrorMsg("");
                    }}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A] rounded-xl transition-all text-center font-medium text-black dark:text-[#EBEBF5]/90 select-all shadow-sm"
                    id="modal-reminder-time-input"
                    required
                  />
                </div>

                {reminderErrorMsg && (
                  <p className="text-xs text-[#FF3B30] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 p-2 rounded-lg border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-center font-medium">
                    ⚠️ {reminderErrorMsg}
                  </p>
                )}
              </div>

              <div className="p-4 bg-[#E5E5EA] dark:bg-[#3A3A3C] border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveReminderTask(null);
                    setReminderTimeVal("");
                    setReminderErrorMsg("");
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] active:translate-y-0.5 rounded-xl transition-all cursor-pointer"
                >
                  {language === "en" ? "Cancel" : language === "tr" ? "İptal etmek" : "Otkaži"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!reminderTimeVal) {
                      setReminderErrorMsg(
                        language === "en" ? "Please select a valid time!" : language === "tr" ? "Lütfen geçerli bir zaman seçin!" : "Molimo izaberite ispravno vreme!",
                      );
                      return;
                    }
                    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTimeVal)) {
                      onSetReminder(activeReminderTask.id, reminderTimeVal);
                      setActiveReminderTask(null);
                      setReminderTimeVal("");
                      setReminderErrorMsg("");
                    } else {
                      setReminderErrorMsg(t.wrongFormatAlert);
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#FF9500] hover:bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 active:translate-y-0.5 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Save Reminder" : language === "tr" ? "Hatırlatıcıyı Kaydet" : "Sačuvaj podsetnik"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeDeadlineTask && (
          <div className="fixed inset-0 bg-white dark:bg-[#1C1C1E]/5 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 flex items-center justify-center text-[#007AFF]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-black dark:text-white text-sm">
                    {language === "en" ? "Set Task Deadline" : language === "tr" ? "Görev Son Tarihini Ayarla" : "Postavi krajnji rok"}
                  </h3>
                  <p className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5 truncate">
                    {activeDeadlineTask.title}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {language === "en" ? "Choose Target Date" : language === "tr" ? "Hedef Tarihi Seçin" : "Izaberi ciljni datum"}
                  </label>
                  <input
                    type="date"
                    value={deadlineDateVal}
                    onChange={(e) => {
                      setDeadlineDateVal(e.target.value);
                      setDeadlineErrorMsg("");
                    }}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] rounded-xl transition-all text-center font-medium text-black dark:text-[#EBEBF5]/90 select-all shadow-sm"
                    id="modal-deadline-date-input"
                    required
                  />
                </div>

                {deadlineErrorMsg && (
                  <p className="text-xs text-[#FF3B30] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 p-2 rounded-lg border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-center font-medium">
                    ⚠️ {deadlineErrorMsg}
                  </p>
                )}
              </div>

              <div className="p-4 bg-[#E5E5EA] dark:bg-[#3A3A3C] border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDeadlineTask(null);
                    setDeadlineDateVal("");
                    setDeadlineErrorMsg("");
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] active:translate-y-0.5 rounded-xl transition-all cursor-pointer"
                >
                  {language === "en" ? "Cancel" : language === "tr" ? "İptal etmek" : "Otkaži"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!deadlineDateVal) {
                      setDeadlineErrorMsg(
                        language === "en" ? "Please select a date!" : language === "tr" ? "Lütfen bir tarih seçin!" : "Molimo izaberite datum!",
                      );
                      return;
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineDateVal)) {
                      onSetDeadline(activeDeadlineTask.id, deadlineDateVal);
                      setActiveDeadlineTask(null);
                      setDeadlineDateVal("");
                      setDeadlineErrorMsg("");
                    } else {
                      setDeadlineErrorMsg(
                        language === "en" ? "Invalid date format!" : language === "tr" ? "Geçersiz tarih biçimi!" : "Neispravan format datuma!",
                      );
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#007AFF] hover:opacity-90 active:translate-y-0.5 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Save Deadline" : language === "tr" ? "Son Tarihi Kaydet" : "Sačuvaj rok"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
