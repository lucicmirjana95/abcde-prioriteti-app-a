import React, { useState } from 'react';
import { DailyResetData, EnergyLevel, PleasantnessLevel, AvailableTimeValue, type AppALanguage } from '../../types';
import FiveLevelScale from './FiveLevelScale';
import AvailableTimeSelector from './AvailableTimeSelector';
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
  const [time, setTime] = useState<AvailableTimeValue | undefined>(initialData.availableTime);
  const [stateNote, setStateNote] = useState(initialData.stateNote);
  const [brainDump, setBrainDump] = useState(initialData.brainDump);
  const [showHelp, setShowHelp] = useState(!onboardingCompleted);

  const [timeError, setTimeError] = useState<string | undefined>();
  const [brainDumpError, setBrainDumpError] = useState<string | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError(undefined);
    setBrainDumpError(undefined);

    let hasError = false;

    // Validate brain dump
    if (!brainDump.trim()) {
      setBrainDumpError(t.brainDumpEmptyError);
      hasError = true;
    }

    // Validate custom time
    if (time?.type === 'custom') {
      const h = time.customHours || 0;
      const m = time.customMinutes || 0;
      if (h === 0 && m === 0) {
        setTimeError(t.timeErrorInvalid);
        hasError = true;
      }
    }

    if (hasError || !aiEnabled) return;

    onSubmit({
      energy,
      pleasantness,
      availableTime: time,
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
      {/* SECTION 2: Time */}
      <section
        className="order-2 flex flex-col gap-5 border-t p-5 sm:p-6"
        style={{ borderColor: "var(--app-a-border)" }}
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--app-a-text)" }}>
          {t.sectionTime}
        </h2>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--app-a-text-secondary)' }}>{language === 'sr' ? 'Koliko fleksibilnog vremena danas želiš da izdvojiš za zadatke iz ovog unosa? Ne računaj već zakazane ili neizbežne obaveze — njih samo navedi u unosu zajedno sa trajanjem. Ako još ne znaš, možeš početi jednim korakom.' : language === 'tr' ? 'Bu girdideki görevler için bugün ne kadar esnek zaman ayırmak istiyorsun? Önceden planlanmış veya kaçınılmaz sorumlulukları bu süreye katma; onları süreleriyle birlikte metinde belirt. Henüz bilmiyorsan tek bir adımla başlayabilirsin.' : 'How much flexible time do you want to spend on tasks from this entry today? Do not count fixed or unavoidable commitments here—include those in your text with their duration. If you are unsure, you can start with one step.'}</p>
        <AvailableTimeSelector
          unknownLabel={language === 'sr' ? 'Ne znam još' : language === 'tr' ? 'Henüz bilmiyorum' : "I'm not sure yet"}
          value={time}
          onChange={(val) => {
             setTime(val);
             onDraftChange?.({ availableTime: val });
             setTimeError(undefined);
          }}
          t={t}
          error={timeError}
        />
      </section>

      {/* SECTION 1: State */}
      <details className="order-3 border-t p-5 sm:p-6">
        <summary className="app-a-focus-ring cursor-pointer py-2 text-[16px] font-medium">{language === 'sr' ? 'Prilagodi energiji i raspoloženju — opciono' : language === 'tr' ? 'Enerji ve ruh haline göre ayarla — isteğe bağlı' : 'Adjust for energy and mood — optional'}</summary>
        <div className="mt-5 flex flex-col gap-6">
        {showHelp ? <p className="-mt-4 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.onboardingStateHelp}</p> : null}
        <FiveLevelScale 
          id="energy-scale"
          label={t.energyLabel}
          value={energy}
          onChange={(value) => { setEnergy(value); onDraftChange?.({ energy: value }); }}
          options={energyOptions}
          clearLabel={t.clearSelection}
        />
        <FiveLevelScale 
          id="pleasantness-scale"
          label={t.pleasantnessLabel}
          value={pleasantness}
          onChange={(value) => { setPleasantness(value); onDraftChange?.({ pleasantness: value }); }}
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
      </details>


      <div
        className="order-4 border-t p-5 sm:flex sm:justify-end sm:p-6"
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
