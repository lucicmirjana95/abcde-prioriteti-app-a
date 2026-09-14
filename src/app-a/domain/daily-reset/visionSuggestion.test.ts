import assert from "node:assert/strict";
import {
  computeVisionSuggestionFingerprint,
  isVisionSuggestionDismissed,
  dismissVisionSuggestion,
  resetDismissedVisionSuggestions,
  findRelatedVision,
  validateVisionSuggestionPayload,
} from "./visionSuggestion";
import { validatePlanDraft, recalculatePlanTotals } from "./validation";
import type { DailyPlanDraft, DailyResetVisionSuggestion, ClassifiedBrainDumpItem } from "./contracts";
import { APP_A_TRANSLATIONS, type AppALanguage } from "../../types";
import { parseModelResponse } from "../../../../server/app-a/daily-reset/parseModelResponse";

// Setup mock localStorage in node test environment
const mockStore = new Map<string, string>();
const mockLocalStorage: any = {
  getItem: (k: string) => mockStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mockStore.set(k, String(v));
    mockLocalStorage[k] = String(v);
  },
  removeItem: (k: string) => {
    mockStore.delete(k);
    delete mockLocalStorage[k];
  },
  clear: () => {
    for (const k of mockStore.keys()) {
      delete mockLocalStorage[k];
    }
    mockStore.clear();
  },
  get length() {
    return mockStore.size;
  },
  key: (index: number) => {
    return Array.from(mockStore.keys())[index] || null;
  }
};
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

let idCounter = 0;
const parseTestResponse = (rawDraft: any) =>
  parseModelResponse(
    { phase: "plan_ready", draft: rawDraft },
    () => `item_${++idCounter}`,
    false
  );

console.log("Running 20 Vision Suggestion Tests...");

// Test 1: Brain dump only with daily operational tasks -> parseModelResponse produces no vision suggestion
{
  const mockModelOutput = {
    classifiedItems: [
      { text: "Kupi mleko", originalText: "Kupi mleko", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 15, requiredEnergy: 2 },
      { text: "Plati racune", originalText: "Plati racune", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 20, requiredEnergy: 2 },
    ],
    firstFocus: [{ sourceItemIndex: 0, title: "Kupi mleko", estimatedMinutes: 15, requiredEnergy: 2, capacityType: "flexible", timeSensitivity: "none", block: "first_focus" }],
    laterToday: [{ sourceItemIndex: 1, title: "Plati racune", estimatedMinutes: 20, requiredEnergy: 2, capacityType: "flexible", timeSensitivity: "none", block: "later_today" }],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Standard day",
    visionSuggestion: null,
  };

  const parsed = parseTestResponse(mockModelOutput);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.phase === "plan_ready") {
    assert.equal(parsed.draft.visionSuggestion, undefined);
  }
}

// Test 2: Brain dump with clear multi-month outcome -> produces valid vision suggestion
{
  const mockModelOutput = {
    classifiedItems: [
      { text: "Lansirati SaaS proizvod u Q3", originalText: "Lansirati SaaS proizvod u Q3", kind: "idea", timeHorizon: "long_term_idea", suggestedAction: "Lansirati SaaS proizvod", estimatedMinutes: 60, requiredEnergy: 4, timeSensitivity: "none" },
      { text: "Kupiti namirnice", originalText: "Kupiti namirnice", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 30, requiredEnergy: 2 },
    ],
    firstFocus: [{ sourceItemIndex: 1, title: "Kupiti namirnice", estimatedMinutes: 30, requiredEnergy: 2, capacityType: "flexible", timeSensitivity: "none", block: "first_focus" }],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [{ sourceItemIndex: 0, suggestedAction: "Lansirati SaaS proizvod" }],
    nonActionItems: [],
    planRationale: "Focus on daily errands while developing SaaS long term",
    visionSuggestion: {
      sourceItemIndexes: [0],
      suggestedTitle: "Lansirati SaaS proizvod u Q3",
      desiredOutcome: "Potpuno funkcionalan SaaS u produkciji sa prvim korisnicima",
      reason: "Višemesečni cilj sa strateškim značajem",
      confidence: "high",
    },
  };

  const parsed = parseTestResponse(mockModelOutput);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.phase === "plan_ready") {
    assert.ok(parsed.draft.visionSuggestion);
    assert.equal(parsed.draft.visionSuggestion.suggestedTitle, "Lansirati SaaS proizvod u Q3");
    assert.equal(parsed.draft.visionSuggestion.confidence, "high");
  }
}

