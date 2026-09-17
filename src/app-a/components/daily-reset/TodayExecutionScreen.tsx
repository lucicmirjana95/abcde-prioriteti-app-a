import { ReevaluationDialog } from "./ReevaluationDialog";
import { StructuredReevaluationProposal } from "../../screens/planReview";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Leaf,
  MoreHorizontal,
  Pencil,
  Target,
  Timer,
  Trash2,
  Wind,
} from "lucide-react";
import type { DailyPlanDraft, DailyPlanItem } from "../../domain/daily-reset/contracts";
import { normalizeChronologicalOrder } from "../../domain/daily-reset/chronology";
import { recalculatePlanTotals } from "../../domain/daily-reset/validation";
import {
  isWaitingForItem,
  movePlanItemToBlock,
  reorderPlanItems,
} from "../../domain/daily-reset/planMutations";
import { APP_A_TRANSLATIONS, type AppALanguage } from "../../types";
import SafeInterventionCard from "./SafeInterventionCard";
import { normalizeCompletedItemIds } from "../../screens/todayExecution";
import { loadAppAPreferences, getEffectiveTimeZone } from "../../settings/preferences";
import { getLocalDateKeyInTimeZone } from "../../persistence/dailyPlanDocument";
import FocusTimer from "../focus/FocusTimer";
import QuickAddTodayTask from "./QuickAddTodayTask";
import type { QuickAddInput, QuickAddResult } from "./QuickAddTodayTask";
import DailyLoadWarning from "./DailyLoadWarning";
import { useDailyRoutines } from "../../routines/useDailyRoutines";
import DailyRoutinesSection from "../routines/DailyRoutinesSection";

interface Props {
  draft: DailyPlanDraft;
  language: AppALanguage;
  userId?: string;
  energy?: number;
  pleasantness?: number;
  completedItemIds: string[];
  updatingItemId?: string | null;
  error?: string | null;
  onToggle: (itemId: string) => void;
  onEditPlan: () => void;
  defaultFocusMinutes: 15 | 25 | 45 | 60;
  onOpenReset: () => void;
  onQuickAddToday: (input: QuickAddInput) => Promise<QuickAddResult>;
  onQuickSaveLater: (title: string, minutes: number, capacityType: "flexible" | "fixed") => Promise<boolean>;
  onReevaluatePriorities?: (draft: DailyPlanDraft) => void;
  onUpdateDraft?: (draft: DailyPlanDraft) => void;
  onDeleteTask?: (itemId: string) => void;
}

