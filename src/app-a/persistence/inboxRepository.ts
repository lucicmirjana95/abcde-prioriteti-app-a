import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { ClassifiedBrainDumpItem } from "../domain/daily-reset/contracts";
import type { AppAInboxItem, InboxItemStatus } from "../domain/inbox/contracts";
import {
  createImportedInboxItemId,
  isAppAInboxItem,
} from "../domain/inbox/contracts";
import { isAppADailyPlanDocument, type AppADailyPlanDocument } from "./dailyPlanDocument";
import { mergePlanAddition } from './planMutations';
import { validatePlanDraft } from '../domain/daily-reset/validation';
import { normalizeCompletedItemIds } from '../screens/todayExecution';

function requireUserId(userId: string): string {
  const value = userId.trim();
  if (!value || value.length > 128 || value.includes("/")) throw new Error("authentication_required");
  return value;
}

function inboxRef(userId: string, itemId: string) {
  return doc(db, "appAUsers", requireUserId(userId), "inboxItems", itemId);
}

function isEligible(item: ClassifiedBrainDumpItem): boolean {
  if (!item.id || !(item.suggestedAction || item.originalText).trim()) return false;
  if (item.kind === "waiting_for") return true;
  return item.kind === "task" && (item.timeHorizon === "this_week" || item.timeHorizon === "later");
}

function isNote(item: ClassifiedBrainDumpItem): boolean {
  return Boolean(item.id && item.originalText.trim() && item.timeHorizon === "no_action");
}

