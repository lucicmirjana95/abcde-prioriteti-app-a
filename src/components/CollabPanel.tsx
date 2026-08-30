import React, { useState, useEffect, FormEvent } from "react";
import {
  Users,
  Share2,
  Copy,
  Plus,
  LogOut,
  Globe,
  Check,
  AlertCircle,
  KeyRound,
  Trash2,
  Edit2,
  Lock,
  Bookmark,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translations, Language } from "../translations";
import { SavedBoard } from "../types";

interface CollabPanelProps {
  currentBoardId: string | null;
  onJoinBoard: (boardId: string) => void;
  onLeaveBoard: () => void;
  language: Language;
  currentUser: any;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}

export default function CollabPanel({
  currentBoardId,
  onJoinBoard,
  onLeaveBoard,
  language,
  currentUser,
  onGoogleSignIn,
  onSignOut,
}: CollabPanelProps) {
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState("");

  const t = translations[language];

  // Saved Boards directory state (persistent locally)
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>(() => {
    try {
      const saved = safeStorage.getItem("abcde_saved_boards");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // State fields for the Add/Edit saved board form
  const [formBoardId, setFormBoardId] = useState("");
  const [formAlias, setFormAlias] = useState("");
  const [formPin, setFormPin] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dirSuccessMsg, setDirSuccessMsg] = useState("");

  // App-wide local lock security PIN code
  const [globalAppPin, setGlobalAppPin] = useState(() => {
    return safeStorage.getItem("abcde_app_pin") || "";
  });
  const [pinInput, setPinInput] = useState("");

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "ABCDE-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreate = () => {
    const newCode = generateRandomCode();
    onJoinBoard(newCode);

    // Auto populate the directory form with the new board code for frictionless logging
    setFormBoardId(newCode);
    setFormAlias(language === "en" ? "My New Board" : language === "tr" ? "Yeni Yönetim Kurulum" : "Moja nova tabla");
    setFormPin("");
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const formatted = inputCode.trim().toUpperCase();
    if (!formatted) return;

    if (formatted.length < 3) {
      setJoinError(t.codeShortErr);
      return;
    }

    setJoinError("");
    onJoinBoard(formatted);
    setInputCode("");

    // Populate the registration form too
    setFormBoardId(formatted);
    setFormAlias(language === "en" ? "Joint Board" : language === "tr" ? "Ortak Kurul" : "Zajednička tabla");
    setFormPin("");
  };

  const fallbackCopy = (text: string): boolean => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return !!successful;
    } catch (err) {
      console.error("Fallback copy failed: ", err);
      return false;
    }
  };

  const handleCopyLink = () => {
    if (!currentBoardId) return;
    const shareUrl = `https://ai.studio/apps/5a58e7bf-e554-4acd-a888-0e5b63aad263?board=${currentBoardId}`;

    const triggerSuccessStates = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          triggerSuccessStates();
        })
        .catch(() => {
          if (fallbackCopy(shareUrl)) {
            triggerSuccessStates();
          }
        });
    } else {
      if (fallbackCopy(shareUrl)) {
        triggerSuccessStates();
      }
    }
  };

  // Register current board directly into the saved boards state
  const handleRegisterCurrent = () => {
    if (!currentBoardId) return;
    setFormBoardId(currentBoardId);
    setFormAlias(language === "en" ? "Active Collab Board" : language === "tr" ? "Aktif İşbirliği Kurulu" : "Aktivna tabla");
    setFormPin("");

    const container = document.getElementById("board-creator-section");
    if (container) {
      container.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Persists the custom friendly naming & PIN codes defined by the user
  const saveSavedBoard = (e: FormEvent) => {
    e.preventDefault();
    const bid = formBoardId.trim().toUpperCase();
    const aliasValue = formAlias.trim();
    const pinValue = formPin.trim();

    if (!bid || !aliasValue) return;

    let updatedList = [...savedBoards];

    if (editingIndex !== null) {
      // Edit mode
      updatedList[editingIndex] = {
        id: bid,
        name: aliasValue,
        pinCode: pinValue || undefined,
        lastVisited: new Date().toISOString(),
      };
      setEditingIndex(null);
    } else {
      // Add mode (prevent duplicate index or merge gracefully)
      const existingIdx = savedBoards.findIndex((b) => b.id === bid);
      const newRecord: SavedBoard = {
        id: bid,
        name: aliasValue,
        pinCode: pinValue || undefined,
        lastVisited: new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        updatedList[existingIdx] = newRecord;
      } else {
        updatedList.push(newRecord);
      }
    }

    setSavedBoards(updatedList);
    safeStorage.setItem("abcde_saved_boards", JSON.stringify(updatedList));

    // Clear and reset form
    setFormBoardId("");
    setFormAlias("");
    setFormPin("");
    setDirSuccessMsg(t.boardSavedSuccess);
    setTimeout(() => setDirSuccessMsg(""), 3500);

    // Refresh application to capture locks reactively if any
    window.dispatchEvent(new Event("saved-boards-changed"));
  };

  const deleteSavedBoard = (index: number) => {
    const updated = savedBoards.filter((_, idx) => idx !== index);
    setSavedBoards(updated);
    safeStorage.setItem("abcde_saved_boards", JSON.stringify(updated));
    setDirSuccessMsg(t.boardDeletedSuccess);
    setTimeout(() => setDirSuccessMsg(""), 2500);

    // Tell parent to refresh checks
    window.dispatchEvent(new Event("saved-boards-changed"));
  };

  const startEditSavedBoard = (index: number) => {
    const b = savedBoards[index];
    setFormBoardId(b.id);
    setFormAlias(b.name);
    setFormPin(b.pinCode || "");
    setEditingIndex(index);

    const section = document.getElementById("board-creator-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Set Local Mode application-wide lock PIN setup
  const handleSetGlobalPin = (e: FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (cleanPin.length !== 4 || isNaN(Number(cleanPin))) {
      alert(
        language === "en" ? "PIN must be exactly 4 digits!" : language === "tr" ? "PIN tam olarak 4 haneli olmalıdır!" : "PIN mora imati tačno 4 cifre!",
      );
      return;
    }

    safeStorage.setItem("abcde_app_pin", cleanPin);
    setGlobalAppPin(cleanPin);
    setPinInput("");

    // Notify main app routing immediately
    window.dispatchEvent(new Event("local-pin-changed"));
  };

  const handleRemoveGlobalPin = () => {
    safeStorage.removeItem("abcde_app_pin");
    setGlobalAppPin("");
    setPinInput("");

    // Notify main app routing immediately
    window.dispatchEvent(new Event("local-pin-changed"));
  };

  return (
    <div
      className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-5 font-sans space-y-6"
      id="collab-panel-container"
    >
      {/* Header segment */}
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl ${currentBoardId ? "bg-[#007AFF]/10 text-[#007AFF] border border-black/5 dark:border-white/5" : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-white border border-black/5 dark:border-white/5"}`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-black dark:text-white leading-tight">
              {t.collabHeadline}
            </h3>
            <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
              {t.collabSub}
            </p>
          </div>
        </div>

        {currentBoardId ? (
          <span className="flex items-center gap-1.5 bg-[#34C759]/10 dark:bg-[#30D158]/10 dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium py-1 px-2.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 bg-[#34C759] dark:bg-[#30D158] rounded-full transition-opacity"></span>
            {t.liveOnline}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium py-1 px-2.5 rounded-full shrink-0">
            {t.localMode}
          </span>
        )}
      </div>

      {/* Google Cloud Sync Card */}
      <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-[#007AFF] text-white rounded-lg flex items-center justify-center text-[17px] font-semibold">
                {currentUser
                  ? (
                      currentUser.displayName ||
                      currentUser.email ||
                      "U"
                    ).charAt(0)
                  : "G"}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5">
              <span>{(t as any).googleSyncTitle}</span>
              {currentUser && (
                <span className="bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] text-[13px] font-semibold px-1.5 py-0.2 rounded">
                  Active
                </span>
              )}
            </h4>
            <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5 leading-relaxed">
              {currentUser
                ? (t as any).googleSyncActiveDesc
                : (t as any).googleSyncInactiveDesc}
            </p>
          </div>
        </div>

        <button
          onClick={currentUser ? onSignOut : onGoogleSignIn}
          className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all ${
            currentUser
              ? "bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]"
              : "bg-[#007AFF] text-white active:opacity-70 transition-opacity"
          }`}
          id="btn-google-auth-sync"
        >
          {currentUser ? (
            <>
              <LogOut className="w-4 h-4" />
              <span>{(t as any).googleSignOut}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{(t as any).googleSignIn}</span>
            </>
          )}
        </button>
      </div>

      {/* Online/Offline core panels */}
      <AnimatePresence mode="wait">
        {currentBoardId ? (
          <motion.div
            key="online-state"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl p-3 border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block">
                  {t.currentBoardId}
                </span>
                <span className="text-md font-semibold text-[#007AFF] tracking-wide">
                  {currentBoardId}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#007AFF] hover:border-black/5 dark:border-white/5 py-1.5 px-3 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  id="btn-collab-copylink"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#34C759]" />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-[#3C3C43] dark:text-[#EBEBF5]/80" />
                      <span>{t.copyLink}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleRegisterCurrent}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#007AFF] hover:border-black/5 dark:border-white/5 py-1.5 px-3 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  id="btn-collab-save-dir"
                  title={
                    language === "en" ? "Register this board to directory so you can name and protect it" : language === "tr" ? "Bu panoyu dizine kaydedin, böylece adlandırabilir ve koruyabilirsiniz" : "Sačuvaj ovu tablu u imenik kako bi joj dao ime i definisao PIN"
                  }
                >
                  <Bookmark className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />
                  <span>
                    {language === "en" ? "Save to Directory" : language === "tr" ? "Dizine Kaydet" : "Sačuvaj u imenik"}
                  </span>
                </button>

                <button
                  onClick={onLeaveBoard}
                  className="flex items-center gap-1.5 bg-[#FF3B30]/10 border border-transparent text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20 py-1.5 px-3 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  id="btn-collab-leave"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.leaveBoard}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="offline-state"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Left: Create Board */}
            <div className="border border-black/5 dark:border-white/5 rounded-xl p-3.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-medium text-black dark:text-white">
                  {t.createBoardTitle}
                </h4>
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5 leading-relaxed">
                  {t.createBoardDesc}
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="w-full flex items-center justify-center gap-1.5 bg-[#007AFF] text-white active:opacity-70 py-2 px-3 rounded-xl text-xs font-medium cursor-pointer transition-all"
                id="btn-collab-create"
              >
                <Plus className="w-4 h-4" />
                <span>{t.startCollab}</span>
              </button>
            </div>

            {/* Right: Join Board */}
            <div className="border border-black/5 dark:border-white/5 rounded-xl p-3.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-medium text-black dark:text-white">
                  {t.joinBoardTitle}
                </h4>
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-0.5 leading-relaxed">
                  {t.joinBoardDesc}
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder={t.enterCodePlaceholder}
                    className="flex-1 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all"
                    id="collab-join-input"
                  />
                  <button
                    type="submit"
                    className="bg-[#1C1C1E] text-white hover:bg-black/5 dark:bg-white/5 text-xs font-medium px-3.5 py-1.5 rounded-xl cursor-pointer transition-all"
                    id="btn-collab-submit-join"
                  >
                    {t.joinButton}
                  </button>
                </div>
                {joinError && (
                  <p
                    className="text-[13px] text-[#FF3B30] dark:text-[#FF453A] flex items-center gap-1 font-semibold"
                    id="collab-join-error"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{joinError}</span>
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Directory & Privacy Lock Suite */}
      <div
        className="border-t border-black/5 dark:border-white/5 pt-5 space-y-5"
        id="privacy-manager-section"
      >
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#007AFF]" />
            <span>{t.savedBoardsTitle}</span>
          </h4>
          <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed">
            {t.savedBoardsDesc}
          </p>
        </div>

        {/* Directory split grid */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          id="board-creator-section"
        >
          {/* Creator/Form: Left side (5cols) */}
          <form
            onSubmit={saveSavedBoard}
            className="lg:col-span-5 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3.5"
          >
            <p className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 border-b border-black/5 dark:border-white/5 pb-1.5 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>
                {editingIndex !== null
                  ? language === "en" ? "Edit directory entry" : language === "tr" ? "Dizin girişini düzenle" : "Uredi zapis u imeniku"
                  : language === "en" ? "Register new board tag" : language === "tr" ? "Yeni pano etiketini kaydedin" : "Zapiši novu tablu u imenik"}
              </span>
            </p>

            <div className="space-y-1">
              <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                {language === "en" ? "Board Share Code *" : language === "tr" ? "Pano Paylaşım Kodu *" : "Šifra table za deljenje *"}
              </label>
              <input
                type="text"
                required
                value={formBoardId}
                onChange={(e) => setFormBoardId(e.target.value)}
                placeholder={language === "en" ? "e.g. ABCDE-Z7K3" : language === "tr" ? "Örn. ABCDE-Z7K3" : "Npr. ABCDE-Z7K3"}
                className="w-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg py-2 px-3 text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                {t.boardFriendlyName} *
              </label>
              <input
                type="text"
                required
                value={formAlias}
                onChange={(e) => setFormAlias(e.target.value)}
                placeholder={t.boardFriendlyNamePlaceholder}
                className="w-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-lg py-2 px-3 text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  {t.boardPinLabel}
                </label>
                <span className="text-[13px] text-[#007AFF] font-semibold bg-[#007AFF]/10/80 px-1 py-0.2 rounded tracking-wide">
                  Shield
                </span>
              </div>
              <input
                type="password"
                maxLength={4}
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ""))}
                placeholder={t.boardPinPlaceholder}
                className="w-full bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-black dark:text-white outline-none focus:border-black/5 dark:border-white/5 font-semibold"
              />
            </div>

            <div className="flex gap-2 pt-1.5">
              <button
                type="submit"
                className="flex-1 bg-[#007AFF] active:opacity-70 text-white py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all"
              >
                {t.saveBoardMappingBtn}
              </button>
              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setFormBoardId("");
                    setFormAlias("");
                    setFormPin("");
                  }}
                  className="bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* List: Right side (7cols) */}
          <div className="lg:col-span-7 bg-[#F2F2F7] dark:bg-[#1C1C1E]/40 p-4 rounded-xl border border-black/5 dark:border-white/5 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <span className="text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 block border-b border-black/5 dark:border-white/5 pb-1">
                {t.savedBoardsSub}
              </span>

              {dirSuccessMsg && (
                <p className="bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 dark:text-[#30D158] text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 py-2 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-opacity">
                  <ShieldCheck className="w-4 h-4 text-[#34C759] shrink-0" />
                  <span>{dirSuccessMsg}</span>
                </p>
              )}

              {savedBoards.length === 0 ? (
                <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 italic py-6 text-center">
                  {t.emptySavedBoards}
                </p>
              ) : (
                <div
                  className="space-y-2 max-h-[220px] overflow-y-auto pr-1"
                  id="saved-boards-scroller"
                >
                  {savedBoards.map((b, idx) => {
                    const isActive = currentBoardId === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? "bg-[#007AFF]/10 border-black/5 dark:border-white/5"
                            : "bg-white dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/50 border-black/5 dark:border-white/5"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-black dark:text-white text-xs truncate max-w-[150px]">
                              {b.name}
                            </span>
                            {b.pinCode && (
                              <span className="bg-[#E5E5EA] dark:bg-[#3A3A3C] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 text-[13px] font-semibold px-1.5 py-0.3 rounded flex items-center gap-0.5">
                                <LockKeyhole className="w-2.5 h-2.5 text-[#007AFF]" />
                                {t.pinActive}
                              </span>
                            )}
                            {isActive && (
                              <span className="bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] text-[13px] font-semibold px-1.5 py-0.3 rounded">
                                {t.activeBoardBadge}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium block mt-0.5">
                            ID: {b.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onJoinBoard(b.id)}
                            disabled={isActive}
                            className={`text-[13px] font-semibold px-2 py-1 rounded-lg transition-all ${
                              isActive
                                ? "bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-not-allowed"
                                : "bg-[#1C1C1E] active:opacity-70 transition-opacity text-white hover:text-white cursor-pointer"
                            }`}
                          >
                            {language === "en" ? "Enter" : language === "tr" ? "Girmek" : "Pristupi"}
                          </button>
                          <button
                            onClick={() => startEditSavedBoard(idx)}
                            className="p-1 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded transition-colors cursor-pointer"
                            title={t.editBoardLabel}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSavedBoard(idx)}
                            className="p-1 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 rounded transition-colors cursor-pointer"
                            title={language === "en" ? "Delete" : language === "tr" ? "Silmek" : "Ukloni"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Application wide setting: Master PIN configuration */}
            <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#007AFF]/10 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
              <div className="space-y-0.5 max-w-sm">
                <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] block">
                  🛡️ {t.globalLockTitle}
                </span>
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal">
                  {t.globalLockDesc}
                </p>
              </div>

              {globalAppPin ? (
                <div className="flex items-center gap-2">
                  <span className="dark:text-[#30D158] bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium py-1 px-2 rounded-lg flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
                    <span>Active</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveGlobalPin}
                    className="bg-[#FF3B30]/10 hover:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] hover:text-[#FF3B30] dark:text-[#FF453A] text-[13px] font-semibold py-1 px-2.5 rounded-lg border border-[#FF3B30]/20 dark:border-[#FF453A]/20 cursor-pointer transition-all"
                  >
                    {t.removeGlobalPinBtn}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSetGlobalPin}
                  className="flex gap-1.5 items-center"
                >
                  <input
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) =>
                      setPinInput(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="PIN (4)"
                    className="w-16 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-lg py-1 px-2 text-center text-xs outline-none focus:border-black/5 dark:border-white/5 font-medium"
                  />
                  <button
                    type="submit"
                    className="bg-[#007AFF] active:opacity-70 text-white text-[13px] font-semibold py-1 px-2.5 rounded-lg cursor-pointer transition-all"
                  >
                    {t.setGlobalPinBtn}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
