import { useState } from "react";
import { Plus, X, Compass } from "lucide-react";
import type { AppALanguage } from "../../types";
import type { PriorityChangeSummary } from "../../screens/inboxCandidatePlan";
import InputCopyButton from "../common/InputCopyButton";
import {
  suggestTaskPlacement,
  type TaskPlacementSuggestion,
} from "../../api/taskPlacementSuggestionApi";

export interface QuickAddInput {
  title: string;
  minutes: number;
  capacityType: "flexible" | "fixed";
  reconsiderPriorities: boolean;
  confirmReprioritization?: boolean;
}

export type QuickAddResult =
  | { status: "saved" }
  | { status: "preview"; changes: PriorityChangeSummary }
  | { status: "error"; code: "duplicate" | "capacity_unknown" | "capacity_exceeded" | "invalid_plan" };

const COPY = {
  en: {
    open: "Add a task",
    title: "Add something that came up",
    intro: "It will go after your current priorities. Your existing First Focus will not change.",
    reconsiderIntro: "The new task will be compared with unfinished priorities. Review the proposal before saving.",
    task: "Task",
    taskPlaceholder: "What needs to be done?",
    minutes: "Minutes (optional)",
    add: "Add to today",
    later: "Save for later",
    cancel: "Cancel",
    required: "Enter a task.",
    fixedDurationRequired: "Add the duration of this fixed commitment so the daily load stays accurate.",
    duplicate: "This task is already in today’s plan.",
    full: (remaining: number) => `Only ${remaining} min remain in today’s flexible time. Adjust the plan or save this task for later.`,
    failed: "The task could not be saved. Try again.",
    savedLater: "Saved in Inbox for later.",
    fixed: "Fixed commitment or appointment",
    fixedHint: "Does not use the flexible task budget.",
    reconsider: "Reconsider priorities",
    reconsiderHint: "For a genuinely urgent task. You will review changes before anything is saved.",
    previewTitle: "Review the proposed changes",
    previewIntro: "Completed tasks and fixed commitments stay in place.",
    firstFocus: "First Focus",
    movedLater: "Moved to later today",
    movedOptional: "Moved to if time remains",
    confirm: "Confirm changes",
    back: "Back",
    more: "More options",
    aiButton: "AI placement suggestion",
    aiButtonLoading: "Analyzing placement...",
    aiSuggestionTitle: "Optimal Placement Suggestion",
    applySuggestion: "Apply suggestion",
    dismissSuggestion: "Dismiss",
    linkedVisionBadge: "Linked to vision",
    blockFirstFocus: "First Focus",
    blockLaterToday: "Later today",
    blockIfCapacity: "If capacity remains",
    blockInbox: "Save to Inbox for later",
  },
  sr: {
    open: "Dodaj zadatak",
    title: "Dodajte ono što je iskrslo",
    intro: "Biće dodat posle trenutnih prioriteta. Postojeći Prvi fokus se neće menjati.",
    reconsiderIntro: "Novi zadatak će biti upoređen sa nezavršenim prioritetima. Pregledajte predlog pre čuvanja.",
    task: "Zadatak",
    taskPlaceholder: "Šta treba uraditi?",
    minutes: "Minuta (opciono)",
    add: "Dodaj danas",
    later: "Sačuvaj za kasnije",
    cancel: "Otkaži",
    required: "Unesite zadatak.",
    fixedDurationRequired: "Unesite trajanje fiksne obaveze kako bi ukupno opterećenje dana bilo tačno.",
    duplicate: "Ovaj zadatak je već u današnjem planu.",
    full: (remaining: number) => `U današnjem fleksibilnom vremenu ostalo je još ${remaining} min. Prilagodite plan ili sačuvajte zadatak za kasnije.`,
    failed: "Zadatak nije sačuvan. Pokušajte ponovo.",
    savedLater: "Sačuvano u Inboksu za kasnije.",
    fixed: "Fiksna obaveza ili termin",
    fixedHint: "Ne troši izabrano fleksibilno vreme za zadatke.",
    reconsider: "Preispitaj prioritete",
    reconsiderHint: "Samo za stvarno hitan zadatak. Videćete predlog pre čuvanja.",
    previewTitle: "Pregledajte predlog promena",
    previewIntro: "Završeni zadaci i fiksne obaveze ostaju na mestu.",
    firstFocus: "Prvi fokus",
    movedLater: "Pomera se za kasnije danas",
    movedOptional: "Pomera se ako ostane vremena",
    confirm: "Potvrdi promene",
    back: "Nazad",
    more: "Više opcija",
    aiButton: "AI predlog gde staviti zadatak",
    aiButtonLoading: "Analiziram raspored...",
    aiSuggestionTitle: "Predlog optimalnog rasporeda",
    applySuggestion: "Primeni predlog",
    dismissSuggestion: "Ukloni predlog",
    linkedVisionBadge: "Povezano sa vizijom",
    blockFirstFocus: "Prvi fokus",
    blockLaterToday: "Kasnije danas",
    blockIfCapacity: "Ako ostane vremena",
    blockInbox: "Sačuvaj u Inboks za kasnije",
  },
  tr: {
    open: "Görev ekle",
    title: "Sonradan çıkan bir işi ekleyin",
    intro: "Mevcut önceliklerinizden sonra eklenecek. İlk Odağınız değişmeyecek.",
    reconsiderIntro: "Yeni görev tamamlanmamış önceliklerle karşılaştırılacak. Kaydetmeden önce öneriyi inceleyin.",
    task: "Görev",
    taskPlaceholder: "Ne yapılması gerekiyor?",
    minutes: "Dakika (isteğe bağlı)",
    add: "Bugüne ekle",
    later: "Daha sonrası için kaydet",
    cancel: "İptal",
    required: "Bir görev girin.",
    fixedDurationRequired: "Günlük yükün doğru kalması için sabit yükümlülüğün süresini ekleyin.",
    duplicate: "Bu görev bugünün planında zaten var.",
    full: (remaining: number) => `Bugünkü esnek zamanda yalnızca ${remaining} dk kaldı. Planı düzenleyin veya görevi daha sonrası için kaydedin.`,
    failed: "Görev kaydedilemedi. Tekrar deneyin.",
    savedLater: "Daha sonrası için Gelen Kutusuna kaydedildi.",
    fixed: "Sabit yükümlülük veya randevu",
    fixedHint: "Esnek görev bütçesini kullanmaz.",
    reconsider: "Öncelikleri yeniden değerlendir",
    reconsiderHint: "Gerçekten acil bir görev için. Kaydetmeden önce öneriyi göreceksiniz.",
    previewTitle: "Önerilen değişiklikleri inceleyin",
    previewIntro: "Tamamlanan görevler ve sabit yükümlülükler yerinde kalır.",
    firstFocus: "İlk Odak",
    movedLater: "Bugünün ilerisine taşındı",
    movedOptional: "Zaman kalırsa bölümüne taşındı",
    confirm: "Değişiklikleri onayla",
    back: "Geri",
    more: "Daha fazla seçenek",
    aiButton: "AI yerleşim önerisi",
    aiButtonLoading: "Yerleşim analiz ediliyor...",
    aiSuggestionTitle: "Akıllı Yerleşim Önerisi",
    applySuggestion: "Öneriyi uygula",
    dismissSuggestion: "Kapat",
    linkedVisionBadge: "Vizyonla bağlantılı",
    blockFirstFocus: "İlk Odak",
    blockLaterToday: "Bugünün ilerisi",
    blockIfCapacity: "Zaman kalırsa",
    blockInbox: "Gelen Kutusuna kaydet",
  },
} as const;

