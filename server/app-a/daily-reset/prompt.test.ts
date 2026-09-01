import assert from "node:assert";
import { buildDailyResetPrompt } from "./prompt";

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

const initialInput = {
  brainDump: "I need to review the report and prepare for team sync",
  language: "en" as const,
  availableMinutes: 120,
};

const resolveInput = {
  brainDump: "I need to review the report and prepare for team sync",
  language: "en" as const,
  availableMinutes: 120,
  clarificationAnswers: [
    { questionId: "q1", answer: "The report is due at 3pm" },
  ],
};

runTest("initial prompt specifies clarification_needed requires 1–3 questions", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes('questions.length is 1–3') ||
    prompt.includes('between 1 and 3 questions'),
    "Prompt must specify that clarification_needed requires 1–3 questions"
  );
});

runTest("initial prompt explicitly forbids an empty questions array when clarification_needed", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes('questions: [] is STRICTLY FORBIDDEN') ||
    prompt.includes('MUST NOT be an empty array'),
    "Prompt must explicitly forbid empty questions array for clarification_needed"
  );
  assert.ok(
    prompt.includes('NEVER return "clarification_needed" with zero questions') ||
    prompt.includes('NEVER return phase: "clarification_needed" with zero questions'),
    "Prompt must forbid returning clarification_needed with zero questions"
  );
});

runTest("initial prompt specifies zero questions requires plan_ready", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes('If zero material questions are needed:\n   - phase MUST be "plan_ready"') ||
    prompt.includes('If zero material questions are needed'),
    "Prompt must state that zero questions requires plan_ready"
  );
  assert.ok(
    prompt.includes('If the intended clarification questions list is empty or zero questions are needed, you MUST choose State B (phase: "plan_ready")'),
    "Prompt must guide to State B plan_ready when questions list is empty"
  );
});

runTest("initial prompt specifies clarification_needed forbids a draft", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes('"draft" MUST be omitted') ||
    prompt.includes('"draft" MUST be absent / omitted'),
    "Prompt must forbid a draft during clarification_needed"
  );
});

runTest("initial prompt specifies plan_ready requires a complete draft", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes('a complete "draft" MUST be returned') ||
    prompt.includes('"draft" MUST be complete'),
    "Prompt must require a complete draft when plan_ready"
  );
});

runTest("resolution prompt forbids additional questions and enforces plan_ready with complete draft", () => {
  const prompt = buildDailyResetPrompt(resolveInput);
  assert.ok(
    prompt.includes('CLARIFICATION PHASE (RESOLUTION)'),
    "Prompt must denote resolution phase"
  );
  assert.ok(
    prompt.includes('NEVER ask another clarification question. Additional questions are strictly forbidden in this phase.'),
    "Prompt must forbid additional clarification questions in resolution phase"
  );
  assert.ok(
    prompt.includes('You MUST return ONLY a final plan (phase: "plan_ready") with a complete draft.'),
    "Prompt must require final plan_ready with complete draft in resolution phase"
  );
});

runTest("prompt contains all five internal ABCDE concepts", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(prompt.includes("A (Consequential & Time-Relevant)"), "Prompt must define concept A");
  assert.ok(prompt.includes("B (Important but Less Immediately Consequential)"), "Prompt must define concept B");
  assert.ok(prompt.includes("C (Beneficial or Desirable)"), "Prompt must define concept C");
  assert.ok(prompt.includes("D (Delegate, Wait, or Coordinate)"), "Prompt must define concept D");
  assert.ok(prompt.includes("E (Eliminate, Archive, or No-Action)"), "Prompt must define concept E");
});

runTest("prompt forbids visible ABCDE labels and schema additions", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes("ABCDE is strictly an internal reasoning aid, NEVER a visible taxonomy"),
    "Prompt must declare ABCDE internal only"
  );
  assert.ok(
    prompt.includes("NEVER output or mention A, B, C, D, or E letter labels or ranks"),
    "Prompt must forbid outputting ABCDE labels"
  );
  assert.ok(
    prompt.includes('NEVER add an "abcde", "letter", "rank", or similar field to the JSON response or schema'),
    "Prompt must forbid adding ABCDE schema fields"
  );
  assert.ok(
    prompt.includes("Do not create or expose an unexplained composite priority score"),
    "Prompt must forbid composite score"
  );
});

runTest("prompt retains first_focus cap and available time constraints", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes('first_focus remains strictly capped at a maximum of 3 items') ||
    prompt.includes('"first_focus": contains at most 3 items'),
    "Prompt must retain first_focus cap"
  );
  assert.ok(
    prompt.includes("the sum of first_focus plus later_today durations must remain within availableMinutes") ||
    prompt.includes('"first_focus" plus "later_today" must not exceed availableMinutes'),
    "Prompt must retain availableMinutes constraint"
  );
});

runTest("prompt protects health, rest, caregiving, safety, and accessibility needs", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes("NEVER classify rest, hydration, meals, medication reminders, health, safety, caregiving, animal care, or accessibility needs as disposable merely because they appear unproductive") ||
    prompt.includes("NEVER classify rest, hydration, meals, medication reminders, health, safety, caregiving"),
    "Prompt must protect health, safety, caregiving, animal care and accessibility needs"
  );
  assert.ok(
    prompt.includes("NEVER infer medical urgency or provide medical advice"),
    "Prompt must forbid medical urgency or advice"
  );
});


