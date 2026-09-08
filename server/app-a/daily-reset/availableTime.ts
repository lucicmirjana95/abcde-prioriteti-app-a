// Deliberately narrow: a task duration or a clock deadline is not a day budget.
// Ambiguous text remains unknown; the review screen lets the user confirm it.
export function explicitAvailableMinutes(text: string): number | undefined {
  const normalized = text.toLocaleLowerCase().replace(/\b(one|two|three|four)\b/g, word => ({ one: '1', two: '2', three: '3', four: '4' })[word]!);
  const patterns = [
    /\bi have\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\s*(?:available|free|today|for (?:these tasks|my plan)|(?=[.!?\n]|$))/g,
    /\b(?:imam|raspolažem sa|raspolazem sa)\s+(\d+)\s*(minuta|minut|sata|sat|sati)\s*(?:danas|slobodno|vremena|na raspolaganju|(?=[.!?\n]|$))/g,
    /(?:bugün|bugun)\s+(\d+)\s*(dakika|saat)\s*(?:vaktim|zamanım|zamanim|ayırabilirim|ayirabilirim)/g,
  ];
  const values = patterns.flatMap(pattern => [...normalized.matchAll(pattern)].map(match => Number(match[1]) * (/^(hour|hr|sat|saat)/.test(match[2]) ? 60 : 1)));
  const unique = [...new Set(values)];
  return unique.length === 1 && unique[0] > 0 && unique[0] <= 1440 ? unique[0] : undefined;
}
