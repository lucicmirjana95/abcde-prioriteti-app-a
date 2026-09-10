import type { DailyPlanDraft, DailyPlanItem } from "./contracts";

/**
 * Extracts explicit time in minutes from midnight (0..1439).
 * Returns null if no explicit time is specified.
 * Strictly adheres to non-hallucination: NEVER invents or guesses a time.
 */
export function extractExplicitTimeMinutes(item: {
  deadlineText?: string;
  deadlineIso?: string;
  title?: string;
  description?: string;
}): number | null {
  // 1. Check deadlineIso (e.g. 2026-09-10T14:30:00Z or 2026-09-10T15:00:00)
  if (item.deadlineIso) {
    const isoMatch = item.deadlineIso.match(/T(\d{1,2}):(\d{2})/);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1], 10);
      const minutes = parseInt(isoMatch[2], 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return hours * 60 + minutes;
      }
    }
  }

  // 2. Check deadlineText (e.g. "14:30", "14:30h", "15:00", "2:30 pm", "9:00 am")
  if (item.deadlineText) {
    const parsed = parseTimeString(item.deadlineText);
    if (parsed !== null) return parsed;
  }

  // 3. Check title or description for explicit time indicators (e.g. "u 15:00", "at 14:30", "15:00 - sastanak")
  const text = `${item.title || ""} ${item.description || ""}`;
  const textTime = parseExplicitTimeFromText(text);
  if (textTime !== null) return textTime;

  return null;
}