const COPY = {
  en: {
    nextFocus: "NEXT FOCUS",
    startFocus: "Start focus",
    resetBefore: "Reset",
    moveUp: "Move up",
    moveDown: "Move down",
    moreOptions: "More options",
    moveToFirstFocus: "Move to First focus",
    moveToLaterToday: "Move to Later today",
    moveToOptional: "Move to If capacity remains",
    deferToTomorrow: "Defer for tomorrow",
    deleteTask: "Delete task",
    routineContext: "Routine",
    visionContext: "Vision",
    fixedContext: "Fixed commitment",
    deadlineContext: "Deadline",
    orderManuallyModified: "Order manually modified.",
    reevaluateWithAi: "Re-evaluate via AI",
    allDoneTitle: "Everything for today is complete.",
    allDoneSummary: "You have completed all {count} planned tasks ({minutes} min).",
    reviewCompleted: "Review completed tasks",
    hideCompleted: "Hide completed tasks",
    addAnotherTask: "Add another task",
    completedTasksHeading: "Completed tasks",
    completeTask: "Complete",
  },
  sr: {
    nextFocus: "SLEDEĆI FOKUS",
    startFocus: "Pokreni fokus",
    resetBefore: "Predah",
    moveUp: "Pomeri nagore",
    moveDown: "Pomeri nadole",
    moreOptions: "Više opcija",
    moveToFirstFocus: "Prebaci u Prvi fokus",
    moveToLaterToday: "Prebaci na Kasnije danas",
    moveToOptional: "Prebaci u Ako ostane kapaciteta",
    deferToTomorrow: "Odloži za sutra",
    deleteTask: "Izbriši zadatak",
    routineContext: "Rutina",
    visionContext: "Vizija",
    fixedContext: "Fiksna obaveza",
    deadlineContext: "Rok",
    orderManuallyModified: "Redosled je ručno izmenjen.",
    reevaluateWithAi: "Preispitaj prioritete uz AI",
    allDoneTitle: "Sve za danas je završeno.",
    allDoneSummary: "Uspešno ste završili svih {count} planiranih zadataka ({minutes} min).",
    reviewCompleted: "Pregledaj završene zadatke",
    hideCompleted: "Sakrij završene zadatke",
    addAnotherTask: "Dodaj još jedan zadatak",
    completedTasksHeading: "Završeni zadaci",
    completeTask: "Završi",
  },
  tr: {
    nextFocus: "SONRAKİ ODAK",
    startFocus: "Odağı başlat",
    resetBefore: "Mola",
    moveUp: "Yukarı taşı",
    moveDown: "Aşağı taşı",
    moreOptions: "Daha fazla seçenek",
    moveToFirstFocus: "İlk odağa taşı",
    moveToLaterToday: "Bugün sonrasına taşı",
    moveToOptional: "Kapasite kalırsa'ya taşı",
    deferToTomorrow: "Yarına ertele",
    deleteTask: "Görevi sil",
    routineContext: "Rutin",
    visionContext: "Vizyon",
    fixedContext: "Sabit yükümlülük",
    deadlineContext: "Son tarih",
    orderManuallyModified: "Sıralama manuel olarak değiştirildi.",
    reevaluateWithAi: "Yapay zeka ile öncelikleri yeniden değerlendir",
    allDoneTitle: "Bugün için her şey tamamlandı.",
    allDoneSummary: "Planlanan tüm {count} görevi başarıyla tamamladınız ({minutes} dk).",
    reviewCompleted: "Tamamlanan görevleri incele",
    hideCompleted: "Tamamlanan görevleri gizle",
    addAnotherTask: "Bir görev daha ekle",
    completedTasksHeading: "Tamamlanan görevler",
    completeTask: "Tamamla",
  },
} as const;

