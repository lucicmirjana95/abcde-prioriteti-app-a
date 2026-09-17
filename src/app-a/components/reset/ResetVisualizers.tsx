import React from "react";

interface BoxVisualizerProps {
  phase: "inhale" | "hold_full" | "exhale" | "hold_empty";
  phaseElapsedMs: number;
  phaseDurationMs: number;
  prefersReducedMotion: boolean;
  phaseLabel: string;
  countdownSec: number;
}

/**
 * Accessible Square-Path Visualization for Balanced Box (4-4-4-4).
 * 
 * Side 0 (Top, left to right): Inhale (0–4s)
 * Side 1 (Right, top to bottom): Hold Full (4–8s)
 * Side 2 (Bottom, right to left): Exhale (8–12s)
 * Side 3 (Left, bottom to top): Hold Empty (12–16s)
 */
export function BoxVisualizer({
  phase,
  phaseElapsedMs,
  phaseDurationMs,
  prefersReducedMotion,
  phaseLabel,
  countdownSec,
}: BoxVisualizerProps) {
  // Box frame geometry: 190px x 190px rounded rect with rx=28 inside 250px container
  const boxSize = 190;
  const radius = 28;
  const straightLength = boxSize - 2 * radius; // 134px
  const cornerArc = 0.5 * Math.PI * radius; // ~43.98px
  const phaseTotalDist = straightLength + cornerArc; // ~177.98px per phase (equal for all 4 phases)

  const progress = Math.min(1, Math.max(0, phaseDurationMs > 0 ? phaseElapsedMs / phaseDurationMs : 0));
  const distInPhase = progress * phaseTotalDist;

  // Box bounds: centered in 250x250 container -> x: 30..220, y: 30..220
  const minCoord = 30;
  const maxCoord = 220;
  const leftStraight = minCoord + radius; // 58
  const rightStraight = maxCoord - radius; // 192

  let markerX = leftStraight;
  let markerY = minCoord;

  if (phase === "inhale") {
    // Top side: move left to right, then round top-right corner
    if (distInPhase <= straightLength) {
      markerX = leftStraight + distInPhase;
      markerY = minCoord;
    } else {
      const angle = ((distInPhase - straightLength) / cornerArc) * (Math.PI / 2);
      markerX = rightStraight + radius * Math.sin(angle);
      markerY = leftStraight - radius * Math.cos(angle);
    }
  } else if (phase === "hold_full") {
    // Right side: move top to bottom, then round bottom-right corner
    if (distInPhase <= straightLength) {
      markerX = maxCoord;
      markerY = leftStraight + distInPhase;
    } else {
      const angle = ((distInPhase - straightLength) / cornerArc) * (Math.PI / 2);
      markerX = rightStraight + radius * Math.cos(angle);
      markerY = rightStraight + radius * Math.sin(angle);
    }
  } else if (phase === "exhale") {
    // Bottom side: move right to left, then round bottom-left corner
    if (distInPhase <= straightLength) {
      markerX = rightStraight - distInPhase;
      markerY = maxCoord;
    } else {
      const angle = ((distInPhase - straightLength) / cornerArc) * (Math.PI / 2);
      markerX = leftStraight - radius * Math.sin(angle);
      markerY = rightStraight + radius * Math.cos(angle);
    }
  } else {
    // Left side: move bottom to top, then round top-left corner
    if (distInPhase <= straightLength) {
      markerX = minCoord;
      markerY = rightStraight - distInPhase;
    } else {
      const angle = ((distInPhase - straightLength) / cornerArc) * (Math.PI / 2);
      markerX = leftStraight - radius * Math.cos(angle);
      markerY = leftStraight - radius * Math.sin(angle);
    }
  }

  // Central breathing scale
  let breathScale = 0.82;
  if (phase === "inhale") breathScale = 0.82 + 0.18 * progress;
  else if (phase === "hold_full") breathScale = 1.0;
  else if (phase === "exhale") breathScale = 1.0 - 0.18 * progress;
  else breathScale = 0.82;

  if (prefersReducedMotion) {
    breathScale = 0.90;
  }

  return (
    <div className="relative mx-auto flex h-[250px] w-[250px] items-center justify-center">
      {/* Outer rounded box frame with lavender tint */}
      <div
        className={`absolute h-[190px] w-[190px] rounded-[28px] border-2 border-[#AAA5C3]/40 dark:border-[#AAA5C3]/30 ${
          prefersReducedMotion ? "" : "app-a-box-frame"
        }`}
        style={{
          boxShadow: "inset 0 0 24px rgba(170, 165, 195, 0.18)",
        }}
      />

      {/* Central Organic Breathing Core */}
      <div
        aria-hidden="true"
        className="absolute h-32 w-32 rounded-[44%_56%_52%_48%/47%_43%_57%_53%] bg-gradient-to-br from-[#82AFC9]/25 via-[#AAA5C3]/20 to-[#EFB17B]/15 dark:from-[#82AFC9]/35 dark:via-[#AAA5C3]/25 dark:to-[#EFB17B]/20"
        style={{
          transform: `scale(${breathScale})`,
          transition: prefersReducedMotion ? "none" : "transform 140ms linear",
          filter: "blur(1px)",
        }}
      />

      {/* Perimeter Moving Marker (pure continuous uniform velocity along box perimeter) */}
      {!prefersReducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-5 w-5 rounded-full"
          style={{
            left: `${markerX}px`,
            top: `${markerY}px`,
            transform: "translate(-50%, -50%)",
            backgroundColor: "#274761",
            boxShadow: "0 0 16px rgba(130, 175, 201, 0.75), 0 0 4px rgba(255, 255, 255, 0.9)",
            willChange: "left, top",
          }}
        />
      )}

      {/* Central Accessible Phase & Countdown Display */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#527FA4] dark:text-[#82B7E3]">
          {phaseLabel}
        </span>
        <span className="mt-1 text-[38px] font-bold tabular-nums tracking-tight text-[#274761] dark:text-[#FBF7EF]">
          {countdownSec}s
        </span>
      </div>
    </div>
  );
}

