import assert from "node:assert/strict";
import {
  type AppARolloverDecision,
  getRolloverDecisionId,
  isCandidateEligibleWithDecisions,
  resolveEffectiveRolloverDecision,
  resolveEffectiveRolloverDecisions,
} from "./contracts";
import { extractUnfinishedCandidatesFromPlans } from "../../persistence/rolloverRepository";
import type { AppADailyPlanDocument } from "../../persistence/dailyPlanDocument";

console.log("▶ Running Effective Rollover Decision Merge Tests (16 Scenarios)...");

const rootDate = "2026-09-10";
const rootItemId = "task_root_100";
const legacyDate1 = "2026-09-11";
const legacyItemId1 = "rollover_plan_2026-09-10_task_root_100";
const legacyDate2 = "2026-09-12";
const legacyItemId2 = "rollover_plan_2026-09-11_rollover_plan_2026-09-10_task_root_100";

// SCENARIO 1: stariji completed + noviji carried → completed
{
  const olderCompleted: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: rootDate,
    updatedAt: "2026-09-10T12:00:00.000Z",
  };
  const newerCarried: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-11T12:00:00.000Z", // Newer timestamp on non-terminal must NOT override terminal
  };

  const resolved = resolveEffectiveRolloverDecision(olderCompleted, newerCarried);
  assert.equal(resolved.status, "completed", "Terminal completed must defeat newer carried");
  assert.equal(resolved.completedOnLocalDate, rootDate);
  console.log("  ✓ Scenario 1 passed: stariji completed + noviji carried → completed");
}

// SCENARIO 2: noviji carried + stariji completed, obrnut ulazni redosled → completed
{
  const olderCompleted: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: rootDate,
    updatedAt: "2026-09-10T12:00:00.000Z",
  };
  const newerCarried: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-11T12:00:00.000Z",
  };

  const resolved = resolveEffectiveRolloverDecision(newerCarried, olderCompleted);
  assert.equal(resolved.status, "completed", "Reversed input order: terminal completed must defeat newer carried");
  assert.equal(resolved.completedOnLocalDate, rootDate);
  console.log("  ✓ Scenario 2 passed: noviji carried + stariji completed (reverse) → completed");
}

// SCENARIO 3: stariji dismissed + noviji scheduled → dismissed
{
  const olderDismissed: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "dismissed",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };
  const newerScheduled: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "scheduled",
    scheduledLocalDate: "2026-09-20",
    updatedAt: "2026-09-11T12:00:00.000Z",
  };

  const resolved = resolveEffectiveRolloverDecision(olderDismissed, newerScheduled);
  assert.equal(resolved.status, "dismissed", "Terminal dismissed must defeat newer scheduled");
  console.log("  ✓ Scenario 3 passed: stariji dismissed + noviji scheduled → dismissed");
}

// SCENARIO 4: isti scenario obrnutim redosledom → dismissed
{
  const olderDismissed: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "dismissed",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };
  const newerScheduled: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "scheduled",
    scheduledLocalDate: "2026-09-20",
    updatedAt: "2026-09-11T12:00:00.000Z",
  };

  const resolved = resolveEffectiveRolloverDecision(newerScheduled, olderDismissed);
  assert.equal(resolved.status, "dismissed", "Reversed order: terminal dismissed must defeat newer scheduled");
  console.log("  ✓ Scenario 4 passed: noviji scheduled + stariji dismissed (reverse) → dismissed");
}

// SCENARIO 5: completed i dismissed, pouzdano noviji dismissed → dismissed
{
  const olderCompleted: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  const newerDismissed: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "dismissed",
    updatedAt: "2026-09-10T11:00:00.000Z",
  };

  const resolvedForward = resolveEffectiveRolloverDecision(olderCompleted, newerDismissed);
  assert.equal(resolvedForward.status, "dismissed", "Reliably newer dismissed must win over older completed");

  const resolvedReverse = resolveEffectiveRolloverDecision(newerDismissed, olderCompleted);
  assert.equal(resolvedReverse.status, "dismissed", "Reliably newer dismissed must win in reverse order too");
  console.log("  ✓ Scenario 5 passed: completed i dismissed, pouzdano noviji dismissed → dismissed");
}

// SCENARIO 6: completed i dismissed, pouzdano noviji completed → completed
{
  const olderDismissed: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "dismissed",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  const newerCompleted: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: "2026-09-10",
    updatedAt: "2026-09-10T11:00:00.000Z",
  };

  const resolvedForward = resolveEffectiveRolloverDecision(olderDismissed, newerCompleted);
  assert.equal(resolvedForward.status, "completed", "Reliably newer completed must win over older dismissed");

  const resolvedReverse = resolveEffectiveRolloverDecision(newerCompleted, olderDismissed);
  assert.equal(resolvedReverse.status, "completed", "Reliably newer completed must win in reverse order too");
  console.log("  ✓ Scenario 6 passed: completed i dismissed, pouzdano noviji completed → completed");
}

