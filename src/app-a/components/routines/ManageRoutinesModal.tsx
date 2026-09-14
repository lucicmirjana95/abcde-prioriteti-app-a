import React, { useEffect, useRef, useState } from "react";
import type { SharedRoutine } from "../../../shared/domain/routines";
import { useRoutineManagementAdapter } from "../../adapters/useRoutineManagementAdapter";
import { AppALanguage } from "../../types";
import { createManualRoutineDraft } from "../../../shared/domain/routines";
import { X, Plus, Edit2, Archive, Play, Pause, Trash2 } from "lucide-react";

interface Props {
  userId: string;
  language: AppALanguage;
  routines: SharedRoutine[];
  onClose: () => void;
  onChanged: () => void;
}

export default function ManageRoutinesModal({ userId, language, routines, onClose, onChanged }: Props) {
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
    // Invalidate any ongoing save operation tokens from previous forms
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
    if (!confirm("Are you sure?")) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-[#1C1C1E]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black dark:text-white">
            {language === "sr" ? "Upravljanje rutinama" : "Manage Routines"}
          </h2>
          <button onClick={handleClose} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
            <X className="h-5 w-5 text-black dark:text-white" />
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        {editingRoutine ? (
          <div className="space-y-4 border rounded-xl p-4 dark:border-white/10">
            <input
              type="text"
              placeholder="Title"
              value={editingRoutine.title || ""}
              onChange={e => setEditingRoutine(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="w-full rounded-lg border p-2 dark:bg-black dark:text-white"
            />
            <input
              type="text"
              placeholder="Full Action"
              value={editingRoutine.fullAction || ""}
              onChange={e => setEditingRoutine(prev => prev ? { ...prev, fullAction: e.target.value } : null)}
              className="w-full rounded-lg border p-2 dark:bg-black dark:text-white"
            />
            <input
              type="text"
              placeholder="Minimum Action"
              value={editingRoutine.minimumAction || ""}
              onChange={e => setEditingRoutine(prev => prev ? { ...prev, minimumAction: e.target.value } : null)}
              className="w-full rounded-lg border p-2 dark:bg-black dark:text-white"
            />
            <input
              type="number"
              placeholder="Estimated Minutes"
              value={editingRoutine.estimatedMinutes || ""}
              onChange={e => setEditingRoutine(prev => prev ? { ...prev, estimatedMinutes: parseInt(e.target.value) || 0 } : null)}
              className="w-full rounded-lg border p-2 dark:bg-black dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={handleCancel} 
                className="px-4 py-2 border rounded-lg text-black dark:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSubmitting || !editingRoutine?.title?.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleStartCreate}
              className="mb-4 flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
            >
              <Plus className="h-4 w-4" /> Add Routine
            </button>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {routines.filter(r => r.status !== "archived").map(routine => (
                <div key={routine.id} className="flex items-center justify-between rounded-lg border p-3 dark:border-white/10">
                  <div>
                    <h3 className="font-bold text-black dark:text-white">{routine.title}</h3>
                    <p className="text-sm text-gray-500">{routine.estimatedMinutes} min • {routine.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleStartEdit(routine)} className="p-2 hover:bg-black/5 rounded-lg text-black dark:text-white"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleToggleStatus(routine)} className="p-2 hover:bg-black/5 rounded-lg text-black dark:text-white">
                      {routine.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleArchive(routine)} className="p-2 hover:bg-black/5 rounded-lg text-black dark:text-white"><Archive className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(routine)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
