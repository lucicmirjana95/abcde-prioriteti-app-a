import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";
import { isTodayCandidate, type TodayCandidate } from "../../domain/today-candidates";

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