export function inboxItemsFromDailyPlan(document: AppADailyPlanDocument): AppAInboxItem[] {
  const candidates = [
    ...document.plan.deferredItems,
    ...document.plan.nonActionItems,
    ...document.plan.classifiedItems.filter((item) => item.kind === "waiting_for"),
  ];
  const unique = new Map<string, ClassifiedBrainDumpItem>();
  for (const item of candidates) if (isEligible(item) || isNote(item)) unique.set(item.id, item);
  const now = new Date().toISOString();
  return [...unique.values()].map((item) => ({
    id: createImportedInboxItemId(document.localDate, item.id),
    title: (isNote(item) ? item.originalText : item.suggestedAction || item.originalText).trim(),
    ...(item.suggestedAction && item.originalText !== item.suggestedAction ? { details: item.originalText.trim() } : {}),
    kind: isNote(item) ? "note" : item.kind === "waiting_for" ? "waiting_for" : "task",
    horizon: item.timeHorizon === "this_week" ? "this_week" : "later",
    status: item.kind === "waiting_for" ? "waiting" : "inbox",
    ...(item.estimatedMinutes ? { estimatedMinutes: item.estimatedMinutes } : {}),
    source: "daily_reset",
    sourceLocalDate: document.localDate,
    sourceItemId: item.id,
    language: document.language,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function importDailyPlanItemsToInbox(userId: string, document: AppADailyPlanDocument): Promise<number> {
  const candidates = inboxItemsFromDailyPlan(document);
  const missing: AppAInboxItem[] = [];
  for (const item of candidates) {
    const existing = await getDoc(inboxRef(userId, item.id));
    if (!existing.exists()) missing.push(item);
  }
  if (!missing.length) return 0;
  const batch = writeBatch(db);
  for (const item of missing) batch.set(inboxRef(userId, item.id), item, { merge: false });
  await batch.commit();
  return missing.length;
}

/** Confirms a reviewed plan and persists deferred tasks and non-action notes together.
 * A failed Inbox write must never leave the plan saved while related items vanish. */
export async function saveConfirmedPlanAndInboxAtomic(
  userId: string,
  document: AppADailyPlanDocument,
): Promise<AppADailyPlanDocument> {
  if (!isAppADailyPlanDocument(document) || !validatePlanDraft(document.plan).valid) {
    throw new Error("invalid_plan");
  }
  const uid = requireUserId(userId);
  const planReference = doc(db, "appAUsers", uid, "dailyResets", document.localDate);
  const inboxItems = inboxItemsFromDailyPlan(document);
  return runTransaction(db, async (transaction) => {
    const planSnapshot = await transaction.get(planReference);
    const current = planSnapshot.data();
    if (planSnapshot.exists() && (current?.revision || 0) !== (document.revision || 0)) {
      throw new Error("plan_changed_elsewhere");
    }
    const inboxSnapshots = await Promise.all(
      inboxItems.map((item) => transaction.get(inboxRef(uid, item.id))),
    );
    const completionIds = planSnapshot.exists()
      ? current?.execution?.completedItemIds || []
      : document.execution?.completedItemIds || [];
    const saved: AppADailyPlanDocument = {
      ...document,
      revision: (current?.revision || 0) + 1,
      execution: { completedItemIds: normalizeCompletedItemIds(document.plan, completionIds) },
    };
    transaction.set(planReference, { ...saved, updatedAt: serverTimestamp() });
    inboxItems.forEach((item, index) => {
      if (!inboxSnapshots[index].exists()) transaction.set(inboxRef(uid, item.id), item, { merge: false });
    });
    return saved;
  });
}

export async function loadInboxItems(userId: string): Promise<AppAInboxItem[]> {
  const snapshot = await getDocs(collection(db, "appAUsers", requireUserId(userId), "inboxItems"));
  return snapshot.docs.map((entry) => entry.data()).filter(isAppAInboxItem)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function dueScheduledInboxItems(items: AppAInboxItem[], localDate: string): AppAInboxItem[] {
  return items.filter((item) => item.status === "scheduled"
    && Boolean(item.scheduledLocalDate)
    && item.scheduledLocalDate! <= localDate);
}

export async function loadDueScheduledInboxItems(userId: string, localDate: string): Promise<AppAInboxItem[]> {
  const [items, plan] = await Promise.all([loadInboxItems(userId), getDoc(doc(db, 'appAUsers', requireUserId(userId), 'dailyResets', localDate))]);
  const data = plan.data()?.plan;
  const scheduledIds = new Set([...(data?.firstFocus || []), ...(data?.laterToday || []), ...(data?.ifCapacityRemains || [])].map(item => item.id));
  return dueScheduledInboxItems(items, localDate).filter(item => !scheduledIds.has(`inbox_plan_${item.id}`));
}

export async function saveInboxItem(userId: string, item: AppAInboxItem): Promise<void> {
  if (!isAppAInboxItem(item)) throw new Error("invalid_inbox_item");
  await setDoc(inboxRef(userId, item.id), item, { merge: false });
}

export async function addMissingInboxDuration(userId: string, itemId: string, minutes: number): Promise<AppAInboxItem> {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('invalid_duration');
  return runTransaction(db, async transaction => {
    const ref = inboxRef(userId, itemId);
    const snapshot = await transaction.get(ref);
    const current = snapshot.data();
    if (!isAppAInboxItem(current) || current.estimatedMinutes || current.status === 'completed' || current.status === 'archived') throw new Error('inbox_item_changed');
    const next = { ...current, estimatedMinutes: minutes, updatedAt: new Date().toISOString() };
    transaction.set(ref, next);
    return next;
  });
}

export async function convertInboxNoteToTask(userId: string, itemId: string): Promise<AppAInboxItem> {
  return runTransaction(db, async transaction => {
    const ref = inboxRef(userId, itemId);
    const snapshot = await transaction.get(ref);
    const current = snapshot.data();
    if (!isAppAInboxItem(current) || current.kind !== "note" || current.status !== "inbox") {
      throw new Error("note_unavailable");
    }
    const next: AppAInboxItem = {
      ...current,
      kind: "task",
      horizon: "later",
      updatedAt: new Date().toISOString(),
    };
    transaction.set(ref, next);
    return next;
  });
}

export async function updateInboxItemStatus(
  userId: string,
  item: AppAInboxItem,
  status: InboxItemStatus,
  extras: Pick<AppAInboxItem, "scheduledLocalDate" | "waitingOn"> = {},
): Promise<AppAInboxItem> {
  return runTransaction(db, async transaction => {
    const ref = inboxRef(userId, item.id);
    const snapshot = await transaction.get(ref);
    const current = snapshot.data();
    if (!isAppAInboxItem(current)) throw new Error('inbox_item_unavailable');
    const linkedDate = current.scheduledLocalDate;
    const planRef = linkedDate ? doc(db, 'appAUsers', requireUserId(userId), 'dailyResets', linkedDate) : null;
    const plan = planRef ? await transaction.get(planRef) : null;
    const taskId = `inbox_plan_${item.id}`;
    const linked = plan?.data()?.plan;
    const existsInPlan = [...(linked?.firstFocus || []), ...(linked?.laterToday || []), ...(linked?.ifCapacityRemains || [])].some(task => task.id === taskId);
    // Completing or restoring a linked item changes its existing task, never a copy.
    if (planRef && existsInPlan && (status === 'completed' || current.status === 'completed')) {
      const ids = new Set<string>(plan!.data()?.execution?.completedItemIds || []);
      if (status === 'completed') ids.add(taskId); else ids.delete(taskId);
      transaction.update(planRef, { 'execution.completedItemIds': [...ids], updatedAt: serverTimestamp() });
    }
    const next: AppAInboxItem = {
      ...current, status: existsInPlan && status === 'inbox' ? 'scheduled' : status,
      scheduledLocalDate: existsInPlan ? linkedDate : status === 'scheduled' ? extras.scheduledLocalDate : undefined,
      waitingOn: status === 'waiting' ? extras.waitingOn?.trim().slice(0, 300) : undefined,
      updatedAt: new Date().toISOString(),
    };
    const safe = JSON.parse(JSON.stringify(next)) as AppAInboxItem;
    if (!isAppAInboxItem(safe)) throw new Error('invalid_inbox_item');
    transaction.set(ref, safe);
    return safe;
  });
}

export async function deleteInboxItem(userId: string, itemId: string): Promise<void> {
  // Retain only an opaque tombstone, so import cannot resurrect deleted text.
  await setDoc(inboxRef(userId, itemId), { id: itemId, deleted: true, updatedAt: serverTimestamp() });
}

export async function savePlanAndScheduleInboxItemAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  inboxItem: AppAInboxItem,
): Promise<{ item: AppAInboxItem; document: AppADailyPlanDocument }> {
  const scheduled: AppAInboxItem = {
    ...inboxItem,
    status: "scheduled",
    scheduledLocalDate: document.localDate,
    waitingOn: undefined,
    updatedAt: new Date().toISOString(),
  };
  const safe = JSON.parse(JSON.stringify(scheduled)) as AppAInboxItem;
  const saved = await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'appAUsers', requireUserId(userId), 'dailyResets', document.localDate);
    const source = inboxRef(userId, inboxItem.id);
    const latest = await transaction.get(ref);
    const currentItem = await transaction.get(source);
    if (!currentItem.exists() || currentItem.data().deleted) throw new Error('inbox_item_unavailable');
    const merged = mergePlanAddition(latest.data(), document, `inbox_plan_${inboxItem.id}`);
    transaction.set(ref, { ...merged, updatedAt: serverTimestamp() });
    transaction.set(source, safe);
    return merged;
  });
  return { item: safe, document: saved };
}

// A task created directly on Today must not briefly exist in Inbox without its
// matching plan item (or vice versa). Both records are created in one transaction.
export async function createInboxItemAndAddToPlanAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  inboxItem: AppAInboxItem,
): Promise<{ item: AppAInboxItem; document: AppADailyPlanDocument }> {
  if (!isAppAInboxItem(inboxItem) || inboxItem.source !== "manual" || inboxItem.status !== "inbox") {
    throw new Error("invalid_inbox_item");
  }
  const scheduled: AppAInboxItem = {
    ...inboxItem,
    status: "scheduled",
    scheduledLocalDate: document.localDate,
    updatedAt: new Date().toISOString(),
  };
  const safe = JSON.parse(JSON.stringify(scheduled)) as AppAInboxItem;
  const saved = await runTransaction(db, async (transaction) => {
    const planReference = doc(db, "appAUsers", requireUserId(userId), "dailyResets", document.localDate);
    const sourceReference = inboxRef(userId, inboxItem.id);
    const latestPlan = await transaction.get(planReference);
    const existingSource = await transaction.get(sourceReference);
    if (existingSource.exists()) throw new Error("duplicate");
    const merged = mergePlanAddition(latestPlan.data(), document, `inbox_plan_${inboxItem.id}`);
    transaction.set(planReference, { ...merged, updatedAt: serverTimestamp() });
    transaction.set(sourceReference, safe);
    return merged;
  });
  return { item: safe, document: saved };
}