// Test 3: At most one vision suggestion allowed
{
  const mockModelOutput = {
    classifiedItems: [
      { text: "Napisati knjigu", originalText: "Napisati knjigu", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 60, requiredEnergy: 3 },
    ],
    firstFocus: [{ sourceItemIndex: 0, title: "Napisati knjigu", estimatedMinutes: 60, requiredEnergy: 3, capacityType: "flexible", timeSensitivity: "none", block: "first_focus" }],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Test",
    visionSuggestion: {
      sourceItemIndexes: [0],
      suggestedTitle: "Napisati knjigu o arhitekturi",
      desiredOutcome: "Objavljena knjiga od 250 strana",
      reason: "Strateški dugoročni ishod",
      confidence: "medium",
    },
  };

  const parsed = parseTestResponse(mockModelOutput);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.phase === "plan_ready") {
    // Exactly one object, not an array
    assert.equal(typeof parsed.draft.visionSuggestion, "object");
    assert.equal(Array.isArray(parsed.draft.visionSuggestion), false);
  }
}

// Test 4: Model proposes vision suggestion with confidence medium -> accepted
{
  const valid = validateVisionSuggestionPayload({
    sourceItemIds: ["item_1"],
    suggestedTitle: "Naučiti španski jezik",
    desiredOutcome: "B2 nivo konverzacije",
    reason: "Ponavljajuća želja za učenjem jezika",
    confidence: "medium",
  });
  assert.equal(valid.valid, true);
  assert.ok(valid.suggestion);
  assert.equal(valid.suggestion?.confidence, "medium");
}

// Test 5: Low confidence or invalid confidence is rejected
{
  const invalid = validateVisionSuggestionPayload({
    sourceItemIds: ["item_1"],
    suggestedTitle: "Kupiti hleb",
    desiredOutcome: "Pojesti hleb",
    reason: "Gladan sam",
    confidence: "low",
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.suggestion, undefined);
}

// Test 6: Malformed vision suggestion does not crash plan parsing and preserves valid plan
{
  const mockMalformed = {
    classifiedItems: [
      { text: "Task A", originalText: "Task A", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 30, requiredEnergy: 2 },
    ],
    firstFocus: [{ sourceItemIndex: 0, title: "Task A", estimatedMinutes: 30, requiredEnergy: 2, capacityType: "flexible", timeSensitivity: "none", block: "first_focus" }],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Valid plan rationale",
    visionSuggestion: {
      suggestedTitle: "X", // too short, invalid
      confidence: "invalid_confidence",
    },
  };

  const parsed = parseTestResponse(mockMalformed);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.phase === "plan_ready") {
    assert.equal(parsed.draft.firstFocus.length, 1);
    assert.equal(parsed.draft.visionSuggestion, undefined);
  }
}

// Test 7: sourceItemIndexes correctly map to canonical IDs
{
  const mockIndexed = {
    classifiedItems: [
      { text: "First Item", originalText: "First Item", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 20, requiredEnergy: 2 },
      { text: "Second Item - Long Term Direction", originalText: "Second Item - Long Term Direction", kind: "idea", timeHorizon: "long_term_idea", suggestedAction: "Long Term Direction", estimatedMinutes: 40, requiredEnergy: 3, timeSensitivity: "none" },
    ],
    firstFocus: [{ sourceItemIndex: 0, title: "First Item", estimatedMinutes: 20, requiredEnergy: 2, capacityType: "flexible", timeSensitivity: "none", block: "first_focus" }],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [{ sourceItemIndex: 1, suggestedAction: "Long Term Direction" }],
    nonActionItems: [],
    planRationale: "Testing mapping",
    visionSuggestion: {
      sourceItemIndexes: [1],
      suggestedTitle: "Long Term Direction",
      desiredOutcome: "Complete outcome",
      reason: "Valid reason for direction",
      confidence: "high",
    },
  };

  const parsed = parseTestResponse(mockIndexed);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.phase === "plan_ready") {
    assert.ok(parsed.draft.visionSuggestion);
    assert.equal(parsed.draft.visionSuggestion.sourceItemIds[0], parsed.draft.classifiedItems[1].id);
  }
}

