import type { TodayCandidate } from "../../shared/domain/today-candidates";
import { isTodayCandidate } from '../../shared/domain/today-candidates';
import type { ClassifiedBrainDumpItem, DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import { recalculatePlanTotals, validatePlanDraft } from "../domain/daily-reset/validation";

export type AddVisionCandidateResult = { draft: DailyPlanDraft } | { error: "duplicate" | "capacity_unknown" | "capacity_exceeded" | "invalid_plan" };

export function addVisionCandidateToPlan(draft: DailyPlanDraft, candidate: TodayCandidate): AddVisionCandidateResult {
  if (!isTodayCandidate(candidate) || candidate.estimatedMinutes <= 0) return { error: 'invalid_plan' };
  const sourceId = `vision_source_${candidate.id}`;
  const planItemId = `vision_plan_${candidate.id}`;
  const allToday = [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains];
  if (draft.classifiedItems.some((item) => item.id === sourceId) || allToday.some((item) => item.id === planItemId || item.title.trim().toLowerCase() === candidate.title.trim().toLowerCase())) return { error: "duplicate" };
  if (draft.availableMinutes === undefined) return { error: "capacity_unknown" };
  if ((draft.plannedFlexibleMinutes ?? draft.plannedRequiredMinutes) + candidate.estimatedMinutes > draft.availableMinutes) return { error: "capacity_exceeded" };
  const priority = { goalContribution: 4 as const, explanation: "Explicitly selected from the user's saved Vision strategy." };
  const classified: ClassifiedBrainDumpItem = { id: sourceId, originalText: candidate.title, kind: "task", timeHorizon: "today", suggestedAction: candidate.title, estimatedMinutes: candidate.estimatedMinutes, requiredEnergy: 3, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority, goalRelationship: { goalId: candidate.sourceId, relationshipExplanation: "Next step from a confirmed Vision strategy." } };
  const planItem: DailyPlanItem = { id: planItemId, sourceItemIds: [sourceId], title: candidate.title, block: "later_today", estimatedMinutes: candidate.estimatedMinutes, capacityType: "flexible", requiredEnergy: 3, timeSensitivity: "none", priority, goalRelationship: classified.goalRelationship, reasoning: "Added by explicit user confirmation from Vision.", needsCheck: false };
  const next = recalculatePlanTotals({ ...draft, classifiedItems: [...draft.classifiedItems, classified], laterToday: [...draft.laterToday, planItem] });
  return validatePlanDraft(next).valid ? { draft: next } : { error: "invalid_plan" };
}
