import type {
  AppAInboxItem,
  InboxItemHorizon,
  InboxItemStatus,
  InboxMutationReceipt,
} from "../domain/inbox/contracts";
import { computeInboxItemSemanticFingerprint } from "../domain/inbox/contracts";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import type { SavedVisionStrategy } from "../../shared/domain/vision";
import type { NoteClarification } from "../api/noteClarificationApi";
import type { AppALanguage } from "../types";
import {
  addMissingInboxDuration,
  convertInboxNoteToTask,
  deleteInboxItem,
  importDailyPlanItemsToInbox,
  loadInboxItems,
  saveInboxItem,
  savePlanAndScheduleInboxItemAtomic,
  type SaveInboxItemResult,
  updateInboxItemStatus,
} from "../persistence/inboxRepository";
import { loadConfirmedDailyPlan, loadRecentDailyPlans } from "../persistence/dailyPlanRepository";
import { addInboxItemToPlan, getInboxPlanningMinutes } from "../screens/inboxCandidatePlan";
import { clarifyInboxNote } from "../api/noteClarificationApi";

export type { SaveInboxItemResult };

export interface InboxAdapter {
  loadItems: (userId: string) => Promise<AppAInboxItem[]>;
  saveItem: (userId: string, item: AppAInboxItem) => Promise<SaveInboxItemResult | void>;
  updateItemStatus: (
    userId: string,
    item: AppAInboxItem,
    status: InboxItemStatus,
    extras?: { scheduledLocalDate?: string; waitingOn?: string; horizon?: InboxItemHorizon }
  ) => Promise<AppAInboxItem>;
  deleteItem: (userId: string, itemId: string) => Promise<void>;
  addMissingDuration: (userId: string, itemId: string, minutes: number) => Promise<AppAInboxItem>;
  convertNoteToTask: (userId: string, itemId: string, actionTitle: string) => Promise<AppAInboxItem>;
  scheduleToday: (
    userId: string,
    item: AppAInboxItem,
    todayLocalDate: string
  ) => Promise<AppAInboxItem>;
  loadRecentPlans: (userId: string, count: number) => Promise<AppADailyPlanDocument[]>;
  importPlanItems: (userId: string, plan: AppADailyPlanDocument) => Promise<number>;
  loadVisionLibrary: (userId: string) => Promise<SavedVisionStrategy[]>;
  clarifyNote: (noteText: string, language: AppALanguage) => Promise<NoteClarification>;
}

function isDemoUser(userId: string): boolean {
  return (
    userId === "test_user_app_a" ||
    userId === "guest" ||
    (typeof window !== "undefined" && Boolean(window.localStorage.getItem("app_a_test_user_v1")))
  );
}

function getDemoItems(): AppAInboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("app_a_demo_inbox_items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDemoItems(items: AppAInboxItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("app_a_demo_inbox_items", JSON.stringify(items));
  } catch {}
}

function getDemoReceipts(): Record<string, InboxMutationReceipt> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("app_a_demo_inbox_receipts");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDemoReceipts(receipts: Record<string, InboxMutationReceipt>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("app_a_demo_inbox_receipts", JSON.stringify(receipts));
  } catch {}
}