/** Saves a user-reviewed reprioritization as one atomic plan + Inbox change. */
export async function createInboxItemAndReplacePlanAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  inboxItem: AppAInboxItem,
): Promise<{ item: AppAInboxItem; document: AppADailyPlanDocument }> {
  if (!isAppAInboxItem(inboxItem) || inboxItem.source !== "manual" || inboxItem.status !== "inbox" || !validatePlanDraft(document.plan).valid) {
    throw new Error("invalid_plan");
  }
  const scheduled: AppAInboxItem = { ...inboxItem, status: "scheduled", scheduledLocalDate: document.localDate, updatedAt: new Date().toISOString() };
  const safe = JSON.parse(JSON.stringify(scheduled)) as AppAInboxItem;
  const saved = await runTransaction(db, async (transaction) => {
    const planReference = doc(db, "appAUsers", requireUserId(userId), "dailyResets", document.localDate);
    const sourceReference = inboxRef(userId, inboxItem.id);
    const latest = await transaction.get(planReference);
    const existingSource = await transaction.get(sourceReference);
    if (existingSource.exists()) throw new Error("duplicate");
    const current = latest.data();
    if (!latest.exists() || (current?.revision || 0) !== (document.revision || 0)) throw new Error("plan_changed_elsewhere");
    const currentCompleted = [...(current?.execution?.completedItemIds || [])].sort();
    const reviewedCompleted = [...(document.execution?.completedItemIds || [])].sort();
    if (currentCompleted.join("\u0000") !== reviewedCompleted.join("\u0000")) throw new Error("plan_changed_elsewhere");
    const next: AppADailyPlanDocument = {
      ...document,
      revision: (current?.revision || 0) + 1,
      execution: { completedItemIds: normalizeCompletedItemIds(document.plan, currentCompleted) },
    };
    transaction.set(planReference, { ...next, updatedAt: serverTimestamp() });
    transaction.set(sourceReference, safe);
    return next;
  });
  return { item: safe, document: saved };
}

