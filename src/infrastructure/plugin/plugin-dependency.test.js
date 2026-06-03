'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'plugin-dependency.js'), 'utf8'));
var PluginDependency = window.PluginDependency;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var d = new PluginDependency();
  assertEq(d.getDependencies('any').length, 0, 'PD: empty');
  var s = d.getSummary();
  assertEq(s.declaredPlugins, 0, 'PD: 0 declared');
}

function testDeclare() {
  var d = new PluginDependency();
  var r = d.declare('p1', ['p2', 'p3']);
  assertEq(r.success, true, 'PD: declare');
  assertEq(r.count, 2, 'PD: 2 deps');
  var deps = d.getDependencies('p1');
  assertEq(deps.length, 2, 'PD: 2 deps');
  assertEq(deps[0].name, 'p2', 'PD: p2');
  // object format
  d.declare('p4', [{ name: 'p5', version: '^1.0.0' }]);
  var d2 = d.getDependencies('p4');
  assertEq(d2[0].version, '^1.0.0', 'PD: ^1.0.0');
  // errors
  var e1 = d.declare(null, []);
  assertEq(e1.error, 'invalid_id', 'PD: null id');
  var e2 = d.declare('p1', 'not array');
  assertEq(e2.error, 'invalid_dependencies', 'PD: not array');
  var e3 = d.declare('p1', [{ version: '1.0.0' }]);
  assertEq(e3.error, 'invalid_dependency_format', 'PD: no name');
}

function testGetDependents() {
  var d = new PluginDependency();
  d.declare('p1', ['common', 'p2']);
  d.declare('p3', ['common', 'p4']);
  var deps = d.getDependents('common');
  assertEq(deps.length, 2, 'PD: 2 dependents');
  assert(deps.indexOf('p1') !== -1, 'PD: p1');
  var none = d.getDependents('unknown');
  assertEq(none.length, 0, 'PD: 0 unknown');
}

function testMarkInstalled() {
  var d = new PluginDependency();
  d.markInstalled('p1', '1.0.0');
  assertEq(d.isInstalled('p1'), true, 'PD: installed');
  var u = d.unmarkInstalled('p1');
  assertEq(u.success, true, 'PD: unmark');
  assertEq(d.isInstalled('p1'), false, 'PD: not installed');
  var e = d.unmarkInstalled('not_in');
  assertEq(e.error, 'not_installed', 'PD: not in');
}

function testFindMissing() {
  var d = new PluginDependency();
  d.declare('p1', ['p2', 'p3']);
  d.markInstalled('p2', '1.0.0');
  var m = d.findMissing('p1');
  assertEq(m.length, 1, 'PD: 1 missing');
  assertEq(m[0].name, 'p3', 'PD: p3 missing');
  // all installed
  d.markInstalled('p3', '1.0.0');
  var m2 = d.findMissing('p1');
  assertEq(m2.length, 0, 'PD: 0 missing');
  // no deps
  var m3 = d.findMissing('p4');
  assertEq(m3.length, 0, 'PD: 0 no deps');
}

function testFindAllMissing() {
  var d = new PluginDependency();
  d.declare('p1', ['p2']);
  d.declare('p2', ['p3']);
  d.declare('p3', []);
  d.markInstalled('p2', '1.0.0');
  d.markInstalled('p3', '1.0.0');
  var m = d.findAllMissing(['p1']);
  assertEq(m.length, 0, 'PD: 0 all installed');
  // p1 needs p2 (not installed), p2 needs p3 (not installed)
  d.unmarkInstalled('p2');
  d.unmarkInstalled('p3');
  var m2 = d.findAllMissing(['p1']);
  // p1 needs p2 (missing), p2 needs p3 (missing) → {p2, p3}
  assertEq(m2.length, 2, 'PD: 2 transitively missing');
  // no args = all declared plugins
  d.declare('p4', ['p5']);
  var m3 = d.findAllMissing();
  // p1 needs p2, p2 needs p3, p4 needs p5 = 3
  assertEq(m3.length, 3, 'PD: 3 all');
}

