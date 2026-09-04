import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";
import { createSequencedVisionCandidate, getNextVisionSequenceIndex, isTodayCandidate, type TodayCandidate } from "../../domain/today-candidates";
import { isSavedVisionStrategy, type SavedVisionStrategy } from "../../domain/vision";

async function requireUser(userId: string) {
  if (!userId.trim()) throw new Error("authentication_required");
  await auth.authStateReady();
  if (!auth.currentUser || auth.currentUser.uid !== userId) throw new Error("authentication_required");
}

export async function saveTodayCandidate(userId: string, candidate: TodayCandidate): Promise<void> {
  await requireUser(userId);
  if (!isTodayCandidate(candidate)) throw new Error("invalid_today_candidate");
  await setDoc(doc(db, "users", userId, "todayCandidates", candidate.id), candidate, { merge: false });
}

export async function loadPendingTodayCandidates(userId: string): Promise<TodayCandidate[]> {
  await requireUser(userId);
  const snapshot = await getDocs(collection(db, "users", userId, "todayCandidates"));
  return snapshot.docs.map((entry) => entry.data()).filter(isTodayCandidate)
    .filter((item) => item.status === "pending")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function dismissTodayCandidate(userId: string, candidate: TodayCandidate): Promise<void> {
  await saveTodayCandidate(userId, { ...candidate, status: "dismissed", updatedAt: new Date().toISOString() });
}

export async function markTodayCandidateScheduled(userId: string, candidate: TodayCandidate): Promise<void> {
  await saveTodayCandidate(userId, { ...candidate, status: "scheduled", sequenceIndex: candidate.sequenceIndex ?? 0, updatedAt: new Date().toISOString() });
}

export async function ensurePendingVisionCandidates(userId: string): Promise<void> {
  await requireUser(userId);
  const [strategySnapshot, candidateSnapshot] = await Promise.all([
    getDocs(collection(db, "users", userId, "visionStrategies")),
    getDocs(collection(db, "users", userId, "todayCandidates")),
  ]);
  const candidates = candidateSnapshot.docs.map((entry) => entry.data()).filter(isTodayCandidate);
  const strategies = strategySnapshot.docs.map((entry) => entry.data()).filter(isSavedVisionStrategy);
  const activeStrategyIds = new Set(strategies.filter((entry) => entry.status !== "archived").map((entry) => entry.id));
  const writes: TodayCandidate[] = [];
  const stalePending = candidates.filter((candidate) => candidate.source === "vision" && candidate.status === "pending" && !activeStrategyIds.has(candidate.sourceId));
  for (const candidate of stalePending) {
    await setDoc(doc(db, "users", userId, "todayCandidates", candidate.id), { ...candidate, status: "dismissed", updatedAt: new Date().toISOString() }, { merge: false });
  }
  for (const strategy of strategies.filter((entry) => entry.status !== "archived")) {
    const related = candidates.filter((candidate) => candidate.sourceId === strategy.id);
    const index = getNextVisionSequenceIndex(related, strategy.id);
    if (index === null) continue;
    const next = createSequencedVisionCandidate(strategy, index);
    if (next && !related.some((candidate) => candidate.id === next.id)) writes.push(next);
  }
  for (const candidate of writes) await setDoc(doc(db, "users", userId, "todayCandidates", candidate.id), candidate, { merge: false });
}

export async function saveCompletionAndAdvanceVision(
  userId: string,
  localDate: string,
  completedItemIds: string[],
  candidateId: string,
): Promise<void> {
  await requireUser(userId);
  const candidateRef = doc(db, "users", userId, "todayCandidates", candidateId);
  const candidateSnapshot = await getDoc(candidateRef);
  const candidate = candidateSnapshot.exists() && isTodayCandidate(candidateSnapshot.data()) ? candidateSnapshot.data() : null;
  if (!candidate || candidate.source !== "vision") throw new Error("vision_candidate_not_found");
  const strategyRef = doc(db, "users", userId, "visionStrategies", candidate.sourceId);
  const strategySnapshot = await getDoc(strategyRef);
  const strategy = strategySnapshot.exists() && isSavedVisionStrategy(strategySnapshot.data()) ? strategySnapshot.data() as SavedVisionStrategy : null;
  if (!strategy) throw new Error("vision_strategy_not_found");
  const nextIndex = (candidate.sequenceIndex ?? 0) + 1;
  const nextCandidate = createSequencedVisionCandidate(strategy, nextIndex);
  const batch = writeBatch(db);
  batch.update(doc(db, "appAUsers", userId, "dailyResets", localDate), { "execution.completedItemIds": Array.from(new Set(completedItemIds)), updatedAt: serverTimestamp() });
  batch.set(candidateRef, { ...candidate, status: "completed", sequenceIndex: candidate.sequenceIndex ?? 0, updatedAt: new Date().toISOString() }, { merge: false });
  if (nextCandidate) {
    const nextRef = doc(db, "users", userId, "todayCandidates", nextCandidate.id);
    const nextSnapshot = await getDoc(nextRef);
    if (!nextSnapshot.exists()) batch.set(nextRef, nextCandidate, { merge: false });
  }
  await batch.commit();
}