interface CircleExpanderProps {
  phase: "inhale" | "exhale";
  phaseElapsedMs: number;
  phaseDurationMs: number;
  prefersReducedMotion: boolean;
  phaseLabel: string;
  countdownSec: number;
}

/**
 * Authentic Watercolor Longer Exhale Bubble:
 * Expands gently on Inhale (4s), contracts smoothly on Exhale (6s).
 */
export function CircleExpander({
  phase,
  phaseElapsedMs,
  phaseDurationMs,
  prefersReducedMotion,
  phaseLabel,
  countdownSec,
}: CircleExpanderProps) {
  const progress = Math.min(1, Math.max(0, phaseElapsedMs / phaseDurationMs));

  // Scale between 0.74 (empty) and 1.04 (full)
  let scale = 0.74;
  if (phase === "inhale") {
    scale = 0.74 + 0.30 * progress;
  } else {
    scale = 1.04 - 0.30 * progress;
  }

  if (prefersReducedMotion) {
    scale = 0.88;
  }

  return (
    <div className="relative mx-auto flex h-[250px] w-[250px] items-center justify-center">
      {/* Outer subtle guide ring */}
      <div className="absolute h-[216px] w-[216px] rounded-full border border-[#82AFC9]/20 dark:border-[#82AFC9]/15" />

      {/* Expanding / Contracting Organic Watercolor Breathing Sphere */}
      <div
        style={{
          transform: `scale(${scale})`,
          transition: prefersReducedMotion ? "none" : "transform 100ms linear",
          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.78), transparent 40%), linear-gradient(135deg, rgba(130, 175, 201, 0.35) 0%, rgba(82, 127, 164, 0.22) 100%)",
          boxShadow: `0 0 ${24 + (scale - 0.74) * 50}px rgba(130, 175, 201, 0.28)`,
        }}
        className={`flex h-[196px] w-[196px] items-center justify-center rounded-[48%_52%_55%_45%/52%_46%_54%_48%] border border-[#82AFC9]/35 dark:border-[#82AFC9]/40 ${
          prefersReducedMotion ? "" : "app-a-watercolor-bubble"
        }`}
      >
        <div className="text-center">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#527FA4] dark:text-[#82B7E3]">
            {phaseLabel}
          </span>
          <p className="mt-1 text-[38px] font-bold tabular-nums tracking-tight text-[#274761] dark:text-[#FBF7EF]">
            {countdownSec}s
          </p>
        </div>
      </div>
    </div>
  );
}

