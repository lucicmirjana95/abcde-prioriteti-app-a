import type { AppAInboxItem } from "./contracts";
import type { DailyResetVisionSuggestion } from "../daily-reset/contracts";

export type VisionEligibilityStatus = "ineligible" | "needs_assessment" | "eligible";

export interface VisionEligibilityResult {
  status: VisionEligibilityStatus;
  eligible: boolean; // true if and only if status === "eligible"
  confidence?: "low" | "medium" | "high";
  reason?: string;
  suggestion?: DailyResetVisionSuggestion;
}

// 1. Conservative operational keywords (only obvious chores, errands, shopping, utilities)
const CONSERVATIVE_OPERATIONAL_KEYWORDS = [
  // Serbian
  "kupi", "kupiti", "nabavi", "nabaviti", "plati", "platiti", "racun", "račun",
  "baci smeće", "baci djubre", "operi", "očisti", "usisi", "prodavnica", "apoteka",
  "pošta", "posta", "majstor", "zakaži pregled", "zakaži frizera",
  // English
  "buy", "purchase", "groceries", "pay bill", "trash", "clean", "wash",
  "pick up", "drop off", "haircut", "plumber", "pharmacy", "post office",
  // Turkish
  "satın al", "fatura öde", "çöp", "temizle", "yıka", "eczane", "market"
];

// Administrative procedural markers that indicate operational bureaucracy rather than personal vision
const ADMINISTRATIVE_KEYWORDS = [
  // Serbian
  "tabelu sa troškovima", "računovodstvo", "skenirane račune", "dostavite račune",
  "popunite formular", "poreska prijava", "završni račun", "administrativ",
  // English
  "expense report", "accounting receipts", "submit invoice", "tax filing",
  "bureaucratic", "paperwork", "timesheet",
  // Turkish
  "masraf raporu", "muhasebe", "fatura teslimi", "vergi beyannamesi"
];

// 2. Concrete strategic ambition markers (long-term transformative direction)
const STRATEGIC_AMBITION_MARKERS = [
  // Serbian
  "nauči", "naučiti", "pokreni", "pokrenuti", "izgradi", "izgraditi", "razvij", "razviti",
  "savladaj", "savladati", "napiši knjigu", "transformiši", "transformisati",
  "diplomiraj", "istrči maraton", "dugoročn", "stratešk", "vizija", "karijer", "životn",
  // English
  "learn", "launch", "build", "develop", "master", "write a book", "transform",
  "graduate", "run a marathon", "long-term", "strategic", "vision", "career", "life goal",
  // Turkish
  "öğren", "kur", "geliştir", "inşa et", "kitap yaz", "dönüştür",
  "mezun ol", "maraton koş", "uzun vadeli", "stratejik", "vizyon", "kariyer"
];

// Concrete outcome indicators required for high confidence (not mere text length)
const CONCRETE_OUTCOME_MARKERS = [
  // Levels, milestones, specific criteria
  "do b2", "do c1", "do c2", "sertifik", "prvih 100", "prvih 1000", "mvp",
  "b2 level", "c1 level", "certification", "first 100", "first 1000",
  "b2 seviye", "sertifika", "ilk 100", "ilk 1000",
  "diploma", "objav", "publish", "yayınla", "milestone", "prekretnica"
];

