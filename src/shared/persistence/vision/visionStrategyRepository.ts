import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";
import { isSavedVisionStrategy, type SavedVisionStrategy } from "../../domain/vision";

async function requireUser(userId: string) {
  if (!userId.trim()) throw new Error("authentication_required");
  await auth.authStateReady();
  if (!auth.currentUser || auth.currentUser.uid !== userId) throw new Error("authentication_required");
}

export async function saveVisionStrategy(userId: string, strategy: SavedVisionStrategy) {
  await requireUser(userId);
  if (!isSavedVisionStrategy(strategy)) throw new Error("invalid_vision_strategy");
  await setDoc(doc(db, "users", userId, "visionStrategies", strategy.id), strategy, { merge: false });
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
