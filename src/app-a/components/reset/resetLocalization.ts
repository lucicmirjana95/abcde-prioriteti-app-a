import type { AppALanguage } from "../../types";

export interface ResetExperienceCopy {
  name: string;
  shortDesc: string;
  detailDesc: string;
  bestFor: string;
  whyItMayHelp: string;
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

export interface GuidedRestAudioCopy {
  title: string;
  enableSwitch: string;
  soundOn: string;
  soundOff: string;
  testSound: string;
  stopTest: string;
  volumeLabel: string;
  statusLabel: string;
  statusReady: string;
  statusPlaying: string;
  statusPaused: string;
  statusBlocked: string;
  statusUnavailable: string;
  stereoExplanation: string;
  headphonesNote: string;
  errorMessage: string;
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
  choosePrompt: string;
  infoLabel: string;
  whyTitle: string;
  beginnerBadge: string;
  boxTiming: string;
  exhaleTiming: string;
  guidedCycles: string;
  guidedRestDuration: string;
  restSoundEnabled: string;
  restSoundDisabled: string;
  restSoundPlaying: string;
  restSoundFailed: string;
}

export const RESET_LOCALIZATION: Record<
  AppALanguage,
  {
    common: ResetCommonCopy;
    balancedBox: ResetExperienceCopy;
    longerExhale: ResetExperienceCopy;
    doubleInhale: ResetExperienceCopy;
    guidedRest: ResetExperienceCopy;
    guidedRestAudio: GuidedRestAudioCopy;
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
      choosePrompt: "What do you need right now?",
      infoLabel: "About this session",
      whyTitle: "Why this may help",
      beginnerBadge: "Easiest to start",
      boxTiming: "4–12 cycles (1:04–3:12) • 4-4-4-4",
      exhaleTiming: "4 sec inhale • 6 sec exhale",
      guidedCycles: "1–3 guided cycles",
      guidedRestDuration: "10 minutes • Text-guided",
      restSoundEnabled: "4 Hz sound enabled",
      restSoundDisabled: "4 Hz sound disabled",
      restSoundPlaying: "4 Hz stereo sound is playing. Best with headphones.",
      restSoundFailed: "Sound did not start. Check browser audio permission and try again.",
    },
    balancedBox: {
      name: "Slow down and steady",
      shortDesc: "Equal 4-4-4-4 breathing when gentle breath holds feel comfortable.",
      detailDesc: "Inhale, hold gently, exhale, and hold empty for four equal counts.",
      bestFor: "Best for: a structured pause when you feel tense or scattered.",
      whyItMayHelp: "Slow, evenly paced breathing can provide a simple attentional anchor. The equal phases make the rhythm predictable; comfort matters more than completing a count.",
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
      name: "Gentle calming breath",
      shortDesc: "A 4-second inhale and 6-second exhale, with no breath hold.",
      detailDesc: "A continuous flow with no breath hold, giving extra time to the exhale.",
      bestFor: "Best for: beginners, tired moments, or anyone who dislikes breath holds.",
      whyItMayHelp: "A slower exhale can make breathing feel calmer and more regular. This version avoids holds, which many people find easier and more comfortable.",
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
      name: "Quick refresh",
      shortDesc: "Two comfortable inhales followed by one long, easy exhale.",
      detailDesc: "A gentle nasal inhale, a small top-up inhale, then a slow relaxed exhale. 1 to 3 cycles.",
      bestFor: "Best for: a very short pause between tasks.",
      whyItMayHelp: "Two comfortable inhales followed by a longer exhale can briefly interrupt rushed, shallow breathing. Only a few gentle cycles are needed; never force the second inhale.",
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
      name: "10-minute guided rest",
      shortDesc: "10-minute text-guided pause for still attention and quiet rest.",
      detailDesc: "A structured pause through settling, gentle body attention, quiet rest, and a gradual return.",
      bestFor: "Best for: a longer break when you can sit or lie down safely.",
      whyItMayHelp: "Moving attention through the body and then resting quietly can reduce mental effort and support a deliberate transition back to activity. The optional stereo sound is ambient support, not a treatment.",
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
    guidedRestAudio: {
      title: "4 Hz stereo sound",
      enableSwitch: "Enable 4 Hz stereo sound",
      soundOn: "Sound on",
      soundOff: "Sound off",
      testSound: "Test sound",
      stopTest: "Stop test",
      volumeLabel: "Volume",
      statusLabel: "Status",
      statusReady: "Ready",
      statusPlaying: "Playing",
      statusPaused: "Paused",
      statusBlocked: "Blocked",
      statusUnavailable: "Unavailable",
      stereoExplanation: "4 Hz is the difference between the 95 Hz and 99 Hz stereo channels, not an independently audible 4 Hz tone.",
      headphonesNote: "Use stereo headphones for the channel separation effect. Adjust to a gentle volume and stop if uncomfortable.",
      errorMessage: "Audio playback could not be started. Tap the test button or check your browser audio settings.",
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
      choosePrompt: "Šta vam sada treba?",
      infoLabel: "O ovoj sesiji",
      whyTitle: "Zašto ovo može pomoći",
      beginnerBadge: "Najlakše za početak",
      boxTiming: "4–12 ciklusa (1:04–3:12) • 4-4-4-4",
      exhaleTiming: "Udah 4 sek • izdah 6 sek",
      guidedCycles: "1–3 vođena ciklusa",
      guidedRestDuration: "10 minuta • Tekstualno vođenje",
      restSoundEnabled: "4 Hz zvuk omogućen",
      restSoundDisabled: "4 Hz zvuk isključen",
      restSoundPlaying: "4 Hz stereo zvuk se reprodukuje. Najbolje uz slušalice.",
      restSoundFailed: "Zvuk nije pokrenut. Proverite dozvolu za zvuk u pregledaču i pokušajte ponovo.",
    },
    balancedBox: {
      name: "Usporite i umirite ritam",
      shortDesc: "Jednak ritam 4-4-4-4 kada vam prija blago zadržavanje daha.",
      detailDesc: "Udahnite, zadržite nežno, izdahnite i zadržite prazno po četiri jednaka brojanja.",
      bestFor: "Najbolje za: strukturisanu pauzu kada ste napeti ili rasuti.",
      whyItMayHelp: "Sporo i ravnomerno disanje može pružiti jednostavan oslonac za pažnju. Jednake faze čine ritam predvidljivim; udobnost je važnija od završavanja brojanja.",
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
      name: "Blago umirujuće disanje",
      shortDesc: "Udah od 4 sekunde uz produženi izdah od 6 sekundi.",
      detailDesc: "Kontinuirani tok bez zadržavanja daha, pružajući više vremena izdisaju.",
      bestFor: "Najbolje za: početnike, umor ili kada vam zadržavanje daha ne prija.",
      whyItMayHelp: "Sporiji izdah može učiniti disanje mirnijim i pravilnijim. Ova verzija nema zadržavanje daha, pa je mnogim ljudima lakša i prijatnija.",
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
      name: "Kratko osveženje",
      shortDesc: "Dva udobna udaha praćena jednim dugim, opuštenim izdahom.",
      detailDesc: "Blag udah na nos, mali dopunski udah, pa spor i opušten izdah. 1 do 3 ciklusa.",
      bestFor: "Najbolje za: veoma kratku pauzu između zadataka.",
      whyItMayHelp: "Dva udobna udaha praćena dužim izdahom mogu nakratko prekinuti ubrzano i plitko disanje. Dovoljno je nekoliko blagih ciklusa; drugi udah ne treba forsirati.",
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
      name: "Vođeni odmor od 10 minuta",
      shortDesc: "10-minutna tekstualno vođena pauza za pažnju u miru i odmor.",
      detailDesc: "Strukturisana pauza kroz smirivanje, blagu pažnju na telo, tihi odmor i postepeni povratak.",
      bestFor: "Najbolje za: dužu pauzu kada možete bezbedno da sednete ili legnete.",
      whyItMayHelp: "Usmeravanje pažnje kroz telo, a zatim miran odmor, može smanjiti mentalni napor i olakšati postepen povratak aktivnosti. Opcioni stereo zvuk je ambijentalna podrška, ne terapija.",
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
    guidedRestAudio: {
      title: "4 Hz stereo zvuk",
      enableSwitch: "Uključi 4 Hz stereo zvuk",
      soundOn: "Zvuk uključen",
      soundOff: "Zvuk isključen",
      testSound: "Testiraj zvuk",
      stopTest: "Zaustavi test",
      volumeLabel: "Jačina zvuka",
      statusLabel: "Status",
      statusReady: "Spremno",
      statusPlaying: "Reprodukcija",
      statusPaused: "Pauzirano",
      statusBlocked: "Blokirano",
      statusUnavailable: "Nedostupno",
      stereoExplanation: "4 Hz je razlika između 95 Hz i 99 Hz stereo kanala, a ne samostalno čujan ton od 4 Hz.",
      headphonesNote: "Koristite stereo slušalice za efekat razdvajanja kanala. Podesite blag nivo zvuka i prekinite ako vam ne prija.",
      errorMessage: "Zvuk se ne može pokrenuti. Dodirnite dugme za test ili proverite dozvole za zvuk u pregledaču.",
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
      choosePrompt: "Şu anda neye ihtiyacınız var?",
      infoLabel: "Bu oturum hakkında",
      whyTitle: "Bu neden yardımcı olabilir",
      beginnerBadge: "Başlamak için en kolay",
      boxTiming: "4–12 döngü (1:04–3:12) • 4-4-4-4",
      exhaleTiming: "4 sn nefes al • 6 sn nefes ver",
      guidedCycles: "1–3 yönlendirmeli döngü",
      guidedRestDuration: "10 dakika • Metinle yönlendirme",
      restSoundEnabled: "4 Hz ses etkin",
      restSoundDisabled: "4 Hz ses kapalı",
      restSoundPlaying: "4 Hz stereo ses çalıyor. Kulaklıkla en iyi sonucu verir.",
      restSoundFailed: "Ses başlatılamadı. Tarayıcı ses iznini kontrol edip tekrar deneyin.",
    },
    balancedBox: {
      name: "Yavaşla ve dengelen",
      shortDesc: "Dengeli ve sakin bir mola için eşit 4-4-4-4 ritmi.",
      detailDesc: "Dört eşit sayıda nefes alın, nazikçe tutun, verin ve boşlukta tutun.",
      bestFor: "En uygun: gergin veya dağınık hissettiğinizde yapılandırılmış bir mola.",
      whyItMayHelp: "Yavaş ve eşit tempolu nefes, dikkat için basit bir dayanak sağlayabilir. Eşit aşamalar ritmi öngörülebilir kılar; rahatlık sayıyı tamamlamaktan daha önemlidir.",
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
      name: "Nazik sakinleştirici nefes",
      shortDesc: "4 saniyelik nefes alma ve 6 saniyelik uzatılmış nefes verme.",
      detailDesc: "Nefes tutmadan sürekli bir akış, nefes vermeye ekstra zaman tanır.",
      bestFor: "En uygun: yeni başlayanlar, yorgun anlar veya nefes tutmayı sevmeyenler.",
      whyItMayHelp: "Daha yavaş nefes vermek, solunumu daha sakin ve düzenli hissettirebilir. Nefes tutma olmadığı için birçok kişi bu sürümü daha kolay bulur.",
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
      name: "Hızlı yenilenme",
      shortDesc: "İki rahat nefes almayı takip eden uzun, rahat bir nefes verme.",
      detailDesc: "Nazik burun nefesi, küçük bir tamamlayıcı nefes ve ardından yavaş, rahat bir nefes verme. 1 ila 3 döngü.",
      bestFor: "En uygun: görevler arasında çok kısa bir mola.",
      whyItMayHelp: "İki rahat nefes alıp ardından daha uzun nefes vermek, aceleci ve sığ solunumu kısa süreliğine kesebilir. Birkaç nazik döngü yeterlidir; ikinci nefesi zorlamayın.",
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
      name: "10 dakikalık rehberli dinlenme",
      shortDesc: "Sakin dikkat ve dinlenme için 10 dakikalık metin rehberli mola.",
      detailDesc: "Yerleşme, nazik beden dikkati, sessiz dinlenme ve kademeli dönüş ile yapılandırılmış bir mola.",
      bestFor: "En uygun: güvenle oturabileceğiniz veya uzanabileceğiniz daha uzun bir mola.",
      whyItMayHelp: "Dikkati bedende gezdirip ardından sessizce dinlenmek zihinsel çabayı azaltabilir ve aktiviteye bilinçli dönüşü destekleyebilir. İsteğe bağlı stereo ses bir tedavi değil, ortam desteğidir.",
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
    guidedRestAudio: {
      title: "4 Hz stereo ses",
      enableSwitch: "4 Hz stereo sesi etkinleştir",
      soundOn: "Ses açık",
      soundOff: "Ses kapalı",
      testSound: "Sesi test et",
      stopTest: "Testi durdur",
      volumeLabel: "Ses seviyesi",
      statusLabel: "Durum",
      statusReady: "Hazır",
      statusPlaying: "Çalıyor",
      statusPaused: "Duraklatıldı",
      statusBlocked: "Engellendi",
      statusUnavailable: "Kullanılamıyor",
      stereoExplanation: "4 Hz, bağımsız duyulabilir bir ton değil; 95 Hz ve 99 Hz stereo kanalları arasındaki frekans farkıdır.",
      headphonesNote: "Kanal ayrımı etkisi için stereo kulaklık kullanın. Sesi hafif bir seviyede tutun ve rahatsız ederse kapatın.",
      errorMessage: "Ses oynatılamadı. Test düğmesine dokunun veya tarayıcı ses izinlerini kontrol edin.",
    },
  },
};
