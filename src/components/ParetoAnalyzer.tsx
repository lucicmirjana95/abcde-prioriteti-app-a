import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  BarChart3,
  Plus,
  Trash2,
  ArrowUpRight,
  Ban,
  Loader2,
  HelpCircle,
  X,
  Trophy,
  BookOpen,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Task } from "../types";
import { triggerDiscoveryEvent } from "../lib/discoveryEngine";

interface ParetoAnalyzerProps {
  language: "en" | "sr" | "tr";
  tasks?: Task[];
  onAddTask: (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
    effort?: number,
    impact?: number,
  ) => void;
  isEvening?: boolean;
  onUpdateTask?: (id: string, fields: Partial<Task>) => void;
  onBulkUpdateTasks?: (updates: { id: string; fields: Partial<Task> }[]) => void;
  onDeleteTask?: (id: string) => void;
}

interface ParetoItem {
  id: string;
  name: string;
  effort: number; // 1-10 (10 = highest effort)
  impact: number; // 1-10 (10 = highest result)
}

export default function ParetoAnalyzer({
  language,
  tasks = [],
  onAddTask,
  isEvening = false,
  onUpdateTask,
  onBulkUpdateTasks,
  onDeleteTask,
}: ParetoAnalyzerProps) {
  const isEn = language === "en";

  const [items, setItems] = useState<ParetoItem[]>(() => {
    if (tasks.length > 0) {
      return tasks
        .filter((t) => !t.done && t.category !== "E")
        .map((t) => ({
          id: t.id,
          name: t.title,
          effort: t.effort || 0,
          impact: t.impact || 0,
        }));
    }
    return [
      {
        id: "1",
        name: isEn
          ? "Prepare main client presentation"
          : language === "tr"
            ? "Ana müşteri sunumunu hazırlamak"
            : "Priprema glavne prezentacije za klijenta",
        effort: 4,
        impact: 9,
      },
      {
        id: "2",
        name: isEn
          ? "Answering low priority emails"
          : language === "tr"
            ? "Düşük öncelikli e-postaları yanıtlama"
            : "Odgovaranje na nevažne i kasne mejlove",
        effort: 8,
        impact: 2,
      },
      {
        id: "3",
        name: isEn
          ? "Learning high-income skill (React/AI)"
          : language === "tr"
            ? "Yüksek gelirli becerilerin öğrenilmesi (React/AI)"
            : "Edukacija i učenje novih veština (React/AI)",
        effort: 5,
        impact: 9,
      },
      {
        id: "4",
        name: isEn
          ? "Organizing desktop files & colors"
          : language === "tr"
            ? "Masaüstü dosyalarını ve renklerini düzenleme"
            : "Slaganje fajlova na računaru i čišćenje foldera",
        effort: 7,
        impact: 2,
      },
      {
        id: "5",
        name: isEn
          ? "Calling strategic partners for deals"
          : language === "tr"
            ? "Anlaşmalar için stratejik ortakları aramak"
            : "Pozivanje i dogovor sa strateškim partnerima",
        effort: 3,
        impact: 8,
      },
    ];
  });

  useEffect(() => {
    if (tasks) {
      setItems(
        tasks
          .filter((t) => !t.done && t.category !== "E")
          .map((t) => ({
            id: t.id,
            name: t.title,
            effort: t.effort ?? 0,
            impact: t.impact ?? 0,
          })),
      );
    }
  }, [tasks]);

  const [newItemName, setNewItemName] = useState("");
  const [newEffort, setNewEffort] = useState(5);
  const [newImpact, setNewImpact] = useState(5);

  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiLoadingItemId, setAiLoadingItemId] = useState<string | null>(null);
  const [itemQuestions, setItemQuestions] = useState<
    Record<string, { question: string; suggestedAnswers?: string[] }>
  >({});
  const [aiScoreExplanation, setAiScoreExplanation] = useState<string | null>(
    null,
  );
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [aiSuggestedAnswers, setAiSuggestedAnswers] = useState<string[] | null>(
    null,
  );
  const contextInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [animationStatus, setAnimationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const triggerHaptics = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error",
  ) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        switch (type) {
          case "light":
            navigator.vibrate(10);
            break;
          case "medium":
            navigator.vibrate(30);
            break;
          case "heavy":
            navigator.vibrate(60);
            break;
          case "success":
            navigator.vibrate([30, 50, 30]);
            break;
          case "warning":
            navigator.vibrate([40, 60, 40]);
            break;
          case "error":
            navigator.vibrate([60, 100, 60, 100]);
            break;
        }
      } catch (e) {
        console.warn("Haptics blocked inside iframe", e);
      }
    }
  };

  const [isScoringWizardOpen, setIsScoringWizardOpen] = useState(false);

  const helpTemplates = [
    {
      nameSr: "Jutarnji rad u dubokom fokusu (Deep Work)",
      nameEn: "Morning Deep Work Sessions",
      effort: 4,
      impact: 9,
      descSr:
        "90 minuta izolovanog rada ujutru na najtežoj stvari donosi 80% svih poslovnih i akademskih rezultata.",
      descEn:
        "90 minutes of morning work on your hardest priority task produces 80% of daily outcomes.",
      catSr: "Fokus i karijera",
      catEn: "Focus & Career",
    },
    {
      nameSr: "Automatizacija čestih odgovora & mejlova",
      nameEn: "Email automation & template setup",
      effort: 3,
      impact: 8,
      descSr:
        "Jednokratno formiranje šablona sprečava ponovljeni dnevni umor i štedi desetine radnih sati mesečno.",
      descEn:
        "Setting up automated replies and templates saves hours of repeated manual work weekly.",
      catSr: "Sistemi i alati",
      catEn: "Systems & Tools",
    },
    {
      nameSr: "Sportski trening (brzo vežbanje)",
      nameEn: "Daily athletic workout or run",
      effort: 3,
      impact: 9,
      descSr:
        "Samo 30 minuta kardio vežbi regeneriše mitohondrije i pruža trajan energetski poticaj za ceo dan.",
      descEn:
        "Just 30 minutes of intentional cardio movement generates superb cognitive energy for the entire day.",
      catSr: "Zdravlje i energija",
      catEn: "Health & Energy",
    },
    {
      nameSr: "Sastanci bez definisane agende",
      nameEn: "Unstructured calendar meetings",
      effort: 8,
      impact: 2,
      descSr:
        "Započinju bez jasnog cilja, traju satima i troše dragocenu energiju tima bez ikakvih odluka.",
      descEn:
        "No-agenda meetings that waste team focus hours without generating actual execution steps.",
      catSr: "Gubitak vremena",
      catEn: "Time Wasters",
    },
    {
      nameSr: "Iskrena komunikacija sa ključnim kupcima",
      nameEn: "Direct reach-out to key clients",
      effort: 4,
      impact: 10,
      descSr:
        "Rad i posvećenost ka top 20% klijenata donosi najveću stabilnost i gotovo 80% prihoda.",
      descEn:
        "Cultivating relations with elite customers brings maximum project stability and high retainers.",
      catSr: "Biznis i finansije",
      catEn: "Business & Growth",
    },
    {
      nameSr: "Skrolovanje vesti i društvenih mreža",
      nameEn: "Endless scrolling through feeds",
      effort: 7,
      impact: 1,
      descSr:
        "Iako deluje 'lagano', skraćuje raspon pažnje, stvara dopaminsku zavisnost i ostavlja vas iscrpljenim.",
      descEn:
        "Saps valuable focus hours while keeping you passive, anxious, and emotionally fatigued.",
      catSr: "Gubitak vremena",
      catEn: "Time Wasters",
    },
  ];

  const handleApplyTemplate = (
    name: string,
    effort: number,
    impact: number,
  ) => {
    setNewItemName(name);
    setNewEffort(effort);
    setNewImpact(impact);
    setIsScoringWizardOpen(false);
  };

  const [result, setResult] = useState<{
    vitalFew: {
      name: string;
      whyLeverage: string;
      leverageRatio?: number;
      estimatedImpactPercentage?: number;
    }[];
    trivialMany: {
      name: string;
      recommendation: string;
      leverageRatio?: number;
    }[];
    executiveSummary: string;
  } | null>(null);

  const t = {
    title: isEn
      ? "High-Impact Task Analyzer"
      : language === "tr"
        ? "Yüksek Etkili Görev Analizörü"
        : "Analiza pametnih prioriteta",
    subtitle: isEn
      ? "Identify the few key tasks that bring the most results, and safely remove the rest."
      : language === "tr"
        ? "En fazla sonucu getiren birkaç temel görevi belirleyin ve geri kalanını güvenle kaldırın."
        : "Pronađite onih nekoliko ključnih aktivnosti koje donose najviše rezultata i bez griže savesti sklonite nebitno.",
    activityName: isEn
      ? "Activity (Investment Name)"
      : language === "tr"
        ? "Faaliyet (Yatırım Adı)"
        : "Naziv aktivnosti (Investicije)",
    effort: isEn
      ? "Effort (Time Spent)"
      : language === "tr"
        ? "Çaba (Harcanan Zaman)"
        : "Napor (Potrošeno vreme)",
    impact: isEn
      ? "Impact (Reward)"
      : language === "tr"
        ? "Etki (Ödül)"
        : "Efekat (Nagrada)",
    addBtn: isEn
      ? "Add Input"
      : language === "tr"
        ? "Giriş Ekle"
        : "Dodaj aktivnost",
    tableHeading: isEn
      ? "Current Matrix Evaluation"
      : language === "tr"
        ? "Güncel Matris Değerlendirmesi"
        : "Pregled i evaluacija aktivnosti",
    leverageScore: isEn
      ? "Leverage Index"
      : language === "tr"
        ? "Kaldıraç Endeksi"
        : "Indeks poluge",
    analyzeBtn: isEn
      ? "Find My 20% Catalyst"
      : language === "tr"
        ? "%20 Katalizörümü Bul"
        : "Pronađi ključnih 20% sa AI",
    vitalFewTitle: isEn
      ? "⚡ The Vital Few (Keep/Double Down)"
      : language === "tr"
        ? "⚡ Hayati Az (Tut/İkiye Katla)"
        : "⚡ Vitalni pokretači (Duplirajte fokus ovde)",
    trivialTitle: isEn
      ? "🗑️ The Trivial Many (Delegate/Eliminate)"
      : language === "tr"
        ? "🗑️ Önemsiz Çoğunluk (Delege Et/Eleme)"
        : "🗑️ Trivijalni gutači energije (Optimizujte)",
    summary: isEn
      ? "Executive Focus Direction"
      : language === "tr"
        ? "Yönetici Odak Yönü"
        : "Strateški pravac i zaključak trenera",
    addSuccess: isEn
      ? "Task successfully saved!"
      : language === "tr"
        ? "Görev başarıyla kaydedildi!"
        : "Zadatak uspešno zabeležen!",
    actionBtn: isEn
      ? "Promote to Priority Board"
      : language === "tr"
        ? "Öncelik Kuruluna Yükselt"
        : "Prebaci na prioritete",
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    // Call the parent to add to main task list
    onAddTask(
      newItemName.trim(),
      "",
      "C", // Default to Category C
      newEffort,
      newImpact,
    );

    setNewItemName("");
    setNewEffort(5);
    setNewImpact(5);
    setAiScoreExplanation(null);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (onDeleteTask) {
      onDeleteTask(id);
    }
  };

  const handleUpdateItemValue = (
    id: string,
    field: "effort" | "impact",
    value: number,
  ) => {
    const clampedValue = value === 0 ? 0 : Math.max(1, Math.min(10, value));

    // Update local state first to make it responsive
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: clampedValue } : item,
      ),
    );

    // Sync to main task list in App.tsx
    if (onUpdateTask) {
      const p = onUpdateTask(id, { [field]: clampedValue }) as unknown as Promise<void>;
      if (p && typeof p.catch === 'function') p.catch(console.error);
    }
  };

  const handleUpdateItemValues = (
    id: string,
    updates: { effort?: number; impact?: number },
  ) => {
    const dbUpdates: Partial<Task> = {};
    if (updates.effort !== undefined) {
      dbUpdates.effort =
        updates.effort === 0 ? 0 : Math.max(1, Math.min(10, updates.effort));
    }
    if (updates.impact !== undefined) {
      dbUpdates.impact =
        updates.impact === 0 ? 0 : Math.max(1, Math.min(10, updates.impact));
    }

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...dbUpdates } : item)),
    );

    if (onUpdateTask) {
      const p = onUpdateTask(id, dbUpdates) as unknown as Promise<void>;
      if (p && typeof p.catch === 'function') p.catch(console.error);
    }
  };

  const [bulkScoring, setBulkScoring] = useState(false);

  const handleBulkScore = async () => {
    const unscoredItems = items.filter((i) => i.effort === 0 || i.impact === 0);
    if (unscoredItems.length === 0) return;
    setBulkScoring(true);
    setError(null);
    try {
      const response = await fetch("/api/pareto-score-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: unscoredItems, language }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Bulk scoring failed");
      }
      
      if (data.scoredItems && Array.isArray(data.scoredItems)) {
        const localUpdates: Record<string, { effort: number; impact: number }> = {};
        const appUpdates: { id: string; fields: Partial<Task> }[] = [];
        
        data.scoredItems.forEach((scored: any) => {
          if (scored.effort != null && scored.impact != null) {
            const effort = scored.effort === 0 ? 0 : Math.max(1, Math.min(10, scored.effort));
            const impact = scored.impact === 0 ? 0 : Math.max(1, Math.min(10, scored.impact));
            
            localUpdates[scored.id] = { effort, impact };
            appUpdates.push({ id: scored.id, fields: { effort, impact } });
          } else if (scored.questionToUser) {
             setItemQuestions((prev) => ({
                ...prev,
                [scored.id]: {
                  question: scored.questionToUser,
                  suggestedAnswers: scored.suggestedAnswers,
                },
             }));
          }
        });

        if (Object.keys(localUpdates).length > 0) {
          setItems((prev) =>
            prev.map((item) => {
              if (localUpdates[item.id]) {
                return { ...item, ...localUpdates[item.id] };
              }
              return item;
            })
          );
          
          if (onBulkUpdateTasks && appUpdates.length > 0) {
            const p = onBulkUpdateTasks(appUpdates) as any;
            if (p && typeof p.catch === 'function') p.catch(console.error);
          } else if (onUpdateTask) {
            // fallback if onBulkUpdateTasks isn't provided
            appUpdates.forEach(up => {
              const p = onUpdateTask(up.id, up.fields) as any;
              if (p && typeof p.catch === 'function') p.catch(console.error);
            });
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to bulk score.");
    } finally {
      setBulkScoring(false);
    }
  };

  const handleAnalyzePareto = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setAnimationStatus("loading");
    triggerHaptics("medium");
    setError(null);
    try {
      const response = await fetch("/api/pareto-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, language }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Pareto failed");
      }
      setResult(data);
      setAnimationStatus("success");
      triggerHaptics("success");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } catch (err: any) {
      setError(
        isEn
          ? "Error processing Pareto calculation"
          : language === "tr"
            ? "Pareto hesaplaması işlenirken hata oluştu"
            : "Greška prilikom analize pareto poluge",
      );
      setAnimationStatus("error");
      triggerHaptics("error");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } finally {
      setLoading(false);
    }
  };

  const promoteTask = (
    id: string,
    taskName: string,
    category: "A" | "B" | "D" | "E",
  ) => {
    if (onUpdateTask) {
      const p = onUpdateTask(id, { category }) as unknown as Promise<void>;
      if (p && typeof p.catch === 'function') p.catch(console.error);
    }
    
    if (category === "A" || category === "B") {
      triggerDiscoveryEvent("high_leverage_task_identified", { taskId: id });
    } else if (category === "D") {
      triggerDiscoveryEvent("task_deferred", { taskId: id });
    }

    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn
            ? `High-leverage task "${taskName}" routed to Category ${category}! 📥`
            : language === "tr"
              ? `Yüksek kaldıraçlı görev "${taskName}" Kategori ${category}'ye yönlendirildi! 📥`
              : `Ključni zadatak poluge "${taskName}" je usmeren u kategoriju ${category}! 📥`,
          type: "success",
        },
      }),
    );
  };

  return (
    <div
      className={`border rounded-xl p-6 space-y-6 transition-all duration-300 ${
        isEvening
          ? "bg-[#1C1C1E] border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
          : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white"
      }`}
      id="pareto-analyzer-root"
    >
      {/* Header section */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-black/5 dark:border-white/5`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-xl bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759]`}
            >
              <BarChart3 className="w-5 h-5 font-medium" />
            </span>
            <h2 className={`text-xl font-semibold text-black dark:text-white`}>
              {t.title}
            </h2>
          </div>
          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed max-w-xl">
            {t.subtitle}
          </p>
        </div>
        <div
          className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 p-2.5 rounded-xl max-w-xs md:text-right border leading-relaxed ${
            isEvening
              ? "bg-black border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
              : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
          }`}
        >
          {isEn
            ? "Pareto's theorem states 80% of results come from 20% of effort. Focus your precious energy exclusively on catalysts."
            : language === "tr"
              ? "Pareto teoremi sonuçların %80'inin çabanın %20'sinden geldiğini belirtir. Değerli enerjinizi yalnızca katalizörlere odaklayın."
              : "Pareto teorema ukazuje da 80% uspeha dolazi iz 20% pravih akcija. Fokusirajte energiju na katalizatore uspeha."}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Fill Area Forms */}
        <div
          className={`lg:col-span-5 border rounded-xl p-4 space-y-4 ${
            isEvening
              ? "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
              : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-2 border-black/5 dark:border-white/5`}
          >
            <h3 className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
              {isEn
                ? "Add Activity to Analyze"
                : language === "tr"
                  ? "Analize Etkinlik Ekle"
                  : "Dodajte novu aktivnost"}
            </h3>
            <button
              type="button"
              onClick={() => setIsScoringWizardOpen(true)}
              className={`inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                isEvening
                  ? "text-[#0A84FF] bg-white dark:bg-[#1C1C1E]/5 active:opacity-70 transition-opacity/40 border border-black/5 dark:border-white/5"
                  : "text-[#007AFF] hover:text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/10 active:opacity-70 transition-opacity"
              }`}
              title={
                isEn
                  ? "Help me determine scoring numbers"
                  : language === "tr"
                    ? "Puan sayılarını belirlememe yardım et"
                    : "Pomoćnik za određivanje bodova"
              }
            >
              <HelpCircle className="w-3.5 h-3.5 transition-opacity" />
              <span>
                {isEn
                  ? "Scoring Wizard"
                  : language === "tr"
                    ? "Puanlama Sihirbazı"
                    : "Pomoćnik za bodove"}
              </span>
            </button>
          </div>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-1">
              <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 tracking-wide block">
                {t.activityName}
              </span>
              <input
                type="text"
                placeholder={
                  isEn
                    ? "E.g., Master coding in React/TS"
                    : language === "tr"
                      ? "Örneğin, React/TS'de ana kodlama"
                      : "Npr., Razgovor sa ključnim kupcima..."
                }
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className={`w-full text-[14px] p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#34C759]/30 dark:focus:ring-[#30D158]/30 focus:border-[#34C759] dark:focus:border-[#30D158] shadow-sm transition-all ${
                  isEvening
                    ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-white/40"
                    : "bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                }`}
                required
                id="pareto-item-name-input"
              />

              {/* Not sure? AI Scorer helper trigger */}
              <div className="flex justify-end pt-1 bg-transparent">
                <button
                  type="button"
                  onClick={async () => {
                    if (!newItemName.trim()) return;
                    setAiEstimating(true);
                    setAiScoreExplanation(null);
                    setAiQuestion(null);
                    try {
                      const res = await fetch("/api/pareto-score-item", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newItemName, language }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (
                          data.questionToUser &&
                          data.questionToUser.trim() !== ""
                        ) {
                          setAiQuestion(data.questionToUser);
                          setAiSuggestedAnswers(data.suggestedAnswers || null);
                        } else if (
                          data.effort !== undefined &&
                          data.impact !== undefined
                        ) {
                          setAiQuestion(null);
                          setAiSuggestedAnswers(null);
                          setNewEffort(data.effort || 5);
                          setNewImpact(data.impact || 5);
                          setAiScoreExplanation(data.explanation || null);
                        }
                      }
                    } catch (err) {
                      console.error("Single-item AI scoring failed", err);
                    } finally {
                      setAiEstimating(false);
                    }
                  }}
                  disabled={
                    aiEstimating || !newItemName.trim() || aiQuestion !== null
                  }
                  className="py-1 px-3 rounded-lg text-[13px] font-semibold bg-[#34C759]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 hover:text-white text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-55 active:scale-95 shrink whitespace-normal text-left max-w-full leading-tight"
                >
                  {aiEstimating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-[#34C759] dark:text-[#30D158] shrink-0" />
                      <span>
                        {isEn
                          ? "AI Estimating..."
                          : language === "tr"
                            ? "Yapay Zeka Tahmini..."
                            : "Procenjivanje..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-[#FF9500] shrink-0" />
                      <span>
                        {isEn
                          ? "Not sure? Let AI estimate scores"
                          : language === "tr"
                            ? "Emin değil misiniz? AI tahmin etsin"
                            : "Niste sigurni? Neka AI proceni bodove"}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {aiQuestion && (
                <div className="p-3 mt-1 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🤖</span>
                    <p className="text-[13px] font-semibold text-[#FF9500]">
                      {aiQuestion}
                    </p>
                  </div>

                  {aiSuggestedAnswers && aiSuggestedAnswers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {aiSuggestedAnswers.map((ans, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setNewItemName((prev) => prev + " - " + ans);
                            setAiQuestion(null);
                            setAiSuggestedAnswers(null);
                          }}
                          className="text-[11px] font-semibold bg-[#FF9500] hover:bg-[#FF9500]/90 text-white rounded-md px-2 py-1 transition-all cursor-pointer text-left break-words"
                        >
                          {ans}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      ref={contextInputRef}
                      type="text"
                      className="flex-1 text-[14px] px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 shadow-sm transition-all"
                      placeholder={
                        isEn
                          ? "Or type your own answer..."
                          : language === "tr"
                            ? "Veya kendi cevabınızı yazın..."
                            : "Ili unesite svoj odgovor..."
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.currentTarget as HTMLInputElement)
                            .value;
                          if (val.trim()) {
                            setNewItemName((prev) => prev + " - " + val);
                            setAiQuestion(null);
                            setAiSuggestedAnswers(null);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (contextInputRef.current) {
                          const val = contextInputRef.current.value;
                          if (val.trim()) {
                            setNewItemName((prev) => prev + " - " + val);
                          }
                        }
                        setAiQuestion(null);
                        setAiSuggestedAnswers(null);
                      }}
                      className="px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-xs font-bold hover:bg-[#007AFF]/90 cursor-pointer transition-colors"
                    >
                      {isEn
                        ? "Confirm"
                        : language === "tr"
                          ? "Onaylamak"
                          : "Potvrdi"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiQuestion(null);
                        setAiSuggestedAnswers(null);
                      }}
                      className="px-2 py-1.5 text-xs font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white cursor-pointer"
                    >
                      {isEn
                        ? "Skip"
                        : language === "tr"
                          ? "Atlamak"
                          : "Preskoči"}
                    </button>
                  </div>
                </div>
              )}

              {aiScoreExplanation && !aiQuestion && (
                <div
                  className={`p-2.5 rounded-xl border text-[13px] font-semibold leading-relaxed transition-all mt-1 ${
                    isEvening
                      ? "bg-[#1C1C1E] border-white/5 text-[#555555] dark:text-[#EBEBF5]/60"
                      : "bg-[#007AFF]/10 border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF]"
                  }`}
                >
                  🧠 <span>{aiScoreExplanation}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`space-y-1 p-2.5 rounded-xl border ${
                  isEvening
                    ? "bg-[#1C1C1E] border-white/5"
                    : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 tracking-wide">
                    {t.effort}
                  </span>
                  <span className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {newEffort}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newEffort}
                  onChange={(e) => setNewEffort(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg accent-[#007AFF] dark:accent-[#0A84FF] cursor-pointer"
                />
                <p className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug mt-1 text-center">
                  {newEffort <= 2
                    ? isEn
                      ? "⚡ Quick Win (<10 mins)"
                      : language === "tr"
                        ? "⚡ Hızlı Kazanma (<10 dakika)"
                        : "⚡ Brza pobeda (<10 min)"
                    : newEffort <= 4
                      ? isEn
                        ? "Low Effort (~1-2 hours)"
                        : language === "tr"
                          ? "Düşük Çaba (~1-2 saat)"
                          : "Mali napor (~1-2 sata)"
                      : newEffort <= 6
                        ? isEn
                          ? "Medium Investment (~1 day)"
                          : language === "tr"
                            ? "Orta Yatırım (~1 gün)"
                            : "Umeren napor (~1 dan)"
                        : newEffort <= 8
                          ? isEn
                            ? "Heavy Laborious (~3-5 days)"
                            : language === "tr"
                              ? "Ağır Zahmetli (~3-5 gün)"
                              : "Težak i naporan (~3-5 dana)"
                          : isEn
                            ? "🔥 Extreme Energy Drain"
                            : language === "tr"
                              ? "🔥 Aşırı Enerji Boşalması"
                              : "🔥 Ekstremni odliv energije"}
                </p>
              </div>

              <div
                className={`space-y-1 p-2.5 rounded-xl border ${
                  isEvening
                    ? "bg-[#1C1C1E] border-white/5"
                    : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 tracking-wide">
                    {t.impact}
                  </span>
                  <span className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {newImpact}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newImpact}
                  onChange={(e) => setNewImpact(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg accent-[#007AFF] dark:accent-[#0A84FF] cursor-pointer"
                />
                <p className="text-[13px] font-medium text-[#34C759] leading-snug mt-1 text-center">
                  {newImpact <= 2
                    ? isEn
                      ? "Negligible Impact (~5%)"
                      : language === "tr"
                        ? "İhmal Edilebilir Etki (~%5)"
                        : "Zanemarljiv uticaj (~5%)"
                    : newImpact <= 4
                      ? isEn
                        ? "Minor Impact (~15%)"
                        : language === "tr"
                          ? "Küçük Etki (~%15)"
                          : "Mali uticaj (~15%)"
                      : newImpact <= 6
                        ? isEn
                          ? "Moderate Impact (~35%)"
                          : language === "tr"
                            ? "Orta Etki (~%35)"
                            : "Umeren uticaj (~35%)"
                        : newImpact <= 8
                          ? isEn
                            ? "High Leverage (~55%)"
                            : language === "tr"
                              ? "Yüksek Kaldıraç (~%55)"
                              : "Visok uticaj (~55%)"
                          : isEn
                            ? "🔑 Expo Catalyst (>80%!)"
                            : language === "tr"
                              ? "🔑 Expo Katalizörü (>%80!)"
                              : "🔑 Pokretač (>80%!)"}
                </p>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#34C759]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              id="btn-add-pareto-item"
            >
              <Plus className="w-4 h-4" />
              {t.addBtn}
            </button>
          </form>
        </div>

        {/* Evaluation Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 mb-4 gap-4 border-black/5 dark:border-white/5">
            <h3 className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-2">
              {t.tableHeading}
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                  isEvening
                    ? "bg-black border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                    : "bg-[#E5E5EA] dark:bg-[#3A3A3C] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                }`}
              >
                {items.length} {isEn ? "items" : language === "tr" ? "öğeler" : "aktivnosti"}
              </span>
            </h3>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Bulk Score Button */}
              {items.some((i) => i.effort === 0 || i.impact === 0) && (
                <button
                  onClick={handleBulkScore}
                  disabled={bulkScoring || items.length === 0}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-colors border ${
                    isEvening 
                      ? "bg-[#0A84FF]/10 text-[#0A84FF] border-[#0A84FF]/20 hover:bg-[#0A84FF]/20" 
                      : "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20 hover:bg-[#007AFF]/20"
                  } disabled:opacity-50`}
                >
                  {bulkScoring ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isEn ? "AI Estimate All" : language === "tr" ? "Tümünü AI ile Tahmin Et" : "AI Proceni Sve"}
                </button>
              )}

              {/* Main Analysis Button */}
              <button
                onClick={handleAnalyzePareto}
                disabled={loading || items.length === 0}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white rounded-lg transition-all ${
                  animationStatus === "success"
                    ? "bg-[#34C759] border-[#34C759]"
                    : animationStatus === "error"
                      ? "bg-[#FF3B30] border-[#FF3B30]"
                      : "bg-black dark:bg-white dark:text-black hover:bg-black/80 dark:hover:bg-white/80"
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
              >
                <AnimatePresence mode="wait">
                  {animationStatus === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? "Sorting..." : language === "tr" ? "Sıralanıyor..." : "AI meri..."}</span>
                    </motion.div>
                  )}
                  {animationStatus === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>{isEn ? "Done" : language === "tr" ? "Tamam" : "Uspešno"}</span>
                    </motion.div>
                  )}
                  {animationStatus === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>{isEn ? "Error" : language === "tr" ? "Hata" : "Greška"}</span>
                    </motion.div>
                  )}
                  {animationStatus === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t.analyzeBtn}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          <div
            className={`divide-y overflow-hidden rounded-xl border transition-all duration-300 ${
              isEvening
                ? "divide-slate-800 bg-[#1C1C1E] border-white/5"
                : "divide-slate-100 bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
            }`}
          >
            {(() => {
              const totalImpactSum = items.reduce(
                (sum, item) => sum + (item.impact === 0 ? 5 : item.impact),
                0,
              );

              return items.map((item) => {
                // Formula poluge: (Impact ^ 2) / Effort. Veći efekat sa manjim naporom = fenomenalna poluga!
                const leverageScore = parseFloat(
                  (
                    Math.pow(item.impact, 1.8) / Math.max(1, item.effort)
                  ).toFixed(1),
                );
                const isHighLeverage = leverageScore >= 8;
                const impactSharePercent =
                  item.impact === 0
                    ? 0
                    : totalImpactSum > 0
                      ? Math.round((item.impact / totalImpactSum) * 100)
                      : 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      isEvening
                        ? "bg-[#1C1C1E] hover:bg-black/5 dark:bg-white/5"
                        : "bg-white dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]"
                    }`}
                  >
                    <div className="space-y-1.5 max-w-sm flex-1">
                      <h4
                        className={`text-xs font-medium text-black dark:text-white`}
                      >
                        {item.name}
                      </h4>

                      {itemQuestions[item.id] && (
                        <div className="p-2 mt-2 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20 space-y-2 animate-in fade-in max-w-full">
                          <div className="flex items-start gap-1.5">
                            <span className="text-sm">🤖</span>
                            <p className="text-[12px] font-semibold text-[#FF9500]">
                              {itemQuestions[item.id].question}
                            </p>
                          </div>
                          {itemQuestions[item.id].suggestedAnswers &&
                            itemQuestions[item.id].suggestedAnswers!.length >
                              0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {itemQuestions[item.id].suggestedAnswers!.map(
                                  (ans, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setAiLoadingItemId(item.id);
                                        try {
                                          const res = await fetch(
                                            "/api/pareto-score-item",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                name: item.name + " - " + ans,
                                                language,
                                              }),
                                            },
                                          );
                                          if (res.ok) {
                                            const data = await res.json();
                                            if (
                                              data.questionToUser &&
                                              data.questionToUser.trim() !== ""
                                            ) {
                                              setItemQuestions((prev) => ({
                                                ...prev,
                                                [item.id]: {
                                                  question: data.questionToUser,
                                                  suggestedAnswers: data.suggestedAnswers,
                                                },
                                              }));
                                            } else if (
                                              data.effort !== undefined &&
                                              data.impact !== undefined
                                            ) {
                                              handleUpdateItemValues(item.id, {
                                                effort: data.effort,
                                                impact: data.impact,
                                              });
                                              setItemQuestions((prev) => {
                                                const next = { ...prev };
                                                delete next[item.id];
                                                return next;
                                              });
                                            }
                                          }
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          setAiLoadingItemId(null);
                                        }
                                      }}
                                      className="text-[10px] font-semibold bg-[#FF9500] hover:bg-[#FF9500]/90 text-white rounded-md px-1.5 py-0.5 transition-all cursor-pointer text-left break-words"
                                    >
                                      {ans}
                                    </button>
                                  ),
                                )}
                              </div>
                            )}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              className="flex-1 text-[13px] px-2 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 shadow-sm transition-all"
                              placeholder={
                                isEn
                                  ? "Answer..."
                                  : language === "tr"
                                    ? "Cevap..."
                                    : "Odgovor..."
                              }
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  e.stopPropagation();
                                  const val = (
                                    e.currentTarget as HTMLInputElement
                                  ).value;
                                  if (val.trim()) {
                                    setAiLoadingItemId(item.id);
                                    try {
                                      const res = await fetch(
                                        "/api/pareto-score-item",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            name: item.name + " - " + val,
                                            language,
                                          }),
                                        },
                                      );
                                      if (res.ok) {
                                        const data = await res.json();
                                        if (
                                          data.questionToUser &&
                                          data.questionToUser.trim() !== ""
                                        ) {
                                          setItemQuestions((prev) => ({
                                            ...prev,
                                            [item.id]: {
                                              question: data.questionToUser,
                                              suggestedAnswers: data.suggestedAnswers,
                                            },
                                          }));
                                        } else if (
                                          data.effort !== undefined &&
                                          data.impact !== undefined
                                        ) {
                                          handleUpdateItemValues(item.id, {
                                            effort: data.effort,
                                            impact: data.impact,
                                          });
                                          setItemQuestions((prev) => {
                                            const next = { ...prev };
                                            delete next[item.id];
                                            return next;
                                          });
                                        }
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setAiLoadingItemId(null);
                                    }
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemQuestions((prev) => {
                                  const next = { ...prev };
                                  delete next[item.id];
                                  return next;
                                });
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                            >
                              {isEn
                                ? "Skip"
                                : language === "tr"
                                  ? "Atla"
                                  : "Preskoči"}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1">
                        {/* Effort Control */}
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-0.5 border border-black/5 dark:border-white/5 shadow-sm">
                          <span className="font-semibold text-[11px] text-[#8E8E93] uppercase tracking-wider mr-1">
                            {language === "sr"
                              ? "Napor"
                              : language === "tr"
                                ? "Çaba"
                                : "Effort"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateItemValue(
                                item.id,
                                "effort",
                                item.effort - 1,
                              );
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/5 text-[12px] font-black cursor-pointer transition-colors border border-black/5 dark:border-white/5 shadow-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-[12px] text-black dark:text-white">
                            {item.effort}/10
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateItemValue(
                                item.id,
                                "effort",
                                item.effort + 1,
                              );
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/5 text-[12px] font-black cursor-pointer transition-colors border border-black/5 dark:border-white/5 shadow-sm"
                          >
                            +
                          </button>
                        </div>

                        {/* Impact Control */}
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-0.5 border border-black/5 dark:border-white/5 shadow-sm">
                          <span className="font-semibold text-[11px] text-[#8E8E93] uppercase tracking-wider mr-1">
                            {language === "sr"
                              ? "Efekat"
                              : language === "tr"
                                ? "Etki"
                                : "Impact"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateItemValue(
                                item.id,
                                "impact",
                                item.impact - 1,
                              );
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/5 text-[12px] font-black cursor-pointer transition-colors border border-black/5 dark:border-white/5 shadow-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-[12px] text-black dark:text-white">
                            {item.impact}/10
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateItemValue(
                                item.id,
                                "impact",
                                item.impact + 1,
                              );
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/5 text-[12px] font-black cursor-pointer transition-colors border border-black/5 dark:border-white/5 shadow-sm"
                          >
                            +
                          </button>
                        </div>

                        {/* Outcome weight badge */}
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-lg text-[11px] border ${
                            isEvening
                              ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] border-[#34C759]/20"
                              : "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] border-[#34C759]/20"
                          }`}
                        >
                          {isEn
                            ? "Outcome weight"
                            : language === "tr"
                              ? "Sonuç ağırlığı"
                              : "Udeo u uspehu"}
                          : {impactSharePercent}%
                        </span>

                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (aiLoadingItemId) return;
                            setAiLoadingItemId(item.id);
                            try {
                              const res = await fetch(
                                "/api/pareto-score-item",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    name: item.name,
                                    language,
                                  }),
                                },
                              );
                              if (res.ok) {
                                const data = await res.json();
                                if (
                                  data.questionToUser &&
                                  data.questionToUser.trim() !== ""
                                ) {
                                  setItemQuestions((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      question: data.questionToUser,
                                      suggestedAnswers: data.suggestedAnswers,
                                    },
                                  }));
                                } else if (
                                  data.effort !== undefined &&
                                  data.impact !== undefined
                                ) {
                                  handleUpdateItemValues(item.id, {
                                    effort: data.effort,
                                    impact: data.impact,
                                  });
                                  setItemQuestions((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  });
                                }
                              }
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setAiLoadingItemId(null);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF] text-[12px] font-semibold rounded-lg transition-colors cursor-pointer"
                          disabled={aiLoadingItemId === item.id}
                        >
                          {aiLoadingItemId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {isEn
                            ? "Ask AI to Evaluate"
                            : language === "tr"
                              ? "Yapay Zekaya Değerlendir"
                              : "AI Proceni"}
                        </button>
                      </div>

                      {/* Interactive visual helper bar showing exact percentage of total list results */}
                      <div
                        className={`w-full h-1 rounded-full overflow-hidden mt-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C]`}
                        title={
                          isEn
                            ? `This activity delivers ${impactSharePercent}% of total outcomes`
                            : language === "tr"
                              ? `Bu aktivite toplam sonuçların %${impactSharePercent} kadarını sağlıyor`
                              : `Ova aktivnost donosi ${impactSharePercent}% ukupnog uspeha`
                        }
                      >
                        <div
                          className="bg-[#34C759] dark:bg-[#30D158] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, impactSharePercent)}%`,
                            maxWidth: "100%",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                      <div className="text-right">
                        <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block font-medium tracking-wide">
                          {t.leverageScore}
                        </span>
                        <span
                          className={`text-xs font-semibold border p-0.5 px-2 rounded-md ${
                            item.effort === 0 || item.impact === 0
                              ? isEvening
                                ? "bg-black/5 dark:bg-white/5 text-[#8E8E93] border-white/5/80"
                                : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] border-black/5 dark:border-white/5"
                              : isHighLeverage
                                ? isEvening
                                  ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20"
                                  : "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20"
                                : isEvening
                                  ? "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 border-white/5/80"
                                  : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5"
                          }`}
                        >
                          {item.effort === 0 || item.impact === 0
                            ? "?"
                            : leverageScore}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className={`p-1 rounded-lg cursor-pointer transition-colors ${
                          isEvening
                            ? "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10"
                            : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10"
                        }`}
                        title={
                          isEn
                            ? "Delete item"
                            : language === "tr"
                              ? "Öğeyi sil"
                              : "Ukloni"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] text-xs rounded-xl border border-[#FF3B30]/20 dark:border-[#FF453A]/20">
          ⚠️ {error}
        </div>
      )}

      {/* Resulting 80/20 Action Grid */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`grid grid-cols-1 md:grid-cols-12 gap-6 rounded-xl p-5 border transition-all duration-300 ${
            isEvening
              ? "bg-black border-black/5 dark:border-white/5"
              : "bg-[#E5E5EA] dark:bg-[#3A3A3C] border-black/5 dark:border-white/5"
          }`}
        >
          {/* Executive focus overview text banner */}
          <div
            onClick={() => {
              (window as any).triggerGlobalZoom?.(
                t.summary || "Executive Focus Direction",
                <div className="space-y-4 pt-1">
                  <div className="p-4 bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 rounded-xl text-left">
                    <span className="text-[13px] font-semibold text-[#34C759] dark:text-[#34C759] block mb-2">
                      🎯{" "}
                      {isEn
                        ? "EXECUTIVE FOCUS DIRECTION"
                        : language === "tr"
                          ? "YÖNETİCİ ODAKLANMA YÖNÜ"
                          : "STRATEŠKI PRAVAC I STRATEGIJA:"}
                    </span>
                    <p className="text-sm font-sans italic font-semibold text-black dark:text-white leading-relaxed">
                      "{result.executiveSummary}"
                    </p>
                  </div>
                </div>,
                "📊",
                isEn
                  ? "Pareto Insight"
                  : language === "tr"
                    ? "Pareto İçgörüsü"
                    : "Pareto Savetnik",
              );
            }}
            className={`md:col-span-12 border p-4 rounded-xl space-y-1.5 cursor-pointer hover:border-[#34C759]/20 dark:border-[#30D158]/20 dark:hover:border-[#34C759]/20 dark:border-[#30D158]/20 transition-all select-none group relative ${
              isEvening
                ? "bg-[#1C1C1E] border-white/5"
                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
            }`}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-[13px] font-medium text-[#34C759]">
                {t.summary}
              </h4>
              <span className="text-[13px] text-[#34C759] opacity-0 group-hover:opacity-100 transition-opacity">
                Zoom 🔍
              </span>
            </div>
            <p
              className={`text-xs font-medium leading-relaxed italic text-[#3C3C43] dark:text-[#EBEBF5]/80`}
            >
              "{result.executiveSummary}"
            </p>
          </div>

          {/* High leverage items */}
          <div className="md:col-span-6 space-y-3">
            <h4
              className={`text-[13px] font-semibold flex items-center gap-1.5 p-2 rounded-lg border ${
                isEvening
                  ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] border-[#34C759]/20 dark:border-[#30D158]/20"
                  : "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20"
              }`}
            >
              {t.vitalFewTitle}
            </h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {result.vitalFew.map((val, id) => (
                <div
                  key={id}
                  onClick={() => {
                    (window as any).triggerGlobalZoom?.(
                      val.name,
                      <div className="space-y-4 pt-1">
                        <div className="p-4 bg-[#34C759]/10 dark:bg-white/5 rounded-xl border border-[#34C759]/20 dark:border-[#30D158]/20 text-left">
                          <span className="text-[13px] font-semibold text-[#34C759] dark:text-[#30D158] block mb-1">
                            🔥{" "}
                            {isEn
                              ? "VITAL LEVERAGE INSIGHT:"
                              : language === "tr"
                                ? "HAYATİ KALDIRAÇ ANLAYIŞI:"
                                : "VITALNI PRESEK POLUGE DOSTIGNUĆA:"}
                          </span>
                          <p className="text-sm font-semibold text-black dark:text-white leading-relaxed">
                            {val.whyLeverage}
                          </p>
                        </div>
                      </div>,
                      "⚡",
                      isEn
                        ? "Vital Few (80% Impact)"
                        : language === "tr"
                          ? "Hayati Az (%80 Etki)"
                          : "Vitalni Pokretač (80% Rezultata)",
                    );
                  }}
                  className={`border p-3.5 rounded-xl space-y-2 cursor-pointer hover:border-[#34C759]/20 dark:border-[#30D158]/20 dark:hover:border-[#34C759] dark:border-[#30D158] transition-all group relative select-none ${
                    isEvening
                      ? "bg-[#1C1C1E] border-white/5 hover:bg-black/5 dark:bg-white/5"
                      : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <h5
                      className={`text-xs font-medium leading-tight text-black dark:text-white`}
                    >
                      {val.name}
                    </h5>
                    <span className="text-[13px] text-[#34C759] dark:text-[#30D158] opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      🔍 ZOOM
                    </span>
                  </div>
                  <p
                    className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                  >
                    {val.whyLeverage}
                  </p>
                  {(val.leverageRatio !== undefined ||
                    val.estimatedImpactPercentage !== undefined) && (
                    <div className="flex gap-4 pt-1 border-t border-black/5 dark:border-white/5">
                      {val.leverageRatio !== undefined && (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-[#34C759]/70 tracking-wider">
                            Leverage Ratio
                          </span>
                          <span className="text-sm font-bold text-[#34C759]">
                            {val.leverageRatio.toFixed(1)}x
                          </span>
                        </div>
                      )}
                      {val.estimatedImpactPercentage !== undefined && (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-[#34C759]/70 tracking-wider">
                            {isEn
                              ? "Impact"
                              : language === "tr"
                                ? "Darbe"
                                : "Udeo rezultata"}
                          </span>
                          <span className="text-sm font-bold text-[#34C759]">
                            {val.estimatedImpactPercentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddTask) {
                        onAddTask(val.name, val.whyLeverage, "A", 1, 10);
                      }
                    }}
                    className={`w-full py-1.5 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isEvening
                        ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] border border-[#34C759]/20 dark:border-[#30D158]/20"
                        : "bg-[#34C759]/10 dark:bg-[#30D158]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158]"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {t.actionBtn} (A)
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Low leverage items */}
          <div className="md:col-span-6 space-y-3">
            <h4
              className={`text-[13px] font-semibold flex items-center gap-1.5 p-2 rounded-lg border ${
                isEvening
                  ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                  : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border-[#FF3B30]/20 dark:border-[#FF453A]/20"
              }`}
            >
              {t.trivialTitle}
            </h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {result.trivialMany.map((val, id) => (
                <div
                  key={id}
                  onClick={() => {
                    (window as any).triggerGlobalZoom?.(
                      val.name,
                      <div className="space-y-4 pt-1">
                        <div className="p-4 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 rounded-xl border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-left">
                          <span className="text-[13px] font-semibold text-[#FF3B30] dark:text-[#FF453A] block mb-1">
                            🗑️{" "}
                            {isEn
                              ? "OPTIMIZATION & ELIMINATION DIRECTIVE:"
                              : language === "tr"
                                ? "OPTİMİZASYON VE ELİMİNASYON DİREKTİFİ:"
                                : "SMERNICA ZA OPTIMIZACIJU ILI BRISANJE:"}
                          </span>
                          <p className="text-sm font-semibold text-black dark:text-white leading-relaxed">
                            {val.recommendation}
                          </p>
                        </div>
                      </div>,
                      "🗑️",
                      isEn
                        ? "Trivial Many (Time Waster)"
                        : language === "tr"
                          ? "Önemsiz Çok (Zaman Kaybı)"
                          : "Trivijalna smetnja (Gubilište vremena)",
                    );
                  }}
                  className={`border p-3.5 rounded-xl space-y-2 cursor-pointer hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20 dark:hover:border-[#FF3B30] dark:border-[#FF453A] transition-all group relative select-none ${
                    isEvening
                      ? "bg-[#1C1C1E] border-white/5 hover:bg-black/5 dark:bg-white/5"
                      : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <h5
                      className={`text-xs font-medium leading-tight text-black dark:text-white`}
                    >
                      {val.name}
                    </h5>
                    <span className="text-[13px] text-[#FF3B30] opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      🔍 ZOOM
                    </span>
                  </div>
                  <p
                    className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                  >
                    {val.recommendation}
                  </p>
                  {val.leverageRatio !== undefined && (
                    <div className="flex flex-col pt-1 border-t border-black/5 dark:border-white/5 mt-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#FF3B30]/70 tracking-wider">
                        Leverage Ratio
                      </span>
                      <span className="text-sm font-bold text-[#FF3B30]">
                        {val.leverageRatio.toFixed(1)}x
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddTask) {
                        onAddTask(val.name, val.recommendation, "E", 8, 2); // High effort, low impact
                      }
                    }}
                    className={`w-full py-1.5 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isEvening
                        ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                        : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A]"
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {isEn
                      ? "Mark to Eliminate"
                      : language === "tr"
                        ? "Ortadan Kaldırmak için İşaretle"
                        : "Premesti u Eliminaciju"}{" "}
                    (E)
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Sliding Scoring Wizard Drawer (Right-to-Left Slide Over) */}
      <AnimatePresence>
        {isScoringWizardOpen && (
          <div
            className="fixed inset-0 z-50 overflow-hidden"
            id="scoring-selector-drawer-portal"
          >
            <div className="absolute inset-0 overflow-hidden">
              {/* Overlay background */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsScoringWizardOpen(false)}
                className="absolute inset-0 bg-[#F2F2F7] dark:bg-[#1C1C1E] backdrop-blur-xs transition-opacity"
              />

              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 26, stiffness: 220 }}
                  className="pointer-events-auto w-screen max-w-md h-full bg-white dark:bg-[#1C1C1E] flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E]">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] rounded-xl">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-black dark:text-white leading-tight">
                          {isEn
                            ? "Scoring Calibration Wizard"
                            : language === "tr"
                              ? "Puanlama Kalibrasyon Sihirbazı"
                              : "Pomoćnik za bodovanje"}
                        </h2>
                        <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                          {isEn
                            ? "Determine Effort & Impact"
                            : language === "tr"
                              ? "Çabayı ve Etkiyi Belirleyin"
                              : "Određivanje napora i efekata"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsScoringWizardOpen(false)}
                      className="p-1.5 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-xl transition-colors cursor-pointer text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
                      <h4 className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] tracking-wide flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>
                          {isEn
                            ? "The 80/20 Rating Secret"
                            : language === "tr"
                              ? "80/20 Derecelendirme Sırrı"
                              : "Kako ispravno bodovati?"}
                        </span>
                      </h4>
                      <p className="text-[13px] text-[#007AFF] dark:text-[#0A84FF] leading-relaxed font-semibold">
                        {isEn
                          ? "High-leverage items (the 'Vital Few') have very low or moderate effort (1-5) and extremely high impact (8-10). Avoid high-effort tasks that have low returns."
                          : language === "tr"
                            ? "Yüksek kaldıraçlı öğeler ('Hayati Az') çok düşük veya orta derecede çabaya (1-5) ve son derece yüksek etkiye (8-10) sahiptir. Düşük getirisi olan, yüksek çaba gerektiren görevlerden kaçının."
                            : "Ključne akcije ('Vital Few') odlikuje umeren do mali napor (1-5) i ogroman efekat (8-10). Izbegavajte zamku visokog napora sa minimalnim efektima."}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                        {isEn
                          ? "Template Examples & Benchmarks:"
                          : language === "tr"
                            ? "Şablon Örnekleri ve Karşılaştırmalar:"
                            : "Primeri šablona za poređenje:"}
                      </span>

                      <div className="space-y-3.5 divide-y divide-slate-100">
                        {helpTemplates.map((tmpl, idx) => {
                          const name = isEn ? tmpl.nameEn : tmpl.nameSr;
                          const desc = isEn ? tmpl.descEn : tmpl.descSr;
                          const cat = isEn ? tmpl.catEn : tmpl.catSr;

                          return (
                            <div
                              key={idx}
                              className="pt-3.5 first:pt-0 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="inline-block text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/10 rounded-md px-1.5 py-0.5 mb-1">
                                    {cat}
                                  </span>
                                  <h4 className="text-xs font-medium text-black dark:text-white leading-snug">
                                    {name}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="text-center px-1.5 py-0.5 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 rounded-md border border-[#FF9500]/20 dark:border-[#FF9F0A]/20">
                                    <span className="block text-[13px] font-semibold text-[#FF9500]">
                                      {isEn
                                        ? "Effort"
                                        : language === "tr"
                                          ? "Çaba"
                                          : "Napor"}
                                    </span>
                                    <span className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9F0A]">
                                      {tmpl.effort}/10
                                    </span>
                                  </div>
                                  <div className="text-center px-1.5 py-0.5 bg-[#34C759]/10 dark:bg-[#30D158]/10 rounded-md border border-[#34C759]/20 dark:border-[#30D158]/20">
                                    <span className="block text-[13px] font-semibold text-[#34C759]">
                                      {isEn
                                        ? "Impact"
                                        : language === "tr"
                                          ? "Darbe"
                                          : "Efekat"}
                                    </span>
                                    <span className="text-[13px] font-semibold text-[#34C759] dark:text-[#30D158]">
                                      {tmpl.impact}/10
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-relaxed italic">
                                {desc}
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  handleApplyTemplate(
                                    name,
                                    tmpl.effort,
                                    tmpl.impact,
                                  )
                                }
                                className="w-full text-center py-2 bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 rounded-xl text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium transition-all cursor-pointer"
                              >
                                {isEn
                                  ? "Use This Benchmark Rating"
                                  : language === "tr"
                                    ? "Bu Karşılaştırma Derecelendirmesini Kullan"
                                    : "Primeni ove ocene na novu stavku"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E]">
                    <button
                      type="button"
                      onClick={() => setIsScoringWizardOpen(false)}
                      className="w-full py-2.5 text-center bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                    >
                      {isEn
                        ? "Close Companion"
                        : language === "tr"
                          ? "Tamamlayıcıyı Kapat"
                          : "Zatvori prozor"}
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
