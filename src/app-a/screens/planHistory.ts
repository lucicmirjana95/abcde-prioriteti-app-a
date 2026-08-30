import type { ClassifiedBrainDumpItem } from "../domain/daily-reset/contracts";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
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

export function getProgressSummary(
  plans: AppADailyPlanDocument[],
): ProgressSummary {
  const days = plans.map((document) => {
    const completed = normalizeCompletedItemIds(
      document.plan,
      document.execution?.completedItemIds ?? [],
    ).length;
    const total = document.plan.firstFocus.length + document.plan.laterToday.length + document.plan.ifCapacityRemains.length;
    return { localDate: document.localDate, completed, total };
  });

  return {
    completedTasks: days.reduce((sum, day) => sum + day.completed, 0),
    activeDays: days.filter((day) => day.completed > 0).length,
    plannedDays: days.length,
    days,
  };
}
