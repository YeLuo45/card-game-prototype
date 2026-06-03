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
eval(fs.readFileSync(path.join(__dirname, 'bot-blackboard.js'), 'utf8'));
var BotBlackboard = window.BotBlackboard;
var BLACKBOARD_MATCH_MODE = window.BLACKBOARD_MATCH_MODE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var bb = new BotBlackboard();
  assertEq(bb.size(), 0, 'BB: empty');
  assertEq(bb.listKeys().length, 0, 'BB: 0 keys');
  var m = bb.getMetrics();
  assertEq(m.writes, 0, 'BB: 0 writes');
}

function testWriteRead() {
  var bb = new BotBlackboard();
  var w = bb.write('hp', 100, { author: 'a1' });
  assertEq(w.success, true, 'BB: write');
  assertEq(w.version, 1, 'BB: version 1');
  var r = bb.read('hp');
  assertEq(r.success, true, 'BB: read');
  assertEq(r.value, 100, 'BB: value 100');
  // upsert increments version
  var w2 = bb.write('hp', 200);
  assertEq(w2.version, 2, 'BB: version 2');
  var r2 = bb.read('hp');
  assertEq(r2.value, 200, 'BB: value 200');
  // errors
  var e1 = bb.write('', 'x');
  assertEq(e1.error, 'invalid_key', 'BB: empty key');
  var e2 = bb.write(null, 'x');
  assertEq(e2.error, 'invalid_key', 'BB: null key');
  var e3 = bb.read('not_exists');
  assertEq(e3.error, 'not_found', 'BB: not found');
}

function testDelete() {
  var bb = new BotBlackboard();
  bb.write('a', 1);
  bb.write('b', 2);
  var d = bb.delete('a', 'tester');
  assertEq(d.success, true, 'BB: delete');
  assertEq(bb.size(), 1, 'BB: size 1');
  var d2 = bb.delete('not_exists');
  assertEq(d2.error, 'not_found', 'BB: not found delete');
}

function testHas() {
  var bb = new BotBlackboard();
  bb.write('a', 1);
  assertEq(bb.has('a'), true, 'BB: has a');
  assertEq(bb.has('x'), false, 'BB: no x');
}

function testQuery() {
  var bb = new BotBlackboard();
  bb.write('player.hp', 100);
  bb.write('player.mp', 50);
  bb.write('enemy.hp', 80);
  // exact
  var r1 = bb.query('player.hp');
  assertEq(r1.count, 1, 'BB: exact 1');
  // prefix
  var r2 = bb.query('player', 'prefix');
  assertEq(r2.count, 2, 'BB: prefix 2');
  // wildcard
  var r3 = bb.query('*.hp', 'wildcard');
  assertEq(r3.count, 2, 'BB: wildcard 2');
  // regex
  var r4 = bb.query('^enemy', 'regex');
  assertEq(r4.count, 1, 'BB: regex 1');
  // invalid regex
  var r5 = bb.query('[invalid', 'regex');
  assertEq(r5.count, 0, 'BB: invalid regex 0');
  // unknown mode
  var r6 = bb.query('x', 'unknown');
  assertEq(r6.count, 0, 'BB: unknown mode 0');
}

function testQueryByTag() {
  var bb = new BotBlackboard();
  bb.write('a', 1, { tags: ['urgent', 'combat'] });
  bb.write('b', 2, { tags: ['normal'] });
  bb.write('c', 3, { tags: ['urgent'] });
  var r = bb.queryByTag('urgent');
  assertEq(r.count, 2, 'BB: urgent 2');
  var r2 = bb.queryByTag('normal');
  assertEq(r2.count, 1, 'BB: normal 1');
  var r3 = bb.queryByTag('none');
  assertEq(r3.count, 0, 'BB: none 0');
}

function testSubscribe() {
  var bb = new BotBlackboard();
  var received = [];
  var sub = bb.subscribe('hp', function (k, v, e) { received.push({ k: k, v: v }); });
  assertEq(sub.success, true, 'BB: subscribe');
  bb.write('hp', 100, { author: 'a1' });
  assertEq(received.length, 1, 'BB: 1 notify');
  assertEq(received[0].v, 100, 'BB: value 100');
  // wildcard
  var sub2 = bb.subscribe('player.*', function () {}, 'wildcard');
  bb.write('player.hp', 100);
  var metrics = bb.getMetrics();
  assert(metrics.subscriptionHits >= 2, 'BB: 2+ hits');
  // unsubscribe
  var u = bb.unsubscribe(sub.subscriptionId);
  assertEq(u.success, true, 'BB: unsub');
  bb.write('hp', 200);
  assertEq(received.length, 1, 'BB: no more notifies');
  // not found
  var u2 = bb.unsubscribe('not_found');
  assertEq(u2.error, 'not_found', 'BB: not found');
  // errors
  var e1 = bb.subscribe(null, function () {});
  assertEq(e1.error, 'invalid_pattern', 'BB: null pattern');
  var e2 = bb.subscribe('x', null);
  assertEq(e2.error, 'invalid_callback', 'BB: null callback');
}

function testDecay() {
  var bb = new BotBlackboard({ defaultTtl: 50 });
  bb.write('a', 1);
  bb.write('b', 2);
  // wait for TTL
  setTimeout(function () {
    var r = bb.runDecay();
    assertEq(r.success, true, 'BB: decay');
    assertEq(r.removed, 2, 'BB: 2 removed');
    assertEq(r.remaining, 0, 'BB: 0 remaining');
  }, 100);
}