function parseTimeString(str: string): number | null {
  const s = str.trim().toLowerCase();
  // 24-hour match: 14:30, 14:30h, 09:00, 15:00
  const m24 = s.match(/(?:^|\b)(\d{1,2}):(\d{2})\s*(?:h|sati|časova)?(?:\b|$)/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const m = parseInt(m24[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
  }
  // 12-hour match: 2:30 pm, 3 pm, 10 am
  const m12 = s.match(/(?:^|\b)(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\b|$)/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = m12[2] ? parseInt(m12[2], 10) : 0;
    const isPm = m12[3] === "pm";
    if (h >= 1 && h <= 12 && m >= 0 && m < 60) {
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return h * 60 + m;
    }
  }
  return null;
}

function parseExplicitTimeFromText(text: string): number | null {
  // Matches explicit markers like "u 15:00", "at 14:30", "15:00 - sastanak", "pregled u 10:00"
  const markerMatch = text.match(/(?:(?:u|at|around|oko|od|sa početkom u)\s+|^)(\d{1,2}):(\d{2})(?:\s*(?:h|sati|am|pm))?/i);
  if (markerMatch) {
    return parseTimeString(markerMatch[0]);
  }
  return null;
}

/**
 * Detects if a task is waiting on external input/third parties (e.g. "čeka tuđe cene", "waiting for vendor prices").
 */
export function isWaitingOnExternalDependency(item: {
  title?: string;
  description?: string;
  reasoning?: string;
}): boolean {
  const combined = `${item.title || ""} ${item.description || ""} ${item.reasoning || ""}`.toLowerCase();
  return /(?:čeka(?:m)?\s+(?:tu[dđ]e\s+)?cene|waiting\s+for\s+(?:vendor\s+|others?\s+)?prices?|čeka\s+odgovor|waiting\s+(?:on|for)\s+(?:reply|response|pricing)|pending\s+(?:pricing|quote|approval|feedback)|bekliyor)/i.test(
    combined
  );
}

/**
 * Checks if itemB explicitly states a relative dependency after itemA (e.g. "odmor odmah posle pregleda").
 */
export function statesDependencyAfter(itemB: DailyPlanItem, itemA: DailyPlanItem): boolean {
  const textB = `${itemB.title} ${itemB.description || ""} ${itemB.reasoning || ""}`.toLowerCase();
  const textA = itemA.title.toLowerCase();

  // Check for phrases like "posle <keyword>", "after <keyword>", "nakon <keyword>", "odmah posle <keyword>"
  const afterPattern = /(?:odmah\s+posle|posle|nakon|after|immediately\s+after|ardından)\s+([^.,;!?]+)/i;
  const match = textB.match(afterPattern);
  if (!match) return false;

  const targetPhrase = match[1].trim().toLowerCase();
  const keywords = targetPhrase.split(/\s+/).filter((w) => w.length >= 3);
  for (const kw of keywords) {
    const root = kw.replace(/(?:a|e|u|om|ima|om|ing)$/g, "");
    if (root.length >= 3 && textA.includes(root)) {
      return true;
    }
  }
  return false;
}

/**
 * Conservatively normalizes the chronological order of plan items:
 * - Items with explicit times (e.g. 14:30 vs 15:00) are ordered chronologically.
 * - Stated before/after dependencies (e.g. "odmor odmah posle pregleda") are honored.
 * - Items waiting on third parties without reliable times are marked needsCheck=true without inventing fake times.
 * - Items with unknown times retain order without false precision.
 * - Completed items are NEVER moved.
 * - Fixed commitments retain their capacityType: "fixed" and are never modified.
 */
export function normalizeChronologicalOrder<T extends DailyPlanItem>(
  items: T[],
  completedIds?: string[]
): T[] {
  if (items.length <= 1) {
    return items.map((item) => {
      if (isWaitingOnExternalDependency(item) && extractExplicitTimeMinutes(item) === null) {
        return { ...item, needsCheck: true };
      }
      return item;
    });
  }

  const completedSet = new Set(completedIds || []);

  // Mark waiting items without explicit time with needsCheck: true
  const preparedItems = items.map((item) => {
    if (isWaitingOnExternalDependency(item) && extractExplicitTimeMinutes(item) === null) {
      return { ...item, needsCheck: true };
    }
    return item;
  });

  // Extract uncompleted items with their original relative index
  const uncompleted = preparedItems
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => !completedSet.has(item.id));

  // Sort uncompleted items
  uncompleted.sort((a, b) => {
    const timeA = extractExplicitTimeMinutes(a.item);
    const timeB = extractExplicitTimeMinutes(b.item);

    // If both have explicit times:
    if (timeA !== null && timeB !== null) {
      if (timeA !== timeB) return timeA - timeB;
    }

    // Check stated dependencies
    // If b states dependency after a ("b after a"): a should come before b
    if (statesDependencyAfter(b.item, a.item)) {
      return -1;
    }
    // If a states dependency after b ("a after b"): b should come before a
    if (statesDependencyAfter(a.item, b.item)) {
      return 1;
    }

    // Otherwise preserve original relative ordering
    return a.originalIndex - b.originalIndex;
  });

  // Re-check for immediate after placement (e.g. "odmor odmah posle pregleda"):
  // If item B states "odmah posle" item A, ensure B is placed directly following A
  for (let i = 0; i < uncompleted.length; i++) {
    const current = uncompleted[i];
    const isImmediate = /(?:odmah\s+posle|immediately\s+after)/i.test(
      `${current.item.title} ${current.item.description || ""}`
    );
    if (isImmediate) {
      const targetIndex = uncompleted.findIndex((other) => statesDependencyAfter(current.item, other.item));
      if (targetIndex !== -1 && targetIndex < i) {
        const [moved] = uncompleted.splice(i, 1);
        uncompleted.splice(targetIndex + 1, 0, moved);
      }
    }
  }

  // Reconstruct result array preserving completed items in their original exact indices
  let uncompletedIdx = 0;
  const result: T[] = [];
  for (let i = 0; i < preparedItems.length; i++) {
    const item = preparedItems[i];
    if (completedSet.has(item.id)) {
      result.push(item);
    } else {
      result.push(uncompleted[uncompletedIdx++].item);
    }
  }

  return result;
}

/**
 * Normalizes chronological order for a DailyPlanDraft without moving items between blocks
 * or altering capacityType (fixed commitments stay fixed in their blocks).
 */
export function normalizePlanDraftChronology(
  draft: DailyPlanDraft,
  completedIds?: string[]
): DailyPlanDraft {
  return {
    ...draft,
    firstFocus: normalizeChronologicalOrder(draft.firstFocus, completedIds),
    laterToday: normalizeChronologicalOrder(draft.laterToday, completedIds),
    ifCapacityRemains: normalizeChronologicalOrder(draft.ifCapacityRemains, completedIds),
  };
}
