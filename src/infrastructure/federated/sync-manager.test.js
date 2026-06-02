'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
})();
eval(fs.readFileSync(path.join(__dirname, 'sync-manager.js'), 'utf8'));
var FederatedSyncManager = window.FederatedSyncManager;
var LocalStore = window.LocalStore;
var InMemoryCloudStore = window.InMemoryCloudStore;
var SYNC_STATUS = window.SYNC_STATUS;
var CONFLICT_STRATEGIES = window.CONFLICT_STRATEGIES;
var QUEUE_OP_TYPES = window.QUEUE_OP_TYPES;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertApprox(a, b, msg) { assert(Math.abs(a - b) <= 0.01, msg + ' (expected ~' + b + ', got ' + a + ')'); }
function assertDeep(a, b, msg) { assert(JSON.stringify(a) === JSON.stringify(b), msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')'); }

// =========== LocalStore ===========
{
  var ls = new LocalStore();
  assertEq(ls.size(), 0, 'LS: empty size');
  var r = ls.set('k1', { a: 1 });
  assertEq(r.success, true, 'LS: set success');
  assertEq(r.version, 1, 'LS: set v1');
  var r2 = ls.set('k1', { a: 2 });
  assertEq(r2.version, 2, 'LS: set v2');
  var g = ls.get('k1');
  assertEq(g.value.a, 2, 'LS: get value');
  assertEq(g.meta.version, 2, 'LS: get meta version');
  var inv = ls.set('', 'x');
  assertEq(inv.error, 'invalid_key', 'LS: invalid_key');
  var nr = ls.get('missing');
  assert(nr === null, 'LS: not found');
  assertEq(ls.has('k1'), true, 'LS: has true');
  assertEq(ls.has('zzz'), false, 'LS: has false');
  var d = ls.delete('k1');
  assertEq(d.success, true, 'LS: delete success');
  var d2 = ls.delete('zzz');
  assertEq(d2.error, 'not_found', 'LS: delete not_found');
  var lst = ls.list();
  assertEq(lst.length, 0, 'LS: list empty');
  ls.set('a', 1); ls.set('b', 2);
  var lst2 = ls.list();
  assertEq(lst2.length, 2, 'LS: list 2');
  var ex = ls.exportAll();
  assertEq(typeof ex.data, 'object', 'LS: export data');
  var im = ls.importAll({ data: { x: 99 }, meta: { x: { version: 1, timestamp: 1, dirty: false } } });
  assertEq(im.success, true, 'LS: import success');
  assertEq(im.count, 1, 'LS: import count');
  var im2 = ls.importAll(null);
  assertEq(im2.error, 'invalid_snapshot', 'LS: import invalid');
  var im3 = ls.importAll('not obj');
  assertEq(im3.error, 'invalid_snapshot', 'LS: import not obj');
  ls.set('dirty1', 'v');
  var ms = ls.markSynced('dirty1');
  assertEq(ms.success, true, 'LS: markSynced success');
  var ms2 = ls.markSynced('nonexistent');
  assertEq(ms2.error, 'not_found', 'LS: markSynced not_found');
  ls.set('dirty2', 'v');
  var gd = ls.getDirty();
  assert(gd.length >= 1, 'LS: getDirty has 1');
  assert(gd.some(function (x) { return x.key === 'dirty2'; }), 'LS: getDirty contains dirty2');
  ls.clear();
  assertEq(ls.size(), 0, 'LS: clear size');
  ls.set('meta1', 'v', { tag: 't' });
  var m = ls.get('meta1');
  assertEq(m.meta.tag, 't', 'LS: meta merge');
}
// LocalStore with persistence
{
  var ls2 = new LocalStore(global.localStorage);
  ls2.set('persisted', { x: 1 });
  var ls3 = new LocalStore(global.localStorage);
  var g = ls3.get('persisted');
  assertEq(g.value.x, 1, 'LS: persistence loads');
  ls3.set('persisted2', { y: 2 });
  var ls4 = new LocalStore(global.localStorage);
  assertEq(ls4.has('persisted2'), true, 'LS: persistence across instances');
  global.localStorage.clear();
}

