import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AppALanguage } from "../../types";
import type { PriorityChangeSummary } from "../../screens/inboxCandidatePlan";

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
    minutes: "Minutes",
    add: "Add to today",
    later: "Save for later",
    cancel: "Cancel",
    required: "Enter a task and a realistic duration.",
    duplicate: "This task is already in today’s plan.",
    unknown: "Set today’s flexible time before adding this task.",
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
  },
  sr: {
    open: "Dodaj zadatak",
    title: "Dodajte ono što je iskrslo",
    intro: "Biće dodat posle trenutnih prioriteta. Postojeći Prvi fokus se neće menjati.",
    reconsiderIntro: "Novi zadatak će biti upoređen sa nezavršenim prioritetima. Pregledajte predlog pre čuvanja.",
    task: "Zadatak",
    taskPlaceholder: "Šta treba uraditi?",
    minutes: "Minuta",
    add: "Dodaj danas",
    later: "Sačuvaj za kasnije",
    cancel: "Otkaži",
    required: "Unesite zadatak i realno trajanje.",
    duplicate: "Ovaj zadatak je već u današnjem planu.",
    unknown: "Prvo odredite današnje vreme za fleksibilne zadatke.",
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
  },
  tr: {
    open: "Görev ekle",
    title: "Sonradan çıkan bir işi ekleyin",
    intro: "Mevcut önceliklerinizden sonra eklenecek. İlk Odağınız değişmeyecek.",
    reconsiderIntro: "Yeni görev tamamlanmamış önceliklerle karşılaştırılacak. Kaydetmeden önce öneriyi inceleyin.",
    task: "Görev",
    taskPlaceholder: "Ne yapılması gerekiyor?",
    minutes: "Dakika",
    add: "Bugüne ekle",
    later: "Daha sonrası için kaydet",
    cancel: "İptal",
    required: "Bir görev ve gerçekçi bir süre girin.",
    duplicate: "Bu görev bugünün planında zaten var.",
    unknown: "Bu görevi eklemeden önce bugünkü esnek zamanınızı belirleyin.",
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
  },
} as const;

interface Props {
  language: AppALanguage;
  availableMinutes?: number;
  plannedRequiredMinutes: number;
  onAddToday: (input: QuickAddInput) => Promise<QuickAddResult>;
  onSaveLater: (title: string, minutes: number, capacityType: "flexible" | "fixed") => Promise<boolean>;
  onAdjustPlan: () => void;
}

