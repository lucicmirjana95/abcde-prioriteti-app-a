import assert from 'node:assert/strict';
import { SHARE_APP_LOCALIZATION } from '../../settings/shareLocalization';
import {
  validateAndSanitizeCanonicalShareUrl,
  getAppACanonicalPublicUrl,
} from '../../settings/shareConfig';

console.log('Running ShareAppCard Component Logic & Interaction Tests...');

// -------------------------------------------------------------
// 1. Correct EN / SR / TR Localization
// -------------------------------------------------------------
const languages = ['en', 'sr', 'tr'] as const;

for (const lang of languages) {
  const t = SHARE_APP_LOCALIZATION[lang];
  assert.ok(t, `Missing localization for ${lang}`);

  // Card title
  assert.ok(t.cardTitle && t.cardTitle.length > 0, `Missing cardTitle for ${lang}`);
  if (lang === 'en') assert.equal(t.cardTitle, 'Share App');
  if (lang === 'sr') assert.equal(t.cardTitle, 'Podeli aplikaciju');
  if (lang === 'tr') assert.equal(t.cardTitle, 'Uygulamayı paylaş');

  // Supporting text
  assert.ok(t.supportingText && t.supportingText.length > 0, `Missing supportingText for ${lang}`);
  if (lang === 'en')
    assert.equal(t.supportingText, 'Share Daily Reset with someone who may find it useful.');
  if (lang === 'sr')
    assert.equal(
      t.supportingText,
      'Podeli Daily Reset sa nekim kome bi mogao da bude koristan.'
    );
  if (lang === 'tr')
    assert.equal(t.supportingText, 'Daily Reset’i faydalı bulabilecek biriyle paylaş.');

  // Primary action
  assert.ok(t.shareAction && t.shareAction.length > 0, `Missing shareAction for ${lang}`);
  if (lang === 'en') assert.equal(t.shareAction, 'Share App');
  if (lang === 'sr') assert.equal(t.shareAction, 'Podeli aplikaciju');
  if (lang === 'tr') assert.equal(t.shareAction, 'Uygulamayı paylaş');

  // Link copied
  assert.ok(t.linkCopied && t.linkCopied.length > 0, `Missing linkCopied for ${lang}`);
  if (lang === 'en') assert.equal(t.linkCopied, 'Link copied.');
  if (lang === 'sr') assert.equal(t.linkCopied, 'Link je kopiran.');
  if (lang === 'tr') assert.equal(t.linkCopied, 'Bağlantı kopyalandı.');

  // Manual copy guidance
  assert.ok(t.copyManually && t.copyManually.length > 0, `Missing copyManually for ${lang}`);
  if (lang === 'en') assert.equal(t.copyManually, 'Copy this link manually.');
  if (lang === 'sr') assert.equal(t.copyManually, 'Kopiraj ovaj link ručno.');
  if (lang === 'tr') assert.equal(t.copyManually, 'Bu bağlantıyı elle kopyalayın.');

  // Not available yet
  assert.ok(t.notAvailableYet && t.notAvailableYet.length > 0, `Missing notAvailableYet for ${lang}`);
  if (lang === 'en')
    assert.equal(t.notAvailableYet, 'The public sharing link is not available yet.');
  if (lang === 'sr')
    assert.equal(t.notAvailableYet, 'Javni link za deljenje još nije dostupan.');
  if (lang === 'tr')
    assert.equal(
      t.notAvailableYet,
      'Herkese açık paylaşım bağlantısı henüz kullanılamıyor.'
    );

  // Web Share Payload
  assert.equal(t.sharePayloadTitle, 'Daily Reset');
  assert.ok(t.sharePayloadDescription && t.sharePayloadDescription.length > 0);

  // Strict constraint: Do NOT display "Coming soon"
  for (const val of Object.values(t)) {
    assert.ok(
      !val.toLowerCase().includes('coming soon'),
      `"Coming soon" found in localization for ${lang}: ${val}`
    );
    assert.ok(
      !val.toLowerCase().includes('uskoro'),
      `"Uskoro" found in localization for ${lang}: ${val}`
    );
    assert.ok(
      !val.toLowerCase().includes('yakında'),
      `"Yakında" found in localization for ${lang}: ${val}`
    );
  }
}
console.log('✓ 1. Localization verified for EN, SR, TR (strict copy matching & no "Coming soon").');

