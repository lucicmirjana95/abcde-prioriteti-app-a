import {
  DailyPlanDraft,
  DailyPlanItem,
  ClassifiedBrainDumpItem,
  PlanBlock,
  TimeHorizon,
} from "../domain/daily-reset/contracts";
import { recalculatePlanTotals } from "../domain/daily-reset/validation";

export interface ReviewState {
  currentDraft: DailyPlanDraft;
  undoDraft: DailyPlanDraft | null;
  error?: string | null;
}

/**
 * Recalculates plannedRequiredMinutes (firstFocus + laterToday)
 * and plannedOptionalMinutes (ifCapacityRemains).
 * Returns a new DailyPlanDraft object without mutating input.
 */
export { recalculatePlanTotals } from "../domain/daily-reset/validation";

/**
 * Moves a DailyPlanItem between today's plan blocks (first_focus, later_today, if_capacity_remains).
 * Enforces max 3 items in first_focus.
 */
export function movePlanItem(
  draft: DailyPlanDraft,
  itemId: string,
  targetBlock: PlanBlock
): { draft: DailyPlanDraft; error?: string } {
  // Find item across all three blocks
  let foundItem: DailyPlanItem | undefined;
  let sourceBlock: PlanBlock | undefined;

  for (const item of draft.firstFocus) {
    if (item.id === itemId) {
      foundItem = item;
      sourceBlock = "first_focus";
      break;
    }
  }
  if (!foundItem) {
    for (const item of draft.laterToday) {
      if (item.id === itemId) {
        foundItem = item;
        sourceBlock = "later_today";
        break;
      }
    }
  }
  if (!foundItem) {
    for (const item of draft.ifCapacityRemains) {
      if (item.id === itemId) {
        foundItem = item;
        sourceBlock = "if_capacity_remains";
        break;
      }
    }
  }

  if (!foundItem || !sourceBlock) {
    return { draft, error: "item_not_found" };
  }

  if (sourceBlock === targetBlock) {
    return { draft };
  }

  // Enforce First-focus maximum limit (max 3 items)
  if (foundItem.capacityType === "fixed") return { draft, error: "cannot_move_fixed_task" };
  if (targetBlock === "first_focus" && draft.firstFocus.filter(i => i.capacityType !== "fixed").length >= 3) {
    return {
      draft,
      error: "first_focus_limit_exceeded",
    };
  }

  // Remove from source block
  const firstFocus = draft.firstFocus.filter((i) => i.id !== itemId);
  const laterToday = draft.laterToday.filter((i) => i.id !== itemId);
  const ifCapacityRemains = draft.ifCapacityRemains.filter((i) => i.id !== itemId);

  // Update item
  const updatedItem: DailyPlanItem = {
    ...foundItem,
    block: targetBlock,
  };

  // Add to target block
  const newFirstFocus = targetBlock === "first_focus" ? [...firstFocus, updatedItem] : firstFocus;
  const newLaterToday = targetBlock === "later_today" ? [...laterToday, updatedItem] : laterToday;
  const newIfCapacityRemains =
    targetBlock === "if_capacity_remains" ? [...ifCapacityRemains, updatedItem] : ifCapacityRemains;

  const newDraft = recalculatePlanTotals({
    ...draft,
    firstFocus: newFirstFocus,
    laterToday: newLaterToday,
    ifCapacityRemains: newIfCapacityRemains,
  });

  return { draft: newDraft };
}

/**
 * Reorders a DailyPlanItem within its block by moving it up or down.
 */
export function reorderPlanItem(
  draft: DailyPlanDraft,
  itemId: string,
  direction: "up" | "down"
): { draft: DailyPlanDraft; error?: string } {
  // Find item across all three blocks
  let targetArray: DailyPlanItem[] | undefined;
  let sourceBlock: PlanBlock | undefined;

  for (const item of draft.firstFocus) {
    if (item.id === itemId) {
      targetArray = draft.firstFocus;
      sourceBlock = "first_focus";
      break;
    }
  }
  if (!targetArray) {
    for (const item of draft.laterToday) {
      if (item.id === itemId) {
        targetArray = draft.laterToday;
        sourceBlock = "later_today";
        break;
      }
    }
  }
  if (!targetArray) {
    for (const item of draft.ifCapacityRemains) {
      if (item.id === itemId) {
        targetArray = draft.ifCapacityRemains;
        sourceBlock = "if_capacity_remains";
        break;
      }
    }
  }

  if (!targetArray || !sourceBlock) {
    return { draft, error: "item_not_found" };
  }

  const index = targetArray.findIndex((i) => i.id === itemId);
  if (index < 0) return { draft };

  if (direction === "up" && index === 0) return { draft };
  if (direction === "down" && index === targetArray.length - 1) return { draft };

  if (targetArray[index].capacityType === "fixed") return { draft, error: "cannot_move_fixed_task" };
  const newArray = [...targetArray];
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  
  // Rule: Fixed commitments cannot be moved out of their logical place
  if (newArray[index].capacityType === "fixed" || newArray[swapIndex].capacityType === "fixed") {
    return { draft };
  }

  const temp = newArray[index];
  newArray[index] = newArray[swapIndex];
  newArray[swapIndex] = temp;

  const newDraft = {
    ...draft,
    firstFocus: sourceBlock === "first_focus" ? newArray : draft.firstFocus,
    laterToday: sourceBlock === "later_today" ? newArray : draft.laterToday,
    ifCapacityRemains: sourceBlock === "if_capacity_remains" ? newArray : draft.ifCapacityRemains,
    manualPriorityOverride: true,
  };

  return { draft: recalculatePlanTotals(newDraft) };
}

