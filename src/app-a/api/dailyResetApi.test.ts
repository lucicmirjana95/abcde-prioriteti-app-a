import assert from "assert";
import { createDailyResetApiClient } from "./dailyResetApi";
import {
  DailyResetInput,
  ClarificationQuestion,
  DailyResetClarificationSubmission,
  ClarificationNeededResponse,
  PlanReadyResponse,
} from "../domain/daily-reset/contracts";

const validClarificationFixture: ClarificationNeededResponse = {
  success: true,
  phase: "clarification_needed",
  questions: [
    {
      id: "q1",
      question: "Which task is most important?",
      context: "Context info",
      relatedItemIds: [],
      materialImpact: "priority",
    },
  ],
};

const validPlanFixture: PlanReadyResponse = {
  success: true,
  phase: "plan_ready",
  draft: {
    classifiedItems: [
      {
        id: "c1",
        originalText: "Do laundry and write report",
        kind: "task",
        timeHorizon: "today",
        timeSensitivity: "none",
        isAmbiguous: false,
        needsCheck: false,
        priority: { explanation: "Important task" },
      },
    ],
    firstFocus: [
      {
        id: "p1",
        sourceItemIds: ["c1"],
        title: "Do laundry",
        block: "first_focus",
        estimatedMinutes: 30,
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { explanation: "Important task" },
        needsCheck: false,
      },
    ],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Focus on laundry first.",
    plannedRequiredMinutes: 30,
    plannedOptionalMinutes: 0,
  },
};

class MockResponse {
  ok: boolean;
  status: number;
  headers: Map<string, string>;
  private bodyData: any;

  constructor(status: number, bodyData: any, headersObj: Record<string, string> = {}) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.bodyData = bodyData;
    this.headers = new Map();
    for (const [k, v] of Object.entries(headersObj)) {
      this.headers.set(k.toLowerCase(), v);
    }
  }

  getHeader(key: string): string | null {
    return this.headers.get(key.toLowerCase()) || null;
  }

  get headersObj() {
    return {
      get: (key: string) => this.getHeader(key),
    };
  }

  async json() {
    if (typeof this.bodyData === "string") {
      try {
        return JSON.parse(this.bodyData);
      } catch (err) {
        throw new SyntaxError("Unexpected token in JSON");
      }
    }
    return this.bodyData;
  }
}

