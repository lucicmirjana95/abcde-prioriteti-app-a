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
} from '../persistence/dailyPlanDocument';
import { getEffectiveTimeZone } from '../settings/preferences';
import {
  loadConfirmedDailyPlan,
  saveDailyPlanCompletion,
  saveConfirmedDailyPlan,
  extractDiagnosticFromSaveError,
  PersistenceSaveDiagnostic,
} from '../persistence/dailyPlanRepository';
import type { DailyPlanDraft } from '../domain/daily-reset/contracts';
import { normalizeCompletedItemIds, toggleCompletedItemId } from './todayExecution';
import DailyRoutinesSection from '../components/routines/DailyRoutinesSection';
import ResetSessions from '../components/reset/ResetSessions';
import TodayCandidatesSection from '../components/vision/TodayCandidatesSection';
import type { TodayCandidate } from '../../shared/domain/today-candidates';
import { addVisionCandidateToPlan } from './visionCandidatePlan';
import UnfinishedTasksSection from '../components/rollover/UnfinishedTasksSection';
import {
  loadUnfinishedRolloverCandidates,
  markHistoricalTaskComplete,
  saveDailyPlanWithRolloverDecisionAtomic,
  saveRolloverDecision,
} from '../persistence/rolloverRepository';
import { shiftLocalDate, type UnfinishedRolloverCandidate } from '../domain/rollover/contracts';
import { addRolloverCandidateToPlan } from './rolloverCandidatePlan';
import type { DataResetEventDetail } from '../components/settings/DataResetModal';
import { importDailyPlanItemsToInbox } from '../persistence/inboxRepository';

interface Props {
  language: AppALanguage;
  client?: DailyResetApiClient;
  demoConfig?: DailyResetDemoConfig | null;
  initialData?: Partial<DailyResetData>;
  preferences: AppAPreferences;
}

