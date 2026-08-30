import React, { useState } from 'react';
import { DailyResetData, EnergyLevel, PleasantnessLevel, AvailableTimeValue } from '../../types';
import FiveLevelScale from './FiveLevelScale';
import AvailableTimeSelector from './AvailableTimeSelector';
import BrainDumpInput from './BrainDumpInput';

interface Props {
  t: any;
  initialData: DailyResetData;
  onSubmit: (data: DailyResetData) => void;
}

export default function DailyResetForm({ t, initialData, onSubmit }: Props) {
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

    if (hasError) return;

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
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-black dark:text-white">
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
          <label htmlFor="state-note" className="text-[16px] font-medium text-black dark:text-white">
            {t.stateNoteLabel}
          </label>
          <input
            id="state-note"
            type="text"
            value={stateNote}
            onChange={(e) => setStateNote(e.target.value)}
            placeholder={t.stateNotePlaceholder}
          className="app-a-field min-h-[48px] w-full px-4 text-[16px] placeholder-black/35 transition-shadow dark:placeholder-white/35"
          />
        </div>
      </section>

      {/* SECTION 2: Time */}
      <section className="flex flex-col gap-5 border-t border-black/10 p-5 sm:p-6 dark:border-white/10">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-black dark:text-white">
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
      <section className="flex flex-col gap-5 border-t border-black/10 p-5 sm:p-6 dark:border-white/10">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-black dark:text-white">
          {t.sectionMind}
        </h2>
        <BrainDumpInput
          value={brainDump}
          onChange={(val) => {
             setBrainDump(val);
             setBrainDumpError(undefined);
          }}
          t={t}
          error={brainDumpError}
        />
      </section>

      <div className="border-t border-black/10 bg-black/[0.018] p-5 sm:flex sm:justify-end sm:p-6 dark:border-white/10 dark:bg-white/[0.025]">
        <button
          type="submit"
          className="app-a-primary-button app-a-focus-ring w-full px-8 transition-colors hover:bg-[#0077ED] sm:w-auto"
        >
          {t.submitPlan}
        </button>
      </div>

    </form>
  );
}