// =========== InMemoryCloudStore ===========
{
  var cs = new InMemoryCloudStore();
  assertEq(cs.size(), 0, 'CS: empty size');
  var p = cs.push('id1', { a: 1 }, 1, Date.now());
  assertEq(p.success, true, 'CS: push success');
  assertEq(p.version, 1, 'CS: push version');
  var p2 = cs.push('', 'x', 1, 1);
  assertEq(p2.error, 'invalid_id', 'CS: push invalid_id');
  var pp = cs.pull('id1');
  assertEq(pp.success, true, 'CS: pull success');
  assertEq(pp.payload.a, 1, 'CS: pull payload');
  var pp2 = cs.pull('missing');
  assertEq(pp2.error, 'not_found', 'CS: pull not_found');
  assertEq(cs.exists('id1'), true, 'CS: exists true');
  assertEq(cs.exists('missing'), false, 'CS: exists false');
  var lst = cs.list();
  assertEq(lst.length, 1, 'CS: list 1');
  var d = cs.delete('id1');
  assertEq(d.success, true, 'CS: delete success');
  var d2 = cs.delete('missing');
  assertEq(d2.error, 'not_found', 'CS: delete not_found');
  cs.push('x1', {}, 1, 1);
  cs.push('x2', {}, 1, 1);
  assertEq(cs.size(), 2, 'CS: size 2');
  var fm = cs.setFailMode('push');
  assertEq(fm.success, true, 'CS: setFailMode push');
  var pp3 = cs.push('x3', {}, 1, 1);
  assertEq(pp3.error, 'cloud_unavailable', 'CS: push fail mode');
  cs.setFailMode('pull');
  var pp4 = cs.pull('x1');
  assertEq(pp4.error, 'cloud_unavailable', 'CS: pull fail mode');
  cs.setFailMode('all');
  var pp5 = cs.push('x4', {}, 1, 1);
  assertEq(pp5.error, 'cloud_unavailable', 'CS: all fail mode push');
  var pp6 = cs.pull('x1');
  assertEq(pp6.error, 'cloud_unavailable', 'CS: all fail mode pull');
  var fm2 = cs.setFailMode('invalid');
  assertEq(fm2.error, 'invalid_mode', 'CS: setFailMode invalid');
  cs.setFailMode('none');
  cs.clear();
  assertEq(cs.size(), 0, 'CS: clear size');
}

// =========== FederatedSyncManager — constructor & status ===========
{
  var fsm = new FederatedSyncManager();
  assertEq(typeof fsm.deviceId, 'string', 'FSM: deviceId is string');
  assert(fsm.deviceId.indexOf('dev_') === 0, 'FSM: deviceId prefix');
  assertEq(fsm.status, 'offline', 'FSM: initial status offline');
  var s = fsm.getStatus();
  assertEq(s.status, 'offline', 'FSM: getStatus offline');
  assertEq(s.queueLength, 0, 'FSM: queueLength 0');
  assertEq(s.localSize, 0, 'FSM: localSize 0');
  assertEq(s.cloudSize, 0, 'FSM: cloudSize 0');
  assertEq(s.autoSync, false, 'FSM: autoSync false');
  var fsm2 = new FederatedSyncManager({ deviceId: 'mydev' });
  assertEq(fsm2.deviceId, 'mydev', 'FSM: custom deviceId');
  var fsm3 = new FederatedSyncManager({ maxQueueSize: 2 });
  fsm3.enqueue({ key: 'a', value: 1 });
  fsm3.enqueue({ key: 'b', value: 2 });
  var fullRes = fsm3.enqueue({ key: 'c', value: 3 });
  assertEq(fullRes.error, 'queue_full', 'FSM: queue_full');
  assertEq(fsm3.getQueueLength(), 2, 'FSM: queue stays at max');
}

// =========== FSM: queue operations ===========
{
  var fsm = new FederatedSyncManager();
  var r = fsm.enqueue({ key: 'k1', value: 'v1' });
  assertEq(r.success, true, 'FSM: enqueue success');
  assertEq(r.queueLength, 1, 'FSM: enqueue queueLength');
  var q = fsm.getQueue();
  assertEq(q.length, 1, 'FSM: getQueue 1');
  assertEq(q[0].type, 'upsert', 'FSM: default type upsert');
  fsm.enqueue({ key: 'k2', value: 'v2' }, QUEUE_OP_TYPES.UPSERT);
  fsm.enqueue({ key: 'k3', value: 'v3' }, QUEUE_OP_TYPES.META);
  assertEq(fsm.getQueueLength(), 3, 'FSM: queue length 3');
  var cq = fsm.clearQueue();
  assertEq(cq.success, true, 'FSM: clearQueue success');
  assertEq(cq.cleared, 3, 'FSM: clearQueue cleared');
  assertEq(fsm.getQueueLength(), 0, 'FSM: queue 0 after clear');
}

