import { useEffect, useState } from "react";
import { ArrowUp, CalendarPlus, Check, ChevronDown, Clock3, Compass, Pencil, X } from "lucide-react";
import type { AppALanguage } from "../../types";
import { estimateVisionStepMinutes, shouldSurfaceSecondaryVision, type TodayCandidate } from "../../../shared/domain/today-candidates";
import { dismissTodayCandidate, ensurePendingVisionCandidates, loadPendingTodayCandidatesContext } from "../../../shared/persistence/today-candidates";

export type TodayPlanState = "none" | "draft" | "confirmed";

const COPY = {
  en: {
    title: "Actions from Vision",
    intro: "Suggested next steps from your active goals. You decide what to add today.",
    add: "Add to today’s plan",
    createPlan: "Create today’s plan",
    reviewPlan: "Review and save today’s plan",
    noPlan: "Create today’s plan to add this step.",
    draftPlan: "Review and save today’s plan before adding another step.",
    dismiss: "Remove step",
    retry: "Try again",
    error: "Vision steps could not be loaded.",
    duplicate: "This step is already in the plan.",
    capacity_exceeded: "Today’s plan is full. Keep this step here for later or adjust the plan.",
    invalid_plan: "This step could not be added. Try again.",
    editDuration: "Edit duration",
    saveDuration: "Save",
    cancelDuration: "Cancel",
    currentFocus: "Current focus",
    otherVisions: "Keep another vision moving?",
    otherVisionsHelp: "Occasionally, you can review one small optional step from another active vision. Nothing is added unless you choose it.",
    fromVision: "From",
    chooseFocus: "Choose a Vision focus",
    chooseFocusHelp: "No active vision currently guides Today.",
    skipStep: "Skip this proposal",
    muteVisionToday: "Don't suggest from this vision today",
    closeSection: "Dismiss",
    stepSkipped: "Proposal skipped",
    showNextSuggestion: "Show next suggestion",
  },
  sr: {
    title: "Akcije iz Vizije",
    intro: "Predloženi sledeći koraci iz aktivnih ciljeva. Vi birate šta ćete dodati danas.",
    add: "Dodaj u današnji plan",
    createPlan: "Napravi današnji plan",
    reviewPlan: "Pregledaj i sačuvaj današnji plan",
    noPlan: "Napravite današnji plan da biste dodali ovaj korak.",
    draftPlan: "Pregledajte i sačuvajte današnji plan pre dodavanja novog koraka.",
    dismiss: "Ukloni korak",
    retry: "Pokušaj ponovo",
    error: "Koraci iz Vizije nisu učitani.",
    duplicate: "Ovaj korak je već u planu.",
    capacity_exceeded: "Današnji plan je popunjen. Sačuvajte ovaj korak za kasnije ili prilagodite plan.",
    invalid_plan: "Ovaj korak nije dodat. Pokušajte ponovo.",
    editDuration: "Izmeni trajanje",
    saveDuration: "Sačuvaj",
    cancelDuration: "Otkaži",
    currentFocus: "Trenutni fokus",
    otherVisions: "Pokrenuti i drugu viziju?",
    otherVisionsHelp: "Povremeno možete pregledati jedan mali opcioni korak iz druge aktivne vizije. Ništa se ne dodaje bez vašeg izbora.",
    fromVision: "Iz vizije",
    chooseFocus: "Izaberi fokus Vizije",
    chooseFocusHelp: "Trenutno nijedna aktivna vizija ne vodi Danas.",
    skipStep: "Preskoči ovaj predlog",
    muteVisionToday: "Ne predlaži iz ove vizije danas",
    closeSection: "Zatvori",
    stepSkipped: "Predlog je preskočen",
    showNextSuggestion: "Prikaži sledeći predlog",
  },
  tr: {
    title: "Vizyondan eylemler",
    intro: "Aktif hedeflerinizden önerilen sonraki adımlar. Bugün ne ekleyeceğinize siz karar verirsiniz.",
    add: "Bugünün planına ekle",
    createPlan: "Bugünün planını oluştur",
    reviewPlan: "Bugünün planını gözden geçir ve kaydet",
    noPlan: "Bu adımı eklemek için bugünün planını oluşturun.",
    draftPlan: "Yeni bir adım eklemeden önce bugünün planını gözden geçirip kaydedin.",
    dismiss: "Adımı kaldır",
    retry: "Tekrar dene",
    error: "Vizyon adımları yüklenemedi.",
    duplicate: "Bu adım zaten planda.",
    capacity_exceeded: "Bugünün planı dolu. Bu adımı daha sonrası için burada tutun veya planı düzenleyin.",
    invalid_plan: "Bu adım eklenemedi. Tekrar deneyin.",
    editDuration: "Süreyi düzenle",
    saveDuration: "Kaydet",
    cancelDuration: "İptal",
    currentFocus: "Mevcut odak",
    otherVisions: "Başka bir vizyon da ilerlesin mi?",
    otherVisionsHelp: "Bazen başka bir aktif vizyondan küçük ve isteğe bağlı tek bir adımı inceleyebilirsiniz. Siz seçmeden hiçbir şey eklenmez.",
    fromVision: "Vizyon",
    chooseFocus: "Vizyon odağını seç",
    chooseFocusHelp: "Şu anda hiçbir aktif vizyon Bugün'ü yönlendirmiyor.",
    skipStep: "Bu öneriyi geç",
    muteVisionToday: "Bugün bu vizyondan önerme",
    closeSection: "Kapat",
    stepSkipped: "Öneri geçildi",
    showNextSuggestion: "Sonraki öneriyi göster",
  },
} as const;

