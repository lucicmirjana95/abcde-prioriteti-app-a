import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  AppADailyPlanDocument,
  isAppADailyPlanDocument,
} from "./dailyPlanDocument";
import {
  loadConfirmedDailyPlan,
} from "./dailyPlanRepository";
import {
  AppARolloverDecision,
  getRolloverDecisionId,
  getRolloverLookbackBoundaries,
  isCandidateEligibleWithDecisions,
  isLocalDateInRolloverWindow,
  UnfinishedRolloverCandidate,
} from "../domain/rollover/contracts";

export function rolloverDecisionRef(
  userId: string,
  sourceLocalDate: string,
  sourcePlanItemId: string,
) {
  const decisionId = getRolloverDecisionId(sourceLocalDate, sourcePlanItemId);
  return doc(db, "appAUsers", userId, "rolloverDecisions", decisionId);
}

export function rolloverDecisionCollection(userId: string) {
  return collection(db, "appAUsers", userId, "rolloverDecisions");
}

export async function saveRolloverDecision(
  userId: string,
  decision: AppARolloverDecision,
): Promise<void> {
  if (!userId || !decision.sourceLocalDate || !decision.sourcePlanItemId) {
    throw new Error("invalid_rollover_decision_params");
  }

  const ref = rolloverDecisionRef(
    userId,
    decision.sourceLocalDate,
    decision.sourcePlanItemId,
  );

  const payload: Record<string, unknown> = {
    sourceLocalDate: decision.sourceLocalDate,
    sourcePlanItemId: decision.sourcePlanItemId,
    status: decision.status,
    updatedAt: serverTimestamp(),
  };

  if (decision.status === "snoozed" && decision.snoozedUntilLocalDate) {
    payload.snoozedUntilLocalDate = decision.snoozedUntilLocalDate;
  }

  await setDoc(ref, payload, { merge: true });
}

/**
 * Atomically commits today's updated confirmed plan document AND the carried rollover decision document
 * in a single Firestore writeBatch.
 */
export async function saveDailyPlanWithRolloverDecisionAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  decision: AppARolloverDecision,
): Promise<void> {
  if (!userId || !document.localDate || !decision.sourceLocalDate || !decision.sourcePlanItemId) {
    throw new Error("invalid_atomic_write_params");
  }

  const batch = writeBatch(db);

  // 1. Today's daily plan document
  const planRef = doc(db, "appAUsers", userId, "dailyResets", document.localDate);
  batch.set(
    planRef,
    {
      ...document,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // 2. Carried rollover decision document
  const decisionRef_ = rolloverDecisionRef(
    userId,
    decision.sourceLocalDate,
    decision.sourcePlanItemId,
  );
  const decisionPayload: Record<string, unknown> = {
    sourceLocalDate: decision.sourceLocalDate,
    sourcePlanItemId: decision.sourcePlanItemId,
    status: decision.status,
    updatedAt: serverTimestamp(),
  };
  if (decision.status === "snoozed" && decision.snoozedUntilLocalDate) {
    decisionPayload.snoozedUntilLocalDate = decision.snoozedUntilLocalDate;
  }
  batch.set(decisionRef_, decisionPayload, { merge: true });

  await batch.commit();
}

export async function loadRolloverDecisions(
  userId: string,
): Promise<Record<string, AppARolloverDecision>> {
  if (!userId) return {};

  try {
    const colRef = rolloverDecisionCollection(userId);
    const snap = await getDocs(colRef);
    const map: Record<string, AppARolloverDecision> = {};

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data &&
        typeof data.sourceLocalDate === "string" &&
        typeof data.sourcePlanItemId === "string" &&
        (data.status === "carried" ||
          data.status === "snoozed" ||
          data.status === "dismissed")
      ) {
        const id = getRolloverDecisionId(
          data.sourceLocalDate,
          data.sourcePlanItemId,
        );
        map[id] = {
          sourceLocalDate: data.sourceLocalDate,
          sourcePlanItemId: data.sourcePlanItemId,
          status: data.status,
          ...(data.snoozedUntilLocalDate
            ? { snoozedUntilLocalDate: data.snoozedUntilLocalDate }
            : {}),
          updatedAt: data.updatedAt,
        };
      }
    });

    return map;
  } catch (error) {
    console.error("loadRolloverDecisions failed:", error);
    return {};
  }
}

/**
 * Extracts unfinished candidates from a set of daily plan documents and decisions.
 * Pure logic usable for both live Firestore docs and deterministic test fixtures.
 */
