import {
  DailyResetInput,
  DailyResetClarificationSubmission,
  ClarificationQuestion,
  ClarificationAnswer,
  DailyPlanDraft,
  DailyResetApiResponse,
  SupportedLanguage,
  MaterialImpact,
  ClarificationMode,
} from "../domain/daily-reset/contracts";
import { DailyResetApiClient, createDailyResetApiClient } from "../api";
import { DailyResetData } from "../types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { readSessionDraft, writeSessionDraft } from '../persistence/sessionDraft';
import { validatePlanDraft } from '../domain/daily-reset/validation';
import {
  clearPersistentBrainDump,
  loadPersistentBrainDump,
  savePersistentBrainDump,
} from "../persistence/brainDumpPersistence";

export const CLARIFICATION_UNKNOWN_VALUE = "__UNKNOWN__";

export interface ClarificationHistoryEntry {
  roundIndex: number;
  questionId: string;
  question: ClarificationQuestion;
  context: string;
  materialImpact: MaterialImpact;
  relatedItemIds: string[];
  answer: string;
  isUnknown?: boolean;
}

export function normalizeQuestionText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яёčćžšđ]/gi, "")
    .trim();
}

export function getCanonicalTopic(q: ClarificationQuestion): string {
  const impact = q.materialImpact;
  if (
    impact === "deadline" ||
    impact === "duration" ||
    impact === "dependency" ||
    impact === "classification" ||
    impact === "goal_relationship" ||
    impact === "capacity"
  ) {
    return impact;
  }
  const text = (q.question + " " + (q.context || "")).toLowerCase();
  if (/rok|deadline|kada|vreme|time|termin|hitno/i.test(text)) return "deadline";
  if (/trajanje|duration|koliko dugo|kolko|minut|sat|vremena/i.test(text)) return "duration";
  if (/zavisi|blocker|koči|čeka|uslov|depend/i.test(text)) return "dependency";
  if (/klasifik|kategor|vrsta|tip|task|posao|lično/i.test(text)) return "classification";
  if (/cilj|vizij|vision|goal|svrha/i.test(text)) return "goal_relationship";
  if (/kapacitet|capacity|dostupno|slobodno/i.test(text)) return "capacity";
  return "other";
}

export function isSemanticDuplicate(q: ClarificationQuestion, entry: ClarificationHistoryEntry): boolean {
  if (q.id === entry.questionId || (entry.question && q.id === entry.question.id)) return true;

  const normQ = normalizeQuestionText(q.question);
  const normH = normalizeQuestionText(entry.question ? entry.question.question : (entry as any).question);
  if (normQ && normH && normQ === normH) return true;

  const topicQ = getCanonicalTopic(q);
  const topicH = entry.question ? getCanonicalTopic(entry.question) : entry.materialImpact;
  const sameTopic = topicQ !== "other" && topicQ === topicH;
  const sameImpact = q.materialImpact !== "other" && q.materialImpact === entry.materialImpact;

  const qItems = new Set(q.relatedItemIds || []);
  const hItems = new Set(entry.relatedItemIds || []);
  const hasItemOverlap = qItems.size > 0 && Array.from(qItems).some((id) => hItems.has(id));

  if (sameTopic && sameImpact) {
    if (hasItemOverlap) return true;
    if (normQ.length > 5 && (normQ.includes(normH) || normH.includes(normQ))) return true;
  }

  return false;
}

export function filterDuplicateQuestions(
  newQuestions: ClarificationQuestion[],
  history: ClarificationHistoryEntry[]
): ClarificationQuestion[] {
  const seenIds = new Set<string>();
  const seenNorm = new Set<string>();

  return (newQuestions || []).filter((q) => {
    if (!q || !q.id || !q.question) return false;
    if (seenIds.has(q.id)) return false;
    const norm = normalizeQuestionText(q.question);
    if (seenNorm.has(norm)) return false;

    const isDup = (history || []).some((h) => isSemanticDuplicate(q, h));
    if (isDup) return false;

    seenIds.add(q.id);
    seenNorm.add(norm);
    return true;
  });
}

