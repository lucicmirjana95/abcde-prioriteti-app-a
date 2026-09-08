import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { createApiAccess } from './access';

async function check(method: string, authorization?: string, mode = 'ok') {
  let status = 200, passed = false, verified = 0, consumed = 0;
  const res = { locals: {} as Record<string, unknown>, status(n: number) { status = n; return this; }, set() { return this; }, json() { return this; } };
  const middleware = createApiAccess({
    verify: async () => { verified++; if (mode === 'invalid') throw Error('invalid'); return { uid: 'test-user' }; },
    consume: async () => { consumed++; if (mode === 'offline') throw Error('offline'); return mode !== 'limit'; },
  });
  await middleware({ method, headers: { authorization } } as Request, res as unknown as Response, (() => { passed = true; }) as NextFunction);
  return { status, passed, verified, consumed, uid: res.locals.appAUserId };
}
async function main() {
  assert.equal((await check('GET')).passed, true);
  const missing = await check('POST'); assert.equal(missing.status, 401); assert.equal(missing.verified, 0);
  const invalid = await check('POST', 'Bearer invalid', 'invalid'); assert.equal(invalid.status, 401); assert.equal(invalid.consumed, 0);
  assert.equal((await check('POST', 'Bearer valid', 'limit')).status, 429);
  assert.equal((await check('POST', 'Bearer valid', 'offline')).status, 503);
  const valid = await check('POST', 'Bearer valid'); assert.equal(valid.passed, true); assert.equal(valid.uid, 'test-user');
  assert.equal((await check('POST', 'Bearer ' + 'x'.repeat(8192))).verified, 0);
  console.log('API access: 7 injected authentication/quota scenarios passed; no remote calls.');
}
void main();
