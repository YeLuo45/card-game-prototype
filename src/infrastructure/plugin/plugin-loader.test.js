'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'plugin-loader.js'), 'utf8'));
var PluginLoader = window.PluginLoader;
var LOAD_STATE = window.LOAD_STATE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var l = new PluginLoader();
  assertEq(Object.keys(l.instances).length, 0, 'PL: empty');
  var s = l.getSummary();
  assertEq(s.cachedPlugins, 0, 'PL: 0 cached');
}

function testRegisterFactory() {
  var l = new PluginLoader();
  var r = l.registerFactory('p1', function () { return { hello: 'world' }; });
  assertEq(r.success, true, 'PL: register factory');
  assertEq(l.hasFactory('p1'), true, 'PL: has p1');
  assertEq(l.hasFactory('x'), false, 'PL: no x');
  // errors
  var e1 = l.registerFactory(null, function () {});
  assertEq(e1.error, 'invalid_id', 'PL: null id');
  var e2 = l.registerFactory('p2', null);
  assertEq(e2.error, 'invalid_factory', 'PL: null factory');
}

function testLoad() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return { name: 'p1' }; });
  var r = l.load('p1');
  assertEq(r.success, true, 'PL: load');
  assertEq(r.cached, false, 'PL: not cached');
  assertEq(r.instance.name, 'p1', 'PL: instance name');
  // load again = cache hit
  var r2 = l.load('p1');
  assertEq(r2.cached, true, 'PL: cached');
  // state
  assertEq(l.getState('p1'), 'loaded', 'PL: loaded state');
  assertEq(l.isLoaded('p1'), true, 'PL: isLoaded');
  // no factory
  var r3 = l.load('no_factory');
  assertEq(r3.error, 'no_factory', 'PL: no factory');
  assertEq(l.getState('no_factory'), 'failed', 'PL: failed state');
}

function testLoadResult() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return { instance: { wrapped: true }, data: 'x' }; });
  var r = l.load('p1');
  assertEq(r.success, true, 'PL: load result');
  assertEq(r.instance.wrapped, true, 'PL: wrapped');
}

function testLoadFactoryThrows() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { throw new Error('boom'); });
  var r = l.load('p1');
  assertEq(r.error, 'load_failed', 'PL: load failed');
  assertEq(r.message, 'boom', 'PL: boom message');
  assertEq(l.getState('p1'), 'failed', 'PL: failed state');
}

function testUnload() {
  var l = new PluginLoader();
  var disposed = false;
  l.registerFactory('p1', function () { return { name: 'p1', dispose: function () { disposed = true; } }; });
  l.load('p1');
  var r = l.unload('p1');
  assertEq(r.success, true, 'PL: unload');
  assertEq(disposed, true, 'PL: disposed');
  assertEq(l.isLoaded('p1'), false, 'PL: not loaded');
  // not loaded
  var r2 = l.unload('p1');
  assertEq(r2.error, 'not_loaded', 'PL: not loaded');
}

function testReload() {
  var l = new PluginLoader();
  var counter = 0;
  l.registerFactory('p1', function () { counter++; return { id: counter }; });
  l.load('p1');
  assertEq(counter, 1, 'PL: loaded 1');
  var r = l.reload('p1');
  assertEq(r.success, true, 'PL: reload');
  assertEq(counter, 2, 'PL: loaded 2');
  var inst = l.getInstance('p1');
  assertEq(inst.id, 2, 'PL: new instance');
  // disabled
  var l2 = new PluginLoader({ hotReloadEnabled: false });
  l2.registerFactory('p1', function () { return {}; });
  l2.load('p1');
  var r2 = l2.reload('p1');
  assertEq(r2.error, 'hot_reload_disabled', 'PL: disabled');
}

function testMaxCached() {
  var l = new PluginLoader({ maxCached: 2 });
  for (var i = 0; i < 5; i++) {
    l.registerFactory('p' + i, function (n) { return { id: n }; }.bind(null, i));
    l.load('p' + i);
  }
  assertEq(l.cacheOrder.length, 2, 'PL: max 2');
  assertEq(l.cacheOrder[0], 'p3', 'PL: oldest evicted (p0,1,2 evicted)');
}

