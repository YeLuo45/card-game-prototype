'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'memory-analytics.js'), 'utf8'));
var DreamMemoryStore = window.DreamMemoryStore;
var MemoryAnalytics = window.MemoryAnalytics;
var ANALYTICS_DIMENSION = window.ANALYTICS_DIMENSION;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  // Init
  var a = new MemoryAnalytics();
  assertEq(typeof a.record, 'function', 'Analytics: init');
  assertEq(a.getStats().accessLogSize, 0, 'Analytics: empty log');

  // Record events
  var e1 = { id: 'm1', type: 'episodic', layer: 'L4' };
  a.record('read', e1);
  a.record('read', e1);
  a.record('write', e1);
  assertEq(a.accessLog.length, 3, 'Analytics: 3 events');
  assertEq(a.heat('m1'), 2, 'Analytics: heat 2 reads');

  // Top hot
  var e2 = { id: 'm2', type: 'semantic', layer: 'L2' };
  a.record('read', e2);
  var top = a.topHot(5);
  assertEq(top[0].id, 'm1', 'Analytics: top is m1');
  assertEq(top[0].heat, 2, 'Analytics: m1 heat=2');

  // Group by layer
  var byL = a.groupBy(ANALYTICS_DIMENSION.LAYER);
  assertEq(byL.L4, 3, 'Analytics: L4 = 3 events');
  assertEq(byL.L2, 1, 'Analytics: L2 = 1 event');

  // Group by type
  var byT = a.groupBy(ANALYTICS_DIMENSION.TYPE);
  assertEq(byT.episodic, 3, 'Analytics: episodic = 3');
  assertEq(byT.semantic, 1, 'Analytics: semantic = 1');

  // Hot layer
  var hotL = a.hotLayer();
  assertEq(hotL.layer, 'L4', 'Analytics: hotLayer L4');
  assertEq(hotL.count, 3, 'Analytics: hotLayer count 3');

  // Hot type
  var hotT = a.hotType();
  assertEq(hotT.type, 'episodic', 'Analytics: hotType episodic');
  assertEq(hotT.count, 3, 'Analytics: hotType count 3');

  // Peak hour
  var pk = a.peakHour();
  assert(pk.hour >= 0 && pk.hour < 24, 'Analytics: peak hour in 0-23');
  assert(pk.count > 0, 'Analytics: peak count > 0');

  // Cold entries
  var store = new DreamMemoryStore();
  var m1Saved = store.save('episodic', 'L4', 'm1');
  store.save('episodic', 'L4', 'm2');
  store.save('semantic', 'L2', 'm3');
  var a2 = new MemoryAnalytics({ store: store });
  a2.record('read', { id: m1Saved.id, type: 'episodic', layer: 'L4' });
  var coldList = a2.cold(10);
  // m1 is hot, m2 and m3 are cold
  assertEq(coldList.length, 2, 'Analytics: 2 cold entries');
  assert(coldList.every(function (e) { return e.id !== m1Saved.id; }), 'Analytics: m1 not in cold list');

  // Health snapshot
  var hs = a2.healthSnapshot();
  assertEq(hs.totalEntries, 3, 'Analytics: health total=3');
  assertEq(hs.byLayer.L4, 2, 'Analytics: health L4=2');
  assertEq(hs.byLayer.L2, 1, 'Analytics: health L2=1');
  assertEq(hs.uniqueAccessed, 1, 'Analytics: health uniqueAccessed=1');
  assertClose(hs.hotRatio, 1/3, 0.01, 'Analytics: health hotRatio ~ 1/3');

  // Generate report
  var report = a2.generateReport();
  assertEq(typeof report.at, 'number', 'Analytics: report has timestamp');
  assertEq(report.health.totalEntries, 3, 'Analytics: report health total');
  assert(report.byLayer, 'Analytics: report has byLayer');
  assert(report.byType, 'Analytics: report has byType');
  assertEq(report.topHot[0].id, m1Saved.id, 'Analytics: report top is m1');
  assert(a2.aggregations.length === 1, 'Analytics: 1 report stored');

  // Recall hit rate (no recall)
  assertEq(a2.recallHitRate(), null, 'Analytics: no recall = null');

  // Reset
  a2.reset();
  assertEq(a2.accessLog.length, 0, 'Analytics: reset clears log');
  assertEq(Object.keys(a2.heatCache).length, 0, 'Analytics: reset clears heat');

  // Group by session (requires store + entry)
  var a3 = new MemoryAnalytics({ store: store });
  var eS1 = { id: 'm1', type: 'episodic', layer: 'L4' };
  var eS2 = { id: 'm2', type: 'episodic', layer: 'L4' };
  a3.record('read', eS1);
  a3.record('read', eS2);
  // store doesn't have sessionId in metadata, so 'unknown'
  var byS = a3.groupBy(ANALYTICS_DIMENSION.SESSION);
  assertEq(byS.unknown, 2, 'Analytics: 2 unknown sessions');

  // Max log size
  var a4 = new MemoryAnalytics({ maxLogSize: 5 });
  for (var i = 0; i < 10; i++) a4.record('read', { id: 'x' + i, type: 'episodic', layer: 'L4' });
  assertEq(a4.accessLog.length, 5, 'Analytics: maxLogSize=5 enforced');
  assertEq(a4.accessLog[0].id, 'x5', 'Analytics: oldest trimmed');

  // Day dimension
  var byD = a3.groupBy(ANALYTICS_DIMENSION.DAY);
  var today = new Date().toISOString().substring(0, 10);
  assertEq(byD[today], 2, 'Analytics: today=2 events');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
