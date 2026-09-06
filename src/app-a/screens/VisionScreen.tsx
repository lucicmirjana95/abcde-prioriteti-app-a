import { useEffect, useState } from "react";
import { Archive, Lightbulb, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppALanguage } from "../types";
import { formatHistoryDate, getVisionItems } from "./planHistory";
import { useAppAPlanHistory } from "./useAppAPlanHistory";
import VisionStrategyBuilder from "../components/vision/VisionStrategyBuilder";
import type { SavedVisionStrategy } from "../../shared/domain/vision";
import { deleteVisionStrategy, loadVisionStrategies, setVisionStrategyArchived } from "../../shared/persistence/vision";
import type { DataResetEventDetail } from "../components/settings/DataResetModal";

const COPY = {
  en: { eyebrow: "Long-term direction", title: "Vision", intro: "Ideas worth keeping, separated from what needs your attention today.", empty: "Long-term ideas from your daily plans will appear here.", captured: "Captured", placeholder: "Describe a direction or goal you want to develop…", add: "Add direction", active: "Active", archived: "Archived", archive: "Archive", restore: "Restore", delete: "Delete", confirmDelete: "Delete permanently?", cancel: "Cancel", actionError: "The strategy could not be updated. Try again.", helpTitle: "Turn a direction into an achievable next step", helpIntro: "Describe the goal in your own words. We check feasibility, suggest a more realistic version when useful, and build milestones without unnecessary detail.", helpSteps: ["Describe your goal or direction.", "Add a desired timeframe if you have one.", "Answer only the questions that materially affect the strategy.", "Review the path and send one useful next step to Today."], how: "How does Vision work?", hide: "Hide help" },
  sr: { eyebrow: "Dugoročni pravac", title: "Vizija", intro: "Ideje koje vredi sačuvati, odvojene od onoga što traži pažnju danas.", empty: "Dugoročne ideje iz dnevnih planova pojaviće se ovde.", captured: "Zabeleženo", placeholder: "Opišite pravac ili cilj koji želite da razradite…", add: "Dodaj pravac", active: "Aktivno", archived: "Arhivirano", archive: "Arhiviraj", restore: "Vrati", delete: "Obriši", confirmDelete: "Trajno obrisati?", cancel: "Otkaži", actionError: "Strategija nije mogla da se izmeni. Pokušajte ponovo.", helpTitle: "Pretvorite pravac u ostvariv sledeći korak", helpIntro: "Opišite cilj svojim rečima. Proveravamo izvodljivost, predlažemo realniju verziju kada je korisna i pravimo etape bez nepotrebnog usitnjavanja.", helpSteps: ["Opišite cilj ili pravac.", "Dodajte željeni rok ako ga imate.", "Odgovorite samo na pitanja koja bitno menjaju strategiju.", "Pregledajte put i pošaljite jedan koristan sledeći korak u Danas."], how: "Kako Vizija radi?", hide: "Sakrij objašnjenja" },
  tr: { eyebrow: "Uzun vadeli yön", title: "Vizyon", intro: "Saklanmaya değer fikirler, bugün dikkatinizi isteyenlerden ayrı tutulur.", empty: "Günlük planlarınızdaki uzun vadeli fikirler burada görünür.", captured: "Kaydedildi", placeholder: "Geliştirmek istediğiniz yönü veya hedefi açıklayın…", add: "Yön ekle", active: "Aktif", archived: "Arşivlenmiş", archive: "Arşivle", restore: "Geri yükle", delete: "Sil", confirmDelete: "Kalıcı olarak silinsin mi?", cancel: "İptal", actionError: "Strateji güncellenemedi. Tekrar deneyin.", helpTitle: "Bir yönü ulaşılabilir sonraki adıma dönüştürün", helpIntro: "Hedefinizi kendi sözlerinizle anlatın. Uygulanabilirliği kontrol eder, yararlıysa daha gerçekçi bir sürüm önerir ve gereksiz ayrıntı olmadan aşamalar oluştururuz.", helpSteps: ["Hedefinizi veya yönünüzü açıklayın.", "Varsa istediğiniz süreyi ekleyin.", "Yalnızca stratejiyi önemli ölçüde etkileyen soruları yanıtlayın.", "Yolu gözden geçirin ve Bugün'e bir yararlı sonraki adım gönderin."], how: "Vizyon nasıl çalışır?", hide: "Yardımı gizle" },
} as const;