async function runTests() {
  let consoleCalled = false;
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalDebug = console.debug;

  const spyConsole = () => {
    console.log = () => { consoleCalled = true; };
    console.error = () => { consoleCalled = true; };
    console.warn = () => { consoleCalled = true; };
    console.debug = () => { consoleCalled = true; };
  };

  const restoreConsole = () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.debug = originalDebug;
  };

  spyConsole();

  let fetchCalls: { url: string; init: any }[] = [];
  let scheduledTimers: { id: number; cb: () => void; delayMs: number }[] = [];
  let clearedTimerIds: number[] = [];
  let timerCounter = 0;

  const createMockConfig = (
    responseFactory: (url: string, init: any) => Promise<MockResponse>,
    customOverrides: any = {}
  ) => {
    fetchCalls = [];
    scheduledTimers = [];
    clearedTimerIds = [];
    timerCounter = 0;

    return {
      fetchImpl: (async (url: string, init: any) => {
        fetchCalls.push({ url, init });
        const mockRes = await responseFactory(url, init);
        return {
          ok: mockRes.ok,
          status: mockRes.status,
          headers: mockRes.headersObj,
          json: () => mockRes.json(),
        } as any;
      }) as typeof fetch,
      scheduleTimer: (cb: () => void, delayMs: number) => {
        const id = ++timerCounter;
        scheduledTimers.push({ id, cb, delayMs });
        return id;
      },
      clearTimer: (id: number) => {
        clearedTimerIds.push(id);
      },
      createAbortController: () => {
        if (typeof AbortController !== "undefined") {
          return new AbortController();
        }
        const signal = { aborted: false, addEventListener: () => {} };
        return {
          signal,
          abort: () => {
            (signal as any).aborted = true;
          },
        } as any;
      },
      ...customOverrides,
    };
  };

  const validInitialInput: DailyResetInput = {
    brainDump: "I have so many things to do today",
    language: "en",
  };

  const validQuestions: ClarificationQuestion[] = [
    {
      id: "q1",
      question: "Question 1?",
      context: "Context 1",
      relatedItemIds: [],
      materialImpact: "priority",
    },
  ];

  const validSubmission: DailyResetClarificationSubmission = {
    ...validInitialInput,
    clarificationAnswers: [{ questionId: "q1", answer: "Answer 1" }],
  };

  // 1. valid initial input sends exactly one request
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(res.success, true);
  }

  // 2. valid resolve input sends exactly one request
  {
    const config = createMockConfig(async () => new MockResponse(200, validPlanFixture));
    const client = createDailyResetApiClient(config);
    const res = await client.resolve(validSubmission, validQuestions);
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(res.success, true);
  }

  // 3. correct default endpoint
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(fetchCalls[0].url, "/api/app-a/daily-reset");
  }

  // 4. POST method
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(fetchCalls[0].init.method, "POST");
  }

  // 5. content-type header
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(fetchCalls[0].init.headers["Content-Type"], "application/json");
  }

  // 6. exact initial JSON shape
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.deepStrictEqual(body, {
      phase: "initial",
      input: {
        brainDump: "I have so many things to do today",
        language: "en",
      },
    });
  }

  // 7. exact resolve JSON shape
  {
    const config = createMockConfig(async () => new MockResponse(200, validPlanFixture));
    const client = createDailyResetApiClient(config);
    await client.resolve(validSubmission, validQuestions);
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.deepStrictEqual(body, {
      phase: "resolve",
      submission: {
        brainDump: "I have so many things to do today",
        language: "en",
        clarificationAnswers: [{ questionId: "q1", answer: "Answer 1" }],
      },
      questions: validQuestions,
    });
  }

  // 8. invalid initial input sends no request
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze({ brainDump: "x", language: "en" });
    assert.strictEqual(fetchCalls.length, 0);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_input");
    }
  }

  // 9. invalid resolve sends no request
  {
    const config = createMockConfig(async () => new MockResponse(200, validPlanFixture));
    const client = createDailyResetApiClient(config);
    const res = await client.resolve(
      { ...validSubmission, clarificationAnswers: [] },
      validQuestions
    );
    assert.strictEqual(fetchCalls.length, 0);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_input");
    }
  }

  // 10. caller input remains unchanged
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    const inputObj = { brainDump: "   untrimmed brain dump text   ", language: "en" as const };
    const originalJson = JSON.stringify(inputObj);
    await client.analyze(inputObj);
    assert.strictEqual(JSON.stringify(inputObj), originalJson);
  }

  // 11. valid clarification response accepted
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.phase, "clarification_needed");
      assert.strictEqual((res as ClarificationNeededResponse).questions.length, 1);
    }
  }

  // 12. valid plan response accepted
  {
    const config = createMockConfig(async () => new MockResponse(200, validPlanFixture));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.phase, "plan_ready");
      assert.strictEqual((res as PlanReadyResponse).draft.firstFocus.length, 1);
    }
  }

  // 13. malformed clarification rejected
  {
    const malformedClarification = {
      success: true,
      phase: "clarification_needed",
      questions: [], // Invalid: needs 1-3 questions
    };
    const config = createMockConfig(async () => new MockResponse(200, malformedClarification));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_ai_response");
    }
  }

  // 14. malformed plan rejected
  {
    const malformedPlan = {
      success: true,
      phase: "plan_ready",
      draft: {
        ...validPlanFixture.draft,
        firstFocus: [
          validPlanFixture.draft.firstFocus[0],
          { ...validPlanFixture.draft.firstFocus[0], id: "p2" },
          { ...validPlanFixture.draft.firstFocus[0], id: "p3" },
          { ...validPlanFixture.draft.firstFocus[0], id: "p4" }, // Invalid: >3 firstFocus
        ],
      },
    };
    const config = createMockConfig(async () => new MockResponse(200, malformedPlan));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_ai_response");
    }
  }

  // 15. malformed server error safely replaced
  {
    const malformedServerError = {
      success: false,
      phase: "error",
      error: "Raw unhandled error string without code or retryable",
    };
    const config = createMockConfig(async () => new MockResponse(500, malformedServerError));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "unknown");
      assert.strictEqual(res.retryable, true);
      assert.strictEqual(res.error, "An unexpected error occurred.");
    }
  }

  // 16. valid server error preserved
  {
    const validServerError = {
      success: false,
      phase: "error",
      code: "rate_limited",
      error: "Too many requests. Please try again later.",
      retryable: true,
    };
    const config = createMockConfig(async () => new MockResponse(429, validServerError));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "rate_limited");
      assert.strictEqual(res.error, "Too many requests. Please try again later.");
      assert.strictEqual(res.retryable, true);
    }
  }

  // 17. HTTP 400 handled safely
  {
    const config = createMockConfig(async () => new MockResponse(400, "Bad Request String"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_input");
    }
  }

  // 18. HTTP 429 handled safely
  {
    const config = createMockConfig(
      async () => new MockResponse(429, "Too Many Requests", { "Retry-After": "60" })
    );
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "rate_limited");
    }
  }

  // 19. Retry-After causes no retry
  {
    const config = createMockConfig(
      async () => new MockResponse(429, "Rate limit", { "Retry-After": "60" })
    );
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(fetchCalls.length, 1);
  }

  // 20. HTTP 500 handled safely
  {
    const config = createMockConfig(async () => new MockResponse(500, "Internal Server Error"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "unknown");
    }
  }

  // 21. HTTP 502 handled safely
  {
    const config = createMockConfig(async () => new MockResponse(502, "Bad Gateway"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_ai_response");
    }
  }

  // 22. HTTP 503 handled safely
  {
    const config = createMockConfig(async () => new MockResponse(503, "Service Unavailable"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "service_unavailable");
    }
  }

  // 23. HTTP 504 handled safely
  {
    const config = createMockConfig(async () => new MockResponse(504, "Gateway Timeout"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "timeout");
    }
  }

  // 24. unexpected status handled safely
  {
    const config = createMockConfig(async () => new MockResponse(418, "I'm a teapot"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "unknown");
    }
  }

  // 25. non-JSON response handled safely
  {
    const config = createMockConfig(
      async () => new MockResponse(200, "<html><body>502 Bad Gateway</body></html>")
    );
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_ai_response");
    }
  }

  // 26. rejected JSON parsing handled safely
  {
    const config = createMockConfig(async () => {
      const res = new MockResponse(200, "");
      res.json = async () => {
        throw new SyntaxError("Unexpected token");
      };
      return res;
    });
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "invalid_ai_response");
    }
  }

  // 27. network failure returns service unavailable
  {
    const config = createMockConfig(async () => {
      throw new Error("Failed to fetch");
    });
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "service_unavailable");
      assert.strictEqual(res.retryable, true);
    }
  }

  // 28. abort returns timeout
  {
    const config = createMockConfig(async () => {
      const err = new Error("AbortError");
      err.name = "AbortError";
      throw err;
    });
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "timeout");
      assert.strictEqual(res.retryable, true);
    }
  }

  // 29. configured timeout aborts the request
  {
    let timerCallback: (() => void) | null = null;
    const config = createMockConfig(
      async (_url: string, init: any) => {
        if (timerCallback) timerCallback();
        const err = new Error("AbortError");
        err.name = "AbortError";
        throw err;
      },
      {
        timeoutMs: 100,
        scheduleTimer: (cb: () => void) => {
          timerCallback = cb;
          return 99;
        },
      }
    );
    const client = createDailyResetApiClient(config);
    const res = await client.analyze(validInitialInput);
    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.strictEqual(res.code, "timeout");
    }
  }

  // 30. timeout cleared after success
  {
    const config = createMockConfig(async () => new MockResponse(200, validClarificationFixture));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(clearedTimerIds.length, 1);
    assert.strictEqual(clearedTimerIds[0], scheduledTimers[0].id);
  }

  // 31. timeout cleared after failure
  {
    const config = createMockConfig(async () => new MockResponse(500, "Error"));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(clearedTimerIds.length, 1);
    assert.strictEqual(clearedTimerIds[0], scheduledTimers[0].id);
  }

  // 32. no automatic retry
  {
    const config = createMockConfig(async () => new MockResponse(503, "Service Unavailable"));
    const client = createDailyResetApiClient(config);
    await client.analyze(validInitialInput);
    assert.strictEqual(fetchCalls.length, 1);
  }

  // 33. Serbian, English, and Turkish fallback errors localized
  {
    const config = createMockConfig(async () => new MockResponse(500, "Error"));
    const client = createDailyResetApiClient(config);

    const resSr = await client.analyze({ brainDump: "x", language: "sr" });
    if (resSr.success === false) {
      assert.strictEqual(resSr.error, "Neispravan unos. Molimo proverite podatke.");
    }

    const resTr = await client.analyze({ brainDump: "x", language: "tr" });
    if (resTr.success === false) {
      assert.strictEqual(resTr.error, "Geçersiz giriş. Lütfen verileri kontrol edin.");
    }

    const resEn = await client.analyze({ brainDump: "x", language: "en" });
    if (resEn.success === false) {
      assert.strictEqual(resEn.error, "Invalid input. Please check your data.");
    }
  }

  // 34. errors contain neither brain dump nor raw response
  {
    const sensitiveBrainDump = "SECRET_BRAIN_DUMP_DATA_12345";
    const config = createMockConfig(async () => new MockResponse(500, "Raw HTML <html>Secret Error</html>"));
    const client = createDailyResetApiClient(config);
    const res = await client.analyze({ brainDump: sensitiveBrainDump + " test text", language: "en" });
    const resStr = JSON.stringify(res);
    assert.strictEqual(resStr.includes(sensitiveBrainDump), false);
    assert.strictEqual(resStr.includes("Secret Error"), false);
  }

  // 35. no console method is called
  {
    restoreConsole();
    assert.strictEqual(consoleCalled, false);
  }

  // 36. External AbortSignal aborts in-flight fetch
  {
    let abortHappened = false;
    const config = createMockConfig(async (_url: string, init: any) => {
      init.signal?.addEventListener("abort", () => {
        abortHappened = true;
      });
      const err = new Error("AbortError");
      err.name = "AbortError";
      throw err;
    });
    const client = createDailyResetApiClient(config);
    const abortCtrl = new AbortController();
    const promise = client.analyze(validInitialInput, abortCtrl.signal);
    abortCtrl.abort();
    const res = await promise;
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, "timeout");
  }

  // 37. Timeout error message is localized for English, Serbian, and Turkish
  {
    const config = createMockConfig(async () => {
      const err = new Error("AbortError");
      err.name = "AbortError";
      throw err;
    });
    const client = createDailyResetApiClient(config);

    const resEn = await client.analyze({ ...validInitialInput, language: "en" });
    assert.strictEqual(resEn.success, false);
    if (!resEn.success) {
      assert.strictEqual(
        resEn.error,
        "Planning took too long this time. Your input is preserved — you can try again."
      );
    }

    const resSr = await client.analyze({ ...validInitialInput, language: "sr" });
    assert.strictEqual(resSr.success, false);
    if (!resSr.success) {
      assert.strictEqual(
        resSr.error,
        "Planiranje je ovog puta trajalo predugo. Vaš unos je sačuvan — možete pokušati ponovo."
      );
    }

    const resTr = await client.analyze({ ...validInitialInput, language: "tr" });
    assert.strictEqual(resTr.success, false);
    if (!resTr.success) {
      assert.strictEqual(
        resTr.error,
        "Planlama bu sefer çok uzun sürdü. Girişiniz korundu — tekrar deneyebilirsiniz."
      );
    }
  }

  originalLog("✅ All 37 frontend API client tests passed successfully!");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