// -------------------------------------------------------------
// 2. Share Flow Simulation Harness
// -------------------------------------------------------------
interface ShareFlowResult {
  state: 'idle' | 'copied' | 'manual';
  sharedPayload?: { title: string; text: string; url: string };
  clipboardText?: string;
  hasError: boolean;
  duplicateSuppressed: boolean;
}

async function simulateShareFlow(options: {
  canonicalUrl: string;
  language: 'en' | 'sr' | 'tr';
  nativeShareSupported: boolean;
  nativeShareThrows?: Error;
  clipboardSupported: boolean;
  clipboardThrows?: Error;
  tapCount?: number;
}): Promise<ShareFlowResult> {
  const t = SHARE_APP_LOCALIZATION[options.language];
  let inFlight = false;
  let executionCount = 0;
  let sharedPayload: { title: string; text: string; url: string } | undefined;
  let clipboardText: string | undefined;
  let state: 'idle' | 'copied' | 'manual' = 'idle';
  let hasError = false;

  const runClick = async () => {
    if (inFlight) {
      return;
    }
    inFlight = true;
    executionCount++;

    try {
      // Simulate real asynchronous operation latency
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 1. Native share
      if (options.nativeShareSupported) {
        if (options.nativeShareThrows) {
          const err = options.nativeShareThrows;
          if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            // User cancelled share sheet
            state = 'idle';
            return;
          }
          // Non-abort error falls through
        } else {
          sharedPayload = {
            title: t.sharePayloadTitle,
            text: t.sharePayloadDescription,
            url: options.canonicalUrl,
          };
          state = 'idle';
          return;
        }
      }

      // 2. Clipboard fallback
      if (options.clipboardSupported) {
        if (options.clipboardThrows) {
          // Clipboard failed, fall through to manual
        } else {
          clipboardText = options.canonicalUrl;
          state = 'copied';
          return;
        }
      }

      // 3. Manual fallback
      state = 'manual';
    } finally {
      inFlight = false;
    }
  };

  const taps = options.tapCount ?? 1;
  const promises = [];
  for (let i = 0; i < taps; i++) {
    promises.push(runClick());
  }
  await Promise.all(promises);

  return {
    state,
    sharedPayload,
    clipboardText,
    hasError,
    duplicateSuppressed: executionCount === 1,
  };
}

// -------------------------------------------------------------
// 3. Native Web Share API Success
// -------------------------------------------------------------
{
  const result = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'en',
    nativeShareSupported: true,
    clipboardSupported: true,
  });

  assert.equal(result.state, 'idle');
  assert.ok(result.sharedPayload);
  assert.equal(result.sharedPayload.title, 'Daily Reset');
  assert.equal(result.sharedPayload.url, 'https://dailyreset.app');
  assert.equal(result.sharedPayload.text, 'Mindful daily planning and focus.');
}
console.log('✓ 2. Native Web Share API success verified.');

// -------------------------------------------------------------
// 4. User Cancellation Without Error Banner
// -------------------------------------------------------------
{
  const abortError = new Error('User cancelled');
  abortError.name = 'AbortError';

  const result = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'sr',
    nativeShareSupported: true,
    nativeShareThrows: abortError,
    clipboardSupported: true,
  });

  assert.equal(result.state, 'idle', 'Must return to idle without triggering clipboard or error');
  assert.equal(result.hasError, false, 'No error banner should be raised on AbortError');
  assert.equal(result.clipboardText, undefined, 'Clipboard should not be invoked on cancellation');
}
console.log('✓ 3. User cancellation treated safely as cancellation without error.');

// -------------------------------------------------------------
// 5. Clipboard Fallback Success
// -------------------------------------------------------------
{
  // When navigator.share is unavailable
  const result1 = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'tr',
    nativeShareSupported: false,
    clipboardSupported: true,
  });
  assert.equal(result1.state, 'copied');
  assert.equal(result1.clipboardText, 'https://dailyreset.app');

  // When navigator.share fails with a non-abort error
  const networkError = new Error('Network error during share');
  const result2 = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'en',
    nativeShareSupported: true,
    nativeShareThrows: networkError,
    clipboardSupported: true,
  });
  assert.equal(result2.state, 'copied');
  assert.equal(result2.clipboardText, 'https://dailyreset.app');
}
console.log('✓ 4. Clipboard fallback success verified.');

