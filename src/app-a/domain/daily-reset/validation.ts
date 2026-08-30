import {
  DailyResetInput,
  DailyResetClarificationSubmission,
  ClarificationQuestion,
  ClarificationNeededResponse,
  DailyPlanDraft,
  ClassifiedBrainDumpItem,
} from "./contracts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors?: Record<string, string>;
}

export function normalizeDailyResetInput(input: DailyResetInput): DailyResetInput {
  const normalized: DailyResetInput = {
    brainDump: input.brainDump.trim(),
    language: input.language,
  };

  if (input.energy !== undefined) normalized.energy = input.energy;
  if (input.pleasantness !== undefined) normalized.pleasantness = input.pleasantness;
  if (input.availableMinutes !== undefined) normalized.availableMinutes = input.availableMinutes;
  
  if (input.stateNote !== undefined) {
    const trimmedNote = input.stateNote.trim();
    if (trimmedNote.length > 0) {
      normalized.stateNote = trimmedNote;
    }
  }

  return normalized;
}

export function validateDailyResetInput(input: DailyResetInput): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  if (!input.brainDump || input.brainDump.trim().length < 3) {
    errors.push("Brain dump must be at least 3 characters long.");
    fieldErrors.brainDump = "Too short";
  } else if (input.brainDump.length > 10000) {
    errors.push("Brain dump must not exceed 10,000 characters.");
    fieldErrors.brainDump = "Too long";
  }

  if (!["en", "sr", "tr"].includes(input.language)) {
    errors.push("Language must be one of: en, sr, tr.");
    fieldErrors.language = "Invalid language";
  }

  if (input.energy !== undefined) {
    if (!Number.isInteger(input.energy) || input.energy < 1 || input.energy > 5) {
      errors.push("Energy must be an integer from 1 to 5.");
      fieldErrors.energy = "Invalid value";
    }
  }

  if (input.pleasantness !== undefined) {
    if (!Number.isInteger(input.pleasantness) || input.pleasantness < 1 || input.pleasantness > 5) {
      errors.push("Pleasantness must be an integer from 1 to 5.");
      fieldErrors.pleasantness = "Invalid value";
    }
  }

  if (input.availableMinutes !== undefined) {
    if (!Number.isInteger(input.availableMinutes) || input.availableMinutes <= 0) {
      errors.push("Available minutes must be a positive integer.");
      fieldErrors.availableMinutes = "Must be positive";
    } else if (input.availableMinutes > 1440) {
      errors.push("Available minutes cannot exceed 1440.");
      fieldErrors.availableMinutes = "Exceeds maximum";
    }
  }

  if (input.stateNote !== undefined) {
    if (input.stateNote.length > 1000) {
      errors.push("State note must not exceed 1,000 characters.");
      fieldErrors.stateNote = "Too long";
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

export function validateClarificationSubmission(
  submission: DailyResetClarificationSubmission,
  knownQuestions: ClarificationQuestion[]
): ValidationResult {
  const inputValidation = validateDailyResetInput(submission);
  const errors = [...inputValidation.errors];
  const fieldErrors = { ...(inputValidation.fieldErrors || {}) };

  const answers = submission.clarificationAnswers;
  
  if (!answers || !Array.isArray(answers)) {
    errors.push("Clarification answers must be an array.");
    fieldErrors.clarificationAnswers = "Invalid format";
    return { valid: errors.length === 0, errors, fieldErrors };
  }

  if (answers.length > 3) {
    errors.push("Maximum three answers are allowed.");
    fieldErrors.clarificationAnswers = "Too many answers";
  }

  const answeredIds = new Set<string>();
  const knownIds = new Set(knownQuestions.map((q) => q.id));

  for (const answer of answers) {
    if (answeredIds.has(answer.questionId)) {
      errors.push(`Duplicate answer for question ID: ${answer.questionId}`);
    }
    answeredIds.add(answer.questionId);

    if (!knownIds.has(answer.questionId)) {
      errors.push(`Answer provided for unknown question ID: ${answer.questionId}`);
    }
    if (!answer.answer || answer.answer.trim().length === 0) {
      errors.push(`Answer for question ID ${answer.questionId} cannot be empty.`);
    }
  }

  for (const knownId of knownIds) {
    if (!answeredIds.has(knownId)) {
      errors.push(`Missing answer for question ID: ${knownId}`);
    }
  }

  if (errors.length > inputValidation.errors.length) {
    fieldErrors.clarificationAnswers = "Invalid answers";
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

export function validateClarificationResponse(response: ClarificationNeededResponse): ValidationResult {
  const errors: string[] = [];
  
  if (!response.questions || !Array.isArray(response.questions)) {
    errors.push("Questions must be an array.");
    return { valid: false, errors };
  }

  if (response.questions.length < 1 || response.questions.length > 3) {
    errors.push("Clarification response must contain between 1 and 3 questions.");
  }

  const seenIds = new Set<string>();

  for (const q of response.questions) {
    if (!q.id || q.id.trim() === "") {
      errors.push("Question ID must be non-empty.");
    } else {
      if (seenIds.has(q.id)) {
        errors.push(`Duplicate question ID: ${q.id}`);
      }
      seenIds.add(q.id);
    }

    if (!q.question || q.question.trim() === "") {
      errors.push(`Question text is empty for ID: ${q.id}`);
    }

    if (!q.context || q.context.trim() === "") {
      errors.push(`Question context is empty for ID: ${q.id}`);
    }

    if (q.relatedItemIds) {
      const seenRelated = new Set<string>();
      for (const rid of q.relatedItemIds) {
        if (seenRelated.has(rid)) {
          errors.push(`Duplicate related item ID ${rid} in question ${q.id}`);
        }
        seenRelated.add(rid);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function isValidEnergy(e: any): boolean {
  return Number.isInteger(e) && e >= 1 && e <= 5;
}

function isValidPriorityFactor(f: any): boolean {
  return f === undefined || (Number.isInteger(f) && f >= 1 && f <= 5);
}

export function validatePlanDraft(draft: DailyPlanDraft, knownQuestions?: ClarificationQuestion[]): ValidationResult {
  const errors: string[] = [];
  
  if (draft.firstFocus && draft.firstFocus.length > 3) {
    errors.push("Maximum three First-focus items allowed.");
  }

  const classifiedIds = new Set<string>();
  if (draft.classifiedItems) {
    for (const item of draft.classifiedItems) {
      if (!item.id || item.id.trim() === "") {
        errors.push("Classified item ID cannot be empty.");
      }
      if (classifiedIds.has(item.id)) {
        errors.push(`Duplicate classified item ID: ${item.id}`);
      }
      classifiedIds.add(item.id);

      if (item.relatedQuestionId && knownQuestions) {
        const knownQIds = new Set(knownQuestions.map((q) => q.id));
        if (!knownQIds.has(item.relatedQuestionId)) {
          errors.push(`Classified item ${item.id} references unknown question ID ${item.relatedQuestionId}`);
        }
      }

      if (item.requiredEnergy !== undefined && !isValidEnergy(item.requiredEnergy)) {
        errors.push(`Classified item ${item.id} has invalid energy requirement.`);
      }

      if (item.priority) {
        if (!isValidPriorityFactor(item.priority.consequence)) errors.push(`Classified item ${item.id} has invalid priority consequence.`);
        if (!isValidPriorityFactor(item.priority.urgency)) errors.push(`Classified item ${item.id} has invalid priority urgency.`);
        if (!isValidPriorityFactor(item.priority.goalContribution)) errors.push(`Classified item ${item.id} has invalid priority goalContribution.`);
        if (!isValidPriorityFactor(item.priority.mentalLoad)) errors.push(`Classified item ${item.id} has invalid priority mentalLoad.`);
        if (!isValidPriorityFactor(item.priority.dependencyPressure)) errors.push(`Classified item ${item.id} has invalid priority dependencyPressure.`);
      }
    }
  }

  const planItemIds = new Set<string>();
  
  const validateBlock = (items: any[], expectedBlock: string) => {
    if (!items) return;
    for (const item of items) {
      if (!item.id || item.id.trim() === "") {
        errors.push("Plan item ID cannot be empty.");
      }
      if (planItemIds.has(item.id)) {
        errors.push(`Duplicate plan item ID: ${item.id}`);
      }
      planItemIds.add(item.id);

      if (item.block !== expectedBlock) {
        errors.push(`Plan item ${item.id} is in wrong array. Expected ${expectedBlock}, got ${item.block}`);
      }

      if (item.sourceItemIds) {
        for (const sid of item.sourceItemIds) {
          if (!classifiedIds.has(sid)) {
            errors.push(`Plan item ${item.id} references unknown classified item ID ${sid}`);
          }
        }
      }

      if (!Number.isInteger(item.estimatedMinutes) || item.estimatedMinutes <= 0) {
        errors.push(`Plan item ${item.id} must have a positive integer estimated minutes.`);
      }

      if (!isValidEnergy(item.requiredEnergy)) {
        errors.push(`Plan item ${item.id} must have a valid required energy (1-5).`);
      }

      if (item.priority) {
        if (!isValidPriorityFactor(item.priority.consequence)) errors.push(`Plan item ${item.id} has invalid priority consequence.`);
        if (!isValidPriorityFactor(item.priority.urgency)) errors.push(`Plan item ${item.id} has invalid priority urgency.`);
        if (!isValidPriorityFactor(item.priority.goalContribution)) errors.push(`Plan item ${item.id} has invalid priority goalContribution.`);
        if (!isValidPriorityFactor(item.priority.mentalLoad)) errors.push(`Plan item ${item.id} has invalid priority mentalLoad.`);
        if (!isValidPriorityFactor(item.priority.dependencyPressure)) errors.push(`Plan item ${item.id} has invalid priority dependencyPressure.`);
      }

      if (item.needsCheck && !item.isAmbiguous && item.needsCheck === true) {
         // actually need to check ambiguity properly in plan draft, the item itself just has needsCheck.
         // Unresolved material ambiguity check:
      }
    }
  };

  validateBlock(draft.firstFocus, "first_focus");
  validateBlock(draft.laterToday, "later_today");
  validateBlock(draft.ifCapacityRemains, "if_capacity_remains");

  if (draft.intervention) {
    if (!Number.isInteger(draft.intervention.estimatedMinutes) || draft.intervention.estimatedMinutes <= 0) {
      errors.push("Intervention estimated minutes must be a positive integer.");
    }
  }

  const validateMatchingRef = (arr: ClassifiedBrainDumpItem[], name: string, validHorizons: string[]) => {
    if (!arr) return;
    for (const item of arr) {
      if (!classifiedIds.has(item.id)) {
        errors.push(`${name} item ${item.id} not found in classified items.`);
      }
      if (!validHorizons.includes(item.timeHorizon)) {
        errors.push(`${name} item ${item.id} has incorrect time horizon ${item.timeHorizon}. Expected one of: ${validHorizons.join(', ')}`);
      }
    }
  };

  validateMatchingRef(draft.deferredItems, "Deferred", ["this_week", "later"]);
  validateMatchingRef(draft.longTermIdeas, "Long-term idea", ["long_term_idea"]);
  validateMatchingRef(draft.nonActionItems, "Non-action", ["no_action"]);

  // Need to check for unresolved ambiguity. 
  // needsCheck === true for unresolved material ambiguity
  // If any classified item has needsCheck = true, and it's brought into the plan without user clarification, 
  // the plan item should also reflect this or the draft should indicate it.

  // Calculated minute totals
  const calcRequired = (draft.firstFocus || []).reduce((acc, it) => acc + it.estimatedMinutes, 0) +
                       (draft.laterToday || []).reduce((acc, it) => acc + it.estimatedMinutes, 0);
  const calcOptional = (draft.ifCapacityRemains || []).reduce((acc, it) => acc + it.estimatedMinutes, 0);

  if (draft.plannedRequiredMinutes !== calcRequired) {
    errors.push(`Incorrect plannedRequiredMinutes. Expected ${calcRequired}, got ${draft.plannedRequiredMinutes}`);
  }

  if (draft.plannedOptionalMinutes !== calcOptional) {
    errors.push(`Incorrect plannedOptionalMinutes. Expected ${calcOptional}, got ${draft.plannedOptionalMinutes}`);
  }

  // Capacity rule
  if (draft.availableMinutes !== undefined) {
    if (draft.plannedRequiredMinutes > draft.availableMinutes) {
      errors.push(`Planned required time (${draft.plannedRequiredMinutes}m) exceeds available capacity (${draft.availableMinutes}m).`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function recalculatePlanTotals(draft: DailyPlanDraft): DailyPlanDraft {
  const plannedRequiredMinutes = 
    (draft.firstFocus || []).reduce((acc, it) => acc + it.estimatedMinutes, 0) +
    (draft.laterToday || []).reduce((acc, it) => acc + it.estimatedMinutes, 0);
    
  const plannedOptionalMinutes = 
    (draft.ifCapacityRemains || []).reduce((acc, it) => acc + it.estimatedMinutes, 0);

  return {
    ...draft,
    plannedRequiredMinutes,
    plannedOptionalMinutes,
  };
}
