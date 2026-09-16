import type { RoutineCompletion, RoutineMutationReceipt, SharedRoutine } from "../../domain/routines";
import {
  computeRoutineSemanticFingerprint,
  getRoutineCompletionDocumentId,
  getRoutineSemanticCanonicalString,
  isValidRoutineMutationId,
  normalizeSharedRoutine,
  validateRoutineCompletion,
  validateSharedRoutine,
} from "../../domain/routines";
import {
  isRoutineCompletionDocument,
  isRoutineDocument,
} from "./routineDocument";
import { firestoreAdapter } from "./firestoreAdapter";
import { resetGuardAdapter } from "./resetGuardAdapter";

export type RoutineOperationResult =
  | { type: "success"; routine: SharedRoutine }
  | { type: "conflict"; reason: string }
  | { type: "already_applied"; routine: SharedRoutine }
  | { type: "reset_in_progress" }
  | { type: "unauthenticated" }
  | { type: "invalid"; errors: string[] }
  | { type: "error"; error: string };

function requireUserId(userId: string): void {
  if (resetGuardAdapter.isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId.trim()) throw new Error("authentication_required");
}

function checkUserId(userId: string): RoutineOperationResult | null {
  if (!userId.trim()) return { type: "unauthenticated" };
  if (resetGuardAdapter.isResetBlocked(userId)) return { type: "reset_in_progress" };
  return null;
}

function routineRef(userId: string, routineId: string) {
  return firestoreAdapter.doc(firestoreAdapter.db, "users", userId, "routines", routineId);
}

function receiptRef(userId: string, mutationId: string) {
  return firestoreAdapter.doc(
    firestoreAdapter.db,
    "users",
    userId,
    "routineMutationReceipts",
    mutationId,
  );
}

function completionRef(userId: string, routineId: string, localDate: string) {
  return firestoreAdapter.doc(
    firestoreAdapter.db,
    "users",
    userId,
    "routineCompletions",
    getRoutineCompletionDocumentId(routineId, localDate),
  );
}

export async function createRoutine(
  userId: string,
  routine: SharedRoutine,
): Promise<RoutineOperationResult> {
  const check = checkUserId(userId);
  if (check) return check;

  const routineToSave: SharedRoutine = { ...routine, revision: 1 };
  const validation = validateSharedRoutine(routineToSave);
  if (!validation.valid) return { type: "invalid", errors: validation.errors };

  const mutationId = routineToSave.mutationId;
  if (mutationId && !isValidRoutineMutationId(mutationId)) {
    return { type: "invalid", errors: ["mutation_id_invalid"] };
  }

  const payloadFingerprint = mutationId
    ? await computeRoutineSemanticFingerprint(routineToSave)
    : undefined;
  const payloadCanonical = mutationId
    ? getRoutineSemanticCanonicalString(routineToSave)
    : undefined;

  const rRef = routineRef(userId, routineToSave.id);
  const recRef = mutationId ? receiptRef(userId, mutationId) : null;

  try {
    let alreadyApplied: SharedRoutine | null = null;
    await firestoreAdapter.runTransaction(firestoreAdapter.db, async (transaction: any) => {
      if (resetGuardAdapter.isResetBlocked(userId)) throw new Error("reset_in_progress");

      const routineSnapshot = await transaction.get(rRef);
      const receiptSnapshot = recRef ? await transaction.get(recRef) : null;

      if (receiptSnapshot && receiptSnapshot.exists()) {
        const receipt = receiptSnapshot.data() as RoutineMutationReceipt;
        if (receipt.routineId !== routineToSave.id) {
          throw new Error("conflict:mutation_id_used_for_different_routine");
        }
        if (receipt.payloadFingerprint !== payloadFingerprint) {
          throw new Error("conflict:mutation_payload_mismatch");
        }
        if (!routineSnapshot.exists()) {
          // Corrupt state: receipt exists but routine document is missing.
          // Never return already_applied or synthesize a fake routine. Reject with consistency error.
          throw new Error("conflict:mutation_receipt_missing_routine");
        }
        const existing = routineSnapshot.data() as SharedRoutine;
        if (existing.id !== routineToSave.id || existing.mutationId !== mutationId) {
          throw new Error("conflict:routine_receipt_inconsistent");
        }
        // Verify semantic payload of the existing routine in the database matches
        const existingCanonical = getRoutineSemanticCanonicalString(existing);
        if (existingCanonical !== payloadCanonical) {
          throw new Error("conflict:existing_routine_fingerprint_mismatch");
        }
        alreadyApplied = existing;
        return;
      }

      if (routineSnapshot.exists()) {
        const existing = routineSnapshot.data() as SharedRoutine;
        // Routine exists but receipt is missing:
        // Safely recover by proving exact match on ID, mutationId, and semantic fingerprint.
        if (mutationId && existing.mutationId === mutationId) {
          const existingCanonical = getRoutineSemanticCanonicalString(existing);
          if (existingCanonical === payloadCanonical) {
            // Atomic recovery: backfill missing receipt in the same transaction
            if (recRef && payloadFingerprint) {
              const receiptDoc: RoutineMutationReceipt = {
                mutationId,
                routineId: routineToSave.id,
                payloadFingerprint,
                createdAt: new Date().toISOString(),
              };
              transaction.set(recRef, receiptDoc);
            }
            alreadyApplied = existing;
            return;
          }
          throw new Error("conflict:existing_routine_fingerprint_mismatch");
        }
        throw new Error("conflict:already_exists");
      }

      transaction.set(rRef, JSON.parse(JSON.stringify(routineToSave)));
      if (recRef && payloadFingerprint && mutationId) {
        const receiptDoc: RoutineMutationReceipt = {
          mutationId,
          routineId: routineToSave.id,
          payloadFingerprint,
          createdAt: new Date().toISOString(),
        };
        transaction.set(recRef, receiptDoc);
      }
    });

    if (alreadyApplied) {
      return { type: "already_applied", routine: alreadyApplied };
    }
    return { type: "success", routine: routineToSave };
  } catch (error: any) {
    if (error.message === "reset_in_progress") return { type: "reset_in_progress" };
    if (error.message.startsWith("conflict:")) {
      return { type: "conflict", reason: error.message.replace("conflict:", "") };
    }
    return { type: "error", error: error.message };
  }
}

