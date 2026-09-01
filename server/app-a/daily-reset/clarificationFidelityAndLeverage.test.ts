import assert from "node:assert";
import { buildDailyResetPrompt } from "./prompt";
import { parseModelResponse } from "./parseModelResponse";
import { ClarificationQuestion } from "../../../src/app-a/domain/daily-reset";
import { PROTECTED_AREAS, VALID_LEVERAGE_SIGNALS, BANNED_TERMS } from "../ai";


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

console.log("--- RUNNING CLARIFICATION FIDELITY & LEVERAGE FILTER TESTS ---\n");

// Context for the live scenario described in user prompt
const brainDump =
  "Feeling tired today. Want to start some sport or exercise eventually. Need to write the book, but currently stuck on chapter 4 character motivation. Have 9 dogs to feed and take out. Need to cook lunch for my wife, and also spend good quality time with my wife later. Haha if I survive the dogs maybe I will finish everything!";

const initialQuestions: ClarificationQuestion[] = [
  {
    id: "q_cook",
    question: "How long will cooking take, and is there a specific deadline for lunch?",
    context: "Cooking for wife mentioned in brain dump",
    relatedItemIds: [],
    materialImpact: "duration",
  },
  {
    id: "q_dog",
    question: "How much time is needed to care for all 9 dogs today?",
    context: "Dog care mentioned in brain dump",
    relatedItemIds: [],
    materialImpact: "duration",
  },
  {
    id: "q_book",
    question: "What specific next step would unblock the book chapter 4 character motivation?",
    context: "Book writing blocked",
    relatedItemIds: [],
    materialImpact: "priority",
  },
];

const resolveSubmission = {
  brainDump,
  language: "en" as const,
  availableMinutes: 420,
  energy: 2, // Low energy / tired
  pleasantness: 3,
  clarificationAnswers: [
    {
      questionId: "q_cook",
      answer: "Cooking takes exactly 30 minutes, must be ready by 14:00 sharp.",
    },
    {
      questionId: "q_dog",
      answer: "Takes 40 minutes for feeding and letting them out.",
    },
    {
      questionId: "q_book",
      answer: "Outline 3 possible reasons for the protagonist's betrayal on one page of notes.",
    },
  ],
};

const resolvePrompt = buildDailyResetPrompt(resolveSubmission, initialQuestions);

// ==========================================
// PART 1: CLARIFICATION FIDELITY TESTS (1–7)
// ==========================================

// 1. A 30-minute cooking answer remains 30 minutes
runTest("1. Prompt mandates 30-minute cooking answer is preserved as 30 minutes", () => {
  assert.ok(
    resolvePrompt.includes("Cooking takes exactly 30 minutes, must be ready by 14:00 sharp."),
    "Prompt must include exact user answer for cooking duration"
  );
  assert.ok(
    resolvePrompt.includes("Explicit duration must be preserved"),
    "Prompt must mandate explicit duration preservation"
  );
  assert.ok(
    resolvePrompt.includes("estimatedMinutes: 30"),
    "Prompt must specifically illustrate preserving the exact answered minutes"
  );
});

// 2. A deadline of 14:00 remains present in the resolved plan
runTest("2. Prompt mandates 14:00 deadline is preserved in deadline fields", () => {
  assert.ok(
    resolvePrompt.includes("must be ready by 14:00 sharp"),
    "Prompt must contain the 14:00 deadline text"
  );
  assert.ok(
    resolvePrompt.includes("Explicit deadline/time must be preserved"),
    "Prompt must mandate deadline preservation"
  );
  assert.ok(
    resolvePrompt.includes("deadlineText and/or deadlineIso"),
    "Prompt must specify preserving deadline in deadline fields"
  );
});

// 3. Cooking and relationship time remain separate unless explicitly combined
runTest("3. Prompt forbids merging cooking and relationship time into a single block", () => {
  assert.ok(
    resolvePrompt.includes("Separate commitments MUST remain separate"),
    "Prompt must mandate keeping separate commitments distinct"
  );
  assert.ok(
    resolvePrompt.includes("Do not merge distinct tasks or commitments (e.g. cooking and relationship time)"),
    "Prompt must explicitly instruct not merging cooking and relationship time"
  );
});