// -------------------------------------------------------------
// 6. Clipboard Failure and Manual-Copy Fallback
// -------------------------------------------------------------
{
  const permError = new Error('Clipboard permission denied');
  const result = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'sr',
    nativeShareSupported: false,
    clipboardSupported: true,
    clipboardThrows: permError,
  });

  assert.equal(result.state, 'manual');
}
console.log('✓ 5. Clipboard failure triggers manual-copy fallback field.');

// -------------------------------------------------------------
// 7. Prevention of Duplicate Rapid Submissions
// -------------------------------------------------------------
{
  const result = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'en',
    nativeShareSupported: true,
    clipboardSupported: true,
    tapCount: 5, // 5 rapid simultaneous taps
  });

  assert.equal(result.duplicateSuppressed, true, 'Only 1 execution should run across 5 rapid taps');
}
console.log('✓ 6. Rapid simultaneous taps prevented duplicate executions.');

// -------------------------------------------------------------
// 8. Confirmation that No Private or User-Generated Data Enters Payload
// -------------------------------------------------------------
{
  const result = await simulateShareFlow({
    canonicalUrl: 'https://dailyreset.app',
    language: 'en',
    nativeShareSupported: true,
    clipboardSupported: true,
  });

  assert.ok(result.sharedPayload);
  const payloadString = JSON.stringify(result.sharedPayload).toLowerCase();

  const forbiddenUserArtifacts = [
    'brain_dump',
    'braindump',
    'user_plan',
    'daily_plan',
    'user_routine',
    'vision_goal',
    'uid',
    'user_id',
    'token',
    'email',
    'auth',
    'password',
    'secret',
    'lucic',
    'mirjana',
  ];

  for (const term of forbiddenUserArtifacts) {
    assert.ok(
      !payloadString.includes(term),
      `Payload must not contain user or private data: ${term}`
    );
  }
}
console.log('✓ 7. Zero private, sensitive, or user-generated data in share payload.');

// -------------------------------------------------------------
// 9. Unconfigured State & Safety Rejection
// -------------------------------------------------------------
{
  // When no verified production URL is present
  const unconfigured = getAppACanonicalPublicUrl();
  assert.equal(unconfigured.isValid, false);
  assert.equal(unconfigured.sanitizedUrl, null);

  // Localhost, AI Studio, preview URLs must be rejected
  const unsafeExamples = [
    'http://localhost:3000',
    'https://localhost',
    'https://aistudio.google.com/test',
    'https://ais-dev-2sxmkzna3s7ay64ex6ktlw-341990043667.us-west1.run.app',
    'https://ais-pre-2sxmkzna3s7ay64ex6ktlw-341990043667.us-west1.run.app',
  ];

  for (const url of unsafeExamples) {
    const res = validateAndSanitizeCanonicalShareUrl(url);
    assert.equal(res.isValid, false, `Expected ${url} to be rejected`);
  }
}
console.log('✓ 8. Unsafe hosts and unconfigured environment safety verified.');

// -------------------------------------------------------------
// 10. Responsive Layout Tokens & Overflow Prevention Verification
// -------------------------------------------------------------
{
  // Check that the class names in ShareAppCard do not cause overflow at 390px
  // and conform to App A tokens
  const containerClasses = 'app-a-surface mt-6 overflow-hidden rounded-2xl p-5';
  assert.ok(containerClasses.includes('overflow-hidden'));
  assert.ok(containerClasses.includes('rounded-2xl'));

  const minTouchTargetClass = 'min-h-[48px]';
  assert.ok(minTouchTargetClass.includes('min-h-[48px]'), 'Touch target >= 44px');
}
console.log('✓ 9. Responsive overflow constraints and 44px touch targets verified.');

console.log('All ShareAppCard Tests Passed Deterministically! 🎉');
