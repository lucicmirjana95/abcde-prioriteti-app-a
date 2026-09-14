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
  AppADailyPlanDocumentWrite,
  isAppADailyPlanDocument,
  isValidUpdatedAt,
} from "./dailyPlanDocument";
import {
  loadConfirmedDailyPlan,
} from "./dailyPlanRepository";
import {
  AppARolloverDecision,
  CanonicalRolloverDecisionStatus,
  getCanonicalRootIdentity,
  getRolloverDecisionId,
  getRolloverLookbackBoundaries,
  isCandidateEligibleWithDecisions,
  isLocalDateInRolloverWindow,
  normalizeRolloverDecisionStatus,
  resolveEffectiveRolloverDecision,
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

  const norm = normalizeRolloverDecisionStatus(decision.status);
  if (norm.kind === "unsupported") {
    throw new Error(`unsupported_rollover_decision_status: ${norm.rawStatus}`);
  }
  const canonicalStatus = norm.status;

  const root = getCanonicalRootIdentity({
    id: decision.sourcePlanItemId,
    sourceLocalDate: decision.sourceLocalDate,
    sourcePlanItemId: decision.sourcePlanItemId,
    originalPlanDate: decision.originalPlanDate,
    originalPlanItemId: decision.originalPlanItemId,
  });

  const canonicalDate = root.resolved
    ? root.rootLocalDate
    : decision.originalPlanDate || decision.sourceLocalDate;
  const canonicalItemId = root.resolved
    ? root.rootPlanItemId
    : decision.originalPlanItemId || decision.sourcePlanItemId;

  const ref = rolloverDecisionRef(userId, canonicalDate, canonicalItemId);

  const payload: Record<string, unknown> = {
    sourceLocalDate: decision.sourceLocalDate,
    sourcePlanItemId: decision.sourcePlanItemId,
    originalPlanDate: canonicalDate,
    originalPlanItemId: canonicalItemId,
    status: canonicalStatus,
    updatedAt: serverTimestamp(),
  };

  if (canonicalStatus === "snoozed" && decision.snoozedUntilLocalDate) {
    payload.snoozedUntilLocalDate = decision.snoozedUntilLocalDate;
  }
  if (canonicalStatus === "scheduled" && decision.scheduledLocalDate) {
    payload.scheduledLocalDate = decision.scheduledLocalDate;
  }
  if (canonicalStatus === "completed" && decision.completedOnLocalDate) {
    payload.completedOnLocalDate = decision.completedOnLocalDate;
  }

  // Exactly one canonical decision document written per root
  await setDoc(ref, payload, { merge: true });
}

