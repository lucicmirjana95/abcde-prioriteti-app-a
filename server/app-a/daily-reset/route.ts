import { Request, Response } from "express";
import {
  buildDailyResetPrompt,
  buildReevaluatePrioritiesPrompt,
  modelSchema,
  reevaluateModelSchema,
  parseModelResponse,
  parseReevaluateModelResponse,
  ReevaluationInputContext,
} from "./index";
import {
  validateDailyResetInput,
  validateRequiredPlanningState,
  validateClarificationSubmission
} from "../../../src/app-a/domain/daily-reset/validation";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function computePlanDiff(originalDraft: any, proposedDraft: any) {
  const originalFfIds = new Set((originalDraft.firstFocus || []).map((i: any) => i.id));
  const originalLtIds = new Set((originalDraft.laterToday || []).map((i: any) => i.id));

  const firstFocusEntries: Array<{ id: string; title: string; reason: string }> = [];
  const movedToLaterToday: Array<{ id: string; title: string }> = [];
  const movedToIfCapacity: Array<{ id: string; title: string }> = [];
  const proposedDelegations: Array<{ id: string; title: string; explanation: string }> = [];
  const proposedEliminations: Array<{ id: string; title: string; explanation: string }> = [];

  for (const item of proposedDraft.firstFocus || []) {
    if (!originalFfIds.has(item.id)) {
      firstFocusEntries.push({
        id: item.id,
        title: item.title,
        reason: item.priority?.conciseExplanation || item.priority?.explanation || item.reasoning || "",
      });
    }
  }

  for (const item of proposedDraft.laterToday || []) {
    if (originalFfIds.has(item.id)) {
      movedToLaterToday.push({ id: item.id, title: item.title });
    }
  }

  for (const item of proposedDraft.ifCapacityRemains || []) {
    if (originalFfIds.has(item.id) || originalLtIds.has(item.id)) {
      movedToIfCapacity.push({ id: item.id, title: item.title });
    }
  }

  const allProposedItems = [
    ...(proposedDraft.firstFocus || []),
    ...(proposedDraft.laterToday || []),
    ...(proposedDraft.ifCapacityRemains || []),
    ...(proposedDraft.deferredItems || []),
    ...(proposedDraft.longTermIdeas || []),
    ...(proposedDraft.nonActionItems || []),
  ];

  for (const item of allProposedItems) {
    if (item.priority?.recommendedDisposition === "delegate") {
      proposedDelegations.push({
        id: item.id,
        title: item.title,
        explanation: item.priority?.conciseExplanation || item.priority?.explanation || "",
      });
    } else if (item.priority?.recommendedDisposition === "eliminate") {
      proposedEliminations.push({
        id: item.id,
        title: item.title,
        explanation: item.priority?.conciseExplanation || item.priority?.explanation || "",
      });
    }
  }

  return {
    firstFocusEntries,
    movedToLaterToday,
    movedToIfCapacity,
    proposedDelegations,
    proposedEliminations,
  };
}


function localizeInvalidInput(lang: string) {
  if (lang === "sr") return "Neispravan unos. Molimo proverite podatke.";
  if (lang === "tr") return "Geçersiz giriş. Lütfen verileri kontrol edin.";
  return "Invalid input. Please check your data.";
}

function localizeAiError(lang: string, reason?: string) {
  if (reason === "capacity_overflow") {
    if (lang === "sr") return "AI je predložio više fleksibilnog rada nego što ste naveli. Pokušajte ponovo.";
    if (lang === "tr") return "Yapay zeka belirttiğiniz esnek süreden daha fazla iş önerdi. Tekrar deneyin.";
    return "The AI proposed more flexible work than the time you provided. Please try again.";
  }
  if (reason === "first_focus_cap_exceeded") {
    if (lang === "sr") return "AI je predložio više od tri zadatka u Prvom fokusu. Pokušajte ponovo.";
    if (lang === "tr") return "Yapay zeka İlk Odak için üçten fazla görev önerdi. Tekrar deneyin.";
    return "The AI proposed more than three First Focus tasks. Please try again.";
  }
  if (lang === "sr") return "Struktura AI odgovora nije validna. Pokušajte ponovo.";
  if (lang === "tr") return "Yapay zeka yanıtının yapısı geçersiz. Tekrar deneyin.";
  return "Invalid AI response structure. Please try again.";
}

