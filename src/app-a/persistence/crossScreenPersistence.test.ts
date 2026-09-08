import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createDailyPlanDocument } from './dailyPlanDocument';
import { addInboxItemToPlan } from '../screens/inboxCandidatePlan';
import { addVisionCandidateToPlan } from '../screens/visionCandidatePlan';
import type { DailyPlanDraft } from '../domain/daily-reset/contracts';
import type { AppAInboxItem } from '../domain/inbox/contracts';
import type { TodayCandidate } from '../../shared/domain/today-candidates';

// Execute the actual repositories against a transactional Firestore boundary.
// This is not an emulator/security-rules test and makes no network requests.
const mock = `
const store = new Map(); let fail = false;
export const seed = (path, value) => store.set(path, structuredClone(value));
export const read = path => structuredClone(store.get(path));
export const reset = () => { store.clear(); fail = false; };
export const failNext = () => { fail = true; };
export const doc = (_, ...parts) => parts.join('/');
export const collection = doc;
const snapshot = path => ({ exists: () => store.has(path), data: () => read(path) });
export const getDoc = async path => snapshot(path);
export const getDocs = async path => ({ docs: [...store.keys()].filter(key => key.startsWith(path + '/') && !key.slice(path.length+1).includes('/')).map(snapshot) });
export const serverTimestamp = () => 'SERVER_TIMESTAMP';
export const arrayUnion = (...values) => ({ op: 'union', values });
export const arrayRemove = (...values) => ({ op: 'remove', values });
function apply(target, path, value) {
  const keys = path.split('.'); const key = keys.pop();
  for (const segment of keys) target = target[segment] ||= {};
  target[key] = value?.op === 'union' ? [...new Set([...(target[key] || []), ...value.values])]
    : value?.op === 'remove' ? (target[key] || []).filter(item => !value.values.includes(item)) : structuredClone(value);
}
function commit(operations) {
  if (fail) { fail = false; throw new Error('unavailable'); }
  const copy = new Map([...store.entries()].map(([k,v]) => [k, structuredClone(v)]));
  for (const [mode, path, value, options] of operations) {
    if (mode === 'delete') { copy.delete(path); continue; }
    if (mode === 'update' && !copy.has(path)) throw new Error('not-found');
    const next = mode === 'update' || options?.merge ? copy.get(path) || {} : {};
    for (const [key, val] of Object.entries(value)) apply(next, key, val);
    copy.set(path, next);
  }
  store.clear(); for (const [key,value] of copy) store.set(key,value);
}
export const setDoc = async (path,value,options) => commit([['set',path,value,options]]);
export const updateDoc = async (path,value) => commit([['update',path,value]]);
export const deleteDoc = async path => commit([['delete',path]]);
export const writeBatch = () => { const ops = []; return { set: (...args) => ops.push(['set',...args]), update: (...args) => ops.push(['update',...args]), commit: async () => commit(ops) }; };
export const runTransaction = async (_, operation) => {
  const ops = []; const result = await operation({
    get: async path => { if (ops.length) throw new Error('read_after_write'); return snapshot(path); },
    set: (...args) => ops.push(['set',...args]), update: (...args) => ops.push(['update',...args]), delete: path => ops.push(['delete',path]),
  }); commit(ops); return result;
};
export const query = value => value;
export const where = () => null; export const orderBy = () => null; export const limit = () => null;
`;
const bundled = await build({
  stdin: { contents: `export * from './src/app-a/persistence/dailyPlanRepository'; export * from './src/app-a/persistence/inboxRepository'; export * from './src/shared/persistence/today-candidates/todayCandidateRepository'; export * from './src/shared/persistence/vision/visionStrategyRepository'; export * from 'test:firestore';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'isolated-firestore', setup(plugin) {
    plugin.onResolve({ filter: /^(firebase\/firestore|test:firestore)$/ }, () => ({ path: 'firestore', namespace: 'test' }));
    plugin.onResolve({ filter: /lib\/firebase$/ }, () => ({ path: 'firebase', namespace: 'test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'firestore' ? mock : `export const db = {}; export const auth = { currentUser: { uid: 'user-1' }, authStateReady: async () => {} };` }));
  } }],
});
const repo = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const plan: DailyPlanDraft = {
  classifiedItems: [{ id: 's1', originalText: 'Write introduction', kind: 'task', timeHorizon: 'today', timeSensitivity: 'none', isAmbiguous: false, needsCheck: false, priority: { explanation: 'Committed goal' } }],
  firstFocus: [{ id: 'p1', sourceItemIds: ['s1'], title: 'Write introduction', block: 'first_focus', estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: 'none', needsCheck: false, priority: { explanation: 'Committed goal' } }],
  laterToday: [], ifCapacityRemains: [], deferredItems: [], longTermIdeas: [], nonActionItems: [], planRationale: 'Focus on the agreed goal.', availableMinutes: 90, plannedRequiredMinutes: 20, plannedOptionalMinutes: 0,
};
const document = createDailyPlanDocument({ brainDump: 'Write introduction', stateNote: '' }, plan, 'en', '2026-09-07', 'Europe/Belgrade');
const path = 'appAUsers/user-1/dailyResets/2026-09-07';
const inbox: AppAInboxItem = { id: 'manual-1', title: 'Send the invoice', estimatedMinutes: 10, kind: 'task', horizon: 'later', status: 'inbox', source: 'manual', language: 'en', createdAt: '2026-09-07T10:00:00Z', updatedAt: '2026-09-07T10:00:00Z' };
const inboxPath = 'appAUsers/user-1/inboxItems/manual-1';
const quickInbox: AppAInboxItem = { ...inbox, id: 'quick-1', title: 'Call the school' };
const quickInboxPath = 'appAUsers/user-1/inboxItems/quick-1';
const candidate: TodayCandidate = { id: 'candidate_test1', source: 'vision', sourceId: 'vision-1', title: 'Review the final chapter', estimatedMinutes: 15, status: 'pending', createdAt: '2026-09-07T10:00:00Z', updatedAt: '2026-09-07T10:00:00Z' };
const candidatePath = 'users/user-1/todayCandidates/candidate_test1';
let scenarios = 0;
function start() { repo.reset(); repo.seed(path, document); repo.seed(inboxPath, inbox); repo.seed(candidatePath, candidate); }

start();
repo.seed(path, { ...document, execution: { completedItemIds: ['p1'] } });
const saved = await repo.saveConfirmedDailyPlan('user-1', document);
assert.deepEqual(saved.execution.completedItemIds, ['p1']);
assert.equal(saved.revision, 1);
await assert.rejects(repo.saveConfirmedDailyPlan('user-1', document));
assert.equal(repo.read(path).revision, 1); scenarios++;

start();
const afterUndo = await repo.saveConfirmedDailyPlan('user-1', { ...document, execution: { completedItemIds: ['p1'] } });
assert.deepEqual(afterUndo.execution.completedItemIds, []);
scenarios++;

start();
const inboxAddition = addInboxItemToPlan(plan, inbox);
assert.ok('draft' in inboxAddition);
repo.seed(path, { ...document, execution: { completedItemIds: ['p1'] }, revision: 4 });
const scheduled = await repo.savePlanAndScheduleInboxItemAtomic('user-1', { ...document, plan: inboxAddition.draft }, inbox);
assert.deepEqual(scheduled.document.execution.completedItemIds, ['p1']);
assert.equal(scheduled.document.revision, 5);
assert.equal(repo.read(inboxPath).status, 'scheduled');
await repo.savePlanAndScheduleInboxItemAtomic('user-1', { ...document, plan: inboxAddition.draft }, inbox);
assert.equal(repo.read(path).plan.laterToday.length, 1); scenarios++;

start(); repo.failNext();
await assert.rejects(repo.savePlanAndScheduleInboxItemAtomic('user-1', { ...document, plan: inboxAddition.draft }, inbox));
assert.equal(repo.read(path).plan.laterToday.length, 0);
assert.equal(repo.read(inboxPath).status, 'inbox'); scenarios++;

start();
const quickAddition = addInboxItemToPlan(plan, quickInbox);
assert.ok('draft' in quickAddition);
const quickSaved = await repo.createInboxItemAndAddToPlanAtomic('user-1', { ...document, plan: quickAddition.draft }, quickInbox);
assert.equal(quickSaved.document.plan.laterToday[0].title, quickInbox.title);
assert.equal(repo.read(quickInboxPath).status, 'scheduled');
assert.equal(repo.read(quickInboxPath).scheduledLocalDate, document.localDate); scenarios++;

start(); repo.failNext();
await assert.rejects(repo.createInboxItemAndAddToPlanAtomic('user-1', { ...document, plan: quickAddition.draft }, quickInbox));
assert.equal(repo.read(quickInboxPath), undefined);
assert.equal(repo.read(path).plan.laterToday.length, 0); scenarios++;

start();
repo.seed(path, { ...document, plan: { ...plan, availableMinutes: 20 } });
await assert.rejects(repo.savePlanAndScheduleInboxItemAtomic('user-1', { ...document, plan: inboxAddition.draft }, inbox), /capacity_exceeded/);
assert.equal(repo.read(inboxPath).status, 'inbox'); scenarios++;

start();
await repo.savePlanAndScheduleInboxItemAtomic('user-1', { ...document, plan: inboxAddition.draft }, inbox);
const completed = await repo.updateInboxItemStatus('user-1', repo.read(inboxPath), 'completed');
assert.ok(repo.read(path).execution.completedItemIds.includes('inbox_plan_manual-1'));
await repo.updateInboxItemStatus('user-1', completed, 'inbox');
assert.ok(!repo.read(path).execution.completedItemIds.includes('inbox_plan_manual-1'));
assert.equal(repo.read(inboxPath).status, 'scheduled'); scenarios++;

await repo.deleteInboxItem('user-1', inbox.id);
assert.equal(repo.read(inboxPath).title, undefined);
await repo.saveDailyPlanCompletionAndInboxStatusAtomic('user-1', document.localDate, [], inbox.id, true);
assert.ok(repo.read(path).execution.completedItemIds.includes('inbox_plan_manual-1'));
assert.equal(repo.read(inboxPath).deleted, true); scenarios++;

start();
const visionAddition = addVisionCandidateToPlan(plan, candidate);
assert.ok('draft' in visionAddition);
repo.failNext();
await assert.rejects(repo.savePlanAndScheduleVisionAtomic('user-1', { ...document, plan: visionAddition.draft }, candidate));
assert.equal(repo.read(candidatePath).status, 'pending');
assert.equal(repo.read(path).plan.laterToday.length, 0); scenarios++;

await repo.savePlanAndScheduleVisionAtomic('user-1', { ...document, plan: visionAddition.draft }, candidate);
// No strategy document exists: execution must remain possible after source deletion.
await repo.saveCompletionAndAdvanceVision('user-1', document.localDate, [], candidate.id, true);
assert.equal(repo.read(candidatePath).status, 'completed');
assert.ok(repo.read(path).execution.completedItemIds.includes('vision_plan_candidate_test1'));
await repo.saveCompletionAndAdvanceVision('user-1', document.localDate, [], candidate.id, false);
assert.equal(repo.read(candidatePath).status, 'scheduled');
assert.ok(!repo.read(path).execution.completedItemIds.includes('vision_plan_candidate_test1')); scenarios++;

await repo.saveDailyPlanCompletion('user-1', document.localDate, [], { itemId: 'p1', completed: true });
await repo.saveDailyPlanCompletion('user-1', document.localDate, [], { itemId: 'vision_plan_candidate_test1', completed: true });
assert.deepEqual(new Set(repo.read(path).execution.completedItemIds), new Set(['p1', 'vision_plan_candidate_test1'])); scenarios++;
const vision = { id: 'vision_example_1', idea: 'Build a useful product', language: 'en', strategy: { outcome: 'A useful product', importance: 'It solves the stated problem', milestones: [{ title: 'Validate', result: 'Evidence exists', steps: ['Interview one user'] }], risks: [], assumptions: [], nextStep: 'Interview one user' }, stepBreakdowns: {}, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z' };
start();
await repo.saveVisionStrategy('user-1', vision);
repo.failNext();
await assert.rejects(repo.deleteVisionStrategy('user-1', vision.id));
assert.equal((await repo.loadVisionStrategies('user-1')).length, 1); scenarios++;
await repo.deleteVisionStrategy('user-1', vision.id);
const library = await repo.loadVisionLibrary('user-1');
assert.equal(library.strategies.length, 0);
assert.deepEqual(library.deletedFingerprints, [await repo.visionIdeaFingerprint('  BUILD a useful   product ')]);
const marker = repo.read('users/user-1/visionStrategies/' + vision.id);
assert.deepEqual(Object.keys(marker).sort(), ['deleted', 'id', 'ideaFingerprint']);
await assert.rejects(repo.saveVisionStrategy('user-1', vision));
await repo.deleteVisionStrategy('user-1', vision.id);
await repo.saveVisionStrategy('user-1', { ...vision, id: 'vision_example_2' });
assert.equal((await repo.loadVisionStrategies('user-1')).length, 1); scenarios++;

start();
repo.seed(candidatePath, { ...candidate, status: 'scheduled' });
await assert.rejects(repo.dismissTodayCandidate('user-1', candidate));
assert.equal(repo.read(candidatePath).status, 'scheduled');
repo.seed(candidatePath, candidate);
await repo.dismissTodayCandidate('user-1', { ...candidate, title: 'Stale title' });
assert.equal(repo.read(candidatePath).title, candidate.title);
assert.equal(repo.read(candidatePath).status, 'dismissed'); scenarios++;
console.log(`Actual repository functions: ${scenarios} transactional scenarios passed (mock boundary; no remote writes).`);
