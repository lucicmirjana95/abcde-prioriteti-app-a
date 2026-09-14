import assert from "node:assert/strict";
import {
  extractExplicitTimeMinutes,
  isWaitingOnExternalDependency,
  normalizeChronologicalOrder,
  normalizePlanDraftChronology,
} from "./chronology";
import type { DailyPlanDraft, DailyPlanItem } from "./contracts";

function createItem(partial: Partial<DailyPlanItem> & { id: string; title: string }): DailyPlanItem {
  return {
    sourceItemIds: [partial.id],
    block: "later_today",
    estimatedMinutes: 30,
    requiredEnergy: 3,
    timeSensitivity: "none",
    capacityType: "flexible",
    priority: { consequence: 3, urgency: 3, goalContribution: 3, explanation: "Standard task" },
    reasoning: "Planned for today",
    needsCheck: false,
    ...partial,
  };
}

// Regression Test A: Rok 14:30 pre fiksne obaveze u 15:00
{
  const itemDeadline1430 = createItem({
    id: "task-deadline-1430",
    title: "Pošalji izveštaj klijentu",
    deadlineText: "14:30",
    timeSensitivity: "deadline",
    capacityType: "flexible",
    block: "later_today",
  });

  const itemFixed1500 = createItem({
    id: "task-fixed-1500",
    title: "Sastanak sa timom",
    deadlineText: "15:00",
    timeSensitivity: "deadline",
    capacityType: "fixed",
    block: "later_today",
  });

  // Input has fixed 15:00 before deadline 14:30
  const inputOrder = [itemFixed1500, itemDeadline1430];
  const normalized = normalizeChronologicalOrder(inputOrder);

  assert.equal(normalized.length, 2);
  // Item with 14:30 deadline MUST come before fixed 15:00
  assert.equal(normalized[0].id, "task-deadline-1430");
  assert.equal(normalized[1].id, "task-fixed-1500");
  // Fixed commitment capacityType MUST NOT be modified into flexible
  assert.equal(normalized[1].capacityType, "fixed");
  assert.equal(normalized[0].capacityType, "flexible");
}

// Regression Test B: Odmor odmah posle pregleda
{
  const exam = createItem({
    id: "exam-1",
    title: "Lekarski pregled",
    deadlineText: "10:00",
    capacityType: "fixed",
    timeSensitivity: "deadline",
  });

  const rest = createItem({
    id: "rest-1",
    title: "Kratak odmor odmah posle pregleda",
    description: "Popij čaj i predahni odmah posle lekarskog pregleda",
    capacityType: "flexible",
  });

  const email = createItem({
    id: "email-1",
    title: "Odgovori na mejlove",
    deadlineText: "11:30",
    capacityType: "flexible",
  });

  // Even if rest is listed before exam in input
  const input = [rest, exam, email];
  const normalized = normalizeChronologicalOrder(input);

  assert.equal(normalized[0].id, "exam-1");
  assert.equal(normalized[1].id, "rest-1");
  assert.equal(normalized[2].id, "email-1");
}

// Regression Test C: Zadatak koji čeka tuđe cene
{
  const waitingTask = createItem({
    id: "waiting-quote",
    title: "Kreiraj ponudu za nabavku opreme",
    description: "Čekam cene od dobavljača pre slanja ponude",
    needsCheck: false,
  });

  assert.equal(isWaitingOnExternalDependency(waitingTask), true);
  assert.equal(extractExplicitTimeMinutes(waitingTask), null);

  const regularTask = createItem({
    id: "regular-task",
    title: "Pregledaj tehničku specifikaciju",
    deadlineText: "12:00",
  });

  const normalized = normalizeChronologicalOrder([waitingTask, regularTask]);

  const resultWaiting = normalized.find((i) => i.id === "waiting-quote");
  assert.ok(resultWaiting, "Waiting task must be retained");
  // Order cannot be reliably scheduled so needsCheck MUST be true
  assert.equal(resultWaiting.needsCheck, true);
  // Must NOT invent a fake time/deadline
  assert.equal(resultWaiting.deadlineText, undefined);
  assert.equal(resultWaiting.deadlineIso, undefined);
}

// Regression Test D: Nepoznato vreme bez lažne preciznosti
{
  const untimedTask1 = createItem({
    id: "untimed-1",
    title: "Pročitaj priručnik o bezbednosti",
  });

  const untimedTask2 = createItem({
    id: "untimed-2",
    title: "Ažuriraj beleške sa sastanka",
  });

  assert.equal(extractExplicitTimeMinutes(untimedTask1), null);
  assert.equal(extractExplicitTimeMinutes(untimedTask2), null);

  const normalized = normalizeChronologicalOrder([untimedTask1, untimedTask2]);
  assert.equal(normalized[0].id, "untimed-1");
  assert.equal(normalized[1].id, "untimed-2");
  // No fake timestamps invented
  assert.equal(normalized[0].deadlineText, undefined);
  assert.equal(normalized[0].deadlineIso, undefined);
  assert.equal(normalized[1].deadlineText, undefined);
  assert.equal(normalized[1].deadlineIso, undefined);
}

// Regression Test E: Ne pomeraj završene stavke
{
  const completedTask = createItem({
    id: "completed-1",
    title: "Jutarnji sinhronizacioni poziv",
    deadlineText: "09:00",
  });

  const task1500 = createItem({
    id: "task-1500",
    title: "Pregled koda",
    deadlineText: "15:00",
  });

  const task1200 = createItem({
    id: "task-1200",
    title: "Ručak",
    deadlineText: "12:00",
  });

  // Completed item is at index 0
  const input = [completedTask, task1500, task1200];
  const normalized = normalizeChronologicalOrder(input, ["completed-1"]);

  // Index 0 must remain completedTask
  assert.equal(normalized[0].id, "completed-1");
  // Uncompleted items are ordered chronologically: 12:00 before 15:00
  assert.equal(normalized[1].id, "task-1200");
  assert.equal(normalized[2].id, "task-1500");
}

// Regression Test F: Ne pomeraj fiksne obaveze u fleksibilne blokove
{
  const dummyDraft: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [
      createItem({
        id: "ff-1",
        title: "Kritična isporuka",
        deadlineText: "13:00",
        block: "first_focus",
        capacityType: "flexible",
      }),
    ],
    laterToday: [
      createItem({
        id: "lt-fixed",
        title: "Konsultacija sa advokatom",
        deadlineText: "16:00",
        block: "later_today",
        capacityType: "fixed",
      }),
      createItem({
        id: "lt-flex",
        title: "Pripremi dokumente",
        deadlineText: "14:00",
        block: "later_today",
        capacityType: "flexible",
      }),
    ],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Test plan",
    plannedRequiredMinutes: 120,
    plannedOptionalMinutes: 0,
    plannedFlexibleMinutes: 60,
    plannedFixedMinutes: 60,
  };

  const normalizedDraft = normalizePlanDraftChronology(dummyDraft);

  // Blocks must be preserved
  assert.equal(normalizedDraft.firstFocus.length, 1);
  assert.equal(normalizedDraft.laterToday.length, 2);
  // Inside laterToday, 14:00 must come before 16:00
  assert.equal(normalizedDraft.laterToday[0].id, "lt-flex");
  assert.equal(normalizedDraft.laterToday[1].id, "lt-fixed");
  // Capacity type must remain fixed
  assert.equal(normalizedDraft.laterToday[1].capacityType, "fixed");
  assert.equal(normalizedDraft.laterToday[1].block, "later_today");
}

console.log("Chronology domain and regression tests passed.");
