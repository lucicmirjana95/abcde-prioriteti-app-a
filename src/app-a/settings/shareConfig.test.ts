import assert from 'node:assert/strict';
import {
  validateAndSanitizeCanonicalShareUrl,
  getAppACanonicalPublicUrl,
} from './shareConfig';

console.log('Running Canonical Share URL & Security Policy Tests...');

// -------------------------------------------------------------
// 1. Unconfigured & Empty URL Handling
// -------------------------------------------------------------
{
  const emptyRes = validateAndSanitizeCanonicalShareUrl('');
  assert.equal(emptyRes.isValid, false);
  assert.equal(emptyRes.sanitizedUrl, null);
  assert.equal(emptyRes.rejectionReason, 'not_configured');

  const undefinedRes = validateAndSanitizeCanonicalShareUrl(undefined);
  assert.equal(undefinedRes.isValid, false);
  assert.equal(undefinedRes.rejectionReason, 'not_configured');

  const whitespaceRes = validateAndSanitizeCanonicalShareUrl('   ');
  assert.equal(whitespaceRes.isValid, false);
  assert.equal(whitespaceRes.rejectionReason, 'not_configured');
}
console.log('✓ 1. Unconfigured / empty URL safe rejection verified.');

// -------------------------------------------------------------
// 2. Strict Protocol Requirement (HTTPS strictly required)
// -------------------------------------------------------------
{
  const httpRes = validateAndSanitizeCanonicalShareUrl('http://dailyreset.app');
  assert.equal(httpRes.isValid, false);
  assert.equal(httpRes.rejectionReason, 'insecure_protocol');

  const fileRes = validateAndSanitizeCanonicalShareUrl('file:///tmp/app');
  assert.equal(fileRes.isValid, false);
  assert.equal(fileRes.rejectionReason, 'insecure_protocol');

  const jsRes = validateAndSanitizeCanonicalShareUrl('javascript:alert(1)');
  assert.equal(jsRes.isValid, false);
  assert.equal(jsRes.rejectionReason, 'insecure_protocol');
}
console.log('✓ 2. Insecure protocol rejection verified.');

// -------------------------------------------------------------
// 3. Rejection of Loopback, Localhost & Dev Ports
// -------------------------------------------------------------
{
  const testHosts = [
    'https://localhost',
    'https://localhost:3000',
    'https://sub.localhost',
    'https://127.0.0.1',
    'https://127.0.0.1:8080',
    'https://0.0.0.0',
    'https://[::1]',
    'https://dailyreset.app:3000', // Non-443 port
    'https://dailyreset.app:5173',
  ];

  for (const host of testHosts) {
    const res = validateAndSanitizeCanonicalShareUrl(host);
    assert.equal(res.isValid, false, `Expected ${host} to be rejected`);
    assert.equal(res.rejectionReason, 'loopback_or_localhost');
  }
}
console.log('✓ 3. Loopback, localhost, and non-standard dev ports rejected.');

// -------------------------------------------------------------
// 4. Rejection of AI Studio and Cloud Run Preview Environments
// -------------------------------------------------------------
{
  const previewHosts = [
    'https://aistudio.google.com/app',
    'https://dev.aistudio.google.com',
    'https://ais-dev-2sxmkzna3s7ay64ex6ktlw-341990043667.us-west1.run.app',
    'https://ais-pre-2sxmkzna3s7ay64ex6ktlw-341990043667.us-west1.run.app',
    'https://my-app-preview-ais-dev.example.org',
    'https://app.googleusercontent.com',
    'https://container-uuid.cloudshell.dev',
    'https://service-341990043667.us-central1.run.app',
  ];

  for (const previewUrl of previewHosts) {
    const res = validateAndSanitizeCanonicalShareUrl(previewUrl);
    assert.equal(res.isValid, false, `Expected preview host ${previewUrl} to be rejected`);
    assert.equal(res.rejectionReason, 'preview_or_dev_environment');
  }
}
console.log('✓ 4. AI Studio and Cloud Run preview domains rejected.');

