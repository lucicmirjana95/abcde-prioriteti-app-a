import assert from "node:assert/strict";
import type { AppAInboxItem } from "./contracts";
import {
  isConservativeOperationalItem,
  isAdministrativeMessage,
  hasStrategicAmbition,
  hasConcreteOutcome,
  evaluateInboxVisionEligibility,
  assessInboxItemForVision,
} from "./inboxVisionEligibility";

const baseItem: AppAInboxItem = {
  id: "in_test_1",
  title: "Kupi mleko i hleb u prodavnici",
  kind: "task",
  horizon: "this_week",
  status: "inbox",
  source: "manual",
  language: "sr",
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
};

async function runTests() {
  console.log("Starting Refined Inbox Vision Eligibility Tests...");

  // 1. Conservative operational errand rejection
  assert.equal(isConservativeOperationalItem(baseItem), true);
  const errandResult = evaluateInboxVisionEligibility(baseItem);
  assert.equal(errandResult.status, "ineligible");
  assert.equal(errandResult.eligible, false);
  assert.match(errandResult.reason || "", /Operativni/);

  // 2. Short duration task (<= 30 min) is rejected
  const shortTask: AppAInboxItem = {
    ...baseItem,
    title: "Pregledaj kratak fajl",
    estimatedMinutes: 15,
  };
  assert.equal(isConservativeOperationalItem(shortTask), true);
  assert.equal(evaluateInboxVisionEligibility(shortTask).status, "ineligible");

  // 3. Negative test: Duga administrativna poruka (length does not make it a vision!)
  const longAdminMessage: AppAInboxItem = {
    ...baseItem,
    title: "Molimo popunite tabelu sa troškovima reprezentacije za prethodni kvartal",
    details: "Potrebno je skenirane račune dostaviti u računovodstvo do petka u 14h radi obrade završnog računa i poreske prijave.",
    estimatedMinutes: 60,
  };
  assert.equal(isAdministrativeMessage(longAdminMessage), true);
  const adminResult = evaluateInboxVisionEligibility(longAdminMessage);
  assert.equal(adminResult.status, "ineligible");
  assert.equal(adminResult.eligible, false);
  assert.match(adminResult.reason || "", /Administrativ/);

  // 4. Negative test: Nepoznata operativna formulacija -> needs_assessment (NOT automatically eligible)
  const unknownOperational: AppAInboxItem = {
    ...baseItem,
    title: "Ažuriranje internog protokola za arhiviranje dokumentacije",
    details: "Proveriti sa timom da li se koristi novi folder na serveru.",
    estimatedMinutes: 60,
  };
  const unknownResult = evaluateInboxVisionEligibility(unknownOperational);
  assert.equal(unknownResult.status, "needs_assessment");
  assert.equal(unknownResult.eligible, false);
  assert.equal(unknownResult.confidence, "low");
  assert.equal(unknownResult.suggestion?.confidence, "medium");
  assert.equal(unknownResult.suggestion?.needsClarification, true);

  // 5. Negative test: Nejasna stavka ide u needs_assessment
  const ambiguousItem: AppAInboxItem = {
    ...baseItem,
    title: "Projekat X",
    details: "Videti šta ćemo sa ovim.",
    estimatedMinutes: 60,
  };
  const ambiguousResult = evaluateInboxVisionEligibility(ambiguousItem);
  assert.equal(ambiguousResult.status, "needs_assessment");
  assert.equal(ambiguousResult.eligible, false);
  assert.equal(ambiguousResult.confidence, "low");
  assert.equal(ambiguousResult.suggestion?.confidence, "medium");
  assert.equal(ambiguousResult.suggestion?.needsClarification, true);

  // 6. Kratka, ali stvarna dugoročna ambicija (sr/en/tr)
  const shortAmbitionSr: AppAInboxItem = {
    ...baseItem,
    title: "Nauči nemački jezik",
    details: undefined,
  };
  const shortResultSr = evaluateInboxVisionEligibility(shortAmbitionSr);
  assert.equal(shortResultSr.status, "eligible");
  assert.equal(shortResultSr.eligible, true);
  assert.equal(shortResultSr.confidence, "medium");
  assert.equal(shortResultSr.suggestion?.needsClarification, true);

  const shortAmbitionEn: AppAInboxItem = {
    ...baseItem,
    language: "en",
    title: "Launch SaaS product",
    details: undefined,
  };
  const shortResultEn = evaluateInboxVisionEligibility(shortAmbitionEn);
  assert.equal(shortResultEn.status, "eligible");
  assert.equal(shortResultEn.eligible, true);
  assert.equal(shortResultEn.confidence, "medium");

  const shortAmbitionTr: AppAInboxItem = {
    ...baseItem,
    language: "tr",
    title: "Yeni bir dil öğren",
    details: undefined,
  };
  const shortResultTr = evaluateInboxVisionEligibility(shortAmbitionTr);
  assert.equal(shortResultTr.status, "eligible");
  assert.equal(shortResultTr.eligible, true);
  assert.equal(shortResultTr.confidence, "medium");

  // 7. Strateški cilj sa konkretnim ishodom -> high confidence
  const strategicWithOutcome: AppAInboxItem = {
    ...baseItem,
    title: "Nauči nemački jezik do B2 nivoa",
    details: "Za rad u inostranstvu i polaganje zvanične sertifikacije.",
  };
  const strategicOutcomeResult = evaluateInboxVisionEligibility(strategicWithOutcome);
  assert.equal(strategicOutcomeResult.status, "eligible");
  assert.equal(strategicOutcomeResult.eligible, true);
  assert.equal(strategicOutcomeResult.confidence, "high");
  assert.equal(strategicOutcomeResult.suggestion?.needsClarification, false);

  // 8. Completed or archived items are ineligible
  const completedItem: AppAInboxItem = {
    ...strategicWithOutcome,
    status: "completed",
  };
  assert.equal(evaluateInboxVisionEligibility(completedItem).status, "ineligible");

  // 9. AI Assessment helper: Graceful handling of AI / parser error
  const mockCrashingAi = async () => {
    throw new Error("Network timeout or parse error");
  };
  const fallbackResult = await assessInboxItemForVision(unknownOperational, mockCrashingAi);
  assert.equal(fallbackResult.status, "needs_assessment");
  assert.equal(fallbackResult.eligible, false);
  assert.equal(fallbackResult.confidence, "low");
  assert.equal(fallbackResult.suggestion?.needsClarification, true);

  // 10. AI Assessment helper: Successful proposal without Firestore write
  let writesPerformed = 0;
  const mockAiService = async () => {
    return JSON.stringify({
      isLongTermVision: true,
      strategicDirection: "Modernizacija arhitekture podataka",
      hasConcreteMilestones: true,
      suggestedTitle: "Modernizacija platforme podataka",
      desiredOutcome: "Potpuni prelazak na cloud bazu uz 99.9% uptime",
    });
  };
  const aiSuccess = await assessInboxItemForVision(unknownOperational, mockAiService);
  assert.equal(aiSuccess.status, "eligible");
  assert.equal(aiSuccess.eligible, true);
  assert.equal(aiSuccess.confidence, "high");
  assert.equal(writesPerformed, 0, "AI assessment must make 0 Firestore writes");

  console.log("✅ All Refined Inbox Vision Eligibility tests passed cleanly!");
}

void runTests();
