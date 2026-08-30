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
  onSunsetChange
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
    loggedOutMsg: isEn ? "Offline Local Mode" : "Lokalni režim rada",
    signInBtn: isEn ? "Sign In to Sync" : "Prijavi se za sinhronizaciju",
    signOutBtn: isEn ? "Sign Out" : "Odjavi se",
    
    themeTitle: isEn ? "APPEARANCE" : "IZGLED",
    themeAuto: isEn ? "Automatic" : "Automatski",
    themeDay: isEn ? "Light" : "Svetla",
    themeNight: isEn ? "Dark" : "Tamna",
    sunriseLabel: isEn ? "Sunrise" : "Izlazak Sunca",
    sunsetLabel: isEn ? "Sunset" : "Zalazak Sunca",
    
    notifyTitle: isEn ? "NOTIFICATIONS" : "OBAVEŠTENJA",
    notifyMorning: isEn ? "Morning Kickstart (07:00)" : "Jutarnje pokretanje (07:00)",
    notifyMidday: isEn ? "Mid-day Focus Check" : "Popodnevni fokus",
    notifyEvening: isEn ? "Evening Reflection (21:00)" : "Večernja analiza (21:00)",
    notifyHabit: isEn ? "Mindset & Habits" : "Mindset i Navike",
    notifySound: isEn ? "System Sounds" : "Sistemski zvukovi",
    
    dangerTitle: isEn ? "DANGER ZONE" : "OPASNA ZONA",
    resetBtn: isEn ? "Erase All Content & Settings" : "Obriši sav sadržaj i podešavanja",
    resetWarning: isEn ? "Type 'RESTART' to confirm:" : "Unesite 'RESTART' za potvrdu:",
    resetCancel: isEn ? "Cancel" : "Otkaži",
    resetSuccess: isEn ? "Erasing..." : "Brisanje...",
    
    langTitle: isEn ? "LANGUAGE" : "JEZIK"
  };

  return (
    <div className="w-full pb-16 pt-2">
      {/* Large Title */}
      <h1 className="text-[34px] font-bold text-black dark:text-white px-4 mb-4 tracking-tight">
        {t.title}
      </h1>

      <div className="space-y-6">
        
        {/* ACCOUNT SECTION (iOS ID Card style) */}
        <div className="px-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            <div className="flex items-center p-4">
              {currentUser ? (
                <>
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-[60px] h-[60px] rounded-full mr-4 object-cover border border-black/5" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-[60px] h-[60px] rounded-full bg-[#8E8E93] text-white flex items-center justify-center text-xl font-medium mr-4">
                      {(currentUser.displayName || currentUser.email || "U").charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[20px] font-medium text-black dark:text-white truncate">
                      {currentUser.displayName || "Kaizen User"}
                    </p>
                    <p className="text-[15px] text-[#8E8E93] truncate">{currentUser.email}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-b from-[#A2B1C6] to-[#8292A8] text-white flex items-center justify-center mr-4 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[20px] font-medium text-black dark:text-white truncate">{t.loggedOutMsg}</p>
                    <p className="text-[13px] text-[#8E8E93] mt-0.5">{isEn ? "Data stored locally." : "Podaci se čuvaju lokalno."}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CLOUD SYNC CARD (Separate group in iOS Settings if logged out or actionable) */}
        {!currentUser && (
          <div className="px-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
               <div className="pl-4">
                 <button onClick={onSignIn} className="w-full text-left py-3 text-[17px] text-[#007AFF] active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors pr-4">
                   {t.signInBtn}
                 </button>
               </div>
            </div>
            <p className="px-4 mt-2 text-[13px] text-[#8E8E93] tracking-normal leading-tight">
              {isEn ? "Sign in to securely back up your tasks and progress to the cloud." : "Prijavite se kako biste sigurno sačuvali zadatke i napredak na cloud."}
            </p>
          </div>
        )}

        {currentUser && (
          <div className="px-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
               <div className="pl-4">
                 <button onClick={onSignOut} className="w-full text-left py-3 text-[17px] text-[#FF3B30] active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors pr-4">
                   {t.signOutBtn}
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* APPEARANCE SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#8E8E93] px-2 mb-1.5">{t.themeTitle}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-evenly p-5 pb-5">
                <div className="flex flex-col items-center gap-3 cursor-pointer" onClick={() => onThemeChange("light")}>
                   <div className={\`w-[68px] h-[100px] rounded-[12px] bg-[#F2F2F7] \${themeMode === "light" ? "ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E] ring-[#007AFF]" : "ring-1 ring-black/10"}\`}>
                     <div className="w-full h-8 bg-white border-b border-black/5 rounded-t-[12px]"></div>
                     <div className="p-2 space-y-1">
                       <div className="h-2 bg-black/10 rounded-full w-full"></div>
                       <div className="h-2 bg-black/10 rounded-full w-2/3"></div>
                     </div>
                   </div>
                   <span className={\`text-[13px] font-medium \${themeMode === "light" ? "text-[#007AFF]" : "text-black dark:text-white"}\`}>{t.themeDay}</span>
                </div>
                
                <div className="flex flex-col items-center gap-3 cursor-pointer" onClick={() => onThemeChange("dark")}>
                   <div className={\`w-[68px] h-[100px] rounded-[12px] bg-black \${themeMode === "dark" ? "ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E] ring-[#007AFF]" : "ring-1 ring-black/10"}\`}>
                      <div className="w-full h-8 bg-[#1C1C1E] border-b border-white/5 rounded-t-[12px]"></div>
                      <div className="p-2 space-y-1">
                       <div className="h-2 bg-white/10 rounded-full w-full"></div>
                       <div className="h-2 bg-white/10 rounded-full w-2/3"></div>
                     </div>
                   </div>
                   <span className={\`text-[13px] font-medium \${themeMode === "dark" ? "text-[#007AFF]" : "text-black dark:text-white"}\`}>{t.themeNight}</span>
                </div>

                <div className="flex flex-col items-center gap-3 cursor-pointer" onClick={() => onThemeChange("auto")}>
                   <div className={\`w-[68px] h-[100px] rounded-[12px] flex \${themeMode === "auto" ? "ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E] ring-[#007AFF]" : "ring-1 ring-black/10"}\`}>
                      <div className="flex-1 h-full bg-[#F2F2F7] rounded-l-[12px] relative overflow-hidden">
                         <div className="absolute top-0 left-0 right-0 h-8 bg-white border-b border-black/5"></div>
                      </div>
                      <div className="flex-1 h-full bg-black rounded-r-[12px] relative overflow-hidden border-l border-white/5">
                         <div className="absolute top-0 left-0 right-0 h-8 bg-[#1C1C1E] border-b border-white/5"></div>
                      </div>
                   </div>
                   <span className={\`text-[13px] font-medium \${themeMode === "auto" ? "text-[#007AFF]" : "text-black dark:text-white"}\`}>{t.themeAuto}</span>
                </div>
            </div>
            
            {themeMode === "auto" && (
              <div className="pl-4">
                <div className="border-t border-black/5 dark:border-white/5"></div>
                <div className="flex items-center justify-between pr-4 py-2.5">
                   <span className="text-[17px] text-black dark:text-white">{t.sunriseLabel}</span>
                   <div className="bg-[#7676801F] dark:bg-[#7676803D] rounded-[6px] px-2 py-1">
                     <input 
                        type="time" 
                        value={sunriseTime} 
                        onChange={(e) => onSunriseChange(e.target.value)}
                        className="bg-transparent w-auto min-w-[70px] text-[17px] text-[#007AFF] font-medium outline-none text-center appearance-none"
                     />
                   </div>
                </div>
                <div className="border-t border-black/5 dark:border-white/5"></div>
                <div className="flex items-center justify-between pr-4 py-2.5">
                   <span className="text-[17px] text-black dark:text-white">{t.sunsetLabel}</span>
                   <div className="bg-[#7676801F] dark:bg-[#7676803D] rounded-[6px] px-2 py-1">
                     <input 
                        type="time" 
                        value={sunsetTime} 
                        onChange={(e) => onSunsetChange(e.target.value)}
                        className="bg-transparent w-auto min-w-[70px] text-[17px] text-[#007AFF] font-medium outline-none text-center appearance-none"
                     />
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LANGUAGE SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#8E8E93] px-2 mb-1.5">{t.langTitle}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden pl-4">
            <div 
              className="flex items-center justify-between pr-4 py-[11px] cursor-pointer active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("en")}
            >
              <span className="text-[17px] text-black dark:text-white">English</span>
              {language === "en" && <Check className="w-[20px] h-[20px] text-[#007AFF]" strokeWidth={2.5} />}
            </div>
            <div className="border-b border-black/5 dark:border-white/5"></div>
            <div 
              className="flex items-center justify-between pr-4 py-[11px] cursor-pointer active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
              onClick={() => onLanguageChange("sr")}
            >
              <span className="text-[17px] text-black dark:text-white">Srpski</span>
              {language === "sr" && <Check className="w-[20px] h-[20px] text-[#007AFF]" strokeWidth={2.5} />}
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS SECTION */}
        <div className="px-4">
          <h3 className="text-[13px] text-[#8E8E93] px-2 mb-1.5">{t.notifyTitle}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden pl-4">
            {[
              { id: "morning", title: t.notifyMorning, val: notifyMorning, setVal: setNotifyMorning },
              { id: "midday", title: t.notifyMidday, val: notifyMidday, setVal: setNotifyMidday },
              { id: "evening", title: t.notifyEvening, val: notifyEvening, setVal: setNotifyEvening },
              { id: "mindset", title: t.notifyHabit, val: notifyMindset, setVal: setNotifyMindset },
              { id: "sounds", title: t.notifySound, val: notifySound, setVal: setNotifySound }
            ].map((notif, index, arr) => (
              <React.Fragment key={notif.id}>
                <div className="flex justify-between items-center py-2 pr-4">
                  <span className="text-[17px] text-black dark:text-white truncate pr-2">{notif.title}</span>
                  <label className="relative inline-block w-[51px] h-[31px] shrink-0">
                    <input 
                      type="checkbox" 
                      className="peer w-0 h-0 opacity-0"
                      checked={notif.val}
                      onChange={(e) => notif.setVal(e.target.checked)}
                    />
                    <span className="absolute cursor-pointer inset-0 bg-[#E9E9EA] dark:bg-[#39393D] rounded-full transition-colors duration-300 peer-checked:bg-[#34C759]"></span>
                    <span className="absolute left-[2px] top-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 peer-checked:translate-x-[20px]"></span>
                  </label>
                </div>
                {index < arr.length - 1 && (
                  <div className="border-b border-black/5 dark:border-white/5"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="px-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            {!showResetConfirm ? (
              <div className="pl-4">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full text-left py-[11px] pr-4 text-[17px] text-[#FF3B30] active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
                >
                  {t.resetBtn}
                </button>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-3">
                <span className="text-[15px] text-black dark:text-[#EBEBF5] text-center font-medium">{t.resetWarning}</span>
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
                  <button onClick={() => { setShowResetConfirm(false); setResetConfirmText(""); }} className="flex-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] text-black dark:text-white rounded-[10px] py-2.5 text-[17px] font-semibold active:opacity-70 transition-opacity">
                    {t.resetCancel}
                  </button>
                  <button 
                    onClick={handleResetApp} 
                    disabled={resetConfirmText !== "RESTART"} 
                    className="flex-1 rounded-[10px] py-2.5 text-[17px] font-semibold transition-opacity bg-[#FF3B30] text-white disabled:opacity-50 disabled:active:opacity-50 active:opacity-70"
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
`
fs.writeFileSync('./src/components/SettingsPanel.tsx', content, 'utf8');
