'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'plugin-event.js'), 'utf8'));
var PluginEvent = window.PluginEvent;
var patternMatch = window.patternMatch;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var e = new PluginEvent();
  var s = e.getSummary();
  assertEq(s.subscribers, 0, 'PE: 0 subs');
  assertEq(s.historySize, 0, 'PE: 0 history');
}

function testPatternMatch() {
  assertEq(patternMatch('a', 'a'), true, 'PE: match a');
  assertEq(patternMatch('a', 'b'), false, 'PE: !match');
  assertEq(patternMatch('*', 'anything'), true, 'PE: * match');
  assertEq(patternMatch('card.*', 'card.played'), true, 'PE: card.* match');
  assertEq(patternMatch('card.*', 'deck.played'), false, 'PE: card.* !deck');
  assertEq(patternMatch('user.*.created', 'user.123.created'), true, 'PE: user.*.created');
}

function testSubscribe() {
  var e = new PluginEvent();
  var r = e.subscribe('card.played', function () {});
  assertEq(r.success, true, 'PE: subscribe');
  assertEq(e.subscriberCount('card.played'), 1, 'PE: 1 sub');
  // errors
  var e1 = e.subscribe(null, function () {});
  assertEq(e1.error, 'invalid_pattern', 'PE: null pattern');
  var e2 = e.subscribe('x', 'not fn');
  assertEq(e2.error, 'invalid_fn', 'PE: not fn');
}

function testWildcardSubscribe() {
  var e = new PluginEvent();
  e.subscribe('*', function () {});
  assertEq(e.subscriberCount('*'), 1, 'PE: * count');
  e.subscribe('**', function () {});
  assertEq(e.subscriberCount('**'), 2, 'PE: 2 wildcards');
}

function testUnsubscribe() {
  var e = new PluginEvent();
  var fn = function () {};
  e.subscribe('test', fn);
  var r = e.unsubscribe('test', fn);
  assertEq(r.success, true, 'PE: unsub');
  assertEq(e.subscriberCount('test'), 0, 'PE: 0 sub');
  // not subscribed
  var r2 = e.unsubscribe('test', fn);
  assertEq(r2.error, 'not_subscribed', 'PE: not sub');
  // wildcard
  var fn2 = function () {};
  e.subscribe('*', fn2);
  var r3 = e.unsubscribe('*', fn2);
  assertEq(r3.success, true, 'PE: wild unsub');
  var r4 = e.unsubscribe('*', fn2);
  assertEq(r4.error, 'not_subscribed', 'PE: wild not sub');
  // pattern not found
  var e2 = new PluginEvent();
  var r5 = e2.unsubscribe('not_in', function () {});
  assertEq(r5.error, 'pattern_not_found', 'PE: pattern not found');
}

function testUnsubscribeAll() {
  var e = new PluginEvent();
  e.subscribe('a', function () {});
  e.subscribe('b', function () {});
  e.subscribe('*', function () {});
  e.unsubscribeAll('a');
  assertEq(e.subscriberCount('a'), 0, 'PE: a cleared');
  assertEq(e.subscriberCount('b'), 1, 'PE: b kept');
  e.unsubscribeAll('*');
  assertEq(e.subscriberCount('*'), 0, 'PE: * cleared');
}

function testPublish() {
  var e = new PluginEvent();
  var received = [];
  e.subscribe('test', function (ev, payload) { received.push(payload); });
  var r = e.publish('test', { x: 1 });
  assertEq(r.success, true, 'PE: publish');
  assertEq(r.delivered, 1, 'PE: 1 delivered');
  assertEq(received.length, 1, 'PE: 1 received');
  assertEq(received[0].x, 1, 'PE: x 1');
  // errors
  var e1 = e.publish(null, {});
  assertEq(e1.error, 'invalid_event', 'PE: null event');
}

function testWildcardPublish() {
  var e = new PluginEvent();
  var received = [];
  e.subscribe('*', function (ev, p) { received.push(ev); });
  e.publish('a', {});
  e.publish('b', {});
  assertEq(received.length, 2, 'PE: 2 wildcards');
}

function testPatternPublish() {
  var e = new PluginEvent();
  var received = [];
  e.subscribe('card.*', function (ev, p) { received.push(ev); });
  e.publish('card.played', {});
  e.publish('card.drawn', {});
  e.publish('deck.played', {});
  assertEq(received.length, 2, 'PE: 2 matched');
}

function testMultipleSubscribers() {
  var e = new PluginEvent();
  var r1 = [], r2 = [];
  e.subscribe('x', function (p) { r1.push(p); });
  e.subscribe('x', function (p) { r2.push(p); });
  e.publish('x', 'data');
  assertEq(r1.length, 1, 'PE: r1 1');
  assertEq(r2.length, 1, 'PE: r2 1');
}