export async function updateRoutine(
  userId: string,
  routineId: string,
  expectedRevision: number,
  updateFn: (current: SharedRoutine) => SharedRoutine,
): Promise<RoutineOperationResult> {
  const check = checkUserId(userId);
  if (check) return check;

  const ref = routineRef(userId, routineId);
  let finalRoutine: SharedRoutine | undefined;

  try {
    await firestoreAdapter.runTransaction(firestoreAdapter.db, async (transaction: any) => {
      if (resetGuardAdapter.isResetBlocked(userId)) throw new Error("reset_in_progress");

      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) {
        throw new Error("conflict:not_found");
      }

      const data = snapshot.data() as SharedRoutine;
      const currentRevision = data.revision ?? 0;

      if (currentRevision > expectedRevision) {
        throw new Error(`conflict:routine_changed_elsewhere`);
      } else if (currentRevision < expectedRevision) {
        throw new Error(`conflict:stale_expected_revision`);
      }

      const updated = updateFn(data);
      const routineToSave: SharedRoutine = { ...updated, revision: currentRevision + 1 };
      
      const validation = validateSharedRoutine(routineToSave);
      if (!validation.valid) throw new Error(`invalid:${validation.errors.join(",")}`);

      transaction.set(ref, JSON.parse(JSON.stringify(routineToSave)));
      finalRoutine = routineToSave;
    });

    return { type: "success", routine: finalRoutine! };
  } catch (error: any) {
    if (error.message === "reset_in_progress") return { type: "reset_in_progress" };
    if (error.message.startsWith("conflict:")) return { type: "conflict", reason: error.message.split(":")[1] };
    if (error.message.startsWith("invalid:")) return { type: "invalid", errors: error.message.split(":")[1].split(",") };
    return { type: "error", error: error.message };
  }
}

