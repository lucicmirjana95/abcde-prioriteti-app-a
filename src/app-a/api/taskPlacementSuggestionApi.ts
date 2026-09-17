import type { AppALanguage } from "../types";
import { appAAuthHeaders } from "./authHeaders";

export interface TaskPlacementContext {
  taskTitle: string;
  language: AppALanguage;
  energy?: number;
  pleasantness?: number;
  availableMinutes?: number;
  plannedFlexibleMinutes?: number;
  firstFocusCount?: number;
  activeVisions?: Array<{ id: string; title: string }>;
}

export interface TaskPlacementSuggestion {
  suggestedBlock: "first_focus" | "later_today" | "if_capacity_remains" | "inbox";
  suggestedMinutes: number;
  capacityType: "flexible" | "fixed";
  reconsiderPriorities: boolean;
  linkedVisionId?: string;
  linkedVisionTitle?: string;
  reasoning: string;
}

const FIXED_KEYWORDS = [
  "sastanak",
  "termin",
  "poziv u",
  "poziv sa",
  "poziv za",
  "zoom",
  "lekar",
  "doktor",
  "pregled",
  "meeting",
  "call at",
  "call with",
  "appointment",
  "doctor",
  "toplantı",
  "randevu",
];

export function computeLocalTaskPlacementSuggestion(context: TaskPlacementContext): TaskPlacementSuggestion {
  const {
    taskTitle,
    language,
    energy = 3,
    availableMinutes = 240,
    plannedFlexibleMinutes = 0,
    firstFocusCount = 0,
    activeVisions = [],
  } = context;

  const titleLower = taskTitle.toLowerCase();
  const isFixed = FIXED_KEYWORDS.some((kw) => titleLower.includes(kw));
  const remainingMinutes = Math.max(0, availableMinutes - plannedFlexibleMinutes);

  // Extract explicit duration from text (e.g. "15 min", "30m", "45 minuta", "1h")
  let extractedMinutes: number | null = null;
  const hourMatch = titleLower.match(/(\d+)\s*(h|sat|sati|saat)/);
  if (hourMatch) {
    extractedMinutes = parseInt(hourMatch[1], 10) * 60;
  } else {
    const minMatch = titleLower.match(/(\d+)\s*(m|min|minuta|dakika)/);
    if (minMatch) {
      extractedMinutes = parseInt(minMatch[1], 10);
    }
  }

  let suggestedMinutes = extractedMinutes || (energy <= 2 ? 15 : 25);
  if (suggestedMinutes > 180) suggestedMinutes = 180;
  if (suggestedMinutes < 5) suggestedMinutes = 5;

  // Match with active visions
  let linkedVisionId: string | undefined;
  let linkedVisionTitle: string | undefined;

  for (const vision of activeVisions) {
    const visionWords = vision.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const hasMatch = visionWords.some((w) => titleLower.includes(w));
    if (hasMatch) {
      linkedVisionId = vision.id;
      linkedVisionTitle = vision.title;
      break;
    }
  }

  let suggestedBlock: TaskPlacementSuggestion["suggestedBlock"] = "later_today";
  let reconsiderPriorities = false;
  let reasoning = "";

  if (isFixed) {
    suggestedBlock = "later_today";
    if (language === "sr") {
      reasoning = "Prepoznato kao fiksna obaveza ili termin — ne troši vaš fleksibilni budžet za zadatke.";
    } else if (language === "tr") {
      reasoning = "Sabit bir randevu veya yükümlülük olarak algılandı — esnek görev bütçenizi tüketmez.";
    } else {
      reasoning = "Identified as a fixed appointment — it stays separate from your flexible focus budget.";
    }
  } else if (remainingMinutes <= 0) {
    suggestedBlock = "inbox";
    if (language === "sr") {
      reasoning = "Današnji fleksibilni kapacitet je već popunjen. Najbolje je sačuvati u Inboks kako biste zaštitili fokus.";
    } else if (language === "tr") {
      reasoning = "Bugünkü esnek zaman kapasiteniz dolu. Odaklanmanızı korumak için Gelen Kutusuna kaydetmeniz önerilir.";
    } else {
      reasoning = "Today’s flexible capacity is already full. Saving to Inbox protects your existing priorities.";
    }
  } else if (firstFocusCount < 3 && energy >= 3 && remainingMinutes >= suggestedMinutes && linkedVisionId) {
    suggestedBlock = "first_focus";
    reconsiderPriorities = true;
    if (language === "sr") {
      reasoning = `Povezano sa vašom vizijom "${linkedVisionTitle}" i imate dovoljno energije — idealno za Prvi fokus dana.`;
    } else if (language === "tr") {
      reasoning = `"${linkedVisionTitle}" vizyonunuzla bağlantılı ve enerjiniz uygun — günün İlk Odağı için ideal.`;
    } else {
      reasoning = `Directly connects to your vision "${linkedVisionTitle}" with steady energy — strong candidate for First Focus.`;
    }
  } else if (firstFocusCount >= 3) {
    suggestedBlock = remainingMinutes >= suggestedMinutes ? "later_today" : "if_capacity_remains";
    if (language === "sr") {
      reasoning = `Prvi fokus već ima 3 ključna prioriteta. Predlažemo blok "${suggestedBlock === "later_today" ? "Kasnije danas" : "Ako ostane vremena"}" (${suggestedMinutes} min).`;
    } else if (language === "tr") {
      reasoning = `İlk Odak zaten 3 ana görevi içeriyor. "${suggestedBlock === "later_today" ? "Bugünün ilerisi" : "Zaman kalırsa"}" bölümü önerilir (${suggestedMinutes} dk).`;
    } else {
      reasoning = `First Focus already holds 3 core priorities. Placed in "${suggestedBlock === "later_today" ? "Later today" : "If capacity remains"}" (${suggestedMinutes} min).`;
    }
  } else if (energy <= 2) {
    suggestedBlock = "if_capacity_remains";
    suggestedMinutes = Math.min(suggestedMinutes, 15);
    if (language === "sr") {
      reasoning = `Pošto vam je energija niža, predlažemo lagan korak od ${suggestedMinutes} min u bloku "Ako ostane vremena", bez pritiska.`;
    } else if (language === "tr") {
      reasoning = `Düşük enerji seviyeniz göz önüne alınarak, baskı oluşturmadan "Zaman kalırsa" bölümünde ${suggestedMinutes} dk önerildi.`;
    } else {
      reasoning = `Since energy is lower, keeping it light at ${suggestedMinutes} min under "If capacity remains" avoids overwhelm.`;
    }
  } else {
    suggestedBlock = "later_today";
    if (language === "sr") {
      reasoning = `Preostalo je ${remainingMinutes} min fleksibilnog vremena — predlažemo ${suggestedMinutes} min u bloku "Kasnije danas".`;
    } else if (language === "tr") {
      reasoning = `${remainingMinutes} dk esnek zamanınız var — "Bugünün ilerisi" bölümünde ${suggestedMinutes} dk önerilir.`;
    } else {
      reasoning = `With ${remainingMinutes} min flexible time remaining, ${suggestedMinutes} min in "Later today" fits comfortably.`;
    }
  }

  return {
    suggestedBlock,
    suggestedMinutes,
    capacityType: isFixed ? "fixed" : "flexible",
    reconsiderPriorities,
    linkedVisionId,
    linkedVisionTitle,
    reasoning,
  };
}

