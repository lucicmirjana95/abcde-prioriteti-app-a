import { DAILY_RESET_DEMO_SCENARIOS, type DailyResetDemoScenario } from "../../demo/dailyResetDemo";
import type { AppALanguage } from "../../types";

interface Props {
  language: AppALanguage;
  scenario: DailyResetDemoScenario;
}

const COPY = {
  en: { title: "Safe demo", description: "Synthetic responses only — no AI call, cost, or data saving.", scenarios: { clarification: "Questions → plan", plan: "Direct plan", "rate-limit": "Limit", unavailable: "Unavailable", timeout: "Timeout", "invalid-response": "Invalid response" } },
  sr: { title: "Bezbedan demo", description: "Samo sintetički odgovori — bez AI poziva, troška i čuvanja podataka.", scenarios: { clarification: "Pitanja → plan", plan: "Direktan plan", "rate-limit": "Limit", unavailable: "Nedostupno", timeout: "Predugo traje", "invalid-response": "Neispravan odgovor" } },
  tr: { title: "Güvenli demo", description: "Yalnızca sentetik yanıtlar — yapay zeka çağrısı, maliyet veya veri kaydı yok.", scenarios: { clarification: "Sorular → plan", plan: "Doğrudan plan", "rate-limit": "Sınır", unavailable: "Kullanılamıyor", timeout: "Zaman aşımı", "invalid-response": "Geçersiz yanıt" } },
} as const;

export default function DailyResetDemoBanner({ language, scenario }: Props) {
  const copy = COPY[language] || COPY.en;
  return (
    <section aria-label={copy.title} className="w-full max-w-[720px] mx-auto px-4 mb-6">
      <div className="rounded-2xl border border-[#007AFF]/25 bg-[#007AFF]/[0.06] dark:bg-[#0A84FF]/10 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#007AFF] text-[12px] font-bold text-white">D</span>
          <div>
            <p className="text-[15px] font-semibold text-black dark:text-white">{copy.title}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-[#3C3C43] dark:text-[#EBEBF5]/75">{copy.description}</p>
          </div>
        </div>
        <nav aria-label="Demo scenarios" className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          {DAILY_RESET_DEMO_SCENARIOS.map((item) => (
            <a
              key={item}
              href={`?app=a&demo=daily-reset&scenario=${item}`}
              aria-current={item === scenario ? "page" : undefined}
              className={`min-h-[44px] shrink-0 inline-flex items-center rounded-xl px-3 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${item === scenario ? "bg-[#007AFF] text-white" : "bg-white/80 text-[#3C3C43] hover:bg-white dark:bg-white/10 dark:text-[#EBEBF5] dark:hover:bg-white/15"}`}
            >
              {copy.scenarios[item]}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
