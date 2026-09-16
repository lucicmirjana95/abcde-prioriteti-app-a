import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { DailyResetData, EnergyLevel, PleasantnessLevel, type AppALanguage } from '../../types';
import FiveLevelScale from './FiveLevelScale';
import BrainDumpInput from './BrainDumpInput';
import PlanCreationDisclosure from './PlanCreationDisclosure';

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
      className="flex flex-col gap-4 sm:gap-5"
    >
      {/* Disclosure: "How is your plan created?" — closed by default */}
      <PlanCreationDisclosure language={language} />

      {/* 1. Mind / Brain Dump Card */}
      <div
        className="app-a-surface rounded-[24px] border p-5 sm:p-6 shadow-sm transition-shadow"
        style={{ borderColor: "var(--app-a-border)" }}
      >
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
      </div>

      {/* 2. State (Energy & Mood) Cards - side by side */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <section
          className="app-a-surface rounded-[24px] border p-4 sm:p-5 shadow-sm transition-shadow flex flex-col justify-between"
          style={{ borderColor: "var(--app-a-border)" }}
          aria-labelledby="energy-scale-heading"
        >
          <FiveLevelScale
            id="energy-scale"
            label={t.energyLabel}
            subtitle={t.energySubtitle}
            value={energy}
            onChange={(value) => {
              setEnergy(value);
              setStateError(undefined);
              onDraftChange?.({ energy: value });
            }}
            options={energyOptions}
            clearLabel={t.clearSelection}
            minLabel={language === "sr" ? "Veoma niska" : language === "tr" ? "Çok düşük" : "Very low"}
            maxLabel={language === "sr" ? "Veoma visoka" : language === "tr" ? "Çok yüksek" : "Very high"}
          />
        </section>

        <section
          className="app-a-surface rounded-[24px] border p-4 sm:p-5 shadow-sm transition-shadow flex flex-col justify-between"
          style={{ borderColor: "var(--app-a-border)" }}
          aria-labelledby="pleasantness-scale-heading"
        >
          <FiveLevelScale
            id="pleasantness-scale"
            label={t.pleasantnessLabel}
            subtitle={t.pleasantnessSubtitle}
            value={pleasantness}
            onChange={(value) => {
              setPleasantness(value);
              setStateError(undefined);
              onDraftChange?.({ pleasantness: value });
            }}
            options={pleasantnessOptions}
            clearLabel={t.clearSelection}
            minLabel={language === "sr" ? "Veoma teško" : language === "tr" ? "Çok zor" : "Very hard"}
            maxLabel={language === "sr" ? "Veoma prijatno" : language === "tr" ? "Çok hoş" : "Very pleasant"}
          />
        </section>
      </div>

      {stateError ? (
        <p role="alert" className="text-[13px] font-medium px-2" style={{ color: "var(--app-a-danger)" }}>
          {stateError}
        </p>
      ) : null}

      {/* 3. Optional State Note Card */}
      <section
        className="app-a-surface rounded-[24px] border p-4 sm:p-5 shadow-sm transition-shadow flex flex-col gap-2.5"
        style={{ borderColor: "var(--app-a-border)" }}
        aria-labelledby="state-note-heading"
      >
        <div className="flex flex-col gap-0.5">
          <label id="state-note-heading" htmlFor="state-note" className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--app-a-text)" }}>
            {t.stateNoteLabel || (language === 'sr' ? 'Još nešto o tvom stanju?' : language === 'tr' ? 'Durumun hakkında başka bir şey var mı?' : 'Anything else about your state?')}
          </label>
          <span className="text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
            {t.stateNoteSubtitle || (language === 'sr' ? 'Opciono' : language === 'tr' ? 'İsteğe bağlı' : 'Optional')}
          </span>
        </div>
        <input
          id="state-note"
          type="text"
          value={stateNote}
          onChange={(e) => {
            setStateNote(e.target.value);
            onDraftChange?.({ stateNote: e.target.value });
          }}
          placeholder={t.stateNotePlaceholder || (language === 'sr' ? 'Na primer: loše sam spavao, imam važan sastanak...' : language === 'tr' ? 'Örneğin: kötü uyudum, önemli bir toplantım var...' : 'For example: slept poorly, have an important meeting...')}
          className="app-a-field min-h-[46px] w-full px-4 text-[16px] rounded-[16px] transition-shadow"
          style={{ background: "var(--app-a-surface-secondary)" }}
        />
      </section>

      {/* 4. CTA Action */}
      <div className="pt-2 flex flex-col gap-3">
        {submissionError ? (
          <p role="alert" className="text-[13px] font-medium px-2" style={{ color: "var(--app-a-danger)" }}>
            {submissionError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!aiEnabled}
          className="app-a-btn-primary app-a-focus-ring flex items-center justify-center gap-2.5 w-full min-h-[52px] rounded-full text-[16px] font-semibold shadow-md transition-all"
        >
          <span>{t.submitPlan}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        {!aiEnabled && aiDisabledMessage ? (
          <p className="text-[13px] text-center" style={{ color: "var(--app-a-text-secondary)" }}>{aiDisabledMessage}</p>
        ) : null}
      </div>
    </form>
  );
}
