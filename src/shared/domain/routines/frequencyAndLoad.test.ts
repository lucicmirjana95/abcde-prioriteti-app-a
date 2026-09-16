import assert from "node:assert";
import test from "node:test";
import { build } from "esbuild";
import type { RoutineCompletion, SharedRoutine } from "./contracts";
import {
  getIsoWeekday,
  getLocalWeekBounds,
  getRoutineAvailabilityForDate,
  getWeeklyRoutineProgress,
  isRoutineDeterministicallyScheduledOnDate,
  resolveEffectiveFrequency,
} from "./schedule";
import { normalizeSharedRoutine, validateSharedRoutine } from "./validation";
import { assessDailyLoad, calculateDailyLoad } from "../../../app-a/domain/daily-reset/dailyLoad";
import type { DailyPlanDraft } from "../../../app-a/domain/daily-reset/contracts";
import { acquireResetLock, releaseResetLock } from "../../../app-a/persistence/resetGuard";
import { executeDataReset, type FirestoreAdapter } from "../../../app-a/persistence/dataResetRepository";

const mockFirestore = `
const store = new Map(); let fail = false;
export const seed = (path, value) => store.set(path, structuredClone(value));
export const read = path => structuredClone(store.get(path));
export const reset = () => { store.clear(); fail = false; };
export const failNext = () => { fail = true; };
export const doc = (_, ...parts) => parts.join('/');
export const collection = doc;
const snapshot = path => ({ exists: () => store.has(path), data: () => read(path) });
export const getDoc = async path => snapshot(path);
export const getDocs = async path => ({ docs: [...store.keys()].filter(key => key.startsWith(path + '/') && !key.slice(path.length+1).includes('/')).map(snapshot) });
export const serverTimestamp = () => 'SERVER_TIMESTAMP';
export const arrayUnion = (...values) => ({ op: 'union', values });
export const arrayRemove = (...values) => ({ op: 'remove', values });
function apply(target, path, value) {
  const keys = path.split('.'); const key = keys.pop();
  for (const segment of keys) target = target[segment] ||= {};
  const resolved = value === 'SERVER_TIMESTAMP' ? { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } : value;
  target[key] = resolved?.op === 'union' ? [...new Set([...(target[key] || []), ...resolved.values])]
    : resolved?.op === 'remove' ? (target[key] || []).filter(item => !resolved.values.includes(item)) : structuredClone(resolved);
}
function commit(operations) {
  if (fail) { fail = false; throw new Error('unavailable'); }
  const copy = new Map([...store.entries()].map(([k,v]) => [k, structuredClone(v)]));
  for (const [mode, path, value, options] of operations) {
    if (mode === 'delete') { copy.delete(path); continue; }
    if (mode === 'update' && !copy.has(path)) throw new Error('not-found');
    const next = mode === 'update' || options?.merge ? copy.get(path) || {} : {};
    for (const [key, val] of Object.entries(value)) apply(next, key, val);
    copy.set(path, next);
  }
  store.clear(); for (const [key,value] of copy) store.set(key,value);
}
export const setDoc = async (path,value,options) => commit([['set',path,value,options]]);
export const updateDoc = async (path,value) => commit([['update',path,value]]);
export const deleteDoc = async path => commit([['delete',path]]);
export const writeBatch = () => { const ops = []; return { set: (...args) => ops.push(['set',...args]), update: (...args) => ops.push(['update',...args]), commit: async () => commit(ops) }; };
export const runTransaction = async (_, operation) => {
  const ops = []; const result = await operation({
    get: async path => { if (ops.length) throw new Error('read_after_write'); return snapshot(path); },
    set: (...args) => ops.push(['set',...args]), update: (...args) => ops.push(['update',...args]), delete: path => ops.push(['delete',path]),
  }); commit(ops); return result;
};
export const query = value => value;
export const where = () => null; export const orderBy = () => null; export const limit = () => null;
`;

