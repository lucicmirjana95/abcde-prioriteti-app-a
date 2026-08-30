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
  mentalLoad?: number;
  dependencyPressure?: number;
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
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER, description: "Integer 1-5" },
                  urgency: { type: Type.INTEGER, description: "Integer 1-5" },
                  goalContribution: { type: Type.INTEGER, description: "Integer 1-5" },
                  mentalLoad: { type: Type.INTEGER, description: "Integer 1-5" },
                  dependencyPressure: { type: Type.INTEGER, description: "Integer 1-5" },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER, description: "Integer 1-5" },
                  urgency: { type: Type.INTEGER, description: "Integer 1-5" },
                  goalContribution: { type: Type.INTEGER, description: "Integer 1-5" },
                  mentalLoad: { type: Type.INTEGER, description: "Integer 1-5" },
                  dependencyPressure: { type: Type.INTEGER, description: "Integer 1-5" },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
            required: ["sourceItemIndex", "title", "block", "estimatedMinutes", "requiredEnergy", "timeSensitivity", "priority", "needsCheck"]
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
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER, description: "Integer 1-5" },
                  urgency: { type: Type.INTEGER, description: "Integer 1-5" },
                  goalContribution: { type: Type.INTEGER, description: "Integer 1-5" },
                  mentalLoad: { type: Type.INTEGER, description: "Integer 1-5" },
                  dependencyPressure: { type: Type.INTEGER, description: "Integer 1-5" },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
            required: ["sourceItemIndex", "title", "block", "estimatedMinutes", "requiredEnergy", "timeSensitivity", "priority", "needsCheck"]
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
              requiredEnergy: { type: Type.INTEGER, description: "Integer 1-5" },
              timeSensitivity: {
                type: Type.STRING,
                enum: ["none", "soft", "deadline", "urgent"]
              },
              deadlineText: { type: Type.STRING },
              deadlineIso: { type: Type.STRING },
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER, description: "Integer 1-5" },
                  urgency: { type: Type.INTEGER, description: "Integer 1-5" },
                  goalContribution: { type: Type.INTEGER, description: "Integer 1-5" },
                  mentalLoad: { type: Type.INTEGER, description: "Integer 1-5" },
                  dependencyPressure: { type: Type.INTEGER, description: "Integer 1-5" },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
            required: ["sourceItemIndex", "title", "block", "estimatedMinutes", "requiredEnergy", "timeSensitivity", "priority", "needsCheck"]
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
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER },
                  urgency: { type: Type.INTEGER },
                  goalContribution: { type: Type.INTEGER },
                  mentalLoad: { type: Type.INTEGER },
                  dependencyPressure: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER },
                  urgency: { type: Type.INTEGER },
                  goalContribution: { type: Type.INTEGER },
                  mentalLoad: { type: Type.INTEGER },
                  dependencyPressure: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
              priority: {
                type: Type.OBJECT,
                properties: {
                  consequence: { type: Type.INTEGER },
                  urgency: { type: Type.INTEGER },
                  goalContribution: { type: Type.INTEGER },
                  mentalLoad: { type: Type.INTEGER },
                  dependencyPressure: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["explanation"]
              },
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
