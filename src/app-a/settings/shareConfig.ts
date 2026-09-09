/**
 * Centralized Canonical URL Configuration & Safety Verification for App A Share Feature.
 *
 * Security & Privacy Rules:
 * 1. Must use HTTPS protocol strictly.
 * 2. Exclude query strings, URL fragments, credentials, user IDs, and user content.
 * 3. Reject loopbacks (localhost, 127.0.0.1, 0.0.0.0, [::1]).
 * 4. Reject AI Studio preview environments (aistudio.google.com, ais-dev*, ais-pre*, *.run.app preview domains, cloudshell.dev, googleusercontent.com).
 * 5. Reject URLs with sensitive parameters (token, auth, apiKey, session, uid, state).
 * 6. If no verified production URL is configured, never invent one. Return unconfigured status.
 */

export type UrlRejectionReason =
  | 'not_configured'
  | 'invalid_format'
  | 'insecure_protocol'
  | 'contains_credentials'
  | 'loopback_or_localhost'
  | 'preview_or_dev_environment'
  | 'contains_sensitive_parameters';

export interface CanonicalUrlValidationResult {
  isValid: boolean;
  sanitizedUrl: string | null;
  rejectionReason?: UrlRejectionReason;
}

/**
 * Patterns that indicate unsafe dev/preview hosts or domains.
 */
const UNSAFE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127(?:\.\d+){3}$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /aistudio\.google\.com/i,
  /ais-dev/i,
  /ais-pre/i,
  /\.googleusercontent\.com/i,
  /\.cloudshell\.dev/i,
  /\.run\.app$/i, // All internal/default Cloud Run preview URLs
];

/**
 * Patterns indicating sensitive authentication or state parameters.
 */
const SENSITIVE_PARAM_PATTERNS: RegExp[] = [
  /[?&#/](token|access_token|id_token|api[-_]?key|auth|session|session[-_]?id|uid|user[-_]?id|state|code|secret|credential)=/i,
  /[?&#/]user=/i,
  /[?&#/]brain[-_]?dump=/i,
  /[?&#/]plan=/i,
];

/**
 * Validates and sanitizes a candidate URL to produce a pristine canonical share URL.
 */
export function validateAndSanitizeCanonicalShareUrl(
  candidate: string | undefined | null
): CanonicalUrlValidationResult {
  if (!candidate || typeof candidate !== 'string' || candidate.trim() === '') {
    return {
      isValid: false,
      sanitizedUrl: null,
      rejectionReason: 'not_configured',
    };
  }

  const raw = candidate.trim();

  // Check for sensitive parameters before any stripping
  for (const pattern of SENSITIVE_PARAM_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        isValid: false,
        sanitizedUrl: null,
        rejectionReason: 'contains_sensitive_parameters',
      };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      isValid: false,
      sanitizedUrl: null,
      rejectionReason: 'invalid_format',
    };
  }

  // 1. Must use HTTPS
  if (parsed.protocol.toLowerCase() !== 'https:') {
    return {
      isValid: false,
      sanitizedUrl: null,
      rejectionReason: 'insecure_protocol',
    };
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      sanitizedUrl: null,
      rejectionReason: 'contains_credentials',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Reject loopbacks, dev hosts, and preview environments
  for (const unsafePattern of UNSAFE_HOST_PATTERNS) {
    if (unsafePattern.test(hostname)) {
      const isLoopback =
        /^localhost$/i.test(hostname) ||
        /\.localhost$/i.test(hostname) ||
        /^127(?:\.\d+){3}$/.test(hostname) ||
        /^0\.0\.0\.0$/.test(hostname) ||
        /^::1$/.test(hostname) ||
        /^\[::1\]$/.test(hostname);

      return {
        isValid: false,
        sanitizedUrl: null,
        rejectionReason: isLoopback ? 'loopback_or_localhost' : 'preview_or_dev_environment',
      };
    }
  }

  // 4. Reject non-standard ports (e.g. :3000, :5173, :8080)
  if (parsed.port && parsed.port !== '443') {
    return {
      isValid: false,
      sanitizedUrl: null,
      rejectionReason: 'loopback_or_localhost',
    };
  }

  // 5. Construct canonical URL: exclude query strings, URL fragments, and trailing slashes
  const cleanPathname = parsed.pathname.replace(/\/+$/, '');
  const canonicalUrl = `https://${parsed.host}${cleanPathname}`;

  return {
    isValid: true,
    sanitizedUrl: canonicalUrl,
  };
}

/**
 * Centralized, typed App A canonical public production URL configuration.
 *
 * Sourced strictly from the VITE_APP_A_PUBLIC_URL environment variable.
 * If empty or pointing to an unverified/preview environment, canonical URL evaluates to null.
 */
const metaEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

export const CONFIGURED_APP_A_PUBLIC_URL: string =
  typeof metaEnv?.VITE_APP_A_PUBLIC_URL === 'string'
    ? metaEnv.VITE_APP_A_PUBLIC_URL.trim()
    : '';

/**
 * Returns the verified canonical public URL for App A.
 * If an optional override is provided (e.g., during tests or container setup), it is validated.
 */
export function getAppACanonicalPublicUrl(customUrl?: string): CanonicalUrlValidationResult {
  const target = customUrl !== undefined ? customUrl : CONFIGURED_APP_A_PUBLIC_URL;
  return validateAndSanitizeCanonicalShareUrl(target);
}
