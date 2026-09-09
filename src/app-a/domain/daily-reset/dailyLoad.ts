import type { DailyPlanDraft, DailyPlanItem } from "./contracts";

export const PRACTICAL_DAY_LIMIT_MINUTES = 16 * 60;

export interface DailyLoadAssessment {
  overloaded: boolean;
  remainingMinutes: number;
  excessMinutes: number;
  fixedMinutes: number;
  flexibleMinutes: number;
  suggestedMoves: DailyPlanItem[];
}

function lowPriorityFirst(item: DailyPlanItem): number {
  const p = item.priority || { explanation: "" };
  return (p.consequence || 1) * 4 + (p.urgency || 1) * 4 + (p.goalContribution || 1) * 3 + (p.dependencyPressure || 1) * 2;
}

/** A warning only: fixed commitments are never removed or silently shortened. */
export function assessDailyLoad(draft: DailyPlanDraft, completedItemIds: string[] = []): DailyLoadAssessment {
  const completed = new Set(completedItemIds);
  const remaining = [...draft.firstFocus, ...draft.laterToday].filter((item) => !completed.has(item.id));
  const fixedMinutes = remaining.filter((item) => item.capacityType === "fixed").reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const flexible = remaining.filter((item) => item.capacityType !== "fixed");
  const flexibleMinutes = flexible.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const remainingMinutes = fixedMinutes + flexibleMinutes;
  const excessMinutes = Math.max(0, remainingMinutes - PRACTICAL_DAY_LIMIT_MINUTES);
  const candidates = [...flexible].sort((a, b) => {
    const blockA = a.block === "if_capacity_remains" ? 0 : a.block === "later_today" ? 1 : 2;
    const blockB = b.block === "if_capacity_remains" ? 0 : b.block === "later_today" ? 1 : 2;
    return blockA - blockB || lowPriorityFirst(a) - lowPriorityFirst(b);
  });
  const suggestedMoves: DailyPlanItem[] = [];
  let recovered = 0;
  for (const item of candidates) {
    if (recovered >= excessMinutes) break;
    suggestedMoves.push(item);
    recovered += item.estimatedMinutes;
  }
  return { overloaded: excessMinutes > 0, remainingMinutes, excessMinutes, fixedMinutes, flexibleMinutes, suggestedMoves };
}
