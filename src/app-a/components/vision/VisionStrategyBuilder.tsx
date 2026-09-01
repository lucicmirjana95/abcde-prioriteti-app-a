import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Route, Save, ShieldCheck, Sparkles } from "lucide-react";
import type { VisionStrategyResult } from "../../../shared/domain/vision";
import { createVisionStrategy, decomposeVisionStep } from "../../api/visionStrategyApi";
import type { AppALanguage } from "../../types";
import { createVisionStrategyId, type SavedVisionStrategy } from "../../../shared/domain/vision";
import { saveVisionStrategy } from "../../../shared/persistence/vision";

const COPY = {
  en: { develop: "Develop this direction", loading: "Turning the idea into a practical path…", error: "The direction could not be developed. Try again.", saveError: "The strategy could not be saved.", saved: "Saved", imagine: "Imagine", plan: "Plan", check: "Check", why: "Why it matters", risks: "Risks", assumptions: "Assumptions to verify", next: "Smallest useful next step", hide: "Hide strategy", show: "Show strategy", breakDown: "Break down only if needed", checking: "Checking usefulness…", concrete: "This step is already concrete enough." },
  sr: { develop: "Razradi ovaj pravac", loading: "Pretvaram ideju u praktičan put…", error: "Pravac nije mogao da se razradi. Pokušajte ponovo.", saveError: "Strategija nije mogla da se sačuva.", saved: "Sačuvano", imagine: "Zamisli", plan: "Isplaniraj", check: "Proveri", why: "Zašto je važno", risks: "Rizici", assumptions: "Pretpostavke koje treba proveriti", next: "Najmanji koristan sledeći korak", hide: "Sakrij strategiju", show: "Prikaži strategiju", breakDown: "Razloži samo ako je potrebno", checking: "Proveravam korisnost…", concrete: "Ovaj korak je već dovoljno konkretan." },
  tr: { develop: "Bu yönü geliştir", loading: "Fikir uygulanabilir bir yola dönüştürülüyor…", error: "Yön geliştirilemedi. Tekrar deneyin.", saveError: "Strateji kaydedilemedi.", saved: "Kaydedildi", imagine: "Hayal et", plan: "Planla", check: "Kontrol et", why: "Neden önemli", risks: "Riskler", assumptions: "Doğrulanacak varsayımlar", next: "En küçük yararlı sonraki adım", hide: "Stratejiyi gizle", show: "Stratejiyi göster", breakDown: "Yalnızca gerekirse böl", checking: "Yararlılık kontrol ediliyor…", concrete: "Bu adım zaten yeterince somut." },
} as const;

