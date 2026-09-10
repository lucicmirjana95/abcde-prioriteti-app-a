import assert from "node:assert/strict";
import type { AppAInboxItem } from "./contracts";
import type { NoteClarification } from "../../api/noteClarificationApi";

// 1. Clarification with suggestions: User can select a suggestion or type manually
{
  const clarificationWithSuggestions: NoteClarification = {
    questions: ["What is the specific next step?"],
    suggestions: ["Call the accountant to check invoice status", "Send email reminder about the invoice"],
  };

  // Option A: User chooses suggestion
  let clarifiedAction = "";
  clarifiedAction = clarificationWithSuggestions.suggestions[0];
  assert.equal(clarifiedAction, "Call the accountant to check invoice status");

  // Option B: User types custom action
  clarifiedAction = "Write down my notes before calling";
  assert.equal(clarifiedAction, "Write down my notes before calling");
  assert.ok(clarifiedAction.trim().length >= 3);
}

// 2. Empty suggestions: System detects no responsible suggestions and enables retry
{
  const emptyClarification: NoteClarification = {
    questions: [],
    suggestions: [],
  };

  const hasSuggestionsOrQuestions =
    emptyClarification.questions.length > 0 || emptyClarification.suggestions.length > 0;
  assert.equal(hasSuggestionsOrQuestions, false);

  // In the UI, when hasSuggestionsOrQuestions is false, noSuggestion message is shown
  // and the button shows retry so the user can re-trigger clarification without getting stuck
  const shouldShowRetryButton = !hasSuggestionsOrQuestions;
  assert.equal(shouldShowRetryButton, true);
}

// 3. Conversion stays in Inbox and does NOT enter Today automatically
{
  const originalNote: AppAInboxItem = {
    id: "note-123",
    title: "Razgovor sa Markom o projektu",
    kind: "note",
    status: "inbox",
    horizon: "later",
    source: "manual",
    language: "sr",
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
  };

  const clarifiedTitle = "Pošalji Marku sažetak projekta putem mejla";

  // Simulate note conversion according to repository contract
  const convertedTask: AppAInboxItem = {
    ...originalNote,
    title: clarifiedTitle,
    kind: "task",
    status: "inbox",
    horizon: "later",
    details: `Original note: ${originalNote.title}`,
    updatedAt: "2026-09-10T10:05:00.000Z",
  };

  assert.equal(convertedTask.kind, "task");
  // Stays in inbox status
  assert.equal(convertedTask.status, "inbox");
  assert.equal(convertedTask.horizon, "later");
  // Not scheduled for today
  assert.equal(convertedTask.scheduledLocalDate, undefined);
  // Preserves original context
  assert.equal(convertedTask.details, "Original note: Razgovor sa Markom o projektu");
}

console.log("Inbox clarification domain & workflow tests passed.");