function testGetInstance() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return { name: 'p1' }; });
  assertEq(l.getInstance('p1'), null, 'PL: null unloaded');
  l.load('p1');
  var inst = l.getInstance('p1');
  assertEq(inst.name, 'p1', 'PL: instance');
  var inst2 = l.getInstance('not_in');
  assertEq(inst2, null, 'PL: null not in');
}

function testPrecache() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return {}; });
  l.registerFactory('p2', function () { return {}; });
  var r = l.precache(['p1', 'p2', 'no_factory']);
  assertEq(r.success, true, 'PL: precache');
  assertEq(r.loaded, 2, 'PL: 2 loaded');
  // invalid
  var e = l.precache(null);
  assertEq(e.error, 'invalid_input', 'PL: invalid');
}

function testClearCache() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return {}; });
  l.registerFactory('p2', function () { return {}; });
  l.load('p1');
  l.load('p2');
  var r = l.clearCache();
  assertEq(r.success, true, 'PL: clear');
  assertEq(r.cleared, 2, 'PL: 2 cleared');
  assertEq(l.getInstance('p1'), null, 'PL: p1 gone');
}

function testExecute() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return { greet: function (n) { return 'hello ' + n; } }; });
  var r = l.execute('p1', 'greet', ['world']);
  assertEq(r.success, true, 'PL: execute');
  assertEq(r.result, 'hello world', 'PL: result');
  // method not found
  var r2 = l.execute('p1', 'missing', []);
  assertEq(r2.error, 'method_not_found', 'PL: no method');
  // throw
  l.registerFactory('p2', function () { return { bad: function () { throw new Error('x'); } }; });
  var r3 = l.execute('p2', 'bad', []);
  assertEq(r3.error, 'execution_failed', 'PL: exec failed');
  // lazy load
  l.registerFactory('p3', function () { return { foo: function () { return 42; } }; });
  var r4 = l.execute('p3', 'foo', []);
  assertEq(r4.success, true, 'PL: lazy load');
  assertEq(r4.result, 42, 'PL: lazy result');
}

function testLoadLog() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return {}; });
  l.load('p1');
  l.unload('p1');
  var log = l.getLoadLog();
  assert(log.length >= 2, 'PL: log has entries');
  var types = log.map(function (e) { return e.type; });
  assert(types.indexOf('load') !== -1, 'PL: load in log');
  assert(types.indexOf('unload') !== -1, 'PL: unload in log');
  var limited = l.getLoadLog(1);
  assertEq(limited.length, 1, 'PL: limited');
}

function testMetrics() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return {}; });
  l.load('p1');
  l.load('p1');  // cache hit
  var m = l.getMetrics();
  assertEq(m.loads, 2, 'PL: 2 loads');
  assert(m.cacheHits >= 1, 'PL: 1+ hit');
  assert(m.cacheMisses >= 1, 'PL: 1+ miss');
}

function testSummary() {
  var l = new PluginLoader();
  l.registerFactory('p1', function () { return {}; });
  l.load('p1');
  var s = l.getSummary();
  assertEq(s.cachedPlugins, 1, 'PL: 1 cached');
  assertEq(s.loadedInstances, 1, 'PL: 1 loaded');
  assertEq(s.registeredFactories, 1, 'PL: 1 factory');
  assertEq(s.stateDistribution.loaded, 1, 'PL: 1 loaded state');
}

function testConstants() {
  assertEq(LOAD_STATE.LOADED, 'loaded', 'PL: STATE.LOADED');
  assertEq(LOAD_STATE.FAILED, 'failed', 'PL: STATE.FAILED');
}

testEmpty();
testRegisterFactory();
testLoad();
testLoadResult();
testLoadFactoryThrows();
testUnload();
testReload();
testMaxCached();
testGetInstance();
testPrecache();
testClearCache();
testExecute();
testLoadLog();
testMetrics();
testSummary();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