export const productionInboxAdapter: InboxAdapter = {
  loadItems: async (userId: string) => {
    if (isDemoUser(userId)) return getDemoItems();
    return loadInboxItems(userId);
  },
  saveItem: async (userId: string, item: AppAInboxItem): Promise<SaveInboxItemResult | void> => {
    if (isDemoUser(userId)) {
      if (typeof window !== "undefined" && window.localStorage.getItem("app_a_simulate_inbox_save_error") === "true") {
        throw new Error("Simulated network failure");
      }
      const items = getDemoItems();
      const receipts = getDemoReceipts();
      const mutationId = item.mutationId;
      const fingerprint = computeInboxItemSemanticFingerprint(item);

      if (mutationId && receipts[mutationId]) {
        const receipt = receipts[mutationId];
        if (receipt.itemId !== item.id) {
          throw new Error("conflict:mutation_id_used_for_different_item");
        }
        if (receipt.semanticPayloadFingerprint !== fingerprint) {
          throw new Error("conflict:mutation_payload_mismatch");
        }
        const existing = items.find((i) => i.id === item.id);
        if (!existing) {
          throw new Error("conflict:inbox_receipt_inconsistent");
        }
        const existingFingerprint = computeInboxItemSemanticFingerprint(existing);
        if (existing.mutationId !== mutationId || existingFingerprint !== fingerprint) {
          throw new Error("conflict:inbox_receipt_inconsistent");
        }
        return { type: "already_applied", item: existing };
      }

      const existing = items.find((i) => i.id === item.id);
      if (existing) {
        const existingFingerprint = computeInboxItemSemanticFingerprint(existing);
        if (mutationId && existing.mutationId === mutationId && existingFingerprint === fingerprint) {
          receipts[mutationId] = {
            mutationId,
            itemId: item.id,
            semanticPayloadFingerprint: fingerprint,
            createdAt: new Date().toISOString(),
          };
          saveDemoReceipts(receipts);
          return { type: "already_applied", item: existing };
        }
        throw new Error("conflict:existing_inbox_item_mismatch");
      }

      items.unshift(item);
      saveDemoItems(items);
      if (mutationId) {
        receipts[mutationId] = {
          mutationId,
          itemId: item.id,
          semanticPayloadFingerprint: fingerprint,
          createdAt: new Date().toISOString(),
        };
        saveDemoReceipts(receipts);
      }
      return { type: "success", item };
    }
    return saveInboxItem(userId, item);
  },
  updateItemStatus: async (userId, item, status, extras) => {
    if (isDemoUser(userId)) {
      const items = getDemoItems();
      const updated: AppAInboxItem = {
        ...item,
        status,
        horizon: extras?.horizon || item.horizon,
        scheduledLocalDate: extras?.scheduledLocalDate ?? item.scheduledLocalDate,
        waitingOn: extras?.waitingOn ?? item.waitingOn,
        updatedAt: new Date().toISOString(),
      };
      saveDemoItems(items.map((i) => (i.id === item.id ? updated : i)));
      return updated;
    }
    return updateInboxItemStatus(userId, item, status, extras);
  },
  deleteItem: async (userId: string, itemId: string) => {
    if (isDemoUser(userId)) {
      const items = getDemoItems();
      saveDemoItems(items.filter((i) => i.id !== itemId));
      return;
    }
    return deleteInboxItem(userId, itemId);
  },
  addMissingDuration: async (userId, itemId, minutes) => {
    if (isDemoUser(userId)) {
      const items = getDemoItems();
      const target = items.find((i) => i.id === itemId);
      const updated = { ...(target || { id: itemId }), estimatedMinutes: minutes, updatedAt: new Date().toISOString() } as AppAInboxItem;
      saveDemoItems(items.map((i) => (i.id === itemId ? updated : i)));
      return updated;
    }
    return addMissingInboxDuration(userId, itemId, minutes);
  },
  convertNoteToTask: async (userId, itemId, actionTitle) => {
    if (isDemoUser(userId)) {
      const items = getDemoItems();
      const target = items.find((i) => i.id === itemId) || ({ id: itemId } as AppAInboxItem);
      const updated: AppAInboxItem = {
        ...target,
        title: actionTitle,
        kind: "task",
        horizon: "later",
        updatedAt: new Date().toISOString(),
      };
      saveDemoItems(items.map((i) => (i.id === itemId ? updated : i)));
      return updated;
    }
    return convertInboxNoteToTask(userId, itemId, actionTitle);
  },
  scheduleToday: async (userId: string, item: AppAInboxItem, todayLocalDate: string) => {
    if (isDemoUser(userId)) {
      const updated: AppAInboxItem = {
        ...item,
        status: "scheduled",
        scheduledLocalDate: todayLocalDate,
        updatedAt: new Date().toISOString(),
      };
      const items = getDemoItems();
      saveDemoItems(items.map((i) => (i.id === item.id ? updated : i)));
      return updated;
    }
    const document = await loadConfirmedDailyPlan(userId, todayLocalDate);
    if (!document) {
      throw new Error("no_plan");
    }
    const estimatedItem = { ...item, estimatedMinutes: getInboxPlanningMinutes(item) };
    const result = addInboxItemToPlan(document.plan, estimatedItem);
    if ("error" in result) {
      throw new Error(result.error);
    }
    const scheduled = await savePlanAndScheduleInboxItemAtomic(
      userId,
      { ...document, plan: result.draft },
      estimatedItem
    );
    return scheduled.item;
  },
  loadRecentPlans: (userId: string, count: number) => {
    if (isDemoUser(userId)) return Promise.resolve([]);
    return loadRecentDailyPlans(userId, count);
  },
  importPlanItems: (userId: string, plan: AppADailyPlanDocument) => {
    if (isDemoUser(userId)) return Promise.resolve(0);
    return importDailyPlanItemsToInbox(userId, plan);
  },
  loadVisionLibrary: async (userId: string) => {
    if (isDemoUser(userId)) return [];
    const { loadVisionLibrary } = await import("../../shared/persistence/vision");
    const lib = await loadVisionLibrary(userId);
    return lib.strategies.filter((s) => s.status === "active");
  },
  clarifyNote: (noteText: string, language: AppALanguage) => clarifyInboxNote(noteText, language),
};