interface DoubleInhaleVisualizerProps {
  phase: "first_inhale" | "topup_inhale" | "exhale";
  phaseElapsedMs: number;
  phaseDurationMs: number;
  prefersReducedMotion: boolean;
  phaseLabel: string;
  countdownSec: number;
}

/**
 * Authentic Apricot Double Inhale (Physiological Sigh) Bubble:
 * 1. First Inhale (3s): Scale 0.72 -> 0.88
 * 2. Top-up Inhale (1.5s): Quick expansion pulse 0.88 -> 1.06 with warm brightening glow
 * 3. Exhale (5.5s): Slow calm releasing contraction 1.06 -> 0.72
 */
export function DoubleInhaleVisualizer({
  phase,
  phaseElapsedMs,
  phaseDurationMs,
  prefersReducedMotion,
  phaseLabel,
  countdownSec,
}: DoubleInhaleVisualizerProps) {
  const progress = Math.min(1, Math.max(0, phaseElapsedMs / phaseDurationMs));

  let scale = 0.72;
  let glowOpacity = 0.20;

  if (phase === "first_inhale") {
    scale = 0.72 + 0.16 * progress;
    glowOpacity = 0.20 + 0.15 * progress;
  } else if (phase === "topup_inhale") {
    scale = 0.88 + 0.18 * progress;
    glowOpacity = 0.35 + 0.30 * progress;
  } else {
    scale = 1.06 - 0.34 * progress;
    glowOpacity = 0.65 - 0.45 * progress;
  }

  if (prefersReducedMotion) {
    scale = 0.85;
    glowOpacity = 0.25;
  }

  return (
    <div className="relative mx-auto flex h-[250px] w-[250px] items-center justify-center">
      {/* Target bounds subtle dashed ring */}
      <div className="absolute h-[216px] w-[216px] rounded-full border border-dashed border-[#EFB17B]/25 dark:border-[#EFB17B]/20" />

      {/* Breathing Apricot Watercolor Bubble */}
      <div
        style={{
          transform: `scale(${scale})`,
          transition: prefersReducedMotion ? "none" : "transform 100ms linear",
          background: "radial-gradient(circle at 36% 30%, rgba(255,255,255,0.85), transparent 38%), linear-gradient(135deg, rgba(239, 177, 123, 0.45) 0%, rgba(212, 139, 85, 0.25) 100%)",
          boxShadow: `0 0 ${26 + (scale - 0.72) * 60}px rgba(239, 177, 123, ${glowOpacity})`,
        }}
        className={`flex h-[196px] w-[196px] items-center justify-center rounded-[50%_45%_52%_48%/46%_52%_48%_54%] border border-[#EFB17B]/40 dark:border-[#EFB17B]/35 ${
          prefersReducedMotion ? "" : "app-a-sigh-bubble"
        }`}
      >
        <div className="text-center px-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#C27B38] dark:text-[#EFB17B]">
            {phaseLabel}
          </span>
          <p className="mt-1 text-[38px] font-bold tabular-nums tracking-tight text-[#274761] dark:text-[#FBF7EF]">
            {countdownSec}s
          </p>
        </div>
      </div>
    </div>
  );
}

interface GuidedRestVisualizerProps {
  stage: "settle" | "body_attention" | "quiet_rest" | "gradual_return";
  stageIndex: number;
  stageRemainingMs: number;
  totalRemainingMs: number;
  stageDescription: string;
  stageLabels: readonly string[];
  prefersReducedMotion: boolean;
}

interface Cue {
  from: number;
  to: number;
  eyebrow: string;
  title: string;
  body: string;
}

