import React, { useState, useEffect } from "react";
import { DailyPlanDraft } from "../../domain/daily-reset/contracts";
import { PlanReevaluationDiff } from "../../screens/planReview";
import { buildProposedDraftFromServerResponse, StructuredReevaluationProposal } from "../../screens/planReview";
import { getLocalDateKeyInTimeZone } from "../../persistence/dailyPlanDocument";
import { loadAppAPreferences, getEffectiveTimeZone } from "../../settings/preferences";
import type { UnfinishedRolloverCandidate } from "../../domain/rollover/contracts";

interface Props {
  draft: DailyPlanDraft;
  language: string;
  localDate?: string;
  additionalCandidates?: UnfinishedRolloverCandidate[];
  onClose: () => void;
  onConfirm: (
    proposal: StructuredReevaluationProposal,
    modifications: {
      approvedDelegationIds: string[];
      approvedEliminationIds: string[];
      approvedManualOverrideIds: string[];
    }
  ) => void;
}

export function ReevaluationDialog({ draft, language, localDate, additionalCandidates, onClose, onConfirm }: Props) {
  const [step, setStep] = useState<"prompt" | "loading" | "diff">("prompt");
  const [energyInput, setEnergyInput] = useState<number>(
    (draft as any).dayEnergy || 3
  );
  const [pleasantnessInput, setPleasantnessInput] = useState<number>(
    (draft as any).dayPleasantness || 3
  );
  const [hasExistingValues] = useState<boolean>(
    (draft as any).dayEnergy !== undefined && (draft as any).dayPleasantness !== undefined
  );
  const [wantsToChange, setWantsToChange] = useState<boolean>(!hasExistingValues);

  const [reevalError, setReevalError] = useState<string | null>(null);
  const [reevalProposal, setReevalProposal] = useState<StructuredReevaluationProposal | null>(null);
  
  const [selectedDelegations, setSelectedDelegations] = useState<Record<string, boolean>>({});
  const [selectedEliminations, setSelectedEliminations] = useState<Record<string, boolean>>({});
  const [selectedManualOverrides, setSelectedManualOverrides] = useState<Record<string, boolean>>({});

  const t = {
    cancel: language === "sr" ? "Otkaži" : language === "tr" ? "İptal" : "Cancel",
    confirm: language === "sr" ? "Primeni dozvoljene promene" : language === "tr" ? "Izın verilen değişiklikleri uygula" : "Apply allowed changes",
  };

  const executeReevaluate = async (energy: number, pleasantness: number) => {
    setStep("loading");
    setReevalError(null);
    try {
      const effectiveTimeZone = getEffectiveTimeZone(loadAppAPreferences());
      const requestLocalDate = localDate || (draft as any).localDate || getLocalDateKeyInTimeZone(effectiveTimeZone);

      const rolloverPlanItems = (additionalCandidates || []).map((c) => ({
        id: `rollover_plan_${c.sourceLocalDate}_${c.id}`,
        sourceItemIds: [c.id],
        title: c.title,
        block: "later_today" as const,
        estimatedMinutes: c.estimatedMinutes,
        requiredEnergy: c.requiredEnergy,
        timeSensitivity: c.timeSensitivity,
        capacityType: "flexible" as const,
        priority: c.priority,
        needsCheck: false,
      }));

      const activeDraft: DailyPlanDraft = rolloverPlanItems.length > 0
        ? {
            ...draft,
            laterToday: [...draft.laterToday, ...rolloverPlanItems],
            classifiedItems: [
              ...draft.classifiedItems,
              ...rolloverPlanItems.map((r) => ({
                id: r.id,
                originalText: r.title,
                kind: "task" as const,
                timeHorizon: "today" as const,
                estimatedMinutes: r.estimatedMinutes,
                timeSensitivity: r.timeSensitivity,
                isAmbiguous: false,
                needsCheck: false,
                priority: r.priority,
              })),
            ],
          }
        : draft;

      const response = await fetch("/api/app-a/daily-reset/reevaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "reevaluate",
          draft: activeDraft,
          energy,
          pleasantness,
          language,
          localDate: requestLocalDate,
          availableMinutes: activeDraft.availableMinutes,
        }),
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setReevalError(data.error || "Failed to re-evaluate priorities.");
        setStep("prompt");
        return;
      }
      
      const proposal = data.proposal;
      const diff = data.diff as PlanReevaluationDiff;
      
      const proposedDraft = buildProposedDraftFromServerResponse(activeDraft, proposal.plan, proposal.evaluations);
      
      const lockedItemIds = [
        ...activeDraft.firstFocus.filter(i => i.capacityType === "fixed").map(i => i.id),
        ...activeDraft.laterToday.filter(i => i.capacityType === "fixed").map(i => i.id),
        ...activeDraft.ifCapacityRemains.filter(i => i.capacityType === "fixed").map(i => i.id),
      ];

      setReevalProposal({
        proposedDraft,
        diff,
        lockedItemIds
      });

      const initDel: Record<string, boolean> = {};
      diff.proposedDelegations?.forEach((d: any) => { initDel[d.id] = false; });
      setSelectedDelegations(initDel);

      const initElim: Record<string, boolean> = {};
      diff.proposedEliminations?.forEach((e: any) => { initElim[e.id] = false; });
      setSelectedEliminations(initElim);

      const initOverrides: Record<string, boolean> = {};
      diff.manualOverrideConflicts?.forEach((c: any) => { initOverrides[c.id] = false; });
      setSelectedManualOverrides(initOverrides);

      setStep("diff");
    } catch (err: any) {
      setReevalError(err.message || "Network error. Please try again.");
      setStep("prompt");
    }
  };

  const handleConfirm = () => {
    if (!reevalProposal) return;
    onConfirm(reevalProposal, {
      approvedDelegationIds: Object.keys(selectedDelegations).filter(id => selectedDelegations[id]),
      approvedEliminationIds: Object.keys(selectedEliminations).filter(id => selectedEliminations[id]),
      approvedManualOverrideIds: Object.keys(selectedManualOverrides).filter(id => selectedManualOverrides[id])
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {step === "prompt" && (
        <div className="app-a-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl">
          <h3 className="mb-2 text-xl font-bold tracking-tight text-black dark:text-white">
            {language === "sr" ? "Tvoje stanje danas" : language === "tr" ? "Bugünkü durumunuz" : "Your state today"}
          </h3>
          <p className="mb-4 text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]">
            {language === "sr" ? "Kako se osećaš? Ovo pomaže AI da prilagodi obim posla." : language === "tr" ? "Nasıl hissediyorsunuz? Bu yapay zekanın iş yükünü ayarlamasına yardımcı olur." : "How are you feeling? This helps AI adjust the workload."}
          </p>
          
          {hasExistingValues && !wantsToChange ? (
            <div className="mb-6">
              <p className="text-[14px] text-black/80 dark:text-white/80 mb-3">
                {language === "sr" ? "Da li se tvoje stanje promenilo?" : "Has your state changed?"}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => executeReevaluate(energyInput, pleasantnessInput)}
                  className="app-a-primary-button min-h-[44px] rounded-xl px-5 text-[14px] font-semibold"
                >
                  {language === "sr" ? "Nije se promenilo" : "Not changed"}
                </button>
                <button
                  type="button"
                  onClick={() => setWantsToChange(true)}
                  className="app-a-secondary-button min-h-[44px] rounded-xl px-5 text-[14px] font-semibold"
                >
                  {language === "sr" ? "Promeni" : "Change"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-black/70 dark:text-white/70 mb-1">
                  {language === "sr" ? "Nivo energije (1-5)" : language === "tr" ? "Enerji seviyesi (1-5)" : "Energy level (1-5)"}
                </label>
                <input type="range" min="1" max="5" value={energyInput} onChange={(e) => setEnergyInput(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-[11px] text-[#6E6E73] mt-1">
                  <span>{language === "sr" ? "Niska" : "Low"}</span>
                  <span>{language === "sr" ? "Visoka" : "High"}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[13px] font-medium text-black/70 dark:text-white/70 mb-1">
                  {language === "sr" ? "Raspoloženje (1-5)" : language === "tr" ? "Mod (1-5)" : "Mood (1-5)"}
                </label>
                <input type="range" min="1" max="5" value={pleasantnessInput} onChange={(e) => setPleasantnessInput(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-[11px] text-[#6E6E73] mt-1">
                  <span>{language === "sr" ? "Loše" : "Bad"}</span>
                  <span>{language === "sr" ? "Sjajno" : "Great"}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="app-a-secondary-button min-h-[44px] rounded-xl px-5 text-[14px] font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => executeReevaluate(energyInput, pleasantnessInput)}
                  className="app-a-primary-button min-h-[44px] rounded-xl px-5 text-[14px] font-semibold"
                >
                  {language === "sr" ? "Preispitaj uz AI" : "Re-evaluate with AI"}
                </button>
              </div>
            </>
          )}
          {reevalError && (
            <div className="mt-4 text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 p-2 rounded-lg">
              {reevalError}
            </div>
          )}
        </div>
      )}
      
      {step === "loading" && (
        <div className="app-a-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-[#0071E3] dark:border-white/10 dark:border-t-[#0A84FF]"></div>
          <p className="mt-4 text-[15px] font-medium text-black dark:text-white">
            {language === "sr" ? "Analiza..." : "Analyzing..."}
          </p>
        </div>
      )}

      {step === "diff" && reevalProposal && (
        <div className="app-a-surface flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl shadow-2xl">
          <div className="flex shrink-0 justify-between items-center p-5 border-b border-black/5 dark:border-white/5">
            <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">
              {language === "sr" ? "Predlog nove prioritizacije" : language === "tr" ? "Yeni önceliklendirme önerisi" : "Proposed Reprioritization"}
            </h3>
            <button onClick={onClose} className="text-[#8E8E93] hover:text-black dark:hover:text-white text-[20px]">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-4 text-[14px] text-black/70 dark:text-white/70">
              {reevalProposal.diff.summary}
            </p>

            <div className="space-y-4">
              {/* Manual Override Conflicts */}
              {reevalProposal.diff.manualOverrideConflicts && reevalProposal.diff.manualOverrideConflicts.length > 0 && (
                <div className="border-t border-black/5 dark:border-white/5 pt-3">
                  <h4 className="font-semibold text-black dark:text-white mb-1.5 text-[#0071E3]">
                    {language === "sr" ? "Konflikti sa ručnim rasporedom:" : language === "tr" ? "Manuel sıralama çakışmaları:" : "Manual override conflicts:"}
                  </h4>
                  <p className="mb-2 text-[12px] text-black/60 dark:text-white/60">
                    {language === "sr" ? "Izaberite da li prihvatate predlog veštačke inteligencije umesto vašeg." : "Choose whether to accept the AI proposal over your manual placement."}
                  </p>
                  <div className="space-y-3 pl-1">
                    {reevalProposal.diff.manualOverrideConflicts.map((conflict) => (
                      <label key={conflict.id} className="flex items-start gap-2 cursor-pointer bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">
                        <input
                          type="checkbox"
                          checked={!!selectedManualOverrides[conflict.id]}
                          onChange={(e) => setSelectedManualOverrides({ ...selectedManualOverrides, [conflict.id]: e.target.checked })}
                          className="mt-1 rounded border-gray-400"
                        />
                        <div className="text-[12px] text-black/80 dark:text-white/80 flex-1">
                          <strong className="block text-black dark:text-white">{conflict.title}</strong>
                          <span className="block mt-0.5 text-black/60 dark:text-white/60">
                            {conflict.previousBlock.replace("_", " ")} → {conflict.proposedBlock.replace("_", " ")}
                          </span>
                          <span className="block mt-1 text-[#0071E3]/80 italic">"{conflict.reason}"</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed delegations (D) */}
              {reevalProposal.diff.proposedDelegations.length > 0 && (
                <div className="border-t border-black/5 dark:border-white/5 pt-3">
                  <h4 className="font-semibold text-black dark:text-white mb-1.5">
                    {language === "sr" ? "Predloženo za delegiranje (D):" : language === "tr" ? "Delegasyon için önerilen (D):" : "Proposed for delegation (D):"}
                  </h4>
                  <div className="space-y-3 pl-1">
                    {reevalProposal.diff.proposedDelegations.map((del) => (
                      <label key={del.id} className="flex items-start gap-2 cursor-pointer bg-[#34C759]/5 p-2 rounded-lg border border-[#34C759]/20">
                        <input
                          type="checkbox"
                          checked={!!selectedDelegations[del.id]}
                          onChange={(e) => setSelectedDelegations({ ...selectedDelegations, [del.id]: e.target.checked })}
                          className="mt-1 rounded border-gray-400"
                        />
                        <div className="text-[12px] text-black/80 dark:text-white/80 flex-1">
                          <strong className="block text-black dark:text-white">{del.title}</strong>
                          <span className="block mt-0.5 text-black/60 dark:text-white/60">{del.explanation}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed eliminations (E) */}
              {reevalProposal.diff.proposedEliminations.length > 0 && (
                <div className="border-t border-black/5 dark:border-white/5 pt-3">
                  <h4 className="font-semibold text-black dark:text-white mb-1.5">
                    {language === "sr" ? "Predloženo za eliminaciju (E):" : language === "tr" ? "Eleme için önerilen (E):" : "Proposed for elimination (E):"}
                  </h4>
                  <div className="space-y-3 pl-1">
                    {reevalProposal.diff.proposedEliminations.map((el) => (
                      <label key={el.id} className="flex items-start gap-2 cursor-pointer bg-[#FF3B30]/5 p-2 rounded-lg border border-[#FF3B30]/20">
                        <input
                          type="checkbox"
                          checked={!!selectedEliminations[el.id]}
                          onChange={(e) => setSelectedEliminations({ ...selectedEliminations, [el.id]: e.target.checked })}
                          className="mt-1 rounded border-gray-400"
                        />
                        <div className="text-[12px] text-black/80 dark:text-white/80 flex-1">
                          <strong className="block text-black dark:text-white">{el.title}</strong>
                          <span className="block mt-0.5 text-black/60 dark:text-white/60">{el.explanation}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-3 p-5 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="app-a-secondary-button min-h-[44px] rounded-xl px-5 text-[14px] font-semibold"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="app-a-primary-button min-h-[44px] rounded-xl px-5 text-[14px] font-semibold"
            >
              {t.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