export function isConservativeOperationalItem(item: AppAInboxItem): boolean {
  if (item.status === "completed" || item.status === "archived") return true;
  if (item.capacityType === "fixed") return true;
  if (item.estimatedMinutes !== undefined && item.estimatedMinutes <= 30 && item.kind === "task") {
    return true;
  }

  const normalized = `${item.title} ${item.details || ""}`.toLowerCase();
  for (const keyword of CONSERVATIVE_OPERATIONAL_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export function isAdministrativeMessage(item: AppAInboxItem): boolean {
  const normalized = `${item.title} ${item.details || ""}`.toLowerCase();
  for (const keyword of ADMINISTRATIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return true;
    }
  }
  return false;
}

export function hasStrategicAmbition(text: string): boolean {
  const normalized = text.toLowerCase();
  return STRATEGIC_AMBITION_MARKERS.some((marker) => normalized.includes(marker));
}

export function hasConcreteOutcome(text: string): boolean {
  const normalized = text.toLowerCase();
  return CONCRETE_OUTCOME_MARKERS.some((marker) => normalized.includes(marker));
}

/**
 * Pure domain evaluation of whether an Inbox item is eligible to become a Vision suggestion.
 * Does NOT declare items Vision suggestions solely based on string length.
 * Returns:
 * - ineligible
 * - needs_assessment
 * - eligible
 */
export function evaluateInboxVisionEligibility(
  item: AppAInboxItem
): VisionEligibilityResult {
  if (item.status === "completed" || item.status === "archived") {
    return {
      status: "ineligible",
      eligible: false,
      reason: "Završene ili arhivirane stavke se ne razrađuju kao vizija.",
    };
  }

  if (isAdministrativeMessage(item)) {
    return {
      status: "ineligible",
      eligible: false,
      reason: "Administrativne procedure i rutinske obaveze nisu pogodne za novu viziju.",
    };
  }

  if (isConservativeOperationalItem(item)) {
    return {
      status: "ineligible",
      eligible: false,
      reason: "Operativni dnevni zadaci i nabavke nisu pogodni za novu viziju. Možete ih povezati sa postojećom vizijom.",
    };
  }

  const cleanTitle = item.title.trim();
  if (cleanTitle.length < 3) {
    return {
      status: "ineligible",
      eligible: false,
      reason: "Naslov je prekratak za razradu vizije.",
    };
  }

  const combinedText = `${cleanTitle} ${item.details || ""}`;
  const isAmbition = hasStrategicAmbition(combinedText);

  // If there is NO clear strategic ambition, do not declare it eligible!
  // Send to needs_assessment instead.
  if (!isAmbition) {
    return {
      status: "needs_assessment",
      eligible: false,
      confidence: "low",
      reason: "Stavka zahteva procenu ili razjašnjenje pre pretvaranja u viziju.",
      suggestion: {
        sourceItemIds: [item.id],
        suggestedTitle: cleanTitle,
        desiredOutcome: item.details?.trim() || cleanTitle,
        reason: "Potrebna procena dugoročnog pravca i željenog ishoda",
        confidence: "medium",
        needsClarification: true,
        clarificationQuestion: "Koji je željeni dugoročni ishod i da li ovo predstavlja dugoročnu viziju ili operativni zadatak?",
      },
    };
  }

  // Item has strategic ambition.
  // Confidence is ONLY high if a concrete outcome / milestone criteria is explicitly articulated,
  // NOT merely because title or details are long!
  const hasOutcome = hasConcreteOutcome(combinedText);
  const confidence: "medium" | "high" = hasOutcome ? "high" : "medium";
  const needsClarification = !hasOutcome;

  const suggestion: DailyResetVisionSuggestion = {
    sourceItemIds: [item.id],
    suggestedTitle: cleanTitle,
    desiredOutcome: item.details?.trim() || cleanTitle,
    reason: "Razrada strateške stavke iz Inboksa",
    confidence,
    needsClarification,
    ...(needsClarification
      ? { clarificationQuestion: "Koji je tačan merljivi ishod i prvi ključni korak za ovu viziju?" }
      : {}),
  };

  return {
    status: "eligible",
    eligible: true,
    confidence,
    suggestion,
  };
}

/**
 * AI assessment helper for items in needs_assessment.
 * Strictly produces a PROPOSAL ONLY and makes 0 Firestore writes.
 * In case of AI/parser failure, gracefully falls back to needs_assessment with low confidence.
 */
export async function assessInboxItemForVision(
  item: AppAInboxItem,
  aiService?: (prompt: string) => Promise<string>
): Promise<VisionEligibilityResult> {
  const initialEval = evaluateInboxVisionEligibility(item);
  if (initialEval.status === "ineligible" || initialEval.status === "eligible") {
    return initialEval;
  }

  // Needs assessment: invoke AI evaluator safely if provided
  if (!aiService) {
    return initialEval;
  }

  try {
    const prompt = `Assess if the following task is a transformative long-term vision or operational chore: "${item.title}". Context: "${item.details || ""}"`;
    const responseText = await aiService(prompt);
    
    // Parse response
    const parsed = JSON.parse(responseText);
    if (parsed.isLongTermVision && parsed.strategicDirection) {
      return {
        status: "eligible",
        eligible: true,
        confidence: parsed.hasConcreteMilestones ? "high" : "medium",
        suggestion: {
          sourceItemIds: [item.id],
          suggestedTitle: parsed.suggestedTitle || item.title,
          desiredOutcome: parsed.desiredOutcome || item.title,
          reason: "AI predlog: identifikovan strateški dugoročni pravac",
          confidence: parsed.hasConcreteMilestones ? "high" : "medium",
          needsClarification: !parsed.hasConcreteMilestones,
        },
      };
    }

    return {
      status: "ineligible",
      eligible: false,
      reason: "AI procena: stavka je operativne ili kratkoročne prirode.",
    };
  } catch {
    // Graceful error fallback: AI/parser error NEVER crashes and NEVER writes to Firestore
    return {
      status: "needs_assessment",
      eligible: false,
      confidence: "low",
      reason: "AI procena nije uspela. Stavka ostaje za ručno razjašnjenje.",
      suggestion: {
        sourceItemIds: [item.id],
        suggestedTitle: item.title,
        desiredOutcome: item.title,
        reason: "Neuspešna automatska procena — potrebno razjašnjenje",
        confidence: "medium",
        needsClarification: true,
        clarificationQuestion: "Koji je željeni dugoročni ishod za ovu stavku?",
      },
    };
  }
}