/**
 * Moves a DailyPlanItem outside today (to this_week, later, long_term_idea, or no_action).
 */
export function movePlanItemOutside(
  draft: DailyPlanDraft,
  itemId: string,
  targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action"
): { draft: DailyPlanDraft; error?: string } {
  let foundItem: DailyPlanItem | undefined;

  for (const item of [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains]) {
    if (item.id === itemId) {
      foundItem = item;
      break;
    }
  }

  if (!foundItem) {
    return { draft, error: "item_not_found" };
  }

  const firstFocus = draft.firstFocus.filter((i) => i.id !== itemId);
  const laterToday = draft.laterToday.filter((i) => i.id !== itemId);
  const ifCapacityRemains = draft.ifCapacityRemains.filter((i) => i.id !== itemId);

  const classifiedItem: ClassifiedBrainDumpItem = {
    id: foundItem.id,
    originalText: foundItem.title,
    kind: "task",
    timeHorizon: targetHorizon,
    suggestedAction: foundItem.title,
    estimatedMinutes: foundItem.estimatedMinutes,
    requiredEnergy: foundItem.requiredEnergy,
    timeSensitivity: foundItem.timeSensitivity,
    deadlineText: foundItem.deadlineText,
    deadlineIso: foundItem.deadlineIso,
    isAmbiguous: false,
    needsCheck: foundItem.needsCheck,
    priority: foundItem.priority,
    goalRelationship: foundItem.goalRelationship,
  };

  let deferredItems = [...draft.deferredItems];
  let longTermIdeas = [...draft.longTermIdeas];
  let nonActionItems = [...draft.nonActionItems];

  if (targetHorizon === "this_week" || targetHorizon === "later") {
    deferredItems.push(classifiedItem);
  } else if (targetHorizon === "long_term_idea") {
    longTermIdeas.push(classifiedItem);
  } else if (targetHorizon === "no_action") {
    nonActionItems.push(classifiedItem);
  }

  const newDraft = recalculatePlanTotals({
    ...draft,
    firstFocus,
    laterToday,
    ifCapacityRemains,
    deferredItems,
    longTermIdeas,
    nonActionItems,
  });

  return { draft: newDraft };
}

/**
 * Promotes an eligible classified item into one of today's blocks.
 * Rejects if missing planning data (no positive estimatedMinutes or suggestedAction) or if First-focus limit is reached.
 */
export function promoteClassifiedItem(
  draft: DailyPlanDraft,
  itemId: string,
  targetBlock: PlanBlock
): { draft: DailyPlanDraft; error?: string } {
  let foundItem: ClassifiedBrainDumpItem | undefined;

  for (const item of [...draft.deferredItems, ...draft.longTermIdeas, ...draft.nonActionItems]) {
    if (item.id === itemId) {
      foundItem = item;
      break;
    }
  }

  if (!foundItem) {
    return { draft, error: "item_not_found" };
  }

  // Check required planning data
  if (!foundItem.estimatedMinutes || foundItem.estimatedMinutes <= 0) {
    return { draft, error: "missing_planning_data" };
  }

  // Check First-focus maximum
  if (targetBlock === "first_focus" && draft.firstFocus.length >= 3) {
    return { draft, error: "first_focus_limit_exceeded" };
  }

  const deferredItems = draft.deferredItems.filter((i) => i.id !== itemId);
  const longTermIdeas = draft.longTermIdeas.filter((i) => i.id !== itemId);
  const nonActionItems = draft.nonActionItems.filter((i) => i.id !== itemId);

  const planItem: DailyPlanItem = {
    id: foundItem.id,
    sourceItemIds: [foundItem.id],
    title: foundItem.suggestedAction || foundItem.originalText,
    description:
      foundItem.suggestedAction && foundItem.suggestedAction !== foundItem.originalText
        ? foundItem.originalText
        : undefined,
    block: targetBlock,
    estimatedMinutes: foundItem.estimatedMinutes,
    requiredEnergy: foundItem.requiredEnergy || 3,
    timeSensitivity: foundItem.timeSensitivity || "none",
    deadlineText: foundItem.deadlineText,
    deadlineIso: foundItem.deadlineIso,
    priority: foundItem.priority,
    goalRelationship: foundItem.goalRelationship,
    needsCheck: foundItem.needsCheck,
  };

  const firstFocus = targetBlock === "first_focus" ? [...draft.firstFocus, planItem] : draft.firstFocus;
  const laterToday = targetBlock === "later_today" ? [...draft.laterToday, planItem] : draft.laterToday;
  const ifCapacityRemains =
    targetBlock === "if_capacity_remains" ? [...draft.ifCapacityRemains, planItem] : draft.ifCapacityRemains;

  const newDraft = recalculatePlanTotals({
    ...draft,
    firstFocus,
    laterToday,
    ifCapacityRemains,
    deferredItems,
    longTermIdeas,
    nonActionItems,
  });

  return { draft: newDraft };
}

