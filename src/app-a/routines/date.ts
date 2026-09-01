export function getLocalDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getPastLocalDates(endLocalDate: string, count: number): string[] {
  const [year, month, day] = endLocalDate.split("-").map(Number);
  const dates: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1, day - offset));
    dates.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return dates;
}

