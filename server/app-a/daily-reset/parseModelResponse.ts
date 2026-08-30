import {
  IdFactory,
  ClarificationNeededResponse,
  PlanReadyResponse,
  DailyResetErrorResponse,
  validateClarificationResponse,
  validatePlanDraft,
  recalculatePlanTotals,
  ClarificationQuestion,
  DailyPlanDraft,
  ClassifiedBrainDumpItem,
  DailyPlanItem,
  SafeIntervention,
  PriorityFactors,
  GoalRelationship,
  BrainDumpItemKind,
  TimeHorizon,
  TimeSensitivity,
  PlanBlock,
  RequiredEnergy
} from "../../../src/app-a/domain/daily-reset";
import { ModelResponseShape } from "./modelSchema";

function isPopulatedDraft(draft: any): boolean {
  if (!draft || typeof draft !== "object") return false;
  const hasItems = (arr: any) => Array.isArray(arr) && arr.length > 0;
  return Boolean(
    hasItems(draft.classifiedItems) ||
    hasItems(draft.firstFocus) ||
    hasItems(draft.laterToday) ||
    hasItems(draft.ifCapacityRemains) ||
    hasItems(draft.deferredItems) ||
    hasItems(draft.longTermIdeas) ||
    hasItems(draft.nonActionItems) ||
    (typeof draft.planRationale === "string" && draft.planRationale.trim().length > 0) ||
    (draft.intervention && typeof draft.intervention === "object" && typeof draft.intervention.title === "string" && draft.intervention.title.trim().length > 0)
  );
}

function parsePriority(priority: any): PriorityFactors {
  if (!priority || typeof priority !== "object") {
    return { explanation: "" };
  }
  return {
    consequence: priority.consequence !== undefined ? Number(priority.consequence) as any : undefined,
    urgency: priority.urgency !== undefined ? Number(priority.urgency) as any : undefined,
    goalContribution: priority.goalContribution !== undefined ? Number(priority.goalContribution) as any : undefined,
    mentalLoad: priority.mentalLoad !== undefined ? Number(priority.mentalLoad) as any : undefined,
    dependencyPressure: priority.dependencyPressure !== undefined ? Number(priority.dependencyPressure) as any : undefined,
    explanation: String(priority.explanation || "")
  };
}

function parseGoalRelationship(rel: any): GoalRelationship | undefined {
  if (!rel || typeof rel !== "object") return undefined;
  return {
    goalId: rel.goalId !== undefined ? String(rel.goalId) : undefined,
    goalTitle: rel.goalTitle !== undefined ? String(rel.goalTitle) : undefined,
    projectId: rel.projectId !== undefined ? String(rel.projectId) : undefined,
    projectTitle: rel.projectTitle !== undefined ? String(rel.projectTitle) : undefined,
    relationshipExplanation: rel.relationshipExplanation !== undefined ? String(rel.relationshipExplanation) : undefined,
  };
}

function validateSourceItemIndex(
  rawIndex: unknown,
  classifiedLength: number,
  contextName: string
): number {
  if (rawIndex === undefined || rawIndex === null) {
    throw new Error(`missing_source_index in ${contextName}`);
  }
  if (typeof rawIndex !== "number" || !Number.isInteger(rawIndex)) {
    throw new Error(`invalid_source_index in ${contextName}`);
  }
  if (rawIndex < 0 || rawIndex >= classifiedLength) {
    throw new Error(`source_index_out_of_range in ${contextName}`);
  }
  return rawIndex;
}

