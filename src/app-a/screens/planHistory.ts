import type { ClassifiedBrainDumpItem } from "../domain/daily-reset/contracts";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import type { RoutineCompletion } from "../../shared/domain/routines/contracts";
import type { AppALanguage } from "../types";
import { normalizeCompletedItemIds } from "./todayExecution";

export interface HistoryItem {
  key: string;
  localDate: string;
  item: ClassifiedBrainDumpItem;
}

export interface ProgressDay {
  localDate: string;
  completed: number;
  total: number;
  completedItems: Array<{ id: string; title: string; estimatedMinutes?: number; sourceRoutineId?: string }>;
  completedFocusCount: number;
  totalFocusCount: number;
  energy?: number;
  pleasantness?: number;
}

export interface ProgressSummary {
  completedTasks: number;
  activeDays: number;
  plannedDays: number;
  completedFocusCount: number;
  totalFocusCount: number;
  consistencyStreak: number;
  averageEnergy: number | null;
  averagePleasantness: number | null;
  factualChangeSummary: {
    en: string;
    sr: string;
    tr: string;
  };
  days: ProgressDay[];
}

export function formatHistoryDate(
  localDate: string,
  language: AppALanguage,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) return localDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const locale = language === "sr" ? "sr-Latn-RS" : language === "tr" ? "tr-TR" : "en-US";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function uniqueHistoryItems(items: HistoryItem[]): HistoryItem[] {
  const seen = new Set<string>();
  return items.filter(({ key }) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getInboxItems(plans: AppADailyPlanDocument[]): HistoryItem[] {
  return uniqueHistoryItems(
    plans.flatMap((document) => {
      const candidates = [
        ...document.plan.deferredItems,
        ...document.plan.classifiedItems.filter((item) => item.kind === "waiting_for"),
      ];
      return candidates.map((item) => ({
        key: `${document.localDate}:${item.id}`,
        localDate: document.localDate,
        item,
      }));
    }),
  );
}

export function getVisionItems(plans: AppADailyPlanDocument[]): HistoryItem[] {
  return uniqueHistoryItems(
    plans.flatMap((document) =>
      document.plan.longTermIdeas.map((item) => ({
        key: `${document.localDate}:${item.id}`,
        localDate: document.localDate,
        item,
      })),
    ),
  );
}

export function calculateConsistencyStreak(days: Array<{ localDate: string; completed: number }>): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort((a, b) => a.localDate.localeCompare(b.localDate));
  const last = sorted[sorted.length - 1];
  if (!last || last.completed <= 0) return 0;

  let streak = 1;
  let currentDate = new Date(`${last.localDate}T12:00:00Z`);

  for (let i = sorted.length - 2; i >= 0; i--) {
    const prev = sorted[i];
    const prevDate = new Date(`${prev.localDate}T12:00:00Z`);
    const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      if (prev.completed > 0) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export function computeFactualChangeSummary(
  days: ProgressDay[],
  completedFocusCount: number,
  activeDays: number,
): { en: string; sr: string; tr: string } {
  if (days.length === 0 || activeDays === 0) {
    return {
      en: "No completed focuses recorded yet. Progress updates as you finish daily plans.",
      sr: "Još nema zabeleženih završenih fokusa. Napredak se ažurira kako završavate dnevne planove.",
      tr: "Henüz tamamlanmış odak kaydedilmedi. İlerleme, günlük planları tamamladıkça güncellenir.",
    };
  }

  const sorted = [...days].sort((a, b) => a.localDate.localeCompare(b.localDate));
  const recentDays = sorted.slice(-7);
  const priorDays = sorted.slice(0, -7);

  const recentFocus = recentDays.reduce((sum, d) => sum + (d.completedFocusCount ?? 0), 0);
  const recentActive = recentDays.filter((d) => d.completed > 0).length;

  if (priorDays.length > 0) {
    const priorFocus = priorDays.reduce((sum, d) => sum + (d.completedFocusCount ?? 0), 0);
    const diff = recentFocus - priorFocus;
    if (diff > 0) {
      return {
        en: `In the last 7 days, you completed ${recentFocus} primary focuses (+${diff} compared to the previous period) across ${recentActive} active days.`,
        sr: `U poslednjih 7 dana završili ste ${recentFocus} primarnih fokusa (+${diff} u odnosu na prethodni period) tokom ${recentActive} aktivnih dana.`,
        tr: `Son 7 günde önceki döneme göre +${diff} farkla ${recentFocus} birincil odağı ${recentActive} aktif günde tamamladınız.`,
      };
    }
  }

  return {
    en: `You completed ${completedFocusCount} primary focus tasks across ${activeDays} active days.`,
    sr: `Završili ste ${completedFocusCount} primarnih fokus zadataka tokom ${activeDays} aktivnih dana.`,
    tr: `${activeDays} aktif gün boyunca ${completedFocusCount} birincil odak görevini tamamladınız.`,
  };
}

/**
 * Canonical Progress aggregation with routine execution event deduplication.
 * Prevents double-counting when tasks link to routines via sourceRoutineId on the same local date.
 */
export function getProgressSummary(
  plans: AppADailyPlanDocument[],
  routineCompletions: RoutineCompletion[] = [],
): ProgressSummary {
  // Index valid routine completions by `${localDate}:${routineId}`
  // Only full and minimum count as completion events; skipped does not count.
  const validCompletionsByDateAndRoutine = new Set<string>();
  for (const rc of routineCompletions) {
    if (rc.status === "full" || rc.status === "minimum") {
      validCompletionsByDateAndRoutine.add(`${rc.localDate}:${rc.routineId}`);
    }
  }

  const energies: number[] = [];
  const pleasantnesses: number[] = [];

  const days: ProgressDay[] = plans.map((document) => {
    const completedIds = normalizeCompletedItemIds(
      document.plan,
      document.execution?.completedItemIds ?? [],
    );
    const allItems = [
      ...document.plan.firstFocus,
      ...document.plan.laterToday,
      ...document.plan.ifCapacityRemains,
    ];

    const completedItems = allItems
      .filter((item) => completedIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        title: item.title,
        sourceRoutineId: item.sourceRoutineId,
        ...(item.estimatedMinutes ? { estimatedMinutes: item.estimatedMinutes } : {}),
      }));

    const firstFocus = document.plan.firstFocus ?? [];
    const completedFocusCount = firstFocus.filter((item) => completedIds.includes(item.id)).length;
    const totalFocusCount = firstFocus.length;

    if (typeof document.checkIn?.energy === "number" && document.checkIn.energy >= 1 && document.checkIn.energy <= 5) {
      energies.push(document.checkIn.energy);
    }
    if (typeof document.checkIn?.pleasantness === "number" && document.checkIn.pleasantness >= 1 && document.checkIn.pleasantness <= 5) {
      pleasantnesses.push(document.checkIn.pleasantness);
    }

    // Deduplicate completed tasks on this date:
    const completedRoutineIdsOnDate = new Set<string>();
    let distinctCompletedEvents = 0;

    for (const item of completedItems) {
      if (item.sourceRoutineId && item.sourceRoutineId.trim().length > 0) {
        if (!completedRoutineIdsOnDate.has(item.sourceRoutineId)) {
          completedRoutineIdsOnDate.add(item.sourceRoutineId);
          distinctCompletedEvents++;
        }
      } else {
        // Non-linked or legacy task without sourceRoutineId (never guess by title)
        distinctCompletedEvents++;
      }
    }

    return {
      localDate: document.localDate,
      completed: distinctCompletedEvents,
      total: allItems.length,
      completedItems,
      completedFocusCount,
      totalFocusCount,
      energy: document.checkIn?.energy,
      pleasantness: document.checkIn?.pleasantness,
    };
  });

  const completedTasks = days.reduce((sum, day) => sum + day.completed, 0);
  const activeDays = days.filter((day) => day.completed > 0).length;
  const completedFocusCount = days.reduce((sum, day) => sum + day.completedFocusCount, 0);
  const totalFocusCount = days.reduce((sum, day) => sum + day.totalFocusCount, 0);
  const consistencyStreak = calculateConsistencyStreak(days);

  const averageEnergy = energies.length > 0
    ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
    : null;
  const averagePleasantness = pleasantnesses.length > 0
    ? Math.round((pleasantnesses.reduce((a, b) => a + b, 0) / pleasantnesses.length) * 10) / 10
    : null;

  const factualChangeSummary = computeFactualChangeSummary(
    days,
    completedFocusCount,
    activeDays,
  );

  return {
    completedTasks,
    activeDays,
    plannedDays: days.length,
    completedFocusCount,
    totalFocusCount,
    consistencyStreak,
    averageEnergy,
    averagePleasantness,
    factualChangeSummary,
    days,
  };
}