/**
 * Moves a classified item between horizons outside today (this_week, later, long_term_idea, no_action).
 */
export function moveClassifiedItemHorizon(
  draft: DailyPlanDraft,
  itemId: string,
  targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action"
): { draft: DailyPlanDraft; error?: string } {
  let foundItem: ClassifiedBrainDumpItem | undefined;

  for (const item of [...draft.deferredItems, ...draft.longTermIdeas, ...draft.nonActionItems]) {
    if (item.id === itemId) {
      foundItem = item;
      break;
    }
  }

  if (!foundItem) {
    return { draft, error: "item_not_found" };
  }

  const deferredItems = draft.deferredItems.filter((i) => i.id !== itemId);
  const longTermIdeas = draft.longTermIdeas.filter((i) => i.id !== itemId);
  const nonActionItems = draft.nonActionItems.filter((i) => i.id !== itemId);

  const updatedItem: ClassifiedBrainDumpItem = {
    ...foundItem,
    timeHorizon: targetHorizon,
  };

  let newDeferred = [...deferredItems];
  let newLongTerm = [...longTermIdeas];
  let newNonAction = [...nonActionItems];

  if (targetHorizon === "this_week" || targetHorizon === "later") {
    newDeferred.push(updatedItem);
  } else if (targetHorizon === "long_term_idea") {
    newLongTerm.push(updatedItem);
  } else if (targetHorizon === "no_action") {
    newNonAction.push(updatedItem);
  }

  return {
    draft: {
      ...draft,
      deferredItems: newDeferred,
      longTermIdeas: newLongTerm,
      nonActionItems: newNonAction,
    },
  };
}

/**
 * Edits allowed plan-item fields (title, description, estimatedMinutes).
 * Rejects empty title or non-positive estimatedMinutes.
 */
export function editPlanItem(
  draft: DailyPlanDraft,
  itemId: string,
  updates: { title: string; description?: string; estimatedMinutes: number }
): { draft: DailyPlanDraft; error?: string } {
  if (!updates.title || !updates.title.trim()) {
    return { draft, error: "invalid_title" };
  }

  if (
    typeof updates.estimatedMinutes !== "number" ||
    !Number.isInteger(updates.estimatedMinutes) ||
    updates.estimatedMinutes <= 0
  ) {
    return { draft, error: "invalid_duration" };
  }

  const updateItem = (item: DailyPlanItem): DailyPlanItem => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      title: updates.title.trim(),
      description: updates.description ? updates.description.trim() : undefined,
      estimatedMinutes: updates.estimatedMinutes,
    };
  };

  const firstFocus = draft.firstFocus.map(updateItem);
  const laterToday = draft.laterToday.map(updateItem);
  const ifCapacityRemains = draft.ifCapacityRemains.map(updateItem);

  const newDraft = recalculatePlanTotals({
    ...draft,
    firstFocus,
    laterToday,
    ifCapacityRemains,
  });

  return { draft: newDraft };
}

/**
 * Saves current draft into undoDraft.
 */
export function createUndoSnapshot(state: ReviewState): ReviewState {
  return {
    currentDraft: state.currentDraft,
    undoDraft: state.currentDraft,
    error: null,
  };
}

/**
 * Restores undoDraft as currentDraft.
 */
export function restoreUndoSnapshot(state: ReviewState): ReviewState {
  if (!state.undoDraft) return state;
  return {
    currentDraft: state.undoDraft,
    undoDraft: null,
    error: null,
  };
}

/**
 * Groups items outside today without duplicating IDs.
 */
export function groupOutsideTodayItems(draft: DailyPlanDraft): {
  thisWeek: ClassifiedBrainDumpItem[];
  later: ClassifiedBrainDumpItem[];
  longTermIdeas: ClassifiedBrainDumpItem[];
  noAction: ClassifiedBrainDumpItem[];
} {
  const seenIds = new Set<string>();

  const filterList = (
    items: ClassifiedBrainDumpItem[],
    predicate: (i: ClassifiedBrainDumpItem) => boolean
  ): ClassifiedBrainDumpItem[] => {
    const result: ClassifiedBrainDumpItem[] = [];
    for (const item of items) {
      if (!seenIds.has(item.id) && predicate(item)) {
        seenIds.add(item.id);
        result.push(item);
      }
    }
    return result;
  };

  const allItems = [
    ...(draft.deferredItems || []),
    ...(draft.longTermIdeas || []),
    ...(draft.nonActionItems || []),
  ];

  const thisWeek = filterList(allItems, (i) => i.timeHorizon === "this_week");
  const later = filterList(allItems, (i) => i.timeHorizon === "later");
  const longTermIdeas = filterList(allItems, (i) => i.timeHorizon === "long_term_idea");
  const noAction = filterList(allItems, (i) => i.timeHorizon === "no_action");

  return {
    thisWeek,
    later,
    longTermIdeas,
    noAction,
  };
}