// =========== FSM: processQueue ===========
{
  var fsm = new FederatedSyncManager();
  var p0 = fsm.processQueue();
  assertEq(p0.processed, 0, 'FSM: processQueue empty');
  fsm.enqueue({ key: 'a', value: 1 });
  fsm.enqueue({ key: 'b', value: 2 });
  fsm.enqueue({ note: 'meta only' }, QUEUE_OP_TYPES.META);
  fsm.enqueue({ key: 'b' }, QUEUE_OP_TYPES.DELETE);
  var p1 = fsm.processQueue();
  assertEq(p1.processed, 4, 'FSM: processQueue 4 ops');
  assertEq(fsm.localStore.has('a'), true, 'FSM: a exists');
  assertEq(fsm.localStore.has('b'), false, 'FSM: b deleted by queue op');
  assertEq(fsm.getQueueLength(), 0, 'FSM: queue empty after process');
  fsm.enqueue({ key: '' }, QUEUE_OP_TYPES.UPSERT);
  fsm.enqueue({ key: '' }, QUEUE_OP_TYPES.DELETE);
  var p2 = fsm.processQueue();
  assertEq(p2.processed, 0, 'FSM: processQueue empty keys skipped');
  assertEq(p2.failed, 2, 'FSM: processQueue failed count');
}

// =========== FSM: subscribe / unsubscribe / emit ===========
{
  var fsm = new FederatedSyncManager();
  var events = [];
  var cb = function (e) { events.push(e.event); };
  var sub = fsm.subscribe('enqueued', cb);
  assertEq(sub.success, true, 'FSM: subscribe success');
  assertEq(sub.count, 1, 'FSM: subscribe count');
  fsm.enqueue({ key: 'x', value: 1 });
  assert(events.indexOf('enqueued') !== -1, 'FSM: emit triggered');
  var sub2 = fsm.subscribe('enqueued', cb);
  var usub = fsm.unsubscribe('enqueued', cb);
  assertEq(usub.success, true, 'FSM: unsubscribe success');
  var usub2 = fsm.unsubscribe('enqueued', cb);
  assertEq(usub2.success, true, 'FSM: unsubscribe 2nd');
  var usub3 = fsm.unsubscribe('noevent', cb);
  assertEq(usub3.error, 'no_listeners', 'FSM: unsubscribe no_listeners');
  var usub4 = fsm.unsubscribe('enqueued', function () {});
  assertEq(usub4.error, 'callback_not_found', 'FSM: unsubscribe callback_not_found');
  var subInv1 = fsm.subscribe('', function () {});
  assertEq(subInv1.error, 'invalid_args', 'FSM: subscribe invalid event');
  var subInv2 = fsm.subscribe('e', null);
  assertEq(subInv2.error, 'invalid_args', 'FSM: subscribe invalid cb');
  var noisy = function () { throw new Error('boom'); };
  fsm.subscribe('processed', noisy);
  fsm.enqueue({ key: 'a', value: 1 });
  fsm.processQueue();
  assert(true, 'FSM: listener throw swallowed');
  var emitRes = fsm._emit('no_listeners_event', { x: 1 });
  assertEq(emitRes.count, 0, 'FSM: emit no listeners count 0');
}

// =========== FSM: setConflictStrategy ===========
{
  var fsm = new FederatedSyncManager();
  assertEq(fsm.conflictStrategy, 'newest_wins', 'FSM: default conflict strategy');
  var r = fsm.setConflictStrategy('local_wins');
  assertEq(r.success, true, 'FSM: set strategy local');
  assertEq(r.strategy, 'local_wins', 'FSM: set strategy returns');
  var r2 = fsm.setConflictStrategy('invalid');
  assertEq(r2.error, 'invalid_strategy', 'FSM: invalid strategy');
  fsm.setConflictStrategy('cloud_wins');
  fsm.setConflictStrategy('newest_wins');
  fsm.setConflictStrategy('manual');
  assertEq(fsm.conflictStrategy, 'manual', 'FSM: manual set');
}