export default function VisionStrategyBuilder({ idea, language, userId, initialDocument, onSaved }: { idea: string; language: AppALanguage; userId: string; initialDocument?: SavedVisionStrategy; onSaved?: (document: SavedVisionStrategy) => void }) {
  const t = COPY[language];
  const [strategy, setStrategy] = useState<VisionStrategyResult | null>(initialDocument?.strategy || null);
  const [documentId] = useState(initialDocument?.id || createVisionStrategyId);
  const [breakdowns, setBreakdowns] = useState<Record<string, string[]>>(initialDocument?.stepBreakdowns || {});
  const [checkingStep, setCheckingStep] = useState<string | null>(null);
  const [concreteStep, setConcreteStep] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(initialDocument));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function generate() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 42_000);
    setLoading(true); setError(false);
    try {
      const generated = await createVisionStrategy(idea, language, controller.signal);
      setStrategy(generated);
      setExpanded(true);
      const now = new Date().toISOString();
      const document: SavedVisionStrategy = { id: documentId, idea, language, strategy: generated, stepBreakdowns: {}, createdAt: initialDocument?.createdAt || now, updatedAt: now };
      await saveVisionStrategy(userId, document);
      setSaved(true); onSaved?.(document);
    } catch { setError(true); }
    finally { window.clearTimeout(timeout); setLoading(false); }
  }

  async function breakDown(step: string, key: string, depth: 0 | 1 = 0) {
    if (!strategy || checkingStep) return;
    setCheckingStep(key); setConcreteStep(null); setError(false);
    try {
      const result = await decomposeVisionStep({ idea, step, depth, language });
      if (!result.shouldDecompose) { setConcreteStep(key); return; }
      const nextBreakdowns = { ...breakdowns, [key]: result.substeps };
      setBreakdowns(nextBreakdowns);
      const now = new Date().toISOString();
      const document: SavedVisionStrategy = { id: documentId, idea, language, strategy, stepBreakdowns: nextBreakdowns, createdAt: initialDocument?.createdAt || now, updatedAt: now };
      await saveVisionStrategy(userId, document); setSaved(true); onSaved?.(document);
    } catch { setError(true); }
    finally { setCheckingStep(null); }
  }

  if (!strategy) return <div className="mt-4"><button type="button" onClick={() => void generate()} disabled={loading} className="app-a-secondary-button w-full justify-center">{loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t.loading}</> : <><Route className="h-4 w-4" aria-hidden="true" />{t.develop}</>}</button>{error ? <p className="mt-2 text-[13px] text-[#FF3B30]" role="alert">{t.error}</p> : null}</div>;

  return <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/10">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF]">{expanded ? t.hide : t.show}{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
    {expanded ? <div className="mt-4 space-y-5">
      <section><h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-[#AF52DE]"><Sparkles className="h-4 w-4" />{t.imagine}</h3><p className="mt-2 text-[15px] font-medium text-black dark:text-white">{strategy.outcome}</p><p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]"><strong>{t.why}:</strong> {strategy.importance}</p></section>
      <section><h3 className="flex items-center justify-between text-[13px] font-semibold uppercase tracking-[0.07em] text-[#0071E3] dark:text-[#0A84FF]"><span>{t.plan}</span>{saved ? <span className="flex items-center gap-1 normal-case tracking-normal text-[#34C759]"><Save className="h-3.5 w-3.5" />{t.saved}</span> : null}</h3><ol className="mt-2 space-y-3">{strategy.milestones.map((milestone, index) => <li key={`${milestone.title}-${index}`}><p className="text-[14px] font-semibold text-black dark:text-white">{index + 1}. {milestone.title}</p><p className="text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{milestone.result}</p><ul className="mt-1 space-y-2 text-[13px] text-[#3A3A3C] dark:text-[#D1D1D6]">{milestone.steps.map((step, stepIndex) => { const key = `m${index}-s${stepIndex}`; return <li key={key} className="border-l-2 border-black/10 pl-3 dark:border-white/15"><p>{step}</p>{breakdowns[key] ? <ul className="mt-1 list-disc space-y-2 pl-5">{breakdowns[key].map((substep, subIndex) => { const nestedKey = `${key}-d${subIndex}`; return <li key={nestedKey}><span>{substep}</span>{breakdowns[nestedKey] ? <ul className="mt-1 list-disc pl-5">{breakdowns[nestedKey].map((leaf) => <li key={leaf}>{leaf}</li>)}</ul> : <button type="button" disabled={checkingStep !== null} onClick={() => void breakDown(substep, nestedKey, 1)} className="app-a-focus-ring ml-2 text-[11px] font-semibold text-[#0071E3] dark:text-[#0A84FF]">{checkingStep === nestedKey ? t.checking : t.breakDown}</button>}{concreteStep === nestedKey ? <p className="text-[11px] text-[#34C759]">{t.concrete}</p> : null}</li>; })}</ul> : <button type="button" disabled={checkingStep !== null} onClick={() => void breakDown(step, key)} className="app-a-focus-ring mt-1 text-[12px] font-semibold text-[#0071E3] dark:text-[#0A84FF]">{checkingStep === key ? t.checking : t.breakDown}</button>}{concreteStep === key ? <p className="mt-1 text-[12px] text-[#34C759]">{t.concrete}</p> : null}</li>; })}</ul></li>)}</ol></section>
      <section><h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-[#34C759]"><ShieldCheck className="h-4 w-4" />{t.check}</h3>{strategy.risks.length ? <><p className="mt-2 text-[13px] font-semibold">{t.risks}</p><ul className="list-disc pl-5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{strategy.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul></> : null}{strategy.assumptions.length ? <><p className="mt-2 text-[13px] font-semibold">{t.assumptions}</p><ul className="list-disc pl-5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{strategy.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></> : null}</section>
      <div className="rounded-[14px] bg-[#0071E3]/8 p-3 text-[14px] text-black dark:bg-[#0A84FF]/15 dark:text-white"><strong>{t.next}:</strong> {strategy.nextStep}</div>
      {error ? <p className="text-[13px] text-[#FF3B30]" role="alert">{t.saveError}</p> : null}
    </div> : null}
  </div>;
}