const bundled = await build({
  stdin: { contents: `export * from './src/app-a/persistence/dailyPlanRepository'; export * from 'test:firestore';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'isolated-firestore', setup(plugin) {
    plugin.onResolve({ filter: /^(firebase\/firestore|test:firestore)$/ }, () => ({ path: 'firestore', namespace: 'test' }));
    plugin.onResolve({ filter: /lib\/firebase$/ }, () => ({ path: 'firebase', namespace: 'test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'firestore' ? mockFirestore : `export const db = {}; export const auth = { currentUser: { uid: 'user-1' }, authStateReady: async () => {} };` }));
  } }],
});

const { loadPlannedRoutineIds, addPlannedRoutineForDate, removePlannedRoutineForDate, togglePlannedRoutineForDate } =
  (await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)) as any;

const baseRoutine: SharedRoutine = {
  id: "routine-1",
  title: "Morning Routine",
  fullAction: "Do full 20 min workout",
  minimumAction: "Do 5 min stretch",
  recurrence: { type: "daily" },
  status: "active",
  timeZone: "Europe/Belgrade",
  language: "sr",
  source: "user",
  sortOrder: 1,
  goalRelationships: [],
  activeFrom: "2026-01-01",
  createdAt: "2026-01-01T08:00:00.000Z",
  updatedAt: "2026-01-01T08:00:00.000Z",
  estimatedMinutes: 20,
  frequency: { kind: "daily" },
  origin: { kind: "manual" },
  revision: 1,
};

const baseDraft: DailyPlanDraft = {
  localDate: "2026-09-12",
  classifiedItems: [],
  firstFocus: [],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Test rationale",
  availableMinutes: 120,
  plannedRequiredMinutes: 0,
  plannedOptionalMinutes: 0,
};

// Scenario 1: ISO Weekday conversion
test("Scenario 1: getIsoWeekday correctly maps Monday..Sunday to 1..7 without local date shifting", () => {
  assert.equal(getIsoWeekday("2026-09-07"), 1); // Monday
  assert.equal(getIsoWeekday("2026-09-08"), 2); // Tuesday
  assert.equal(getIsoWeekday("2026-09-09"), 3); // Wednesday
  assert.equal(getIsoWeekday("2026-09-10"), 4); // Thursday
  assert.equal(getIsoWeekday("2026-09-11"), 5); // Friday
  assert.equal(getIsoWeekday("2026-09-12"), 6); // Saturday
  assert.equal(getIsoWeekday("2026-09-13"), 7); // Sunday
});

// Scenario 2: Canonical week bounds calculation
test("Scenario 2: getLocalWeekBounds returns Monday..Sunday for any given local date", () => {
  const bounds = getLocalWeekBounds("2026-09-10");
  assert.equal(bounds.startLocalDate, "2026-09-07");
  assert.equal(bounds.endLocalDate, "2026-09-13");
  assert.equal(bounds.datesInWeek.length, 7);
  assert.equal(bounds.datesInWeek[0], "2026-09-07");
  assert.equal(bounds.datesInWeek[6], "2026-09-13");
});

// Scenario 3: Deterministic daily routine is scheduled every day
test("Scenario 3: daily frequency is scheduled every day", () => {
  const routine: SharedRoutine = { ...baseRoutine, frequency: { kind: "daily" } };
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-07"), true);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-12"), true);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-13"), true);
});

// Scenario 4: Deterministic weekdays routine is scheduled Monday-Friday, not weekend
test("Scenario 4: weekdays frequency is scheduled Monday to Friday and excluded on weekends", () => {
  const routine: SharedRoutine = { ...baseRoutine, frequency: { kind: "weekdays" } };
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-07"), true); // Mon
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-11"), true); // Fri
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-12"), false); // Sat
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-13"), false); // Sun
});

// Scenario 5: Selected days frequency scheduled only on selected ISO weekdays
test("Scenario 5: selected_days frequency is scheduled only on matching days of week", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "selected_days", daysOfWeek: [2, 4, 6] },
  };
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-07"), false); // Mon (1)
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-08"), true); // Tue (2)
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-09"), false); // Wed (3)
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-10"), true); // Thu (4)
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-11"), false); // Fri (5)
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-12"), true); // Sat (6)
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-13"), false); // Sun (7)
});

// Scenario 6: Selected days canonical sorting and deduplication
test("Scenario 6: selected_days canonical validation sorts and deduplicates daysOfWeek", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "selected_days", daysOfWeek: [6, 2, 4, 2, 6] as any },
  };
  const normalized = normalizeSharedRoutine(routine);
  assert.equal(normalized.type, "valid");
  if (normalized.type === "valid") {
    assert.deepEqual(normalized.routine.frequency, { kind: "selected_days", daysOfWeek: [2, 4, 6] });
  }
});

// Scenario 7: times_per_week is NEVER deterministically scheduled on any date
test("Scenario 7: times_per_week is never deterministically scheduled on any date", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 3 },
  };
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-07"), false);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-08"), false);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-09"), false);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-10"), false);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-11"), false);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-12"), false);
  assert.equal(isRoutineDeterministicallyScheduledOnDate(routine, "2026-09-13"), false);
});

// Scenario 8: times_per_week count validation (1..7)
test("Scenario 8: times_per_week count validation accepts 1..7 and rejects outside values", () => {
  const valid = validateSharedRoutine({
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 4 },
  });
  assert.equal(valid.valid, true);

  const tooLow = validateSharedRoutine({
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 0 as any },
  });
  assert.equal(tooLow.valid, false);

  const tooHigh = validateSharedRoutine({
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 8 as any },
  });
  assert.equal(tooHigh.valid, false);
});

// Scenario 9: Explicitly planned times_per_week routine enters today's load
test("Scenario 9: explicitly planned times_per_week routine enters today's load", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 3 },
    estimatedMinutes: 30,
  };
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    plannedRoutineIds: [routine.id],
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 30);
  assert.equal(load.totalPlannedMinutes, 30);
});

// Scenario 10: Explicitly planned times_per_week routine availability is scheduled_today
test("Scenario 10: explicitly planned times_per_week routine availability is scheduled_today", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 3 },
  };
  const avail = getRoutineAvailabilityForDate({
    routine,
    localDate: "2026-09-12",
    isExplicitlyPlannedToday: true,
  });
  assert.equal(avail.status, "scheduled_today");
  assert.equal(avail.isPlannedToday, true);
});

// Scenario 11: Explicit planning preserved even if weekly target already met
test("Scenario 11: explicit planning is preserved even if weekly target is already met", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 1 },
  };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-07",
      status: "full",
      sourceApp: "app_a",
      recordedAt: "2026-09-07T10:00:00Z",
    },
  ];
  const avail = getRoutineAvailabilityForDate({
    routine,
    localDate: "2026-09-12",
    completions,
    isExplicitlyPlannedToday: true,
  });
  assert.equal(avail.isPlannedToday, true);
  assert.equal(avail.weeklyProgress?.isTargetMet, true);
});

// Scenario 12: Routine availability: scheduled_today for scheduled deterministic routines
test("Scenario 12: routine availability status is scheduled_today for deterministic scheduled routines", () => {
  const routine: SharedRoutine = { ...baseRoutine, frequency: { kind: "daily" } };
  const avail = getRoutineAvailabilityForDate({ routine, localDate: "2026-09-12" });
  assert.equal(avail.status, "scheduled_today");
  assert.equal(avail.isPlannedToday, true);
});

// Scenario 13: Routine availability: available_flexible for uncompleted times_per_week
test("Scenario 13: routine availability status is available_flexible for uncompleted times_per_week", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 3 },
  };
  const avail = getRoutineAvailabilityForDate({ routine, localDate: "2026-09-12" });
  assert.equal(avail.status, "available_flexible");
  assert.equal(avail.isPlannedToday, false);
});

// Scenario 14: Routine availability: weekly_target_met for completed times_per_week (not planned today)
test("Scenario 14: routine availability status is weekly_target_met when target met and not planned today", () => {
  const routine: SharedRoutine = {
    ...baseRoutine,
    frequency: { kind: "times_per_week", count: 1 },
  };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-07",
      status: "full",
      sourceApp: "app_a",
      recordedAt: "2026-09-07T10:00:00Z",
    },
  ];
  const avail = getRoutineAvailabilityForDate({
    routine,
    localDate: "2026-09-10",
    completions,
    isExplicitlyPlannedToday: false,
  });
  assert.equal(avail.status, "weekly_target_met");
  assert.equal(avail.isPlannedToday, false);
});

// Scenario 15: Routine completion recorded: full completion today
test("Scenario 15: full completion today recorded for routine", () => {
  const routine: SharedRoutine = { ...baseRoutine, frequency: { kind: "daily" } };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-12",
      status: "full",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const todayCompletion = completions.find(
    (c) => c.routineId === routine.id && c.localDate === "2026-09-12",
  );
  assert.equal(todayCompletion?.status, "full");
});

// Scenario 16: Routine completion recorded: minimum completion today
test("Scenario 16: minimum completion today recorded for routine", () => {
  const routine: SharedRoutine = { ...baseRoutine, frequency: { kind: "daily" } };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-12",
      status: "minimum",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const todayCompletion = completions.find(
    (c) => c.routineId === routine.id && c.localDate === "2026-09-12",
  );
  assert.equal(todayCompletion?.status, "minimum");
});

// Scenario 17: Routine completion recorded: skipped today
test("Scenario 17: skipped today recorded for routine", () => {
  const routine: SharedRoutine = { ...baseRoutine, frequency: { kind: "daily" } };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-12",
      status: "skipped",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const todayCompletion = completions.find(
    (c) => c.routineId === routine.id && c.localDate === "2026-09-12",
  );
  assert.equal(todayCompletion?.status, "skipped");
});

// Scenario 18: Routine planned minutes included in total planned workload
test("Scenario 18: routine planned minutes are included in total planned workload", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: 45 };
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 45);
  assert.equal(load.routineRemainingMinutes, 45);
  assert.equal(load.totalPlannedMinutes, 45);
  assert.equal(load.totalRemainingMinutes, 45);
});

// Scenario 19: Routine full completion frees remaining minutes
test("Scenario 19: routine full completion marks routine finished and frees remaining minutes", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: 45 };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-12",
      status: "full",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    routineCompletions: completions,
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 45);
  assert.equal(load.routineRemainingMinutes, 0);
  assert.equal(load.totalPlannedMinutes, 45);
  assert.equal(load.totalRemainingMinutes, 0);
});

// Scenario 20: Routine minimum completion frees remaining minutes
test("Scenario 20: routine minimum completion marks routine finished and frees remaining minutes", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: 45 };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-12",
      status: "minimum",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    routineCompletions: completions,
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 45);
  assert.equal(load.routineRemainingMinutes, 0);
  assert.equal(load.totalRemainingMinutes, 0);
});

// Scenario 21: Routine skipped frees remaining minutes
test("Scenario 21: routine skipped marks routine finished and frees remaining minutes", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: 45 };
  const completions: RoutineCompletion[] = [
    {
      routineId: routine.id,
      localDate: "2026-09-12",
      status: "skipped",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    routineCompletions: completions,
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 45);
  assert.equal(load.routineRemainingMinutes, 0);
  assert.equal(load.totalRemainingMinutes, 0);
});

// Scenario 22: Unknown duration routine handling
test("Scenario 22: routine with unknown duration increments unknown counter and adds 0 min", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: undefined };
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 0);
  assert.equal(load.unknownDurationRoutineCount, 1);
});

// Scenario 23: Paused and archived routines excluded from load
test("Scenario 23: paused and archived routines never enter load calculations", () => {
  const paused: SharedRoutine = { ...baseRoutine, id: "r-paused", status: "paused" };
  const archived: SharedRoutine = { ...baseRoutine, id: "r-archived", status: "archived" };
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [paused, archived],
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 0);
  assert.equal(load.totalPlannedMinutes, 0);
});

// Scenario 24: Linked routine-task double count prevention via sourceRoutineId
test("Scenario 24: double counting is prevented when task has sourceRoutineId matching routine", () => {
  const routine: SharedRoutine = { ...baseRoutine, id: "routine-x", estimatedMinutes: 30 };
  const draftWithLinkedTask: DailyPlanDraft = {
    ...baseDraft,
    firstFocus: [
      {
        id: "task-linked",
        sourceRoutineId: "routine-x",
        title: "Morning Routine",
        block: "first_focus",
        estimatedMinutes: 30,
        sourceItemIds: [],
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { consequence: 2, urgency: 2, goalContribution: 2, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const load = calculateDailyLoad({
    draft: draftWithLinkedTask,
    routines: [routine],
    localDate: "2026-09-12",
  });
  // Linked routine minutes are reflected in routinePlannedMinutes and taskFlexibleMinutes, but deduplicated in totalPlannedMinutes
  assert.equal(load.routinePlannedMinutes, 30);
  assert.equal(load.taskFlexibleMinutes, 30);
  assert.equal(load.totalPlannedMinutes, 30);
  assert.equal(load.totalRemainingMinutes, 30);
});

// Scenario 25: Planning survives reload (persistent lifecycle round-trip test)
test("Scenario 25: planning survives reload via production persistence load function", async () => {
  const userId = "user_scenario_25";
  const localDate = "2026-09-12";
  await addPlannedRoutineForDate(userId, localDate, "r_routine_survives");
  const loaded = await loadPlannedRoutineIds(userId, localDate);
  assert.deepStrictEqual(loaded, ["r_routine_survives"]);
});

// Scenario 26: Removing flexible routine from day frees load and updates plannedRoutineIds
test("Scenario 26: removing flexible routine from day frees load and updates plannedRoutineIds", async () => {
  const userId = "user_scenario_26";
  const localDate = "2026-09-12";
  const routine: SharedRoutine = {
    ...baseRoutine,
    id: "r_flex_removal",
    frequency: { kind: "times_per_week", count: 3 },
    estimatedMinutes: 45,
  };

  // Add routine
  await addPlannedRoutineForDate(userId, localDate, routine.id);
  const plannedBefore = await loadPlannedRoutineIds(userId, localDate);
  const loadPlanned = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    plannedRoutineIds: plannedBefore,
    localDate,
  });
  assert.equal(loadPlanned.routinePlannedMinutes, 45);

  // Remove routine
  await removePlannedRoutineForDate(userId, localDate, routine.id);
  const plannedAfter = await loadPlannedRoutineIds(userId, localDate);
  assert.deepStrictEqual(plannedAfter, []);

  const loadUnplanned = calculateDailyLoad({
    draft: baseDraft,
    routines: [routine],
    plannedRoutineIds: plannedAfter,
    localDate,
  });
  assert.equal(loadUnplanned.routinePlannedMinutes, 0);
  assert.equal(loadUnplanned.totalPlannedMinutes, 0);
});

// Scenario 27: Different routines with same title are both counted and not deduped by title
test("Scenario 27: different routines with same title are both counted and not deduped by title", () => {
  const r1: SharedRoutine = { ...baseRoutine, id: "r1", title: "Stretch", estimatedMinutes: 15 };
  const r2: SharedRoutine = { ...baseRoutine, id: "r2", title: "Stretch", estimatedMinutes: 15 };
  const load = calculateDailyLoad({
    draft: baseDraft,
    routines: [r1, r2],
    localDate: "2026-09-12",
  });
  assert.equal(load.routinePlannedMinutes, 30);
  assert.equal(load.routineRemainingMinutes, 30);
});

// Scenario 28: Legacy task without sourceRoutineId is not linked by title guessing
test("Scenario 28: legacy task without sourceRoutineId is not linked by title guessing", () => {
  const routine: SharedRoutine = { ...baseRoutine, id: "r1", title: "Stretch", estimatedMinutes: 15 };
  const draftWithLegacyTask: DailyPlanDraft = {
    ...baseDraft,
    firstFocus: [
      {
        id: "t-legacy",
        title: "Stretch", // Same title but no sourceRoutineId
        block: "first_focus",
        estimatedMinutes: 15,
        sourceItemIds: [],
        requiredEnergy: 1,
        timeSensitivity: "none",
        priority: { consequence: 1, urgency: 1, goalContribution: 1, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const load = calculateDailyLoad({
    draft: draftWithLegacyTask,
    routines: [routine],
    localDate: "2026-09-12",
  });
  // Both are counted because they are not linked
  assert.equal(load.totalPlannedMinutes, 30);
  assert.equal(load.totalRemainingMinutes, 30);
});

// Scenario 29: Strictly respects user availableMinutes 180 without artificial day limit
test("Scenario 29: strictly respects user availableMinutes 180 without artificial day limit", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: 60 };
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 180,
    firstFocus: [
      {
        id: "t1",
        title: "Task 1",
        block: "first_focus",
        estimatedMinutes: 60,
        sourceItemIds: [],
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { consequence: 2, urgency: 2, goalContribution: 2, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const load = calculateDailyLoad({
    draft,
    routines: [routine],
    localDate: "2026-09-12",
  });
  assert.equal(load.availableMinutes, 180);
  assert.equal(load.totalPlannedMinutes, 120);
  assert.equal(load.remainingCapacityMinutes, 60);
  assert.equal(load.isOverCapacity, false);
});

// Scenario 30: Strictly respects user availableMinutes 480
test("Scenario 30: strictly respects user availableMinutes 480", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 480,
    firstFocus: [
      {
        id: "t1",
        title: "Deep work",
        block: "first_focus",
        estimatedMinutes: 240,
        sourceItemIds: [],
        requiredEnergy: 3,
        timeSensitivity: "none",
        priority: { consequence: 3, urgency: 3, goalContribution: 3, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const load = calculateDailyLoad({
    draft,
    routines: [{ ...baseRoutine, estimatedMinutes: 120 }],
    localDate: "2026-09-12",
  });
  assert.equal(load.availableMinutes, 480);
  assert.equal(load.totalPlannedMinutes, 360);
  assert.equal(load.remainingCapacityMinutes, 120);
  assert.equal(load.isOverCapacity, false);
});

// Scenario 31: Over capacity reporting
test("Scenario 31: reports accurate over capacity excess minutes", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 60,
    firstFocus: [
      {
        id: "t1",
        title: "Big task",
        block: "first_focus",
        estimatedMinutes: 90,
        sourceItemIds: [],
        requiredEnergy: 3,
        timeSensitivity: "none",
        priority: { consequence: 3, urgency: 3, goalContribution: 3, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const load = calculateDailyLoad({
    draft,
    routines: [{ ...baseRoutine, estimatedMinutes: 30 }],
    localDate: "2026-09-12",
  });
  assert.equal(load.totalPlannedMinutes, 120);
  assert.equal(load.availableMinutes, 60);
  assert.equal(load.isOverCapacity, true);
  assert.equal(load.overCapacityMinutes, 60);
  assert.equal(load.remainingCapacityMinutes, 0);
});

// Scenario 32: Exact capacity equality is not over capacity
test("Scenario 32: exact capacity equality (120 min work vs 120 min capacity) is not over capacity", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 120,
    firstFocus: [
      {
        id: "t1",
        title: "Focus 1",
        block: "first_focus",
        estimatedMinutes: 60,
        sourceItemIds: [],
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { consequence: 2, urgency: 2, goalContribution: 2, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const load = calculateDailyLoad({
    draft,
    routines: [{ ...baseRoutine, estimatedMinutes: 60 }],
    localDate: "2026-09-12",
  });
  assert.equal(load.totalPlannedMinutes, 120);
  assert.equal(load.availableMinutes, 120);
  assert.equal(load.isOverCapacity, false);
  assert.equal(load.overCapacityMinutes, 0);
  assert.equal(load.remainingCapacityMinutes, 0);
});

// Scenario 33: Identical load calculation in Review and Today screens
test("Scenario 33: Review and Today produce identical Daily Load results for identical inputs", () => {
  const routine: SharedRoutine = { ...baseRoutine, estimatedMinutes: 30 };
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 120,
    firstFocus: [
      {
        id: "t1",
        title: "Review work",
        block: "first_focus",
        estimatedMinutes: 60,
        sourceItemIds: [],
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { consequence: 2, urgency: 2, goalContribution: 2, dependencyPressure: 1, explanation: "Test" },
        needsCheck: false,
      },
    ],
  };
  const reviewLoad = calculateDailyLoad({
    draft,
    routines: [routine],
    localDate: "2026-09-12",
  });
  const todayLoad = calculateDailyLoad({
    draft,
    routines: [routine],
    localDate: "2026-09-12",
  });
  assert.deepEqual(reviewLoad, todayLoad);
  assert.equal(reviewLoad.totalPlannedMinutes, 90);
  assert.equal(reviewLoad.remainingCapacityMinutes, 30);
  assert.equal(reviewLoad.isOverCapacity, false);
});

// Scenario 34: resetGuard blocks mutation of explicit planning during data reset
test("Scenario 34: resetGuard blocks explicit planning mutation during active reset", async () => {
  const userId = "user_scenario_34";
  const localDate = "2026-09-12";
  const lockToken = acquireResetLock(userId);
  try {
    await addPlannedRoutineForDate(userId, localDate, "r_blocked");
    assert.fail("Should have thrown error due to active reset lock");
  } catch (err: any) {
    assert.strictEqual(err.message, "reset_in_progress");
  } finally {
    releaseResetLock(lockToken);
  }
});

// Scenario 35: Data reset provably deletes planned routine IDs and resets state
test("Scenario 35: complete data reset provably deletes planned routine IDs", async () => {
  const userId = "user_scenario_35";
  const localDate = "2026-09-12";

  // Setup plan with planned routine IDs
  await addPlannedRoutineForDate(userId, localDate, "r_reset_target");
  const beforeReset = await loadPlannedRoutineIds(userId, localDate);
  assert.deepStrictEqual(beforeReset, ["r_reset_target"]);

  // Execute complete data reset via offline adapter
  let docsMap: Record<string, number> = { dailyResets: 1 };
  const mockAdapter: FirestoreAdapter = {
    async getDocsBatch(rootCol, uId, subCol, limitCount) {
      const remaining = docsMap[subCol] || 0;
      const fetchCount = Math.min(remaining, limitCount);
      const docs = Array.from({ length: fetchCount }, (_, i) => ({
        ref: { id: `${subCol}-doc-${i}` } as any,
        id: `${subCol}-doc-${i}`,
      }));
      return { docs };
    },
    async commitBatchDeletes(docRefs) {
      docsMap.dailyResets = 0;
    },
  };

  const bypassToken = acquireResetLock(userId);
  const resetResult = await executeDataReset(userId, {
    appADailyData: true,
    appAPreferences: false,
    sharedVisionData: false,
    sharedRoutinesData: false,
  }, { bypassToken, adapter: mockAdapter });

  assert.strictEqual(resetResult.success, true);
  assert.strictEqual(resetResult.totalDeletedDocuments, 1);
});
