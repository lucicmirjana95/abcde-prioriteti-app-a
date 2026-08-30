import {
  DailyPlanDraft,
  DailyPlanItem,
  ClassifiedBrainDumpItem,
  PlanBlock,
  TimeHorizon,
} from "../domain/daily-reset/contracts";

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
export function recalculatePlanTotals(draft: DailyPlanDraft): DailyPlanDraft {
  const plannedRequiredMinutes =
    draft.firstFocus.reduce((sum, i) => sum + (i.estimatedMinutes || 0), 0) +
    draft.laterToday.reduce((sum, i) => sum + (i.estimatedMinutes || 0), 0);

  const plannedOptionalMinutes = draft.ifCapacityRemains.reduce(
    (sum, i) => sum + (i.estimatedMinutes || 0),
    0
  );

  return {
    ...draft,
    plannedRequiredMinutes,
    plannedOptionalMinutes,
  };
}

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
  if (targetBlock === "first_focus" && draft.firstFocus.length >= 3) {
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
