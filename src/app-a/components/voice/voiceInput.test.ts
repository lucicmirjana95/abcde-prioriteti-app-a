import assert from "node:assert/strict";
import { appendVoiceTranscript, SPEECH_LANGUAGE, VOICE_INPUT_COPY, voiceErrorMessageKey } from "./voiceInput";

assert.equal(appendVoiceTranscript("Existing", " new words ", 100), "Existing new words");
assert.equal(appendVoiceTranscript("Existing ", "new words", 100), "Existing new words");
assert.equal(appendVoiceTranscript("Keep", "   ", 100), "Keep");
assert.equal(appendVoiceTranscript("12345", "67890", 8), "12345 67");
assert.deepEqual(SPEECH_LANGUAGE, { en: "en-US", sr: "sr-RS", tr: "tr-TR" });
assert.equal(voiceErrorMessageKey("not-allowed"), "denied");
assert.equal(voiceErrorMessageKey("service-not-allowed"), "denied");
assert.equal(voiceErrorMessageKey("no-speech"), "noSpeech");
assert.equal(voiceErrorMessageKey("network"), "error");
for (const language of ["en", "sr", "tr"] as const) {
  const copy = VOICE_INPUT_COPY[language];
  for (const value of Object.values(copy)) assert.ok(value.trim().length > 0);
}

console.log("Voice input tests passed.");