// -------------------------------------------------------------
// 5. Rejection of Authentication & Credentials in URL
// -------------------------------------------------------------
{
  const credsUrl = 'https://admin:secretPass@dailyreset.app';
  const res = validateAndSanitizeCanonicalShareUrl(credsUrl);
  assert.equal(res.isValid, false);
  assert.equal(res.rejectionReason, 'contains_credentials');
}
console.log('✓ 5. Authentication credentials rejected.');

// -------------------------------------------------------------
// 6. Rejection of Sensitive Parameters & User State
// -------------------------------------------------------------
{
  const sensitiveUrls = [
    'https://dailyreset.app?token=xyz123',
    'https://dailyreset.app?api_key=AIzaSy123456',
    'https://dailyreset.app?apiKey=secret',
    'https://dailyreset.app?auth=bearer_token',
    'https://dailyreset.app?session=session_abc',
    'https://dailyreset.app?session_id=123',
    'https://dailyreset.app?uid=user_firebase_99',
    'https://dailyreset.app?user_id=usr_456',
    'https://dailyreset.app?user=test@example.com',
    'https://dailyreset.app?state=app_a_brain_dump_content',
    'https://dailyreset.app?brain_dump=my_personal_thoughts',
    'https://dailyreset.app?plan=my_tasks_today',
  ];

  for (const sensitive of sensitiveUrls) {
    const res = validateAndSanitizeCanonicalShareUrl(sensitive);
    assert.equal(res.isValid, false, `Expected sensitive URL to be rejected: ${sensitive}`);
    assert.equal(res.rejectionReason, 'contains_sensitive_parameters');
  }
}
console.log('✓ 6. Sensitive tokens, session identifiers, and user state strictly rejected.');

// -------------------------------------------------------------
// 7. Sanitization: Removal of Query Strings & URL Fragments
// -------------------------------------------------------------
{
  // A clean URL with tracking/harmless query params and hash must have them stripped
  const dirtyUrl = 'https://dailyreset.app/app-a?source=web&ref=footer#section-intro';
  const res = validateAndSanitizeCanonicalShareUrl(dirtyUrl);
  assert.equal(res.isValid, true);
  assert.equal(res.sanitizedUrl, 'https://dailyreset.app/app-a');
  assert.ok(!res.sanitizedUrl?.includes('?'));
  assert.ok(!res.sanitizedUrl?.includes('#'));

  // Trailing slashes normalization
  const trailingSlash = 'https://dailyreset.app///';
  const trailingRes = validateAndSanitizeCanonicalShareUrl(trailingSlash);
  assert.equal(trailingRes.isValid, true);
  assert.equal(trailingRes.sanitizedUrl, 'https://dailyreset.app');
}
console.log('✓ 7. Query strings, fragments, and trailing slashes sanitized.');

// -------------------------------------------------------------
// 8. Verified Valid Production URLs
// -------------------------------------------------------------
{
  const validProductionUrls = [
    'https://dailyreset.app',
    'https://dailyreset.app/today',
    'https://kaizenflow.com',
    'https://app.mindfulfocus.io/reset',
  ];

  for (const validUrl of validProductionUrls) {
    const res = validateAndSanitizeCanonicalShareUrl(validUrl);
    assert.equal(res.isValid, true);
    assert.ok(res.sanitizedUrl?.startsWith('https://'));
  }
}
console.log('✓ 8. Valid production URLs accepted.');

// -------------------------------------------------------------
// 9. getAppACanonicalPublicUrl Fallback Behavior
// -------------------------------------------------------------
{
  // When no override is given and default env is empty, must return not_configured
  const defaultRes = getAppACanonicalPublicUrl();
  assert.equal(defaultRes.isValid, false);
  assert.equal(defaultRes.sanitizedUrl, null);
  assert.equal(defaultRes.rejectionReason, 'not_configured');

  // When safe override is passed, evaluates correctly
  const overrideRes = getAppACanonicalPublicUrl('https://dailyreset.app');
  assert.equal(overrideRes.isValid, true);
  assert.equal(overrideRes.sanitizedUrl, 'https://dailyreset.app');
}
console.log('✓ 9. Default canonical URL fallback safely handles unconfigured state.');

console.log('All Canonical Share URL Security Tests Passed! 🎉');
