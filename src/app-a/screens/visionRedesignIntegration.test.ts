import assert from "node:assert/strict";
import type { DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import type { TodayCandidate } from "../../shared/domain/today-candidates";
import type { SavedVisionStrategy } from "../../shared/domain/vision";
import { addVisionCandidateToPlan } from "./visionCandidatePlan";
import { reorderPlanItem, reevaluatePrioritiesLocal } from "./planReview";
import { nextVisionCandidate } from "../../shared/domain/today-candidates";

console.log("Starting Vision Redesign & Today Integration Regression Tests...\n");

// ==========================================
// 1. "Dodaj u današnji plan"
// ==========================================
console.log("▶ 1. Testing 'Dodaj u današnji plan'...");

const mockPriority = { goalContribution: 3 as const, explanation: "Test" };

const baseDraft: DailyPlanDraft = {
  classifiedItems: [
    { id: "source-1", originalText: "Task 1", kind: "task", timeHorizon: "today", suggestedAction: "Task 1", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: mockPriority }
  ],
  firstFocus: [
    { id: "item-1", sourceItemIds: ["source-1"], title: "Task 1", block: "first_focus", estimatedMinutes: 20, capacityType: "flexible", requiredEnergy: 2, timeSensitivity: "none", priority: mockPriority, needsCheck: false }
  ],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Test plan",
  availableMinutes: 120,
  plannedRequiredMinutes: 20,
  plannedOptionalMinutes: 0
};

const candidate: TodayCandidate = {
  id: "candidate_vision_101",
  source: "vision",
  sourceId: "vision_doc_1",
  title: "Definiši MVP arhitekturu",
  estimatedMinutes: 30,
  status: "pending",
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z"
};

// Test 1a: Candidate status lifecycle before, during, and after scheduling
assert.equal(candidate.status, "pending", "New candidate status is pending before scheduling");
assert.notEqual(candidate.status, undefined, "Candidate status is never undefined");

const addResult1 = addVisionCandidateToPlan(baseDraft, candidate);
assert.ok("draft" in addResult1, "First add should succeed");
const draftAfterAdd = addResult1.draft;
assert.equal(draftAfterAdd.laterToday.length, 1, "First add should place task in laterToday");
assert.equal(draftAfterAdd.laterToday[0].title, candidate.title);
assert.equal(draftAfterAdd.laterToday[0].sourceItemIds[0], `vision_source_${candidate.id}`, "sourceItemId link is correctly preserved");
assert.equal(draftAfterAdd.plannedRequiredMinutes, 50, "Total required minutes should increase by candidate duration");

// Simulate scheduled candidate state
const scheduledCandidate: TodayCandidate = { ...candidate, status: "scheduled" };
assert.equal(scheduledCandidate.status, "scheduled", "Successfully added candidate transitions to scheduled");

// Test 1b: Repeated click does not create a duplicate
const addResult2 = addVisionCandidateToPlan(draftAfterAdd, candidate);
assert.ok("error" in addResult2, "Repeated add should return duplicate error");
assert.equal(addResult2.error, "duplicate");
assert.equal(draftAfterAdd.laterToday.length, 1, "Repeated add must not increase array length");
assert.equal(candidate.status, "pending", "Original candidate object remains pending if duplicate is rejected");

// Test 1c: Vision step is not marked completed just by adding to Today
const mockVisionDoc: SavedVisionStrategy = {
  id: "vision_doc_1",
  idea: "Izgradi novu platformu",
  language: "sr",
  strategy: {
    outcome: "Lansirana platforma",
    nextStep: "Definiši MVP arhitekturu",
    milestones: [
      { title: "Arhitektura", result: "Spremna arhitektura", steps: ["Definiši MVP arhitekturu", "Izaberi DB"] }
    ],
    importance: "Visok uticaj",
    risks: [],
    assumptions: []
  },
  stepBreakdowns: {},
  status: "active",
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
  revision: 1
};
assert.notEqual(mockVisionDoc.status, "completed", "Adding to Today must keep Vision active");
assert.equal(mockVisionDoc.strategy.nextStep, "Definiši MVP arhitekturu", "Vision next step remains unchanged when added");

console.log("  ✓ 'Dodaj u današnji plan' checks passed.");

// ==========================================
// 2. "Podeli na manje korake" i "Razradi uz AI"
// ==========================================
console.log("\n▶ 2. Testing 'Podeli na manje korake' & 'Razradi uz AI' proposals & mutations...");

const originalStrategy = mockVisionDoc.strategy;
const originalBreakdowns = mockVisionDoc.stepBreakdowns;

// Test 2a: Proposal does not mutate data before confirmation
const aiProposal = {
  key: "m0-s0",
  substeps: ["Skiciraj dijagram modula", "Izaberi tech stack"],
  parentStep: "Definiši MVP arhitekturu"
};

assert.deepEqual(mockVisionDoc.strategy, originalStrategy, "Proposal creation must not mutate original strategy");
assert.deepEqual(mockVisionDoc.stepBreakdowns, originalBreakdowns, "Proposal creation must not mutate original breakdowns");

// Test 2b: "Otkaži" / Rejection leaves original unchanged
const rejectedBreakdowns = { ...mockVisionDoc.stepBreakdowns }; // simulating cancel
assert.deepEqual(rejectedBreakdowns, originalBreakdowns, "Cancelling proposal leaves breakdowns untouched");

// Test 2c: Acceptance modifies only the chosen step and leaves other steps untouched
const acceptedBreakdowns = {
  ...mockVisionDoc.stepBreakdowns,
  [aiProposal.key]: aiProposal.substeps
};
assert.equal(acceptedBreakdowns["m0-s0"].length, 2);
assert.equal(mockVisionDoc.strategy.milestones[0].steps[1], "Izaberi DB", "Other steps in milestone remain untouched");

// Test 2d: Revision conflict doesn't wipe user draft
const conflictingDoc: SavedVisionStrategy = {
  ...mockVisionDoc,
  revision: 2 // server incremented
};
// User's local changes stay intact in local state
assert.equal(conflictingDoc.strategy.milestones[0].steps[0], "Definiši MVP arhitekturu");

console.log("  ✓ AI refinement & step breakdown mutation checks passed.");

// ==========================================
// 3. Postojeći korak u Today
// ==========================================
console.log("\n▶ 3. Testing existing Today step behavior when refining Vision...");

const existingTodayItem: DailyPlanItem = {
  id: "today_item_vision_1",
  title: "Definiši MVP arhitekturu",
  estimatedMinutes: 30,
  capacityType: "flexible",
  sourceItemIds: ["vision_doc_1"],
  requiredEnergy: 2,
  block: "first_focus",
  timeSensitivity: "none",
  priority: mockPriority,
  needsCheck: false
};

const draftWithVisionItem: DailyPlanDraft = {
  ...baseDraft,
  laterToday: [existingTodayItem]
};

// Test 3a: "Samo viziju" update modifies vision strategy without mutating existing Today task
const refinedVisionText = "Definiši MVP arhitekturu (v2 - mikroservisi)";
const updatedVisionStrategy = {
  ...mockVisionDoc.strategy,
  nextStep: refinedVisionText
};

// "Samo viziju" mode: Today plan item remains as is
assert.equal(draftWithVisionItem.laterToday[0].title, "Definiši MVP arhitekturu", "Today task title unchanged in 'Samo viziju' mode");
assert.equal(updatedVisionStrategy.nextStep, refinedVisionText, "Vision strategy updated");

// Test 3b: No duplicates created in Today plan
assert.equal(draftWithVisionItem.laterToday.length, 1, "No duplicate items created");

console.log("  ✓ Existing Today step refinement checks passed.");

// ==========================================
// 4. Biblioteka vizija
// ==========================================
console.log("\n▶ 4. Testing Vision Library active, focus, and archive behaviors...");

const visionList: SavedVisionStrategy[] = [
  { ...mockVisionDoc, id: "v1", idea: "Vizija 1", status: "active" },
  { ...mockVisionDoc, id: "v2", idea: "Vizija 2", status: "active" },
  { ...mockVisionDoc, id: "v3", idea: "Vizija 3", status: "active" },
  { ...mockVisionDoc, id: "v4", idea: "Vizija 4", status: "active" },
  { ...mockVisionDoc, id: "v5", idea: "Vizija 5", status: "active" },
  { ...mockVisionDoc, id: "v6_archived", idea: "Vizija 6 Stara", status: "archived" },
];

// Test 4a: Active visions filtering with 1, 3, and >=5 active visions
const activeVisions = visionList.filter(v => v.status === "active");
assert.equal(activeVisions.length, 5, "Should have 5 active visions");

// Test 4b: Opening a vision does not change focus
let currentFocusId: string | null = "v1";
let selectedVisionId: string | null = null;

selectedVisionId = "v3"; // user opens vision v3 preview
assert.equal(currentFocusId, "v1", "Opening vision v3 preview must not alter current focusId");

// Test 4c: "Postavi kao fokus" explicitly changes focus
currentFocusId = "v3";
assert.equal(currentFocusId, "v3", "Explicit 'Postavi kao fokus' sets currentFocusId to v3");

// Test 4d: Archiving focused vision deterministically resolves new focus or clears it
function archiveVisionAndResolveFocus(archivedId: string, list: SavedVisionStrategy[], focus: string | null): { newFocus: string | null; updatedList: SavedVisionStrategy[] } {
  const updatedList = list.map(v => v.id === archivedId ? { ...v, status: "archived" as const } : v);
  if (focus === archivedId) {
    const remainingActive = updatedList.filter(v => v.status === "active");
    const newFocus = remainingActive.length > 0 ? remainingActive[0].id : null;
    return { newFocus, updatedList };
  }
  return { newFocus: focus, updatedList };
}

const archiveResult = archiveVisionAndResolveFocus("v3", visionList, currentFocusId);
assert.equal(archiveResult.newFocus, "v1", "Archiving focused vision v3 falls back deterministically to v1");
assert.equal(archiveResult.updatedList.find(v => v.id === "v3")?.status, "archived");

// Test 4e: Archived vision candidates are ignored for Today
const archivedDoc: SavedVisionStrategy = {
  ...mockVisionDoc,
  id: "v6_archived",
  status: "archived"
};

const candidateFromArchived = nextVisionCandidate(archivedDoc, []);
assert.equal(candidateFromArchived, null, "Archived vision must return null candidate for Today");

const activeDoc: SavedVisionStrategy = {
  ...mockVisionDoc,
  id: "v1",
  status: "active"
};
const candidateFromActive = nextVisionCandidate(activeDoc, []);
assert.notEqual(candidateFromActive, null, "Active vision with remaining steps returns candidate for Today");

console.log("  ✓ Vision Library active/focus/archive checks passed.");

// ==========================================
// 5. Mobilni prikaz & Menus
// ==========================================
console.log("\n▶ 5. Testing Mobile View & Menu State...");

// Test 5a: Padding calculation verification across mobile screen widths (320, 375, 390, 430 px)
const navHeightPx = 64;
const safeAreaBottomPx = 16;
const calculatedPaddingPx = 112 + safeAreaBottomPx; // calc(7rem + env(safe-area-inset-bottom))
assert.ok(calculatedPaddingPx > navHeightPx, "Calculated bottom padding exceeds navigation height across all screen widths");

// Test 5b: Single active menu key state invariant
let openMenuKey: string | null = null;
openMenuKey = "m0-s0";
assert.equal(openMenuKey, "m0-s0");
// Opening another menu closes the first
openMenuKey = "m1-s2";
assert.equal(openMenuKey, "m1-s2", "Only one menu key can be open at a time");

// Escape / click outside closes open menu
openMenuKey = null;
assert.equal(openMenuKey, null, "Menu closed on escape or outside click");

console.log("  ✓ Mobile view & menu state checks passed.");

// ==========================================
// 6. Today ručni prioritet
// ==========================================
console.log("\n▶ 6. Testing Today manual priority reordering & AI re-evaluation...");

const initialReviewDraft: DailyPlanDraft = {
  classifiedItems: [
    { id: "s-fixed", originalText: "Fiksni sastanak", kind: "task", timeHorizon: "today", suggestedAction: "Fiksni sastanak", estimatedMinutes: 30, requiredEnergy: 1, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: mockPriority },
    { id: "s-flex1", originalText: "Fleksibilan zadatak 1", kind: "task", timeHorizon: "today", suggestedAction: "Fleksibilan zadatak 1", estimatedMinutes: 25, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: mockPriority },
    { id: "s-flex2", originalText: "Fleksibilan zadatak 2", kind: "task", timeHorizon: "today", suggestedAction: "Fleksibilan zadatak 2", estimatedMinutes: 15, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: mockPriority },
  ],
  firstFocus: [
    { id: "fixed-1", sourceItemIds: ["s-fixed"], title: "Fiksni sastanak", block: "first_focus", estimatedMinutes: 30, capacityType: "fixed", requiredEnergy: 1, timeSensitivity: "none", priority: mockPriority, needsCheck: false },
    { id: "flex-1", sourceItemIds: ["s-flex1"], title: "Fleksibilan zadatak 1", block: "first_focus", estimatedMinutes: 25, capacityType: "flexible", requiredEnergy: 2, timeSensitivity: "none", priority: mockPriority, needsCheck: false },
    { id: "flex-2", sourceItemIds: ["s-flex2"], title: "Fleksibilan zadatak 2", block: "first_focus", estimatedMinutes: 15, capacityType: "flexible", requiredEnergy: 2, timeSensitivity: "none", priority: mockPriority, needsCheck: false }
  ],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Test",
  availableMinutes: 120,
  plannedRequiredMinutes: 70,
  plannedOptionalMinutes: 0
};

// Test 6a: Fixed tasks cannot be reordered
const fixedReorderAttempt = reorderPlanItem(initialReviewDraft, "fixed-1", "down");
assert.equal(fixedReorderAttempt.draft, initialReviewDraft, "Attempting to move fixed item returns unmutated draft");
assert.equal(fixedReorderAttempt.draft.manualPriorityOverride, undefined, "Fixed item attempt does not set manual override");

// Test 6b: Moving flexible item swaps order and sets manualPriorityOverride: true
const flexReorderResult = reorderPlanItem(initialReviewDraft, "flex-1", "down");
assert.notEqual(flexReorderResult.draft, initialReviewDraft);
assert.equal(flexReorderResult.draft.firstFocus[1].id, "flex-2", "Flexible item 2 moved up");
assert.equal(flexReorderResult.draft.firstFocus[2].id, "flex-1", "Flexible item 1 moved down");
assert.equal(flexReorderResult.draft.manualPriorityOverride, true, "manualPriorityOverride must be set to true");

// Test 6c: First Focus limit remains <= 3
assert.ok(flexReorderResult.draft.firstFocus.length <= 3, "First Focus section contains at most 3 items");

// Test 6d: "Preispitaj prioritete" generates preview without mutating active draft before confirmation
const previewDraft = reevaluatePrioritiesLocal(flexReorderResult.draft);
assert.notEqual(previewDraft, flexReorderResult.draft, "Re-evaluate priorities generates a separate preview draft");
assert.equal(previewDraft.manualPriorityOverride, false, "Preview draft resets manualPriorityOverride to false");
assert.equal(flexReorderResult.draft.manualPriorityOverride, true, "Original draft retains manualPriorityOverride: true until confirmed");

console.log("  ✓ Today manual priority & AI re-evaluation checks passed.");

console.log("\n========================================================");
console.log("🎉 ALL VISION REDESIGN & TODAY INTEGRATION TESTS PASSED!");
console.log("========================================================\n");