export function parseModelResponse(
  rawResponse: unknown,
  idFactory: IdFactory,
  isClarificationPhase: boolean,
  knownQuestionIds?: string[],
  onRejection?: (reason: string) => void
): ClarificationNeededResponse | PlanReadyResponse | DailyResetErrorResponse {
  const logSanitizedRejection = (reason: string) => {
    if (onRejection) {
      onRejection(reason);
    }
  };

  if (!rawResponse || typeof rawResponse !== "object") {
    logSanitizedRejection("invalid_object");
    return createError("invalid_ai_response", "Response is not a valid object.", true);
  }

  const modelResp = rawResponse as Partial<ModelResponseShape>;

  if (modelResp.phase !== "clarification_needed" && modelResp.phase !== "plan_ready") {
    logSanitizedRejection("unknown_phase");
    return createError("invalid_ai_response", "Unknown or missing phase.", true);
  }

  if (modelResp.phase === "clarification_needed") {
    if (isClarificationPhase) {
      logSanitizedRejection("clarification_in_resolve_phase");
      return createError("invalid_ai_response", "Model returned clarification questions during the clarification phase.", false);
    }
    if (isPopulatedDraft(modelResp.draft)) {
      logSanitizedRejection("provisional_draft_with_clarification");
      return createError("invalid_ai_response", "Model returned a provisional draft with clarification questions.", false);
    }
    if (!modelResp.questions || !Array.isArray(modelResp.questions) || modelResp.questions.length === 0) {
      logSanitizedRejection("missing_questions");
      return createError("invalid_ai_response", "Missing questions array in clarification phase.", true);
    }
    if (modelResp.questions.length > 3) {
      logSanitizedRejection("too_many_questions");
      return createError("invalid_ai_response", "Model returned more than three clarification questions.", false);
    }

    const idMap = new Map<string, string>();
    const newQuestions: ClarificationQuestion[] = [];

    for (const q of modelResp.questions) {
      if (!q.id || !String(q.id).trim()) {
        logSanitizedRejection("missing_question_id");
        return createError("invalid_ai_response", "Question missing temporary ID.", true);
      }
      if (idMap.has(q.id)) {
        logSanitizedRejection("duplicate_question_id");
        return createError("invalid_ai_response", `Duplicate temporary question ID: ${q.id}`, false);
      }
      const newId = idFactory();
      idMap.set(q.id, newId);

      const validMaterialImpacts = ["priority", "deadline", "duration", "classification", "goal_relationship", "other"];
      const materialImpact = validMaterialImpacts.includes(q.materialImpact as string)
        ? q.materialImpact as any
        : "other";

      // Defensively normalize relatedItemIds to [] during clarification
      newQuestions.push({
        id: newId,
        question: String(q.question || ""),
        context: String(q.context || ""),
        relatedItemIds: [],
        materialImpact
      });
    }

    const clarificationResponse: ClarificationNeededResponse = {
      success: true,
      phase: "clarification_needed",
      questions: newQuestions,
    };

    const validation = validateClarificationResponse(clarificationResponse);
    if (!validation.valid) {
      logSanitizedRejection("invalid_clarification_validation");
      return createError("invalid_ai_response", `Invalid clarification response: ${validation.errors.join("; ")}`, false);
    }

    return clarificationResponse;
  } else {
    // plan_ready
    if (Array.isArray(modelResp.questions) && modelResp.questions.length > 0) {
      logSanitizedRejection("non_empty_questions_in_plan_ready");
      return createError("invalid_ai_response", "Model returned clarification questions in the plan_ready phase.", false);
    }
    if (!modelResp.draft || typeof modelResp.draft !== "object") {
      logSanitizedRejection("missing_draft");
      return createError("invalid_ai_response", "Missing draft in plan_ready phase.", true);
    }

    const draft = modelResp.draft;

    try {
      if (!draft.classifiedItems || !Array.isArray(draft.classifiedItems)) {
        throw new Error("missing_classified_items");
      }

      const canonicalClassifiedIds: string[] = [];
      const classifiedItems: ClassifiedBrainDumpItem[] = [];

      for (let i = 0; i < draft.classifiedItems.length; i++) {
        const item = draft.classifiedItems[i];
        if (!item || typeof item !== "object") {
          throw new Error("invalid_classified_item");
        }

        const validKinds = ["task", "idea", "worry", "fact", "waiting_for"];
        const validHorizons = ["today", "this_week", "later", "long_term_idea", "no_action"];
        const validSensitivities = ["none", "soft", "deadline", "urgent"];

        if (!validKinds.includes(item.kind)) throw new Error(`Invalid kind: ${item.kind}`);
        if (!validHorizons.includes(item.timeHorizon)) throw new Error(`Invalid timeHorizon: ${item.timeHorizon}`);
        if (!validSensitivities.includes(item.timeSensitivity)) throw new Error(`Invalid timeSensitivity: ${item.timeSensitivity}`);

        if (item.relatedQuestionId !== undefined && item.relatedQuestionId !== null && String(item.relatedQuestionId).trim() !== "") {
          const rqId = String(item.relatedQuestionId);
          if (knownQuestionIds && !knownQuestionIds.includes(rqId)) {
            throw new Error(`Unresolved question reference: ${rqId}`);
          }
        }

        // Deterministic unique canonical ID generated server-side for this classified index
        const newId = idFactory();
        canonicalClassifiedIds.push(newId);

        classifiedItems.push({
          id: newId,
          originalText: String(item.originalText || ""),
          kind: item.kind as BrainDumpItemKind,
          timeHorizon: item.timeHorizon as TimeHorizon,
          suggestedAction: item.suggestedAction !== undefined ? String(item.suggestedAction) : undefined,
          estimatedMinutes: item.estimatedMinutes !== undefined ? Number(item.estimatedMinutes) : undefined,
          requiredEnergy: item.requiredEnergy !== undefined ? Number(item.requiredEnergy) as RequiredEnergy : undefined,
          timeSensitivity: item.timeSensitivity as TimeSensitivity,
          deadlineText: item.deadlineText !== undefined ? String(item.deadlineText) : undefined,
          deadlineIso: item.deadlineIso !== undefined ? String(item.deadlineIso) : undefined,
          isAmbiguous: Boolean(item.isAmbiguous),
          needsCheck: Boolean(item.needsCheck),
          relatedQuestionId: item.relatedQuestionId !== undefined && item.relatedQuestionId !== null && String(item.relatedQuestionId).trim() !== "" ? String(item.relatedQuestionId) : undefined,
          priority: parsePriority(item.priority),
          goalRelationship: parseGoalRelationship(item.goalRelationship)
        });
      }

      const processSubsetItems = (
        items: any[] | undefined,
        subsetName: string,
        expectedHorizons: string[]
      ): ClassifiedBrainDumpItem[] => {
        if (!items || !Array.isArray(items)) return [];
        return items.map(item => {
          if (!item || typeof item !== "object") {
            throw new Error(`invalid_subset_item in ${subsetName}`);
          }
          const idx = validateSourceItemIndex(item.sourceItemIndex, classifiedItems.length, subsetName);
          const baseClassified = classifiedItems[idx];
          if (!expectedHorizons.includes(baseClassified.timeHorizon)) {
            throw new Error(`invalid_subset_horizon in ${subsetName}`);
          }

          const validKinds = ["task", "idea", "worry", "fact", "waiting_for"];
          const validSensitivities = ["none", "soft", "deadline", "urgent"];
          const kind = item.kind ? String(item.kind) : baseClassified.kind;
          const timeSensitivity = item.timeSensitivity ? String(item.timeSensitivity) : baseClassified.timeSensitivity;

          if (!validKinds.includes(kind)) throw new Error(`Invalid kind: ${kind}`);
          if (!validSensitivities.includes(timeSensitivity)) throw new Error(`Invalid timeSensitivity: ${timeSensitivity}`);

          return {
            id: canonicalClassifiedIds[idx],
            originalText: item.originalText !== undefined ? String(item.originalText) : baseClassified.originalText,
            kind: kind as BrainDumpItemKind,
            timeHorizon: baseClassified.timeHorizon,
            suggestedAction: item.suggestedAction !== undefined ? String(item.suggestedAction) : baseClassified.suggestedAction,
            estimatedMinutes: item.estimatedMinutes !== undefined ? Number(item.estimatedMinutes) : baseClassified.estimatedMinutes,
            requiredEnergy: item.requiredEnergy !== undefined ? Number(item.requiredEnergy) as RequiredEnergy : baseClassified.requiredEnergy,
            timeSensitivity: timeSensitivity as TimeSensitivity,
            deadlineText: item.deadlineText !== undefined ? String(item.deadlineText) : baseClassified.deadlineText,
            deadlineIso: item.deadlineIso !== undefined ? String(item.deadlineIso) : baseClassified.deadlineIso,
            isAmbiguous: item.isAmbiguous !== undefined ? Boolean(item.isAmbiguous) : baseClassified.isAmbiguous,
            needsCheck: item.needsCheck !== undefined ? Boolean(item.needsCheck) : baseClassified.needsCheck,
            relatedQuestionId: item.relatedQuestionId !== undefined && String(item.relatedQuestionId).trim() !== "" ? String(item.relatedQuestionId) : baseClassified.relatedQuestionId,
            priority: item.priority ? parsePriority(item.priority) : baseClassified.priority,
            goalRelationship: item.goalRelationship ? parseGoalRelationship(item.goalRelationship) : baseClassified.goalRelationship
          };
        });
      };

      const deferredItems = processSubsetItems(draft.deferredItems, "Deferred", ["this_week", "later"]);
      const longTermIdeas = processSubsetItems(draft.longTermIdeas, "Long-term idea", ["long_term_idea"]);
      const nonActionItems = processSubsetItems(draft.nonActionItems, "Non-action", ["no_action"]);

      const processPlanItems = (items: any[] | undefined, expectedBlock: PlanBlock): DailyPlanItem[] => {
        if (!items || !Array.isArray(items)) return [];
        return items.map(item => {
          if (!item || typeof item !== "object") {
            throw new Error(`invalid_plan_item in ${expectedBlock}`);
          }
          if (item.block !== expectedBlock) {
            throw new Error(`Invalid block: ${item.block}, expected ${expectedBlock}`);
          }

          let mappedSourceIds: string[];
          if (Array.isArray(item.sourceItemIndexes)) {
            if (item.sourceItemIndexes.length === 0) {
              throw new Error(`missing_source_index in ${expectedBlock}`);
            }
            mappedSourceIds = item.sourceItemIndexes.map((idx: any) => {
              const validIdx = validateSourceItemIndex(idx, classifiedItems.length, expectedBlock);
              return canonicalClassifiedIds[validIdx];
            });
          } else {
            const validIdx = validateSourceItemIndex(item.sourceItemIndex, classifiedItems.length, expectedBlock);
            mappedSourceIds = [canonicalClassifiedIds[validIdx]];
          }

          const validSensitivities = ["none", "soft", "deadline", "urgent"];
          if (!validSensitivities.includes(item.timeSensitivity)) {
            throw new Error(`Invalid timeSensitivity: ${item.timeSensitivity}`);
          }

          const planItemId = idFactory();

          const result: DailyPlanItem = {
            id: planItemId,
            sourceItemIds: mappedSourceIds,
            title: String(item.title || ""),
            description: item.description !== undefined ? String(item.description) : undefined,
            block: expectedBlock,
            estimatedMinutes: Number(item.estimatedMinutes || 0),
            requiredEnergy: Number(item.requiredEnergy || 1) as RequiredEnergy,
            timeSensitivity: item.timeSensitivity as TimeSensitivity,
            deadlineText: item.deadlineText !== undefined ? String(item.deadlineText) : undefined,
            deadlineIso: item.deadlineIso !== undefined ? String(item.deadlineIso) : undefined,
            priority: parsePriority(item.priority),
            goalRelationship: parseGoalRelationship(item.goalRelationship),
            reasoning: item.reasoning !== undefined ? String(item.reasoning) : undefined,
            needsCheck: Boolean(item.needsCheck)
          };
          return result;
        });
      };

      const firstFocus = processPlanItems(draft.firstFocus, "first_focus");
      if (firstFocus.length > 3) {
        throw new Error("Four or more First-focus items provided.");
      }
      
      const laterToday = processPlanItems(draft.laterToday, "later_today");
      const ifCapacityRemains = processPlanItems(draft.ifCapacityRemains, "if_capacity_remains");

      let intervention: SafeIntervention | undefined = undefined;
      if (draft.intervention && typeof draft.intervention === "object" && draft.intervention.type) {
        const validTypes = ["environment", "movement", "breathing", "rest", "hydration", "light", "focus"];
        if (!validTypes.includes(draft.intervention.type)) {
          throw new Error(`Invalid intervention type: ${draft.intervention.type}`);
        }
        intervention = {
          type: draft.intervention.type as any,
          title: String(draft.intervention.title || ""),
          description: String(draft.intervention.description || ""),
          estimatedMinutes: Number(draft.intervention.estimatedMinutes || 0),
          reason: String(draft.intervention.reason || "")
        };
      }

      let planDraft: DailyPlanDraft = {
        classifiedItems,
        firstFocus,
        laterToday,
        ifCapacityRemains,
        deferredItems,
        longTermIdeas,
        nonActionItems,
        planRationale: String(draft.planRationale || ""),
        intervention,
        plannedRequiredMinutes: 0,
        plannedOptionalMinutes: 0,
        availableMinutes: draft.availableMinutes !== undefined ? Number(draft.availableMinutes) : undefined
      };

      planDraft = recalculatePlanTotals(planDraft);

      const validation = validatePlanDraft(planDraft, knownQuestionIds ? knownQuestionIds.map(id => ({ id, question: "", context: "", relatedItemIds: [], materialImpact: "other" as const })) : undefined);
      if (!validation.valid) {
        throw new Error(`Invalid plan draft: ${validation.errors.join("; ")}`);
      }

      return {
        success: true,
        phase: "plan_ready",
        draft: planDraft
      };
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.includes("missing_source_index")) {
        logSanitizedRejection("missing_source_index");
      } else if (msg.includes("invalid_source_index")) {
        logSanitizedRejection("invalid_source_index");
      } else if (msg.includes("source_index_out_of_range")) {
        logSanitizedRejection("source_index_out_of_range");
      } else if (msg.includes("invalid_subset_horizon")) {
        logSanitizedRejection("invalid_subset_horizon");
      } else if (msg.includes("Unresolved question reference")) {
        logSanitizedRejection("unresolved_question_reference");
      } else if (msg.includes("Four or more First-focus") || msg.includes("first_focus_cap_exceeded")) {
        logSanitizedRejection("first_focus_cap_exceeded");
      } else if (msg.includes("Invalid kind") || msg.includes("Invalid timeHorizon") || msg.includes("Invalid timeSensitivity") || msg.includes("Invalid block") || msg.includes("Invalid intervention type")) {
        logSanitizedRejection("invalid_enum");
      } else if (msg.includes("exceeds available capacity")) {
        logSanitizedRejection("capacity_overflow");
      } else {
        logSanitizedRejection("invalid_plan_validation");
      }
      return createError("invalid_ai_response", "Invalid AI response structure.", false);
    }
  }
}

function createError(code: "invalid_ai_response", error: string, retryable: boolean): DailyResetErrorResponse {
  return {
    success: false,
    phase: "error",
    code,
    error,
    retryable,
  };
}
