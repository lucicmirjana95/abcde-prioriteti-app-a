import { isAppADailyPlanDocument, type AppADailyPlanDocument } from './dailyPlanDocument';
import { recalculatePlanTotals, validatePlanDraft } from '../domain/daily-reset/validation';

// A queued addition may be based on an older screen snapshot. Apply only the new
// item to the latest plan, retaining edits and completions from other devices.
export function mergePlanAddition(current: unknown, proposed: AppADailyPlanDocument, itemId: string): AppADailyPlanDocument {
  if (!isAppADailyPlanDocument(current)) throw new Error('daily_plan_not_found');
  const all = [...current.plan.firstFocus, ...current.plan.laterToday, ...current.plan.ifCapacityRemains];
  if (all.some((item) => item.id === itemId)) return current;
  const item = [...proposed.plan.firstFocus, ...proposed.plan.laterToday, ...proposed.plan.ifCapacityRemains].find((entry) => entry.id === itemId);
  if (!item) throw new Error('invalid_plan');
  if (all.some((entry) => entry.title.normalize('NFKC').trim().toLowerCase() === item.title.normalize('NFKC').trim().toLowerCase())) throw new Error('duplicate');
  const sources = proposed.plan.classifiedItems.filter((source) => item.sourceItemIds.includes(source.id) && !current.plan.classifiedItems.some((old) => old.id === source.id));
  const plan = recalculatePlanTotals({ ...current.plan, classifiedItems: [...current.plan.classifiedItems, ...sources], laterToday: [...current.plan.laterToday, { ...item, block: 'later_today' as const }] });
  if (plan.availableMinutes === undefined) throw new Error('capacity_unknown');
  if ((plan.plannedFlexibleMinutes ?? plan.plannedRequiredMinutes) > plan.availableMinutes) throw new Error('capacity_exceeded');
  if (!validatePlanDraft(plan).valid) throw new Error('invalid_plan');
  return { ...current, plan, revision: (current.revision || 0) + 1 };
}
