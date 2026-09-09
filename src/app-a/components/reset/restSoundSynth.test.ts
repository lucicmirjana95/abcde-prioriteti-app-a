import assert from "node:assert/strict";
import {
  REST_SOUND_CARRIER_HZ,
  REST_SOUND_DIFFERENCE_HZ,
  restSoundSynth,
} from "./restSoundSynth";
import { RESET_LOCALIZATION } from "./resetLocalization";

console.log("Running Guided Rest Audio Synthesizer Tests...");

// -------------------------------------------------------------
// 1. Audio Configuration and Mathematical Carrier Separation
// -------------------------------------------------------------
assert.equal(REST_SOUND_CARRIER_HZ, 95, "Left carrier must be exactly 95 Hz");
assert.equal(REST_SOUND_DIFFERENCE_HZ, 4, "Frequency difference must be exactly 4 Hz");
const rightCarrier = REST_SOUND_CARRIER_HZ + REST_SOUND_DIFFERENCE_HZ;
assert.equal(rightCarrier, 99, "Right carrier must be exactly 99 Hz");
assert.equal(rightCarrier - REST_SOUND_CARRIER_HZ, 4, "Difference between carriers must equal 4 Hz");

// -------------------------------------------------------------
// 2. Localization Verification for Audio Controls (en, sr, tr)
// -------------------------------------------------------------
const languages = ["en", "sr", "tr"] as const;
for (const lang of languages) {
  const loc = RESET_LOCALIZATION[lang];
  assert.ok(loc, `Missing localization for ${lang}`);
  assert.ok(loc.guidedRestAudio, `Missing guidedRestAudio for ${lang}`);

  const audio = loc.guidedRestAudio;
  assert.ok(audio.title, `Missing title for ${lang}`);
  assert.ok(audio.soundOn, `Missing soundOn for ${lang}`);
  assert.ok(audio.soundOff, `Missing soundOff for ${lang}`);
}
console.log("✓ Audio configuration and localization verified.");

// -------------------------------------------------------------
// 3. restSoundSynth Singleton API Surface
// -------------------------------------------------------------
assert.equal(typeof restSoundSynth.start, "function", "start must be a function");
assert.equal(typeof restSoundSynth.stop, "function", "stop must be a function");
assert.equal(typeof restSoundSynth.cleanup, "function", "cleanup must be a function");

// In Node environment without window, start() must resolve to 'unsupported' gracefully
async function testEnvironmentFallbacks() {
  const result = await restSoundSynth.start();
  assert.equal(result, "unsupported", "start() must return 'unsupported' outside browser window");

  restSoundSynth.stop();
  restSoundSynth.cleanup();
  console.log("✓ Environment fallback verified.");
}

testEnvironmentFallbacks()
  .then(() => {
    console.log("All Guided Rest Audio Synthesizer Tests Passed Deterministically!");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
