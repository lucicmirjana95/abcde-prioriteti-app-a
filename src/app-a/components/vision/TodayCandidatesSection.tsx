import { useEffect, useState } from "react";
import { ArrowUp, CalendarPlus, Check, ChevronDown, Clock3, Compass, Pencil, X } from "lucide-react";
import type { AppALanguage } from "../../types";
import { estimateVisionStepMinutes, type TodayCandidate } from "../../../shared/domain/today-candidates";
import { dismissTodayCandidate, ensurePendingVisionCandidates, loadPendingTodayCandidates } from "../../../shared/persistence/today-candidates";

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
    capacity_unknown: "Set your available time before adding this step.",
    capacity_exceeded: "Today’s plan is full. Keep this step here for later or adjust the plan.",
    invalid_plan: "This step could not be added. Try again.",
    editDuration: "Edit duration",
    saveDuration: "Save",
    cancelDuration: "Cancel",
    currentFocus: "Current focus",
    otherVisions: "Other active visions",
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
    capacity_unknown: "Unesite raspoloživo vreme pre dodavanja ovog koraka.",
    capacity_exceeded: "Današnji plan je popunjen. Sačuvajte ovaj korak za kasnije ili prilagodite plan.",
    invalid_plan: "Ovaj korak nije dodat. Pokušajte ponovo.",
    editDuration: "Izmeni trajanje",
    saveDuration: "Sačuvaj",
    cancelDuration: "Otkaži",
    currentFocus: "Trenutni fokus",
    otherVisions: "Druge aktivne vizije",
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
    capacity_unknown: "Bu adımı eklemeden önce kullanılabilir sürenizi belirleyin.",
    capacity_exceeded: "Bugünün planı dolu. Bu adımı daha sonrası için burada tutun veya planı düzenleyin.",
    invalid_plan: "Bu adım eklenemedi. Tekrar deneyin.",
    editDuration: "Süreyi düzenle",
    saveDuration: "Kaydet",
    cancelDuration: "İptal",
    currentFocus: "Mevcut odak",
    otherVisions: "Diğer aktif vizyonlar",
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
  planState: TodayPlanState;
  onPlanAction: () => void;
  onAddToPlan: (candidate: TodayCandidate) => Promise<string | null>;
}

