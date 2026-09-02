import { useId, useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Globe, LogOut, Search, Settings2, ShieldAlert, Check } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import type { AppALanguage, AppAPreferences } from "../types";
import {
  getAvailableTimeZones,
  getDetectedDeviceTimeZone,
  getEffectiveTimeZone,
  isValidTimeZone,
} from "../settings/preferences";
import { useAppAAuth } from "../auth/useAppAAuth";
import { DATA_RESET_LOCALIZATION } from "../settings/dataResetLocalization";
import DataResetModal from "../components/settings/DataResetModal";

const COPY = {
  en: {
    eyebrow: "Your preferences",
    title: "Settings",
    intro: "Control how App A behaves on this device.",
    language: "Language",
    theme: "Appearance",
    system: "System",
    light: "Light",
    dark: "Dark",
    zone: "Time zone",
    zoneHelp: "Used for daily plans and routine dates.",
    automatic: "Automatic",
    searchZone: "Search time zones…",
    activeZone: "Active timezone",
    allZones: "All time zones",
    focus: "Default focus session",
    ai: "AI daily planning",
    aiHelp: "Turning this off prevents new AI daily plans; saved content remains available.",
    logout: "Sign out",
  },
  sr: {
    eyebrow: "Vaše preference",
    title: "Podešavanja",
    intro: "Kontrolišite kako se App A ponaša na ovom uređaju.",
    language: "Jezik",
    theme: "Izgled",
    system: "Sistemski",
    light: "Svetli",
    dark: "Tamni",
    zone: "Vremenska zona",
    zoneHelp: "Koristi se za dnevne planove i datume rutina.",
    automatic: "Automatski",
    searchZone: "Pretraži vremenske zone…",
    activeZone: "Aktivna zona",
    allZones: "Sve vremenske zone",
    focus: "Podrazumevana fokus sesija",
    ai: "AI dnevno planiranje",
    aiHelp: "Isključivanje sprečava nove AI dnevne planove; sačuvani sadržaj ostaje dostupan.",
    logout: "Odjavi se",
  },
  tr: {
    eyebrow: "Tercihleriniz",
    title: "Ayarlar",
    intro: "App A'nın bu cihazda nasıl davrandığını kontrol edin.",
    language: "Dil",
    theme: "Görünüm",
    system: "Sistem",
    light: "Açık",
    dark: "Koyu",
    zone: "Saat dilimi",
    zoneHelp: "Günlük planlar ve rutin tarihleri için kullanılır.",
    automatic: "Otomatik",
    searchZone: "Saat dilimlerini ara…",
    activeZone: "Etkin saat dilimi",
    allZones: "Tüm saat dilimleri",
    focus: "Varsayılan odak oturumu",
    ai: "AI günlük planlama",
    aiHelp: "Kapatıldığında yeni AI günlük planları durur; kayıtlı içerik kalır.",
    logout: "Çıkış yap",
  },
} as const;