const cuesSr: Cue[] = [
  { from: 0, to: 60, eyebrow: "POČETAK", title: "Namesti se udobno.", body: "Dozvoli pogledu da omekša. Ne moraš ništa da postižeš." },
  { from: 60, to: 100, eyebrow: "OPUŠTANJE TELA", title: "Omekšaj čelo i vilicu.", body: "Primeti da li možeš da otpustiš i najmanji deo napetosti." },
  { from: 100, to: 145, eyebrow: "OPUŠTANJE TELA", title: "Spusti pažnju u vrat i ramena.", body: "Ne menjaj ništa na silu. Samo primeti težinu." },
  { from: 145, to: 190, eyebrow: "OPUŠTANJE TELA", title: "Primeti ruke i šake.", body: "Dopusti im da miruju tamo gde su oslonjene." },
  { from: 190, to: 235, eyebrow: "OPUŠTANJE TELA", title: "Oseti grudi i stomak.", body: "Pusti dah da dolazi i odlazi bez upravljanja." },
  { from: 235, to: 270, eyebrow: "OPUŠTANJE TELA", title: "Oseti kukove i noge.", body: "Primeti površinu koja te drži." },
  { from: 270, to: 300, eyebrow: "OPUŠTANJE TELA", title: "Primeti stopala.", body: "Celo telo sada može malo više da se osloni." },
  { from: 300, to: 405, eyebrow: "MIRNA PAŽNJA", title: "Pusti dah da pronađe svoj ritam.", body: "Ne mora biti dublji ni sporiji. Samo ga prati." },
  { from: 405, to: 510, eyebrow: "MIRNA PAŽNJA", title: "Ostani uz osećaj oslonca.", body: "Ako pažnja odluta, nežno se vrati telu i dahu." },
  { from: 510, to: 545, eyebrow: "POVRATAK", title: "Ponovo primeti prostor oko sebe.", body: "Čuj bliže i udaljenije zvuke." },
  { from: 545, to: 575, eyebrow: "POVRATAK", title: "Pomeri prste šaka i stopala.", body: "Vrati malo pokreta, bez žurbe." },
  { from: 575, to: 600, eyebrow: "POVRATAK", title: "Otvori oči kada ti prija.", body: "Ponesi ovaj mir u sledeći deo dana." },
];

const cuesEn: Cue[] = [
  { from: 0, to: 60, eyebrow: "BEGINNING", title: "Find a comfortable posture.", body: "Allow your gaze to soften. There is nothing you need to accomplish." },
  { from: 60, to: 100, eyebrow: "BODY RELAXATION", title: "Soften your forehead and jaw.", body: "Notice if you can release even a tiny bit of tension." },
  { from: 100, to: 145, eyebrow: "BODY RELAXATION", title: "Drop attention into neck and shoulders.", body: "Do not force anything. Simply notice the weight." },
  { from: 145, to: 190, eyebrow: "BODY RELAXATION", title: "Notice your arms and hands.", body: "Allow them to rest where they are supported." },
  { from: 190, to: 235, eyebrow: "BODY RELAXATION", title: "Feel your chest and stomach.", body: "Let your breath arrive and depart on its own." },
  { from: 235, to: 270, eyebrow: "BODY RELAXATION", title: "Feel hips and legs.", body: "Notice the surface supporting you." },
  { from: 270, to: 300, eyebrow: "BODY RELAXATION", title: "Notice your feet.", body: "Your whole body can rest a little deeper now." },
  { from: 300, to: 405, eyebrow: "QUIET ATTENTION", title: "Let your breath find its natural rhythm.", body: "No need to breathe deeper or slower. Just follow it." },
  { from: 405, to: 510, eyebrow: "QUIET ATTENTION", title: "Stay with the feeling of support.", body: "If attention wanders, gently return to body and breath." },
  { from: 510, to: 545, eyebrow: "RETURN", title: "Notice the space around you again.", body: "Hear the sounds nearby and in the distance." },
  { from: 545, to: 575, eyebrow: "RETURN", title: "Gently wiggle fingers and toes.", body: "Bring subtle movement back, without rush." },
  { from: 575, to: 600, eyebrow: "RETURN", title: "Open your eyes when ready.", body: "Take this calm into the rest of your day." },
];

