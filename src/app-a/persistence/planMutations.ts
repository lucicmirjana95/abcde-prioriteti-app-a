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
  const wouldExceed = item.capacityType !== 'fixed' && current.plan.availableMinutes !== undefined
    && (current.plan.plannedFlexibleMinutes ?? current.plan.plannedRequiredMinutes) + item.estimatedMinutes > current.plan.availableMinutes;
  const targetBlock = wouldExceed ? 'if_capacity_remains' as const : 'later_today' as const;
  const plan = recalculatePlanTotals({
    ...current.plan,
    classifiedItems: [...current.plan.classifiedItems, ...sources],
    laterToday: targetBlock === 'later_today' ? [...current.plan.laterToday, { ...item, block: targetBlock }] : current.plan.laterToday,
    ifCapacityRemains: targetBlock === 'if_capacity_remains' ? [...current.plan.ifCapacityRemains, { ...item, block: targetBlock }] : current.plan.ifCapacityRemains,
  });
  if (!validatePlanDraft(plan).valid) throw new Error('invalid_plan');
  return { ...current, plan, revision: (current.revision || 0) + 1 };
}
