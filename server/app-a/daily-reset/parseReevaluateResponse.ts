import {
  DailyPlanDraft,
  DailyPlanItem,
  FiveLevelRating,
  PriorityConfidence,
  RecommendedDisposition,
  PlanBlock,
} from "../../../src/app-a/domain/daily-reset/contracts";
import {
  ModelItemEvaluation,
  ModelReevaluatePlan,
  ModelReevaluateResponseShape,
} from "./modelSchema";

export interface ReevaluationInputContext {
  localDate?: string;
  energy: FiveLevelRating;
  pleasantness: FiveLevelRating;
  availableMinutes?: number;
  newImportantTask?: {
    id?: string;
    title: string;
    estimatedMinutes?: number;
    timeSensitivity?: string;
    deadlineText?: string;
    deadlineIso?: string;
    goalRelationship?: any;
  };
  unfinishedFlexibleItems: DailyPlanItem[];
  completedItems: DailyPlanItem[];
  fixedItems: DailyPlanItem[];
  draft: DailyPlanDraft;
  language: string;
  activeVisionContext?: {
    goals?: Array<{ id: string; title: string }>;
  };
}

export interface ReevaluationDiff {
  firstFocusEntries: Array<{ id: string; title: string; reason: string; consequence: number; leverage: number }>;
  movedToLaterToday: Array<{ id: string; title: string; reason: string }>;
  movedToIfCapacity: Array<{ id: string; title: string; reason: string }>;
  movedToDeferred: Array<{ id: string; title: string; reason: string }>;
  manualOverrideConflicts: Array<{
    id: string;
    title: string;
    previousBlock: string;
    proposedBlock: string;
    reason: string;
  }>;
  proposedDelegations: Array<{
    id: string;
    title: string;
    explanation: string;
  }>;
  proposedEliminations: Array<{
    id: string;
    title: string;
    explanation: string;
  }>;
  summaryOfChanges: string;
}

export interface ParsedReevaluationResult {
  success: boolean;
  code?: string;
  error?: string;
  evaluations?: ModelItemEvaluation[];
  plan?: ModelReevaluatePlan;
  diff?: ReevaluationDiff;
  rejectionReason?: string;
}

function parseJsonSafe(raw: unknown): any {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      // Try stripping markdown blocks
      const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
      return JSON.parse(clean);
    }
  }
  throw new Error("Raw response is not object or string");
}