const cuesTr: Cue[] = [
  { from: 0, to: 60, eyebrow: "BAŞLANGIÇ", title: "Rahat bir pozisyona geçin.", body: "Bakışlarınızı yumuşatın. Hiçbir şeyi başarmak zorunda değilsiniz." },
  { from: 60, to: 100, eyebrow: "BEDEN GEVŞEMESİ", title: "Alnınızı ve çenenizi serbest bırakın.", body: "En ufak bir gerginliği bile bırakıp bırakamayacağınızı fark edin." },
  { from: 100, to: 145, eyebrow: "BEDEN GEVŞEMESİ", title: "Dikkatinizi boyun ve omuzlarınıza verin.", body: "Zorlamayın. Yalnızca ağırlığı hissedin." },
  { from: 145, to: 190, eyebrow: "BEDEN GEVŞEMESİ", title: "Kollarınızı ve ellerinizi fark edin.", body: "Desteklendikleri yerde dinlenmelerine izin verin." },
  { from: 190, to: 235, eyebrow: "BEDEN GEVŞEMESİ", title: "Göğsünüzü ve karnınızı hissedin.", body: "Nefesin kendiliğinden gelip gitmesine izin verin." },
  { from: 235, to: 270, eyebrow: "BEDEN GEVŞEMESİ", title: "Kalçalarınızı ve bacaklarınızı hissedin.", body: "Sizi destekleyen zemini hissedin." },
  { from: 270, to: 300, eyebrow: "BEDEN GEVŞEMESİ", title: "Ayaklarınızı fark edin.", body: "Artık tüm bedeniniz biraz daha dinlenebilir." },
  { from: 300, to: 405, eyebrow: "SESSİZ FARKINDALIK", title: "Nefesinizin kendi ritmini bulmasına izin verin.", body: "Daha derin veya yavaş olması gerekmez. Sadece takip edin." },
  { from: 405, to: 510, eyebrow: "SESSİZ FARKINDALIK", title: "Destek hissiyle kalın.", body: "Zihniniz dağılırsa nazikçe bedene ve nefese dönün." },
  { from: 510, to: 545, eyebrow: "DÖNÜŞ", title: "Çevrenizdeki mekanı yeniden fark edin.", body: "Yakın ve uzaktaki sesleri duyun." },
  { from: 545, to: 575, eyebrow: "DÖNÜŞ", title: "El ve ayak parmaklarınızı kıpırdatın.", body: "Acele etmeden küçük hareketler getirin." },
  { from: 575, to: 600, eyebrow: "DÖNÜŞ", title: "Hazır olduğunuzda gözlerinizi açın.", body: "Bu huzuru gününüzün devamına taşıyın." },
];

/**
 * Authentic Guided Deep Rest Experience (10 min):
 * Approved watercolor scenery with animated SVG wave overlays,
 * soft body scan light, and synchronized guidance cues.
 */