export default function TodayCandidatesSection({ userId, language, planState, onPlanAction, onAddToPlan }: Props) {
  const [items, setItems] = useState<TodayCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [customDurations, setCustomDurations] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutesInput, setEditMinutesInput] = useState<string>("");
  const [showOthers, setShowOthers] = useState(false);

  const t = COPY[language];

  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let active = true;
    setError(null);
    void ensurePendingVisionCandidates(userId).then(() => loadPendingTodayCandidates(userId)).then((value) => { if (active) setItems(value); }).catch(() => { if (active) setError("error"); });
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

  async function dismiss(item: TodayCandidate) {
    if (!userId) return;
    setBusyId(item.id); setError(null);
    try { await dismissTodayCandidate(userId, item); setItems((current) => current.filter((entry) => entry.id !== item.id)); setRefreshVersion(value => value + 1); }
    catch { setError("error"); }
    finally { setBusyId(null); }
  }

  async function add(item: TodayCandidate) {
    setBusyId(item.id); setError(null);
    try {
      const minutes = getEffectiveMinutes(item);
      const result = await onAddToPlan({ ...item, estimatedMinutes: minutes });
      if (result) { setError(result); return; }
      if (!userId) return;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
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

  if (!userId || (!error && items.length === 0)) return null;
  const errorText = error ? (t[error as keyof typeof t] || t.error) : null;
  const guidance = planState === "none" ? t.noPlan : planState === "draft" ? t.draftPlan : error === "capacity_unknown" ? t.capacity_unknown : error === "capacity_exceeded" ? t.capacity_exceeded : null;
  const planAction = planState === "none" ? t.createPlan : t.reviewPlan;

  const primary = items.find(item => item.isCurrentFocus);
  const others = items.filter(item => item.id !== primary?.id);
  const renderCandidate = (item: TodayCandidate, isPrimary = false) => {
    const minutes = getEffectiveMinutes(item);
    const isEditingThis = editingId === item.id;
    return (
      <article key={item.id} className="app-a-surface flex items-start gap-3.5 rounded-xl border p-4 shadow-sm" style={{ borderColor: isPrimary ? "var(--app-a-accent)" : "var(--app-a-border)" }}>
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#AF52DE]/10 text-[#AF52DE]"><Compass className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">{isPrimary ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--app-a-accent)" }}>{t.currentFocus}</p> : null}<h3 className="text-[15px] font-semibold leading-snug">{item.title}</h3>
          {isEditingThis ? <div className="mt-2 flex flex-wrap items-center gap-2"><input type="number" min="1" max="480" value={editMinutesInput} onChange={e=>setEditMinutesInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commitEditedDuration(item.id);if(e.key==="Escape")setEditingId(null)}} autoFocus className="app-a-field min-h-9 w-20 px-2"/><button onClick={()=>commitEditedDuration(item.id)} className="text-[13px] font-semibold" style={{color:"var(--app-a-accent)"}}>{t.saveDuration}</button><button onClick={()=>setEditingId(null)} className="text-[13px]">{t.cancelDuration}</button></div> : <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{formatEstimatedDuration(minutes,language)}</span><button onClick={()=>startEditingDuration(item)} className="inline-flex items-center gap-1 text-[12px]"><Pencil className="h-3 w-3"/>{t.editDuration}</button></div>}
          {planState==="confirmed"?<button disabled={busyId!==null} onClick={()=>void add(item)} className="app-a-primary-button mt-3 gap-2 px-3.5 text-[13px]"><CalendarPlus className="h-4 w-4"/>{t.add}</button>:null}
        </div><button disabled={busyId!==null} onClick={()=>void dismiss(item)} className="h-9 w-9 shrink-0 rounded-full" aria-label={t.dismiss}><X className="mx-auto h-4 w-4"/></button>
      </article>
    );
  };
  return (
    <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="today-vision-heading">
      <h2 id="today-vision-heading" className="text-[19px] font-semibold">{t.title}</h2>
      <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.intro}</p>
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
        {primary ? renderCandidate(primary, true) : null}
        {others.length ? <><button type="button" onClick={()=>setShowOthers(value=>!value)} className="app-a-secondary-button w-full justify-between px-4"><span>{t.otherVisions} ({others.length})</span><ChevronDown className={`h-4 w-4 transition-transform ${showOthers?"rotate-180":""}`}/></button>{showOthers ? others.map(item=>renderCandidate(item)) : null}</> : null}
        {false && items.map((item) => {
          const minutes = getEffectiveMinutes(item);
          const isEditingThis = editingId === item.id;

          return (
            <article key={item.id} className="app-a-surface flex items-start gap-3.5 p-4 rounded-xl border transition-shadow shadow-sm" style={{ borderColor: "var(--app-a-border)" }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#AF52DE]/10 text-[#AF52DE] mt-0.5">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold leading-snug" style={{ color: "var(--app-a-text)" }}>
                  {item.title}
                </h3>

                {/* Duration display / editing */}
                {isEditingThis ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="480"
                        value={editMinutesInput}
                        onChange={(e) => setEditMinutesInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEditedDuration(item.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="app-a-field min-h-[36px] w-20 px-2.5 text-[14px] font-medium"
                      />
                      <span className="text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>
                        {language === "tr" ? "dk" : "min"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => commitEditedDuration(item.id)}
                      className="app-a-focus-ring inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold transition-colors"
                      style={{ color: "var(--app-a-accent)" }}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.saveDuration}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="app-a-focus-ring min-h-[36px] rounded-lg px-2 text-[13px] transition-colors"
                      style={{ color: "var(--app-a-text-tertiary)" }}
                    >
                      {t.cancelDuration}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--app-a-text-secondary)" }}>
                      <Clock3 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span>{formatEstimatedDuration(minutes, language)}</span>
                    </span>
                    <span className="opacity-40" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => startEditingDuration(item)}
                      className="app-a-focus-ring inline-flex min-h-[28px] items-center gap-1 text-[12px] font-medium transition-colors hover:underline"
                      style={{ color: "var(--app-a-text-secondary)" }}
                    >
                      <Pencil className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {t.editDuration}
                    </button>
                  </div>
                )}

                {/* Primary action */}
                {planState === "confirmed" ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void add(item)}
                    className="app-a-primary-button app-a-focus-ring mt-3 gap-2 px-3.5 py-1.5 text-[13px] font-semibold transition-all shadow-sm"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    {t.add}
                  </button>
                ) : null}
              </div>

              {/* Dismiss button */}
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void dismiss(item)}
                className="app-a-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--app-a-text-tertiary)" }}
                aria-label={t.dismiss}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
