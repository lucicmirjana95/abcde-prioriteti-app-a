import { useState, useEffect } from "react";
import { Task } from "../types";
import {
  AlertCircle,
  HelpCircle,
  UserCheck,
  ShieldAlert,
  Sparkles,
  XOctagon,
  Check,
  Trash2,
  Calendar,
  Bell,
  X,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  Plus,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translations, Language } from "../translations";
import { playInteractionSound } from "../lib/audioEngine";
import { getDiscoverySettings } from "../lib/discoveryEngine";
import { safeStorage } from "../lib/safeStorageSetup";

interface MatrixOverviewProps {
  tasks: Task[];
  language: Language;
  onUpdateTask?: (id: string, fields: Partial<Task>) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onAddTask?: (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => void;
  onViewTaskList?: () => void;
}

export default function MatrixOverview({
  tasks,
  language,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onMoveUp,
  onMoveDown,
  onAddTask,
  onViewTaskList,
}: MatrixOverviewProps) {
  const t = translations[language];

  const [recentDoneIds, setRecentDoneIds] = useState<string[]>([]);

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

  const handleToggleWithHaptic = (task: Task) => {
    if (onToggleTask) {
      const discSettings = getDiscoverySettings();
      const soundsEnabled = discSettings?.soundsEnabled !== false;
      const activeSoundPack = discSettings?.activeSoundPack || "default";
      const taskSoundEnabled = safeStorage.getItem("abcde_task_complete_sound") !== "false";

      if (!task.done) {
        setRecentDoneIds((prev) => [...prev, task.id]);
        setTimeout(() => {
          setRecentDoneIds((prev) => prev.filter((id) => id !== task.id));
        }, 1200);

        if (soundsEnabled && taskSoundEnabled) {
          playInteractionSound(activeSoundPack, "check");
        }

        // Toggle to Completed (Success / Achievement case)
        const activeCount = tasks.filter((t) => !t.done).length;
        const isDailyGoalAchievement = activeCount === 1; // It was the last active task

        // Using simple logic for high priority categories
        const isHighLeverage = task.category === "A" || task.category === "B";

        if (isDailyGoalAchievement) {
          triggerHaptics("success");
        } else if (isHighLeverage) {
          triggerHaptics("heavy");
        } else {
          triggerHaptics("medium");
        }
      } else {
        if (soundsEnabled && taskSoundEnabled) {
          playInteractionSound(activeSoundPack, "uncheck");
        }
        triggerHaptics("light"); // Back to active
      }
      onToggleTask(task.id);
    }
  };

  // State for editing task
  const [selectedEditingTask, setSelectedEditingTask] = useState<Task | null>(
    null,
  );

  // Edit form states
  const [modalTitle, setModalTitle] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [modalDone, setModalDone] = useState(false);
  const [modalCategory, setModalCategory] = useState<
    "A" | "B" | "C" | "D" | "E"
  >("A");
  const [modalDelegatedTo, setModalDelegatedTo] = useState("");
  const [modalEliminationReason, setModalEliminationReason] = useState("");
  const [modalDeadline, setModalDeadline] = useState("");
  const [modalReminderTime, setModalReminderTime] = useState("");
  const [modalTimeRequired, setModalTimeRequired] = useState<number | "">("");
  const [modalEnergyRequired, setModalEnergyRequired] =
    useState<string>("Medium");

  useEffect(() => {
    if (selectedEditingTask) {
      setModalTitle(selectedEditingTask.title);
      setModalDesc(selectedEditingTask.description || "");
      setModalDone(selectedEditingTask.done);
      setModalCategory(selectedEditingTask.category);
      setModalDelegatedTo(selectedEditingTask.delegatedTo || "");
      setModalEliminationReason(selectedEditingTask.eliminationReason || "");
      setModalDeadline(selectedEditingTask.deadline || "");
      setModalReminderTime(selectedEditingTask.reminderTime || "");
      setModalTimeRequired(
        selectedEditingTask.timeRequired !== undefined
          ? selectedEditingTask.timeRequired
          : "",
      );
      setModalEnergyRequired(selectedEditingTask.energyRequired || "Medium");
    }
  }, [selectedEditingTask]);

  // Active mobile view tab category to solve poorly optimized mobile lists
  const [activeMobileCategory, setActiveMobileCategory] = useState<
    "A" | "B" | "C" | "D" | "E"
  >("A");

  // Touch event states for swipe gesture navigation on phone screens
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Trigger swipe if horizontal dominant and exceeds threshold of 45px
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
      const order: ("A" | "B" | "C" | "D" | "E")[] = ["A", "B", "C", "D", "E"];
      const currentIndex = order.indexOf(activeMobileCategory);
      
      if (diffX < 0) {
        // Swiped from right to left -> Next Category
        if (currentIndex < order.length - 1) {
          setActiveMobileCategory(order[currentIndex + 1]);
          triggerHaptics("light");
        }
      } else {
        // Swiped from left to right -> Previous Category
        if (currentIndex > 0) {
          setActiveMobileCategory(order[currentIndex - 1]);
          triggerHaptics("light");
        }
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Inline quick add state for categories
  const [inlineAddTexts, setInlineAddTexts] = useState<Record<string, string>>({
    A: "",
    B: "",
    C: "",
    D: "",
    E: "",
  });
  const [activeInlineCategory, setActiveInlineCategory] = useState<
    "A" | "B" | "C" | "D" | "E" | null
  >(null);

  const handleInlineQuickAdd = (cat: "A" | "B" | "C" | "D" | "E") => {
    const text = inlineAddTexts[cat];
    if (!text || !text.trim() || !onAddTask) return;
    onAddTask(text.trim(), "", cat);
    setInlineAddTexts((prev) => ({ ...prev, [cat]: "" }));
    setActiveInlineCategory(null);
  };

  // Group tasks
  const getTasksByCategory = (cat: "A" | "B" | "C" | "D" | "E") => {
    return tasks.filter((t) => t.category === cat && (!t.done || recentDoneIds.includes(t.id)));
  };

  const categories = [
    {
      code: "A" as const,
      name: t.categoryTitles.A,
      desc: t.categoryDescs.A,
      borderClass:
        "border-[#FF3B30]/20 dark:border-[#FF453A]/20 bg-white dark:bg-[#1C1C1E]",
      headerBg:
        "bg-[#FF3B30]/10 dark:bg-[#FF453A]/40 border-b border-[#FF3B30]/20 dark:border-[#FF453A]/20/50",
      bulletColor: "bg-[#FF3B30] dark:bg-[#FF453A]",
      badgeColor:
        "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A]",
      titleColor: "text-[#FF3B30] dark:text-[#FF453A]",
      icon: (
        <ShieldAlert className="w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" />
      ),
      iconBg:
        "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10/80 border border-[#FF3B30]/20 dark:border-[#FF453A]/20/55",
    },
    {
      code: "B" as const,
      name: t.categoryTitles.B,
      desc: t.categoryDescs.B,
      borderClass:
        "border-[#FF9500]/20 dark:border-[#FF9F0A]/20 bg-white dark:bg-[#1C1C1E]",
      headerBg:
        "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-b border-[#FF9500]/20 dark:border-[#FF9F0A]/20",
      bulletColor: "bg-[#FF9500] dark:bg-[#FF9F0A]",
      badgeColor:
        "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A]",
      titleColor: "text-[#FF9500] dark:text-[#FF9F0A]",
      icon: (
        <AlertCircle className="w-6 h-6 text-[#FF9500] dark:text-[#FF9F0A]" />
      ),
      iconBg:
        "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20",
    },
    {
      code: "C" as const,
      name: t.categoryTitles.C,
      desc: t.categoryDescs.C,
      borderClass:
        "border-[#34C759]/20 dark:border-[#30D158]/20 bg-white dark:bg-[#1C1C1E]",
      headerBg:
        "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-b border-[#34C759]/20 dark:border-[#30D158]/20",
      bulletColor: "bg-[#34C759] dark:bg-[#30D158]",
      badgeColor:
        "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158]",
      titleColor: "text-[#34C759] dark:text-[#30D158]",
      icon: (
        <HelpCircle className="w-6 h-6 text-[#34C759] dark:text-[#30D158]" />
      ),
      iconBg:
        "bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20",
    },
    {
      code: "D" as const,
      name: t.categoryTitles.D,
      desc: t.categoryDescs.D,
      borderClass:
        "border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E]",
      headerBg:
        "bg-[#E5E5EA] dark:bg-[#3A3A3C]/40 border-b border-black/5 dark:border-white/5",
      bulletColor: "bg-[#007AFF] dark:bg-[#0A84FF]",
      badgeColor:
        "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF]",
      titleColor: "text-black dark:text-white",
      icon: (
        <UserCheck className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" />
      ),
      iconBg:
        "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border border-[#007AFF]/20 dark:border-[#0A84FF]/20",
    },
    {
      code: "E" as const,
      name: t.categoryTitles.E,
      desc: t.categoryDescs.E,
      borderClass:
        "border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-white",
      headerBg: "bg-[#1C1C1E] border-b border-black/5 dark:border-white/10",
      bulletColor: "bg-[#FF3B30] dark:bg-[#FF453A]",
      badgeColor:
        "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A]",
      titleColor: "text-[#FF3B30] dark:text-[#FF453A]",
      icon: <XOctagon className="w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" />,
      iconBg:
        "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20",
    },
  ];

  const mTexts = {
    en: {
      editTitle: "Edit Priority Task",
      taskName: "Task Description / Action Name",
      category: "Priority Category",
      doneStatus: "Completion Status",
      completedStatus: "Completed / Finished 🎉",
      activeText: "Active / In Progress",
      delegated: "Delegated Partner Name (For D)",
      elimination: "Reason for Elimination (For E)",
      deadline: "Target Deadline Date",
      reminder: "Reminder Time (Alarm HH:MM)",
      timeRequired: "Time Required (minutes)",
      energyLevel: "Energy Level Needed",
      save: "Save Changes",
      cancel: "Cancel",
      delete: "Delete Task",
      descLabel: "Detailed notes or task subtext",
      swipeTip: "← Drag or select icons above to browse categories →",
    },
    sr: {
      editTitle: "Izmeni prioritetni zadatak",
      taskName: "Naziv i opis akcije",
      category: "Kategorija prioriteta",
      doneStatus: "Status izvršenja",
      completedStatus: "Završeno 🎉",
      activeText: "Aktivno (u radu)",
      delegated: "Delegirano osobi (Za D)",
      elimination: "Razlog eliminacije (Za E)",
      deadline: "Ciljni krajnji rok",
      reminder: "Vreme podsetnika (HH:MM)",
      timeRequired: "Potrebno vreme (u minutima)",
      energyLevel: "Nivo potrebne energije",
      save: "Sačuvaj izmene",
      cancel: "Otkaži",
      delete: "Obriši zadatak",
      descLabel: "Dodatne beleške ili objašnjenje",
      swipeTip: "← Prevuci levo-desno ili klikni na ikone gore za pregled →",
    },
    tr: {
      editTitle: "Öncelikli Görevi Düzenle",
      taskName: "Görev Açıklaması / Eylem Adı",
      category: "Öncelik Kategorisi",
      doneStatus: "Tamamlanma Durumu",
      completedStatus: "Tamamlandı / Bitti 🎉",
      activeText: "Aktif / Devam Ediyor",
      delegated: "Temsilci Ortak Adı (D İçin)",
      elimination: "Eleme Nedeni (E İçin)",
      deadline: "Hedef Son Tarih",
      reminder: "Hatırlatma Zamanı (Alarm SS:DD)",
      timeRequired: "Gereken Süre (dakika)",
      energyLevel: "Gerekli Enerji Seviyesi",
      save: "Değişiklikleri Kaydet",
      cancel: "İptal",
      delete: "Görevi Sil",
      descLabel: "Detaylı notlar veya görev alt metni",
      swipeTip: "← Kategorilere göz atmak için yukarıdaki simgeleri sürükleyin veya seçin →",
    },
  }[language === "en" || language === "sr" || language === "tr" ? language : "en"] || {
    editTitle: "Edit Task",
    taskName: "Task Description",
    category: "Category",
    doneStatus: "Status",
    completedStatus: "Completed",
    activeText: "Active",
    delegated: "Delegated Partner",
    elimination: "Elimination Reason",
    deadline: "Deadline Date",
    reminder: "Reminder Time",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    descLabel: "Notes",
    swipeTip: "← Swipe left-right or use icons above →",
  };

  const handleSaveModal = () => {
    if (!selectedEditingTask || !onUpdateTask) return;

    onUpdateTask(selectedEditingTask.id, {
      title: modalTitle,
      description: modalDesc || undefined,
      category: modalCategory,
      delegatedTo:
        modalCategory === "D" ? modalDelegatedTo || undefined : undefined,
      eliminationReason:
        modalCategory === "E" ? modalEliminationReason || undefined : undefined,
      deadline: modalDeadline || undefined,
      reminderTime: modalReminderTime || undefined,
      timeRequired:
        typeof modalTimeRequired === "number" ? modalTimeRequired : undefined,
      energyRequired: modalEnergyRequired || undefined,
    });

    if (modalDone !== selectedEditingTask.done && onToggleTask) {
      handleToggleWithHaptic(selectedEditingTask);
    }

    setSelectedEditingTask(null);
  };

  const handleDeleteModal = () => {
    if (!selectedEditingTask || !onDeleteTask) return;
    onDeleteTask(selectedEditingTask.id);
    setSelectedEditingTask(null);
  };

  const renderColumn = (
    cat: (typeof categories)[0],
    isMobile: boolean,
    index: number = 0,
  ) => {
    const catTasks = getTasksByCategory(cat.code);
    const sortedCatTasks = [...catTasks].sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }
      return (a.subPriority || 0) - (b.subPriority || 0);
    });
    const completedTasks = catTasks.filter((t) => t.done);
    const isCategoryE = cat.code === "E";

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1],
          delay: index * 0.05 + 0.1,
        }}
        key={cat.code}
        className={`border rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-300 ease-out dark:hover:shadow-2xl dark:hover:shadow-black/50 hover:border-black/10 dark:hover:border-white/10 hover:-translate-y-1 ${
          isMobile
            ? "w-full min-w-0 h-auto p-1.5 pb-2"
            : "w-full min-w-0 h-auto md:min-h-[480px] lg:min-h-[580px] pb-4"
        } ${cat.borderClass}`}
        id={`matrix-column-${isMobile ? "mob-" : "dt-"}${cat.code}`}
      >
        <div>
          {/* Header panel inside column */}
          <div
            className={`p-4 flex items-center justify-between gap-2 ${cat.headerBg}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-xl shrink-0 flex items-center justify-center ${cat.iconBg}`}
              >
                {cat.icon}
              </div>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <h4
                  className={`font-semibold text-xl shrink-0 ${isCategoryE ? "text-[#3C3C43] dark:text-[#EBEBF5]/80" : "text-black dark:text-white"}`}
                >
                  {cat.code}
                </h4>
                <span
                  className={`text-xs font-semibold truncate ${isCategoryE ? "text-[#3C3C43] dark:text-[#EBEBF5]/80" : "text-black dark:text-white"}`}
                >
                  {cat.name}
                </span>
              </div>
            </div>
            <span
              className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium px-2.5 py-1 rounded-full shrink-0 ${cat.badgeColor}`}
            >
              {completedTasks.length}/{catTasks.length}
            </span>
          </div>

          <div className="p-4 pt-3">
            <p
              className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug line-clamp-2 min-h-[32px] mb-3 ${isCategoryE ? "text-[#3C3C43] dark:text-[#EBEBF5]/80" : "text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
            >
              {cat.desc}
            </p>

            {/* Sublist of all task titles in hierarchy */}
            <div
              className={`space-y-2 pr-0.5 text-xs ${isMobile ? "max-h-none overflow-visible" : "max-h-[380px] overflow-y-auto"}`}
            >
              {sortedCatTasks.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {sortedCatTasks.map((tItem) => {
                    let badgeColorStyle =
                      "text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 font-medium";
                    let taskTitleColorStyle =
                      "text-black dark:text-white font-medium";

                    if (tItem.done) {
                      badgeColorStyle =
                        "text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-[#E5E5EA] dark:bg-[#3A3A3C] line-through scale-95 opacity-50";
                      taskTitleColorStyle =
                        "text-[#3C3C43] dark:text-[#EBEBF5]/80 line-through italic font-medium";
                    } else if (cat.code === "A") {
                      badgeColorStyle =
                        "text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 font-semibold";
                      taskTitleColorStyle =
                        "text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold";
                    } else if (cat.code === "B") {
                      badgeColorStyle =
                        "text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 font-semibold";
                      taskTitleColorStyle =
                        "text-black dark:text-white font-medium";
                    } else if (cat.code === "C") {
                      badgeColorStyle =
                        "text-[#34C759] dark:text-[#30D158] bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 font-semibold";
                      taskTitleColorStyle =
                        "text-[#34C759] dark:text-[#30D158] font-medium";
                    } else if (cat.code === "D") {
                      badgeColorStyle =
                        "text-[#007AFF] bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border border-black/5 dark:border-white/5 font-semibold";
                      taskTitleColorStyle =
                        "text-black dark:text-white font-semibold";
                    } else if (cat.code === "E") {
                      badgeColorStyle =
                        "text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 font-semibold";
                      taskTitleColorStyle =
                        "text-[#3C3C43] dark:text-[#EBEBF5]/80 line-through font-medium";
                    }

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        key={tItem.id}
                        onClick={() => setSelectedEditingTask(tItem)}
                        className={`w-full min-w-0 border rounded-xl p-2.5 flex flex-col justify-between gap-2 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/40 hover:-translate-y-0.5 hover:border-black/10 dark:hover:border-white/10 active:scale-[0.98] ${
                          tItem.done
                            ? "bg-[#E5E5EA] dark:bg-[#3A3A3C] opacity-55 border-black/5 dark:border-white/5"
                            : isCategoryE
                              ? "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:bg-[#1C1C1E]"
                              : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:bg-white dark:bg-[#1C1C1E] dark:hover:bg-[#2C2C2E]"
                        }`}
                        id={`matrix-task-${tItem.id}`}
                        title={
                          language === "en" ? "Click to edit details" : language === "tr" ? "Detayları düzenlemek için tıklayın" : "Klikni za detalje zadatka"
                        }
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1 text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleTask) handleToggleWithHaptic(tItem);
                            }}
                            className={`mt-0.5 w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              tItem.done
                                ? "bg-[#34C759] dark:bg-[#30D158] border-[#34C759] dark:border-[#30D158] text-white shadow-xs"
                                : "border-[#8E8E93] dark:border-[#636366] bg-white dark:bg-[#2C2C2E] hover:border-[#007AFF] dark:hover:border-[#0A84FF] hover:scale-105 active:scale-95"
                            }`}
                            title={
                              language === "en" ? "Toggle Done" : language === "tr" ? "Tamamlandı olarak işaretle" : "Označi završeno"
                            }
                          >
                            {tItem.done && (
                              <Check className="w-3 h-3 text-white stroke-[4]" />
                            )}
                          </button>

                          <span
                            className={`mt-0.5 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold px-1.5 py-0.5 rounded shrink-0 ${badgeColorStyle}`}
                          >
                            {cat.code}
                            {tItem.subPriority}
                          </span>

                          <div className="flex flex-col min-w-0 flex-1">
                            <span
                              className={`text-xs font-semibold break-words whitespace-normal leading-tight ${taskTitleColorStyle}`}
                              title={tItem.title}
                            >
                              {tItem.title}
                            </span>
                            {(tItem.timeRequired !== undefined ||
                              tItem.energyRequired) && (
                              <div className="flex items-center gap-1.5 mt-1 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 scale-95 origin-left">
                                {typeof tItem.timeRequired === "number" && (
                                  <span>⏱️ {tItem.timeRequired}m</span>
                                )}
                                {tItem.energyRequired && (
                                  <span
                                    className={
                                      tItem.energyRequired === "High"
                                        ? "text-[#FF3B30] font-medium"
                                        : tItem.energyRequired === "Medium"
                                          ? "text-[#FF9500] font-medium"
                                          : "text-[#34C759] font-medium"
                                    }
                                  >
                                    ⚡{" "}
                                    {tItem.energyRequired === "High"
                                      ? "H"
                                      : tItem.energyRequired === "Medium"
                                        ? "M"
                                        : "L"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* QUICK ACTION BAR TO MAINTAIN HIGH MOBILE USABILITY */}
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 dark:border-white/5/40 w-full">
                          {/* Status Check indicator */}
                          <div className="text-[13px] opacity-70 font-medium flex items-center gap-0.5 text-[#3C3C43] dark:text-[#EBEBF5]/80">
                            {tItem.done ? "✓ Done" : "Active"}
                          </div>

                          {/* Action buttons drawer */}
                          <div className="flex items-center gap-1">
                            {onMoveUp && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveUp(tItem.id);
                                }}
                                className="p-1 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 rounded-md transition-colors cursor-pointer text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#007AFF]"
                                title={
                                  language === "en" ? "Move Up Order" : language === "tr" ? "Sırayı Yukarı Taşı" : "Pomeri naviše"
                                }
                              >
                                <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            )}
                            {onMoveDown && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveDown(tItem.id);
                                }}
                                className="p-1 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 rounded-md transition-colors cursor-pointer text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#007AFF]"
                                title={
                                  language === "en" ? "Move Down Order" : language === "tr" ? "Aşağı Sırayı Taşı" : "Pomeri naniže"
                                }
                              >
                                <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            )}
                            {onDeleteTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTask(tItem.id);
                                }}
                                className="p-1 hover:bg-[#FF3B30]/10 dark:hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/40 rounded-md transition-colors cursor-pointer text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] dark:text-[#FF453A]"
                                title={
                                  language === "en" ? "Delete Task" : language === "tr" ? "Görevi Sil" : "Obriši"
                                }
                              >
                                <Trash2 className="w-3 h-3 stroke-[2.5] pointer-events-none" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <div
                  className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 italic text-center py-4 rounded-xl border border-dashed ${
                    isCategoryE
                      ? "text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5"
                      : "text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5"
                  }`}
                >
                  {t.noActive}
                </div>
              )}
            </div>

            {/* INLINE QUICK ADD FOR GORGEOUS INSTANT MOBILE PRIORITY INJECTIONS */}
            {onAddTask && (
              <div className="mt-4">
                {activeInlineCategory === cat.code ? (
                  <div className="flex items-center gap-1 p-1 bg-[#E5E5EA] dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                    <input
                      type="text"
                      autoFocus
                      placeholder={
                        language === "en" ? "Task title..." : language === "tr" ? "Görev başlığı..." : "Naziv zadatka..."
                      }
                      value={inlineAddTexts[cat.code] || ""}
                      onChange={(e) =>
                        setInlineAddTexts((prev) => ({
                          ...prev,
                          [cat.code]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInlineQuickAdd(cat.code);
                        if (e.key === "Escape") setActiveInlineCategory(null);
                      }}
                      className="w-full px-2.5 py-2 outline-none text-[14px] font-medium bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 shadow-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleInlineQuickAdd(cat.code)}
                      className="p-1.5 bg-[#007AFF] active:opacity-70 transition-opacity text-white rounded-lg cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveInlineCategory(null)}
                      className="p-1.5 bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded-lg cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveInlineCategory(cat.code)}
                    className={`w-full py-2 border border-dashed rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isCategoryE
                        ? "border-black/5 dark:border-white/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-black/5 dark:bg-white/5 hover:text-white"
                        : "border-black/5 dark:border-white/5 active:opacity-70 transition-opacity duration-150 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#007AFF] border-black/5 dark:border-white/10"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {language === "en" ? "Quick Add" : language === "tr" ? "Hızlı Ekle" : "Brzi unos u"}{" "}
                      {cat.code}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion Percent Bar */}
        <div
          className={`p-4 pt-1 pb-3 ${isCategoryE ? "border-black/5 dark:border-white/5" : "border-black/5 dark:border-white/5"}`}
        >
          <div
            className={`flex justify-between text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1 ${isCategoryE ? "text-[#3C3C43] dark:text-[#EBEBF5]/80" : "text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
          >
            <span>{t.progress}</span>
            <span>
              {catTasks.length > 0
                ? Math.round((completedTasks.length / catTasks.length) * 100)
                : 0}
              %
            </span>
          </div>
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${isCategoryE ? "bg-black/5 dark:bg-white/5" : "bg-[#E5E5EA] dark:bg-[#3A3A3C]"}`}
          >
            <div
              className={`h-full ${cat.bulletColor} rounded-full transition-all duration-501`}
              style={{
                width: `${
                  catTasks.length > 0
                    ? (completedTasks.length / catTasks.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 font-sans" id="matrix-overview-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
          {t.matrixDistribution}
        </h3>
        <div className="text-xs bg-white dark:bg-[#1C1C1E] px-3 py-1.5 rounded-xl text-[#3C3C43] dark:text-[#EBEBF5]/80 border border-black/5 dark:border-white/5 flex items-center gap-1">
          <span>
            {t.totalCount}:{" "}
            <strong className="text-black dark:text-white">
              {tasks.length}
            </strong>
          </span>
          <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">|</span>
          <span>
            {t.completed}:{" "}
            <strong className="text-[#34C759]">
              {tasks.filter((t) => t.done).length}
            </strong>
          </span>
        </div>
      </div>

      {/* Swipe and Mobile Icon tabs helper */}
      <div className="md:hidden flex flex-col gap-2">
        <div
          className="flex bg-[#E5E5EA] dark:bg-[#3A3A3C] p-1 rounded-xl border border-black/5 dark:border-white/5 gap-1.5 justify-between"
          id="mobile-priority-tabs-switches"
        >
          {categories.map((cat) => {
            const isActive = activeMobileCategory === cat.code;
            const count = getTasksByCategory(cat.code).length;
            return (
              <button
                key={cat.code}
                onClick={() => {
                  setActiveMobileCategory(cat.code);
                }}
                className={`flex-1 py-2 px-1.5 rounded-lg font-semibold text-xs flex flex-col items-center gap-0.5 min-w-0 cursor-pointer transition-all active:scale-95 border ${
                  isActive
                    ? `${cat.badgeColor} border-current font-semibold focus:outline-none`
                    : "bg-white dark:bg-[#1C1C1E] border-transparent text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                }`}
                title={cat.name}
              >
                <span className="text-base leading-none">
                  {cat.code === "A"
                    ? "🚨"
                    : cat.code === "B"
                      ? "⚠️"
                      : cat.code === "C"
                        ? "💡"
                        : cat.code === "D"
                          ? "🤝"
                          : "🗑️"}
                </span>
                <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 er flex items-center gap-1 font-semibold">
                  {cat.code}{" "}
                  <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-[#1C1C1E]/10 dark:bg-white/5 px-1 rounded-md">
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Optimized Category View with Touch Swipe gestures and page indicators */}
      <div className="md:hidden flex flex-col items-center">
        {/* Dynamic page dots indicator */}
        <div className="flex justify-center gap-2 mt-2 mb-1 select-none">
          {categories.map((cat) => {
            const isActive = activeMobileCategory === cat.code;
            return (
              <span
                key={cat.code}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive ? "w-5 bg-[#007AFF] dark:bg-[#0A84FF]" : "w-1.5 bg-[#C7C7CC] dark:bg-[#48484A]"
                }`}
              />
            );
          })}
        </div>

        {/* Swipe instructions indicator */}
        <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-[#8E8E93] dark:text-[#EBEBF5]/60/80 tracking-wide select-none mb-2">
          <span>←</span>
          <span>
            {language === "en" 
              ? "Swipe left/right to change category" 
              : language === "tr" 
                ? "Kategoriyi değiştirmek için kaydırın" 
                : "Prevuci levo/desno za promenu polja"}
          </span>
          <span>→</span>
        </div>

        <div 
          className="w-full pb-4 select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {renderColumn(
            categories.find((c) => c.code === activeMobileCategory) ||
              categories[0],
            true,
          )}
        </div>
      </div>

      {onViewTaskList && (
        <div className="md:hidden -mt-1 pb-4">
          <button
            type="button"
            onClick={onViewTaskList}
            className="w-full py-4.5 bg-[#007AFF] active:opacity-70 hover:scale-[1.01] active:scale-[0.99] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            id="mobile-view-entire-list-btn"
          >
            <CheckSquare className="w-4 h-4 stroke-[2.5]" />
            <span>
              {language === "en" ? "View Entire Task List 📋" : language === "tr" ? "Tüm Görev Listesini Görüntüle 📋" : "Prikaži celu listu zadataka 📋"}
            </span>
          </button>
        </div>
      )}

      {/* Stable equal-width Grid on desktop and tablet */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 w-full gap-4 pb-4">
        {categories.map((cat, index) => renderColumn(cat, false, index))}
      </div>

      {/* Beautiful Click Edit Task Modal Dialog */}
      <AnimatePresence>
        {selectedEditingTask && (
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-[150] p-4"
            onClick={() => setSelectedEditingTask(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/5 max-w-md w-full overflow-hidden max-h-[82vh] md:max-h-[90vh] flex flex-col text-black dark:text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-[#007AFF]/10 text-[#007AFF] rounded-xl">
                    <LayoutGrid className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-black dark:text-white text-sm md:text-base">
                      {mTexts.editTitle}
                    </h3>
                    <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      ID: {selectedEditingTask.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEditingTask(null)}
                  className="p-1.5 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-xl transition-all text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal form scrolls if screen is small */}
              <div
                className="p-5 space-y-4 overflow-y-auto flex-1 text-sm leading-relaxed"
                id="matrix-edit-modal-body"
              >
                {/* Task Title Form */}
                <div className="space-y-1">
                  <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {mTexts.taskName}
                  </label>
                  <input
                    type="text"
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] rounded-xl text-base md:text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 transition-all shadow-sm"
                    required
                  />
                </div>

                {/* Task Description Notes Form */}
                <div className="space-y-1">
                  <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {mTexts.descLabel}
                  </label>
                  <textarea
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                    className="w-full min-h-[70px] resize-y px-3 py-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#1C1C1E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] rounded-xl text-base md:text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 transition-all shadow-sm"
                    placeholder="..."
                  />
                </div>

                {/* Priority category drop-down */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {mTexts.category}
                    </label>
                    <select
                      value={modalCategory}
                      onChange={(e) =>
                        setModalCategory(
                          e.target.value as "A" | "B" | "C" | "D" | "E",
                        )
                      }
                      className="w-full px-3 py-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] outline-none rounded-xl text-base md:text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all cursor-pointer"
                    >
                      <option value="A">
                        A - {language === "en" ? "Must" : language === "tr" ? "Mutlak" : "Mora"}
                      </option>
                      <option value="B">
                        B - {language === "en" ? "Should" : language === "tr" ? "olmalı" : "Trebalo bi"}
                      </option>
                      <option value="C">
                        C - {language === "en" ? "Nice" : language === "tr" ? "Güzel" : "Moguće"}
                      </option>
                      <option value="D">
                        D - {language === "en" ? "Delegate" : language === "tr" ? "Temsilci" : "Delegirati"}
                      </option>
                      <option value="E">
                        E - {language === "en" ? "Eliminate" : language === "tr" ? "Elemek" : "Eliminisati"}
                      </option>
                    </select>
                  </div>

                  {/* Completion Toggle switch style button to satisfy: "i oznacim gotovim" */}
                  <div className="space-y-1">
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {mTexts.doneStatus}
                    </label>
                    <button
                      type="button"
                      onClick={() => setModalDone(!modalDone)}
                      className={`w-full py-2 rounded-xl text-base md:text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        modalDone
                          ? "bg-[#34C759] dark:bg-[#30D158] border-[#34C759] dark:border-[#30D158] text-white"
                          : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]"
                      }`}
                    >
                      {modalDone ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{mTexts.completedStatus}</span>
                        </>
                      ) : (
                        <span>{mTexts.activeText}</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Dynamic specific category properties */}
                {modalCategory === "D" && (
                  <div className="space-y-1.5 bg-[#007AFF]/10 border border-black/5 dark:border-white/5 p-3 rounded-xl animate-fadeIn">
                    <label className="block text-[13px] font-semibold text-[#007AFF]">
                      {mTexts.delegated}
                    </label>
                    <input
                      type="text"
                      value={modalDelegatedTo}
                      onChange={(e) => setModalDelegatedTo(e.target.value)}
                      placeholder={
                        language === "en" ? "e.g. Assistant, virtual helper, outsource teammate..." : language === "tr" ? "örneğin Asistan, sanal yardımcı, dış kaynak ekip arkadaşı..." : "Npr. Asistent, virtualni saradnik, spoljni izvršilac, kurir..."
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] text-base md:text-[13px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 rounded-xl shadow-sm transition-all"
                    />
                  </div>
                )}

                {modalCategory === "E" && (
                  <div className="space-y-1.5 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 p-3 rounded-xl animate-fadeIn">
                    <label className="block text-[13px] font-semibold text-[#FF3B30] dark:text-[#FF453A]">
                      {mTexts.elimination}
                    </label>
                    <input
                      type="text"
                      value={modalEliminationReason}
                      onChange={(e) =>
                        setModalEliminationReason(e.target.value)
                      }
                      placeholder={language === "en" ? "e.g. Drains energy, social waste" : language === "tr" ? "Örn. Enerjiyi tüketir, sosyal israf" : "Npr. Gubi energiju, gubljenje vremena"}
                      className="w-full px-3 py-2 bg-white dark:bg-[#2C2C2E] border border-[#FF3B30]/20 dark:border-[#FF453A]/20 outline-none focus:ring-2 focus:ring-[#FF3B30]/30 dark:focus:ring-[#FF453A]/30 focus:border-[#FF3B30] dark:focus:border-[#FF453A] text-base md:text-[13px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 rounded-xl shadow-sm transition-all"
                    />
                  </div>
                )}

                {/* Time Required and Energy Level Need inside editing popup */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {mTexts.timeRequired}
                    </label>
                    <input
                      type="number"
                      value={modalTimeRequired}
                      onChange={(e) =>
                        setModalTimeRequired(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder={language === "en" ? "e.g. 30" : language === "tr" ? "Örn. 30" : "Npr. 30"}
                      className="w-full px-2.5 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 focus:outline-none rounded-xl text-base md:text-xs font-semibold text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {mTexts.energyLevel}
                    </label>
                    <div className="flex bg-[#E5E5EA] dark:bg-[#3A3A3C] p-0.5 rounded-xl border border-black/5 dark:border-white/5 text-xs items-center gap-0.5">
                      {["Low", "Medium", "High"].map((level) => {
                        const isActive = modalEnergyRequired === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setModalEnergyRequired(level)}
                            className={`flex-1 py-1 rounded-lg text-base md:text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium transition-all cursor-pointer ${
                              isActive
                                ? level === "Low"
                                  ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-white"
                                  : level === "Medium"
                                    ? "bg-[#FF9500] dark:bg-[#FF9F0A] text-white"
                                    : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-white"
                                : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/50"
                            }`}
                          >
                            {level === "Low"
                              ? language === "en" ? "LOW" : language === "tr" ? "DÜŞÜK" : "NISKA"
                              : level === "Medium"
                                ? language === "en" ? "MEDIUM" : language === "tr" ? "ORTA" : "SREDNJA"
                                : language === "en" ? "HIGH" : language === "tr" ? "YÜKSEK" : "VISOKA"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick alarm / reminder and target date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {mTexts.deadline}
                    </label>
                    <input
                      type="date"
                      value={modalDeadline}
                      onChange={(e) => setModalDeadline(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 focus:outline-none rounded-xl text-base md:text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {mTexts.reminder}
                    </label>
                    <input
                      type="time"
                      value={modalReminderTime}
                      onChange={(e) => setModalReminderTime(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 focus:outline-none rounded-xl text-base md:text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons inside footer */}
              <div className="p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDeleteModal}
                  className="px-3.5 py-2.5 text-xs font-medium text-[#FF3B30] hover:text-white bg-[#FF3B30]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 hover:border-transparent transition-all active:scale-95 rounded-xl flex items-center gap-1 cursor-pointer"
                  title={mTexts.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{mTexts.delete}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEditingTask(null)}
                    className="px-4 py-2.5 text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl cursor-pointer"
                  >
                    {mTexts.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModal}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#007AFF] active:opacity-70 transition-opacity active:scale-95 rounded-xl cursor-pointer"
                  >
                    {mTexts.save}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