// SCENARIO 7: isti timestamp completed i dismissed → completed
{
  // Rule 4: At equal or unreliable timestamp between completed and dismissed,
  // stable priority 'completed' > 'dismissed' applies because completion represents explicit execution.
  const sameTimeCompleted: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };
  const sameTimeDismissed: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "dismissed",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };

  const resolvedForward = resolveEffectiveRolloverDecision(sameTimeCompleted, sameTimeDismissed);
  assert.equal(resolvedForward.status, "completed", "Equal timestamp: completed must take stable priority over dismissed");

  const resolvedReverse = resolveEffectiveRolloverDecision(sameTimeDismissed, sameTimeCompleted);
  assert.equal(resolvedReverse.status, "completed", "Equal timestamp reverse: completed must take stable priority over dismissed");
  console.log("  ✓ Scenario 7 passed: isti timestamp completed i dismissed → completed");
}

// SCENARIO 8: oba bez timestamp-a → deterministički rezultat
{
  const docA: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    // No updatedAt
  };
  const docB: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "dismissed",
    // No updatedAt
  };

  const res1 = resolveEffectiveRolloverDecision(docA, docB);
  const res2 = resolveEffectiveRolloverDecision(docB, docA);
  assert.equal(res1.status, "completed", "Unreliable timestamps: completed takes priority over dismissed");
  assert.equal(res2.status, "completed", "Reverse order: same deterministic result");
  assert.equal(res1.status, res2.status);
  assert.equal(res1.sourceLocalDate, res2.sourceLocalDate);
  assert.equal(res1.sourcePlanItemId, res2.sourcePlanItemId);
  console.log("  ✓ Scenario 8 passed: oba bez timestamp-a → deterministički rezultat");
}

// SCENARIO 9: dva neterminalna statusa → noviji pouzdan timestamp
{
  const olderCarried: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  const newerScheduled: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "scheduled",
    scheduledLocalDate: "2026-09-18",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };

  const resolvedForward = resolveEffectiveRolloverDecision(olderCarried, newerScheduled);
  assert.equal(resolvedForward.status, "scheduled");
  assert.equal(resolvedForward.scheduledLocalDate, "2026-09-18");

  const resolvedReverse = resolveEffectiveRolloverDecision(newerScheduled, olderCarried);
  assert.equal(resolvedReverse.status, "scheduled");
  assert.equal(resolvedReverse.scheduledLocalDate, "2026-09-18");
  console.log("  ✓ Scenario 9 passed: dva neterminalna statusa → noviji pouzdan timestamp");
}

// SCENARIO 10: dva neterminalna sa istim timestamp-om → kanonski root zapis
{
  const rootCarried: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  const legacyScheduled: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "scheduled",
    scheduledLocalDate: "2026-09-15",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };

  const res1 = resolveEffectiveRolloverDecision(rootCarried, legacyScheduled);
  assert.equal(res1.status, "carried", "Canonical root record must win on equal timestamp tie");
  assert.equal(res1.sourcePlanItemId, rootItemId);

  const res2 = resolveEffectiveRolloverDecision(legacyScheduled, rootCarried);
  assert.equal(res2.status, "carried", "Reverse: canonical root record must win on equal timestamp tie");
  assert.equal(res2.sourcePlanItemId, rootItemId);
  console.log("  ✓ Scenario 10 passed: dva neterminalna sa istim timestamp-om → kanonski root zapis");
}

// SCENARIO 11: isti par prosleđen kao (a,b) i (b,a) → identičan rezultat
{
  const pairA: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "snoozed",
    snoozedUntilLocalDate: "2026-09-15",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  const pairB: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };

  const ab = resolveEffectiveRolloverDecision(pairA, pairB);
  const ba = resolveEffectiveRolloverDecision(pairB, pairA);

  assert.equal(ab.status, ba.status);
  assert.equal(ab.sourceLocalDate, ba.sourceLocalDate);
  assert.equal(ab.sourcePlanItemId, ba.sourcePlanItemId);
  assert.equal(ab.originalPlanDate, ba.originalPlanDate);
  assert.equal(ab.originalPlanItemId, ba.originalPlanItemId);
  assert.equal(ab.snoozedUntilLocalDate, ba.snoozedUntilLocalDate);
  console.log("  ✓ Scenario 11 passed: isti par prosleđen kao (a,b) i (b,a) → identičan rezultat");
}