// =========== FSM: backup & restore ===========
{
  var fsm = new FederatedSyncManager();
  var b = fsm.backup('deck1', { cards: ['a', 'b'] });
  assertEq(b.success, true, 'FSM: backup success');
  assertEq(b.version, 1, 'FSM: backup v1');
  assertEq(fsm.cloudStore.exists('deck1'), true, 'FSM: cloud has deck1');
  assertEq(fsm.localStore.meta['deck1'].dirty, false, 'FSM: local marked synced');
  var b2 = fsm.backup('deck1', { cards: ['a', 'b', 'c'] });
  assertEq(b2.version, 2, 'FSM: backup v2');
  // cloud fail
  fsm.cloudStore.setFailMode('push');
  var bF = fsm.backup('deck2', 'x');
  assertEq(bF.error, 'cloud_unavailable', 'FSM: backup fail mode');
  assertEq(bF.cloud, 'failed', 'FSM: backup fail cloud label');
  fsm.cloudStore.setFailMode('none');
  // restore fresh
  var fsm2 = new FederatedSyncManager();
  fsm2.cloudStore.push('d1', { cards: ['x', 'y'] }, 1, Date.now());
  var r = fsm2.restore('d1');
  assertEq(r.success, true, 'FSM: restore success');
  assertEq(r.value.cards[0], 'x', 'FSM: restore value');
  // restore missing
  var rM = fsm2.restore('missing');
  assertEq(rM.error, 'not_found', 'FSM: restore not_found');
  // restore cloud fail
  fsm2.cloudStore.setFailMode('pull');
  var rF = fsm2.restore('d1');
  assertEq(rF.error, 'cloud_unavailable', 'FSM: restore fail');
  fsm2.cloudStore.setFailMode('none');
}

// =========== FSM: conflict resolution (all 4 strategies) ===========
{
  // newest_wins: local version ahead, cloud timestamp newer
  var fsm = new FederatedSyncManager({ conflictStrategy: 'newest_wins' });
  fsm.cloudStore.push('c1', 'cloudVal', 1, 100);
  fsm.localStore.data['c1'] = 'localVal';
  fsm.localStore.meta['c1'] = { version: 2, timestamp: 50, dirty: false };
  var r = fsm.restore('c1');
  assertEq(r.conflict, true, 'FSM: conflict detected');
  // newest_wins: local ts 50 < cloud ts 100 -> cloud wins
  assertEq(fsm.localStore.data['c1'], 'cloudVal', 'FSM: newest_wins cloud newer');
}
{
  // newest_wins: local version ahead AND local timestamp newer
  var fsm = new FederatedSyncManager({ conflictStrategy: 'newest_wins' });
  fsm.cloudStore.push('c1', 'cloudVal', 1, 50);
  fsm.localStore.data['c1'] = 'localVal';
  fsm.localStore.meta['c1'] = { version: 2, timestamp: 100, dirty: false };
  var r = fsm.restore('c1');
  assertEq(r.conflict, true, 'FSM: conflict local newer');
  assertEq(fsm.localStore.data['c1'], 'localVal', 'FSM: newest_wins local newer kept');
}
{
  var fsm = new FederatedSyncManager({ conflictStrategy: 'local_wins' });
  fsm.cloudStore.push('c1', 'cloudVal', 1, 100);
  fsm.localStore.data['c1'] = 'localVal';
  fsm.localStore.meta['c1'] = { version: 2, timestamp: 50, dirty: false };
  fsm.restore('c1');
  assertEq(fsm.localStore.data['c1'], 'localVal', 'FSM: local_wins keeps local');
}
{
  var fsm = new FederatedSyncManager({ conflictStrategy: 'cloud_wins' });
  fsm.cloudStore.push('c1', 'cloudVal', 1, 100);
  fsm.localStore.data['c1'] = 'localVal';
  fsm.localStore.meta['c1'] = { version: 2, timestamp: 50, dirty: false };
  fsm.restore('c1');
  assertEq(fsm.localStore.data['c1'], 'cloudVal', 'FSM: cloud_wins keeps cloud');
}
{
  var fsm = new FederatedSyncManager({ conflictStrategy: 'manual' });
  fsm.cloudStore.push('c1', 'cloudVal', 1, 100);
  fsm.localStore.data['c1'] = 'localVal';
  fsm.localStore.meta['c1'] = { version: 2, timestamp: 50, dirty: false };
  fsm.restore('c1');
  var confs = fsm.getConflicts();
  assertEq(confs.length, 1, 'FSM: manual records conflict');
  var cc = fsm.clearConflicts();
  assertEq(cc.cleared, 1, 'FSM: clearConflicts');
  assertEq(fsm.getConflicts().length, 0, 'FSM: getConflicts empty');
}
{
  // No conflict: local version <= cloud version
  var fsm = new FederatedSyncManager();
  fsm.cloudStore.push('c1', 'val', 2, 100);
  fsm.localStore.data['c1'] = 'val';
  fsm.localStore.meta['c1'] = { version: 1, timestamp: 50, dirty: false };
  var r = fsm.restore('c1');
  assertEq(r.conflict, undefined, 'FSM: no conflict when local version <= cloud');
}