export type TodayFlowPhase =
  | "editing"
  | "submitting"
  | "clarification_needed"
  | "resolving"
  | "plan_ready"
  | "error";

export interface TodayFlowError {
  message: string;
  code?: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
}

export interface TodayFlowState {
  phase: TodayFlowPhase;
  language: SupportedLanguage;
  inputData: DailyResetData;
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  unknowns: Record<string, boolean>;
  history: ClarificationHistoryEntry[];
  roundIndex: number;
  showSummaryOptions: boolean;
  planDraft: DailyPlanDraft | null;
  error: TodayFlowError | null;
  failedPhase: "initial" | "resolve" | null;
  unsaved?: boolean;
}

export function convertDataToInput(
  data: DailyResetData,
  language: SupportedLanguage
): DailyResetInput {
  let availableMinutes: number | undefined = undefined;
  if (data.availableTime) {
    const { type, customHours, customMinutes } = data.availableTime;
    if (type === "30m") availableMinutes = 30;
    else if (type === "1h") availableMinutes = 60;
    else if (type === "2h") availableMinutes = 120;
    else if (type === "4h") availableMinutes = 240;
    // A broad description is not an exact, user-confirmed time budget.
    else if (type === "most_day") availableMinutes = undefined;
    else if (type === "custom") {
      const mins = (customHours || 0) * 60 + (customMinutes || 0);
      if (mins > 0) availableMinutes = mins;
    }
  }

  return {
    brainDump: data.brainDump,
    language,
    energy: data.energy,
    pleasantness: data.pleasantness,
    availableMinutes,
    stateNote: data.stateNote ? data.stateNote : undefined,
  };
}

export function getLocalizedTimeoutMessage(lang: SupportedLanguage): string {
  if (lang === "sr") {
    return "Planiranje je ovog puta trajalo predugo. Vaš unos je sačuvan — možete pokušati ponovo.";
  }
  if (lang === "tr") {
    return "Planlama bu sefer çok uzun sürdü. Girişiniz korundu — tekrar deneyebilirsiniz.";
  }
  return "Planning took too long this time. Your input is preserved — you can try again.";
}

export class TodayFlowController {
  private client: DailyResetApiClient;
  private state: TodayFlowState;
  private listeners: Array<(state: TodayFlowState) => void> = [];
  private activeAbortController: AbortController | null = null;
  private activeRequestId: number = 0;
  private isSubmittingInitial: boolean = false;
  private isSubmittingResolve: boolean = false;
  private autoDraftRequested: boolean = false;
  private draftKey?: string;

  constructor(
    language: SupportedLanguage = "en",
    client?: DailyResetApiClient,
    initialData?: Partial<DailyResetData>,
    draftKey?: string,
  ) {
    this.client = client || createDailyResetApiClient();
    this.draftKey = draftKey;
    const userId = draftKey ? draftKey.split(":")[0] : undefined;
    const initialBrainDump =
      initialData?.brainDump !== undefined
        ? initialData.brainDump
        : loadPersistentBrainDump(userId);

    this.state = {
      phase: "editing",
      language,
      inputData: {
        stateNote: "",
        ...initialData,
        brainDump: initialBrainDump,
      },
      questions: [],
      answers: {},
      unknowns: {},
      history: [],
      roundIndex: 1,
      showSummaryOptions: false,
      planDraft: null,
      error: null,
      failedPhase: null,
    };
  }

  getState(): TodayFlowState {
    return this.state;
  }

  restoreDraft(value: TodayFlowState) {
    if (!value.unsaved) return;
    this.state = {
      ...value,
      unknowns: value.unknowns || {},
      history: value.history || [],
      roundIndex: value.roundIndex || 1,
      showSummaryOptions: value.showSummaryOptions || false,
      language: this.state.language,
      phase:
        value.phase === "submitting"
          ? "editing"
          : value.phase === "resolving"
          ? "clarification_needed"
          : value.phase,
    };
  }