// SCENARIO 12: najmanje šest permutacija tri zapisa → identičan rezultat
{
  const rec1: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  const rec2: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "scheduled",
    scheduledLocalDate: "2026-09-18",
    updatedAt: "2026-09-11T10:00:00.000Z",
  };
  const rec3: AppARolloverDecision = {
    sourceLocalDate: legacyDate2,
    sourcePlanItemId: legacyItemId2,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: legacyDate2,
    updatedAt: "2026-09-12T10:00:00.000Z",
  };

  const permutations: AppARolloverDecision[][] = [
    [rec1, rec2, rec3],
    [rec1, rec3, rec2],
    [rec2, rec1, rec3],
    [rec2, rec3, rec1],
    [rec3, rec1, rec2],
    [rec3, rec2, rec1],
  ];

  const results = permutations.map((perm) => resolveEffectiveRolloverDecisions(perm));
  const expected = results[0];
  assert.ok(expected);
  assert.equal(expected.status, "completed", "Terminal completed must be the effective result");

  for (let i = 1; i < results.length; i++) {
    const r = results[i];
    assert.ok(r);
    assert.equal(r.status, expected.status, `Permutation ${i} status must match`);
    assert.equal(r.sourcePlanItemId, expected.sourcePlanItemId, `Permutation ${i} sourcePlanItemId must match`);
    assert.equal(r.completedOnLocalDate, expected.completedOnLocalDate, `Permutation ${i} completedOnLocalDate must match`);
  }
  console.log("  ✓ Scenario 12 passed: najmanje šest permutacija tri zapisa → identičan rezultat");
}

// SCENARIO 13: unsupported + neterminalni → kandidat ostaje konzervativno blokiran
{
  const unsupportedDoc: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    isUnsupported: true,
    unsupportedRawStatus: "corrupted_raw_status_abc",
  };
  const carriedDoc: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-11T12:00:00.000Z",
  };

  const resolved = resolveEffectiveRolloverDecision(unsupportedDoc, carriedDoc);
  assert.equal(resolved.isUnsupported, true, "isUnsupported flag must be preserved");
  assert.equal(resolved.unsupportedRawStatus, "corrupted_raw_status_abc");
  assert.notEqual(resolved.status, "dismissed", "Unsupported must NOT be semantically converted to dismissed");

  const canonicalId = getRolloverDecisionId(rootDate, rootItemId);
  const decisionsMap = { [canonicalId]: resolved };
  const eligible = isCandidateEligibleWithDecisions(rootDate, rootItemId, "2026-09-15", decisionsMap);
  assert.equal(eligible, false, "Candidate with unsupported decision must remain conservatively blocked from rollover");
  console.log("  ✓ Scenario 13 passed: unsupported + neterminalni → kandidat ostaje konzervativno blokiran");
}

// SCENARIO 14: unsupported + terminalni → terminalna validna odluka ostaje efektivna, uz sačuvanu dijagnostiku
{
  const unsupportedDoc: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    isUnsupported: true,
    unsupportedRawStatus: "corrupted_raw_status_xyz",
  };
  const completedDoc: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: rootDate,
    updatedAt: "2026-09-10T12:00:00.000Z",
  };

  const resolved = resolveEffectiveRolloverDecision(unsupportedDoc, completedDoc);
  assert.equal(resolved.status, "completed", "Terminal valid decision must remain effective");
  assert.equal(resolved.completedOnLocalDate, rootDate);
  assert.equal(resolved.isUnsupported, true, "Unsupported diagnostics must be retained");
  assert.equal(resolved.unsupportedRawStatus, "corrupted_raw_status_xyz");

  const canonicalId = getRolloverDecisionId(rootDate, rootItemId);
  const eligible = isCandidateEligibleWithDecisions(rootDate, rootItemId, "2026-09-15", { [canonicalId]: resolved });
  assert.equal(eligible, false, "Terminal decision ensures candidate is not resurfaced");
  console.log("  ✓ Scenario 14 passed: unsupported + terminalni → terminalna validna odluka efektivna + dijagnostika sačuvana");
}

function createTestPlanDoc(
  localDate: string,
  items: Array<{ id: string; title: string; block: "first_focus" | "later_today" | "if_capacity_remains"; minutes: number }>,
  completedItemIds: string[] = [],
): AppADailyPlanDocument {
  return {
    schemaVersion: 1,
    localDate,
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: { availableMinutes: 240 },
    plan: {
      classifiedItems: items.map((i) => ({
        id: i.id,
        originalText: i.title,
        kind: "task",
        timeHorizon: "today",
        estimatedMinutes: i.minutes,
        timeSensitivity: "none",
        isAmbiguous: false,
        needsCheck: false,
        priority: { explanation: "Standard task" },
      })),
      firstFocus: items
        .filter((i) => i.block === "first_focus")
        .map((i) => ({
          id: i.id,
          sourceItemIds: [i.id],
          title: i.title,
          block: i.block,
          estimatedMinutes: i.minutes,
          requiredEnergy: 3,
          timeSensitivity: "none",
          priority: { explanation: "First focus" },
          needsCheck: false,
        })),
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: `Plan for ${localDate}`,
      plannedRequiredMinutes: items.reduce((acc, i) => acc + i.minutes, 0),
      plannedOptionalMinutes: 0,
      availableMinutes: 240,
    },
    execution: {
      completedItemIds,
    },
  };
}