function testSubscribeOnce() {
  var e = new PluginEvent();
  var count = 0;
  e.subscribeOnce('once', function () { count++; });
  e.publish('once', {});
  e.publish('once', {});
  assertEq(count, 1, 'PE: once 1');
}

function testPublishErrors() {
  var e = new PluginEvent();
  e.subscribe('boom', function () { throw new Error('boom'); });
  var r = e.publish('boom', {});
  assertEq(r.delivered, 0, 'PE: 0 delivered');
  assertEq(r.errors.length, 1, 'PE: 1 error');
}

function testHistory() {
  var e = new PluginEvent();
  e.publish('a', 1);
  e.publish('b', 2);
  e.publish('a', 3);
  var h = e.getHistory();
  assertEq(h.length, 3, 'PE: 3 history');
  var a = e.getHistory('a');
  assertEq(a.length, 2, 'PE: 2 a');
  var l1 = e.getHistory(null, 1);
  assertEq(l1.length, 1, 'PE: 1 limited');
}

function testHistoryTruncation() {
  var e = new PluginEvent({ maxHistory: 3 });
  for (var i = 0; i < 5; i++) e.publish('x', i);
  var h = e.getHistory();
  assertEq(h.length, 3, 'PE: truncated to 3');
  // 5 publishes; history exceeded limit at 4th and 5th publish = 2 truncations
  assertEq(e.getMetrics().historyTruncated, 2, 'PE: 2 truncations');
}

function testReplay() {
  var e = new PluginEvent();
  e.publish('a', 1);
  e.publish('b', 2);
  e.publish('a', 3);
  var received = [];
  e.replay('a', function (ev, p) { received.push(p); });
  assertEq(received.length, 2, 'PE: 2 replay');
  assertEq(received[0], 1, 'PE: 1');
  assertEq(received[1], 3, 'PE: 3');
  // all
  var allReceived = [];
  e.replay(null, function (ev, p) { allReceived.push(ev); });
  assertEq(allReceived.length, 3, 'PE: 3 all');
  // errors
  var e2 = e.replay('a', null);
  assertEq(e2.error, 'invalid_fn', 'PE: not fn');
}

function testSubscriberCount() {
  var e = new PluginEvent();
  e.subscribe('a', function () {});
  e.subscribe('a', function () {});
  e.subscribe('*', function () {});
  assertEq(e.subscriberCount('a'), 2, 'PE: 2 a');
  assertEq(e.subscriberCount('*'), 1, 'PE: 1 *');
  assertEq(e.subscriberCount('not_in'), 0, 'PE: 0 not in');
  assertEq(e.totalSubscribers(), 3, 'PE: 3 total');
}

function testPatterns() {
  var e = new PluginEvent();
  e.subscribe('a', function () {});
  e.subscribe('b', function () {});
  e.subscribe('c.*', function () {});
  var p = e.patterns();
  assertEq(p.length, 3, 'PE: 3 patterns');
}

function testMetrics() {
  var e = new PluginEvent();
  e.subscribe('a', function () {});
  e.subscribe('a', function () {});
  e.publish('a', {});
  var m = e.getMetrics();
  assertEq(m.publishes, 1, 'PE: 1 publish');
  assertEq(m.deliveries, 2, 'PE: 2 deliveries');
}

function testSummary() {
  var e = new PluginEvent();
  e.subscribe('a', function () {});
  e.publish('a', 1);
  var s = e.getSummary();
  assertEq(s.subscribers, 1, 'PE: 1 sub');
  assertEq(s.historySize, 1, 'PE: 1 history');
}

function testClearHistory() {
  var e = new PluginEvent();
  e.publish('a', 1);
  var r = e.clearHistory();
  assertEq(r.cleared, 1, 'PE: 1 cleared');
  assertEq(e.getHistory().length, 0, 'PE: 0 history');
}

function testClear() {
  var e = new PluginEvent();
  e.subscribe('a', function () {});
  e.publish('a', 1);
  var c = e.clear();
  assertEq(c.success, true, 'PE: clear');
  assertEq(e.totalSubscribers(), 0, 'PE: 0 subs');
  assertEq(e.getHistory().length, 0, 'PE: 0 history');
}

testEmpty();
testPatternMatch();
testSubscribe();
testWildcardSubscribe();
testUnsubscribe();
testUnsubscribeAll();
testPublish();
testWildcardPublish();
testPatternPublish();
testMultipleSubscribers();
testSubscribeOnce();
testPublishErrors();
testHistory();
testHistoryTruncation();
testReplay();
testSubscriberCount();
testPatterns();
testMetrics();
testSummary();
testClearHistory();
testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
