import {
  DailyResetInput,
  DailyResetClarificationSubmission,
  ClarificationQuestion,
  ClarificationAnswer,
  DailyPlanDraft,
  DailyResetApiResponse,
  SupportedLanguage,
} from "../domain/daily-reset/contracts";
import { DailyResetApiClient, createDailyResetApiClient } from "../api";
import { DailyResetData } from "../types";
import { useState, useEffect, useMemo } from "react";

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
  planDraft: DailyPlanDraft | null;
  error: TodayFlowError | null;
  failedPhase: "initial" | "resolve" | null;
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
    else if (type === "most_day") availableMinutes = 480;
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

export class TodayFlowController {
  private client: DailyResetApiClient;
  private state: TodayFlowState;
  private listeners: Array<(state: TodayFlowState) => void> = [];

  constructor(
    language: SupportedLanguage = "en",
    client?: DailyResetApiClient,
    initialData?: Partial<DailyResetData>
  ) {
    this.client = client || createDailyResetApiClient();
    this.state = {
      phase: "editing",
      language,
      inputData: {
        stateNote: "",
        brainDump: "",
        ...initialData,
      },
      questions: [],
      answers: {},
      planDraft: null,
      error: null,
      failedPhase: null,
    };
  }

  getState(): TodayFlowState {
    return this.state;
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
    this.updateState({
      inputData: { ...this.state.inputData, ...data },
    });
  }

  setAnswer(questionId: string, answer: string) {
    this.updateState({
      answers: { ...this.state.answers, [questionId]: answer },
    });
  }

  async submitInitial(data?: DailyResetData): Promise<void> {
    if (data) {
      this.updateInputData(data);
    }
    const currentData = this.state.inputData;

    // Local validation check for empty brain dump before fetch
    if (!currentData.brainDump || !currentData.brainDump.trim()) {
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

    this.updateState({
      phase: "submitting",
      error: null,
      failedPhase: null,
    });

    const response = await this.client.analyze(input);
    this.handleApiResponse(response, "initial");
  }

  async submitResolve(answers?: Record<string, string>): Promise<void> {
    if (answers) {
      this.updateState({ answers: { ...this.state.answers, ...answers } });
    }
    const currentAnswers = this.state.answers;
    const currentData = this.state.inputData;
    const questions = this.state.questions;

    // Check if all questions have answers
    const missing = questions.some(
      (q) => !currentAnswers[q.id] || !currentAnswers[q.id].trim()
    );
    if (missing) {
      const msg =
        this.state.language === "sr"
          ? "Molimo odgovorite na sva pitanja pre slanja."
          : this.state.language === "tr"
          ? "Lütfen göndermeden önce tüm soruları yanıtlayın."
          : "Please answer all questions before submitting.";
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

    const input = convertDataToInput(currentData, this.state.language);
    const clarificationAnswers: ClarificationAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: (currentAnswers[q.id] || "").trim(),
    }));

    const submission: DailyResetClarificationSubmission = {
      ...input,
      clarificationAnswers,
    };

    this.updateState({
      phase: "resolving",
      error: null,
      failedPhase: null,
    });

    const response = await this.client.resolve(submission, questions);
    this.handleApiResponse(response, "resolve");
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

  reset() {
    this.updateState({
      phase: "editing",
      questions: [],
      answers: {},
      planDraft: null,
      error: null,
      failedPhase: null,
    });
  }

  loadConfirmedPlan(planDraft: DailyPlanDraft, inputData?: DailyResetData) {
    this.updateState({
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
      this.updateState({
        phase: "error",
        error: {
          message: response.error,
          code: response.code,
          retryable: response.retryable,
          fieldErrors: response.fieldErrors as Record<string, string> | undefined,
        },
        failedPhase: phase,
      });
    } else if (response.phase === "clarification_needed") {
      const answers: Record<string, string> = {};
      response.questions.forEach((q) => {
        answers[q.id] = this.state.answers[q.id] || "";
      });
      this.updateState({
        phase: "clarification_needed",
        questions: response.questions,
        answers,
        error: null,
        failedPhase: null,
      });
    } else if (response.phase === "plan_ready") {
      this.updateState({
        phase: "plan_ready",
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
  initialData?: Partial<DailyResetData>
) {
  const controller = useMemo(
    () => new TodayFlowController(language, client, initialData),
    [client]
  );
  const [state, setState] = useState<TodayFlowState>(controller.getState());

  useEffect(() => {
    controller.setLanguage(language);
  }, [language, controller]);

  useEffect(() => {
    const unsubscribe = controller.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [controller]);

  return {
    state,
    controller,
    submitInitial: (data?: DailyResetData) => controller.submitInitial(data),
    submitResolve: (answers?: Record<string, string>) => controller.submitResolve(answers),
    setAnswer: (qId: string, ans: string) => controller.setAnswer(qId, ans),
    retry: () => controller.retry(),
    backToEdit: () => controller.backToEdit(),
    reset: () => controller.reset(),
    updateInputData: (data: Partial<DailyResetData>) => controller.updateInputData(data),
    loadConfirmedPlan: (draft: DailyPlanDraft, data?: DailyResetData) =>
      controller.loadConfirmedPlan(draft, data),
  };
}
