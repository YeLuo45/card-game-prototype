'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'plugin-registry.js'), 'utf8'));
var PluginRegistry = window.PluginRegistry;
var PLUGIN_STATUS = window.PLUGIN_STATUS;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var r = new PluginRegistry();
  assertEq(r.size(), 0, 'PR: empty');
  var s = r.getSummary();
  assertEq(s.totalPlugins, 0, 'PR: 0 plugins');
}

function testRegister() {
  var r = new PluginRegistry();
  var x = r.register({ id: 'p1', name: 'Plugin1', category: 'ui', author: 'alice' });
  assertEq(x.success, true, 'PR: register p1');
  assertEq(r.size(), 1, 'PR: size 1');
  // duplicate
  var d = r.register({ id: 'p1' });
  assertEq(d.error, 'already_registered', 'PR: dup');
  // errors
  var e1 = r.register(null);
  assertEq(e1.error, 'invalid_plugin', 'PR: null');
  var e2 = r.register({});
  assertEq(e2.error, 'invalid_id', 'PR: no id');
  var e3 = r.register({ id: '' });
  assertEq(e3.error, 'invalid_id', 'PR: empty id');
  // full
  var r2 = new PluginRegistry({ maxPlugins: 1 });
  r2.register({ id: 'a' });
  var f = r2.register({ id: 'b' });
  assertEq(f.error, 'registry_full', 'PR: full');
}

function testDeregister() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', category: 'ui' });
  r.register({ id: 'p2', category: 'ui' });
  var d = r.deregister('p1');
  assertEq(d.success, true, 'PR: deregister');
  assertEq(r.size(), 1, 'PR: 1 left');
  var list = r.listByCategory('ui');
  assertEq(list.length, 1, 'PR: ui 1 left');
  var e = r.deregister('not_in');
  assertEq(e.error, 'not_found', 'PR: not found');
}

function testGet() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  var p = r.get('p1');
  assertEq(p.id, 'p1', 'PR: get p1');
  assert(r.has('p1'), 'PR: has p1');
  assert(!r.has('x'), 'PR: no x');
  assertEq(r.get('x'), null, 'PR: get null');
}

function testList() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', category: 'ui', author: 'a' });
  r.register({ id: 'p2', category: 'data', author: 'a' });
  r.register({ id: 'p3', category: 'ui', author: 'b' });
  var all = r.list();
  assertEq(all.length, 3, 'PR: 3 all');
  var ui = r.list({ category: 'ui' });
  assertEq(ui.length, 2, 'PR: 2 ui');
  var aa = r.list({ author: 'a' });
  assertEq(aa.length, 2, 'PR: 2 by a');
  var uia = r.list({ category: 'ui', author: 'a' });
  assertEq(uia.length, 1, 'PR: 1 ui+a');
  // tag filter
  r.register({ id: 'p4', category: 'misc', tags: ['fast'] });
  var fast = r.list({ tag: 'fast' });
  assertEq(fast.length, 1, 'PR: 1 fast');
}

function testListByCategory() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', category: 'ui' });
  r.register({ id: 'p2', category: 'ui' });
  r.register({ id: 'p3', category: 'data' });
  var ui = r.listByCategory('ui');
  assertEq(ui.length, 2, 'PR: ui 2');
  var data = r.listByCategory('data');
  assertEq(data.length, 1, 'PR: data 1');
  var none = r.listByCategory('none');
  assertEq(none.length, 0, 'PR: none 0');
}

function testListByAuthor() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', author: 'alice' });
  r.register({ id: 'p2', author: 'bob' });
  var a = r.listByAuthor('alice');
  assertEq(a.length, 1, 'PR: alice 1');
  var b = r.listByAuthor('bob');
  assertEq(b.length, 1, 'PR: bob 1');
}

function testSetStatus() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  var s = r.setStatus('p1', 'active');
  assertEq(s.success, true, 'PR: set active');
  assertEq(r.get('p1').status, 'active', 'PR: status active');
  assertEq(s.previous, 'registered', 'PR: prev registered');
  // invalid
  var e1 = r.setStatus('not_in', 'active');
  assertEq(e1.error, 'not_found', 'PR: not found');
  var e2 = r.setStatus('p1', 'invalid_status');
  assertEq(e2.error, 'invalid_status', 'PR: invalid');
}