/**
 * Atomically commits today's updated confirmed plan document AND multiple carried rollover decision documents
 * in a single Firestore runTransaction.
 * Each decision is written to exactly ONE canonical document keyed by root identity.
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
    const { updatedAt: _existingUpdatedAt, ...safeDocument } = document;
    const nowIso = new Date().toISOString();
    const updatedDocument: AppADailyPlanDocument = {
      ...document,
      revision: currentRevision + 1,
      updatedAt: document.updatedAt || nowIso,
    };

    const writePayload: AppADailyPlanDocumentWrite = {
      ...JSON.parse(JSON.stringify(safeDocument)),
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    };

    transaction.set(planRef, writePayload);

    for (const decision of decisions) {
      if (!decision.sourceLocalDate || !decision.sourcePlanItemId) continue;
      const norm = normalizeRolloverDecisionStatus(decision.status || "carried");
      if (norm.kind === "unsupported") continue;
      const canonicalStatus = norm.status;

      const root = getCanonicalRootIdentity({
        id: decision.sourcePlanItemId,
        sourceLocalDate: decision.sourceLocalDate,
        sourcePlanItemId: decision.sourcePlanItemId,
        originalPlanDate: decision.originalPlanDate,
        originalPlanItemId: decision.originalPlanItemId,
      });

      const canonicalDate = root.resolved
        ? root.rootLocalDate
        : decision.originalPlanDate || decision.sourceLocalDate;
      const canonicalItemId = root.resolved
        ? root.rootPlanItemId
        : decision.originalPlanItemId || decision.sourcePlanItemId;

      const decisionRef_ = rolloverDecisionRef(userId, canonicalDate, canonicalItemId);
      const decisionPayload: Record<string, unknown> = {
        sourceLocalDate: decision.sourceLocalDate,
        sourcePlanItemId: decision.sourcePlanItemId,
        originalPlanDate: canonicalDate,
        originalPlanItemId: canonicalItemId,
        status: canonicalStatus,
        ...(decision.scheduledLocalDate ? { scheduledLocalDate: decision.scheduledLocalDate } : {}),
        ...(decision.snoozedUntilLocalDate ? { snoozedUntilLocalDate: decision.snoozedUntilLocalDate } : {}),
        ...(decision.completedOnLocalDate ? { completedOnLocalDate: decision.completedOnLocalDate } : {}),
        updatedAt: serverTimestamp(),
      };
      // Exactly ONE document written per item
      transaction.set(decisionRef_, decisionPayload, { merge: true });
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
 * Exactly ONE decision document written.
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

  const norm = normalizeRolloverDecisionStatus(decision.status || "inbox");
  if (norm.kind === "unsupported") {
    throw new Error(`unsupported_rollover_decision_status: ${norm.rawStatus}`);
  }
  const canonicalStatus = norm.status;

  const root = getCanonicalRootIdentity({
    id: decision.sourcePlanItemId,
    sourceLocalDate: decision.sourceLocalDate,
    sourcePlanItemId: decision.sourcePlanItemId,
    originalPlanDate: decision.originalPlanDate,
    originalPlanItemId: decision.originalPlanItemId,
  });

  const canonicalDate = root.resolved
    ? root.rootLocalDate
    : decision.originalPlanDate || decision.sourceLocalDate;
  const canonicalItemId = root.resolved
    ? root.rootPlanItemId
    : decision.originalPlanItemId || decision.sourcePlanItemId;

  await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) throw new Error("reset_in_progress");
    const inboxRef = doc(db, "appAUsers", userId, "inboxItems", inboxItem.id);
    const decisionRef_ = rolloverDecisionRef(userId, canonicalDate, canonicalItemId);

    transaction.set(inboxRef, {
      ...inboxItem,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const decisionPayload: Record<string, unknown> = {
      sourceLocalDate: decision.sourceLocalDate,
      sourcePlanItemId: decision.sourcePlanItemId,
      originalPlanDate: canonicalDate,
      originalPlanItemId: canonicalItemId,
      status: canonicalStatus,
      ...(decision.scheduledLocalDate ? { scheduledLocalDate: decision.scheduledLocalDate } : {}),
      ...(decision.snoozedUntilLocalDate ? { snoozedUntilLocalDate: decision.snoozedUntilLocalDate } : {}),
      updatedAt: serverTimestamp(),
    };

    // Exactly ONE decision document written
    transaction.set(decisionRef_, decisionPayload, { merge: true });
  });
}

export async function loadRolloverDecisions(
  userId: string,
): Promise<Record<string, AppARolloverDecision>> {
  if (!userId) return {};

  try {
    const colRef = rolloverDecisionCollection(userId);
    const snap = await getDocs(colRef);

    interface RootGroup {
      rootLocalDate: string;
      rootPlanItemId: string;
      sourceKeys: Set<string>;
      effective: AppARolloverDecision;
    }

    const groups = new Map<string, RootGroup>();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data &&
        typeof data.sourceLocalDate === "string" &&
        typeof data.sourcePlanItemId === "string"
      ) {
        const norm = normalizeRolloverDecisionStatus(data.status);
        const isUnsupported = norm.kind === "unsupported";

        const root = getCanonicalRootIdentity({
          id: data.sourcePlanItemId,
          sourceLocalDate: data.sourceLocalDate,
          sourcePlanItemId: data.sourcePlanItemId,
          originalPlanDate:
            typeof data.originalPlanDate === "string" ? data.originalPlanDate : undefined,
          originalPlanItemId:
            typeof data.originalPlanItemId === "string" ? data.originalPlanItemId : undefined,
        });

        const rootLocalDate = root.resolved
          ? root.rootLocalDate
          : typeof data.originalPlanDate === "string"
            ? data.originalPlanDate
            : data.sourceLocalDate;
        const rootPlanItemId = root.resolved
          ? root.rootPlanItemId
          : typeof data.originalPlanItemId === "string"
            ? data.originalPlanItemId
            : data.sourcePlanItemId;

        const rootKey = `${rootLocalDate}::${rootPlanItemId}`;
        const sourceDocId = getRolloverDecisionId(data.sourceLocalDate, data.sourcePlanItemId);

        const decisionDoc: AppARolloverDecision = {
          sourceLocalDate: data.sourceLocalDate,
          sourcePlanItemId: data.sourcePlanItemId,
          originalPlanDate: rootLocalDate,
          originalPlanItemId: rootPlanItemId,
          ...(norm.kind === "valid" ? { status: norm.status } : {}),
          ...(isUnsupported
            ? { isUnsupported: true, unsupportedRawStatus: norm.rawStatus }
            : {}),
          ...(typeof data.snoozedUntilLocalDate === "string"
            ? { snoozedUntilLocalDate: data.snoozedUntilLocalDate }
            : {}),
          ...(typeof data.scheduledLocalDate === "string"
            ? { scheduledLocalDate: data.scheduledLocalDate }
            : {}),
          ...(typeof data.completedOnLocalDate === "string"
            ? { completedOnLocalDate: data.completedOnLocalDate }
            : {}),
          ...(isValidUpdatedAt(data.updatedAt) ? { updatedAt: data.updatedAt } : {}),
        };

        const existingGroup = groups.get(rootKey);
        if (!existingGroup) {
          groups.set(rootKey, {
            rootLocalDate,
            rootPlanItemId,
            sourceKeys: new Set([sourceDocId]),
            effective: decisionDoc,
          });
        } else {
          existingGroup.sourceKeys.add(sourceDocId);
          existingGroup.effective = resolveEffectiveRolloverDecision(
            existingGroup.effective,
            decisionDoc,
          );
        }
      }
    });

    const map: Record<string, AppARolloverDecision> = {};
    for (const group of groups.values()) {
      const canonicalDocId = getRolloverDecisionId(group.rootLocalDate, group.rootPlanItemId);
      map[canonicalDocId] = group.effective;
      // All source keys associated with this root resolve to the single effective decision
      for (const srcKey of group.sourceKeys) {
        map[srcKey] = group.effective;
      }
    }

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
      const root = getCanonicalRootIdentity({
        id: item.id,
        sourceLocalDate: docData.localDate,
        originalPlanDate: item.originalPlanDate,
        originalPlanItemId: item.originalPlanItemId,
      });
      const originalPlanDate = root.resolved
        ? root.rootLocalDate
        : item.originalPlanDate || docData.localDate;
      const originalPlanItemId = root.resolved
        ? root.rootPlanItemId
        : item.originalPlanItemId || item.id;
      const rootKey = `${originalPlanDate}:${originalPlanItemId}`;
      const titleKey = item.title.trim().toLowerCase();

      // Deduplication by stable root key. Two distinct tasks with same title must both remain.
      // Title is strictly a secondary fallback when no stable root identity exists.
      if (seenRoots.has(rootKey)) {
        continue;
      }
      if (!originalPlanItemId && seenTitles.has(titleKey)) {
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
      const visionId = (item as any).visionId || (item as any).goalRelationship?.goalId;
      const visionStepId = (item as any).visionStepId;

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
        visionId,
        visionStepId,
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
 * and records a single terminal decision at the canonical root, committed atomically via runTransaction.
 */
