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
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  AppADailyPlanDocument,
  isAppADailyPlanDocument,
} from "./dailyPlanDocument";

export type PersistenceDiagnosticCategory =
  | "permission_denied"
  | "unauthenticated"
  | "unavailable"
  | "quota"
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
    return normalized.includes("unavailable") ? "unavailable" : "quota";
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

function dailyPlanRef(userId: string, localDate: string) {
  return doc(db, "appAUsers", userId, "dailyResets", localDate);
}

export async function saveConfirmedDailyPlan(
  userId: string,
  document: AppADailyPlanDocument,
): Promise<void> {
  if (!userId) {
    const diag: PersistenceSaveDiagnostic = {
      stage: "set_doc",
      firebaseCode: "authentication_required",
      category: "unauthenticated",
    };
    throw new AppAPersistenceError(diag);
  }

  const reference = dailyPlanRef(userId, document.localDate);
  try {
    await setDoc(
      reference,
      {
        ...document,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (rawError: unknown) {
    const diagnostic = extractDiagnosticFromSaveError(rawError);
    throw new AppAPersistenceError(diagnostic, rawError);
  }
}

export async function loadConfirmedDailyPlan(
  userId: string,
  localDate: string,
): Promise<AppADailyPlanDocument | null> {
  if (!userId) return null;
  const snapshot = await getDoc(dailyPlanRef(userId, localDate));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return isAppADailyPlanDocument(data) ? data : null;
}

export async function saveDailyPlanCompletion(
  userId: string,
  localDate: string,
  completedItemIds: string[],
): Promise<void> {
  if (!userId) throw new Error("authentication_required");
  await updateDoc(dailyPlanRef(userId, localDate), {
    "execution.completedItemIds": Array.from(new Set(completedItemIds)),
    updatedAt: serverTimestamp(),
  });
}

export async function loadRecentDailyPlans(
  userId: string,
  maximum = 30,
): Promise<AppADailyPlanDocument[]> {
  if (!userId) return [];
  const plansQuery = query(
    collection(db, "appAUsers", userId, "dailyResets"),
    orderBy("localDate", "desc"),
    limit(Math.max(1, Math.min(maximum, 90))),
  );
  const snapshot = await getDocs(plansQuery);
  return snapshot.docs
    .map((item) => item.data())
    .filter(isAppADailyPlanDocument);
}