export function calculateAiPriorityScore(item: DailyPlanItem): number {
  if (item.capacityType === "fixed") return 9999; // fixed always at top
  const p = item.priority;
  if (!p) return 0;
  const consequenceScore = (p.consequence || 0) * 100; // ABCDE A=500
  const urgencyScore = (p.urgency || 0) * 50; 
  const goalScore = (p.goalContribution || 0) * 30; // 80-20 principle
  return consequenceScore + urgencyScore + goalScore;
}

export interface PlanReevaluationDiff {
  firstFocusEntries: Array<{ id: string; title: string; reason: string; consequence?: number; leverage?: number }>;
  movedToLaterToday: Array<{ id: string; title: string; reason?: string }>;
  movedToIfCapacity: Array<{ id: string; title: string; reason?: string }>;
  movedToDeferred?: Array<{ id: string; title: string; reason?: string }>;
  manualOverrideConflicts?: Array<{ id: string; title: string; previousBlock: string; proposedBlock: string; reason: string }>;
  proposedDelegations: Array<{ id: string; title: string; explanation: string }>;
  proposedEliminations: Array<{ id: string; title: string; explanation: string }>;
  summary: string;
}

export interface StructuredReevaluationProposal {
  proposedDraft: DailyPlanDraft;
  diff: PlanReevaluationDiff;
  lockedItemIds: string[];
}

export function buildProposedDraftFromServerResponse(
  currentDraft: DailyPlanDraft,
  serverPlan: { firstFocusItemIds: string[]; laterTodayItemIds: string[]; ifCapacityRemainsItemIds: string[]; deferredItemIds?: string[] },
  evaluations: any[]
): DailyPlanDraft {
  const itemMap = new Map<string, DailyPlanItem>();
  for (const item of [
    ...currentDraft.firstFocus,
    ...currentDraft.laterToday,
    ...currentDraft.ifCapacityRemains,
  ]) {
    itemMap.set(item.id, item);
  }

  const applyEvaluations = (ids: string[], block: PlanBlock) => {
    const list: DailyPlanItem[] = [];
    for (const id of ids) {
      const item = itemMap.get(id);
      if (item) {
        const ev = evaluations.find(e => e.sourceItemId === id);
        if (ev) {
          list.push({ ...item, priority: ev, block });
        } else {
          list.push({ ...item, block });
        }
      }
    }
    return list;
  };

  return recalculatePlanTotals({
    ...currentDraft,
    firstFocus: applyEvaluations(serverPlan.firstFocusItemIds || [], "first_focus"),
    laterToday: applyEvaluations(serverPlan.laterTodayItemIds || [], "later_today"),
    ifCapacityRemains: applyEvaluations(serverPlan.ifCapacityRemainsItemIds || [], "if_capacity_remains"),
    manualPriorityOverride: false,
  });
}

export interface ReevaluationOptions {
  energy?: number;
  pleasantness?: number;
  availableMinutes?: number;
  completedItemIds?: string[];
  activeVisionContext?: {
    goals?: Array<{ id: string; title: string }>;
  };
  progressNote?: string;
  language?: string;
}

/**
 * Evaluates structured priority factors (ABCDE + 80/20 leverage) for a plan item.
 */
