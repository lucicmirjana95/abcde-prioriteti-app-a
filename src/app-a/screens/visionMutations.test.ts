import { describe, test } from "node:test";
import assert from "node:assert";
import { VisionReviewController } from "../domain/daily-reset/VisionReviewController";
import { VisionBuilderController } from "../domain/vision/VisionBuilderController";
import { DailyResetVisionSuggestion, ClassifiedBrainDumpItem } from "../domain/daily-reset/contracts";

const mockLanguage = "en";
const mockDate = "2023-01-01";
const mockNow = new Date().toISOString();

// Helper to create fake deferred promises
function createDeferred<T>() {
    let resolve!: (val: T) => void;
    let reject!: (err: any) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("Brain dump -> Vision action", () => {
    test("Razradi kao viziju - 1-6 (Creates structured draft, 0 writes, calls onOpenVision)", async () => {
        let saveInboxCalled = 0;
        let saveVisionCalled = 0;
        let onOpenVisionCalledWith: string | undefined = "not_called";
        const sessionDrafts: Record<string, any> = {};

        const controller = new VisionReviewController({
            saveInboxItem: async () => { saveInboxCalled++; },
            dismissVisionSuggestion: () => {},
            loadVisionLibrary: async () => ({ strategies: [] }),
            saveVisionStrategy: async () => { saveVisionCalled++; return {} as any; },
            onOpenVision: (id) => { onOpenVisionCalledWith = id; },
            writeSessionDraft: (k, d) => { sessionDrafts[k] = d; }
        });

        const suggestion: DailyResetVisionSuggestion = {
            sourceItemIds: ["task1", "task2", "task2"], // Testing deduplication at save level, but here it preserves order. Actually deduplication is at save strategy!
            suggestedTitle: "My Vision",
            desiredOutcome: "Win",
            reason: "Why not",
            confidence: "high",
            needsClarification: false
        };

        const draft = controller.handleDevelopVision(suggestion, "clarification", mockDate, "my:key");

        assert.strictEqual(draft.schemaVersion, 1);
        assert.deepStrictEqual(draft.sourceItemIds, ["task1", "task2", "task2"]); 
        assert.ok(draft.suggestionFingerprint);
        assert.strictEqual(draft.origin, "daily_reset_vision_suggestion");
        assert.strictEqual(saveVisionCalled, 0);
        assert.strictEqual(saveInboxCalled, 0);
        assert.strictEqual(onOpenVisionCalledWith, undefined); // called with no args
        assert.deepStrictEqual(sessionDrafts["my:key"], draft);
    });

    test("AI generisanje i preview - 7-11", async () => {
        let saveCalled = 0;
        let generateCalled = 0;
        const controller = new VisionBuilderController({
            saveVisionStrategy: async () => { saveCalled++; return {} as any; },
            createVisionStrategy: async () => { generateCalled++; return { steps: [] } as any; }
        });

        const result = await controller.generatePreview("goal", "en", "ctx");
        assert.strictEqual(result.status, "success");
        assert.strictEqual(saveCalled, 0);
        assert.strictEqual(generateCalled, 1);

        const cancel = controller.cancelPreview();
        assert.strictEqual(cancel.writes, 0);
        assert.strictEqual(saveCalled, 0);
    });

    test("Sačuvaj viziju - 12-19 (deduplicates, exactly 1 write, conflict handles)", async () => {
        let saveCount = 0;
        let lastSavedDoc: any = null;
        
        const controller = new VisionBuilderController({
            saveVisionStrategy: async (u, d) => {
                saveCount++;
                lastSavedDoc = d;
                if (u === "conflict") {
                    throw { code: "failed-precondition" };
                }
                return d;
            }
        });

        const docToSave = { id: "v1", provenanceItemIds: ["task1", "task2", "task1"] } as any;
        const res = await controller.saveStrategy("user1", docToSave);
        
        assert.strictEqual(res.status, "success");
        assert.strictEqual(saveCount, 1);
        assert.deepStrictEqual(lastSavedDoc.provenanceItemIds, ["task1", "task2"]); // deduplicated!

        // Double click test
        const def = createDeferred<any>();
        const raceController = new VisionBuilderController({
            saveVisionStrategy: async () => def.promise
        });
        const p1 = raceController.saveStrategy("user1", docToSave);
        const p2 = raceController.saveStrategy("user1", docToSave);
        def.resolve(docToSave);
        const [r1, r2] = await Promise.all([p1, p2]);
        assert.strictEqual(r1.status, "success");
        assert.strictEqual(r2.status, "locked"); // second call ignored

        // Conflict
        const conflictRes = await controller.saveStrategy("conflict", docToSave);
        assert.strictEqual(conflictRes.status, "conflict");
    });

    test("Povezivanje sa aktivnom vizijom - 20-27", async () => {
        let saveCount = 0;
        let savedDoc: any = null;
        const controller = new VisionReviewController({
            saveInboxItem: async () => {},
            dismissVisionSuggestion: () => {},
            loadVisionLibrary: async () => ({ strategies: [{ id: "v1", provenanceItemIds: ["task1"] } as any] }),
            saveVisionStrategy: async (u, d) => { saveCount++; savedDoc = d; return d; },
            writeSessionDraft: () => {}
        });

        const suggestion: DailyResetVisionSuggestion = {
            sourceItemIds: ["task1", "task2"],
            suggestedTitle: "T",
            desiredOutcome: "O",
            reason: "R",
            confidence: "high",
            needsClarification: false
        };

        const res = await controller.handleConnectExisting({
            userId: "u1", visionId: "v1", reactivate: false, suggestion, draft: {} as any
        });

        assert.strictEqual(res.status, "success");
        assert.strictEqual(saveCount, 1);
        assert.deepStrictEqual(savedDoc.provenanceItemIds, ["task1", "task2"]); // didn't duplicate task1

        const def = createDeferred<any>();
        const raceController = new VisionReviewController({
            saveInboxItem: async () => {}, dismissVisionSuggestion: () => {},
            loadVisionLibrary: async () => ({ strategies: [{ id: "v1" } as any] }),
            saveVisionStrategy: async () => def.promise,
            writeSessionDraft: () => {}
        });
        const p1 = raceController.handleConnectExisting({ userId: "u1", visionId: "v1", reactivate: false, suggestion, draft: {} as any });
        const p2 = raceController.handleConnectExisting({ userId: "u1", visionId: "v1", reactivate: false, suggestion, draft: {} as any });
        def.resolve({});
        const [r1, r2] = await Promise.all([p1, p2]);
        assert.strictEqual(r1.status, "success");
        assert.strictEqual(r2.status, "locked");
    });

    test("Arhivirana vizija i navigacija - 28-37", async () => {
        let onOpenCalled = "no";
        const controller = new VisionReviewController({
            saveInboxItem: async () => {}, dismissVisionSuggestion: () => {},
            loadVisionLibrary: async () => ({ strategies: [{ id: "v1", status: "archived" } as any] }),
            saveVisionStrategy: async (u, d) => d,
            writeSessionDraft: () => {},
            onOpenVision: (id) => { onOpenCalled = id || "empty"; }
        });

        controller.viewArchived("v1");
        assert.strictEqual(onOpenCalled, "v1");

        const suggestion: DailyResetVisionSuggestion = {
            sourceItemIds: ["task3"], suggestedTitle: "", desiredOutcome: "", reason: "", confidence: "high", needsClarification: false
        };

        // Reactivate
        const res = await controller.handleConnectExisting({
            userId: "u1", visionId: "v1", reactivate: true, suggestion, draft: {} as any
        });
        assert.strictEqual(res.status, "success");
        assert.strictEqual((res as any).saved.status, "active");
        assert.strictEqual((res as any).saved.archivedAt, undefined);
        assert.deepStrictEqual((res as any).saved.provenanceItemIds, ["task3"]);
    });
});

describe("Inbox classification - 38-50", () => {
    test("Classification rules", () => {
        const controller = new VisionReviewController({} as any);
        const baseItem = { id: "t1", originalText: "t", timeHorizon: "today", timeSensitivity: "none" } as any;
        const taskItem: ClassifiedBrainDumpItem = { ...baseItem, kind: "task" };
        const ideaItem: ClassifiedBrainDumpItem = { ...baseItem, kind: "idea" };

        const suggestion = { sourceItemIds: ["t1"], needsClarification: false } as any;
        
        // 1 task -> task
        assert.strictEqual(controller.resolveInboxKind(suggestion, [taskItem]), "task");
        
        // idea -> note
        assert.strictEqual(controller.resolveInboxKind(suggestion, [ideaItem]), "note");

        // mixed -> note
        assert.strictEqual(controller.resolveInboxKind({ ...suggestion, sourceItemIds: ["t1", "t2"] }, [taskItem, { ...ideaItem, id: "t2" }]), "note");

        // needsClarification -> note
        assert.strictEqual(controller.resolveInboxKind({ ...suggestion, needsClarification: true }, [taskItem]), "note");

        // missing -> note
        assert.strictEqual(controller.resolveInboxKind(suggestion, []), "note");
    });

    test("Inbox save and locking", async () => {
        let savedItems: any[] = [];
        const def = createDeferred<void>();
        const controller = new VisionReviewController({
            saveInboxItem: async (u, i) => { savedItems.push(i); return def.promise; },
            dismissVisionSuggestion: () => {},
            loadVisionLibrary: async () => ({ strategies: [] }),
            saveVisionStrategy: async () => ({} as any),
            writeSessionDraft: () => {}
        });

        const params = {
            userId: "u1",
            suggestion: { sourceItemIds: ["t1"], suggestedTitle: "T", desiredOutcome: "", reason: "", confidence: "high", needsClarification: false } as any,
            draft: { classifiedItems: [{ id: "t1", kind: "task" }] } as any,
            localDate: "2023", language: "en" as any, nowIso: "now", translations: {}
        };

        const p1 = controller.handleSaveToInbox(params);
        const p2 = controller.handleSaveToInbox(params);
        def.resolve();
        const [r1, r2] = await Promise.all([p1, p2]);

        assert.strictEqual(r1.status, "success");
        assert.strictEqual(r2.status, "locked");
        assert.strictEqual(savedItems.length, 1);
        assert.strictEqual(savedItems[0].kind, "task");
        assert.ok(savedItems[0].id.startsWith("inb_vis_"));
    });
});
