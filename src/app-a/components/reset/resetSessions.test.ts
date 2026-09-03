import assert from "node:assert/strict";
import {
  calculateBoxTiming,
  calculateLongerExhaleTiming,
  calculateDoubleInhaleTiming,
  calculateGuidedRestTiming,
  BALANCED_BOX_PHASES,
  BOX_CYCLE_PRESETS,
  LONGER_EXHALE_PHASES,
  DOUBLE_INHALE_PHASES,
  GUIDED_REST_STAGES,
} from "./resetTimingEngine";
import { RESET_LOCALIZATION } from "./resetLocalization";
import { REST_SOUND_CARRIER_HZ, REST_SOUND_DIFFERENCE_HZ } from "./restSoundSynth";

console.log("Running Reset Sessions & Timing Engine Tests...");

// -------------------------------------------------------------
// 1. Balanced Box (4-4-4-4) Exact Timing Transitions & Cycle Presets
assert.equal(REST_SOUND_CARRIER_HZ, 95);
assert.equal(REST_SOUND_DIFFERENCE_HZ, 4, "guided rest stereo frequencies must remain exactly 4 Hz apart");
// -------------------------------------------------------------
// Total cycle = 16 seconds (16,000ms)
// Presets: 4 cycles (64,000ms), 8 cycles (128,000ms), 12 cycles (192,000ms)

// Preset structure verification
assert.equal(BOX_CYCLE_PRESETS.length, 3);
assert.deepEqual(BOX_CYCLE_PRESETS[0], { cycles: 4, durationMs: 64000, durationSec: 64, formattedTime: "1:04" });
assert.deepEqual(BOX_CYCLE_PRESETS[1], { cycles: 8, durationMs: 128000, durationSec: 128, formattedTime: "2:08" });
assert.deepEqual(BOX_CYCLE_PRESETS[2], { cycles: 12, durationMs: 192000, durationSec: 192, formattedTime: "3:12" });

// 0.0s -> Inhale (Cycle 1)
const box0 = calculateBoxTiming(0, 192000);
assert.equal(box0.phase, "inhale");
assert.equal(box0.phaseIndex, 0);
assert.equal(box0.phaseRemainingMs, 4000);
assert.equal(box0.cycle, 1);
assert.equal(box0.isComplete, false);

// 3.999s -> Inhale (end of phase)
const box3999 = calculateBoxTiming(3999, 192000);
assert.equal(box3999.phase, "inhale");
assert.equal(box3999.phaseRemainingMs, 1);
assert.equal(box3999.isComplete, false);

// 4.0s -> Hold Full
const box4000 = calculateBoxTiming(4000, 192000);
assert.equal(box4000.phase, "hold_full");
assert.equal(box4000.phaseIndex, 1);
assert.equal(box4000.phaseRemainingMs, 4000);
assert.equal(box4000.cycle, 1);
assert.equal(box4000.isComplete, false);

// 8.0s -> Exhale
const box8000 = calculateBoxTiming(8000, 192000);
assert.equal(box8000.phase, "exhale");
assert.equal(box8000.phaseIndex, 2);
assert.equal(box8000.phaseRemainingMs, 4000);
assert.equal(box8000.isComplete, false);

// 12.0s -> Hold Empty
const box12000 = calculateBoxTiming(12000, 192000);
assert.equal(box12000.phase, "hold_empty");
assert.equal(box12000.phaseIndex, 3);
assert.equal(box12000.phaseRemainingMs, 4000);
assert.equal(box12000.isComplete, false);

// 16.0s -> Cycle 2 Inhale
const box16000 = calculateBoxTiming(16000, 192000);
assert.equal(box16000.phase, "inhale");
assert.equal(box16000.phaseIndex, 0);
assert.equal(box16000.cycle, 2);
assert.equal(box16000.isComplete, false);

// -------------------------------------------------------------
// 1b. Preset Duration & Exact Final Boundary Tests
// -------------------------------------------------------------

// Preset 1: 4 cycles = 64,000ms (1:04)
const box4_beforeEnd = calculateBoxTiming(63999, 64000);
assert.equal(box4_beforeEnd.phase, "hold_empty");
assert.equal(box4_beforeEnd.phaseIndex, 3);
assert.equal(box4_beforeEnd.phaseRemainingMs, 1);
assert.equal(box4_beforeEnd.cycle, 4);
assert.equal(box4_beforeEnd.isComplete, false);

