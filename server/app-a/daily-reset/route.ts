import { Request, Response } from "express";
import {
  buildDailyResetPrompt,
  modelSchema,
  parseModelResponse
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
    let phaseType: "initial" | "clarification_resolve" = "initial";
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
      
      let prompt = "";
      let isClarification = false;
      let knownQuestionIds: string[] | undefined;
      
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

        rawResponse = await Promise.race([
          generateFn(prompt, modelSchema, {
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

      // Structured output can occasionally satisfy the provider schema while
      // still violating a cross-field invariant (for example, a bad source
      // index). Repair once inside the original bounded server budget so the
      // user does not have to re-enter or resubmit their brain dump.
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
