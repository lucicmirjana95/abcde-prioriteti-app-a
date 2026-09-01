import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Wind } from "lucide-react";
import type { AppALanguage } from "../../types";

type SessionId = "gentle_breath" | "calm_breath" | "guided_rest";

const SESSIONS = {
  gentle_breath: { seconds: 60, inhale: 4, exhale: 6 },
  calm_breath: { seconds: 180, inhale: 4, exhale: 6 },
  guided_rest: { seconds: 600, inhale: 0, exhale: 0 },
} as const;

const COPY = {
  en: { title: "Reset sessions", intro: "Optional, gentle support for focus or rest. Stop if you feel uncomfortable or dizzy.", gentle: "1-minute gentle breathing", calm: "3-minute calming breathing", rest: "10-minute guided deep rest", start: "Start", pause: "Pause", resume: "Resume", reset: "End", inhale: "Breathe in gently", exhale: "Breathe out slowly", settle: "Get comfortable and let your body become still.", scan: "Notice and soften your face, shoulders, hands, and legs.", restGuide: "Let sounds and thoughts come and go without needing to follow them.", returnGuide: "Notice the room again and return slowly when you are ready." },
  sr: { title: "Sesije za predah", intro: "Opciono, blago osveženje za fokus ili odmor. Prekinite ako osetite nelagodu ili vrtoglavicu.", gentle: "1 minut blagog disanja", calm: "3 minuta umirujućeg disanja", rest: "10 minuta vođenog dubokog odmora", start: "Pokreni", pause: "Pauziraj", resume: "Nastavi", reset: "Završi", inhale: "Udahnite nežno", exhale: "Izdahnite polako", settle: "Namestite se udobno i dozvolite telu da se umiri.", scan: "Primeti i opusti lice, ramena, šake i noge.", restGuide: "Pustite zvuke i misli da dođu i prođu bez potrebe da ih pratite.", returnGuide: "Ponovo primetite prostor i vratite se polako kada budete spremni." },
  tr: { title: "Mola oturumları", intro: "Odaklanma veya dinlenme için isteğe bağlı, nazik destek. Rahatsızlık veya baş dönmesi hissederseniz durun.", gentle: "1 dakika nazik nefes", calm: "3 dakika sakinleştirici nefes", rest: "10 dakika rehberli derin dinlenme", start: "Başlat", pause: "Duraklat", resume: "Devam", reset: "Bitir", inhale: "Nazikçe nefes alın", exhale: "Yavaşça nefes verin", settle: "Rahat bir pozisyon bulun ve bedeninizin sakinleşmesine izin verin.", scan: "Yüzünüzü, omuzlarınızı, ellerinizi ve bacaklarınızı fark edip gevşetin.", restGuide: "Seslerin ve düşüncelerin peşinden gitmeden gelip geçmesine izin verin.", returnGuide: "Odayı yeniden fark edin ve hazır olduğunuzda yavaşça geri dönün." },
} as const;

export default function ResetSessions({ language }: { language: AppALanguage }) {
  const [selected, setSelected] = useState<SessionId | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const t = COPY[language];

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remaining, running]);

  useEffect(() => {
    if (remaining === 0) setRunning(false);
  }, [remaining]);

  const guidance = useMemo(() => {
    if (!selected) return "";
    if (selected === "guided_rest") {
      const elapsed = SESSIONS.guided_rest.seconds - remaining;
      if (elapsed < 90) return t.settle;
      if (elapsed < 300) return t.scan;
      if (remaining > 60) return t.restGuide;
      return t.returnGuide;
    }
    const cycle = SESSIONS[selected].inhale + SESSIONS[selected].exhale;
    const elapsed = SESSIONS[selected].seconds - remaining;
    return elapsed % cycle < SESSIONS[selected].inhale ? t.inhale : t.exhale;
  }, [remaining, selected, t]);

  const begin = (id: SessionId) => {
    setSelected(id);
    setRemaining(SESSIONS[id].seconds);
    setRunning(true);
  };
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="reset-sessions-heading">
      <div className="mb-3"><h2 id="reset-sessions-heading" className="text-[19px] font-semibold text-black dark:text-white">{t.title}</h2><p className="mt-1 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p></div>
      <div className="app-a-surface p-4 sm:p-5">
        {!selected ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {(["gentle_breath", "calm_breath", "guided_rest"] as SessionId[]).map((id) => <button key={id} type="button" onClick={() => begin(id)} className="app-a-focus-ring min-h-[58px] rounded-xl border border-black/10 px-3 text-left text-[14px] font-semibold text-black dark:border-white/15 dark:text-white"><Wind className="mr-2 inline h-4 w-4 text-[#0A84FF]" />{id === "gentle_breath" ? t.gentle : id === "calm_breath" ? t.calm : t.rest}</button>)}
          </div>
        ) : (
          <div role="timer" aria-live="polite" className="text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#AEAEB2]">{selected === "gentle_breath" ? t.gentle : selected === "calm_breath" ? t.calm : t.rest}</p>
            <p className="mt-3 text-[44px] font-semibold tabular-nums tracking-[-0.04em] text-black dark:text-white">{minutes}:{seconds}</p>
            <p className="mx-auto mt-2 min-h-12 max-w-md text-[16px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{guidance}</p>
            <div className="mt-4 flex justify-center gap-2"><button type="button" onClick={() => setRunning((value) => !value)} className="app-a-primary-button app-a-focus-ring gap-2 px-5">{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? t.pause : t.resume}</button><button type="button" onClick={() => { setSelected(null); setRemaining(0); setRunning(false); }} className="app-a-secondary-button app-a-focus-ring gap-2 px-4"><RotateCcw className="h-4 w-4" />{t.reset}</button></div>
          </div>
        )}
      </div>
    </section>
  );
}

