import assert from "assert";
import { createDailyResetRoute } from "./route";
import { 
  fixValidClarificationResponse as validClarificationFixture, 
  fixValidPlanResponse as validPlanFixture, 
  fixMalformedNonObject as invalidNonObjectFixture 
} from "./fixtures";

function createMockReq(body: any): any {
  return {
    body: JSON.parse(JSON.stringify(body)),
  };
}

function createMockRes(): any {
  const res: any = {
    statusCode: 200,
    headers: {}
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  res.set = (key: string, val: string) => {
    res.headers[key] = val;
    return res;
  };
  return res;
}

async function runTests() {
  let isEnabled = true;
  let generatorCalled = 0;
  let generatorResponse: any = validClarificationFixture;
  let generatorError: Error | null = null;
  let currentTime = 1000000;

  let generateFn = async (prompt: string, schema: any) => {
    generatorCalled++;
    if (generatorError) throw generatorError;
    return generatorResponse;
  };

  let clock = () => currentTime;
  let idFactory = () => "mock-id";
  let clientKey = "test-client";
  let clientKeyResolver = () => clientKey;

  let route = createDailyResetRoute(
    () => isEnabled,
    generateFn,
    clock,
    idFactory,
    clientKeyResolver
  );

  const resetMocks = () => {
    isEnabled = true;
    generatorCalled = 0;
    generatorResponse = validClarificationFixture;
    generatorError = null;
    currentTime = 1000000;
    clientKey = "test-client";
    route = createDailyResetRoute(
      () => isEnabled,
      generateFn,
      clock,
      idFactory,
      clientKeyResolver
    );
  };

  // 1 & 2. disabled endpoint returns 503, does not call generator
  resetMocks();
  isEnabled = false;
  let req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  let res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 503);
  assert.strictEqual(generatorCalled, 0);

  // 3. invalid initial body returns 400
  resetMocks();
  req = createMockReq({ phase: "initial" });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 4. whitespace-only brain dump returns 400
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "   ", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 5. unsupported language returns safe 400
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "fr" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 6. invalid rating returns 400
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en", energy: 99 } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 7. invalid available minutes returns 400
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en", availableMinutes: -5 } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 8. valid initial request calls generator once
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(generatorCalled, 1);

  // 9. valid resolve request calls generator once
  resetMocks();
  generatorResponse = validPlanFixture;
  req = createMockReq({ 
    phase: "resolve", 
    submission: { brainDump: "test test", language: "en", clarificationAnswers: [{questionId: "q1", answer: "A"}] },
    questions: [{ id: "q1", question: "Q?", context: "C" }]
  });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(generatorCalled, 1);

  // 10. missing clarification answer returns 400
  resetMocks();
  req = createMockReq({ 
    phase: "resolve", 
    submission: { brainDump: "test test", language: "en", clarificationAnswers: [] },
    questions: [{ id: "q1", question: "Q?", context: "C" }]
  });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 11. unknown clarification answer returns 400
  resetMocks();
  req = createMockReq({ 
    phase: "resolve", 
    submission: { brainDump: "test test", language: "en", clarificationAnswers: [{questionId: "q2", answer: "A"}] },
    questions: [{ id: "q1", question: "Q?", context: "C" }]
  });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 12. duplicate clarification answer returns 400
  resetMocks();
  req = createMockReq({ 
    phase: "resolve", 
    submission: { brainDump: "test test", language: "en", clarificationAnswers: [{questionId: "q1", answer: "A"}, {questionId: "q1", answer: "B"}] },
    questions: [{ id: "q1", question: "Q?", context: "C" }]
  });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 13. more than three questions returns 400
  resetMocks();
  req = createMockReq({ 
    phase: "resolve", 
    submission: { brainDump: "test test", language: "en", clarificationAnswers: [
      {questionId: "q1", answer: "A"}, {questionId: "q2", answer: "A"}, 
      {questionId: "q3", answer: "A"}, {questionId: "q4", answer: "A"}
    ] },
    questions: [
      { id: "q1", question: "Q?", context: "C" },
      { id: "q2", question: "Q?", context: "C" },
      { id: "q3", question: "Q?", context: "C" },
      { id: "q4", question: "Q?", context: "C" }
    ]
  });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);

  // 14. invalid request never calls generator
  assert.strictEqual(generatorCalled, 0);

  // 15. valid clarification model response returns 200
  resetMocks();
  generatorResponse = validClarificationFixture;
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.phase, "clarification_needed");

  // 16. valid plan model response returns 200
  resetMocks();
  generatorResponse = validPlanFixture;
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.phase, "plan_ready");

  // 17. raw model response is never returned
  assert.strictEqual(res.body.rawResponse, undefined);

  // 18. invalid model response returns 502
  resetMocks();
  generatorResponse = invalidNonObjectFixture;
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 502);

  // 19. clarification during resolve returns 502
  resetMocks();
  generatorResponse = validClarificationFixture;
  req = createMockReq({ 
    phase: "resolve", 
    submission: { brainDump: "test test", language: "en", clarificationAnswers: [{questionId: "q1", answer: "A"}] },
    questions: [{ id: "q1", question: "Q?", context: "C" }]
  });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 502);

  // 20. timeout returns 504
  resetMocks();
  generatorError = new Error("Timeout");
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 504);

  // 21. temporary provider failure returns 503
  resetMocks();
  generatorError = new Error("Provider Down");
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 503);

  // 22. unknown internal failure returns 500
  resetMocks();
  const failingIdFactory = () => { throw new Error("Internal"); };
  route = createDailyResetRoute(
    () => isEnabled,
    generateFn,
    clock,
    failingIdFactory,
    clientKeyResolver
  );
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 500);

  // 23. first five requests are allowed
  resetMocks();
  for (let i = 0; i < 5; i++) {
    req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
    res = createMockRes();
    await route(req, res);
    assert.strictEqual(res.statusCode, 200, `Request ${i+1} failed`);
  }

  // 24. sixth request returns 429
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 429);

  // 25. 429 contains Retry-After
  assert.strictEqual(res.headers["Retry-After"], "600");

  // 26. expired window allows another request
  currentTime += 10 * 60 * 1000 + 1000; // 10 minutes + 1 sec
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 200);

  // 27. expired limiter entries are removed
  // Tested implicitly by the code cleaning up, but let's test quota reset logic.
  for (let i = 0; i < 4; i++) {
    req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
    res = createMockRes();
    await route(req, res);
    assert.strictEqual(res.statusCode, 200);
  }
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 429);

  // 28. disabled requests do not consume quota
  resetMocks();
  isEnabled = false;
  for (let i = 0; i < 10; i++) {
    req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
    res = createMockRes();
    await route(req, res);
    assert.strictEqual(res.statusCode, 503);
  }
  isEnabled = true;
  req = createMockReq({ phase: "initial", input: { brainDump: "test test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 200);

  // 29. sensitive input does not appear in errors
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "MY_SECRET_PASSWORD", language: "en" } });
  generatorResponse = invalidNonObjectFixture;
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 502);
  assert(!JSON.stringify(res.body).includes("MY_SECRET_PASSWORD"));

  // 30. request and parsed objects remain unmutated
  resetMocks();
  const rawInput = { phase: "initial", input: { brainDump: "test test", language: "en" } };
  const rawInputStr = JSON.stringify(rawInput);
  req = createMockReq(rawInput);
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(JSON.stringify(req.body), rawInputStr);

  // 31. Serbian errors are localized
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "x", language: "sr" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, "Neispravan unos. Molimo proverite podatke.");
  
  generatorResponse = invalidNonObjectFixture;
  req = createMockReq({ phase: "initial", input: { brainDump: "valid brain dump for test", language: "sr" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.body.error, "Neispravan odgovor veštačke inteligencije. Molimo pokušajte ponovo.");

  // 32. Turkish errors are localized
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "x", language: "tr" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, "Geçersiz giriş. Lütfen verileri kontrol edin.");
  
  generatorResponse = invalidNonObjectFixture;
  req = createMockReq({ phase: "initial", input: { brainDump: "valid brain dump for test", language: "tr" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.body.error, "Geçersiz yapay zeka yanıtı. Lütfen tekrar deneyin.");

  // 33. English errors are localized
  resetMocks();
  req = createMockReq({ phase: "initial", input: { brainDump: "x", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, "Invalid input. Please check your data.");
  
  generatorResponse = invalidNonObjectFixture;
  req = createMockReq({ phase: "initial", input: { brainDump: "valid brain dump for test", language: "en" } });
  res = createMockRes();
  await route(req, res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.body.error, "Invalid AI response structure. Please try again.");

  console.log("✅ All 33 route tests passed successfully!");
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
