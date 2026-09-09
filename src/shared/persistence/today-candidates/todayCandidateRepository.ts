import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";
import { createSequencedVisionCandidate, getVisionStepSequence, nextVisionCandidate, visionStepKey, isTodayCandidate, type TodayCandidate } from "../../domain/today-candidates";
import type { AppADailyPlanDocument } from '../../../app-a/persistence/dailyPlanDocument';
import { mergePlanAddition } from '../../../app-a/persistence/planMutations';
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
  const [snapshot, strategies, userSnapshot] = await Promise.all([getDocs(collection(db, "users", userId, "todayCandidates")), getDocs(collection(db, "users", userId, "visionStrategies")), getDoc(doc(db, "users", userId))]);
  const active = new Set(strategies.docs.map(entry => entry.data()).filter(isSavedVisionStrategy).filter(item => item.status !== 'archived').map(item => item.id));
  const focusId = typeof userSnapshot.data()?.currentVisionId === "string" ? userSnapshot.data()!.currentVisionId : null;
  return snapshot.docs.map((entry) => entry.data()).filter(isTodayCandidate)
    .filter((item) => item.status === "pending" && active.has(item.sourceId))
    .map((item) => ({ ...item, isCurrentFocus: item.sourceId === focusId }))
    .sort((a, b) => Number(b.sourceId === focusId) - Number(a.sourceId === focusId) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function dismissTodayCandidate(userId: string, candidate: TodayCandidate): Promise<void> {
  await requireUser(userId);
  if (!isTodayCandidate(candidate)) throw new Error('invalid_today_candidate');
  await runTransaction(db, async transaction => {
    const reference = doc(db, 'users', userId, 'todayCandidates', candidate.id);
    const snapshot = await transaction.get(reference);
    const current = snapshot.data();
    if (!isTodayCandidate(current) || current.status !== 'pending') throw new Error('candidate_unavailable');
    transaction.set(reference, { ...current, status: 'dismissed', updatedAt: new Date().toISOString() });
  });
}

export async function markTodayCandidateScheduled(userId: string, candidate: TodayCandidate): Promise<void> {
  await requireUser(userId);
  if (!isTodayCandidate(candidate)) throw new Error('invalid_today_candidate');
  await runTransaction(db, async transaction => {
    const reference = doc(db, 'users', userId, 'todayCandidates', candidate.id);
    const snapshot = await transaction.get(reference);
    const current = snapshot.data();
    if (!isTodayCandidate(current) || (current.status !== 'pending' && current.status !== 'scheduled')) throw new Error('candidate_unavailable');
    transaction.set(reference, { ...current, status: 'scheduled', sequenceIndex: current.sequenceIndex ?? 0, updatedAt: new Date().toISOString() });
  });
}

export async function ensurePendingVisionCandidates(userId: string): Promise<void> {
  await requireUser(userId);
  const [strategySnapshot, candidateSnapshot] = await Promise.all([
    getDocs(collection(db, "users", userId, "visionStrategies")),
    getDocs(collection(db, "users", userId, "todayCandidates")),
  ]);
  const candidates = candidateSnapshot.docs.map((entry) => entry.data()).filter(isTodayCandidate);
  const strategies = strategySnapshot.docs.map((entry) => entry.data()).filter(isSavedVisionStrategy);
  for (const strategy of strategies.filter(entry => entry.status !== 'archived')) {
    const relatedRefs = candidates.filter(candidate => candidate.sourceId === strategy.id);
    await runTransaction(db, async transaction => {
      const latestStrategy = await transaction.get(doc(db, 'users', userId, 'visionStrategies', strategy.id));
      const current = latestStrategy.data();
      if (!isSavedVisionStrategy(current) || current.status === 'archived') return;
      const related = [];
      for (const previous of relatedRefs) {
        const snapshot = await transaction.get(doc(db, 'users', userId, 'todayCandidates', previous.id));
        if (isTodayCandidate(snapshot.data())) related.push(snapshot.data() as TodayCandidate);
      }
      const leafKeys = new Set(getVisionStepSequence(current).map(visionStepKey));
      const obsolete = related.filter(item => item.status === 'pending' && (item.stepKey || item.sequenceIndex !== undefined) && !leafKeys.has(visionStepKey(item.title)));
      const suggestion = nextVisionCandidate(current, related.filter(item => !obsolete.includes(item)));
      const ref = suggestion ? doc(db, 'users', userId, 'todayCandidates', suggestion.id) : null;
      const existing = ref ? await transaction.get(ref) : null;
      for (const item of obsolete) transaction.delete(doc(db, 'users', userId, 'todayCandidates', item.id));
      if (ref && suggestion && !existing?.exists()) transaction.set(ref, suggestion);
    });
  }
}

export async function saveCompletionAndAdvanceVision(
  userId: string,
  localDate: string,
  completedItemIds: string[],
  candidateId: string,
  completed = true,
): Promise<void> {
  await requireUser(userId);
  await runTransaction(db, async (transaction) => {
  const planRef = doc(db, 'appAUsers', userId, 'dailyResets', localDate);
  const planSnapshot = await transaction.get(planRef);
  if (!planSnapshot.exists()) throw new Error('daily_plan_not_found');
  const candidateRef = doc(db, "users", userId, "todayCandidates", candidateId);
  const candidateSnapshot = await transaction.get(candidateRef);
  const data = candidateSnapshot.data();
  const candidate = isTodayCandidate(data) ? data : null;
  const strategySnapshot = candidate ? await transaction.get(doc(db, "users", userId, "visionStrategies", candidate.sourceId)) : null;
  const strategyData = strategySnapshot?.data();
  const strategy = isSavedVisionStrategy(strategyData) ? strategyData : null;
  const currentIndex = strategy && candidate ? getVisionStepSequence(strategy).findIndex((title) => visionStepKey(title) === visionStepKey(candidate.title)) : -1;
  const nextCandidate = strategy && currentIndex >= 0 && strategy.status !== 'archived' ? createSequencedVisionCandidate(strategy, currentIndex + 1) : null;
  if (!completed && nextCandidate) {
    const nextRef = doc(db, "users", userId, "todayCandidates", nextCandidate.id);
    const nextSnapshot = await transaction.get(nextRef);
    if (nextSnapshot.data()?.status === 'pending') transaction.delete(nextRef);
  }
  const itemId = `vision_plan_${candidateId}`;
  const latest = new Set<string>(planSnapshot.data().execution?.completedItemIds || []);
  if (completed) latest.add(itemId); else latest.delete(itemId);
  transaction.update(planRef, { 'execution.completedItemIds': [...latest], updatedAt: serverTimestamp() });
  if (candidate) transaction.set(candidateRef, { ...candidate, status: completed ? 'completed' : 'scheduled', updatedAt: new Date().toISOString() });
  });
}

export async function savePlanAndScheduleVisionAtomic(userId: string, document: AppADailyPlanDocument, candidate: TodayCandidate): Promise<AppADailyPlanDocument> {
  await requireUser(userId);
  if (!isTodayCandidate(candidate) || candidate.estimatedMinutes <= 0) throw new Error('invalid_today_candidate');
  return runTransaction(db, async (transaction) => {
    const planRef = doc(db, 'appAUsers', userId, 'dailyResets', document.localDate);
    const candidateRef = doc(db, 'users', userId, 'todayCandidates', candidate.id);
    const current = await transaction.get(planRef);
    const source = await transaction.get(candidateRef);
    const sourceCandidate = source.data();
    if (!isTodayCandidate(sourceCandidate) || sourceCandidate.status === 'dismissed' || sourceCandidate.status === 'completed') throw new Error('candidate_unavailable');
    const existingPlan = current.data()?.plan;
    const alreadyAdded = [...(existingPlan?.firstFocus || []), ...(existingPlan?.laterToday || [])].some(item => item.id === `vision_plan_${candidate.id}`);
    if (sourceCandidate.status === 'scheduled' && !alreadyAdded) throw new Error('already_scheduled');
    const merged = mergePlanAddition(current.data(), document, `vision_plan_${candidate.id}`);
    transaction.set(planRef, { ...merged, updatedAt: serverTimestamp() });
    transaction.set(candidateRef, { ...sourceCandidate, estimatedMinutes: candidate.estimatedMinutes, status: 'scheduled', updatedAt: new Date().toISOString() });
    return merged;
  });
}