export default function TodayScreen({ language, client, demoConfig, initialData, preferences }: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  const effectiveTimeZone = getEffectiveTimeZone(preferences);
  const {
    state,
    submitInitial,
    submitResolve,
    setAnswer,
    retry,
    cancel,
    backToEdit,
    loadConfirmedPlan,
  } = useTodayFlow(language, client, initialData);
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveDiagnostic, setSaveDiagnostic] = useState<string | null>(null);
  const [isLoadingSavedPlan, setIsLoadingSavedPlan] = useState(false);
  const [viewMode, setViewMode] = useState<'review' | 'execution'>('review');
  const [completedItemIds, setCompletedItemIds] = useState<string[]>([]);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [activePlanDate, setActivePlanDate] = useState(() => getLocalDateKeyInTimeZone(effectiveTimeZone));
  const [rolloverCandidates, setRolloverCandidates] = useState<UnfinishedRolloverCandidate[]>([]);
  const [isLoadingRollover, setIsLoadingRollover] = useState(false);
  const loadedForUserAndDate = useRef<string | null>(null);
  const isConfirmingRef = useRef(false);

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
      }
    };

    window.addEventListener('app-a-data-reset', handleDataReset);
    return () => window.removeEventListener('app-a-data-reset', handleDataReset);
  }, [cancel]);

  useEffect(() => {
    if (demoConfig || !authReady || !user || isConfirmingRef.current) return;
    const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
    const loadKey = `${user.uid}:${localDate}`;
    if (loadedForUserAndDate.current === loadKey) return;
    loadedForUserAndDate.current = loadKey;
    setIsLoadingSavedPlan(true);

    let cancelled = false;
    void loadConfirmedDailyPlan(user.uid, localDate)
      .then((saved) => {
        if (!cancelled && saved) {
          loadConfirmedPlan(saved.plan, dailyResetDataFromDocument(saved));
          setCompletedItemIds(
            normalizeCompletedItemIds(saved.plan, saved.execution?.completedItemIds || []),
          );
          setActivePlanDate(saved.localDate);
          setViewMode('execution');
          setSaveStatus('saved');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveStatus('error');
          setSaveError(t.planLoadError);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSavedPlan(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, demoConfig, effectiveTimeZone, loadConfirmedPlan, t.planLoadError, user]);

  const handleConfirm = async (draft: DailyPlanDraft) => {
    setSaveStatus('saving');
    setSaveError(null);
    setSaveDiagnostic(null);
    isConfirmingRef.current = true;
    try {
      if (demoConfig) {
        setCompletedItemIds([]);
        setViewMode('execution');
        setSaveStatus('saved');
        return;
      }
      const activeUser = user || await signInWithGoogle();
      const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
      const document = createDailyPlanDocument(state.inputData, draft, language, localDate, effectiveTimeZone);
      await saveConfirmedDailyPlan(activeUser.uid, document);
      // Inbox ingestion is secondary: a confirmed daily plan must never be reported as
      // failed merely because deferred-item indexing is temporarily unavailable.
      void importDailyPlanItemsToInbox(activeUser.uid, document).catch(() => undefined);
      loadedForUserAndDate.current = `${activeUser.uid}:${document.localDate}`;
      setActivePlanDate(document.localDate);
      setCompletedItemIds([]);
      setViewMode('execution');
      setSaveStatus('saved');
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
        await saveDailyPlanCompletion(user.uid, activePlanDate, next);
      }
    } catch {
      setCompletedItemIds(previous);
      setExecutionError(t.completionSaveError);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleAddVisionCandidate = async (candidate: TodayCandidate): Promise<string | null> => {
    if (!user || !state.planDraft) return 'invalid_plan';
    const result = addVisionCandidateToPlan(state.planDraft, candidate);
    if ('error' in result) return result.error;
    try {
      const document = createDailyPlanDocument(state.inputData, result.draft, language, activePlanDate, effectiveTimeZone);
      document.execution = { completedItemIds };
      await saveConfirmedDailyPlan(user.uid, document);
      loadConfirmedPlan(result.draft, state.inputData);
      setViewMode('execution');
      setSaveStatus('saved');
      return null;
    } catch {
      return 'invalid_plan';
    }
  };

  const handleAddRolloverCandidate = async (candidate: UnfinishedRolloverCandidate): Promise<string | null> => {
    if (!user || !state.planDraft) return 'invalid_plan';
    const result = addRolloverCandidateToPlan(state.planDraft, candidate);
    if ('error' in result) return result.error;
    try {
      const document = createDailyPlanDocument(state.inputData, result.draft, language, activePlanDate, effectiveTimeZone);
      document.execution = { completedItemIds };
      await saveDailyPlanWithRolloverDecisionAtomic(user.uid, document, {
        sourceLocalDate: candidate.sourceLocalDate,
        sourcePlanItemId: candidate.id,
        status: 'carried',
      });
      loadConfirmedPlan(result.draft, state.inputData);
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

  const handleRemindTomorrow = async (candidate: UnfinishedRolloverCandidate): Promise<void> => {
    if (!user) return;
    const nextDate = shiftLocalDate(activePlanDate, 1);
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
      />
    ) : (
      <DailyPlanReview
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
        <DailyResetForm
          t={t}
          initialData={state.inputData}
          onSubmit={(validatedData) => {
            submitInitial(validatedData);
          }}
          aiEnabled={preferences.aiSuggestionsEnabled}
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
      {!isLoadingSavedPlan && state.phase !== 'submitting' && state.phase !== 'resolving' && (
        <>
          <UnfinishedTasksSection
            candidates={rolloverCandidates}
            language={language}
            hasConfirmedPlanToday={Boolean(state.planDraft && viewMode === 'execution')}
            isLoading={isLoadingRollover}
            onAddToToday={handleAddRolloverCandidate}
            onRemindTomorrow={handleRemindTomorrow}
            onMarkComplete={handleMarkComplete}
            onDismiss={handleDismiss}
          />
          <TodayCandidatesSection userId={user?.uid} language={language} canAddToPlan={Boolean(state.planDraft && viewMode === 'execution')} onAddToPlan={handleAddVisionCandidate} />
          <DailyRoutinesSection userId={user?.uid} language={language} />
          <ResetSessions language={language} />
        </>
      )}
    </>
  );
}