export default function TodayExecutionScreen({
  draft,
  language,
  userId,
  energy = 3,
  pleasantness = 3,
  completedItemIds,
  updatingItemId,
  error,
  onToggle,
  onEditPlan,
  defaultFocusMinutes,
  onOpenReset,
  onQuickAddToday,
  onQuickSaveLater,
  onReevaluatePriorities,
  onUpdateDraft,
  onDeleteTask,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  const c = COPY[language] || COPY.en;

  const { routines, completions, plannedRoutineIds } = useDailyRoutines(userId);
  const [focusItem, setFocusItem] = useState<DailyPlanItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [activeVisions, setActiveVisions] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchVisions() {
      try {
        if (userId) {
          const { loadVisionStrategies } = await import("../../../shared/persistence/vision/visionStrategyRepository");
          const list = await loadVisionStrategies(userId);
          if (isMounted) {
            setActiveVisions(list.filter(v => v.status === "active").map(v => ({ id: v.id, title: v.strategy.horizonVision })));
          }
        } else {
          const raw = localStorage.getItem("app_a_guest_vision_strategies");
          if (raw && isMounted) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setActiveVisions(parsed.filter((v: any) => v.status === "active").map((v: any) => ({ id: v.id, title: v.strategy?.horizonVision || v.id })));
            }
          }
        }
      } catch {}
    }
    fetchVisions();
    return () => { isMounted = false; };
  }, [userId]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeMenuId]);

  const completed = normalizeCompletedItemIds(draft, completedItemIds);
  const requiredItems = normalizeChronologicalOrder(
    [...draft.firstFocus, ...draft.laterToday],
    completed,
  );
  const optionalItems = normalizeChronologicalOrder(draft.ifCapacityRemains, completed);
  const todayItems = [...requiredItems, ...optionalItems];

  const outsideCount =
    (draft.deferredItems?.length || 0) + (draft.longTermIdeas?.length || 0) + (draft.nonActionItems?.length || 0);
  const summary = t.completedSummary
    .replace("{completed}", String(completed.length))
    .replace("{total}", String(todayItems.length));

  // Determine Next Focus: first uncompleted required item, or first uncompleted optional item
  const nextFocusItem = todayItems.find((item) => !completed.includes(item.id)) || null;
  const allDone = todayItems.length > 0 && completed.length === todayItems.length;

  const effectiveTimeZone = getEffectiveTimeZone(loadAppAPreferences());
  const localDate = draft.localDate || getLocalDateKeyInTimeZone(effectiveTimeZone);

  const [isInterventionDismissed, setIsInterventionDismissed] = useState<boolean>(() => {
    if (!draft.intervention) return false;
    try {
      const stored = localStorage.getItem(`app_a_dismissed_interventions_${localDate}`);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.includes(draft.intervention.title) || parsed.includes(draft.intervention.type);
      }
      return Boolean(parsed);
    } catch {
      return false;
    }
  });

  const handleDismissIntervention = () => {
    setIsInterventionDismissed(true);
    if (!draft.intervention) return;
    try {
      const key = `app_a_dismissed_interventions_${localDate}`;
      const stored = localStorage.getItem(key);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = Array.isArray(existing)
        ? [...existing, draft.intervention.title]
        : [draft.intervention.title];
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore storage error
    }
  };

  const isInterventionRelevant = (() => {
    if (!draft.intervention || isInterventionDismissed) return false;
    const intervention = draft.intervention;

    if (intervention.targetTaskId) {
      const targetTask = todayItems.find((i) => i.id === intervention.targetTaskId);
      if (!targetTask) return false;
      if (completed.includes(targetTask.id)) return false;
    }

    if (allDone && (intervention.type === "environment" || intervention.type === "focus")) {
      return false;
    }

    return true;
  })();

  const [showReevalDialog, setShowReevalDialog] = useState(false);

  const handleOpenReevaluation = () => {
    setShowReevalDialog(true);
  };

  const handleConfirmReeval = async (
    proposal: StructuredReevaluationProposal,
    modifications: {
      approvedDelegationIds: string[];
      approvedEliminationIds: string[];
      approvedManualOverrideIds: string[];
    },
  ) => {
    const { applyReevaluationProposal } = await import("../../screens/planReview");
    const finalDraft = applyReevaluationProposal(draft, proposal, modifications);
    if ((finalDraft as any).error) {
      alert((finalDraft as any).error);
      return;
    }
    // Successfully applied reevaluation removes the manual override banner
    finalDraft.manualPriorityOverride = false;
    if (onReevaluatePriorities) {
      onReevaluatePriorities(finalDraft);
    } else if (onUpdateDraft) {
      onUpdateDraft(finalDraft);
    }
    setShowReevalDialog(false);
  };

  const handleReorder = (itemId: string, direction: "up" | "down") => {
    const res = reorderPlanItems(draft, itemId, direction);
    if (res.error) return;
    onUpdateDraft?.(res.draft);
  };

  const handleMoveToBlock = (
    itemId: string,
    targetBlock: "first_focus" | "later_today" | "if_capacity_remains",
  ) => {
    setActiveMenuId(null);
    const res = movePlanItemToBlock(draft, itemId, targetBlock);
    if (res.error) return;
    onUpdateDraft?.(res.draft);
  };

  const handleDeferItem = (itemId: string) => {
    setActiveMenuId(null);
    const all = [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains];
    const item = all.find((i) => i.id === itemId);
    if (!item) return;

    const newFirst = draft.firstFocus.filter((i) => i.id !== itemId);
    const newLater = draft.laterToday.filter((i) => i.id !== itemId);
    const newOptional = draft.ifCapacityRemains.filter((i) => i.id !== itemId);

    const deferredClassified = {
      id: item.id,
      originalText: item.title,
      kind: "task" as const,
      timeHorizon: "later" as const,
      timeSensitivity: item.timeSensitivity,
      isAmbiguous: false,
      needsCheck: false,
      priority: item.priority,
    };

    const updatedDraft = recalculatePlanTotals({
      ...draft,
      firstFocus: newFirst,
      laterToday: newLater,
      ifCapacityRemains: newOptional,
      deferredItems: [...(draft.deferredItems || []), deferredClassified],
      manualPriorityOverride: true,
    });
    onUpdateDraft?.(updatedDraft);
  };

  const handleDeleteItem = (itemId: string) => {
    setActiveMenuId(null);
    const newFirst = draft.firstFocus.filter((i) => i.id !== itemId);
    const newLater = draft.laterToday.filter((i) => i.id !== itemId);
    const newOptional = draft.ifCapacityRemains.filter((i) => i.id !== itemId);
    const updatedDraft = recalculatePlanTotals({
      ...draft,
      firstFocus: newFirst,
      laterToday: newLater,
      ifCapacityRemains: newOptional,
      manualPriorityOverride: true,
    });
    onUpdateDraft?.(updatedDraft);
    onDeleteTask?.(itemId);
  };

  // Helper to render context provenance badges
  const renderContextTag = (item: DailyPlanItem) => {
    if (item.sourceRoutineId) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#34C759]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#248A3D] dark:text-[#30D158]">
          <Leaf className="h-3 w-3" />
          {c.routineContext}
        </span>
      );
    }
    if (item.id.startsWith("vision_plan_") || item.sourceItemIds?.some((sid) => sid.startsWith("vision_"))) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#AF52DE]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#8E44AD] dark:text-[#BF5AF2]">
          <Compass className="h-3 w-3" />
          {c.visionContext}
        </span>
      );
    }
    if (item.capacityType === "fixed") {
      return (
        <span className="inline-flex items-center rounded-md bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
          {c.fixedContext}
        </span>
      );
    }
    if (item.deadlineText || item.deadlineIso) {
      return (
        <span
          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: "var(--app-a-wash-peach)", color: "var(--app-a-text)" }}
        >
          {item.deadlineText || item.deadlineIso}
        </span>
      );
    }
    return null;
  };

  const renderItemRow = (
    item: DailyPlanItem,
    index: number,
    totalInGroup: number,
    canReorder = false,
  ) => {
    const isComplete = completed.includes(item.id);
    const isMenuOpen = activeMenuId === item.id;

    return (
      <div
        key={item.id}
        className={`app-a-focus-ring relative flex min-h-[64px] w-full items-start gap-3 rounded-[18px] border p-3.5 text-left transition-all sm:p-4 ${
          isComplete
            ? "border-black/[0.06] bg-black/[0.025] text-black/45 dark:border-white/[0.06] dark:bg-white/[0.035] dark:text-white/45"
            : "border-black/[0.07] bg-white/70 text-black dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white shadow-sm"
        }`}
      >
        {/* Checkbox Touch Target >= 44x44px */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center -m-2">
          <button
            type="button"
            aria-label={item.title}
            aria-pressed={isComplete}
            disabled={Boolean(updatingItemId)}
            onClick={() => onToggle(item.id)}
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
              isComplete
                ? "border-[#34C759] bg-[#34C759] text-white"
                : "border-black/25 bg-transparent hover:border-[#0071E3] dark:border-white/30"
            }`}
          >
            {isComplete && <Check className="h-4 w-4" strokeWidth={3} />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={`block text-[15px] sm:text-[16px] font-semibold leading-snug ${
              isComplete ? "line-through text-black/40 dark:text-white/40" : ""
            }`}
          >
            {item.title}
          </span>
          {item.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {item.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {item.estimatedMinutes} min
            </span>
            {renderContextTag(item)}
          </div>
        </div>

        {/* Action controls */}
        {!isComplete ? (
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {canReorder && item.capacityType !== "fixed" && (
              <div className="hidden sm:flex flex-row gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleReorder(item.id, "up")}
                  aria-label={c.moveUp}
                  className="app-a-focus-ring flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-lg text-[#86868B] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === totalInGroup - 1}
                  onClick={() => handleReorder(item.id, "down")}
                  aria-label={c.moveDown}
                  className="app-a-focus-ring flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-lg text-[#86868B] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            )}

            {item.capacityType !== "fixed" && (
              <button
                type="button"
                onClick={() => setFocusItem(item)}
                className="app-a-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label={`${c.startFocus}: ${item.title}`}
              >
                <Timer className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenReset}
              className="app-a-focus-ring hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label={`${c.resetBefore}: ${item.title}`}
            >
              <Wind className="h-4 w-4" />
            </button>

            {/* Overflow menu toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
                aria-label={c.moreOptions}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                className="app-a-focus-ring flex h-11 w-11 items-center justify-center rounded-full text-[#6E6E73] dark:text-[#AEAEB2] hover:bg-black/5 dark:hover:bg-white/5"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20 bg-transparent"
                    onClick={() => setActiveMenuId(null)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#1E1E20]"
                    role="menu"
                  >
                  {/* Mobile-accessible reorder and reset */}
                  {canReorder && item.capacityType !== "fixed" && (
                    <div className="sm:hidden flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          setActiveMenuId(null);
                          handleReorder(item.id, "up");
                        }}
                        aria-label={c.moveUp}
                        className="flex w-full min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10 disabled:opacity-30"
                        role="menuitem"
                      >
                        <ArrowUp className="h-4 w-4 text-[#86868B]" />
                        {c.moveUp}
                      </button>
                      <button
                        type="button"
                        disabled={index === totalInGroup - 1}
                        onClick={() => {
                          setActiveMenuId(null);
                          handleReorder(item.id, "down");
                        }}
                        aria-label={c.moveDown}
                        className="flex w-full min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10 disabled:opacity-30"
                        role="menuitem"
                      >
                        <ArrowDown className="h-4 w-4 text-[#86868B]" />
                        {c.moveDown}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onOpenReset();
                        }}
                        className="flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                        role="menuitem"
                      >
                        <Wind className="h-4 w-4 text-[#86868B]" />
                        {c.resetBefore}
                      </button>
                      <hr className="my-1 border-t border-black/5 dark:border-white/10" />
                    </div>
                  )}

                  {item.block !== "first_focus" &&
                    item.capacityType !== "fixed" &&
                    !isWaitingForItem(item, draft) && (
                    <button
                      type="button"
                      onClick={() => handleMoveToBlock(item.id, "first_focus")}
                      className="flex w-full min-h-[44px] items-center rounded-xl px-3 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                      role="menuitem"
                    >
                      {c.moveToFirstFocus}
                    </button>
                  )}
                  {item.block !== "later_today" && item.capacityType !== "fixed" && (
                    <button
                      type="button"
                      onClick={() => handleMoveToBlock(item.id, "later_today")}
                      className="flex w-full min-h-[44px] items-center rounded-xl px-3 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                      role="menuitem"
                    >
                      {c.moveToLaterToday}
                    </button>
                  )}
                  {item.block !== "if_capacity_remains" && item.capacityType !== "fixed" && (
                    <button
                      type="button"
                      onClick={() => handleMoveToBlock(item.id, "if_capacity_remains")}
                      className="flex w-full min-h-[44px] items-center rounded-xl px-3 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                      role="menuitem"
                    >
                      {c.moveToOptional}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeferItem(item.id)}
                    className="flex w-full min-h-[44px] items-center rounded-xl px-3 text-left text-[13px] font-medium text-[#FF9500] hover:bg-amber-500/10"
                    role="menuitem"
                  >
                    {c.deferToTomorrow}
                  </button>
                  <hr className="my-1 border-t border-black/5 dark:border-white/10" />
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium text-[#FF3B30] hover:bg-red-500/10"
                    role="menuitem"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    {c.deleteTask}
                  </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
              aria-label={c.moreOptions}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              className="app-a-focus-ring flex h-11 w-11 items-center justify-center rounded-full text-[#8E8E93] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20 bg-transparent"
                  onClick={() => setActiveMenuId(null)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 top-12 z-30 w-52 rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#1E1E20]"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium text-[#FF3B30] hover:bg-red-500/10"
                    role="menuitem"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    {c.deleteTask}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[780px] px-4 sm:px-6 pb-32">
      {showReevalDialog && (
        <ReevaluationDialog
          draft={draft}
          language={language}
          localDate={localDate}
          onClose={() => setShowReevalDialog(false)}
          onConfirm={handleConfirmReeval}
        />
      )}

      {/* Focus Timer Modal */}
      {focusItem && (
        <FocusTimer
          item={focusItem}
          language={language}
          defaultMinutes={defaultFocusMinutes}
          userId={userId}
          onClose={() => setFocusItem(null)}
          onCompleteTask={() => {
            onToggle(focusItem.id);
            setFocusItem(null);
          }}
        />
      )}

      {/* Manual Priority Override Banner */}
      {draft.manualPriorityOverride && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#0A84FF]/25 bg-[#0A84FF]/5 p-4 dark:border-[#0A84FF]/35 dark:bg-[#0A84FF]/10 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Compass className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
            <p className="text-[14px] font-medium text-[#0071E3] dark:text-[#0A84FF]">
              {c.orderManuallyModified}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenReevaluation}
            className="app-a-primary-button app-a-focus-ring whitespace-nowrap min-h-[44px] px-4 text-[13px]"
          >
            {c.reevaluateWithAi}
          </button>
        </div>
      )}

      {/* 1. Header and State of the Day */}
      <header className="mb-6 w-full px-1 sm:px-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-a-eyebrow">{t.today}</p>
            <h1 className="app-a-page-title">{t.todayPlanTitle}</h1>
          </div>
          <button
            type="button"
            onClick={onEditPlan}
            className="app-a-secondary-button app-a-focus-ring flex shrink-0 items-center gap-2 min-h-[44px] px-4 text-[14px]"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.editTodayPlan}</span>
          </button>
        </div>

        {/* State of the Day: Progress and Minutes */}
        <div
          className="mt-4 flex items-center gap-3 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]"
          aria-label={summary}
        >
          <span className="shrink-0 font-semibold text-black dark:text-white">{summary}</span>
          <div className="h-2 min-w-20 max-w-48 flex-1 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.12]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: "var(--app-a-success)",
                width: `${todayItems.length ? (completed.length / todayItems.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="shrink-0 font-medium">{draft.plannedRequiredMinutes} min</span>
        </div>

        {Boolean(draft.plannedFixedMinutes) && (
          <p className="mt-1.5 text-[12px] text-[#86868B]">
            {language === "sr"
              ? `${draft.plannedFlexibleMinutes ?? 0} min fleksibilno · ${draft.plannedFixedMinutes} min fiksno`
              : language === "tr"
                ? `${draft.plannedFlexibleMinutes ?? 0} dk esnek · ${draft.plannedFixedMinutes} dk sabit`
                : `${draft.plannedFlexibleMinutes ?? 0} min flexible · ${draft.plannedFixedMinutes} min fixed`}
          </p>
        )}
      </header>

      {/* Daily Load Warning if over capacity */}
      <DailyLoadWarning
        draft={draft}
        language={language}
        completedItemIds={completed}
        routines={routines}
        routineCompletions={completions}
        plannedRoutineIds={plannedRoutineIds}
        localDate={localDate}
        onReview={onEditPlan}
      />

      {error && (
        <div role="alert" className="app-a-panel-danger mb-5 text-[14px] font-medium">
          {error}
        </div>
      )}

      {/* 2. NEXT FOCUS HERO CARD (if not all done and nextFocusItem exists) */}
      {!allDone && nextFocusItem && (
        <section className="mb-7" aria-labelledby="next-focus-heading">
          <div
            className="rounded-[22px] border border-[#0071E3]/25 p-5 sm:p-6 shadow-md"
            style={{
              backgroundColor: "var(--app-a-surface)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0071E3]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0071E3] dark:text-[#0A84FF]">
                <Target className="h-3.5 w-3.5" />
                {c.nextFocus}
              </span>
              <span className="text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2] flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {nextFocusItem.estimatedMinutes} min
              </span>
            </div>

            <h2
              id="next-focus-heading"
              className="text-[18px] sm:text-[21px] font-bold text-black dark:text-white leading-tight mb-2"
            >
              {nextFocusItem.title}
            </h2>

            {nextFocusItem.description && (
              <p className="text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2] mb-4">
                {nextFocusItem.description}
              </p>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-2">
              {renderContextTag(nextFocusItem)}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08]">
              {nextFocusItem.capacityType !== "fixed" && (
                <button
                  type="button"
                  onClick={() => setFocusItem(nextFocusItem)}
                  className="col-span-2 sm:col-span-1 app-a-primary-button app-a-focus-ring flex items-center justify-center gap-2 min-h-[48px] px-6 !rounded-xl text-[15px] font-semibold !shadow-xs"
                >
                  <Timer className="h-4 w-4" />
                  <span>{c.startFocus}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onToggle(nextFocusItem.id)}
                className="col-span-1 app-a-focus-ring flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.10] text-black dark:text-white font-medium text-[14px] transition-all active:scale-[0.985]"
              >
                <Check className="h-4 w-4 text-[#34C759]" strokeWidth={2.5} />
                <span>{c.completeTask}</span>
              </button>

              <button
                type="button"
                onClick={onOpenReset}
                className="col-span-1 app-a-focus-ring flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.10] text-black dark:text-white font-medium text-[14px] transition-all active:scale-[0.985]"
                aria-label={`${c.resetBefore}: ${nextFocusItem.title}`}
              >
                <Wind className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
                <span>{c.resetBefore}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. COMPLETED DAY STATE (Calm, dignified success) */}
      {allDone && (
        <section
          className="mb-8 rounded-[24px] border border-[#34C759]/25 p-6 sm:p-8 text-center shadow-sm"
          style={{ backgroundColor: "var(--app-a-surface)" }}
        >
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img
              src="/app-a/illustrations/plan-ready.png"
              alt=""
              className="h-28 w-28 object-contain select-none pointer-events-none"
              draggable={false}
            />
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-black dark:text-white">
            {c.allDoneTitle}
          </h2>
          <p className="mt-2 text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]">
            {c.allDoneSummary
              .replace("{count}", String(todayItems.length))
              .replace("{minutes}", String(draft.plannedRequiredMinutes))}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowCompletedList(!showCompletedList)}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
            >
              {showCompletedList ? c.hideCompleted : c.reviewCompleted}
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("quick-add-today");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
            >
              {c.addAnotherTask}
            </button>
          </div>

          {showCompletedList && (
            <div className="mt-6 border-t border-black/[0.06] pt-5 dark:border-white/[0.08] text-left space-y-2">
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#86868B]">
                {c.completedTasksHeading}
              </h3>
              {todayItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 py-1 text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]"
                >
                  <Check className="h-4 w-4 text-[#34C759] shrink-0" />
                  <span className="line-through">{item.title}</span>
                  <span className="text-[12px] opacity-70">({item.estimatedMinutes} min)</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. DAILY ROUTINES SECTION */}
      {userId && <DailyRoutinesSection userId={userId} language={language} />}

      {/* 5. REMAINING TASK BLOCKS (if not all done or if user views list) */}
      {!allDone && (
        <>
          {/* Prvi fokus block */}
          {draft.firstFocus.length > 0 && (
            <section className="mb-6" aria-labelledby="first-focus-heading">
              <h2
                id="first-focus-heading"
                className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#AEAEB2]"
              >
                {t.firstFocusTitle} ({draft.firstFocus.length})
              </h2>
              <div className="space-y-2.5">
                {draft.firstFocus.map((item, index) =>
                  renderItemRow(item, index, draft.firstFocus.length, true),
                )}
              </div>
            </section>
          )}

          {/* Kasnije danas block */}
          {draft.laterToday.length > 0 && (
            <section className="mb-6" aria-labelledby="later-today-heading">
              <h2
                id="later-today-heading"
                className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#AEAEB2]"
              >
                {t.laterTodayTitle} ({draft.laterToday.length})
              </h2>
              <div className="space-y-2.5">
                {draft.laterToday.map((item, index) =>
                  renderItemRow(item, index, draft.laterToday.length, true),
                )}
              </div>
            </section>
          )}

          {/* Ako ostane kapaciteta (Optional) block */}
          {optionalItems.length > 0 && (
            <details className="mb-6 rounded-[20px] border border-black/[0.07] p-3.5 dark:border-white/[0.08]">
              <summary
                id="optional-today-heading"
                className="app-a-focus-ring cursor-pointer px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#86868B]"
              >
                {t.optionalTodayLabel} ({optionalItems.length})
              </summary>
              <div className="mt-3 space-y-2.5">
                {optionalItems.map((item, index) =>
                  renderItemRow(item, index, optionalItems.length, false),
                )}
              </div>
            </details>
          )}
        </>
      )}

      {/* 6. SAFE INTERVENTION CARD */}
      {isInterventionRelevant && draft.intervention && (
        <SafeInterventionCard
          intervention={draft.intervention}
          language={language}
          onOpenReset={onOpenReset}
          onDismiss={handleDismissIntervention}
        />
      )}

      {/* 7. QUICK ADD TODAY TASK */}
      <div
        id="quick-add-today"
        className="mt-7 border-t border-black/[0.07] pt-5 dark:border-white/[0.08]"
      >
        <QuickAddTodayTask
          language={language}
          availableMinutes={draft.availableMinutes}
          plannedRequiredMinutes={draft.plannedFlexibleMinutes ?? draft.plannedRequiredMinutes}
          firstFocusCount={draft.firstFocus.length}
          energy={energy}
          pleasantness={pleasantness}
          activeVisions={activeVisions}
          onAddToday={onQuickAddToday}
          onSaveLater={onQuickSaveLater}
          onAdjustPlan={onEditPlan}
        />
      </div>

      {/* 8. OUTSIDE TODAY ITEMS (Deferred / Long term ideas / Non-action) */}
      {outsideCount > 0 && (
        <details className="mt-6 rounded-2xl border border-black/[0.07] bg-black/[0.025] p-4 text-[14px] dark:border-white/[0.08] dark:bg-white/[0.035]">
          <summary className="app-a-focus-ring cursor-pointer font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
            {t.outsideTodaySummary.replace("{count}", String(outsideCount))}
          </summary>
          <div className="mt-3 space-y-3 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
            {draft.deferredItems.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868B]">
                  {language === "sr"
                    ? "Sačuvano u Inboksu za kasnije"
                    : language === "tr"
                      ? "Daha sonrası için Gelen Kutusuna kaydedildi"
                      : "Saved in Inbox for later"}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {draft.deferredItems.map((item) => (
                    <li key={item.id}>• {item.suggestedAction || item.originalText}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.longTermIdeas.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868B]">
                  {language === "sr"
                    ? "Dugoročne ideje — sačuvane u Vision"
                    : language === "tr"
                      ? "Uzun vadeli fikirler — Vision'da saklandı"
                      : "Long-term ideas — saved in Vision"}
                </p>
                <ul className="mt-1.5 space-y-1 text-[#6E6E73] dark:text-[#AEAEB2]">
                  {draft.longTermIdeas.map((item) => (
                    <li key={item.id}>• {item.originalText}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.nonActionItems.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868B]">
                  {language === "sr"
                    ? "Beleške — Inboks › Za razjašnjenje"
                    : language === "tr"
                      ? "Notlar — Gelen Kutusu › Netleştirilecek"
                      : "Notes — Inbox › To clarify"}
                </p>
                <ul className="mt-1.5 space-y-1 text-[#6E6E73] dark:text-[#AEAEB2]">
                  {draft.nonActionItems.map((item) => (
                    <li key={item.id}>• {item.originalText}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
