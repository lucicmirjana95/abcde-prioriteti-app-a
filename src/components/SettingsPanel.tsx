import React, { useState, useEffect } from "react";
import {
  User,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Clock,
  Bell,
  Trash2,
  RefreshCw,
  Check,
  Info,
  Shield,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Share,
  Brain,
  Volume2,
  Globe,
  Archive,
  Mic,
} from "lucide-react";

import { Language, translations } from "../translations";
import { motion } from "motion/react";
import { safeStorage } from "../lib/safeStorageSetup";

interface SettingsPanelProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: any;
  onSignIn: () => void;
  onSignOut: () => void;
  themeMode: "auto" | "light" | "dark";
  onThemeChange: (mode: "auto" | "light" | "dark") => void;
  sunriseTime: string;
  onSunriseChange: (time: string) => void;
  sunsetTime: string;
  onSunsetChange: (time: string) => void;
  followSystemTheme: boolean;
  onFollowSystemThemeChange: (follow: boolean) => void;
  onArchiveOldTasks?: () => Promise<void>;
  autoProcessVoice: boolean;
  onAutoProcessVoiceChange: (autoProcess: boolean) => void;
  onResetUserData?: () => Promise<void>;
}

export default function SettingsPanel({
  language,
  onLanguageChange,
  currentUser,
  onSignIn,
  onSignOut,
  themeMode,
  onThemeChange,
  sunriseTime,
  onSunriseChange,
  sunsetTime,
  onSunsetChange,
  followSystemTheme,
  onFollowSystemThemeChange,
  onArchiveOldTasks,
  autoProcessVoice,
  onAutoProcessVoiceChange,
  onResetUserData,
}: SettingsPanelProps) {
  const isEn = language === "en";
  const [isArchiving, setIsArchiving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Notification states loaded from localstorage
  const [notifyMorning, setNotifyMorning] = useState(
    () => safeStorage.getItem("abcde_notify_morning") !== "false",
  );
  const [notifyMidday, setNotifyMidday] = useState(
    () => safeStorage.getItem("abcde_notify_midday") !== "false",
  );
  const [notifyEvening, setNotifyEvening] = useState(
    () => safeStorage.getItem("abcde_notify_evening") !== "false",
  );
  const [notifyMindset, setNotifyMindset] = useState(
    () => safeStorage.getItem("abcde_notify_mindset") !== "false",
  );
  const [notifySound, setNotifySound] = useState(
    () => safeStorage.getItem("abcde_notify_sound") !== "false",
  );
  const [taskCompleteSound, setTaskCompleteSound] = useState(
    () => safeStorage.getItem("abcde_task_complete_sound") !== "false",
  );

  // Reset confirmation state
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetFinished, setResetFinished] = useState(false);

  // Save notifications to localstorage
  useEffect(() => {
    safeStorage.setItem("abcde_notify_morning", String(notifyMorning));
  }, [notifyMorning]);
  useEffect(() => {
    safeStorage.setItem("abcde_notify_midday", String(notifyMidday));
  }, [notifyMidday]);
  useEffect(() => {
    safeStorage.setItem("abcde_notify_evening", String(notifyEvening));
  }, [notifyEvening]);
  useEffect(() => {
    safeStorage.setItem("abcde_notify_mindset", String(notifyMindset));
  }, [notifyMindset]);
  useEffect(() => {
    safeStorage.setItem("abcde_notify_sound", String(notifySound));
  }, [notifySound]);
  useEffect(() => {
    safeStorage.setItem("abcde_task_complete_sound", String(taskCompleteSound));
    window.dispatchEvent(new Event("task_complete_sound_changed"));
  }, [taskCompleteSound]);

  const handleResetApp = async () => {
    setResetFinished(true);

    if (currentUser && onResetUserData) {
      try {
        await onResetUserData();
      } catch (err) {
        console.error("Failed to delete user cloud data: ", err);
      }
    }

    // Proactively clear local storage now
    safeStorage.clear();
    safeStorage.setItem("discovery_manual_tasks_completed", "0");
    window.dispatchEvent(new Event("trigger-hard-reset"));

    if (currentUser) {
      try {
        await onSignOut();
      } catch (err) {
        console.error("Sign out failed", err);
      }
    }

    setTimeout(() => {
      // Clear again right before reload just in case
      safeStorage.clear();
      window.location.reload();
    }, 1000);
  };

  // Translations
  const t = {
    title:
      language === "en" ? "Settings" : language === "tr" ? "Ayarlar" : "Podešavanja",
    accountTitle:
      language === "en" ? "Account" : language === "tr" ? "Hesap" : "Nalog",
    loggedOutMsg:
      language === "en" ? "Offline Local Mode" : language === "tr" ? "Çevrimdışı Yerel Mod" : "Lokalni režim rada",
    signInBtn:
      language === "en" ? "Sign In to Sync" : language === "tr" ? "Senkronize Etmek İçin Giriş Yap" : "Prijavi se za sinhronizaciju",
    signOutBtn:
      language === "en" ? "Sign Out" : language === "tr" ? "Çıkış Yap" : "Odjavi se",

    themeTitle:
      language === "en" ? "APPEARANCE" : language === "tr" ? "GÖRÜNÜM" : "IZGLED",
    themeAuto:
      language === "en" ? "Automatic" : language === "tr" ? "Otomatik" : "Automatski",
    themeDay:
      language === "en" ? "Light" : language === "tr" ? "Açık" : "Svetla",
    themeNight:
      language === "en" ? "Dark" : language === "tr" ? "Koyu" : "Tamna",
    sunriseLabel:
      language === "en" ? "Sunrise" : language === "tr" ? "Gündoğumu" : "Izlazak Sunca",
    sunsetLabel:
      language === "en" ? "Sunset" : language === "tr" ? "Günbatımı" : "Zalazak Sunca",

    notifyTitle:
      language === "en" ? "NOTIFICATIONS" : language === "tr" ? "BİLDİRİMLER" : "OBAVEŠTENJA",
    notifyMorning:
      language === "en" ? "Morning Kickstart (07:00)" : language === "tr" ? "Sabah Başlangıcı (07:00)" : "Jutarnje pokretanje (07:00)",
    notifyMidday:
      language === "en" ? "Mid-day Focus Check" : language === "tr" ? "Öğle Odak Kontrolü" : "Popodnevni fokus",
    notifyEvening:
      language === "en" ? "Evening Reflection (21:00)" : language === "tr" ? "Akşam Değerlendirmesi (21:00)" : "Večernja analiza (21:00)",
    notifyHabit:
      language === "en" ? "Mindset & Habits" : language === "tr" ? "Zihniyet ve Alışkanlıklar" : "Mindset i Navike",
    notifySound:
      language === "en" ? "System Sounds" : language === "tr" ? "Sistem Sesleri" : "Sistemski zvukovi",

    voiceTitle:
      language === "en" ? "VOICE & SPEECH" : language === "tr" ? "SES VE KONUŞMA" : "GLAS I RAZGOVOR",
    voiceAutoProcess:
      language === "en" ? "Auto-Process Inputs" : language === "tr" ? "Girdileri Otomatik İşle" : "Automatska obrada unosa",
    voiceAutoProcessDesc:
      language === "en" ? "Immediately send text to Michael Vance AI for structured task creation as soon as recording finishes." : language === "tr" ? "Kayıt biter bitmez yapılandırılmış görev oluşturma için metni hemen Michael Vance AI'ye gönderin." : "Odmah pošalji tekst Michael Vance AI za kreiranje zadataka čim se završi snimanje.",

    dangerTitle:
      language === "en" ? "DANGER ZONE" : language === "tr" ? "TEHLİKE BÖLGESİ" : "OPASNA ZONA",
    resetBtn:
      language === "en" ? "Erase All Content & Settings" : language === "tr" ? "Tüm İçeriği ve Ayarları Sil" : "Obriši sav sadržaj i podešavanja",
    resetWarning:
      language === "en" ? "Type 'RESTART' to confirm:" : language === "tr" ? "Onaylamak için 'RESTART' yazın:" : "Unesite 'RESTART' za potvrdu:",
    resetCancel:
      language === "en" ? "Cancel" : language === "tr" ? "İptal" : "Otkaži",
    resetSuccess:
      language === "en" ? "Erasing..." : language === "tr" ? "Siliniyor..." : "Brisanje...",

    langTitle:
      language === "en" ? "LANGUAGE" : language === "tr" ? "DİL" : "JEZIK",
    dataTitle:
      language === "en" ? "DATA MANAGEMENT" : language === "tr" ? "VERİ YÖNETİMİ" : "UPRAVLJANJE PODACIMA",
    archiveTitle:
      language === "en" ? "Archive Completed Tasks" : language === "tr" ? "Tamamlanan Görevleri Arşivle" : "Arhiviranje završenih zadataka",
    archiveDesc:
      language === "en" ? "Old completed tasks (completed more than 30 days ago) are automatically archived to a separate Firestore collection or local database. This keeps your active view clean and fast." : language === "tr" ? "Eski tamamlanan görevler (30 günden daha önce tamamlananlar) otomatik olarak ayrı bir Firestore koleksiyonuna veya yerel veritabanına arşivlenir. Bu, aktif görünümünüzü temiz ve hızlı tutar." : "Zadaci završeni pre više od 30 dana automatski se premeštaju u zasebnu arhivsku kolekciju u Firestore-u. Ovo smanjuje veličinu aktivnog dokumenta i ubrzava rad sistema.",
    archiving:
      language === "en" ? "Archiving..." : language === "tr" ? "Arşivleniyor..." : "Arhiviranje...",
    runArchive:
      language === "en" ? "Run Archiving Now" : language === "tr" ? "Arşivlemeyi Şimdi Başlat" : "Pokreni arhiviranje odmah",
    syncTitle:
      language === "en" ? "Data Sync & Backup" : language === "tr" ? "Veri Senkronizasyonu ve Yedekleme" : "Sinhronizacija i Backup",
    syncDesc:
      language === "en" ? "Your data is automatically synced across devices. We recommend manually triggering a backup if you plan to clear your browser cache." : language === "tr" ? "Verileriniz cihazlar arasında otomatik olarak senkronize edilir. Tarayıcı önbelleğinizi temizlemeyi planlıyorsanız manuel olarak bir yedekleme başlatmanızı öneririz." : "Podaci se automatski čuvaju. Preporučujemo ručni backup ako planirate da čistite keš pretraživača.",
    manualBackup:
      language === "en" ? "Manual Backup" : language === "tr" ? "Manuel Yedekleme" : "Ručni Backup",
    restoreData:
      language === "en" ? "Restore Data" : language === "tr" ? "Verileri Geri Yükle" : "Vrati podatke",
    accountSection:
      language === "en" ? "ACCOUNT" : language === "tr" ? "HESAP" : "NALOG",
    premiumActive:
      language === "en" ? "Premium Plan Active" : language === "tr" ? "Premium Plan Aktif" : "Premium Plan Aktivan",
    signOut:
      language === "en" ? "Sign Out" : language === "tr" ? "Çıkış Yap" : "Odjavi se",
    dangerDesc:
      language === "en" ? "This action is irreversible. All cached data will be destroyed." : language === "tr" ? "Bu işlem geri alınamaz. Tüm önbelleğe alınmış veriler imha edilecektir." : "Ova akcija je nepovratna. Svi keširani podaci biće uništeni.",
  };

  return (
    <div className="w-full pb-16 pt-2">
      {/* Large Title */}
      <h1 className="text-[34px] font-medium text-black dark:text-white px-4 mb-4">
        {t.title}
      </h1>

      <div className="space-y-6">
        {/* ACCOUNT SECTION (iOS ID Card style) */}
        <div className="px-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="flex items-center p-4">
              {currentUser ? (
                <>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Profile"
                      className="w-[60px] h-[60px] rounded-full mr-4 object-cover border border-black/5 dark:border-white/5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-[60px] h-[60px] rounded-full bg-[#8E8E93] text-white flex items-center justify-center text-xl font-medium mr-4">
                      {(
                        currentUser.displayName ||
                        currentUser.email ||
                        "U"
                      ).charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[20px] font-medium text-black dark:text-white truncate">
                      {currentUser.displayName || "Kaizen User"}
                    </p>
                    <p className="text-[15px] text-[#3C3C43] dark:text-[#EBEBF5]/80 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[60px] h-[60px] rounded-full border border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white flex items-center justify-center mr-4 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[20px] font-medium text-black dark:text-white truncate">
                      {t.loggedOutMsg}
                    </p>
                    <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5">
                      {isEn ? "Data stored locally." : language === "tr" ? "Veriler yerel olarak saklanır." : "Podaci se čuvaju lokalno."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CLOUD SYNC CARD (Separate group in iOS Settings if logged out or actionable) */}
        {!currentUser && (
          <div className="px-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="pl-4">
                <button
                  onClick={onSignIn}
                  className="w-full text-left py-3 text-[17px] text-[#007AFF] dark:text-[#0A84FF] active:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:active:bg-[#2C2C2E] transition-colors pr-4"
                >
                  {t.signInBtn}
                </button>
              </div>
            </div>
            <p className="px-4 mt-2 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 tracking-normal leading-tight">
              {isEn ? "Sign in to securely back up your tasks and progress to the cloud." : language === "tr" ? "Görevlerinizi ve ilerlemenizi buluta güvenli bir şekilde yedeklemek için giriş yapın." : "Prijavite se kako biste sigurno sačuvali zadatke i napredak na cloud."}
            </p>
          </div>
        )}

        {currentUser && (
          <div className="px-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="pl-4">
                <button
                  onClick={onSignOut}
                  className="w-full text-left py-3 text-[17px] text-[#FF3B30] dark:text-[#FF453A] active:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:active:bg-[#2C2C2E] transition-colors pr-4"
                >
                  {t.signOutBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IPHONE HOME SCREEN ICON INSTALLATION CARD */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 uppercase tracking-wide font-medium">
            {isEn ? "iPhone Home Screen Launcher" : language === "tr" ? "iPhone Ana Ekrana Ekleme" : "Instalacija na Početni Ekran iPhone-a"}
          </h3>

          <div className="bg-gradient-to-b from-white to-[#F9F9FB] dark:from-[#1C1C1E] dark:to-[#151517] rounded-xl p-5 border border-amber-500/20 dark:border-amber-500/25 shadow-sm space-y-4">
            {/* Visual Icon Preview Group */}
            <div className="flex items-center gap-4 bg-white/50 dark:bg-[#000000]/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-[18px] opacity-25 blur-sm group-hover:opacity-40 transition-opacity"></div>
                <div className="relative w-16 h-16 rounded-[14px] bg-[#0E0E10] shadow-md border border-amber-500/30 flex items-center justify-center overflow-hidden">
                  <img
                    src="/apple-touch-icon.svg"
                    alt="ABCDE iOS Icon"
                    className="w-[58px] h-[58px] rounded-[12px] object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <span className="text-[11px] font-bold text-[#FF9500]/90 tracking-wide uppercase">
                  {isEn ? "NATIVE APPLE MOCKUP" : language === "tr" ? "ANA EKRAN İÇİN TASARLANDI" : "DIZAJNIRAN ZA POČETNI EKRAN"}
                </span>
                <h4 className="text-[17px] font-bold text-black dark:text-white leading-tight mt-0.5">
                  {language === "tr" ? "ABCDE Öncelikleri" : language === "en" ? "ABCDE Priorities" : "ABCDE Prioriteti"}
                </h4>
                <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5 font-medium leading-normal">
                  {isEn ? "Sleek gold checkmark & obsidian matte iOS icon design." : language === "tr" ? "Altın renkli onay işareti ile mat siyah arka planın lüks kombinasyonu pil tasarrufu sağlar." : "Luksuzan spoj zlatnog checkmark-a i mat crne podloge štedi bateriju."}
                </p>
              </div>
            </div>

            {/* Steps Section */}
            <div className="space-y-3.5 text-left">
              <p className="text-[14px] font-bold text-black dark:text-white leading-tight">
                {isEn ? "3 Simple Steps to install:" : language === "tr" ? "3 kolay adımda hızlı kurulum:" : "Brza instalacija u 3 kratka koraka:"}
              </p>

              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-[13px] text-black dark:text-[#EBEBF5] leading-relaxed">
                    {isEn ? (
                      <>
                        Tap the{" "}
                        <strong className="font-bold text-[#007AFF] dark:text-[#0A84FF] inline-flex items-center gap-0.5">
                          Share <Share className="w-3.5 h-3.5" />
                        </strong>{" "}
                        button on your iOS Safari browser (bottom bar on iPhone,
                        top on iPad).
                      </>
                    ) : language === "tr" ? (
                      <>
                        iOS Safari tarayıcınızın altındaki{" "}
                        <strong className="font-bold text-[#007AFF] dark:text-[#0A84FF] inline-flex items-center gap-0.5">
                          Paylaş <Share className="w-3.5 h-3.5" />
                        </strong>{" "}
                        (Paylaş / Share) düğmesine dokunun.
                      </>
                    ) : (
                      <>
                        Pritisnite dugme za deljenje (
                        <strong className="font-bold text-[#007AFF] dark:text-[#0A84FF] inline-flex items-center gap-0.5">
                          Deljenje <Share className="w-3.5 h-3.5" />
                        </strong>{" "}
                        / Share) na dnu vašeg Safari pretraživača.
                      </>
                    )}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-[13px] text-black dark:text-[#EBEBF5] leading-relaxed">
                    {isEn ? (
                      <>
                        Scroll down the sharing panel and select{" "}
                        <strong className="font-bold text-[#007AFF] dark:text-[#0A84FF]">
                          "Add to Home Screen"
                        </strong>{" "}
                        with a plus icon.
                      </>
                    ) : language === "tr" ? (
                      <>
                        Paylaşım panelinde aşağı kaydırın ve artı simgesi olan{" "}
                        <strong className="font-bold text-[#007AFF] dark:text-[#0A84FF]">
                          "Ana Ekrana Ekle"
                        </strong>{" "}
                        ("Add to Home Screen") seçeneğini belirleyin.
                      </>
                    ) : (
                      <>
                        Skrolujte na dole kroz prozor i izaberite opciju{" "}
                        <strong className="font-bold text-[#007AFF] dark:text-[#0A84FF]">
                          "Dodaj na početni ekran"
                        </strong>{" "}
                        ("Add to Home Screen").
                      </>
                    )}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-[13px] text-black dark:text-[#EBEBF5] leading-relaxed">
                    {isEn ? (
                      <>
                        Confirm by tapping{" "}
                        <strong className="font-bold text-[#34C759]">
                          "Add"
                        </strong>{" "}
                        in the top right. Enjoy full standalone native
                        application features.
                      </>
                    ) : language === "tr" ? (
                      <>
                        Tamamlamak için sağ üst köşedeki{" "}
                        <strong className="font-bold text-[#34C759]">
                          "Ekle"
                        </strong>{" "}
                        düğmesine dokunun. Simge telefonunuzda görünecektir!
                      </>
                    ) : (
                      <>
                        Dodirnite{" "}
                        <strong className="font-bold text-[#34C759]">
                          "Dodaj"
                        </strong>{" "}
                        u gornjem desnom uglu da biste dovršili. Ikone će se
                        pojaviti na vašem telefonu!
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Standalone features badge highlight */}
            <div className="pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#7676800D] p-2 rounded-lg">
                <span className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                  {isEn ? "Native Viewport" : language === "tr" ? "Yerel Görünüm" : "Native Prikaz"}
                </span>
                <span className="text-[12px] font-bold text-black dark:text-white block mt-0.5">
                  {isEn ? "Fullscreen PWA" : language === "tr" ? "Safari çubuğu olmadan tam ekran" : "Ceo ekran bez Safari bara"}
                </span>
              </div>
              <div className="bg-[#7676800D] p-2 rounded-lg">
                <span className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                  {isEn ? "Launch Time" : language === "tr" ? "Hızlı Başlatma" : "Kvantno pokretanje"}
                </span>
                <span className="text-[12px] font-bold text-black dark:text-white block mt-0.5">
                  {isEn ? "Instant (0.8s)" : language === "tr" ? "Neredeyse anında (~0.8 sn)" : "Skoro trenutno (~0.8s)"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 text-center leading-normal mt-1 italic">
              {isEn ? "Note: Add to Home Screen is supported specifically in iOS Safari of Apple mobile ecosystem." : language === "tr" ? "Not: Ana Ekrana Ekleme seçeneği, özellikle Apple mobil ekosistemindeki iOS Safari'de desteklenir." : "Napomena: iOS zahteva Safari pretraživač za instalaciju samostalnih aplikacija."}
            </p>
          </div>
        </div>

        {/* APPEARANCE SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5">
            {t.themeTitle}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="flex items-center justify-evenly p-5 pb-5 select-none font-sans">
              <div
                className="flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => onThemeChange("light")}
              >
                <div
                  className={`w-[68px] h-[100px] rounded-[12px] bg-[#F2F2F7] dark:bg-[#1C1C1E] transition-all relative overflow-hidden border ${
                    themeMode === "light"
                      ? "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1E] border-transparent"
                      : "border-black/5 dark:border-white/5 hover:border-black/20"
                  }`}
                >
                  <div className="w-full h-8 bg-white dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/5" />
                  <div className="p-2 space-y-1.5 mt-1">
                    <div className="h-1.5 bg-black/10 rounded-full w-full" />
                    <div className="h-1.5 bg-black/10 rounded-full w-2/3" />
                  </div>
                </div>
                <span
                  className={`text-[13px] font-semibold transition-colors duration-200 ${
                    themeMode === "light"
                      ? "text-[#007AFF] dark:text-[#0A84FF]"
                      : "text-black dark:text-white"
                  }`}
                >
                  {t.themeDay}
                </span>
              </div>

              <div
                className="flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => onThemeChange("dark")}
              >
                <div
                  className={`w-[68px] h-[100px] rounded-[12px] bg-[#1C1C1E] transition-all relative overflow-hidden border ${
                    themeMode === "dark"
                      ? "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1E] border-transparent"
                      : "border-white/5 hover:border-white/15"
                  }`}
                >
                  <div className="w-full h-8 bg-[#2C2C2E] border-b border-white/5" />
                  <div className="p-2 space-y-1.5 mt-1">
                    <div className="h-1.5 bg-white dark:bg-[#1C1C1E]/10 rounded-full w-full" />
                    <div className="h-1.5 bg-white dark:bg-[#1C1C1E]/10 rounded-full w-2/3" />
                  </div>
                </div>
                <span
                  className={`text-[13px] font-semibold transition-colors duration-200 ${
                    themeMode === "dark"
                      ? "text-[#007AFF] dark:text-[#0A84FF]"
                      : "text-black dark:text-white"
                  }`}
                >
                  {t.themeNight}
                </span>
              </div>

              <div
                className="flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => onThemeChange("auto")}
              >
                <div
                  className={`w-[68px] h-[100px] rounded-[12px] flex transition-all relative overflow-hidden border ${
                    themeMode === "auto"
                      ? "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1E] border-transparent"
                      : "border-black/5 dark:border-white/5 hover:opacity-90"
                  }`}
                >
                  {/* Left Side: Light */}
                  <div className="flex-1 h-full bg-[#F2F2F7] dark:bg-[#1C1C1E] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-white dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/5" />
                    <div className="absolute top-10 left-2 right-1 space-y-1.5">
                      <div className="h-1.5 bg-black/10 rounded-full w-full" />
                    </div>
                  </div>
                  {/* Right Side: Dark */}
                  <div className="flex-1 h-full bg-[#1C1C1E] relative overflow-hidden border-l border-white/5">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-[#2C2C2E] border-b border-white/5" />
                    <div className="absolute top-10 left-2 right-1 space-y-1.5">
                      <div className="h-1.5 bg-white dark:bg-[#1C1C1E]/10 rounded-full w-2/3" />
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[13px] font-semibold transition-colors duration-200 ${
                    themeMode === "auto"
                      ? "text-[#007AFF] dark:text-[#0A84FF]"
                      : "text-black dark:text-white"
                  }`}
                >
                  {t.themeAuto}
                </span>
              </div>
            </div>

            {themeMode === "auto" && (
              <div className="pl-4">
                <div className="border-t border-black/5 dark:border-white/5"></div>
                <div className="flex items-center justify-between pr-4 py-3">
                  <div className="flex flex-col text-left">
                    <span className="text-[16px] font-semibold text-black dark:text-white">
                      {isEn ? "Sync with iPhone Theme" : language === "tr" ? "Sistem Temasını Takip Et" : "Prati sistemsku iPhone temu"}
                    </span>
                    <span className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {isEn ? "Automatically track dark mode changes" : language === "tr" ? "Görünümü cihaz ayarlarıyla uyumlu hale getirir" : "Usklađuje izgled sa postavkama uređaja"}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={followSystemTheme}
                      onChange={(e) =>
                        onFollowSystemThemeChange(e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-[51px] h-[31px] bg-[#7676802E] rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-[20px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#1C1C1E] after:rounded-full after:h-[27px] after:w-[27px] after:shadow-[0_3px_8px_rgba(0,0,0,0.15)] after:transition-transform peer-checked:bg-[#34C759]"></div>
                  </label>
                </div>

                {!followSystemTheme && (
                  <div className="transition-all duration-300">
                    <div className="border-t border-black/5 dark:border-white/5"></div>
                    <div className="flex items-center justify-between pr-4 py-2.5">
                      <span className="text-[17px] text-black dark:text-white">
                        {t.sunriseLabel}
                      </span>
                      <div className="bg-[#7676801F] dark:bg-[#7676803D] rounded-[6px] px-2 py-1">
                        <input
                          type="time"
                          value={sunriseTime}
                          onChange={(e) => onSunriseChange(e.target.value)}
                          className="bg-transparent w-auto min-w-[70px] text-[17px] text-[#007AFF] dark:text-[#0A84FF] font-medium outline-none text-center appearance-none"
                        />
                      </div>
                    </div>
                    <div className="border-t border-black/5 dark:border-white/5"></div>
                    <div className="flex items-center justify-between pr-4 py-2.5">
                      <span className="text-[17px] text-black dark:text-white">
                        {t.sunsetLabel}
                      </span>
                      <div className="bg-[#7676801F] dark:bg-[#7676803D] rounded-[6px] px-2 py-1">
                        <input
                          type="time"
                          value={sunsetTime}
                          onChange={(e) => onSunsetChange(e.target.value)}
                          className="bg-transparent w-auto min-w-[70px] text-[17px] text-[#007AFF] dark:text-[#0A84FF] font-medium outline-none text-center appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* LANGUAGE SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide text-left">
            {t.langTitle}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden pl-4">
            <div
              className="flex items-center justify-between pr-4 py-2 cursor-pointer active:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("en")}
            >
              <div className="flex items-center gap-3">
                <div className="w-[29px] h-[29px] rounded-[7px] bg-[#00C7BE] flex items-center justify-center shrink-0 shadow-sm">
                  <Globe
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                </div>
                <span className="text-[17px] text-black dark:text-white">
                  English
                </span>
              </div>
              {language === "en" && (
                <Check
                  className="w-[20px] h-[20px] text-[#007AFF] dark:text-[#0A84FF]"
                  strokeWidth={2.5}
                />
              )}
            </div>
            <div className="border-b border-black/5 dark:border-white/5"></div>
            <div
              className="flex items-center justify-between pr-4 py-2 cursor-pointer active:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("sr")}
            >
              <div className="flex items-center gap-3">
                <div className="w-[29px] h-[29px] rounded-[7px] bg-[#34C759] flex items-center justify-center shrink-0 shadow-sm">
                  <Globe
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                </div>
                <span className="text-[17px] text-black dark:text-white">
                  Srpski
                </span>
              </div>
              {language === "sr" && (
                <Check
                  className="w-[20px] h-[20px] text-[#007AFF] dark:text-[#0A84FF]"
                  strokeWidth={2.5}
                />
              )}
            </div>
            <div className="border-b border-black/5 dark:border-white/5"></div>
            <div
              className="flex items-center justify-between pr-4 py-2 cursor-pointer active:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("tr")}
            >
              <div className="flex items-center gap-3">
                <div className="w-[29px] h-[29px] rounded-[7px] bg-[#FF9500] flex items-center justify-center shrink-0 shadow-sm">
                  <Globe
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                </div>
                <span className="text-[17px] text-black dark:text-white">
                  Türkçe
                </span>
              </div>
              {language === "tr" && (
                <Check
                  className="w-[20px] h-[20px] text-[#007AFF] dark:text-[#0A84FF]"
                  strokeWidth={2.5}
                />
              )}
            </div>
          </div>
        </div>

        {/* SHARE APP SECTION */}
        <div className="px-4 mt-6">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide text-left">
            {(translations[language] || translations["en"]).shareApp ||
              "SHARE APP"}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="text-left flex-1 min-w-0">
                <span className="text-[17px] font-semibold text-black dark:text-white block">
                  {language === "tr"
                    ? "Hızlı Paylaşım Bağlantısı"
                    : language === "en" ? "Instant Public Share Link" : "Javni link za trenutno deljenje"}
                </span>
                <span className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block mt-0.5 leading-normal">
                  {language === "tr"
                    ? "Uygulamayı iş arkadaşlarınıza, ortaklarınıza veya arkadaşlarınıza göndermek için genel URL'yi panoya kopyalayın."
                    : language === "en" ? "Copy the public URL to your clipboard to send this application to colleagues, partners, or friends." : "Kopirajte javni URL u privremenu memoriju da biste poslali ovu aplikaciju kolegama, partnerima ili prijateljima."}
                </span>
              </div>
              <motion.button
                onClick={handleCopyShareLink}
                whileTap={{ scale: 0.95 }}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer ${
                  copiedLink
                    ? "bg-[#34C759] text-white"
                    : "bg-[#007AFF] text-white hover:bg-[#007AFF]/95"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check
                      className="w-4 h-4 shrink-0 text-white"
                      strokeWidth={2.5}
                    />
                    <span>
                      {language === "tr"
                        ? "Kopyalandı!"
                        : language === "en" ? "Copied!" : "Kopirano!"}
                    </span>
                  </>
                ) : (
                  <>
                    <Share className="w-4 h-4 shrink-0 text-white" />
                    <span>
                      {language === "tr"
                        ? "Bağlantıyı Kopyala"
                        : language === "en" ? "Copy Link" : "Kopiraj link"}
                    </span>
                  </>
                )}
              </motion.button>
            </div>

            {copiedLink && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg text-xs text-green-700 dark:text-green-400 font-medium border border-green-500/20 text-left"
              >
                {
                  (translations[language] || translations["en"])
                    .copiedPublicLink
                }
              </motion.div>
            )}

            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/15 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {
                    (translations[language] || translations["en"])
                      .shareWarningTitle
                  }
                </span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                {
                  (translations[language] || translations["en"])
                    .shareWarningBody
                }
              </p>
            </div>
          </div>
        </div>

        {/* DATA ARCHIVING SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide text-left">
            {t.dataTitle}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-amber-500/10 text-[#FF9500] flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="text-[17px] font-semibold text-black dark:text-white leading-tight">
                  {t.archiveTitle}
                </h4>
                <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 pr-1 leading-normal">
                  {t.archiveDesc}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (onArchiveOldTasks) {
                  setIsArchiving(true);
                  try {
                    await onArchiveOldTasks();
                  } finally {
                    setIsArchiving(false);
                  }
                }
              }}
              disabled={isArchiving}
              className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 disabled:opacity-50 text-white rounded-xl py-2.5 text-[15px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isArchiving ? "animate-spin" : ""}`}
              />
              {isArchiving ? t.archiving : t.runArchive}
            </button>
          </div>
        </div>

        {/* DATA SYNC SECTION */}
        <div className="px-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="text-[17px] font-semibold text-black dark:text-white leading-tight">
                  {t.syncTitle}
                </h4>
                <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 pr-1 leading-normal">
                  {t.syncDesc}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1.5">
              <button className="flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#007AFF] py-2.5 rounded-xl text-[15px] font-semibold transition-all active:scale-95">
                {t.manualBackup}
              </button>
              <button className="flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#34C759] py-2.5 rounded-xl text-[15px] font-semibold transition-all active:scale-95">
                {t.restoreData}
              </button>
            </div>
          </div>
        </div>

        {/* ACCOUNT SETTINGS - ONLY IF LOGGED IN */}
        {currentUser && (
          <div className="px-4">
            <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide text-left">
              {t.accountSection}
            </h3>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden divide-y divide-[#C6C6C8] dark:divide-[#38383A]">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center text-white font-bold text-lg">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-[17px] font-medium text-black dark:text-white leading-tight">
                      {currentUser.email}
                    </p>
                    <p className="text-[13px] text-[#8E8E93]">
                      {t.premiumActive}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSignOut()}
                  className="text-[#FF3B30] font-semibold text-[15px]"
                >
                  {t.signOut}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VOICE PREFERENCES SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide">
            {t.voiceTitle}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden pl-4 p-4">
            <div className="flex justify-between items-center pr-4">
              <div className="flex flex-col text-left max-w-[75%] pr-2">
                <span className="text-[16px] font-semibold text-black dark:text-white">
                  {t.voiceAutoProcess}
                </span>
                <span className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-tight">
                  {t.voiceAutoProcessDesc}
                </span>
              </div>
              <label className="relative inline-block w-[51px] h-[31px] shrink-0">
                <input
                  type="checkbox"
                  className="peer w-0 h-0 opacity-0"
                  checked={autoProcessVoice}
                  onChange={(e) => onAutoProcessVoiceChange(e.target.checked)}
                />
                <span className="absolute cursor-pointer inset-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-colors duration-300 peer-checked:bg-[#34C759]"></span>
                <span className="absolute left-[2px] top-[2px] bg-white dark:bg-[#1C1C1E] w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 peer-checked:translate-x-[20px]"></span>
              </label>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide">
            {t.notifyTitle}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden pl-4">
            {[
              {
                id: "morning",
                title: t.notifyMorning,
                val: notifyMorning,
                setVal: setNotifyMorning,
                icon: (
                  <Sun
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                ),
                bg: "bg-[#FF9500]",
              },
              {
                id: "midday",
                title: t.notifyMidday,
                val: notifyMidday,
                setVal: setNotifyMidday,
                icon: (
                  <Clock
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                ),
                bg: "bg-[#007AFF]",
              },
              {
                id: "evening",
                title: t.notifyEvening,
                val: notifyEvening,
                setVal: setNotifyEvening,
                icon: (
                  <Moon
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                ),
                bg: "bg-[#5856D6]",
              },
              {
                id: "mindset",
                title: t.notifyHabit,
                val: notifyMindset,
                setVal: setNotifyMindset,
                icon: (
                  <Brain
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                ),
                bg: "bg-[#AF52DE]",
              },
              {
                id: "sounds",
                title: t.notifySound,
                val: notifySound,
                setVal: setNotifySound,
                icon: (
                  <Volume2
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                ),
                bg: "bg-[#FF2D55]",
              },
              {
                id: "taskCompleteSound",
                title:
                  language === "en"
                    ? "Task Complete Sound"
                    : language === "tr"
                      ? "Görev Tamamlama Sesi"
                      : "Zvuk završetka obaveze",
                val: taskCompleteSound,
                setVal: setTaskCompleteSound,
                icon: (
                  <Check
                    className="w-[16px] h-[16px] text-white"
                    strokeWidth={2.25}
                  />
                ),
                bg: "bg-[#34C759]",
              },
            ].map((notif, index, arr) => (
              <React.Fragment key={notif.id}>
                <div className="flex justify-between items-center py-2 pr-4">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div
                      className={`w-[29px] h-[29px] rounded-[7px] ${notif.bg} flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      {notif.icon}
                    </div>
                    <span className="text-[17px] text-black dark:text-white truncate">
                      {notif.title}
                    </span>
                  </div>
                  <label className="relative inline-block w-[51px] h-[31px] shrink-0">
                    <input
                      type="checkbox"
                      className="peer w-0 h-0 opacity-0"
                      checked={notif.val}
                      onChange={(e) => notif.setVal(e.target.checked)}
                    />
                    <span className="absolute cursor-pointer inset-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-colors duration-300 peer-checked:bg-[#34C759]"></span>
                    <span className="absolute left-[2px] top-[2px] bg-white dark:bg-[#1C1C1E] w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 peer-checked:translate-x-[20px]"></span>
                  </label>
                </div>
                {index < arr.length - 1 && (
                  <div className="border-b border-black/5 dark:border-white/5"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* APPLE HIG COMPLIANCE STATEMENT CARDS (Featured by Apple Spec) */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 uppercase tracking-wide font-medium">
            {isEn ? "Apple HIG Compliance Standard" : language === "tr" ? "Apple HIG Uyumluluk Standardı" : "Usklađenost sa Apple HIG Smernicama"}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-5 border border-black/5 dark:border-white/5 space-y-4">
            <div className="flex items-start gap-4 pb-3 border-b border-black/5 dark:border-white/5">
              <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#0A84FF] uppercase tracking-normal block">
                  {isEn ? "Human Interface Alignment" : language === "tr" ? "Kullanıcı Arayüzü Yönergeleri" : "Smernice za Dizajn Interfejsa"}
                </span>
                <h4 className="text-[16px] font-semibold text-black dark:text-white mt-0.5 leading-tight">
                  {isEn ? "Designed for Apple Ecosystem" : language === "tr" ? "Apple Ekosistemi için Tasarlandı" : "Prilagođeno Apple standardima dizajna"}
                </h4>
                <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1 pr-2 leading-relaxed text-left">
                  {isEn ? "This ecosystem is meticulously designed to respect the official Apple Human Interface Guidelines, prioritizing high text legibility, dynamic light/dark contrast, physical tactile feedback, and intuitive navigation." : language === "tr" ? "Bu sistem, yüksek metin okunabilirliği, dinamik aydınlık/karanlık kontrastı, fiziksel dokunsal geri bildirim ve sezgisel gezinmeyi önceliklendirerek resmi Apple İnsan Arayüzü Yönergelerine uyumlu olacak şekilde tasarlanmıştır." : "Izgled i rad celog sistema su pažljivo projektovani prema zvaničnim Apple smernicama. Fokus je na visokoj čitljivosti, prelepom kontrastu, prirodnom kretanju i maksimalnoj pristupačnosti."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
              {[
                {
                  title: isEn ? "Dynamic Physical Scale" : language === "tr" ? "Dinamik Fiziksel Ölçek" : "Fizičko gibanje na klik",
                  desc: isEn ? "Elastic scale-down physics on click triggers" : language === "tr" ? "Tıklamalarda esnek küçülme fiziği" : "Kontrole reaktivno reaguju na dodir",
                  active: true,
                },
                {
                  title: isEn ? "Adaptive Dynamic Type" : language === "tr" ? "Uyarlanabilir Dinamik Tipografi" : "Dinamičke skale teksta",
                  desc: isEn ? "Complete scaling from standard to extra-large" : language === "tr" ? "Standarttan ekstra büyüğe tam ölçeklendirme" : "Potpuna podrška za promenu veličine teksta",
                  active: true,
                },
                {
                  title: isEn ? "Contrast Alignment" : language === "tr" ? "Kontrast Hizalaması" : "Validovana čitljivost",
                  desc: isEn ? "High-contrast dark / light adaptivity" : language === "tr" ? "Yüksek kontrastlı karanlık / aydınlık uyumu" : "Izuzetan kontrast na svetloj i tamnoj temi",
                  active: true,
                },
                {
                  title: isEn ? "Trilingual Localization" : language === "tr" ? "Üç Dilli Yerelleştirme" : "Trojzična lokalizacija",
                  desc: isEn ? "English, Serbian & Turkish semantic translations" : language === "tr" ? "İngilizce, Sırpça ve Türkçe anlamsal çeviriler" : "Ekvivalentan prevod na engleski, srpski i turski",
                  active: true,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 items-start p-2.5 rounded-lg bg-[#F2F2F7] dark:bg-[#000000]/40 border border-black/5 dark:border-white/5"
                >
                  <div className="bg-[#34C759]/15 text-[#34C759] dark:text-[#30D158] p-0.5 rounded-full shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-black dark:text-white block leading-tight">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block leading-tight mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SYSTEM ACTIONS */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 px-2 mb-1.5 font-medium uppercase tracking-wide text-left">
            {t.dangerTitle}
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
            {!showResetConfirm ? (
              <div className="pl-4">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full text-left py-[11px] pr-4 text-[17px] text-[#FF3B30] dark:text-[#FF453A] active:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:active:bg-[#2C2C2E] transition-colors"
                >
                  {t.resetBtn}
                </button>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-3">
                <span className="text-[15px] text-black dark:text-[#EBEBF5] text-center font-medium">
                  {t.resetWarning}
                </span>
                <div className="bg-[#7676801F] dark:bg-[#7676803D] rounded-[8px] p-2">
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESTART"
                    className="w-full bg-transparent text-black dark:text-white text-center text-[17px] outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 w-full mt-1">
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetConfirmText("");
                    }}
                    className="flex-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] text-black dark:text-white rounded-xl py-2.5 text-[17px] font-semibold active:opacity-70 transition-opacity"
                  >
                    {t.resetCancel}
                  </button>
                  <button
                    onClick={handleResetApp}
                    disabled={resetConfirmText.toUpperCase() !== "RESTART"}
                    className="flex-1 rounded-xl py-2.5 text-[17px] font-semibold transition-opacity bg-[#FF3B30] text-white disabled:opacity-50 disabled:active:opacity-50 active:opacity-70"
                  >
                    {isEn ? "RESTART" : language === "tr" ? "YENİDEN BAŞLAT" : "RESTARTUJ"}
                  </button>
                </div>
              </div>
            )}
            {resetFinished && (
              <div className="border-t border-black/5 dark:border-white/5 py-3 text-center text-[#FF3B30] dark:text-[#FF453A] text-[15px] font-medium transition-opacity">
                {t.resetSuccess}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