function formatEstimatedDuration(minutes: number, language: AppALanguage): string {
  if (language === "sr") return `oko ${minutes} min`;
  if (language === "tr") return `yaklaşık ${minutes} dk`;
  return `about ${minutes} min`;
}

interface Props {
  userId?: string | null;
  language: AppALanguage;
  localDate: string;
  planState: TodayPlanState;
  onPlanAction: () => void;
  onAddToPlan: (candidate: TodayCandidate) => Promise<string | null>;
  onOpenVision: () => void;
}

export default function TodayCandidatesSection({ userId, language, localDate, planState, onPlanAction, onAddToPlan, onOpenVision }: Props) {
  const [items, setItems] = useState<TodayCandidate[]>([]);
  const [currentVisionId, setCurrentVisionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [customDurations, setCustomDurations] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutesInput, setEditMinutesInput] = useState<string>("");
  const [showOthers, setShowOthers] = useState(false);

  // Today dismissal states
  const sectionClosedKey = `app_a_vision_section_closed_${localDate}`;
  const mutedVisionsKey = `app_a_muted_visions_${localDate}`;
  const skippedCandidatesKey = `app_a_skipped_candidates_${localDate}`;

  const [isClosedToday, setIsClosedToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`app_a_vision_section_closed_${localDate}`) === "true";
    } catch {
      return false;
    }
  });

  const [mutedVisionIds, setMutedVisionIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`app_a_muted_visions_${localDate}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [skippedIds, setSkippedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`app_a_skipped_candidates_${localDate}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [skippedCandidate, setSkippedCandidate] = useState<{ id: string; title: string } | null>(() => {
    try {
      const raw = localStorage.getItem(`app_a_last_skipped_unacknowledged_${localDate}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const t = COPY[language];

  useEffect(() => {
    try {
      setIsClosedToday(localStorage.getItem(sectionClosedKey) === "true");
      const rawMuted = localStorage.getItem(mutedVisionsKey);
      setMutedVisionIds(rawMuted ? JSON.parse(rawMuted) : []);
      const rawSkipped = localStorage.getItem(skippedCandidatesKey);
      setSkippedIds(rawSkipped ? JSON.parse(rawSkipped) : []);
      
      const rawUnack = localStorage.getItem(`app_a_last_skipped_unacknowledged_${localDate}`);
      setSkippedCandidate(rawUnack ? JSON.parse(rawUnack) : null);
    } catch {
      // storage
    }
  }, [localDate, sectionClosedKey, mutedVisionsKey, skippedCandidatesKey]);

  useEffect(() => {
    if (!userId) { setItems([]); setCurrentVisionId(null); return; }
    if (typeof window !== 'undefined' && (window as any).__app_a_reset_in_progress) return;
    let active = true;
    setError(null);
    void ensurePendingVisionCandidates(userId).then(() => {
      if (typeof window !== 'undefined' && (window as any).__app_a_reset_in_progress) return;
      return loadPendingTodayCandidatesContext(userId);
    }).then((value) => {
      if (!value) return;
      if (typeof window !== 'undefined' && (window as any).__app_a_reset_in_progress) return;
      if (active) { setItems(value.items); setCurrentVisionId(value.currentVisionId); }
    }).catch(() => { if (active) setError("error"); });
    return () => { active = false; };
  }, [userId, refreshVersion]);

  useEffect(() => {
    const refresh = () => setRefreshVersion((value) => value + 1);
    window.addEventListener("app-a-vision-candidates-changed", refresh);
    window.addEventListener('app-a-navigation', refresh);
    return () => { window.removeEventListener("app-a-vision-candidates-changed", refresh); window.removeEventListener('app-a-navigation', refresh); };
  }, []);

  function getEffectiveMinutes(item: TodayCandidate): number {
    if (customDurations[item.id] !== undefined && customDurations[item.id] > 0) {
      return customDurations[item.id];
    }
    return estimateVisionStepMinutes({ existingMinutes: item.estimatedMinutes });
  }

  function closeSectionForToday() {
    try {
      localStorage.setItem(sectionClosedKey, "true");
    } catch {
      // storage
    }
    setIsClosedToday(true);
  }

  async function skipCurrentProposal(item: TodayCandidate) {
    if (!userId) return;
    setBusyId(item.id); setError(null);
    try {
      const nextSkippedIds = Array.from(new Set([...skippedIds, item.id]));
      setSkippedIds(nextSkippedIds);
      try {
        localStorage.setItem(skippedCandidatesKey, JSON.stringify(nextSkippedIds));
        localStorage.setItem(`app_a_last_skipped_unacknowledged_${localDate}`, JSON.stringify({ id: item.id, title: item.title }));
      } catch {
        // storage
      }
      setSkippedCandidate({ id: item.id, title: item.title });
    } catch {
      setError("error");
    } finally {
      setBusyId(null);
    }
  }

  async function muteVisionToday(item: TodayCandidate) {
    if (!userId) return;
    setBusyId(item.id); setError(null);
    try {
      await dismissTodayCandidate(userId, item);
      const updated = Array.from(new Set([...mutedVisionIds, item.sourceId]));
      setMutedVisionIds(updated);
      try {
        localStorage.setItem(mutedVisionsKey, JSON.stringify(updated));
      } catch {
        // storage
      }
      setItems((current) => current.filter((entry) => entry.sourceId !== item.sourceId));
    } catch {
      setError("error");
    } finally {
      setBusyId(null);
    }
  }

  async function add(item: TodayCandidate) {
    setBusyId(item.id); setError(null);
    try {
      const minutes = getEffectiveMinutes(item);
      const result = await onAddToPlan({ ...item, estimatedMinutes: minutes });
      if (result) { setError(result); return; }
      if (!userId) return;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSkippedCandidate(null);
      try {
        localStorage.removeItem(`app_a_last_skipped_unacknowledged_${localDate}`);
      } catch {
        // ignore
      }
    } catch { setError('invalid_plan'); } finally { setBusyId(null); }
  }

  function startEditingDuration(item: TodayCandidate) {
    setEditingId(item.id);
    setEditMinutesInput(String(getEffectiveMinutes(item)));
  }

  function commitEditedDuration(itemId: string) {
    const parsed = parseInt(editMinutesInput.trim(), 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 480) {
      setCustomDurations((prev) => ({ ...prev, [itemId]: parsed }));
    }
    setEditingId(null);
  }

  if (isClosedToday) return null;
  if (!userId) return null;

  const unmutedItems = items.filter((item) => !mutedVisionIds.includes(item.sourceId) && !skippedIds.includes(item.id));
  if (!error && unmutedItems.length === 0 && !skippedCandidate) return null;

  const errorText = error ? (t[error as keyof typeof t] || t.error) : null;
  const guidance = planState === "none" ? t.noPlan : planState === "draft" ? t.draftPlan : error === "capacity_exceeded" ? t.capacity_exceeded : null;
  const planAction = planState === "none" ? t.createPlan : t.reviewPlan;

  const primary = unmutedItems.find(item => item.isCurrentFocus);
  const others = currentVisionId && shouldSurfaceSecondaryVision(userId || "", localDate)
    ? unmutedItems.filter(item => item.sourceId !== currentVisionId).slice(0, 1)
    : [];

  const renderCandidate = (item: TodayCandidate, isPrimary = false) => {
    const minutes = getEffectiveMinutes(item);
    const isEditingThis = editingId === item.id;
    return (
      <article
        key={item.id}
        className="app-a-surface rounded-2xl border p-4 shadow-sm text-left transition-all w-full"
        style={{ borderColor: "var(--app-a-border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#AF52DE]">
              <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {isPrimary ? t.currentFocus : item.sourceTitle ? `${t.fromVision}: ${item.sourceTitle}` : t.title}
              </span>
            </div>
            <h3 className="text-[15px] font-semibold leading-snug break-words text-black dark:text-white">
              {item.title}
            </h3>

            {isEditingThis ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={editMinutesInput}
                  onChange={(e) => setEditMinutesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEditedDuration(item.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="app-a-field min-h-11 w-20 px-2.5 text-[16px]"
                />
                <button
                  type="button"
                  onClick={() => commitEditedDuration(item.id)}
                  className="app-a-focus-ring min-h-11 px-2 text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF]"
                >
                  {t.saveDuration}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="app-a-focus-ring min-h-11 px-2 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]"
                >
                  {t.cancelDuration}
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                <span className="inline-flex items-center gap-1 text-[#6E6E73] dark:text-[#AEAEB2]">
                  <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formatEstimatedDuration(minutes, language)}
                </span>
                <button
                  type="button"
                  onClick={() => startEditingDuration(item)}
                  className="app-a-focus-ring inline-flex items-center gap-1 min-h-[36px] text-[12px] font-medium text-[#0071E3] dark:text-[#0A84FF]"
                >
                  <Pencil className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {t.editDuration}
                </button>
              </div>
            )}

            {planState === "confirmed" ? (
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void add(item)}
                className="app-a-primary-button mt-3.5 flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap px-4 text-[13px] font-semibold sm:w-auto"
              >
                <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.add}</span>
              </button>
            ) : null}

            {/* Granular dismissal action options */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void skipCurrentProposal(item)}
                className="app-a-focus-ring min-h-[36px] rounded-lg px-2.5 text-[12px] font-medium text-[#6E6E73] hover:bg-black/5 dark:text-[#AEAEB2] dark:hover:bg-white/5 transition-colors"
              >
                {t.skipStep}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void muteVisionToday(item)}
                className="app-a-focus-ring min-h-[36px] rounded-lg px-2.5 text-[12px] font-medium text-[#6E6E73] hover:bg-black/5 dark:text-[#AEAEB2] dark:hover:bg-white/5 transition-colors"
              >
                {t.muteVisionToday}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={closeSectionForToday}
                className="app-a-focus-ring min-h-[36px] rounded-lg px-2.5 text-[12px] font-medium text-[#6E6E73] hover:bg-black/5 dark:text-[#AEAEB2] dark:hover:bg-white/5 transition-colors"
              >
                {t.dismiss}
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={busyId !== null}
            onClick={closeSectionForToday}
            aria-label={t.closeSection}
            className="app-a-focus-ring flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-[#86868B] transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:opacity-60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="mx-auto mt-6 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="today-vision-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="today-vision-heading" className="text-[19px] font-semibold">{t.title}</h2>
          <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.intro}</p>
        </div>
        <button
          type="button"
          onClick={closeSectionForToday}
          aria-label={t.closeSection}
          className="app-a-focus-ring flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-[#86868B] transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:opacity-60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {errorText ? (
        <div role="alert" className="app-a-panel-danger mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span>{errorText}</span>
          {error === "error" ? (
            <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="app-a-focus-ring min-h-11 rounded-lg px-3 font-semibold">
              {t.retry}
            </button>
          ) : null}
        </div>
      ) : null}

      {guidance ? (
        <div className="mt-3 rounded-[14px] border p-3.5" style={{ backgroundColor: "var(--app-a-surface-secondary)", borderColor: "var(--app-a-border)" }}>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{guidance}</p>
          <button type="button" onClick={onPlanAction} className="app-a-secondary-button app-a-focus-ring mt-3 gap-2 px-4 text-[14px]">
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            {planAction}
          </button>
        </div>
      ) : null}

      <div className="mt-3 space-y-2.5">
        {skippedCandidate ? (
          <article className="app-a-surface rounded-2xl border p-4 shadow-sm text-left transition-all w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: "var(--app-a-border)" }}>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">{t.stepSkipped}</p>
              <p className="text-[14px] font-medium text-black dark:text-white mt-0.5">{skippedCandidate.title}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSkippedCandidate(null);
                try {
                  localStorage.removeItem(`app_a_last_skipped_unacknowledged_${localDate}`);
                } catch {
                  // ignore
                }
              }}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 text-[13px] font-semibold whitespace-nowrap"
            >
              {t.showNextSuggestion}
            </button>
          </article>
        ) : null}

        {!skippedCandidate && primary ? renderCandidate(primary, true) : null}

        {!currentVisionId && unmutedItems.length > 0 ? (
          <div className="app-a-panel-warning">
            <p className="text-[13px] leading-relaxed">{t.chooseFocusHelp}</p>
            <button type="button" onClick={onOpenVision} className="app-a-secondary-button app-a-focus-ring mt-3 px-4 text-[13px]">
              <Compass className="h-4 w-4"/>
              {t.chooseFocus}
            </button>
          </div>
        ) : null}

        {!skippedCandidate && others.length > 0 ? (
          <div className="rounded-xl border p-3" style={{borderColor:"var(--app-a-border)",backgroundColor:"var(--app-a-surface-secondary)"}}>
            <button type="button" onClick={()=>setShowOthers(value=>!value)} aria-expanded={showOthers} className="app-a-focus-ring flex min-h-11 w-full items-center justify-between gap-3 text-left">
              <span>
                <span className="block text-[14px] font-semibold">{t.otherVisions}</span>
                <span className="mt-0.5 block text-[12px] font-normal leading-relaxed" style={{color:"var(--app-a-text-secondary)"}}>{t.otherVisionsHelp}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px]">{others.length}<ChevronDown className={`h-4 w-4 transition-transform ${showOthers?"rotate-180":""}`}/></span>
            </button>
            {showOthers ? <div className="mt-3 space-y-2.5">{others.map(item=>renderCandidate(item))}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
