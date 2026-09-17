import assert from "node:assert/strict";
import {
  computeLocalTaskPlacementSuggestion,
  suggestTaskPlacement,
} from "./taskPlacementSuggestionApi";

console.log("Running Task Placement Suggestion tests...");

// 1. Fixed appointment detection
const fixedRes = computeLocalTaskPlacementSuggestion({
  taskTitle: "Sastanak sa timom oko dizajna",
  language: "sr",
});
assert.strictEqual(fixedRes.capacityType, "fixed", "Should detect fixed commitment");
assert.strictEqual(fixedRes.suggestedBlock, "later_today");
assert.ok(fixedRes.reasoning.includes("fiksna obaveza"), "Reasoning should explain fixed commitment");

// 2. Duration extraction from text
const durationRes = computeLocalTaskPlacementSuggestion({
  taskTitle: "Pregled dokumentacije 45 min",
  language: "sr",
});
assert.strictEqual(durationRes.suggestedMinutes, 45, "Should extract 45 min duration");

// 3. Vision goal linking
const visionRes = computeLocalTaskPlacementSuggestion({
  taskTitle: "Trčanje u parku 5km",
  language: "sr",
  energy: 4,
  availableMinutes: 120,
  plannedFlexibleMinutes: 30,
  firstFocusCount: 1,
  activeVisions: [
    { id: "vis_run_1", title: "Redovno trčanje i priprema za polumaraton" },
  ],
});
assert.strictEqual(visionRes.linkedVisionId, "vis_run_1", "Should link to active vision");
assert.strictEqual(visionRes.suggestedBlock, "first_focus", "Should place vision step in first_focus when capacity and energy permit");
assert.strictEqual(visionRes.reconsiderPriorities, true);
assert.ok(visionRes.reasoning.includes("vizijom"), "Reasoning should reference vision");

// 4. Over capacity -> suggest Inbox
const fullCapacityRes = computeLocalTaskPlacementSuggestion({
  taskTitle: "Istraživanje novih alata",
  language: "sr",
  availableMinutes: 120,
  plannedFlexibleMinutes: 130,
});
assert.strictEqual(fullCapacityRes.suggestedBlock, "inbox", "Should suggest saving to inbox when capacity is full");
assert.ok(fullCapacityRes.reasoning.includes("Inboks"), "Reasoning should explain saving to inbox");

// 5. First Focus full (3 items) -> suggest later_today
const ffFullRes = computeLocalTaskPlacementSuggestion({
  taskTitle: "Pisanje izveštaja",
  language: "sr",
  firstFocusCount: 3,
  availableMinutes: 200,
  plannedFlexibleMinutes: 60,
});
assert.strictEqual(ffFullRes.suggestedBlock, "later_today", "Should place in later_today when first focus is full");
assert.ok(ffFullRes.reasoning.includes("Prvi fokus već ima 3"), "Reasoning should explain first focus is full");

// 6. Low energy -> lighter task in if_capacity_remains
const lowEnergyRes = computeLocalTaskPlacementSuggestion({
  taskTitle: "Sortiranje pošte",
  language: "sr",
  energy: 1,
  availableMinutes: 180,
  plannedFlexibleMinutes: 60,
});
assert.strictEqual(lowEnergyRes.suggestedBlock, "if_capacity_remains", "Should suggest if_capacity_remains for low energy");
assert.strictEqual(lowEnergyRes.suggestedMinutes <= 15, true, "Duration should be capped for low energy");

// 7. API with mock network failure -> fallback works seamlessly
async function testApiFallback() {
  const failingFetch = async () => {
    throw new Error("Network offline");
  };
  const res = await suggestTaskPlacement(
    {
      taskTitle: "Poziv sa klijentom",
      language: "sr",
    },
    { fetchImpl: failingFetch as any }
  );
  assert.strictEqual(res.capacityType, "fixed");
  assert.ok(res.reasoning.length > 0);
}

// 8. API with successful server mock response
async function testApiSuccess() {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      suggestion: {
        suggestedBlock: "later_today",
        suggestedMinutes: 30,
        capacityType: "flexible",
        reconsiderPriorities: false,
        reasoning: "AI preporučuje kasniji termin.",
      },
    }),
  });
  const res = await suggestTaskPlacement(
    {
      taskTitle: "Priprema prezentacije",
      language: "sr",
    },
    { fetchImpl: mockFetch as any }
  );
  assert.strictEqual(res.suggestedBlock, "later_today");
  assert.strictEqual(res.suggestedMinutes, 30);
  assert.strictEqual(res.reasoning, "AI preporučuje kasniji termin.");
}

Promise.all([testApiFallback(), testApiSuccess()]).then(() => {
  console.log("✓ All Task Placement Suggestion unit tests passed cleanly!");
  process.exit(0);
}).catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
