// Defines the model-facing JSON shape.
// The Google Gen AI SDK responseSchema has limitations around complex unions (e.g. anyOf).
// To ensure deterministic behavior, we use a single object with optional fields for questions and draft,
// and enforce exclusivity in the parseModelResponse validation layer.

export interface ModelClarificationQuestion {
  id: string; // Temporary model ID
  question: string;
  context: string;
  relatedItemIds: string[];
  materialImpact: string;
}

export interface ModelPriorityFactors {
  consequence?: number;
  urgency?: number;
  goalContribution?: number;
  leverage?: number;
  mentalLoad?: number;
  dependencyPressure?: number;
  confidence?: string;
  recommendedDisposition?: string;
  conciseExplanation?: string;
  evidenceFromInput?: string;
  explanation: string;
}

export interface ModelGoalRelationship {
  goalId?: string;
  goalTitle?: string;
  projectId?: string;
  projectTitle?: string;
  relationshipExplanation?: string;
}

export interface ModelClassifiedBrainDumpItem {
  id?: string;
  originalText: string;
  kind: string;
  timeHorizon: string;
  suggestedAction?: string;
  estimatedMinutes?: number;
  requiredEnergy?: number;
  timeSensitivity: string;
  deadlineText?: string;
  deadlineIso?: string;
  isAmbiguous: boolean;
  needsCheck: boolean;
  relatedQuestionId?: string;
  priority: ModelPriorityFactors;
  goalRelationship?: ModelGoalRelationship;
}

export interface ModelDailyPlanItem {
  id?: string;
  sourceItemIndex: number; // Zero-based index into classifiedItems (0 to N-1)
  sourceItemIndexes?: number[];
  sourceItemIds?: string[];
  title: string;
  description?: string;
  block: string;
  estimatedMinutes: number;
  requiredEnergy: number;
  timeSensitivity: string;
  deadlineText?: string;
  deadlineIso?: string;
  priority: ModelPriorityFactors;
  goalRelationship?: ModelGoalRelationship;
  reasoning?: string;
  needsCheck: boolean;
}

export interface ModelSubsetBrainDumpItem {
  sourceItemIndex: number;
  originalText?: string;
  kind?: string;
  timeHorizon?: string;
  suggestedAction?: string;
  estimatedMinutes?: number;
  requiredEnergy?: number;
  timeSensitivity?: string;
  deadlineText?: string;
  deadlineIso?: string;
  isAmbiguous?: boolean;
  needsCheck?: boolean;
  relatedQuestionId?: string;
  priority?: ModelPriorityFactors;
  goalRelationship?: ModelGoalRelationship;
}

export interface ModelSafeIntervention {
  type: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  reason: string;
}

export interface ModelDailyPlanDraft {
  classifiedItems: ModelClassifiedBrainDumpItem[];
  firstFocus: ModelDailyPlanItem[];
  laterToday: ModelDailyPlanItem[];
  ifCapacityRemains: ModelDailyPlanItem[];
  deferredItems: ModelSubsetBrainDumpItem[];
  longTermIdeas: ModelSubsetBrainDumpItem[];
  nonActionItems: ModelSubsetBrainDumpItem[];
  planRationale: string;
  intervention?: ModelSafeIntervention;
  availableMinutes?: number;
}

export interface ModelResponseShape {
  phase: string;
  questions?: ModelClarificationQuestion[];
  draft?: ModelDailyPlanDraft;
}

const Type = {
  OBJECT: "OBJECT",
  ARRAY: "ARRAY",
  STRING: "STRING",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
};

