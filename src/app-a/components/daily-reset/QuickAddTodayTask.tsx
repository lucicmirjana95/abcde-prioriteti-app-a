import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AppALanguage } from "../../types";

const COPY = {
  en: {
    open: "Add a task",
    title: "Add something that came up",
    intro: "It will go after your current priorities. Your existing First Focus will not change.",
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
  },
  sr: {
    open: "Dodaj zadatak",
    title: "Dodajte ono što je iskrslo",
    intro: "Biće dodat posle trenutnih prioriteta. Postojeći Prvi fokus se neće menjati.",
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
  },
  tr: {
    open: "Görev ekle",
    title: "Sonradan çıkan bir işi ekleyin",
    intro: "Mevcut önceliklerinizden sonra eklenecek. İlk Odağınız değişmeyecek.",
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
  },
} as const;

type ResultCode = "duplicate" | "capacity_unknown" | "capacity_exceeded" | "invalid_plan" | null;

interface Props {
  language: AppALanguage;
  availableMinutes?: number;
  plannedRequiredMinutes: number;
  onAddToday: (title: string, minutes: number) => Promise<ResultCode>;
  onSaveLater: (title: string, minutes: number) => Promise<boolean>;
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
  const remaining = Math.max(0, (availableMinutes || 0) - plannedRequiredMinutes);

  const values = () => {
    const cleanTitle = title.trim();
    const duration = Number(minutes);
    if (!cleanTitle || !Number.isInteger(duration) || duration < 1 || duration > 1440) return null;
    return { cleanTitle, duration };
  };

  const add = async () => {
    const input = values();
    if (!input) { setError(t.required); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await onAddToday(input.cleanTitle, input.duration);
      if (result === "duplicate") setError(t.duplicate);
      else if (result === "capacity_unknown") setError(t.unknown);
      else if (result === "capacity_exceeded") setError(t.full(remaining));
      else if (result) setError(t.failed);
      else { setTitle(""); setMinutes(""); setOpen(false); }
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  const saveLater = async () => {
    const input = values();
    if (!input) { setError(t.required); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      if (!await onSaveLater(input.cleanTitle, input.duration)) setError(t.failed);
      else { setTitle(""); setMinutes(""); setOpen(false); setNotice(t.savedLater); }
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  if (!open) return <div className="mb-5"><button type="button" onClick={() => { setOpen(true); setNotice(null); }} className="app-a-secondary-button app-a-focus-ring gap-2 px-4"><Plus className="h-4 w-4" aria-hidden="true" />{t.open}</button>{notice ? <p role="status" className="mt-2 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>{notice}</p> : null}</div>;

  return <section className="app-a-surface mb-5 p-4 sm:p-5" aria-labelledby="quick-add-title">
    <div className="flex items-start justify-between gap-3"><div><h2 id="quick-add-title" className="text-[18px] font-semibold">{t.title}</h2><p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.intro}</p></div><button type="button" onClick={() => setOpen(false)} className="app-a-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full" aria-label={t.cancel}><X className="h-4 w-4" /></button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]"><label className="text-[13px] font-medium">{t.task}<input autoFocus maxLength={500} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t.taskPlaceholder} className="app-a-field app-a-focus-ring mt-1 min-h-12 w-full px-3 text-[16px]" /></label><label className="text-[13px] font-medium">{t.minutes}<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="app-a-field app-a-focus-ring mt-1 min-h-12 w-full px-3 text-[16px]" /></label></div>
    {error ? <div role="alert" className="app-a-panel-danger mt-3 text-[13px]">{error}</div> : null}
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void add()} className="app-a-primary-button app-a-focus-ring px-4">{t.add}</button><button type="button" disabled={busy} onClick={() => void saveLater()} className="app-a-secondary-button app-a-focus-ring px-4">{t.later}</button>{error && (error === t.unknown || error === t.full(remaining)) ? <button type="button" onClick={onAdjustPlan} className="app-a-secondary-button app-a-focus-ring px-4">{language === "sr" ? "Prilagodi plan" : language === "tr" ? "Planı düzenle" : "Adjust plan"}</button> : null}</div>
  </section>;
}
