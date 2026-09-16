import { useState, useRef, useEffect, useCallback } from "react";
import type { AppAInboxItem, InboxItemHorizon, InboxItemStatus } from "../../domain/inbox/contracts";
import { createManualInboxItemId, createInboxMutationId } from "../../domain/inbox/contracts";
import type { InboxAdapter } from "../../adapters/inboxAdapter";
import type { AppALanguage } from "../../types";
import { evaluateInboxVisionEligibility } from "../../domain/inbox/inboxVisionEligibility";
import type { VisionReviewController } from "../../domain/daily-reset/VisionReviewController";

export interface QuickCaptureDraft {
  draftId: string;
  mutationId: string;
  title: string;
}

export interface UseInboxMutationsProps {
  userId: string;
  language: AppALanguage;
  adapter: InboxAdapter;
  todayLocalDate: string;
  visionController: VisionReviewController;
  onOpenVision?: (visionId?: string) => void;
  translations: {
    itemAddedToToday: string;
    noPlan: string;
    durationNeeded: string;
    capacity: string;
    duplicate: string;
    error: string;
    converted: string;
    visionConnected: string;
  };
}

export function useInboxMutations({
  userId,
  language,
  adapter,
  todayLocalDate,
  visionController,
  onOpenVision,
  translations: t,
}: UseInboxMutationsProps) {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [items, setItems] = useState<AppAInboxItem[]>([]);
  const itemsRef = useRef<AppAInboxItem[]>(items);
  itemsRef.current = items;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isSubmittingDraftRef = useRef(false);
  const busyMutationRef = useRef(false);

  // Stable identity draft state: generated when drafting begins
  const [draft, setDraft] = useState<QuickCaptureDraft>(() => ({
    draftId: createManualInboxItemId(),
    mutationId: createInboxMutationId(),
    title: "",
  }));
  const [draftError, setDraftError] = useState<string | null>(null);

  const setDraftTitle = useCallback((text: string) => {
    setDraft((prev) => ({ ...prev, title: text }));
  }, []);

  const resetDraftIdentity = useCallback(() => {
    setDraft({
      draftId: createManualInboxItemId(),
      mutationId: createInboxMutationId(),
      title: "",
    });
    setDraftError(null);
  }, []);

  // Quick Capture Submit: retains draft text and identity upon failure, creates new identity upon confirmed success
  const submitDraft = useCallback(async () => {
    const title = draft.title.trim();
    if (!title || processingId || isSubmittingDraftRef.current) return;

    isSubmittingDraftRef.current = true;
    setProcessingId("new");
    setDraftError(null);
    setError(null);
    setNotice(null);

    const now = new Date().toISOString();
    const item: AppAInboxItem = {
      id: draft.draftId,
      mutationId: draft.mutationId,
      title,
      kind: "task",
      horizon: "later",
      status: "inbox",
      source: "manual",
      language,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await adapter.saveItem(userId, item);
      if (!isMounted.current) return;

      // Persistence confirmed: add to items and advance to a fresh draft identity
      setItems((prev) => [item, ...prev]);
      resetDraftIdentity();
      window.dispatchEvent(new Event("app-a-inbox-changed"));
      window.dispatchEvent(new Event("app-a-plan-changed"));
    } catch (err: any) {
      if (!isMounted.current) return;
      // Do NOT clear textarea or reset draftId/mutationId! Display retryable error banner.
      setDraftError(t.error);
    } finally {
      isSubmittingDraftRef.current = false;
      if (isMounted.current) {
        setProcessingId(null);
      }
    }
  }, [adapter, draft, language, resetDraftIdentity, t.error, userId, processingId]);

  const retryDraft = useCallback(async () => {
    await submitDraft();
  }, [submitDraft]);

  // Update Status with controlled rollback on failure
  const updateItemStatus = useCallback(
    async (
      item: AppAInboxItem,
      status: InboxItemStatus,
      extras: { scheduledLocalDate?: string; waitingOn?: string; horizon?: InboxItemHorizon } = {}
    ) => {
      if (processingId || busyMutationRef.current) return;
      busyMutationRef.current = true;
      setProcessingId(item.id);
      setError(null);
      setNotice(null);

      // Snapshot for rollback
      const previousItems = itemsRef.current;
      const nextItem: AppAInboxItem = {
        ...item,
        status,
        horizon: extras.horizon || item.horizon,
        scheduledLocalDate: extras.scheduledLocalDate ?? item.scheduledLocalDate,
        waitingOn: extras.waitingOn ?? item.waitingOn,
        updatedAt: new Date().toISOString(),
      };
      setItems((all) => all.map((entry) => (entry.id === item.id ? nextItem : entry)));

      try {
        const confirmed = await adapter.updateItemStatus(userId, item, status, extras);
        if (!isMounted.current) return;
        setItems((all) =>
          all.map((entry) =>
            entry.id === item.id ? { ...confirmed, horizon: extras.horizon || confirmed.horizon } : entry
          )
        );
        window.dispatchEvent(new Event("app-a-inbox-changed"));
        window.dispatchEvent(new Event("app-a-plan-changed"));
      } catch (err: any) {
        if (!isMounted.current) return;
        // Rollback to previous state
        setItems(previousItems);
        itemsRef.current = previousItems;
        setError(t.error);
      } finally {
        busyMutationRef.current = false;
        if (isMounted.current) {
          setProcessingId(null);
        }
      }
    },
    [adapter, processingId, t.error, userId]
  );

  // Edit Title with controlled rollback on failure
  const editItemTitle = useCallback(
    async (item: AppAInboxItem, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed || trimmed === item.title || processingId || busyMutationRef.current) return;

      busyMutationRef.current = true;
      setProcessingId(item.id);
      setError(null);
      setNotice(null);

      const previousItems = itemsRef.current;
      const updatedItem: AppAInboxItem = {
        ...item,
        title: trimmed,
        updatedAt: new Date().toISOString(),
      };

      setItems((all) => all.map((entry) => (entry.id === item.id ? updatedItem : entry)));

      try {
        await adapter.saveItem(userId, updatedItem);
        if (!isMounted.current) return;
        window.dispatchEvent(new Event("app-a-inbox-changed"));
      } catch (err: any) {
        if (!isMounted.current) return;
        // Rollback
        setItems(previousItems);
        itemsRef.current = previousItems;
        setError(t.error);
      } finally {
        busyMutationRef.current = false;
        if (isMounted.current) {
          setProcessingId(null);
        }
      }
    },
    [adapter, processingId, t.error, userId]
  );

  // Delete Item with controlled rollback on failure
  const deleteItem = useCallback(
    async (item: AppAInboxItem) => {
      if (processingId || busyMutationRef.current) return;
      busyMutationRef.current = true;
      setProcessingId(item.id);
      setError(null);
      setNotice(null);

      const previousItems = itemsRef.current;
      setItems((all) => all.filter((entry) => entry.id !== item.id));

      try {
        await adapter.deleteItem(userId, item.id);
        if (!isMounted.current) return;
        window.dispatchEvent(new Event("app-a-inbox-changed"));
        window.dispatchEvent(new Event("app-a-plan-changed"));
      } catch (err: any) {
        if (!isMounted.current) return;
        // Rollback on failure
        setItems(previousItems);
        itemsRef.current = previousItems;
        setError(t.error);
      } finally {
        busyMutationRef.current = false;
        if (isMounted.current) {
          setProcessingId(null);
        }
      }
    },
    [adapter, processingId, t.error, userId]
  );

  // Schedule Today
  const scheduleToday = useCallback(
    async (item: AppAInboxItem) => {
      if (processingId || busyMutationRef.current) return;
      busyMutationRef.current = true;
      setProcessingId(item.id);
      setError(null);
      setNotice(null);

      try {
        const scheduled = await adapter.scheduleToday(userId, item, todayLocalDate);
        if (!isMounted.current) return;
        setItems((all) => all.map((entry) => (entry.id === item.id ? scheduled : entry)));
        setNotice(t.itemAddedToToday);
        window.dispatchEvent(new Event("app-a-inbox-changed"));
        window.dispatchEvent(new Event("app-a-plan-changed"));
      } catch (err: any) {
        if (!isMounted.current) return;
        const msg = err.message || "";
        if (msg === "no_plan") setError(t.noPlan);
        else if (msg === "duplicate") setError(t.duplicate);
        else if (msg === "duration_required") setError(t.durationNeeded);
        else if (msg.includes("capacity")) setError(t.capacity);
        else setError(t.error);
      } finally {
        busyMutationRef.current = false;
        if (isMounted.current) {
          setProcessingId(null);
        }
      }
    },
    [adapter, processingId, t.capacity, t.duplicate, t.durationNeeded, t.error, t.itemAddedToToday, t.noPlan, todayLocalDate, userId]
  );

  // Convert Note To Task
  const convertNote = useCallback(
    async (item: AppAInboxItem, actionTitle: string) => {
      if (processingId || busyMutationRef.current) return;
      busyMutationRef.current = true;
      setProcessingId(item.id);
      setError(null);
      setNotice(null);

      try {
        const converted = await adapter.convertNoteToTask(userId, item.id, actionTitle);
        if (!isMounted.current) return;
        setItems((all) => all.map((entry) => (entry.id === item.id ? converted : entry)));
        setNotice(t.converted);
        window.dispatchEvent(new Event("app-a-inbox-changed"));
      } catch (err: any) {
        if (!isMounted.current) return;
        setError(t.error);
      } finally {
        busyMutationRef.current = false;
        if (isMounted.current) {
          setProcessingId(null);
        }
      }
    },
    [adapter, processingId, t.converted, t.error, userId]
  );

  // Develop As Vision: Evaluates eligibility; operational tasks cannot become vision recommendations
  const developVision = useCallback(
    (item: AppAInboxItem) => {
      setError(null);
      setNotice(null);

      const evalResult = evaluateInboxVisionEligibility(item);
      if (!evalResult.eligible || !evalResult.suggestion) {
        setError(evalResult.reason || t.error);
        return;
      }

      const draftResult = visionController.handleDevelopVision(
        evalResult.suggestion,
        undefined,
        todayLocalDate,
        `app_a_vision_draft_${item.id}`
      );

      if (draftResult && onOpenVision) {
        onOpenVision();
      }
    },
    [onOpenVision, t.error, todayLocalDate, visionController]
  );

  // Connect Existing Vision
  const connectVision = useCallback(
    async (item: AppAInboxItem, visionId: string) => {
      if (processingId || busyMutationRef.current) return;
      busyMutationRef.current = true;
      setProcessingId(item.id);
      setError(null);
      setNotice(null);

      try {
        const res = await visionController.handleConnectExisting({
          userId,
          visionId,
          reactivate: false,
          suggestion: {
            sourceItemIds: [item.id],
            suggestedTitle: item.title,
            desiredOutcome: item.details || item.title,
            reason: "Povezano iz Inboksa",
            confidence: "medium",
            needsClarification: false,
          },
          draft: {
            classifiedItems: [],
            firstFocus: [],
            laterToday: [],
            ifCapacityRemains: [],
            deferredItems: [],
            longTermIdeas: [],
            nonActionItems: [],
            planRationale: "",
            plannedRequiredMinutes: 0,
            plannedOptionalMinutes: 0,
          },
        });

        if (!isMounted.current) return;
        if (res.status === "success") {
          setNotice(t.visionConnected);
        } else {
          setError(t.error);
        }
      } catch {
        if (isMounted.current) {
          setError(t.error);
        }
      } finally {
        busyMutationRef.current = false;
        if (isMounted.current) {
          setProcessingId(null);
        }
      }
    },
    [processingId, t.error, t.visionConnected, userId, visionController]
  );

  return {
    items,
    setItems,
    loading,
    setLoading,
    error,
    setError,
    notice,
    setNotice,
    processingId,
    draft,
    setDraftTitle,
    draftError,
    submitDraft,
    retryDraft,
    updateItemStatus,
    editItemTitle,
    deleteItem,
    scheduleToday,
    convertNote,
    developVision,
    connectVision,
  };
}
