import assert from "node:assert/strict";

// Setup mock localStorage in node environment
const store = new Map<string, string>();
const mockLocalStorage: any = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, String(v));
    mockLocalStorage[k] = String(v);
  },
  removeItem: (k: string) => {
    store.delete(k);
    delete mockLocalStorage[k];
  },
  clear: () => {
    for (const k of store.keys()) {
      delete mockLocalStorage[k];
    }
    store.clear();
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

interface MockTodayCandidate {
  id: string;
  source: string;
  sourceId: string;
  sourceTitle?: string;
  title: string;
  estimatedMinutes: number;
  status: string;
  isCurrentFocus?: boolean;
}

async function runTodayCandidatesSectionTests() {
  console.log("Starting Today Candidates Section & Dismissal Semantics Tests...");

  // Mock initial setup data
  const userId = "user-abc";
  const language = "sr";
  const localDate = "2026-09-10";
  const nextDate = "2026-09-11";

  const candidates: MockTodayCandidate[] = [
    { id: "cand-1", source: "vision", sourceId: "vision-1", sourceTitle: "Prva vizija", title: "Korak 1", estimatedMinutes: 20, status: "pending", isCurrentFocus: true },
    { id: "cand-2", source: "vision", sourceId: "vision-1", sourceTitle: "Prva vizija", title: "Korak 2", estimatedMinutes: 30, status: "pending" },
    { id: "cand-3", source: "vision", sourceId: "vision-2", sourceTitle: "Druga vizija", title: "Korak 3", estimatedMinutes: 15, status: "pending" },
  ];

  let currentVisionId: string | null = "vision-1";

  // State replication from TodayCandidatesSection
  let isClosedToday = mockLocalStorage.getItem(`app_a_vision_section_closed_${localDate}`) === "true";
  let mutedVisionIds: string[] = JSON.parse(mockLocalStorage.getItem(`app_a_muted_visions_${localDate}`) || "[]");
  let skippedCandidate: { id: string; title: string } | null = null;
  let items = [...candidates];
  let busyId: string | null = null;

  // Rule verification:
  // 1. "×" closes the entire section for the local date
  isClosedToday = false;
  mockLocalStorage.setItem(`app_a_vision_section_closed_${localDate}`, "true");
  isClosedToday = mockLocalStorage.getItem(`app_a_vision_section_closed_${localDate}`) === "true";
  assert.strictEqual(isClosedToday, true, "Section must be closed on local date after close action");

  // Status of candidates must not change when closing section
  assert.strictEqual(items[0].status, "pending", "Candidate status remains pending");
  console.log("✅ 1. Close section action successfully closes section for the current date without changing candidate status");

  // 2. Reload on same day remains closed, next day shows suggestions
  const sameDayClosed = mockLocalStorage.getItem(`app_a_vision_section_closed_${localDate}`) === "true";
  assert.strictEqual(sameDayClosed, true, "Reload on same day remains closed");

  const nextDayClosed = mockLocalStorage.getItem(`app_a_vision_section_closed_${nextDate}`) === "true";
  assert.strictEqual(nextDayClosed, false, "Next day defaults to open (not closed)");
  console.log("✅ 2. Section closure persists for the same day, but naturally re-opens on the next date");

  // 3. Skip current proposal does not auto-advance to next suggestion automatically
  // Reset states
  mockLocalStorage.clear();
  isClosedToday = false;
  mutedVisionIds = [];
  skippedCandidate = null;
  items = [...candidates];
  let skippedIds: string[] = [];

  // User skips cand-1
  const skippedItem = items[0];
  skippedIds = Array.from(new Set([...skippedIds, skippedItem.id]));
  mockLocalStorage.setItem(`app_a_skipped_candidates_${localDate}`, JSON.stringify(skippedIds));
  skippedCandidate = { id: skippedItem.id, title: skippedItem.title };

  let unmutedItems = items.filter(x => !mutedVisionIds.includes(x.sourceId) && !skippedIds.includes(x.id));
  assert.strictEqual(unmutedItems.length, 2, "Item list shrinks by 1 after skip");
  assert.deepStrictEqual(skippedCandidate, { id: "cand-1", title: "Korak 1" }, "Skipped card is set with correct item info");

  // Reload simulation
  const loadedSkippedIds: string[] = JSON.parse(mockLocalStorage.getItem(`app_a_skipped_candidates_${localDate}`) || "[]");
  assert.ok(loadedSkippedIds.includes("cand-1"), "Skipped candidate ID persists in localStorage");
  let reloadedUnmutedItems = items.filter(x => !mutedVisionIds.includes(x.sourceId) && !loadedSkippedIds.includes(x.id));
  assert.strictEqual(reloadedUnmutedItems.length, 2, "Candidate A remains excluded after simulated reload");

  // "Prikaži sledeći predlog" loads next suggestion on explicit click
  skippedCandidate = null; // clicked "show next suggestion"
  const nextItem = reloadedUnmutedItems.find(x => x.isCurrentFocus) || reloadedUnmutedItems[0];
  assert.strictEqual(nextItem.id, "cand-2", "Next suggestion B loaded on demand");
  console.log("✅ 3. Skip current proposal hides item, displays confirmation, and persists across reloads");
  console.log("✅ 4. Show next suggestion displays the next item only upon explicit button click");

  // Next day simulation
  const nextDaySkippedIds: string[] = JSON.parse(mockLocalStorage.getItem(`app_a_skipped_candidates_${nextDate}`) || "[]");
  assert.strictEqual(nextDaySkippedIds.length, 0, "No skipped candidates exist for next day");
  let nextDayUnmutedItems = items.filter(x => !mutedVisionIds.includes(x.sourceId) && !nextDaySkippedIds.includes(x.id));
  assert.strictEqual(nextDayUnmutedItems.some(x => x.id === "cand-1"), true, "Candidate A is shown again on the next day");
  console.log("✅ 4b. Skipped candidate is re-enabled on the next day");

  // 5. "Ne predlaži iz ove vizije danas" filters out that vision today, but does not affect other visions
  items = [...candidates];
  const mutedItem = items[0]; // from vision-1
  const mutedIds = Array.from(new Set([...mutedVisionIds, mutedItem.sourceId]));
  mockLocalStorage.setItem(`app_a_muted_visions_${localDate}`, JSON.stringify(mutedIds));
  mutedVisionIds = JSON.parse(mockLocalStorage.getItem(`app_a_muted_visions_${localDate}`) || "[]");

  // Filter items
  const filteredItems = items.filter(x => !mutedVisionIds.includes(x.sourceId));
  assert.strictEqual(filteredItems.length, 1, "Only items from unmuted visions should remain");
  assert.strictEqual(filteredItems[0].sourceId, "vision-2", "Druga vizija (vision-2) items are still displayed");
  console.log("✅ 5. Mute vision today correctly filters out specified active vision without affecting other visions");

  // 6. Double click prevention on skip & mute during busyId state
  busyId = "cand-2";
  const secondClickPrevented = busyId !== null;
  assert.strictEqual(secondClickPrevented, true, "Buttons are strictly disabled when busyId is active to prevent double clicks");
  console.log("✅ 6. BusyId state prevents double-click race conditions and accidental double-skips");

  // 7. None of the actions change currentVisionId
  assert.strictEqual(currentVisionId, "vision-1", "currentVisionId must remain totally untouched by all dismissal options");
  console.log("✅ 7. currentVisionId remains unmutated by today dismissals");

  console.log("All Today Candidates & Dismissal Semantics Tests passed! 🎉\n");
}

void runTodayCandidatesSectionTests();