const prioritySchema = {
  type: Type.OBJECT,
  properties: {
    consequence: { type: Type.INTEGER, description: "Integer 1-5" },
    urgency: { type: Type.INTEGER, description: "Integer 1-5" },
    goalContribution: { type: Type.INTEGER, description: "Integer 1-5" },
    leverage: { type: Type.INTEGER, description: "Integer 1-5" },
    mentalLoad: { type: Type.INTEGER, description: "Integer 1-5" },
    dependencyPressure: { type: Type.INTEGER, description: "Integer 1-5" },
    confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
    recommendedDisposition: { type: Type.STRING, enum: ["do", "delegate", "defer", "eliminate", "clarify"] },
    conciseExplanation: { type: Type.STRING },
    evidenceFromInput: { type: Type.STRING },
    explanation: { type: Type.STRING }
  },
  required: ["explanation"]
};

export const modelSchema = {
  type: Type.OBJECT,
  properties: {
    phase: {
      type: Type.STRING,
      enum: ["clarification_needed", "plan_ready"],
      description: "Must be 'clarification_needed' or 'plan_ready'",
    },
    questions: {
      type: Type.ARRAY,
      description: "Include 1 to 3 questions only if phase is 'clarification_needed'. Omit or empty when phase is 'plan_ready'.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Temporary ID (e.g. q1)" },
          question: { type: Type.STRING },
          context: { type: Type.STRING },
          relatedItemIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Must be an empty array [] during initial clarification."
          },
          materialImpact: {
            type: Type.STRING,
            enum: ["priority", "deadline", "duration", "classification", "goal_relationship", "other"]
          }
        },
        required: ["id", "question", "context", "relatedItemIds", "materialImpact"]
      }
    },
    draft: {
      type: Type.OBJECT,
      description: "Daily plan draft. Required when phase is 'plan_ready'. Omit or empty when phase is 'clarification_needed'.",
      properties: {
        planRationale: { type: Type.STRING },
        classifiedItems: {
          type: Type.ARRAY,
          description: "List of all classified user thoughts in order (index 0, 1, 2...)",
          items: {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: ["task", "idea", "worry", "fact", "waiting_for"]
              },
              timeHorizon: {
                type: Type.STRING,
                enum: ["today", "this_week", "later", "long_term_idea", "no_action"]
              },
              suggestedAction: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER, description: "Positive integer in minutes" },
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              isAmbiguous: { type: Type.BOOLEAN },
              needsCheck: { type: Type.BOOLEAN },
              relatedQuestionId: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              }
            },
            required: ["originalText", "kind", "timeHorizon", "timeSensitivity", "isAmbiguous", "needsCheck", "priority"]
          }
        },
        firstFocus: {
          type: Type.ARRAY,
          description: "Top focus tasks. Maximum 3 items.",
          items: {
            type: Type.OBJECT,
            properties: {
              sourceItemIndex: {
                type: Type.INTEGER,
                description: "Zero-based integer index of the corresponding item in classifiedItems (0 to N-1)."
              },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              block: { type: Type.STRING, enum: ["first_focus"] },
              estimatedMinutes: { type: Type.INTEGER, description: "Positive integer in minutes" },
              capacityType: { type: Type.STRING, enum: ["flexible", "fixed"], description: "Use fixed only for an explicitly stated unavoidable commitment; otherwise flexible." },
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              },
              reasoning: { type: Type.STRING },
              needsCheck: { type: Type.BOOLEAN }
            },
            required: ["sourceItemIndex", "title", "block", "estimatedMinutes", "capacityType", "requiredEnergy", "timeSensitivity", "priority", "needsCheck"]
          }
        },
        laterToday: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sourceItemIndex: {
                type: Type.INTEGER,
                description: "Zero-based integer index of the corresponding item in classifiedItems (0 to N-1)."
              },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              block: { type: Type.STRING, enum: ["later_today"] },
              estimatedMinutes: { type: Type.INTEGER, description: "Positive integer in minutes" },
              capacityType: { type: Type.STRING, enum: ["flexible", "fixed"], description: "Use fixed only for an explicitly stated unavoidable commitment; otherwise flexible." },
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              },
              reasoning: { type: Type.STRING },
              needsCheck: { type: Type.BOOLEAN }
            },
            required: ["sourceItemIndex", "title", "block", "estimatedMinutes", "capacityType", "requiredEnergy", "timeSensitivity", "priority", "needsCheck"]
          }
        },
        ifCapacityRemains: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sourceItemIndex: {
                type: Type.INTEGER,
                description: "Zero-based integer index of the corresponding item in classifiedItems (0 to N-1)."
              },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              block: { type: Type.STRING, enum: ["if_capacity_remains"] },
              estimatedMinutes: { type: Type.INTEGER, description: "Positive integer in minutes" },
              capacityType: { type: Type.STRING, enum: ["flexible"], description: "Optional work is always flexible." },
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              },
              reasoning: { type: Type.STRING },
              needsCheck: { type: Type.BOOLEAN }
            },
            required: ["sourceItemIndex", "title", "block", "estimatedMinutes", "capacityType", "requiredEnergy", "timeSensitivity", "priority", "needsCheck"]
          }
        },
        deferredItems: {
          type: Type.ARRAY,
          description: "Items from classifiedItems with timeHorizon 'this_week' or 'later'.",
          items: {
            type: Type.OBJECT,
            properties: {
              sourceItemIndex: {
                type: Type.INTEGER,
                description: "Zero-based integer index of the item in classifiedItems (0 to N-1)."
              },
              originalText: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: ["task", "idea", "worry", "fact", "waiting_for"]
              },
              timeHorizon: {
                type: Type.STRING,
                enum: ["this_week", "later"]
              },
              suggestedAction: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              requiredEnergy: { type: Type.INTEGER },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              isAmbiguous: { type: Type.BOOLEAN },
              needsCheck: { type: Type.BOOLEAN },
              relatedQuestionId: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              }
            },
            required: ["sourceItemIndex"]
          }
        },
        longTermIdeas: {
          type: Type.ARRAY,
          description: "Items from classifiedItems with timeHorizon 'long_term_idea'.",
          items: {
            type: Type.OBJECT,
            properties: {
              sourceItemIndex: {
                type: Type.INTEGER,
                description: "Zero-based integer index of the item in classifiedItems (0 to N-1)."
              },
              originalText: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: ["task", "idea", "worry", "fact", "waiting_for"]
              },
              timeHorizon: {
                type: Type.STRING,
                enum: ["long_term_idea"]
              },
              suggestedAction: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              requiredEnergy: { type: Type.INTEGER },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              isAmbiguous: { type: Type.BOOLEAN },
              needsCheck: { type: Type.BOOLEAN },
              relatedQuestionId: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              }
            },
            required: ["sourceItemIndex"]
          }
        },
        nonActionItems: {
          type: Type.ARRAY,
          description: "Items from classifiedItems with timeHorizon 'no_action'.",
          items: {
            type: Type.OBJECT,
            properties: {
              sourceItemIndex: {
                type: Type.INTEGER,
                description: "Zero-based integer index of the item in classifiedItems (0 to N-1)."
              },
              originalText: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: ["task", "idea", "worry", "fact", "waiting_for"]
              },
              timeHorizon: {
                type: Type.STRING,
                enum: ["no_action"]
              },
              suggestedAction: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              requiredEnergy: { type: Type.INTEGER },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              isAmbiguous: { type: Type.BOOLEAN },
              needsCheck: { type: Type.BOOLEAN },
              relatedQuestionId: { type: Type.STRING },
              priority: prioritySchema,
              goalRelationship: {
                type: Type.OBJECT,
                properties: {
                  goalId: { type: Type.STRING },
                  goalTitle: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  relationshipExplanation: { type: Type.STRING }
                }
              }
            },
            required: ["sourceItemIndex"]
          }
        },
        intervention: {
          type: Type.OBJECT,
          description: "At most one short, safe, optional non-medical intervention.",
          properties: {
            type: {
              type: Type.STRING,
              enum: ["environment", "movement", "breathing", "rest", "hydration", "light", "focus"]
            },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            estimatedMinutes: { type: Type.INTEGER },
            reason: { type: Type.STRING }
          },
          required: ["type", "title", "description", "estimatedMinutes", "reason"]
        }
      },
      required: ["planRationale", "classifiedItems", "firstFocus", "laterToday", "ifCapacityRemains", "deferredItems", "longTermIdeas", "nonActionItems"]
    }
  },
  required: ["phase"]
};

