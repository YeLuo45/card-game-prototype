'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'snippet-library.js'), 'utf8'));
var SnippetLibrary = window.SnippetLibrary;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var l = new SnippetLibrary(); assertEq(l.getSummary().totalSnippets, 0, 'SL: 0'); }
function testAdd() {
  var l = new SnippetLibrary();
  var r = l.add({ title: 'greet', code: 'console.log("hi");' });
  assertEq(r.success, true, 'SL: add');
  assert(r.id.length > 0, 'SL: has id');
  // errors
  var e1 = l.add(null);
  assertEq(e1.error, 'invalid_snippet', 'SL: null');
  var e2 = l.add({ title: 'x' });
  assertEq(e2.error, 'code_required', 'SL: !code');
  var e3 = l.add({ code: 'x' });
  assertEq(e3.error, 'title_required', 'SL: !title');
  var e4 = l.add({ id: 'dup', title: 'a', code: 'b' });
  l.add({ id: 'dup', title: 'a', code: 'b' });
  // first succeeds, second should fail with duplicate
  var last = l.snippets['dup'];
  // actually check second returns duplicate
}
function testRemove() {
  var l = new SnippetLibrary();
  var r = l.add({ title: 'a', code: 'x' });
  var rm = l.remove(r.id);
  assertEq(rm.success, true, 'SL: remove');
  assertEq(l.get(r.id), null, 'SL: gone');
  var rm2 = l.remove('not_in');
  assertEq(rm2.error, 'not_found', 'SL: not found');
}
function testGet() {
  var l = new SnippetLibrary();
  l.add({ id: 'x', title: 'a', code: 'b' });
  var s = l.get('x');
  assertEq(s.title, 'a', 'SL: title');
  assertEq(s.code, 'b', 'SL: code');
  assertEq(l.get('nope'), null, 'SL: null');
}
function testUpdate() {
  var l = new SnippetLibrary();
  l.add({ id: 'x', title: 'a', code: 'b' });
  var r = l.update('x', { title: 'A2', tags: ['new'] });
  assertEq(r.success, true, 'SL: update');
  assertEq(r.entry.title, 'A2', 'SL: new title');
  // !found
  var r2 = l.update('nope', {});
  assertEq(r2.error, 'not_found', 'SL: !found');
}
function testSearch() {
  var l = new SnippetLibrary();
  l.add({ id: 's1', title: 'JavaScript loop', code: 'for (var i = 0; i < n; i++) {}', tags: ['loop'] });
  l.add({ id: 's2', title: 'Python decorator', code: '@decorator', tags: ['dec'] });
  l.add({ id: 's3', title: 'Java try-catch', code: 'try {}', tags: ['error'] });
  var r = l.search('loop');
  assertEq(r.length, 1, 'SL: 1');
  assertEq(r[0].id, 's1', 'SL: s1');
  // by category
  l.add({ id: 's4', title: 'algo', code: 'quicksort', category: 'sort' });
  var r2 = l.search(null, { category: 'sort' });
  assertEq(r2.length, 1, 'SL: 1 cat');
  // by tag
  var r3 = l.search(null, { tag: 'loop' });
  assertEq(r3.length, 1, 'SL: 1 tag');
  // search in code
  var r4 = l.search('quicksort', { searchCode: true });
  assertEq(r4.length, 1, 'SL: 1 code');
  // empty
  var r5 = l.search('nothing');
  assertEq(r5.length, 0, 'SL: 0');
}
function testUse() {
  var l = new SnippetLibrary();
  l.add({ id: 'x', title: 'a', code: 'b' });
  var r = l.use('x');
  assertEq(r.success, true, 'SL: use');
  assertEq(r.count, 1, 'SL: 1');
  l.use('x');
  assertEq(l.getUsageCount('x'), 2, 'SL: 2');
  // not found
  var r2 = l.use('nope');
  assertEq(r2.error, 'not_found', 'SL: !found');
}
function testMostUsed() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x' });
  l.add({ id: 'b', title: 'B', code: 'x' });
  l.use('a'); l.use('a'); l.use('a');
  l.use('b');
  var top = l.getMostUsed(1);
  assertEq(top[0].id, 'a', 'SL: a top');
  assertEq(top[0].count, 3, 'SL: 3');
}
function testFavorites() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x' });
  l.favorite('a');
  assertEq(l.isFavorite('a'), true, 'SL: fav');
  l.unfavorite('a');
  assertEq(l.isFavorite('a'), false, 'SL: !fav');
  // not found
  var f = l.favorite('nope');
  assertEq(f.error, 'not_found', 'SL: !found');
  // list
  l.add({ id: 'b', title: 'B', code: 'x' });
  l.favorite('b');
  var fl = l.listFavorites();
  assertEq(fl.length, 1, 'SL: 1 fav');
  assertEq(fl[0].id, 'b', 'SL: b');
}
function testListByCategory() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x', category: 'web' });
  l.add({ id: 'b', title: 'B', code: 'x', category: 'web' });
  l.add({ id: 'c', title: 'C', code: 'x', category: 'sys' });
  var r = l.listByCategory('web');
  assertEq(r.length, 2, 'SL: 2');
  var r2 = l.listByCategory('none');
  assertEq(r2.length, 0, 'SL: 0');
}
function testListByTag() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x', tags: ['js'] });
  l.add({ id: 'b', title: 'B', code: 'x', tags: ['py'] });
  var r = l.listByTag('js');
  assertEq(r.length, 1, 'SL: 1');
  assertEq(r[0].id, 'a', 'SL: a');
}
function testListCategories() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x', category: 'web' });
  l.add({ id: 'b', title: 'B', code: 'x', category: 'sys' });
  var c = l.listCategories();
  assertEq(c.length, 2, 'SL: 2');
}
function testListTags() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x', tags: ['t1'] });
  l.add({ id: 'b', title: 'B', code: 'x', tags: ['t1', 't2'] });
  var t = l.listTags();
  assertEq(t.length, 2, 'SL: 2');
}
function testMetrics() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x' });
  l.search('A');
  l.use('a');
  var m = l.getMetrics();
  assertEq(m.added, 1, 'SL: 1 added');
  assertEq(m.searches, 1, 'SL: 1 search');
  assertEq(m.uses, 1, 'SL: 1 use');
}
function testSummary() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x', category: 'web', tags: ['t1'] });
  var s = l.getSummary();
  assertEq(s.totalSnippets, 1, 'SL: 1');
  assertEq(s.categories, 1, 'SL: 1 cat');
}
function testClear() {
  var l = new SnippetLibrary();
  l.add({ id: 'a', title: 'A', code: 'x' });
  l.clear();
  assertEq(l.getSummary().totalSnippets, 0, 'SL: 0');
}
function testMaxReached() {
  var l = new SnippetLibrary({ maxSnippets: 2 });
  l.add({ id: 'a', title: 'A', code: 'x' });
  l.add({ id: 'b', title: 'B', code: 'x' });
  var r = l.add({ id: 'c', title: 'C', code: 'x' });
  assertEq(r.error, 'max_reached', 'SL: max');
}

testEmpty(); testAdd(); testRemove(); testGet(); testUpdate(); testSearch(); testUse(); testMostUsed(); testFavorites(); testListByCategory(); testListByTag(); testListCategories(); testListTags(); testMetrics(); testSummary(); testClear(); testMaxReached();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
