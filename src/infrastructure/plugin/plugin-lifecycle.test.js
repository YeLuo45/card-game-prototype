'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'plugin-lifecycle.js'), 'utf8'));
var PluginLifecycle = window.PluginLifecycle;
var LIFECYCLE_STATE = window.LIFECYCLE_STATE;
var LIFECYCLE_HOOK = window.LIFECYCLE_HOOK;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var l = new PluginLifecycle();
  assertEq(l.getState('any'), null, 'PL: null state');
  var s = l.getSummary();
  assertEq(s.totalPlugins, 0, 'PL: 0 plugins');
}

function testRegister() {
  var l = new PluginLifecycle();
  var r = l.register('p1', { name: 'p1' });
  assertEq(r.success, true, 'PL: register');
  assertEq(r.state, 'created', 'PL: created');
  assertEq(l.getState('p1'), 'created', 'PL: state created');
  var i = l.getInstance('p1');
  assertEq(i.name, 'p1', 'PL: instance');
  // errors
  var e1 = l.register(null, {});
  assertEq(e1.error, 'invalid_id', 'PL: null id');
}

function testAddHook() {
  var l = new PluginLifecycle();
  l.register('p1', {});
  var called = 0;
  var r = l.addHook('p1', 'beforeInit', function () { called++; });
  assertEq(r.success, true, 'PL: add hook');
  // errors
  var e1 = l.addHook(null, 'x', function () {});
  assertEq(e1.error, 'invalid_id', 'PL: null id');
  var e2 = l.addHook('p1', 'x', 'not fn');
  assertEq(e2.error, 'invalid_fn', 'PL: not fn');
  // remove
  var rm = l.removeHooks('p1', 'beforeInit');
  assertEq(rm.success, true, 'PL: remove');
  var rm2 = l.removeHooks('p1');
  assertEq(rm2.success, true, 'PL: remove all');
  var e3 = l.removeHooks('not_in');
  assertEq(e3.error, 'not_found', 'PL: not in');
}

function testInit() {
  var l = new PluginLifecycle();
  var initialized = false;
  l.register('p1', { init: function () { initialized = true; } });
  var r = l.init('p1');
  assertEq(r.success, true, 'PL: init');
  assertEq(initialized, true, 'PL: called init()');
  assertEq(l.getState('p1'), 'initialized', 'PL: initialized');
  // errors
  var r2 = l.init('not_in');
  assertEq(r2.error, 'not_registered', 'PL: not reg');
  var r3 = l.init('p1');  // already initialized
  assertEq(r3.error, 'invalid_state', 'PL: invalid state');
}

function testInitError() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () { throw new Error('init-boom'); } });
  var r = l.init('p1');
  assertEq(r.error, 'init_failed', 'PL: init failed');
  assertEq(r.message, 'init-boom', 'PL: init-boom');
  assertEq(l.getState('p1'), 'error', 'PL: error state');
}

function testStart() {
  var l = new PluginLifecycle();
  var started = false;
  l.register('p1', { init: function () {}, start: function () { started = true; } });
  l.init('p1');
  var r = l.start('p1');
  assertEq(r.success, true, 'PL: start');
  assertEq(started, true, 'PL: called start()');
  assertEq(l.getState('p1'), 'running', 'PL: running');
  // not init
  var l2 = new PluginLifecycle();
  l2.register('p2', {});
  var r2 = l2.start('p2');
  assertEq(r2.error, 'invalid_state', 'PL: not init');
}

function testPauseResume() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () {}, start: function () {}, pause: function () {}, resume: function () {} });
  l.init('p1');
  l.start('p1');
  var p = l.pause('p1');
  assertEq(p.success, true, 'PL: pause');
  assertEq(l.getState('p1'), 'paused', 'PL: paused');
  var r = l.resume('p1');
  assertEq(r.success, true, 'PL: resume');
  assertEq(l.getState('p1'), 'running', 'PL: running');
  // errors: p1 is currently running after resume
  // re-pause (allowed, transitions to paused)
  var pauseAgain = l.pause('p1');
  assertEq(pauseAgain.success, true, 'PL: pause again');
  // now p1 is paused; pause again should fail
  var e1 = l.pause('p1');
  assertEq(e1.error, 'invalid_state', 'PL: pause !running');
  // resume !paused: use a fresh registered one not paused
  var l3 = new PluginLifecycle();
  l3.register('p2', { init: function () {}, start: function () {}, pause: function () {}, resume: function () {} });
  // p2 is in 'created' state, not paused
  var e2 = l3.resume('p2');
  assertEq(e2.error, 'invalid_state', 'PL: resume !paused');
}

function testStop() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () {}, start: function () {}, stop: function () {} });
  l.init('p1');
  l.start('p1');
  var r = l.stop('p1');
  assertEq(r.success, true, 'PL: stop');
  assertEq(l.getState('p1'), 'stopped', 'PL: stopped');
  // start from stopped (need to re-init first)
  var r2 = l.start('p1');
  assertEq(r2.error, 'invalid_state', 'PL: start stopped');
  // re-init then start
  // actually we need a state that allows start: INITIALIZED or PAUSED
  // use pause/resume flow
  var l2 = new PluginLifecycle();
  l2.register('p2', { init: function () {}, start: function () {}, stop: function () {}, pause: function () {}, resume: function () {} });
  l2.init('p2');
  l2.start('p2');
  l2.pause('p2');
  l2.stop('p2');
  // already stopped
  var e1 = l2.stop('p2');
  assertEq(e1.error, 'already_stopped', 'PL: dup stop');
}

