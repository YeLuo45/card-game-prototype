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
eval(fs.readFileSync(path.join(__dirname, 'plugin-registry.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'plugin-marketplace.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'plugin-stats.js'), 'utf8'));
var PluginRegistry = window.PluginRegistry;
var PluginMarketplace = window.PluginMarketplace;
var PluginStats = window.PluginStats;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var s = new PluginStats();
  assertEq(s.getUsage('any'), null, 'PS: 0 usage');
  assertEq(s.getErrors('any'), null, 'PS: 0 errors');
  assertEq(s.feedbackCount('any'), 0, 'PS: 0 feedback');
}

function testRecordUsage() {
  var s = new PluginStats();
  var r = s.recordUsage('p1', 100);
  assertEq(r.success, true, 'PS: record');
  assertEq(r.usage.runs, 1, 'PS: 1 run');
  s.recordUsage('p1', 200);
  s.recordUsage('p1', 300);
  var u = s.getUsage('p1');
  assertEq(u.runs, 3, 'PS: 3 runs');
  assertEq(u.totalTime, 600, 'PS: 600 total');
  assertEq(u.avgTime, 200, 'PS: 200 avg');
  // errors
  var e1 = s.recordUsage(null);
  assertEq(e1.error, 'invalid_id', 'PS: null id');
}

function testGetMostUsed() {
  var s = new PluginStats();
  s.recordUsage('p1');
  s.recordUsage('p1');
  s.recordUsage('p2');
  s.recordUsage('p3');
  var top = s.getMostUsed(2);
  assertEq(top.length, 2, 'PS: 2 top');
  assertEq(top[0].pluginId, 'p1', 'PS: p1 top');
}

function testRecordError() {
  var s = new PluginStats();
  s.recordError('p1', 'oops');
  s.recordError('p1', { message: 'crash' });
  var e = s.getErrors('p1');
  assertEq(e.count, 2, 'PS: 2 errors');
  assertEq(e.lastError, 'crash', 'PS: crash');
  // limited
  var l = s.getErrors('p1', 1);
  assertEq(l.errors.length, 1, 'PS: 1 limited');
  // errors
  var e1 = s.recordError(null);
  assertEq(e1.error, 'invalid_id', 'PS: null');
  // recordError accepts any non-string error (uses default 'unknown')
  s.recordError('p1', 123);
  var e2 = s.getErrors('p1');
  assertEq(e2.lastError, 'unknown', 'PS: 123 becomes unknown');
}

function testMostErrored() {
  var s = new PluginStats();
  s.recordError('p1', 'a');
  s.recordError('p1', 'b');
  s.recordError('p2', 'c');
  var top = s.getMostErrored(1);
  assertEq(top[0].pluginId, 'p1', 'PS: p1 top errors');
}

function testFeedback() {
  var s = new PluginStats();
  s.addFeedback('p1', { author: 'alice', type: 'praise', message: 'great!', rating: 5 });
  s.addFeedback('p1', { author: 'bob', type: 'issue', message: 'bug' });
  var all = s.getFeedback('p1');
  assertEq(all.length, 2, 'PS: 2 feedback');
  var issues = s.getFeedback('p1', 'issue');
  assertEq(issues.length, 1, 'PS: 1 issue');
  assertEq(s.feedbackCount('p1'), 2, 'PS: 2 count');
  // errors
  var e1 = s.addFeedback(null, {});
  assertEq(e1.error, 'invalid_id', 'PS: null');
  var e2 = s.addFeedback('p1', null);
  assertEq(e2.error, 'invalid_feedback', 'PS: null fb');
}

function testHealthBasic() {
  var s = new PluginStats();
  s.recordUsage('p1');
  s.recordUsage('p1');
  s.recordUsage('p1');
  s.recordError('p1', 'err');
  var h = s.computeHealth('p1');
  assert(h.score > 0, 'PS: positive score');
  assert(h.breakdown.usage, 'PS: usage in breakdown');
  assert(h.breakdown.errors, 'PS: errors in breakdown');
}