export function extractUnfinishedCandidatesFromPlans(
  plans: AppADailyPlanDocument[],
  activeLocalDate: string,
  decisions: Record<string, AppARolloverDecision>,
  lookbackDays = 7,
): UnfinishedRolloverCandidate[] {
  const boundaries = getRolloverLookbackBoundaries(activeLocalDate, lookbackDays);

  // Filter plans strictly within the 7-calendar-day lookback window (lower & upper boundaries)
  const validPlans = plans
    .filter((p) => isLocalDateInRolloverWindow(p.localDate, boundaries))
    .sort((a, b) => b.localDate.localeCompare(a.localDate)); // newest first

  const candidates: UnfinishedRolloverCandidate[] = [];

  for (const docData of validPlans) {
    const completedSet = new Set(docData.execution?.completedItemIds || []);
    const items = [
      ...docData.plan.firstFocus,
      ...docData.plan.laterToday,
      ...docData.plan.ifCapacityRemains,
    ];

    for (const item of items) {
      if (!item || !item.id || !item.title?.trim() || !item.estimatedMinutes) {
        continue;
      }
      // Skip completed items
      if (completedSet.has(item.id)) {
        continue;
      }

      // Check if candidate is eligible according to saved decisions
      if (
        !isCandidateEligibleWithDecisions(
          docData.localDate,
          item.id,
          activeLocalDate,
          decisions,
        )
      ) {
        continue;
      }

      candidates.push({
        id: item.id,
        sourceLocalDate: docData.localDate,
        title: item.title,
        description: item.description,
        estimatedMinutes: item.estimatedMinutes,
        originalBlock: item.block,
        requiredEnergy: item.requiredEnergy,
        timeSensitivity: item.timeSensitivity,
        deadlineText: item.deadlineText,
        deadlineIso: item.deadlineIso,
        priority: item.priority,
        goalRelationship: item.goalRelationship,
        reasoning: item.reasoning,
      });
    }
  }

  return candidates;
}

/**
 * Loads unfinished executable items from the previous 7 calendar days in App A.
 * Strictly enforces lower and upper date boundaries:
 *   localDate >= earliestAllowedDate
 *   localDate < activeLocalDate
 * Ordered newest first.
 */
export async function loadUnfinishedRolloverCandidates(
  userId: string,
  activeLocalDate: string,
  lookbackDays = 7,
): Promise<UnfinishedRolloverCandidate[]> {
  if (!userId || !activeLocalDate) return [];

  const boundaries = getRolloverLookbackBoundaries(activeLocalDate, lookbackDays);
  const plansRef = collection(db, "appAUsers", userId, "dailyResets");

  const [plansSnap, decisions] = await Promise.all([
    getDocs(
      query(
        plansRef,
        where("localDate", ">=", boundaries.earliestAllowedDate),
        where("localDate", "<", boundaries.activeLocalDate),
        orderBy("localDate", "desc"),
      ),
    ).catch((err) => {
      console.error("Failed to query rollover candidate dailyResets:", err);
      return null;
    }),
    loadRolloverDecisions(userId),
  ]);

  if (!plansSnap) return [];

  const validDocs: AppADailyPlanDocument[] = [];
  plansSnap.forEach((snap) => {
    const data = snap.data();
    if (isAppADailyPlanDocument(data)) {
      validDocs.push(data);
    }
  });

  return extractUnfinishedCandidatesFromPlans(
    validDocs,
    activeLocalDate,
    decisions,
    lookbackDays,
  );
}

/**
 * Retroactively marks a task complete on its historical daily plan document
 * and records a terminal decision so it is removed from rollover, committed atomically via writeBatch.
 */
export async function markHistoricalTaskComplete(
  userId: string,
  sourceLocalDate: string,
  sourcePlanItemId: string,
): Promise<void> {
  if (!userId || !sourceLocalDate || !sourcePlanItemId) {
    throw new Error("invalid_mark_complete_params");
  }

  const sourcePlan = await loadConfirmedDailyPlan(userId, sourceLocalDate);
  const batch = writeBatch(db);

  if (sourcePlan) {
    const existing = sourcePlan.execution?.completedItemIds || [];
    const nextCompleted = Array.from(new Set([...existing, sourcePlanItemId]));
    const planRef = doc(db, "appAUsers", userId, "dailyResets", sourceLocalDate);
    batch.update(planRef, {
      "execution.completedItemIds": nextCompleted,
      updatedAt: serverTimestamp(),
    });
  }

  const decisionRef_ = rolloverDecisionRef(userId, sourceLocalDate, sourcePlanItemId);
  batch.set(
    decisionRef_,
    {
      sourceLocalDate,
      sourcePlanItemId,
      status: "carried",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}
