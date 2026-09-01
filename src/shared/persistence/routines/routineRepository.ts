import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { RoutineCompletion, SharedRoutine } from "../../domain/routines";
import {
  getRoutineCompletionDocumentId,
  validateRoutineCompletion,
  validateSharedRoutine,
} from "../../domain/routines";
import {
  isRoutineCompletionDocument,
  isRoutineDocument,
} from "./routineDocument";

function requireUserId(userId: string): void {
  if (!userId.trim()) throw new Error("authentication_required");
}

function routineRef(userId: string, routineId: string) {
  return doc(db, "users", userId, "routines", routineId);
}

function completionRef(userId: string, routineId: string, localDate: string) {
  return doc(
    db,
    "users",
    userId,
    "routineCompletions",
    getRoutineCompletionDocumentId(routineId, localDate),
  );
}

export async function saveRoutine(userId: string, routine: SharedRoutine): Promise<void> {
  requireUserId(userId);
  const validation = validateSharedRoutine(routine);
  if (!validation.valid) throw new Error(`invalid_routine:${validation.errors.join(",")}`);
  await setDoc(routineRef(userId, routine.id), routine, { merge: false });
}

export async function loadRoutines(userId: string): Promise<SharedRoutine[]> {
  requireUserId(userId);
  const snapshot = await getDocs(collection(db, "users", userId, "routines"));
  return snapshot.docs
    .map((entry) => entry.data())
    .filter(isRoutineDocument)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export async function loadActiveRoutines(userId: string): Promise<SharedRoutine[]> {
  const routines = await loadRoutines(userId);
  return routines.filter((routine) => routine.status === "active");
}

export async function recordRoutineCompletion(
  userId: string,
  completion: RoutineCompletion,
): Promise<void> {
  requireUserId(userId);
  const validation = validateRoutineCompletion(completion);
  if (!validation.valid) throw new Error(`invalid_completion:${validation.errors.join(",")}`);
  await setDoc(
    completionRef(userId, completion.routineId, completion.localDate),
    completion,
    { merge: false },
  );
}

export async function clearRoutineCompletion(
  userId: string,
  routineId: string,
  localDate: string,
): Promise<void> {
  requireUserId(userId);
  await deleteDoc(completionRef(userId, routineId, localDate));
}

export async function loadRoutineCompletions(
  userId: string,
  startLocalDate: string,
  endLocalDate: string,
): Promise<RoutineCompletion[]> {
  requireUserId(userId);
  const completionQuery = query(
    collection(db, "users", userId, "routineCompletions"),
    where("localDate", ">=", startLocalDate),
    where("localDate", "<=", endLocalDate),
  );
  const snapshot = await getDocs(completionQuery);
  return snapshot.docs
    .map((entry) => entry.data())
    .filter(isRoutineCompletionDocument)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
}

export async function updateRoutineStatus(
  userId: string,
  routine: SharedRoutine,
  status: SharedRoutine["status"],
  nowIso: string,
): Promise<SharedRoutine> {
  const updated: SharedRoutine = {
    ...routine,
    status,
    updatedAt: nowIso,
    pausedAt: status === "paused" ? nowIso : undefined,
    archivedAt: status === "archived" ? nowIso : undefined,
  };
  await saveRoutine(userId, updated);
  return updated;
}

