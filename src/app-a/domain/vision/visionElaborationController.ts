import type { SavedVisionStrategy } from "../../../shared/domain/vision";

export type VisionElaborationState =
  | { status: "idle" }
  | { status: "generating"; roundIndex: number }
  | { status: "round_active"; roundIndex: number; questions: string[] }
  | { status: "summary" }
  | { status: "saved"; strategy: SavedVisionStrategy }
  | { status: "error"; error: string };

export interface QAItem {
  roundIndex: number;
  questionId: string;
  question: string;
  answer: string;
}

export interface VisionElaborationDeps {
  feasibilityCheck: (goal: string, language: string, context: string) => Promise<{ questions: string[] }>;
  refineStep: (goal: string, language: string, step: string, qaHistory: any[]) => Promise<{ questions: string[] }>;
  saveVisionStrategy: (userId: string, doc: SavedVisionStrategy) => Promise<SavedVisionStrategy>;
}

export class VisionElaborationController {
  private state: VisionElaborationState = { status: "idle" };
  private qaHistory: QAItem[] = [];
  private onStateChange: (state: VisionElaborationState) => void;
  private onHistoryChange: (history: QAItem[]) => void;
  private deps: VisionElaborationDeps;
  
  private currentGoal = "";
  private currentLanguage = "";

  constructor(
    deps: VisionElaborationDeps,
    onStateChange: (state: VisionElaborationState) => void,
    onHistoryChange: (history: QAItem[]) => void
  ) {
    this.deps = deps;
    this.onStateChange = onStateChange;
    this.onHistoryChange = onHistoryChange;
  }

  private updateState(newState: VisionElaborationState) {
    this.state = newState;
    this.onStateChange(this.state);
  }

  public getState() {
    return this.state;
  }

  public getHistory() {
    return this.qaHistory;
  }

  public async startElaboration(goal: string, language: string, context: string) {
    if (this.state.status === "generating") {
      return { status: "locked" };
    }
    
    this.currentGoal = goal;
    this.currentLanguage = language;
    this.qaHistory = [];
    this.onHistoryChange(this.qaHistory);
    
    this.updateState({ status: "generating", roundIndex: 1 });
    
    try {
      const result = await this.deps.feasibilityCheck(goal, language, context);
      const questions = result.questions.slice(0, 3);
      if (questions.length === 0) {
        this.updateState({ status: "summary" });
      } else {
        this.updateState({ status: "round_active", roundIndex: 1, questions });
      }
      return { status: "ok" };
    } catch (e: any) {
      this.updateState({ status: "error", error: e.message || "Failed" });
      return { status: "error" };
    }
  }

  public async submitRound(answers: Record<string, string>) {
    if (this.state.status !== "round_active") return;
    
    const roundIndex = this.state.roundIndex;
    const questions = this.state.questions;
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = answers[q] || answers[i.toString()];
      if (ans) {
        this.qaHistory.push({
          roundIndex,
          questionId: i.toString(),
          question: q,
          answer: ans,
        });
      }
    }
    this.onHistoryChange([...this.qaHistory]);
    
    if (roundIndex >= 3) {
      this.updateState({ status: "summary" });
      return;
    }
    
    this.updateState({ status: "generating", roundIndex: roundIndex + 1 });
    
    try {
      const result = await this.deps.refineStep(this.currentGoal, this.currentLanguage, "elaboration", this.qaHistory);
      const nextQuestions = result.questions.slice(0, 3);
      if (nextQuestions.length === 0) {
        this.updateState({ status: "summary" });
      } else {
        this.updateState({ status: "round_active", roundIndex: roundIndex + 1, questions: nextQuestions });
      }
    } catch (e: any) {
      this.updateState({ status: "error", error: e.message || "Failed" });
    }
  }

  public skipToSummary() {
    if (this.state.status === "round_active" || this.state.status === "generating") {
      this.updateState({ status: "summary" });
    }
  }

  public cancel() {
    this.qaHistory = [];
    this.onHistoryChange(this.qaHistory);
    this.updateState({ status: "idle" });
  }

  public async confirmSave(userId: string, document: SavedVisionStrategy) {
    if (this.state.status === "saved") {
      return this.state.strategy;
    }
    
    const dedupedIds = [...new Set(document.provenanceItemIds)];
    const docToSave = { ...document, provenanceItemIds: dedupedIds };
    
    try {
      const saved = await this.deps.saveVisionStrategy(userId, docToSave);
      this.updateState({ status: "saved", strategy: saved });
      return saved;
    } catch (e: any) {
      this.updateState({ status: "error", error: e.message || "Failed" });
      throw e;
    }
  }
}