const box4_atEnd = calculateBoxTiming(64000, 64000);
assert.equal(box4_atEnd.phase, "hold_empty");
assert.equal(box4_atEnd.phaseIndex, 3);
assert.equal(box4_atEnd.phaseRemainingMs, 0);
assert.equal(box4_atEnd.cycle, 4);
assert.equal(box4_atEnd.isComplete, true);

// Preset 2: 8 cycles = 128,000ms (2:08)
const box8_beforeEnd = calculateBoxTiming(127999, 128000);
assert.equal(box8_beforeEnd.phase, "hold_empty");
assert.equal(box8_beforeEnd.phaseIndex, 3);
assert.equal(box8_beforeEnd.phaseRemainingMs, 1);
assert.equal(box8_beforeEnd.cycle, 8);
assert.equal(box8_beforeEnd.isComplete, false);

const box8_atEnd = calculateBoxTiming(128000, 128000);
assert.equal(box8_atEnd.phase, "hold_empty");
assert.equal(box8_atEnd.phaseIndex, 3);
assert.equal(box8_atEnd.phaseRemainingMs, 0);
assert.equal(box8_atEnd.cycle, 8);
assert.equal(box8_atEnd.isComplete, true);

// Preset 3: 12 cycles = 192,000ms (3:12) (Default)
const box12_beforeEnd = calculateBoxTiming(191999, 192000);
assert.equal(box12_beforeEnd.phase, "hold_empty");
assert.equal(box12_beforeEnd.phaseIndex, 3);
assert.equal(box12_beforeEnd.phaseRemainingMs, 1);
assert.equal(box12_beforeEnd.cycle, 12);
assert.equal(box12_beforeEnd.isComplete, false);

const box12_atEnd = calculateBoxTiming(192000, 192000);
assert.equal(box12_atEnd.phase, "hold_empty");
assert.equal(box12_atEnd.phaseIndex, 3);
assert.equal(box12_atEnd.phaseRemainingMs, 0);
assert.equal(box12_atEnd.cycle, 12);
assert.equal(box12_atEnd.isComplete, true);

// Default parameter test (should default to 192000ms = 12 cycles)
const boxDefault = calculateBoxTiming(192000);
assert.equal(boxDefault.cycle, 12);
assert.equal(boxDefault.isComplete, true);

// Over-elapsed time clamp
const boxOver = calculateBoxTiming(200000, 192000);
assert.equal(boxOver.isComplete, true);
assert.equal(boxOver.phaseRemainingMs, 0);
assert.equal(boxOver.cycle, 12);

// No mid-phase completion verification: ensure neither 180s nor partial cycles trigger completion unless exact boundary reached
const boxMidPhase = calculateBoxTiming(180000, 192000);
assert.equal(boxMidPhase.isComplete, false);
assert.equal(boxMidPhase.cycle, 12);
assert.equal(boxMidPhase.phase, "hold_full"); // 180s = 11*16s (176s) + 4s -> start of hold_full in cycle 12
assert.equal(boxMidPhase.phaseElapsedMs, 0);
assert.equal(boxMidPhase.phaseRemainingMs, 4000);

// -------------------------------------------------------------
// 2. Gentle Longer Exhale (4-6) Exact Timing Transitions
// -------------------------------------------------------------
// Total cycle = 10 seconds (10,000ms)
// 0.0s -> Inhale
const exh0 = calculateLongerExhaleTiming(0, 60000);
assert.equal(exh0.phase, "inhale");
assert.equal(exh0.phaseIndex, 0);
assert.equal(exh0.phaseRemainingMs, 4000);
assert.equal(exh0.cycle, 1);

// 3.999s -> Inhale
const exh3999 = calculateLongerExhaleTiming(3999, 60000);
assert.equal(exh3999.phase, "inhale");
assert.equal(exh3999.phaseRemainingMs, 1);

// 4.0s -> Exhale (6s duration)
const exh4000 = calculateLongerExhaleTiming(4000, 60000);
assert.equal(exh4000.phase, "exhale");
assert.equal(exh4000.phaseIndex, 1);
assert.equal(exh4000.phaseDurationMs, 6000);
assert.equal(exh4000.phaseRemainingMs, 6000);