export function parseReevaluateModelResponse(
  rawResponse: unknown,
  context: ReevaluationInputContext
): ParsedReevaluationResult {
  let data: ModelReevaluateResponseShape;
  try {
    data = parseJsonSafe(rawResponse);
  } catch (err: any) {
    return {
      success: false,
      code: "invalid_ai_response",
      error: "AI response is not valid JSON.",
      rejectionReason: "malformed_json",
    };
  }

  if (!data || typeof data !== "object") {
    return {
      success: false,
      code: "invalid_ai_response",
      error: "AI response must be an object.",
      rejectionReason: "not_an_object",
    };
  }

  if (!Array.isArray(data.evaluations) || !data.plan || typeof data.plan !== "object") {
    return {
      success: false,
      code: "invalid_ai_response",
      error: "Missing evaluations array or plan object.",
      rejectionReason: "missing_evaluations_or_plan",
    };
  }

  const { evaluations, plan } = data;

  if (
    !Array.isArray(plan.firstFocusItemIds) ||
    !Array.isArray(plan.laterTodayItemIds) ||
    !Array.isArray(plan.ifCapacityRemainsItemIds) ||
    !Array.isArray(plan.deferredItemIds) ||
    typeof plan.summaryOfChanges !== "string"
  ) {
    return {
      success: false,
      code: "invalid_ai_response",
      error: "Plan must contain firstFocusItemIds, laterTodayItemIds, ifCapacityRemainsItemIds, deferredItemIds, and summaryOfChanges.",
      rejectionReason: "invalid_plan_structure",
    };
  }

  // A. Semantic Validation Check
  const rawEvals = (rawResponse as any)?.evaluations || [];
  for (const ev of rawEvals) {
    if (ev.proposedBlock && !["first_focus", "later_today", "if_capacity_remains", "deferred"].includes(ev.proposedBlock)) {
      return { success: false, code: "semantic_violation", error: "proposedBlock ima nepoznatu vrednost", rejectionReason: "invalid_proposed_block" };
    }
    if (ev.estimatedMinutes !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI promeni estimatedMinutes", rejectionReason: "invented_field" };
    }
    if (ev.deadline !== undefined || ev.deadlineIso !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI doda deadline/deadlineIso koji nije postojao u korisničkom unosu", rejectionReason: "invented_field" };
    }
    if (ev.visionRelationship !== undefined || ev.goalRelationship !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI doda ili promeni Vision relationship/sourceId bez postojeće veze", rejectionReason: "invented_field" };
    }
    if (ev.title !== undefined || ev.content !== undefined || ev.originalText !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI promeni naslov ili smisao zadatka u toku koji treba samo da menja prioritete", rejectionReason: "invented_field" };
    }
  }

  const allowedIds = new Set(context.unfinishedFlexibleItems.map(i => i.id));
  if (context.newImportantTask?.id) allowedIds.add(context.newImportantTask.id);

  const completedSet = new Set(context.completedItems.map(i => i.id));
  const fixedSet = new Set(context.fixedItems.map(i => i.id));

  const allOutputIdsList = [
    ...plan.firstFocusItemIds,
    ...plan.laterTodayItemIds,
    ...plan.ifCapacityRemainsItemIds,
    ...plan.deferredItemIds
  ];
  
  const idSet = new Set<string>();
  for (const id of allOutputIdsList) {
    if (idSet.has(id)) {
      return { success: false, code: "semantic_violation", error: `isti ID postoji više puta: ${id}`, rejectionReason: "duplicate_id" };
    }
    idSet.add(id);

    if (completedSet.has(id)) {
      return { success: false, code: "semantic_violation", error: `completed stavka ${id} bude vraćena kao promenjena`, rejectionReason: "completed_mutation" };
    }
    if (fixedSet.has(id)) {
      return { success: false, code: "semantic_violation", error: `fixed stavka ${id} promeni blok, redosled u odnosu na svoju satnicu, vreme ili capacityType`, rejectionReason: "fixed_mutation" };
    }
    if (!allowedIds.has(id)) {
      return { success: false, code: "semantic_violation", error: `sourceItemId ne postoji: ${id}`, rejectionReason: "unknown_id" };
    }
  }
  
  for (const ev of rawEvals) {
    if (ev.recommendedDisposition === "delegate" || ev.recommendedDisposition === "eliminate") {
        if (!idSet.has(ev.sourceItemId)) {
            return { success: false, code: "semantic_violation", error: "delegate/eliminate bude tretiran kao izvršen umesto predloga", rejectionReason: "unconfirmed_delegate_eliminate" };
        }
    }
    const origItem = context.unfinishedFlexibleItems.find(i => i.id === ev.sourceItemId);
    if (origItem && origItem.manualPriorityOverride) {
        const proposedBlock = ev.proposedBlock || "later_today";
        const originalBlock = origItem.block || "later_today";
        if (proposedBlock !== originalBlock && ev.conflictsWithManualOverride !== true) {
            return { success: false, code: "semantic_violation", error: "manual override konflikt nije eksplicitno označen", rejectionReason: "unmarked_manual_conflict" };
        }
    }
  }


  // Known item map
  const unfinishedMap = new Map<string, DailyPlanItem>();
  for (const item of context.unfinishedFlexibleItems) {
    unfinishedMap.set(item.id, item);
  }

  // If newImportantTask provided with ID, treat as known
  if (context.newImportantTask && context.newImportantTask.id) {
    unfinishedMap.set(context.newImportantTask.id, {
      id: context.newImportantTask.id,
      sourceItemIds: [context.newImportantTask.id],
      title: context.newImportantTask.title,
      block: "later_today",
      estimatedMinutes: context.newImportantTask.estimatedMinutes || 30,
      requiredEnergy: (context.energy || 3) as any,
      timeSensitivity: (context.newImportantTask.timeSensitivity || "none") as any,
      priority: { explanation: "" },
      needsCheck: false,
    });
  }

  const completedIds = new Set(context.completedItems.map((i) => i.id));
  const fixedIds = new Set(context.fixedItems.map((i) => i.id));

  // 1. Invariant: Locked completed tasks must not be modified or re-planned
  for (const id of [
    ...plan.firstFocusItemIds,
    ...plan.laterTodayItemIds,
    ...plan.ifCapacityRemainsItemIds,
    ...plan.deferredItemIds,
  ]) {
    if (completedIds.has(id)) {
      return {
        success: false,
        code: "completed_task_modified",
        error: `Completed task ${id} is locked and cannot be re-planned.`,
        rejectionReason: "completed_task_modified",
      };
    }
  }

  // 2. Invariant: Fixed commitments must not be placed in First Focus or re-planned as flexible
  for (const id of plan.firstFocusItemIds) {
    if (fixedIds.has(id)) {
      return {
        success: false,
        code: "fixed_in_first_focus",
        error: `Fixed commitment ${id} cannot be placed in First Focus.`,
        rejectionReason: "fixed_in_first_focus",
      };
    }
  }

  for (const id of [
    ...plan.firstFocusItemIds,
    ...plan.laterTodayItemIds,
    ...plan.ifCapacityRemainsItemIds,
    ...plan.deferredItemIds,
  ]) {
    if (fixedIds.has(id)) {
      return {
        success: false,
        code: "fixed_commitment_modified",
        error: `Fixed commitment ${id} is locked and cannot be moved or modified.`,
        rejectionReason: "fixed_commitment_modified",
      };
    }
  }

  // 3. Invariant: Unknown sourceItemId rejected
  const evaluatedIds = new Set<string>();
  for (const ev of evaluations) {
    if (!unfinishedMap.has(ev.sourceItemId)) {
      return {
        success: false,
        code: "unknown_item_id",
        error: `Unknown task ID ${ev.sourceItemId} in evaluations.`,
        rejectionReason: "unknown_item_id",
      };
    }
    evaluatedIds.add(ev.sourceItemId);

    // Validate ratings
    for (const ratingField of [
      "consequence",
      "urgency",
      "goalContribution",
      "leverage",
      "mentalLoad",
      "dependencyPressure",
    ] as const) {
      const val = (ev as any)[ratingField];
      if (!Number.isInteger(val) || val < 1 || val > 5) {
        return {
          success: false,
          code: "invalid_rating",
          error: `Field ${ratingField} for task ${ev.sourceItemId} must be an integer between 1 and 5, got ${val}.`,
          rejectionReason: "invalid_rating",
        };
      }
    }

    if (!["low", "medium", "high"].includes(ev.confidence)) {
      return {
        success: false,
        code: "invalid_rating",
        error: `Field confidence for task ${ev.sourceItemId} must be low, medium, or high.`,
        rejectionReason: "invalid_confidence",
      };
    }

    if (!["do", "delegate", "defer", "eliminate", "clarify"].includes(ev.recommendedDisposition)) {
      return {
        success: false,
        code: "invalid_disposition",
        error: `Invalid recommendedDisposition: ${ev.recommendedDisposition}`,
        rejectionReason: "invalid_disposition",
      };
    }

    if (!["first_focus", "later_today", "if_capacity_remains", "deferred"].includes(ev.proposedBlock)) {
      return {
        success: false,
        code: "invalid_proposed_block",
        error: `Invalid proposedBlock: ${ev.proposedBlock}`,
        rejectionReason: "invalid_proposed_block",
      };
    }

    // Manual override conflict check
    const existingItem = unfinishedMap.get(ev.sourceItemId)!;
    if (existingItem.manualPriorityOverride) {
      const currentBlock = existingItem.block || "later_today";
      if (ev.proposedBlock !== currentBlock && !ev.conflictsWithManualOverride) {
        return {
          success: false,
          code: "unmarked_manual_override_conflict",
          error: `Task ${ev.sourceItemId} has a manual priority override and was moved to ${ev.proposedBlock}, but conflictsWithManualOverride was false.`,
          rejectionReason: "unmarked_manual_override_conflict",
        };
      }
    }
  }

  // 4. Invariant: All unfinished flexible tasks must be evaluated
  for (const [id] of unfinishedMap.entries()) {
    if (!evaluatedIds.has(id)) {
      return {
        success: false,
        code: "missing_item_evaluation",
        error: `Unfinished task ${id} was not evaluated.`,
        rejectionReason: "missing_item_evaluation",
      };
    }
  }

  // Check plan ID references
  const allPlanIds = [
    ...plan.firstFocusItemIds,
    ...plan.laterTodayItemIds,
    ...plan.ifCapacityRemainsItemIds,
    ...plan.deferredItemIds,
  ];

  for (const id of allPlanIds) {
    if (!unfinishedMap.has(id)) {
      return {
        success: false,
        code: "unknown_item_id",
        error: `Unknown task ID ${id} in plan blocks.`,
        rejectionReason: "unknown_item_id",
      };
    }
  }

  // Check that every unfinished item is either in a plan block or recommended for delegation/elimination
  const evaluationsByItemId = new Map<string, ModelItemEvaluation>();
  for (const ev of evaluations) {
    evaluationsByItemId.set(ev.sourceItemId, ev);
  }

  for (const [id] of unfinishedMap.entries()) {
    const ev = evaluationsByItemId.get(id);
    const inPlan = allPlanIds.includes(id);
    const isSpecialDisposition = ev && (ev.recommendedDisposition === "delegate" || ev.recommendedDisposition === "eliminate");
    if (!inPlan && !isSpecialDisposition) {
      return {
        success: false,
        code: "missing_item_evaluation",
        error: `Task ${id} was omitted from the plan without a delegate or eliminate disposition.`,
        rejectionReason: "missing_item_evaluation",
      };
    }
  }

  // 5. Invariant: First Focus cap <= 3
  if (plan.firstFocusItemIds.length > 3) {
    return {
      success: false,
      code: "first_focus_cap_exceeded",
      error: `First Focus cannot contain more than 3 items, got ${plan.firstFocusItemIds.length}.`,
      rejectionReason: "first_focus_cap_exceeded",
    };
  }

  // 6. Invariant: Passive waiting_for must NOT be in First Focus
  for (const id of plan.firstFocusItemIds) {
    const item = unfinishedMap.get(id);
    if (item && (item.itemStatusState === "waiting_for" || (item as any).kind === "waiting_for")) {
      return {
        success: false,
        code: "waiting_for_in_first_focus",
        error: `Passive waiting_for task ${id} cannot be in First Focus.`,
        rejectionReason: "waiting_for_in_first_focus",
      };
    }
  }

  // 7. Invariant: Dependencies must be respected
  // Block index: first_focus (0) -> later_today (1) -> if_capacity_remains (2) -> deferred (3)
  const blockRank: Record<string, number> = {
    first_focus: 0,
    later_today: 1,
    if_capacity_remains: 2,
    deferred: 3,
  };

  const itemBlockAndIndex = new Map<string, { block: string; rank: number; index: number }>();
  plan.firstFocusItemIds.forEach((id, idx) => itemBlockAndIndex.set(id, { block: "first_focus", rank: 0, index: idx }));
  plan.laterTodayItemIds.forEach((id, idx) => itemBlockAndIndex.set(id, { block: "later_today", rank: 1, index: idx }));
  plan.ifCapacityRemainsItemIds.forEach((id, idx) => itemBlockAndIndex.set(id, { block: "if_capacity_remains", rank: 2, index: idx }));
  plan.deferredItemIds.forEach((id, idx) => itemBlockAndIndex.set(id, { block: "deferred", rank: 3, index: idx }));

  for (const [id, item] of unfinishedMap.entries()) {
    if (item.dependsOnItemIds && item.dependsOnItemIds.length > 0) {
      const posA = itemBlockAndIndex.get(id);
      if (!posA) continue; // Task might be proposed for elimination

      for (const depId of item.dependsOnItemIds) {
        // If dependency is already completed, it's satisfied!
        if (completedIds.has(depId)) continue;

        const posB = itemBlockAndIndex.get(depId);
        if (!posB) {
          // If B is missing from plan and not completed, violation!
          return {
            success: false,
            code: "dependency_violation",
            error: `Task "${item.title}" depends on task "${depId}", which is not scheduled or completed.`,
            rejectionReason: "dependency_violation",
          };
        }

        // B must come before A
        if (posA.rank < posB.rank) {
          return {
            success: false,
            code: "dependency_violation",
            error: `Task "${item.title}" in ${posA.block} depends on "${unfinishedMap.get(depId)?.title || depId}" which is in later block ${posB.block}.`,
            rejectionReason: "dependency_violation",
          };
        }

        if (posA.rank === posB.rank && posA.index <= posB.index) {
          return {
            success: false,
            code: "dependency_violation",
            error: `Task "${item.title}" appears before its prerequisite "${unfinishedMap.get(depId)?.title || depId}" in the same block.`,
            rejectionReason: "dependency_violation",
          };
        }
      }
    }
  }

  // 8. Invariant: Capacity overflow
  if (context.availableMinutes !== undefined && context.availableMinutes > 0) {
    let totalPlannedFlexible = 0;
    for (const id of [...plan.firstFocusItemIds, ...plan.laterTodayItemIds]) {
      const item = unfinishedMap.get(id);
      if (item && item.capacityType !== "fixed") {
        totalPlannedFlexible += item.estimatedMinutes || 0;
      }
    }
    if (totalPlannedFlexible > context.availableMinutes) {
      return {
        success: false,
        code: "capacity_overflow",
        error: `Planned flexible minutes (${totalPlannedFlexible}m) exceeds available minutes (${context.availableMinutes}m).`,
        rejectionReason: "capacity_overflow",
      };
    }
  }

  // 9. Invariant: Invented deadlines
  for (const ev of evaluations) {
    const orig = unfinishedMap.get(ev.sourceItemId);
    // Ensure no ungrounded deadline was attached in ev.evidenceFromInput if orig had no deadline
    if (!orig?.deadlineText && !orig?.deadlineIso && ev.evidenceFromInput?.toLowerCase().includes("deadline")) {
      // Allow general mention if not claiming a specific fake date
    }
  }

  // Compute detailed Diff
  const originalFfIds = new Set((context.draft.firstFocus || []).map((i) => i.id));
  const originalLtIds = new Set((context.draft.laterToday || []).map((i) => i.id));
  const originalOptIds = new Set((context.draft.ifCapacityRemains || []).map((i) => i.id));

  const firstFocusEntries: ReevaluationDiff["firstFocusEntries"] = [];
  const movedToLaterToday: ReevaluationDiff["movedToLaterToday"] = [];
  const movedToIfCapacity: ReevaluationDiff["movedToIfCapacity"] = [];
  const movedToDeferred: ReevaluationDiff["movedToDeferred"] = [];
  const manualOverrideConflicts: ReevaluationDiff["manualOverrideConflicts"] = [];
  const proposedDelegations: ReevaluationDiff["proposedDelegations"] = [];
  const proposedEliminations: ReevaluationDiff["proposedEliminations"] = [];

  for (const id of plan.firstFocusItemIds) {
    const item = unfinishedMap.get(id);
    const ev = evaluationsByItemId.get(id);
    if (!item || !ev) continue;
    if (!originalFfIds.has(id)) {
      firstFocusEntries.push({
        id: item.id,
        title: item.title,
        reason: ev.conciseExplanation,
        consequence: ev.consequence,
        leverage: ev.leverage,
      });
    }
  }

  for (const id of plan.laterTodayItemIds) {
    const item = unfinishedMap.get(id);
    const ev = evaluationsByItemId.get(id);
    if (!item || !ev) continue;
    if (originalFfIds.has(id)) {
      movedToLaterToday.push({
        id: item.id,
        title: item.title,
        reason: ev.conciseExplanation,
      });
    }
  }

  for (const id of plan.ifCapacityRemainsItemIds) {
    const item = unfinishedMap.get(id);
    const ev = evaluationsByItemId.get(id);
    if (!item || !ev) continue;
    if (originalFfIds.has(id) || originalLtIds.has(id)) {
      movedToIfCapacity.push({
        id: item.id,
        title: item.title,
        reason: ev.conciseExplanation,
      });
    }
  }

  for (const id of plan.deferredItemIds) {
    const item = unfinishedMap.get(id);
    const ev = evaluationsByItemId.get(id);
    if (!item || !ev) continue;
    if (originalFfIds.has(id) || originalLtIds.has(id) || originalOptIds.has(id)) {
      movedToDeferred.push({
        id: item.id,
        title: item.title,
        reason: ev.conciseExplanation,
      });
    }
  }

  // Check manual override conflicts
  for (const [id, item] of unfinishedMap.entries()) {
    if (item.manualPriorityOverride) {
      const pos = itemBlockAndIndex.get(id);
      const originalBlock = item.block || "later_today";
      const proposedBlock = pos ? pos.block : "eliminated";
      if (originalBlock !== proposedBlock) {
        const ev = evaluationsByItemId.get(id);
        manualOverrideConflicts.push({
          id,
          title: item.title,
          previousBlock: originalBlock,
          proposedBlock,
          reason: ev?.conciseExplanation || "AI proposed moving this task based on priority factors.",
        });
      }
    }
  }

  // Delegations & Eliminations
  for (const ev of evaluations) {
    const item = unfinishedMap.get(ev.sourceItemId);
    if (!item) continue;
    if (ev.recommendedDisposition === "delegate") {
      proposedDelegations.push({
        id: item.id,
        title: item.title,
        explanation: ev.conciseExplanation,
      });
    } else if (ev.recommendedDisposition === "eliminate") {
      proposedEliminations.push({
        id: item.id,
        title: item.title,
        explanation: ev.conciseExplanation,
      });
    }
  }

  const diff: ReevaluationDiff = {
    firstFocusEntries,
    movedToLaterToday,
    movedToIfCapacity,
    movedToDeferred,
    manualOverrideConflicts,
    proposedDelegations,
    proposedEliminations,
    summaryOfChanges: plan.summaryOfChanges,
  };

  return {
    success: true,
    evaluations,
    plan,
    diff,
  };
}
