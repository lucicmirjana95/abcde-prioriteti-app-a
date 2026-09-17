import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { isResetBlocked } from "./resetGuard";
import { normalizeCompletedItemIds } from '../screens/todayExecution';
import { validatePlanDraft } from '../domain/daily-reset/validation';
import {
  AppADailyPlanDocument,
  isAppADailyPlanDocument,
} from "./dailyPlanDocument";

export type PersistenceDiagnosticCategory =
  | "permission_denied"
  | "unauthenticated"
  | "unavailable"
  | "quota"
  | "quota_exceeded"
  | "invalid_data"
  | "network"
  | "unknown";

export interface PersistenceSaveDiagnostic {
  stage: "set_doc";
  firebaseCode: string;
  category: PersistenceDiagnosticCategory;
}

export class AppAPersistenceError extends Error {
  readonly diagnostic: PersistenceSaveDiagnostic;
  override readonly cause?: unknown;

  constructor(diagnostic: PersistenceSaveDiagnostic, cause?: unknown) {
    super("app_a_persistence_save_failed");
    this.name = "AppAPersistenceError";
    this.diagnostic = diagnostic;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  get category(): PersistenceDiagnosticCategory {
    return this.diagnostic.category;
  }

  get firebaseCode(): string {
    return this.diagnostic.firebaseCode;
  }

  get retryable(): boolean {
    return (
      this.diagnostic.category === "network" ||
      this.diagnostic.category === "unavailable" ||
      this.diagnostic.category === "quota" ||
      this.diagnostic.category === "quota_exceeded"
    );
  }
}

export function mapFirebaseErrorCodeToCategory(
  code: string,
): PersistenceDiagnosticCategory {
  const normalized = code.toLowerCase().trim();
  if (
    normalized.includes("permission-denied") ||
    normalized.includes("permission_denied")
  ) {
    return "permission_denied";
  }
  if (
    normalized.includes("unauthenticated") ||
    normalized.includes("auth-required") ||
    normalized.includes("authentication_required")
  ) {
    return "unauthenticated";
  }
  if (
    normalized.includes("unavailable") ||
    normalized.includes("resource-exhausted") ||
    normalized.includes("quota")
  ) {
    return normalized.includes("unavailable") ? "unavailable" : "quota_exceeded";
  }
  if (
    normalized.includes("invalid-argument") ||
    normalized.includes("failed-precondition") ||
    normalized.includes("out-of-range")
  ) {
    return "invalid_data";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("deadline-exceeded") ||
    normalized.includes("timed-out")
  ) {
    return "network";
  }
  return "unknown";
}

export function extractDiagnosticFromSaveError(
  error: unknown,
): PersistenceSaveDiagnostic {
  if (error instanceof AppAPersistenceError) {
    return error.diagnostic;
  }

  let rawCode = "unknown";
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };
    if (typeof candidate.code === "string" && candidate.code.length > 0) {
      rawCode = candidate.code;
    } else if (
      typeof candidate.message === "string" &&
      candidate.message.startsWith("auth")
    ) {
      rawCode = candidate.message;
    }
  } else if (typeof error === "string") {
    rawCode = error;
  }

  const category = mapFirebaseErrorCodeToCategory(rawCode);
  const sanitizedFirebaseCode =
    rawCode && rawCode.trim().length > 0
      ? rawCode.replace(/[^a-zA-Z0-9_\-\/]/g, "").slice(0, 64) || "unknown"
      : "unknown";

  return {
    stage: "set_doc",
    firebaseCode: sanitizedFirebaseCode,
    category,
  };
}

export function mapFirebaseErrorToAppAPersistenceError(error: unknown): AppAPersistenceError {
  if (error instanceof AppAPersistenceError) return error;
  const diagnostic = extractDiagnosticFromSaveError(error);
  return new AppAPersistenceError(diagnostic, error);
}