export function evaluateItemPriorityStructured(
  item: DailyPlanItem,
  context?: ReevaluationOptions
): NonNullable<DailyPlanItem['priority']> {
  const existing = item.priority;
  const titleLower = item.title.toLowerCase();
  const descLower = (item.description || "").toLowerCase();
  const fullText = `${titleLower} ${descLower}`;

  // 1. Consequence (1-5)
  // A: Serious consequence if not done (deadline, health, money, security, blocker)
  // B: Consequence exists, but not immediate or critical
  // C: Useful or pleasant, no significant consequence
  let consequence: number = existing?.consequence ?? 3;
  const isExplicitlyNoDeadline = fullText.includes("bez roka") || fullText.includes("no deadline");
  const hasHighConsequenceKeyword = !isExplicitlyNoDeadline && (
    /\b(hitno|urgent|deadline|platiti|kazna|health|zdravlje|security|bezbednost|blokira|porez|tax|kritično)\b/i.test(fullText) ||
    (/\brok\b/i.test(fullText) && !isExplicitlyNoDeadline)
  );
  const hasLowConsequenceKeyword = /\b(prijatno|lepše|opciono|možda|hobi|zabava|čitanje iz zabave|browse)\b/i.test(fullText);

  if (hasHighConsequenceKeyword || item.timeSensitivity === "deadline" || item.timeSensitivity === "urgent") {
    consequence = 5;
  } else if (hasLowConsequenceKeyword) {
    consequence = 1;
  }

  // 2. Urgency (1-5)
  let urgency: number = existing?.urgency ?? (
    item.timeSensitivity === "urgent" || item.timeSensitivity === "deadline" ? 5 :
    item.timeSensitivity === "soft" ? 3 : 2
  );
  if (item.deadlineIso || item.deadlineText) {
    urgency = Math.max(urgency, 4);
  }

  // 3. Goal Contribution (1-5)
  let goalContribution: number = existing?.goalContribution ?? 3;
  if (context?.activeVisionContext?.goals && context.activeVisionContext.goals.length > 0) {
    const matchesVision = context.activeVisionContext.goals.some((g) => {
      const gTitle = g.title.toLowerCase();
      return fullText.includes(gTitle) || gTitle.split(" ").some((w) => w.length > 3 && fullText.includes(w));
    });
    if (matchesVision) goalContribution = 5;
  }
  if (item.goalRelationship?.goalId || item.goalRelationship?.goalTitle) {
    goalContribution = Math.max(goalContribution, 4);
  }

  // 4. 80/20 Leverage (1-5)
  // High leverage (4-5) ONLY if:
  // - unblocks multiple other tasks or people
  // - removes a persistent source of friction or mental load
  // - creates disproportionate progress toward a primary day outcome or active Vision goal
  // - prevents costly rework later
  let leverage = existing?.leverage ?? 2;
  const unblocksTriggers = ["odblokira", "deblokira", "unblock", "pošalji podatke", "odobrenje", "prosledi ugovor", "potpis"];
  const frictionTriggers = ["reši blokadu", "očisti problem", "popravi grešku", "smetnja", "koči"];
  const reworkTriggers = ["spreči kašnjenje", "predupredi", "osiguraj", "backup"];

  let leveragePoints = 0;
  if (unblocksTriggers.some((t) => fullText.includes(t))) leveragePoints += 2;
  if (frictionTriggers.some((t) => fullText.includes(t))) leveragePoints += 1;
  if (reworkTriggers.some((t) => fullText.includes(t))) leveragePoints += 1;
  if (goalContribution >= 4) leveragePoints += 1;
  if (consequence >= 4) leveragePoints += 1;

  if (leveragePoints >= 3) {
    leverage = 5;
  } else if (leveragePoints === 2) {
    leverage = 4;
  } else if (leveragePoints === 1) {
    leverage = 3;
  } else {
    leverage = Math.max(1, Math.min(5, existing?.leverage ?? 2)) as 1 | 2 | 3 | 4 | 5;
  }

  // 5. Mental Load (1-5) & Dependency Pressure (1-5)
  const mentalLoad = existing?.mentalLoad ?? Math.min(5, Math.max(1, (item.requiredEnergy || 3) + (item.estimatedMinutes > 60 ? 1 : 0)));
  const dependencyPressure = existing?.dependencyPressure ?? (unblocksTriggers.some((t) => fullText.includes(t)) ? 4 : 2);

  // 6. Recommended Disposition
  let recommendedDisposition: "do" | "delegate" | "defer" | "eliminate" | "clarify" = existing?.recommendedDisposition ?? "do";
  const delegateRegex = /(delegir|prosledi|asistent|koleg|predaj|delegate|assign)/i;
  const eliminateRegex = /(suviš|nepotreb|elimini|obriš|zastarel|nije više aktueln)/i;

  if (delegateRegex.test(fullText)) {
    recommendedDisposition = "delegate";
  } else if (eliminateRegex.test(fullText) || (consequence === 1 && goalContribution === 1 && leverage === 1)) {
    recommendedDisposition = "eliminate";
  } else if (consequence <= 2 && urgency <= 2 && leverage <= 2) {
    recommendedDisposition = "defer";
  }

  // 7. Confidence
  const confidence: "low" | "medium" | "high" = existing?.confidence ?? (consequence >= 4 || goalContribution >= 4 ? "high" : "medium");

  // 8. Concise Explanation
  let conciseExplanation = existing?.conciseExplanation;
  if (!conciseExplanation) {
    if (consequence >= 4 && leverage >= 4) {
      conciseExplanation = context?.language === "sr"
        ? "Visok prioritet: sprečava ozbiljne posledice i otključava važan napredak."
        : "High priority: prevents serious consequences and unlocks key progress.";
    } else if (recommendedDisposition === "delegate") {
      conciseExplanation = context?.language === "sr"
        ? "Predlog za delegiranje: zadatak je pogodan za prenos saradniku."
        : "Proposed for delegation: suitable for handoff to a collaborator.";
    } else if (recommendedDisposition === "eliminate") {
      conciseExplanation = context?.language === "sr"
        ? "Predlog za uklanjanje: nizak doprinos ciljevima bez neposrednih posledica."
        : "Proposed for removal: low goal contribution with no immediate consequences.";
    } else if (leverage >= 4) {
      conciseExplanation = context?.language === "sr"
        ? "Visoka poluga: donosi nesrazmeran napredak prema ključnom ishodu."
        : "High leverage: delivers disproportionate progress toward key outcomes.";
    } else {
      conciseExplanation = context?.language === "sr"
        ? "Umeren prioritet: stabilan zadatak bez kritičnog pritiska roka."
        : "Moderate priority: steady progress without critical deadline pressure.";
    }
  }

  return {
    consequence: Math.max(1, Math.min(5, consequence)) as 1 | 2 | 3 | 4 | 5,
    urgency: Math.max(1, Math.min(5, urgency)) as 1 | 2 | 3 | 4 | 5,
    goalContribution: Math.max(1, Math.min(5, goalContribution)) as 1 | 2 | 3 | 4 | 5,
    leverage: Math.max(1, Math.min(5, leverage)) as 1 | 2 | 3 | 4 | 5,
    mentalLoad: Math.max(1, Math.min(5, mentalLoad)) as 1 | 2 | 3 | 4 | 5,
    dependencyPressure: Math.max(1, Math.min(5, dependencyPressure)) as 1 | 2 | 3 | 4 | 5,
    confidence,
    recommendedDisposition,
    conciseExplanation,
    evidenceFromInput: existing?.evidenceFromInput || item.title,
    explanation: conciseExplanation,
  };
}

