import React, { useState } from 'react';
import { DailyResetData, EnergyLevel, PleasantnessLevel, type AppALanguage } from '../../types';
import FiveLevelScale from './FiveLevelScale';
import BrainDumpInput from './BrainDumpInput';

interface Props {
  t: any;
  language: AppALanguage;
  initialData: DailyResetData;
  onSubmit: (data: DailyResetData) => void;
  onDraftChange?: (data: Partial<DailyResetData>) => void;
  aiEnabled?: boolean;
  aiDisabledMessage?: string;
  onboardingCompleted?: boolean;
  submissionError?: string | null;
}

export default function DailyResetForm({
  t,
  language,
  initialData,
  onSubmit,
  onDraftChange,
  aiEnabled = true,
  aiDisabledMessage,
  onboardingCompleted = false,
  submissionError,
}: Props) {
  const [showHowItWorks, setShowHowItWorks] = useState(!onboardingCompleted);
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(initialData.energy);
  const [pleasantness, setPleasantness] = useState<PleasantnessLevel | undefined>(initialData.pleasantness);
  const [stateNote, setStateNote] = useState(initialData.stateNote);
  const [showNote, setShowNote] = useState(Boolean(initialData.stateNote));
  const [brainDump, setBrainDump] = useState(initialData.brainDump);

  const [brainDumpError, setBrainDumpError] = useState<string | undefined>();
  const [stateError, setStateError] = useState<string | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBrainDumpError(undefined);
    setStateError(undefined);

    let hasError = false;

    // Validate brain dump
    if (!brainDump.trim()) {
      setBrainDumpError(t.brainDumpEmptyError);
      hasError = true;
    }

    if (energy === undefined || pleasantness === undefined) {
      setStateError(
        language === 'sr'
          ? 'Izaberite energiju i trenutno raspoloženje da bi plan bio prilagođen vašem stanju.'
          : language === 'tr'
          ? 'Planı durumunuza göre uyarlamak için enerji ve mevcut ruh halinizi seçin.'
          : 'Choose your energy and current mood so the plan can be adapted to your state.'
      );
      hasError = true;
    }

    if (hasError || !aiEnabled) return;

    onSubmit({
      energy,
      pleasantness,
      availableTime: undefined,
      stateNote,
      brainDump,
    });
  };

  const energyOptions = [
    { value: 1 as EnergyLevel, label: t.energy1 },
    { value: 2 as EnergyLevel, label: t.energy2 },
    { value: 3 as EnergyLevel, label: t.energy3 },
    { value: 4 as EnergyLevel, label: t.energy4 },
    { value: 5 as EnergyLevel, label: t.energy5 },
  ];

  const pleasantnessOptions = [
    { value: 1 as PleasantnessLevel, label: t.pleasantness1 },
    { value: 2 as PleasantnessLevel, label: t.pleasantness2 },
    { value: 3 as PleasantnessLevel, label: t.pleasantness3 },
    { value: 4 as PleasantnessLevel, label: t.pleasantness4 },
    { value: 5 as PleasantnessLevel, label: t.pleasantness5 },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="app-a-surface rounded-2xl border p-4 sm:p-5 md:p-6 flex flex-col gap-5 transition-shadow shadow-sm"
      style={{ borderColor: "var(--app-a-border)" }}
    >
      <section className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--app-a-border)", background: "var(--app-a-surface-secondary)" }}>
        <button
          type="button"
          aria-expanded={showHowItWorks}
          onClick={() => setShowHowItWorks(value => !value)}
          className="app-a-focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left"
        >
          <span>
            <span className="block text-[14px] font-semibold">{t.onboardingHowItWorks}</span>
            {!onboardingCompleted && !showHowItWorks ? <span className="mt-0.5 block text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>{t.onboardingIntro}</span> : null}
          </span>
          <span aria-hidden="true" className="text-[18px]">{showHowItWorks ? '−' : '+'}</span>
        </button>
        {showHowItWorks ? (
          <div className="mt-2 border-t pt-3 text-[13px] leading-relaxed" style={{ borderColor: "var(--app-a-border)", color: "var(--app-a-text-secondary)" }}>
            <p className="font-medium" style={{ color: "var(--app-a-text)" }}>{t.onboardingTitle}</p>
            <p className="mt-1">{t.onboardingIntro}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {[
                [t.onboardingSortTitle, t.onboardingSortText],
                [t.onboardingPrioritizeTitle, t.onboardingPrioritizeText],
                [t.onboardingControlTitle, t.onboardingControlText],
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg border p-3" style={{ borderColor: "var(--app-a-border)", background: "var(--app-a-surface)" }}>
                  <h3 className="text-[13px] font-semibold" style={{ color: "var(--app-a-text)" }}>{title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* 1. Mind / Brain Dump */}
      <BrainDumpInput
        value={brainDump}
        onChange={(val) => {
          setBrainDump(val);
          onDraftChange?.({ brainDump: val });
          setBrainDumpError(undefined);
        }}
        t={t}
        language={language}
        error={brainDumpError}
      />

      {/* 2. State (Energy & Mood) */}
      <section className="flex flex-col gap-3 pt-3 border-t" style={{ borderColor: "var(--app-a-border)" }} aria-labelledby="daily-state-heading">
        <div className="flex flex-col gap-0.5">
          <h2 id="daily-state-heading" className="text-[15px] sm:text-[16px] font-semibold" style={{ color: "var(--app-a-text)" }}>
            {t.stateSectionTitle || (language === 'sr' ? 'Tvoje trenutno stanje' : language === 'tr' ? 'Nasıl hissediyorsun?' : 'How are you feeling?')}
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
            {t.stateSectionSubtitle || (language === 'sr' ? 'Pomaže nam da ne pretrpamo plan ako si bez snage.' : language === 'tr' ? 'Enerjin düşükse gününü fazla doldurmamıza engel olur.' : 'Helps us avoid overloading your day if your energy is low.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 mt-1">
          <FiveLevelScale
            id="energy-scale"
            label={t.energyLabel}
            value={energy}
            onChange={(value) => {
              setEnergy(value);
              setStateError(undefined);
              onDraftChange?.({ energy: value });
            }}
            options={energyOptions}
            clearLabel={t.clearSelection}
          />

          <FiveLevelScale
            id="pleasantness-scale"
            label={t.pleasantnessLabel}
            value={pleasantness}
            onChange={(value) => {
              setPleasantness(value);
              setStateError(undefined);
              onDraftChange?.({ pleasantness: value });
            }}
            options={pleasantnessOptions}
            clearLabel={t.clearSelection}
          />
        </div>

        {stateError ? (
          <p role="alert" className="text-[13px] font-medium" style={{ color: "var(--app-a-danger)" }}>
            {stateError}
          </p>
        ) : null}

        {/* Optional State Note */}
        {showNote ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between">
              <label htmlFor="state-note" className="text-[13px] font-medium" style={{ color: "var(--app-a-text-secondary)" }}>
                {t.stateNoteLabel}
              </label>
              {!initialData.stateNote && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNote(false);
                    setStateNote("");
                    onDraftChange?.({ stateNote: "" });
                  }}
                  className="app-a-focus-ring text-[12px] font-medium rounded px-1.5 py-0.5 transition-colors"
                  style={{ color: "var(--app-a-text-tertiary)" }}
                >
                  {language === 'sr' ? 'Otkaži' : language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
              )}
            </div>
            <input
              id="state-note"
              type="text"
              value={stateNote}
              onChange={(e) => {
                setStateNote(e.target.value);
                onDraftChange?.({ stateNote: e.target.value });
              }}
              placeholder={t.stateNotePlaceholder}
              className="app-a-field min-h-[44px] w-full px-3.5 text-[14px] sm:text-[15px] transition-shadow"
            />
          </div>
        ) : (
          <div className="mt-0.5">
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="app-a-focus-ring inline-flex min-h-[36px] items-center text-[13px] font-medium transition-colors hover:underline"
              style={{ color: "var(--app-a-accent)" }}
            >
              {t.stateNoteToggle || (language === 'sr' ? '+ Dodaj kratku belešku o stanju' : language === 'tr' ? '+ Durumun hakkında kısa bir not ekle' : '+ Add a quick note about your state')}
            </button>
          </div>
        )}
      </section>

      {/* 3. CTA Action */}
      <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: "var(--app-a-border)" }}>
        {submissionError ? (
          <p role="alert" className="text-[13px] font-medium" style={{ color: "var(--app-a-danger)" }}>
            {submissionError}
          </p>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={!aiEnabled}
          className="app-a-primary-button app-a-focus-ring w-full sm:w-auto px-8 min-h-[48px] text-[15px] sm:text-[16px] font-semibold transition-all shadow-sm"
        >
          {t.submitPlan}
        </button>
        {!aiEnabled && aiDisabledMessage ? (
          <p className="text-[13px] text-[#6E6E73] dark:text-[#AEAEB2] sm:order-first">{aiDisabledMessage}</p>
        ) : null}
      </div>
    </form>
  );
}
