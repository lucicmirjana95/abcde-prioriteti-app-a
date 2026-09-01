import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { isSavedVisionStrategy, type SavedVisionStrategy } from "../../domain/vision";

function requireUser(userId: string) {
  if (!userId.trim()) throw new Error("authentication_required");
}

export async function saveVisionStrategy(userId: string, strategy: SavedVisionStrategy) {
  requireUser(userId);
  if (!isSavedVisionStrategy(strategy)) throw new Error("invalid_vision_strategy");
  await setDoc(doc(db, "users", userId, "visionStrategies", strategy.id), strategy, { merge: false });
}

export async function loadVisionStrategies(userId: string): Promise<SavedVisionStrategy[]> {
  requireUser(userId);
  const snapshot = await getDocs(collection(db, "users", userId, "visionStrategies"));
  return snapshot.docs.map((entry) => entry.data()).filter(isSavedVisionStrategy)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
