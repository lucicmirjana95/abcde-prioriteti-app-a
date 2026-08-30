import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  AppADailyPlanDocument,
  isAppADailyPlanDocument,
} from "./dailyPlanDocument";

function dailyPlanRef(userId: string, localDate: string) {
  return doc(db, "appAUsers", userId, "dailyResets", localDate);
}

export async function saveConfirmedDailyPlan(
  userId: string,
  document: AppADailyPlanDocument,
): Promise<void> {
  if (!userId) throw new Error("authentication_required");

  const reference = dailyPlanRef(userId, document.localDate);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    transaction.set(
      reference,
      {
        ...document,
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
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