runTest("prompt handles waiting-for items appropriately and preserves all items", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes("Do not present waiting-for items as immediately executable tasks unless the user has a concrete follow-up action due today") ||
    prompt.includes("Waiting-for items must normally be deferred"),
    "Prompt must appropriately handle waiting-for items"
  );
  assert.ok(
    prompt.includes("Preserve every meaningful user-provided item") &&
    prompt.includes("Never silently delete them"),
    "Prompt must mandate preservation of items"
  );
});

runTest("prompt treats energy and pleasantness as constraints rather than judgments", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  assert.ok(
    prompt.includes("Treat energy and pleasantness as planning constraints, not judgments"),
    "Prompt must treat energy as constraint"
  );
  assert.ok(
    prompt.includes("When energy is low, a consequential task should be broken down into a smaller executable step") &&
    prompt.includes("Low energy must never erase a genuinely critical task"),
    "Prompt must handle low/high energy safely"
  );
});

runTest("prompt includes Contextual Response Calibration policy exactly once", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  const occurrences = prompt.split("--- CONTEXTUAL RESPONSE CALIBRATION & EVIDENCE POLICY ---").length - 1;
  assert.strictEqual(occurrences, 1, "Contextual Response Calibration policy must be included exactly once");
  assert.ok(
    prompt.includes("PART 1 — THEMATIC SALIENCE & TOPIC ATTENTION") &&
    prompt.includes("PART 2 — EVIDENCE & ANTI-HALLUCINATION POLICY") &&
    prompt.includes("PART 3 — CONTEXTUAL RESPONSE CALIBRATION"),
    "Daily reset prompt must contain all three parts of the Contextual Response Calibration policy"
  );
});

runTest("prompt includes shared Leverage Filter policy exactly once", () => {
  const prompt = buildDailyResetPrompt(initialInput);
  const occurrences = prompt.split("--- SHARED LEVERAGE FILTER & MANDATORY DECISION ORDER POLICY ---").length - 1;
  assert.strictEqual(occurrences, 1, "Leverage Filter policy must be included exactly once");
  assert.ok(
    prompt.includes("MANDATORY DECISION ORDER") &&
    prompt.includes("EVIDENCE REQUIREMENT FOR LEVERAGE CONCLUSIONS") &&
    prompt.includes("PROTECTED AREAS") &&
    prompt.includes("AUTHORITATIVE CLARIFICATION ANSWER RULES") &&
    prompt.includes("SAFETY SIGNALS & DISCRIMINATION"),
    "Daily reset prompt must contain all key sections of the Leverage Filter policy"
  );
});

runTest("resolution prompt embeds question ID, original question, question context, and exact answer", () => {
  const questions = [
    {
      id: "q_cook",
      question: "How long does the cooking take and is there a specific deadline?",
      context: "Cooking for wife mentioned in brain dump",
      relatedItemIds: [],
      materialImpact: "duration" as const,
    },
    {
      id: "q_dog",
      question: "How much time is needed for the dogs today?",
      context: "Care for nine dogs mentioned in brain dump",
      relatedItemIds: [],
      materialImpact: "duration" as const,
    },
  ];

  const resolveSubmission = {
    brainDump: "tiredness, desire to start sport, book writing with unresolved blocker, care for nine dogs, cooking for wife, time with wife",
    language: "en" as const,
    availableMinutes: 480,
    clarificationAnswers: [
      { questionId: "q_cook", answer: "30 minutes, must be finished by 14:00" },
      { questionId: "q_dog", answer: "45 minutes total" },
    ],
  };

  const prompt = buildDailyResetPrompt(resolveSubmission, questions);
  
  assert.ok(prompt.includes("[QUESTION ID: q_cook]"), "Prompt must include question ID q_cook");
  assert.ok(prompt.includes("Original Question: How long does the cooking take and is there a specific deadline?"), "Prompt must include question text");
  assert.ok(prompt.includes("Question Context: Cooking for wife mentioned in brain dump"), "Prompt must include question context");
  assert.ok(prompt.includes("Material Impact: duration"), "Prompt must include material impact");
  assert.ok(prompt.includes("Exact User Answer: 30 minutes, must be finished by 14:00"), "Prompt must include exact answer");

  assert.ok(prompt.includes("[QUESTION ID: q_dog]"), "Prompt must include question ID q_dog");
  assert.ok(prompt.includes("Exact User Answer: 45 minutes total"), "Prompt must include dog care exact answer");

  assert.ok(prompt.includes("AUTHORITATIVE CLARIFICATION RULES:"), "Prompt must include authoritative rules");
  assert.ok(prompt.includes("Explicit duration must be preserved: If the user answered with a specific duration"), "Prompt must mandate duration preservation");
  assert.ok(prompt.includes("Explicit deadline/time must be preserved"), "Prompt must mandate deadline preservation");
  assert.ok(prompt.includes("Separate commitments MUST remain separate"), "Prompt must mandate separate commitments");
});

console.log("\nAll prompt invariant tests passed successfully! 🎉");