export async function permanentDeleteRoutine(
  userId: string,
  routineId: string,
  expectedRevision: number,
  confirmationToken: string
): Promise<RoutineOperationResult> {
  const check = checkUserId(userId);
  if (check) return check;

  if (confirmationToken !== "PERMANENT_DELETE_CONFIRMED") {
    return { type: "error", error: "missing_confirmation" };
  }

  const ref = routineRef(userId, routineId);

  try {
    await firestoreAdapter.runTransaction(firestoreAdapter.db, async (transaction: any) => {
      if (resetGuardAdapter.isResetBlocked(userId)) throw new Error("reset_in_progress");

      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) {
        throw new Error("conflict:not_found");
      }

      const currentRevision = snapshot.data().revision ?? 0;
      if (currentRevision !== expectedRevision) {
        throw new Error("conflict:routine_changed_elsewhere");
      }

      transaction.delete(ref);
    });

    return { type: "success", routine: {} as SharedRoutine }; 
  } catch (error: any) {
    if (error.message === "reset_in_progress") return { type: "reset_in_progress" };
    if (error.message.startsWith("conflict:")) return { type: "conflict", reason: error.message.split(":")[1] };
    return { type: "error", error: error.message };
  }
}

export interface RoutineLoadDiagnostic {
  docId: string;
  errors: string[];
}

export interface LoadRoutinesResult {
  routines: SharedRoutine[];
  diagnostics: RoutineLoadDiagnostic[];
}

export async function loadRoutinesWithDiagnostics(userId: string): Promise<LoadRoutinesResult> {
  requireUserId(userId);
  const snapshot = await firestoreAdapter.getDocs(
    firestoreAdapter.collection(firestoreAdapter.db, "users", userId, "routines"),
  );
  const diagnostics: RoutineLoadDiagnostic[] = [];
  const routines: SharedRoutine[] = [];

  for (const entry of snapshot.docs) {
    const rawData = entry.data();
    const docId = entry.id || (rawData && (rawData as any).id) || "unknown_doc";
    const result = normalizeSharedRoutine(rawData);

    if (result.type === "valid" || result.type === "valid_legacy") {
      routines.push(result.routine);
    } else {
      diagnostics.push({
        docId: typeof docId === "string" ? docId : "unknown_doc",
        errors: result.errors,
      });
      console.warn(
        `[RoutineRepository] Skipped invalid routine document. ID: ${docId}, errors: ${result.errors.join(", ")}`,
      );
    }
  }

  routines.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  return { routines, diagnostics };
}

export async function loadRoutines(userId: string): Promise<SharedRoutine[]> {
  const { routines } = await loadRoutinesWithDiagnostics(userId);
  return routines;
}

/**
 * @deprecated Use loadRoutinesWithDiagnostics instead to avoid shared mutable state.
 */
export function getLastLoadRoutinesDiagnostics(): RoutineLoadDiagnostic[] {
  return [];
}

export async function loadActiveRoutines(userId: string): Promise<SharedRoutine[]> {
  const routines = await loadRoutines(userId);
  return routines.filter((routine) => routine.status === "active");
}

export async function recordRoutineCompletion(
  userId: string,
  completion: RoutineCompletion,
  effectiveTimeZone?: string,
  now: Date = new Date(),
): Promise<void> {
  requireUserId(userId);
  const validation = validateRoutineCompletion(completion, effectiveTimeZone, now);
  if (!validation.valid) throw new Error(`invalid_completion:${validation.errors.join(",")}`);
  await firestoreAdapter.setDoc(
    completionRef(userId, completion.routineId, completion.localDate),
    JSON.parse(JSON.stringify(completion)),
    { merge: false },
  );
}

export async function clearRoutineCompletion(
  userId: string,
  routineId: string,
  localDate: string,
): Promise<void> {
  requireUserId(userId);
  await firestoreAdapter.deleteDoc(completionRef(userId, routineId, localDate));
}

export async function loadRoutineCompletions(
  userId: string,
  startLocalDate: string,
  endLocalDate: string,
): Promise<RoutineCompletion[]> {
  requireUserId(userId);
  const completionQuery = firestoreAdapter.query(
    firestoreAdapter.collection(firestoreAdapter.db, "users", userId, "routineCompletions"),
    firestoreAdapter.where("localDate", ">=", startLocalDate),
    firestoreAdapter.where("localDate", "<=", endLocalDate),
  );
  const snapshot = await firestoreAdapter.getDocs(completionQuery);
  return snapshot.docs
    .map((entry: any) => entry.data())
    .filter(isRoutineCompletionDocument)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
}

