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
}

export interface ProgressSummary {
  completedTasks: number;
  activeDays: number;
  plannedDays: number;
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

  const days = plans.map((document) => {
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

    // Deduplicate completed tasks on this date:
    // If multiple tasks link to the same sourceRoutineId on the same date, they represent 1 routine event.
    // Also, if a task links to sourceRoutineId and a routine completion already exists for (localDate, routineId),
    // they represent the same underlying work event.
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
    };
  });

  return {
    completedTasks: days.reduce((sum, day) => sum + day.completed, 0),
    activeDays: days.filter((day) => day.completed > 0).length,
    plannedDays: days.length,
    days,
  };
}
