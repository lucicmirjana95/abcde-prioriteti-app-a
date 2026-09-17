import React, { useEffect, useRef, useState } from "react";
import type { SharedRoutine } from "../../../shared/domain/routines";
import { useRoutineManagementAdapter } from "../../adapters/useRoutineManagementAdapter";
import { AppALanguage } from "../../types";
import { createManualRoutineDraft } from "../../../shared/domain/routines";
import { X, Plus, Edit2, Archive, Play, Pause, Trash2, Clock, Sparkles } from "lucide-react";
import InputCopyButton from "../common/InputCopyButton";
import GrowthPathArt from "../GrowthPathArt";

interface Props {
  userId: string;
  language: AppALanguage;
  routines: SharedRoutine[];
  onClose: () => void;
  onChanged: () => void;
}

const COPY = {
  sr: {
    title: "Mikro rutine",
    subtitle: "Male, postojane navike koje se ponavljaju svakog dana, odvojeno od prioritetnih zadataka.",
    addRoutine: "Dodaj rutinu",
    editRoutine: "Izmena rutine",
    newRoutine: "Nova mikro rutina",
    titleLabel: "Naziv rutine",
    titlePlaceholder: "Naziv rutine (npr. Jutarnja šetnja)",
    titleHelp: "Kratak i jasan naziv navike",
    fullActionLabel: "Puna akcija (idealna verzija)",
    fullActionPlaceholder: "Npr. 20 minuta brze šetnje na svežem vazduhu",
    fullActionHelp: "Šta radite kada imate punu energiju i vreme",
    minimumActionLabel: "Minimalna akcija (za teške dane)",
    minimumActionPlaceholder: "Npr. 3 minuta izlaska na terasu ili istezanje",
    minimumActionHelp: "Najmanja verzija koja čuva kontinuitet i kada je energija na minimumu",
    minutesLabel: "Procenjeno trajanje",
    save: "Sačuvaj",
    saving: "Čuvam...",
    cancel: "Otkaži",
    active: "Aktivna",
    paused: "Pauzirana",
    noRoutines: "Još uvek nema definisanih mikro rutina.",
    noRoutinesSub: "Dodajte malu dnevnu naviku kako biste gradili postojan fokus.",
    deleteConfirm: "Da li ste sigurni da želite da uklonite ovu rutinu?",
    editTooltip: "Izmeni",
    pauseTooltip: "Pauziraj",
    resumeTooltip: "Aktiviraj",
    archiveTooltip: "Arhiviraj",
    deleteTooltip: "Obriši",
  },
  en: {
    title: "Manage Routines",
    subtitle: "Small, consistent actions that repeat each day, separate from priority tasks.",
    addRoutine: "Add Routine",
    editRoutine: "Edit Routine",
    newRoutine: "New Routine",
    titleLabel: "Title",
    titlePlaceholder: "Title",
    titleHelp: "Short and clear routine title",
    fullActionLabel: "Full Action",
    fullActionPlaceholder: "Full Action",
    fullActionHelp: "What you complete when you have full energy and time",
    minimumActionLabel: "Minimum Action",
    minimumActionPlaceholder: "Minimum Action",
    minimumActionHelp: "Tiny non-negotiable step to keep momentum on low-energy days",
    minutesLabel: "Estimated Minutes",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    active: "Active",
    paused: "Paused",
    noRoutines: "No routines created yet.",
    noRoutinesSub: "Add a small daily habit to build steady grounding and focus.",
    deleteConfirm: "Are you sure you want to delete this routine?",
    editTooltip: "Edit",
    pauseTooltip: "Pause",
    resumeTooltip: "Resume",
    archiveTooltip: "Archive",
    deleteTooltip: "Delete",
  },
  tr: {
    title: "Mikro Rutinler",
    subtitle: "Öncelikli görevlerden ayrı, her gün tekrarlanan küçük ve istikrarlı eylemler.",
    addRoutine: "Rutin Ekle",
    editRoutine: "Rutini Düzenle",
    newRoutine: "Yeni Mikro Rutin",
    titleLabel: "Rutin Adı",
    titlePlaceholder: "Rutin Adı",
    titleHelp: "Kısa ve net rutin başlığı",
    fullActionLabel: "Tam Eylem",
    fullActionPlaceholder: "Tam Eylem",
    fullActionHelp: "Tam enerji ve zamanınız olduğunda yapacağınız eylem",
    minimumActionLabel: "Minimum Eylem",
    minimumActionPlaceholder: "Minimum Eylem",
    minimumActionHelp: "Düşük enerjili günlerde alışkanlığı koruyan en küçük adım",
    minutesLabel: "Tahmini Süre",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    cancel: "İptal",
    active: "Aktif",
    paused: "Duraklatıldı",
    noRoutines: "Henüz oluşturulmuş rutin yok.",
    noRoutinesSub: "Sürekli bir odak ve denge kurmak için küçük bir günlük alışkanlık ekleyin.",
    deleteConfirm: "Bu rutini silmek istediğinizden emin misiniz?",
    editTooltip: "Düzenle",
    pauseTooltip: "Duraklat",
    resumeTooltip: "Sürdür",
    archiveTooltip: "Arşivle",
    deleteTooltip: "Sil",
  },
} as const;