export async function saveDailyPlanCompletionAndInboxStatusAtomic(
  userId: string,
  localDate: string,
  completedItemIds: string[],
  inboxItemId: string,
  completed: boolean,
): Promise<void> {
  const itemReference = inboxRef(userId, inboxItemId);
  await runTransaction(db, async (transaction) => {
  const planRef = doc(db, 'appAUsers', requireUserId(userId), 'dailyResets', localDate);
  const planSnapshot = await transaction.get(planRef);
  if (!planSnapshot.exists()) throw new Error('daily_plan_not_found');
  const snapshot = await transaction.get(itemReference);
  const data = snapshot.data();
  const current = isAppAInboxItem(data) ? data : null;
  const latest = new Set<string>(planSnapshot.data().execution?.completedItemIds || []);
  if (completed) latest.add(`inbox_plan_${inboxItemId}`); else latest.delete(`inbox_plan_${inboxItemId}`);
  transaction.update(planRef, { 'execution.completedItemIds': [...latest], updatedAt: serverTimestamp() });
  if (!current) return;
  const next: AppAInboxItem = {
    ...current,
    status: completed ? "completed" : "scheduled",
    scheduledLocalDate: localDate,
    waitingOn: undefined,
    updatedAt: new Date().toISOString(),
  };
  const safe = JSON.parse(JSON.stringify(next)) as AppAInboxItem;
  transaction.set(itemReference, safe);
  });
}
