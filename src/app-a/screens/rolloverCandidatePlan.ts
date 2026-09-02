import type {
  ClassifiedBrainDumpItem,
  DailyPlanDraft,
  DailyPlanItem,
} from "../domain/daily-reset/contracts";
import { validatePlanDraft } from "../domain/daily-reset/validation";
import type { UnfinishedRolloverCandidate } from "../domain/rollover/contracts";

export type AddRolloverCandidateResult =
  | { draft: DailyPlanDraft }
  | {
      error:
        | "duplicate"
        | "capacity_unknown"
        | "capacity_exceeded"
        | "invalid_plan";
    };

/**
 * Safely incorporates an unfinished rollover candidate into a confirmed DailyPlanDraft.
 * - Always defaults to `laterToday` (or optionally `ifCapacityRemains`).
 * - Never auto-promotes to `firstFocus`.
 * - Enforces exact ID, provenance, and normalized title duplicate checks.
 * - Enforces available capacity boundaries.
 * - Preserves item metadata (estimated minutes, energy, sensitivity, deadline, priority).
 */
export function addRolloverCandidateToPlan(
  draft: DailyPlanDraft,
  candidate: UnfinishedRolloverCandidate,
  targetBlock: "later_today" | "if_capacity_remains" = "later_today",
): AddRolloverCandidateResult {
  const sourceId = `rollover_source_${candidate.sourceLocalDate}_${candidate.id}`;
  const planItemId = `rollover_plan_${candidate.sourceLocalDate}_${candidate.id}`;
  const allToday = [
    ...draft.firstFocus,
    ...draft.laterToday,
    ...draft.ifCapacityRemains,
  ];

  const isDuplicate =
    draft.classifiedItems.some(
      (item) =>
        item.id === sourceId ||
        item.id === candidate.id ||
        item.originalText.trim().toLowerCase() === candidate.title.trim().toLowerCase(),
    ) ||
    allToday.some(
      (item) =>
        item.id === planItemId ||
        item.id === candidate.id ||
        item.sourceItemIds.includes(sourceId) ||
        item.sourceItemIds.includes(candidate.id) ||
        item.title.trim().toLowerCase() === candidate.title.trim().toLowerCase(),
    );

  if (isDuplicate) {
    return { error: "duplicate" };
  }

  if (draft.availableMinutes === undefined) {
    return { error: "capacity_unknown" };
  }

  if (targetBlock === "later_today") {
    if (
      draft.plannedRequiredMinutes + candidate.estimatedMinutes >
      draft.availableMinutes
    ) {
      return { error: "capacity_exceeded" };
    }
  }

  const priority = candidate.priority || {
    explanation: `Carried forward from unfinished plan on ${candidate.sourceLocalDate}.`,
  };

  const classified: ClassifiedBrainDumpItem = {
    id: sourceId,
    originalText: candidate.title,
    kind: "task",
    timeHorizon: "today",
    suggestedAction: candidate.title,
    estimatedMinutes: candidate.estimatedMinutes,
    requiredEnergy: candidate.requiredEnergy || 3,
    timeSensitivity: candidate.timeSensitivity || "none",
    deadlineText: candidate.deadlineText,
    deadlineIso: candidate.deadlineIso,
    isAmbiguous: false,
    needsCheck: false,
    priority,
    goalRelationship: candidate.goalRelationship,
  };

  const planItem: DailyPlanItem = {
    id: planItemId,
    sourceItemIds: [sourceId],
    title: candidate.title,
    description: candidate.description,
    block: targetBlock,
    estimatedMinutes: candidate.estimatedMinutes,
    requiredEnergy: candidate.requiredEnergy || 3,
    timeSensitivity: candidate.timeSensitivity || "none",
    deadlineText: candidate.deadlineText,
    deadlineIso: candidate.deadlineIso,
    priority,
    goalRelationship: candidate.goalRelationship,
    reasoning: `Carried forward from unfinished plan on ${candidate.sourceLocalDate}.`,
    needsCheck: false,
  };

  const next: DailyPlanDraft = {
    ...draft,
    classifiedItems: [...draft.classifiedItems, classified],
    firstFocus: [...draft.firstFocus], // Never auto-promoted to firstFocus!
    laterToday:
      targetBlock === "later_today"
        ? [...draft.laterToday, planItem]
        : [...draft.laterToday],
    ifCapacityRemains:
      targetBlock === "if_capacity_remains"
        ? [...draft.ifCapacityRemains, planItem]
        : [...draft.ifCapacityRemains],
    plannedRequiredMinutes:
      targetBlock === "later_today"
        ? draft.plannedRequiredMinutes + candidate.estimatedMinutes
        : draft.plannedRequiredMinutes,
    plannedOptionalMinutes:
      targetBlock === "if_capacity_remains"
        ? draft.plannedOptionalMinutes + candidate.estimatedMinutes
        : draft.plannedOptionalMinutes,
  };

  return validatePlanDraft(next).valid
    ? { draft: next }
    : { error: "invalid_plan" };
}