function isDemoUser(userId?: string): boolean {
  if (!userId) return false;
  if (userId === "local_dev_user" || userId.startsWith("demo") || userId.startsWith("guest")) return true;
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return userId === "local_dev_user";
  }
  return false;
}

function getLocalPlan(userId: string, localDate: string): AppADailyPlanDocument | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`app-a:plan:${userId}:${localDate}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isAppADailyPlanDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setLocalPlan(userId: string, document: AppADailyPlanDocument): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(`app-a:plan:${userId}:${document.localDate}`, JSON.stringify(document));
  } catch {
    // ignore
  }
}

function dailyPlanRef(userId: string, localDate: string) {
  return doc(db, "appAUsers", userId, "dailyResets", localDate);
}

export async function saveConfirmedDailyPlan(
  userId: string,
  document: AppADailyPlanDocument,
): Promise<AppADailyPlanDocument> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId) {
    const diag: PersistenceSaveDiagnostic = {
      stage: "set_doc",
      firebaseCode: "authentication_required",
      category: "unauthenticated",
    };
    throw new AppAPersistenceError(diag);
  }

  setLocalPlan(userId, document);

  if (isDemoUser(userId)) {
    return document;
  }

  const reference = dailyPlanRef(userId, document.localDate);
  try {
    if (!isAppADailyPlanDocument(document) || !validatePlanDraft(document.plan).valid) throw new Error('invalid_plan');
    return await runTransaction(db, async (transaction) => {
      if (isResetBlocked(userId)) throw new Error("reset_in_progress");
      const snapshot = await transaction.get(reference);
      const current = snapshot.data();
      if (snapshot.exists() && (current?.revision || 0) !== (document.revision || 0)) throw new Error('plan_changed_elsewhere');
      // A stale review must not resurrect a completion undone on another screen/device.
      const completionIds = snapshot.exists() ? current?.execution?.completedItemIds || [] : document.execution?.completedItemIds || [];
      const saved: AppADailyPlanDocument = { ...document, revision: (current?.revision || 0) + 1, execution: { completedItemIds: normalizeCompletedItemIds(document.plan, completionIds) } };
      if (isResetBlocked(userId)) throw new Error("reset_in_progress");
      transaction.set(reference, { ...saved, updatedAt: serverTimestamp() });
      setLocalPlan(userId, saved);
      return saved;
    });
  } catch (rawError: unknown) {
    const diagnostic = extractDiagnosticFromSaveError(rawError);
    if (diagnostic.category === "permission_denied" || diagnostic.category === "unauthenticated") {
      return document;
    }
    throw new AppAPersistenceError(diagnostic, rawError);
  }
}

export async function loadConfirmedDailyPlan(
  userId: string,
  localDate: string,
): Promise<AppADailyPlanDocument | null> {
  if (!userId) return null;
  if (isDemoUser(userId)) {
    return getLocalPlan(userId, localDate);
  }
  try {
    const snapshot = await getDoc(dailyPlanRef(userId, localDate));
    if (!snapshot.exists()) {
      return getLocalPlan(userId, localDate);
    }
    const data = snapshot.data();
    if (isAppADailyPlanDocument(data)) {
      setLocalPlan(userId, data);
      return data;
    }
    return getLocalPlan(userId, localDate);
  } catch (err) {
    const local = getLocalPlan(userId, localDate);
    if (local) return local;
    throw err;
  }
}

export async function saveDailyPlanCompletion(
  userId: string,
  localDate: string,
  completedItemIds: string[],
  change?: { itemId: string; completed: boolean },
): Promise<void> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId) throw new Error("authentication_required");

  const localPlan = getLocalPlan(userId, localDate);
  if (localPlan) {
    const currentCompleted = new Set(localPlan.execution?.completedItemIds || completedItemIds);
    if (change) {
      if (change.completed) currentCompleted.add(change.itemId);
      else currentCompleted.delete(change.itemId);
    }
    localPlan.execution = { completedItemIds: Array.from(currentCompleted) };
    setLocalPlan(userId, localPlan);
  }

  if (isDemoUser(userId)) {
    return;
  }

  try {
    await updateDoc(dailyPlanRef(userId, localDate), {
      "execution.completedItemIds": change ? (change.completed ? arrayUnion(change.itemId) : arrayRemove(change.itemId)) : Array.from(new Set(completedItemIds)),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // If remote fails, local fallback is already preserved
  }
}

export async function loadPlannedRoutineIds(
  userId: string,
  localDate: string,
): Promise<string[]> {
  if (!userId) return [];
  if (isDemoUser(userId)) {
    const local = getLocalPlan(userId, localDate);
    return Array.isArray(local?.plan?.plannedRoutineIds) ? local.plan.plannedRoutineIds : [];
  }
  try {
    const reference = dailyPlanRef(userId, localDate);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      const local = getLocalPlan(userId, localDate);
      return Array.isArray(local?.plan?.plannedRoutineIds) ? local.plan.plannedRoutineIds : [];
    }
    const data = snapshot.data();
    return Array.isArray(data?.plan?.plannedRoutineIds) ? data.plan.plannedRoutineIds : [];
  } catch {
    const local = getLocalPlan(userId, localDate);
    return Array.isArray(local?.plan?.plannedRoutineIds) ? local.plan.plannedRoutineIds : [];
  }
}

export async function saveDailyPlanPlannedRoutines(
  userId: string,
  localDate: string,
  plannedRoutineIds: string[],
): Promise<string[]> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId) throw new Error("authentication_required");
  const reference = dailyPlanRef(userId, localDate);
  const normalized = Array.from(new Set(plannedRoutineIds));

  return await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) {
      throw new Error("reset_in_progress");
    }
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      const initialDoc: AppADailyPlanDocument = {
        schemaVersion: 1,
        localDate,
        timezone: "UTC",
        language: "en",
        status: "confirmed",
        revision: 1,
        checkIn: {},
        plan: {
          classifiedItems: [],
          firstFocus: [],
          laterToday: [],
          ifCapacityRemains: [],
          deferredItems: [],
          longTermIdeas: [],
          nonActionItems: [],
          planRationale: "",
          plannedRequiredMinutes: 0,
          plannedOptionalMinutes: 0,
          plannedRoutineIds: normalized,
        },
        execution: { completedItemIds: [] },
      };
      transaction.set(reference, { ...initialDoc, updatedAt: serverTimestamp() });
      return normalized;
    }

    const current = snapshot.data() as AppADailyPlanDocument;
    const nextRevision = (current.revision || 0) + 1;
    transaction.update(reference, {
      "plan.plannedRoutineIds": normalized,
      revision: nextRevision,
      updatedAt: serverTimestamp(),
    });
    return normalized;
  });
}

export async function addPlannedRoutineForDate(
  userId: string,
  localDate: string,
  routineId: string,
): Promise<string[]> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId) throw new Error("authentication_required");
  if (!routineId || routineId.trim().length === 0) throw new Error("invalid_routine_id");
  const reference = dailyPlanRef(userId, localDate);

  return await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) {
      throw new Error("reset_in_progress");
    }
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      const nextPlanned = [routineId];
      const initialDoc: AppADailyPlanDocument = {
        schemaVersion: 1,
        localDate,
        timezone: "UTC",
        language: "en",
        status: "confirmed",
        revision: 1,
        checkIn: {},
        plan: {
          classifiedItems: [],
          firstFocus: [],
          laterToday: [],
          ifCapacityRemains: [],
          deferredItems: [],
          longTermIdeas: [],
          nonActionItems: [],
          planRationale: "",
          plannedRequiredMinutes: 0,
          plannedOptionalMinutes: 0,
          plannedRoutineIds: nextPlanned,
        },
        execution: { completedItemIds: [] },
      };
      transaction.set(reference, { ...initialDoc, updatedAt: serverTimestamp() });
      return nextPlanned;
    }

    const current = snapshot.data() as AppADailyPlanDocument;
    const currentList: string[] = Array.isArray(current?.plan?.plannedRoutineIds)
      ? current.plan.plannedRoutineIds
      : [];

    if (currentList.includes(routineId)) {
      return currentList; // Idempotent: already present
    }

    const nextPlanned = Array.from(new Set([...currentList, routineId]));
    const nextRevision = (current?.revision || 0) + 1;
    transaction.update(reference, {
      "plan.plannedRoutineIds": nextPlanned,
      revision: nextRevision,
      updatedAt: serverTimestamp(),
    });
    return nextPlanned;
  });
}

export async function removePlannedRoutineForDate(
  userId: string,
  localDate: string,
  routineId: string,
): Promise<string[]> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId) throw new Error("authentication_required");
  if (!routineId || routineId.trim().length === 0) throw new Error("invalid_routine_id");
  const reference = dailyPlanRef(userId, localDate);

  return await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) {
      throw new Error("reset_in_progress");
    }
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      return [];
    }

    const current = snapshot.data() as AppADailyPlanDocument;
    const currentList: string[] = Array.isArray(current?.plan?.plannedRoutineIds)
      ? current.plan.plannedRoutineIds
      : [];

    if (!currentList.includes(routineId)) {
      return currentList; // Idempotent: not present
    }

    const nextPlanned = currentList.filter((id) => id !== routineId);
    const nextRevision = (current?.revision || 0) + 1;
    transaction.update(reference, {
      "plan.plannedRoutineIds": nextPlanned,
      revision: nextRevision,
      updatedAt: serverTimestamp(),
    });
    return nextPlanned;
  });
}

export async function togglePlannedRoutineForDate(
  userId: string,
  localDate: string,
  routineId: string,
  planned: boolean,
): Promise<string[]> {
  if (planned) {
    return addPlannedRoutineForDate(userId, localDate, routineId);
  } else {
    return removePlannedRoutineForDate(userId, localDate, routineId);
  }
}

export function loadGuestDailyPlans(maximum = 30): AppADailyPlanDocument[] {
  const storage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : typeof localStorage !== "undefined"
      ? localStorage
      : null;
  if (!storage) return [];
  const plans: AppADailyPlanDocument[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith("app_a_guest_daily_plan_")) {
        const raw = storage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isAppADailyPlanDocument(parsed)) {
            plans.push(parsed);
          }
        }
      }
    }
  } catch {
    // Ignore localStorage access failures
  }
  return plans.sort((a, b) => b.localDate.localeCompare(a.localDate)).slice(0, maximum);
}

export async function loadRecentDailyPlans(
  userId: string,
  maximum = 30,
): Promise<AppADailyPlanDocument[]> {
  const guestPlans = loadGuestDailyPlans(maximum);
  const isGuestOrLocal = !userId || userId.includes("guest") || userId.includes("local") || userId.includes("dev");
  if (isGuestOrLocal) {
    return guestPlans;
  }
  try {
    const plansQuery = query(
      collection(db, "appAUsers", userId, "dailyResets"),
      orderBy("localDate", "desc"),
      limit(Math.max(1, Math.min(maximum, 90))),
    );
    const snapshot = await getDocs(plansQuery);
    const remotePlans = snapshot.docs
      .map((item) => item.data())
      .filter(isAppADailyPlanDocument);

    if (remotePlans.length === 0 && guestPlans.length > 0) {
      return guestPlans;
    }

    const dates = new Set(remotePlans.map((p) => p.localDate));
    for (const gp of guestPlans) {
      if (!dates.has(gp.localDate)) {
        remotePlans.push(gp);
        dates.add(gp.localDate);
      }
    }
    return remotePlans.sort((a, b) => b.localDate.localeCompare(a.localDate)).slice(0, maximum);
  } catch {
    return guestPlans;
  }
}