function localizeTimeoutError(lang: string) {
  if (lang === "sr") return "Planiranje je ovog puta trajalo predugo. Vaš unos je sačuvan — možete pokušati ponovo.";
  if (lang === "tr") return "Planlama bu sefer çok uzun sürdü. Girişiniz korundu — tekrar deneyebilirsiniz.";
  return "Planning took too long this time. Your input is preserved — you can try again.";
}

function localizeServiceError(lang: string) {
  if (lang === "sr") return "Usluga je privremeno nedostupna. Pokušajte ponovo.";
  if (lang === "tr") return "Hizmet geçici olarak kullanılamıyor. Tekrar deneyin.";
  return "Service is temporarily unavailable. Please try again.";
}

function localizeRateLimitError(lang: string) {
  if (lang === "sr") return "Previše zahteva. Pokušajte ponovo malo kasnije.";
  if (lang === "tr") return "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.";
  return "Too many requests. Please try again later.";
}

function localizeUnexpectedError(lang: string) {
  if (lang === "sr") return "Došlo je do neočekivane greške. Pokušajte ponovo.";
  if (lang === "tr") return "Beklenmeyen bir hata oluştu. Tekrar deneyin.";
  return "An unexpected error occurred. Please try again.";
}

export function createDailyResetRoute(
  isEnabledResolver: () => boolean,
  generateFn: (prompt: string, schema: any, meta?: any) => Promise<unknown>,
  clock: () => number,
  idFactory: () => string,
  clientKeyResolver: (req: Request) => string,
  onRejection?: (reason: string) => void,
  serverBudgetTimeoutMs: number = 38000
) {
  const rateLimits = new Map<string, RateLimitEntry>();
  
  return async (req: Request, res: Response) => {
    const routeStartTime = clock();
    let language = "en";
    let phaseType: "initial" | "clarification_resolve" | "reevaluate" = "initial";
    let brainDumpCharCount = 0;
    let clarificationAnswersCharCount = 0;

    try {
      const requestedLanguage = req.body?.input?.language ?? req.body?.submission?.language;
      if (requestedLanguage === "sr" || requestedLanguage === "tr") language = requestedLanguage;
      if (!isEnabledResolver()) {
        res.status(503).json({
          success: false,
          phase: "error",
          code: "service_unavailable",
          error: localizeServiceError(language),
          retryable: true
        });
        return;
      }
      
      const clientKey = clientKeyResolver(req);
      const now = clock();
      
      // Opportunistic cleanup
      for (const [key, entry] of rateLimits.entries()) {
        if (entry.resetAt <= now) {
          rateLimits.delete(key);
        }
      }
      
      let rateLimit = rateLimits.get(clientKey);
      if (!rateLimit || rateLimit.resetAt <= now) {
        rateLimit = { count: 0, resetAt: now + 10 * 60 * 1000 };
      }
      
      if (rateLimit.count >= 5) {
        const retryAfterSeconds = Math.ceil((rateLimit.resetAt - now) / 1000);
        res.set("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          success: false,
          phase: "error",
          code: "rate_limited",
          error: localizeRateLimitError(language),
          retryable: true
        });
        return;
      }
      
      const body = req.body;
      if (!body || typeof body !== "object") {
        res.status(400).json({ 
          success: false, 
          phase: "error", 
          code: "invalid_input", 
          error: "Invalid request body.",
          retryable: false
        });
        return;
      }

      if (!body.phase && (req.path?.includes("reevaluate") || req.originalUrl?.includes("reevaluate"))) {
        body.phase = "reevaluate";
      }
      
      let prompt = "";
      let isClarification = false;
      let knownQuestionIds: string[] | undefined;
      let reevalContext: ReevaluationInputContext | null = null;
      
      if (body.phase === "initial") {
        phaseType = "initial";
        const validation = validateDailyResetInput(body.input || {});
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            phase: "error",
            code: "invalid_input",
            error: localizeInvalidInput(body.input?.language || "en"),
            retryable: false,
            fieldErrors: validation.fieldErrors
          });
          return;
        }
        const stateValidation = validateRequiredPlanningState(body.input || {});
        if (!stateValidation.valid) {
          res.status(400).json({ success: false, phase: "error", code: "invalid_input", error: localizeInvalidInput(body.input?.language || "en"), retryable: false, fieldErrors: stateValidation.fieldErrors });
          return;
        }
        prompt = buildDailyResetPrompt(body.input);
        isClarification = false;
        language = body.input.language;
        brainDumpCharCount = String(body.input.brainDump || "").length;
      } else if (body.phase === "resolve") {
        phaseType = "clarification_resolve";
        if (!Array.isArray(body.questions)) {
          res.status(400).json({ 
            success: false, 
            phase: "error", 
            code: "invalid_input", 
            error: localizeInvalidInput(body.submission?.language || "en"),
            retryable: false
          });
          return;
        }
        
        const validation = validateClarificationSubmission(body.submission || {}, body.questions);
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            phase: "error",
            code: "invalid_input",
            error: localizeInvalidInput(body.submission?.language || "en"),
            retryable: false,
            fieldErrors: validation.fieldErrors
          });
          return;
        }
        const stateValidation = validateRequiredPlanningState(body.submission || {});
        if (!stateValidation.valid) {
          res.status(400).json({ success: false, phase: "error", code: "invalid_input", error: localizeInvalidInput(body.submission?.language || "en"), retryable: false, fieldErrors: stateValidation.fieldErrors });
          return;
        }
        prompt = buildDailyResetPrompt(body.submission, body.questions);
        isClarification = true;
        knownQuestionIds = body.questions.map((q: any) => String(q.id));
        language = body.submission.language;
        brainDumpCharCount = String(body.submission.brainDump || "").length;
        if (Array.isArray(body.submission.clarificationAnswers)) {
          clarificationAnswersCharCount = body.submission.clarificationAnswers.reduce(
            (acc: number, a: any) => acc + String(a?.answer || "").length,
            0
          );
        }
      } else if (body.phase === "reevaluate") {
        phaseType = "reevaluate" as any;
        language = body.language || "en";
        if (!body.draft || typeof body.draft !== "object") {
          res.status(400).json({
            success: false,
            phase: "error",
            code: "invalid_input",
            error: localizeInvalidInput(language),
            retryable: false
          });
          return;
        }

        // Section F: energy and pleasantness are strictly required (1-5) for AI re-evaluation
        const energyNum = Number(body.energy);
        const pleasantnessNum = Number(body.pleasantness);
        const hasValidEnergy = Number.isInteger(energyNum) && energyNum >= 1 && energyNum <= 5;
        const hasValidPleasantness = Number.isInteger(pleasantnessNum) && pleasantnessNum >= 1 && pleasantnessNum <= 5;

        if (!hasValidEnergy || !hasValidPleasantness) {
          const errMsg = language === "sr"
            ? "Današnja energija i raspoloženje (1-5) su obavezni za preispitivanje prioriteta."
            : language === "tr"
            ? "Öncelikleri yeniden değerlendirmek için günlük enerji ve mod (1-5) zorunludur."
            : "Today's energy and pleasantness (1-5) are required for priority re-evaluation.";
          res.status(400).json({
            success: false,
            phase: "error",
            code: "invalid_input",
            error: errMsg,
            retryable: false,
            fieldErrors: {
              energy: !hasValidEnergy ? "Energy is required (1-5)" : undefined,
              pleasantness: !hasValidPleasantness ? "Pleasantness is required (1-5)" : undefined,
            }
          });
          return;
        }

        const unfinishedFlexibleItems = body.unfinishedFlexibleItems || [
          ...(body.draft.firstFocus || []).filter((i: any) => i.capacityType !== "fixed"),
          ...(body.draft.laterToday || []).filter((i: any) => i.capacityType !== "fixed"),
          ...(body.draft.ifCapacityRemains || []).filter((i: any) => i.capacityType !== "fixed"),
        ];
        const completedIds = new Set(body.completedItemIds || []);
        const completedItems = body.completedItems || [
          ...(body.draft.firstFocus || []).filter((i: any) => completedIds.has(i.id)),
          ...(body.draft.laterToday || []).filter((i: any) => completedIds.has(i.id)),
          ...(body.draft.ifCapacityRemains || []).filter((i: any) => completedIds.has(i.id)),
        ];
        const fixedItems = body.fixedItems || [
          ...(body.draft.firstFocus || []).filter((i: any) => i.capacityType === "fixed"),
          ...(body.draft.laterToday || []).filter((i: any) => i.capacityType === "fixed"),
          ...(body.draft.ifCapacityRemains || []).filter((i: any) => i.capacityType === "fixed"),
        ];

        reevalContext = {
          localDate: body.localDate,
          energy: energyNum as any,
          pleasantness: pleasantnessNum as any,
          availableMinutes: body.availableMinutes ?? body.draft.availableMinutes,
          newImportantTask: body.newImportantTask,
          unfinishedFlexibleItems,
          completedItems,
          fixedItems,
          draft: body.draft,
          language,
          activeVisionContext: body.activeVisionContext,
        };

        prompt = buildReevaluatePrioritiesPrompt({
          ...reevalContext,
          progressNote: body.progressNote,
        });
        isClarification = false;
      } else {
        res.status(400).json({ 
          success: false, 
          phase: "error", 
          code: "invalid_input", 
          error: "Invalid phase.",
          retryable: false
        });
        return;
      }
      
      // Consume quota ONLY on valid request
      rateLimit.count += 1;
      rateLimits.set(clientKey, rateLimit);
      
      let rawResponse: unknown;
      let timerHandle: any = null;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timerHandle = setTimeout(() => reject(new Error("Timeout")), serverBudgetTimeoutMs);
        });

        const activeSchema = phaseType === "reevaluate" ? reevaluateModelSchema : modelSchema;

        rawResponse = await Promise.race([
          generateFn(prompt, activeSchema, {
            phase: phaseType,
            brainDumpCharCount,
            clarificationAnswersCharCount,
            routeStartTime,
          }),
          timeoutPromise
        ]);
      } catch (err: any) {
        if (err.message === "Timeout") {
          res.status(504).json({
            success: false,
            phase: "error",
            code: "timeout",
            error: localizeTimeoutError(language),
            retryable: true
          });
          return;
        }
        res.status(503).json({
          success: false,
          phase: "error",
          code: "service_unavailable",
          error: localizeServiceError(language),
          retryable: true
        });
        return;
      } finally {
        if (timerHandle) {
          clearTimeout(timerHandle);
        }
      }
      
      // REEVALUATE BRANCH
      if (phaseType === "reevaluate" && reevalContext) {
        let parsedReeval = parseReevaluateModelResponse(rawResponse, reevalContext);

        // Section I: Exactly one bounded repair attempt if validation fails
        if (!parsedReeval.success) {
          const remainingBudgetMs = serverBudgetTimeoutMs - (clock() - routeStartTime);
          if (remainingBudgetMs > 3000) {
            let repairTimer: any = null;
            try {
              const repairPrompt = `${prompt}\n\nREPAIR REQUIRED\nValidation error: ${parsedReeval.error} (category: ${parsedReeval.rejectionReason}). The previous response failed strict validation. Re-generate strictly conforming to reevaluateModelSchema. Ensure all sourceItemIds match unfinished flexible items, never modify completed tasks or fixed commitments, keep firstFocusItemIds <= 3, and return valid JSON only.`;
              const repairTimeout = new Promise((_, reject) => {
                repairTimer = setTimeout(() => reject(new Error("Timeout")), remainingBudgetMs);
              });
              const repairedRaw = await Promise.race([
                generateFn(repairPrompt, reevaluateModelSchema, {
                  phase: phaseType,
                  routeStartTime,
                  repairAttempt: true,
                }),
                repairTimeout,
              ]);
              parsedReeval = parseReevaluateModelResponse(repairedRaw, reevalContext);
            } catch {
              // preserve previous error
            } finally {
              if (repairTimer) clearTimeout(repairTimer);
            }
          }
        }

        if (!parsedReeval.success) {
          res.status(502).json({
            success: false,
            phase: "error",
            code: parsedReeval.code || "invalid_ai_response",
            error: parsedReeval.error || localizeAiError(language, parsedReeval.rejectionReason),
            retryable: false,
          });
          return;
        }

        res.status(200).json({
          success: true,
          phase: "reevaluate_ready",
          proposal: {
            evaluations: parsedReeval.evaluations,
            plan: parsedReeval.plan,
          },
          diff: parsedReeval.diff,
        });
        return;
      }

      // INITIAL / RESOLVE BRANCH
      const parseStartTime = clock();
      let rejectionReason = 'cross_field_validation';
      const recordRejection = (reason: string) => { rejectionReason = reason.replace(/[^a-z_]/g, '').slice(0, 80); onRejection?.(reason); };
      let parsed = parseModelResponse(
        rawResponse,
        idFactory,
        isClarification,
        knownQuestionIds,
        recordRejection,
        body.phase === 'initial' ? body.input : body.submission
      );
      const parseEndTime = clock();

      if (parsed.phase === "error") {
        const remainingBudgetMs = serverBudgetTimeoutMs - (clock() - routeStartTime);
        if (remainingBudgetMs > 3000) {
          let repairTimer: any = null;
          try {
            const repairPrompt = `${prompt}\n\nREPAIR REQUIRED\nValidation category: ${rejectionReason}. The previous generated object failed strict cross-field validation. Generate the answer again from the same user input. Follow the response schema exactly, use valid zero-based sourceItemIndex values, keep every subset consistent with its classifiedItems timeHorizon, use at most three firstFocus items, and keep flexible planned minutes within explicit availableMinutes. Preserve explicitly fixed commitments and mark them capacityType fixed. Return JSON only.`;
            const repairTimeout = new Promise((_, reject) => {
              repairTimer = setTimeout(() => reject(new Error("Timeout")), remainingBudgetMs);
            });
            const repairedRaw = await Promise.race([
              generateFn(repairPrompt, modelSchema, {
                phase: phaseType,
                brainDumpCharCount,
                clarificationAnswersCharCount,
                routeStartTime,
                repairAttempt: true,
              }),
              repairTimeout,
            ]);
            parsed = parseModelResponse(repairedRaw, idFactory, isClarification, knownQuestionIds, onRejection, body.phase === 'initial' ? body.input : body.submission);
          } catch {
            // Preserve the original, localized invalid-response result below.
          } finally {
            if (repairTimer) clearTimeout(repairTimer);
          }
        }
      }
      
      if (parsed.phase === "error") {
        res.status(502).json({
          ...parsed,
          error: localizeAiError(language, rejectionReason)
        });
        return;
      }

      res.status(200).json(parsed);
      
    } catch (err: any) {
      res.status(500).json({
        success: false,
        phase: "error",
        code: "unknown",
        error: localizeUnexpectedError(language),
        retryable: true
      });
    }
  };
}
