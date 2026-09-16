# App A stabilization — 7 September 2026

## Status

Implemented locally on `codex/app-a-current`, based on `4baa855`. Not pushed, deployed, or published. This is a stabilization increment, not a claim that every audited problem is closed or that production is ready.

## Changes

- Today retains working input, clarification answers and review drafts in bounded session storage, and keeps visited screens mounted. Drafts are account-scoped and reset scopes are respected. Storage failure leaves the in-memory flow available.
- Energy and mood are optional, without fabricated scores. Removed the hidden 480-minute meaning of “most of day”. Explicit, unambiguous time statements can supply a budget; task durations are not treated as the whole-day budget. Unknown time permits a user-chosen first step, with other work retained for later. Multiple required tasks need a capacity choice before confirmation.
- Review exposes available minutes and blocks confirmed overload. Existing completion state is preserved from the latest stored plan, including undo on another screen. Plan revisions reject stale full-plan overwrites.
- Inbox/Vision additions merge into the latest daily plan and commit source state with the plan in a transaction. Completion/undo synchronizes linked source state. Missing/deleted source records do not prevent completing an existing plan task. Inbox deletion leaves an opaque tombstone to prevent historical re-import.
- Vision preserves accepted goal, timeframe and clarification context across phases. Missing-detail questions have separate answer fields. Leaf steps from bounded decomposition feed the next-step sequence; archived goals stop suggesting work. Suggestions do not enter the confirmed plan automatically and do not invent a 25-minute duration.
- Routine dates use the effective timezone; archived definitions remain available to history. Firestore routine payloads omit undefined values.
- Focus timer uses an end timestamp rather than relying on interval tick counts, preserving pause/running state across closing and reopening. Mobile navigation no longer sits above its modal backdrop; page zoom is allowed.
- Production App A AI POST requests require a Firebase ID token and server-side per-user/global usage checks. Non-App-A legacy POST routes are blocked in production; App A JSON requests are bounded to 64 KB. Development remains separate.

## Evidence

- All 42 test files under `src/app-a`, `src/shared`, and `server/app-a` passed in the final test run. File counts are not individual assertion counts.
- New repository-boundary tests execute actual persistence functions with an injected transactional Firestore substitute. They cover atomic failure, latest-state merging, duplicate prevention, capacity, linked completion/undo, source deletion, stale revisions and completion resurrection. These are not Firebase emulator/security-rule tests.
- New tests cover explicit time interpretation, authenticated API admission/quota failures, bounded draft restoration and elapsed-time recovery.
- TypeScript check completed without errors. Production client/server build succeeded; Vite warns about chunks over 500 KB, including Firebase and the legacy app bundle.
- Local synthetic browser checks observed review/confirmation, overload protection, completion retained across navigation, a task-derived focus duration and reopening a running timer. A 390px viewport measurement had no horizontal page overflow.
- The later browser pass was interrupted by the tool's usage/approval limit. The newly added clear-time/first-step review interaction and final visual changes were not fully rechecked after the last edits. No blanket responsive/accessibility certification is claimed.

## Required before hosting

1. Re-run the interrupted review interaction: clear available time, choose one step, navigate away/back, reload, and verify the draft is unchanged. Test 390px, tablet and desktop; include zoom, keyboard and modal focus.
2. Test real authenticated Firestore transactions and existing deployed rules for Inbox, Vision, rollover, routines, deletion and reset. Verify two-device concurrent edits and account switching. No live reads/writes/deletes or rule deployments were performed here.
3. Verify hosting service-account credentials and Firestore IAM for the server-only `appAAiUsage` collection. Browser users must not write this collection. Configure `APP_A_AI_DAILY_LIMIT` if the default 500 requests/day is unsuitable; per-user admission is 15 requests/10 minutes. Configure TTL cleanup for `expiresAt` separately if desired. Do not expose Admin credentials in Vite variables.
4. Run real Gemini cases in Serbian/English/Turkish: omitted energy, omitted time, conflicting clarifications, protected care commitments, feasible/infeasible goals and meaningful decomposition. Prompt/unit tests do not demonstrate real-model answer quality or latency.
5. Listen to audio on actual desktop/mobile browsers after explicit opt-in. Audibility and background suspension were not verified here.
6. Finish the full UX review, especially legacy-bundle performance, deletion/re-import behavior for historical Vision ideas, stale-load retry paths, cross-tab routines and concurrent suggestion decisions. These remain review targets, not completed assurances.