// 9.999s -> Exhale end
const exh9999 = calculateLongerExhaleTiming(9999, 60000);
assert.equal(exh9999.phase, "exhale");
assert.equal(exh9999.phaseRemainingMs, 1);

// 10.0s -> Cycle 2 Inhale
const exh10000 = calculateLongerExhaleTiming(10000, 60000);
assert.equal(exh10000.phase, "inhale");
assert.equal(exh10000.cycle, 2);

// Completion at 60s
const exhComplete = calculateLongerExhaleTiming(60000, 60000);
assert.equal(exhComplete.isComplete, true);
assert.equal(exhComplete.phaseRemainingMs, 0);

// -------------------------------------------------------------
// 3. Short Double-Inhale Reset (3s - 1.5s - 5.5s = 10s cycle)
// -------------------------------------------------------------
// Target = 3 cycles (30,000ms)
// 0.0s -> first_inhale
const dbl0 = calculateDoubleInhaleTiming(0, 3);
assert.equal(dbl0.phase, "first_inhale");
assert.equal(dbl0.phaseDurationMs, 3000);
assert.equal(dbl0.cycle, 1);

// 3.0s -> topup_inhale
const dbl3000 = calculateDoubleInhaleTiming(3000, 3);
assert.equal(dbl3000.phase, "topup_inhale");
assert.equal(dbl3000.phaseDurationMs, 1500);
assert.equal(dbl3000.phaseRemainingMs, 1500);

// 4.5s -> exhale
const dbl4500 = calculateDoubleInhaleTiming(4500, 3);
assert.equal(dbl4500.phase, "exhale");
assert.equal(dbl4500.phaseDurationMs, 5500);
assert.equal(dbl4500.phaseRemainingMs, 5500);

// 10.0s -> cycle 2 first_inhale
const dbl10000 = calculateDoubleInhaleTiming(10000, 3);
assert.equal(dbl10000.phase, "first_inhale");
assert.equal(dbl10000.cycle, 2);

// 30.0s -> Complete
const dblComplete = calculateDoubleInhaleTiming(30000, 3);
assert.equal(dblComplete.isComplete, true);

// -------------------------------------------------------------
// 4. Guided Deep Rest (10 min = 600,000ms)
// -------------------------------------------------------------
// 0 to 90s: Settle
const rst0 = calculateGuidedRestTiming(0);
assert.equal(rst0.stage, "settle");
assert.equal(rst0.stageDurationMs, 90000);
assert.equal(rst0.stageRemainingMs, 90000);
assert.equal(rst0.isComplete, false);

// 90s to 300s: Body Attention
const rst90000 = calculateGuidedRestTiming(90000);
assert.equal(rst90000.stage, "body_attention");
assert.equal(rst90000.stageIndex, 1);
assert.equal(rst90000.stageDurationMs, 210000);

// 300s to 540s: Quiet Rest
const rst300000 = calculateGuidedRestTiming(300000);
assert.equal(rst300000.stage, "quiet_rest");
assert.equal(rst300000.stageIndex, 2);
assert.equal(rst300000.stageDurationMs, 240000);

// 540s to 600s: Gradual Return
const rst540000 = calculateGuidedRestTiming(540000);
assert.equal(rst540000.stage, "gradual_return");
assert.equal(rst540000.stageIndex, 3);
assert.equal(rst540000.stageDurationMs, 60000);

// 600s: Complete
const rstComplete = calculateGuidedRestTiming(600000);
assert.equal(rstComplete.isComplete, true);
assert.equal(rstComplete.stageRemainingMs, 0);

// -------------------------------------------------------------
// 5. Monotonic Pause/Resume & Tab Throttling Recovery Simulation
// -------------------------------------------------------------
function simulateMonotonicSession(
  actions: Array<{ type: "run" | "pause" | "resume"; durationMs: number }>,
  totalTargetMs: number,
) {
  let accumulatedMs = 0;
  let running = false;
  let completed = false;

  for (const action of actions) {
    if (action.type === "run") {
      running = true;
      accumulatedMs += action.durationMs;
    } else if (action.type === "pause") {
      running = false;
    } else if (action.type === "resume") {
      running = true;
      accumulatedMs += action.durationMs;
    }

    if (accumulatedMs >= totalTargetMs) {
      completed = true;
      accumulatedMs = totalTargetMs;
      running = false;
      break;
    }
  }

  return { accumulatedMs, running, completed };
}

