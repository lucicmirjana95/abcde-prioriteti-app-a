import React, { useState } from "react";
import { CheckCircle } from "lucide-react";

interface StrategyPlaygroundProps {
  strategyId: string;
  language: string;
  isEvening: boolean;
  liveData: any;
}

export const StrategyPlayground: React.FC<StrategyPlaygroundProps> = ({
  strategyId,
  language,
  isEvening,
  liveData,
}) => {
  const isEn = language === "en";
  // Playground 1: Brain Dump Sandbox
  const [sandboxThoughts, setSandboxThoughts] = useState<string[]>([
    "Završiti prezentaciju za klijenta",
    "Kupiti sveže namirnice za večeru",
  ]);
  const [sandboxThoughtsInput, setSandboxThoughtsInput] = useState<string>("");

  // Playground 4: Habit Builder States
  const [sandboxHabitTrigger, setSandboxHabitTrigger] =
    useState<string>("morning_coffee");
  const [sandboxHabitAction, setSandboxHabitAction] =
    useState<string>("a1_focus");
  const [sandboxBuiltFormula, setSandboxBuiltFormula] = useState<string>("");

  // Playground 5: Dopamine Detroit Sliders
  const [sandboxDetoxScreen, setSandboxDetoxScreen] = useState<number>(6);
  const [sandboxDetoxScroll, setSandboxDetoxScroll] = useState<number>(7);
  const [sandboxDetoxRest, setSandboxDetoxRest] = useState<number>(4);

  // Playground 6: Disney Chamber Checklist
  const [disneyActiveRoom, setDisneyActiveRoom] = useState<
    "dreamer" | "realist" | "critic"
  >("dreamer");
  const [disneyChecklist, setDisneyChecklist] = useState<
    Record<string, boolean>
  >({
    dreamUnbound: false,
    idealFuture: false,
    resourceMap: false,
    timelineSteps: false,
    fatalFlawChecked: false,
    riskMitigations: false,
  });

  // Playground 7: Wheel Balancer
  const [sandboxSelectedPillar, setSandboxSelectedPillar] =
    useState<string>("career");
  const [sandboxPillarLevels, setSandboxPillarLevels] = useState<
    Record<string, number>
  >({
    career: 7,
    health: 5,
    finance: 6,
    relationships: 8,
    growth: 7,
    friends: 8,
    fun: 4,
    environment: 6,
    spirit: 5,
  });

  // Playground 8: Mentors Speech Bubbles
  const [activeCounselor, setActiveCounselor] = useState<
    "milica" | "marta" | "philosopher" | "dopamine" | "nikola"
  >("milica");

  // Playground 9: Discovery Lab Adaptations
  const [petFeedCount, setPetFeedCount] = useState<number>(0);
  const [petFeedText, setPetFeedText] = useState<string>("");

  // Pareto items state
  const [sandboxParetoItems, setSandboxParetoItems] = useState<
    { text: string; type: "lever" | "trivial" }[]
  >([
    { text: "Jutarnji 90-minutni rad na A1 zadatku", type: "lever" },
    { text: "Skrolovanje po društvenim mrežama", type: "trivial" },
    { text: "Proveravanje email notifikacija refleksno", type: "trivial" },
  ]);

  return (
    <div className="font-sans">
      {/* 1. BRAIN DUMP PLAYGROUND */}
      {strategyId === "braindump_inbox" && (
        <div className="p-5 bg-[#1C1C1E]/25 border border-black/5 dark:border-white/5/40 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#0A84FF]">
              🧠 INBOX TRIAGE SIMULATOR
            </span>
            <span className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
              {sandboxThoughts.length}{" "}
              {isEn
                ? "items queued"
                : language === "tr"
                  ? "sıraya alınan öğeler"
                  : "misli na čekanju"}
            </span>
          </div>
          <div className="space-y-3.5">
            <div className="flex gap-2.5">
              <input
                type="text"
                value={sandboxThoughtsInput}
                onChange={(e) => setSandboxThoughtsInput(e.target.value)}
                placeholder={
                  isEn
                    ? "Type a raw thought..."
                    : language === "tr"
                      ? "Ham bir düşünce yazın..."
                      : "Upišite nadolazeću brigu ili misao..."
                }
                className="flex-1 text-[14px] px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A] shadow-sm transition-all bg-[#1C1C1E] border border-white/5 text-white placeholder:text-[#EBEBF5]/40"
              />
              <button
                type="button"
                onClick={() => {
                  if (sandboxThoughtsInput.trim()) {
                    setSandboxThoughts([
                      sandboxThoughtsInput,
                      ...sandboxThoughts,
                    ]);
                    setSandboxThoughtsInput("");
                  }
                }}
                className="px-5 bg-[#007AFF] active:opacity-70 transition-opacity text-white font-semibold text-xs rounded-xl shrink-0"
              >
                {isEn ? "Add" : language === "tr" ? "Eklemek" : "Dodaj"}
              </button>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {sandboxThoughts.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-[#1C1C1E] text-xs"
                >
                  <span className="font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 truncate pr-2">
                    "{t}"
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSandboxThoughts(
                          sandboxThoughts.filter((_, i) => i !== idx),
                        );
                        alert(
                          isEn
                            ? "Task successfully prioritized into Priorities board!"
                            : language === "tr"
                              ? "Görev, Öncelikler panosunda başarıyla önceliklendirildi!"
                              : "Zadatak je uspešno premešten u Prioritete ABCDE!",
                        );
                      }}
                      className="px-2 py-1 bg-[#34C759]/10 hover:bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] rounded-md font-semibold scale-90"
                    >
                      ➔ ABCDE
                    </button>
                    <button
                      onClick={() =>
                        setSandboxThoughts(
                          sandboxThoughts.filter((_, i) => i !== idx),
                        )
                      }
                      className="px-2 py-1 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] rounded-md font-semibold scale-90"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. ABCDE BOARD PLAYGROUND */}
      {strategyId === "board" && (
        <div className="p-5 bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#34C759] dark:text-[#30D158]">
              🏆 REAL-TIME PRIORITY ASSIGNER
            </span>
          </div>
          <div className="space-y-3">
            {[
              {
                title:
                  liveData.a1Task ||
                  (isEn
                    ? "Finalize layout polish and build code"
                    : language === "tr"
                      ? "Düzen cilasını sonlandırın ve kod oluşturun"
                      : "Završiti predavanje softverskog rešenja"),
                defaultCat: "A",
              },
              {
                title: isEn
                  ? "Review unimportant newsletter promotions"
                  : language === "tr"
                    ? "Önemsiz bülten promosyonlarını inceleyin"
                    : "Čitanje reklamnih poruka",
                defaultCat: "D",
              },
              {
                title: isEn
                  ? "Binge watching social videos at midnight"
                  : language === "tr"
                    ? "Gece yarısı sosyal videoları art arda izlemek"
                    : "Otvaranje smešnih klipova na internetu",
                defaultCat: "E",
              },
            ].map((item, keyIdx) => (
              <div
                key={keyIdx}
                className="p-3 bg-[#1C1C1E] rounded-xl border border-white/5 flex justify-between items-center gap-3 text-xs"
              >
                <span className="font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 truncate">
                  "{item.title}"
                </span>
                <select
                  defaultValue={item.defaultCat}
                  onChange={(e) =>
                    alert(
                      isEn
                        ? `Priority Class updated to Level ${e.target.value}`
                        : language === "tr"
                          ? `Öncelik Sınıfı ${e.target.value} Düzeyine güncellendi`
                          : `Kategorija uspešno promenjena na nivo ${e.target.value}!`,
                    )
                  }
                  className="bg-black border border-white/5 rounded-lg px-2 py-1 text-xs text-[#0A84FF] font-semibold cursor-pointer"
                >
                  <option value="A">A - Catalyst focus</option>
                  <option value="B">B - Important tasks</option>
                  <option value="C">C - Free Leisure</option>
                  <option value="D">D - Delegate now</option>
                  <option value="E">E - Eliminate completely</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PARETO 80/20 PLAYGROUND */}
      {strategyId === "pareto" && (
        <div className="p-5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border border-[#007AFF]/20 dark:border-[#0A84FF]/20 rounded-xl space-y-4">
          <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block">
            📊 80/20 CRITICAL ADVANTAGE TEST
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold block">
                {isEn
                  ? "Select custom activity to audit"
                  : language === "tr"
                    ? "Denetlenecek özel etkinliği seçin"
                    : "Izaberi aktivnost za proveru"}
              </label>
              <select
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  if (selectedVal === "deep_block") {
                    setSandboxParetoItems([
                      {
                        text: "90-minutni jutarnji blok rada (A1 focus)",
                        type: "lever",
                      },
                      ...sandboxParetoItems,
                    ]);
                  } else if (selectedVal === "notifications") {
                    setSandboxParetoItems([
                      {
                        text: "Gledanje nebitnih obaveštenja",
                        type: "trivial",
                      },
                      ...sandboxParetoItems,
                    ]);
                  } else if (selectedVal === "strategic_plan") {
                    setSandboxParetoItems([
                      {
                        text: isEn
                          ? "Weekly strategic goal planning"
                          : language === "tr"
                            ? "Haftalık stratejik hedef planlama"
                            : "Nedeljno strateško planiranje ciljeva",
                        type: "lever",
                      },
                      ...sandboxParetoItems,
                    ]);
                  }
                }}
                className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer"
              >
                <option value="">
                  --{" "}
                  {isEn
                    ? "Choose pre-defined factor"
                    : language === "tr"
                      ? "Önceden tanımlanmış faktörü seçin"
                      : "Izaberi ponuđeno"}{" "}
                  --
                </option>
                <option value="deep_block">
                  {isEn
                    ? "90min Deep Work block (A1 focus)"
                    : language === "tr"
                      ? "90 dk Derin Çalışma bloğu (A1 odaklı)"
                      : "90min duboki rad (A1 zadatak)"}
                </option>
                <option value="notifications">
                  {isEn
                    ? "Reflexively checking text banners"
                    : language === "tr"
                      ? "Refleks olarak metin bildirimlerini kontrol etme"
                      : "Refleksno proveravanje obaveštenja"}
                </option>
                <option value="strategic_plan">
                  {isEn
                    ? "Quarterly Goal Strategy Formulation"
                    : language === "tr"
                      ? "Üç Aylık Hedef Stratejisi Oluşturma"
                      : "Kvartalno strateško planiranje ciljeva"}
                </option>
              </select>
            </div>
            <div className="p-3 bg-[#1C1C1E] border border-white/5 rounded-xl text-[13px] leading-relaxed text-[#555555] dark:text-[#EBEBF5]/60">
              {isEn
                ? "🎯 20% of your focused tasks drive 80% of actual outcome. Cut out distractions."
                : language === "tr"
                  ? "🎯 Odaklandığınız görevlerinizin %20'si, gerçek sonuçların %80'ini sağlar. Dikkat dağıtıcı şeyleri kesin."
                  : "🎯 Samo 20% visoko-uticajnog rada stvara 80% stabilnosti i napretka."}
            </div>
          </div>
          <div className="space-y-1.5 border-t border-black/5 dark:border-white/5 pt-3">
            {sandboxParetoItems.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-2.5 bg-[#1C1C1E] rounded-xl border border-white/5 text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80"
              >
                <span className="font-semibold text-[#555555] dark:text-[#EBEBF5]/60">
                  "{item.text}"
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[13px] font-semibold ${
                    item.type === "lever"
                      ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20"
                      : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                  }`}
                >
                  {item.type === "lever" ? "20% LEVER" : "80% TRIVIAL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MICRO-ROUTINES PLAYGROUND */}
      {strategyId === "progress" && (
        <div className="p-5 bg-[#00C7BE]/10 dark:bg-[#32ADE6]/10/25 border border-[#00C7BE]/20 dark:border-[#32ADE6]/20/40 rounded-xl space-y-4">
          <span className="text-[13px] font-semibold text-[#00C7BE] dark:text-[#32ADE6] block">
            ⚡ KAIZEN MICRO-ROUTINE HABIT STACK BUILDER
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3.5">
              <div>
                <label className="text-[13px] font-semibold block mb-1">
                  {isEn
                    ? "After I do (Trigger):"
                    : language === "tr"
                      ? "Bunu yaptıktan sonra (Tetikleyici):"
                      : "Nakon što uradim (Okidač):"}
                </label>
                <select
                  value={sandboxHabitTrigger}
                  onChange={(e) => setSandboxHabitTrigger(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl px-2 py-1.5 text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 focus:outline-none cursor-pointer"
                >
                  <option value="morning_coffee">
                    {isEn
                      ? "Finish my coffee"
                      : language === "tr"
                        ? "Kahvemi bitir"
                        : "Ispijem jutarnju kafu"}
                  </option>
                  <option value="open_laptop">
                    {isEn
                      ? "Power on laptop"
                      : language === "tr"
                        ? "Dizüstü bilgisayarı açma"
                        : "Upalim laptop ujutru"}
                  </option>
                  <option value="eat_lunch">
                    {isEn
                      ? "Finish eating lunch"
                      : language === "tr"
                        ? "Öğle yemeğini yemeyi bitir"
                        : "Završim sa ručkom"}
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[13px] font-semibold block mb-1">
                  {isEn
                    ? "I will instantly do:"
                    : language === "tr"
                      ? "Hemen şunu yapacağım:"
                      : "Odmah ću uraditi (Nova navika):"}
                </label>
                <select
                  value={sandboxHabitAction}
                  onChange={(e) => setSandboxHabitAction(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl px-2 py-1.5 text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 focus:outline-none cursor-pointer"
                >
                  <option value="a1_focus">
                    {isEn
                      ? "Do 90 minutes of A1 task of the day"
                      : language === "tr"
                        ? "Günün 90 dakikalık A1 görevini yapın"
                        : "odraditi 90 minuta A1 zadatka dana"}
                  </option>
                  <option value="write_diary">
                    {isEn
                      ? "Write down raw thoughts in your inbox"
                      : language === "tr"
                        ? "Düşüncelerinizi gelen kutusuna yazın"
                        : "zapisati sve misli u inbox"}
                  </option>
                  <option value="drink_water">
                    {isEn
                      ? "Drink a glass of water and stretch my back"
                      : language === "tr"
                        ? "Bir bardak su iç ve sırtımı esnet"
                        : "popiti čašu vode i protegnuti leđa"}
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const mappingTrig: Record<string, string> = {
                    morning_coffee: isEn
                      ? "After finishing my morning coffee"
                      : language === "tr"
                        ? "Sabah kahvemi bitirdikten sonra"
                        : "Nakon što popijem prvu kafu ujutru",
                    open_laptop: isEn
                      ? "Once I power on my computer"
                      : language === "tr"
                        ? "Bilgisayarımı açtığımda"
                        : "Čim upalim laptop i pre nego otvorim mail",
                    eat_lunch: isEn
                      ? "Right after sitting through lunch"
                      : language === "tr"
                        ? "Öğle yemeğini yedikten hemen sonra"
                        : "Odmah nakon što završim ručak",
                  };
                  const mappingAct: Record<string, string> = {
                    a1_focus: isEn
                      ? "I will devote 90 mins to A1 catalyst priorities."
                      : language === "tr"
                        ? "90 dakikamı A1 katalizör önceliklerine ayıracağım."
                        : "odmah ću posvetiti 90 minuta mom teškom A1 zadatku.",
                    write_diary: isEn
                      ? "I will dump mental garbage into inbox."
                      : language === "tr"
                        ? "Zihinsel çöpleri gelen kutusuna atacağım."
                        : "zapisaću tri rečenice u moje prazno sanduče.",
                    drink_water: isEn
                      ? "I will down a full water glass."
                      : language === "tr"
                        ? "Dolu bir bardak su içeceğim."
                        : "popiću čašu vode i svesno protegnuti noge.",
                  };
                  setSandboxBuiltFormula(
                    `"${mappingTrig[sandboxHabitTrigger]}, ${mappingAct[sandboxHabitAction]}"`,
                  );
                }}
                className="w-full py-2 bg-[#00C7BE]/10 hover:bg-[#00C7BE]/10 dark:bg-[#32ADE6]/10 text-white text-xs font-semibold rounded-lg select-none"
              >
                {isEn
                  ? "🚀 Build atomic formula"
                  : language === "tr"
                    ? "🚀 Atom formülü oluşturun"
                    : "🚀 Sastavi atomsku formulu"}
              </button>
            </div>

            <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                  {isEn
                    ? "HABIT STACKING FORMULA"
                    : language === "tr"
                      ? "ALIŞKANLIK BİRİKTİRME FORMÜLÜ"
                      : "FORMULA SLAGANJA NAVIKA"}
                </span>
                {sandboxBuiltFormula ? (
                  <p className="text-xs font-semibold text-[#00C7BE] dark:text-[#32ADE6] italic leading-relaxed pt-1">
                    {sandboxBuiltFormula}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 italic pt-1">
                    {isEn
                      ? "Create habit stack re-alignment..."
                      : language === "tr"
                        ? "Alışkanlık yığınının yeniden hizalanmasını oluşturun..."
                        : "Formulacija složene atomske navike..."}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 pt-1">
                {[1, 1, 1, 0].map((v, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded border ${v === 1 ? "bg-[#00C7BE]/10 dark:bg-[#32ADE6]/10 border-[#00C7BE]/20 dark:border-[#32ADE6]/20" : "bg-black border-black/5 dark:border-white/5"}`}
                  />
                ))}
                <span className="text-[13px] font-semibold pl-1.5">
                  {isEn
                    ? "Streak Active"
                    : language === "tr"
                      ? "Seri Aktif"
                      : "Niz Aktivan"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DOPAMINE RESET PLAYGROUND */}
      {strategyId === "dopamine" && (
        <div className="p-5 bg-[#FF2D55]/10 dark:bg-[#FF375F]/10/25 border border-[#FF2D55]/20 dark:border-[#FF375F]/20/40 rounded-xl space-y-4">
          <span className="text-[13px] font-semibold text-[#FF2D55] dark:text-[#FF375F] block">
            🧠 NEURO-RECEPTION BANDWIDTH ESTIMATOR
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-[#555555] dark:text-[#EBEBF5]/60 mb-1">
                  <span>
                    📱{" "}
                    {isEn
                      ? "Daily Screen Time"
                      : language === "tr"
                        ? "Günlük Ekran Süresi"
                        : "Sati ispred ekrana"}
                  </span>
                  <span className="text-[#FF2D55] dark:text-[#FF375F] font-semibold">
                    {sandboxDetoxScreen}h
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={sandboxDetoxScreen}
                  onChange={(e) =>
                    setSandboxDetoxScreen(Number(e.target.value))
                  }
                  className="w-full accent-[#007AFF] dark:accent-[#0A84FF] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-[#555555] dark:text-[#EBEBF5]/60 mb-1">
                  <span>
                    🎢{" "}
                    {isEn
                      ? "Scrolling impulse index"
                      : language === "tr"
                        ? "Kaydırma dürtü indeksi"
                        : "Traženje jeftine stimulacije"}
                  </span>
                  <span className="text-[#FF2D55] dark:text-[#FF375F] font-semibold">
                    {sandboxDetoxScroll}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sandboxDetoxScroll}
                  onChange={(e) =>
                    setSandboxDetoxScroll(Number(e.target.value))
                  }
                  className="w-full accent-[#007AFF] dark:accent-[#0A84FF] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-[#555555] dark:text-[#EBEBF5]/60 mb-1">
                  <span>
                    🍵{" "}
                    {isEn
                      ? "Digital free hours"
                      : language === "tr"
                        ? "Dijital ücretsiz saatler"
                        : "Sati svesnog mira bez telefona"}
                  </span>
                  <span className="text-[#FF2D55] dark:text-[#FF375F] font-semibold">
                    {sandboxDetoxRest}h
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={sandboxDetoxRest}
                  onChange={(e) => setSandboxDetoxRest(Number(e.target.value))}
                  className="w-full accent-[#007AFF] dark:accent-[#0A84FF] cursor-pointer"
                />
              </div>
            </div>

            {(() => {
              const score = Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    100 -
                      sandboxDetoxScreen * 5 -
                      sandboxDetoxScroll * 7 +
                      sandboxDetoxRest * 12,
                  ),
                ),
              );
              return (
                <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block">
                    {isEn
                      ? "Brain Focus Capacity"
                      : language === "tr"
                        ? "Beyin Odaklama Kapasitesi"
                        : "Mentalni kapacitet pažnje"}
                  </span>
                  <span
                    className={`text-xl text-[#3C3C43] font-semibold ${score < 35 ? "text-[#FF3B30] dark:text-[#FF453A]" : score > 70 ? "text-[#34C759] dark:text-[#30D158]" : "text-[#FF2D55] dark:text-[#FF375F]"}`}
                  >
                    {score}%
                  </span>
                  <p className="text-[13px] text-[#555555] dark:text-[#EBEBF5]/60 italic px-1 leading-relaxed">
                    {score < 35
                      ? isEn
                        ? "🚨 Turn off your phone and rest your focus immediately!"
                        : language === "tr"
                          ? "🚨 Telefonunuzu kapatın ve hemen odaklanmanızı dinlendirin!"
                          : "🚨 Isključite telefon odmah i odmorite fokus!"
                      : score > 70
                        ? isEn
                          ? "🚀 Receptors clear: Ready for deep analytical work!"
                          : language === "tr"
                            ? "🚀 Reseptörler temiz: Derin analitik çalışmaya hazır!"
                            : "🚀 Receptori čisti: Spremni ste za najteži umni rad!"
                        : isEn
                          ? "⚠️ Mental fatigue and procrastination tendency beginning."
                          : language === "tr"
                            ? "⚠️ Zihinsel yorgunluk ve erteleme eğilimi başlıyor."
                            : "⚠️ Počinje mentalni zamor i sklonost odlaganju prioriteta."}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. STRATEGIC PERSPECTIVE PLAYGROUND */}
      {strategyId === "disney" && (
        <div className="p-5 bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10/25 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20/40 rounded-xl space-y-4">
          <span className="text-[13px] font-semibold text-[#AF52DE] dark:text-[#BF5AF2] block">
            ✨ TRI-PERSPECTIVE STRATEGIC VETTING SYSTEM
          </span>
          <div className="flex border-b border-white/5 pb-2 gap-2">
            {[
              { id: "dreamer", label: "Visionary 💭" },
              { id: "realist", label: "Pragmatist 🛠️" },
              { id: "critic", label: "Auditor ⚠️" },
            ].map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setDisneyActiveRoom(room.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-transform ${
                  disneyActiveRoom === room.id
                    ? "bg-[#1C1C1E] border-black/5 dark:border-white/5 text-white"
                    : "border-transparent text-[#3C3C43] dark:text-[#EBEBF5]/80"
                }`}
              >
                <span>{room.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3 animate-fade-in text-xs">
            {disneyActiveRoom === "dreamer" && (
              <div className="space-y-2">
                <p className="text-[13px] text-[#555555] dark:text-[#EBEBF5]/60 italic">
                  "Sanjajte slobodno bez ikakve osude, brige o novcu i
                  vremenskim rokovima."
                </p>
                {[
                  {
                    key: "dreamUnbound",
                    label: "San i vizija su iscrtani u punom sjaju",
                  },
                  {
                    key: "idealFuture",
                    label: "Ishod uspeha je jasno zamišljen",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 p-2 bg-[#1C1C1E] rounded-xl cursor-pointer hover:bg-black/5 dark:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={disneyChecklist[item.key] || false}
                      onChange={(e) =>
                        setDisneyChecklist({
                          ...disneyChecklist,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="accent-[#007AFF] dark:accent-[#0A84FF] rounded cursor-pointer h-4 w-4"
                    />
                    <span className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {disneyActiveRoom === "realist" && (
              <div className="space-y-2">
                <p className="text-[13px] text-[#555555] dark:text-[#EBEBF5]/60 italic">
                  "Kako sprovesti san u delo? Šta nam hronološki treba?"
                </p>
                {[
                  {
                    key: "resourceMap",
                    label: "Napisan je spisak svih alata & resursa",
                  },
                  {
                    key: "timelineSteps",
                    label: "Zacrtani su nedeljni operativni koraci",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 p-2 bg-[#1C1C1E] rounded-xl cursor-pointer hover:bg-black/5 dark:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={disneyChecklist[item.key] || false}
                      onChange={(e) =>
                        setDisneyChecklist({
                          ...disneyChecklist,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="accent-[#007AFF] dark:accent-[#0A84FF] rounded cursor-pointer h-4 w-4"
                    />
                    <span className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {disneyActiveRoom === "critic" && (
              <div className="space-y-2">
                <p className="text-[13px] text-[#555555] dark:text-[#EBEBF5]/60 italic">
                  "Šta su slabe tačke našeg plana? Šta može poći po zlu?"
                </p>
                {[
                  {
                    key: "fatalFlawChecked",
                    label: "Urađena je rigorozna procena prepreka",
                  },
                  {
                    key: "riskMitigations",
                    label: "Plan B je napisan za sprečavanje kraha",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 p-2 bg-[#1C1C1E] rounded-xl cursor-pointer hover:bg-black/5 dark:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={disneyChecklist[item.key] || false}
                      onChange={(e) =>
                        setDisneyChecklist({
                          ...disneyChecklist,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="accent-[#007AFF] dark:accent-[#0A84FF] rounded cursor-pointer h-4 w-4"
                    />
                    <span className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. WHEEL OF LIFE PLAYGROUND */}
      {strategyId === "wheel" && (
        <div className="p-5 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 rounded-xl space-y-4">
          <span className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9F0A] block">
            🎡 LIFE WHEEL STABILIZER SIMULATOR
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3.5">
              <div>
                <label className="text-[13px] font-semibold block mb-1">
                  Izaberi životni stub:
                </label>
                <select
                  value={sandboxSelectedPillar}
                  onChange={(e) => setSandboxSelectedPillar(e.target.value)}
                  className="w-full bg-black border border-black/5 dark:border-white/5 rounded-xl px-2.5 py-2 text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer"
                >
                  <option value="career">
                    {isEn
                      ? "Career"
                      : language === "tr"
                        ? "Kariyer"
                        : "Karijera"}
                  </option>
                  <option value="health">
                    {isEn
                      ? "Health"
                      : language === "tr"
                        ? "Sağlık"
                        : "Zdravlje"}
                  </option>
                  <option value="finance">
                    {isEn
                      ? "Finances"
                      : language === "tr"
                        ? "Finans"
                        : "Finansije"}
                  </option>
                  <option value="relationships">
                    {isEn
                      ? "Relationships"
                      : language === "tr"
                        ? "İlişkiler"
                        : "Ljubav & brak"}
                  </option>
                  <option value="growth">
                    {isEn
                      ? "Growth"
                      : language === "tr"
                        ? "Büyüme"
                        : "Edukacija & lični rast"}
                  </option>
                  <option value="fun">
                    {isEn
                      ? "Leisure"
                      : language === "tr"
                        ? "Boş vakit"
                        : "Zabava & Slobodno vreme"}
                  </option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#555555] dark:text-[#EBEBF5]/60 mb-1">
                  <span>Stepen stuba (1-10)</span>
                  <span className="text-[#FF9500] dark:text-[#FF9F0A] font-semibold">
                    {sandboxPillarLevels[sandboxSelectedPillar] || 5}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sandboxPillarLevels[sandboxSelectedPillar] || 5}
                  onChange={(e) =>
                    setSandboxPillarLevels({
                      ...sandboxPillarLevels,
                      [sandboxSelectedPillar]: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#007AFF] dark:accent-[#0A84FF] cursor-pointer"
                />
              </div>
            </div>

            {(() => {
              const val = sandboxPillarLevels[sandboxSelectedPillar] || 5;
              const isCrit = val < 5;
              return (
                <div className="bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 rounded-xl flex flex-col justify-center space-y-1 text-left">
                  <span className="text-[13px] text-[#FF9500] dark:text-[#FF9F0A] block font-semibold">
                    MILICA DIRECT ACTION FEEDBACK
                  </span>
                  <h5
                    className={`text-xs font-semibold ${isCrit ? "text-[#FF3B30] dark:text-[#FF453A] transition-opacity" : "text-[#FF9500] dark:text-[#FF9F0A]"}`}
                  >
                    {isCrit
                      ? "⚠️ NESTABILAN STUB STABILNOSTI!"
                      : "🚀 FINO USKLAĐEN STATUS"}
                  </h5>
                  <p className="text-[13px] text-[#555555] dark:text-[#EBEBF5]/60 italic leading-relaxed pt-0.5">
                    {isCrit
                      ? "Nizak stepen na ovom stubu stvara nesvesnu paniku u vama i troši kognitivne resurse fokusiranja."
                      : "Domen je stabilno izbalansiran. Svesno ga negujte i nastavite napredak."}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 8. ADVISORS COUNCIL PLAYGROUND */}
      {strategyId === "advisors" && (
        <div className="p-5 bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 rounded-xl space-y-4">
          <span className="text-[13px] font-semibold text-[#AF52DE] dark:text-[#BF5AF2] block">
            🧙 AI ADVISORIES SOCIETY CHAT
          </span>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
            {[
              {
                id: "milica",
                name: isEn
                  ? "Psychologist"
                  : language === "tr"
                    ? "Psikolog"
                    : "Psiholog",
                role: "Psych Analyst",
                icon: "👩‍⚕️",
              },
              {
                id: "marta",
                name: isEn
                  ? "Senior Advisor"
                  : language === "tr"
                    ? "Kıdemli Danışman"
                    : "Sistemski Savetnik",
                role: isEn
                  ? "System Monitor"
                  : language === "tr"
                    ? "Sistem Monitörü"
                    : "Glavni Savetnik",
                icon: "👵",
              },
              {
                id: "philosopher",
                name: isEn
                  ? "Rational Coach"
                  : language === "tr"
                    ? "Rasyonel Koç"
                    : "Racionalni Trener",
                role: "Philosopher",
                icon: "🦉",
              },
              {
                id: "dopamine",
                name: isEn
                  ? "Neuro-Dopamine"
                  : language === "tr"
                    ? "Nöro-Dopamin"
                    : "Dopaminski Agent",
                role: isEn
                  ? "Neuro-Regulator"
                  : language === "tr"
                    ? "Nöro-Regülatör"
                    : "Regulator Dopamina",
                icon: "⚡",
              },
              {
                id: "nikola",
                name: isEn
                  ? "Biohacker Expert"
                  : language === "tr"
                    ? "Biyohacker Uzmanı"
                    : "Biohaker Savetnik",
                role: isEn
                  ? "Energy Optimizer"
                  : language === "tr"
                    ? "Enerji Optimize Edici"
                    : "Optimizator Energije",
                icon: "🧬",
              },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCounselor(c.id as any)}
                className={`p-1.5 sm:p-3 rounded-xl border transition-all cursor-pointer text-center space-y-1 ${
                  activeCounselor === c.id
                    ? "bg-[#1C1C1E] border-black/5 dark:border-white/5 shadow"
                    : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-transparent opacity-65"
                }`}
              >
                <span className="text-xl sm:text-2xl block">{c.icon}</span>
                <h5 className="text-[11px] sm:text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block truncate">
                  {c.name}
                </h5>
                <span className="text-[10px] sm:text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block truncate leading-none">
                  {c.role}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-white/5 bg-[#1C1C1E] text-xs font-semibold leading-relaxed text-[#555555] dark:text-[#EBEBF5]/60 italic text-left">
            {activeCounselor === "milica" && (
              <p>
                {language === "tr"
                  ? '"Erteleme, bilinçaltı kaygısı ve başarısızlık korkusundan kaynaklanır. Görevi en basit 5 dakikalık kontrol listesi adımına indirin. Sadece oturun ve baskı hissetmeden başlayın."'
                  : isEn
                    ? '"Procrastination stems from subconscious anxiety and fear of failure. Reduce the task to the simplest 5-minute checklist step. Just sit down and start without pressure."'
                    : language === "tr"
                      ? '"Erteleme bilinçaltı kaygı ve başarısızlık korkusundan kaynaklanır. Görevi en basit 5 dakikalık kontrol listesi adımına indirin. Oturun ve baskı olmadan başlayın."'
                      : '"Prokrastinacija potiče od nesvesne anksioznosti i straha od neuspeha. Smanjite zadatak na najprostiji 5-minutni checklist korak. Samo sedite i pokrenite se bez pritiska."'}
              </p>
            )}
            {activeCounselor === "marta" && (
              <p className="text-[12px] font-semibold text-[#FF2D55] dark:text-[#FF375F]">
                {language === "tr"
                  ? '"Canım benim, o telefonu bırak ve uyumadan önce endişeleri biriktirme. Bir fincan sıcak çay iç, zihnini boşalt ve erken uyu. Büyükannen seni korur, yarın yeni bir gün."'
                  : isEn
                    ? '"My dear, throw away that phone and don\'t collect worries before sleep. Drink a cup of warm tea, empty your mind, and sleep early. Grandma is watching over you, tomorrow is a new day."'
                    : language === "tr"
                      ? '"Canım, at o telefonu ve uyumadan önce dert toplama. Bir fincan sıcak çay iç, zihnini boşalt ve erken uyu. Büyükannen sana göz kulak oluyor, yarın yeni bir gün."'
                      : '"Zlato moje, baci taj telefon i ne sabiraj brige pred spavanje. Popij šolju toplog čaja, uradi svesno pražnjenje uma i lezi rano. Baka te čuva, sutra je novi dan."'}
              </p>
            )}
            {activeCounselor === "philosopher" && (
              <p>
                {language === "tr"
                  ? "\"Boş zamanınızı gerçekçi bir şekilde değerlendirin. 'Zamanım yok' derken internette bilinçsizce gezinmek için kaç saat harcadınız? Çalışma sürenizi bilinçli olarak engelleyin.\""
                  : isEn
                    ? "\"Evaluate your free time realistically. How many hours did you spend aimlessly browsing the internet while claiming 'you don't have time'? Consciously block your working hours.\""
                    : language === "tr"
                      ? "\"Boş zamanınızı gerçekçi bir şekilde değerlendirin. 'Vaktiniz yok' diyerek amaçsızca internette dolaşarak kaç saat harcadınız? Çalışma saatlerinizi bilinçli olarak engelleyin.\""
                      : "\"Sagledajte svoje prazno vreme realno. Koliko sati ste potrošili na nesvesno pretraživanje interneta dok ste tvrdili da 'nemate vremena'? Blokirajte svesno korigovano vreme rada.\""}
              </p>
            )}
            {activeCounselor === "dopamine" && (
              <p className="text-[12px] font-semibold text-[#FF3B30] dark:text-[#FF453A]">
                {language === "tr"
                  ? '"Ucuz dopamin temel odaklanma seviyenizi mahveder. 24 saatlik bir ekran detoksu yapın, sonsuz kaydırmayı durdurun ve derin çalışmalar için reseptörlerinizi yeniden yapılandırın."'
                  : isEn
                    ? '"Cheap dopamine ruins your focus baseline. Take a 24-hour screens detox, stop infinite scrolling, and rebuild your receptors for deep work."'
                    : language === "tr"
                      ? '"Ucuz dopamin odak noktanızı mahveder. 24 saatlik ekran detoksu yapın, sonsuz kaydırmayı bırakın ve derin çalışma için reseptörlerinizi yeniden oluşturun."'
                      : '"Jeftin dopamin uništava tvoj bazni fokus. Uradi 24-satni detoks od ekrana, zaustavi beskonačni scroll i oporavi receptore za duboki rad."'}
              </p>
            )}
            {activeCounselor === "nikola" && (
              <p className="text-[12px] font-semibold text-[#30D158] dark:text-[#30D158]">
                {language === "tr"
                  ? '"Biyolojiniz psikolojinizi yönetir. Mitokondrilerinizi sabah güneşiyle şarj edin, soğuk duşu bir enerji birikimi olarak görün ve sirkadiyen ritminizi koruyun."'
                  : isEn
                    ? '"Your biology dictates your psychology. Charge your mitochondria with morning sunlight, view cold exposure as an energy stack, and protect your circadian rhythm."'
                    : language === "tr"
                      ? '"Biyolojiniz psikolojinizi belirler. Mitokondrinizi sabah güneş ışığıyla şarj edin, soğuğa maruz kalmayı bir enerji yığını olarak görün ve sirkadiyen ritminizi koruyun."'
                      : '"Tvoja biologija diktira tvoju psihologiju. Napuni svoje mitohondrije jutarnjim suncem, tretiraj hladan tuš kao akumulaciju energije i zaštiti cirkadijalni ritam."'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 9. DISCOVERY LAB FORECASTER */}
      {strategyId === "habitat" && (
        <div className="p-5 bg-[#5856D6]/10 border border-[#5856D6]/20 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#5856D6] uppercase tracking-wider">
              🔮 Discovery Lab Adaptation Console
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3.5 text-xs text-left">
              <div>
                <div className="flex justify-between font-semibold text-[#555555] dark:text-[#EBEBF5]/75 mb-1">
                  <span>⚙️ Simulated System Integration:</span>
                  <span>{Math.min(100, 15 + petFeedCount * 12)}%</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-black/40 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#5856D6] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, 15 + petFeedCount * 12)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-[#555555] dark:text-[#EBEBF5]/75 mb-1">
                  <span>⚡ Cognitive Performance Score:</span>
                  <span>{Math.min(100, 30 + petFeedCount * 15)} pts</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-black/40 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#007AFF] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, 30 + petFeedCount * 15)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 font-sans pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPetFeedCount(petFeedCount + 1);
                    setPetFeedText(
                      isEn
                        ? "Focus block simulation complete! Leveling up Strategy Collection..."
                        : language === "tr"
                          ? "Odaklanma simülasyonu tamamlandı! Strateji Koleksiyonu güncelleniyor..."
                          : "Simulacija fokus bloka uspešna! Otključavanje novih UI elemenata...",
                    );
                  }}
                  className="w-1/2 py-2.5 bg-[#5856D6]/15 hover:bg-[#5856D6]/20 text-[#5856D6] dark:text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
                >
                  ⚡ Focus Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPetFeedCount(petFeedCount + 1);
                    setPetFeedText(
                      isEn
                        ? "Brain dump parsed! Clarity collection elements unlocked."
                        : language === "tr"
                          ? "Beyin dökümü analiz edildi! Netlik öğeleri açıldı."
                          : "Jutarnja refleksija analizirana! Integracija AI mentora uspešna.",
                    );
                  }}
                  className="w-1/2 py-2.5 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
                >
                  🧠 Brain Triage
                </button>
              </div>
            </div>

            <div className="bg-[#1C1C1E] border border-white/5 p-5 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-2xl animate-pulse">
                🔮
              </span>
              <p className="text-xs font-semibold text-[#5856D6] dark:text-[#64D2FF] italic pt-3 min-h-10 leading-relaxed">
                {petFeedText
                  ? `"${petFeedText}"`
                  : isEn
                    ? "Activate high-leverage habits to unlock elite AI Coaching styles!"
                    : "Pokreni simulaciju kognitivnog rada da vidiš kako se interfejs prilagođava."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