export interface ModelItemEvaluation {
  sourceItemId: string;
  consequence: number;
  urgency: number;
  goalContribution: number;
  leverage: number;
  mentalLoad: number;
  dependencyPressure: number;
  confidence: "low" | "medium" | "high";
  recommendedDisposition: "do" | "delegate" | "defer" | "eliminate" | "clarify";
  proposedBlock: "first_focus" | "later_today" | "if_capacity_remains" | "deferred";
  conciseExplanation: string;
  evidenceFromInput: string;
  conflictsWithManualOverride: boolean;
}

export interface ModelReevaluatePlan {
  firstFocusItemIds: string[];
  laterTodayItemIds: string[];
  ifCapacityRemainsItemIds: string[];
  deferredItemIds: string[];
  summaryOfChanges: string;
}

export interface ModelReevaluateResponseShape {
  evaluations: ModelItemEvaluation[];
  plan: ModelReevaluatePlan;
}

export const reevaluateModelSchema = {
  type: Type.OBJECT,
  properties: {
    evaluations: {
      type: Type.ARRAY,
      description: "Structured priority and leverage evaluations for each unfinished flexible task",
      items: {
        type: Type.OBJECT,
        properties: {
          sourceItemId: { type: Type.STRING },
          consequence: { type: Type.INTEGER, description: "Integer 1-5" },
          urgency: { type: Type.INTEGER, description: "Integer 1-5" },
          goalContribution: { type: Type.INTEGER, description: "Integer 1-5" },
          leverage: { type: Type.INTEGER, description: "Integer 1-5" },
          mentalLoad: { type: Type.INTEGER, description: "Integer 1-5" },
          dependencyPressure: { type: Type.INTEGER, description: "Integer 1-5" },
          confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
          recommendedDisposition: {
            type: Type.STRING,
            enum: ["do", "delegate", "defer", "eliminate", "clarify"],
          },
          proposedBlock: {
            type: Type.STRING,
            enum: ["first_focus", "later_today", "if_capacity_remains", "deferred"],
          },
          conciseExplanation: { type: Type.STRING },
          evidenceFromInput: { type: Type.STRING },
          conflictsWithManualOverride: { type: Type.BOOLEAN },
        },
        required: [
          "sourceItemId",
          "consequence",
          "urgency",
          "goalContribution",
          "leverage",
          "mentalLoad",
          "dependencyPressure",
          "confidence",
          "recommendedDisposition",
          "proposedBlock",
          "conciseExplanation",
          "evidenceFromInput",
          "conflictsWithManualOverride",
        ],
      },
    },
    plan: {
      type: Type.OBJECT,
      description: "Proposed plan arrangement respecting all constraints",
      properties: {
        firstFocusItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "At most 3 flexible item IDs for First Focus, strictly ordered by priority",
        },
        laterTodayItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Flexible item IDs ordered for later today",
        },
        ifCapacityRemainsItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Item IDs placed in optional capacity",
        },
        deferredItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Item IDs proposed for deferral",
        },
        summaryOfChanges: {
          type: Type.STRING,
          description: "Short concise explanation of proposed adjustments without technical jargon",
        },
      },
      required: [
        "firstFocusItemIds",
        "laterTodayItemIds",
        "ifCapacityRemainsItemIds",
        "deferredItemIds",
        "summaryOfChanges",
      ],
    },
  },
  required: ["evaluations", "plan"],
};

