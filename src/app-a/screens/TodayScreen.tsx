import { APP_A_TRANSLATIONS, AppALanguage, type AppAPreferences } from '../types';
import DailyResetForm from '../components/daily-reset/DailyResetForm';
import ClarificationForm from '../components/daily-reset/ClarificationForm';
import DailyResetLoadingState from '../components/daily-reset/DailyResetLoadingState';
import DailyResetErrorPanel from '../components/daily-reset/DailyResetErrorPanel';
import DailyPlanReview from '../components/daily-reset/DailyPlanReview';
import DailyResetDemoBanner from '../components/daily-reset/DailyResetDemoBanner';
import TodayExecutionScreen from '../components/daily-reset/TodayExecutionScreen';
import { useTodayFlow } from './todayFlow';
import type { DailyResetApiClient } from '../api';
import type { DailyResetDemoConfig } from '../demo/dailyResetDemo';
import type { DailyResetData } from '../types';
import { useEffect, useRef, useState } from 'react';
import { useAppAAuth } from '../auth/useAppAAuth';
import {
  createDailyPlanDocument,
  dailyResetDataFromDocument,
  getLocalDateKeyInTimeZone,
  planDraftFromDocument,
} from '../persistence/dailyPlanDocument';
import { getEffectiveTimeZone } from '../settings/preferences';
import {
  loadConfirmedDailyPlan,
  saveDailyPlanCompletion,
  extractDiagnosticFromSaveError,
  PersistenceSaveDiagnostic,
} from '../persistence/dailyPlanRepository';
import type { DailyPlanDraft } from '../domain/daily-reset/contracts';
import { normalizeCompletedItemIds, toggleCompletedItemId } from './todayExecution';
import ResetSessions from '../components/reset/ResetSessions';
import TodayCandidatesSection from '../components/vision/TodayCandidatesSection';
import type { TodayCandidate } from '../../shared/domain/today-candidates';
import { saveCompletionAndAdvanceVision, savePlanAndScheduleVisionAtomic } from '../../shared/persistence/today-candidates';
import { addVisionCandidateToPlan } from './visionCandidatePlan';
import UnfinishedTasksSection from '../components/rollover/UnfinishedTasksSection';
import {
  loadUnfinishedRolloverCandidates,
  markHistoricalTaskComplete,
  saveDailyPlanWithMultipleRolloverDecisionsAtomic,
  saveDailyPlanWithRolloverDecisionAtomic,
  saveInboxItemWithRolloverDecisionAtomic,
  saveRolloverDecision,
} from '../persistence/rolloverRepository';
import { shiftLocalDate, type AppARolloverDecision, type UnfinishedRolloverCandidate } from '../domain/rollover/contracts';
import { addRolloverCandidateToPlan } from './rolloverCandidatePlan';
import { ReevaluationDialog } from '../components/daily-reset/ReevaluationDialog';
import type { DataResetEventDetail } from '../components/settings/DataResetModal';
import { createInboxItemAndAddToPlanAtomic, createInboxItemAndReplacePlanAtomic, saveConfirmedPlanAndInboxAtomic, saveDailyPlanCompletionAndInboxStatusAtomic, saveInboxItem, savePlanAndScheduleInboxItemAtomic } from '../persistence/inboxRepository';
import { createManualInboxItemId, type AppAInboxItem } from '../domain/inbox/contracts';
import { addInboxItemToPlan, getInboxPlanningMinutes } from './inboxCandidatePlan';
import DueInboxItemsSection from '../components/inbox/DueInboxItemsSection';
import type { QuickAddInput, QuickAddResult } from '../components/daily-reset/QuickAddTodayTask';

interface Props {
  language: AppALanguage;
  client?: DailyResetApiClient;
  demoConfig?: DailyResetDemoConfig | null;
  initialData?: Partial<DailyResetData>;
  preferences: AppAPreferences;
  onOpenVision: () => void;
}

const APP_A_ONBOARDING_KEY = 'app_a_daily_reset_onboarding_v1';

function readOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(APP_A_ONBOARDING_KEY) === 'completed';
  } catch {
    return false;
  }
}

