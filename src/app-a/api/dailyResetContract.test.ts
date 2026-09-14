import assert from "node:assert/strict";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { createDailyResetRoute } from "../../../server/app-a/daily-reset/route";
import {
  fixMalformedNonObject,
  fixValidClarificationResponse,
  fixValidPlanResponse,
} from "../../../server/app-a/daily-reset/fixtures";
import type {
  DailyResetClarificationSubmission,
  DailyResetInput,
} from "../domain/daily-reset/contracts";
import { validatePlanDraft } from "../domain/daily-reset/validation";
import { createDailyResetApiClient } from "./dailyResetApi";

const ENDPOINT = "/api/app-a/daily-reset";

type JsonObject = Record<string, unknown>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

interface BridgeObservation {
  invocationCount: number;
  urls: string[];
  requestBodies: JsonObject[];
  statuses: number[];
  responseReferences: unknown[];
  responseSnapshots: unknown[];
}

interface BridgeOptions {
  enabled?: boolean;
  modelResponse?: unknown;
  providerError?: Error;
  clientKey?: string;
}

function createInProcessBridge(options: BridgeOptions = {}) {
  const observation: BridgeObservation = {
    invocationCount: 0,
    urls: [],
    requestBodies: [],
    statuses: [],
    responseReferences: [],
    responseSnapshots: [],
  };
  let nextId = 0;
  let currentModelResponse = options.modelResponse ?? fixValidClarificationResponse;

  const route = createDailyResetRoute(
    () => options.enabled !== false,
    async () => {
      if (options.providerError) throw options.providerError;
      return clone(currentModelResponse);
    },
    () => 1_000_000,
    () => `server-id-${++nextId}`,
    () => options.clientKey ?? "contract-client",
  );

  const fetchImpl: typeof fetch = async (input, init) => {
    observation.invocationCount += 1;
    const url = typeof input === "string" ? input : input.toString();
    const body = JSON.parse(String(init?.body)) as JsonObject;
    observation.urls.push(url);
    observation.requestBodies.push(body);

    let statusCode = 200;
    let responseBody: unknown;
    const headers = new Map<string, string>();
    const response = {
      status(code: number) {
        statusCode = code;
        return response;
      },
      json(value: unknown) {
        responseBody = value;
        return response;
      },
      set(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
        return response;
      },
    } as unknown as ExpressResponse;
    const request = {
      body,
      method: init?.method,
      headers: init?.headers,
      ip: "127.0.0.1",
    } as unknown as ExpressRequest;

    await route(request, response);
    const snapshot = clone(responseBody);
    observation.statuses.push(statusCode);
    observation.responseReferences.push(responseBody);
    observation.responseSnapshots.push(snapshot);
    deepFreeze(responseBody);

    return {
      ok: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
      json: async () => responseBody,
    } as unknown as globalThis.Response;
  };

  return {
    client: createDailyResetApiClient({ fetchImpl, endpoint: ENDPOINT }),
    fetchImpl,
    observation,
    setModelResponse(value: unknown) {
      currentModelResponse = value;
    },
  };
}

async function invokeRouteWithRawBody(body: unknown): Promise<number> {
  const bridge = createInProcessBridge();
  // The client deliberately hides its implementation. Use a minimal second bridge
  // invocation through the same production route to exercise an unreachable 400
  // branch (the production client rejects this body before transport).
  await bridge.fetchImpl(ENDPOINT, { method: "POST", body: JSON.stringify(body) });
  return bridge.observation.statuses.at(-1) ?? 0;
}