interface Props {
  language: AppALanguage;
  availableMinutes?: number;
  plannedRequiredMinutes: number;
  firstFocusCount?: number;
  energy?: number;
  pleasantness?: number;
  activeVisions?: Array<{ id: string; title: string }>;
  onAddToday: (input: QuickAddInput) => Promise<QuickAddResult>;
  onSaveLater: (title: string, minutes: number, capacityType: "flexible" | "fixed") => Promise<boolean>;
  onAdjustPlan: () => void;
}

export default function QuickAddTodayTask({
  language,
  availableMinutes,
  plannedRequiredMinutes,
  firstFocusCount = 0,
  energy = 3,
  pleasantness = 3,
  activeVisions = [],
  onAddToday,
  onSaveLater,
  onAdjustPlan,
}: Props) {
  const t = COPY[language];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capacityType, setCapacityType] = useState<"flexible" | "fixed">("flexible");
  const [reconsiderPriorities, setReconsiderPriorities] = useState(false);
  const [preview, setPreview] = useState<PriorityChangeSummary | null>(null);
  const [suggestion, setSuggestion] = useState<TaskPlacementSuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const remaining = Math.max(0, (availableMinutes || 0) - plannedRequiredMinutes);

  const getBlockLabel = (block: TaskPlacementSuggestion["suggestedBlock"]) => {
    switch (block) {
      case "first_focus":
        return t.blockFirstFocus;
      case "later_today":
        return t.blockLaterToday;
      case "if_capacity_remains":
        return t.blockIfCapacity;
      case "inbox":
        return t.blockInbox;
      default:
        return t.blockLaterToday;
    }
  };

  const handleRequestAiSuggestion = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(t.required);
      return;
    }
    setIsSuggesting(true);
    setError(null);
    try {
      const res = await suggestTaskPlacement({
        taskTitle: cleanTitle,
        language,
        energy,
        pleasantness,
        availableMinutes,
        plannedFlexibleMinutes: plannedRequiredMinutes,
        firstFocusCount,
        activeVisions,
      });
      setSuggestion(res);
    } catch {
      // Graceful silent fallback
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleApplySuggestion = (s: TaskPlacementSuggestion) => {
    setMinutes(String(s.suggestedMinutes));
    setCapacityType(s.capacityType);
    setReconsiderPriorities(s.reconsiderPriorities);
    if (s.suggestedBlock === "first_focus") {
      setReconsiderPriorities(true);
    }
    setNotice(
      language === "sr"
        ? `Primenjen predlog: ${s.suggestedMinutes} min u bloku "${getBlockLabel(s.suggestedBlock)}"`
        : language === "tr"
          ? `Öneri uygulandı: "${getBlockLabel(s.suggestedBlock)}" bölümünde ${s.suggestedMinutes} dk`
          : `Applied suggestion: ${s.suggestedMinutes} min in "${getBlockLabel(s.suggestedBlock)}"`
    );
  };

  const values = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError(t.required); return null; }
    const duration = minutes.trim() === "" ? 20 : Number(minutes);
    if (capacityType === "fixed" && minutes.trim() === "") { setError(t.fixedDurationRequired); return null; }
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) { setError(t.required); return null; }
    return { cleanTitle, duration };
  };

  const add = async (confirmReprioritization = false) => {
    const input = values();
    if (!input) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await onAddToday({ title: input.cleanTitle, minutes: input.duration, capacityType, reconsiderPriorities, confirmReprioritization });
      if (result.status === "preview") setPreview(result.changes);
      else if (result.status === "error" && result.code === "duplicate") setError(t.duplicate);
      else if (result.status === "error" && result.code === "capacity_exceeded") setError(t.full(remaining));
      else if (result.status === "error") setError(t.failed);
      else {
        setTitle("");
        setMinutes("");
        setCapacityType("flexible");
        setReconsiderPriorities(false);
        setPreview(null);
        setSuggestion(null);
        setOpen(false);
      }
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  const saveLater = async () => {
    const input = values();
    if (!input) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      if (!await onSaveLater(input.cleanTitle, input.duration, capacityType)) setError(t.failed);
      else {
        setTitle("");
        setMinutes("");
        setSuggestion(null);
        setOpen(false);
        setNotice(t.savedLater);
      }
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  if (!open) {
    return (
      <div className="mb-5">
        <button
          type="button"
          onClick={() => { setOpen(true); setNotice(null); }}
          className="app-a-secondary-button app-a-focus-ring gap-2 px-4"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.open}
        </button>
        {notice ? <p role="status" className="mt-2 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>{notice}</p> : null}
      </div>
    );
  }

  return (
    <section className="app-a-surface mb-5 rounded-3xl border border-black/10 p-4 sm:p-6 shadow-sm dark:border-white/10" aria-labelledby="quick-add-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="quick-add-title" className="text-[18px] font-semibold text-black dark:text-white">
            {t.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
            {reconsiderPriorities ? t.reconsiderIntro : t.intro}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="app-a-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#86868B] transition-colors hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={t.cancel}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px]">
        <label className="text-[13px] font-medium text-black dark:text-white">
          {t.task}
          <div className="relative mt-1 flex items-center">
            <input
              autoFocus
              maxLength={500}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setPreview(null);
                setSuggestion(null);
              }}
              placeholder={t.taskPlaceholder}
              className="app-a-field app-a-focus-ring min-h-12 w-full px-3 pr-10 text-[15px] font-medium"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              <InputCopyButton text={title} language={language} size="sm" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <button
              type="button"
              disabled={!title.trim() || isSuggesting}
              onClick={handleRequestAiSuggestion}
              className="app-a-focus-ring inline-flex items-center gap-1.5 rounded-lg py-1 text-[12px] font-medium text-[var(--app-a-accent)] transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              <Compass className={`h-3.5 w-3.5 ${isSuggesting ? "animate-spin" : ""}`} />
              {isSuggesting ? t.aiButtonLoading : t.aiButton}
            </button>
          </div>
        </label>

        <label className="text-[13px] font-medium text-black dark:text-white">
          {capacityType === "fixed" ? t.minutes.replace(/\s*\([^)]*\)$/, "") : t.minutes}
          <input
            type="number"
            min="1"
            max="1440"
            value={minutes}
            onChange={(event) => {
              setMinutes(event.target.value);
              setPreview(null);
            }}
            placeholder={capacityType === "fixed" ? undefined : "20"}
            className="app-a-field app-a-focus-ring mt-1 min-h-12 w-full px-3 text-[15px]"
          />
        </label>
      </div>

      {/* AI Suggestion Card */}
      {suggestion && (
        <div className="mt-3.5 rounded-2xl border border-[var(--app-a-accent)]/20 bg-[var(--app-a-accent)]/[0.04] p-4 text-[13px] animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-2.5 dark:border-white/[0.08]">
            <div className="flex items-center gap-2 font-semibold text-black dark:text-white">
              <Compass className="h-4 w-4 text-[var(--app-a-accent)]" />
              <span>{t.aiSuggestionTitle}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-[var(--app-a-accent)]/15 px-2.5 py-0.5 text-[11px] font-medium text-[var(--app-a-accent)]">
                {getBlockLabel(suggestion.suggestedBlock)}
              </span>
              <span className="rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:border-white/15 dark:text-[#AEAEB2]">
                {suggestion.capacityType === "fixed" ? t.fixed : `${suggestion.suggestedMinutes} min`}
              </span>
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="ml-1 text-[#86868B] hover:text-black dark:hover:text-white"
                aria-label={t.dismissSuggestion}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {suggestion.linkedVisionTitle && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[var(--app-a-accent)]">
              <span className="font-semibold">{t.linkedVisionBadge}:</span>
              <span className="italic">{suggestion.linkedVisionTitle}</span>
            </div>
          )}

          <p className="mt-2 leading-relaxed text-[#48484A] dark:text-[#D1D1D6]">
            {suggestion.reasoning}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplySuggestion(suggestion)}
              className="app-a-focus-ring rounded-xl bg-[var(--app-a-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t.applySuggestion}
            </button>
          </div>
        </div>
      )}

      <details className="mt-3.5 rounded-2xl border border-black/10 p-3.5 dark:border-white/10">
        <summary className="app-a-focus-ring cursor-pointer text-[13px] font-semibold text-black dark:text-white">
          {t.more}
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-black/10 p-3 text-[13px] transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.02]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={capacityType === "fixed"}
              onChange={(event) => {
                const fixed = event.target.checked;
                setCapacityType(fixed ? "fixed" : "flexible");
                if (fixed) setReconsiderPriorities(false);
                setPreview(null);
              }}
            />
            <span>
              <span className="block font-semibold text-black dark:text-white">{t.fixed}</span>
              <span className="text-[#6E6E73] dark:text-[#AEAEB2]">{t.fixedHint}</span>
            </span>
          </label>

          <label className={`flex items-start gap-2.5 rounded-xl border border-black/10 p-3 text-[13px] transition-colors dark:border-white/10 ${capacityType === "fixed" ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"}`}>
            <input
              type="checkbox"
              className="mt-0.5"
              disabled={capacityType === "fixed"}
              checked={reconsiderPriorities}
              onChange={(event) => {
                setReconsiderPriorities(event.target.checked);
                setPreview(null);
              }}
            />
            <span>
              <span className="block font-semibold text-black dark:text-white">{t.reconsider}</span>
              <span className="text-[#6E6E73] dark:text-[#AEAEB2]">{t.reconsiderHint}</span>
            </span>
          </label>
        </div>
      </details>

      {preview && (
        <div className="mt-3.5 rounded-2xl border border-[#0A84FF]/25 bg-[#0A84FF]/[0.055] p-3.5 text-[13px]" role="status">
          <p className="font-semibold text-black dark:text-white">{t.previewTitle}</p>
          <p className="mt-1 text-[#6E6E73] dark:text-[#AEAEB2]">{t.previewIntro}</p>
          {preview.firstFocus.length ? <p className="mt-2 text-black dark:text-white"><strong>{t.firstFocus}:</strong> {preview.firstFocus.join(", ")}</p> : null}
          {preview.movedLater.length ? <p className="mt-1 text-black dark:text-white"><strong>{t.movedLater}:</strong> {preview.movedLater.join(", ")}</p> : null}
          {preview.movedOptional.length ? <p className="mt-1 text-black dark:text-white"><strong>{t.movedOptional}:</strong> {preview.movedOptional.join(", ")}</p> : null}
        </div>
      )}

      {notice && (
        <div role="status" className="mt-3 text-[13px] text-[#34C759] dark:text-[#30D158]">
          {notice}
        </div>
      )}

      {error && <div role="alert" className="app-a-panel-danger mt-3 text-[13px]">{error}</div>}

      <div className="mt-4 flex flex-wrap gap-2.5 pt-1">
        {preview ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void add(true)}
              className="app-a-primary-button app-a-focus-ring px-5"
            >
              {t.confirm}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(null)}
              className="app-a-secondary-button app-a-focus-ring px-4"
            >
              {t.back}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void add()}
              className="app-a-primary-button app-a-focus-ring px-5"
            >
              {t.add}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveLater()}
              className="app-a-secondary-button app-a-focus-ring px-4"
            >
              {t.later}
            </button>
          </>
        )}
        {error === t.full(remaining) && (
          <button
            type="button"
            onClick={onAdjustPlan}
            className="app-a-secondary-button app-a-focus-ring px-4"
          >
            {language === "sr" ? "Prilagodi plan" : language === "tr" ? "Planı düzenle" : "Adjust plan"}
          </button>
        )}
      </div>
    </section>
  );
}