function TimeZoneCombobox({
  language,
  preferences,
  onChange,
  detectedZone,
}: {
  language: AppALanguage;
  preferences: AppAPreferences;
  onChange: (value: string) => void;
  detectedZone: string;
}) {
  const t = COPY[language];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const allZones = useMemo(() => getAvailableTimeZones(), []);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list: Array<{ value: string; label: string }> = [
      { value: "automatic", label: `${t.automatic} — ${detectedZone}` },
    ];
    for (const z of allZones) {
      if (!q || z.toLowerCase().includes(q)) {
        list.push({ value: z, label: z });
      }
    }
    return list;
  }, [allZones, search, t.automatic, detectedZone]);

  const selectedLabel =
    preferences.timeZoneSetting.mode === "automatic"
      ? `${t.automatic} — ${detectedZone}`
      : preferences.timeZoneSetting.timeZone;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      const timer = setTimeout(() => searchInputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const selectOption = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex].value);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative mt-2 w-full" id="timezone-combobox-container">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        id="timezone-combobox-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t.zone}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="app-a-field app-a-focus-ring flex min-h-[48px] w-full items-center justify-between p-3 text-left text-[15px] font-medium"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#8E8E93] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          id="timezone-combobox-listbox"
          tabIndex={-1}
          className="app-a-surface-elevated absolute left-0 right-0 z-50 mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/15 dark:bg-[#2C2C2E]"
        >
          <div className="border-b border-black/5 p-2 dark:border-white/10">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#8E8E93]" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t.searchZone}
                className="app-a-field w-full py-1.5 pl-9 pr-3 text-[14px]"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[13px] text-[#8E8E93]">
                {language === "sr" ? "Nema pronađenih vremenskih zona" : language === "tr" ? "Saat dilimi bulunamadı" : "No time zones found"}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  opt.value === "automatic"
                    ? preferences.timeZoneSetting.mode === "automatic"
                    : preferences.timeZoneSetting.mode === "override" &&
                      preferences.timeZoneSetting.timeZone === opt.value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-[14px] transition-colors ${
                      isHighlighted
                        ? "bg-[#0071E3] text-white"
                        : "text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className={`h-4 w-4 shrink-0 ${isHighlighted ? "text-white" : "text-[#0071E3] dark:text-[#2997ff]"}`} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsScreen({
  language,
  preferences,
  onChange,
}: {
  language: AppALanguage;
  preferences: AppAPreferences;
  onChange: (next: AppAPreferences) => void;
}) {
  const t = COPY[language];
  const tReset = DATA_RESET_LOCALIZATION[language] || DATA_RESET_LOCALIZATION.en;
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const { user } = useAppAAuth();

  const detectedZone = useMemo(() => getDetectedDeviceTimeZone(), []);
  const effectiveZone = useMemo(() => getEffectiveTimeZone(preferences), [preferences]);

  const update = <K extends keyof AppAPreferences>(key: K, value: AppAPreferences[K]) => {
    onChange({ ...preferences, [key]: value });
  };

  const handleTimeZoneChange = (value: string) => {
    if (value === "automatic") {
      update("timeZoneSetting", { mode: "automatic" });
    } else if (isValidTimeZone(value)) {
      update("timeZoneSetting", { mode: "override", timeZone: value });
    }
  };

  const activeZoneText = `${t.activeZone}: ${effectiveZone}`;

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 sm:px-6">
      <header className="mb-7">
        <p className="app-a-eyebrow">{t.eyebrow}</p>
        <h1 className="app-a-page-title">{t.title}</h1>
        <p className="app-a-page-intro">{t.intro}</p>
      </header>

      <div className="app-a-surface divide-y divide-black/5 overflow-hidden dark:divide-white/10">
        {/* Language */}
        <section className="p-5">
          <label className="text-[15px] font-semibold text-black dark:text-white" htmlFor="app-a-lang">
            {t.language}
          </label>
          <select
            id="app-a-lang"
            value={preferences.language}
            onChange={(event) => update("language", event.target.value as AppALanguage)}
            className="app-a-field app-a-focus-ring mt-2 w-full p-3 text-[15px]"
          >
            <option value="en">English</option>
            <option value="sr">Srpski</option>
            <option value="tr">Türkçe</option>
          </select>
        </section>

        {/* Theme */}
        <section className="p-5">
          <p className="text-[15px] font-semibold text-black dark:text-white">{t.theme}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["system", "light", "dark"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => update("theme", theme)}
                className={`app-a-focus-ring min-h-11 rounded-xl border text-[13px] font-semibold transition-colors ${
                  preferences.theme === theme
                    ? "border-[#0071E3] bg-[#0071E3] text-white"
                    : "border-black/10 text-black hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                }`}
              >
                {t[theme]}
              </button>
            ))}
          </div>
        </section>

        {/* Time Zone */}
        <section className="p-5">
          <label className="text-[15px] font-semibold text-black dark:text-white">
            {t.zone}
          </label>
          <p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.zoneHelp}</p>

          <TimeZoneCombobox
            language={language}
            preferences={preferences}
            onChange={handleTimeZoneChange}
            detectedZone={detectedZone}
          />

          <p className="mt-2 text-[12px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2] break-words">
            {activeZoneText}
          </p>
        </section>

        {/* Default Focus Duration */}
        <section className="p-5">
          <label className="text-[15px] font-semibold text-black dark:text-white" htmlFor="app-a-focus">
            {t.focus}
          </label>
          <select
            id="app-a-focus"
            value={preferences.defaultFocusMinutes}
            onChange={(event) =>
              update(
                "defaultFocusMinutes",
                Number(event.target.value) as AppAPreferences["defaultFocusMinutes"]
              )
            }
            className="app-a-field app-a-focus-ring mt-2 w-full p-3 text-[15px]"
          >
            {[15, 25, 45, 60].map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </select>
        </section>

        {/* AI Daily Planning Toggle */}
        <section className="flex items-center justify-between gap-4 p-5">
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-semibold text-black dark:text-white">{t.ai}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.aiHelp}
            </p>
          </div>

          <div className="flex h-11 min-w-[44px] shrink-0 items-center justify-center">
            <button
              type="button"
              role="switch"
              id="ai-planning-switch"
              aria-checked={preferences.aiSuggestionsEnabled}
              onClick={() => update("aiSuggestionsEnabled", !preferences.aiSuggestionsEnabled)}
              className={`app-a-focus-ring relative flex h-6 w-[44px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 dark:focus-visible:ring-[#2997ff] ${
                preferences.aiSuggestionsEnabled
                  ? "bg-[#0071E3] dark:bg-[#2997ff]"
                  : "bg-black/20 dark:bg-white/20"
              }`}
              style={{ boxSizing: "border-box" }}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  preferences.aiSuggestionsEnabled ? "translate-x-[20px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>
      </div>

      {/* Danger Zone Section */}
      <section
        className="mt-6 rounded-2xl border border-[#FF3B30]/30 bg-[#FF3B30]/[0.03] p-5 dark:border-[#FF453A]/30 dark:bg-[#FF453A]/[0.05]"
        aria-labelledby="danger-zone-heading"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] dark:bg-[#FF453A]/15 dark:text-[#FF453A]">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 id="danger-zone-heading" className="text-[15px] font-bold text-black dark:text-white">
              {tReset.dangerZoneTitle}
            </h2>
            <p className="text-[12px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {tReset.dangerZoneDescription}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsResetModalOpen(true)}
          disabled={!user}
          className="app-a-focus-ring mt-4 w-full rounded-xl border border-[#FF3B30]/40 bg-white py-2.5 text-[13px] font-semibold text-[#D70015] hover:bg-[#FF3B30]/10 active:scale-98 dark:border-[#FF453A]/40 dark:bg-[#2C2C2E] dark:text-[#FF453A] dark:hover:bg-[#FF453A]/20 transition-all disabled:opacity-50"
          id="open-danger-zone-btn"
        >
          {tReset.primaryAction}
        </button>
      </section>

      {user && (
        <DataResetModal
          isOpen={isResetModalOpen}
          userId={user.uid}
          language={language}
          onClose={() => setIsResetModalOpen(false)}
          onPreferencesReset={(newPrefs) => onChange(newPrefs)}
        />
      )}

      <button
        type="button"
        onClick={() => void signOut(auth)}
        className="app-a-secondary-button app-a-focus-ring mt-5 w-full gap-2 text-[14px]"
      >
        <LogOut className="h-4 w-4" />
        {t.logout}
      </button>

      <div className="mt-4 flex justify-center text-[#8E8E93]">
        <Settings2 className="h-4 w-4" />
      </div>
    </div>
  );
}

