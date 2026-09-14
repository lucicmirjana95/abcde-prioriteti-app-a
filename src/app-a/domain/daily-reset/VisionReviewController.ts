import { AppAInboxItem } from "../../domain/inbox/contracts";
import { SavedVisionStrategy } from "../../../shared/domain/vision";
import { DailyResetVisionSuggestion, DailyPlanDraft, ClassifiedBrainDumpItem } from "./contracts";
import { computeVisionSuggestionFingerprint } from "./visionSuggestion";
import { AppALanguage } from "../../types";

export interface VisionReviewDeps {
    saveInboxItem: (userId: string, item: AppAInboxItem) => Promise<void>;
    dismissVisionSuggestion: (userId: string, fingerprint: string) => void;
    loadVisionLibrary: (userId: string) => Promise<{ strategies: SavedVisionStrategy[] }>;
    saveVisionStrategy: (userId: string, strategy: SavedVisionStrategy) => Promise<SavedVisionStrategy>;
    onOpenVision?: (visionId?: string) => void;
    writeSessionDraft: (key: string, draft: any) => void;
}

export class VisionReviewController {
    public isProcessingInbox = false;
    public isProcessingConnect = false;

    constructor(private deps: VisionReviewDeps) {}

    resolveInboxKind(suggestion: DailyResetVisionSuggestion, allItems: ClassifiedBrainDumpItem[]): AppAInboxItem["kind"] {
        if (suggestion.needsClarification) return "note";
        const sourceItems = suggestion.sourceItemIds
            .map(id => allItems.find(i => i.id === id))
            .filter((item): item is NonNullable<typeof item> => !!item);

        if (sourceItems.length === 1 && sourceItems[0].kind === "task") {
            return "task";
        }
        return "note";
    }

    async handleSaveToInbox(params: {
        userId: string;
        suggestion: DailyResetVisionSuggestion;
        draft: DailyPlanDraft;
        localDate: string;
        language: AppALanguage;
        nowIso: string;
        translations: any;
    }) {
        if (this.isProcessingInbox) return { status: "locked" };
        this.isProcessingInbox = true;

        try {
            const { userId, suggestion, draft, localDate, language, nowIso, translations } = params;
            const detailsParts = [
                suggestion.desiredOutcome ? `${translations.visionSuggestionOutcomeLabel}: ${suggestion.desiredOutcome}` : "",
                suggestion.reason ? `${translations.visionSuggestionReasonLabel}: ${suggestion.reason}` : "",
            ].filter(Boolean);

            const fingerprint = computeVisionSuggestionFingerprint(suggestion.sourceItemIds, suggestion.suggestedTitle);
            const allItems = [
                ...(draft.classifiedItems || []),
                ...(draft.deferredItems || []),
                ...(draft.longTermIdeas || []),
                ...(draft.nonActionItems || [])
            ];

            const kind = this.resolveInboxKind(suggestion, allItems);

            const inboxItem: AppAInboxItem = {
                id: `inb_vis_${fingerprint}`,
                title: suggestion.suggestedTitle,
                details: detailsParts.join("\n\n"),
                kind,
                horizon: "later",
                status: "inbox",
                source: "daily_reset",
                sourceLocalDate: localDate,
                sourceItemId: suggestion.sourceItemIds[0],
                language,
                createdAt: nowIso,
                updatedAt: nowIso,
            };

            await this.deps.saveInboxItem(userId, inboxItem);
            this.deps.dismissVisionSuggestion(userId, fingerprint);

            return {
                status: "success",
                inboxItem,
                fingerprint,
                nextDraft: { ...draft, visionSuggestion: undefined }
            };
        } catch (error) {
            return { status: "error", error };
        } finally {
            this.isProcessingInbox = false;
        }
    }

    async handleConnectExisting(params: {
        userId: string;
        visionId: string;
        reactivate: boolean;
        suggestion: DailyResetVisionSuggestion;
        draft: DailyPlanDraft;
    }) {
        if (this.isProcessingConnect) return { status: "locked" };
        this.isProcessingConnect = true;

        try {
            const { userId, visionId, reactivate, suggestion, draft } = params;
            const library = await this.deps.loadVisionLibrary(userId);
            const existing = library.strategies.find((s) => s.id === visionId);
            if (!existing) return { status: "not_found" };

            const updated: SavedVisionStrategy = {
                ...existing,
                provenanceItemIds: Array.from(new Set([...(existing.provenanceItemIds || []), ...suggestion.sourceItemIds])),
            };

            let didReactivate = false;
            if (reactivate && updated.status === "archived") {
                updated.status = "active";
                updated.archivedAt = undefined;
                didReactivate = true;
            }

            const saved = await this.deps.saveVisionStrategy(userId, updated);
            const fingerprint = computeVisionSuggestionFingerprint(suggestion.sourceItemIds, suggestion.suggestedTitle);
            this.deps.dismissVisionSuggestion(userId, fingerprint);

            return {
                status: "success",
                saved,
                fingerprint,
                didReactivate,
                nextDraft: { ...draft, visionSuggestion: undefined }
            };
        } catch (error) {
            return { status: "error", error };
        } finally {
            this.isProcessingConnect = false;
        }
    }

    handleDevelopVision(
        suggestion: DailyResetVisionSuggestion,
        clarification: string | undefined,
        localDate: string,
        draftKey: string
    ) {
        const structuredDraft = {
            schemaVersion: 1,
            suggestedTitle: suggestion.suggestedTitle,
            desiredOutcome: suggestion.desiredOutcome,
            reason: suggestion.reason,
            sourceItemIds: suggestion.sourceItemIds,
            sourceDailyResetLocalDate: localDate,
            clarificationAnswer: clarification,
            possibleExistingVisionId: suggestion.possibleExistingVisionId,
            createdAt: new Date().toISOString(),
            origin: "daily_reset_vision_suggestion",
            suggestionFingerprint: computeVisionSuggestionFingerprint(suggestion.sourceItemIds, suggestion.suggestedTitle),
        };
        this.deps.writeSessionDraft(draftKey, structuredDraft);
        if (this.deps.onOpenVision) {
            this.deps.onOpenVision();
        }
        return structuredDraft;
    }

    viewArchived(visionId: string) {
        if (this.deps.onOpenVision) {
            this.deps.onOpenVision(visionId);
        }
    }
}