/**
 * Re-evaluates priorities using a structured AI decision process.
 * Locks fixed commitments and completed items, evaluates flexible unfinished items,
 * and produces a preview proposal and diff without mutating active draft.
 */
export function reevaluatePrioritiesStructured(
  draft: DailyPlanDraft,
  context?: ReevaluationOptions
): StructuredReevaluationProposal {
  const completedSet = new Set(context?.completedItemIds || []);
  const lockedItemIds: string[] = [];

  const allCurrentItems = [
    ...draft.firstFocus,
    ...draft.laterToday,
    ...draft.ifCapacityRemains,
  ];

  for (const item of allCurrentItems) {
    if (item.capacityType === "fixed" || completedSet.has(item.id)) {
      lockedItemIds.push(item.id);
    }
  }

  // Flexible unfinished items to be re-evaluated
  const flexibleUnfinishedItems = allCurrentItems.filter(
    (item) => item.capacityType !== "fixed" && !completedSet.has(item.id)
  );

  const evaluatedItems = flexibleUnfinishedItems.map((item) => {
    const priority = evaluateItemPriorityStructured(item, context);
    return {
      ...item,
      priority,
    };
  });

  const energy = context?.energy ?? 3;
  const rankScore = (i: typeof evaluatedItems[0]) => {
    const p = i.priority;
    const isCriticalHighLeverage = (p.consequence >= 4 && p.leverage >= 4) ? 1000 : 0;
    const isA = (p.consequence >= 4) ? 500 : (p.consequence === 3 ? 200 : 50);
    const lev = p.leverage * 40;
    const goal = p.goalContribution * 30;
    const urg = p.urgency * 20;
    // Low energy adapts cognitive load: smaller mentalLoad gets a gentle bump
    const energyBonus = energy <= 2 ? (5 - p.mentalLoad) * 15 : 0;
    return isCriticalHighLeverage + isA + lev + goal + urg + energyBonus;
  };

  const sortedCandidates = [...evaluatedItems].sort((a, b) => rankScore(b) - rankScore(a));

  const isWaitingWithoutAction = (item: typeof evaluatedItems[0]) => {
    const text = `${(item as any).title} ${item.description || ""}`.toLowerCase();
    const isWaiting = text.includes("čekam") || text.includes("waiting");
    const hasActiveStep = text.includes("pozovi") || text.includes("pošalji") || text.includes("call") || text.includes("send") || text.includes("kontaktiraj");
    return isWaiting && !hasActiveStep;
  };

  const firstFocusCandidates: typeof evaluatedItems = [];
  const remainingCandidates: typeof evaluatedItems = [];

  for (const item of sortedCandidates) {
    if (
      firstFocusCandidates.length < 3 &&
      item.priority.recommendedDisposition !== "eliminate" &&
      !isWaitingWithoutAction(item)
    ) {
      firstFocusCandidates.push({
        ...item,
        block: "first_focus",
      });
    } else {
      remainingCandidates.push(item);
    }
  }

  const availableMinutes = context?.availableMinutes ?? draft.availableMinutes;
  let allocatedMinutes = firstFocusCandidates.reduce((acc, i) => acc + (i.estimatedMinutes || 0), 0);

  const laterTodayCandidates: typeof evaluatedItems = [];
  const ifCapacityCandidates: typeof evaluatedItems = [];

  for (const item of remainingCandidates) {
    const itemMinutes = item.estimatedMinutes || 0;
    const fitsInAvailable = availableMinutes == null || (allocatedMinutes + itemMinutes <= availableMinutes);

    if (fitsInAvailable && item.priority.recommendedDisposition !== "eliminate" && item.priority.recommendedDisposition !== "defer") {
      laterTodayCandidates.push({
        ...item,
        block: "later_today",
      });
      allocatedMinutes += itemMinutes;
    } else {
      ifCapacityCandidates.push({
        ...item,
        block: "if_capacity_remains",
      });
    }
  }

  // Assemble proposed blocks while strictly preserving locked items
  const finalFirstFocus: DailyPlanItem[] = [...firstFocusCandidates];
  const finalLaterToday: DailyPlanItem[] = [];
  const finalIfCapacity: DailyPlanItem[] = [];

  for (const item of allCurrentItems) {
    if (lockedItemIds.includes(item.id)) {
      if (item.capacityType === "fixed") {
        // Fixed commitments must NOT be in firstFocus
        finalLaterToday.push({
          ...item,
          block: "later_today",
        });
      } else if (item.block === "first_focus") {
        finalFirstFocus.push(item);
      } else if (item.block === "later_today") {
        finalLaterToday.push(item);
      } else {
        finalIfCapacity.push(item);
      }
    }
  }

  // Ensure First Focus never exceeds 3 items
  while (finalFirstFocus.length > 3) {
    const candidateIdx = finalFirstFocus.findIndex((i) => !lockedItemIds.includes(i.id));
    if (candidateIdx >= 0) {
      const removed = finalFirstFocus.splice(candidateIdx, 1)[0];
      finalLaterToday.push({ ...removed, block: "later_today" });
    } else {
      break;
    }
  }

  finalLaterToday.push(...laterTodayCandidates);
  finalIfCapacity.push(...ifCapacityCandidates);

  const proposedDraft = recalculatePlanTotals({
    ...draft,
    firstFocus: finalFirstFocus,
    laterToday: finalLaterToday,
    ifCapacityRemains: finalIfCapacity,
    manualPriorityOverride: false,
  });

  const originalFfIds = new Set(draft.firstFocus.map((i) => i.id));
  const originalLtIds = new Set(draft.laterToday.map((i) => i.id));

  const firstFocusEntries: Array<{ id: string; title: string; reason: string }> = [];
  const movedToLaterToday: Array<{ id: string; title: string }> = [];
  const movedToIfCapacity: Array<{ id: string; title: string }> = [];
  const proposedDelegations: Array<{ id: string; title: string; explanation: string }> = [];
  const proposedEliminations: Array<{ id: string; title: string; explanation: string }> = [];

  for (const item of proposedDraft.firstFocus) {
    if (!originalFfIds.has(item.id)) {
      firstFocusEntries.push({
        id: item.id,
        title: item.title,
        reason: item.priority?.conciseExplanation || item.priority?.explanation || "",
      });
    }
  }

  for (const item of proposedDraft.laterToday) {
    if (originalFfIds.has(item.id)) {
      movedToLaterToday.push({ id: item.id, title: item.title });
    }
  }

  for (const item of proposedDraft.ifCapacityRemains) {
    if (originalFfIds.has(item.id) || originalLtIds.has(item.id)) {
      movedToIfCapacity.push({ id: item.id, title: item.title });
    }
  }

  for (const item of evaluatedItems) {
    if (item.priority.recommendedDisposition === "delegate") {
      proposedDelegations.push({
        id: item.id,
        title: item.title,
        explanation: item.priority.conciseExplanation || item.priority.explanation,
      });
    } else if (item.priority.recommendedDisposition === "eliminate") {
      proposedEliminations.push({
        id: item.id,
        title: item.title,
        explanation: item.priority.conciseExplanation || item.priority.explanation,
      });
    }
  }

  const isSr = context?.language === "sr";
  const summary = isSr
    ? `Predlog rasporeda: ${proposedDraft.firstFocus.length} u Prvom fokusu, ${proposedDraft.laterToday.length} u Nastavku dana, ${proposedDraft.ifCapacityRemains.length} opciono.`
    : `Proposed schedule: ${proposedDraft.firstFocus.length} in First Focus, ${proposedDraft.laterToday.length} in Later Today, ${proposedDraft.ifCapacityRemains.length} optional.`;

  return {
    proposedDraft,
    diff: {
      firstFocusEntries,
      movedToLaterToday,
      movedToIfCapacity,
      proposedDelegations,
      proposedEliminations,
      summary,
    },
    lockedItemIds,
  };
}