function testTopologicalSort() {
  var d = new PluginDependency();
  d.declare('p1', ['p2', 'p3']);
  d.declare('p2', ['p3']);
  d.declare('p3', []);
  var order = d.topologicalSort(['p1']);
  assertEq(order[2], 'p1', 'PD: p1 last');
  // p3 should be before p2, p2 before p1
  var idx3 = order.indexOf('p3');
  var idx2 = order.indexOf('p2');
  assert(idx3 < idx2, 'PD: p3 before p2');
  assert(idx2 < order.indexOf('p1'), 'PD: p2 before p1');
}

function testCycle() {
  var d = new PluginDependency();
  d.declare('p1', ['p2']);
  d.declare('p2', ['p1']);  // cycle
  var c = d.detectCycle();
  assertEq(c.cycle, true, 'PD: cycle');
  // no cycle
  d.clear();
  d.declare('p1', ['p2']);
  d.declare('p2', []);
  var c2 = d.detectCycle();
  assertEq(c2.cycle, false, 'PD: no cycle');
}

function testResolve() {
  var d = new PluginDependency();
  d.declare('p1', ['p2', 'p3']);
  d.declare('p2', ['p3']);
  d.declare('p3', []);
  d.markInstalled('p2', '1.0.0');
  d.markInstalled('p3', '1.0.0');
  var r = d.resolve('p1');
  assertEq(r.success, true, 'PD: resolve');
  var order = r.installOrder;
  assert(order.indexOf('p3') < order.indexOf('p2'), 'PD: p3 before p2');
  // missing
  d.unmarkInstalled('p3');
  var r2 = d.resolve('p1');
  assertEq(r2.success, false, 'PD: missing fail');
  assertEq(r2.error, 'missing_dependencies', 'PD: missing error');
  // cycle
  d.clear();
  d.declare('p1', ['p2']);
  d.declare('p2', ['p1']);
  var r3 = d.resolve('p1');
  assertEq(r3.success, false, 'PD: cycle fail');
  // invalid
  var r4 = d.resolve(null);
  assertEq(r4.error, 'invalid_id', 'PD: null id');
}

function testResolveAll() {
  var d = new PluginDependency();
  d.declare('p1', []);
  d.declare('p2', ['p1']);
  d.markInstalled('p1', '1.0.0');
  var results = d.resolveAll(['p1', 'p2']);
  assertEq(results.length, 2, 'PD: 2 results');
  assertEq(results[0].result.success, true, 'PD: p1 OK');
  assertEq(results[1].result.success, true, 'PD: p2 OK');
}

function testInstallOrder() {
  var d = new PluginDependency();
  d.declare('app', ['logger', 'utils']);
  d.declare('logger', ['utils']);
  d.declare('utils', []);
  d.markInstalled('utils', '1.0.0');
  d.markInstalled('logger', '1.0.0');
  var r = d.resolve('app');
  var order = d.getInstallOrder();
  assert(order.length >= 3, 'PD: 3+ order');
  assert(order[order.length - 1] === 'app', 'PD: app last');
}

function testMetrics() {
  var d = new PluginDependency();
  d.declare('p1', ['p2']);
  d.resolve('p1');
  d.resolve('p1');
  var m = d.getMetrics();
  assertEq(m.resolves, 2, 'PD: 2 resolves');
}

function testSummary() {
  var d = new PluginDependency();
  d.declare('p1', ['p2']);
  d.markInstalled('p1', '1.0.0');
  d.markInstalled('p2', '1.0.0');
  var s = d.getSummary();
  assertEq(s.declaredPlugins, 1, 'PD: 1 declared');
  assertEq(s.installedPlugins, 2, 'PD: 2 installed');
}

function testClear() {
  var d = new PluginDependency();
  d.declare('p1', ['p2']);
  d.markInstalled('p1', '1.0.0');
  var c = d.clear();
  assertEq(c.success, true, 'PD: clear');
  assertEq(d.getDependencies('p1').length, 0, 'PD: 0 deps');
  assertEq(Object.keys(d.installed).length, 0, 'PD: 0 installed');
}

testEmpty();
testDeclare();
testGetDependents();
testMarkInstalled();
testFindMissing();
testFindAllMissing();
testTopologicalSort();
testCycle();
testResolve();
testResolveAll();
testInstallOrder();
testMetrics();
testSummary();
testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