const VISION_ONBOARDING_KEY = "app_a_vision_onboarding_v1";
function readVisionOnboarding(): boolean { try { return localStorage.getItem(VISION_ONBOARDING_KEY) === "completed"; } catch { return false; } }

export default function VisionScreen({ language }: { language: AppALanguage }) {
  const [draftIdea, setDraftIdea] = useState("");
  const [manualIdeas, setManualIdeas] = useState<string[]>([]);
  const [savedStrategies, setSavedStrategies] = useState<SavedVisionStrategy[]>([]);
  const [strategyView, setStrategyView] = useState<"active" | "archived">("active");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(readVisionOnboarding);
  const [showHelp, setShowHelp] = useState(() => !readVisionOnboarding());
  const history = useAppAPlanHistory();
  const t = COPY[language];
  useEffect(() => {
    if (!history.user) return;
    let active = true;
    void loadVisionStrategies(history.user.uid).then((items) => { if (active) setSavedStrategies(items); }).catch(() => undefined);
    return () => { active = false; };
  }, [history.user]);

  useEffect(() => {
    if (savedStrategies.length === 0 || onboardingCompleted) return;
    setOnboardingCompleted(true);
    setShowHelp(false);
    try { localStorage.setItem(VISION_ONBOARDING_KEY, "completed"); } catch { /* storage unavailable */ }
  }, [onboardingCompleted, savedStrategies.length]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<DataResetEventDetail>;
      const completed = customEvent.detail?.completedScopes;
      if (!completed || completed.includes("vision_shared")) {
        setSavedStrategies([]);
        setManualIdeas([]);
        if (history.user) {
          void loadVisionStrategies(history.user.uid).then(setSavedStrategies).catch(() => undefined);
        }
      }
    };
    window.addEventListener("app-a-data-reset", handleReset);
    return () => window.removeEventListener("app-a-data-reset", handleReset);
  }, [history.user]);
  if (!history.authReady || history.loading) return <PlanHistoryState language={language} state="loading" />;
  if (history.error) return <PlanHistoryState language={language} state="error" onSignIn={history.user ? history.retry : () => void history.signIn()} />;
  if (!history.user) return <PlanHistoryState language={language} state="sign_in" onSignIn={() => void history.signIn()} />;
  const entries = getVisionItems(history.plans);
  const visibleStrategies = savedStrategies.filter((strategy) =>
    strategyView === "archived" ? strategy.status === "archived" : strategy.status !== "archived"
  );
  const hasVisibleContent = strategyView === "archived"
    ? visibleStrategies.length > 0
    : visibleStrategies.length > 0 || manualIdeas.length > 0 || entries.length > 0;
  const updateArchiveStatus = async (strategy: SavedVisionStrategy, archived: boolean) => {
    if (processingId) return;
    setProcessingId(strategy.id); setActionError(null);
    try {
      const next = await setVisionStrategyArchived(history.user.uid, strategy, archived);
      setSavedStrategies((items) => items.map((item) => item.id === next.id ? next : item));
    } catch { setActionError(t.actionError); }
    finally { setProcessingId(null); }
  };
  const removeStrategy = async (strategyId: string) => {
    if (processingId) return;
    setProcessingId(strategyId); setActionError(null);
    try {
      await deleteVisionStrategy(history.user.uid, strategyId);
      setSavedStrategies((items) => items.filter((item) => item.id !== strategyId));
      setDeleteConfirmId(null);
    } catch { setActionError(t.actionError); }
    finally { setProcessingId(null); }
  };
  return <div className="mx-auto w-full max-w-[760px] px-5 pb-8 sm:px-6">
    <header className="mb-7"><p className="app-a-eyebrow">{t.eyebrow}</p><h1 className="app-a-page-title">{t.title}</h1><p className="app-a-page-intro">{t.intro}</p></header>
    <section className="app-a-surface mb-4 border p-4 sm:p-5" style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-accent-soft)" }} aria-label={t.how}>
      {showHelp ? <><h2 className="text-[19px] font-semibold">{t.helpTitle}</h2><p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.helpIntro}</p><ol className="mt-3 grid gap-2 text-[14px] leading-relaxed">{t.helpSteps.map((step, index) => <li key={step} className="flex gap-2"><span className="font-semibold" style={{ color: "var(--app-a-accent)" }}>{index + 1}.</span><span>{step}</span></li>)}</ol>{onboardingCompleted ? <button type="button" onClick={() => setShowHelp(false)} className="app-a-focus-ring mt-3 min-h-11 rounded-lg text-[14px] font-medium" style={{ color: "var(--app-a-accent)" }}>{t.hide}</button> : null}</> : <button type="button" onClick={() => setShowHelp(true)} className="app-a-focus-ring min-h-11 rounded-lg text-[14px] font-medium" style={{ color: "var(--app-a-accent)" }}>{t.how}</button>}
    </section>
    <form className="app-a-surface mb-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); const idea = draftIdea.trim(); if (idea.length < 3) return; setManualIdeas((items) => [idea, ...items]); setDraftIdea(""); }}><textarea value={draftIdea} onChange={(event) => setDraftIdea(event.target.value)} maxLength={4000} rows={3} placeholder={t.placeholder} className="app-a-field app-a-focus-ring w-full resize-y p-3 text-[15px]" /><button type="submit" disabled={draftIdea.trim().length < 3} className="app-a-primary-button app-a-focus-ring mt-3 gap-2 px-5"><Plus className="h-4 w-4" />{t.add}</button></form>
    <div className="mb-4 flex gap-2" role="tablist"><button type="button" role="tab" aria-selected={strategyView === "active"} onClick={() => setStrategyView("active")} className={`app-a-focus-ring min-h-10 rounded-full px-4 text-[13px] font-semibold ${strategyView === "active" ? "app-a-primary-button" : "app-a-secondary-button"}`}>{t.active}</button><button type="button" role="tab" aria-selected={strategyView === "archived"} onClick={() => setStrategyView("archived")} className={`app-a-focus-ring min-h-10 rounded-full px-4 text-[13px] font-semibold ${strategyView === "archived" ? "app-a-primary-button" : "app-a-secondary-button"}`}>{t.archived}</button></div>
    {actionError ? <p role="alert" className="app-a-panel-danger mb-3 text-[13px]">{actionError}</p> : null}
    {!hasVisibleContent ? <div className="app-a-surface flex min-h-[160px] flex-col items-center justify-center gap-3 p-8 text-center"><Lightbulb className="h-6 w-6 text-[#AF52DE]" aria-hidden="true" /><p className="max-w-sm text-[15px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.empty}</p></div> : <div className="grid gap-3">{visibleStrategies.map((saved) => <article key={saved.id} className="app-a-surface p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#AF52DE]/10 text-[#AF52DE]"><Sparkles className="h-5 w-5" /></span><div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={processingId === saved.id} onClick={() => void updateArchiveStatus(saved, saved.status !== "archived")} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]">{saved.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{saved.status === "archived" ? t.restore : t.archive}</button>{deleteConfirmId === saved.id ? <><button type="button" disabled={processingId === saved.id} onClick={() => void removeStrategy(saved.id)} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-[12px]" style={{ color: "var(--app-a-danger)" }}><Trash2 className="inline h-4 w-4" /> {t.confirmDelete}</button><button type="button" onClick={() => setDeleteConfirmId(null)} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]">{t.cancel}</button></> : <button type="button" onClick={() => setDeleteConfirmId(saved.id)} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-[12px]" style={{ color: "var(--app-a-danger)" }}><Trash2 className="inline h-4 w-4" /> {t.delete}</button>}</div></div><h2 className="mt-4 text-[17px] font-semibold leading-snug text-black dark:text-white">{saved.idea}</h2>{saved.status !== "archived" ? <VisionStrategyBuilder idea={saved.idea} language={saved.language} userId={history.user.uid} initialDocument={saved} onSaved={(document) => setSavedStrategies((items) => items.map((item) => item.id === document.id ? document : item))} /> : null}</article>)}{strategyView === "active" ? manualIdeas.filter((idea) => !savedStrategies.some((saved) => saved.idea === idea)).map((idea, index) => <article key={`manual-${index}-${idea}`} className="app-a-surface p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#AF52DE]/10 text-[#AF52DE]"><Sparkles className="h-5 w-5" /></span><button type="button" onClick={() => setManualIdeas((items) => items.filter((item) => item !== idea))} className="app-a-focus-ring rounded-full p-2" aria-label={t.delete}><X className="h-4 w-4" /></button></div><h2 className="mt-4 text-[17px] font-semibold leading-snug text-black dark:text-white">{idea}</h2><VisionStrategyBuilder idea={idea} language={language} userId={history.user.uid} onSaved={(document) => setSavedStrategies((items) => [document, ...items.filter((item) => item.id !== document.id)])} /></article>) : null}{strategyView === "active" ? entries.filter(({ item }) => { const idea = item.suggestedAction || item.originalText; return !savedStrategies.some((saved) => saved.idea === idea); }).map(({ key, localDate, item }) => { const idea = item.suggestedAction || item.originalText; return <article key={key} className="app-a-surface p-5"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#AF52DE]/10 text-[#AF52DE]"><Sparkles className="h-5 w-5" aria-hidden="true" /></span><h2 className="text-[17px] font-semibold leading-snug text-black dark:text-white">{idea}</h2>{item.goalRelationship?.relationshipExplanation ? <p className="mt-2 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{item.goalRelationship.relationshipExplanation}</p> : null}<p className="mt-4 text-[12px] font-medium text-[#8E8E93]">{t.captured} {formatHistoryDate(localDate, language)}</p><VisionStrategyBuilder idea={idea} language={language} userId={history.user.uid} onSaved={(document) => setSavedStrategies((items) => [document, ...items.filter((entry) => entry.id !== document.id)])} /></article>; }) : null}</div>}
    {deleteConfirmId ? <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="vision-delete-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteConfirmId(null); }} onKeyDown={(event) => { if (event.key === "Escape" && !processingId) setDeleteConfirmId(null); }}>
      <div className="app-a-surface w-full max-w-[420px] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="vision-delete-title" className="text-[20px] font-semibold">{language === "sr" ? "Trajno obrisati ovu Viziju?" : language === "tr" ? "Bu Vizyon kalıcı olarak silinsin mi?" : "Permanently delete this Vision?"}</h2>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{language === "sr" ? "Strategija i njeni razrađeni koraci biće obrisani. Ovu radnju nije moguće poništiti." : language === "tr" ? "Strateji ve ayrıntılı adımları silinecek. Bu işlem geri alınamaz." : "The strategy and its developed steps will be deleted. This action cannot be undone."}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={Boolean(processingId)} onClick={() => setDeleteConfirmId(null)} className="app-a-secondary-button app-a-focus-ring px-4">{t.cancel}</button>
          <button type="button" disabled={Boolean(processingId)} onClick={() => void removeStrategy(deleteConfirmId)} className="app-a-focus-ring min-h-11 rounded-xl border px-4 font-semibold" style={{ color: "var(--app-a-danger)", borderColor: "var(--app-a-danger)" }}>{processingId ? (language === "sr" ? "Brisanje…" : language === "tr" ? "Siliniyor…" : "Deleting…") : t.confirmDelete}</button>
        </div>
      </div>
    </div> : null}
  </div>;
}
