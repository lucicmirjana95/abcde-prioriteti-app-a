import type { DailyPlanDraft, DailyPlanItem } from "./contracts";
import type { RoutineCompletion, SharedRoutine } from "../../../shared/domain/routines/contracts";
import {
  getRoutineAvailabilityForDate,
  resolveEffectiveFrequency,
} from "../../../shared/domain/routines/schedule";

export interface DailyLoadAssessment {
  taskFixedMinutes: number;
  taskFlexibleMinutes: number;
  routinePlannedMinutes: number;
  routineRemainingMinutes: number;
  unknownDurationRoutineCount: number;
  availableMinutes: number;
  totalPlannedMinutes: number;
  totalRemainingMinutes: number;
  remainingCapacityMinutes: number;
  isOverCapacity: boolean;
  overCapacityMinutes: number;

  // Backward compatibility & convenience fields
  overloaded: boolean;
  remainingMinutes: number;
  excessMinutes: number;
  fixedMinutes: number;
  flexibleMinutes: number;
  suggestedMoves: DailyPlanItem[];
}

export interface AssessDailyLoadOptions {
  draft: DailyPlanDraft;
  completedItemIds?: string[];
  routines?: SharedRoutine[];
  routineCompletions?: RoutineCompletion[];
  plannedRoutineIds?: string[];
  localDate?: string;
  timeZone?: string;
  availableMinutes?: number;
  activeRoutinesMinutes?: number;
}

function lowPriorityFirst(item: DailyPlanItem): number {
  const p = item.priority || { explanation: "" };
  return (
    (p.consequence || 1) * 4 +
    (p.urgency || 1) * 4 +
    (p.goalContribution || 1) * 3 +
    (p.dependencyPressure || 1) * 2
  );
}

/**
 * Pure canonical Daily Load calculation.
 * Accurately calculates planned and remaining workload for tasks and routines,
 * strictly enforces user's actual availableMinutes without artificial limits,
 * and prevents double-counting when tasks link to routines via sourceRoutineId.
 */
