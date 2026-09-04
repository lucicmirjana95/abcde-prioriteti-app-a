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
  aiEnabled?: boolean;
  aiDisabledMessage?: string;
}

export default function DailyResetForm({ t, language, initialData, onSubmit, aiEnabled = true, aiDisabledMessage }: Props) {
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(initialData.energy);
  const [pleasantness, setPleasantness] = useState<PleasantnessLevel | undefined>(initialData.pleasantness);
  const [time, setTime] = useState<AvailableTimeValue | undefined>(initialData.availableTime);
  const [stateNote, setStateNote] = useState(initialData.stateNote);
  const [brainDump, setBrainDump] = useState(initialData.brainDump);

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
    <form onSubmit={handleSubmit} className="app-a-surface overflow-hidden">
      
      {/* SECTION 1: State */}
      <section className="flex flex-col gap-6 p-5 sm:p-6">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--app-a-text)" }}>
          {t.sectionState}
        </h2>
        <FiveLevelScale 
          id="energy-scale"
          label={t.energyLabel}
          value={energy}
          onChange={setEnergy}
          options={energyOptions}
          clearLabel={t.clearSelection}
        />
        <FiveLevelScale 
          id="pleasantness-scale"
          label={t.pleasantnessLabel}
          value={pleasantness}
          onChange={setPleasantness}
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
            onChange={(e) => setStateNote(e.target.value)}
            placeholder={t.stateNotePlaceholder}
            className="app-a-field min-h-[48px] w-full px-4 text-[16px] transition-shadow"
          />
        </div>
      </section>

      {/* SECTION 2: Time */}
      <section
        className="flex flex-col gap-5 border-t p-5 sm:p-6"
        style={{ borderColor: "var(--app-a-border)" }}
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--app-a-text)" }}>
          {t.sectionTime}
        </h2>
        <AvailableTimeSelector 
          value={time}
          onChange={(val) => {
             setTime(val);
             setTimeError(undefined);
          }}
          t={t}
          error={timeError}
        />
      </section>

      {/* SECTION 3: Mind */}
      <section
        className="flex flex-col gap-5 border-t p-5 sm:p-6"
        style={{ borderColor: "var(--app-a-border)" }}
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--app-a-text)" }}>
          {t.sectionMind}
        </h2>
        <BrainDumpInput
          value={brainDump}
          onChange={(val) => {
             setBrainDump(val);
             setBrainDumpError(undefined);
          }}
          t={t}
          language={language}
          error={brainDumpError}
        />
      </section>

      <div
        className="border-t p-5 sm:flex sm:justify-end sm:p-6"
        style={{
          borderColor: "var(--app-a-border)",
          backgroundColor: "var(--app-a-disabled-bg)",
        }}
      >
        <button
          type="submit"
          disabled={!aiEnabled}
          className="app-a-primary-button app-a-focus-ring w-full px-8 transition-colors sm:w-auto"
        >
          {t.submitPlan}
        </button>
        {!aiEnabled && aiDisabledMessage ? <p className="mt-3 text-[13px] text-[#6E6E73] sm:mr-auto sm:mt-0 dark:text-[#AEAEB2]">{aiDisabledMessage}</p> : null}
      </div>

    </form>
  );
}