function testDestroy() {
  var l = new PluginLifecycle();
  var destroyed = false;
  l.register('p1', { init: function () {}, start: function () {}, stop: function () {}, destroy: function () { destroyed = true; } });
  l.init('p1');
  l.start('p1');
  var r = l.destroy('p1');
  assertEq(r.success, true, 'PL: destroy');
  assertEq(destroyed, true, 'PL: called destroy');
  assertEq(l.getState('p1'), 'destroyed', 'PL: destroyed');
  // already destroyed
  var e1 = l.destroy('p1');
  assertEq(e1.error, 'already_destroyed', 'PL: dup destroy');
}

function testDestroyAutoStop() {
  var l = new PluginLifecycle();
  var stopCalled = false;
  l.register('p1', { init: function () {}, start: function () {}, stop: function () { stopCalled = true; }, destroy: function () {} });
  l.init('p1');
  l.start('p1');
  l.destroy('p1');
  assertEq(stopCalled, true, 'PL: auto-stop');
}

function testHooks() {
  var l = new PluginLifecycle();
  var hookCalls = [];
  l.register('p1', { init: function () {}, start: function () {}, stop: function () {}, destroy: function () {} });
  l.addHook('p1', 'beforeInit', function () { hookCalls.push('beforeInit'); });
  l.addHook('p1', 'afterInit', function () { hookCalls.push('afterInit'); });
  l.addHook('p1', 'beforeStart', function () { hookCalls.push('beforeStart'); });
  l.addHook('p1', 'afterStart', function () { hookCalls.push('afterStart'); });
  l.init('p1');
  l.start('p1');
  assert(hookCalls.indexOf('beforeInit') !== -1, 'PL: beforeInit');
  assert(hookCalls.indexOf('afterInit') !== -1, 'PL: afterInit');
  assert(hookCalls.indexOf('beforeStart') !== -1, 'PL: beforeStart');
  assert(hookCalls.indexOf('afterStart') !== -1, 'PL: afterStart');
}

function testHistory() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () {}, start: function () {}, stop: function () {}, destroy: function () {} });
  l.init('p1');
  l.start('p1');
  l.stop('p1');
  l.destroy('p1');
  var h = l.getHistory('p1');
  assert(h.length >= 4, 'PL: 4+ history');
  var events = h.map(function (e) { return e.event; });
  assert(events.indexOf('register') !== -1, 'PL: register in log');
  assert(events.indexOf('init') !== -1, 'PL: init in log');
}

function testStartAll() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () {}, start: function () {} });
  l.register('p2', { init: function () {}, start: function () {} });
  var r = l.startAll();
  assertEq(r.p1, 'running', 'PL: p1 running');
  assertEq(r.p2, 'running', 'PL: p2 running');
}

function testStopAll() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () {}, start: function () {}, stop: function () {} });
  l.register('p2', { init: function () {}, start: function () {}, stop: function () {} });
  l.init('p1');
  l.start('p1');
  l.init('p2');
  l.start('p2');
  var r = l.stopAll();
  assertEq(r.p1, 'stopped', 'PL: p1 stopped');
  assertEq(r.p2, 'stopped', 'PL: p2 stopped');
}

function testMetrics() {
  var l = new PluginLifecycle();
  l.register('p1', { init: function () {}, start: function () {}, stop: function () {}, destroy: function () {} });
  l.init('p1');
  l.start('p1');
  l.stop('p1');
  l.destroy('p1');
  var m = l.getMetrics();
  assertEq(m.init, 1, 'PL: 1 init');
  assertEq(m.start, 1, 'PL: 1 start');
  assertEq(m.stop, 1, 'PL: 1 stop');
  assertEq(m.destroy, 1, 'PL: 1 destroy');
}

function testSummary() {
  var l = new PluginLifecycle();
  l.register('p1', {});
  l.register('p2', { init: function () {}, start: function () {} });
  l.init('p2');
  l.start('p2');
  var s = l.getSummary();
  assertEq(s.totalPlugins, 2, 'PL: 2 total');
  assertEq(s.stateDistribution.created, 1, 'PL: 1 created');
  assertEq(s.stateDistribution.running, 1, 'PL: 1 running');
}

function testClear() {
  var l = new PluginLifecycle();
  l.register('p1', {});
  var c = l.clear();
  assertEq(c.success, true, 'PL: clear');
  assertEq(l.getState('p1'), null, 'PL: gone');
}

function testConstants() {
  assertEq(LIFECYCLE_STATE.RUNNING, 'running', 'PL: STATE.RUNNING');
  assertEq(LIFECYCLE_STATE.DESTROYED, 'destroyed', 'PL: STATE.DESTROYED');
  assertEq(LIFECYCLE_HOOK.BEFORE_INIT, 'beforeInit', 'PL: HOOK.BEFORE_INIT');
}

testEmpty();
testRegister();
testAddHook();
testInit();
testInitError();
testStart();
testPauseResume();
testStop();
testDestroy();
testDestroyAutoStop();
testHooks();
testHistory();
testStartAll();
testStopAll();
testMetrics();
testSummary();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
