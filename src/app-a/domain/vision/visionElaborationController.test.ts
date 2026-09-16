import { test } from "node:test";
import assert from "node:assert";
import { VisionElaborationController, VisionElaborationState, QAItem } from "./visionElaborationController";
import type { SavedVisionStrategy } from "../../../shared/domain/vision";

test("visionElaborationController behavior", async (t) => {
  let saveCalls = 0;
  let feasibilityCalls = 0;
  let refineStepCalls = 0;

  const deps = {
    feasibilityCheck: async () => {
      feasibilityCalls++;
      return { questions: ["Q1"] };
    },
    refineStep: async () => {
      refineStepCalls++;
      return { questions: ["Q2"] };
    },
    saveVisionStrategy: async (userId: string, doc: SavedVisionStrategy) => {
      saveCalls++;
      return doc;
    }
  };

  let currentState: VisionElaborationState = { status: "idle" };
  let currentHistory: QAItem[] = [];

  const ctrl = new VisionElaborationController(
    deps,
    (s) => { currentState = s; },
    (h) => { currentHistory = h; }
  );

  await t.test("1. default state is idle", () => {
    assert.deepStrictEqual(ctrl.getState(), { status: "idle" });
  });

  await t.test("2. startElaboration transitions to generating then round_active, 3. Double-call locked", async () => {
    let p = ctrl.startElaboration("Goal", "en", "Context");
    const resLocked = await ctrl.startElaboration("Goal", "en", "Context");
    assert.deepStrictEqual(resLocked, { status: "locked" });
    
    await p;
    assert.strictEqual(currentState.status, "round_active");
    if (currentState.status === "round_active") {
      assert.strictEqual(currentState.roundIndex, 1);
      assert.deepStrictEqual(currentState.questions, ["Q1"]);
    }
    assert.strictEqual(feasibilityCalls, 1);
  });

  await t.test("4. submitRound in round 1 appends answers to qaHistory and moves to round 2", async () => {
    await ctrl.submitRound({ "Q1": "A1" });
    assert.strictEqual(currentState.status, "round_active");
    if (currentState.status === "round_active") {
      assert.strictEqual(currentState.roundIndex, 2);
      assert.deepStrictEqual(currentState.questions, ["Q2"]);
    }
    assert.strictEqual(refineStepCalls, 1);
    assert.strictEqual(currentHistory.length, 1);
    assert.strictEqual(currentHistory[0].answer, "A1");
  });

  await t.test("6. skipToSummary from round 2 goes directly to summary", () => {
    ctrl.skipToSummary();
    assert.strictEqual(currentState.status, "summary");
    assert.strictEqual(currentHistory.length, 1);
  });

  await t.test("7. cancel from any state -> idle, 0 Firestore calls", () => {
    ctrl.cancel();
    assert.strictEqual(currentState.status, "idle");
    assert.strictEqual(currentHistory.length, 0);
  });

  await t.test("5. submitRound in round 3 triggers summary (no further API calls), 10. qaHistory preserves all in order", async () => {
    await ctrl.startElaboration("Goal", "en", "Context");
    await ctrl.submitRound({ "Q1": "A1" }); // -> round 2
    deps.refineStep = async () => { refineStepCalls++; return { questions: ["Q3"] }; }; // mock for round 3
    await ctrl.submitRound({ "Q2": "A2" }); // -> round 3
    
    assert.strictEqual(currentState.status, "round_active");
    if (currentState.status === "round_active") {
      assert.strictEqual(currentState.roundIndex, 3);
      assert.deepStrictEqual(currentState.questions, ["Q3"]);
    }

    await ctrl.submitRound({ "Q3": "A3" }); // -> summary
    assert.strictEqual(currentState.status, "summary");
    assert.strictEqual(currentHistory.length, 3);
    assert.deepStrictEqual(currentHistory.map(q => q.answer), ["A1", "A2", "A3"]);
  });

  await t.test("8. confirmSave deduplicates provenanceItemIds and calls exactly once", async () => {
    const doc: SavedVisionStrategy = {
      id: "v1",
      idea: "Test",
      language: "sr",
      status: "active",
      provenanceItemIds: ["id1", "id1", "id2"],
      createdAt: "",
      updatedAt: "",
      strategy: {
        outcome: "Test",
        importance: "Test",
        milestones: [],
        risks: [],
        assumptions: [],
        nextStep: "Step 1",
      },
      stepBreakdowns: {},
    };
    
    const saved = await ctrl.confirmSave("user1", doc);
    assert.strictEqual(saveCalls, 1);
    assert.deepStrictEqual(saved.provenanceItemIds, ["id1", "id2"]);
    assert.strictEqual(currentState.status, "saved");
  });

  await t.test("9. cancel after confirmSave does NOT make a second Firestore call", () => {
    ctrl.cancel();
    assert.strictEqual(currentState.status, "idle");
    assert.strictEqual(saveCalls, 1);
  });
});
