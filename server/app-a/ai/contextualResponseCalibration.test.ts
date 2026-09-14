import assert from "node:assert";
import { buildContextualResponseCalibrationPrompt } from "./contextualResponseCalibration";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

const policy = buildContextualResponseCalibrationPrompt();

runTest("1. recognizes thematic salience as a contextual signal", () => {
  assert.ok(
    policy.includes("THEMATIC SALIENCE & TOPIC ATTENTION") &&
    policy.includes("Identify salient themes that occupy substantial attention in the user's input"),
    "Policy must recognize thematic salience as a signal"
  );
});

runTest("2. states that repetition does not automatically equal priority", () => {
  assert.ok(
    policy.includes("Repetition alone does not equal urgency or criticality") &&
    policy.includes("Never automatically place the most frequently mentioned theme into \"first_focus\""),
    "Policy must establish that repetition does not equal priority"
  );
});

runTest("3. forbids assuming reading is entertainment or non-essential without evidence", () => {
  assert.ok(
    policy.includes("never assume reading, hobbies, or personal projects are purely \"entertainment\"") ||
    policy.includes("NEVER assume an activity's purpose without evidence"),
    "Policy must forbid assuming activity purpose/entertainment without evidence"
  );
});

runTest("4. forbids inventing user motives and goals", () => {
  assert.ok(
    policy.includes("User goals, motives, internal reasons, or why an activity matters to them"),
    "Policy must explicitly forbid inventing user goals or motives"
  );
});

runTest("5. forbids inferring book content or difficulty from titles", () => {
  assert.ok(
    policy.includes("Exact book contents, chapter difficulties, or reading requirements solely from titles"),
    "Policy must forbid inferring book content from titles"
  );
});

runTest("6. distinguishes fact, inference, hypothesis, unknown, and likely incorrect", () => {
  assert.ok(policy.includes("Tier A (User-Stated Fact)"), "Must include Tier A");
  assert.ok(policy.includes("Tier B (Supported Inference)"), "Must include Tier B");
  assert.ok(policy.includes("Tier C (Tentative Hypothesis)"), "Must include Tier C");
  assert.ok(policy.includes("Tier D (Unknown)"), "Must include Tier D");
  assert.ok(policy.includes("Tier E (Likely Incorrect Claim)"), "Must include Tier E");
});

runTest("7. requires uncertainty qualification in language", () => {
  assert.ok(
    policy.includes('"You mentioned..."') &&
    policy.includes('"This suggests..."') &&
    policy.includes('"It is possible that..."') &&
    policy.includes('"There is not enough information to conclude..."'),
    "Policy must specify linguistic uncertainty qualifications"
  );
});

runTest("8. permits gentle correction of likely incorrect claims", () => {
  assert.ok(
    policy.includes("Gently note the discrepancy with supportive, non-condescending wording") &&
    policy.includes("suggest a safer or more accurate alternative"),
    "Policy must allow gentle correction with alternatives"
  );
});

runTest("9. contains action/result communication guidance", () => {
  assert.ok(
    policy.includes("Action / Result Signal") &&
    policy.includes("Lead directly with the decision or next step"),
    "Policy must guide action/result communication"
  );
});

runTest("10. contains analysis/clarity communication guidance", () => {
  assert.ok(
    policy.includes("Analysis / Clarity Signal") &&
    policy.includes("Provide structured rationale, acknowledge trade-offs"),
    "Policy must guide analysis/clarity communication"
  );
});

runTest("11. contains support/context communication guidance", () => {
  assert.ok(
    policy.includes("Support / Context Signal") &&
    policy.includes("Sincerely and briefly validate the situation"),
    "Policy must guide support/context communication"
  );
});

runTest("12. supports mixed communication modes", () => {
  assert.ok(
    policy.includes("Handling Mixed Signals") &&
    policy.includes("Sequence the response to address the most prominent immediate need first"),
    "Policy must support mixed communication modes"
  );
});

runTest("13. provides a neutral low-confidence fallback", () => {
  assert.ok(
    policy.includes("Low-Confidence Fallback") &&
    policy.includes("balanced neutral style"),
    "Policy must provide a neutral low-confidence fallback"
  );
});

runTest("14. forbids personality classification and profiling", () => {
  assert.ok(
    policy.includes("NOT a personality classification or profile") &&
    policy.includes("Never output, score, or persist personality types"),
    "Policy must forbid personality classification"
  );
});

runTest("15. forbids user-facing color labels and taxonomy tags", () => {
  assert.ok(
    policy.includes("Do NOT expose color names, letter codes, or taxonomy labels") &&
    policy.includes("Never create separate labeled sections or mention communication modes"),
    "Policy must forbid user-facing color labels and taxonomy"
  );
});

runTest("16. forbids persistence and schema fields for communication styles", () => {
  assert.ok(
    policy.includes("Do not add communication fields to the JSON schema or database") &&
    policy.includes("No Profiling or Persistence"),
    "Policy must forbid persistence and schema fields"
  );
});

runTest("17. prevents mirroring panic, hostility, or unsafe urgency", () => {
  assert.ok(
    policy.includes("STRICTLY FORBIDDEN from mirroring or amplifying: panic, hostility, impulsivity"),
    "Policy must prevent mirroring toxic/panicked emotions"
  );
});

runTest("18. keeps priority and capacity independent from communication style", () => {
  assert.ok(
    policy.includes("Independence of Priority and Capacity") &&
    policy.includes("It MUST NEVER alter: actual item priority, deadlines, consequences, capacity limits"),
    "Policy must keep priority and capacity independent from communication style"
  );
});

runTest("19. retains the first_focus maximum of 3 items", () => {
  assert.ok(
    policy.includes('maximum of 3 "first_focus" items'),
    "Policy must retain first_focus max of 3"
  );
});

runTest("20. retains availableMinutes capacity constraints", () => {
  assert.ok(
    policy.includes("available time capacity") &&
    policy.includes("capacity limits"),
    "Policy must retain available time constraints"
  );
});

runTest("21. retains the 1–3 material clarification-question limit", () => {
  assert.ok(
    policy.includes("strictly between 1 and 3 in the initial phase (and 0 in the resolve phase)") &&
    policy.includes("every question must be materially necessary"),
    "Policy must retain clarification question limits"
  );
});

runTest("22. preserves anti-medical and non-diagnostic boundaries", () => {
  assert.ok(
    policy.includes("non-clinical boundaries") &&
    policy.includes("medical diagnoses, emotional disorders, or clinical states"),
    "Policy must preserve non-clinical and anti-medical boundaries"
  );
});

console.log("\nAll ContextualResponseCalibration policy tests passed! 🎉");