No real Gemini requests, cloud publishing, git push, security-rule deployment, or destructive user-data operations were executed during this increment.

## Follow-up verification and fixes

- Vision deletion now replaces the strategy with a marker containing only its ID and a normalized SHA-256 idea fingerprint. Historical suggestions matching that marker are suppressed. A stale save cannot resurrect the deleted document; deliberate creation with a new ID remains possible. The marker is not an anonymization guarantee and must stay owner-private. Two new actual-repository scenarios cover failed deletion, successful deletion, idempotency, stale-save rejection and deliberate recreation (12 transaction scenarios total).
- Routine views reload after a completed write, navigation and window focus. Request generations prevent stale reads replacing newer state; a synchronous write guard prevents double submission. This was code-checked, not exercised with a live account.
- Browser testing resumed successfully. In the synthetic plan, clearing time disabled multi-task confirmation. Choosing the first step kept the removed required task under Later; navigating Inbox → Today retained the edited review. Demo reload intentionally starts fresh because demo persistence is disabled.
- In the ordinary non-demo guest form, an entered test draft survived page reload. No AI request was sent. The form was visually inspected at 390×844, 820×1180 and 1440×1000; measured document widths did not exceed the viewport. These checks cover the form, not every screen or physical device. Tablet inspection also found duplicate/truncated signed-out status, corrected in AccountStatus.
- Full test rerun passed 42/42 files; production build succeeded with the same large-chunk warning. Live service tests, physical audio testing and the remaining full-screen/device coverage above are still required. No deployment or remote user-data mutation occurred.

## 8 September continuation

- The initial saved-plan loader now keys completion to the active user/date request instead of a React effect cleanup flag. A language rerender can no longer cancel the only request and leave the loading screen stuck; account/date changes still invalidate stale results.
- A cancelled or failed Google sign-in from the Daily Reset form now leaves the typed draft intact and shows a localized explanation instead of silently doing nothing.
- Inbox performs its bounded legacy-plan import once per mounted user session instead of repeating the 30-plan pass after every navigation or refresh event. A failed import remains retryable.
- Previously loaded Vision/Progress history stays usable if a later background refresh fails. Initial-load failures still show the retry screen.
- Vision-step load errors now include an explicit localized retry action.
- Reset-session duration, phase and sound-status copy is localized in English, Serbian and Turkish. Selecting guided rest no longer claims that 4 Hz audio is playing before sound is enabled and the session is started. Localization coverage was added to the deterministic reset tests.
- Final verification after these edits: TypeScript passed with zero errors, all 42 test files passed, and the production client/server build succeeded. The large-chunk warning remains (`App` legacy bundle about 1.41 MB and Firebase about 718 KB before gzip).
- Local browser verification confirmed that an invalid synthetic AI response shows a clear error with **Try again** and **Back to edit**, and that returning to edit preserves the full brain dump and time choice. The direct-plan scenario reached execution, opened Reset Sessions from a task, showed all four understandable choices, and entered guided rest without a false “sound playing” status.
- Sign-in failures from the desktop/mobile account control and Inbox are now caught and explained with a localized retry action; rejected popup promises no longer disappear or become unhandled. A final TypeScript check, all 42 test files, and the production build after this change passed. This UI path still needs a deliberate cancelled-popup check in a real browser session before hosting.
- Today execution now includes a small **Add a task** flow for work that appears after a plan is confirmed. It preserves First Focus, adds the item after existing priorities, prevents duplicates and overload, and can save the item to Inbox instead. In authenticated use, the Inbox source and plan change are committed atomically; failed writes do not show false success.
- Capacity now distinguishes flexible planning time from explicitly fixed commitments. A selection such as 30 minutes can contain at most 30 minutes of flexible work while a stated four-hour unavoidable commitment remains visible in the day's total load. The review and execution summaries display the split; legacy items default to flexible. Inbox, Vision and rollover additions remain flexible and use the remaining flexible budget.
- The AI schema and instructions now require a `capacityType` for generated plan items, forbid guessing that an ordinary preferred task is fixed, keep fixed commitments out of the optional block, and preserve their stated duration. Regression coverage includes the exact 30-minute-flexible plus 240-minute-fixed scenario.
- Verification after the quick-add and capacity work: TypeScript passed, all 42 test files passed, and the production client/server build succeeded. The existing large-chunk warning remains. No remote Firebase/Gemini operation, deployment, push or publication was performed.
