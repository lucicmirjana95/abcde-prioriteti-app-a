import fs from 'fs';

const content = `import React, { useState, useEffect } from "react";
import { 
  User, LogIn, LogOut, Sun, Moon, Clock, Bell, Trash2, 
  RefreshCw, Check, Info, Shield, AlertTriangle, Sparkles,
  ChevronRight
} from "lucide-react";

interface SettingsPanelProps {
  language: "en" | "sr";
  onLanguageChange: (lang: "en" | "sr") => void;
  currentUser: any;
  onSignIn: () => void;
  onSignOut: () => void;
  themeMode: "auto" | "light" | "dark";
  onThemeChange: (mode: "auto" | "light" | "dark") => void;
  sunriseTime: string;
  onSunriseChange: (time: string) => void;
  sunsetTime: string;
  onSunsetChange: (time: string) => void;
  isEvening: boolean;
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
  isEvening
}: SettingsPanelProps) {
  const isEn = language === "en";

  // Notification states loaded from localstorage
  const [notifyMorning, setNotifyMorning] = useState(() => localStorage.getItem("abcde_notify_morning") !== "false");
  const [notifyMidday, setNotifyMidday] = useState(() => localStorage.getItem("abcde_notify_midday") !== "false");
  const [notifyEvening, setNotifyEvening] = useState(() => localStorage.getItem("abcde_notify_evening") !== "false");
  const [notifyMindset, setNotifyMindset] = useState(() => localStorage.getItem("abcde_notify_mindset") !== "false");
  const [notifySound, setNotifySound] = useState(() => localStorage.getItem("abcde_notify_sound") !== "false");

  // Reset confirmation state
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetFinished, setResetFinished] = useState(false);

  // Save notifications to localstorage
  useEffect(() => { localStorage.setItem("abcde_notify_morning", String(notifyMorning)); }, [notifyMorning]);
  useEffect(() => { localStorage.setItem("abcde_notify_midday", String(notifyMidday)); }, [notifyMidday]);
  useEffect(() => { localStorage.setItem("abcde_notify_evening", String(notifyEvening)); }, [notifyEvening]);
  useEffect(() => { localStorage.setItem("abcde_notify_mindset", String(notifyMindset)); }, [notifyMindset]);
  useEffect(() => { localStorage.setItem("abcde_notify_sound", String(notifySound)); }, [notifySound]);

  const handleResetApp = () => {
    localStorage.clear();
    setResetFinished(true);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Translations
  const t = {
    title: isEn ? "Settings" : "Podešavanja",
    accountTitle: isEn ? "Account" : "Nalog",
    accountDesc: isEn ? "Google Cloud Sync" : "Google Cloud Sinhronizacija",
    loggedOutMsg: isEn ? "Offline Local Mode" : "Lokalni režim rada",
    loggedInMsg: isEn ? "Connected" : "Povezano",
    signInBtn: isEn ? "Log In" : "Prijavi se",
    signOutBtn: isEn ? "Sign Out" : "Odjavi se",
    
    themeTitle: isEn ? "Appearance" : "Izgled",
    themeAuto: isEn ? "Automatic" : "Automatski",
    themeDay: isEn ? "Light" : "Svetla",
    themeNight: isEn ? "Dark" : "Tamna",
    sunriseLabel: isEn ? "Sunrise" : "Izlazak Sunca",
    sunsetLabel: isEn ? "Sunset" : "Zalazak Sunca",
    
    notifyTitle: isEn ? "Notifications" : "Obaveštenja",
    notifyMorning: isEn ? "Morning Kickstart (07:00)" : "Jutarnje pokretanje (07:00)",
    notifyMidday: isEn ? "Mid-day Focus Check" : "Popodnevni fokus",
    notifyEvening: isEn ? "Evening Reflection (21:00)" : "Večernja analiza (21:00)",
    notifyHabit: isEn ? "Mindset & Habits" : "Mindset i Navike",
    notifySound: isEn ? "System Sounds" : "Sistemski zvukovi",
    
    dangerTitle: isEn ? "Danger Zone" : "Zona povišenog rizika",
    resetBtn: isEn ? "Erase All Content and Settings" : "Obriši sav sadržaj i podešavanja",
    resetWarning: isEn ? "Type 'RESTART' to confirm:" : "Unesite 'RESTART' za potvrdu:",
    resetCancel: isEn ? "Cancel" : "Otkaži",
    resetSuccess: isEn ? "Erasing..." : "Brisanje...",
    
    langTitle: isEn ? "Language" : "Jezik"
  };

  return (
    <div className="animate-fadeIn w-full pb-[calc(24px+env(safe-area-inset-bottom))] text-left">
      <h2 className="text-[34px] font-bold text-black dark:text-white mt-2 mb-6 ml-4 tracking-tight">
        {t.title}
      </h2>

      <div className="space-y-8">
        
        {/* ACCOUNT SECTION */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
          <div className="flex items-center p-4">
            {currentUser ? (
              <>
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="w-[60px] h-[60px] rounded-full mr-4 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-[60px] h-[60px] rounded-full bg-[#8E8E93] text-white flex items-center justify-center text-xl font-medium mr-4">
                    {(currentUser.displayName || currentUser.email || "U").charAt(0)}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[20px] font-medium text-black dark:text-white truncate">
                    {currentUser.displayName || "Kaizen User"}
                  </p>
                  <p className="text-[15px] text-[#8E8E93] truncate">{t.accountTitle} • {currentUser.email}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-b from-[#A2B1C6] to-[#8292A8] text-white flex items-center justify-center mr-4 shrink-0">
                  <User className="w-8 h-8" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[20px] font-medium text-black dark:text-white truncate">{t.loggedOutMsg}</p>
                  <p className="text-[15px] text-[#8E8E93] truncate">{isEn ? "Sign in to sync" : "Prijavite se za sinhronizaciju"}</p>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-black/5 dark:border-white/5 pl-4 flex items-center">
             {currentUser ? (
               <button onClick={onSignOut} className="w-full text-left py-3 text-[17px] text-[#FF3B30] active:opacity-50 transition-opacity">
                 {t.signOutBtn}
               </button>
             ) : (
               <button onClick={onSignIn} className="w-full text-left py-3 text-[17px] text-[#007AFF] active:opacity-50 transition-opacity">
                 {t.signInBtn}
               </button>
             )}
          </div>
        </div>

        {/* APPEARANCE SECTION */}
        <div>
          <h3 className="text-[13px] text-[#8E8E93] uppercase font-medium ml-4 mb-2 tracking-wide">{t.themeTitle}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-4">
                <div className="flex flex-col items-center gap-2 cursor-pointer w-1/3" onClick={() => onThemeChange("light")}>
                   <div className={\`w-16 h-24 rounded-[8px] bg-[#F2F2F7] border-[3px] \${themeMode === "light" ? "border-[#007AFF]" : "border-transparent"}\`}>
                     <div className="w-full h-8 bg-white border-b border-black/5 rounded-t-[5px]"></div>
                   </div>
                   <span className={\`text-[15px] font-medium \${themeMode === "light" ? "text-[#007AFF]" : "text-black dark:text-white"}\`}>{t.themeDay}</span>
                </div>
                <div className="flex flex-col items-center gap-2 cursor-pointer w-1/3" onClick={() => onThemeChange("dark")}>
                   <div className={\`w-16 h-24 rounded-[8px] bg-black border-[3px] \${themeMode === "dark" ? "border-[#007AFF]" : "border-transparent"}\`}>
                      <div className="w-full h-8 bg-[#1C1C1E] border-b border-white/5 rounded-t-[5px]"></div>
                   </div>
                   <span className={\`text-[15px] font-medium \${themeMode === "dark" ? "text-[#007AFF]" : "text-black dark:text-white"}\`}>{t.themeNight}</span>
                </div>
                <div className="flex flex-col items-center gap-2 cursor-pointer w-1/3" onClick={() => onThemeChange("auto")}>
                   <div className={\`w-16 h-24 rounded-[8px] flex border-[3px] \${themeMode === "auto" ? "border-[#007AFF]" : "border-transparent"}\`}>
                      <div className="flex-1 h-full bg-[#F2F2F7] rounded-l-[5px] relative">
                         <div className="absolute top-0 left-0 right-0 h-8 bg-white border-b border-black/5 rounded-tl-[5px]"></div>
                      </div>
                      <div className="flex-1 h-full bg-black rounded-r-[5px] relative border-l border-white/5">
                         <div className="absolute top-0 left-0 right-0 h-8 bg-[#1C1C1E] border-b border-white/5 rounded-tr-[5px]"></div>
                      </div>
                   </div>
                   <span className={\`text-[15px] font-medium \${themeMode === "auto" ? "text-[#007AFF]" : "text-black dark:text-white"}\`}>{t.themeAuto}</span>
                </div>
            </div>
            {themeMode === "auto" && (
              <>
                <div className="border-t border-black/5 dark:border-white/5 ml-4"></div>
                <div className="flex items-center justify-between pl-4 pr-3 py-[7px] bg-white dark:bg-[#1C1C1E]">
                   <span className="text-[17px] text-black dark:text-white">{t.sunriseLabel}</span>
                   <div className="flex items-center bg-[#7676801F] dark:bg-[#7676803D] rounded-[6px] px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#007AFF]/30 transition-shadow">
                     <input 
                        type="time" 
                        value={sunriseTime} 
                        onChange={(e) => onSunriseChange(e.target.value)}
                        className="bg-transparent w-[65px] text-[17px] text-[#007AFF] font-medium outline-none text-center"
                     />
                   </div>
                </div>
                <div className="border-t border-black/5 dark:border-white/5 ml-4"></div>
                <div className="flex items-center justify-between pl-4 pr-3 py-[7px] bg-white dark:bg-[#1C1C1E]">
                   <span className="text-[17px] text-black dark:text-white">{t.sunsetLabel}</span>
                   <div className="flex items-center bg-[#7676801F] dark:bg-[#7676803D] rounded-[6px] px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#007AFF]/30 transition-shadow">
                     <input 
                        type="time" 
                        value={sunsetTime} 
                        onChange={(e) => onSunsetChange(e.target.value)}
                        className="bg-transparent w-[65px] text-[17px] text-[#007AFF] font-medium outline-none text-center"
                     />
                   </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS SECTION */}
        <div>
          <h3 className="text-[13px] text-[#8E8E93] uppercase font-medium ml-4 mb-2 tracking-wide">{t.notifyTitle}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            {[
              { id: "morning", title: t.notifyMorning, val: notifyMorning, setVal: setNotifyMorning },
              { id: "midday", title: t.notifyMidday, val: notifyMidday, setVal: setNotifyMidday },
              { id: "evening", title: t.notifyEvening, val: notifyEvening, setVal: setNotifyEvening },
              { id: "mindset", title: t.notifyHabit, val: notifyMindset, setVal: setNotifyMindset },
              { id: "sounds", title: t.notifySound, val: notifySound, setVal: setNotifySound }
            ].map((notif, index, arr) => (
              <div key={notif.id} className="pl-4">
                <div className="flex justify-between items-center py-2.5 pr-4">
                  <span className="text-[17px] text-black dark:text-white">{notif.title}</span>
                  <label className="relative inline-block w-[51px] h-[31px]">
                    <input 
                      type="checkbox" 
                      className="peer w-0 h-0 opacity-0"
                      checked={notif.val}
                      onChange={(e) => notif.setVal(e.target.checked)}
                    />
                    <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-all duration-300 before:absolute before:content-[''] before:h-[27px] before:w-[27px] before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-all before:shadow-sm peer-checked:bg-[#34C759] peer-checked:before:translate-x-[20px]"></span>
                  </label>
                </div>
                {index < arr.length - 1 && (
                  <div className="border-t border-black/5 dark:border-white/5"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* LANGUAGE SECTION */}
        <div>
          <h3 className="text-[13px] text-[#8E8E93] uppercase font-medium ml-4 mb-2 tracking-wide">{t.langTitle}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("en")}
            >
              <span className="text-[17px] text-black dark:text-white">English</span>
              {language === "en" && <Check className="w-5 h-5 text-[#007AFF]" />}
            </div>
            <div className="border-t border-black/5 dark:border-white/5 ml-4"></div>
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("sr")}
            >
              <span className="text-[17px] text-black dark:text-white">Srpski</span>
              {language === "sr" && <Check className="w-5 h-5 text-[#007AFF]" />}
            </div>
          </div>
        </div>

        {/* DANGER ZONE */}
        <div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            {!showResetConfirm ? (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full text-left px-4 py-3 text-[17px] text-[#FF3B30] active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
              >
                {t.resetBtn}
              </button>
            ) : (
              <div className="p-4 flex flex-col gap-3">
                <span className="text-[15px] text-[#FF3B30] text-center font-medium">{t.resetWarning}</span>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESTART"
                  className="bg-[#7676801F] dark:bg-[#7676803D] text-black dark:text-white px-3 py-2 rounded-[8px] text-[17px] outline-none focus:ring-2 focus:ring-[#FF3B30]/50"
                  autoFocus
                />
                <div className="flex gap-2 w-full mt-2">
                  <button onClick={() => { setShowResetConfirm(false); setResetConfirmText(""); }} className="flex-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] text-black dark:text-white rounded-[10px] py-2.5 text-[17px] font-medium active:opacity-70 transition-opacity">
                    {t.resetCancel}
                  </button>
                  <button 
                    onClick={handleResetApp} 
                    disabled={resetConfirmText !== "RESTART"} 
                    className="flex-1 rounded-[10px] py-2.5 text-[17px] font-medium transition-opacity bg-[#FF3B30] text-white disabled:opacity-50 disabled:active:opacity-50 active:opacity-70"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
            {resetFinished && (
               <div className="border-t border-black/5 dark:border-white/5 py-3 text-center text-[#FF3B30] text-[15px] font-medium animate-pulse">
                 {t.resetSuccess}
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
`;
fs.writeFileSync('./src/components/SettingsPanel.tsx', content, 'utf8');