// =========== FSM: detectConflict (4 paths) ===========
{
  var fsm = new FederatedSyncManager();
  assertEq(fsm._detectConflict(null, 1, 1), false, 'FSM: detect null');
  assertEq(fsm._detectConflict({ version: 1, timestamp: 1 }, null, 1), false, 'FSM: detect cloudVersion null');
  assertEq(fsm._detectConflict({ version: 2, timestamp: 1 }, 1, 1), true, 'FSM: detect local version higher');
  assertEq(fsm._detectConflict({ version: 1, timestamp: 200 }, 1, 100), true, 'FSM: detect local timestamp higher');
  assertEq(fsm._detectConflict({ version: 1, timestamp: 100 }, 1, 200), false, 'FSM: detect no conflict');
}

// =========== FSM: sync ===========
{
  var fsm = new FederatedSyncManager();
  fsm.backup('a', { v: 1 });
  fsm.backup('b', { v: 2 });
  var r = fsm.sync();
  assertEq(r.success, true, 'FSM: sync success');
  assertEq(r.pushed, 0, 'FSM: sync pushed 0 (already synced)');
  assertEq(fsm.status, 'online', 'FSM: status online');
  fsm.localStore.data['a'].v = 99;
  fsm.localStore.meta['a'].dirty = true;
  var r2 = fsm.sync();
  assertEq(r2.pushed, 1, 'FSM: sync pushed 1');
  // simulate cloud-only update
  fsm.cloudStore.push('cloudOnly', { v: 1 }, 1, 1);
  var r3 = fsm.sync();
  assertEq(r3.pulled >= 1, true, 'FSM: sync pulled cloudOnly');
  assertEq(fsm.localStore.has('cloudOnly'), true, 'FSM: local has cloudOnly after sync');
  // push failure
  fsm.localStore.data['fail1'] = 'x';
  fsm.localStore.meta['fail1'] = { version: 1, timestamp: Date.now(), dirty: true };
  fsm.cloudStore.setFailMode('push');
  var r4 = fsm.sync();
  assertEq(r4.failed >= 1, true, 'FSM: sync push failed');
  assertEq(fsm.status, 'error', 'FSM: status error after fail');
  fsm.cloudStore.setFailMode('none');
  // history recorded
  var h = fsm.getHistory();
  assert(h.length >= 1, 'FSM: history has entries');
  var h2 = fsm.getHistory(1);
  assertEq(h2.length, 1, 'FSM: history limit');
  // metrics
  var m = fsm.getMetrics();
  assert(m.syncs >= 4, 'FSM: metrics syncs');
  assert(m.pushes >= 1, 'FSM: metrics pushes');
  assert(m.errors >= 1, 'FSM: metrics errors');
  // pull with conflict via restore (sync uses simpler divergent-detection)
  fsm.cloudStore.push('conflictKey', { v: 'cloud' }, 1, Date.now() + 1000);
  fsm.localStore.data['conflictKey'] = { v: 'local' };
  fsm.localStore.meta['conflictKey'] = { version: 2, timestamp: Date.now() - 1000, dirty: false };
  var restoreRes = fsm.restore('conflictKey');
  assertEq(restoreRes.conflict, true, 'FSM: restore conflict detected');
  assertEq(fsm.metrics.conflicts >= 1, true, 'FSM: metrics conflicts');
}