export async function markHistoricalTaskComplete(
  userId: string,
  sourceLocalDate: string,
  sourcePlanItemId: string,
  completedOnLocalDate?: string,
  originalPlanDate?: string,
  originalPlanItemId?: string,
): Promise<void> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  if (!userId || !sourceLocalDate || !sourcePlanItemId) {
    throw new Error("invalid_mark_complete_params");
  }

  const root = getCanonicalRootIdentity({
    id: sourcePlanItemId,
    sourceLocalDate,
    sourcePlanItemId,
    originalPlanDate,
    originalPlanItemId,
  });
  const canonicalDate = root.resolved
    ? root.rootLocalDate
    : originalPlanDate || sourceLocalDate;
  const canonicalItemId = root.resolved
    ? root.rootPlanItemId
    : originalPlanItemId || sourcePlanItemId;

  await runTransaction(db, async (transaction) => {
    if (isResetBlocked(userId)) throw new Error("reset_in_progress");

    // 1. Mark completed on source plan if it exists
    const planRef = doc(db, "appAUsers", userId, "dailyResets", sourceLocalDate);
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

    // 2. If canonical date/item is distinct, mark completed on root plan if it exists
    if (canonicalDate !== sourceLocalDate || canonicalItemId !== sourcePlanItemId) {
      const rootPlanRef = doc(db, "appAUsers", userId, "dailyResets", canonicalDate);
      const rootPlanSnap = await transaction.get(rootPlanRef);
      if (rootPlanSnap.exists()) {
        const rootCompleted = rootPlanSnap.data()?.execution?.completedItemIds || [];
        if (!rootCompleted.includes(canonicalItemId)) {
          transaction.update(rootPlanRef, {
            "execution.completedItemIds": arrayUnion(canonicalItemId),
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    // 3. Exactly ONE terminal decision document written at the canonical root
    const completedDate = completedOnLocalDate || new Date().toISOString().slice(0, 10);
    const decisionRef_ = rolloverDecisionRef(userId, canonicalDate, canonicalItemId);
    transaction.set(
      decisionRef_,
      {
        sourceLocalDate,
        sourcePlanItemId,
        originalPlanDate: canonicalDate,
        originalPlanItemId: canonicalItemId,
        status: "completed",
        completedOnLocalDate: completedDate,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