export default function ManageRoutinesModal({ userId, language, routines, onClose, onChanged }: Props) {
  const t = COPY[language] || COPY.en;
  const { controller } = useRoutineManagementAdapter();
  const [editingRoutine, setEditingRoutine] = useState<Partial<SharedRoutine> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Invalidate any inflight requests on unmount
      activeRequestIdRef.current += 1;
    };
  }, []);

  const handleStartCreate = () => {
    activeRequestIdRef.current += 1;
    submittingRef.current = false;
    setIsSubmitting(false);
    setIsCreating(true);
    const draft = createManualRoutineDraft({ estimatedMinutes: 5, language });
    setEditingRoutine(draft);
    setError(null);
  };

  const handleStartEdit = (routine: SharedRoutine) => {
    activeRequestIdRef.current += 1;
    submittingRef.current = false;
    setIsSubmitting(false);
    setIsCreating(false);
    setEditingRoutine(routine);
    setError(null);
  };

  const handleCancel = () => {
    activeRequestIdRef.current += 1;
    submittingRef.current = false;
    setIsSubmitting(false);
    setEditingRoutine(null);
    setIsCreating(false);
    setError(null);
  };

  const handleClose = () => {
    activeRequestIdRef.current += 1;
    submittingRef.current = false;
    setIsSubmitting(false);
    onClose();
  };

  const handleSave = async () => {
    if (submittingRef.current || isSubmitting) return;
    if (!editingRoutine || !editingRoutine.title) return;
    const targetDraftId = editingRoutine.id;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    const currentReqId = ++activeRequestIdRef.current;

    try {
      if (isCreating) {
        const routineToSave: SharedRoutine = {
          id: editingRoutine.id!,
          mutationId: editingRoutine.mutationId,
          title: editingRoutine.title.trim(),
          fullAction: (editingRoutine.fullAction || editingRoutine.title).trim(),
          minimumAction: (editingRoutine.minimumAction || editingRoutine.title).trim(),
          status: editingRoutine.status || "active",
          activeFrom: editingRoutine.activeFrom || new Date().toISOString().split("T")[0],
          timeZone: editingRoutine.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          origin: editingRoutine.origin || { kind: "manual" },
          estimatedMinutes: editingRoutine.estimatedMinutes,
          recurrence: editingRoutine.recurrence || { type: "daily" },
          language: language,
          source: "user",
          sortOrder: editingRoutine.sortOrder || Date.now(),
          goalRelationships: editingRoutine.goalRelationships || [],
          createdAt: editingRoutine.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await controller.create(userId, routineToSave);
      } else {
        await controller.update(
          userId, 
          editingRoutine.id!, 
          editingRoutine.revision || 0, 
          editingRoutine
        );
      }

      // Check if component is still mounted, request token is still active, and draft ID matches
      if (
        !isMountedRef.current ||
        activeRequestIdRef.current !== currentReqId ||
        editingRoutine?.id !== targetDraftId
      ) {
        return;
      }

      onChanged();
      setEditingRoutine(null);
      setIsCreating(false);
    } catch (e: any) {
      if (
        isMountedRef.current &&
        activeRequestIdRef.current === currentReqId &&
        editingRoutine?.id === targetDraftId
      ) {
        setError(e.message);
      }
    } finally {
      if (
        isMountedRef.current &&
        activeRequestIdRef.current === currentReqId &&
        editingRoutine?.id === targetDraftId
      ) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleStatus = async (routine: SharedRoutine) => {
    const currentReqId = ++activeRequestIdRef.current;
    try {
      const nextStatus = routine.status === "active" ? "paused" : "active";
      const updates: Partial<SharedRoutine> = { status: nextStatus };
      if (nextStatus === "paused") updates.pausedAt = new Date().toISOString();
      await controller.update(userId, routine.id, routine.revision || 0, updates);
      if (!isMountedRef.current || activeRequestIdRef.current !== currentReqId) return;
      onChanged();
    } catch (e: any) {
      if (isMountedRef.current && activeRequestIdRef.current === currentReqId) {
        setError(e.message);
      }
    }
  };

  const handleArchive = async (routine: SharedRoutine) => {
    const currentReqId = ++activeRequestIdRef.current;
    try {
      await controller.update(userId, routine.id, routine.revision || 0, { 
        status: "archived", 
        archivedAt: new Date().toISOString() 
      });
      if (!isMountedRef.current || activeRequestIdRef.current !== currentReqId) return;
      onChanged();
    } catch (e: any) {
      if (isMountedRef.current && activeRequestIdRef.current === currentReqId) {
        setError(e.message);
      }
    }
  };

  const handleDelete = async (routine: SharedRoutine) => {
    if (!confirm(t.deleteConfirm)) return;
    const currentReqId = ++activeRequestIdRef.current;
    try {
      await controller.delete(userId, routine.id, routine.revision || 0);
      if (!isMountedRef.current || activeRequestIdRef.current !== currentReqId) return;
      onChanged();
    } catch (e: any) {
      if (isMountedRef.current && activeRequestIdRef.current === currentReqId) {
        setError(e.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40 dark:bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="app-a-surface w-full max-w-xl rounded-3xl border border-black/10 dark:border-white/10 p-6 sm:p-7 shadow-2xl max-h-[88vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center">
              <GrowthPathArt variant="medallion" medallionType="plant" size={38} />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-black dark:text-white">
                {t.title}
              </h2>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="app-a-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#86868B] transition-colors hover:bg-black/5 hover:text-black dark:text-[#AEAEB2] dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="app-a-panel-danger mb-4 text-[13px]">
            {error}
          </div>
        )}

        {editingRoutine ? (
          /* Form for creating or editing */
          <div className="space-y-4 rounded-2xl border border-black/10 bg-black/[0.02] p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-black dark:text-white">
                {isCreating ? t.newRoutine : t.editRoutine}
              </h3>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[13px] font-medium text-black dark:text-white">
                {t.titleLabel}
                <span className="block text-[12px] font-normal text-[#86868B] dark:text-[#AEAEB2]">
                  {t.titleHelp}
                </span>
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="text"
                  autoFocus
                  placeholder={language === "en" ? "Title" : t.titlePlaceholder}
                  value={editingRoutine.title || ""}
                  onChange={e => setEditingRoutine(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="app-a-field app-a-focus-ring min-h-12 w-full px-3.5 pr-10 text-[15px] font-medium"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <InputCopyButton text={editingRoutine.title || ""} language={language} size="sm" />
                </div>
              </div>
            </div>

            {/* Full Action */}
            <div>
              <label className="block text-[13px] font-medium text-black dark:text-white">
                {t.fullActionLabel}
                <span className="block text-[12px] font-normal text-[#86868B] dark:text-[#AEAEB2]">
                  {t.fullActionHelp}
                </span>
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="text"
                  placeholder={language === "en" ? "Full Action" : t.fullActionPlaceholder}
                  value={editingRoutine.fullAction || ""}
                  onChange={e => setEditingRoutine(prev => prev ? { ...prev, fullAction: e.target.value } : null)}
                  className="app-a-field app-a-focus-ring min-h-12 w-full px-3.5 pr-10 text-[15px]"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <InputCopyButton text={editingRoutine.fullAction || ""} language={language} size="sm" />
                </div>
              </div>
            </div>

            {/* Minimum Action */}
            <div>
              <label className="block text-[13px] font-medium text-black dark:text-white">
                {t.minimumActionLabel}
                <span className="block text-[12px] font-normal text-[#86868B] dark:text-[#AEAEB2]">
                  {t.minimumActionHelp}
                </span>
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="text"
                  placeholder={language === "en" ? "Minimum Action" : t.minimumActionPlaceholder}
                  value={editingRoutine.minimumAction || ""}
                  onChange={e => setEditingRoutine(prev => prev ? { ...prev, minimumAction: e.target.value } : null)}
                  className="app-a-field app-a-focus-ring min-h-12 w-full px-3.5 pr-10 text-[15px]"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <InputCopyButton text={editingRoutine.minimumAction || ""} language={language} size="sm" />
                </div>
              </div>
            </div>

            {/* Estimated Minutes */}
            <div>
              <label className="block text-[13px] font-medium text-black dark:text-white">
                {t.minutesLabel}
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  placeholder={language === "en" ? "Estimated Minutes" : "5"}
                  value={editingRoutine.estimatedMinutes ?? ""}
                  onChange={e => setEditingRoutine(prev => prev ? { ...prev, estimatedMinutes: parseInt(e.target.value) || 0 } : null)}
                  className="app-a-field app-a-focus-ring min-h-11 w-28 px-3 text-[15px]"
                />
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditingRoutine(prev => prev ? { ...prev, estimatedMinutes: preset } : null)}
                      className={`app-a-focus-ring rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                        editingRoutine.estimatedMinutes === preset
                          ? "bg-[var(--app-a-accent)] text-white"
                          : "border border-black/10 bg-black/[0.03] text-[#6E6E73] hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#AEAEB2] dark:hover:bg-white/10"
                      }`}
                    >
                      {preset} min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex justify-end gap-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button 
                type="button"
                onClick={handleCancel} 
                className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
              >
                {t.cancel}
              </button>
              <button 
                type="button"
                onClick={handleSave} 
                disabled={isSubmitting || !editingRoutine?.title?.trim()}
                className="app-a-primary-button app-a-focus-ring min-h-[44px] px-5 text-[14px] disabled:opacity-50"
              >
                {isSubmitting ? t.saving : t.save}
              </button>
            </div>
          </div>
        ) : (
          /* List of existing routines */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleStartCreate}
                className="app-a-primary-button app-a-focus-ring inline-flex items-center gap-2 min-h-[42px] px-4 text-[13px] font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>{t.addRoutine}</span>
              </button>
            </div>
            
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {routines.filter(r => r.status !== "archived").length === 0 ? (
                <div className="py-8 text-center text-[#86868B] dark:text-[#AEAEB2]">
                  <p className="font-medium text-[14px]">{t.noRoutines}</p>
                  <p className="mt-1 text-[12px]">{t.noRoutinesSub}</p>
                </div>
              ) : (
                routines.filter(r => r.status !== "archived").map(routine => {
                  const isActive = routine.status === "active";
                  return (
                    <div 
                      key={routine.id} 
                      className="app-a-surface group flex flex-col gap-2 rounded-2xl border border-black/[0.07] p-4 transition-all hover:border-black/20 dark:border-white/[0.08] dark:hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isActive 
                                ? "bg-[#34C759]/10 text-[#34C759] dark:bg-[#30D158]/15 dark:text-[#30D158]"
                                : "bg-black/5 text-[#86868B] dark:bg-white/10 dark:text-[#AEAEB2]"
                            }`}
                          >
                            {isActive ? t.active : t.paused}
                          </span>
                          <h4 className="text-[15px] font-semibold text-black dark:text-white truncate">
                            {routine.title}
                          </h4>
                        </div>
                        <div className="mt-1 space-y-0.5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
                          <p className="truncate">
                            <strong className="font-medium text-black/70 dark:text-white/70">{language === "sr" ? "Puna:" : "Full:"}</strong> {routine.fullAction}
                          </p>
                          {routine.minimumAction && routine.minimumAction !== routine.fullAction && (
                            <p className="truncate text-[12px] opacity-85">
                              <strong className="font-medium text-black/60 dark:text-white/60">{language === "sr" ? "Minimalna:" : "Min:"}</strong> {routine.minimumAction}
                            </p>
                          )}
                          <p className="text-[12px] text-[#86868B]">
                            ⏱️ {routine.estimatedMinutes || 5} min
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                        <button 
                          type="button"
                          onClick={() => handleStartEdit(routine)} 
                          className="app-a-focus-ring rounded-xl p-2 text-[#6E6E73] transition-colors hover:bg-black/5 hover:text-black dark:text-[#AEAEB2] dark:hover:bg-white/10 dark:hover:text-white"
                          title={t.editTooltip}
                          aria-label={t.editTooltip}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleToggleStatus(routine)} 
                          className="app-a-focus-ring rounded-xl p-2 text-[#6E6E73] transition-colors hover:bg-black/5 hover:text-black dark:text-[#AEAEB2] dark:hover:bg-white/10 dark:hover:text-white"
                          title={isActive ? t.pauseTooltip : t.resumeTooltip}
                          aria-label={isActive ? t.pauseTooltip : t.resumeTooltip}
                        >
                          {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleArchive(routine)} 
                          className="app-a-focus-ring rounded-xl p-2 text-[#6E6E73] transition-colors hover:bg-black/5 hover:text-black dark:text-[#AEAEB2] dark:hover:bg-white/10 dark:hover:text-white"
                          title={t.archiveTooltip}
                          aria-label={t.archiveTooltip}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(routine)} 
                          className="app-a-focus-ring rounded-xl p-2 text-[#FF3B30] transition-colors hover:bg-red-500/10 dark:text-[#FF453A]"
                          title={t.deleteTooltip}
                          aria-label={t.deleteTooltip}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
