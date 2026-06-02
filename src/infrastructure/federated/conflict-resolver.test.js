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
eval(fs.readFileSync(path.join(__dirname, 'conflict-resolver.js'), 'utf8'));
var VectorClock = window.VectorClock;
var LWWRegister = window.LWWRegister;
var MVRegister = window.MVRegister;
var GCounter = window.GCounter;
var PNCounter = window.PNCounter;
var ORSet = window.ORSet;
var ConflictResolver = window.ConflictResolver;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testVectorClock() {
  var vc = new VectorClock();
  vc.increment('r1');
  vc.increment('r1');
  vc.increment('r2');
  assertEq(vc.get('r1'), 2, 'VC: r1 2');
  assertEq(vc.get('r2'), 1, 'VC: r2 1');
  assertEq(vc.get('r3'), 0, 'VC: r3 0');
  // merge
  var vc2 = new VectorClock({ r1: 1, r2: 3, r3: 2 });
  var merged = vc.merge(vc2);
  assertEq(merged.get('r1'), 2, 'VC: merged r1');
  assertEq(merged.get('r2'), 3, 'VC: merged r2');
  assertEq(merged.get('r3'), 2, 'VC: merged r3');
  // compare
  var a = new VectorClock({ r1: 1, r2: 1 });
  var b = new VectorClock({ r1: 2, r2: 1 });
  assertEq(a.compare(b), 'before', 'VC: a before b');
  assertEq(b.compare(a), 'after', 'VC: b after a');
  var c = new VectorClock({ r1: 1, r2: 1 });
  assertEq(a.compare(c), 'equal', 'VC: equal');
  var d = new VectorClock({ r1: 2, r2: 0 });
  assertEq(a.compare(d), 'concurrent', 'VC: concurrent');
  // serialize
  var s = vc.serialize();
  var d2 = VectorClock.deserialize(s);
  assertEq(d2.get('r1'), 2, 'VC: serialize r1');
  // bad serialize
  var d3 = VectorClock.deserialize('not json');
  assertEq(d3.get('r1'), 0, 'VC: bad deserialize');
  // clone
  var vc3 = vc.clone();
  vc3.increment('r1');
  assertEq(vc.get('r1'), 2, 'VC: clone isolated');
}

function testLWW() {
  var lww = new LWWRegister('v1', 'r1', 1000);
  assertEq(lww.get(), 'v1', 'LWW: get v1');
  lww.set('v2', 'r1', 2000);
  assertEq(lww.get(), 'v2', 'LWW: get v2');
  // merge - newer wins
  var a = new LWWRegister('a', 'r1', 100);
  var b = new LWWRegister('b', 'r2', 200);
  var merged = a.merge(b);
  assertEq(merged.get(), 'b', 'LWW: b wins newer');
  var merged2 = b.merge(a);
  assertEq(merged2.get(), 'b', 'LWW: b still wins');
  // equal timestamps - either wins (no error)
  var c = new LWWRegister('c', 'r1', 100);
  var d = new LWWRegister('d', 'r2', 100);
  var m3 = c.merge(d);
  assert(m3.get() === 'c' || m3.get() === 'd', 'LWW: equal ts');
  // serialize
  var s = lww.serialize();
  var d2 = LWWRegister.deserialize(s);
  assertEq(d2.get(), 'v2', 'LWW: deserialize');
  // bad deserialize
  var d3 = LWWRegister.deserialize('not json');
  assertEq(d3.get(), null, 'LWW: bad deserialize');
}

function testMV() {
  var mv = new MVRegister();
  assertEq(mv.size(), 0, 'MV: empty size');
  mv.add('a', 'r1', 100);
  mv.add('b', 'r2', 200);
  assertEq(mv.size(), 2, 'MV: 2 values');
  assertEq(mv.resolve(), 'b', 'MV: latest wins by default');
  // merge
  var mv2 = new MVRegister();
  mv2.add('c', 'r3', 150);
  var merged = mv.merge(mv2);
  assertEq(merged.size(), 3, 'MV: merged 3');
  // resolver function
  var resolved = merged.resolve(function (vals) { return vals.join('|'); });
  assertEq(resolved.indexOf('|') !== -1, true, 'MV: custom resolver');
  // get concurrent
  var concurrent = merged.getConcurrent();
  assertEq(concurrent.length, 3, 'MV: 3 concurrent');
  // serialize
  var s = mv.serialize();
  var d = MVRegister.deserialize(s);
  assertEq(d.size(), 2, 'MV: deserialize');
  // bad
  var d2 = MVRegister.deserialize('not json');
  assertEq(d2.size(), 0, 'MV: bad deserialize');
  // empty resolve
  var empty = new MVRegister();
  var er = empty.resolve();
  assert(er === undefined, 'MV: empty resolve undefined');
}

function testGCounter() {
  var gc = new GCounter();
  assertEq(gc.value(), 0, 'GC: 0 value');
  gc.increment('r1', 5);
  gc.increment('r2', 3);
  assertEq(gc.value(), 8, 'GC: 8 value');
  // default amount = 1
  gc.increment('r1');
  assertEq(gc.value(), 9, 'GC: default 1');
  // negative rejected
  var negRes = gc.increment('r1', -5);
  assertEq(negRes, false, 'GC: negative rejected');
  assertEq(gc.value(), 9, 'GC: negative ignored');
  // zero rejected
  var zeroRes = gc.increment('r1', 0);
  assertEq(zeroRes, false, 'GC: zero rejected');
  assertEq(gc.value(), 9, 'GC: zero ignored');
  // merge
  var gc2 = new GCounter({ r1: 10, r3: 5 });
  var merged = gc.merge(gc2);
  assertEq(merged.value(), 18, 'GC: merged 18');
  // serialize
  var s = gc.serialize();
  var d = GCounter.deserialize(s);
  assertEq(d.value(), 9, 'GC: deserialize');
  var d2 = GCounter.deserialize('not json');
  assertEq(d2.value(), 0, 'GC: bad deserialize');
}

