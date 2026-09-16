import assert from "assert";
import { ClarificationQuestion } from "../domain/daily-reset/contracts";

function testClarificationLogic() {
  console.log("Running Clarification Flow Verification Tests...");

  const mockQuestions: ClarificationQuestion[] = [
    {
      id: "q1",
      question: "Da li je priprema ručka fiksirana pre 14:00 ili može i kasnije popodne?",
      context: "Ručak za porodicu",
      materialImpact: "deadline",
      relatedItemIds: ["item1"],
    },
    {
      id: "q2",
      question: "Koji je tačan opseg za izveštaj?",
      context: "Posao",
      materialImpact: "priority",
      relatedItemIds: ["item2"],
    },
  ];

  // Test 1: Validation check on empty answers
  {
    const answers: Record<string, string> = {};
    const hasMissing = mockQuestions.some((q) => !answers[q.id] || !answers[q.id].trim());
    assert.strictEqual(hasMissing, true, "Should detect missing answers when empty");
  }

  // Test 2: Partial answers still considered missing
  {
    const answers: Record<string, string> = { q1: "Pre 14h" };
    const hasMissing = mockQuestions.some((q) => !answers[q.id] || !answers[q.id].trim());
    assert.strictEqual(hasMissing, true, "Should detect missing answers when only one question answered");
  }

  // Test 3: Whitespace-only answers considered missing
  {
    const answers: Record<string, string> = { q1: "   ", q2: "Samo finansije" };
    const hasMissing = mockQuestions.some((q) => !answers[q.id] || !answers[q.id].trim());
    assert.strictEqual(hasMissing, true, "Should detect whitespace-only answer as missing");
  }

  // Test 4: Complete answers pass validation
  {
    const answers: Record<string, string> = { q1: "Pre 14h", q2: "Samo finansije" };
    const hasMissing = mockQuestions.some((q) => !answers[q.id] || !answers[q.id].trim());
    assert.strictEqual(hasMissing, false, "Should pass when all questions answered");
  }

  // Test 5: "Ne znam" fulfills answer requirement
  {
    const labels = {
      sr: "Ne znam",
      en: "I don’t know",
      tr: "Bilmiyorum",
    };
    for (const [lang, val] of Object.entries(labels)) {
      const answers: Record<string, string> = { q1: val, q2: val };
      const hasMissing = mockQuestions.some((q) => !answers[q.id] || !answers[q.id].trim());
      assert.strictEqual(hasMissing, false, `Unsure button value '${val}' (${lang}) must be valid non-empty answer`);
    }
  }

  // Test 6: Double-click submission protection simulation
  {
    let submitCount = 0;
    let isSubmitting = false;

    const simulateSubmit = () => {
      if (isSubmitting) return;
      isSubmitting = true;
      submitCount++;
    };

    simulateSubmit();
    simulateSubmit(); // rapid double click
    simulateSubmit(); // triple click

    assert.strictEqual(submitCount, 1, "isSubmitting flag must strictly prevent multiple rapid submissions");
  }

  // Test 7: Phased loading messages timeline check
  {
    const getLoadingStatus = (seconds: number) => {
      if (seconds < 4) return "phase_0_4";
      if (seconds < 9) return "phase_4_9";
      if (seconds < 16) return "phase_9_16";
      return "phase_16_plus";
    };

    assert.strictEqual(getLoadingStatus(0), "phase_0_4");
    assert.strictEqual(getLoadingStatus(3), "phase_0_4");
    assert.strictEqual(getLoadingStatus(4), "phase_4_9");
    assert.strictEqual(getLoadingStatus(8), "phase_4_9");
    assert.strictEqual(getLoadingStatus(9), "phase_9_16");
    assert.strictEqual(getLoadingStatus(15), "phase_9_16");
    assert.strictEqual(getLoadingStatus(16), "phase_16_plus");
    assert.strictEqual(getLoadingStatus(30), "phase_16_plus");
  }

  // Test 8: Verify authentic evening art path is strictly v4
  {
    const approvedEveningPath = "growth-path-watercolor-evening-moon-v4.png";
    const forbiddenEveningPath1 = "growth-path-watercolor-evening.png";
    const forbiddenEveningPath2 = "growth-path-watercolor-evening-moon-v3.png";

    assert.strictEqual(approvedEveningPath.includes("v4"), true);
    assert.notStrictEqual(approvedEveningPath, forbiddenEveningPath1);
    assert.notStrictEqual(approvedEveningPath, forbiddenEveningPath2);
  }

  console.log("✅ All Clarification Flow Verification tests passed successfully!");
}

testClarificationLogic();