// =========== FSM: auto sync ===========
{
  var fsm = new FederatedSyncManager({ syncInterval: 10 });
  var s1 = fsm.startAutoSync();
  assertEq(s1.success, true, 'FSM: startAutoSync success');
  assertEq(s1.interval, 10, 'FSM: startAutoSync interval');
  assertEq(fsm.autoSync, true, 'FSM: autoSync flag');
  var s2 = fsm.startAutoSync();
  assertEq(s2.error, 'already_running', 'FSM: startAutoSync already');
  var s3 = fsm.stopAutoSync();
  assertEq(s3.success, true, 'FSM: stopAutoSync success');
  assertEq(fsm.autoSync, false, 'FSM: autoSync flag false');
  var s4 = fsm.stopAutoSync();
  assertEq(s4.error, 'not_running', 'FSM: stopAutoSync not_running');
}

// =========== FSM: gist export/import ===========
{
  var fsm = new FederatedSyncManager({ deviceId: 'expdev' });
  fsm.backup('d1', { a: 1 });
  fsm.backup('d2', { b: 2 });
  var gist = fsm.exportForGist();
  assertEq(typeof gist, 'string', 'FSM: exportForGist string');
  var parsed = JSON.parse(gist);
  assertEq(parsed.format, 'federated-gist-v1', 'FSM: gist format');
  assertEq(parsed.deviceId, 'expdev', 'FSM: gist deviceId');
  assertEq(Object.keys(parsed.snapshot.data).length, 2, 'FSM: gist has 2 keys');
  // import into fresh FSM
  var fsm2 = new FederatedSyncManager();
  var ir = fsm2.importFromGist(gist);
  assertEq(ir.success, true, 'FSM: importFromGist success');
  assertEq(ir.count, 2, 'FSM: importFromGist count');
  assertEq(ir.source, 'expdev', 'FSM: importFromGist source');
  assertEq(fsm2.localStore.has('d1'), true, 'FSM: imported d1');
  // error paths
  var ie1 = fsm2.importFromGist(null);
  assertEq(ie1.error, 'invalid_input', 'FSM: importFromGist invalid_input');
  var ie2 = fsm2.importFromGist('not json');
  assertEq(ie2.error, 'parse_error', 'FSM: importFromGist parse_error');
  var ie3 = fsm2.importFromGist('{"format":"other"}');
  assertEq(ie3.error, 'unknown_format', 'FSM: importFromGist unknown_format');
  var ie4 = fsm2.importFromGist('{"format":"federated-gist-v1"}');
  assertEq(ie4.error, 'invalid_snapshot', 'FSM: importFromGist invalid_snapshot');
}

// =========== FSM: clear ===========
{
  var fsm = new FederatedSyncManager();
  fsm.backup('a', 1);
  fsm.enqueue({ key: 'b', value: 2 });
  fsm.sync();
  var c = fsm.clear();
  assertEq(c.success, true, 'FSM: clear success');
  assertEq(fsm.localStore.size(), 0, 'FSM: clear local size');
  assertEq(fsm.cloudStore.size(), 0, 'FSM: clear cloud size');
  assertEq(fsm.queue.length, 0, 'FSM: clear queue');
  assertEq(fsm.status, 'offline', 'FSM: clear status');
}

// =========== SYNC_STATUS / CONFLICT_STRATEGIES / QUEUE_OP_TYPES constants ===========
{
  assertEq(SYNC_STATUS.OFFLINE, 'offline', 'CONST: SYNC_STATUS.OFFLINE');
  assertEq(SYNC_STATUS.ONLINE, 'online', 'CONST: SYNC_STATUS.ONLINE');
  assertEq(CONFLICT_STRATEGIES.NEWEST_WINS, 'newest_wins', 'CONST: CONFLICT.NEWEST');
  assertEq(QUEUE_OP_TYPES.UPSERT, 'upsert', 'CONST: QUEUE.UPSERT');
}

console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