// 4. A supplied dog-care duration is not replaced by an invented estimate
runTest("4. Supplied dog-care duration (40m) is not replaced by an invented estimate", () => {
  assert.ok(
    resolvePrompt.includes("[QUESTION ID: q_dog]"),
    "Prompt must contain dog care question ID"
  );
  assert.ok(
    resolvePrompt.includes("Exact User Answer: Takes 40 minutes for feeding and letting them out."),
    "Prompt must contain exact dog care answer"
  );
  assert.ok(
    resolvePrompt.includes("not replaced by an invented estimate (e.g. 90 or 120 minutes)"),
    "Prompt must explicitly forbid replacing answered dog care with invented 90-minute estimates"
  );
});

// 5. A clarified book blocker changes the book task into a blocker-specific next action
runTest("5. Clarified book blocker converts general task into blocker-specific next action", () => {
  assert.ok(
    resolvePrompt.includes("Outline 3 possible reasons for the protagonist's betrayal on one page of notes."),
    "Prompt must contain the specific blocker resolution step"
  );
  assert.ok(
    resolvePrompt.includes("Blocker answers MUST materially change the action: If the user clarified a blocker on a goal or task, the plan item must be a concrete, blocker-specific next step"),
    "Prompt must require turning clarified blocker into concrete next action"
  );
});

// 6. Resolve prompt contains question ID, question text, and exact answer
runTest("6. Resolve prompt contains question ID, original question text, question context, and exact answer", () => {
  assert.ok(resolvePrompt.includes("[QUESTION ID: q_cook]"));
  assert.ok(resolvePrompt.includes("Original Question: How long will cooking take, and is there a specific deadline for lunch?"));
  assert.ok(resolvePrompt.includes("Question Context: Cooking for wife mentioned in brain dump"));
  assert.ok(resolvePrompt.includes("Material Impact: duration"));
  assert.ok(resolvePrompt.includes("Exact User Answer: Cooking takes exactly 30 minutes, must be ready by 14:00 sharp."));

  assert.ok(resolvePrompt.includes("[QUESTION ID: q_dog]"));
  assert.ok(resolvePrompt.includes("Original Question: How much time is needed to care for all 9 dogs today?"));
  assert.ok(resolvePrompt.includes("Exact User Answer: Takes 40 minutes for feeding and letting them out."));

  assert.ok(resolvePrompt.includes("[QUESTION ID: q_book]"));
  assert.ok(resolvePrompt.includes("Original Question: What specific next step would unblock the book chapter 4 character motivation?"));
  assert.ok(resolvePrompt.includes("Exact User Answer: Outline 3 possible reasons for the protagonist's betrayal on one page of notes."));
});

// 7. Clarification answers override initial model assumptions
runTest("7. Clarification answers are authoritative Tier A facts overriding initial assumptions", () => {
  assert.ok(
    resolvePrompt.includes("Clarification answers are authoritative user-provided facts (Tier A)"),
    "Clarification answers must be designated as authoritative Tier A"
  );
  assert.ok(
    resolvePrompt.includes("They strictly override prior AI estimates, defaults, and assumptions"),
    "Must explicitly override AI estimates and defaults"
  );
});

// ==========================================
// PART 2: LEVERAGE FILTER TESTS (8–18)
// ==========================================

// 8. Blocker-removing book action may receive high consideration when linked to a stated goal
runTest("8. Blocker-removing book action receives high consideration under Leverage Filter", () => {
  assert.ok(
    resolvePrompt.includes("Which action removes a real blocker?") &&
    resolvePrompt.includes("Which action directly advances a stated goal?"),
    "Leverage Filter prompt must prioritize actions that remove real blockers on stated goals"
  );
});

// 9. Dog care is protected and not eliminated as 'low leverage'
runTest("9. Animal care (dog care) is in PROTECTED_AREAS and cannot be eliminated as low leverage", () => {
  assert.ok(PROTECTED_AREAS.includes("animal care"), "animal care must be in PROTECTED_AREAS");
  assert.ok(
    resolvePrompt.includes("Animal care (e.g. caring for pets or animals)"),
    "Prompt must explicitly protect animal care"
  );
  assert.ok(
    resolvePrompt.includes("NEVER eliminate or displace them in the name of productivity"),
    "Prompt must forbid eliminating protected care"
  );
});

