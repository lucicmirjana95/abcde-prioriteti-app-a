import type { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

function adminApp() { return getApps().find((app) => app.name === 'app-a-server') || initializeApp({ projectId: firebaseConfig.projectId }, 'app-a-server'); }

export interface ApiAccessDependencies {
  verify: (token: string) => Promise<{ uid: string }>;
  consume: (uid: string) => Promise<boolean>;
}

export function createApiAccess(deps: ApiAccessDependencies) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST') return next();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ') || header.length > 8192) return res.status(401).json({ success: false, phase: 'error', code: 'authentication_required', error: 'Sign in to create a plan.', retryable: false });
    let uid: string;
    try { uid = (await deps.verify(header.slice(7))).uid; }
    catch { return res.status(401).json({ success: false, phase: 'error', code: 'authentication_required', error: 'Sign in again to continue.', retryable: false }); }
    try {
      if (!await deps.consume(uid)) return res.status(429).set('Retry-After', '600').json({ success: false, phase: 'error', code: 'rate_limited', error: 'Planning limit reached. Please try again later.', retryable: true });
    } catch {
      return res.status(503).json({ success: false, phase: 'error', code: 'ai_unavailable', error: 'Planning is temporarily unavailable.', retryable: true });
    }
    res.locals.appAUserId = uid;
    return next();
  };
}

export const appAApiAccess = createApiAccess({
  verify: (token) => getAuth(adminApp()).verifyIdToken(token),
  consume: async (uid) => {
    const db = getFirestore(adminApp());
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    // Server-only collection: never place usage controls in a user-writable path.
    const globalRef = db.doc(`appAAiUsage/global_${day}`);
    const userRef = db.doc(`appAAiUsage/user_${uid}`);
    return db.runTransaction(async (transaction) => {
      const [global, user] = await Promise.all([transaction.get(globalRef), transaction.get(userRef)]);
      const globalCount = Number(global.data()?.count || 0);
      const old = user.data();
      const count = old?.windowStart > now - 600_000 ? Number(old.count || 0) : 0;
      const configuredLimit = Number(process.env.APP_A_AI_DAILY_LIMIT || 500);
      const globalLimit = Number.isSafeInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 500;
      if (globalCount >= globalLimit || count >= 15) return false;
      transaction.set(globalRef, { count: globalCount + 1, expiresAt: new Date(now + 172_800_000) });
      transaction.set(userRef, { count: count + 1, windowStart: count ? old!.windowStart : now });
      return true;
    });
  },
});