export function GuidedRestVisualizer({
  stageIndex,
  stageRemainingMs,
  totalRemainingMs,
  stageDescription,
  stageLabels,
  prefersReducedMotion,
}: GuidedRestVisualizerProps) {
  const totalDurationMs = 600000;
  const progressPercent = Math.min(100, Math.max(0, ((totalDurationMs - totalRemainingMs) / totalDurationMs) * 100));

  const totalMin = Math.floor(totalRemainingMs / 60000);
  const totalSec = Math.floor((totalRemainingMs % 60000) / 1000);
  const formattedTime = `${totalMin}:${String(totalSec).padStart(2, "0")}`;

  const stageDurations = [90_000, 210_000, 240_000, 60_000];
  const stageProgress = Math.min(1, Math.max(0, 1 - stageRemainingMs / stageDurations[stageIndex]));

  const lang = stageLabels[0] === "Smirivanje" ? "sr" : stageLabels[0] === "Yerleşme" ? "tr" : "en";
  const cues = lang === "sr" ? cuesSr : lang === "tr" ? cuesTr : cuesEn;
  const seconds = Math.max(0, Math.min(600, (totalDurationMs - totalRemainingMs) / 1000));
  const activeCue = cues.find((c) => seconds >= c.from && seconds < c.to) ?? cues[cues.length - 1];

  // Body scan light travel across approved coordinates
  const bodyPass = (Math.max(0, seconds - 60) % 35) / 35;
  const scanActive = !prefersReducedMotion && seconds >= 60 && seconds < 300;
  const scanX = -20 + bodyPass * 360;
  const scanY = 160 - bodyPass * 110;

  return (
    <div className="mx-auto max-w-md text-center">
      {/* Time & Stage Header */}
      <div className="mb-3 flex items-center justify-between px-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#527FA4] dark:text-[#82B7E3]">
          {stageLabels[stageIndex]}
        </span>
        <span className="text-[22px] font-bold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          {formattedTime}
        </span>
      </div>

      {/* Approved Artwork Window with 3 Living SVG Animated Waves, Scenery Breathing, and Scan Light */}
      <div className="relative mx-auto h-[220px] w-full max-w-[390px] overflow-hidden rounded-2xl border border-black/10 shadow-sm dark:border-white/10">
        <img
          src="/app-a/guided-rest-day-scenery.png"
          alt="Guided rest peaceful scenery"
          className="app-a-rest-scenery-animated absolute inset-0 h-full w-full object-cover object-center select-none pointer-events-none dark:hidden"
        />
        <img
          src="/app-a/guided-rest-evening-scenery.png"
          alt="Guided rest peaceful evening scenery"
          className="app-a-rest-scenery-animated absolute inset-0 hidden h-full w-full object-cover object-center select-none pointer-events-none dark:block"
        />

        {/* 3 Living Animated SVG Waves matching approved Remotion composition */}
        {!prefersReducedMotion && (
          <svg
            aria-hidden="true"
            viewBox="0 0 390 150"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[125px] w-full overflow-visible opacity-85 dark:opacity-90"
          >
            <defs>
              <linearGradient id="wg0" x1="0" x2="1">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="45%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <linearGradient id="wg1" x1="0" x2="1">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(240,248,255,0.85)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <linearGradient id="wg2" x1="0" x2="1">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(232,244,255,0.75)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M -80 82 C 0 62, 55 100, 130 82 S 265 64, 340 82 S 420 100, 490 76"
              fill="none"
              stroke="url(#wg0)"
              strokeWidth="18"
              strokeLinecap="round"
              className="app-a-rest-approved-wave-0"
            />
            <path
              d="M -60 100 C 30 80, 78 116, 165 99 S 295 81, 375 99 S 450 116, 510 94"
              fill="none"
              stroke="url(#wg1)"
              strokeWidth="14"
              strokeLinecap="round"
              className="app-a-rest-approved-wave-1"
            />
            <path
              d="M -40 117 C 50 100, 95 130, 200 115 S 320 100, 410 117 S 480 132, 530 110"
              fill="none"
              stroke="url(#wg2)"
              strokeWidth="10"
              strokeLinecap="round"
              className="app-a-rest-approved-wave-2"
            />
          </svg>
        )}

        {/* Soft Scan Light */}
        {scanActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-[44px] w-[76px] rounded-full transition-all duration-300"
            style={{
              left: `${scanX}px`,
              top: `${scanY}px`,
              opacity: 0.85,
              background: "radial-gradient(ellipse, rgba(255,247,218,0.95), transparent 70%)",
              filter: "blur(3px)",
            }}
          />
        )}
      </div>

      {/* Stage Timeline */}
      <div className="mt-4 flex items-center justify-between gap-1.5 px-2">
        {stageLabels.map((stg, idx) => {
          const isCurrent = idx === stageIndex;
          const isDone = idx < stageIndex;

          return (
            <div key={stg} className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                    isDone
                      ? "bg-[#527FA4] dark:bg-[#82B7E3]"
                      : isCurrent
                      ? "bg-[#527FA4] ring-2 ring-[#527FA4]/30 dark:bg-[#82B7E3] dark:ring-[#82B7E3]/30"
                      : "bg-black/10 dark:bg-white/10"
                  }`}
                  style={{ transformOrigin: "left", transform: `scaleX(${isDone ? 1 : isCurrent ? stageProgress : 0})` }}
                />
              </div>
              <p
                className={`mt-1.5 truncate text-[11px] font-medium tracking-tight ${
                  isCurrent
                    ? "font-semibold text-[#527FA4] dark:text-[#82B7E3]"
                    : "text-[#76767b] dark:text-[#7c7c82]"
                }`}
              >
                {stg}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
        <div
          className="h-full bg-[#527FA4] transition-all duration-300 dark:bg-[#82B7E3]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Synchronized Guidance Cue Card */}
      <div className="mt-4 rounded-2xl border border-black/5 bg-black/[0.03] p-4 text-center dark:border-white/5 dark:bg-white/[0.03]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#527FA4] dark:text-[#82B7E3]">
          {activeCue.eyebrow}
        </span>
        <h3 className="mt-1 text-[18px] font-medium tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          {activeCue.title}
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#555558] dark:text-[#a1a1a6]">
          {activeCue.body || stageDescription}
        </p>
      </div>
    </div>
  );
}