function testHealthWithMarketplace() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  var m = new PluginMarketplace({ registry: r });
  m.addReview('p1', { rating: 5 });
  m.trackDownload('p1');
  m.trackDownload('p1');
  var s = new PluginStats({ marketplace: m });
  s.recordUsage('p1');
  s.recordUsage('p1');
  s.recordUsage('p1');
  s.recordUsage('p1');
  var h = s.getHealth('p1');
  assert(h.score > 100, 'PS: high score with good rating: ' + h.score);
  assert(h.breakdown.rating, 'PS: rating in breakdown');
  assert(h.breakdown.downloads, 'PS: downloads in breakdown');
}

function testTopHealth() {
  var s = new PluginStats();
  s.recordUsage('p1', 100);
  s.recordUsage('p1', 100);
  s.recordUsage('p2', 100);
  s.recordError('p1', 'e');
  s.recordError('p1', 'e');
  s.computeHealth('p1');
  s.computeHealth('p2');
  var top = s.getTopHealth(1);
  assertEq(top.length, 1, 'PS: 1 top');
  // p2 should be healthier (no errors)
  assertEq(top[0].pluginId, 'p2', 'PS: p2 healthier');
}

function testTrend() {
  var s = new PluginStats();
  s.recordTrend('p1', { downloads: 10 });
  s.recordTrend('p1', { downloads: 20 });
  s.recordTrend('p1', { downloads: 30 });
  var t = s.getTrend('p1');
  assertEq(t.length, 3, 'PS: 3 trends');
  var ma = s.computeMovingAverage('p1', 3);
  assertEq(ma, 20, 'PS: 20 avg');  // (10+20+30)/3 = 20
  // limited
  var l = s.getTrend('p1', 2);
  assertEq(l.length, 2, 'PS: 2 limited');
  // errors
  var e1 = s.recordTrend(null, {});
  assertEq(e1.error, 'invalid_id', 'PS: null');
  var e2 = s.recordTrend('p1', 'not obj');
  assertEq(e2.error, 'invalid_data', 'PS: invalid');
}

function testTrendNone() {
  var s = new PluginStats();
  var ma = s.computeMovingAverage('none');
  assertEq(ma, null, 'PS: null ma');
  var t = s.getTrend('none');
  assertEq(t.length, 0, 'PS: 0 trend');
}

function testCompare() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  r.register({ id: 'p2' });
  var m = new PluginMarketplace({ registry: r });
  m.addReview('p1', { rating: 5 });
  m.addReview('p2', { rating: 3 });
  var s = new PluginStats({ marketplace: m });
  s.recordUsage('p1', 100);
  s.recordUsage('p1', 100);
  s.recordUsage('p2', 100);
  var cmp = s.compare(['p1', 'p2']);
  assertEq(cmp.length, 2, 'PS: 2 compare');
  assert(cmp[0].health > cmp[1].health, 'PS: p1 healthier');
  // errors
  var e = s.compare(null);
  assertEq(e.error, 'invalid_input', 'PS: null');
}

function testMetrics() {
  var s = new PluginStats();
  s.recordUsage('p1');
  s.recordError('p1', 'e');
  s.addFeedback('p1', {});
  var m = s.getMetrics();
  assertEq(m.trackedPlugins, 1, 'PS: 1 usage');
  assertEq(m.erroredPlugins, 1, 'PS: 1 error');
}

function testSummary() {
  var s = new PluginStats();
  s.recordUsage('p1');
  s.recordUsage('p1');
  s.recordUsage('p2');
  s.computeHealth('p1');
  s.computeHealth('p2');
  var sum = s.getSummary();
  assertEq(sum.topUsed.length, 2, 'PS: 2 used');
  assertEq(sum.topHealth.length, 2, 'PS: 2 health');
}

function testClear() {
  var s = new PluginStats();
  s.recordUsage('p1');
  s.recordError('p1', 'e');
  s.addFeedback('p1', {});
  s.computeHealth('p1');
  s.recordTrend('p1', {});
  var c = s.clear();
  assertEq(c.success, true, 'PS: clear');
  assertEq(s.getUsage('p1'), null, 'PS: 0 usage');
  assertEq(s.getErrors('p1'), null, 'PS: 0 errors');
  assertEq(s.getTrend('p1').length, 0, 'PS: 0 trend');
}

testEmpty();
testRecordUsage();
testGetMostUsed();
testRecordError();
testMostErrored();
testFeedback();
testHealthBasic();
testHealthWithMarketplace();
testTopHealth();
testTrend();
testTrendNone();
testCompare();
testMetrics();
testSummary();
testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
