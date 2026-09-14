import type { SharedRoutine } from "../../../shared/domain/routines";
import { createManualRoutineDraft } from "../../../shared/domain/routines";

export interface RoutineManagementDeps {
  createRoutine: (userId: string, routine: SharedRoutine) => Promise<any>;
  updateRoutine: (userId: string, routineId: string, expectedRevision: number, updateFn: (current: SharedRoutine) => SharedRoutine) => Promise<any>;
  permanentDeleteRoutine: (userId: string, routineId: string, expectedRevision: number, confirmationToken: string) => Promise<any>;
}

export class RoutineManagementController {
  private inFlightCreations = new Set<string>();

  constructor(private deps: RoutineManagementDeps) {}

  initManualDraft(initial?: Partial<SharedRoutine>): SharedRoutine {
    return createManualRoutineDraft(initial);
  }

  async create(userId: string, routine: SharedRoutine) {
    const keys = [routine.id, routine.mutationId].filter(Boolean) as string[];
    if (keys.some((k) => this.inFlightCreations.has(k))) {
      throw new Error("create_in_flight");
    }
    keys.forEach((k) => this.inFlightCreations.add(k));
    try {
      const result = await this.deps.createRoutine(userId, routine);
      if (result.type === "success" || result.type === "already_applied") {
        return result.routine;
      }
      const reasonSuffix = result.reason ? `:${result.reason}` : "";
      throw new Error(`create_failed:${result.type}${reasonSuffix}`);
    } finally {
      keys.forEach((k) => this.inFlightCreations.delete(k));
    }
  }

  async update(userId: string, routineId: string, expectedRevision: number, updates: Partial<SharedRoutine>) {
    const result = await this.deps.updateRoutine(userId, routineId, expectedRevision, (current) => ({
      ...current,
      ...updates
    }));
    if (result.type !== "success") throw new Error(`update_failed:${result.type}`);
    return result.routine;
  }

  async delete(userId: string, routineId: string, expectedRevision: number) {
    const result = await this.deps.permanentDeleteRoutine(userId, routineId, expectedRevision, "PERMANENT_DELETE_CONFIRMED");
    if (result.type !== "success") throw new Error(`delete_failed:${result.type}`);
    return true;
  }
}