export default function TodayScreen({ language, client, demoConfig, initialData, preferences, onOpenVision }: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  const effectiveTimeZone = getEffectiveTimeZone(preferences);
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const {
    state,
    submitInitial,
    submitResolve,
    setAnswer,
    retry,
    cancel,
    backToEdit,
    loadConfirmedPlan,
    reset,
    updateInputData,
    updateReviewDraft,
  } = useTodayFlow(language, client, initialData, demoConfig ? undefined : `${user?.uid || 'guest'}:today:${getLocalDateKeyInTimeZone(effectiveTimeZone)}`);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [formVersion, setFormVersion] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveDiagnostic, setSaveDiagnostic] = useState<string | null>(null);
  const [isLoadingSavedPlan, setIsLoadingSavedPlan] = useState(false);
  const [viewMode, setViewMode] = useState<'review' | 'execution'>('review');
  const [completedItemIds, setCompletedItemIds] = useState<string[]>([]);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [activePlanDate, setActivePlanDate] = useState(() => getLocalDateKeyInTimeZone(effectiveTimeZone));
  const [rolloverCandidates, setRolloverCandidates] = useState<UnfinishedRolloverCandidate[]>([]);
  const [selectedExecutionRolloverIds, setSelectedExecutionRolloverIds] = useState<string[]>([]);
  const [reevaluationCandidates, setReevaluationCandidates] = useState<UnfinishedRolloverCandidate[] | null>(null);
  const [isLoadingRollover, setIsLoadingRollover] = useState(false);
  const [resetSessionsOpen, setResetSessionsOpen] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(readOnboardingCompleted);
  const loadedForUserAndDate = useRef<string | null>(null);
  const isConfirmingRef = useRef(false);
  const planRevision = useRef(0);
  const liveState = useRef({ unsaved: state.unsaved, viewMode, updatingItemId });
  liveState.current = { unsaved: state.unsaved, viewMode, updatingItemId };
  useEffect(() => {
    if (!user || demoConfig) return;
    let active = true;
    const refresh = async () => {
      if (liveState.current.unsaved || liveState.current.viewMode !== 'execution' || liveState.current.updatingItemId || isConfirmingRef.current) return;
      try {
        const saved = await loadConfirmedDailyPlan(user.uid, activePlanDate);
        if (!active || !saved || liveState.current.unsaved || liveState.current.viewMode !== 'execution' || liveState.current.updatingItemId || isConfirmingRef.current) return;
        planRevision.current = saved.revision || 0;
        loadConfirmedPlan(planDraftFromDocument(saved), dailyResetDataFromDocument(saved));
        setCompletedItemIds(saved.execution?.completedItemIds || []);
      } catch { if (active) setExecutionError(t.planLoadError); }
    };
    window.addEventListener('app-a-navigation', refresh);
    window.addEventListener('app-a-plan-changed', refresh);
    return () => { active = false; window.removeEventListener('app-a-navigation', refresh); window.removeEventListener('app-a-plan-changed', refresh); };
  }, [user, demoConfig, activePlanDate, loadConfirmedPlan, t.planLoadError]);
  const [calendarDate, setCalendarDate] = useState(() => getLocalDateKeyInTimeZone(effectiveTimeZone));
  useEffect(() => {
    const refresh = () => setCalendarDate(getLocalDateKeyInTimeZone(effectiveTimeZone));
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [effectiveTimeZone]);

  useEffect(() => {
    if (!resetSessionsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setResetSessionsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [resetSessionsOpen]);

  useEffect(() => {
    if (demoConfig || !authReady || !user) return;
    const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
    let cancelled = false;
    setIsLoadingRollover(true);

    void loadUnfinishedRolloverCandidates(user.uid, localDate)
      .then((candidates) => {
        if (!cancelled) setRolloverCandidates(candidates);
      })
      .catch((err) => {
        console.error("Failed to load rollover candidates:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRollover(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, demoConfig, effectiveTimeZone, user, activePlanDate]);

  useEffect(() => {
    const handleDataReset = (event: Event) => {
      const customEvent = event as CustomEvent<DataResetEventDetail>;
      const completed = customEvent.detail?.completedScopes;
      // Clear Today state only when app_a_daily was successfully reset (or fallback if untyped event)
      if (!completed || completed.includes("app_a_daily")) {
        loadedForUserAndDate.current = null;
        setCompletedItemIds([]);
        setSaveStatus('idle');
        setSaveError(null);
        setSaveDiagnostic(null);
        setViewMode('review');
        setRolloverCandidates([]);
        cancel();
        reset();
        updateInputData({ brainDump: '', stateNote: '', availableTime: undefined, energy: undefined, pleasantness: undefined });
        planRevision.current = 0;
        setFormVersion(version => version + 1);
      }
    };

    window.addEventListener('app-a-data-reset', handleDataReset);
    return () => window.removeEventListener('app-a-data-reset', handleDataReset);
  }, [cancel, reset, updateInputData]);

  useEffect(() => {
    if (demoConfig || !authReady || isConfirmingRef.current) return;
    if (!user) {
      loadedForUserAndDate.current = null;
      setIsLoadingSavedPlan(false);
      return;
    }
    const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
    const loadKey = `${user.uid}:${localDate}`;
    if (loadedForUserAndDate.current === loadKey) return;
    loadedForUserAndDate.current = loadKey;
    setIsLoadingSavedPlan(true);

    void loadConfirmedDailyPlan(user.uid, localDate)
      .then((saved) => {
        if (loadedForUserAndDate.current !== loadKey) return;
        if (saved && !liveState.current.unsaved) {
          const loadedPlan = planDraftFromDocument(saved);
          planRevision.current = saved.revision || 0;
          loadConfirmedPlan(loadedPlan, dailyResetDataFromDocument(saved));
          setCompletedItemIds(
            normalizeCompletedItemIds(loadedPlan, saved.execution?.completedItemIds || []),
          );
          setActivePlanDate(saved.localDate);
          setViewMode('execution');
          setSaveStatus('saved');
        } else if (activePlanDate !== localDate) {
          reset();
          setCompletedItemIds([]);
          setActivePlanDate(localDate);
          setViewMode('review');
          setSaveStatus('idle');
        }
      })
      .catch(() => {
        if (loadedForUserAndDate.current === loadKey) {
          setSaveStatus('error');
          setSaveError(t.planLoadError);
        }
      })
      .finally(() => {
        if (loadedForUserAndDate.current === loadKey) setIsLoadingSavedPlan(false);
      });
  }, [authReady, demoConfig, effectiveTimeZone, calendarDate, loadConfirmedPlan, reset, t.planLoadError, user]);

  const handleConfirm = async (draft: DailyPlanDraft) => {
    if (isConfirmingRef.current) return;
    setSaveStatus('saving');
    setSaveError(null);
    setSaveDiagnostic(null);
    isConfirmingRef.current = true;
    try {
      if (demoConfig) {
        setCompletedItemIds(normalizeCompletedItemIds(draft, completedItemIds));
        loadConfirmedPlan(draft, state.inputData);
        setViewMode('execution');
        setSaveStatus('saved');
        return;
      }
      const activeUser = user || await signInWithGoogle();
      const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
      const document = createDailyPlanDocument(state.inputData, draft, language, localDate, effectiveTimeZone);
      document.revision = activePlanDate === localDate ? planRevision.current : 0;
      document.execution = { completedItemIds: normalizeCompletedItemIds(draft, activePlanDate === localDate ? completedItemIds : []) };
      const savedDocument = await saveConfirmedPlanAndInboxAtomic(activeUser.uid, document);
      document.execution = savedDocument.execution;
      planRevision.current = savedDocument.revision || 0;
      loadedForUserAndDate.current = `${activeUser.uid}:${document.localDate}`;
      setActivePlanDate(document.localDate);
      setCompletedItemIds(document.execution.completedItemIds);
      loadConfirmedPlan(draft, state.inputData);
      setViewMode('execution');
      setSaveStatus('saved');
      setOnboardingCompleted(true);
      try {
        localStorage.setItem(APP_A_ONBOARDING_KEY, 'completed');
      } catch {
        // Onboarding remains visible next time when browser storage is unavailable.
      }
    } catch (error: unknown) {
      setSaveStatus('error');
      setSaveError(t.planSaveError);
      const diagnostic: PersistenceSaveDiagnostic = extractDiagnosticFromSaveError(error);
      const isDev =
        (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
        (typeof window !== 'undefined' &&
          (window.location.hostname.includes('ais-') ||
            window.location.hostname.includes('localhost') ||
            window.location.hostname.includes('127.0.0.1')));
      if (isDev) {
        setSaveDiagnostic(`${diagnostic.stage} / ${diagnostic.category} / ${diagnostic.firebaseCode}`);
      }

      console.error({
        feature: "app_a_daily_plan_save",
        stage: diagnostic.stage,
        category: diagnostic.category,
        firebaseCode: diagnostic.firebaseCode,
        projectId: "daily-reset-app-a",
        databaseId: "(default)",
        authPresent: !!user,
        uidMatchesPath: true,
        dateKeyType: "string",
        dateKeyLength: getLocalDateKeyInTimeZone(effectiveTimeZone).length,
      });
    } finally {
      isConfirmingRef.current = false;
    }
  };

  const handleToggleCompletion = async (itemId: string) => {
    if (updatingItemId) return;
    const previous = completedItemIds;
    if (!state.planDraft) return;
    const next = toggleCompletedItemId(state.planDraft, previous, itemId);
    setCompletedItemIds(next);
    setUpdatingItemId(itemId);
    setExecutionError(null);
    try {
      if (!demoConfig) {
        if (!user) throw new Error('authentication_required');
        const newlyCompleted = next.includes(itemId) && !previous.includes(itemId);
        const visionCandidateId = itemId.startsWith('vision_plan_') ? itemId.slice('vision_plan_'.length) : null;
        const inboxItemId = itemId.startsWith('inbox_plan_') ? itemId.slice('inbox_plan_'.length) : null;
        if (inboxItemId) {
          await saveDailyPlanCompletionAndInboxStatusAtomic(user.uid, activePlanDate, next, inboxItemId, newlyCompleted);
          window.dispatchEvent(new Event('app-a-inbox-changed'));
        } else if (visionCandidateId) {
          await saveCompletionAndAdvanceVision(user.uid, activePlanDate, next, visionCandidateId, newlyCompleted);
          window.dispatchEvent(new Event('app-a-vision-candidates-changed'));
        } else {
          await saveDailyPlanCompletion(user.uid, activePlanDate, next, { itemId, completed: newlyCompleted });
        }
      }
    } catch {
      setCompletedItemIds(previous);
      setExecutionError(t.completionSaveError);
    } finally {
      setUpdatingItemId(null);
      window.dispatchEvent(new Event('app-a-plan-changed'));
    }
  };

  const handleAddVisionCandidate = async (candidate: TodayCandidate): Promise<string | null> => {
    if (!user || !state.planDraft) return 'invalid_plan';
    const result = addVisionCandidateToPlan(state.planDraft, candidate);
    if ('error' in result) return result.error;
    try {
      const document = createDailyPlanDocument(state.inputData, result.draft, language, activePlanDate, effectiveTimeZone);
      document.execution = { completedItemIds };
      const saved = await savePlanAndScheduleVisionAtomic(user.uid, document, candidate);
      planRevision.current = saved.revision || 0;
      loadConfirmedPlan(planDraftFromDocument(saved), state.inputData);
      setCompletedItemIds(saved.execution?.completedItemIds || []);
      setViewMode('execution');
      setSaveStatus('saved');
      return null;
    } catch {
      return 'invalid_plan';
    }
  };

  const handleAddInboxItem = async (item: AppAInboxItem): Promise<string | null> => {
    if (!user || !state.planDraft) return 'noPlan';
    const estimatedItem = { ...item, estimatedMinutes: getInboxPlanningMinutes(item) };
    const result = addInboxItemToPlan(state.planDraft, estimatedItem);
    if ('error' in result) return result.error;
    try {
      const document = createDailyPlanDocument(state.inputData, result.draft, language, activePlanDate, effectiveTimeZone);
      document.execution = { completedItemIds };
      const saved = await savePlanAndScheduleInboxItemAtomic(user.uid, document, estimatedItem);
      planRevision.current = saved.document.revision || 0;
      setCompletedItemIds(saved.document.execution?.completedItemIds || []);
      loadConfirmedPlan(planDraftFromDocument(saved.document), state.inputData);
      setViewMode('execution');
      setSaveStatus('saved');
      return null;
    } catch {
      return 'invalid_plan';
    }
  };

  const makeManualInboxItem = (title: string, minutes: number, capacityType: "flexible" | "fixed" = "flexible"): AppAInboxItem => {
    const now = new Date().toISOString();
    return {
      id: createManualInboxItemId(),
      title: title.trim(),
      estimatedMinutes: minutes,
      capacityType,
      kind: 'task',
      horizon: 'later',
      status: 'inbox',
      source: 'manual',
      language,
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleQuickAddToday = async (input: QuickAddInput): Promise<QuickAddResult> => {
    if (!state.planDraft) return { status: 'error', code: 'invalid_plan' };
    const item = makeManualInboxItem(input.title, input.minutes, input.capacityType);
    const result = addInboxItemToPlan(state.planDraft, item, { reconsiderPriorities: input.reconsiderPriorities, completedItemIds });
    if ('error' in result) return { status: 'error', code: result.error === 'duration_required' ? 'invalid_plan' : result.error };
    if (input.reconsiderPriorities && !input.confirmReprioritization) return { status: 'preview', changes: result.changes };
    if (demoConfig) {
      loadConfirmedPlan(result.draft, state.inputData);
      setViewMode('execution');
      return { status: 'saved' };
    }
    if (!user) return { status: 'error', code: 'invalid_plan' };
    try {
      const document = createDailyPlanDocument(state.inputData, result.draft, language, activePlanDate, effectiveTimeZone);
      document.revision = planRevision.current;
      document.execution = { completedItemIds };
      const saved = input.reconsiderPriorities
        ? await createInboxItemAndReplacePlanAtomic(user.uid, document, item)
        : await createInboxItemAndAddToPlanAtomic(user.uid, document, item);
      planRevision.current = saved.document.revision || 0;
      setCompletedItemIds(saved.document.execution?.completedItemIds || []);
      loadConfirmedPlan(planDraftFromDocument(saved.document), state.inputData);
      setViewMode('execution');
      setSaveStatus('saved');
      window.dispatchEvent(new Event('app-a-inbox-changed'));
      return { status: 'saved' };
    } catch (error) {
      return { status: 'error', code: error instanceof Error && error.message === 'duplicate' ? 'duplicate' : 'invalid_plan' };
    }
  };

  const handleQuickSaveLater = async (title: string, minutes: number, capacityType: "flexible" | "fixed"): Promise<boolean> => {
    if (!user || demoConfig) return false;
    try {
      await saveInboxItem(user.uid, makeManualInboxItem(title, minutes, capacityType === "fixed" ? "fixed" : "flexible"));
      window.dispatchEvent(new Event('app-a-inbox-changed'));
      return true;
    } catch { return false; }
  };

  const handleAddRolloverCandidate = async (candidate: UnfinishedRolloverCandidate): Promise<string | null> => {
    if (!user || !state.planDraft) return 'invalid_plan';
    const result = addRolloverCandidateToPlan(state.planDraft, candidate);
    if ('error' in result) return result.error;
    try {
      const document = createDailyPlanDocument(state.inputData, result.draft, language, activePlanDate, effectiveTimeZone);
      document.execution = { completedItemIds };
      const saved = await saveDailyPlanWithRolloverDecisionAtomic(user.uid, document, {
        sourceLocalDate: candidate.sourceLocalDate,
        sourcePlanItemId: candidate.id,
        status: 'carried',
      });
      planRevision.current = saved.revision || 0;
      setCompletedItemIds(saved.execution?.completedItemIds || []);
      loadConfirmedPlan(planDraftFromDocument(saved), state.inputData);
      setRolloverCandidates((prev) =>
        prev.filter((item) => !(item.sourceLocalDate === candidate.sourceLocalDate && item.id === candidate.id)),
      );
      setViewMode('execution');
      setSaveStatus('saved');
      return null;
    } catch {
      return 'invalid_plan';
    }
  };

  const handleBulkAddToToday = async (candidatesToAdd: UnfinishedRolloverCandidate[]): Promise<void> => {
    if (!user || !state.planDraft) return;
    let currentDraft = state.planDraft;
    const handledCandidates: UnfinishedRolloverCandidate[] = [];

    for (const candidate of candidatesToAdd) {
      const result = addRolloverCandidateToPlan(currentDraft, candidate);
      if ('draft' in result) {
        currentDraft = result.draft;
        handledCandidates.push(candidate);
      }
    }

    if (handledCandidates.length === 0) return;

    try {
      const document = createDailyPlanDocument(state.inputData, currentDraft, language, activePlanDate, effectiveTimeZone);
      document.execution = { completedItemIds };
      // Save last decision atomically with plan document
      const last = handledCandidates[handledCandidates.length - 1];
      const saved = await saveDailyPlanWithRolloverDecisionAtomic(user.uid, document, {
        sourceLocalDate: last.sourceLocalDate,
        sourcePlanItemId: last.id,
        status: 'carried',
      });
      // Save remaining decisions
      for (const cand of handledCandidates.slice(0, -1)) {
        await saveRolloverDecision(user.uid, {
          sourceLocalDate: cand.sourceLocalDate,
          sourcePlanItemId: cand.id,
          status: 'carried',
        });
      }
      planRevision.current = saved.revision || 0;
      setCompletedItemIds(saved.execution?.completedItemIds || []);
      loadConfirmedPlan(planDraftFromDocument(saved), state.inputData);
      const handledKeys = new Set(handledCandidates.map((c) => `${c.sourceLocalDate}_${c.id}`));
      setRolloverCandidates((prev) =>
        prev.filter((item) => !handledKeys.has(`${item.sourceLocalDate}_${item.id}`)),
      );
      setViewMode('execution');
      setSaveStatus('saved');
    } catch (err) {
      console.error("Bulk add rollover failed:", err);
    }
  };

  const handleMoveToInbox = async (candidate: UnfinishedRolloverCandidate): Promise<void> => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const inboxItem: AppAInboxItem = {
      id: createManualInboxItemId(),
      title: candidate.title,
      details: candidate.description,
      kind: candidate.kind === 'waiting_for' ? 'waiting_for' : 'task',
      horizon: 'this_week',
      status: 'inbox',
      estimatedMinutes: candidate.estimatedMinutes,
      capacityType: candidate.capacityType === 'fixed' ? 'fixed' : 'flexible',
      source: 'rollover',
      sourceLocalDate: candidate.sourceLocalDate,
      sourceItemId: candidate.id,
      language,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await saveInboxItemWithRolloverDecisionAtomic(user.uid, inboxItem, {
      sourceLocalDate: candidate.sourceLocalDate,
      sourcePlanItemId: candidate.id,
      status: 'inbox',
    });

    window.dispatchEvent(new Event('app-a-inbox-changed'));
    setRolloverCandidates((prev) =>
      prev.filter((item) => !(item.sourceLocalDate === candidate.sourceLocalDate && item.id === candidate.id)),
    );
  };

  const handleSnoozeThisWeek = async (candidate: UnfinishedRolloverCandidate): Promise<void> => {
    if (!user) return;
    const nextDate = shiftLocalDate(activePlanDate, 7);
    await saveRolloverDecision(user.uid, {
      sourceLocalDate: candidate.sourceLocalDate,
      sourcePlanItemId: candidate.id,
      status: 'snoozed',
      snoozedUntilLocalDate: nextDate,
    });
    setRolloverCandidates((prev) =>
      prev.filter((item) => !(item.sourceLocalDate === candidate.sourceLocalDate && item.id === candidate.id)),
    );
  };

  const handleScheduleDate = async (candidate: UnfinishedRolloverCandidate, targetDate: string): Promise<void> => {
    if (!user || !targetDate) return;
    await saveRolloverDecision(user.uid, {
      sourceLocalDate: candidate.sourceLocalDate,
      sourcePlanItemId: candidate.id,
      status: 'scheduled',
      scheduledLocalDate: targetDate,
    });
    setRolloverCandidates((prev) =>
      prev.filter((item) => !(item.sourceLocalDate === candidate.sourceLocalDate && item.id === candidate.id)),
    );
  };

  const handleSendReminder = async (candidate: UnfinishedRolloverCandidate): Promise<void> => {
    if (!user || !state.planDraft) return;
    const reminderCandidate: UnfinishedRolloverCandidate = {
      ...candidate,
      id: `reminder_${candidate.id}`,
      title: language === 'sr' ? `Pošalji podsetnik: ${candidate.title}` : language === 'tr' ? `Hatırlatıcı gönder: ${candidate.title}` : `Send reminder: ${candidate.title}`,
      estimatedMinutes: Math.min(candidate.estimatedMinutes, 15),
      kind: 'task',
    };
    await handleAddRolloverCandidate(reminderCandidate);
  };

  const handleMarkComplete = async (candidate: UnfinishedRolloverCandidate): Promise<void> => {
    if (!user) return;
    await markHistoricalTaskComplete(user.uid, candidate.sourceLocalDate, candidate.id);
    setRolloverCandidates((prev) =>
      prev.filter((item) => !(item.sourceLocalDate === candidate.sourceLocalDate && item.id === candidate.id)),
    );
  };

  const handleDismiss = async (candidate: UnfinishedRolloverCandidate): Promise<void> => {
    if (!user) return;
    await saveRolloverDecision(user.uid, {
      sourceLocalDate: candidate.sourceLocalDate,
      sourcePlanItemId: candidate.id,
      status: 'dismissed',
    });
    setRolloverCandidates((prev) =>
      prev.filter((item) => !(item.sourceLocalDate === candidate.sourceLocalDate && item.id === candidate.id)),
    );
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [state.phase]);

  let content;

  // Loading state (submitting or resolving)
  if (isLoadingSavedPlan) {
    content = <DailyResetLoadingState phase="loading_saved" language={language} />;
  } else if (state.phase === 'submitting' || state.phase === 'resolving') {
    content = (
      <DailyResetLoadingState
        phase={state.phase}
        language={language}
        onCancel={() => cancel()}
      />
    );
  } else if (state.phase === 'error' && state.error) {
    content = (
      <DailyResetErrorPanel
        error={state.error}
        onRetry={retry}
        onBackToEdit={backToEdit}
        language={language}
      />
    );
  } else if (state.phase === 'clarification_needed') {
    content = (
      <div className="mx-auto w-full max-w-[720px] px-5 sm:px-6">
        <ClarificationForm
          questions={state.questions}
          answers={state.answers}
          onAnswerChange={setAnswer}
          onSubmit={() => submitResolve()}
          onBackToEdit={backToEdit}
          language={language}
        />
      </div>
    );
  } else if (state.phase === 'plan_ready' && state.planDraft) {
    content = viewMode === 'execution' ? (
      <TodayExecutionScreen
        draft={state.planDraft}
        language={language}
        completedItemIds={completedItemIds}
        updatingItemId={updatingItemId}
        error={executionError}
        onToggle={(itemId) => void handleToggleCompletion(itemId)}
        onEditPlan={() => {
          setViewMode('review');
          setExecutionError(null);
        }}
        defaultFocusMinutes={preferences.defaultFocusMinutes}
        onOpenReset={() => setResetSessionsOpen(true)}
        onQuickAddToday={handleQuickAddToday}
        onQuickSaveLater={handleQuickSaveLater}
        onReevaluatePriorities={(draft) => {
          updateReviewDraft(draft);
          void handleConfirm(draft);
        }}
      />
    ) : (
      <DailyPlanReview
        onDraftChange={updateReviewDraft}
        initialDraft={state.planDraft}
        language={language}
        onBackToEdit={backToEdit}
        onConfirm={handleConfirm}
        saveStatus={saveStatus}
        saveError={saveError}
        saveDiagnostic={saveDiagnostic}
        onDirty={() => {
          setViewMode('review');
          setSaveStatus('idle');
          setSaveError(null);
          setSaveDiagnostic(null);
        }}
      />
    );
  } else {
    content = (
      <div className="mx-auto w-full max-w-[720px] px-5 sm:px-6">
        <div className="mb-7 sm:mb-9">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071E3] dark:text-[#0A84FF]">{t.today}</p>
          <h1 className="mb-3 text-[32px] font-bold leading-[1.08] tracking-[-0.035em] text-black sm:text-[38px] dark:text-white">{t.dailyResetTitle}</h1>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.dailyResetIntro}</p>
        </div>
        {rolloverCandidates.length > 0 && (
          <div className="mb-6">
            <UnfinishedTasksSection
              candidates={rolloverCandidates}
              language={language}
              hasConfirmedPlanToday={false}
              isLoading={isLoadingRollover}
              mode="form_selection"
              onAddToToday={handleAddRolloverCandidate}
              onBulkAddToToday={handleBulkAddToToday}
              onMoveToInbox={handleMoveToInbox}
              onSnoozeThisWeek={handleSnoozeThisWeek}
              onScheduleDate={handleScheduleDate}
              onSendReminder={handleSendReminder}
              onMarkComplete={handleMarkComplete}
              onDismiss={handleDismiss}
              onSelectForReset={(candidate) => {
                const line = candidate.deadlineText
                  ? `• ${candidate.title} (${candidate.estimatedMinutes} min, rok: ${candidate.deadlineText})`
                  : `• ${candidate.title} (${candidate.estimatedMinutes} min)`;
                const current = state.inputData.brainDump || '';
                if (!current.includes(candidate.title)) {
                  const updated = current.trim() ? `${current.trim()}\n${line}` : line;
                  updateInputData({ brainDump: updated });
                }
              }}
              onSelectAllForReset={(list) => {
                let updated = state.inputData.brainDump || '';
                for (const cand of list) {
                  if (!updated.includes(cand.title)) {
                    const line = cand.deadlineText
                      ? `• ${cand.title} (${cand.estimatedMinutes} min, rok: ${cand.deadlineText})`
                      : `• ${cand.title} (${cand.estimatedMinutes} min)`;
                    updated = updated.trim() ? `${updated.trim()}\n${line}` : line;
                  }
                }
                updateInputData({ brainDump: updated });
              }}
              selectedForResetIds={rolloverCandidates
                .filter((c) => state.inputData.brainDump?.includes(c.title))
                .map((c) => c.id)}
            />
          </div>
        )}
        <DailyResetForm
          key={formVersion}
          onDraftChange={updateInputData}
          t={t}
          language={language}
          initialData={state.inputData}
          onSubmit={async (validatedData) => {
            updateInputData(validatedData);
            setFormError(null);
            if (import.meta.env.PROD && !user && !demoConfig) {
              try { await signInWithGoogle(); } catch {
                setFormError(language === 'sr' ? 'Plan nije pokrenut jer prijava nije završena. Pokušajte ponovo kada budete spremni.' : language === 'tr' ? 'Giriş tamamlanmadığı için plan başlatılmadı. Hazır olduğunuzda tekrar deneyin.' : 'The plan was not started because sign-in was not completed. Try again when you are ready.');
                return;
              }
            }
            void submitInitial(validatedData);
          }}
          aiEnabled={preferences.aiSuggestionsEnabled}
          onboardingCompleted={onboardingCompleted}
          submissionError={formError}
          aiDisabledMessage={language === 'sr' ? 'AI predlozi su isključeni u Podešavanjima.' : language === 'tr' ? 'AI önerileri Ayarlar bölümünde kapalı.' : 'AI suggestions are turned off in Settings.'}
        />
      </div>
    );
  }

  return (
    <>
      {demoConfig && (
        <DailyResetDemoBanner language={language} scenario={demoConfig.scenario} />
      )}
      {content}
      {!isLoadingSavedPlan && state.phase === 'plan_ready' && viewMode === 'execution' && (
        <>
          <UnfinishedTasksSection
            candidates={rolloverCandidates}
            language={language}
            hasConfirmedPlanToday={Boolean(state.planDraft && viewMode === 'execution')}
            isLoading={isLoadingRollover}
            mode="execution"
            selectedForResetIds={selectedExecutionRolloverIds}
            onSelectForReset={(candidate) => {
              setSelectedExecutionRolloverIds((prev) =>
                prev.includes(candidate.id)
                  ? prev.filter((id) => id !== candidate.id)
                  : [...prev, candidate.id]
              );
            }}
            onSelectAllForReset={(list) => {
              const ids = list.map((c) => c.id);
              setSelectedExecutionRolloverIds((prev) => Array.from(new Set([...prev, ...ids])));
            }}
            onReevaluateWithSelected={(selectedList) => {
              setReevaluationCandidates(selectedList);
            }}
            onAddToToday={handleAddRolloverCandidate}
            onBulkAddToToday={handleBulkAddToToday}
            onMoveToInbox={handleMoveToInbox}
            onSnoozeThisWeek={handleSnoozeThisWeek}
            onScheduleDate={handleScheduleDate}
            onSendReminder={handleSendReminder}
            onMarkComplete={handleMarkComplete}
            onDismiss={handleDismiss}
          />
          <TodayCandidatesSection
            userId={user?.uid}
            language={language}
            localDate={activePlanDate}
            planState={!state.planDraft ? 'none' : viewMode === 'execution' ? 'confirmed' : 'draft'}
            onPlanAction={() => {
              const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
              window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            }}
            onAddToPlan={handleAddVisionCandidate}
            onOpenVision={onOpenVision}
          />
          <DueInboxItemsSection userId={user?.uid} localDate={activePlanDate} language={language} canAddToPlan={Boolean(state.planDraft && viewMode === 'execution')} onAddToPlan={handleAddInboxItem} />
        </>
      )}
      {reevaluationCandidates && state.planDraft && (
        <ReevaluationDialog
          draft={state.planDraft}
          language={language}
          localDate={activePlanDate}
          additionalCandidates={reevaluationCandidates}
          onClose={() => setReevaluationCandidates(null)}
          onConfirm={async (proposal, modifications) => {
            const { applyReevaluationProposal } = await import('./planReview');
            const finalDraft = applyReevaluationProposal(state.planDraft!, proposal, modifications);
            if ((finalDraft as any).error) return;
            if (user && !demoConfig) {
              const document = createDailyPlanDocument(state.inputData, finalDraft, language, activePlanDate, effectiveTimeZone);
              document.execution = { completedItemIds };
              const decisions: AppARolloverDecision[] = reevaluationCandidates.map((c) => ({
                sourceLocalDate: c.sourceLocalDate,
                sourcePlanItemId: c.id,
                status: 'carried',
              }));
              const saved = await saveDailyPlanWithMultipleRolloverDecisionsAtomic(user.uid, document, decisions);
              planRevision.current = saved.revision || 0;
              setCompletedItemIds(saved.execution?.completedItemIds || []);
              loadConfirmedPlan(planDraftFromDocument(saved), state.inputData);
              setRolloverCandidates((prev) =>
                prev.filter((c) => !decisions.some((d) => d.sourceLocalDate === c.sourceLocalDate && d.sourcePlanItemId === c.id))
              );
              setSelectedExecutionRolloverIds([]);
            } else if (demoConfig) {
              loadConfirmedPlan(finalDraft, state.inputData);
              setRolloverCandidates((prev) =>
                prev.filter((c) => !reevaluationCandidates.some((rc) => rc.id === c.id))
              );
              setSelectedExecutionRolloverIds([]);
            }
            setReevaluationCandidates(null);
          }}
        />
      )}
      {resetSessionsOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={language === 'sr' ? 'Sesije za predah' : language === 'tr' ? 'Mola oturumları' : 'Reset sessions'} onMouseDown={(event) => { if (event.target === event.currentTarget) setResetSessionsOpen(false); }}>
          <div className="app-a-surface max-h-[92vh] w-full max-w-[820px] overflow-x-hidden overflow-y-auto p-1 shadow-2xl sm:p-2" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex justify-end bg-[var(--app-a-surface)] px-3 pt-3">
              <button type="button" onClick={() => setResetSessionsOpen(false)} className="app-a-secondary-button app-a-focus-ring px-3 text-[13px]">
                {language === 'sr' ? 'Zatvori' : language === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </div>
            <ResetSessions language={language} embedded />
          </div>
        </div>
      ) : null}
    </>
  );
}