export async function suggestTaskPlacement(
  context: TaskPlacementContext,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<TaskPlacementSuggestion> {
  const cleanTitle = context.taskTitle.trim();
  if (!cleanTitle) {
    return computeLocalTaskPlacementSuggestion(context);
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 7000);

  try {
    const fetchFn = options.fetchImpl || globalThis.fetch;
    const authHeaders = await appAAuthHeaders();
    const response = await fetchFn("/api/app-a/suggest-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        taskTitle: cleanTitle,
        language: context.language,
        energy: context.energy,
        pleasantness: context.pleasantness,
        availableMinutes: context.availableMinutes,
        plannedFlexibleMinutes: context.plannedFlexibleMinutes,
        firstFocusCount: context.firstFocusCount,
        activeVisions: context.activeVisions,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return computeLocalTaskPlacementSuggestion(context);
    }

    const body = await response.json().catch(() => null);
    if (!body || !body.success || !body.suggestion) {
      return computeLocalTaskPlacementSuggestion(context);
    }

    const s = body.suggestion;
    const validBlock = ["first_focus", "later_today", "if_capacity_remains", "inbox"].includes(s.suggestedBlock)
      ? s.suggestedBlock
      : "later_today";
    const minutes = Number.isInteger(s.suggestedMinutes) && s.suggestedMinutes >= 5 && s.suggestedMinutes <= 1440
      ? s.suggestedMinutes
      : 25;
    const capacityType = s.capacityType === "fixed" ? "fixed" : "flexible";
    const reasoning = typeof s.reasoning === "string" && s.reasoning.trim()
      ? s.reasoning.trim()
      : computeLocalTaskPlacementSuggestion(context).reasoning;

    return {
      suggestedBlock: validBlock,
      suggestedMinutes: minutes,
      capacityType,
      reconsiderPriorities: Boolean(s.reconsiderPriorities),
      linkedVisionId: s.linkedVisionId || undefined,
      linkedVisionTitle: s.linkedVisionTitle || undefined,
      reasoning,
    };
  } catch {
    return computeLocalTaskPlacementSuggestion(context);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