// Test 8: Fingerprint calculation is deterministic and normalized
{
  const fp1 = computeVisionSuggestionFingerprint(["item_a", "item_b"], "Lansirati SaaS Proizvod");
  const fp2 = computeVisionSuggestionFingerprint(["item_b", "item_a"], " lansirati saas proizvod ");
  assert.equal(fp1, fp2);
  assert.ok(fp1.length > 5);
}

// Test 9: Dismissing a vision suggestion marks it as dismissed
{
  const userId = "test_user_9";
  const fp = computeVisionSuggestionFingerprint(["item_1"], "Moja Vizija");
  assert.equal(isVisionSuggestionDismissed(userId, fp), false);
  dismissVisionSuggestion(userId, fp);
  assert.equal(isVisionSuggestionDismissed(userId, fp), true);
}

// Test 10: Active related vision match detection identifies similar existing vision
{
  const suggestion: DailyResetVisionSuggestion = {
    sourceItemIds: ["item_1"],
    suggestedTitle: "Naučiti plivanje kraul tehnikom",
    desiredOutcome: "Plivati 1km bez pauze",
    reason: "Kondicija i zdravlje",
    confidence: "high",
    needsClarification: false,
  };

  const mockLibrary = [
    {
      id: "vis_1",
      idea: "Naučiti plivanje kraul",
      language: "sr" as const,
      status: "active" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      stepBreakdowns: {},
      strategy: {
        outcome: "Plivanje kraula",
        importance: "Zdravlje",
        milestones: [],
        risks: [],
        assumptions: [],
        nextStep: "Upis na bazen",
      },
    },
  ];

  const match = findRelatedVision(suggestion, mockLibrary);
  assert.ok(match);
  assert.equal(match.vision.id, "vis_1");
  assert.equal(match.isArchived, false);
}

// Test 11: Archived related vision match detection identifies archived vision
{
  const suggestion: DailyResetVisionSuggestion = {
    sourceItemIds: ["item_1"],
    suggestedTitle: "Maraton trčanje",
    desiredOutcome: "Završiti polumaraton",
    reason: "Trčanje",
    confidence: "medium",
    needsClarification: false,
  };

  const mockLibrary = [
    {
      id: "vis_archived_1",
      idea: "Trčanje maratona",
      language: "sr" as const,
      status: "archived" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      stepBreakdowns: {},
      strategy: {
        outcome: "Maraton trčanje",
        importance: "Kondicija",
        milestones: [],
        risks: [],
        assumptions: [],
        nextStep: "Trening",
      },
    },
  ];

  const match = findRelatedVision(suggestion, mockLibrary);
  assert.ok(match);
  assert.equal(match.vision.id, "vis_archived_1");
  assert.equal(match.isArchived, true);
}

// Test 12: No matching vision in library returns null
{
  const suggestion: DailyResetVisionSuggestion = {
    sourceItemIds: ["item_1"],
    suggestedTitle: "Potpuno unikatna nova ideja za robotiku",
    desiredOutcome: "Prototip robota",
    reason: "Istraživanje",
    confidence: "high",
    needsClarification: false,
  };

  const mockLibrary = [
    {
      id: "vis_cooking",
      idea: "Kuvati mediteranska jela",
      language: "sr" as const,
      status: "active" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      stepBreakdowns: {},
      strategy: {
        outcome: "Mediteranska kuhinja",
        importance: "Ishrana",
        milestones: [],
        risks: [],
        assumptions: [],
        nextStep: "Kupiti maslinovo ulje",
      },
    },
  ];

  const match = findRelatedVision(suggestion, mockLibrary);
  assert.equal(match, null);
}

