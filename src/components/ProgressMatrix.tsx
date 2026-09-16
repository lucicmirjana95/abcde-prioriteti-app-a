import React, { useState, useEffect } from "react";
import {
  Flame,
  Check,
  Plus,
  Calendar,
  RotateCcw,
  Smile,
  Award,
  Compass,
  Sparkles,
  Users,
  Activity,
  HelpCircle,
  BookOpen,
  Trash2,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Save,
  Pencil,
  Repeat,
  Brain,
  Moon,
  Briefcase,
  Heart,
  Sprout,
  Bot,
  Library,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ZoomableCard from "./ZoomableCard";
import { AIRasterizedTask, Task } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { triggerDiscoveryEvent } from "../lib/discoveryEngine";

interface ProgressMatrixProps {
  tasks?: Task[];
  language: "en" | "sr" | "tr";
  isEvening?: boolean;
  onAddMultipleTasks?: (tasks: AIRasterizedTask[]) => void;
}

interface CustomHabit {
  id: string;
  name: string;
  twoMinVersion: string; // The 3rd Law: Make it Easy (downscaled to under 2 minutes)
  isTwoMinActive: boolean;
}

interface HabitStack {
  id: string;
  currentHabit: string;
  newHabit: string;
}

interface ImplementationIntention {
  id: string;
  behavior: string;
  time: string;
  location: string;
}

const BASE_MICROROUTINES = [
  {
    id: "rec_cold",
    nameEn: "Cold Shower or splash",
    nameSr: "Hladan tuš ili umivanje",
    nameTr: "Soğuk duş veya yüz yıkama",
    twoMinEn: "Splash freezing water on your face",
    twoMinSr: "Umij se ledenom vodom 15 sekundi",
    twoMinTr: "Yüzünüze 15 saniye buz gibi su çarpın",
    whyEn:
      "Cold exposure triggers a massive release of dopamine and norepinephrine, boosting alertness, sharpening cognitive focus, and activating brown adipose tissue for metabolic health.",
    whySr:
      "Izlaganje hladnoći dramatično oslobađa dopamin i noradrenalin, povećava budnost, izoštrava kognitivni fokus i aktivira metabolizam.",
    whyTr:
      "Soğuğa maruz kalmak, uyanıklığı artırarak, bilişsel odağı keskinleştirerek og metabolik sağlık için kahverengi yağ dokusunu aktive ederek devasa bir dopamin ve norepinefrin salınımını tetikler.",
    area: "Physiology / Fiziologija",
    areaLabelEn: "Physiology",
    areaLabelSr: "Fiziologija",
    areaLabelTr: "Fizyoloji",
  },
  {
    id: "rec_morning",
    nameEn: "No morning phone (45m)",
    nameSr: "Bez ekrana 45m ujutru",
    nameTr: "Sabahları 45dk ekransız",
    twoMinEn: "Place phone outside bedroom",
    twoMinSr: "Drži telefon van spavaće sobe",
    twoMinTr: "Telefonu yatak odasının dışında tutun",
    whyEn:
      "Avoiding early-morning digital inputs prevents immediate dopamine hijacking, protects your attention span from cognitive fragmentation, and keeps your brain in healthy alpha/theta states.",
    whySr:
      "Izbegavanje ekrana ujutru sprečava prevremenu okupaciju pažnje, štiti fokus od fragmentacije i održava prirodan rast kortizola i budnosti.",
    whyTr:
      "Sabah erken saatlerde dijital girdilerden kaçınmak, anında dopamin ele geçirilmesini önler, dikkat sürenizi bilişsel parçalanmadan korur ve beyninizi sağlıklı alfa/teta durumlarında tutar.",
    area: "Mental Focus / Mentalni Fokus",
    areaLabelEn: "Mental Focus",
    areaLabelSr: "Mentalni Fokus",
    areaLabelTr: "Zihinsel Odak",
  },
  {
    id: "rec_reading",
    nameEn: "Deep professional reading",
    nameSr: "Čitanje stručne literature",
    nameTr: "Derin profesyonel okuma",
    twoMinEn: "Read exactly one paragraph",
    twoMinSr: "Pročitaj tačno jedan pasus",
    twoMinTr: "Sadece bir paragraf okuyun",
    whyEn:
      "Engaging in slow, professional reading builds neuroplasticity, increases deep focus endurance, and builds high-leverage mental models for long-term career growth.",
    whySr:
      "Čitanje stručne literature razvija neuroplastičnost, uvećava kapacitet duboke pažnje i postepeno gradi modele znanja za profesionalni napredak.",
    whyTr:
      "Yavaş, profesyonel okumayla meşgul olmak nöroplastisiteyi oluşturur, derin odaklanma dayanıklılığını artırır ve uzun vadeli kariyer gelişimi için yüksek kaldıraçlı zihinsel modeller oluşturur.",
    area: "Environment / Radni Prostor",
    areaLabelEn: "Professional Growth",
    areaLabelSr: "Lični Razvoj",
    areaLabelTr: "Kişisel Gelişim",
  },
  {
    id: "rec_walk",
    nameEn: "Silent analog walk",
    nameSr: "Analogni odmor i šetnja",
    nameTr: "Sessiz analog yürüyüş",
    twoMinEn: "Walk outdoors for 2 minutes",
    twoMinSr: "Izađi na terasu 2 minuta",
    twoMinTr: "2 dakika boyunca dışarıda yürüyün",
    whyEn:
      "Optic flow (lateral visual movement) during walks naturally quiets the amygdala, lowers stress, and allows default mode network (DMN) integration for creative insights.",
    whySr:
      "Optički protok tokom šetnje prirodno smanjuje aktivnost amigdale, drastično snižava kortizol i oslobađa kreativni potencijal.",
    whyTr:
      "Yürüyüşler sırasındaki optik akış (yanal görsel hareket) doğal olarak amigdalayı susturur, stresi azaltır ve yaratıcı içgörüler için varsayılan mod ağının (DMN) bütünleşmesine olanak tanır.",
    area: "Recovery / Oporavak",
    areaLabelEn: "Recovery & Rest",
    areaLabelSr: "Oporavak i Odmor",
    areaLabelTr: "İyileşme ve Dinlenme",
  },
  {
    id: "rec_breath",
    nameEn: "Deep Conscious Breathing (5m)",
    nameSr: "Vežbe svesnog disanja (5m)",
    nameTr: "Derin Bilinçli Nefes (5dk)",
    twoMinEn: "Do 3 slow deep breaths right now",
    twoMinSr: "Udahnite duboko 3 puta odmah",
    twoMinTr: "Şu anda 3 yavaş derin nefes alın",
    whyEn:
      "Conscious breathing shifts the autonomic nervous system into parasympathetic dominance, lowers heart rate variability anomalies, and clarifies cognitive fatigue.",
    whySr:
      "Svesno disanje vraća autonomni nervni sistem u parasimpatički režim, smanjuje biohemijski stres i oslobađa od mentalnog umora.",
    whyTr:
      "Bilinçli nefes alma otonom sinir sistemini parasempatik baskınlığa kaydırır, kalp atış hızı değişkenliği anormalliklerini düşürür og bilişsel yorgunluğu netleştirir.",
    area: "Physiology / Fiziologija",
    areaLabelEn: "Breathing Physiology",
    areaLabelSr: "Fiziologija Disanja",
    areaLabelTr: "Nefes Fizyolojisi",
  },
  {
    id: "rec_desk",
    nameEn: "Daily Workspace Declutter",
    nameSr: "Sređivanje radnog stola",
    nameTr: "Günlük Çalışma Alanı Düzenlemesi",
    twoMinEn: "Throw away 1 trash piece / put cup away",
    twoMinSr: "Skloni 1 šolju ili baci papirić sa stola",
    twoMinTr: "Masadan 1 çöp atın / bardağı kaldırın",
    whyEn:
      "Physical order reduces external cognitive load, minimizing visual distractions and freeing up working memory for deep high-priority work.",
    whySr:
      "Sređivanje spoljašnjeg okruženja smanjuje kognitivno opterećenje mozga i oslobađa radnu memoriju za bitan rad.",
    whyTr:
      "Fiziksel düzen, dışsal bilişsel yükü azaltır, görsel dikkat dağıtıcı unsurları en aza indirir og derin yüksek öncelikli işler için çalışma belleğini serbest bırakır.",
    area: "Environment / Radni Prostor",
    areaLabelEn: "Environment Order",
    areaLabelSr: "Sređen Radni Prostor",
    areaLabelTr: "Çalışma Alanı Düzeni",
  },
  {
    id: "rec_squats",
    nameEn: "Core Strength Squats",
    nameSr: "Trening snage (brzi čučnjevi)",
    nameTr: "Güç Antrenmanı (Hızlı Çömelme)",
    twoMinEn: "Perform 1 single squat beside your chair",
    twoMinSr: "Uradi tačno 1 čučanj pored stolice",
    twoMinTr: "Sandalyenizin yanında 1 kez çömelin",
    whyEn:
      "Activating major muscle groups triggers nitric oxide release, moves lymphatic fluid, increases blood circulation to the brain, and enhances neurogenesis.",
    whySr:
      "Aktivacija velikih mišićnih grupa oslobađa azot-monoksid, pokreće limfni sistem podstičući bolju cirkulaciju krvi do mozga.",
    whyTr:
      "Ana kas gruplarını aktive etmek nitrik oksit salınımını tetikler, lenfatik sıvıyı hareket ettirir, beyne giden kan dolaşımını artırır og nörogenezi artırır.",
    area: "Physiology / Fiziologija",
    areaLabelEn: "Physical Performance",
    areaLabelSr: "Fizičke Performanse",
    areaLabelTr: "Fiziksel Performans",
  },
  {
    id: "rec_detox",
    nameEn: "Evening Device Shutdown",
    nameSr: "Gašenje ekrana pre spavanja",
    nameTr: "Uyumadan önce ekran kapatma",
    twoMinEn: "Put phone in a drawer 30m before bed",
    twoMinSr: "Skloni telefon u drugu prostoriju",
    twoMinTr: "Yatmadan 30 dk önce telefonu çekmeceye koyun",
    whyEn:
      "Suppressing blue light before bed allows natural melatonin secretion, preventing phase-shifting of your circadian rhythm for deeper REM and slow-wave sleep.",
    whySr:
      "Sprečavanje plave svetlosti omogućava nesmetano lučenje melatonina za dublju regeneraciju ćelija i bolji odmor.",
    whyTr:
      "Yatmadan önce mavi ışığı bastırmak, daha derin REM ve yavaş dalga uykusu için sirkadiyen ritminizin faz kaymasını önleyerek doğal melatonin salgılanmasına izin verir.",
    area: "Recovery / Oporavak",
    areaLabelEn: "Circadian Control",
    areaLabelSr: "Cirkadijalni Ritam",
    areaLabelTr: "Sirkadiyen Ritim",
  },
  {
    id: "rec_gratitude",
    nameEn: "Daily Gratitude Log",
    nameSr: "Kratak dnevnik zahvalnosti",
    nameTr: "Kısa şükran günlüğü",
    twoMinEn: "Write exactly 1 thing you are glad for",
    twoMinSr: "Zapiši 1 stvar na kojoj si zahvalan",
    twoMinTr: "Memnun olduğunuz 1 şeyi yazın",
    whyEn:
      "Actively registering wins raises baseline serotonin, rewires the brain away from primitive negativity bias, and improves overall emotional resilience.",
    whySr:
      "Praksa zahvalnosti podiže bazni serotonin, preoblikuje neuronske obrasce i jača emocionalnu stabilnost pod stresom.",
    whyTr:
      "Kazanımları aktif olarak kaydetmek temel serotonini yükseltir, beyni ilkel olumsuzluk önyargısından uzaklaştırır og genel duygusal dayanıklılığı artırır.",
    area: "Mental Focus / Mentalni Fokus",
    areaLabelEn: "Emotional Resiliency",
    areaLabelSr: "Emotivna Stabilnost",
    areaLabelTr: "Duygusal Dayanıklılık",
  },
  {
    id: "rec_planning",
    nameEn: "Evening Planning for Tomorrow",
    nameSr: "Planiranje prioriteta za sutra",
    nameTr: "Yarın İçin Akşam Planlaması",
    twoMinEn: "List your single major goal for tomorrow",
    twoMinSr: "Zapiši samo 1 najvažniju stvar za sutra",
    twoMinTr: "Yarın için en önemli 1 hedefinizi yazın",
    whyEn:
      "Pre-planning mitigates the Zeigarnik effect (tension from unfinished tasks), allowing deeper cognitive relaxation and instant focus initiation tomorrow morning.",
    whySr:
      "Ranije definisanje cilja eliminiše Zeigarnikov efekat (tenziju od nezavršenih zadataka) i omogućava lakši jutarnji start bez odlaganja.",
    whyTr:
      "Önceden planlama yapmak, Zeigarnik etkisini (bitmemiş görevlerden kaynaklanan gerginlik) azaltarak, yarın sabah daha derin bilişsel rahatlama ve anında odaklanma başlangıcı sağlar.",
    area: "Mental Focus / Mentalni Fokus",
    areaLabelEn: "Cognitive Reduction",
    areaLabelSr: "Kognitivno Rasterećenje",
    areaLabelTr: "Bilişsel Rahatlama",
  },
  {
    id: "rec_expense",
    nameEn: "Expense Aware Habit",
    nameSr: "Svesni pregled finansija",
    nameTr: "Bilinçli finansal inceleme",
    twoMinEn: "Open banking app and spend 15s to check spending",
    twoMinSr: "Otvori račun i svesno osmotri poslednje troškove",
    twoMinTr:
      "Banka uygulamasını açın ve harcamaları kontrol etmek için 15sn ayırın",
    whyEn:
      "Confronting financial real-time status reduces avoidance anxiety, overrides credit illusion, waves off sub-conscious stress and triggers micro-budget corrections.",
    whySr:
      "Svesno suočavanje sa finansijama smanjuje anksioznost od izbegavanja, ruši iluzije lagodnosti i smanjuje nesvesni stres oko novca.",
    whyTr:
      "Finansal gerçek zamanlı durumla yüzleşmek, kaçınma kaygısını azaltır, kredi illüzyonunu geçersiz kılar, bilinçaltı stresi ortadan kaldırır og mikro bütçe düzeltmelerini tetikler.",
    area: "Finance / Finansije",
    areaLabelEn: "Finance Awareness",
    areaLabelSr: "Svesnost o Novcu",
    areaLabelTr: "Finansal Farkındalık",
  },
  {
    id: "rec_network",
    nameEn: "Two-Minute Relationship Builder",
    nameSr: "Mreža podrške za karijeru",
    nameTr: "İki Dakikalık İlişki Geliştirici",
    twoMinEn: "Send a genuine 'thank you' note to one contact",
    twoMinSr: "Pošalji brzu poruku zahvalnosti jednoj koleginici",
    twoMinTr: "Bir kişiye içten bir 'teşekkür' mesajı gönderin",
    whyEn:
      "Sustaining professional loose ties expands serendipitous career opportunities, builds social capital, and raises cooperative neural safety loops.",
    whySr:
      "Negovanje labavih profesionalnih veza otvara neplanirane poslovne prilike, gradi socijalni kapital i obezbeđuje podršku.",
    whyTr:
      "Gevşek profesyonel bağları sürdürmek, tesadüfi kariyer fırsatlarını genişletir, sosyal sermaye oluşturur og işbirlikçi sinirsel güvenlik döngülerini yükseltir.",
    area: "Finance / Finansije",
    areaLabelEn: "Career Networks",
    areaLabelSr: "Karijerno umrežavanje",
    areaLabelTr: "Kariyer Ağı",
  },
  {
    id: "rec_family_call",
    nameEn: "Quick Voice Connection",
    nameSr: "Ekspresna bliskost sa najdražima",
    nameTr: "Hızlı Sesli Bağlantı",
    twoMinEn: "Send a 1-minute warm voice note",
    twoMinSr: "Pošalji toplu glasovnu poruku dragoj osobi",
    twoMinTr: "1 dakikalık sıcak bir sesli mesaj gönderin",
    whyEn:
      "Hearing tone of voice triggers natural oxytocin release for both sides, down-regulating nervous system hyper-arousal and mitigating isolation.",
    whySr:
      "Slušanje glasa pokreće oslobađanje oksitocina kod obe strane, smanjuje napetost i učvršćuje osećaj pripadnosti.",
    whyTr:
      "Ses tonunu duymak, her iki taraf için de doğal oksitosin salınımını tetikler, sinir sistemindeki aşırı uyarılmayı azaltır og izolasyonu hafifletir.",
    area: "Social / Društvo",
    areaLabelEn: "Rich Attachment",
    areaLabelSr: "Duboka Bliskost",
    areaLabelTr: "Derin Yakınlık",
  },
  {
    id: "rec_compliment",
    nameEn: "The Hidden Gem Appreciation",
    nameSr: "Zapisivanje tuđih vrlina",
    nameTr: "Gizli Mücevher Takdiri",
    twoMinEn: "Write down 1 distinct moral quality of a peer",
    twoMinSr: "Zapiši jednu jedinstvenu vrlinu tebi bliske osobe",
    twoMinTr: "Birinin gözden kaçan bir özelliğine iltifat edin",
    whyEn:
      "Focusing on other's strengths builds default empathy patterns (MNS activation), reduces cognitive relational biases, and upgrades collective trust.",
    whySr:
      "Fokusiranje na vrline drugih stimuliše empatiju u ogledalnim neuronima, smanjuje predrasude i stvara duboko poverenje.",
    whyTr:
      "Davranışsal mikro onaylama uygulamak, grup içi psiko-sosyal güvenliği güçlendirir og aynalama yoluyla kendilik değerimizi pekiştirir.",
    area: "Social / Društvo",
    areaLabelEn: "Prosocial Brain",
    areaLabelSr: "Prososcijalni Um",
    areaLabelTr: "Sosyal Liderlik",
  },
  {
    id: "rec_water",
    nameEn: "Morning Warm Water Hydration",
    nameSr: "Jutarnja topla voda s limunom",
    nameTr: "Sabah Sıcak Limonlu Su",
    twoMinEn: "Pre-fill a water glass on nightstand",
    twoMinSr: "Popij punu čašu mlake vode čim ustaneš",
    twoMinTr: "Kahveden önce bir bardak su için",
    whyEn:
      "Rehydrating immediately post-sleep restores optimal blood viscosity, facilitates cerebral lymphatic drainage, and kicks off kidney optimization.",
    whySr:
      "Rehidratacija odmah nakon buđenja smanjuje viskoznost krvi, ubrzava drenažu toksina iz mozga i aktivira bubrege.",
    whyTr:
      "Hafif alkali su, gece boyunca oluşan hücresel metabolik atıkları temizler, uyku sonrası susuzluğu giderir og sabahları kahve uyarımından önce bağırsak hareketliliğini başlatır.",
    area: "Health / Ishrana",
    areaLabelEn: "Cellular Hydration",
    areaLabelSr: "Ćelijska Hidratacija",
    areaLabelTr: "Metabolik Temizlik",
  },
  {
    id: "rec_sunlight",
    nameEn: "Cortisol-Melatonin Sunlight Hack",
    nameSr: "Podešavanje biološkog sata",
    nameTr: "Biyolojik Saat Ayarı",
    twoMinEn: "Step onto a balcony or window for 90s",
    twoMinSr: "Izađi na svetlost na 90 sekundi",
    twoMinTr: "Uyandıktan sonra balkonda 2 dakika geçirin",
    whyEn:
      "Direct sunlight onto retinal ganglion cells triggers morning cortisol release (waking up) and sets an exact 16-hour countdown for natural melatonin secretion.",
    whySr:
      "Prirodna jutarnja svetlost direktno podešava cirkadijalni ritam, pojačava jutarnji kortizol i garantuje lučenje melatonina za lakši san.",
    whyTr:
      "Sabahın erken saatlerinde retinaya gelen lüks ışık, sirkadiyen saati kesin olarak sıfırlar, hemen kortizol üretimini durdurur og akşam yorgunluğunuzun temelini oluşturur.",
    area: "Health / Ishrana",
    areaLabelEn: "Circadian Reset",
    areaLabelSr: "Cirkadijalno podešavanje",
    areaLabelTr: "Sirkadiyen Sıfırlama",
  },
  {
    id: "rec_chewing",
    nameEn: "Mindful Salivary Digestion",
    nameSr: "Svesno žvakanje prvih zalogaja",
    nameTr: "Bilinçli çiğneme",
    twoMinEn: "Chew first 3 bites of breakfast 30 times each",
    twoMinSr: "Prva tri zalogaj doručka sažvaći po 30 puta",
    twoMinTr: "Yemeğin ilk 3 lokmasını 15 kez çiğneyin",
    whyEn:
      "Thorough chewing optimizes enzymatic amylase breakdown, signals early satiety receptors in the hypothalamus, and dampens cortisol-induced gut distress.",
    whySr:
      "Dugotrajno žvakanje aktivira enzime u pljuvački, optimalno signalizira sitost hipotalamusu i sprečava nadimanje creva pod stresom.",
    whyTr:
      "Özenli yeme ritmi parasempatik sindirim döngüsünü tetikler, mikro besin emilimini artırır og aşırı doyma anksiyetesini durdurur.",
    area: "Health / Ishrana",
    areaLabelEn: "Parasympathetic Digestion",
    areaLabelSr: "Parasimpatičko Varenje",
    areaLabelTr: "Sindirim Sağlığı",
  },
];

export default function ProgressMatrix({
  tasks = [],
  language,
  isEvening = false,
  onAddMultipleTasks,
}: ProgressMatrixProps) {
  const isEn = language === "en";

  const getLocalizedHabitName = (h: any) => {
    if (!h) return "";
    if (h.id === "priority_a") {
      return isEn
        ? "Complete Priority A1 Task"
        : language === "tr"
          ? "Öncelikli A1 Görevini Tamamlayın"
          : "Završen glavni A1 zadatak";
    }
    if (h.id === "balance_wheel") {
      return isEn
        ? "Review Life Balance"
        : language === "tr"
          ? "Yaşam Dengesini İnceleyin"
          : "Analiziraj balans (krug života)";
    }
    if (h.id === "eliminated_waste") {
      return isEn
        ? "Eliminate Category E Distractions"
        : language === "tr"
          ? "E Kategorisi Dikkat Dağınıklıklarını Ortadan Kaldırın"
          : "Izbegavanje E distrakcija i gubljenja vremena";
    }
    const matched = BASE_MICROROUTINES.find((item) => item.id === h.id);
    if (matched) {
      if (isEn) return matched.nameEn || h.name;
      if (language === "tr") return matched.nameTr || h.name;
      return matched.nameSr || h.name;
    }
    return h.name;
  };

  const getLocalizedHabitTwoMin = (h: any) => {
    if (!h) return "";
    if (h.id === "priority_a") {
      return isEn
        ? "Write down the single A1 task on a sticky note"
        : language === "tr"
          ? "Tek A1 görevini yapışkan nota yazın"
          : "Zapiši i izaberi glavni A1 zadatak na papiru";
    }
    if (h.id === "balance_wheel") {
      return isEn
        ? "Open the wheel chart for 30 seconds"
        : language === "tr"
          ? "Çark grafiğini 30 saniye boyunca açın"
          : "Pogledaj svoj krug života na 30 sekundi";
    }
    if (h.id === "eliminated_waste") {
      return isEn
        ? "Put phone in another room or block browser notifications"
        : language === "tr"
          ? "Telefonu başka bir odaya koyun veya tarayıcı bildirimlerini engelleyin"
          : "Skloni telefon u drugu sobu ili blokiraj notifikacije";
    }
    const matched = BASE_MICROROUTINES.find((item) => item.id === h.id);
    if (matched) {
      if (isEn) return matched.twoMinEn || h.twoMinVersion;
      if (language === "tr") return matched.twoMinTr || h.twoMinVersion;
      return matched.twoMinSr || h.twoMinVersion;
    }
    return h.twoMinVersion;
  };

  const getRoutineName = (routine: any) => {
    if (!routine) return "";
    if (isEn)
      return (
        routine.nameEn || routine.name || routine.nameSr || routine.nameTr || ""
      );
    if (language === "tr")
      return (
        routine.nameTr || routine.name || routine.nameEn || routine.nameSr || ""
      );
    return (
      routine.nameSr || routine.name || routine.nameEn || routine.nameTr || ""
    );
  };

  const getRoutineTwoMin = (routine: any) => {
    if (!routine) return "";
    if (isEn)
      return (
        routine.twoMinEn ||
        routine.twoMinVersion ||
        routine.twoMinSr ||
        routine.twoMinTr ||
        ""
      );
    if (language === "tr")
      return (
        routine.twoMinTr ||
        routine.twoMinVersion ||
        routine.twoMinEn ||
        routine.twoMinSr ||
        ""
      );
    return (
      routine.twoMinSr ||
      routine.twoMinVersion ||
      routine.twoMinEn ||
      routine.twoMinTr ||
      ""
    );
  };

  const getRoutineWhy = (routine: any) => {
    if (!routine) return "";
    if (isEn) return routine.whyEn || routine.whySr || routine.whyTr || "";
    if (language === "tr")
      return routine.whyTr || routine.whyEn || routine.whySr || "";
    return routine.whySr || routine.whyEn || routine.whyTr || "";
  };

  const getRoutineAreaLabel = (routine: any) => {
    if (!routine) return "";
    if (isEn) return routine.areaLabelEn || routine.area || "";
    if (language === "tr")
      return routine.areaLabelTr || routine.areaLabelEn || routine.area || "";
    return routine.areaLabelSr || routine.areaLabelEn || routine.area || "";
  };

  // Default core habits satisfying the 3rd Law (easy starting points)
  const defaultHabits: CustomHabit[] = [
    {
      id: "priority_a",
      name: isEn
        ? "Complete Priority A1 Task"
        : language === "tr"
          ? "Öncelikli A1 Görevini Tamamlayın"
          : "Završen glavni A1 zadatak",
      twoMinVersion: isEn
        ? "Write down the single A1 task on a sticky note"
        : language === "tr"
          ? "Tek A1 görevini yapışkan nota yazın"
          : "Zapiši i izaberi glavni A1 zadatak na papiru",
      isTwoMinActive: false,
    },
    {
      id: "balance_wheel",
      name: isEn
        ? "Review Life Balance"
        : language === "tr"
          ? "Yaşam Dengesini İnceleyin"
          : "Analiziraj balans (krug života)",
      twoMinVersion: isEn
        ? "Open the wheel chart for 30 seconds"
        : language === "tr"
          ? "Çark grafiğini 30 saniye boyunca açın"
          : "Pogledaj svoj krug života na 30 sekundi",
      isTwoMinActive: false,
    },
    {
      id: "eliminated_waste",
      name: isEn
        ? "Eliminate Category E Distractions"
        : language === "tr"
          ? "E Kategorisi Dikkat Dağınıklıklarını Ortadan Kaldırın"
          : "Izbegavanje E distrakcija i gubljenja vremena",
      twoMinVersion: isEn
        ? "Put phone in another room or block browser notifications"
        : language === "tr"
          ? "Telefonu başka bir odaya koyun veya tarayıcı bildirimlerini engelleyin"
          : "Skloni telefon u drugu sobu ili blokiraj notifikacije",
      isTwoMinActive: false,
    },
    {
      id: "hydration",
      name: isEn
        ? "Healthy Hydration (2+ Liters)"
        : language === "tr"
          ? "Sağlıklı Hidrasyon (2+ Litre)"
          : "Zdrava hidratacija (2l vode)",
      twoMinVersion: isEn
        ? "Drink one full glass of water right now"
        : language === "tr"
          ? "Hemen bir bardak su iç"
          : "Popij jednu čašu vode odmah",
      isTwoMinActive: false,
    },
    {
      id: "learning",
      name: isEn
        ? "Read Business/Philosophy Concept"
        : language === "tr"
          ? "İşletme/Felsefe Konseptini Okuyun"
          : "Čitanje biznis/filozofske literature",
      twoMinVersion: isEn
        ? "Read exactly one page of a book"
        : language === "tr"
          ? "Bir kitabın tam olarak bir sayfasını okuyun"
          : "Pročitaj tačno jednu stranicu knjige",
      isTwoMinActive: false,
    },
  ];

  // 1. Desired Identity State (Core Identity-Based Habit check)
  const [identity, setIdentity] = useState<string>(() => {
    return (
      safeStorage.getItem("abcde_atomic_identity") ||
      (isEn
        ? "An extremely focused, high-performing entrepreneur"
        : language === "tr"
          ? "Son derece odaklanmış, yüksek performanslı bir girişimci"
          : "Maksimalno fokusiran preduzetnik koji ceni balans")
    );
  });

  // 2. Habits State
  const [habits, setHabits] = useState<CustomHabit[]>(() => {
    try {
      const saved = safeStorage.getItem("abcde_calendar_habits");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitTwoMin, setNewHabitTwoMin] = useState("");

  // 3. Habit Stacks State - "Nakon što [X], uradiću [Y]"
  const [habitStacks, setHabitStacks] = useState<HabitStack[]>(() => {
    try {
      const saved = safeStorage.getItem("abcde_atomic_stacks");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "stack-default-1",
        currentHabit: isEn
          ? "I close my morning tea/coffee cup"
          : language === "tr"
            ? "Sabah çay/kahve fincanımı kapatıyorum"
            : "Nakon što skuvam jutarnju kafu/čaj",
        newHabit: isEn
          ? "I will look at my high-tier priority board to set A1"
          : language === "tr"
            ? "A1'i ayarlamak için yüksek seviye öncelikli kartıma bakacağım"
            : "ja ću odmah otvoriti svoju ABCDE matricu i rešiti A1 zadatak",
      },
    ];
  });
  const [stackCurrent, setStackCurrent] = useState("");
  const [stackNew, setStackNew] = useState("");

  // 4. Implementation Intentions - "Uradiću [X] u [Y] na lokaciji [Z]"
  const [intentions, setIntentions] = useState<ImplementationIntention[]>(
    () => {
      try {
        const saved = safeStorage.getItem("abcde_atomic_intentions");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return [
        {
          id: "intent-default-1",
          behavior: isEn
            ? "do 10 deep breathing cycles"
            : language === "tr"
              ? "10 derin nefes döngüsü yapın"
              : "uraditi 5 minuta duboke meditacije u miru za bistrinu uma",
          time: "08:15 AM",
          location: isEn
            ? "at my office desk"
            : language === "tr"
              ? "ofis masamda"
              : "na mojoj radnoj stolici u sobi",
        },
      ];
    },
  );
  const [intentBehavior, setIntentBehavior] = useState("");
  const [intentTime, setIntentTime] = useState("");
  const [intentLocation, setIntentLocation] = useState("");

  // States for interactive recommended routines slider and category selection
  const [recActiveIndex, setRecActiveIndex] = useState(0);
  const [recActiveArea, setRecActiveArea] = useState<string>("All");
  const [zoomedRoutineIndex, setZoomedRoutineIndex] = useState<number | null>(
    null,
  );
  const [explainedRoutineId, setExplainedRoutineId] = useState<string | null>(
    null,
  );
  const [loadingIdentityHabits, setLoadingIdentityHabits] = useState(false);
  const [recommendedHabits, setRecommendedHabits] = useState<any[]>([]);

  // Editing state for recommended habits
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTwoMin, setEditingTwoMin] = useState("");

  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [activeEditName, setActiveEditName] = useState("");
  const [activeEditTwoMin, setActiveEditTwoMin] = useState("");

  const startActiveEdit = (h: any) => {
    setActiveEditId(h.id);
    setActiveEditName(h.name);
    setActiveEditTwoMin(h.twoMinVersion);
  };

  const saveActiveEdit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              name: activeEditName || h.name,
              twoMinVersion: activeEditTwoMin || h.twoMinVersion,
            }
          : h,
      ),
    );
    setActiveEditId(null);
  };

  const startEditingHabit = (id: string, name: string, twoMin: string) => {
    setEditingHabitId(id);
    setEditingName(name);
    setEditingTwoMin(twoMin);
  };

  const saveEditingHabit = (id: string) => {
    if (!editingName.trim()) return;
    setRecommendedHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              name: editingName.trim(),
              twoMinVersion: editingTwoMin.trim(),
            }
          : h,
      ),
    );
    setEditingHabitId(null);
  };

  const toggleRecommendedHabit = (id: string) => {
    setRecommendedHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h)),
    );
  };

  const handleAddSelectedHabits = () => {
    const selected = recommendedHabits.filter((h) => h.selected);
    if (selected.length === 0) {
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: isEn
              ? "Please select at least one habit to adopt!"
              : language === "tr"
                ? "Lütfen benimseyeceğiniz en az bir alışkanlık seçin!"
                : "Molim vas izaberite bar jednu naviku za uvoz!",
            type: "warning",
          },
        }),
      );
      return;
    }

    setHabits((prev) => {
      // Avoid duplicate names if they are already in the list
      const filteredSelected = selected.filter(
        (sh) =>
          !prev.some((h) => h.name.toLowerCase() === sh.name.toLowerCase()),
      );

      if (filteredSelected.length === 0) {
        window.dispatchEvent(
          new CustomEvent("trigger-toast", {
            detail: {
              message: isEn
                ? "All selected habits are already active!"
                : language === "tr"
                  ? "Seçilen tüm alışkanlıklar zaten aktif!"
                  : "Sve izabrane navike su već aktivne!",
              type: "info",
            },
          }),
        );
        return prev;
      }

      const newHabits = filteredSelected.map((sh) => ({
        id: sh.id,
        name: sh.name,
        twoMinVersion: sh.twoMinVersion,
        isTwoMinActive: false,
      }));
      const updated = [...prev, ...newHabits];
      safeStorage.setItem("abcde_calendar_habits", JSON.stringify(updated));
      return updated;
    });

    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn
            ? `Successfully added ${selected.length} habit(s) to your daily routines!`
            : language === "tr"
              ? `${selected.length} alışkanlığı günlük rutinlerinize başarıyla eklediniz!`
              : `Uspešno dodato ${selected.length} navika u vaše dnevne rutine!`,
          type: "success",
        },
      }),
    );

    setRecommendedHabits([]);
    window.dispatchEvent(new Event("storage_sync"));
  };

  const handleAddSelectedToTasks = () => {
    const selected = recommendedHabits.filter((h) => h.selected);
    if (selected.length === 0) {
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: isEn
              ? "Please select at least one micro-habit to add to your daily tasks!"
              : language === "tr"
                ? "Lütfen günlük görevlerinize eklemek için en az bir mikro alışkanlık seçin!"
                : "Molim vas izaberite bar jednu mikro-naviku za uvoz u krug zadataka!",
            type: "warning",
          },
        }),
      );
      return;
    }

    if (onAddMultipleTasks) {
      const formattedTasks = selected.map((sh) => {
        // Find matching routine to get its why (additional description)
        const matchedBase = BASE_MICROROUTINES.find(
          (b) =>
            b.id === sh.id ||
            b.nameEn === sh.name ||
            b.nameSr === sh.name ||
            b.nameTr === sh.name
        );
        let whyText = "";
        if (matchedBase) {
          whyText = isEn
            ? matchedBase.whyEn
            : language === "tr"
              ? matchedBase.whyTr
              : matchedBase.whySr;
        } else {
          try {
            const aiRecsStr = safeStorage.getItem("abcde_ai_recommended_habits");
            if (aiRecsStr) {
              const aiRecs = JSON.parse(aiRecsStr) || [];
              const matchedAi = aiRecs.find(
                (item: any) =>
                  item.id === sh.id ||
                  item.nameEn === sh.name ||
                  item.nameSr === sh.name ||
                  item.nameTr === sh.name ||
                  item.name === sh.name
              );
              if (matchedAi) {
                whyText = isEn
                  ? (matchedAi.whyEn || matchedAi.why)
                  : language === "tr"
                    ? (matchedAi.whyTr || matchedAi.why)
                    : (matchedAi.whySr || matchedAi.why || matchedAi.description);
              }
            }
          } catch (e) {}
        }

        const labelPrefix = isEn
          ? "Micro-routine:"
          : language === "tr"
            ? "Mikro rutin:"
            : "Mikrorutina:";
        const descPrefix = isEn
          ? "Why / Science:"
          : language === "tr"
            ? "Neden / Bilim:"
            : "Zašto / Nauka:";

        const additionalNotes = whyText
          ? `${labelPrefix} ${sh.twoMinVersion}\n\n${descPrefix} ${whyText}`
          : `${labelPrefix} ${sh.twoMinVersion}`;

        return {
          title: sh.name,
          description: additionalNotes,
          category: "B" as const, // Highly important category B tasks
          subPriority: 1,
          explanation: isEn
            ? `Micro-routine to build core identity: "${identity}"`
            : language === "tr"
              ? `Temel kimlik oluşturmak için mikro rutin: "${identity}"`
              : `Mikro-rutina dizajnirana za izgradnju identiteta: "${identity}"`,
          isHabit: true,
          habitId: sh.id,
        };
      });

      onAddMultipleTasks(formattedTasks);
      setRecommendedHabits([]);
    } else {
      // Direct local storage injection logic if prop is missing, which guarantees absolute safety
      try {
        const boardId = new URLSearchParams(window.location.search).get(
          "board",
        );
        const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
        let currentTasks = JSON.parse(safeStorage.getItem(key) || "[]");
        if (!Array.isArray(currentTasks)) currentTasks = [];

        const newTasks = selected.map((sh) => {
          const matchedBase = BASE_MICROROUTINES.find(
            (b) =>
              b.id === sh.id ||
              b.nameEn === sh.name ||
              b.nameSr === sh.name ||
              b.nameTr === sh.name
          );
          let whyText = "";
          if (matchedBase) {
            whyText = isEn
              ? matchedBase.whyEn
              : language === "tr"
                ? matchedBase.whyTr
                : matchedBase.whySr;
          } else {
            try {
              const aiRecsStr = safeStorage.getItem("abcde_ai_recommended_habits");
              if (aiRecsStr) {
                const aiRecs = JSON.parse(aiRecsStr) || [];
                const matchedAi = aiRecs.find(
                  (item: any) =>
                    item.id === sh.id ||
                    item.nameEn === sh.name ||
                    item.nameSr === sh.name ||
                    item.nameTr === sh.name ||
                    item.name === sh.name
                );
                if (matchedAi) {
                  whyText = isEn
                    ? (matchedAi.whyEn || matchedAi.why)
                    : language === "tr"
                      ? (matchedAi.whyTr || matchedAi.why)
                      : (matchedAi.whySr || matchedAi.why || matchedAi.description);
                }
              }
            } catch (e) {}
          }

          const labelPrefix = isEn
            ? "Micro-routine:"
            : language === "tr"
              ? "Mikro rutin:"
              : "Mikrorutina:";
          const descPrefix = isEn
            ? "Why / Science:"
            : language === "tr"
              ? "Neden / Bilim:"
              : "Zašto / Nauka:";

          const additionalNotes = whyText
            ? `${labelPrefix} ${sh.twoMinVersion}\n\n${descPrefix} ${whyText}`
            : `${labelPrefix} ${sh.twoMinVersion}`;

          return {
            id:
              "task-habit-custom-" +
              Date.now() +
              "-" +
              Math.random().toString(36).slice(2, 6),
            title: `⚡ ${sh.name}`,
            description: additionalNotes,
            category: "B" as const,
            subPriority:
              currentTasks.filter((t: any) => t.category === "B").length + 1,
            done: false,
            createdTime: new Date().toISOString(),
            aiSuggested: true,
            aiExplanation: isEn
              ? `Micro-routine focused on identity development: "${identity}"`
              : language === "tr"
                ? `Kimlik geliştirmeye odaklanan mikro rutin: "${identity}"`
                : `Mikrorutina fokusirana na razvoj identiteta: "${identity}"`,
            isHabit: true,
            habitId: sh.id,
          };
        });

        const updated = [...currentTasks, ...newTasks];
        safeStorage.setItem(key, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage_sync"));

        window.dispatchEvent(
          new CustomEvent("trigger-toast", {
            detail: {
              message: isEn
                ? `Successfully added ${selected.length} habit(s) to your daily task list! 📑`
                : language === "tr"
                  ? `${selected.length} alışkanlık günlük görev listenize başarıyla eklendi! 📑`
                  : `Uspešno dodato ${selected.length} navika na vašu listu zadataka! 📑`,
              type: "success",
            },
          }),
        );

        setRecommendedHabits([]);
      } catch (err) {
        console.error("Greška pri skladištenju zadataka:", err);
      }
    }
  };

  // 5. Completion logs for past 90 days: { "2026-06-05": ["priority_a", "hydration"] }
  const [logs, setLogs] = useState<Record<string, string[]>>(() => {
    try {
      const saved = safeStorage.getItem("abcde_calendar_logs");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  // Persist all structures
  useEffect(() => {
    safeStorage.setItem("abcde_atomic_identity", identity);
  }, [identity]);

  useEffect(() => {
    safeStorage.setItem("abcde_calendar_habits", JSON.stringify(habits));
    window.dispatchEvent(new Event("storage_sync"));
  }, [habits]);

  useEffect(() => {
    safeStorage.setItem("abcde_atomic_stacks", JSON.stringify(habitStacks));
  }, [habitStacks]);

  useEffect(() => {
    safeStorage.setItem("abcde_atomic_intentions", JSON.stringify(intentions));
  }, [intentions]);

  useEffect(() => {
    safeStorage.setItem("abcde_calendar_logs", JSON.stringify(logs));
    window.dispatchEvent(new Event("storage_sync"));
  }, [logs]);

  // Sync with storage events
  useEffect(() => {
    const handleSync = () => {
      try {
        const habitsRaw = safeStorage.getItem("abcde_calendar_habits");
        if (habitsRaw) {
          setHabits((prev) => {
            const parsed = JSON.parse(habitsRaw);
            return JSON.stringify(prev) === JSON.stringify(parsed)
              ? prev
              : parsed;
          });
        }
        const logsRaw = safeStorage.getItem("abcde_calendar_logs");
        if (logsRaw) {
          setLogs((prev) => {
            const parsed = JSON.parse(logsRaw);
            return JSON.stringify(prev) === JSON.stringify(parsed)
              ? prev
              : parsed;
          });
        }
      } catch (err) {
        console.error("Sync error in ProgressMatrix:", err);
      }
    };
    window.addEventListener("storage_sync", handleSync);
    return () => window.removeEventListener("storage_sync", handleSync);
  }, []);

  // Unified translations object
  const t = {
    title: isEn
      ? "Peak Routine & Core Consistency Matrix"
      : language === "tr"
        ? "Zirve Rutini ve Temel Tutarlılık Matrisi"
        : "⚡ Mikrorutine & Matrica Doslednosti",
    subtitle: isEn
      ? "Build identity-based loops and robust routine architecture. Program your triggers with Habit Stacking, scale down tasks with the Micro-routine, and record streaks on the visual progress grid."
      : language === "tr"
        ? "Kimlik tabanlı döngüler ve sağlam rutin mimari oluşturun. Tetikleyicilerinizi Habit Stacking ile programlayın, Mikro rutin ile görevlerin ölçeğini azaltın ve görsel ilerleme tablosundaki çizgileri kaydedin."
        : "Izgradite stabilan uspeh i pobedite odugovlačenje po dokazanim kognitivno-bihevioralnim formulama. Definišite novi identitet, spakujte navike u formule, primenite pravilo mikro-koraka i pratite vatrene nizove.",
    identityHeading: isEn
      ? "🎯 AI Habit Generator: Personalize Habits to Your Needs & Goals"
      : language === "tr"
        ? "🎯 Yapay Zeka Alışkanlık Oluşturucu: Alışkanlıkları İhtiyaçlarınıza ve Hedeflerinize Göre Özelleştirin"
        : "🎯 AI Generator Navika: Prilagodi navike svojim ličnim ciljevima i potrebama",
    identityPlaceholder: isEn
      ? "E.g., I want to sleep better, Stressed designer, More morning energy..."
      : language === "tr"
        ? "Örn. Daha iyi uyumak istiyorum, Stresli tasarımcı, Sabahları daha fazla enerji..."
        : "Npr. Želim bolji san i manje stresa, Student pod ispitnim rokom, Više jutarnje energije...",
    identitySub: isEn
      ? "Type any specific need, goal, or identity statement. Our AI will automatically engineer 3 highly personalized micro-routines tailored to your lifestyle."
      : language === "tr"
        ? "Herhangi bir özel ihtiyacı, hedefi veya kimlik ifadesini yazın. Yapay zekamız, yaşam tarzınıza göre uyarlanmış 3 adet son derece kişiselleştirilmiş mikro rutini otomatik olarak tasarlayacaktır."
        : "Upišite bilo koju specifičnu potrebu, cilj ili željeni identitet. Naš AI će automatski projektovati 3 izuzetno personalizovane mikrorutine prilagođene vašem načinu života.",

    addHabit: isEn
      ? "Add Habit / Routine"
      : language === "tr"
        ? "Alışkanlık / Rutin Ekle"
        : "Dodaj novu naviku ili rutinu",
    addPlaceholder: isEn
      ? "Habit name (e.g. Meditate for 15m)"
      : language === "tr"
        ? "Alışkanlık adı (ör. 15 dakika meditasyon yapın)"
        : "Naziv navike (npr. Meditacija, Trening, Hidratacija)",
    twoMinPlaceholder: isEn
      ? "Micro-routine version (e.g. Put on running shoes)"
      : language === "tr"
        ? "Mikro rutin versiyon (örn. Koşu ayakkabılarını giyin)"
        : "Mikro-korak (npr. samo obuci patike, ili popij 1 gutljaj vode)",
    twoMinLabel: isEn
      ? "The Micro-routine:"
      : language === "tr"
        ? "Mikro Rutin:"
        : "Mikrorutina:",
    twoMinActiveBadge: isEn
      ? "Simplified (Micro-routine mode Active)"
      : language === "tr"
        ? "Basitleştirilmiş (Mikro rutin mod Aktif)"
        : "Olakšano (Primenjen mikro-korak)",
    activateTwoMin: isEn
      ? "Toggle micro-routine limit"
      : language === "tr"
        ? "Mikro rutin sınırını değiştir"
        : "Smanji na mikro-zalogaj verziju za lakši start",

    stacksHeading: isEn
      ? "Habit Stacking Formulas"
      : language === "tr"
        ? "Alışkanlık İstifleme Formülleri"
        : "🔗 Slaganje Navika (Habit Stacking)",
    stacksSub: isEn
      ? "Formula: After [Current Habit], I will [New Habit]."
      : language === "tr"
        ? "Formül: [Mevcut Alışkanlık]'tan sonra, [Yeni Alışkanlık] yapacağım."
        : "Formula: Nakon što [Završiš postojeću rutinu], ti ćeš odmah [Uraditi novu naviku].",
    afterLabel: isEn
      ? "After I..."
      : language === "tr"
        ? "Benden sonra..."
        : "Nakon što...",
    willLabel: isEn
      ? "I will..."
      : language === "tr"
        ? "Ben..."
        : "ja ću odmah...",
    btnStack: isEn
      ? "Stack Habit"
      : language === "tr"
        ? "Yığın Alışkanlığı"
        : "Poveži navike",

    intentHeading: isEn
      ? "Implementation Intentions"
      : language === "tr"
        ? "Uygulama Amaçları"
        : "🧭 Namera o Sprovođenju (Jasnoća)",
    intentSub: isEn
      ? "Make it Obvious: I will [Behavior] at [Time] in [Location]."
      : language === "tr"
        ? "Açıkça Belirtin: [Konum]'daki [Zaman]'da [Davranış] yapacağım."
        : "Učini očiglednim: Ja ću [Ponašanje] u [Vreme] na lokaciji [Lokacija].",
    willDo: isEn
      ? "I will do..."
      : language === "tr"
        ? "yapacağım..."
        : "Ja ću uraditi...",
    whereDo: isEn
      ? "at location..."
      : language === "tr"
        ? "yerde..."
        : "na lokaciji...",
    whenDo: isEn
      ? "at time..."
      : language === "tr"
        ? "zamanında..."
        : "u vreme...",
    btnIntent: isEn
      ? "Establish Intention"
      : language === "tr"
        ? "Niyet Oluştur"
        : "Ureži nameru",

    todayHeader: isEn
      ? "Daily Compliance Tracker"
      : language === "tr"
        ? "Günlük Uyumluluk Takibi"
        : "Dnevni kontrolor disciplina",
    clickHint: isEn
      ? "Check off today's habits to update the heat matrix"
      : language === "tr"
        ? "Isı matrisini güncellemek için günümüzün alışkanlıklarına göz atın"
        : "Štriklirajte završene discipline za odabrani dan",
    streakHeader: isEn
      ? "Peak Streak Flame"
      : language === "tr"
        ? "Zirve Çizgi Alevi"
        : "Vatreni niz doslednosti",
    daysStreak: isEn
      ? "days streak"
      : language === "tr"
        ? "gün serisi"
        : "dana zaredom",
    gridLegend: isEn
      ? "Activity Level"
      : language === "tr"
        ? "Etkinlik Düzeyi"
        : "Nivo aktivnosti",
    legendLess: isEn ? "Less" : language === "tr" ? "Az" : "Manje",
    legendMore: isEn ? "More" : language === "tr" ? "Daha" : "Više",
    btnResetAll: isEn
      ? "Reset Progress Logs"
      : language === "tr"
        ? "İlerleme Günlüklerini Sıfırla"
        : "Resetuj sve logove",
    resetWarning: isEn
      ? "Are you sure you want to clear all historical progress logs?"
      : language === "tr"
        ? "Tüm geçmiş ilerleme günlüklerini temizlemek istediğinizden emin misiniz?"
        : "Da li ste sigurni da želite obrisati celokupnu istoriju progresa?",
    completedCount: isEn
      ? "habits checked"
      : language === "tr"
        ? "alışkanlıklar kontrol edildi"
        : "završenih navika",
    selectDayMsg: isEn
      ? "Select a day on the grid to record compliance"
      : language === "tr"
        ? "Uyumluluğu kaydetmek için tablodan bir gün seçin"
        : "Izaberite bilo koji dan na matrici za popunjavanje ili analizu",
    kaizenSynergy: isEn
      ? "KAIZEN SYNERGY: SYSTEM THEORY & PSYCHOLOGY"
      : language === "tr"
        ? "KAIZEN SİNERJİSİ: SİSTEM TEORİSİ VE PSİKOLOJİSİ"
        : "KAIZEN SINERGIJA: SISTEMSKA TEORIJA & PSIHOLOGIJA",
    peakConsistency: isEn
      ? "Peak Consistency System"
      : language === "tr"
        ? "Zirve Tutarlılık Sistemi"
        : "Sistem Vrhunske Doslednosti",
    lawQuotes: [
      {
        text: isEn
          ? "You do not rise to the level of your goals. You fall to the level of your systems."
          : language === "tr"
            ? "Hedeflerinizin seviyesine çıkamazsınız. Sistemlerinizin seviyesine düşersiniz."
            : "Vi se ne uzdižete na nivo svojih ciljeva. Vi padate na nivo svojih sistema.",
        author: isEn
          ? "Behavioral Mentor"
          : language === "tr"
            ? "Davranışsal Mentor"
            : "Bihevioralni Mentor",
      },
      {
        text: isEn
          ? "Every action you take is a vote for the type of person you wish to become."
          : language === "tr"
            ? "Yaptığınız her eylem, olmak istediğiniz kişi türü için bir oydur."
            : "Svaka akcija koju preduzmete je glas za tip osobe koja želite da postanete.",
        author: isEn
          ? "Behavioral Mentor"
          : language === "tr"
            ? "Davranışsal Mentor"
            : "Bihevioralni Mentor",
      },
      {
        text: isEn
          ? "Be the designer of your world and not merely the consumer of it."
          : language === "tr"
            ? "Dünyanızın yalnızca tüketicisi değil, tasarımcısı olun."
            : "Budite dizajner svog sveta, a ne samo potrošač u njemu.",
        author: isEn
          ? "Behavioral Mentor"
          : language === "tr"
            ? "Davranışsal Mentor"
            : "Bihevioralni Mentor",
      },
    ],
  };

  const activeDayLogs = logs[selectedDateStr] || [];

  const handleToggleHabit = (habitId: string) => {
    const currentList = [...activeDayLogs];
    const isChecked = currentList.includes(habitId);
    let updated: string[];

    if (isChecked) {
      updated = currentList.filter((id) => id !== habitId);
    } else {
      updated = [...currentList, habitId];
      triggerDiscoveryEvent("micro_habit_completed", { habitId });
    }

    const nextLogs = {
      ...logs,
      [selectedDateStr]: updated,
    };
    setLogs(nextLogs);
    safeStorage.setItem("abcde_calendar_logs", JSON.stringify(nextLogs));

    // Cross-sync: Habits <-> Tasks
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      try {
        const boardId = new URLSearchParams(window.location.search).get(
          "board",
        );
        const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
        const tasksRaw =
          safeStorage.getItem(key) ||
          safeStorage.getItem("abcde_processed_tasks_preview");
        if (tasksRaw) {
          let tasks = JSON.parse(tasksRaw);
          tasks = tasks.map((t: any) => {
            // Priority: sync by habitId if available, fallback to title
            const matches =
              t.habitId === habit.id || t.title.includes(habit.name);
            if (matches) {
              return { ...t, done: !isChecked }; // Toggle done status
            }
            return t;
          });
          safeStorage.setItem(key, JSON.stringify(tasks));
        }
        window.dispatchEvent(new Event("storage_sync"));
      } catch (err) {
        console.error("Sync error:", err);
      }
    }
  };

  const handleToggleTwoMinActive = (habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          return { ...h, isTwoMinActive: !h.isTwoMinActive };
        }
        return h;
      }),
    );
  };

  const handleAddCustomHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    const newH: CustomHabit = {
      id: "habit-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
      name: newHabitName.trim(),
      twoMinVersion:
        newHabitTwoMin.trim() ||
        (isEn
          ? "Just start the first easiest micro-step right now"
          : language === "tr"
            ? "İlk en kolay mikro adımı hemen şimdi başlatın"
            : "Započni samo prvi i najlakši mogući korak (mikro-korak)"),
      isTwoMinActive: false,
    };
    setHabits((prev) => [...prev, newH]);
    setNewHabitName("");
    setNewHabitTwoMin("");
  };

  const removeHabitData = (id: string) => {
    // Find the habit to get its name for task deletion
    const habitToDelete = habits.find((h) => h.id === id);

    const updatedHabits = habits.filter((h) => h.id !== id);
    setHabits(updatedHabits);
    safeStorage.setItem("abcde_calendar_habits", JSON.stringify(updatedHabits));

    setLogs((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((dateKey) => {
        updated[dateKey] = updated[dateKey].filter((hId) => hId !== id);
      });
      safeStorage.setItem("abcde_calendar_logs", JSON.stringify(updated));
      return updated;
    });

    // Remove from tasks if found
    if (habitToDelete) {
      try {
        const boardId = new URLSearchParams(window.location.search).get(
          "board",
        );
        const key = boardId ? `abcde_tasks_${boardId}` : "abcde_tasks";
        const tasksRaw =
          safeStorage.getItem(key) ||
          safeStorage.getItem("abcde_processed_tasks_preview");
        if (tasksRaw) {
          let tasks = JSON.parse(tasksRaw);
          tasks = tasks.filter((t: any) => t.habitId !== habitToDelete.id);
          safeStorage.setItem(key, JSON.stringify(tasks));
          window.dispatchEvent(new Event("storage_sync"));
        }
      } catch (err) {
        console.error("Sync error during habit deletion:", err);
      }
    }
  };

  const handleDeleteHabit = (id: string) => {
    console.log("handleDeleteHabit called for:", id);
    if (["priority_a", "balance_wheel"].includes(id)) {
      console.log("Cannot delete priority_a or balance_wheel");
      return;
    }

    removeHabitData(id);
  };

  const handleAddStack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stackCurrent.trim() || !stackNew.trim()) return;
    const newStack: HabitStack = {
      id: "stack-" + Date.now(),
      currentHabit: stackCurrent.trim(),
      newHabit: stackNew.trim(),
    };
    setHabitStacks((prev) => [...prev, newStack]);
    setStackCurrent("");
    setStackNew("");
  };

  const handleDeleteStack = (id: string) => {
    setHabitStacks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddIntention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentBehavior.trim() || !intentTime.trim() || !intentLocation.trim())
      return;
    const newInt: ImplementationIntention = {
      id: "intent-" + Date.now(),
      behavior: intentBehavior.trim(),
      time: intentTime.trim(),
      location: intentLocation.trim(),
    };
    setIntentions((prev) => [...prev, newInt]);
    setIntentBehavior("");
    setIntentTime("");
    setIntentLocation("");
  };

  const handleDeleteIntention = (id: string) => {
    setIntentions((prev) => prev.filter((i) => i.id !== id));
  };

  // Generate 90-day progress heatmap starting from today (represented as index 0 / circle 1) going backwards
  const getPast90Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        label: d.toLocaleDateString(
          isEn ? "en-US" : language === "tr" ? "tr-TR" : "sr-RS",
          {
            day: "numeric",
            month: "short",
          },
        ),
        rawDate: d,
      });
    }
    return dates;
  };

  const past90Dates = getPast90Days();

  // Streak calculation based on daily checkoff logs
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    let currentCheck = new Date();

    while (true) {
      const yyyy = currentCheck.getFullYear();
      const mm = String(currentCheck.getMonth() + 1).padStart(2, "0");
      const dd = String(currentCheck.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const checkedHabits = logs[dateKey] || [];

      if (checkedHabits.length > 0) {
        streak++;
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        // Allow streak check fallback for today if yesterday was checked active
        if (
          streak === 0 &&
          dateKey ===
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
        ) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          currentCheck = yesterday;
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const streakCount = calculateStreak();

  const handleResetLogs = () => {
    setLogs({});
  };

  const handleGenerateIdentityHabits = async () => {
    if (!identity.trim()) {
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: isEn
              ? "Please type your desired core identity first!"
              : language === "tr"
                ? "Lütfen önce istediğiniz çekirdek kimliğinizi yazın!"
                : "Prvo upišite željeni identitet u tekstualno polje!",
            type: "error",
          },
        }),
      );
      return;
    }
    setLoadingIdentityHabits(true);
    try {
      const resp = await fetch("/api/identity-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, language }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Failed");
      if (data && data.habits) {
        setRecommendedHabits(
          data.habits.map((h: any) => ({
            id: "id_h_" + Math.random().toString(36).substring(2, 9),
            name: h.title,
            twoMinVersion: h.description,
            selected: true,
          })),
        );
        window.dispatchEvent(
          new CustomEvent("trigger-toast", {
            detail: {
              message: isEn
                ? "Recommended micro-habits are ready to review!"
                : language === "tr"
                  ? "Önerilen mikro alışkanlıklar incelemeye hazır!"
                  : "Preporučene puzla-navike su spremne za pregled ispod!",
              type: "success",
            },
          }),
        );
      }
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: isEn
              ? "Failed to generate habits."
              : language === "tr"
                ? "Alışkanlıklar oluşturulamadı."
                : "Greška pri generisanju.",
            type: "error",
          },
        }),
      );
    } finally {
      setLoadingIdentityHabits(false);
    }
  };

  // Simple Quote Rotation
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % t.lawQuotes.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [t.lawQuotes.length]);

  return (
    <div
      className="space-y-8 animate-fadeIn"
      id="consistency-micro-routines-panel"
    >
      {/* Premium Title Section */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#007AFF]/15 hidden pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-[#34C759]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF] rounded-md text-[11px] uppercase tracking-wider font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>{t.kaizenSynergy}</span>
          </div>

          <h2 className="text-2xl sm:text-xl text-[#3C3C43] font-semibold tracking-tight text-black dark:text-white">
            {t.title}
          </h2>
          <p className="text-[15px] sm:text-base text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium leading-relaxed">
            {t.subtitle}
          </p>

          {/* Consistency Wisdom Quote */}
          <div className="p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E]/50 dark:bg-[#2C2C2E]/50 rounded-xl flex items-start gap-3 mt-4">
            <BookOpen className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] italic text-[#3A3A3C] dark:text-[#EBEBF5]/80 leading-snug">
                "{t.lawQuotes[quoteIndex].text}"
              </p>
              <span className="text-[12px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 block mt-1.5 uppercase tracking-wider">
                — {t.lawQuotes[quoteIndex].author}, {t.peakConsistency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid layout: Identity statement at top, side-by-side behavioral formula stacks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Identity & Custom Habit Definitions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Change of Identity Core Banner */}
          <div
            className={`border rounded-[20px] p-6 space-y-4 transition-colors shadow-sm ${
              isEvening
                ? "bg-[#1C1C1E] border-white/5"
                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
            }`}
          >
            <div className="flex gap-3 items-center">
              <span
                className={`p-2.5 rounded-xl bg-[#007AFF]/10 text-[#007AFF]`}
              >
                <Smile className="w-5 h-5" />
              </span>
              <div>
                <h3
                  className={`text-[15px] font-semibold tracking-tight text-black dark:text-white`}
                >
                  {t.identityHeading}
                </h3>
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {t.identitySub}
                </p>
              </div>
            </div>

            <div className="relative space-y-3">
              <input
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder={t.identityPlaceholder}
                className={`w-full text-[14px] font-medium focus:ring-2 p-3 pr-10 rounded-xl transition-all outline-none font-sans placeholder:font-normal shadow-sm ${
                  isEvening
                    ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-white/40 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A]"
                    : "bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-[#007AFF]/30 focus:border-[#007AFF]"
                }`}
              />
              <span className="absolute right-3.5 top-3.5 text-xs">✨</span>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateIdentityHabits}
                  disabled={loadingIdentityHabits}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer
 ${loadingIdentityHabits ? "opacity-50 cursor-wait" : "active:scale-95"}
 ${
   isEvening
     ? "bg-[#007AFF] active:opacity-70 transition-opacity text-white"
     : "bg-[#007AFF]/10 text-[#007AFF] active:opacity-70 transition-opacity border border-black/5 dark:border-white/5"
 }`}
                >
                  <span className={loadingIdentityHabits ? "animate-spin" : ""}>
                    {loadingIdentityHabits ? "⏳" : "🪄"}
                  </span>
                  {loadingIdentityHabits
                    ? isEn
                      ? "Generating..."
                      : language === "tr"
                        ? "Oluşturuluyor..."
                        : "Generišem..."
                    : isEn
                      ? "Auto-Generate Daily Habits"
                      : language === "tr"
                        ? "Günlük Alışkanlıkları Otomatik Olarak Oluşturun"
                        : "Automatski generiši mikrorutine"}
                </button>
              </div>

              {/* RECOMMENDED HABITS INTERACTIVE SELECTION LIST */}
              <AnimatePresence>
                {recommendedHabits.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-4 p-5 rounded-xl border border-[#007AFF]/30 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 space-y-4 shadow-md"
                  >
                    <div className="flex justify-between items-start pb-2 border-b border-[#007AFF]/10">
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#FF9500]" />
                          {isEn
                            ? "Configure & Choose Micro-Habits"
                            : language === "tr"
                              ? "Mikro Alışkanlıkları Yapılandırın ve Seçin"
                              : "Pregled i odabir mikro-navika"}
                        </h4>
                        <p className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5">
                          {isEn
                            ? "Review, edit, and select which generated habits to acquire or schedule as daily tasks:"
                            : language === "tr"
                              ? "Hangi alışkanlıkları edineceğinizi veya günlük görevler olarak planlayacağınızı gözden geçirin, düzenleyin ve seçin:"
                              : "Pregledajte, prilagodite i selektujte navike koje želite da usvojite u rutine ili dodate na listu dnevnih zadataka:"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecommendedHabits([])}
                        className="p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 rounded-lg text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-all cursor-pointer"
                        title={
                          isEn
                            ? "Clear"
                            : language === "tr"
                              ? "Temizlemek"
                              : "Ukloni"
                        }
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {recommendedHabits.map((item) => {
                        const isEditing = editingHabitId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 select-none ${
                              item.selected
                                ? "bg-white dark:bg-[#1C1C1E] border-[#007AFF] shadow-sm"
                                : "bg-transparent border-black/5 dark:border-white/5 opacity-60 hover:opacity-100"
                            }`}
                          >
                            {/* Checkbox */}
                            <div
                              onClick={() =>
                                !isEditing && toggleRecommendedHabit(item.id)
                              }
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer mt-0.5 ${
                                item.selected
                                  ? "bg-[#007AFF] border-[#007AFF] text-white"
                                  : "border-black/20 dark:border-white/10"
                              }`}
                            >
                              {item.selected && (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </div>

                            {/* Content or Edit Form */}
                            {isEditing ? (
                              <div
                                className="flex-1 space-y-2 p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 uppercase tracking-normal block">
                                    {isEn
                                      ? "Habit Title (Activity Name)"
                                      : language === "tr"
                                        ? "Alışkanlık Başlığı (Etkinlik Adı)"
                                        : "Naziv navike (Aktivnost)"}
                                  </label>
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) =>
                                      setEditingName(e.target.value)
                                    }
                                    className="w-full text-[13px] p-2 bg-white dark:bg-[#2C2C2E] rounded border border-transparent focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none font-medium text-black dark:text-[#EBEBF5]/90 shadow-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 uppercase tracking-normal block">
                                    {isEn
                                      ? "Micro-routine version"
                                      : language === "tr"
                                        ? "Mikro rutin versiyon"
                                        : "Mikrorutina verzija"}
                                  </label>
                                  <input
                                    type="text"
                                    value={editingTwoMin}
                                    onChange={(e) =>
                                      setEditingTwoMin(e.target.value)
                                    }
                                    className="w-full text-[13px] p-2 bg-white dark:bg-[#2C2C2E] rounded border border-transparent focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none text-black dark:text-[#EBEBF5]/90 font-medium shadow-sm"
                                  />
                                </div>
                                <div className="flex gap-1.5 justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingHabitId(null)}
                                    className="px-2 py-1 text-[10px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-black/10 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded transition-colors cursor-pointer"
                                  >
                                    {isEn
                                      ? "Dismiss"
                                      : language === "tr"
                                        ? "Azletmek"
                                        : "Odustani"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveEditingHabit(item.id)}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-[#34C759] hover:bg-[#34C759]/90 text-white rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Save className="w-3 h-3" />
                                    {isEn
                                      ? "Save"
                                      : language === "tr"
                                        ? "Kaydetmek"
                                        : "Sačuvaj"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="flex-1 pr-6 relative group/item cursor-pointer"
                                onClick={() => toggleRecommendedHabit(item.id)}
                              >
                                <div className="space-y-1">
                                  <span className="text-[13px] font-semibold text-black dark:text-white block leading-tight pr-6">
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 block leading-relaxed font-medium">
                                    📝{" "}
                                    <span className="font-semibold">
                                      {isEn
                                        ? "Micro-routine:"
                                        : language === "tr"
                                          ? "Mikro rutin:"
                                          : "Mikrorutina:"}
                                    </span>{" "}
                                    {item.twoMinVersion}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingHabit(
                                      item.id,
                                      item.name,
                                      item.twoMinVersion,
                                    );
                                  }}
                                  className="absolute right-0 top-0.5 p-1 text-[#3C3C43] dark:text-[#EBEBF5]/80 opacity-0 group-hover/item:opacity-100 hover:text-[#007AFF] hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 rounded-md transition-all cursor-pointer"
                                  title={
                                    isEn
                                      ? "Edit routine inline"
                                      : language === "tr"
                                        ? "Rutin satır içi düzenleme"
                                        : "Izmeni rutinu inline"
                                  }
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 border-t border-[#007AFF]/10">
                      <button
                        type="button"
                        onClick={() => setRecommendedHabits([])}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 transition-all cursor-pointer text-center"
                      >
                        {isEn
                          ? "Cancel"
                          : language === "tr"
                            ? "İptal etmek"
                            : "Otkaži"}
                      </button>

                      {/* PATHWAY 1: ADD TO DAILY TASK LIST */}
                      <button
                        type="button"
                        onClick={handleAddSelectedToTasks}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FF9500] hover:bg-[#FF9500]/90 text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isEn
                          ? "Add to Daily Task List"
                          : language === "tr"
                            ? "Günlük Görev Listesine Ekle"
                            : "Dodaj u dnevnu listu zadataka"}
                      </button>

                      {/* PATHWAY 2: CO-OPT AS ROUTINE */}
                      <button
                        type="button"
                        onClick={handleAddSelectedHabits}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#007AFF] hover:bg-[#007AFF]/90 text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isEn
                          ? "Adopt as Mikrorutine"
                          : language === "tr"
                            ? "Mikrorutine olarak benimseyin"
                            : "Usvoji mikrorutinu"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Form: Habit stacks input */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition-colors ${
              isEvening
                ? "bg-[#1C1C1E] border-white/5"
                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
            }`}
          >
            <div className="flex gap-2.5 items-center">
              <span
                className={`p-2 rounded-lg bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 text-[#AF52DE] dark:text-[#BF5AF2]`}
              >
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h3
                  className={`text-sm font-semibold tracking-wide text-black dark:text-white`}
                >
                  {t.stacksHeading}
                </h3>
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {t.stacksSub}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAddStack}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0"
            >
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                  {t.afterLabel}
                </label>
                <input
                  type="text"
                  value={stackCurrent}
                  onChange={(e) => setStackCurrent(e.target.value)}
                  placeholder={
                    isEn
                      ? "I check off my email..."
                      : language === "tr"
                        ? "E-postalarımı kontrol ediyorum..."
                        : "Npr. popijem prvu čašu vode"
                  }
                  className="w-full text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 rounded-lg border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                  {t.willLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stackNew}
                    onChange={(e) => setStackNew(e.target.value)}
                    placeholder={
                      isEn
                        ? "I will open my priority list"
                        : language === "tr"
                          ? "Öncelik listemi açacağım"
                          : "odmah ću otvoriti A1 zadatak"
                    }
                    className="flex-1 text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 rounded-lg border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all max-w-full placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-black text-white rounded-lg hover:bg-black/5 dark:bg-white/5 transition-all font-medium text-xs cursor-pointer px-4 shrink-0"
                  >
                    {t.btnStack}
                  </button>
                </div>
              </div>
            </form>

            {/* List of active stacks */}
            {habitStacks.length > 0 && (
              <div className="border-t border-black/5 dark:border-white/5 pt-3 space-y-2">
                {habitStacks.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center text-xs p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 gap-3"
                  >
                    <p className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal">
                      🔗{" "}
                      <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {isEn
                          ? "After"
                          : language === "tr"
                            ? "Sonrasında"
                            : "Nakon što"}
                      </span>{" "}
                      <span className="text-black dark:text-white font-semibold">
                        {s.currentHabit}
                      </span>
                      ,{" "}
                      <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {isEn
                          ? "I will"
                          : language === "tr"
                            ? "yapacağım"
                            : "ja ću odmah"}
                      </span>{" "}
                      <span className="text-[#007AFF] font-semibold">
                        {s.newHabit}
                      </span>
                      .
                    </p>
                    <button
                      onClick={() => handleDeleteStack(s.id)}
                      className="text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] dark:text-[#FF453A] transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form: Implementation Intentions */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition-colors ${
              isEvening
                ? "bg-[#1C1C1E] border-white/5"
                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
            }`}
          >
            <div className="flex gap-2.5 items-center">
              <span className="p-2 bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] rounded-lg">
                <Compass className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white tracking-wide">
                  {t.intentHeading}
                </h3>
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {t.intentSub}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddIntention} className="space-y-3 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                <div className="space-y-1">
                  <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    {t.willDo}
                  </label>
                  <input
                    type="text"
                    value={intentBehavior}
                    onChange={(e) => setIntentBehavior(e.target.value)}
                    placeholder={
                      isEn
                        ? "Meditate for 10m"
                        : language === "tr"
                          ? "10 dakika meditasyon yapın"
                          : "Meditirati 10 minuta"
                    }
                    className="w-full text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 rounded-lg border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    {t.whenDo}
                  </label>
                  <input
                    type="text"
                    value={intentTime}
                    onChange={(e) => setIntentTime(e.target.value)}
                    placeholder="07:30 AM"
                    className="w-full text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 rounded-lg border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    {t.whereDo}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={intentLocation}
                      onChange={(e) => setIntentLocation(e.target.value)}
                      placeholder={
                        isEn
                          ? "in the bedroom"
                          : language === "tr"
                            ? "yatak odasında"
                            : "u spavaćoj sobi"
                      }
                      className="flex-1 text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 rounded-lg border border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                    />
                    <button
                      type="submit"
                      className="p-2.5 bg-[#007AFF] text-white rounded-lg active:opacity-70 transition-all font-semibold text-xs cursor-pointer px-3 flex items-center justify-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* List of active intentions */}
            {intentions.length > 0 && (
              <div className="border-t border-black/5 dark:border-white/5 pt-3 space-y-2">
                {intentions.map((i) => (
                  <div
                    key={i.id}
                    className="flex justify-between items-center text-xs p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 gap-3"
                  >
                    <p className="font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal">
                      🧭{" "}
                      <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {isEn
                          ? "I will"
                          : language === "tr"
                            ? "yapacağım"
                            : "Ja ću"}
                      </span>{" "}
                      <span className="text-black dark:text-white font-semibold">
                        {i.behavior}
                      </span>{" "}
                      <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {isEn ? "at" : language === "tr" ? "en" : "u"}
                      </span>{" "}
                      <span className="text-[#34C759] font-semibold">
                        {i.time}
                      </span>{" "}
                      <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {isEn
                          ? "in"
                          : language === "tr"
                            ? "içinde"
                            : "na lokaciji"}
                      </span>{" "}
                      <span className="text-black dark:text-white font-medium">
                        {i.location}
                      </span>
                      .
                    </p>
                    <button
                      onClick={() => handleDeleteIntention(i.id)}
                      className="text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] dark:text-[#FF453A] transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Streak statistics & Motivational panel */}
        <div className="space-y-6">
          {/* Consistency Streak Flame Card */}
          <div
            className={`rounded-xl p-5 flex items-center justify-between gap-4 border transition-colors ${
              isEvening
                ? "bg-[#1C1C1E] border-white/5 text-white"
                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white"
            }`}
          >
            <div className="space-y-1">
              <span className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9F0A] block">
                {t.streakHeader}
              </span>
              <h3 className="text-2xl sm:text-xl text-[#3C3C43] dark:text-white font-semibold">
                {streakCount} {t.daysStreak}
              </h3>
              <p className="text-[13px] text-[#FF9500] dark:text-[#FF9F0A] font-semibold">
                {streakCount > 0
                  ? isEn
                    ? "Awesome job! Never break the chain."
                    : language === "tr"
                      ? "Harika iş! Zinciri asla kırmayın."
                      : "Sjajno ide! Gvozdena doslednost na delu."
                  : isEn
                    ? "Check off an item below to kickstart your streak!"
                    : language === "tr"
                      ? "Serinizi başlatmak için aşağıdaki öğelerden birini işaretleyin!"
                      : "Štriklirajte bazičnu obavezu za početak pobedničkog niza!"}
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 dark:bg-[#FF9F0A]/10 rounded-xl shrink-0">
              <Flame className="w-10 h-10 text-[#FF9500] dark:text-[#FF9F0A] animate-pulse" />
            </div>
          </div>

          {/* Quick explanations for the 4 laws (User-Friendly Manual) */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition-colors ${
              isEvening
                ? "bg-[#1C1C1E] border-white/5"
                : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
            }`}
          >
            <h4 className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5">
              <span>🌟</span>
              <span>
                {isEn
                  ? "HOW TO SCORE CONSISTENCY"
                  : language === "tr"
                    ? "TUTARLILIK NASIL PUANLANIR"
                    : "SAVETI ZA DOSLEDNOST"}
              </span>
            </h4>

            <div className="space-y-3">
              <div className="flex gap-2">
                <span className="text-sm shrink-0">1️⃣</span>
                <div>
                  <h5 className="text-[13px] font-semibold text-black dark:text-white leading-none">
                    {isEn
                      ? "1. Make It Obvious"
                      : language === "tr"
                        ? "1. Açıkça Belirtin"
                        : "1. Učini očiglednim"}
                  </h5>
                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 leading-normal">
                    {isEn
                      ? "Use Habit Stacking & Implementation Intentions formula on the left."
                      : language === "tr"
                        ? "Soldaki Alışkanlık İstifleme ve Uygulama Niyetleri formülünü kullanın."
                        : "Koristite slaganje i vremensko-lokacijski plan sa leve strane."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-sm shrink-0">2️⃣</span>
                <div>
                  <h5 className="text-[13px] font-semibold text-black dark:text-white leading-none">
                    {isEn
                      ? "2. Make It Attractive"
                      : language === "tr"
                        ? "2. Çekici Hale Getirin"
                        : "2. Učini privlačnim"}
                  </h5>
                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 leading-normal">
                    {isEn
                      ? "Associate your system output with your desirable Identity Statement."
                      : language === "tr"
                        ? "Sistem çıktınızı istediğiniz Kimlik Bildiriminizle ilişkilendirin."
                        : "Povežite rad na zadacima sa novom ugrađenom formom Identiteta."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-sm shrink-0">3️⃣</span>
                <div>
                  <h5 className="text-[13px] font-semibold text-black dark:text-white leading-none">
                    {isEn
                      ? "3. Make It Easy"
                      : language === "tr"
                        ? "3. Kolaylaştırın"
                        : "3. Učini jednostavnim"}
                  </h5>
                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 leading-normal">
                    {isEn
                      ? "Enable 'The Micro-routine' on tough days to prevent friction and start."
                      : language === "tr"
                        ? "Zorlu günlerde sürtünmeyi önlemek ve başlamak için 'Mikro Rutin'i etkinleştirin."
                        : "Uključite režim 'mikro-koraka' za teške dane kako biste uklonili otpor početka."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-sm shrink-0">4️⃣</span>
                <div>
                  <h5 className="text-[13px] font-semibold text-black dark:text-white leading-none">
                    {isEn
                      ? "4. Make It Satisfying"
                      : language === "tr"
                        ? "4. Tatmin Edici Hale Getirin"
                        : "4. Učini zadovoljavajućim"}
                  </h5>
                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 leading-normal">
                    {isEn
                      ? "Click the grid circles. Scoring visual logs releases dopamine."
                      : language === "tr"
                        ? "Izgara dairelerine tıklayın. Görsel günlüklerin puanlanması dopamin salgılanmasını sağlar."
                        : "Popunjavajte krugove ispod. Čuvanje vizuelnog niza podstiče dopamin rasta."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Habit Tracker Board & GitHub style calendar row */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 border rounded-2xl transition-colors ${
          isEvening
            ? "bg-[#1C1C1E] border-white/5"
            : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5"
        }`}
      >
        {/* Left pane: Habits Checkoff compliance (The daily control) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
            <div>
              <h4 className="text-sm font-semibold text-black dark:text-white">
                {t.todayHeader}
              </h4>
              <p className="text-[13px] text-[#007AFF] font-medium">
                {selectedDateStr === new Date().toISOString().slice(0, 10)
                  ? isEn
                    ? "Tracking today: "
                    : language === "tr"
                      ? "Bugünkü takip:"
                      : "Izabran današnji datum: "
                  : isEn
                    ? "Tracking alternate day: "
                    : language === "tr"
                      ? "Alternatif gün takibi:"
                      : "Analiza odabranog datuma: "}
                <span className="font-semibold bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 px-1.5 py-0.5 rounded-md text-black dark:text-white">
                  {selectedDateStr}
                </span>
              </p>
            </div>
            <span className="text-xs font-semibold bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] px-2.5 py-1 rounded-full border border-[#34C759]/20 dark:border-[#30D158]/20 flex items-center gap-2">
              {activeDayLogs.length} {t.completedCount}
            </span>
          </div>

          <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
            {t.clickHint}
          </p>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
            {habits.map((habit, index) => {
              const isChecked = activeDayLogs.includes(habit.id);
              return (
                <div
                  key={habit.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isChecked
                      ? "bg-[#cce3cb]/40 dark:bg-[#34C759]/10 border-transparent text-[#3C3C43] dark:text-[#EBEBF5]/80"
                      : "bg-[#F2F2F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white shadow-sm hover:shadow-md transition-shadow"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleHabit(habit.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-[#34C759] dark:bg-[#30D158] border-[#34C759]/20 dark:border-[#30D158]/20 text-white"
                            : "border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E]"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {/* Logical dynamic habit number badge */}
                      <span
                        className={`text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold px-1.5 py-0.5 rounded-md shrink-0 border ${
                          isChecked
                            ? "bg-black/5 dark:bg-[#1C1C1E] text-[#3C3C43] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/10"
                            : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                        }`}
                      >
                        #{index + 1}
                      </span>

                      <span
                        className={`text-[13px] font-semibold transition-all ${isChecked ? "text-[#3C3C43] dark:text-[#EBEBF5]/80 line-through decoration-[#8E8E93] dark:decoration-[#AEAEB2]" : "text-black dark:text-white"} ${habit.isTwoMinActive && !isChecked ? "text-[#FF9500] dark:text-[#FF9F0A]" : ""}`}
                      >
                        {habit.isTwoMinActive
                          ? getLocalizedHabitTwoMin(habit)
                          : getLocalizedHabitName(habit)}
                      </span>
                    </div>

                    <div className="pl-9 flex flex-col gap-2 mt-2 w-full">
                      {activeEditId === habit.id ? (
                        <div className="space-y-2 bg-[#F2F2F7] dark:bg-[#2C2C2E]/60 p-3.5 rounded-xl border border-black/5 dark:border-white/5 w-full sm:w-[90%] pointer-events-auto">
                          <label className="text-[10px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal block">
                            Naziv navike
                          </label>
                          <input
                            value={activeEditName}
                            onChange={(e) => setActiveEditName(e.target.value)}
                            className="w-full text-[13px] font-semibold bg-transparent outline-none border-b border-black/10 dark:border-white/10 pb-1 text-black dark:text-white"
                          />
                          <label className="text-[10px] font-bold text-[#FF9500] dark:text-[#FF9F0A] uppercase tracking-normal block pt-1">
                            Mikro-rutina (Zalogaj)
                          </label>
                          <input
                            value={activeEditTwoMin}
                            onChange={(e) =>
                              setActiveEditTwoMin(e.target.value)
                            }
                            className="w-full text-[13px] font-medium bg-transparent outline-none border-b border-black/10 dark:border-white/10 pb-1 text-black dark:text-white"
                          />
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setActiveEditId(null)}
                              className="text-[11px] font-bold uppercase text-[#8E8E93] dark:text-[#EBEBF5]/60 px-2 py-1 hover:text-black dark:text-white dark:hover:text-white"
                            >
                              Otkaži
                            </button>
                            <button
                              onClick={() => saveActiveEdit(habit.id)}
                              className="text-[11px] font-bold uppercase text-[#007AFF] bg-[#007AFF]/10 px-3 py-1 rounded-md hover:bg-[#007AFF]/20 transition-colors"
                            >
                              Sačuvaj
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 group/edit-row">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleTwoMinActive(habit.id);
                            }}
                            className={`text-[11px] px-2.5 py-1.5 rounded-md font-bold uppercase tracking-normal transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                              habit.isTwoMinActive
                                ? "bg-[#FF9500] dark:bg-[#FF9F0A]/15 text-white dark:text-[#FF9F0A] shadow-sm transform scale-[1.02]"
                                : "bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-[#007AFF] hover:border-[#007AFF]/30"
                            }`}
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            {habit.isTwoMinActive
                              ? t.twoMinActiveBadge
                              : t.activateTwoMin}
                          </button>

                          <div className="flex-1 flex items-center justify-between w-full">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                startActiveEdit(habit);
                              }}
                              className={`text-[12px] italic block cursor-pointer hover:underline decoration-dashed decoration-black/30 dark:decoration-white/30 transition-all ${habit.isTwoMinActive ? "text-[#FF9500] font-semibold dark:text-[#FF9F0A]" : "text-[#8E8E93] dark:text-[#EBEBF5]/60"}`}
                              title={
                                isEn
                                  ? "Click to edit micro-routine"
                                  : language === "tr"
                                    ? "Mikro rutini düzenlemek için tıklayın"
                                    : "Klikni za izmenu mikrorutine"
                              }
                            >
                              {t.twoMinLabel} {habit.twoMinVersion}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 sm:opacity-0 group-hover/edit-row:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startActiveEdit(habit);
                                }}
                                className="text-[#8E8E93] dark:text-[#EBEBF5]/60 p-1.5 hover:text-[#007AFF] transition-colors rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteHabit(habit.id);
                                }}
                                className="text-[#8E8E93] dark:text-[#EBEBF5]/60 p-1.5 hover:text-[#FF3B30] dark:hover:text-[#FF453A] transition-colors rounded-md hover:bg-[#FF3B30]/10 dark:hover:bg-[#FF453A]/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick add custom habit field */}
          <form
            onSubmit={handleAddCustomHabit}
            className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder={t.addPlaceholder}
                className="flex-1 text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 border border-transparent rounded-xl focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
              />
              <button
                type="submit"
                className="bg-black p-2.5 px-4 text-white rounded-xl text-xs font-semibold hover:bg-black/5 dark:bg-white/5 transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={newHabitTwoMin}
              onChange={(e) => setNewHabitTwoMin(e.target.value)}
              placeholder={t.twoMinPlaceholder}
              className="w-full text-[14px] p-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium text-black dark:text-[#EBEBF5]/90 border border-transparent rounded-xl focus:bg-white dark:focus:bg-[#2C2C2E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
            />
          </form>

          {/* RECOMMENDED HABITS MATRIX SLIDER & CATEGORIES BLOCK */}
          <div className="pt-5 border-t border-black/5 dark:border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pl-0.5">
              <span className="text-[13px] text-[#007AFF] font-semibold block">
                💡{" "}
                {isEn
                  ? "Suggested Micro-Routines (Slides):"
                  : language === "tr"
                    ? "Önerilen Mikro Rutinler (Slaytlar):"
                    : "Predložene mikro-rutine (Sajdovi):"}
              </span>
              <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                {isEn
                  ? "Tap cards to interact and explore deep science"
                  : language === "tr"
                    ? "Etkileşim kurmak ve derin bilimi keşfetmek için kartlara dokunun"
                    : "Klikni na kartice za detaljno naučno objašnjenje zašto"}
              </span>
            </div>

            {/* Area filter tabs for routines */}
            <div className="flex flex-wrap gap-2 pb-1 select-none">
              {[
                {
                  id: "All",
                  labelEn: "All",
                  labelSr: "Sve",
                  labelTr: "Hepsi",
                  icon: <Library className="w-4 h-4" />,
                },
                {
                  id: "General / Razno",
                  labelEn: "AI Picks",
                  labelSr: "AI Izbor",
                  labelTr: "AI Seçimi",
                  icon: <Bot className="w-4 h-4" />,
                },
                {
                  id: "Mental Focus / Mentalni Fokus",
                  labelEn: "Focus",
                  labelSr: "Fokus",
                  labelTr: "Odak",
                  icon: <Brain className="w-4 h-4" />,
                },
                {
                  id: "Physiology / Fiziologija",
                  labelEn: "Physical",
                  labelSr: "Telo",
                  labelTr: "Beden",
                  icon: <Activity className="w-4 h-4" />,
                },
                {
                  id: "Recovery / Oporavak",
                  labelEn: "Sleep",
                  labelSr: "San",
                  labelTr: "Uyku",
                  icon: <Moon className="w-4 h-4" />,
                },
                {
                  id: "Environment / Radni Prostor",
                  labelEn: "Space",
                  labelSr: "Prostor",
                  labelTr: "Alan",
                  icon: <Briefcase className="w-4 h-4" />,
                },
                {
                  id: "Finance / Finansije",
                  labelEn: "Career",
                  labelSr: "Karijera",
                  labelTr: "Kariyer",
                  icon: <TrendingUp className="w-4 h-4" />,
                },
                {
                  id: "Social / Društvo",
                  labelEn: "Relations",
                  labelSr: "Odnosi",
                  labelTr: "İlişkiler",
                  icon: <Users className="w-4 h-4" />,
                },
                {
                  id: "Health / Ishrana",
                  labelEn: "Health",
                  labelSr: "Zdravlje",
                  labelTr: "Sağlık",
                  icon: <Heart className="w-4 h-4" />,
                },
              ].map((tab) => {
                const isActive = recActiveArea === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setRecActiveArea(tab.id);
                      setRecActiveIndex(0);
                      setExplainedRoutineId(null);
                    }}
                    className={`px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-semibold rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm transform scale-[1.02]"
                        : "bg-[#F2F2F7] dark:bg-[#2C2C2E]/60 border-transparent text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-[#1C1C1E] dark:hover:text-[#EBEBF5]"
                    }`}
                  >
                    {tab.icon}
                    <span>
                      {isEn
                        ? tab.labelEn
                        : language === "tr"
                          ? tab.labelTr
                          : tab.labelSr}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider container with animations */}
            {(() => {
              let activeAiRecs: any[] = [];
              try {
                const aiRecsStr = safeStorage.getItem(
                  "abcde_ai_recommended_habits",
                );
                if (aiRecsStr) activeAiRecs = JSON.parse(aiRecsStr) || [];
              } catch (e) {}

              const baseList = BASE_MICROROUTINES;

              // Dynamically shuffle the array deterministically based on the current day
              // so the user sees a varied rotation of suggested microroutines every day.
              const d = new Date();
              const dayBasedSeed =
                d.getFullYear() * 1000 + d.getMonth() * 100 + d.getDate();

              const shuffledBaseList = [...baseList]
                .map((val, i) => {
                  // simple predictable hash
                  const sortScore =
                    ((i + 1) * dayBasedSeed * 17) % baseList.length;
                  return { val, sortScore };
                })
                .sort((a, b) => a.sortScore - b.sortScore)
                .map((a) => a.val);

              const list = [...activeAiRecs, ...shuffledBaseList];

              const filtered =
                recActiveArea === "All"
                  ? list
                  : list.filter((item) => item.area === recActiveArea);
              if (filtered.length === 0) return null;

              const activeIdx = Math.min(recActiveIndex, filtered.length - 1);
              const currentRoutine = filtered[activeIdx];
              const isAdded = habits.some((h) => h.id === currentRoutine.id);
              const isExplaining = explainedRoutineId === currentRoutine.id;

              // Read user and state context for personalization
              const userName =
                safeStorage.getItem("kaizen_morning_username") || "Mirjana";
              const curKaizenState =
                safeStorage.getItem("abcde_kaizen_state") || "BALANCED";

              // Define dynamic, targeted advice blocks based on Mirjana's kognitivno stanje
              let personalizationTextEn = "";
              let personalizationTextSr = "";
              let personalizationTextTr = "";
              if (curKaizenState === "DRAINED") {
                personalizationTextEn = `⚡ Target for ${userName}: Prioritize deep recovery & somatic reset right now.`;
                personalizationTextSr = `⚡ Fokus za Mirjanu: Prioritizuj duboki oporavak i telesno resetovanje sada.`;
                personalizationTextTr = `⚡ ${userName} için Odak: Şu anda derin dinlenme ve bedensel sıfırlamaya öncelik verin.`;
              } else if (curKaizenState === "OVERLOADED") {
                personalizationTextEn = `💼 Target for ${userName}: Declutter environmental & brain noise to prevent burnout.`;
                personalizationTextSr = `💼 Fokus za Mirjanu: Očisti prostor oko sebe da rasteretiš pregrejan um.`;
                personalizationTextTr = `💼 ${userName} için Odak: Aşırı ısınmış zihni rahatlatmak için etrafınızdaki alanı temizleyin.`;
              } else if (curKaizenState === "FOCUSED") {
                personalizationTextEn = `🚀 Target for ${userName}: Push cognitive limits with neuroplastic growth habits.`;
                personalizationTextSr = `🚀 Fokus za Mirjanu: Pokreni kognitivni rast uz navike fokusiranog učenja.`;
                personalizationTextTr = `🚀 ${userName} için Odak: Odaklanmış öğrenme alışkanlıklarıyla bilişsel gelişimi başlatın.`;
              } else {
                personalizationTextEn = `💎 Target for ${userName}: Maintain present balance & regular compound consistency.`;
                personalizationTextSr = `💎 Fokus za Mirjanu: Održi stabilan balans i svakodnevnu doslednost.`;
                personalizationTextTr = `💎 ${userName} için Odak: Dengeli kalın ve her gün tutarlılık gösterin.`;
              }

              return (
                <>
                  <div
                    className="relative p-6 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 space-y-4 text-left cursor-pointer hover:border-black/20 dark:hover:border-white/10 hover:shadow-md transition-all duration-300"
                    id="micro-routine-slides-card"
                    onClick={() => {
                      const fullIdx = list.findIndex(
                        (item) => item.id === currentRoutine.id,
                      );
                      setZoomedRoutineIndex(
                        fullIdx !== -1 ? fullIdx : activeIdx,
                      );
                    }}
                  >
                    {/* Personalization Banner Badge */}
                    <div className="px-3.5 py-2 rounded-xl bg-[#007AFF]/10 dark:bg-[#007AFF]/15 border border-black/5 dark:border-white/5 flex items-center gap-2 text-[#007AFF] dark:text-[#0A84FF] select-none transition-opacity">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="text-[13px] font-semibold font-sans">
                        {isEn
                          ? personalizationTextEn
                          : language === "tr"
                            ? personalizationTextTr
                            : personalizationTextSr}
                      </span>
                    </div>

                    {/* Card head: category label + status + explanation toggle */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/10 dark:bg-[#1C1C1E] px-2.5 py-1 rounded-md border border-black/5 dark:border-white/5">
                        {(() => {
                          switch (currentRoutine.area) {
                            case "Mental Focus / Mentalni Fokus":
                              return <Brain className="w-3.5 h-3.5" />;
                            case "Physiology / Fiziologija":
                              return <Activity className="w-3.5 h-3.5" />;
                            case "Recovery / Oporavak":
                              return <Moon className="w-3.5 h-3.5" />;
                            case "Environment / Radni Prostor":
                              return <Briefcase className="w-3.5 h-3.5" />;
                            case "Finance / Finansije":
                              return <TrendingUp className="w-3.5 h-3.5" />;
                            case "Social / Društvo":
                              return <Users className="w-3.5 h-3.5" />;
                            case "Health / Ishrana":
                              return <Heart className="w-3.5 h-3.5" />;
                            default:
                              return <Bot className="w-3.5 h-3.5" />;
                          }
                        })()}
                        {getRoutineAreaLabel(currentRoutine)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[13px] font-semibold shrink-0 px-2.5 py-1 rounded-sm ${
                            isAdded
                              ? "bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium dark:bg-white/5"
                              : "bg-black/5 dark:bg-white/5 text-black dark:text-white"
                          }`}
                        >
                          {isAdded
                            ? isEn
                              ? "Active"
                              : language === "tr"
                                ? "Aktif"
                                : "Aktivno"
                            : isEn
                              ? "Recommended"
                              : language === "tr"
                                ? "Tavsiye edilen"
                                : "Preporučeno"}
                        </span>
                      </div>
                    </div>

                    {/* Body area */}
                    <div className="space-y-2 py-1">
                      <h5 className="text-base sm:text-lg font-semibold text-black dark:text-white leading-snug">
                        {getRoutineName(currentRoutine)}
                      </h5>
                      <p className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal bg-[#F2F2F7] dark:bg-[#000000]/10 p-2.5 rounded-xl border border-dotted border-black/5 dark:border-white/5">
                        <span className="text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-semibold block mb-1">
                          🚀{" "}
                          {isEn
                            ? "2-MINUTE MICRO ACTION:"
                            : language === "tr"
                              ? "2 DAKİKALIK MİKRO EYLEM:"
                              : "ZAKON 2 MINUTA (MIKRO AKCIJA):"}
                        </span>{" "}
                        {getRoutineTwoMin(currentRoutine)}
                      </p>
                    </div>

                    {/* Redesigned Inviting Scientific Expander Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExplainedRoutineId(
                            isExplaining ? null : currentRoutine.id,
                          );
                        }}
                        className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-all duration-300 cursor-pointer ${
                          isExplaining
                            ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 dark:bg-[#FF9500] dark:bg-[#FF9F0A]/20 dark:text-[#FF9500]"
                            : "bg-[#007AFF]/10 dark:bg-[#1C1C1E] text-[#007AFF] dark:text-[#0A84FF] active:opacity-70 transition-opacity dark:hover:bg-white/10 dark:bg-white/5 border border-black/5 dark:border-white/5"
                        }`}
                        title={
                          isEn
                            ? "Why do this?"
                            : language === "tr"
                              ? "Bunu neden yapıyorsun?"
                              : "Zašto ovo raditi?"
                        }
                      >
                        <span>💡</span>
                        <span>
                          {isExplaining
                            ? isEn
                              ? "Hide Scientific Basis"
                              : language === "tr"
                                ? "Bilimsel Temeli Gizle"
                                : "Zatvori Naučno Objašnjenje"
                            : isEn
                              ? "Read Scientific Basis & Physiology"
                              : language === "tr"
                                ? "Bilimsel Temelleri ve Fizyolojiyi Okuyun"
                                : "Pročitaj Naučnu Bazu i Fiziologiju"}
                        </span>
                      </button>
                    </div>

                    {/* Expanding framed "Why" Scientific Box */}
                    <AnimatePresence>
                      {isExplaining && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border border-[#FF9500]/20 dark:border-[#FF9F0A]/20 rounded-xl space-y-2 text-left mt-1">
                            <span className="text-[13px] font-semibold text-[#FF9500] dark:text-[#FF9500] block">
                              🔬{" "}
                              {isEn
                                ? "NEUROLOGICAL & PHYSIOLOGICAL LEVERAGE:"
                                : language === "tr"
                                  ? "NÖROLOJİK VE FİZYOLOJİK KALDIRAÇ:"
                                  : "NEUROLOŠKA I FIZIOLOŠKA POZADINA:"}
                            </span>
                            <p className="text-[13px] font-medium text-[#FF9500] dark:text-[#FF9500] leading-relaxed">
                              {getRoutineWhy(currentRoutine)}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Add action + Left/Right Indicators */}
                    <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3.5 mt-2 gap-2">
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecActiveIndex((prev) =>
                              prev === 0 ? filtered.length - 1 : prev - 1,
                            );
                            setExplainedRoutineId(null);
                          }}
                          className="p-1 px-1.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-lg hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Dots indicators */}
                        <div className="flex items-center gap-1.2 px-1 text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                          <span>
                            {activeIdx + 1}/{filtered.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecActiveIndex((prev) =>
                              prev === filtered.length - 1 ? 0 : prev + 1,
                            );
                            setExplainedRoutineId(null);
                          }}
                          className="p-1 px-1.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-lg hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newH: CustomHabit = {
                            id: currentRoutine.id,
                            name: getRoutineName(currentRoutine),
                            twoMinVersion: getRoutineTwoMin(currentRoutine),
                            isTwoMinActive: false,
                          };
                          setHabits((prev) => [...prev, newH]);
                        }}
                        className={`px-4 py-2 rounded-xl font-semibold text-xs cursor-pointer flex items-center gap-1 transition-all active:scale-95 ${
                          isAdded
                            ? "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 border border-black/5 dark:border-white/5 opacity-65 cursor-not-allowed font-medium dark:bg-white/5"
                            : "bg-[#007AFF] active:opacity-70 transition-opacity text-white font-medium"
                        }`}
                      >
                        {isAdded
                          ? isEn
                            ? "Already Tracking"
                            : language === "tr"
                              ? "Zaten Takip Ediyorum"
                              : "Već pratiš"
                          : isEn
                            ? "Commit to habit +"
                            : language === "tr"
                              ? "Alışkanlığa bağlı kalın +"
                              : "Prihvati naviku +"}
                      </button>
                    </div>
                  </div>

                  {/* ZOOMED CARD APPLE HIG CAROUSEL MODAL OVERLAY */}
                  <AnimatePresence>
                    {zoomedRoutineIndex !== null && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 dark:bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setZoomedRoutineIndex(null)}
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0, y: 30 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.9, opacity: 0, y: 30 }}
                          transition={{
                            type: "spring",
                            damping: 28,
                            stiffness: 300,
                          }}
                          className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-[24px] border border-black/5 dark:border-white/5 shadow-2xl p-6 relative flex flex-col gap-5 overflow-y-auto max-h-[90vh] select-none"
                          onClick={(e) => e.stopPropagation()}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.4}
                          onDragEnd={(event, info) => {
                            const threshold = 60;
                            if (list.length <= 1) return;
                            if (info.offset.x < -threshold) {
                              // Next card (Swipe Left)
                              setZoomedRoutineIndex(
                                (prev) => (prev! + 1) % list.length,
                              );
                            } else if (info.offset.x > threshold) {
                              // Prev card (Swipe Right)
                              setZoomedRoutineIndex(
                                (prev) =>
                                  (prev! - 1 + list.length) % list.length,
                              );
                            }
                          }}
                        >
                          {/* Top Row: Meta & Close Button */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/10 dark:bg-white/5 px-3 py-1 rounded-full border border-black/5 dark:border-white/5">
                              {getRoutineAreaLabel(list[zoomedRoutineIndex])}
                            </span>
                            <button
                              type="button"
                              onClick={() => setZoomedRoutineIndex(null)}
                              className="w-8 h-8 rounded-full bg-[#8E8E93]/10 dark:bg-white/10 hover:bg-[#8E8E93]/20 dark:hover:bg-white dark:bg-[#1C1C1E]/20 flex items-center justify-center text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Main Content Info block */}
                          <div className="space-y-4">
                            <span className="text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-normal block font-mono font-bold">
                              {isEn
                                ? "Swipe left or right to browse all"
                                : language === "tr"
                                  ? "Tümüne göz atmak için sola veya sağa kaydırın"
                                  : "Listajte levo ili desno kroz sve kategorije"}
                            </span>
                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white leading-tight">
                              {getRoutineName(list[zoomedRoutineIndex])}
                            </h3>

                            {/* 2-minute action */}
                            <div className="p-4 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-2xl border border-[#007AFF]/10">
                              <span className="text-xs font-bold text-[#007AFF] dark:text-[#0A84FF] block mb-1">
                                🚀{" "}
                                {isEn
                                  ? "2-MINUTE MICRO ACTION"
                                  : language === "tr"
                                    ? "2 DAKİKALIK MİKRO EYLEM"
                                    : "ZAKON 2 MINUTA (MIKRO AKCIJA)"}
                              </span>
                              <p className="text-sm font-medium text-black dark:text-white leading-relaxed">
                                {getRoutineTwoMin(list[zoomedRoutineIndex])}
                              </p>
                            </div>

                            {/* Neurological backing */}
                            <div className="p-4 bg-[#FF9500]/5 dark:bg-[#FF9500]/10 rounded-2xl border border-[#FF9500]/10 space-y-1">
                              <span className="text-xs font-bold text-[#FF9500] dark:text-[#FF9D00] block border-b border-transparent">
                                🔬{" "}
                                {isEn
                                  ? "NEUROLOGICAL & PHYSIOLOGICAL LEVERAGE"
                                  : language === "tr"
                                    ? "NÖROLOJİK VE FİZYOLOJİK KALDIRAÇ"
                                    : "NEUROLOŠKA I FIZIOLOŠKA POZADINA"}
                              </span>
                              <p className="text-[13px] text-[#8E8E93] dark:text-[#EBEBF5]/60 leading-relaxed font-semibold">
                                {getRoutineWhy(list[zoomedRoutineIndex])}
                              </p>
                            </div>
                          </div>

                          {/* Bottom: Commitment Toggle & Indicator controls */}
                          <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-4 mt-2">
                            {/* Navigation Pagers */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomedRoutineIndex(
                                    (prev) =>
                                      (prev! - 1 + list.length) % list.length,
                                  )
                                }
                                className="p-2 bg-[#8E8E93]/10 hover:bg-[#8E8E93]/20 dark:bg-white/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-xl text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 px-1 font-mono">
                                {zoomedRoutineIndex + 1} / {list.length}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomedRoutineIndex(
                                    (prev) => (prev! + 1) % list.length,
                                  )
                                }
                                className="p-2 bg-[#8E8E93]/10 hover:bg-[#8E8E93]/20 dark:bg-white/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-xl text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Commitment Toggle button */}
                            <button
                              type="button"
                              disabled={habits.some(
                                (h) => h.id === list[zoomedRoutineIndex!].id,
                              )}
                              onClick={() => {
                                const selected = list[zoomedRoutineIndex!];
                                if (habits.some((h) => h.id === selected.id))
                                  return;
                                const newH: CustomHabit = {
                                  id: selected.id,
                                  name: getRoutineName(selected),
                                  twoMinVersion: getRoutineTwoMin(selected),
                                  isTwoMinActive: false,
                                };
                                setHabits((prev) => [...prev, newH]);
                              }}
                              className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 ${
                                habits.some(
                                  (h) => h.id === list[zoomedRoutineIndex!].id,
                                )
                                  ? "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:opacity-100 cursor-not-allowed border border-black/5 dark:border-white/5"
                                  : "bg-[#007AFF] text-white hover:opacity-90 shadow-sm"
                              }`}
                            >
                              {habits.some(
                                (h) => h.id === list[zoomedRoutineIndex!].id,
                              ) ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  {isEn
                                    ? "Tracking"
                                    : language === "tr"
                                      ? "Takip"
                                      : "Prati se"}
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  {isEn
                                    ? "Commit to habit"
                                    : language === "tr"
                                      ? "Alışkanlığa bağlı kalın"
                                      : "Prihvati naviku"}
                                </>
                              )}
                            </button>
                          </div>

                          {/* Page Control Indicator Dot Dots at visual bottom */}
                          <div className="flex justify-center gap-1.5 mt-1 border-t border-transparent pt-1">
                            {list.map((_, dotIdx) => (
                              <span
                                key={dotIdx}
                                onClick={() => setZoomedRoutineIndex(dotIdx)}
                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                  dotIdx === zoomedRoutineIndex
                                    ? "w-4 bg-[#007AFF]"
                                    : "w-1.5 bg-[#8E8E93]/35"
                                }`}
                              />
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              );
            })()}
          </div>
        </div>

        {/* Right pane: GitHub Heatmap Grid of the 90 days (Never Break the Chain) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
            <div>
              <h4 className="text-sm font-semibold text-black dark:text-white">
                📈{" "}
                {isEn
                  ? "Activity Heatmap Matrix"
                  : language === "tr"
                    ? "Etkinlik Isı Haritası Matrisi"
                    : "Mreža konzistentnosti (90 Dana)"}
              </h4>
              <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                {isEn
                  ? "90-day progress timeline. Darker circles represent higher habit compliance."
                  : language === "tr"
                    ? "90 günlük ilerleme zaman çizelgesi. Koyu halkalar daha yüksek alışkanlık uyumluluğunu temsil eder."
                    : "90 dana kontinuiteta. Tamniji krugovi označavaju veći broj štrikliranih navika."}
              </p>
            </div>
            <button
              onClick={handleResetLogs}
              className="text-[13px] p-1.5 px-2.5 border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 rounded-lg font-medium transition-all shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 inline-block mr-1" />
              {t.btnResetAll}
            </button>
          </div>

          <div className="p-4 bg-[#F2F2F7] dark:bg-[#000000]/40 border border-black/5 dark:border-white/5 rounded-xl">
            {/* Visual calendar grid map */}
            <div
              className="flex flex-wrap gap-1.5 justify-center sm:grid sm:grid-cols-10 md:grid-cols-[15] gap-y-2"
              id="atomic-heatmap-grid"
            >
              {past90Dates.map((d, rawIdx) => {
                const dayLogs = logs[d.dateStr] || [];
                const logCount = dayLogs.length;
                const isSelected = selectedDateStr === d.dateStr;

                // Color code density based on compliance percentage
                let colorClass =
                  "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80";
                if (logCount > 0) {
                  const percentage = logCount / habits.length;
                  if (percentage <= 0.25) {
                    colorClass =
                      "bg-[#007AFF]/20 dark:bg-[#0A84FF]/20 border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF]";
                  } else if (percentage <= 0.5) {
                    colorClass =
                      "bg-[#007AFF]/40 dark:bg-[#0A84FF]/40 border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF]";
                  } else if (percentage <= 0.75) {
                    colorClass =
                      "bg-[#007AFF]/70 dark:bg-[#0A84FF]/70 border-black/5 dark:border-white/5 text-white";
                  } else {
                    colorClass =
                      "bg-[#007AFF] dark:bg-[#0A84FF] border-black/5 dark:border-white/5 text-white";
                  }
                }

                return (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDateStr(d.dateStr)}
                    title={`${isEn ? "Day" : language === "tr" ? "Gün" : "Dan"} ${rawIdx + 1} (${d.label}) - ${logCount} ${t.completedCount}`}
                    className={`w-9 h-9 rounded-full text-[13px] font-semibold flex items-center justify-center transition-all cursor-pointer border ${colorClass} ${
                      isSelected
                        ? "ring-2 ring-offset-1 ring-[#FF9500] dark:ring-offset-transparent z-10"
                        : ""
                    }`}
                  >
                    {rawIdx + 1}
                  </button>
                );
              })}
            </div>

            {/* Grid Legend */}
            <div className="flex justify-between items-center text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium border-t border-black/5 dark:border-white/5 pt-3 mt-3 px-1">
              <span>{t.gridLegend}:</span>
              <div className="flex items-center gap-1.5">
                <span>{t.legendLess}</span>
                <span className="w-3 h-3 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5" />
                <span className="w-3 h-3 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/20 border border-black/5 dark:border-white/5" />
                <span className="w-3 h-3 rounded-full bg-[#007AFF]/40 dark:bg-[#0A84FF]/40 border border-black/5 dark:border-white/5" />
                <span className="w-3 h-3 rounded-full bg-[#007AFF]/70 dark:bg-[#0A84FF]/70 border border-black/5 dark:border-white/5" />
                <span className="w-3 h-3 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] border border-black/5 dark:border-white/5" />
                <span>{t.legendMore}</span>
              </div>
            </div>
          </div>

          {/* Simple Motivational advice */}
          <div className="p-4 bg-[#007AFF]/60 rounded-xl border border-black/5 dark:border-white/5 mt-2 space-y-1">
            <h5 className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] flex items-center gap-1">
              <Award className="w-4 h-4 text-[#FF9500]" />
              <span>
                {isEn
                  ? "The Rule of System Leverage"
                  : language === "tr"
                    ? "Sistem Kaldıracı Kuralı"
                    : "Dnevna poruka o doslednosti"}
              </span>
            </h5>
            <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-medium">
              {isEn
                ? "Checking off just ONE habit is better than checking off zero. On heavy days, reduce goals to their easiest micro-routine but NEVER miss twice. That is the iron law of our consistency systems."
                : language === "tr"
                  ? "Yalnızca BİR alışkanlığı işaretlemek, sıfırı işaretlemekten daha iyidir. Yoğun günlerde, hedefleri en kolay mikro rutine düşürün, ancak ASLA iki kere kaçırmayın. Tutarlılık sistemlerimizin demir kanunu budur."
                  : "Čak i kada popunite samo jedan krug, uspešniji ste nego da niste ništa uradili. Za teške dane, prebacite se u režim mikro-koraka ali NIKADA ne preskačite obavezu dva dana zaredom!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
