import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Flame,
  Target,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  Settings,
  Sliders,
  Award,
} from "lucide-react";
import ZoomableCard from "./ZoomableCard";

interface DopamineEducationProps {
  language: "sr" | "en" | "tr";
  isDark: boolean;
  onAddTask?: (task: any) => void;
}

export default function DopamineEducation({
  language,
  isDark,
  onAddTask,
}: DopamineEducationProps) {
  const isEn = language === "en";

  // Segmented Control: Apple HIG style
  const [eduSubTab, setEduSubTab] = useState<
    "simulator" | "test" | "laws" | "reset"
  >("simulator");

  // Interactive states
  const [selectedSimActivity, setSelectedSimActivity] = useState<
    "scrolling" | "cold" | "gaming" | "focus"
  >("focus");

  // Habits evaluation matrix states for baseline calculation
  const [eduHabits, setEduHabits] = useState<Record<string, boolean>>({
    morningScroll: true,
    energyDrinks: false,
    multitasking: true,
    afternoonWalk: false,
    delayedCaffeine: false,
    deepBlocks: true,
    lateScreen: true,
    sleepUnplug: false,
  });

  const calculateFocusScore = () => {
    let score = 50;
    // Crpljači baze (Negativi)
    if (eduHabits.morningScroll) score -= 15;
    if (eduHabits.energyDrinks) score -= 10;
    if (eduHabits.multitasking) score -= 20;
    if (eduHabits.lateScreen) score -= 15;

    // Stabilizatori (Pozitivi)
    if (eduHabits.afternoonWalk) score += 15;
    if (eduHabits.delayedCaffeine) score += 15;
    if (eduHabits.deepBlocks) score += 20;
    if (eduHabits.sleepUnplug) score += 15;

    return Math.max(5, Math.min(100, score));
  };

  const getScoreVerdict = (score: number) => {
    if (score >= 80) {
      return {
        title: isEn ? "🏆 Optimal Receptors" : language === "tr" ? "🏆 Optimum Reseptörler" : "🏆 Optimalni Receptori",
        desc: isEn ? "Excellent baseline! Your habits prevent spikes from washing out your prefrontal receptors. Focus comes easily and stays duration-locked." : language === "tr" ? "Mükemmel temel! Alışkanlıklarınız, sivri uçların prefrontal reseptörlerinizi yıkamasını önler. Odaklanma kolayca gelir ve süre kilitli kalır." : "Odlična bazična linija! Tvoje navike štite čeoni režanj od preopterećenja. Koncentracija ti dolazi prirodno i traje duže.",
        color: "text-[#34C759] border-[#34C759]/20 bg-[#34C759]/5",
      };
    } else if (score >= 50) {
      return {
        title: isEn ? "⚖️ Mildly Desensitized" : language === "tr" ? "⚖️ Hafifçe Duyarsızlaştırılmış" : "⚖️ Blaga desenzitizacija",
        desc: isEn ? "Stable but susceptible! Checking morning screens or high-stress multi-tasking drains your tonic reservoirs. Minimize unearned rushes." : language === "tr" ? "Kararlı ama duyarlı! Sabah ekranlarını kontrol etmek veya yüksek stresli çoklu görev yapmak, tonik depolarınızı boşaltır. Kazanılmamış aceleleri en aza indirin." : "Stabilno ali ranjivo! Jutarnje skrolovanje i obaveze sa čestim prekidima isušuju tvoju snagu. Smanji laka uzbuđenja tokom dana.",
        color: "text-[#FF9500] border-[#FF9500]/20 bg-[#FF9500]/5",
      };
    } else {
      return {
        title: isEn ? "🚨 Receptor Exhaustion" : language === "tr" ? "🚨 Reseptör Tükenmesi" : "🚨 Iscrpljenost Receptora",
        desc: isEn ? "Severe Dopamine Downregulation! High neural friction makes peaceful tasks feel painful. We highly recommend activating the 7-day reset." : language === "tr" ? "Şiddetli Dopamin Düşüşü! Yüksek sinirsel sürtünme barışçıl görevlerin acı verici olmasına neden olur. 7 günlük sıfırlamayı etkinleştirmenizi kesinlikle öneririz." : "Ozbiljna desenzitizacija! Visok nivo kognitivnog otpora čini učenje i rad mentalno bolnim. Hitno aktiviraj 7-dnevni reset protokol.",
        color: "text-[#FF3B30] border-[#FF3B30]/20 bg-[#FF3B30]/5",
      };
    }
  };

  const simData = {
    scrolling: {
      titleEn: "Instant Phone Scrolling (TikTok/Reels)",
      titleSr: "Skrolovanje na telefonu (TikTok/Reels)",
      peakEn:
        "⚡ Spike: Up to +240% dopamine levels instantly with zero effort.",
      peakSr: "⚡ Pik: Instant skok do +240% nivoa dopamina uz nula napora.",
      crashEn:
        "📉 Crash: Drops to 40% (deep below original baseline) within 15 mins.",
      crashSr: "📉 Krah: Pad na 40% (daleko ispod baze) već nakon 15 minuta.",
      neuroEn:
        "Neurology: Consuming continuous content with no cognitive physical effort induces immediate prefrontal shutdown. Recurrent loops trigger chronic brain fog, anhedonia, and profound resistance to subsequent real-world challenges.",
      neuroSr:
        "Neuorologija: Neprekidno unošenje dinamičnih stimulansa bez ikakvog kognitivnog napora gasi prefrontalni korteks. Česti ciklusi uzrokuju hroničnu maglu u glavi, apatiju i težak otpor prema učenju.",
      color: "text-[#FF3B30]",
      glowBg: "rgba(255, 59, 48, 0.1)",
      heightRatio: "40%",
    },
    cold: {
      titleEn: "Cold Shower / Ice Bath exposure",
      titleSr: "Izlaganje hladnoj vodi (Hladan tuš)",
      peakEn:
        "⚡ Peak: Slowly rises to +250% over 60 mins. Elevated for 4+ hours.",
      peakSr:
        "⚡ Pik: Postepen, zdrav rast do +250% tokom sat vremena. Traje preko 4 sata.",
      crashEn:
        "🛡️ Crash: Absolute zero crash. Safely glides back to 110% baseline.",
      crashSr:
        "🛡️ Krah: Nema hroničnog pada. Lagano se vraća na osveženih 110% baze.",
      neuroEn:
        "Neurology: Voluntary cold exposure forces sustained norepinephrine co-release. Because it demands conscious metabolic and cognitive willpower to withstand, the brain builds durable baseline resilience and sharp clarity.",
      neuroSr:
        "Neurologija: Voljni ulazak u hladnoću aktivira oslobađanje noradrenalina. Pošto zahteva svesni metabolički napor i volju da se izdrži, mozak izgrađuje izuzetnu oštrinu i čistu pažnju bez povratnog pada.",
      color: "text-[#007AFF] dark:text-[#0A84FF]",
      glowBg: "rgba(0, 122, 255, 0.1)",
      heightRatio: "90%",
    },
    gaming: {
      titleEn: "Hyper-Stimulated Video Gaming",
      titleSr: "Video igre visoke stimulacije",
      peakEn: "⚡ Spike: Up to +300% levels during heavy fast feedback cycles.",
      peakSr:
        "⚡ Pik: Ekstreman skok do +300% tokom brze akcije i instant nagrada.",
      crashEn:
        "📉 Crash: Drops to 30%, causing intense post-gaming irritability.",
      crashSr:
        "📉 Krah: Pad do 30% baze, uzrokuje neuro-razdražljivost i umor.",
      neuroEn:
        "Neurology: Continuous multimedia achievement metrics exhaust synaptic reserves. When you unplug, real-life tasks (reading, organizing) lack the feedback density, rendering them deeply listless.",
      neuroSr:
        "Neurologija: Neprekidne animacije i instant metričke nagrade iscrpljuju slobodne neurotransmitere. Kada isključiš igru, stvarni ciljevi gube svaku draž i mozak ih odbacuje kao dosadne.",
      color: "text-[#AF52DE] dark:text-[#BF5AF2]",
      glowBg: "rgba(175, 82, 222, 0.1)",
      heightRatio: "30%",
    },
    focus: {
      titleEn: "90-Min Focused Deep Work Block",
      titleSr: "Blok dubokog fokusa (Pomodoro)",
      peakEn:
        "⚡ Peak: Sustained linear rise to +150% plateauing at active levels.",
      peakSr: "⚡ Pik: Prirodno uzdizanje na +150% stabilne energije i fokusa.",
      crashEn:
        "🌱 Crash: Zero crash. Establishes a higher, cleaner baseline of 115%.",
      crashSr:
        "🌱 Krah: Nema kraha. Ostavlja osveženu bazu na zdravih 115% nakon cilja.",
      neuroEn:
        "Neurology: Overcoming the initial 15-minute cognitive resistance (the 'friction phase') triggers neurochemical adaptation. This strengthens your frontal lobes, making future focus blocks much easier to initialize.",
      neuroSr:
        "Neurologija: Prevazilaženje prvih 10-15 minuta otpora i nelagode ('kognitivno trenje') adaptira receptore. To zida čvršću neuronsku mrežu, čineći sledeći rad lakšim za start.",
      color: "text-[#34C759]",
      glowBg: "rgba(52, 199, 89, 0.1)",
      heightRatio: "70%",
    },
  };

  const mechanics = [
    {
      icon: "⚖️",
      titleEn: "The Dopamine Seesaw (Baselines vs Peaks)",
      titleSr: "Klackalica Dopamina (Baza i Pikovi)",
      descEn:
        "Every high spike in dopamine triggers a defense mechanism. The brain matches the spike by dropping your baseline BELOW normal levels, causing immediate drop in motivation and mood.",
      descSr:
        "Svaki nagli skok dopamina (kroz lako dostupne nagrade) pokreće snažan neurohemijski odbrambeni mehanizam. Mozak kompenzuje taj pik tako što nakon njega obara tvoju bazičnu liniju (baseline) znatno ISPOD normalnog nivoa. Ovaj pad stvara osećaj praznine, naglog umora i gubitka volje za običnim, težim radom.",
    },
    {
      icon: "🥶",
      titleEn: "Micro-Adversity & Dopamine Floors",
      titleSr: "Mikro-otpor i dugotrajni Dopamin (Hladnoća)",
      descEn:
        "Voluntary micro-pain (like a cold shower or hard exercise) works in reverse. The brain registers the physical stress and releases a slow, prolonged wave of dopamine (up to 250% above baseline) that lasts for hours.",
      descSr:
        "Namerno izlaganje nelagodi (hladan tuš od 1-3 minuta, intenzivan kardio trening) radi u potpunosti suprotno. Mozak beleži kognitivni ili fizički otpor i kao nagradu oslobađa spor, ujednačen i izuzetno stabilan talas dopamina (do 250% preko baze) koji traje i po nekoliko sati bez naknadnog 'kraha'.",
    },
    {
      icon: "🧠",
      titleEn: "PFC Paralysis & Tab-Switch Resistance",
      titleSr: "Paraliza PFC-a i Kognitivni Beg",
      descEn:
        "Deep concentration demands effort and releases minor stress signals. Escaping to check a tab, notification, or mail is an automatic survival reaction to relieve this cognitive friction.",
      descSr:
        "Duboka koncentracija (Top-Down Attention) je energetski ekstremno zahtevna za prefrontalni korteks (PFC). Kada osetiš pad pažnje, mozak automatski prepoznaje nelagodu i instinktivno traži brz i jeftin beg u lakšu aktivnost (skrol, provera mejla, otvaranje novog taba) kao vrstu preživljavanja. Prepoznavanje i svesno trpljenje tog refleksa u prvih 5-10 minuta je ključ postizanja 'Flow' stanja.",
    },
    {
      icon: "🔋",
      titleEn: "The Receptor Upregulation Protocol",
      titleSr: "Neuroplastičnost i Upregulacija",
      descEn:
        "Receptors become down-regulated when flooded with easy triggers. By enforcing short blocks of low stimulation, you trigger upregulation: receptors wake up and find joy in basic wins.",
      descSr:
        "Dopaminski receptori u mozgu fizički povlače svoje senzore (down-regulacija) kada su preplavljeni veštački izazvanim i snažnim stimulansima (društvene mreže, šećer, video igre). Ako im uskratiš te lake izvore kroz svesnu tišinu (detoks), dolazi do 'upregulacije': receptori izranjaju natrag i tvoj nervni sistem ponovo počinje da oseća prirodnu motivaciju, elan i zadovoljstvo za svakodnevni i dosadni rad.",
    },
    {
      icon: "⚡",
      titleEn: "Norepinephrine & Focus Friction Gate",
      titleSr: "Noradrenalin i Kapija Kognitivnog Trenja",
      descEn:
        "Concentration always begins with a period of physical and mental friction. If you abort during this initial 10-minute struggle, you forfeit the dopamine release that seals the focus loop.",
      descSr:
        "Svaki napor i pažnja uvek počinju fazom nervoze i pritiska — u tim trenucima telo pojačano luči neuromodulator noradrenalin da te biološki razbudi za izazov. Ako ne podneseš tu tenziju i odustaneš pre nego što prođe 10 do 15 minuta, u potpunosti gubiš nagradni talas dopamina koji cementira tvoj rad i uvodi te u stanje duboke usresređenosti.",
    },
    {
      icon: "👁️",
      titleEn: "Visual Focus & Ocular Fixation",
      titleSr: "Okularna Fiksacija Pokreće Um",
      descEn:
        "Your visual field drives cognitive focus. Staring narrowly at one spot for 60 seconds triggers epinephrine, forcing the brain into alertness. Wandering eyes lead to a wandering mind.",
      descSr:
        "Fokus ne dolazi samo iz svesti; on počinje u vizuelnom korteksu očiju. Svesno fiksiranje pogleda u jednu mikro-tačku na zidu ili ekranu od 60 sekundi aktivira nervne krugove koji direktno ubrizgavaju epinefrin (adrenalin) u tvoj nervni sistem, što biološki 'prisiljava' mozak na maksimalnu budnost pre nego što započneš kompleksan zadatak.",
    },
    {
      icon: "🧪",
      titleEn: "Dopamine Stacking Pitfall",
      titleSr: "Opasnost Dopaminskog Slaganja (Stacking)",
      descEn:
        "Combining too many highly stimulating activities at once creates an unsustainable mega-spike that makes normal life feel numb afterwards.",
      descSr:
        "Slušanje omiljenog hiper-stimulativnog podkasta, uz konzumaciju energetskog pića (kofeina) dok paralelno skroluješ mreže ili obavljaš brze zadatke. Ovo 'slaganje' (stacking) stvara masivan sintetički talas dopamina. Jednom kada prestaneš, pad u raspoloženju je toliko oštar da ti svaki običan trenutak ostatka dana deluje turobno, dosadno i besmisleno.",
    },
    {
      icon: "☀️",
      titleEn: "Circadian Cortisol & Morning Dopamine",
      titleSr: "Cirkadijalni Ritam i Jutarnji Fokus",
      descEn:
        "Sunlight exposure within 30 minutes of waking triggers a natural cortisol spike, optimizing your baseline dopamine and setting a biological timer for sleep later.",
      descSr:
        "Gledanje direktno u jarku (prirodnu) dnevnu svetlost u prvih 30 do 60 minuta nakon buđenja izaziva zdrav i prirodan skok kortizola. Ovaj skok budi tvoje telo, kalibriše bazični dopamin i epinefrin, a istovremeno navija unutrašnji neurološki sat (cirkadijalni ritam) da za 14-16 sati započne prirodno i zdravo lučenje melatonina za snažan noćni odmor.",
    },
  ];

  const resetDays = [
    {
      day: "1",
      titleEn: "Bed Unplug (Bedroom Friction)",
      titleSr: "Zabrana Ekranima u Krevetu",
      descEn:
        "Place all smart screens outside your bedroom 45 minutes before sleep. Read an analog physical book.",
      descSr:
        "Izbaci sve telefone, laptopove i ekrane iz spavaće sobe tačno 45 minuta pre odlaska na spavanje. Njihovo plavo svetlo lažno zavarava tvoj cirkadijalni ritam, potiskuje hormon spavanja melatonin i razbija kvalitet dubokog (REM) odmora. Ponesi fizičku (analognu) knjigu sa sobom.",
    },
    {
      day: "2",
      titleEn: "Caffeine Delay (Adenosine Clear)",
      titleSr: "Odgoda Kofeina 90-120 minuta",
      descEn:
        "Wait at least 90 minutes after waking before your first coffee. Let adenosine clear naturally.",
      descSr:
        "Sačekaj najmanje 90 do 120 minuta nakon buđenja pre nego što popiješ svoju prvu jutarnju kafu. Ostavljajući vremena tvom prirodnom mehanizmu buđenja da mehanički eliminiše tragove molekula adenozina (hormona umora), izbegavaš onaj neizbežni popodnevni krah i pad elana.",
    },
    {
      day: "3",
      titleEn: "Analog Walking (Optic Flow)",
      titleSr: "Optički Tok i Tiha Šetnja",
      descEn:
        "Walk 25 minutes with zero screens or headphones. Let horizontal eye movements quiet the amygdala.",
      descSr:
        "Izađi napolje i šetaj 25 minuta bez slušalica u ušima, pametnog sata i ekrana. Prirodno kretanje unapred stvara 'optički tok' (horizontalna pomeranja očiju sa jedne na drugu stranu) što naučno smiruje amigdalu, neutrališe akutni stres i regeneriše kapacitet pažnje.",
    },
    {
      day: "4",
      titleEn: "The 10-Min Stare Rule (Resisting Flight)",
      titleSr: "Pravilo 10-Minutnog Kognitivnog Otpora",
      descEn:
        "If task is hard, sit silently and stare at your hands or the target. Do not switch tabs. The itch will vanish.",
      descSr:
        "Kada sedneš da radiš i osetiš intenzivan strah ili otpor prema obavezi, samo nastavi da sediš u apsolutnoj tišini. Ne menjaj stranu, ne otvaraj Instagram, ne puštaj pesmu. Izdrži dosadu; kognitivni otpor je samo nalet noradrenalina i skoro uvek prođe u prvih 10 do maksimalno 15 minuta pritiska.",
    },
    {
      day: "5",
      titleEn: "Silent Chores (Analog Grounding)",
      titleSr: "Upregulacija uz Tihe Poslove",
      descEn:
        "Wash dishes, clean room, or cook in complete silence. Allows receptors to upregulate.",
      descSr:
        "Spremi radni sto, složi knjige, operi suđe ili usisavaj sobu, ali isključivo u potpunoj tišini. Bez YouTube videa, bez muzike ili podkasta u pozadini. Uskraćivanjem hiper-stimulansa tokom rutinskog zadatka, vršiš najjaču 'upregulaciju' i dozvoljavaš iscrpljenim dopaminskim receptorima da ponovo ožive i isplivaju.",
    },
    {
      day: "6",
      titleEn: "Mono-focus Lock (Single Tab)",
      titleSr: "Gvozdeni Mono-Fokus (Jedna Kartica)",
      descEn:
        "Enforce a single active browser window for exactly 30 minutes. Strict mono-tasking practice.",
      descSr:
        "Zatvori bukvalno sve ostale kartice (tabs), programe i obaveštenja na računaru i telefonu. Zadrži otvoren samo jedan jedini radni prozor na celom ekranu i posveti mu se tokom neprekidnih 30 minuta. Mozak ne može da vrši multitasking, već samo mikrosekundno 'prebacuje' pažnju i time spaljuje energiju. Ovaj korak vraća svesnu kontrolu duboke pažnje.",
    },
    {
      day: "7",
      titleEn: "Savor Meal Offline (Prevent Saturate)",
      titleSr: "Oflajn Svesni Obrok",
      descEn:
        "Eat lunch or dinner fully offline. Focus on texture, chewing, and smell.",
      descSr:
        "Pojedi barem jedan pun obrok danas u popodnevnim satima potpuno oflajn. Fokusiraj se svesno na teksturu hrane, svaki zaseban zalogaj, žvakanje i mirise, apsolutno bez gledanja u ekran i stimulacija sa strane. Ovo smiruje nervni sistem i obara pritisak ubrzanog načina života pred veče.",
    },
  ];

  const focusScore = calculateFocusScore();
  const verdict = getScoreVerdict(focusScore);

  return (
    <div className="space-y-6 pb-12 font-sans text-left">
      {/* HEADER */}
      <div className="px-2 mb-2 mt-4">
        <h3 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-1.5">
          {isEn ? "Neurobiology & Dopamine Lab" : language === "tr" ? "Nörobiyoloji ve Dopamin Laboratuvarı" : "Laboratorija Uma i Dopamina"}
        </h3>
        <p className="text-[14px] leading-relaxed font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60">
          {isEn ? "Inspect neural pathways, audit your current receptors, and install biological protocols." : language === "tr" ? "Sinir yollarını inceleyin, mevcut reseptörlerinizi denetleyin ve biyolojik protokoller kurun." : "Istraži neuronske mehanizme, proceni stanje svojih receptora i implementiraj biološke protokole."}
        </p>
      </div>

      {/* APPLE HIG SEGMENTED CONTROL */}
      <div className="px-2">
        <div className="p-1 rounded-xl bg-[#E5E5EA] dark:bg-[#1C1C1E] flex gap-1">
          {[
            { id: "simulator", label: isEn ? "🔬 Simulator" : language === "tr" ? "🔬 Simülatör" : "🔬 Simulator" },
            {
              id: "test",
              label: isEn ? "📊 Brain Audit" : language === "tr" ? "📊 Beyin Denetimi" : "📊 Test Receptora",
            },
            { id: "laws", label: isEn ? "🧠 Laws" : language === "tr" ? "🧠 Kanunlar" : "🧠 Zakoni Uma" },
            { id: "reset", label: isEn ? "🔄 Reset" : language === "tr" ? "🔄 Sıfırla" : "🔄 Nedeljni Reset" },
          ].map((tab) => {
            const isActive = eduSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEduSubTab(tab.id as any)}
                className={`flex-1 text-center py-2 text-xs sm:text-[13px] font-bold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm"
                    : "text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER DYNAMIC SUB-TABS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={eduSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="px-2"
        >
          {/* TAB 1: INTERACTIVE SIMULATOR */}
          {eduSubTab === "simulator" && (
            <div className="space-y-6">
              {/* Simulator Selector */}
              <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF] block mb-2">
                  {isEn ? "Select Behavior Curve" : language === "tr" ? "Davranış Eğrisi Seçin" : "Izaberi krivu neuro-ekscitacije"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["scrolling", "cold", "gaming", "focus"] as const).map(
                    (act) => {
                      const isActive = selectedSimActivity === act;
                      return (
                        <button
                          key={act}
                          onClick={() => setSelectedSimActivity(act)}
                          className={`py-2 px-3 rounded-xl text-left font-bold text-xs sm:text-[13px] flex items-center gap-2 border transition-all cursor-pointer ${
                            isActive
                              ? "bg-white dark:bg-[#1C1C1E] text-black dark:text-white border-black/10 dark:border-white/10 shadow-sm"
                              : "bg-[#E5E5EA] dark:bg-[#2C2C2E]/40 dark:bg-[#000000]/10 text-[#8E8E93] dark:text-[#EBEBF5]/60 border-transparent"
                          }`}
                        >
                          <span className="text-base">
                            {act === "scrolling"
                              ? "📱"
                              : act === "cold"
                                ? "🧊"
                                : act === "gaming"
                                  ? "🎮"
                                  : "⏱️"}
                          </span>
                          {act === "scrolling"
                            ? isEn ? "Scroll" : language === "tr" ? "Taslak" : "Skrolovanje"
                            : act === "cold"
                              ? isEn ? "Cold shock" : language === "tr" ? "Soğuk şok" : "Hladan tuš"
                              : act === "gaming"
                                ? isEn ? "Gaming" : language === "tr" ? "Oyun" : "Igre"
                                : isEn ? "Deep Work" : language === "tr" ? "Derin Çalışma" : "Dubok rad"}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Dynamic Behavioral Output Card */}
              {(() => {
                const activeData = simData[selectedSimActivity];
                return (
                  <div className="p-6 border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] rounded-3xl flex flex-col gap-5 shadow-sm relative overflow-hidden">
                    {/* Background glow visual based on selection */}
                    <div
                      className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl transition-all"
                      style={{ backgroundColor: activeData.glowBg }}
                    />

                    <div className="flex items-start gap-4 z-10">
                      <div className="w-12 h-12 rounded-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-2xl shrink-0">
                        {selectedSimActivity === "scrolling"
                          ? "📱"
                          : selectedSimActivity === "cold"
                            ? "🧊"
                            : selectedSimActivity === "gaming"
                              ? "🎮"
                              : "⏱️"}
                      </div>
                      <div>
                        <h4 className="font-bold text-base sm:text-lg text-black dark:text-white leading-tight">
                          {isEn ? activeData.titleEn : activeData.titleSr}
                        </h4>
                        <span className="text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-bold block mt-1">
                          {isEn ? "Interactive Neurological Impact" : language === "tr" ? "İnteraktif Nörolojik Etki" : "Interaktivni uticaj na mozak"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 py-2 text-[14px] leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium z-10">
                      <p>{isEn ? activeData.neuroEn : activeData.neuroSr}</p>
                    </div>

                    {/* Simulation Graph Mock Indicator */}
                    <div className="py-4 border-t border-black/5 dark:border-white/10 z-10">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold text-[#8E8E93] dark:text-[#EBEBF5]/60 mb-3">
                        <span>
                          {isEn ? "Dopamine Amplitude" : language === "tr" ? "Dopamin Genliği" : "Amplituda Dopamina"}
                        </span>
                        <span>
                          {isEn ? "Time Duration" : language === "tr" ? "Zaman Süresi" : "Faza i oporavak"}
                        </span>
                      </div>
                      <div className="h-12 w-full bg-[#F2F2F7] dark:bg-[#000000]/20 rounded-xl relative overflow-hidden flex items-end px-4">
                        {/* Dynamic amplitude representation */}
                        <div
                          className="w-1/3 rounded-t-lg transition-all duration-300"
                          style={{
                            height: activeData.heightRatio,
                            backgroundColor:
                              selectedSimActivity === "scrolling" ||
                              selectedSimActivity === "gaming"
                                ? "#FF3B30"
                                : "#34C759",
                          }}
                        />
                        <div className="w-2/3 h-[2px] bg-black/10 dark:bg-white/10 relative bottom-0">
                          <div
                            className={`absolute left-0 top-[-3px] w-2 h-2 rounded-full ${selectedSimActivity === "focus" || selectedSimActivity === "cold" ? "bg-[#34C759]" : "bg-[#FF3B30]"}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-black/5 dark:border-white/5 z-10">
                      <div className="p-3 bg-[#F2F2F7] dark:bg-[#1C1C1E]/50 dark:bg-[#2C2C2E]/40 rounded-xl">
                        <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase block">
                          {isEn ? "Peak Effect" : language === "tr" ? "Zirve Etkisi" : "Špica / Pik"}
                        </span>
                        <p
                          className={`text-[13px] font-bold mt-1 ${activeData.color}`}
                        >
                          {isEn ? activeData.peakEn : activeData.peakSr}
                        </p>
                      </div>
                      <div className="p-3 bg-[#F2F2F7] dark:bg-[#1C1C1E]/50 dark:bg-[#2C2C2E]/40 rounded-xl">
                        <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase block">
                          {isEn ? "Recovery / Crash" : language === "tr" ? "Kurtarma / Çökme" : "Krah / Oporavak"}
                        </span>
                        <p className="text-[13px] font-extrabold text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 pr-1">
                          {isEn ? activeData.crashEn : activeData.crashSr}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Contrast summary of novelty vs earned */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-[#FF3B30]/20 bg-[#FF3B30]/5 text-black dark:text-white rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center mb-3">
                      <Flame className="w-5 h-5 text-[#FF3B30]" />
                    </div>
                    <h5 className="font-bold text-[15px] text-[#FF3B30] mb-1">
                      {isEn ? "Unearned Cheap Novelty" : language === "tr" ? "Kazanılmamış Ucuz Yenilik" : "Zasićenje (Laka uzbuđenja)"}
                    </h5>
                    <p className="text-xs font-semibold leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {isEn ? "High spikes with zero metabolic/willpower effort. Drains reserves quickly, inducing dopamine baseline crash." : language === "tr" ? "Sıfır metabolik/irade çabasıyla yüksek ani artışlar. Rezervleri hızlı bir şekilde boşaltır ve dopaminin temel çöküşüne neden olur." : "Ekstremni skokovi bez kognitivnog rada. Iscrpljuju tvoju bazičnu motivaciju, ostavljajući te umornim."}
                    </p>
                  </div>
                </div>

                <div className="p-5 border border-[#34C759]/20 bg-[#34C759]/5 text-black dark:text-white rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center mb-3">
                      <Target className="w-5 h-5 text-[#34C759]" />
                    </div>
                    <h5 className="font-bold text-[15px] text-[#34C759] mb-1">
                      {isEn ? "Conscious Earned Reward" : language === "tr" ? "Bilinçli Kazanılan Ödül" : "Zasluženi neuro-rezultati"}
                    </h5>
                    <p className="text-xs font-semibold leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {isEn ? "Requires initial friction to trigger. Slow, sustainable climb that heals baseline and creates calm drive." : language === "tr" ? "Tetiklenmesi için ilk sürtünmeyi gerektirir. Taban çizgisini iyileştiren ve sakin bir sürüş yaratan yavaş, sürdürülebilir tırmanış." : "Zahteva prevazilaženje mentalnog otpora. Zida stabilan i zdrav rast, jačajući otpornost za sledeći korak."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE BRAIN AUDIT TEST */}
          {eduSubTab === "test" && (
            <div className="space-y-6">
              {/* Circular Score Result Indicator */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center gap-4 shadow-sm relative">
                <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
                  {isEn ? "Daily Dopamine Stability Index" : language === "tr" ? "Günlük Dopamin Stabilite İndeksi" : "Indeks stabilnosti dopaminske baze"}
                </span>

                {/* Circular ring style element */}
                <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-4 border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/10">
                  <div className="text-center">
                    <span className="text-xl text-[#3C3C43] font-extrabold text-black dark:text-white block tracking-tight">
                      {focusScore}
                    </span>
                    <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
                      / 100
                    </span>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-2xl max-w-md ${verdict.color}`}
                >
                  <h5 className="font-bold text-sm sm:text-base mb-1">
                    {verdict.title}
                  </h5>
                  <p className="text-xs sm:text-[13px] font-semibold leading-relaxed opacity-95">
                    {verdict.desc}
                  </p>
                </div>
              </div>

              {/* Assessment Habits checklist */}
              <div className="p-5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-3xl space-y-4">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-black dark:text-white">
                    {isEn ? "Audit Habits Table" : language === "tr" ? "Denetim Alışkanlıkları Tablosu" : "Tabela tvojih dnevnih navika"}
                  </h4>
                  <p className="text-xs font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-0.5">
                    {isEn ? "Check the habits you currently execute on a typical day:" : language === "tr" ? "Şu anda tipik bir günde yürüttüğünüz alışkanlıkları kontrol edin:" : "Onači navike koje trenutno primenjuješ tokom prosečnog dana:"}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: "morningScroll",
                      labelEn: "📱 Immediate Morning Scroll in bed",
                      labelSr: "📱 Skrolujem čim se probudim u krevetu",
                      bad: true,
                    },
                    {
                      id: "energyDrinks",
                      labelEn:
                        "🥤 Consume artificial energy cans/excessive sugar",
                      labelSr: "🥤 Pijem energetska pića ili puno šećera",
                      bad: true,
                    },
                    {
                      id: "multitasking",
                      labelEn:
                        "💻 Keep 12+ tabs open & listen/work at same time",
                      labelSr:
                        "💻 Radim multitasking (muzika, čatovi i rad zajedno)",
                      bad: true,
                    },
                    {
                      id: "lateScreen",
                      labelEn:
                        "🌙 Turn on back-lit devices in bed within 30m of sleep",
                      labelSr: "🌙 Gledam u sjajni ekran pre nego što zaspim",
                      bad: true,
                    },

                    {
                      id: "afternoonWalk",
                      labelEn:
                        "🌲 Take a natural walk without headphone inputs",
                      labelSr: "🌲 Šetam napolju bez slušalica i telefona",
                      bad: false,
                    },
                    {
                      id: "delayedCaffeine",
                      labelEn:
                        "☕ Delay first caffeine intake for 90-120 minutes",
                      labelSr: "☕ Odlažem prvu jutarnju kafu bar 90 minuta",
                      bad: false,
                    },
                    {
                      id: "deepBlocks",
                      labelEn:
                        "⏱️ Block 90-min singular task focus without checking mail",
                      labelSr:
                        "⏱️ Isključujem sve kartice tokom fokusiranog rada",
                      bad: false,
                    },
                    {
                      id: "sleepUnplug",
                      labelEn:
                        "🔌 Keep smart devices completely out of direct reach",
                      labelSr:
                        "🔌 Držim telefon dalje od kreveta u toku spavanja",
                      bad: false,
                    },
                  ].map((item) => {
                    const isChecked = eduHabits[item.id] || false;
                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          setEduHabits((prev) => ({
                            ...prev,
                            [item.id]: !isChecked,
                          }))
                        }
                        className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-left font-bold text-xs sm:text-[13px] border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-white dark:bg-[#1C1C1E] text-black dark:text-white border-black/10 dark:border-white/10 shadow-sm"
                            : "bg-white/40 dark:bg-[#000000]/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 border-transparent"
                        }`}
                      >
                        <span className="flex-1 pr-2">
                          {isEn ? item.labelEn : item.labelSr}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#007AFF] border-[#007AFF] text-white" : "border-[#8E8E93]/40"}`}
                        >
                          {isChecked && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THE LAWS */}
          {eduSubTab === "laws" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#E5E5EA] dark:bg-[#2C2C2E]/20 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span className="text-[11px] font-bold text-[#5E5CE6] uppercase tracking-wider block mb-1">
                  {isEn ? "Biological Mechanics" : language === "tr" ? "Biyolojik Mekanik" : "Neurobiološki principi u praksi"}
                </span>
                <p className="text-xs sm:text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed">
                  {isEn ? "Read detailed summaries of focus laws to restore baseline dopamine receptors. Upregulation is active!" : language === "tr" ? "Temel dopamin reseptörlerini yenilemek için odaklanma yasalarının ayrıntılı özetlerini okuyun. Düzenleme aktif!" : "Pročitaj detaljne preglede bioloških zakona rada i vrati osetljivost receptorima. Upregulacija je aktivan proces!"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mechanics.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] rounded-3xl text-left flex flex-col gap-2.5 shadow-sm"
                  >
                    <span className="text-xl text-[#3C3C43]">{item.icon}</span>
                    <h5 className="font-extrabold text-[15px] text-black dark:text-white leading-tight">
                      {isEn ? item.titleEn : item.titleSr}
                    </h5>
                    <p className="text-xs font-semibold leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {isEn ? item.descEn : item.descSr}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: 7-DAY RESET */}
          {eduSubTab === "reset" && (
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-black dark:text-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-[#FF9500]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-[#FF9500]">
                      {isEn ? "7-Day Reborn Protocol" : language === "tr" ? "7 Günlük Yeniden Doğuş Protokolü" : "7-Dnevni Reset Receptora"}
                    </h4>
                    <p className="text-xs sm:text-[13px] font-semibold leading-relaxed opacity-90 mt-1">
                      {isEn ? "Execute exactly one discipline step each day. After one week, your synaptic receptors will clear baseline mood and motivation blockers." : language === "tr" ? "Her gün tam olarak bir disiplin adımı uygulayın. Bir hafta sonra sinaptik reseptörleriniz temel ruh hali ve motivasyon engelleyicilerini temizleyecektir." : "Sprovedi strogo jednu disciplinu dnevno. Nakon nedelju dana, tvoji receptori će ponovo oživeti dajući ti elan i fokus."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {resetDays.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-3xl text-left relative overflow-hidden group flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#007AFF] opacity-40 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {d.day}
                      </div>
                      <div>
                        <h5 className="font-extrabold text-[14px] sm:text-[15px] text-black dark:text-white leading-tight">
                          {isEn ? d.titleEn : d.titleSr}
                        </h5>
                        <p className="text-xs sm:text-[13px] font-semibold leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1">
                          {isEn ? d.descEn : d.descSr}
                        </p>
                      </div>
                    </div>

                    {onAddTask && (
                      <button
                        onClick={() =>
                          onAddTask({
                            title: `(${d.day}/7) ${isEn ? d.titleEn : d.titleSr}`,
                            description: isEn ? d.descEn : d.descSr,
                            category: "A",
                            complexity: 3,
                            isTimebox: true,
                            timeLimit: 30,
                          })
                        }
                        className="py-2.5 px-3 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 shadow-sm rounded-xl text-xs font-bold text-[#007AFF] active:scale-95 transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
                      >
                        {isEn ? "+ Try Routine Today" : language === "tr" ? "+ Rutini Bugün Deneyin" : "+ Isprobaj danas"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
