import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";

export function getLocalDateInTimeZone(date: Date, timeZone: string): string {
  return getLocalDateKeyInTimeZone(timeZone, date);
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