// 10. Rest is not discarded when the user reports tiredness
runTest("10. Sleep and rest are protected when the user reports tiredness", () => {
  assert.ok(PROTECTED_AREAS.includes("sleep and rest"), "sleep and rest must be in PROTECTED_AREAS");
  assert.ok(
    resolvePrompt.includes("Sleep and rest (especially when the user reports tiredness or low energy)"),
    "Prompt must protect rest when user reports tiredness"
  );
});

// 11. Cooking with an explicit deadline outranks an unsupported optimization idea
runTest("11. Explicit deadline (cooking by 14:00) outranks unsupported optimization ideas", () => {
  assert.ok(
    resolvePrompt.includes("Explicit near deadline") ||
    resolvePrompt.includes("explicit hard deadline"),
    "Prompt must prioritize explicit deadlines over speculative optimization"
  );
});

// 12. A vague desire to start sport becomes a small next decision/goal candidate, not an invented exercise prescription
runTest("12. Vague desire for sport becomes idea/long_term_idea, not an invented medical or exercise prescription", () => {
  assert.ok(
    resolvePrompt.includes("Do not invent tasks, deadlines, goals, obligations, relationships, health facts, or personal history"),
    "Prompt must forbid inventing personal commitments"
  );
  assert.ok(
    resolvePrompt.includes("NEVER recommend: medication, supplements, fasting, extreme cold or heat, medical treatment, diagnosis, therapy, unsafe biohacking protocols"),
    "Prompt must forbid prescribing medical/fitness protocols"
  );
});

// 13. No leverage conclusion is allowed without evidence
runTest("13. No leverage conclusion is allowed without explicit signals/evidence", () => {
  assert.ok(
    resolvePrompt.includes("EVIDENCE REQUIREMENT FOR LEVERAGE CONCLUSIONS"),
    "Prompt must have an explicit evidence requirement section"
  );
  assert.ok(
    resolvePrompt.includes("If no such signal exists in the user's input or clarification answers, you MUST NOT invent \"high impact\", ROI, urgency, importance, or strategic leverage"),
    "Prompt must ban invented ROI, leverage, or urgency without evidence"
  );
  for (const signal of VALID_LEVERAGE_SIGNALS) {
    assert.ok(resolvePrompt.includes(signal), `Prompt must include signal: ${signal}`);
  }
});

// 14. All meaningful thoughts are preserved
runTest("14. All meaningful thoughts are preserved in classifiedItems and appropriate blocks", () => {
  assert.ok(
    (resolvePrompt.includes("Preserve every meaningful user-provided item") ||
     resolvePrompt.includes("Preserve every meaningful thought")) &&
    resolvePrompt.includes("Step 7: Preserve all meaningful non-selected thoughts in the appropriate later, waiting, long-term, or no-action group"),
    "Prompt must mandate complete thought preservation"
  );
});


// 15. First Focus remains capped at three
runTest("15. First Focus remains capped at 3 items max", () => {
  assert.ok(
    resolvePrompt.includes('"first_focus": contains at most 3 items') ||
    resolvePrompt.includes("Select at most three First Focus items"),
    "Prompt must enforce First Focus maximum of 3 items"
  );
});

// 16. Available-time capacity remains valid
runTest("16. Available-time capacity constraint remains strictly enforced", () => {
  assert.ok(
    resolvePrompt.includes('"first_focus" plus "later_today" must not exceed availableMinutes'),
    "Prompt must enforce availableMinutes capacity"
  );
});

// 17. No visible ABCDE, Pareto, 80/20, or leverage score is emitted
runTest("17. Forbids exposing ABCDE, Pareto, 80/20, or numerical leverage scores", () => {
  assert.ok(
    resolvePrompt.includes("Do NOT expose ABCDE letters or letter ranks anywhere in user-facing text"),
    "Prompt must forbid visible ABCDE letters"
  );
  assert.ok(
    resolvePrompt.includes("Do NOT expose \"80/20\", \"Pareto\""),
    "Prompt must forbid exposing 80/20 or Pareto"
  );
  assert.ok(
    resolvePrompt.includes("Do NOT output leverage scores, numerical ranks, or composite life/productivity scores"),
    "Prompt must forbid numerical leverage scores"
  );
  for (const term of BANNED_TERMS) {
    assert.ok(
      resolvePrompt.includes(term),
      `Negative prohibition section must list banned term: ${term}`
    );
  }
});

