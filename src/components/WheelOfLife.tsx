import React, { useState, useEffect } from "react";
import {
  Briefcase,
  DollarSign,
  Activity,
  Users,
  Heart,
  BookOpen,
  Gamepad2,
  Home,
  Star,
  Sparkles,
  FileText,
  Plus,
  Loader2,
  Trash2,
  Brain,
  Check,
  X,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ZoomableCard from "./ZoomableCard";
import VoiceInputNode from "./VoiceInputNode";

interface WheelOfLifeProps {
  language: "en" | "sr" | "tr";
  onAddTask: (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => void;
  isEvening?: boolean;
  currentUser?: any;
}

interface WheelCategory {
  id: string;
  labelEn: string;
  labelSr: string;
  labelTr: string;
}

export default function WheelOfLife({
  language,
  onAddTask,
  isEvening = false,
  currentUser,
}: WheelOfLifeProps) {
  const isEn = language === "en";

  const defaultCategories: WheelCategory[] = [
    {
      id: "career",
      labelEn: "Career & Business",
      labelSr: "Karijera i Posao",
      labelTr: "Kariyer ve İş",
    },
    {
      id: "finance",
      labelEn: "Finances",
      labelSr: "Finansije",
      labelTr: "Finans",
    },
    {
      id: "health",
      labelEn: "Health & Fitness",
      labelSr: "Zdravlje i Fitnes",
      labelTr: "Sağlık ve Fitness",
    },
    {
      id: "family",
      labelEn: "Family & Friends",
      labelSr: "Porodica i Prijatelji",
      labelTr: "Aile ve Arkadaşlar",
    },
    {
      id: "romance",
      labelEn: "Romance & Love",
      labelSr: "Ljubav i Partnerstvo",
      labelTr: "Romantik İlişkiler",
    },
    {
      id: "growth",
      labelEn: "Personal Growth",
      labelSr: "Lični Razvoj",
      labelTr: "Kişisel Gelişim",
    },
    {
      id: "fun",
      labelEn: "Fun & Hobbies",
      labelSr: "Zabava i Hobiji",
      labelTr: "Eğlence ve Hobiler",
    },
    {
      id: "environment",
      labelEn: "Physical Environment",
      labelSr: "Životni Prostor",
      labelTr: "Fiziksel Çevre",
    },
  ];

  // Load custom and default categories
  const [categories, setCategories] = useState<WheelCategory[]>(() => {
    try {
      const saved = safeStorage.getItem("abcde_wheel_categories");
      return saved ? JSON.parse(saved) : defaultCategories;
    } catch (e) {
      return defaultCategories;
    }
  });

  // Load scores
  const [scores, setScores] = useState<Record<string, number>>(() => {
    try {
      const saved = safeStorage.getItem("abcde_wheel_scores");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      career: 0,
      finance: 0,
      health: 0,
      family: 0,
      romance: 0,
      growth: 0,
      fun: 0,
      environment: 0,
    };
  });

  const [newCatName, setNewCatName] = useState("");

  // Persist Wheel parameters
  useEffect(() => {
    safeStorage.setItem("abcde_wheel_categories", JSON.stringify(categories));
    safeStorage.setItem("abcde_wheel_scores", JSON.stringify(scores));
  }, [categories, scores]);

  // Handle application hard reset
  useEffect(() => {
    const handleHardReset = () => {
      setCategories(defaultCategories);
      setScores({
        career: 6,
        finance: 5,
        health: 7,
        family: 8,
        romance: 6,
        growth: 8,
        fun: 5,
        environment: 7,
      });
    };
    window.addEventListener("trigger-hard-reset", handleHardReset);
    return () => {
      window.removeEventListener("trigger-hard-reset", handleHardReset);
    };
  }, []);

  const [notes, setNotes] = useState("");
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

  const [copied, setCopied] = useState(false);

  const [questionAnswers, setQuestionAnswers] = useState<
    Record<number, string>
  >({});

  const [coachResponse, setCoachResponse] = useState<{
    overallAnalysis: string;
    recommendations: {
      area: string;
      coachingAdvice: string;
      quickAction: string;
    }[];
    positiveFeedback: string;
    clarifyingQuestions?: string[];
    transactionalAnalysisInsight?: string;
  } | null>(null);

  const t = {
    title:
      language === "tr"
        ? "Hayat Çarkı ve Denge"
        : isEn ? "Wheel of Life Harmony" : "Krug Života i Balans",
    subtitle:
      language === "tr"
        ? "Önemli yaşam alanlarındaki memnuniyetinizi değerlendirin, dengeyi görsel olarak takip edin ve özel koçluk tavsiyeleri isteyin. Ayrıca kendi özel yaşam alanlarınızı da ekleyebilirsiniz!"
        : isEn ? "Assess satisfy in crucial life areas, track balance visually, and request custom coaching advice. You can also add your own custom life areas!" : "Procenite nivo zadovoljstva u ključnim životnim oblastima, vizuelno pratite balans i zatražite savete trenera. Takođe možete dodati svoje oblasti!",
    slidersTitle:
      language === "tr"
        ? "Alanları Derecelendir (1 - 10)"
        : isEn ? "Rate Areas (1 - 10)" : "Ocenite oblasti (1 - 10)",
    notesLabel:
      language === "tr"
        ? "Yaşam Alanları İçin Detaylı Düşünceler, Engeller ve Vizyon"
        : isEn ? "Detailed Reflections, Obstacles, and Vision for Life Areas" : "Detaljne beleške o preprekama, trenutnom stanju i viziji za oblasti života",
    notesPlaceholder:
      language === "tr"
        ? "AI koçunun dengenizi analiz edebilmesi için mevcut yaşam tarzınızı tam olarak tanımlayın:\n1) İŞ/FİNANS: İşinize kaç saat ayırıyorsunuz? Stresli, tükenmiş veya finansal olarak istikrarlı hissediyor musunuz?\n2) FITNESS/SAĞLIK: Diyetiniz, uyku kaliteniz ve fiziksel aktiviteniz nasıl? Tam olarak enerjik hissetmenizi engelleyen şey ne?\n3) İLİŞKİLER/ARKADAŞLAR: Ailenizle, partnerinizle veya arkadaşlarınızla yeterince kaliteli zaman geçiriyor musunuz? Bir yalnızlık veya kopukluk hissi var mı?\n4) GELİŞİM/HOBİLER: Yeni beceriler öğreniyor, kitap okuyor veya sevdiğiniz yaratıcı hobilere önemli saatler ayırıyor musunuz?\n\nBelirli engelleri, duygusal tıkanıklıkları veya ideal günlük rutininizin nasıl görüneceğini yazın."
        : isEn ? "Describe your current lifestyle fully so the AI coach can analyze your balance: \n1) WORK/FINANCE: How many hours are you dedicated to your job? Are you feeling stressed, burnt out, or financially stable?\n2) FITNESS/HEALTH: How is your diet, sleep quality, and physical activity? What is holding you back from feeling fully energized?\n3) RELATIONSHIPS/FRIENDS: Do you spend enough quality time with your family, partner, or friends? Is there a sense of loneliness or disconnect?\n4) GROWTH/HOBBIES: Are you learning new skills, reading books, or investing key hours in creative hobbies you love?\n\nWrite down specific obstacles, emotional blockers, or what your ideal daily routine would look like." : "Opišite detaljno svoj trenutni način života kako bi AI trener mogao precizno da analizira vaš životni balans: \n1) KARIJERA I FINANSIJE: Koliko sati posvećujete radu? Da li osećate stres, sindrom pregorevanja ili finansijsku stabilnost?\n2) ZDRAVLJE I FITNES: Kakva vam je ishrana, kvalitet sna i nivo fizičke aktivnosti? Šta vas sprečava da se osećate puni energije?\n3) ODNOSI I LJUBAV: Da li provodite dovoljno kvalitetnog vremena sa porodicom, partnerom ili prijateljima? Da li osećate usamljenost ili otuđenost?\n4) LIČNI RAZVOJ I HOBIJI: Da li učite nove veštine, čitate knjige ili odvajate vreme za kreativne aktivnosti koje volite?\n\nZapišite konkretne prepreke, emocionalne blokade, ili kako izgleda vaša idealna svakodnevna rutina.",
    btnCoach:
      language === "tr"
        ? "AI Koçuna Danış"
        : isEn ? "Consult AI Coach" : "Posavetuj se sa AI trenerom",
    coachFeedback:
      language === "tr"
        ? "AI Koçluk Geri Bildirimi"
        : isEn ? "AI Coaching Feedback" : "Analiza i plan AI Životnog Trenera",
    posFeedback:
      language === "tr"
        ? "Parladığınız Alanlar"
        : isEn ? "Where you Shine" : "Tamo gde sijaš",
    lowFeedback:
      language === "tr"
        ? "Dengeyi Geliştirmek İçin Odaklanmış Eylem Adımları"
        : isEn ? "Focused Action Steps to Improve Balance" : "Praktični koraci za poboljšane oblasti",
    addBtn:
      language === "tr"
        ? "Görevlere Mikro Alışkanlık Ekle"
        : isEn ? "Add Mini-Habit to Tasks" : "Dodaj mikro-akciju",
    addSuccess:
      language === "tr"
        ? "Öncelikleriniz ABCDE Panosuna Eklendi!"
        : isEn ? "Added to your Priorities ABCDE Board!" : "Dodato na vašu tablu Prioriteti ABCDE!",
    instructions:
      language === "tr"
        ? "Puanları belirleyin ve anında içgörüler edinin. Kritik alanlar duyarlı vektörler içinde otomatik olarak ayarlanacaktır."
        : isEn ? "Set scores and get instant insights. Crucial areas will adjust automatically inside responsive vectors." : "Podesite ocene i potražite savete. Krug se automatski prilagođava i savršeno skalira na telefonu.",
    addCustomArea:
      language === "tr"
        ? "Özel Yaşam Alanı Ekle"
        : isEn ? "Add Custom Life Area" : "Dodaj sopstvenu oblast",
    addPlaceholder:
      language === "tr"
        ? "Örn. Maneviyat, Seyahat, Ebeveynlik..."
        : isEn ? "E.g., Spirituality, Travel, Parenting..." : "Npr., Edukacija, Duhovnost, Roditeljstvo...",
  };

  const handleUpdateScore = (catId: string, val: number) => {
    setScores((prev) => ({ ...prev, [catId]: Math.max(1, Math.min(10, val)) }));
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cleanName = newCatName.trim();
    const newId =
      "cat-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5);

    const newObj: WheelCategory = {
      id: newId,
      labelEn: cleanName,
      labelSr: cleanName,
      labelTr: cleanName,
    };

    setCategories((prev) => [...prev, newObj]);
    setScores((prev) => ({ ...prev, [newId]: 5 }));
    setNewCatName("");
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setScores((prev) => {
      const updated = { ...prev };
      delete updated[catId];
      return updated;
    });
  };

  const handleConsultCoach = async (customAppend?: string) => {
    setLoading(true);
    setAnimationStatus("loading");
    triggerHaptics("medium");
    setError(null);
    try {
      // Map keys to readable labels to feed to the AI advisor
      const labelMappedScores: Record<string, number> = {};
      categories.forEach((cat) => {
        const label =
          language === "tr"
            ? cat.labelTr || cat.labelEn
            : isEn
              ? cat.labelEn
              : cat.labelSr;
        labelMappedScores[label] = scores[cat.id] || 5;
      });

      const finalNotes = customAppend ? `${notes}\n\n${customAppend}` : notes;

      const response = await fetch("/api/wheel-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: labelMappedScores,
          notes: finalNotes,
          language,
        }),
      });
      if (!response.ok) {
        throw new Error(
          isEn ? "Failed to synchronize coaching tips. Try again." : "Greška pri sinkronizaciji sa trenerom. Pokušajte opet.",
        );
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setCoachResponse(data);
      if (customAppend) {
        setQuestionAnswers({});
        setNotes(finalNotes); // Save back to active notes
      }
      setAnimationStatus("success");
      triggerHaptics("success");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Error with AI coach");
      setAnimationStatus("error");
      triggerHaptics("error");
      setTimeout(() => {
        setAnimationStatus("idle");
      }, 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActionStep = (action: string, categoryName: string) => {
    onAddTask(
      action,
      isEn 
        ? `Daily mini-habit to balance [${categoryName}] area` 
        : language === "tr"
          ? `[${categoryName}] alanını dengelemek için günlük mikro alışkanlık`
          : `Svakodnevna mikro-navika za balans oblasti [${categoryName}]`,
      "A", // Urgent priority to smooth their wheel of life!
    );
    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn 
            ? `Habit to balance [${categoryName}] was queued in Inbox! 📥` 
            : language === "tr"
              ? `[${categoryName}] dengesi için alışkanlık gelen kutusuna eklendi! 📥`
              : `Uravnotežujuća navika za [${categoryName}] je poslata u Inbox! 📥`,
          type: "success",
        },
      }),
    );
  };

  // SVG Coordinates calculation relative to active categories size
  const cx = 220;
  const cy = 220;
  const maxRadius = 150;
  const numCategories = Math.max(3, categories.length);

  const getCoordinates = (index: number, score: number) => {
    const angle = (index * (360 / numCategories) - 90) * (Math.PI / 180);
    const r = (score / 10) * maxRadius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Generate the circular grids
  const gridRings = [2, 4, 6, 8, 10];
  const gridLines = categories.map((_, idx) => {
    const start = getCoordinates(idx, 1);
    const end = getCoordinates(idx, 10);
    return { start, end };
  });

  // User Score Polygon Points
  const scorePoints = categories
    .map((cat, idx) => {
      const scoreVal = scores[cat.id] || 5;
      const point = getCoordinates(idx, scoreVal);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const handleOpenAuth = () => {
    window.dispatchEvent(new Event("open-auth"));
  };

  const getIconForCategory = (id: string) => {
    switch (id) {
      case "career": return <Briefcase />;
      case "finance": return <DollarSign />;
      case "health": return <Activity />;
      case "family": return <Users />;
      case "romance": return <Heart />;
      case "growth": return <BookOpen />;
      case "fun": return <Gamepad2 />;
      case "environment": return <Home />;
      default: return <Star />;
    }
  };

  return (
    <div
      className={`border rounded-[24px] p-6 pb-24 md:pb-6 space-y-6 animate-fadeIn transition-all duration-300 shadow-sm relative overflow-hidden ${
        isEvening
          ? "bg-[#1C1C1E] border-white/5 text-[#EBEBF5]/80"
          : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white shadow-black/5 dark:shadow-none"
      }`}
      id="wheel-of-life-container"
    >
      {/* Container spacing since we removed header */}
      <div className="pt-2"></div>
      {/* Grid: Graph VS Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SVG Interactive Wheel Visualization column */}
        <div className="lg:col-span-5 w-full">
          <ZoomableCard className="p-6">
            <div className="w-full aspect-square flex items-center justify-center">
              <svg
                viewBox="0 0 440 440"
                className="w-full h-full overflow-visible select-none"
                id="svg-radar-wheel"
              >
                {/* Draw circular grid rings */}
                {gridRings.map((rVal, rIdx) => {
                  return (
                    <circle
                      key={rIdx}
                      cx={cx}
                      cy={cy}
                      r={(rVal / 10) * maxRadius}
                      className="fill-none stroke-[#E2E8F0] dark:stroke-white/15"
                      strokeWidth="1.2"
                      strokeDasharray={rVal === 10 ? "none" : "3,3"}
                    />
                  );
                })}

                {/* Draw axis grid rays */}
                {gridLines.map((line, idx) => (
                  <line
                    key={idx}
                    x1={cx}
                    y1={cy}
                    x2={line.end.x}
                    y2={line.end.y}
                    className="stroke-[#E2E8F0] dark:stroke-white/15"
                    strokeWidth="1.2"
                  />
                ))}

                {/* User dynamic balance polygon with glow */}
                <polygon
                  points={scorePoints}
                  className="fill-[#4F46E5]/40 dark:fill-[#6366F1]/40 stroke-[#4F46E5] dark:stroke-[#818CF8] transition-all duration-300"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                {/* Render Category Score circles & label texts */}
                {categories.map((cat, idx) => {
                  const scoreVal = scores[cat.id] || 5;
                  const p = getCoordinates(idx, scoreVal);
                  return (
                    <g key={cat.id}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="6"
                        className="fill-[#5856D6] dark:fill-[#5E5CE6] stroke-white dark:stroke-[#1e1b4b]"
                        strokeWidth="2"
                      />
                      {/* Outer category label strings */}
                      {(() => {
                        const angleStep = 360 / numCategories;
                        const labelAngle =
                          (idx * angleStep - 90) * (Math.PI / 180);
                        const labelDist = maxRadius + 50;
                        const lx = cx + labelDist * Math.cos(labelAngle);
                        const ly = cy + labelDist * Math.sin(labelAngle);

                        let anchor: "middle" | "start" | "end" = "middle";
                        const cosVal = Math.cos(labelAngle);
                        if (cosVal > 0.15) anchor = "start";
                        else if (cosVal < -0.15) anchor = "end";

                        const labelText = language === "tr" ? cat.labelTr || cat.labelEn : isEn ? cat.labelEn : cat.labelSr;
                        const truncatedLabel = labelText.length > 12 ? labelText.substring(0, 10) + "..." : labelText;

                        return (
                          <g key={cat.id}>
                            <foreignObject x={lx - 12} y={ly - 12} width="24" height="24" className="text-[#3C3C43] dark:text-[#EBEBF5]">
                                {getIconForCategory(cat.id)}
                            </foreignObject>
                          </g>
                        );
                      })()}
                    </g>
                  );
                })}
              </svg>
            </div>
          </ZoomableCard>
        </div>

        {/* Sliders layout panel column with custom items creator */}
        <div className="lg:col-span-7 space-y-5">
          <h3 className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 border-b border-black/5 dark:border-white/5 pb-2">
            {t.slidersTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 max-h-[360px] overflow-y-auto pr-2 pb-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="space-y-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] p-3 rounded-xl border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 transition-colors"
              >
                <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-white">
                  <span className="flex items-center gap-2 text-black dark:text-white font-medium block whitespace-normal break-words">
                    <span className="w-5 h-5 flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4 text-[#8E8E93] dark:text-[#EBEBF5]/60">
                        {getIconForCategory(cat.id)}
                    </span>
                    {language === "tr"
                      ? cat.labelTr || cat.labelEn
                      : isEn
                        ? cat.labelEn
                        : cat.labelSr}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 px-2.5 bg-[#007AFF]/10 rounded-lg text-[13px] text-white min-w-[28px] text-center font-semibold">
                      {scores[cat.id] || 5}
                    </span>
                    {/* Delete button only appears for custom categories to protect default ones */}
                    {!defaultCategories.some((c) => c.id === cat.id) && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-[#FF3B30] hover:text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 rounded-md cursor-pointer transition-all"
                        title={isEn ? "Remove category" : "Obriši oblast"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores[cat.id] || 5}
                    onChange={(e) =>
                      handleUpdateScore(cat.id, parseInt(e.target.value))
                    }
                    className="flex-1 accent-[#007AFF] dark:accent-[#0A84FF] h-2 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Form to add custom life area */}
          <form
            onSubmit={handleAddCustomCategory}
            className={`pt-2 border-t space-y-2 border-black/5 dark:border-white/5`}
          >
            <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
              💡 {t.addCustomArea}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t.addPlaceholder}
                className={`flex-1 text-[14px] p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all ${
                  isEvening
                    ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-white/40"
                    : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:bg-white dark:focus:bg-[#2C2C2E]"
                }`}
              />
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="p-3.5 bg-[#007AFF] active:opacity-70 disabled:bg-[#E5E5EA] dark:bg-[#3A3A3C] disabled:text-white text-white text-xs font-medium rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Input Notes & AI Consultation */}
      <div
        className={`space-y-4 pt-4 border-t relative border-black/5 dark:border-white/5`}
      >
        <div className="space-y-2 relative">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#007AFF]" />
              {t.notesLabel}
            </label>
            <VoiceInputNode
              isEvening={isEvening}
              language={language}
              onTranscript={(t) => setNotes((prev) => prev + t)}
              onStartRecording={() => setNotes("")}
              inline={true}
            />
          </div>
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className="w-full bg-[#7676801F] dark:bg-[#7676803D] focus:bg-white dark:focus:bg-[#2C2C2E] border border-transparent focus:border-black/5 dark:focus:border-white/5 focus:ring-2 focus:ring-[#007AFF]/30 rounded-[14px] text-[15px] sm:text-[17px] font-normal leading-relaxed py-3.5 pl-4 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none transition-all resize-y min-h-[140px] shadow-sm"
              id="wheel-notes"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <motion.button
            onClick={() => handleConsultCoach()}
            disabled={loading}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: !loading ? 1.02 : 1 }}
            animate={{
              backgroundColor:
                animationStatus === "success"
                  ? "rgba(52, 199, 89, 1)"
                  : animationStatus === "error"
                    ? "rgba(255, 59, 48, 1)"
                    : "rgba(0, 122, 255, 1)",
            }}
            transition={{ duration: 0.2 }}
            className="w-full sm:w-auto px-6 py-4 disabled:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:disabled:bg-[#3A3A3C] disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            id="btn-wheel-coach"
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
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {isEn ? "Coaching Analysis..." : language === "tr" ? "Koçluk Analizi..." : "Trener balansira krug..."}
                  </span>
                </motion.div>
              )}
              {animationStatus === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 text-white font-semibold"
                >
                  <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span>
                    {isEn ? "Analysis Complete!" : "Analiza uspešna!"}
                  </span>
                </motion.div>
              )}
              {animationStatus === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 text-white font-semibold"
                >
                  <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span>{isEn ? "Error" : "Greška"}</span>
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
                  <Sparkles className="w-4 h-4 animate-pulse text-[#FFD60A]" />
                  <span>{t.btnCoach}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] text-xs rounded-xl border border-[#FF3B30]/20 dark:border-[#FF453A]/20">
          ⚠️ {error}
        </div>
      )}

      {/* Coach Output Panel */}
      {coachResponse && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-xl p-6 mt-6 space-y-6 ${
            isEvening
              ? "bg-[#1C1C1E]/10 border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
              : "bg-[#007AFF]/10 border-black/5 dark:border-white/5 text-white dark:text-white"
          }`}
        >
          {/* Header */}
          <div
            className={`border-b pb-3 flex items-center justify-between gap-4 flex-wrap border-black/5 dark:border-white/5`}
          >
            <h3
              className={`text-sm font-semibold flex items-center gap-2 text-black dark:text-white`}
            >
              <span className="p-1 px-2.5 bg-[#007AFF] text-white rounded-lg">
                Life Coach
              </span>
              {t.coachFeedback}
            </h3>

            {/* Copy Button */}
            <button
              onClick={() => {
                if (!coachResponse) return;
                const recsText = (coachResponse.recommendations || [])
                  .map(
                    (r, i) =>
                      `${i + 1}. Area: ${r.area}\nAdvice: ${r.coachingAdvice}\nAction: ${r.quickAction}`,
                  )
                  .join("\n\n");
                const questionsText =
                  coachResponse.clarifyingQuestions?.join("\n") || "";
                const taInsight =
                  coachResponse.transactionalAnalysisInsight || "";
                const fullText = `[${isEn ? "Balance Analysis" : "Analiza harmonije"}]\n${coachResponse.overallAnalysis || ""}\n\n[${isEn ? "Strengths & Wins" : "Snaga i pobede"}]\n${coachResponse.positiveFeedback || ""}\n\n${taInsight ? `[PAC Analysis]\n${taInsight}\n\n` : ""}[${isEn ? "Actionable Recommendations" : "Preporuke za akciju"}]\n${recsText}\n\n${questionsText ? `[Questions]\n${questionsText}` : ""}`;
                navigator.clipboard.writeText(fullText).catch(() => {});
                setCopied(true);
                if (
                  typeof window !== "undefined" &&
                  (window as any).triggerHaptics
                ) {
                  (window as any).triggerHaptics("success");
                }
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-1.5 px-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#007AFF]/10 dark:bg-[#1C1C1E] dark:hover:bg-white dark:bg-[#1C1C1E]/10 border border-black/5 dark:border-white/5 rounded-lg text-xs font-bold text-[#8E8E93] hover:text-[#007AFF] flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0"
              title={isEn ? "Copy all coach feedback" : language === "tr" ? "Tüm koç geri bildirimlerini kopyala" : "Kopiraj sve savete"}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#34C759]" />
                  <span className="text-[#34C759]">
                    {isEn ? "Copied" : "Kopirano"}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[#8E8E93] dark:text-[#EBEBF5]/65">
                    {isEn ? "Copy Coach Feedback" : language === "tr" ? "Koçun Geri Bildirimini Kopyala" : "Kopiraj sve savete"}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left detailed text */}
            <div className="md:col-span-7 space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-[13px] font-medium text-[#007AFF]">
                  🧘 {isEn ? "Balance Analysis" : "Analiza harmonije"}
                </h4>
                <div
                  onClick={() => {
                    (window as any).triggerGlobalZoom?.(
                      isEn ? "Life Balance Harmony Analysis" : "Analiza Harmonije Životnog Kruga",
                      <div className="space-y-4 pt-1">
                        <p className="text-sm font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed whitespace-pre-line">
                          {coachResponse.overallAnalysis}
                        </p>
                      </div>,
                      "🧘",
                      isEn ? "Coaching Vision" : "Savetnik",
                    );
                  }}
                  className={`text-xs font-semibold leading-relaxed whitespace-pre-line p-4 rounded-xl border cursor-pointer hover:border-black/5 dark:border-white/5 dark:hover:border-black/5 dark:border-white/5 transition-all ${
                    isEvening
                      ? "bg-black/20 border-white/5 text-[#EBEBF5]/80 hover:bg-[#1C1C1E]/60"
                      : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                  }`}
                >
                  {coachResponse.overallAnalysis}
                  <div className="mt-3 text-[13px] font-semibold text-[#007AFF] text-right">
                    🔍 {isEn ? "CLICK TO ZOOM" : language === "tr" ? "YAKINLAŞTIRMAK İÇİN TIKLAYIN" : "KLIKNI ZA UVELIČAVANJE"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[13px] font-medium text-[#34C759] dark:text-[#30D158]">
                  🌟 {t.posFeedback}
                </h4>
                <div
                  onClick={() => {
                    (window as any).triggerGlobalZoom?.(
                      isEn ? "Sectors of Greatest Strength" : "Moje Najjače Životne Oblasti",
                      <div className="space-y-4 pt-1">
                        <p className="text-sm font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed whitespace-pre-line">
                          {coachResponse.positiveFeedback}
                        </p>
                      </div>,
                      "🌟",
                      isEn ? "Coaching Vision" : "Savetnik",
                    );
                  }}
                  className={`text-xs leading-relaxed font-semibold p-4 rounded-xl border cursor-pointer hover:border-[#34C759]/20 dark:border-[#30D158]/20 dark:hover:border-[#34C759] dark:border-[#30D158] transition-all ${
                    isEvening
                      ? "bg-black/20 border-white/5 text-[#EBEBF5]/80 hover:bg-[#1C1C1E]/60"
                      : "bg-white dark:bg-[#1C1C1E] border-[#34C759]/20 dark:border-[#30D158]/20 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                  }`}
                >
                  {coachResponse.positiveFeedback}
                  <div className="mt-3 text-[13px] font-semibold text-[#34C759] dark:text-[#30D158] text-right">
                    🔍 {isEn ? "CLICK TO ZOOM" : language === "tr" ? "YAKINLAŞTIRMAK İÇİN TIKLAYIN" : "KLIKNI ZA UVELIČAVANJE"}
                  </div>
                </div>
              </div>

              {coachResponse.transactionalAnalysisInsight && (
                <div className="space-y-1.5 mt-4">
                  <h4 className="text-[13px] font-medium text-[#AF52DE] flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    {isEn ? "Deep Mental Insight" : "Mentalni Model - Dubinski Uvid"}
                  </h4>
                  <div
                    onClick={() => {
                      (window as any).triggerGlobalZoom?.(
                        isEn ? "Deep Mental Insight" : "Mentalni Model",
                        <div className="space-y-4 pt-1">
                          <p className="text-[15px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed whitespace-pre-line">
                            {coachResponse.transactionalAnalysisInsight}
                          </p>
                        </div>,
                        "🧠",
                        isEn ? "Coaching Vision" : "Savetnik",
                      );
                    }}
                    className={`text-[13px] leading-relaxed font-semibold p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                      isEvening
                        ? "bg-[#AF52DE]/10 border-[#AF52DE]/20 text-[#D894FF] hover:bg-[#AF52DE]/20"
                        : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#AF52DE] dark:text-[#D894FF] hover:border-[#AF52DE]/30"
                    }`}
                  >
                    {coachResponse.transactionalAnalysisInsight}
                    <div className="mt-3 text-[13px] font-bold text-[#AF52DE] dark:text-[#D894FF] text-right">
                      🔍 {isEn ? "CLICK TO ZOOM" : language === "tr" ? "YAKINLAŞTIRMAK İÇİN TIKLAYIN" : "KLIKNI ZA UVELIČAVANJE"}
                    </div>
                  </div>
                </div>
              )}

              {coachResponse.clarifyingQuestions &&
                coachResponse.clarifyingQuestions.length > 0 && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 text-left ${
                      isEvening
                        ? "bg-white dark:bg-[#1C1C1E]/5 border-black/5 dark:border-white/5"
                        : "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                    }`}
                  >
                    <h4 className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9500] flex items-center gap-1.5">
                      🚨{" "}
                      {isEn ? "COACH REQUIRES ADDITIONAL INFO" : language === "tr" ? "DANIŞMAN EK BİLGİ BEKLİYOR" : "MOMENAT: TRENER TRAŽI DODATNE ODGOVORE"}
                    </h4>
                    <p className="text-[13px] leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold mb-2">
                      {isEn ? "Your notes were brief. To craft a hyper-personalized elite life-balance playbook, answer these quick clarifying queries:" : language === "tr" ? "Notlarınız kısaydı. Hiper-kişiselleştirilmiş seçkin bir yaşam dengesi oyun kitabı oluşturmak için şu hızlı açıklayıcı soruları yanıtlayın:" : "Vaša zabeleška je bila izuzetno kratka ili opšta. Za preciznije savete vrhunskog kvaliteta, odgovorite na ova brza pitanja:"}
                    </p>

                    <div className="space-y-3.5 pt-1">
                      {coachResponse.clarifyingQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="space-y-1">
                          <label
                            className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block text-black dark:text-white`}
                          >
                            {qIdx + 1}. {q}
                          </label>
                          <input
                            type="text"
                            value={questionAnswers[qIdx] || ""}
                            onChange={(e) =>
                              setQuestionAnswers((prev) => ({
                                ...prev,
                                [qIdx]: e.target.value,
                              }))
                            }
                            placeholder={
                              isEn ? "My answer..." : language === "tr" ? "Cevabım..." : "Moj odgovor..."
                            }
                            className={`w-full text-[14px] p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all ${
                              isEvening
                                ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-white/40 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                                : "bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:border-[#007AFF]"
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const answersStr = coachResponse
                          .clarifyingQuestions!.map((q, i) => {
                            const ans =
                              questionAnswers[i] ||
                              (isEn ? "No response" : language === "tr" ? "Yanıt yok" : "Nema unetog odgovora");
                            return isEn 
                              ? `- Question: ${q}\n Answer: ${ans}` 
                              : language === "tr" 
                                ? `- Soru: ${q}\n Cevap: ${ans}`
                                : `- Pitanje: ${q}\n Odgovor: ${ans}`;
                          })
                          .join("\n");
                        const customAppend = isEn ? `[Answers to Clarifying Questions]:\n${answersStr}` : language === "tr" ? `[Açıklayıcı Soruların Cevapları]:\n${answersStr}` : `[Odgovori na dodatna pitanja trenera]:\n${answersStr}`;
                        handleConsultCoach(customAppend);
                      }}
                      disabled={loading}
                      className="w-full bg-[#FF9500] hover:bg-[#FF9500]/10 disabled:bg-black/5 dark:bg-white/5 text-white text-[13px] font-semibold p-3 rounded-lg transition-all cursor-pointer text-center"
                    >
                      {loading
                        ? isEn ? "Evaluating..." : language === "tr" ? "Değerlendiriliyor..." : "Slanje odgovora..."
                        : isEn ? "Submit Coaching Answers ➔" : language === "tr" ? "Koçluk Cevaplarını Gönder ➔" : "Zalepi i pošalji odgovore ➔"}
                    </button>
                  </div>
                )}
            </div>

            {/* Right specific low actions */}
            <div className="md:col-span-5 space-y-3">
              <h4 className="text-[13px] font-medium text-[#FF3B30]">
                {t.lowFeedback}
              </h4>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {coachResponse.recommendations.map((rec, id) => (
                  <div
                    key={id}
                    onClick={() => {
                      (window as any).triggerGlobalZoom?.(
                        rec.area,
                        <div className="space-y-4 pt-1">
                          <div className="p-4 bg-[#007AFF]/10 dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5">
                            <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block mb-1">
                              🧘{" "}
                              {isEn ? "COACHING STRATEGY:" : language === "tr" ? "KOÇLUK STRATEJİSİ:" : "STRATEGIJA SAVETNIKA:"}
                            </span>
                            <p className="text-sm font-semibold text-black dark:text-white leading-relaxed">
                              {rec.coachingAdvice}
                            </p>
                          </div>

                          <div className="p-4 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 rounded-xl">
                            <span className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9500] block mb-1">
                              🚀{" "}
                              {isEn ? "RECOMMENDED MICROACTION TASK:" : language === "tr" ? "ÖNERİLEN MİKRO EYLEM GÖREVİ:" : "PREDLOŽENA MIKRO-AKCIJA:"}
                            </span>
                            <p className="font-sans italic text-sm font-semibold text-[#FF9500] dark:text-[#FF9F0A]">
                              "{rec.quickAction}"
                            </p>
                          </div>
                        </div>,
                        "💡",
                        isEn ? "Action Step" : "Preporuka",
                      );
                    }}
                    className={`p-4 rounded-xl border space-y-3 cursor-pointer hover:border-black/5 dark:border-white/5 dark:hover:border-black/5 dark:border-white/5 transition-all duration-200 select-none group relative ${
                      isEvening
                        ? "bg-black/20 border-white/5 hover:bg-white/5"
                        : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 hover:bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div
                        className={`p-1.5 px-3 rounded-lg border flex justify-between items-center ${
                          isEvening
                            ? "bg-white dark:bg-[#1C1C1E]/5 border-black/5 dark:border-white/5/40 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                            : "bg-[#007AFF]/10 border-black/5 dark:border-white/5/40 text-[#007AFF] dark:text-[#0A84FF]"
                        }`}
                      >
                        <span className="text-[13px] font-semibold">
                          {rec.area}
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#007AFF]/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        🔍 ZOOM
                      </span>
                    </div>
                    <p
                      className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                    >
                      {rec.coachingAdvice}
                    </p>
                    <div
                      className={`p-2.5 rounded-lg border flex flex-col gap-2 ${
                        isEvening
                          ? "bg-[#1C1C1E]/60 border-black/5 dark:border-white/5"
                          : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                        {isEn ? "Goal Task Idea:" : language === "tr" ? "Hedef Görev Fikri:" : "Predlog mikro-zadatka:"}
                      </span>
                      <span
                        className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-sans font-semibold italic text-[#3C3C43] dark:text-[#EBEBF5]/80`}
                      >
                        "{rec.quickAction}"
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddActionStep(rec.quickAction, rec.area);
                        }}
                        className="mt-1 w-full bg-[#007AFF] active:opacity-70 p-1.5 py-2 rounded-lg text-[13px] text-white font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t.addBtn}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