export function reevaluatePrioritiesLocal(
  draft: DailyPlanDraft,
  context?: ReevaluationOptions
): DailyPlanDraft {
  const proposal = reevaluatePrioritiesStructured(draft, context);
  return {
    ...proposal.proposedDraft,
    manualPriorityOverride: false,
  };
}

export function applyReevaluationProposal(
  currentDraft: DailyPlanDraft,
  proposal: StructuredReevaluationProposal,
  modifications?: {
    approvedDelegationIds?: string[];
    approvedEliminationIds?: string[];
    approvedManualOverrideIds?: string[];
  }
): DailyPlanDraft {
  let draft = proposal.proposedDraft;

  // Restore rejected manual overrides
  if (proposal.diff.manualOverrideConflicts && proposal.diff.manualOverrideConflicts.length > 0) {
    const approvedOverrides = new Set(modifications?.approvedManualOverrideIds || []);
    const itemsToRestore = new Map<string, any>();
    
    for (const conflict of proposal.diff.manualOverrideConflicts) {
      if (!approvedOverrides.has(conflict.id)) {
        // Find it in the original draft
        const originalItem = [...currentDraft.firstFocus, ...currentDraft.laterToday, ...currentDraft.ifCapacityRemains, ...(currentDraft.deferredItems || [])].find(i => i.id === conflict.id);
        if (originalItem) {
          itemsToRestore.set(conflict.id, originalItem);
        }
      }
    }

    if (itemsToRestore.size > 0) {
      const filterOutRestored = (items: DailyPlanItem[]) => items.filter(i => !itemsToRestore.has(i.id));
      
      const firstFocus = filterOutRestored(draft.firstFocus);
      const laterToday = filterOutRestored(draft.laterToday);
      const ifCapacityRemains = filterOutRestored(draft.ifCapacityRemains);
      const deferredItems = (draft.deferredItems || []).filter(i => !itemsToRestore.has(i.id));

      for (const item of itemsToRestore.values()) {
        if (item.block === "first_focus") firstFocus.push(item);
        else if (item.block === "later_today") laterToday.push(item);
        else if (item.block === "if_capacity_remains") ifCapacityRemains.push(item);
        else if (item.block === "deferred") deferredItems.push(item as any);
      }
      
      draft = {
        ...draft,
        firstFocus,
        laterToday,
        ifCapacityRemains,
        deferredItems
      };
    }
  }

  if (modifications?.approvedEliminationIds && modifications.approvedEliminationIds.length > 0) {
    const elimSet = new Set(modifications.approvedEliminationIds);
    const toEliminate: DailyPlanItem[] = [];
    const filterOut = (items: DailyPlanItem[]) =>
      items.filter((i) => {
        if (elimSet.has(i.id)) {
          toEliminate.push(i);
          return false;
        }
        return true;
      });

    const firstFocus = filterOut(draft.firstFocus);
    const laterToday = filterOut(draft.laterToday);
    const ifCapacityRemains = filterOut(draft.ifCapacityRemains);
    const deferredItems = (draft.deferredItems || []).filter(i => !elimSet.has(i.id));

    const newNonAction: any[] = toEliminate.map((item) => ({
      id: item.id,
      originalText: item.title,
      kind: "task",
      timeHorizon: "no_action",
      suggestedAction: item.title,
      estimatedMinutes: item.estimatedMinutes,
      requiredEnergy: item.requiredEnergy,
      timeSensitivity: item.timeSensitivity,
      deadlineText: item.deadlineText,
      deadlineIso: item.deadlineIso,
      isAmbiguous: false,
      needsCheck: false,
      priority: item.priority,
    }));

    draft = {
      ...draft,
      firstFocus,
      laterToday,
      ifCapacityRemains,
      deferredItems,
      nonActionItems: [...(draft.nonActionItems || []), ...newNonAction],
    };
  }

  
    const newDraft = recalculatePlanTotals({
      ...draft,
      manualPriorityOverride: false,
    });

    const firstFocusFlexibleCount = newDraft.firstFocus.filter(i => i.capacityType !== "fixed").length;
    if (firstFocusFlexibleCount > 3) {
      return { error: "First Focus ne može imati više od 3 fleksibilna zadatka nakon parcijalnog izbora." } as any;
    }
    
    // Check dependency violations
    const blockRank: Record<string, number> = {
      first_focus: 0,
      later_today: 1,
      if_capacity_remains: 2,
      deferred: 3,
    };
    const itemBlockAndIndex = new Map<string, { block: string; rank: number; index: number }>();
    newDraft.firstFocus.forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "first_focus", rank: 0, index: idx }));
    newDraft.laterToday.forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "later_today", rank: 1, index: idx }));
    newDraft.ifCapacityRemains.forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "if_capacity_remains", rank: 2, index: idx }));
    (newDraft.deferredItems || []).forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "deferred", rank: 3, index: idx }));

    for (const block of [newDraft.firstFocus, newDraft.laterToday, newDraft.ifCapacityRemains, newDraft.deferredItems || []]) {
      for (const item of block) {
        if ("dependsOnItemIds" in item && item.dependsOnItemIds && (item.dependsOnItemIds as any).length > 0) {
          const posA = itemBlockAndIndex.get(item.id);
          if (!posA) continue;
          for (const depId of item.dependsOnItemIds as any) {
            const posB = itemBlockAndIndex.get(depId);
            if (posB) {
              if (posA.rank < posB.rank || (posA.rank === posB.rank && posA.index <= posB.index)) {
                return { error: `Zavisnost prekršena: "${(item as any).title}" mora biti nakon svog preduslova.` } as any;
              }
            }
          }
        }
      }
    }
    
    return newDraft;
  }


