import type { DailyPlanItem, TimeSensitivity } from "./contracts";
import type { SharedRoutine } from "../../../shared/domain/routines/contracts";

export interface CreateTaskFromRoutineOptions {
  block?: "first_focus" | "later_today" | "if_capacity_remains";
  estimatedMinutes?: number;
  capacityType?: "flexible" | "fixed";
  timeSensitivity?: TimeSensitivity;
  requiredEnergy?: 1 | 2 | 3 | 4 | 5;
  taskIdPrefix?: string;
}

/**
 * Domain helper to convert a SharedRoutine into a DailyPlanItem (task)
 * establishing a clean, canonical sourceRoutineId linkage.
 */
export function createDailyPlanItemFromRoutine(
  routine: SharedRoutine,
  options: CreateTaskFromRoutineOptions = {},
): DailyPlanItem {
  const duration =
    options.estimatedMinutes !== undefined
      ? options.estimatedMinutes
      : routine.estimatedMinutes && routine.estimatedMinutes > 0
        ? routine.estimatedMinutes
        : 15;

  const prefix = options.taskIdPrefix || "t_routine";
  const itemId = `${prefix}_${routine.id}_${Date.now()}`;

  return {
    id: itemId,
    sourceItemIds: [],
    title: routine.title,
    block: options.block || "later_today",
    estimatedMinutes: duration,
    capacityType: options.capacityType || "flexible",
    requiredEnergy: options.requiredEnergy || 3,
    timeSensitivity: options.timeSensitivity || "none",
    priority: {
      explanation: `Routine converted to task: ${routine.title}`,
      consequence: 3,
      urgency: 3,
      goalContribution: 3,
    },
    needsCheck: false,
    sourceRoutineId: routine.id,
  };
}
