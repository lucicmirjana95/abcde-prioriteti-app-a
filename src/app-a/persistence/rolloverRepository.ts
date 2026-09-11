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
  runTransaction,
  arrayUnion,
} from "firebase/firestore";
import { mergePlanAddition } from "./planMutations";
import { db } from "../../lib/firebase";
import { isResetBlocked } from "./resetGuard";
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
import type { AppAInboxItem } from "../domain/inbox/contracts";

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
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
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
  if (decision.status === "scheduled" && decision.scheduledLocalDate) {
    payload.scheduledLocalDate = decision.scheduledLocalDate;
  }

  await setDoc(ref, payload, { merge: true });
}

/**
 * Atomically commits today's updated confirmed plan document AND multiple carried rollover decision documents
 * in a single Firestore runTransaction.
 */
export async function saveDailyPlanWithMultipleRolloverDecisionsAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  decisions: AppARolloverDecision[],
): Promise<AppADailyPlanDocument> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId || !document.localDate) {
    throw new Error("invalid_atomic_write_params");
  }

  return runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) throw new Error("reset_in_progress");
    const planRef = doc(db, "appAUsers", userId, "dailyResets", document.localDate);
    const planSnap = await transaction.get(planRef);

    const currentDoc = planSnap.exists() ? planSnap.data() : null;
    const currentRevision = currentDoc?.revision || 0;

    // Idempotent revision check if updating an existing plan
    const updatedDocument: AppADailyPlanDocument = {
      ...document,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp() as any,
    };

    transaction.set(planRef, JSON.parse(JSON.stringify(updatedDocument)));

    for (const decision of decisions) {
      if (!decision.sourceLocalDate || !decision.sourcePlanItemId) continue;
      const decisionRef_ = rolloverDecisionRef(userId, decision.sourceLocalDate, decision.sourcePlanItemId);
      transaction.set(
        decisionRef_,
        {
          sourceLocalDate: decision.sourceLocalDate,
          sourcePlanItemId: decision.sourcePlanItemId,
          status: decision.status || "carried",
          ...(decision.scheduledLocalDate ? { scheduledLocalDate: decision.scheduledLocalDate } : {}),
          ...(decision.snoozedUntilLocalDate ? { snoozedUntilLocalDate: decision.snoozedUntilLocalDate } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    return updatedDocument;
  });
}

/**
 * Atomically commits today's updated confirmed plan document AND the carried rollover decision document
 * in a single Firestore writeBatch / transaction.
 */
export async function saveDailyPlanWithRolloverDecisionAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  decision: AppARolloverDecision,
): Promise<AppADailyPlanDocument> {
  return saveDailyPlanWithMultipleRolloverDecisionsAtomic(userId, document, [decision]);
}

/**
 * Atomically moves an unfinished rollover candidate to Inbox and records the rollover decision in Firestore.
 */
