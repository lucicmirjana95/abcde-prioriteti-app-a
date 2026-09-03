import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";
import { isSavedVisionStrategy, type SavedVisionStrategy } from "../../domain/vision";

export type VisionPersistenceCategory = "permission_denied" | "unauthenticated" | "unavailable" | "network" | "invalid_data" | "unknown";
export interface VisionPersistenceDiagnostic { stage: "set_doc"; firebaseCode: string; category: VisionPersistenceCategory }

export class VisionPersistenceError extends Error {
  constructor(readonly diagnostic: VisionPersistenceDiagnostic, readonly cause?: unknown) {
    super("vision_strategy_save_failed");
    this.name = "VisionPersistenceError";
  }
}

function safeFirebaseCode(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "unknown") : "unknown";
  return code.replace(/^firestore\//, "").slice(0, 80).replace(/[^a-zA-Z0-9_/-]/g, "_") || "unknown";
}

export function getVisionSaveDiagnostic(error: unknown): VisionPersistenceDiagnostic {
  const firebaseCode = error instanceof VisionPersistenceError ? error.diagnostic.firebaseCode : safeFirebaseCode(error);
  const normalized = firebaseCode.toLowerCase().replace(/_/g, "-");
  const category: VisionPersistenceCategory = normalized.includes("permission-denied") ? "permission_denied"
    : normalized.includes("unauthenticated") || normalized.includes("authentication-required") ? "unauthenticated"
    : normalized.includes("unavailable") ? "unavailable"
    : normalized.includes("network") || normalized.includes("deadline-exceeded") || normalized.includes("timed-out") ? "network"
    : normalized.includes("invalid") || normalized.includes("failed-precondition") ? "invalid_data"
    : "unknown";
  return { stage: "set_doc", firebaseCode, category };
}

async function requireUser(userId: string) {
  if (!userId.trim()) throw Object.assign(new Error("authentication_required"), { code: "auth/unauthenticated" });
  await auth.authStateReady();
  if (!auth.currentUser || auth.currentUser.uid !== userId) throw Object.assign(new Error("authentication_required"), { code: "auth/unauthenticated" });
}

export async function saveVisionStrategy(userId: string, strategy: SavedVisionStrategy) {
  try {
    await requireUser(userId);
    if (!isSavedVisionStrategy(strategy)) throw Object.assign(new Error("invalid_vision_strategy"), { code: "invalid-data" });
    await setDoc(doc(db, "users", userId, "visionStrategies", strategy.id), strategy, { merge: false });
  } catch (error) {
    if (error instanceof VisionPersistenceError) throw error;
    throw new VisionPersistenceError(getVisionSaveDiagnostic(error), error);
  }
}

export async function loadVisionStrategies(userId: string): Promise<SavedVisionStrategy[]> {
  await requireUser(userId);
  const snapshot = await getDocs(collection(db, "users", userId, "visionStrategies"));
  return snapshot.docs.map((entry) => entry.data()).filter(isSavedVisionStrategy)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function setVisionStrategyArchived(
  userId: string,
  strategy: SavedVisionStrategy,
  archived: boolean,
): Promise<SavedVisionStrategy> {
  const now = new Date().toISOString();
  const next: SavedVisionStrategy = {
    ...strategy,
    status: archived ? "archived" : "active",
    ...(archived ? { archivedAt: now } : { archivedAt: undefined }),
    updatedAt: now,
  };
  const safe = JSON.parse(JSON.stringify(next)) as SavedVisionStrategy;
  await saveVisionStrategy(userId, safe);
  return safe;
}

export async function deleteVisionStrategy(userId: string, strategyId: string): Promise<void> {
  await requireUser(userId);
  if (!/^vision_[a-z0-9_]{4,80}$/.test(strategyId)) throw new Error("invalid_vision_strategy_id");
  await deleteDoc(doc(db, "users", userId, "visionStrategies", strategyId));
}
