import type { DailyResetApiClient } from "../api";
import type {
  ClarificationNeededResponse,
  DailyPlanDraft,
  DailyResetApiResponse,
  DailyResetErrorCode,
  DailyResetInput,
  PlanReadyResponse,
  SupportedLanguage,
} from "../domain/daily-reset/contracts";
import type { DailyResetData } from "../types";

export const DAILY_RESET_DEMO_SCENARIOS = [
  "clarification",
  "plan",
  "rate-limit",
  "unavailable",
  "timeout",
  "invalid-response",
] as const;

export type DailyResetDemoScenario = (typeof DAILY_RESET_DEMO_SCENARIOS)[number];

export interface DailyResetDemoConfig {
  enabled: true;
  scenario: DailyResetDemoScenario;
}

const COPY = {
  en: {
    question: "Does the proposal have a firm deadline today?",
    questionContext: "The deadline changes which task belongs in First focus.",
    focus: "Finish and send the project proposal",
    focusDescription: "Complete the final review and send the approved version.",
    later: "Review the pull request",
    laterDescription: "Check the pending changes and leave actionable feedback.",
    optional: "Outline next week's presentation",
    deferred: "Book the annual health check",
    idea: "Create a reusable weekly planning template",
    observation: "I felt more focused after the morning walk.",
    rationale: "The proposal comes first because it has the strongest time pressure and impact. The review follows while your energy is still steady.",
    interventionTitle: "Short movement break",
    interventionDescription: "Walk or stretch for five minutes before the second work block.",
    interventionReason: "A brief reset can protect attention during a demanding day.",
    brainDump: "Finish the project proposal, review the pull request, prepare next week's presentation, book a health check, and save my idea for a weekly planning template.",
    stateNote: "Good focus, but I slept a little less than usual.",
  },
  sr: {
    question: "Da li predlog projekta ima čvrst rok danas?",
    questionContext: "Rok menja odluku o tome koji zadatak pripada Prvom fokusu.",
    focus: "Završi i pošalji predlog projekta",
    focusDescription: "Uradi završnu proveru i pošalji odobrenu verziju.",
    later: "Pregledaj pull request",
    laterDescription: "Proveri izmene na čekanju i ostavi konkretne komentare.",
    optional: "Napravi okvir prezentacije za sledeću nedelju",
    deferred: "Zakaži godišnji zdravstveni pregled",
    idea: "Napravi šablon za nedeljno planiranje",
    observation: "Bila sam fokusiranija posle jutarnje šetnje.",
    rationale: "Predlog projekta ide prvi jer ima najveći vremenski pritisak i uticaj. Pregled koda sledi dok je energija još stabilna.",
    interventionTitle: "Kratka pauza za kretanje",
    interventionDescription: "Prošetaj ili se istegni pet minuta pre drugog radnog bloka.",
    interventionReason: "Kratak reset može sačuvati pažnju tokom zahtevnog dana.",
    brainDump: "Završiti predlog projekta, pregledati pull request, pripremiti prezentaciju za sledeću nedelju, zakazati pregled i sačuvati ideju za šablon nedeljnog planiranja.",
    stateNote: "Dobar fokus, ali sam spavala malo manje nego obično.",
  },
  tr: {
    question: "Proje teklifinin bugün kesin bir son tarihi var mı?",
    questionContext: "Son tarih, hangi görevin İlk odakta yer alacağını değiştirir.",
    focus: "Proje teklifini tamamla ve gönder",
    focusDescription: "Son kontrolü tamamla ve onaylanan sürümü gönder.",
    later: "Pull request'i incele",
    laterDescription: "Bekleyen değişiklikleri kontrol et ve uygulanabilir geri bildirim bırak.",
    optional: "Gelecek haftanın sunum taslağını hazırla",
    deferred: "Yıllık sağlık kontrolü için randevu al",
    idea: "Yeniden kullanılabilir haftalık planlama şablonu oluştur",
    observation: "Sabah yürüyüşünden sonra daha iyi odaklandım.",
    rationale: "Proje teklifi, zaman baskısı ve etkisi en yüksek olduğu için önce geliyor. Enerjin hâlâ dengeliyken kod incelemesi onu takip ediyor.",
    interventionTitle: "Kısa hareket molası",
    interventionDescription: "İkinci çalışma bloğundan önce beş dakika yürü veya esne.",
    interventionReason: "Kısa bir sıfırlama yoğun bir günde dikkati koruyabilir.",
    brainDump: "Proje teklifini bitir, pull request'i incele, gelecek haftanın sunumunu hazırla, sağlık kontrolü için randevu al ve haftalık planlama şablonu fikrimi kaydet.",
    stateNote: "Odağım iyi, ancak normalden biraz daha az uyudum.",
  },
} as const;

function languageOf(value?: string): SupportedLanguage {
  return value === "sr" || value === "tr" ? value : "en";
}

export function getDailyResetDemoConfig(search: string): DailyResetDemoConfig | null {
  const params = new URLSearchParams(search);
  if (params.get("app") !== "a" || params.get("demo") !== "daily-reset") return null;
  const requested = params.get("scenario");
  const scenario = DAILY_RESET_DEMO_SCENARIOS.includes(requested as DailyResetDemoScenario)
    ? (requested as DailyResetDemoScenario)
    : "clarification";
  return { enabled: true, scenario };
}

export function createDailyResetDemoInitialData(language: SupportedLanguage): DailyResetData {
  const copy = COPY[languageOf(language)];
  return {
    energy: 4,
    pleasantness: 3,
    availableTime: { type: "4h" },
    stateNote: copy.stateNote,
    brainDump: copy.brainDump,
  };
}

