import { collection, doc, getDoc, getDocs, runTransaction } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";
import { isSavedVisionStrategy, type SavedVisionStrategy } from "../../domain/vision";
import { isResetBlocked } from "../../../app-a/persistence/resetGuard";

export type VisionPersistenceCategory = "permission_denied" | "unauthenticated" | "unavailable" | "network" | "invalid_data" | "version_conflict" | "unknown";
export interface VisionPersistenceDiagnostic { stage: "set_doc"; firebaseCode: string; category: VisionPersistenceCategory }

export class VisionPersistenceError extends Error {
  constructor(readonly diagnostic: VisionPersistenceDiagnostic, readonly cause?: unknown) {
    super(diagnostic.category === "version_conflict" ? "vision_changed_elsewhere" : "vision_strategy_save_failed");
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
  const rawMsg = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message || "") : "";
  const isConflict = normalized.includes("vision-changed-elsewhere") || rawMsg === "vision_changed_elsewhere";
  const category: VisionPersistenceCategory = isConflict ? "version_conflict"
    : normalized.includes("permission-denied") ? "permission_denied"
    : normalized.includes("unauthenticated") || normalized.includes("authentication-required") ? "unauthenticated"
    : normalized.includes("unavailable") ? "unavailable"
    : normalized.includes("network") || normalized.includes("deadline-exceeded") || normalized.includes("timed-out") ? "network"
    : normalized.includes("invalid") || normalized.includes("failed-precondition") ? "invalid_data"
    : "unknown";
  return { stage: "set_doc", firebaseCode: isConflict ? "vision_changed_elsewhere" : firebaseCode, category };
}

export type VisionRevisionCheckResult =
  | { valid: true; nextRevision: number }
  | { valid: false; error: "vision_changed_elsewhere" | "vision_deleted"; existingRevision?: number; incomingRevision?: number };

export function checkVisionStrategyRevision(
  existingDoc: { revision?: number; deleted?: boolean } | null | undefined,
  incomingStrategy: SavedVisionStrategy
): VisionRevisionCheckResult {
  if (existingDoc?.deleted === true) {
    return { valid: false, error: "vision_deleted" };
  }
  if (!existingDoc) {
    return {
      valid: true,
      nextRevision: typeof incomingStrategy.revision === "number" && incomingStrategy.revision > 0 ? incomingStrategy.revision : 1,
    };
  }
  const existingRevision = typeof existingDoc.revision === "number" ? existingDoc.revision : 0;
  const incomingRevision = typeof incomingStrategy.revision === "number" ? incomingStrategy.revision : 0;
  if (existingRevision !== incomingRevision) {
    return { valid: false, error: "vision_changed_elsewhere", existingRevision, incomingRevision };
  }
  return { valid: true, nextRevision: existingRevision + 1 };
}

async function requireUser(userId: string) {
  if (isResetBlocked(userId)) {
    throw Object.assign(new Error("reset_in_progress"), { code: "failed-precondition" });
  }
  if (!userId.trim()) throw Object.assign(new Error("authentication_required"), { code: "auth/unauthenticated" });
  await auth.authStateReady();
  if (!auth.currentUser || auth.currentUser.uid !== userId) throw Object.assign(new Error("authentication_required"), { code: "auth/unauthenticated" });
}

export async function saveVisionStrategy(
  userId: string,
  strategy: SavedVisionStrategy,
): Promise<SavedVisionStrategy> {
  try {
    await requireUser(userId);
    if (!isSavedVisionStrategy(strategy)) throw Object.assign(new Error("invalid_vision_strategy"), { code: "invalid-data" });
    const reference = doc(db, "users", userId, "visionStrategies", strategy.id);
    let nextRevision = 1;
    const now = new Date().toISOString();
    await runTransaction(db, async transaction => {
      const existing = await transaction.get(reference);
      const existingData = existing.data() as { revision?: number; deleted?: boolean } | undefined;
      const revisionCheck = checkVisionStrategyRevision(existingData, strategy);
      if (revisionCheck.valid === false) {
        const failure = revisionCheck;
        if (failure.error === "vision_deleted") {
          throw Object.assign(new Error("vision_deleted"), { code: "failed-precondition" });
        }
        throw Object.assign(new Error("vision_changed_elsewhere"), {
          code: "vision_changed_elsewhere",
          existingRevision: failure.existingRevision,
          expectedRevision: failure.incomingRevision,
        });
      }
      nextRevision = revisionCheck.nextRevision;
      const documentToSave: SavedVisionStrategy = {
        ...strategy,
        revision: nextRevision,
        updatedAt: now,
      };
      transaction.set(reference, JSON.parse(JSON.stringify(documentToSave)));
    });

    return {
      ...strategy,
      revision: nextRevision,
      updatedAt: now,
    };
  } catch (error) {
    if (error instanceof VisionPersistenceError) throw error;
    throw new VisionPersistenceError(getVisionSaveDiagnostic(error), error);
  }
}

export async function loadVisionStrategies(userId: string): Promise<SavedVisionStrategy[]> {
  return (await loadVisionLibrary(userId)).strategies;
}

export async function loadCurrentVisionId(userId: string): Promise<string | null> {
  await requireUser(userId);
  const snapshot = await getDoc(doc(db, "users", userId));
  const value = snapshot.data()?.currentVisionId;
  return typeof value === "string" && /^vision_[a-z0-9_]{4,80}$/.test(value) ? value : null;
}

export async function setCurrentVisionId(userId: string, strategyId: string | null): Promise<void> {
  await requireUser(userId);
  if (strategyId !== null && !/^vision_[a-z0-9_]{4,80}$/.test(strategyId)) throw new Error("invalid_vision_strategy_id");
  const userReference = doc(db, "users", userId);
  await runTransaction(db, async transaction => {
    if (strategyId) {
      const strategySnapshot = await transaction.get(doc(db, "users", userId, "visionStrategies", strategyId));
      const strategy = strategySnapshot.data();
      if (!isSavedVisionStrategy(strategy) || strategy.status === "archived") throw new Error("vision_focus_unavailable");
    }
    transaction.set(userReference, { currentVisionId: strategyId }, { merge: true });
  });
}

export async function visionIdeaFingerprint(idea: string): Promise<string> {
  const bytes = new TextEncoder().encode(idea.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' '));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadVisionLibrary(userId: string): Promise<{ strategies: SavedVisionStrategy[]; deletedFingerprints: string[] }> {
  await requireUser(userId);
  const snapshot = await getDocs(collection(db, "users", userId, "visionStrategies"));
  const documents = snapshot.docs.map(entry => entry.data());
  return {
    strategies: documents.filter(isSavedVisionStrategy).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    deletedFingerprints: documents.filter(entry => entry.deleted === true && typeof entry.ideaFingerprint === 'string' && /^[a-f0-9]{64}$/.test(entry.ideaFingerprint)).map(entry => entry.ideaFingerprint),
  };
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
  const reference = doc(db, "users", userId, "visionStrategies", strategyId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.data();
    if (!snapshot.exists() || current?.deleted === true) return;
    if (!isSavedVisionStrategy(current)) throw new Error('invalid_vision_strategy');
    const ideaFingerprint = await visionIdeaFingerprint(current.idea);
    // Retain no goal, strategy, answers or breakdown text in the deletion marker.
    transaction.set(reference, { id: strategyId, deleted: true, ideaFingerprint });
  });
}
