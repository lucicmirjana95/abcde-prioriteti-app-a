import type { AppALanguage } from "../../types";

export interface ResetExperienceCopy {
  name: string;
  shortDesc: string;
  detailDesc: string;
  phaseInhale: string;
  phaseHoldFull: string;
  phaseExhale: string;
  phaseHoldEmpty: string;
  phaseFirstInhale: string;
  phaseTopupInhale: string;
  stageSettle: string;
  stageBodyAttention: string;
  stageQuietRest: string;
  stageGradualReturn: string;
}

export interface ResetCommonCopy {
  sectionTitle: string;
  sectionSubtitle: string;
  safetyBannerTitle: string;
  safetyBannerText: string;
  start: string;
  pause: string;
  resume: string;
  restart: string;
  stop: string;
  soundOn: string;
  soundOff: string;
  reducedMotionBadge: string;
  completedTitle: string;
  completedSubtitle: string;
  completedReturnButton: string;
  cycleLabel: string;
  remainingLabel: string;
  totalTimeLabel: string;
  preset1Min: string;
  preset3Min: string;
  presetCycles: (count: number) => string;
  presetBox4: string;
  presetBox8: string;
  presetBox12: string;
}

export const RESET_LOCALIZATION: Record<
  AppALanguage,
  {
    common: ResetCommonCopy;
    balancedBox: ResetExperienceCopy;
    longerExhale: ResetExperienceCopy;
    doubleInhale: ResetExperienceCopy;
    guidedRest: ResetExperienceCopy;
  }
