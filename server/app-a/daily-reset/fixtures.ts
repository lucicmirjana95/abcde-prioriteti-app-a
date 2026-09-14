export const fixValidClarificationResponse = {
  phase: "clarification_needed",
  questions: [
    {
      id: "temp_q1",
      question: "question",
      context: "context",
      relatedItemIds: [],
      materialImpact: "priority"
    }
  ]
};

export const fixValidPlanResponse = {
  phase: "plan_ready",
  draft: {
    classifiedItems: [
      {
        originalText: "do laundry",
        kind: "task",
        timeHorizon: "today",
        timeSensitivity: "none",
        isAmbiguous: false,
        needsCheck: false,
        priority: { explanation: "needs doing" }
      }
    ],
    firstFocus: [
      {
        sourceItemIndex: 0,
        title: "Laundry",
        block: "first_focus",
        estimatedMinutes: 30,
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { explanation: "needs doing" },
        needsCheck: false
      }
    ],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Do laundry early.",
    intervention: {
      type: "focus",
      title: "Focus",
      description: "Breathe",
      estimatedMinutes: 5,
      reason: "Calm down"
    }
  }
};

export const fixValidPlanWithoutIntervention = {
  ...fixValidPlanResponse,
  draft: {
    ...fixValidPlanResponse.draft,
    intervention: undefined
  }
};

export const fixMalformedNonObject = "not an object";

export const fixUnknownPhase = {
  phase: "unknown_phase"
};

export const fixTooManyQuestions = {
  phase: "clarification_needed",
  questions: [
    { id: "q1", question: "q", context: "c", relatedItemIds: [], materialImpact: "other" },
    { id: "q2", question: "q", context: "c", relatedItemIds: [], materialImpact: "other" },
    { id: "q3", question: "q", context: "c", relatedItemIds: [], materialImpact: "other" },
    { id: "q4", question: "q", context: "c", relatedItemIds: [], materialImpact: "other" }
  ]
};

export const fixClarificationWithDraft = {
  phase: "clarification_needed",
  questions: [
    { id: "q1", question: "q", context: "c", relatedItemIds: [], materialImpact: "other" }
  ],
  draft: fixValidPlanResponse.draft
};

export const fixPlanWithQuestions = {
  phase: "plan_ready",
  questions: [
    { id: "q1", question: "q", context: "c", relatedItemIds: [], materialImpact: "other" }
  ],
  draft: fixValidPlanResponse.draft
};

export const fixPlanWithEmptyQuestions = {
  phase: "plan_ready",
  questions: [],
  draft: fixValidPlanResponse.draft
};

export const fixClarificationWithEmptyDraft = {
  phase: "clarification_needed",
  questions: fixValidClarificationResponse.questions,
  draft: {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: ""
  }
};

export const fixClarificationWithRelatedIds = {
  phase: "clarification_needed",
  questions: [
    {
      id: "temp_q1",
      question: "question",
      context: "context",
      relatedItemIds: ["some_unresolved_temp_id"],
      materialImpact: "priority"
    }
  ]
};

export const fixDuplicateTempIds = {
  phase: "clarification_needed",
  questions: [
    { id: "duplicate_id", question: "q1", context: "c", relatedItemIds: [], materialImpact: "other" },
    { id: "duplicate_id", question: "q2", context: "c", relatedItemIds: [], materialImpact: "other" }
  ]
};

export const fixUnresolvedSourceRef = {
  phase: "plan_ready",
  draft: {
    ...fixValidPlanResponse.draft,
    firstFocus: [
      {
        ...fixValidPlanResponse.draft.firstFocus[0],
        sourceItemIndex: 99
      }
    ]
  }
};

export const fixUnresolvedQuestionRef = {
  phase: "plan_ready",
  draft: {
    ...fixValidPlanResponse.draft,
    classifiedItems: [
      {
        ...fixValidPlanResponse.draft.classifiedItems[0],
        relatedQuestionId: "unknown_question_id"
      }
    ]
  }
};

export const fixFourFirstFocus = {
  phase: "plan_ready",
  draft: {
    ...fixValidPlanResponse.draft,
    firstFocus: [
      fixValidPlanResponse.draft.firstFocus[0],
      { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: 0 },
      { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: 0 },
      { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: 0 }
    ]
  }
};

export const fixInvalidEnum = {
  phase: "plan_ready",
  draft: {
    ...fixValidPlanResponse.draft,
    classifiedItems: [
      {
        ...fixValidPlanResponse.draft.classifiedItems[0],
        timeHorizon: "invalid_horizon"
      }
    ]
  }
};

export const fixCapacityOverflow = {
  phase: "plan_ready",
  draft: {
    ...fixValidPlanResponse.draft,
    availableMinutes: 15,
  }
};

export const fixInvalidIntervention = {
  phase: "plan_ready",
  draft: {
    ...fixValidPlanResponse.draft,
    intervention: {
      type: "focus",
      title: "Focus",
      description: "Breathe",
      estimatedMinutes: -5,
      reason: "Calm down"
    }
  }
};
