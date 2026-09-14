import { SavedVisionStrategy, VisionStrategyResult } from "../../../shared/domain/vision";

export interface VisionBuilderDeps {
    saveVisionStrategy: (userId: string, strategy: SavedVisionStrategy) => Promise<SavedVisionStrategy>;
    createVisionStrategy?: (goal: string, language: string, signal: AbortSignal, context: string) => Promise<VisionStrategyResult>;
}

export class VisionBuilderController {
    public isSaving = false;
    public isGenerating = false;

    constructor(private deps: VisionBuilderDeps) {}

    async generatePreview(goal: string, language: string, context: string) {
        if (this.isGenerating) return { status: "locked" };
        if (!this.deps.createVisionStrategy) return { status: "error", error: new Error("not_implemented") };
        this.isGenerating = true;
        try {
            const controller = new AbortController();
            const result = await this.deps.createVisionStrategy(goal, language, controller.signal, context);
            return { status: "success", strategy: result };
        } catch (error) {
            return { status: "error", error };
        } finally {
            this.isGenerating = false;
        }
    }

    cancelPreview() {
        return { status: "cancelled", writes: 0 };
    }

    async saveStrategy(userId: string, document: SavedVisionStrategy) {
        if (this.isSaving) return { status: "locked" };
        this.isSaving = true;

        try {
            const deduplicated = {
                ...document,
                provenanceItemIds: document.provenanceItemIds ? Array.from(new Set(document.provenanceItemIds)) : []
            };
            const savedDoc = await this.deps.saveVisionStrategy(userId, deduplicated);
            return { status: "success", document: savedDoc };
        } catch (error: any) {
            if (error?.code === "vision_changed_elsewhere" || error?.code === "failed-precondition") {
                return { status: "conflict", error };
            }
            if (error?.message === "authentication_required" || error?.code === "unauthenticated") {
                return { status: "unauthenticated", error };
            }
            return { status: "error", error };
        } finally {
            this.isSaving = false;
        }
    }
}
