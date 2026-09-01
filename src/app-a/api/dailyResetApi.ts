import {
  DailyResetInput,
  DailyResetClarificationSubmission,
  ClarificationQuestion,
  DailyResetApiResponse,
  DailyResetErrorResponse,
  ClarificationNeededResponse,
  PlanReadyResponse,
  DailyResetErrorCode,
  SupportedLanguage,
} from "../domain/daily-reset/contracts";
import {
  normalizeDailyResetInput,
  validateDailyResetInput,
  validateClarificationSubmission,
  validateClarificationResponse,
  validatePlanDraft,
} from "../domain/daily-reset/validation";

export type DailyResetInitialRequest = {
  phase: "initial";
  input: DailyResetInput;
};

export type DailyResetResolveRequest = {
  phase: "resolve";
  submission: DailyResetClarificationSubmission;
  questions: ClarificationQuestion[];
};

export type DailyResetRequest =
  | DailyResetInitialRequest
  | DailyResetResolveRequest;

export interface DailyResetApiClientConfig {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
  scheduleTimer?: (callback: () => void, delayMs: number) => any;
  clearTimer?: (timerId: any) => void;
  createAbortController?: () => AbortController;
}

export interface DailyResetApiClient {
  analyze(input: DailyResetInput, signal?: AbortSignal): Promise<DailyResetApiResponse>;
  resolve(
    submission: DailyResetClarificationSubmission,
    questions: ClarificationQuestion[],
    signal?: AbortSignal
  ): Promise<DailyResetApiResponse>;
}

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === "sr" || lang === "tr") return lang;
  return "en";
}

function getLocalizedMessage(
  type: "invalid_input" | "invalid_ai_response" | "timeout" | "service_unavailable" | "unknown",
  language?: string
): string {
  const lang = getLanguage(language);

  if (type === "invalid_input") {
    if (lang === "sr") return "Neispravan unos. Molimo proverite podatke.";
    if (lang === "tr") return "Geçersiz giriş. Lütfen verileri kontrol edin.";
    return "Invalid input. Please check your data.";
  }

  if (type === "invalid_ai_response") {
    if (lang === "sr") return "Neispravan odgovor veštačke inteligencije. Molimo pokušajte ponovo.";
    if (lang === "tr") return "Geçersiz yapay zeka yanıtı. Lütfen tekrar deneyin.";
    return "Invalid AI response structure. Please try again.";
  }

  if (type === "timeout") {
    if (lang === "sr") return "Planiranje je ovog puta trajalo predugo. Vaš unos je sačuvan — možete pokušati ponovo.";
    if (lang === "tr") return "Planlama bu sefer çok uzun sürdü. Girişiniz korundu — tekrar deneyebilirsiniz.";
    return "Planning took too long this time. Your input is preserved — you can try again.";
  }

  if (type === "service_unavailable") {
    if (lang === "sr") return "Usluga je privremeno nedostupna. Molimo pokušajte ponovo kasnije.";
    if (lang === "tr") return "Hizmet geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
    return "Service is temporarily unavailable. Please try again later.";
  }

  if (lang === "sr") return "Došlo je do neočekivane greške.";
  if (lang === "tr") return "Beklenmeyen bir hata oluştu.";
  return "An unexpected error occurred.";
}

function createErrorResponse(
  code: DailyResetErrorCode,
  type: "invalid_input" | "invalid_ai_response" | "timeout" | "service_unavailable" | "unknown",
  language: string | undefined,
  retryable: boolean,
  fieldErrors?: Record<string, string>
): DailyResetErrorResponse {
  const message = getLocalizedMessage(type, language);
  const res: DailyResetErrorResponse = {
    success: false,
    phase: "error",
    code,
    error: message,
    retryable,
  };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    res.fieldErrors = fieldErrors;
  }
  return res;
}

function isNormalizedServerError(body: any): body is DailyResetErrorResponse {
  if (!body || typeof body !== "object") return false;
  if (body.success !== false) return false;
  if (body.phase !== "error") return false;
  if (typeof body.code !== "string") return false;
  if (typeof body.error !== "string") return false;
  if (typeof body.retryable !== "boolean") return false;
  const validCodes: DailyResetErrorCode[] = [
    "invalid_input",
    "clarification_required",
    "invalid_ai_response",
    "capacity_exceeded",
    "rate_limited",
    "service_unavailable",
    "timeout",
    "unknown",
  ];
  return validCodes.includes(body.code as DailyResetErrorCode);
}

function validateQuestions(questions: ClarificationQuestion[]): boolean {
  if (!questions || !Array.isArray(questions)) return false;
  if (questions.length < 1 || questions.length > 3) return false;
  const seenIds = new Set<string>();
  for (const q of questions) {
    if (!q || !q.id || typeof q.id !== "string" || q.id.trim() === "") return false;
    if (seenIds.has(q.id)) return false;
    seenIds.add(q.id);
    if (!q.question || typeof q.question !== "string" || q.question.trim() === "") return false;
  }
  return true;
}

class DailyResetApiClientImpl implements DailyResetApiClient {
  private config: DailyResetApiClientConfig;
  // Internal client metadata for retry timing (not exposed via public API)
  private lastRetryAfterSeconds: number | null = null;

  constructor(config: DailyResetApiClientConfig = {}) {
    this.config = config;
  }