function testMaxEntries() {
  var bb = new BotBlackboard({ maxEntries: 2 });
  bb.write('a', 1);
  bb.write('b', 2);
  bb.write('c', 3);
  assertEq(bb.size(), 2, 'BB: max 2');
  // oldest should be gone
  assertEq(bb.has('a'), false, 'BB: a evicted');
  assertEq(bb.has('c'), true, 'BB: c kept');
}

function testStigmergyTrail() {
  var bb = new BotBlackboard();
  bb.write('food_a', { x: 1 });
  bb.write('food_b', { x: 2 });
  bb.leaveTrail('food_a', 5);
  bb.leaveTrail('food_b', 7);
  var r = bb.followTrail();
  assertEq(r.results.length, 2, 'BB: 2 trails');
  assertEq(r.results[0].key, 'food_b', 'BB: top trail food_b');
  assertEq(r.results[0].trail, 7, 'BB: trail 7');
  // pattern filter
  var r2 = bb.followTrail('food_a');
  assertEq(r2.results.length, 1, 'BB: 1 trail with pattern');
  assertEq(r2.results[0].key, 'food_a', 'BB: food_a');
  // evaporate
  var e = bb.evaporateTrails(0.5);
  assertEq(e.success, true, 'BB: evaporate');
  var r3 = bb.followTrail();
  assert(r3.results[0].trail < 7, 'BB: trail reduced');
  // not found
  var nf = bb.leaveTrail('missing', 5);
  assertEq(nf.error, 'not_found', 'BB: not found');
  // default rate
  var bb2 = new BotBlackboard();
  bb2.write('x', 1);
  bb2.leaveTrail('x', 1);
  var e2 = bb2.evaporateTrails();
  assertEq(e2.success, true, 'BB: default rate');
  // invalid rate
  var bb3 = new BotBlackboard();
  bb3.write('y', 1);
  bb3.leaveTrail('y', 1);
  var e3 = bb3.evaporateTrails(0);
  assertEq(e3.success, true, 'BB: rate 0');
  var e4 = bb3.evaporateTrails(2);
  assertEq(e4.success, true, 'BB: rate >1');
  // accumulate
  var bb4 = new BotBlackboard();
  bb4.write('z', 1);
  bb4.leaveTrail('z', 3);
  bb4.leaveTrail('z', 2);
  var f = bb4.followTrail();
  assertEq(f.results[0].trail, 5, 'BB: accumulate 5');
}

function testAccessLog() {
  var bb = new BotBlackboard();
  bb.write('a', 1, { author: 'u1' });
  bb.read('a', { reader: 'u2' });
  bb.delete('a', 'u3');
  var log = bb.getAccessLog();
  assertEq(log.length, 3, 'BB: 3 log entries');
  var ops = log.map(function (e) { return e.op; });
  assert(ops.indexOf('write') !== -1, 'BB: write in log');
  assert(ops.indexOf('read') !== -1, 'BB: read in log');
  assert(ops.indexOf('delete') !== -1, 'BB: delete in log');
  var limited = bb.getAccessLog(1);
  assertEq(limited.length, 1, 'BB: limited');
}

function testExportImport() {
  var bb = new BotBlackboard();
  bb.write('a', 1);
  bb.write('b', 2);
  var sub = bb.subscribe('a', function () {});
  var exp = bb.exportState();
  assertEq(typeof exp, 'string', 'BB: export string');
  var parsed = JSON.parse(exp);
  assertEq(parsed.entries.length, 2, 'BB: 2 entries in export');
  assertEq(parsed.subscriptions.length, 1, 'BB: 1 sub in export');
  // import
  var bb2 = new BotBlackboard();
  var imp = bb2.importState(exp);
  assertEq(imp.success, true, 'BB: import');
  assertEq(bb2.size(), 2, 'BB: 2 entries imported');
  // callbacks not imported
  assertEq(bb2.subscriptions.length, 0, 'BB: no subs imported');
  // errors
  var e1 = bb2.importState(null);
  assertEq(e1.error, 'invalid_input', 'BB: null import');
  var e2 = bb2.importState('not json');
  assertEq(e2.error, 'parse_error', 'BB: bad import');
}

function testClear() {
  var bb = new BotBlackboard();
  bb.write('a', 1);
  bb.subscribe('a', function () {});
  var c = bb.clear();
  assertEq(c.success, true, 'BB: clear');
  assertEq(bb.size(), 0, 'BB: 0 entries');
  assertEq(bb.subscriptions.length, 0, 'BB: 0 subs');
}

function testMetrics() {
  var bb = new BotBlackboard();
  bb.write('a', 1);
  bb.write('b', 2);
  bb.read('a');
  var m = bb.getMetrics();
  assertEq(m.writes, 2, 'BB: 2 writes');
  assertEq(m.reads, 1, 'BB: 1 read');
}

function testExpired() {
  var bb = new BotBlackboard({ defaultTtl: 10 });
  bb.write('a', 1);
  setTimeout(function () {
    var r = bb.read('a');
    assertEq(r.error, 'expired', 'BB: expired read');
  }, 50);
}

function testConstants() {
  assertEq(BLACKBOARD_MATCH_MODE.EXACT, 'exact', 'BB: MATCH.EXACT');
  assertEq(BLACKBOARD_MATCH_MODE.WILDCARD, 'wildcard', 'BB: MATCH.WILDCARD');
}

testEmpty();
testWriteRead();
testDelete();
testHas();
testQuery();
testQueryByTag();
testSubscribe();
testDecay();
testMaxEntries();
testStigmergyTrail();
testAccessLog();
testExportImport();
testClear();
testMetrics();
testExpired();
testConstants();
setTimeout(function () {
  console.log('\n===== Summary =====');
  console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
  console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
  if (failed > 0) process.exit(1);
}, 200);