// SCENARIO 15: posle reload-a rešeni zadatak se ne pojavljuje ponovo
{
  // Simulate day 1 plan with task, day 2 plan where task was carried, and a completed terminal decision
  const planDay1 = createTestPlanDoc(rootDate, [
    { id: rootItemId, title: "Important Deliverable", block: "first_focus", minutes: 60 },
  ], [rootItemId]);

  const planDay2 = createTestPlanDoc(legacyDate1, [
    { id: legacyItemId1, title: "Important Deliverable", block: "first_focus", minutes: 60 },
  ]);

  // Decisions loaded from repository resolve to terminal completed
  const completedDecision: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: rootDate,
    updatedAt: "2026-09-10T15:00:00.000Z",
  };
  const legacyCarriedDoc: AppARolloverDecision = {
    sourceLocalDate: legacyDate1,
    sourcePlanItemId: legacyItemId1,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-11T09:00:00.000Z",
  };

  const effective = resolveEffectiveRolloverDecision(completedDecision, legacyCarriedDoc);
  const canonicalDocId = getRolloverDecisionId(rootDate, rootItemId);
  const legacyDocId = getRolloverDecisionId(legacyDate1, legacyItemId1);
  const reloadedDecisions: Record<string, AppARolloverDecision> = {
    [canonicalDocId]: effective,
    [legacyDocId]: effective,
  };

  const candidates = extractUnfinishedCandidatesFromPlans(
    [planDay1, planDay2],
    "2026-09-15",
    reloadedDecisions,
  );

  assert.equal(
    candidates.length,
    0,
    "Resolved completed task must NEVER reappear in candidates after reload",
  );
  console.log("  ✓ Scenario 15 passed: posle reload-a rešeni zadatak se ne pojavljuje ponovo");
}

// SCENARIO 16: dva različita korena ostaju nezavisna
{
  const root1Date = "2026-09-08";
  const root1Item = "task_alpha";
  const root2Date = "2026-09-09";
  const root2Item = "task_beta";

  const decisionRoot1: AppARolloverDecision = {
    sourceLocalDate: root1Date,
    sourcePlanItemId: root1Item,
    originalPlanDate: root1Date,
    originalPlanItemId: root1Item,
    status: "completed",
    updatedAt: "2026-09-08T12:00:00.000Z",
  };
  const decisionRoot2: AppARolloverDecision = {
    sourceLocalDate: root2Date,
    sourcePlanItemId: root2Item,
    originalPlanDate: root2Date,
    originalPlanItemId: root2Item,
    status: "carried",
    updatedAt: "2026-09-09T12:00:00.000Z",
  };

  const map: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId(root1Date, root1Item)]: decisionRoot1,
    [getRolloverDecisionId(root2Date, root2Item)]: decisionRoot2,
  };

  const eligible1 = isCandidateEligibleWithDecisions(root1Date, root1Item, "2026-09-15", map);
  const eligible2 = isCandidateEligibleWithDecisions(root2Date, root2Item, "2026-09-15", map);

  assert.equal(eligible1, false, "Root 1 is completed -> ineligible");
  assert.equal(eligible2, false, "Root 2 is carried -> ineligible");

  // If Root 2 had snoozed to today:
  const decisionRoot2Snoozed: AppARolloverDecision = {
    sourceLocalDate: root2Date,
    sourcePlanItemId: root2Item,
    originalPlanDate: root2Date,
    originalPlanItemId: root2Item,
    status: "snoozed",
    snoozedUntilLocalDate: "2026-09-15", // expires today
    updatedAt: "2026-09-09T12:00:00.000Z",
  };
  const map2: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId(root1Date, root1Item)]: decisionRoot1,
    [getRolloverDecisionId(root2Date, root2Item)]: decisionRoot2Snoozed,
  };

  assert.equal(isCandidateEligibleWithDecisions(root1Date, root1Item, "2026-09-15", map2), false, "Root 1 still completed");
  assert.equal(isCandidateEligibleWithDecisions(root2Date, root2Item, "2026-09-15", map2), true, "Root 2 snooze expired -> eligible, independent of Root 1");
  console.log("  ✓ Scenario 16 passed: dva različita korena ostaju nezavisna");
}

console.log("\n🎉 ALL 16 EFFECTIVE DECISION MERGE SCENARIOS PASSED!\n");
