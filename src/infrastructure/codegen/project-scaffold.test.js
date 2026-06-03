'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'project-scaffold.js'), 'utf8'));
var ProjectScaffold = window.ProjectScaffold;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var s = new ProjectScaffold(); assert(s.listLayouts().length >= 3, 'PS: layouts'); }
function testListLayouts() {
  var s = new ProjectScaffold();
  var l = s.listLayouts();
  assert(l.indexOf('node-lib') !== -1, 'PS: node-lib');
  assert(l.indexOf('web-vanilla') !== -1, 'PS: web');
}
function testGetLayout() {
  var s = new ProjectScaffold();
  var l = s.getLayout('node-lib');
  assert(l.files.length > 0, 'PS: has files');
  assertEq(s.getLayout('not_in'), null, 'PS: null');
}
function testAddLayout() {
  var s = new ProjectScaffold();
  var r = s.addLayout('custom', { files: [{ path: 'x.js', template: 'mainIndex' }] });
  assertEq(r.success, true, 'PS: add');
  // errors
  var e1 = s.addLayout('', { files: [] });
  assertEq(e1.error, 'invalid_name', 'PS: !name');
  var e2 = s.addLayout('a', {});
  assertEq(e2.error, 'invalid_layout', 'PS: !layout');
}
function testRegisterTemplate() {
  var s = new ProjectScaffold();
  var r = s.registerTemplate('my', '{{name}} content');
  assertEq(r.success, true, 'PS: reg');
  // errors
  var e1 = s.registerTemplate('', 'x');
  assertEq(e1.error, 'invalid_name', 'PS: !name');
  var e2 = s.registerTemplate('a', 123);
  assertEq(e2.error, 'invalid_content', 'PS: !content');
}
function testUnregisterTemplate() {
  var s = new ProjectScaffold();
  s.registerTemplate('a', 'x');
  var r = s.unregisterTemplate('a');
  assertEq(r.success, true, 'PS: unreg');
  assertEq(s.getTemplate('a'), null, 'PS: null');
  var r2 = s.unregisterTemplate('not_in');
  assertEq(r2.error, 'not_found', 'PS: not found');
}
function testListTemplates() {
  var s = new ProjectScaffold();
  s.registerTemplate('a', 'x');
  s.registerTemplate('b', 'y');
  assertEq(s.listTemplates().length, 2, 'PS: 2');
}
function testScaffold() {
  var s = new ProjectScaffold();
  var r = s.scaffold('node-lib', { name: 'TestProj', version: '2.0.0' });
  assertEq(r.success, true, 'PS: scaffold');
  assert(r.files.length > 0, 'PS: has files');
  var pkg = r.files.find(function (f) { return f.path === 'package.json'; });
  assert(pkg, 'PS: package.json');
  var pkgContent = JSON.parse(pkg.content);
  assertEq(pkgContent.name, 'testproj', 'PS: name');
  // not found
  var e = s.scaffold('not_in', {});
  assertEq(e.error, 'layout_not_found', 'PS: !layout');
}
function testScaffoldCustomTemplate() {
  var s = new ProjectScaffold();
  s.registerTemplate('header', '=== {{title}} ===');
  s.addLayout('custom', { files: [{ path: 'header.txt', template: 'header' }] });
  var r = s.scaffold('custom', { title: 'Hello' });
  assertEq(r.files[0].content, '=== Hello ===', 'PS: custom');
}
function testScaffoldWebVanilla() {
  var s = new ProjectScaffold();
  var r = s.scaffold('web-vanilla', { name: 'WebApp' });
  assert(r.files.find(function (f) { return f.path === 'index.html'; }), 'PS: html');
  assert(r.files.find(function (f) { return f.path === 'app.js'; }), 'PS: app.js');
}
function testValidate() {
  var s = new ProjectScaffold();
  var r = s.validate([{ path: 'a.js', content: 'x' }, { path: 'b.js', content: 'y' }]);
  assertEq(r.valid, true, 'PS: valid');
  assertEq(r.fileCount, 2, 'PS: 2');
  // invalid
  var r2 = s.validate([{ path: 'a.js' }]);
  assertEq(r2.valid, false, 'PS: !valid');
  // not array
  var r3 = s.validate(null);
  assertEq(r3.error, 'invalid_input', 'PS: null');
}
function testValidateHasIndex() {
  var s = new ProjectScaffold();
  var r = s.validate([{ path: 'index.js', content: '' }]);
  assertEq(r.hasIndex, true, 'PS: has index');
  var r2 = s.validate([{ path: 'a.js', content: '' }]);
  assertEq(r2.hasIndex, false, 'PS: !index');
}
function testMerge() {
  var s = new ProjectScaffold();
  var s1 = { files: [{ path: 'a.js', content: '1' }, { path: 'b.js', content: '2' }] };
  var s2 = { files: [{ path: 'b.js', content: 'overwritten' }, { path: 'c.js', content: '3' }] };
  var r = s.merge([s1, s2]);
  assertEq(r.count, 3, 'PS: 3');
  assertEq(r.files.find(function (f) { return f.path === 'b.js'; }).content, '2', 'PS: b from s1');
  // invalid
  var e = s.merge(null);
  assertEq(e.error, 'invalid_input', 'PS: null');
}
function testSimulateWrite() {
  var s = new ProjectScaffold();
  var r = s.simulateWrite([{ path: 'src/a.js', content: '123' }, { path: 'src/b.js', content: '4567' }]);
  assertEq(r.count, 2, 'PS: 2');
  assert(r.tree.src, 'PS: src dir');
  assertEq(r.tree.src['a.js'], 3, 'PS: a.js size');
  // invalid
  var e = s.simulateWrite(null);
  assertEq(e.error, 'invalid_input', 'PS: null');
}
function testMetrics() {
  var s = new ProjectScaffold();
  s.scaffold('node-lib', {});
  var m = s.getMetrics();
  assertEq(m.created, 1, 'PS: 1 created');
  assert(m.files > 0, 'PS: files');
}
function testClear() {
  var s = new ProjectScaffold();
  s.scaffold('node-lib', {});
  s.clear();
  assertEq(s.getMetrics().created, 0, 'PS: 0');
}

testEmpty(); testListLayouts(); testGetLayout(); testAddLayout(); testRegisterTemplate(); testUnregisterTemplate(); testListTemplates(); testScaffold(); testScaffoldCustomTemplate(); testScaffoldWebVanilla(); testValidate(); testValidateHasIndex(); testMerge(); testSimulateWrite(); testMetrics(); testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