function testPNCounter() {
  var pn = new PNCounter();
  assertEq(pn.value(), 0, 'PN: 0');
  pn.increment('r1', 10);
  assertEq(pn.value(), 10, 'PN: 10');
  pn.decrement('r1', 3);
  assertEq(pn.value(), 7, 'PN: 7');
  // merge
  var pn2 = new PNCounter();
  pn2.increment('r2', 5);
  pn2.decrement('r2', 2);
  var merged = pn.merge(pn2);
  assertEq(merged.value(), 10, 'PN: merged 10');
  // serialize
  var s = pn.serialize();
  var d = PNCounter.deserialize(s);
  assertEq(d.value(), 7, 'PN: deserialize');
  var d2 = PNCounter.deserialize('not json');
  assertEq(d2.value(), 0, 'PN: bad deserialize');
}

function testORSet() {
  var s = new ORSet();
  s.add('a', 'r1');
  s.add('b', 'r1');
  assertEq(s.size(), 2, 'ORSet: 2 values');
  assert(s.has('a'), 'ORSet: has a');
  assert(s.has('b'), 'ORSet: has b');
  assert(!s.has('c'), 'ORSet: no c');
  var vals = s.values();
  assertEq(vals.length, 2, 'ORSet: 2 values');
  // remove a from r1 (only r1's add removed)
  var removed = s.remove('a', 'r1');
  assert(removed >= 1, 'ORSet: removed at least 1');
  // b still alive
  assert(s.has('b'), 'ORSet: b still alive');
  assert(!s.has('a'), 'ORSet: a removed (only r1 had it)');
  // add 'a' from r2 — now it's live again
  s.add('a', 'r2');
  assert(s.has('a'), 'ORSet: a re-added by r2');
  // remove from both r1 and r2
  s.remove('a', 'r1');
  s.remove('a', 'r2');
  assert(!s.has('a'), 'ORSet: a fully removed');
  // merge with concurrent add
  var s2 = new ORSet();
  s2.add('c', 'r3');
  var merged = s.merge(s2);
  assert(merged.has('c'), 'ORSet: c from s2');
  // serialize
  var ser = s.serialize();
  var d = ORSet.deserialize(ser);
  assertEq(d.size(), 1, 'ORSet: deserialize has b only');
  // bad
  var d2 = ORSet.deserialize('not json');
  assertEq(d2.size(), 0, 'ORSet: bad deserialize');
}

function testResolver() {
  var cr = new ConflictResolver('r1');
  assertEq(cr.replicaId, 'r1', 'CR: replica r1');
  var lww = cr.lww('initial');
  assertEq(lww.get(), 'initial', 'CR: lww initial');
  // tick increments clock
  var before = cr.vectorClock.get('r1');
  cr.tick();
  var after = cr.vectorClock.get('r1');
  assert(after > before, 'CR: tick increments');
  // merge
  var a = cr.lww('a');
  var b = cr.lww('b');
  b.set('b-new', 'r2', Date.now() + 1000);
  var merged = cr.mergeLWW(a, b);
  assertEq(merged.get(), 'b-new', 'CR: lww merge');
  // resolutions recorded
  var res = cr.getResolutions();
  assert(res.length >= 1, 'CR: resolutions recorded');
  // merge MV
  var mv1 = cr.mv('v1');
  var mv2 = cr.mv('v2');
  var mvResult = cr.mergeMV(mv1, mv2, function (vals) { return vals[0]; });
  assertEq(mvResult.resolved, 'v1', 'CR: mv resolved');
  // merge GCounter
  var gc1 = cr.gcounter();
  gc1.increment('r1', 5);
  var gc2 = cr.gcounter();
  gc2.increment('r2', 3);
  var gcMerged = cr.mergeGCounter(gc1, gc2);
  assertEq(gcMerged.value(), 8, 'CR: gcounter merged');
  // merge PNCounter
  var pn1 = cr.pncounter();
  pn1.increment('r1', 10);
  var pn2 = cr.pncounter();
  pn2.decrement('r2', 3);
  var pnMerged = cr.mergePNCounter(pn1, pn2);
  assertEq(pnMerged.value(), 7, 'CR: pncounter merged');
  // merge ORSet
  var or1 = cr.orset();
  or1.add('a', 'r1');
  var or2 = cr.orset();
  or2.add('b', 'r2');
  or2.add('c', 'r2');
  var orMerged = cr.mergeORSet(or1, or2);
  assertEq(orMerged.size(), 3, 'CR: orset merged');
  // getResolutions limit
  var limited = cr.getResolutions(2);
  assertEq(limited.length, 2, 'CR: limited');
  // detectConflict
  var vc1 = new VectorClock({ r1: 1 });
  var vc2 = new VectorClock({ r1: 2 });
  var conflict = cr.detectConflict(vc1, vc2);
  assertEq(conflict, 'before', 'CR: detect before');
  // null versions
  var c2 = cr.detectConflict(null, vc2);
  assertEq(c2, 'unknown', 'CR: unknown');
  // resolution has vector clock
  var resEntry = cr.getResolutions(1)[0];
  assert(typeof resEntry.vectorClock === 'string', 'CR: vector clock serialized');
}

testVectorClock();
testLWW();
testMV();
testGCounter();
testPNCounter();
testORSet();
testResolver();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