export default function QuickAddTodayTask({ language, availableMinutes, plannedRequiredMinutes, onAddToday, onSaveLater, onAdjustPlan }: Props) {
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
  const remaining = Math.max(0, (availableMinutes || 0) - plannedRequiredMinutes);

  const values = () => {
    const cleanTitle = title.trim();
    const duration = Number(minutes);
    if (!cleanTitle || !Number.isInteger(duration) || duration < 1 || duration > 1440) return null;
    return { cleanTitle, duration };
  };

  const add = async (confirmReprioritization = false) => {
    const input = values();
    if (!input) { setError(t.required); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await onAddToday({ title: input.cleanTitle, minutes: input.duration, capacityType, reconsiderPriorities, confirmReprioritization });
      if (result.status === "preview") setPreview(result.changes);
      else if (result.status === "error" && result.code === "duplicate") setError(t.duplicate);
      else if (result.status === "error" && result.code === "capacity_unknown") setError(t.unknown);
      else if (result.status === "error" && result.code === "capacity_exceeded") setError(t.full(remaining));
      else if (result.status === "error") setError(t.failed);
      else { setTitle(""); setMinutes(""); setCapacityType("flexible"); setReconsiderPriorities(false); setPreview(null); setOpen(false); }
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  const saveLater = async () => {
    const input = values();
    if (!input) { setError(t.required); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      if (!await onSaveLater(input.cleanTitle, input.duration, capacityType)) setError(t.failed);
      else { setTitle(""); setMinutes(""); setOpen(false); setNotice(t.savedLater); }
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  if (!open) {
    return (
      <div className="mb-5">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setNotice(null);
          }}
          className="app-a-secondary-button app-a-focus-ring gap-2 px-4 py-2.5 text-[14px]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{t.open}</span>
        </button>
        {notice ? (
          <p role="status" className="mt-2 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>
            {notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="app-a-surface mb-5 p-4 sm:p-5" aria-labelledby="quick-add-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="quick-add-title" className="text-[17px] sm:text-[18px] font-semibold" style={{ color: "var(--app-a-text)" }}>
            {t.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
            {reconsiderPriorities ? t.reconsiderIntro : t.intro}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="app-a-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--app-a-disabled-bg)]"
          style={{ color: "var(--app-a-text-secondary)" }}
          aria-label={t.cancel}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_130px]">
        <label className="text-[13px] font-medium" style={{ color: "var(--app-a-text)" }}>
          {t.task}
          <input
            autoFocus
            maxLength={500}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setPreview(null);
            }}
            placeholder={t.taskPlaceholder}
            className="app-a-field app-a-focus-ring mt-1 min-h-[44px] w-full px-3 text-[15px] sm:text-[16px]"
          />
        </label>
        <label className="text-[13px] font-medium" style={{ color: "var(--app-a-text)" }}>
          {t.minutes}
          <input
            type="number"
            min="1"
            max="1440"
            value={minutes}
            onChange={(event) => {
              setMinutes(event.target.value);
              setPreview(null);
            }}
            className="app-a-field app-a-focus-ring mt-1 min-h-[44px] w-full px-3 text-[15px] sm:text-[16px]"
          />
        </label>
      </div>

      <details
        className="mt-3 rounded-xl border p-3"
        style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-surface-secondary)" }}
      >
        <summary className="app-a-focus-ring cursor-pointer text-[13px] font-semibold" style={{ color: "var(--app-a-text-secondary)" }}>
          {t.more}
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label
            className="flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-[13px]"
            style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-surface)" }}
          >
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
              <span className="block font-semibold" style={{ color: "var(--app-a-text)" }}>{t.fixed}</span>
              <span style={{ color: "var(--app-a-text-secondary)" }}>{t.fixedHint}</span>
            </span>
          </label>
          <label
            className={`flex items-start gap-2 rounded-xl border p-3 text-[13px] ${
              capacityType === "fixed" ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
            style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-surface)" }}
          >
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
              <span className="block font-semibold" style={{ color: "var(--app-a-text)" }}>{t.reconsider}</span>
              <span style={{ color: "var(--app-a-text-secondary)" }}>{t.reconsiderHint}</span>
            </span>
          </label>
        </div>
      </details>

      {preview ? (
        <div
          className="mt-3 rounded-xl border p-3 text-[13px]"
          style={{
            borderColor: "var(--app-a-accent)",
            backgroundColor: "var(--app-a-accent-soft)",
            color: "var(--app-a-text)",
          }}
          role="status"
        >
          <p className="font-semibold">{t.previewTitle}</p>
          <p className="mt-1" style={{ color: "var(--app-a-text-secondary)" }}>{t.previewIntro}</p>
          {preview.firstFocus.length ? (
            <p className="mt-2"><strong>{t.firstFocus}:</strong> {preview.firstFocus.join(", ")}</p>
          ) : null}
          {preview.movedLater.length ? (
            <p className="mt-1"><strong>{t.movedLater}:</strong> {preview.movedLater.join(", ")}</p>
          ) : null}
          {preview.movedOptional.length ? (
            <p className="mt-1"><strong>{t.movedOptional}:</strong> {preview.movedOptional.join(", ")}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="app-a-panel-danger mt-3 text-[13px]">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {preview ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void add(true)}
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
            >
              {t.confirm}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(null)}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
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
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
            >
              {t.add}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveLater()}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
            >
              {t.later}
            </button>
          </>
        )}
        {error && (error === t.unknown || error === t.full(remaining)) ? (
          <button
            type="button"
            onClick={onAdjustPlan}
            className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
          >
            {language === "sr" ? "Prilagodi plan" : language === "tr" ? "Planı düzenle" : "Adjust plan"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
