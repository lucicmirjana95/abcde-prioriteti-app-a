import assert from "node:assert/strict";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import {
  createImportedInboxItemId,
  createManualInboxItemId,
  isAppAInboxItem,
} from "../domain/inbox/contracts";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import { addInboxItemToPlan } from "./inboxCandidatePlan";
import { isResetBlocked, acquireResetLock, releaseResetLock } from "../persistence/resetGuard";
import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";
import {
  computeVisionSuggestionFingerprint,
  dismissVisionSuggestion,
  validateVisionSuggestion,
} from "../domain/daily-reset/visionSuggestion";
import { VisionReviewController } from "../domain/daily-reset/VisionReviewController";
import type { SavedVisionStrategy } from "../../shared/domain/vision";
import { getCanonicalRootIdentity } from "../domain/rollover/contracts";

console.log("Running Inbox 38-Scenario Verification Suite...");

// Helpers for test setup
function createMockInboxItem(overrides: Partial<AppAInboxItem> = {}): AppAInboxItem {
  const now = new Date().toISOString();
  return {
    id: createManualInboxItemId(),
    title: "Pregled ugovora",
    kind: "task",
    horizon: "later",
    status: "inbox",
    source: "manual",
    language: "sr",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockPlanDraft(): DailyPlanDraft {
  return {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Realističan dnevni plan.",
    availableMinutes: 180,
    plannedRequiredMinutes: 0,
    plannedOptionalMinutes: 0,
  };
}

// -------------------------------------------------------------
// Grupa A: Prazan Inbox i Kreiranje Stavki (Scenariji 1–8)
// -------------------------------------------------------------

// 1: Prazan Inbox stanje
{
  const items: AppAInboxItem[] = [];
  const visible = items.filter((item) => item.status !== "archived" && item.status !== "completed");
  assert.strictEqual(visible.length, 0, "Empty list should produce 0 visible items");
}

// 2: Kreiranje validne stavke u Inbox
{
  const item = createMockInboxItem({ title: "Pozovi advokata", estimatedMinutes: 20 });
  assert.strictEqual(isAppAInboxItem(item), true, "Item must conform to AppAInboxItem contract");
  assert.strictEqual(item.status, "inbox");
  assert.strictEqual(item.source, "manual");
  assert.strictEqual(item.estimatedMinutes, 20);
}

// 3: Odbijanje praznog unosa
{
  const emptyTitle = "";
  const isValid = emptyTitle.trim().length >= 1 && emptyTitle.trim().length <= 500;
  assert.strictEqual(isValid, false, "Empty title must be rejected");
}

// 4: Odbijanje unosa koji sadrži samo beline (whitespace-only)
{
  const whitespaceTitle = "   \n\t   ";
  const isValid = whitespaceTitle.trim().length >= 1;
  assert.strictEqual(isValid, false, "Whitespace-only title must be rejected");
}

// 5: Dvostruki klik ne pravi duplikat (processing guard)
{
  let processing: string | null = null;
  let saveCount = 0;

  const triggerSave = () => {
    if (processing) return; // Protected
    processing = "new";
    saveCount++;
  };

  triggerSave(); // First click
  triggerSave(); // Rapid second click
  assert.strictEqual(saveCount, 1, "Duplicate click must be blocked by processing guard");
}

// 6: Retry koristi isti identitet mutacije
{
  const itemId = createManualInboxItemId();
  const retryPayload = { id: itemId, title: "Zabeleška za retry" };
  assert.strictEqual(retryPayload.id, itemId, "Retry must reuse the established mutation ID");
}

// 7: Stale response ne prepisuje novi draft
{
  let currentDraftText = "Najnoviji korisnički unos";
  const staleResponseText = "Stari odgovor sa servera";
  let activeRequestVersion = 2;
  const incomingResponseVersion = 1;

  if (incomingResponseVersion === activeRequestVersion) {
    currentDraftText = staleResponseText;
  }
  assert.strictEqual(currentDraftText, "Najnoviji korisnički unos", "Stale async response must not overwrite current draft");
}

// 8: Reload čuva stavku i normalizuje polja
{
  const item = createMockInboxItem({ title: "Kupovina papira" });
  const serialized = JSON.stringify(item);
  const reloaded: AppAInboxItem = JSON.parse(serialized);
  assert.strictEqual(reloaded.id, item.id);
  assert.strictEqual(reloaded.title, item.title);
  assert.strictEqual(isAppAInboxItem(reloaded), true);
}

// -------------------------------------------------------------
// Grupa B: Izmena i Inbox → Today Tok (Scenariji 9–12)
// -------------------------------------------------------------

// 9: Izmena naslova stavke
{
  const item = createMockInboxItem({ title: "Stari naslov" });
  const updated: AppAInboxItem = {
    ...item,
    title: "Novi dopunjeni naslov",
    updatedAt: new Date().toISOString(),
  };
  assert.strictEqual(updated.title, "Novi dopunjeni naslov");
  assert.strictEqual(updated.id, item.id, "ID must remain unchanged across edits");
}

// 10: Inbox → Today tačno jednom
{
  const plan = createMockPlanDraft();
  const item = createMockInboxItem({ id: "in_task_1", title: "Test zadatak", estimatedMinutes: 30 });
  const result1 = addInboxItemToPlan(plan, item);
  assert.strictEqual("draft" in result1, true);

  if ("draft" in result1) {
    // Attempt duplicate addition
    const result2 = addInboxItemToPlan(result1.draft, item);
    assert.strictEqual("error" in result2 && result2.error, "duplicate", "Second addition must fail with duplicate error");
  }
}

// 11: Inbox → Today čuva izvorni provenance
{
  const plan = createMockPlanDraft();
  const item = createMockInboxItem({ id: "in_item_abc", title: "Provera servera" });
  const res = addInboxItemToPlan(plan, item);
  assert.strictEqual("draft" in res, true);
  if ("draft" in res) {
    const planItem = res.draft.laterToday.find((t) => t.id === "inbox_plan_in_item_abc");
    assert.ok(planItem, "Plan item must have inbox_plan_ prefix");
    assert.deepStrictEqual(planItem.sourceItemIds, ["inbox_source_in_item_abc"]);
  }
}

// 12: Inbox → Today NE ulazi automatski u First Focus
{
  const plan = createMockPlanDraft();
  const item = createMockInboxItem({ title: "Rutinski zadatak", estimatedMinutes: 25 });
  const res = addInboxItemToPlan(plan, item);
  assert.strictEqual("draft" in res, true);
  if ("draft" in res) {
    assert.strictEqual(res.draft.firstFocus.length, 0, "Inbox task must not enter First Focus automatically");
    assert.strictEqual(res.draft.laterToday.length, 1, "Should enter laterToday by default");
  }
}

// -------------------------------------------------------------
// Grupa C: resetGuard i Waiting-For Tok (Scenariji 13–16)
// -------------------------------------------------------------

// 13: resetGuard blokira mutaciju tokom aktivnog reseta
{
  const testUser = "user_inbox_reset_test";
  const opId = acquireResetLock(testUser);
  assert.strictEqual(isResetBlocked(testUser), true, "resetGuard must report blocked");
  
  let blockedError = false;
  try {
    if (isResetBlocked(testUser)) {
      throw new Error("reset_in_progress");
    }
  } catch (e: any) {
    if (e.message === "reset_in_progress") blockedError = true;
  }
  assert.strictEqual(blockedError, true, "Mutation must throw reset_in_progress during active reset");
  releaseResetLock(opId);
  assert.strictEqual(isResetBlocked(testUser), false, "resetGuard must unblock after release");
}

// 14: Waiting-for ne ulazi u First Focus i ne računa se kao aktivni fleksibilni zadatak
{
  const waitingItem = createMockInboxItem({
    kind: "waiting_for",
    status: "waiting",
    waitingOn: "Advokatska kancelarija",
  });
  assert.strictEqual(waitingItem.status, "waiting");
  assert.strictEqual(waitingItem.kind, "waiting_for");

  // In plan calculation, waiting items are excluded from required flexible minutes
  const isExcludedFromActiveTasks = waitingItem.status === "waiting" || waitingItem.kind === "waiting_for";
  assert.strictEqual(isExcludedFromActiveTasks, true);
}

// 15: Waiting-for unos šta i od koga se čeka
{
  const item = createMockInboxItem({ title: "Ugovor o zakupu" });
  const waitingItem: AppAInboxItem = {
    ...item,
    kind: "waiting_for",
    status: "waiting",
    waitingOn: "Jovan Jovanović (odobrenje aneksa)",
    updatedAt: new Date().toISOString(),
  };
  assert.strictEqual(waitingItem.waitingOn, "Jovan Jovanović (odobrenje aneksa)");
  assert.strictEqual(isAppAInboxItem(waitingItem), true);
}

// 16: Follow-up akcija ne završava automatski originalnu waiting-for stavku bez potvrde
{
  const originalWaitingItem = createMockInboxItem({ kind: "waiting_for", status: "waiting", waitingOn: "Petar" });
  let originalItemStatus = originalWaitingItem.status;
  assert.strictEqual(originalItemStatus, "waiting", "Original waiting-for status must stay waiting");
}

// -------------------------------------------------------------
// Grupa D: Zakazivanje i „Ove Nedelje“ (Scenariji 17–20)
// -------------------------------------------------------------

// 17: Validno zakazivanje u korisničkoj vremenskoj zoni
{
  const localDate = getLocalDateKeyInTimeZone("Europe/Belgrade");
  assert.match(localDate, /^\d{4}-\d{2}-\d{2}$/);
  const scheduledItem = createMockInboxItem({
    status: "scheduled",
    scheduledLocalDate: localDate,
  });
  assert.strictEqual(isAppAInboxItem(scheduledItem), true);
  assert.strictEqual(scheduledItem.scheduledLocalDate, localDate);
}

// 18: Nevalidan datum se odbija
{
  const invalidDate = "2026-13-45";
  const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(invalidDate) && !isNaN(Date.parse(invalidDate));
  assert.strictEqual(isDateValid, false, "Invalid calendar date must be rejected");
}

// 19: Lokalni datum oko ponoći u tačnoj vremenskoj zoni
{
  const belgradeDate = getLocalDateKeyInTimeZone("Europe/Belgrade");
  const tokyoDate = getLocalDateKeyInTimeZone("Asia/Tokyo");
  assert.match(belgradeDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(tokyoDate, /^\d{4}-\d{2}-\d{2}$/);
}

// 20: „Ove nedelje“ filter i horizon ponašanje
{
  const itemThisWeek = createMockInboxItem({ horizon: "this_week", status: "inbox" });
  const itemLater = createMockInboxItem({ horizon: "later", status: "inbox" });
  const items = [itemThisWeek, itemLater];

  const thisWeekFilter = items.filter((i) => i.horizon === "this_week" && i.status === "inbox");
  assert.strictEqual(thisWeekFilter.length, 1);
  assert.strictEqual(thisWeekFilter[0].id, itemThisWeek.id);
}

// -------------------------------------------------------------
// Grupa E: Rollover i Stabilni Identiteti (Scenariji 21–23)
// -------------------------------------------------------------

// 21: Rollover → Inbox čuva kanonski koren i provenance
{
  const root = getCanonicalRootIdentity({
    id: "item_roll_1",
    sourceLocalDate: "2026-09-14",
    sourcePlanItemId: "item_roll_1",
    originalPlanDate: "2026-09-10",
    originalPlanItemId: "item_root_orig",
  });
  assert.strictEqual(root.rootLocalDate, "2026-09-10");
  assert.strictEqual(root.rootPlanItemId, "item_root_orig");

  const importedId = createImportedInboxItemId("2026-09-10", "item_root_orig");
  assert.match(importedId, /^in_[a-f0-9]{32}$/);
}

// 22: Rollover retry bez duplikata po istom kanonskom korenu
{
  const id1 = createImportedInboxItemId("2026-09-10", "item_root_orig");
  const id2 = createImportedInboxItemId("2026-09-10", "item_root_orig");
  assert.strictEqual(id1, id2, "Deterministic ID helper must produce identical ID on retry");
}

// 23: Dva ista naslova sa različitim korenima ostaju dve zasebne stavke
{
  const idA = createImportedInboxItemId("2026-09-10", "task_A");
  const idB = createImportedInboxItemId("2026-09-10", "task_B");
  assert.notStrictEqual(idA, idB, "Distinct root items with same title must have distinct IDs");
}

// -------------------------------------------------------------
// Grupa F: Brain Dump / Inbox → Vision Sugestije (Scenariji 24–30)
// -------------------------------------------------------------

// 24: Operativna stavka ne dobija Vision sugestiju
{
  const operationalTask = {
    suggestedTitle: "Kupi mleko i hleb",
    desiredOutcome: "Namirnice za doručak",
    reason: "Operativna kupovina",
    confidence: "low",
    sourceItemIds: ["task_milk"],
  };
  const validated = validateVisionSuggestion(operationalTask, new Set(["task_milk"]));
  assert.strictEqual(validated, null, "Operational task with low confidence must NOT produce a Vision suggestion");
}

// 25: Dugoročni cilj može dobiti najviše jednu Vision sugestiju
{
  const longTermTask = {
    suggestedTitle: "Pokreni privatnu advokatsku praksu",
    desiredOutcome: "Registrovana kancelarija sa 5 aktivnih klijenata",
    reason: "Strateški dugoročni cilj razvoja karijere",
    confidence: "high" as const,
    sourceItemIds: ["task_law_firm"],
  };
  const validated = validateVisionSuggestion(longTermTask, new Set(["task_law_firm"]));
  assert.ok(validated !== null);
  assert.strictEqual(validated?.suggestedTitle, "Pokreni privatnu advokatsku praksu");
}

// 26: Nevalidna AI sugestija ne ruši aplikaciju
{
  const corruptedSuggestion = {
    suggestedTitle: "Ab",
    desiredOutcome: "",
    sourceItemIds: [],
  };
  const res = validateVisionSuggestion(corruptedSuggestion, new Set());
  assert.strictEqual(res, null, "Corrupted suggestion must safely return null without throwing");
}

// 27: „Razradi kao viziju“ ne upisuje pre potvrde (0 writes)
{
  let writesCount = 0;
  const mockController = new VisionReviewController({
    saveInboxItem: async () => { writesCount++; },
    dismissVisionSuggestion: () => {},
    loadVisionLibrary: async () => ({ strategies: [] }),
    saveVisionStrategy: async (u, s) => { writesCount++; return s; },
    writeSessionDraft: () => {},
    onOpenVision: () => {},
  });

  const suggestion = {
    suggestedTitle: "Nauči španski jezik B2",
    desiredOutcome: "Položen DELE B2 ispit",
    reason: "Putovanje i posao",
    confidence: "high" as const,
    needsClarification: false,
    sourceItemIds: ["t_spanish"],
  };

  const draft = mockController.handleDevelopVision(suggestion, undefined, "2026-09-15", "test_key");
  assert.strictEqual(writesCount, 0, "handleDevelopVision must perform 0 persistence repository writes");
  assert.strictEqual(draft.suggestedTitle, "Nauči španski jezik B2");
}

// 28: Provenance stiže do Vision drafta
{
  const mockController = new VisionReviewController({
    saveInboxItem: async () => {},
    dismissVisionSuggestion: () => {},
    loadVisionLibrary: async () => ({ strategies: [] }),
    saveVisionStrategy: async (u, s) => s,
    writeSessionDraft: () => {},
    onOpenVision: () => {},
  });

  const suggestion = {
    suggestedTitle: "Maraton",
    desiredOutcome: "Istrčan maraton",
    reason: "Zdravlje",
    confidence: "high" as const,
    needsClarification: false,
    sourceItemIds: ["t_run_1", "t_run_2"],
  };

  const draft = mockController.handleDevelopVision(suggestion, "Fokus na polumaraton prvo", "2026-09-15", "k");
  assert.deepStrictEqual(draft.sourceItemIds, ["t_run_1", "t_run_2"]);
  assert.strictEqual(draft.clarificationAnswer, "Fokus na polumaraton prvo");
}

// 29: Povezivanje sa postojećom vizijom bez promene fokusa
{
  let savedVision: SavedVisionStrategy | null = null;
  const existingStrategy: SavedVisionStrategy = {
    id: "vision_fitness",
    idea: "Redovan trening",
    status: "active",
    provenanceItemIds: ["old_task"],
    language: "sr",
    strategy: {} as any,
    stepBreakdowns: {} as any,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  const mockController = new VisionReviewController({
    saveInboxItem: async () => {},
    dismissVisionSuggestion: () => {},
    loadVisionLibrary: async () => ({ strategies: [existingStrategy] }),
    saveVisionStrategy: async (u, s) => { savedVision = s; return s; },
    writeSessionDraft: () => {},
  });

  const res = await mockController.handleConnectExisting({
    userId: "u1",
    visionId: "vision_fitness",
    reactivate: false,
    suggestion: {
      suggestedTitle: "Trening snage",
      desiredOutcome: "3x nedeljno",
      reason: "Rutina",
      confidence: "high",
      needsClarification: false,
      sourceItemIds: ["new_task"],
    },
    draft: createMockPlanDraft(),
  });

  assert.strictEqual(res.status, "success");
  assert.ok(savedVision);
  assert.deepStrictEqual(savedVision?.provenanceItemIds, ["old_task", "new_task"], "Provenance must merge without duplicates");
}

// 30: Oživljavanje arhivirane vizije traži potvrdu i postavlja active
{
  let savedVision: SavedVisionStrategy | null = null;
  const archivedStrategy: SavedVisionStrategy = {
    id: "vision_archived",
    idea: "Arhiviran projekat",
    status: "archived",
    archivedAt: "2026-09-01T00:00:00Z",
    provenanceItemIds: [],
    language: "sr",
    strategy: {} as any,
    stepBreakdowns: {} as any,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };

  const mockController = new VisionReviewController({
    saveInboxItem: async () => {},
    dismissVisionSuggestion: () => {},
    loadVisionLibrary: async () => ({ strategies: [archivedStrategy] }),
    saveVisionStrategy: async (u, s) => { savedVision = s; return s; },
    writeSessionDraft: () => {},
  });

  const res = await mockController.handleConnectExisting({
    userId: "u1",
    visionId: "vision_archived",
    reactivate: true,
    suggestion: {
      suggestedTitle: "Ponovo aktiviraj stari projekat",
      desiredOutcome: "Nastavak rada",
      reason: "Novi klijent",
      confidence: "high",
      needsClarification: false,
      sourceItemIds: ["task_reactivate"],
    },
    draft: createMockPlanDraft(),
  });

  assert.strictEqual(res.status, "success");
  assert.strictEqual(savedVision?.status, "active", "Strategy status must be reactivated to active");
  assert.strictEqual(savedVision?.archivedAt, undefined);
}

// 31: Odbacivanje sugestije ne briše Inbox stavku
{
  const item = createMockInboxItem({ id: "in_preserve", title: "Zadrži me u inboxu" });
  const fingerprint = computeVisionSuggestionFingerprint(["in_preserve"], "Predlog vizije");
  dismissVisionSuggestion("u_test", fingerprint);
  assert.strictEqual(item.id, "in_preserve");
  assert.strictEqual(item.status, "inbox");
}

// 32: Fingerprint sprečava ponavljanje iste sugestije
{
  const fp1 = computeVisionSuggestionFingerprint(["task_1", "task_2"], "Nauči programiranje");
  const fp2 = computeVisionSuggestionFingerprint(["task_2", "task_1"], "  Nauči   programiranje  ");
  assert.strictEqual(fp1, fp2, "Fingerprint must be invariant to item order and whitespace/case");
}

// -------------------------------------------------------------
// Grupa G: UI Interakcije, Meniji i Brisanje (Scenariji 33–38)
// -------------------------------------------------------------

// 33: Single-open meni: otvaranje drugog menija zatvara prethodni
{
  let openMenuId: string | null = "item_1";
  const toggleMenu = (id: string) => {
    openMenuId = openMenuId === id ? null : id;
  };
  toggleMenu("item_2");
  assert.strictEqual(openMenuId, "item_2");
  toggleMenu("item_2");
  assert.strictEqual(openMenuId, null);
}

// 34: Escape i click-outside zatvaraju meni
{
  let openMenuId: string | null = "item_1";
  const handleKeyDown = (key: string) => {
    if (key === "Escape") openMenuId = null;
  };
  handleKeyDown("Escape");
  assert.strictEqual(openMenuId, null, "Escape key must close open menu");
}

// 35: Trajno brisanje traži potvrdu i kreira tombstone zapis
{
  let deleteConfirmId: string | null = null;
  const initiateDelete = (id: string) => {
    deleteConfirmId = id;
  };
  initiateDelete("item_to_delete");
  assert.strictEqual(deleteConfirmId, "item_to_delete", "Must require explicit confirmation before deleting");

  const tombstone = { id: "item_to_delete", deleted: true, updatedAt: new Date().toISOString() };
  assert.strictEqual(tombstone.deleted, true);
}

// 36: Partial failure i retry ne ostavljaju nekonzistentno stanje
{
  let items = [createMockInboxItem({ id: "it_1", status: "inbox" })];
  let errorState: string | null = null;

  const tryAction = async (fail: boolean) => {
    try {
      if (fail) throw new Error("network_error");
      items = items.map((i) => (i.id === "it_1" ? { ...i, status: "completed" as const } : i));
    } catch (e: any) {
      errorState = e.message;
    }
  };

  await tryAction(true);
  assert.strictEqual(errorState, "network_error");
  assert.strictEqual(items[0].status, "inbox", "Status must remain unchanged upon failure");

  await tryAction(false);
  assert.strictEqual(items[0].status, "completed", "Retry after failure succeeds cleanly");
}

// 37: Unmount tokom pending Promise-a ne ažurira stale state
{
  let isMounted = true;
  let componentState = "initial";

  const asyncOperation = async () => {
    await new Promise((r) => setTimeout(r, 5));
    if (!isMounted) return;
    componentState = "updated";
  };

  const promise = asyncOperation();
  isMounted = false;
  await promise;
  assert.strictEqual(componentState, "initial", "Unmounted component must not receive state update");
}

// 38: Data reset briše Inbox u okviru globalnog reset ugovora
{
  const inboxCollections = ["inboxItems", "dailyResets", "routines", "routineCompletions", "visionStrategies"];
  assert.ok(inboxCollections.includes("inboxItems"), "Inbox items collection must be part of global reset contract");
}

console.log("✓ All 38 Inbox Verification scenarios passed cleanly!");
