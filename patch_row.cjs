const fs = require('fs');
let code = fs.readFileSync('src/app-a/components/daily-reset/DailyPlanItemRow.tsx', 'utf-8');

// We want to add these buttons inside the action menu
const menuContent = `
              {onReorder && item.capacityType !== "fixed" && (
                <>
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => {
                      setShowMenu(false);
                      onReorder(item.id, "up");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors disabled:opacity-50"
                    style={{ color: "var(--app-a-text)" }}
                  >
                    {language === "sr" ? "Premesti ranije" : language === "tr" ? "Daha erkene taşı" : "Move earlier"}
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => {
                      setShowMenu(false);
                      onReorder(item.id, "down");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors disabled:opacity-50"
                    style={{ color: "var(--app-a-text)" }}
                  >
                    {language === "sr" ? "Premesti kasnije" : language === "tr" ? "Daha sonraya taşı" : "Move later"}
                  </button>
                  <hr className="my-1 border-t border-black/5 dark:border-white/5" />
                </>
              )}
`;

if (!code.includes("Premesti ranije")) {
  code = code.replace(
    '{item.block !== "first_focus" && (',
    menuContent + '\n              {item.block !== "first_focus" && ('
  );
  
  // also rename the labels to match the prompt
  // "moveToFirstFocus" -> "Postavi kao sledeće"
  code = code.replace('{t.moveToFirstFocus}', '{language === "sr" ? "Postavi kao sledeće" : t.moveToFirstFocus}');
  code = code.replace('{t.moveToIfCapacityRemains}', '{language === "sr" ? "Ako ostane kapaciteta" : t.moveToIfCapacityRemains}');
  
  fs.writeFileSync('src/app-a/components/daily-reset/DailyPlanItemRow.tsx', code);
  console.log("Patched DailyPlanItemRow");
}
