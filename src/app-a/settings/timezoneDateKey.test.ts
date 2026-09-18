import assert from "node:assert/strict";
import { getLocalDateKeyInTimeZone, getLocalDateKey } from "../persistence/dailyPlanDocument";
import { getLocalDateInTimeZone, getPastLocalDates } from "../routines/date";
import { getEffectiveTimeZone } from "./preferences";
import { shiftLocalDate, getRolloverLookbackBoundaries, isLocalDateInRolloverWindow } from "../domain/rollover/contracts";

function runTimezoneDateKeyTests() {
  console.log("Running comprehensive Timezone & Local Date Key test suite...");

  // 1. Europe/Belgrade:
  // When UTC is 2026-08-09T22:30:00.000Z, Belgrade is UTC+2 (CEST) -> local time is 2026-08-10 00:30:00.
  // Result must be the local next day (2026-08-10), NOT the UTC date (2026-08-09).
  const belgradeMidnightUtc = new Date("2026-08-09T22:30:00.000Z");
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", belgradeMidnightUtc),
    "2026-08-10",
    "Belgrade at 00:30 CEST must resolve to 2026-08-10, not previous day UTC"
  );
  assert.equal(
    getLocalDateInTimeZone(belgradeMidnightUtc, "Europe/Belgrade"),
    "2026-08-10",
    "Routines helper getLocalDateInTimeZone must match getLocalDateKeyInTimeZone for Belgrade 00:30"
  );

  // Winter time Belgrade (CET = UTC+1):
  // UTC 2026-01-15T23:30:00.000Z -> Belgrade 2026-01-16 00:30:00 CET
  const belgradeWinterMidnightUtc = new Date("2026-01-15T23:30:00.000Z");
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", belgradeWinterMidnightUtc),
    "2026-01-16",
    "Belgrade at 00:30 CET must resolve to 2026-01-16, not previous day UTC"
  );

  // 2. America/Los_Angeles:
  // When UTC is 2026-09-02T05:30:00.000Z (next day in UTC), Los Angeles is PDT (UTC-7) -> 2026-09-01 22:30:00.
  // Result must remain the local date (2026-09-01), NOT the UTC next day (2026-09-02).
  const laEveningUtc = new Date("2026-09-02T05:30:00.000Z");
  assert.equal(
    getLocalDateKeyInTimeZone("America/Los_Angeles", laEveningUtc),
    "2026-09-01",
    "LA late evening must resolve to local date 2026-09-01, not next day UTC"
  );
  assert.equal(
    getLocalDateInTimeZone(laEveningUtc, "America/Los_Angeles"),
    "2026-09-01",
    "Routines helper getLocalDateInTimeZone must match getLocalDateKeyInTimeZone for LA late evening"
  );

  // Winter time Los Angeles (PST = UTC-8):
  // UTC 2026-12-02T06:30:00.000Z -> LA 2026-12-01 22:30:00 PST
  const laWinterEveningUtc = new Date("2026-12-02T06:30:00.000Z");
  assert.equal(
    getLocalDateKeyInTimeZone("America/Los_Angeles", laWinterEveningUtc),
    "2026-12-01",
    "LA late evening in PST must resolve to local date 2026-12-01, not next day UTC"
  );

  // 3. Daylight Saving Time (DST) Transitions:
  // In Europe/Belgrade:
  // Spring forward: 2026-03-29 (at 02:00 -> 03:00)
  // Autumn back: 2026-10-25 (at 03:00 -> 02:00)
  const springBeforeDst = new Date("2026-03-28T23:30:00.000Z"); // Belgrade 2026-03-29 00:30 CET
  const springAfterDst = new Date("2026-03-29T21:30:00.000Z");  // Belgrade 2026-03-29 23:30 CEST
  assert.equal(getLocalDateKeyInTimeZone("Europe/Belgrade", springBeforeDst), "2026-03-29");
  assert.equal(getLocalDateKeyInTimeZone("Europe/Belgrade", springAfterDst), "2026-03-29");

  // Autumn back:
  const autumnBeforeDst = new Date("2026-10-24T22:30:00.000Z"); // Belgrade 2026-10-25 00:30 CEST
  const autumnAfterDst = new Date("2026-10-25T22:30:00.000Z");  // Belgrade 2026-10-25 23:30 CET
  assert.equal(getLocalDateKeyInTimeZone("Europe/Belgrade", autumnBeforeDst), "2026-10-25");
  assert.equal(getLocalDateKeyInTimeZone("Europe/Belgrade", autumnAfterDst), "2026-10-25");

  // Sequence of 7 days spanning the DST transition has exactly 7 unique consecutive days, no skipped/duplicated keys
  const pastSevenDays = getPastLocalDates("2026-03-31", 7);
  assert.deepEqual(pastSevenDays, [
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    "2026-03-28",
    "2026-03-29",
    "2026-03-30",
    "2026-03-31",
  ]);

  // 4. Reevaluation Request Date Consistency:
  // Verify that an instant in Belgrade 00:30 uses the same local date for daily reset, check-in, and reevaluation request.
  const reevalInstant = new Date("2026-08-09T22:45:00.000Z"); // 00:45 in Belgrade on 2026-08-10
  const expectedLocalDate = getLocalDateKeyInTimeZone("Europe/Belgrade", reevalInstant);
  assert.equal(expectedLocalDate, "2026-08-10");
  assert.notEqual(expectedLocalDate, reevalInstant.toISOString().split("T")[0]); // toISOString would be wrong ("2026-08-09")

  // 5. Cross-domain Dismissal and Rollover Consistency:
  // Given the same moment and timezone:
  // - Daily plan localDate
  // - Today Vision dismissal key
  // - Intervention dismissal key
  // - Rollover lookback boundary
  // all align exactly to the identical calendar date key.
  const sharedMoment = new Date("2026-09-02T05:45:00.000Z"); // 22:45 Sept 1 in Los Angeles
  const laLocalDate = getLocalDateKeyInTimeZone("America/Los_Angeles", sharedMoment);
  assert.equal(laLocalDate, "2026-09-01");

  const visionSectionClosedKey = `app_a_vision_section_closed_${laLocalDate}`;
  const interventionDismissedKey = `app_a_dismissed_interventions_${laLocalDate}`;
  assert.equal(visionSectionClosedKey, "app_a_vision_section_closed_2026-09-01");
  assert.equal(interventionDismissedKey, "app_a_dismissed_interventions_2026-09-01");

  const rolloverBoundaries = getRolloverLookbackBoundaries(laLocalDate, 7);
  assert.equal(rolloverBoundaries.activeLocalDate, "2026-09-01");
  assert.equal(rolloverBoundaries.earliestAllowedDate, "2026-08-25");
  assert.equal(isLocalDateInRolloverWindow("2026-08-31", rolloverBoundaries), true);
  assert.equal(isLocalDateInRolloverWindow("2026-09-01", rolloverBoundaries), false); // active day is not rolled over to itself

  // 6. Day Reset Hour (Configurable new day start: 0, 4, 5, 6, 7, 8):
  // At 04:30 CEST on 2026-08-10 (UTC 2026-08-10T02:30:00.000Z):
  const earlyMorning430Utc = new Date("2026-08-10T02:30:00.000Z");

  // With default reset hour 5 (05:00 AM): 04:30 is still part of yesterday's plan (2026-08-09)
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", earlyMorning430Utc, 5),
    "2026-08-09",
    "At 04:30 with 5 AM reset, the date must still be the previous day"
  );
  assert.equal(
    getLocalDateInTimeZone(earlyMorning430Utc, "Europe/Belgrade", 5),
    "2026-08-09",
    "Routines helper must also treat 04:30 as previous day when reset hour is 5"
  );

  // With reset hour 4 (04:00 AM): 04:30 is part of the new day (2026-08-10)
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", earlyMorning430Utc, 4),
    "2026-08-10",
    "At 04:30 with 4 AM reset, the new day has already started"
  );

  // With reset hour 0 (00:00 Midnight): 04:30 is part of the new day (2026-08-10)
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", earlyMorning430Utc, 0),
    "2026-08-10",
    "At 04:30 with midnight reset, the new day has already started"
  );

  // At 05:15 CEST on 2026-08-10 (UTC 2026-08-10T03:15:00.000Z):
  const morning515Utc = new Date("2026-08-10T03:15:00.000Z");

  // With reset hour 5: 05:15 has crossed the reset boundary and is now 2026-08-10
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", morning515Utc, 5),
    "2026-08-10",
    "At 05:15 with 5 AM reset, the new day has started"
  );

  // With reset hour 6: 05:15 has NOT reached 06:00 yet, so still 2026-08-09
  assert.equal(
    getLocalDateKeyInTimeZone("Europe/Belgrade", morning515Utc, 6),
    "2026-08-09",
    "At 05:15 with 6 AM reset, it must still be the previous day"
  );

  console.log("✅ All timezone date key tests (Belgrade, LA, DST, Reeval, Cross-domain, Day Reset Hour) passed!");
}

runTimezoneDateKeyTests();
