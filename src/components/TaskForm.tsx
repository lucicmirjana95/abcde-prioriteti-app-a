import { useState, FormEvent, useEffect } from "react";
import { Task, AIRasterizedTask } from "../types";
import {
  Plus,
  HelpCircle,
  Brain,
  Sparkles,
  AlertTriangle,
  User,
  Trash2,
  CheckCircle,
  ChevronRight,
  CornerDownRight,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translations, Language } from "../translations";
import VoiceInputNode from "./VoiceInputNode";

interface TaskFormProps {
  onAddTask: (
    task: Omit<Task, "id" | "createdTime" | "subPriority" | "done"> & {
      sourceId?: string;
    },
  ) => void;
  onAddMultipleTasks: (tasks: AIRasterizedTask[]) => void;
  language: Language;
}

export default function TaskForm({
  onAddTask,
  onAddMultipleTasks,
  language,
}: TaskFormProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "wizard" | "ai">(
    "manual",
  );
  const t = translations[language];

  // Manual Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [reminderTime, setReminderTime] = useState("");
  const [deadline, setDeadline] = useState("");
  const [delegatedTo, setDelegatedTo] = useState("");
  const [eliminationReason, setEliminationReason] = useState("");
  const [timeRequired, setTimeRequired] = useState<number | "">("");
  const [energyRequired, setEnergyRequired] = useState<string>("Medium");
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly" | "monthly">(
    "none",
  );
  const [isEstimating, setIsEstimating] = useState(false);
  const [sourceId, setSourceId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");

  // Sync states
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [habitItems, setHabitItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const inboxStr = safeStorage.getItem("abcde_universal_inbox") || "[]";
      const inbox = JSON.parse(inboxStr);
      if (Array.isArray(inbox)) {
        setInboxItems(inbox.filter((i: any) => !i.processed));
      }

      const habitsStr = safeStorage.getItem("abcde_calendar_habits") || "[]";
      const habits = JSON.parse(habitsStr);
      if (Array.isArray(habits)) {
        setHabitItems(habits);
      }
    } catch (e) {}
  }, [activeTab]);

  const handleSelectFromSource = (e: any) => {
    const val = e.target.value;
    if (!val) {
      setSourceId("");
      return;
    }

    if (val.startsWith("inbox_")) {
      const id = val.replace("inbox_", "");
      const item = inboxItems.find((i) => i.id === id);
      if (item) {
        setTitle(item.text || item.title || "");
        setSourceId(id);
      }
    } else if (val.startsWith("habit_")) {
      const id = val.replace("habit_", "");
      const item = habitItems.find((i) => i.id === id);
      if (item) {
        setTitle(item.title);
        if (item.tier) {
          setCategory(item.tier);
        }
        setRepeat("daily");
      }
    }
  };

  const handleEstimateTask = async () => {
    if (!title.trim()) return;
    setIsEstimating(true);
    try {
      const response = await fetch("/api/estimate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, language }),
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.timeRequired === "number") {
          setTimeRequired(data.timeRequired);
        }
        if (data.energyRequired) {
          setEnergyRequired(data.energyRequired);
        }
      }
    } catch (err) {
      console.error("AI estimation error", err);
    } finally {
      setIsEstimating(false);
    }
  };

  // Wizard States
  const [wizardStep, setWizardStep] = useState(1);
  const [wTitle, setWTitle] = useState("");
  const [wDesc, setWDesc] = useState("");
  const [wReminder, setWReminder] = useState("");
  const [wDeadline, setWDeadline] = useState("");
  const [wDelegated, setWDelegated] = useState("");
  const [wElimination, setWElimination] = useState("");
  const [wDetectedCategory, setWDetectedCategory] = useState<
    "A" | "B" | "C" | "D" | "E" | null
  >(null);

  // AI Brain Dump States
  const [brainDump, setBrainDump] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [animationStatus, setAnimationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [aiError, setAiError] = useState("");

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
  const [aiProposedTasks, setAiProposedTasks] = useState<AIRasterizedTask[]>(
    [],
  );
  const [selectedProposedIndexes, setSelectedProposedIndexes] = useState<
    number[]
  >([]);
  const [aiActiveSlide, setAiActiveSlide] = useState(0);

  const triggerStatusRotation = () => {
    let i = 0;
    const phrases = t.loaderPhrases;
    setAiStatusMessage(phrases[0]);
    const timer = setInterval(() => {
      i++;
      if (i < phrases.length) {
        setAiStatusMessage(phrases[i]);
      } else {
        clearInterval(timer);
      }
    }, 1200);
    return timer;
  };

  // Submit manual task
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const extractTags = (text: string) => {
      const regex = /#[\w\u00C0-\u024F]+/g;
      const matches = text.match(regex);
      return matches ? matches.map((t) => t.toLowerCase()) : [];
    };

    const combinedText = `${title} ${description}`;
    const tags = extractTags(combinedText);

    const userTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const finalTags = Array.from(new Set([...tags, ...userTags]));

    onAddTask({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      tags: finalTags.length > 0 ? finalTags : undefined,
      reminderTime: reminderTime || undefined,
      deadline: deadline || undefined,
      delegatedTo:
        category === "D" && delegatedTo.trim() ? delegatedTo.trim() : undefined,
      eliminationReason:
        category === "E" && eliminationReason.trim()
          ? eliminationReason.trim()
          : undefined,
      timeRequired: typeof timeRequired === "number" ? timeRequired : undefined,
      energyRequired: energyRequired || undefined,
      repeat: repeat !== "none" ? repeat : undefined,
      sourceId: sourceId || undefined,
    } as any);

    // Filter out the used task from local inbox items state immediately so the dropdown list updates beautifully
    if (sourceId) {
      setInboxItems((prev) => prev.filter((item) => item.id !== sourceId));
    }

    // Reset fields
    setTitle("");
    setDescription("");
    setCategory("A");
    setReminderTime("");
    setDeadline("");
    setDelegatedTo("");
    setEliminationReason("");
    setTimeRequired("");
    setEnergyRequired("Medium");
    setRepeat("none");
    setSourceId("");
    setTagsInput("");
  };

  // Wizard Steps Flow
  // Step 1: Input title/description & reminder
  // Step 2: Consequences Q (A?)
  // Step 3: Useful but can wait Q (B?)
  // Step 4: Nice to do Q (C?)
  // Step 5: Can prioritize delegation (D?)
  // Step 6: Confirmation & finish
  const startWizard = () => {
    setWizardStep(1);
    setWTitle("");
    setWDesc("");
    setWReminder("");
    setWDeadline("");
    setWDelegated("");
    setWElimination("");
    setWDetectedCategory(null);
    setTimeRequired("");
    setEnergyRequired("Medium");
  };

  const handleWizardNext = () => {
    if (wizardStep === 1) {
      if (!wTitle.trim()) return;
      setWizardStep(2); // Ask first question
    }
  };

  const answerWizardQuestion = (questionId: number, answer: boolean) => {
    if (questionId === 1) {
      // "Serious consequences if not done today?"
      if (answer) {
        setWDetectedCategory("A");
        setWizardStep(6); // Skip directly to review
      } else {
        setWizardStep(3); // Go to Q2
      }
    } else if (questionId === 2) {
      // "Useful but can wait?"
      if (answer) {
        setWDetectedCategory("B");
        setWizardStep(6);
      } else {
        setWizardStep(4); // Go to Q3
      }
    } else if (questionId === 3) {
      // "Just nice or interesting?"
      if (answer) {
        setWDetectedCategory("C");
        setWizardStep(6);
      } else {
        setWizardStep(5); // Go to Q4 (Delegatable?)
      }
    } else if (questionId === 4) {
      // "Can be delegated?"
      if (answer) {
        setWDetectedCategory("D");
        setWizardStep(6);
      } else {
        setWDetectedCategory("E");
        setWizardStep(6);
      }
    }
  };

  const saveWizardTask = () => {
    if (!wDetectedCategory || !wTitle.trim()) return;

    onAddTask({
      title: wTitle.trim(),
      description: wDesc.trim() || undefined,
      category: wDetectedCategory,
      reminderTime: wReminder || undefined,
      deadline: wDeadline || undefined,
      delegatedTo:
        wDetectedCategory === "D" && wDelegated.trim()
          ? wDelegated.trim()
          : undefined,
      eliminationReason:
        wDetectedCategory === "E" && wElimination.trim()
          ? wElimination.trim()
          : undefined,
      timeRequired: typeof timeRequired === "number" ? timeRequired : undefined,
      energyRequired: energyRequired || undefined,
    });

    startWizard();
  };

  // Run AI brain dump parse on server
  const handleAiAnalyze = async () => {
    if (!brainDump.trim()) return;
    setIsAiLoading(true);
    setAnimationStatus("loading");
    triggerHaptics("medium");
    setAiError("");
    setAiProposedTasks([]);

    const interval = triggerStatusRotation();

    try {
      const stateContext = "neutralno";
      const emotionContext = "normalno";

      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: brainDump, 
          language,
          stateContext,
          emotionContext
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error ||
            (language === "en" ? "Failed to analyze raw log. Please verify your connection." : language === "tr" ? "Ham günlük analiz edilemedi. Lütfen bağlantınızı doğrulayın." : "Neuspešna analiza spiska obaveza. Proverite vezu."),
        );
      }

      const rawData = await res.json();
      if (!rawData.tasks || !Array.isArray(rawData.tasks)) {
        throw new Error(
          language === "en" ? "AI did not isolate any valid priorities. Please describe your tasks with more details." : language === "tr" ? "Yapay zeka herhangi bir geçerli önceliği izole etmedi. Lütfen görevlerinizi daha ayrıntılı olarak açıklayın." : "AI nije prepoznao nijedan važeći prioritet. Unesite detaljniji opis.",
        );
      }

      setAiProposedTasks(rawData.tasks);
      // Select all by default
      setSelectedProposedIndexes(
        rawData.tasks.map((_: any, idx: number) => idx),
      );
      setAnimationStatus("success");
      triggerHaptics("success");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } catch (err: any) {
      setAiError(
        err.message ||
          (language === "en" ? "Server request error. Please try again." : language === "tr" ? "Sunucu isteği hatası. Lütfen tekrar deneyin." : "Greška pri slanju zahteva. Molimo vas pokušajte ponovo."),
      );
      setAnimationStatus("error");
      triggerHaptics("error");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleProposedSelection = (idx: number) => {
    if (selectedProposedIndexes.includes(idx)) {
      setSelectedProposedIndexes(
        selectedProposedIndexes.filter((i) => i !== idx),
      );
    } else {
      setSelectedProposedIndexes([...selectedProposedIndexes, idx]);
    }
  };

  const saveSelectedAiTasks = () => {
    const selectedTasks = aiProposedTasks.filter((_, idx) =>
      selectedProposedIndexes.includes(idx),
    );
    if (selectedTasks.length === 0) return;
    onAddMultipleTasks(selectedTasks);
    // Clear
    setAiProposedTasks([]);
    setBrainDump("");
    setSelectedProposedIndexes([]);
  };

  return (
    <div
      className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl overflow-hidden"
      id="add-task-container"
    >
      {/* Segmented Control Tabs */}
      <div className="p-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/5">
        <div className="flex bg-[#E5E5EA] dark:bg-[#2C2C2E] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-1.5 text-[13px] font-medium transition-all rounded-md flex items-center justify-center gap-1.5 ${
              activeTab === "manual"
                ? "bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm"
                : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#EBEBF5]"
            }`}
            id="tab-manual"
          >
            <Plus className="w-3.5 h-3.5" /> {t.manualInputTab}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("wizard");
              startWizard();
            }}
            className={`flex-1 py-1.5 text-[13px] font-medium transition-all rounded-md flex items-center justify-center gap-1.5 ${
              activeTab === "wizard"
                ? "bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm"
                : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#EBEBF5]"
            }`}
            id="tab-wizard"
          >
            {t.questionWizardTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex-1 py-1.5 text-[13px] font-medium transition-all rounded-md flex items-center justify-center gap-1.5 ${
              activeTab === "ai"
                ? "bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm"
                : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#EBEBF5]"
            }`}
            id="tab-ai"
          >
            <Brain className="w-3.5 h-3.5" /> {t.aiSchedulingTab}
          </button>
        </div>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {/* TAB 1: MANUAL FORM */}
          {activeTab === "manual" && (
            <motion.form
              key="manual"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleManualSubmit}
              className="space-y-4 dark:text-[#EBEBF5]/60"
              id="form-manual"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  {(inboxItems.length > 0 || habitItems.length > 0) && (
                    <div className="mb-1">
                      <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                        {language === "en" ? "Load from Inbox / Habits" : language === "tr" ? "Gelen Kutusundan / Alışkanlıklardan Yükle" : "Učitaj iz Inboxa / Navika"}
                      </label>
                      <select
                        onChange={handleSelectFromSource}
                        className="w-full bg-[#007AFF]/10 border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] focus:border-black/10 dark:focus:border-white/10 rounded-xl py-2 px-3 text-[#007AFF] dark:text-[#0A84FF] outline-none text-[14px] transition-all cursor-pointer font-medium focus:ring-2 focus:ring-[#007AFF]/30 shadow-sm"
                      >
                        <option value="">
                          {language === "en" ? "-- Choose from list --" : language === "tr" ? "-- Listeden seçin --" : "-- Izaberi sa liste --"}
                        </option>
                        {inboxItems.length > 0 && (
                          <optgroup
                            label={
                              language === "en" ? "📥 Universal Inbox" : language === "tr" ? "📥 Evrensel Gelen Kutusu" : "📥 Inbox misli"
                            }
                          >
                            {inboxItems.map((item) => (
                              <option
                                key={`inbox_${item.id}`}
                                value={`inbox_${item.id}`}
                              >
                                {(item.text || item.title || "").length > 50
                                  ? (item.text || item.title || "").substring(
                                      0,
                                      50,
                                    ) + "..."
                                  : item.text || item.title || ""}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {habitItems.length > 0 && (
                          <optgroup
                            label={
                              language === "en" ? "⚡ Habits & Micro-Routines" : language === "tr" ? "⚡ Alışkanlıklar ve Mikro Rutinler" : "⚡ Mikro Rutine (Navike)"
                            }
                          >
                            {habitItems.map((item) => (
                              <option
                                key={`habit_${item.id}`}
                                value={`habit_${item.id}`}
                              >
                                [{item.tier || "?"}]{" "}
                                {(item.title || item.text || "").length > 50
                                  ? (item.title || item.text || "").substring(
                                      0,
                                      50,
                                    ) + "..."
                                  : item.title || item.text || ""}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {t.taskTitleLabel}
                    </label>
                    <VoiceInputNode
                      isEvening={false}
                      language={language}
                      onTranscript={(text) => setTitle((prev) => prev + text)}
                      onStartRecording={() => setTitle("")}
                      inline={true}
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.titlePlaceholder}
                    className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none transition-all shadow-sm"
                    id="manual-title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                    {t.categoryDropdownLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl py-2 px-3 text-black dark:text-[#EBEBF5]/90 outline-none text-[14px] transition-all cursor-pointer focus:ring-2 focus:ring-[#007AFF]/30 shadow-sm"
                    id="manual-category"
                  >
                    <option value="A">{t.categoriesOptions.A}</option>
                    <option value="B">{t.categoriesOptions.B}</option>
                    <option value="C">{t.categoriesOptions.C}</option>
                    <option value="D">{t.categoriesOptions.D}</option>
                    <option value="E">{t.categoriesOptions.E}</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                    {t.descriptionLabel}
                  </label>
                  <VoiceInputNode
                    isEvening={false}
                    language={language}
                    onTranscript={(text) => setDescription((prev) => prev + text)}
                    onStartRecording={() => setDescription("")}
                    inline={true}
                  />
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descPlaceholder}
                  rows={3}
                  className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none transition-all resize-none shadow-sm"
                  id="manual-desc"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                  {language === "en" ? "Tags (comma separated)" : language === "tr" ? "Etiketler (virgülle ayrılmış)" : "Oznake (odvojeno zarezom)"}
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={
                    language === "en" ? "e.g. work, urgent, client" : language === "tr" ? "örneğin iş, acil, müşteri" : "npr. posao, bitno, klijent"
                  }
                  className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:border-white/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-sm transition-all"
                  id="manual-tags"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1 flex items-center gap-1">
                    {t.reminderLabel}
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl py-2 px-3 text-black dark:text-[#EBEBF5]/90 outline-none text-[14px] transition-all cursor-pointer focus:ring-2 focus:ring-[#007AFF]/30 shadow-sm"
                    id="manual-reminder"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                    {t.deadlineLabel}
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl py-2 px-3 text-black dark:text-[#EBEBF5]/90 outline-none text-[14px] transition-all cursor-pointer focus:ring-2 focus:ring-[#007AFF]/30 shadow-sm"
                    id="manual-deadline"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                    {t.repeatLabel}
                  </label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as any)}
                    className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl py-2 px-3 text-black dark:text-[#EBEBF5]/90 outline-none text-[14px] transition-all cursor-pointer focus:ring-2 focus:ring-[#007AFF]/30 shadow-sm"
                    id="manual-repeat"
                  >
                    <option value="none">{t.repeatOptions.none}</option>
                    <option value="daily">{t.repeatOptions.daily}</option>
                    <option value="weekly">{t.repeatOptions.weekly}</option>
                    <option value="monthly">{t.repeatOptions.monthly}</option>
                  </select>
                </div>
              </div>

              {category === "D" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-1"
                >
                  <label className="text-xs font-semibold text-[#007AFF] mb-1 flex items-center gap-1">
                    {t.delegationLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={delegatedTo}
                    onChange={(e) => setDelegatedTo(e.target.value)}
                    placeholder={t.delegationPlaceholder}
                    className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:border-white/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-sm transition-all"
                    id="manual-delegated"
                  />
                </motion.div>
              )}

              {category === "E" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-1"
                >
                  <label className="block text-xs font-semibold text-[#FF3B30] dark:text-[#FF453A] mb-1">
                    {t.eliminationReasonLabelForm}
                  </label>
                  <input
                    type="text"
                    required
                    value={eliminationReason}
                    onChange={(e) => setEliminationReason(e.target.value)}
                    placeholder={t.eliminationPlaceholder}
                    className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#FF3B30]/20 focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] focus:border-[#FF3B30]/20 dark:border-[#FF453A]/20 focus:ring-1 focus:ring-[#FF3B30]/50 dark:ring-[#FF453A]/50 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-sm transition-all"
                    id="manual-elimination"
                  />
                </motion.div>
              )}

              {/* Task Estimation & Energy level with AI Sparkles helper */}
              <div className="p-3.5 border border-black/5 dark:border-white/5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    ⏱️{" "}
                    {language === "en" ? "Task Estimation & Energy" : language === "tr" ? "Görev Tahmini ve Enerji" : "Procena vremena i energije"}
                  </span>

                  {/* AI Estimate Helper Trigger */}
                  <button
                    type="button"
                    onClick={handleEstimateTask}
                    disabled={isEstimating || !title.trim()}
                    className="py-1 px-3.5 rounded-xl text-[13px] font-semibold bg-[#007AFF]/10 hover:bg-[#1C1C1E] hover:text-white text-[#007AFF] border border-black/5 dark:border-white/5 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-55 active:scale-95"
                  >
                    {isEstimating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#007AFF] dark:text-[#0A84FF] shrink-0" />
                        <span>
                          {language === "en" ? "AI Estimating..." : language === "tr" ? "Yapay Zeka Tahmini..." : "Procenjivanje..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-[#FF9500]" />
                        <span>
                          {language === "en" ? "AI Estimate Helper" : language === "tr" ? "AI Tahmin Yardımcısı" : "AI predloži procenu"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                      {language === "en" ? "Time Required (minutes)" : language === "tr" ? "Gerekli Süre (dakika)" : "Potrebno vreme (u minutima)"}
                    </label>
                    <input
                      type="number"
                      value={timeRequired}
                      onChange={(e) =>
                        setTimeRequired(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder={language === "en" ? "E.g. 45" : language === "tr" ? "Örn. 45" : "Npr. 45"}
                      min="1"
                      className="w-full bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 focus:border-black/10 dark:focus:border-white/10 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                      {language === "en" ? "Energy Level Needed" : language === "tr" ? "Gerekli Enerji Seviyesi" : "Nivo potrebne energije"}
                    </label>
                    <div className="flex bg-[#E5E5EA] dark:bg-[#3A3A3C]/40 p-1.5 rounded-xl text-xs font-semibold items-center gap-1">
                      {["Low", "Medium", "High"].map((level) => {
                        const isActive = energyRequired === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setEnergyRequired(level)}
                            className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                              isActive
                                ? level === "Low"
                                  ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-white"
                                  : level === "Medium"
                                    ? "bg-[#FF9500] dark:bg-[#FF9F0A] text-white"
                                    : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-white"
                                : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/50"
                            }`}
                          >
                            {level === "Low"
                              ? language === "en" ? "Low" : language === "tr" ? "Düşük" : "Niska"
                              : level === "Medium"
                                ? language === "en" ? "Medium" : language === "tr" ? "Orta" : "Srednja"
                                : language === "en" ? "High" : language === "tr" ? "Yüksek" : "Visoka"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="bg-[#1C1C1E] hover:bg-black/5 dark:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded-xl flex items-center gap-2 text-sm transition-all cursor-pointer"
                  id="btn-manual-submit"
                >
                  <Plus className="w-4 h-4" /> {t.saveTaskBtn}
                </button>
              </div>
            </motion.form>
          )}

          {/* TAB 2: QUESTIONNAIRE WIZARD */}
          {activeTab === "wizard" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="dark:text-[#EBEBF5]/60 space-y-4"
              id="wizard-container"
            >
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#007AFF]/10 border border-black/5 dark:border-white/5 text-[#007AFF] rounded-xl text-xs leading-relaxed">
                    <strong>{t.wizardIntro}</strong> {t.wizardIntroBody}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                          {t.taskTitleLabel}
                        </label>
                        <VoiceInputNode
                          isEvening={false}
                          language={language}
                          onTranscript={(text) =>
                            setWTitle((prev) => prev + text)
                          }
                          onStartRecording={() => setWTitle("")}
                          inline={true}
                        />
                      </div>
                      <input
                        type="text"
                        required
                        value={wTitle}
                        onChange={(e) => setWTitle(e.target.value)}
                        placeholder={t.wizardTitlePlaceholder}
                        className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:border-white/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-sm transition-all"
                        id="wizard-title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                        {t.reminderLabel}
                      </label>
                      <input
                        type="time"
                        value={wReminder}
                        onChange={(e) => setWReminder(e.target.value)}
                        className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:border-white/5 dark:focus:border-white/5 rounded-xl py-2 px-3 text-black dark:text-white outline-none text-sm transition-all cursor-pointer"
                        id="wizard-reminder"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                        {t.deadlineLabel}
                      </label>
                      <input
                        type="date"
                        value={wDeadline}
                        onChange={(e) => setWDeadline(e.target.value)}
                        className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:border-white/5 dark:focus:border-white/5 rounded-xl py-2 px-3 text-black dark:text-white outline-none text-sm transition-all cursor-pointer"
                        id="wizard-deadline"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                        {language === "en" ? "Time Required (minutes)" : language === "tr" ? "Gerekli Süre (dakika)" : "Potrebno vreme (u minutima)"}
                      </label>
                      <input
                        type="number"
                        value={timeRequired}
                        onChange={(e) =>
                          setTimeRequired(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder={language === "en" ? "E.g. 45" : language === "tr" ? "Örn. 45" : "Npr. 45"}
                        min="1"
                        className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] border-transparent focus:border-black/5 dark:border-white/5 dark:focus:border-white/5 focus:ring-1 focus:ring-[#5856D6]/50 dark:ring-[#5E5CE6]/50 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none text-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                        {language === "en" ? "Energy Level Needed" : language === "tr" ? "Gerekli Enerji Seviyesi" : "Nivo potrebne energije"}
                      </label>
                      <div className="flex bg-[#E5E5EA] dark:bg-[#3A3A3C] p-1.5 rounded-xl text-xs font-semibold items-center gap-1 border border-black/5 dark:border-white/5">
                        {["Low", "Medium", "High"].map((level) => {
                          const isActive = energyRequired === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setEnergyRequired(level)}
                              className={`flex-1 py-1 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                                isActive
                                  ? level === "Low"
                                    ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-white"
                                    : level === "Medium"
                                      ? "bg-[#FF9500] dark:bg-[#FF9F0A] text-white"
                                      : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-white"
                                  : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/50"
                              }`}
                            >
                              {level === "Low"
                                ? language === "en" ? "LOW" : language === "tr" ? "DÜŞÜK" : "NISKA"
                                : level === "Medium"
                                  ? language === "en" ? "MED" : language === "tr" ? "MED" : "SRED"
                                  : language === "en" ? "HIGH" : language === "tr" ? "YÜKSEK" : "VISOK"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {t.descriptionLabel}
                      </label>
                      <VoiceInputNode
                        isEvening={false}
                        language={language}
                        onTranscript={(text) => setWDesc((prev) => prev + text)}
                        onStartRecording={() => setWDesc("")}
                        inline={true}
                      />
                    </div>
                    <textarea
                      value={wDesc}
                      onChange={(e) => setWDesc(e.target.value)}
                      placeholder={t.descPlaceholder}
                      rows={3}
                      className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-xl py-2 px-3 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none transition-all resize-none shadow-sm"
                      id="wizard-desc"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={!wTitle.trim()}
                      onClick={handleWizardNext}
                      className="bg-[#007AFF] active:opacity-70 text-white py-2 px-5 rounded-xl flex items-center gap-2 text-[17px] font-semibold transition-all cursor-pointer"
                      id="btn-wizard-next"
                    >
                      {t.startAssessment} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Consequence Question (Is it A?) */}
              {wizardStep === 2 && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="space-y-4 py-3 text-center"
                >
                  <span className="text-xs text-[#007AFF] font-medium block">
                    {t.stepOf.replace("{step}", "1")} {t.stepNames[0]}
                  </span>
                  <h3 className="text-lg font-semibold text-black dark:text-white max-w-lg mx-auto leading-snug">
                    {t.wizardQ1}
                  </h3>
                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={() => answerWizardQuestion(1, true)}
                      className="bg-black hover:bg-[#1C1C1E] text-white font-medium py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
                      id="wizard-ans-1-yes"
                    >
                      {t.wizardAnsYes}
                    </button>
                    <button
                      onClick={() => answerWizardQuestion(1, false)}
                      className="bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
                      id="wizard-ans-1-no"
                    >
                      {t.wizardAnsNo}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Useful but delayed (Is it B?) */}
              {wizardStep === 3 && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="space-y-4 py-3 text-center"
                >
                  <span className="text-xs text-[#007AFF] font-medium block">
                    {t.stepOf.replace("{step}", "2")} {t.stepNames[1]}
                  </span>
                  <h3 className="text-lg font-semibold text-black dark:text-white max-w-lg mx-auto leading-snug">
                    {t.wizardQ2}
                  </h3>
                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={() => answerWizardQuestion(2, true)}
                      className="bg-[#007AFF] active:opacity-70 text-white py-3 px-8 rounded-xl text-[17px] font-semibold transition-all cursor-pointer"
                      id="wizard-ans-2-yes"
                    >
                      {t.wizardQ2Yes}
                    </button>
                    <button
                      onClick={() => answerWizardQuestion(2, false)}
                      className="bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
                      id="wizard-ans-2-no"
                    >
                      {t.wizardQ2No}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Pleasant / Interest (Is it C?) */}
              {wizardStep === 4 && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="space-y-4 py-3 text-center"
                >
                  <span className="text-xs text-[#007AFF] font-medium block">
                    {t.stepOf.replace("{step}", "3")} {t.stepNames[2]}
                  </span>
                  <h3 className="text-lg font-semibold text-black dark:text-white max-w-lg mx-auto leading-snug">
                    {t.wizardQ3}
                  </h3>
                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={() => answerWizardQuestion(3, true)}
                      className="bg-[#34C759]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 text-white font-medium py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
                      id="wizard-ans-3-yes"
                    >
                      {t.wizardQ3Yes}
                    </button>
                    <button
                      onClick={() => answerWizardQuestion(3, false)}
                      className="bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
                      id="wizard-ans-3-no"
                    >
                      {t.wizardQ3No}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Delegate Option (D or E?) */}
              {wizardStep === 5 && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="space-y-4 py-3 text-center"
                >
                  <span className="text-xs text-[#007AFF] font-medium block">
                    {t.stepOf.replace("{step}", "4")} {t.stepNames[3]}
                  </span>
                  <h3 className="text-lg font-semibold text-black dark:text-white max-w-lg mx-auto leading-snug">
                    {t.wizardQ4}
                  </h3>
                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={() => answerWizardQuestion(4, true)}
                      className="bg-[#007AFF] active:opacity-70 text-white py-3 px-8 rounded-xl text-[17px] font-semibold transition-all cursor-pointer"
                      id="wizard-ans-4-yes"
                    >
                      {t.wizardQ4Yes}
                    </button>
                    <button
                      onClick={() => answerWizardQuestion(4, false)}
                      className="bg-[#FF3B30]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-white font-medium py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
                      id="wizard-ans-4-no"
                    >
                      {t.wizardQ4No}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Review and save */}
              {wizardStep === 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5"
                >
                  <div className="text-center pb-2">
                    <h3 className="text-lg font-medium text-black dark:text-white">
                      {t.wizardEnded}
                    </h3>
                    <p className="text-sm text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1">
                      {t.wizardEndedSub}
                    </p>
                  </div>

                  <div className="flex justify-center py-2">
                    <div
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center w-36 text-center ${
                        wDetectedCategory === "A"
                          ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A]"
                          : wDetectedCategory === "B"
                            ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500]/20 dark:border-[#FF9F0A]/20 text-[#FF9500] dark:text-[#FF9F0A]"
                            : wDetectedCategory === "C"
                              ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158]"
                              : wDetectedCategory === "D"
                                ? "bg-[#007AFF]/10 border-black/5 dark:border-white/5 text-[#007AFF]"
                                : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A]"
                      }`}
                    >
                      <span className="text-xl text-[#3C3C43] dark:text-white font-semibold">
                        {wDetectedCategory}
                      </span>
                      <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium mt-2">
                        {wDetectedCategory
                          ? t.wizardResultNames[wDetectedCategory]
                          : ""}
                      </span>
                    </div>
                  </div>

                  <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs text-center max-w-sm mx-auto leading-relaxed italic bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-black/5 dark:border-white/5">
                    {wDetectedCategory === "A" && t.wizardReasonings.A}
                    {wDetectedCategory === "B" && t.wizardReasonings.B}
                    {wDetectedCategory === "C" && t.wizardReasonings.C}
                    {wDetectedCategory === "D" && t.wizardReasonings.D}
                    {wDetectedCategory === "E" && t.wizardReasonings.E}
                  </p>

                  {/* Supplemental Subfield prompts */}
                  {wDetectedCategory === "D" && (
                    <div className="max-w-sm mx-auto">
                      <label className="block text-xs font-medium text-[#007AFF] mb-1">
                        {t.wizardDelegatedLabel}
                      </label>
                      <input
                        type="text"
                        required
                        value={wDelegated}
                        onChange={(e) => setWDelegated(e.target.value)}
                        placeholder={t.wizardDelegatedPlaceholder}
                        className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 focus:bg-white dark:bg-[#1C1C1E] dark:focus:bg-[#2C2C2E] rounded-xl py-2 px-3 text-black dark:text-white text-sm outline-none focus:border-black/5 dark:border-white/5"
                        id="wizard-field-delegated"
                      />
                    </div>
                  )}

                  {wDetectedCategory === "E" && (
                    <div className="max-w-sm mx-auto">
                      <label className="block text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] mb-1">
                        {t.wizardEliminationLabel}
                      </label>
                      <input
                        type="text"
                        required
                        value={wElimination}
                        onChange={(e) => setWElimination(e.target.value)}
                        placeholder={t.wizardEliminationPlaceholder}
                        className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 lg:bg-white dark:bg-[#1C1C1E] dark:lg:bg-[#1C1C1E] rounded-xl py-2 px-3 text-black dark:text-white text-sm outline-none focus:border-[#FF3B30] dark:border-[#FF453A]"
                        id="wizard-field-elimination"
                      />
                    </div>
                  )}

                  <div className="flex justify-center gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                    <button
                      onClick={startWizard}
                      className="bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white text-xs px-4 py-2 rounded-xl font-medium transition-all cursor-pointer"
                      id="btn-wizard-restart"
                    >
                      {t.wizardTryAgain}
                    </button>
                    <button
                      onClick={saveWizardTask}
                      disabled={
                        wDetectedCategory === "D"
                          ? !wDelegated.trim()
                          : wDetectedCategory === "E"
                            ? !wElimination.trim()
                            : false
                      }
                      className="bg-[#007AFF] active:opacity-70 disabled:opacity-50 text-white py-2 px-6 rounded-xl text-[17px] font-semibold transition-all cursor-pointer"
                      id="btn-wizard-save"
                    >
                      {wDetectedCategory
                        ? t.wizardConfirmSave.replace(
                            "{cat}",
                            t.wizardResultNames[wDetectedCategory],
                          )
                        : ""}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 3: AI BRAIN DUMP */}
          {activeTab === "ai" && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="dark:text-[#EBEBF5]/60 space-y-4"
              id="ai-panel-container"
            >
              <div className="p-3 bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] rounded-xl text-xs leading-relaxed flex items-start gap-2">
                <Sparkles className="w-5 h-5 shrink-0 text-[#34C759]" />
                <div>
                  <strong>{t.aiIntroTitle}</strong> {t.aiIntroBody}
                </div>
              </div>

              {aiProposedTasks.length === 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
                      {language === "en" ? "Brain Dump Log" : language === "tr" ? "Beyin Dökümü Günlüğü" : "Spisak misli i obaveza"}
                    </label>
                    <textarea
                      value={brainDump}
                      onChange={(e) => setBrainDump(e.target.value)}
                      placeholder={t.aiBrainDumpPlaceholder}
                      rows={6}
                      disabled={isAiLoading}
                      className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] focus:border-[#34C759]/20 focus:ring-2 focus:ring-[#34C759]/30 rounded-xl py-2.5 px-3.5 text-[14px] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none transition-all resize-none leading-relaxed shadow-sm"
                      id="ai-braindump-input"
                    />
                  </div>

                  {aiError && (
                    <div className="p-3 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> {aiError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <motion.button
                      type="button"
                      disabled={isAiLoading || !brainDump.trim()}
                      onClick={handleAiAnalyze}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{
                        scale:
                          brainDump.trim().length > 0 && !isAiLoading
                            ? 1.02
                            : 1,
                      }}
                      animate={{
                        backgroundColor:
                          animationStatus === "success"
                            ? "rgba(52, 199, 89, 0.2)"
                            : animationStatus === "error"
                              ? "rgba(255, 59, 48, 0.2)"
                              : "rgba(52, 199, 89, 0.1)",
                        borderColor:
                          animationStatus === "success"
                            ? "rgba(52, 199, 89, 0.4)"
                            : animationStatus === "error"
                              ? "rgba(255, 59, 48, 0.4)"
                              : "rgba(52, 199, 89, 0.2)",
                      }}
                      transition={{ duration: 0.2 }}
                      className="border text-white font-medium py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      id="btn-ai-analyze"
                    >
                      <AnimatePresence mode="wait">
                        {animationStatus === "loading" && (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin text-[#34C759]" />
                            <span>
                              {aiStatusMessage ||
                                (language === "en" ? "Analyzing thoughts..." : language === "tr" ? "Düşünceleri analiz etmek..." : "Skeniranje misli...")}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "success" && (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 text-[#34C759] font-semibold"
                          >
                            <CheckCircle className="w-4 h-4 text-[#34C759]" />
                            <span>
                              {language === "en" ? "Analysis Complete!" : language === "tr" ? "Analiz Tamamlandı!" : "Analiza završena!"}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "error" && (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 text-[#FF3B30] font-semibold"
                          >
                            <X className="w-4 h-4 text-[#FF3B30]" />
                            <span>
                              {language === "en" ? "Error" : language === "tr" ? "Hata" : "Greška"}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "idle" && (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2"
                          >
                            <Brain className="w-4 h-4 text-[#34C759]" />
                            <span>
                              {language === "en" ? "Analyze with AI" : language === "tr" ? "Yapay zeka ile analiz edin" : "Analiziraj pomoću AI"}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              ) : (
                // AI Review Table
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#34C759] dark:text-[#30D158]">
                      {t.aiProposalTitle.replace(
                        "{count}",
                        String(aiProposedTasks.length),
                      )}
                    </h3>
                    <button
                      onClick={() => {
                        setAiProposedTasks([]);
                        setBrainDump("");
                      }}
                      className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] transition-colors font-semibold cursor-pointer"
                      id="btn-ai-clear-proposed"
                    >
                      {t.aiResetBtn}
                    </button>
                  </div>

                  <div className="relative overflow-hidden w-full min-h-[200px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={aiActiveSlide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        {(() => {
                          const idx = aiActiveSlide;
                          const tItem = aiProposedTasks[idx];
                          if (!tItem) return null;
                          const isSelected =
                            selectedProposedIndexes.includes(idx);
                          const isA = tItem.category === "A";
                          const isB = tItem.category === "B";
                          const isC = tItem.category === "C";
                          const isD = tItem.category === "D";
                          const isE = tItem.category === "E";

                          return (
                            <div
                              key={idx}
                              onClick={() => toggleProposedSelection(idx)}
                              className={`p-5 mb-2 border rounded-xl transition-all cursor-pointer min-h-[180px] ${
                                isSelected
                                  ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759]/20 dark:border-[#30D158]/20"
                                  : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 opacity-70 hover:opacity-100 hover:border-black/5 dark:border-white/5"
                              }`}
                              id={`proposed-task-${idx}`}
                            >
                              <div className="flex items-start gap-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Click is handled nested-level by full div click
                                  className="mt-1 h-5 w-5 bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#34C759] dark:ring-[#30D158]/50 focus:ring-opacity-40 cursor-pointer rounded"
                                  id={`proposed-checkbox-${idx}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-[13px] font-semibold px-2 py-0.5 rounded tracking-wide ${
                                        isA
                                          ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                                          : isB
                                            ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                                            : isC
                                              ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20"
                                              : isD
                                                ? "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/20 dark:border-[#0A84FF]/20"
                                                : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                                      }`}
                                    >
                                      {t.priority} {tItem.category}
                                      {tItem.subPriority}
                                    </span>
                                    <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                                      {t.categoryTitles[tItem.category]}
                                    </span>
                                  </div>

                                  <h4 className="text-base font-medium text-black dark:text-white mt-2 leading-tight">
                                    {tItem.title}
                                  </h4>
                                  <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-sm mt-1 leading-relaxed">
                                    {tItem.description}
                                  </p>

                                  {/* Explanation */}
                                  <div className="mt-3 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-white dark:bg-[#1C1C1E] py-2 px-3 rounded-xl border border-black/5 dark:border-white/5 flex items-start gap-1.5">
                                    <Sparkles className="w-4 h-4 mt-0.5 text-[#34C759] shrink-0" />
                                    <span>
                                      <strong>{t.analysisResultLabel}</strong>{" "}
                                      {tItem.explanation}
                                    </span>
                                  </div>

                                  {/* Supplemental details */}
                                  {isD && tItem.delegatedTo && (
                                    <div className="mt-2 text-xs text-[#007AFF] font-medium flex items-center gap-1">
                                      <User className="w-4 h-4" />{" "}
                                      {t.delegatedToLabel} {tItem.delegatedTo}
                                    </div>
                                  )}
                                  {isE && tItem.eliminationReason && (
                                    <div className="mt-2 text-xs text-[#FF3B30] dark:text-[#FF453A] font-medium flex items-center gap-1">
                                      <Trash2 className="w-4 h-4" />{" "}
                                      {t.eliminationReasonLabel}{" "}
                                      {tItem.eliminationReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between mt-2 px-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAiActiveSlide((prev) => Math.max(0, prev - 1))
                        }
                        disabled={aiActiveSlide === 0}
                        className="p-2 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] disabled:opacity-55 disabled:hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] cursor-pointer transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-[#3C3C43] dark:text-[#EBEBF5]/80 rotate-180" />
                      </button>

                      <div className="flex items-center gap-2">
                        {aiProposedTasks.map((_, i) => (
                          <div
                            key={i}
                            onClick={() => setAiActiveSlide(i)}
                            className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                              aiActiveSlide === i
                                ? "bg-[#34C759] dark:bg-[#30D158] w-5"
                                : "bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setAiActiveSlide((prev) =>
                            Math.min(aiProposedTasks.length - 1, prev + 1),
                          )
                        }
                        disabled={aiActiveSlide === aiProposedTasks.length - 1}
                        className="p-2 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] disabled:opacity-55 disabled:hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] cursor-pointer transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-[#3C3C43] dark:text-[#EBEBF5]/80" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-3 border-t border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setAiProposedTasks([])}
                      className="bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white text-xs px-4 py-2 rounded-xl font-medium transition-all cursor-pointer"
                      id="btn-ai-cancel-review"
                    >
                      {t.aiResetBtn}
                    </button>
                    <button
                      onClick={saveSelectedAiTasks}
                      className="bg-[#34C759]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 text-white font-medium text-xs px-6 py-2 rounded-xl transition-all cursor-pointer"
                      id="btn-ai-add-all-selected"
                    >
                      {t.importSelectedTasks.replace(
                        "{count}",
                        String(selectedProposedIndexes.length),
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