  subscribe(listener: (state: TodayFlowState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(partial: Partial<TodayFlowState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  setLanguage(language: SupportedLanguage) {
    this.updateState({ language });
  }

  updateInputData(data: Partial<DailyResetData>) {
    if (data.brainDump !== undefined) {
      const userId = this.draftKey ? this.draftKey.split(":")[0] : undefined;
      savePersistentBrainDump(data.brainDump, userId);
    }
    this.updateState({
      unsaved: true,
      inputData: { ...this.state.inputData, ...data },
    });
  }

  setAnswer(questionId: string, answer: string) {
    const isUnknown = answer === CLARIFICATION_UNKNOWN_VALUE;
    this.updateState({
      unsaved: true,
      answers: { ...this.state.answers, [questionId]: answer },
      unknowns: { ...this.state.unknowns, [questionId]: isUnknown },
    });
  }

  markUnknown(questionId: string) {
    const currentUnk = !this.state.unknowns[questionId];
    this.updateState({
      unsaved: true,
      unknowns: { ...this.state.unknowns, [questionId]: currentUnk },
      answers: {
        ...this.state.answers,
        [questionId]: currentUnk ? CLARIFICATION_UNKNOWN_VALUE : "",
      },
    });
  }

  saveLater() {
    this.updateState({ unsaved: true });
  }

  cancel() {
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }
    this.activeRequestId++;
    this.isSubmittingInitial = false;
    this.isSubmittingResolve = false;

    if (this.state.phase === "submitting") {
      this.updateState({
        phase: "editing",
        error: null,
        failedPhase: null,
      });
    } else if (this.state.phase === "resolving") {
      this.updateState({
        phase: "clarification_needed",
        error: null,
        failedPhase: null,
      });
    }
  }

  async submitInitial(data?: DailyResetData): Promise<void> {
    if (this.isSubmittingInitial) return;
    this.isSubmittingInitial = true;

    if (data) {
      this.updateInputData(data);
    }
    const currentData = this.state.inputData;

    // Local validation check for empty brain dump before fetch
    if (!currentData.brainDump || !currentData.brainDump.trim()) {
      this.isSubmittingInitial = false;
      const msg =
        this.state.language === "sr"
          ? "Napišite šta vam je na umu da bismo kreirali plan."
          : this.state.language === "tr"
          ? "Bir plan oluşturmak için lütfen aklınızdakileri yazın."
          : "Please write what is on your mind to create a plan.";
      this.updateState({
        phase: "error",
        error: {
          message: msg,
          code: "invalid_input",
          retryable: false,
          fieldErrors: { brainDump: msg },
        },
        failedPhase: "initial",
      });
      return;
    }

    const input = convertDataToInput(currentData, this.state.language);

    const abortController = new AbortController();
    this.activeAbortController = abortController;
    const currentRequestId = ++this.activeRequestId;

    this.updateState({
      phase: "submitting",
      error: null,
      failedPhase: null,
    });

    try {
      const response = await this.client.analyze(input, abortController.signal);
      if (this.activeRequestId !== currentRequestId) {
        return;
      }
      this.handleApiResponse(response, "initial");
    } catch (err: any) {
      if (this.activeRequestId !== currentRequestId) {
        return;
      }
      this.updateState({
        phase: "error",
        error: {
          message: getLocalizedTimeoutMessage(this.state.language),
          code: "timeout",
          retryable: true,
        },
        failedPhase: "initial",
      });
    } finally {
      this.isSubmittingInitial = false;
      if (this.activeAbortController === abortController) {
        this.activeAbortController = null;
      }
    }
  }

  async submitResolve(
    actionOrAnswers?: "submit" | "draft_now" | "continue_details" | Record<string, string>,
    answers?: Record<string, string>
  ): Promise<void> {
    if (this.isSubmittingResolve) return;
    this.isSubmittingResolve = true;

    try {
      let action: "submit" | "draft_now" | "continue_details" = "submit";
      let answersParam = answers;
      if (typeof actionOrAnswers === "string") {
        action = actionOrAnswers;
      } else if (actionOrAnswers && typeof actionOrAnswers === "object") {
        answersParam = actionOrAnswers;
      }

      if (answersParam) {
        this.updateState({ answers: { ...this.state.answers, ...answersParam } });
      }
      const currentAnswers = this.state.answers;
      const currentUnknowns = this.state.unknowns;
      const currentData = this.state.inputData;
      const questions = this.state.questions;

      // Check if all questions have answers or explicit unknown, unless user explicitly clicked "draft_now"
      if (action !== "draft_now") {
        const missing = questions.some((q) => {
          const ans = currentAnswers[q.id];
          const isUnk = currentUnknowns[q.id] || ans === CLARIFICATION_UNKNOWN_VALUE;
          return !isUnk && (!ans || !ans.trim());
        });
        if (missing) {
          const msg =
            this.state.language === "sr"
              ? "Molimo odgovorite na sva pitanja ili označite 'Ne znam' pre slanja."
              : this.state.language === "tr"
              ? "Lütfen göndermeden önce tüm soruları yanıtlayın veya 'Bilmiyorum' seçeneğini işaretleyin."
              : "Please answer all questions or select 'I don't know' before submitting.";
          this.updateState({
            phase: "error",
            error: {
              message: msg,
              code: "invalid_input",
              retryable: false,
            },
            failedPhase: "resolve",
          });
          return;
        }
      }

      const clarificationMode: ClarificationMode = action === "draft_now" ? "draft_now" : "continue";

      // Build this round's history entries
      const roundHistory: ClarificationHistoryEntry[] = questions.map((q) => {
        const isUnk = currentUnknowns[q.id] || currentAnswers[q.id] === CLARIFICATION_UNKNOWN_VALUE;
        const ans = isUnk ? CLARIFICATION_UNKNOWN_VALUE : (currentAnswers[q.id] || "").trim();
        return {
          roundIndex: this.state.roundIndex,
          questionId: q.id,
          question: q,
          context: q.context || "",
          materialImpact: q.materialImpact || "other",
          relatedItemIds: q.relatedItemIds || [],
          answer: ans,
          isUnknown: isUnk,
        };
      });

      // Merge into accumulated history, avoiding duplicate question IDs
      const existingHistoryIds = new Set(this.state.history.map((h) => h.questionId || h.question?.id));
      const newEntries = roundHistory.filter((rh) => !existingHistoryIds.has(rh.questionId));
      const accumulatedHistory = [...this.state.history, ...newEntries];

      // Build comprehensive Q/A context across all rounds for API request
      const allAnswersMap = new Map<string, string>();
      accumulatedHistory.forEach((h) => {
        const qid = h.questionId || h.question?.id;
        if (qid) allAnswersMap.set(qid, h.answer);
      });
      questions.forEach((q) => {
        const isUnk = currentUnknowns[q.id] || currentAnswers[q.id] === CLARIFICATION_UNKNOWN_VALUE;
        const ans = isUnk ? CLARIFICATION_UNKNOWN_VALUE : (currentAnswers[q.id] || "").trim();
        allAnswersMap.set(q.id, ans);
      });
      const clarificationAnswers: ClarificationAnswer[] = Array.from(allAnswersMap.entries()).map(
        ([questionId, answer]) => ({ questionId, answer })
      );

      const input = convertDataToInput(currentData, this.state.language);
      const submission: DailyResetClarificationSubmission = {
        ...input,
        clarificationAnswers,
        clarificationRound: this.state.roundIndex,
        clarificationMode,
        clarificationHistory: accumulatedHistory.map((h) => ({
          roundIndex: h.roundIndex,
          questionId: h.questionId,
          question: h.question?.question || (h as any).question || "",
          context: h.context || "",
          materialImpact: h.materialImpact || "other",
          relatedItemIds: h.relatedItemIds || [],
          answer: h.answer,
          isUnknown: h.isUnknown,
        })),
      };

      const abortController = new AbortController();
      this.activeAbortController = abortController;
      const currentRequestId = ++this.activeRequestId;

      this.updateState({
        phase: "resolving",
        history: accumulatedHistory,
        error: null,
        failedPhase: null,
      });

      const questionsForApi =
        questions.length > 0
          ? questions.slice(0, 3)
          : accumulatedHistory.slice(-3).map((h) => h.question);

      try {
        const response = await this.client.resolve(submission, questionsForApi, abortController.signal);
        if (this.activeRequestId !== currentRequestId) {
          return;
        }
        this.handleApiResponse(response, "resolve");
      } catch (err: any) {
        if (this.activeRequestId !== currentRequestId) {
          return;
        }
        this.updateState({
          phase: "error",
          error: {
            message: getLocalizedTimeoutMessage(this.state.language),
            code: "timeout",
            retryable: true,
          },
          failedPhase: "resolve",
        });
      } finally {
        if (this.activeAbortController === abortController) {
          this.activeAbortController = null;
        }
      }
    } finally {
      this.isSubmittingResolve = false;
    }
  }

  async retry(): Promise<void> {
    if (this.state.failedPhase === "initial") {
      await this.submitInitial();
    } else if (this.state.failedPhase === "resolve") {
      await this.submitResolve();
    }
  }

  backToEdit() {
    this.updateState({
      phase: "editing",
      error: null,
      failedPhase: null,
    });
  }

  reset(options?: { clearBrainDump?: boolean }) {
    this.cancel();
    if (options?.clearBrainDump) {
      const userId = this.draftKey ? this.draftKey.split(":")[0] : undefined;
      clearPersistentBrainDump(userId);
      this.updateState({
        unsaved: false,
        phase: "editing",
        inputData: {
          ...this.state.inputData,
          brainDump: "",
        },
        questions: [],
        answers: {},
        unknowns: {},
        history: [],
        roundIndex: 1,
        showSummaryOptions: false,
        planDraft: null,
        error: null,
        failedPhase: null,
      });
      return;
    }
    this.updateState({
      unsaved: false,
      phase: "editing",
      questions: [],
      answers: {},
      unknowns: {},
      history: [],
      roundIndex: 1,
      showSummaryOptions: false,
      planDraft: null,
      error: null,
      failedPhase: null,
    });
  }

  updateReviewDraft(planDraft: DailyPlanDraft) {
    this.updateState({ planDraft, unsaved: true });
  }

  loadConfirmedPlan(planDraft: DailyPlanDraft, inputData?: DailyResetData) {
    this.updateState({
      unsaved: false,
      phase: "plan_ready",
      planDraft,
      ...(inputData ? { inputData } : {}),
      questions: [],
      answers: {},
      error: null,
      failedPhase: null,
    });
  }

  private handleApiResponse(
    response: DailyResetApiResponse,
    phase: "initial" | "resolve"
  ) {
    if (response.phase === "error") {
      const isTimeout = response.code === "timeout";
      const errorMessage = isTimeout
        ? getLocalizedTimeoutMessage(this.state.language)
        : response.error;
      this.updateState({
        phase: "error",
        error: {
          message: errorMessage,
          code: response.code,
          retryable: response.retryable,
          fieldErrors: response.fieldErrors as Record<string, string> | undefined,
        },
        failedPhase: phase,
      });
    } else if (response.phase === "clarification_needed") {
      const filtered = filterDuplicateQuestions(response.questions, this.state.history);
      const nextQuestions = filtered.slice(0, 3);

      if (nextQuestions.length === 0) {
        if (!this.autoDraftRequested) {
          this.autoDraftRequested = true;
          void this.submitResolve("draft_now");
          return;
        }
      }

      const nextRound = phase === "initial" ? 1 : this.state.roundIndex + 1;
      const totalQuestions = this.state.history.length + nextQuestions.length;

      // Hard limit: 5 rounds or 12 questions maximum
      if (nextRound > 5 || totalQuestions > 12) {
        if (!this.autoDraftRequested) {
          this.autoDraftRequested = true;
          void this.submitResolve("draft_now");
          return;
        }
      }

      const showSummary = nextRound >= 3 || this.state.history.length >= 3;

      const nextAnswers: Record<string, string> = {};
      const nextUnknowns: Record<string, boolean> = {};
      nextQuestions.forEach((q) => {
        nextAnswers[q.id] = this.state.answers[q.id] || "";
        nextUnknowns[q.id] = false;
      });

      this.updateState({
        phase: "clarification_needed",
        questions: nextQuestions,
        answers: nextAnswers,
        unknowns: nextUnknowns,
        roundIndex: nextRound,
        showSummaryOptions: showSummary,
        error: null,
        failedPhase: null,
      });
    } else if (response.phase === "plan_ready") {
      this.updateState({
        phase: "plan_ready",
        unsaved: true,
        planDraft: response.draft,
        error: null,
        failedPhase: null,
      });
    }
  }
}

export function useTodayFlow(
  language: SupportedLanguage,
  client?: DailyResetApiClient,
  initialData?: Partial<DailyResetData>,
  draftKey?: string,
) {
  const controller = useMemo(
    () => {
      const instance = new TodayFlowController(language, client, initialData, draftKey);
      if (draftKey) {
        const draft = readSessionDraft<TodayFlowState | null>(draftKey, null, (value) => {
          const saved = value as TodayFlowState | null;
          return !!saved && ['editing', 'submitting', 'resolving', 'clarification_needed', 'plan_ready', 'error'].includes(saved.phase) && typeof saved.inputData?.brainDump === 'string' && Array.isArray(saved.questions) && !!saved.answers && typeof saved.answers === 'object' && (!saved.planDraft || validatePlanDraft(saved.planDraft).valid);
        });
        if (draft) instance.restoreDraft(draft);
      }
      return instance;
    },
    [client, draftKey]
  );
  const [state, setState] = useState<TodayFlowState>(controller.getState());

  useEffect(() => {
    controller.setLanguage(language);
  }, [language, controller]);

  useEffect(() => {
    const unsubscribe = controller.subscribe((newState) => {
      setState(newState);
      if (draftKey) writeSessionDraft(draftKey, newState);
    });
    return unsubscribe;
  }, [controller, draftKey]);

  const submitInitial = useCallback(
    (data?: DailyResetData) => controller.submitInitial(data),
    [controller]
  );
  const submitResolve = useCallback(
    (
      actionOrAnswers?: "submit" | "draft_now" | "continue_details" | Record<string, string>,
      answers?: Record<string, string>
    ) => controller.submitResolve(actionOrAnswers, answers),
    [controller]
  );
  const setAnswer = useCallback(
    (qId: string, ans: string) => controller.setAnswer(qId, ans),
    [controller]
  );
  const markUnknown = useCallback(
    (qId: string) => controller.markUnknown(qId),
    [controller]
  );
  const saveLater = useCallback(() => controller.saveLater(), [controller]);
  const retry = useCallback(() => controller.retry(), [controller]);
  const cancel = useCallback(() => controller.cancel(), [controller]);
  const backToEdit = useCallback(() => controller.backToEdit(), [controller]);
  const reset = useCallback(
    (options?: { clearBrainDump?: boolean }) => controller.reset(options),
    [controller]
  );
  const updateReviewDraft = useCallback((draft: DailyPlanDraft) => controller.updateReviewDraft(draft), [controller]);
  const updateInputData = useCallback(
    (data: Partial<DailyResetData>) => controller.updateInputData(data),
    [controller]
  );
  const loadConfirmedPlan = useCallback(
    (draft: DailyPlanDraft, data?: DailyResetData) =>
      controller.loadConfirmedPlan(draft, data),
    [controller]
  );

  return {
    state,
    controller,
    submitInitial,
    submitResolve,
    setAnswer,
    markUnknown,
    saveLater,
    retry,
    cancel,
    backToEdit,
    reset,
    updateInputData,
    updateReviewDraft,
    loadConfirmedPlan,
  };
}