async function run() {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  let globalFetchCalls = 0;
  let consoleCalls = 0;

  globalThis.fetch = async () => {
    globalFetchCalls += 1;
    throw new Error("The contract test must not use global fetch");
  };
  globalThis.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
    const timer = originalSetTimeout(callback, delay, ...args);
    if (typeof timer === "object" && timer && "unref" in timer) {
      (timer as { unref: () => void }).unref();
    }
    return timer;
  }) as typeof globalThis.setTimeout;
  console.log = () => { consoleCalls += 1; };
  console.warn = () => { consoleCalls += 1; };
  console.error = () => { consoleCalls += 1; };

  try {
    const input: DailyResetInput = {
      brainDump: "Finish the proposal and review the pull request.",
      language: "en",
      energy: 4,
      pleasantness: 3,
      availableMinutes: 180,
      stateNote: "Calm and focused",
    };

    const initial = createInProcessBridge();
    const initialSnapshot = clone(input);
    deepFreeze(input);
    const clarification = await initial.client.analyze(input);
    assert.deepEqual(input, initialSnapshot, "analyze must not mutate its input");
    assert.equal(initial.observation.invocationCount, 1);
    assert.deepEqual(initial.observation.urls, [ENDPOINT]);
    assert.equal(initial.observation.statuses[0], 200);
    assert.deepEqual(initial.observation.requestBodies[0], {
      phase: "initial",
      input: initialSnapshot,
    });
    assert.equal(clarification.success, true);
    assert.equal(clarification.phase, "clarification_needed");
    if (!clarification.success || clarification.phase !== "clarification_needed") {
      throw new Error("Expected clarification response");
    }
    assert.equal(clarification.questions[0].id, "server-id-1");
    assert.deepEqual(
      initial.observation.responseReferences[0],
      initial.observation.responseSnapshots[0],
      "client must not mutate the exact route clarification response",
    );

    const questions = deepFreeze(clone(clarification.questions));
    const submission: DailyResetClarificationSubmission = {
      ...initialSnapshot,
      clarificationAnswers: [{ questionId: questions[0].id, answer: "Today at 17:00" }],
    };
    const submissionSnapshot = clone(submission);
    deepFreeze(submission);
    const planBridge = createInProcessBridge({ modelResponse: fixValidPlanResponse });
    const plan = await planBridge.client.resolve(submission, questions);
    assert.deepEqual(submission, submissionSnapshot, "resolve must not mutate its submission");
    assert.equal(planBridge.observation.invocationCount, 1);
    assert.equal(planBridge.observation.statuses[0], 200);
    assert.deepEqual(planBridge.observation.requestBodies[0], {
      phase: "resolve",
      submission: submissionSnapshot,
      questions,
    });
    assert.equal(plan.success, true);
    assert.equal(plan.phase, "plan_ready");
    if (!plan.success || plan.phase !== "plan_ready") throw new Error("Expected plan response");
    assert.equal(validatePlanDraft(plan.draft, questions).valid, true);
    assert.equal(plan.draft.classifiedItems[0].id, "server-id-1");
    assert.equal(plan.draft.firstFocus[0].id, "server-id-2");
    assert.deepEqual(plan.draft.firstFocus[0].sourceItemIds, ["server-id-1"]);
    assert.deepEqual(
      planBridge.observation.responseReferences[0],
      planBridge.observation.responseSnapshots[0],
      "client must not mutate the exact route plan response",
    );

    assert.equal(await invokeRouteWithRawBody({ phase: "unsupported" }), 400);

    const invalidAi = createInProcessBridge({ modelResponse: fixMalformedNonObject });
    const invalidAiResult = await invalidAi.client.analyze(initialSnapshot);
    assert.equal(invalidAi.observation.statuses[0], 502);
    assert.equal(invalidAiResult.success, false);
    if (!invalidAiResult.success) assert.equal(invalidAiResult.code, "invalid_ai_response");

    const disabled = createInProcessBridge({ enabled: false });
    const unavailable = await disabled.client.analyze(initialSnapshot);
    assert.equal(disabled.observation.statuses[0], 503);
    assert.equal(unavailable.success, false);
    if (!unavailable.success) assert.equal(unavailable.code, "service_unavailable");

    const rateLimited = createInProcessBridge();
    for (let request = 0; request < 6; request += 1) {
      await rateLimited.client.analyze(initialSnapshot);
    }
    assert.equal(rateLimited.observation.statuses.at(-1), 429);
    assert.equal(rateLimited.observation.invocationCount, 6);

    const secondClarification = createInProcessBridge({
      modelResponse: fixValidClarificationResponse,
    });
    const secondResult = await secondClarification.client.resolve(submissionSnapshot, questions);
    assert.equal(secondClarification.observation.statuses[0], 502);
    assert.equal(secondResult.success, false);
    if (!secondResult.success) assert.equal(secondResult.code, "invalid_ai_response");

    const provider = createInProcessBridge({
      providerError: new Error("GoogleGenerativeAIError: SECRET_PROVIDER_DETAIL"),
    });
    const providerResult = await provider.client.analyze(initialSnapshot);
    assert.equal(provider.observation.statuses[0], 503);
    assert.equal(providerResult.success, false);
    assert.equal(JSON.stringify(providerResult).includes("SECRET_PROVIDER_DETAIL"), false);

    for (const language of ["sr", "en", "tr"] as const) {
      const localized = createInProcessBridge({ enabled: false });
      const result = await localized.client.analyze({ ...initialSnapshot, language });
      assert.equal(result.success, false);
      if (!result.success) {
        if (language === "sr") assert.match(result.error, /Usluga|nedostupna/);
        if (language === "en") assert.match(result.error, /Service|unavailable/);
        if (language === "tr") assert.match(result.error, /Hizmet|kullanılamıyor/);
      }
    }

    const sensitive = createInProcessBridge({ modelResponse: fixMalformedNonObject });
    const secret = "CONFIDENTIAL_BRAIN_DUMP_42";
    const sensitiveResult = await sensitive.client.analyze({
      ...initialSnapshot,
      brainDump: secret,
    });
    assert.equal(JSON.stringify(sensitiveResult).includes(secret), false);
    assert.equal(sensitive.observation.invocationCount, 1, "client must not retry automatically");

    assert.equal(globalFetchCalls, 0);
    assert.equal(consoleCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }

  console.log("✅ Direct production client-to-route contract test passed successfully!");
}

run().catch((error) => {
  console.error("❌ Direct contract test failed:", error);
  process.exitCode = 1;
});