export async function saveInboxItemWithRolloverDecisionAtomic(
  userId: string,
  inboxItem: AppAInboxItem,
  decision: AppARolloverDecision,
): Promise<void> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId || !inboxItem.id || !decision.sourceLocalDate || !decision.sourcePlanItemId) {
    throw new Error("invalid_atomic_write_params");
  }

  await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) throw new Error("reset_in_progress");
    const inboxRef = doc(db, "appAUsers", userId, "inboxItems", inboxItem.id);
    const decisionRef_ = rolloverDecisionRef(userId, decision.sourceLocalDate, decision.sourcePlanItemId);

    transaction.set(inboxRef, {
      ...inboxItem,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(decisionRef_, {
      sourceLocalDate: decision.sourceLocalDate,
      sourcePlanItemId: decision.sourcePlanItemId,
      status: decision.status || "inbox",
      ...(decision.scheduledLocalDate ? { scheduledLocalDate: decision.scheduledLocalDate } : {}),
      ...(decision.snoozedUntilLocalDate ? { snoozedUntilLocalDate: decision.snoozedUntilLocalDate } : {}),
      updatedAt: serverTimestamp(),
    });
  });
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
          data.status === "dismissed" ||
          data.status === "scheduled" ||
          data.status === "inbox" ||
          data.status === "this_week")
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
          ...(data.scheduledLocalDate
            ? { scheduledLocalDate: data.scheduledLocalDate }
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
 * Handles deduplication across multiple missed days by tracing stable root origins.
 * Unresolved items older than 7 days remain fully accessible and are never arbitrarily dropped.
 */
export function extractUnfinishedCandidatesFromPlans(
  plans: AppADailyPlanDocument[],
  activeLocalDate: string,
  decisions: Record<string, AppARolloverDecision>,
  lookbackDays?: number,
): UnfinishedRolloverCandidate[] {
  const boundaries = lookbackDays
    ? getRolloverLookbackBoundaries(activeLocalDate, lookbackDays)
    : null;

  // Filter plans strictly prior to active local date (and within boundary if explicitly requested)
  const validPlans = plans
    .filter((p) =>
      boundaries
        ? isLocalDateInRolloverWindow(p.localDate, boundaries)
        : p.localDate < activeLocalDate,
    )
    .sort((a, b) => b.localDate.localeCompare(a.localDate)); // newest first

  const candidates: UnfinishedRolloverCandidate[] = [];
  const seenRoots = new Set<string>();
  const seenTitles = new Set<string>();

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

      // Trace root origin if item was carried across multiple missed days
      const rolloverMatch = /^rollover_plan_(\d{4}-\d{2}-\d{2})_(.+)$/.exec(item.id);
      const originalPlanDate = (item as any).originalPlanDate || (rolloverMatch ? rolloverMatch[1] : docData.localDate);
      const originalPlanItemId = (item as any).originalPlanItemId || (rolloverMatch ? rolloverMatch[2] : item.id);
      const rootKey = `${originalPlanDate}:${originalPlanItemId}`;
      const titleKey = item.title.trim().toLowerCase();

      // If we already captured or resolved a newer instance of this task across missed days, skip duplicate
      if (seenRoots.has(rootKey) || seenTitles.has(titleKey)) {
        continue;
      }
      seenRoots.add(rootKey);
      seenTitles.add(titleKey);

      // Check if candidate is eligible according to saved decisions for both local instance and original instance
      if (
        !isCandidateEligibleWithDecisions(
          docData.localDate,
          item.id,
          activeLocalDate,
          decisions,
        ) ||
        !isCandidateEligibleWithDecisions(
          originalPlanDate,
          originalPlanItemId,
          activeLocalDate,
          decisions,
        )
      ) {
        continue;
      }

      const isPastFixed = Boolean(
        item.capacityType === "fixed" ||
        (item as any).timeSensitivity === "fixed_time" ||
        (item as any).scheduledTime
      );

      const isPastDeadline = Boolean(
        item.deadlineIso && item.deadlineIso.slice(0, 10) < activeLocalDate
      );

      const isWaiting = item.sourceItemIds?.some(id => id.includes("waiting")) || (item as any).kind === "waiting_for";

      candidates.push({
        id: item.id,
        sourceLocalDate: docData.localDate,
        originalPlanDate,
        originalPlanItemId,
        title: item.title,
        description: item.description,
        estimatedMinutes: item.estimatedMinutes,
        capacityType: isPastFixed ? "fixed" : "flexible",
        originalBlock: item.block,
        requiredEnergy: item.requiredEnergy,
        timeSensitivity: item.timeSensitivity,
        scheduledTime: undefined, // Fixed obligations never copy old time from past days!
        deadlineText: item.deadlineText,
        deadlineIso: item.deadlineIso,
        isPastDeadline,
        isPastFixedObligation: isPastFixed,
        kind: isWaiting ? "waiting_for" : isPastFixed ? "fixed_obligation" : "task",
        priority: item.priority,
        goalRelationship: item.goalRelationship,
        sourceItemId: item.sourceItemIds?.[0],
        sourceItemIds: item.sourceItemIds,
        reasoning: item.reasoning,
      });
    }
  }

  return candidates;
}

/**
 * Loads unfinished executable items from historical daily plans in App A.
 * Ordered newest first, maintaining accessibility for older unresolved tasks.
 */
export async function loadUnfinishedRolloverCandidates(
  userId: string,
  activeLocalDate: string,
  lookbackDays?: number,
): Promise<UnfinishedRolloverCandidate[]> {
  if (!userId || !activeLocalDate) return [];

  const plansRef = collection(db, "appAUsers", userId, "dailyResets");

  const [plansSnap, decisions] = await Promise.all([
    getDocs(
      query(
        plansRef,
        where("localDate", "<", activeLocalDate),
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
 * and records a terminal decision so it is removed from rollover, committed atomically via runTransaction.
 */
export async function markHistoricalTaskComplete(
  userId: string,
  sourceLocalDate: string,
  sourcePlanItemId: string,
): Promise<void> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId || !sourceLocalDate || !sourcePlanItemId) {
    throw new Error("invalid_mark_complete_params");
  }

  await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) throw new Error("reset_in_progress");
    const planRef = doc(db, "appAUsers", userId, "dailyResets", sourceLocalDate);
    const decisionRef_ = rolloverDecisionRef(userId, sourceLocalDate, sourcePlanItemId);

    const planSnap = await transaction.get(planRef);
    if (planSnap.exists()) {
      const currentCompleted = planSnap.data()?.execution?.completedItemIds || [];
      if (!currentCompleted.includes(sourcePlanItemId)) {
        transaction.update(planRef, {
          "execution.completedItemIds": arrayUnion(sourcePlanItemId),
          updatedAt: serverTimestamp(),
        });
      }
    }

    transaction.set(
      decisionRef_,
      {
        sourceLocalDate,
        sourcePlanItemId,
        status: "carried",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
