const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.ts', 'utf-8');

// 1. In movePlanItem, prevent moving fixed items, and exclude fixed items from first_focus limit.
code = code.replace(
  'if (targetBlock === "first_focus" && draft.firstFocus.length >= 3) {',
  'if (foundItem.capacityType === "fixed") return { draft, error: "cannot_move_fixed_task" };\n  if (targetBlock === "first_focus" && draft.firstFocus.filter(i => i.capacityType !== "fixed").length >= 3) {'
);

// 2. In reorderPlanItem, prevent reordering fixed items.
code = code.replace(
  '// Remove from source block',
  'if (targetArray[sourceIndex].capacityType === "fixed") return { draft, error: "cannot_move_fixed_task" };\n  // Remove from source block'
);

// 3. In applyReevaluationProposal, revalidate invariants before returning.
const applyCode = `
    const newDraft = recalculatePlanTotals({
      ...draft,
      manualPriorityOverride: false,
    });

    const firstFocusFlexibleCount = newDraft.firstFocus.filter(i => i.capacityType !== "fixed").length;
    if (firstFocusFlexibleCount > 3) {
      return { error: "First Focus ne može imati više od 3 fleksibilna zadatka nakon parcijalnog izbora." } as any;
    }
    
    // Check dependency violations
    const blockRank: Record<string, number> = {
      first_focus: 0,
      later_today: 1,
      if_capacity_remains: 2,
      deferred: 3,
    };
    const itemBlockAndIndex = new Map<string, { block: string; rank: number; index: number }>();
    newDraft.firstFocus.forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "first_focus", rank: 0, index: idx }));
    newDraft.laterToday.forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "later_today", rank: 1, index: idx }));
    newDraft.ifCapacityRemains.forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "if_capacity_remains", rank: 2, index: idx }));
    (newDraft.deferredItems || []).forEach((i, idx) => itemBlockAndIndex.set(i.id, { block: "deferred", rank: 3, index: idx }));

    for (const block of [newDraft.firstFocus, newDraft.laterToday, newDraft.ifCapacityRemains, newDraft.deferredItems || []]) {
      for (const item of block) {
        if (item.dependsOnItemIds && item.dependsOnItemIds.length > 0) {
          const posA = itemBlockAndIndex.get(item.id);
          if (!posA) continue;
          for (const depId of item.dependsOnItemIds) {
            const posB = itemBlockAndIndex.get(depId);
            if (posB) {
              if (posA.rank < posB.rank || (posA.rank === posB.rank && posA.index <= posB.index)) {
                return { error: \`Zavisnost prekršena: "\${item.title}" mora biti nakon svog preduslova.\` } as any;
              }
            }
          }
        }
      }
    }
    
    return newDraft;
  }
`;

code = code.replace(
  'return recalculatePlanTotals({\n    ...draft,\n    manualPriorityOverride: false,\n  });\n}',
  applyCode
);

fs.writeFileSync('src/app-a/screens/planReview.ts', code);
