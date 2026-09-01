import { Request, Response } from "express";
import {
  buildDailyResetPrompt,
  modelSchema,
  parseModelResponse
} from "./index";
import {
  validateDailyResetInput,
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

function localizeAiError(lang: string) {
  if (lang === "sr") return "Neispravan odgovor veštačke inteligencije. Molimo pokušajte ponovo.";
  if (lang === "tr") return "Geçersiz yapay zeka yanıtı. Lütfen tekrar deneyin.";
  return "Invalid AI response structure. Please try again.";
}

function localizeTimeoutError(lang: string) {
  if (lang === "sr") return "Planiranje je ovog puta trajalo predugo. Vaš unos je sačuvan — možete pokušati ponovo.";
  if (lang === "tr") return "Planlama bu sefer çok uzun sürdü. Girişiniz korundu — tekrar deneyebilirsiniz.";
  return "Planning took too long this time. Your input is preserved — you can try again.";
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
      if (!isEnabledResolver()) {
        res.status(503).json({
          success: false,
          phase: "error",
          code: "service_unavailable",
          error: "Endpoint is currently disabled."
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
          error: "Too many requests. Please try again later."
        });
        return;
      }
      
      const body = req.body;
      if (!body || typeof body !== "object") {
        res.status(400).json({ 
          success: false, 
          phase: "error", 
          code: "invalid_input", 
          error: "Invalid request body." 
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
            fieldErrors: validation.fieldErrors
          });
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
            error: localizeInvalidInput(body.submission?.language || "en")
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
            fieldErrors: validation.fieldErrors
          });
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
          error: "Invalid phase." 
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
            error: localizeTimeoutError(language)
          });
          return;
        }
        res.status(503).json({
          success: false,
          phase: "error",
          code: "service_unavailable",
          error: "AI service is temporarily unavailable."
        });
        return;
      } finally {
        if (timerHandle) {
          clearTimeout(timerHandle);
        }
      }
      
      const parseStartTime = clock();
      const parsed = parseModelResponse(
        rawResponse,
        idFactory,
        isClarification,
        knownQuestionIds,
        onRejection
      );
      const parseEndTime = clock();
      
      if (parsed.phase === "error") {
        res.status(502).json({
          ...parsed,
          error: localizeAiError(language)
        });
        return;
      }
      
      res.status(200).json(parsed);
      
    } catch (err: any) {
      res.status(500).json({
        success: false,
        phase: "error",
        code: "internal_error",
        error: "An unexpected internal error occurred."
      });
    }
  };
}