> = {
  en: {
    common: {
      sectionTitle: "Reset sessions",
      sectionSubtitle: "Optional support for a short pause or steadier focus.",
      safetyBannerTitle: "Comfort & safety note",
      safetyBannerText:
        "Breathe comfortably and never force or strain. Stop and return to normal breathing at any time if you feel dizzy, uncomfortable, short of breath, or distressed. This is not medical care.",
      start: "Start session",
      pause: "Pause",
      resume: "Resume",
      restart: "Restart",
      stop: "Stop session",
      soundOn: "Sound on",
      soundOff: "Sound off",
      reducedMotionBadge: "Reduced motion enabled",
      completedTitle: "Session finished",
      completedSubtitle: "You have completed this reset. Take a moment before returning to your day.",
      completedReturnButton: "Return to reset menu",
      cycleLabel: "Cycle",
      remainingLabel: "Remaining",
      totalTimeLabel: "Duration",
      preset1Min: "1 min",
      preset3Min: "3 min",
      presetCycles: (count: number) => `${count} cycle${count === 1 ? "" : "s"}`,
      presetBox4: "4 cycles — 1:04",
      presetBox8: "8 cycles — 2:08",
      presetBox12: "12 cycles — 3:12",
    },
    balancedBox: {
      name: "Balanced Box",
      shortDesc: "Equal 4-4-4-4 rhythm for a steady, grounded pause.",
      detailDesc: "Inhale, hold gently, exhale, and hold empty for four equal counts.",
      phaseInhale: "Inhale gently",
      phaseHoldFull: "Hold gently",
      phaseExhale: "Exhale slowly",
      phaseHoldEmpty: "Hold empty",
      phaseFirstInhale: "Inhale",
      phaseTopupInhale: "Top up",
      stageSettle: "Settle in",
      stageBodyAttention: "Body attention",
      stageQuietRest: "Quiet rest",
      stageGradualReturn: "Gradual return",
    },
    longerExhale: {
      name: "Gentle Longer Exhale",
      shortDesc: "4-second inhale with an extended 6-second exhale.",
      detailDesc: "A continuous flow with no breath hold, giving extra time to the exhale.",
      phaseInhale: "Inhale smoothly",
      phaseHoldFull: "Hold",
      phaseExhale: "Exhale slowly",
      phaseHoldEmpty: "Hold",
      phaseFirstInhale: "Inhale",
      phaseTopupInhale: "Top up",
      stageSettle: "Settle in",
      stageBodyAttention: "Body attention",
      stageQuietRest: "Quiet rest",
      stageGradualReturn: "Gradual return",
    },
    doubleInhale: {
      name: "Short Double-Inhale Reset",
      shortDesc: "Two comfortable inhales followed by one long, easy exhale.",
      detailDesc: "A gentle nasal inhale, a small top-up inhale, then a slow relaxed exhale. 1 to 3 cycles.",
      phaseInhale: "Inhale",
      phaseHoldFull: "Hold",
      phaseExhale: "Slow, comfortable exhale",
      phaseHoldEmpty: "Hold",
      phaseFirstInhale: "Gentle nasal inhale",
      phaseTopupInhale: "Small second top-up inhale",
      stageSettle: "Settle in",
      stageBodyAttention: "Body attention",
      stageQuietRest: "Quiet rest",
      stageGradualReturn: "Gradual return",
    },
    guidedRest: {
      name: "Guided Deep Rest",
      shortDesc: "10-minute text-guided pause for still attention and quiet rest.",
      detailDesc: "A structured pause through settling, gentle body attention, quiet rest, and a gradual return.",
      phaseInhale: "Breathe naturally",
      phaseHoldFull: "Rest",
      phaseExhale: "Release",
      phaseHoldEmpty: "Rest",
      phaseFirstInhale: "Breathe naturally",
      phaseTopupInhale: "Rest",
      stageSettle: "Settle in comfortably and let your body become still.",
      stageBodyAttention: "Notice and soften your forehead, jaw, shoulders, hands, and legs.",
      stageQuietRest: "Rest quietly. Let thoughts and sounds come and go without following them.",
      stageGradualReturn: "Notice the room around you and return gently whenever you are ready.",
    },
  },
  sr: {
    common: {
      sectionTitle: "Sesije za predah",
      sectionSubtitle: "Opciona podrška za kratku pauzu ili stabilniji fokus.",
      safetyBannerTitle: "Napomena o udobnosti i bezbednosti",
      safetyBannerText:
        "Dišite udobno i nikada nemojte forsirati niti naprezati dah. Prekinite i vratite se prirodnom disanju u bilo kom trenutku ako osetite vrtoglavicu, nelagodu, nedostatak vazduha ili uznemirenost. Ovo nije medicinska nega.",
      start: "Započni sesiju",
      pause: "Pauziraj",
      resume: "Nastavi",
      restart: "Ponovi",
      stop: "Završi sesiju",
      soundOn: "Zvuk uključen",
      soundOff: "Zvuk isključen",
      reducedMotionBadge: "Smanjene animacije uključene",
      completedTitle: "Sesija završena",
      completedSubtitle: "Završili ste ovaj predah. Odvojite trenutak pre nego što nastavite sa danom.",
      completedReturnButton: "Povratak na izbor sesija",
      cycleLabel: "Ciklus",
      remainingLabel: "Preostalo",
      totalTimeLabel: "Trajanje",
      preset1Min: "1 min",
      preset3Min: "3 min",
      presetCycles: (count: number) => `${count} ${count === 1 ? "ciklus" : count < 5 ? "ciklusa" : "ciklusa"}`,
      presetBox4: "4 ciklusa — 1:04",
      presetBox8: "8 ciklusa — 2:08",
      presetBox12: "12 ciklusa — 3:12",
    },
    balancedBox: {
      name: "Uravnotežena kutija",
      shortDesc: "Jednak 4-4-4-4 ritam za stabilnu i prizemljenu pauzu.",
      detailDesc: "Udahnite, zadržite nežno, izdahnite i zadržite prazno po četiri jednaka brojanja.",
      phaseInhale: "Udahnite nežno",
      phaseHoldFull: "Zadržite nežno",
      phaseExhale: "Izdahnite polako",
      phaseHoldEmpty: "Zadržite na izdisaju",
      phaseFirstInhale: "Udah",
      phaseTopupInhale: "Dopunski udah",
      stageSettle: "Smirivanje",
      stageBodyAttention: "Pažnja na telo",
      stageQuietRest: "Tihi odmor",
      stageGradualReturn: "Postepeni povratak",
    },
    longerExhale: {
      name: "Blagi duži izdah",
      shortDesc: "Udah od 4 sekunde uz produženi izdah od 6 sekundi.",
      detailDesc: "Kontinuirani tok bez zadržavanja daha, pružajući više vremena izdisaju.",
      phaseInhale: "Udahnite ujednačeno",
      phaseHoldFull: "Pauza",
      phaseExhale: "Izdahnite polako",
      phaseHoldEmpty: "Pauza",
      phaseFirstInhale: "Udah",
      phaseTopupInhale: "Dopunski udah",
      stageSettle: "Smirivanje",
      stageBodyAttention: "Pažnja na telo",
      stageQuietRest: "Tihi odmor",
      stageGradualReturn: "Postepeni povratak",
    },
    doubleInhale: {
      name: "Kratki dvostruki udah",
      shortDesc: "Dva udobna udaha praćena jednim dugim, opuštenim izdahom.",
      detailDesc: "Blag udah na nos, mali dopunski udah, pa spor i opušten izdah. 1 do 3 ciklusa.",
      phaseInhale: "Udah",
      phaseHoldFull: "Pauza",
      phaseExhale: "Spor, udoban izdah",
      phaseHoldEmpty: "Pauza",
      phaseFirstInhale: "Blag udah kroz nos",
      phaseTopupInhale: "Mali drugi dopunski udah",
      stageSettle: "Smirivanje",
      stageBodyAttention: "Pažnja na telo",
      stageQuietRest: "Tihi odmor",
      stageGradualReturn: "Postepeni povratak",
    },
    guidedRest: {
      name: "Vođeni duboki odmor",
      shortDesc: "10-minutna tekstualno vođena pauza za pažnju u miru i odmor.",
      detailDesc: "Strukturisana pauza kroz smirivanje, blagu pažnju na telo, tihi odmor i postepeni povratak.",
      phaseInhale: "Dišite prirodno",
      phaseHoldFull: "Odmor",
      phaseExhale: "Otpustite",
      phaseHoldEmpty: "Odmor",
      phaseFirstInhale: "Dišite prirodno",
      phaseTopupInhale: "Odmor",
      stageSettle: "Namestite se udobno i dozvolite telu da se umiri.",
      stageBodyAttention: "Primetite i opustite čelo, vilicu, ramena, šake i noge.",
      stageQuietRest: "Odmarajte u tišini. Pustite misli i zvuke da dođu i prođu bez praćenja.",
      stageGradualReturn: "Ponovo primetite prostor oko sebe i vratite se polako kada budete spremni.",
    },
  },
  tr: {
    common: {
      sectionTitle: "Mola oturumları",
      sectionSubtitle: "Kısa bir mola veya daha dengeli bir odaklanma için isteğe bağlı destek.",
      safetyBannerTitle: "Konfor ve güvenlik notu",
      safetyBannerText:
        "Rahatça nefes alın ve nefesinizi asla zorlamayın. Baş dönmesi, rahatsızlık, nefes darlığı veya sıkıntı hissederseniz istediğiniz an durup normal nefesinize dönün. Bu bir tıbbi bakım değildir.",
      start: "Oturumu başlat",
      pause: "Duraklat",
      resume: "Devam et",
      restart: "Yeniden başlat",
      stop: "Oturumu sonlandır",
      soundOn: "Ses açık",
      soundOff: "Ses kapalı",
      reducedMotionBadge: "Azaltılmış hareket etkin",
      completedTitle: "Oturum tamamlandı",
      completedSubtitle: "Bu molayı tamamladınız. Gününüze dönmeden önce biraz dinlenin.",
      completedReturnButton: "Mola menüsüne dön",
      cycleLabel: "Döngü",
      remainingLabel: "Kalan",
      totalTimeLabel: "Süre",
      preset1Min: "1 dk",
      preset3Min: "3 dk",
      presetCycles: (count: number) => `${count} döngü`,
      presetBox4: "4 döngü — 1:04",
      presetBox8: "8 döngü — 2:08",
      presetBox12: "12 döngü — 3:12",
    },
    balancedBox: {
      name: "Dengeli Kutu",
      shortDesc: "Dengeli ve sakin bir mola için eşit 4-4-4-4 ritmi.",
      detailDesc: "Dört eşit sayıda nefes alın, nazikçe tutun, verin ve boşlukta tutun.",
      phaseInhale: "Nazikçe nefes alın",
      phaseHoldFull: "Nazikçe tutun",
      phaseExhale: "Yavaşça nefes verin",
      phaseHoldEmpty: "Boşlukta tutun",
      phaseFirstInhale: "Nefes alın",
      phaseTopupInhale: "Tamamlayıcı nefes",
      stageSettle: "Yerleşin",
      stageBodyAttention: "Beden dikkati",
      stageQuietRest: "Sessiz dinlenme",
      stageGradualReturn: "Kademeli dönüş",
    },
    longerExhale: {
      name: "Nazik Uzun Nefes Verme",
      shortDesc: "4 saniyelik nefes alma ve 6 saniyelik uzatılmış nefes verme.",
      detailDesc: "Nefes tutmadan sürekli bir akış, nefes vermeye ekstra zaman tanır.",
      phaseInhale: "Akıcı nefes alın",
      phaseHoldFull: "Tutun",
      phaseExhale: "Yavaşça nefes verin",
      phaseHoldEmpty: "Tutun",
      phaseFirstInhale: "Nefes alın",
      phaseTopupInhale: "Tamamlayıcı nefes",
      stageSettle: "Yerleşin",
      stageBodyAttention: "Beden dikkati",
      stageQuietRest: "Sessiz dinlenme",
      stageGradualReturn: "Kademeli dönüş",
    },
    doubleInhale: {
      name: "Kısa Çift Nefesli Sıfırlama",
      shortDesc: "İki rahat nefes almayı takip eden uzun, rahat bir nefes verme.",
      detailDesc: "Nazik burun nefesi, küçük bir tamamlayıcı nefes ve ardından yavaş, rahat bir nefes verme. 1 ila 3 döngü.",
      phaseInhale: "Nefes alın",
      phaseHoldFull: "Tutun",
      phaseExhale: "Yavaş ve rahatça nefes verin",
      phaseHoldEmpty: "Tutun",
      phaseFirstInhale: "Nazikçe burundan nefes alın",
      phaseTopupInhale: "Küçük ikinci tamamlayıcı nefes",
      stageSettle: "Yerleşin",
      stageBodyAttention: "Beden dikkati",
      stageQuietRest: "Sessiz dinlenme",
      stageGradualReturn: "Kademeli dönüş",
    },
    guidedRest: {
      name: "Rehberli Derin Dinlenme",
      shortDesc: "Sakin dikkat ve dinlenme için 10 dakikalık metin rehberli mola.",
      detailDesc: "Yerleşme, nazik beden dikkati, sessiz dinlenme ve kademeli dönüş ile yapılandırılmış bir mola.",
      phaseInhale: "Doğal nefes alın",
      phaseHoldFull: "Dinlenin",
      phaseExhale: "Bırakın",
      phaseHoldEmpty: "Dinlenin",
      phaseFirstInhale: "Doğal nefes alın",
      phaseTopupInhale: "Dinlenin",
      stageSettle: "Rahat bir pozisyon bulun ve bedeninizin sakinleşmesine izin verin.",
      stageBodyAttention: "Alnınızı, çenenizi, omuzlarınızı, ellerinizi ve bacaklarınızı fark edip gevşetin.",
      stageQuietRest: "Sessizce dinlenin. Düşüncelerin ve seslerin peşinden gitmeden gelip geçmesine izin verin.",
      stageGradualReturn: "Çevrenizdeki odayı yeniden fark edin ve hazır olduğunuzda yavaşça geri dönün.",
    },
  },
};