// 18. Resolution still makes exactly one model call and never loops (State B only)
runTest("18. Resolution phase strictly enforces State B (plan_ready) and single-round completion", () => {
  assert.ok(
    resolvePrompt.includes("NEVER ask another clarification question. Additional questions are strictly forbidden in this phase."),
    "Resolution phase must forbid additional questions"
  );
  assert.ok(
    resolvePrompt.includes('You MUST return ONLY a final plan (phase: "plan_ready") with a complete draft.'),
    "Resolution phase must mandate final plan_ready"
  );
  assert.ok(
    resolvePrompt.includes('Exactly one clarification round is permitted under the contract. Additional clarification rounds are strictly forbidden.'),
    "Prompt must mandate exactly one clarification round"
  );
});

// ==========================================
// PART 3: PARSING & STRUCTURAL INTEGRITY
// ==========================================

runTest("19. Resolved model JSON parsing adheres to all contracts and index integrity", () => {
  const sampleResolvedResponseJson = JSON.stringify({
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        {
          originalText: "Feeling tired today.",
          kind: "fact",
          timeHorizon: "today",
          timeSensitivity: "none",
          suggestedText: "Acknowledge low energy and rest adequately",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Rest is essential for health" },
        },
        {
          originalText: "Want to start some sport or exercise eventually.",
          kind: "idea",
          timeHorizon: "long_term_idea",
          timeSensitivity: "none",
          suggestedText: "Explore sports and exercise routines to start in the future",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Future goal exploration" },
        },
        {
          originalText: "Need to write the book, but currently stuck on chapter 4 character motivation.",
          kind: "task",
          timeHorizon: "today",
          timeSensitivity: "none",
          suggestedText: "Outline 3 possible reasons for the protagonist's betrayal on one page of notes",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Unblocks book writing" },
        },
        {
          originalText: "Have 9 dogs to feed and take out.",
          kind: "task",
          timeHorizon: "today",
          timeSensitivity: "none",
          suggestedText: "Feed and walk the 9 dogs (40 min)",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Essential animal care" },
        },
        {
          originalText: "Need to cook lunch for my wife, and also spend good quality time with my wife later.",
          kind: "task",
          timeHorizon: "today",
          timeSensitivity: "deadline",
          suggestedText: "Cook lunch for wife before 14:00 deadline (30 min)",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Meal commitment with 14:00 deadline" },
        },
        {
          originalText: "spend good quality time with my wife later",
          kind: "task",
          timeHorizon: "today",
          timeSensitivity: "none",
          suggestedText: "Quality time with wife this evening",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Important relationship commitment" },
        },
        {
          originalText: "Haha if I survive the dogs maybe I will finish everything!",
          kind: "fact",
          timeHorizon: "no_action",
          timeSensitivity: "none",
          suggestedText: "Humorous closing observation",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Lighthearted contextual remark" },
        },
      ],
      firstFocus: [
        {
          sourceItemIndex: 4,
          title: "Cook lunch for wife",
          description: "Prepare lunch in 30 minutes, ready by 14:00 deadline.",
          block: "first_focus",
          estimatedMinutes: 30,
          requiredEnergy: 2,
          timeSensitivity: "deadline",
          deadlineText: "14:00",
          needsCheck: false,
          priority: { explanation: "Explicit deadline of 14:00 and relationship commitment" },
        },
        {
          sourceItemIndex: 3,
          title: "Care for 9 dogs",
          description: "Feed and take out dogs (40 minutes).",
          block: "first_focus",
          estimatedMinutes: 40,
          requiredEnergy: 2,
          timeSensitivity: "none",
          needsCheck: false,
          priority: { explanation: "Protected animal care essential for today" },
        },
        {
          sourceItemIndex: 2,
          title: "Unblock book chapter 4 character motivation",
          description: "Outline 3 possible reasons for protagonist's betrayal on one page of notes.",
          block: "first_focus",
          estimatedMinutes: 45,
          requiredEnergy: 2,
          timeSensitivity: "none",
          needsCheck: false,
          priority: { explanation: "Removes a specific blocker on the book project" },
        },
      ],
      laterToday: [
        {
          sourceItemIndex: 5,
          title: "Quality time with wife",
          description: "Dedicated relaxing time together this evening.",
          block: "later_today",
          estimatedMinutes: 60,
          requiredEnergy: 1,
          timeSensitivity: "none",
          needsCheck: false,
          priority: { explanation: "Relationship connection" },
        },
        {
          sourceItemIndex: 0,
          title: "Rest and recharge",
          description: "Take intentional breaks to recover energy.",
          block: "later_today",
          estimatedMinutes: 30,
          requiredEnergy: 1,
          timeSensitivity: "none",
          needsCheck: false,
          priority: { explanation: "Recovery from tiredness" },
        },
      ],

      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [
        {
          sourceItemIndex: 1,
          title: "Explore starting a sport or exercise routine",
          description: "Research sports options when energy is higher.",
          timeHorizon: "long_term_idea",
        },
      ],
      nonActionItems: [
        {
          sourceItemIndex: 6,
          title: "Dog survival joke",
          originalText: "Haha if I survive the dogs maybe I will finish everything!",
          timeHorizon: "no_action",
          reason: "Lighthearted contextual remark",
        },
      ],
      planRationale: "Prioritizes time-sensitive meal preparation, animal care, and resolving the specific book blocker while respecting low energy with adequate rest.",
    },
  });

  let counter = 0;
  const idFactory = () => `item_${++counter}`;
  const parsed = parseModelResponse(JSON.parse(sampleResolvedResponseJson), idFactory, true);
  assert.strictEqual(parsed.phase, "plan_ready");
  if (parsed.phase !== "plan_ready") return;

  assert.ok(parsed.draft);

  
  // 1. 30-minute cooking preserved
  const cookingClassifiedId = parsed.draft.classifiedItems[4].id;
  const cookingItem = parsed.draft.firstFocus.find((i) => i.sourceItemIds.includes(cookingClassifiedId));
  assert.ok(cookingItem);
  assert.strictEqual(cookingItem.estimatedMinutes, 30);
  assert.strictEqual(cookingItem.deadlineText, "14:00");

  // 2. 40-minute dog care preserved and protected
  const dogClassifiedId = parsed.draft.classifiedItems[3].id;
  const dogItem = parsed.draft.firstFocus.find((i) => i.sourceItemIds.includes(dogClassifiedId));
  assert.ok(dogItem);
  assert.strictEqual(dogItem.estimatedMinutes, 40);

  // 3. Book blocker specific action preserved
  const bookClassifiedId = parsed.draft.classifiedItems[2].id;
  const bookItem = parsed.draft.firstFocus.find((i) => i.sourceItemIds.includes(bookClassifiedId));
  assert.ok(bookItem);
  assert.ok(bookItem.description && bookItem.description.includes("protagonist's betrayal"));

  // 4. Cooking and relationship time remain separate items
  const wifeQualityClassifiedId = parsed.draft.classifiedItems[5].id;
  const wifeQualityTime = parsed.draft.laterToday.find((i) => i.sourceItemIds.includes(wifeQualityClassifiedId));
  assert.ok(wifeQualityTime);
  assert.notStrictEqual(cookingItem.id, wifeQualityTime.id);

  // 5. Rest is protected
  const restClassifiedId = parsed.draft.classifiedItems[0].id;
  const restItem = parsed.draft.laterToday.find((i) => i.sourceItemIds.includes(restClassifiedId));
  assert.ok(restItem);

  // 6. Sport desire is long-term idea, not an invented prescription
  const sportClassifiedId = parsed.draft.classifiedItems[1].id;
  const sportIdea = parsed.draft.longTermIdeas.find((i) => i.id === sportClassifiedId);
  assert.ok(sportIdea);

  // 7. First focus capped at 3
  assert.ok(parsed.draft.firstFocus.length <= 3);

  // 8. Total scheduled minutes (30 + 40 + 45 + 60 + 30 = 205) within available minutes (420)
  const totalMinutes =
    parsed.draft.firstFocus.reduce((sum, i) => sum + (i.estimatedMinutes || 0), 0) +
    parsed.draft.laterToday.reduce((sum, i) => sum + (i.estimatedMinutes || 0), 0);
  assert.ok(totalMinutes <= 420);

});

console.log("\nAll Clarification Fidelity & Leverage Filter tests passed with flying colors! 🚀\n");
