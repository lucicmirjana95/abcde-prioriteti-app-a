export function createManualRoutineId(): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `r_manual_${random.slice(0, 48)}`;
}

export function computeRoutineStableHash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function createVisionOriginRoutineId(userId: string, visionId: string, fingerprint: string): string {
  const hash = computeRoutineStableHash(`${userId}\u0000${visionId}\u0000${fingerprint}`);
  return `r_vis_${hash}`;
}

export function createInboxOriginRoutineId(userId: string, inboxItemId: string, fingerprint: string): string {
  const hash = computeRoutineStableHash(`${userId}\u0000${inboxItemId}\u0000${fingerprint}`);
  return `r_in_${hash}`;
}

export function createRoutineMutationId(): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `mut_${random.slice(0, 32)}`;
}

export function createManualRoutineDraft(
  initial?: Partial<import("./contracts").SharedRoutine>,
): import("./contracts").SharedRoutine {
  const now = new Date().toISOString();
  return {
    id: createManualRoutineId(),
    mutationId: createRoutineMutationId(),
    title: "",
    fullAction: "",
    minimumAction: "",
    status: "active",
    activeFrom: now.split("T")[0],
    timeZone: "UTC",
    origin: { kind: "manual" },
    recurrence: { type: "daily" },
    language: "en",
    source: "user",
    sortOrder: Date.now(),
    goalRelationships: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    ...initial,
  };
}