// Case 5a: Run 5s, pause for 10s (elapsed does not advance while paused), resume for 11s -> 16s total (1 full box cycle)
const sim1 = simulateMonotonicSession(
  [
    { type: "run", durationMs: 5000 },
    { type: "pause", durationMs: 10000 },
    { type: "resume", durationMs: 11000 },
  ],
  180000,
);
assert.equal(sim1.accumulatedMs, 16000);
assert.equal(sim1.completed, false);
const postPauseTiming = calculateBoxTiming(sim1.accumulatedMs, 180000);
assert.equal(postPauseTiming.cycle, 2);
assert.equal(postPauseTiming.phase, "inhale");

// Case 5b: Tab throttling recovery (e.g. background tab skipped 25s in a single frame tick)
const simDrift = calculateBoxTiming(35000, 180000);
// 35s = 2 full 16s cycles (32s) + 3s into cycle 3
assert.equal(simDrift.cycle, 3);
assert.equal(simDrift.phase, "inhale");
assert.equal(simDrift.phaseElapsedMs, 3000);
assert.equal(simDrift.phaseRemainingMs, 1000);

// -------------------------------------------------------------
// 6. Complete SR/EN/TR Localization Coverage
// -------------------------------------------------------------
const languages = ["en", "sr", "tr"] as const;
for (const lang of languages) {
  const l = RESET_LOCALIZATION[lang];
  assert.ok(l, `Missing localization for ${lang}`);
  assert.ok(l.common.sectionTitle.length > 0);
  assert.ok(l.common.safetyBannerTitle.length > 0);
  assert.ok(l.common.safetyBannerText.length > 0);
  assert.ok(l.common.start.length > 0);
  assert.ok(l.common.pause.length > 0);
  assert.ok(l.common.resume.length > 0);
  assert.ok(l.common.restart.length > 0);
  assert.ok(l.common.stop.length > 0);
  assert.ok(l.common.completedTitle.length > 0);
  assert.ok(l.common.presetBox4.length > 0, `Missing presetBox4 for ${lang}`);
  assert.ok(l.common.presetBox8.length > 0, `Missing presetBox8 for ${lang}`);
  assert.ok(l.common.presetBox12.length > 0, `Missing presetBox12 for ${lang}`);

  // Experience names
  assert.ok(l.balancedBox.name.length > 0);
  assert.ok(l.longerExhale.name.length > 0);
  assert.ok(l.doubleInhale.name.length > 0);
  assert.ok(l.guidedRest.name.length > 0);

  // Safety prohibition checks (no forbidden claims)
  const allText = JSON.stringify(l).toLowerCase();
  assert.ok(!allText.includes("huberman"), "Must not mention Huberman in copy");
  assert.ok(!allText.includes("nsdr"), "Must not use NSDR in copy");
  assert.ok(!allText.includes("yoga nidra"), "Must not use yoga nidra in copy");
  assert.ok(!allText.includes("dopamine"), "Must not claim dopamine changes");
  assert.ok(!allText.includes("cortisol"), "Must not claim cortisol changes");
  assert.ok(!allText.includes("vagus"), "Must not claim vagus nerve activation");
  assert.ok(!allText.includes("cure"), "Must not claim medical cure");
  assert.ok(!allText.includes("therapy"), "Must not claim therapy");
}

// -------------------------------------------------------------
// 7. Immutability of Constants
// -------------------------------------------------------------
assert.throws(() => {
  // @ts-expect-error test immutability
  BALANCED_BOX_PHASES[0] = { id: "test", durationSec: 10 };
});

assert.throws(() => {
  // @ts-expect-error test immutability
  BOX_CYCLE_PRESETS[0] = { cycles: 2, durationMs: 32000, durationSec: 32, formattedTime: "0:32" };
});

console.log("All Reset Sessions & Timing Engine tests passed successfully! 🎉");