function testUpdateMetadata() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  var u = r.updateMetadata('p1', { icon: 'icon.png', color: 'red' });
  assertEq(u.success, true, 'PR: update meta');
  var p = r.get('p1');
  assertEq(p.metadata.icon, 'icon.png', 'PR: icon');
  var e1 = r.updateMetadata('not_in', {});
  assertEq(e1.error, 'not_found', 'PR: not found');
  var e2 = r.updateMetadata('p1', 'not obj');
  assertEq(e2.error, 'invalid_metadata', 'PR: invalid');
}

function testSearch() {
  var r = new PluginRegistry();
  r.register({ id: 'card-shuffler', name: 'Card Shuffler', description: 'Shuffles cards', tags: ['cards', 'utility'] });
  r.register({ id: 'deck-builder', name: 'Deck Builder', description: 'Build decks', tags: ['cards', 'build'] });
  r.register({ id: 'auto-player', name: 'Auto Player', description: 'AI player', tags: ['ai'] });
  var cards = r.search('cards');
  assertEq(cards.length, 2, 'PR: 2 cards');
  var shuffle = r.search('shuffle');
  assertEq(shuffle.length, 1, 'PR: 1 shuffle');
  var noRes = r.search('xyz');
  assertEq(noRes.length, 0, 'PR: 0 no result');
  var e = r.search(null);
  assertEq(e.length, 0, 'PR: null search');
}

function testCategories() {
  var r = new PluginRegistry();
  r.register({ id: 'a', category: 'ui' });
  r.register({ id: 'b', category: 'data' });
  r.register({ id: 'c', category: 'ui' });
  var cats = r.categories();
  assertEq(cats.length, 2, 'PR: 2 cats');
  assert(cats.indexOf('ui') !== -1, 'PR: has ui');
  var auths = r.authors();
  // no author specified, so all go to 'unknown'
  assert(auths.length >= 1, 'PR: 1+ author');
}

function testHistory() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  r.setStatus('p1', 'active');
  r.deregister('p1');
  var h = r.getHistory();
  assertEq(h.length, 3, 'PR: 3 history');
  var types = h.map(function (e) { return e.type; });
  assert(types.indexOf('register') !== -1, 'PR: register in log');
  assert(types.indexOf('status_change') !== -1, 'PR: status in log');
  assert(types.indexOf('deregister') !== -1, 'PR: dereg in log');
  var limited = r.getHistory(1);
  assertEq(limited.length, 1, 'PR: limited');
}

function testExportImport() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  r.register({ id: 'p2' });
  var exp = r.exportRegistry();
  assertEq(typeof exp, 'string', 'PR: export');
  var parsed = JSON.parse(exp);
  assertEq(parsed.format, 'plugin-registry-v1', 'PR: format');
  var r2 = new PluginRegistry();
  var imp = r2.importRegistry(exp);
  assertEq(imp.success, true, 'PR: import');
  assertEq(r2.size(), 2, 'PR: 2 imported');
  // errors
  var e1 = r2.importRegistry(null);
  assertEq(e1.error, 'invalid_input', 'PR: null');
  var e2 = r2.importRegistry('not json');
  assertEq(e2.error, 'parse_error', 'PR: bad json');
  var e3 = r2.importRegistry('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'PR: bad format');
  // skip already registered
  r2.register({ id: 'p3' });
  r2.importRegistry(exp);
  assertEq(r2.size(), 3, 'PR: skip existing');
}

function testSummary() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', category: 'ui' });
  r.register({ id: 'p2', category: 'data' });
  r.setStatus('p1', 'active');
  r.setStatus('p2', 'loaded');
  var s = r.getSummary();
  assertEq(s.totalPlugins, 2, 'PR: 2 total');
  assertEq(s.statusDistribution.active, 1, 'PR: 1 active');
  assertEq(s.statusDistribution.loaded, 1, 'PR: 1 loaded');
  assertEq(s.categoryCount, 2, 'PR: 2 cats');
}

function testClear() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  r.register({ id: 'p2' });
  var c = r.clear();
  assertEq(c.success, true, 'PR: clear');
  assertEq(r.size(), 0, 'PR: 0 size');
  assertEq(r.categories().length, 0, 'PR: 0 cats');
}

function testConstants() {
  assertEq(PLUGIN_STATUS.REGISTERED, 'registered', 'PR: STATUS.REGISTERED');
  assertEq(PLUGIN_STATUS.ACTIVE, 'active', 'PR: STATUS.ACTIVE');
}

testEmpty();
testRegister();
testDeregister();
testGet();
testList();
testListByCategory();
testListByAuthor();
testSetStatus();
testUpdateMetadata();
testSearch();
testCategories();
testHistory();
testExportImport();
testSummary();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
