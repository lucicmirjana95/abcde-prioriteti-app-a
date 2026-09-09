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

export default function DailyResetForm({ t, language, initialData, onSubmit, onDraftChange, aiEnabled = true, aiDisabledMessage, onboardingCompleted = false, submissionError }: Props) {
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(initialData.energy);
  const [pleasantness, setPleasantness] = useState<PleasantnessLevel | undefined>(initialData.pleasantness);
  const [stateNote, setStateNote] = useState(initialData.stateNote);
  const [brainDump, setBrainDump] = useState(initialData.brainDump);
  const [showHelp, setShowHelp] = useState(!onboardingCompleted);

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
      setStateError(language === 'sr' ? 'Izaberite energiju i trenutno raspoloženje da bi plan bio prilagođen vašem stanju.' : language === 'tr' ? 'Planı durumunuza göre uyarlamak için enerji ve mevcut ruh halinizi seçin.' : 'Choose your energy and current mood so the plan can be adapted to your state.');
      hasError = true;
    }

    if (hasError || !aiEnabled) return;

    onSubmit({
      energy,
      pleasantness,
      availableTime: undefined,
      stateNote,
      brainDump
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
    <form onSubmit={handleSubmit} className="app-a-surface flex flex-col overflow-hidden">
      <div className="order-0 border-b p-5 sm:p-6" style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-accent-soft)" }}>
        {showHelp ? <>
          <h2 className="text-[21px] font-semibold tracking-[-0.02em]">{t.onboardingTitle}</h2>
          <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.onboardingIntro}</p>
          {onboardingCompleted ? <button type="button" onClick={() => setShowHelp(false)} className="app-a-focus-ring mt-2 min-h-[44px] rounded-lg text-[14px] font-medium" style={{ color: "var(--app-a-accent)" }}>{t.onboardingHideHelp}</button> : null}
        </> : <button type="button" onClick={() => setShowHelp(true)} className="app-a-focus-ring min-h-[44px] rounded-lg text-[14px] font-medium" style={{ color: "var(--app-a-accent)" }}>{t.onboardingHowItWorks}</button>}
      </div>
      
      {/* SECTION 3: Mind */}
      <section
        className="order-1 flex flex-col gap-5 border-t p-5 sm:p-6"
        style={{ borderColor: "var(--app-a-border)" }}
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--app-a-text)" }}>
          {t.sectionMind}
        </h2>
        {showHelp ? <p className="-mt-3 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.onboardingMindHelp}</p> : null}
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
      </section>
      {/* SECTION 1: State */}
      <section className="order-2 border-t p-5 sm:p-6" aria-labelledby="daily-state-heading">
        <h2 id="daily-state-heading" className="text-[20px] font-semibold tracking-[-0.02em]">{language === 'sr' ? 'Energija i raspoloženje' : language === 'tr' ? 'Enerji ve ruh hali' : 'Energy and mood'}</h2>
        <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{language === 'sr' ? 'Potrebno je da bi AI prilagodio zahtevnost, veličinu koraka i redosled zadataka.' : language === 'tr' ? 'Yapay zekanın zorluk düzeyini, adım boyutunu ve görev sırasını ayarlaması için gereklidir.' : 'Required so the AI can adapt difficulty, step size, and task order.'}</p>
        <div className="mt-5 flex flex-col gap-6">
        {showHelp ? <p className="-mt-4 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.onboardingStateHelp}</p> : null}
        <FiveLevelScale 
          id="energy-scale"
          label={t.energyLabel}
          value={energy}
          onChange={(value) => { setEnergy(value); setStateError(undefined); onDraftChange?.({ energy: value }); }}
          options={energyOptions}
          clearLabel={t.clearSelection}
        />
        {stateError ? <p role="alert" className="text-[13px]" style={{ color: "var(--app-a-danger)" }}>{stateError}</p> : null}
        <FiveLevelScale 
          id="pleasantness-scale"
          label={t.pleasantnessLabel}
          value={pleasantness}
          onChange={(value) => { setPleasantness(value); setStateError(undefined); onDraftChange?.({ pleasantness: value }); }}
          options={pleasantnessOptions}
          clearLabel={t.clearSelection}
        />
        <div className="flex flex-col gap-2 mt-2">
          <label htmlFor="state-note" className="text-[16px] font-medium" style={{ color: "var(--app-a-text)" }}>
            {t.stateNoteLabel}
          </label>
          <input
            id="state-note"
            type="text"
            value={stateNote}
            onChange={(e) => { setStateNote(e.target.value); onDraftChange?.({ stateNote: e.target.value }); }}
            placeholder={t.stateNotePlaceholder}
            className="app-a-field min-h-[48px] w-full px-4 text-[16px] transition-shadow"
          />
        </div>
        </div>
      </section>


      <div
        className="order-3 border-t p-5 sm:flex sm:justify-end sm:p-6"
        style={{
          borderColor: "var(--app-a-border)",
          backgroundColor: "var(--app-a-disabled-bg)",
        }}
      >
        {submissionError ? <p role="alert" className="mb-3 text-[13px] sm:mr-auto sm:mb-0" style={{ color: "var(--app-a-danger)" }}>{submissionError}</p> : null}
        <button
          type="submit"
          disabled={!aiEnabled}
          className="app-a-primary-button app-a-focus-ring w-full px-8 transition-colors sm:w-auto"
        >
          {onboardingCompleted ? t.submitPlan : t.submitFirstPlan}
        </button>
        {!aiEnabled && aiDisabledMessage ? <p className="mt-3 text-[13px] text-[#6E6E73] sm:mr-auto sm:mt-0 dark:text-[#AEAEB2]">{aiDisabledMessage}</p> : null}
      </div>

    </form>
  );
}