export function calculateDailyLoad(options: AssessDailyLoadOptions): DailyLoadAssessment {
  const {
    draft,
    completedItemIds = [],
    routines = [],
    routineCompletions = [],
    plannedRoutineIds = draft.plannedRoutineIds || [],
    localDate = draft.localDate || new Date().toISOString().split("T")[0],
    timeZone,
    activeRoutinesMinutes = 0,
  } = options;

  const isExplicitCapacity =
    options.availableMinutes !== undefined
      ? options.availableMinutes > 0
      : draft.availableMinutes !== undefined
        ? draft.availableMinutes > 0
        : false;

  const availableMinutes = isExplicitCapacity
    ? Math.max(
        0,
        options.availableMinutes !== undefined
          ? options.availableMinutes
          : draft.availableMinutes !== undefined
            ? draft.availableMinutes
            : 0,
      )
    : 0;

  const completedSet = new Set(completedItemIds);
  const plannedRoutineSet = new Set(plannedRoutineIds);

  const plannedTasks = [...(draft.firstFocus || []), ...(draft.laterToday || [])];
  const allTasks = [...plannedTasks, ...(draft.ifCapacityRemains || [])];

  // Map tasks by sourceRoutineId for double-counting prevention
  const tasksBySourceRoutineId = new Map<string, DailyPlanItem[]>();
  for (const item of allTasks) {
    if (item.sourceRoutineId && item.sourceRoutineId.trim().length > 0) {
      const existing = tasksBySourceRoutineId.get(item.sourceRoutineId) || [];
      existing.push(item);
      tasksBySourceRoutineId.set(item.sourceRoutineId, existing);
    }
  }

  // 1. Process Tasks
  // Fixed vs flexible incomplete tasks
  let taskFixedMinutes = 0;
  let taskFlexibleMinutes = 0;
  let taskTotalPlannedMinutes = 0;

  for (const item of plannedTasks) {
    const isCompleted = completedSet.has(item.id);
    const duration = Math.max(0, item.estimatedMinutes || 0);
    taskTotalPlannedMinutes += duration;

    if (!isCompleted) {
      if (item.capacityType === "fixed") {
        taskFixedMinutes += duration;
      } else {
        taskFlexibleMinutes += duration;
      }
    }
  }

  // 2. Process Routines
  let routinePlannedMinutes = 0;
  let routineRemainingMinutes = 0;
  let unknownDurationRoutineCount = 0;
  const processedRoutineIds = new Set<string>();

  if (routines.length > 0) {
    for (const routine of routines) {
      if (!routine || processedRoutineIds.has(routine.id)) continue;
      processedRoutineIds.add(routine.id);

      if (routine.status !== "active") {
        // Paused and archived routines never enter today's load
        continue;
      }

      const isExplicitlyPlanned = plannedRoutineSet.has(routine.id);
      const availability = getRoutineAvailabilityForDate({
        routine,
        localDate,
        timeZone,
        completions: routineCompletions,
        isExplicitlyPlannedToday: isExplicitlyPlanned,
      });

      if (!availability.isPlannedToday) {
        // Routine is not scheduled or planned today
        continue;
      }

      // Check duration
      const hasDuration =
        routine.estimatedMinutes !== undefined &&
        routine.estimatedMinutes !== null &&
        Number.isInteger(routine.estimatedMinutes) &&
        routine.estimatedMinutes > 0;

      const duration = hasDuration ? routine.estimatedMinutes! : 0;
      if (!hasDuration) {
        unknownDurationRoutineCount++;
      }

      // Check completion status
      const todayComp = routineCompletions.find(
        (c) => c.routineId === routine.id && c.localDate === localDate,
      );
      const isRoutineCompleted =
        todayComp?.status === "full" || todayComp?.status === "minimum";
      const isRoutineSkipped = todayComp?.status === "skipped";

      // Check if linked task is completed
      const linkedTasks = tasksBySourceRoutineId.get(routine.id) || [];
      const isLinkedTaskCompleted = linkedTasks.some((t) => completedSet.has(t.id));

      const isFinished = isRoutineCompleted || isRoutineSkipped || isLinkedTaskCompleted;

      // Double-counting prevention:
      // If a task in plannedTasks already links to this routine, count the duration once.
      const linkedPlannedTask = plannedTasks.find((t) => t.sourceRoutineId === routine.id);

      if (linkedPlannedTask) {
        // The work is already in taskTotalPlannedMinutes and taskFixed/taskFlexible.
        // We reflect the routine duration in routinePlannedMinutes for clarity.
        routinePlannedMinutes += duration;

        if (!isFinished && !completedSet.has(linkedPlannedTask.id)) {
          routineRemainingMinutes += duration;
        }
      } else {
        routinePlannedMinutes += duration;
        if (!isFinished) {
          routineRemainingMinutes += duration;
        }
      }
    }
  } else if (activeRoutinesMinutes > 0) {
    routinePlannedMinutes = activeRoutinesMinutes;
    routineRemainingMinutes = activeRoutinesMinutes;
  }

  // Deduplicate total planned minutes:
  // Calculate planned work without duplicate counting between linked task and routine.
  let deduplicatedLinkedTaskPlannedMinutes = 0;
  let deduplicatedLinkedTaskRemainingMinutes = 0;
  for (const item of plannedTasks) {
    if (item.sourceRoutineId && processedRoutineIds.has(item.sourceRoutineId)) {
      // Find if routine was planned today
      const routine = routines.find((r) => r.id === item.sourceRoutineId);
      if (routine && routine.status === "active") {
        const isExp = plannedRoutineSet.has(routine.id);
        const avail = getRoutineAvailabilityForDate({
          routine,
          localDate,
          timeZone,
          completions: routineCompletions,
          isExplicitlyPlannedToday: isExp,
        });
        if (avail.isPlannedToday) {
          deduplicatedLinkedTaskPlannedMinutes += Math.max(0, item.estimatedMinutes || 0);
          if (!completedSet.has(item.id)) {
            deduplicatedLinkedTaskRemainingMinutes += Math.max(0, item.estimatedMinutes || 0);
          }
        }
      }
    }
  }

  const totalPlannedMinutes =
    taskTotalPlannedMinutes - deduplicatedLinkedTaskPlannedMinutes + routinePlannedMinutes;

  const totalRemainingMinutes =
    taskFixedMinutes +
    taskFlexibleMinutes -
    deduplicatedLinkedTaskRemainingMinutes +
    routineRemainingMinutes;

  const isOverCapacity = isExplicitCapacity && totalRemainingMinutes > availableMinutes;
  const overCapacityMinutes = isOverCapacity ? totalRemainingMinutes - availableMinutes : 0;
  const remainingCapacityMinutes = isExplicitCapacity
    ? Math.max(0, availableMinutes - totalRemainingMinutes)
    : 0;

  // Suggested moves for excess capacity
  const candidates = [...plannedTasks.filter((item) => item.capacityType !== "fixed")].sort(
    (a, b) => {
      const blockA = a.block === "if_capacity_remains" ? 0 : a.block === "later_today" ? 1 : 2;
      const blockB = b.block === "if_capacity_remains" ? 0 : b.block === "later_today" ? 1 : 2;
      return blockA - blockB || lowPriorityFirst(a) - lowPriorityFirst(b);
    },
  );

  const suggestedMoves: DailyPlanItem[] = [];
  if (isOverCapacity) {
    let recovered = 0;
    for (const item of candidates) {
      if (recovered >= overCapacityMinutes) break;
      suggestedMoves.push(item);
      recovered += item.estimatedMinutes || 0;
    }
  }

  return {
    taskFixedMinutes,
    taskFlexibleMinutes,
    routinePlannedMinutes,
    routineRemainingMinutes,
    unknownDurationRoutineCount,
    availableMinutes,
    totalPlannedMinutes,
    totalRemainingMinutes,
    remainingCapacityMinutes,
    isOverCapacity,
    overCapacityMinutes,

    // Backward-compatibility aliases
    overloaded: isOverCapacity,
    remainingMinutes: totalRemainingMinutes,
    excessMinutes: overCapacityMinutes,
    fixedMinutes: taskFixedMinutes + routineRemainingMinutes,
    flexibleMinutes: taskFlexibleMinutes,
    suggestedMoves,
  };
}

/**
 * Backward-compatible assessDailyLoad wrapper accepting either options object or positional args.
 */
export function assessDailyLoad(
  draftOrOptions: DailyPlanDraft | AssessDailyLoadOptions,
  completedItemIds?: string[],
  activeRoutinesMinutes?: number,
  availableMinutesOverride?: number,
): DailyLoadAssessment {
  if ("draft" in draftOrOptions) {
    return calculateDailyLoad(draftOrOptions);
  }

  return calculateDailyLoad({
    draft: draftOrOptions,
    completedItemIds: completedItemIds || [],
    activeRoutinesMinutes: activeRoutinesMinutes || 0,
    availableMinutes: availableMinutesOverride,
  });
}