function createClarification(language: SupportedLanguage): ClarificationNeededResponse {
  const copy = COPY[languageOf(language)];
  return {
    success: true,
    phase: "clarification_needed",
    questions: [{
      id: "demo-question-deadline",
      question: copy.question,
      context: copy.questionContext,
      relatedItemIds: [],
      materialImpact: "deadline",
    }],
  };
}

export function createDailyResetDemoDraft(language: SupportedLanguage): DailyPlanDraft {
  const copy = COPY[languageOf(language)];
  const classifiedItems: DailyPlanDraft["classifiedItems"] = [
    { id: "demo-source-focus", originalText: copy.focus, kind: "task", timeHorizon: "today", suggestedAction: copy.focus, estimatedMinutes: 60, requiredEnergy: 4, timeSensitivity: "deadline", deadlineText: "17:00", isAmbiguous: false, needsCheck: false, priority: { consequence: 5, urgency: 5, goalContribution: 5, explanation: copy.rationale } },
    { id: "demo-source-review", originalText: copy.later, kind: "task", timeHorizon: "today", suggestedAction: copy.later, estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "soft", isAmbiguous: false, needsCheck: false, priority: { consequence: 3, urgency: 3, explanation: copy.laterDescription } },
    { id: "demo-source-presentation", originalText: copy.optional, kind: "task", timeHorizon: "today", suggestedAction: copy.optional, estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { goalContribution: 3, explanation: copy.optional } },
    { id: "demo-source-deferred", originalText: copy.deferred, kind: "task", timeHorizon: "this_week", suggestedAction: copy.deferred, estimatedMinutes: 15, requiredEnergy: 2, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: copy.deferred } },
    { id: "demo-source-idea", originalText: copy.idea, kind: "idea", timeHorizon: "long_term_idea", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: copy.idea } },
    { id: "demo-source-observation", originalText: copy.observation, kind: "fact", timeHorizon: "no_action", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: copy.observation } },
  ];
  return {
    classifiedItems,
    firstFocus: [{ id: "demo-plan-focus", sourceItemIds: ["demo-source-focus"], title: copy.focus, description: copy.focusDescription, block: "first_focus", estimatedMinutes: 60, requiredEnergy: 4, timeSensitivity: "deadline", deadlineText: "17:00", priority: classifiedItems[0].priority, reasoning: copy.rationale, needsCheck: false }],
    laterToday: [{ id: "demo-plan-review", sourceItemIds: ["demo-source-review"], title: copy.later, description: copy.laterDescription, block: "later_today", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "soft", priority: classifiedItems[1].priority, needsCheck: false }],
    ifCapacityRemains: [{ id: "demo-plan-presentation", sourceItemIds: ["demo-source-presentation"], title: copy.optional, block: "if_capacity_remains", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", priority: classifiedItems[2].priority, needsCheck: false }],
    deferredItems: [classifiedItems[3]],
    longTermIdeas: [classifiedItems[4]],
    nonActionItems: [classifiedItems[5]],
    planRationale: copy.rationale,
    intervention: { type: "movement", title: copy.interventionTitle, description: copy.interventionDescription, estimatedMinutes: 5, reason: copy.interventionReason },
    availableMinutes: 240,
    plannedRequiredMinutes: 105,
    plannedOptionalMinutes: 30,
  };
}

function createPlan(language: SupportedLanguage): PlanReadyResponse {
  return { success: true, phase: "plan_ready", draft: createDailyResetDemoDraft(language) };
}

function createError(code: DailyResetErrorCode, language: SupportedLanguage): DailyResetApiResponse {
  const messages = {
    en: { rate_limited: "Demo: You have reached the daily planning limit.", service_unavailable: "Demo: The planning service is temporarily unavailable.", timeout: "Demo: The request took too long. Please try again.", invalid_ai_response: "Demo: The AI response could not be safely interpreted." },
    sr: { rate_limited: "Demo: Dostigli ste dnevni limit za planiranje.", service_unavailable: "Demo: Usluga za planiranje je privremeno nedostupna.", timeout: "Demo: Obrada je trajala predugo. Pokušajte ponovo.", invalid_ai_response: "Demo: AI odgovor nije moguće bezbedno protumačiti." },
    tr: { rate_limited: "Demo: Günlük planlama sınırına ulaştınız.", service_unavailable: "Demo: Planlama hizmeti geçici olarak kullanılamıyor.", timeout: "Demo: İstek çok uzun sürdü. Lütfen tekrar deneyin.", invalid_ai_response: "Demo: Yapay zeka yanıtı güvenli biçimde yorumlanamadı." },
  } as const;
  return { success: false, phase: "error", code, error: messages[languageOf(language)][code], retryable: true };
}

export function createDailyResetDemoClient(
  scenario: DailyResetDemoScenario,
  delayMs = 550,
): DailyResetApiClient {
  const pause = () => delayMs > 0 ? new Promise<void>((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();
  const respond = async (language: SupportedLanguage, phase: "initial" | "resolve"): Promise<DailyResetApiResponse> => {
    await pause();
    if (phase === "resolve") return createPlan(language);
    if (scenario === "clarification") return createClarification(language);
    if (scenario === "plan") return createPlan(language);
    if (scenario === "rate-limit") return createError("rate_limited", language);
    if (scenario === "unavailable") return createError("service_unavailable", language);
    if (scenario === "timeout") return createError("timeout", language);
    return createError("invalid_ai_response", language);
  };
  return {
    analyze(input: DailyResetInput) {
      return respond(languageOf(input.language), "initial");
    },
    resolve(submission) {
      return respond(languageOf(submission.language), "resolve");
    },
  };
}
