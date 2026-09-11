const fs = require('fs');
let code = fs.readFileSync('server/app-a/daily-reset/parseReevaluateResponse.ts', 'utf-8');

// Insert after: typeof plan.summaryOfChanges !== "string"
const insertionPoint = `  ) {
    return {
      success: false,
      code: "invalid_ai_response",
      error: "Plan must contain firstFocusItemIds, laterTodayItemIds, ifCapacityRemainsItemIds, deferredItemIds, and summaryOfChanges.",
      rejectionReason: "invalid_plan_structure",
    };
  }`;

const injection = `
  // A. Semantic Validation Check
  const rawEvals = (rawResponse as any)?.evaluations || [];
  for (const ev of rawEvals) {
    if (ev.estimatedMinutes !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI promeni estimatedMinutes", rejectionReason: "invented_field" };
    }
    if (ev.deadline !== undefined || ev.deadlineIso !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI doda deadline/deadlineIso koji nije postojao u korisničkom unosu", rejectionReason: "invented_field" };
    }
    if (ev.visionRelationship !== undefined || ev.goalRelationship !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI doda ili promeni Vision relationship/sourceId bez postojeće veze", rejectionReason: "invented_field" };
    }
    if (ev.title !== undefined || ev.content !== undefined || ev.originalText !== undefined) {
      return { success: false, code: "semantic_violation", error: "AI promeni naslov ili smisao zadatka u toku koji treba samo da menja prioritete", rejectionReason: "invented_field" };
    }
  }

  const allowedIds = new Set(context.unfinishedFlexibleItems.map(i => i.id));
  if (context.newImportantTask?.id) allowedIds.add(context.newImportantTask.id);

  const completedSet = new Set(context.completedItems.map(i => i.id));
  const fixedSet = new Set(context.fixedItems.map(i => i.id));

  const allOutputIdsList = [
    ...plan.firstFocusItemIds,
    ...plan.laterTodayItemIds,
    ...plan.ifCapacityRemainsItemIds,
    ...plan.deferredItemIds
  ];
  
  const idSet = new Set<string>();
  for (const id of allOutputIdsList) {
    if (idSet.has(id)) {
      return { success: false, code: "semantic_violation", error: \`isti ID postoji više puta: \${id}\`, rejectionReason: "duplicate_id" };
    }
    idSet.add(id);

    if (completedSet.has(id)) {
      return { success: false, code: "semantic_violation", error: \`completed stavka \${id} bude vraćena kao promenjena\`, rejectionReason: "completed_mutation" };
    }
    if (fixedSet.has(id)) {
      return { success: false, code: "semantic_violation", error: \`fixed stavka \${id} promeni blok, redosled u odnosu na svoju satnicu, vreme ili capacityType\`, rejectionReason: "fixed_mutation" };
    }
    if (!allowedIds.has(id)) {
      return { success: false, code: "semantic_violation", error: \`sourceItemId ne postoji: \${id}\`, rejectionReason: "unknown_id" };
    }
  }
  
  for (const ev of rawEvals) {
    if (ev.recommendedDisposition === "delegate" || ev.recommendedDisposition === "eliminate") {
        if (!idSet.has(ev.sourceItemId)) {
            return { success: false, code: "semantic_violation", error: "delegate/eliminate bude tretiran kao izvršen umesto predloga", rejectionReason: "unconfirmed_delegate_eliminate" };
        }
    }
    const origItem = context.unfinishedFlexibleItems.find(i => i.id === ev.sourceItemId);
    if (origItem && origItem.manualPriorityOverride) {
        const proposedBlock = ev.proposedBlock || "later_today";
        const originalBlock = origItem.block || "later_today";
        if (proposedBlock !== originalBlock && ev.conflictsWithManualOverride !== true) {
            return { success: false, code: "semantic_violation", error: "manual override konflikt nije eksplicitno označen", rejectionReason: "unmarked_manual_conflict" };
        }
    }
  }
`;

code = code.replace(insertionPoint, insertionPoint + '\n' + injection);
fs.writeFileSync('server/app-a/daily-reset/parseReevaluateResponse.ts', code);