  async analyze(input: DailyResetInput, signal?: AbortSignal): Promise<DailyResetApiResponse> {
    const normalizedInput = normalizeDailyResetInput(input);
    const val = validateDailyResetInput(normalizedInput);
    if (!val.valid) {
      return createErrorResponse(
        "invalid_input",
        "invalid_input",
        normalizedInput.language,
        false,
        val.fieldErrors
      );
    }

    const payload: DailyResetInitialRequest = {
      phase: "initial",
      input: normalizedInput,
    };

    return this.sendRequest(payload, normalizedInput.language, undefined, signal);
  }

  async resolve(
    submission: DailyResetClarificationSubmission,
    questions: ClarificationQuestion[],
    signal?: AbortSignal
  ): Promise<DailyResetApiResponse> {
    const lang = submission?.language;
    if (!validateQuestions(questions)) {
      return createErrorResponse("invalid_input", "invalid_input", lang, false);
    }

    const normalizedInput = normalizeDailyResetInput(submission);
    const normalizedSubmission: DailyResetClarificationSubmission = {
      ...normalizedInput,
      clarificationAnswers: Array.isArray(submission?.clarificationAnswers)
        ? submission.clarificationAnswers.map((a) => ({
            questionId: String(a?.questionId || "").trim(),
            answer: String(a?.answer || "").trim(),
          }))
        : submission?.clarificationAnswers,
    };

    const val = validateClarificationSubmission(normalizedSubmission, questions);
    if (!val.valid) {
      return createErrorResponse(
        "invalid_input",
        "invalid_input",
        normalizedInput.language,
        false,
        val.fieldErrors
      );
    }

    const payload: DailyResetResolveRequest = {
      phase: "resolve",
      submission: normalizedSubmission,
      questions,
    };

    return this.sendRequest(payload, normalizedInput.language, questions, signal);
  }

  private async sendRequest(
    payload: DailyResetRequest,
    lang: string,
    knownQuestions?: ClarificationQuestion[],
    externalSignal?: AbortSignal
  ): Promise<DailyResetApiResponse> {
    const fetchImpl = this.config.fetchImpl || globalThis.fetch;
    const endpoint = this.config.endpoint || "/api/app-a/daily-reset";
    const timeoutMs = this.config.timeoutMs ?? 42000;
    const scheduleTimer = this.config.scheduleTimer || ((cb, delay) => setTimeout(cb, delay));
    const clearTimer = this.config.clearTimer || ((id) => clearTimeout(id));
    const createAbortController =
      this.config.createAbortController || (() => new AbortController());

    const controller = createAbortController();
    let timedOut = false;

    if (externalSignal) {
      if (externalSignal.aborted) {
        return createErrorResponse("timeout", "timeout", lang, true);
      }
      try {
        externalSignal.addEventListener("abort", () => {
          try {
            controller.abort();
          } catch {}
        }, { once: true });
      } catch {}
    }

    const timerId = scheduleTimer(() => {
      timedOut = true;
      try {
        controller.abort();
      } catch {}
    }, timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err: any) {
        if (
          timedOut ||
          err?.name === "AbortError" ||
          err?.message === "AbortError" ||
          Boolean(controller.signal && (controller.signal as any).aborted) ||
          Boolean(externalSignal && externalSignal.aborted)
        ) {
          return createErrorResponse("timeout", "timeout", lang, true);
        }
        return createErrorResponse("service_unavailable", "service_unavailable", lang, true);
      }

      // Record Retry-After metadata if available
      if (response.status === 429 && response.headers && typeof response.headers.get === "function") {
        const retryAfterHeader = response.headers.get("Retry-After");
        if (retryAfterHeader) {
          const parsedSec = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSec)) {
            this.lastRetryAfterSeconds = parsedSec;
          }
        }
      }

      let body: any = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (isNormalizedServerError(body)) {
        const errRes: DailyResetErrorResponse = {
          success: false,
          phase: "error",
          code: body.code,
          error: body.error,
          retryable: body.retryable,
        };
        if (body.fieldErrors) {
          errRes.fieldErrors = body.fieldErrors;
        }
        return errRes;
      }

      if (response.ok) {
        if (body && typeof body === "object" && body.success === true) {
          if (body.phase === "clarification_needed") {
            const val = validateClarificationResponse(body as ClarificationNeededResponse);
            if (val.valid) {
              return body as ClarificationNeededResponse;
            }
          } else if (body.phase === "plan_ready") {
            if (body.draft && typeof body.draft === "object") {
              const val = validatePlanDraft(body.draft, knownQuestions);
              if (val.valid) {
                return body as PlanReadyResponse;
              }
            }
          }
        }
        return createErrorResponse("invalid_ai_response", "invalid_ai_response", lang, true);
      }

      if (response.status === 400) {
        return createErrorResponse("invalid_input", "invalid_input", lang, false);
      }
      if (response.status === 429) {
        return createErrorResponse("rate_limited", "service_unavailable", lang, true);
      }
      if (response.status === 502) {
        return createErrorResponse("invalid_ai_response", "invalid_ai_response", lang, true);
      }
      if (response.status === 503) {
        return createErrorResponse("service_unavailable", "service_unavailable", lang, true);
      }
      if (response.status === 504) {
        return createErrorResponse("timeout", "timeout", lang, true);
      }

      return createErrorResponse("unknown", "unknown", lang, true);
    } finally {
      clearTimer(timerId);
    }
  }
}

export function createDailyResetApiClient(
  config?: DailyResetApiClientConfig
): DailyResetApiClient {
  return new DailyResetApiClientImpl(config);
}
