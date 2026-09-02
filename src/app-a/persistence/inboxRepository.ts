import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { ClassifiedBrainDumpItem } from "../domain/daily-reset/contracts";
import type { AppAInboxItem, InboxItemStatus } from "../domain/inbox/contracts";
import {
  createImportedInboxItemId,
  isAppAInboxItem,
} from "../domain/inbox/contracts";
import type { AppADailyPlanDocument } from "./dailyPlanDocument";

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

export function inboxItemsFromDailyPlan(document: AppADailyPlanDocument): AppAInboxItem[] {
  const candidates = [
    ...document.plan.deferredItems,
    ...document.plan.classifiedItems.filter((item) => item.kind === "waiting_for"),
  ];
  const unique = new Map<string, ClassifiedBrainDumpItem>();
  for (const item of candidates) if (isEligible(item)) unique.set(item.id, item);
  const now = new Date().toISOString();
  return [...unique.values()].map((item) => ({
    id: createImportedInboxItemId(document.localDate, item.id),
    title: (item.suggestedAction || item.originalText).trim(),
    ...(item.suggestedAction && item.originalText !== item.suggestedAction ? { details: item.originalText.trim() } : {}),
    kind: item.kind === "waiting_for" ? "waiting_for" : "task",
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

export async function loadInboxItems(userId: string): Promise<AppAInboxItem[]> {
  const snapshot = await getDocs(collection(db, "appAUsers", requireUserId(userId), "inboxItems"));
  return snapshot.docs.map((entry) => entry.data()).filter(isAppAInboxItem)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveInboxItem(userId: string, item: AppAInboxItem): Promise<void> {
  if (!isAppAInboxItem(item)) throw new Error("invalid_inbox_item");
  await setDoc(inboxRef(userId, item.id), item, { merge: false });
}

export async function updateInboxItemStatus(
  userId: string,
  item: AppAInboxItem,
  status: InboxItemStatus,
  extras: Pick<AppAInboxItem, "scheduledLocalDate" | "waitingOn"> = {},
): Promise<AppAInboxItem> {
  const next: AppAInboxItem = {
    ...item,
    status,
    ...(status === "scheduled" && extras.scheduledLocalDate ? { scheduledLocalDate: extras.scheduledLocalDate } : { scheduledLocalDate: undefined }),
    ...(status === "waiting" && extras.waitingOn?.trim() ? { waitingOn: extras.waitingOn.trim().slice(0, 300) } : { waitingOn: undefined }),
    updatedAt: new Date().toISOString(),
  };
  const safe = JSON.parse(JSON.stringify(next)) as AppAInboxItem;
  await saveInboxItem(userId, safe);
  return safe;
}

export async function deleteInboxItem(userId: string, itemId: string): Promise<void> {
  await deleteDoc(inboxRef(userId, itemId));
}

export async function savePlanAndCompleteInboxItemAtomic(
  userId: string,
  document: AppADailyPlanDocument,
  inboxItem: AppAInboxItem,
): Promise<AppAInboxItem> {
  const completed: AppAInboxItem = { ...inboxItem, status: "completed", updatedAt: new Date().toISOString() };
  const batch = writeBatch(db);
  batch.set(doc(db, "appAUsers", requireUserId(userId), "dailyResets", document.localDate), document, { merge: true });
  batch.set(inboxRef(userId, inboxItem.id), completed, { merge: false });
  await batch.commit();
  return completed;
}