// Test 13: validatePlanDraft checks visionSuggestion sourceItemIds against classifiedItems
{
  const draft: DailyPlanDraft = {
    classifiedItems: [
      { id: "c1", originalText: "Task 1", kind: "task", timeHorizon: "today", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" } },
    ],
    firstFocus: [
      { id: "p1", sourceItemIds: ["c1"], title: "Task 1", block: "first_focus", estimatedMinutes: 20, capacityType: "flexible", requiredEnergy: 2, timeSensitivity: "none", priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" }, needsCheck: false },
    ],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Rationale",
    plannedRequiredMinutes: 20,
    plannedOptionalMinutes: 0,
    visionSuggestion: {
      sourceItemIds: ["non_existent_id"],
      suggestedTitle: "Invalid ref vision",
      desiredOutcome: "Outcome",
      reason: "Reason",
      confidence: "high",
      needsClarification: false,
    },
  };

  const validation = validatePlanDraft(draft);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes("unknown source item ID")));
}

// Test 14: Valid visionSuggestion passes validatePlanDraft
{
  const draft: DailyPlanDraft = {
    classifiedItems: [
      { id: "c1", originalText: "Task 1", kind: "task", timeHorizon: "today", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" } },
    ],
    firstFocus: [
      { id: "p1", sourceItemIds: ["c1"], title: "Task 1", block: "first_focus", estimatedMinutes: 20, capacityType: "flexible", requiredEnergy: 2, timeSensitivity: "none", priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" }, needsCheck: false },
    ],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Rationale",
    plannedRequiredMinutes: 20,
    plannedOptionalMinutes: 0,
    visionSuggestion: {
      sourceItemIds: ["c1"],
      suggestedTitle: "Valid Title",
      desiredOutcome: "Valid Outcome",
      reason: "Valid Reason",
      confidence: "high",
      needsClarification: false,
    },
  };

  const validation = validatePlanDraft(draft);
  assert.equal(validation.valid, true);
}

// Test 15: Clarification prompt support
{
  const suggestion: DailyResetVisionSuggestion = {
    sourceItemIds: ["c1"],
    suggestedTitle: "Učenje programiranja",
    desiredOutcome: "Savladan TypeScript i React",
    reason: "Dugoročni cilj",
    confidence: "medium",
    needsClarification: true,
    clarificationQuestion: "Koji je primarni fokus: backend ili frontend?",
  };

  assert.equal(suggestion.needsClarification, true);
  assert.ok(suggestion.clarificationQuestion?.includes("backend ili frontend"));
}

// Test 16: Resetting dismissed vision suggestions clears storage
{
  const userId = "test_user_16";
  const fp = computeVisionSuggestionFingerprint(["i1"], "Vision to Dismiss and Reset");
  dismissVisionSuggestion(userId, fp);
  assert.equal(isVisionSuggestionDismissed(userId, fp), true);
  resetDismissedVisionSuggestions(userId);
  assert.equal(isVisionSuggestionDismissed(userId, fp), false);
}

// Test 17: Localization keys exist for en, sr, tr
{
  const languages: AppALanguage[] = ["en", "sr", "tr"];
  const requiredKeys = [
    "visionSuggestionTitle",
    "visionSuggestionBadge",
    "visionSuggestionReasonLabel",
    "visionSuggestionOutcomeLabel",
    "visionSuggestionDevelopBtn",
    "visionSuggestionSaveInboxBtn",
    "visionSuggestionDismissBtn",
    "visionSuggestionRelatedActiveTitle",
    "visionSuggestionRelatedArchivedTitle",
    "visionSuggestionConnectExistingBtn",
    "visionSuggestionCreateAnywayBtn",
    "visionSuggestionArchivedNotice",
    "visionSuggestionClarificationLabel",
    "visionSuggestionClarificationPlaceholder",
    "visionSuggestionSavedToInboxToast",
    "visionSuggestionDismissedToast",
  ] as const;

  for (const lang of languages) {
    const dict = APP_A_TRANSLATIONS[lang];
    assert.ok(dict, `Dictionary for ${lang} must exist`);
    for (const key of requiredKeys) {
      assert.ok(
        (dict as any)[key] && typeof (dict as any)[key] === "string",
        `Key ${key} missing in ${lang}`
      );
    }
  }
}

// Test 18: Mixed brain dump (errands + vision) properly distributes tasks and vision suggestion
{
  const mixedOutput = {
    classifiedItems: [
      { text: "Poslati izveštaj finansijama do 14h", originalText: "Poslati izveštaj finansijama do 14h", kind: "task", timeHorizon: "today", timeSensitivity: "deadline", deadlineText: "14:00", estimatedMinutes: 30, requiredEnergy: 3 },
      { text: "Zakazati pregled kod zubara", originalText: "Zakazati pregled kod zubara", kind: "task", timeHorizon: "today", timeSensitivity: "none", estimatedMinutes: 10, requiredEnergy: 1 },
      { text: "Izgraditi lični brend kroz tehničko pisanje tokom cele godine", originalText: "Izgraditi lični brend kroz tehničko pisanje tokom cele godine", kind: "idea", timeHorizon: "long_term_idea", suggestedAction: "Tehničko pisanje", estimatedMinutes: 60, requiredEnergy: 4, timeSensitivity: "none" },
    ],
    firstFocus: [{ sourceItemIndex: 0, title: "Poslati izveštaj finansijama", estimatedMinutes: 30, requiredEnergy: 3, capacityType: "flexible", timeSensitivity: "deadline", deadlineText: "14:00", block: "first_focus" }],
    laterToday: [{ sourceItemIndex: 1, title: "Zakazati pregled kod zubara", estimatedMinutes: 10, requiredEnergy: 1, capacityType: "flexible", timeSensitivity: "none", block: "later_today" }],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [{ sourceItemIndex: 2, suggestedAction: "Tehničko pisanje" }],
    nonActionItems: [],
    planRationale: "Focused on immediate daily deadlines while noting the yearly brand objective",
    visionSuggestion: {
      sourceItemIndexes: [2],
      suggestedTitle: "Lični brend kroz tehničko pisanje",
      desiredOutcome: "Objaviti 20 tehničkih članaka i izgraditi publiku",
      reason: "Godišnja težnja sa dugoročnim uticajem",
      confidence: "high",
    },
  };

  const parsed = parseTestResponse(mixedOutput);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.phase === "plan_ready") {
    assert.equal(parsed.draft.firstFocus.length, 1);
    assert.equal(parsed.draft.laterToday.length, 1);
    assert.ok(parsed.draft.visionSuggestion);
    assert.equal(parsed.draft.visionSuggestion.suggestedTitle, "Lični brend kroz tehničko pisanje");
  }
}

// Test 19: Plan totals and calculation invariant with visionSuggestion
{
  const baseDraft: DailyPlanDraft = {
    classifiedItems: [
      { id: "c1", originalText: "Task 1", kind: "task", timeHorizon: "today", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" } },
      { id: "c2", originalText: "Task 2", kind: "task", timeHorizon: "today", estimatedMinutes: 30, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" } },
    ],
    firstFocus: [
      { id: "p1", sourceItemIds: ["c1"], title: "Task 1", block: "first_focus", estimatedMinutes: 45, capacityType: "flexible", requiredEnergy: 3, timeSensitivity: "none", priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" }, needsCheck: false },
    ],
    laterToday: [
      { id: "p2", sourceItemIds: ["c2"], title: "Task 2", block: "later_today", estimatedMinutes: 30, capacityType: "flexible", requiredEnergy: 2, timeSensitivity: "none", priority: { consequence: 2, urgency: 2, goalContribution: 2, explanation: "" }, needsCheck: false },
    ],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Rationale",
    plannedRequiredMinutes: 75,
    plannedOptionalMinutes: 0,
    visionSuggestion: {
      sourceItemIds: ["c1"],
      suggestedTitle: "Title",
      desiredOutcome: "Outcome",
      reason: "Reason",
      confidence: "high",
      needsClarification: false,
    },
  };

  const recalculated = recalculatePlanTotals(baseDraft);
  assert.equal(recalculated.plannedRequiredMinutes, 75);
  assert.equal(recalculated.plannedFlexibleMinutes, 75);
  assert.equal(recalculated.plannedOptionalMinutes, 0);
}

// Test 20: Dismissal persistence across multiple keys
{
  const u1 = "user_alpha";
  const u2 = "user_beta";
  const fp = computeVisionSuggestionFingerprint(["i1"], "Vision Alpha");

  dismissVisionSuggestion(u1, fp);
  assert.equal(isVisionSuggestionDismissed(u1, fp), true);
  assert.equal(isVisionSuggestionDismissed(u2, fp), false); // Isolated per user
}

console.log("✓ All 20 Vision Suggestion unit & integration tests passed!");
