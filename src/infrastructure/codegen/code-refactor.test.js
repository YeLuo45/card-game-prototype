'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'code-refactor.js'), 'utf8'));
var CodeRefactor = window.CodeRefactor;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var r = new CodeRefactor(); assertEq(r.getMetrics().performed, 0, 'CR: 0'); }
function testRename() {
  var r = new CodeRefactor();
  var res = r.rename('var x = 1; x++; return x;', 'x', 'y');
  assertEq(res.success, true, 'CR: rename');
  assertEq(res.replacements, 3, 'CR: 3 replacements');
  assertEq(res.refactored, 'var y = 1; y++; return y;', 'CR: result');
  // word boundary (won't match prefix)
  var res2 = r.rename('var foo = 1; var foobar = 2;', 'foo', 'bar');
  assertEq(res2.replacements, 1, 'CR: word boundary');
  // errors
  var e1 = r.rename(null, 'x', 'y');
  assertEq(e1.error, 'invalid_source', 'CR: null src');
  var e2 = r.rename('code', '', 'y');
  assertEq(e2.error, 'invalid_old_name', 'CR: empty old');
  var e3 = r.rename('code', 'x', '');
  assertEq(e3.error, 'invalid_new_name', 'CR: empty new');
}
function testRenameRegex() {
  var r = new CodeRefactor();
  var res = r.rename('a1 a2 a10', 'a\\d+', 'b', { regex: true });
  assertEq(res.replacements, 3, 'CR: 3 regex');
  assertEq(res.refactored, 'b b b', 'CR: replaced');
}
function testExtractFunction() {
  var r = new CodeRefactor();
  var code = 'function outer() {\n  var a = 1;\n  var b = 2;\n  return a + b;\n}';
  var res = r.extractFunction(code, { name: 'compute', startLine: 1, endLine: 3, params: [] });
  assertEq(res.success, true, 'CR: extract');
  assert(res.refactored.indexOf('function compute') !== -1, 'CR: function exists');
  // errors
  var e1 = r.extractFunction(null, {});
  assertEq(e1.error, 'invalid_source', 'CR: null');
  var e2 = r.extractFunction('code', { startLine: 1, endLine: 2 });
  assertEq(e2.error, 'invalid_name', 'CR: !name');
  var e3 = r.extractFunction('code', { name: 'f', startLine: 0, endLine: 99 });
  assertEq(e3.error, 'out_of_range', 'CR: oor');
}
function testInlineVariable() {
  var r = new CodeRefactor();
  var code = 'var x = 42;\nvar y = x + 1;';
  var res = r.inlineVariable(code, 'x');
  assertEq(res.success, true, 'CR: inline');
  assert(res.refactored.indexOf('42 + 1') !== -1, 'CR: replaced');
  // not found
  var e1 = r.inlineVariable('var y = 1;', 'x');
  assertEq(e1.error, 'declaration_not_found', 'CR: !decl');
  // errors
  var e2 = r.inlineVariable(null, 'x');
  assertEq(e2.error, 'invalid_source', 'CR: null');
  var e3 = r.inlineVariable('code', null);
  assertEq(e3.error, 'invalid_var', 'CR: null var');
}
function testFormat() {
  var r = new CodeRefactor();
  var code = 'function f(){\nif(true){\nreturn 1;\n}\n}';
  var res = r.format(code);
  assertEq(res.success, true, 'CR: format');
  assert(res.refactored.indexOf('  if') !== -1, 'CR: indented');
  // errors
  var e = r.format(null);
  assertEq(e.error, 'invalid_source', 'CR: null');
}
function testMoveLines() {
  var r = new CodeRefactor();
  var code = 'a\nb\nc\nd';
  var res = r.moveLines(code, 0, 1, 3);
  assertEq(res.success, true, 'CR: move');
  // original was 'a\nb\nc\nd', after move: 'c\na\nb\nd'
  // 'a' is now at line 2 (index 2)
  assert(res.refactored.indexOf('a') > 0, 'CR: moved');
  assert(res.refactored.indexOf('d') > res.refactored.indexOf('a'), 'CR: order');
  // errors
  var e1 = r.moveLines('a\nb', 0, 5, 1);
  assertEq(e1.error, 'invalid_range', 'CR: !range');
  var e2 = r.moveLines(null, 0, 0, 1);
  assertEq(e2.error, 'invalid_source', 'CR: null');
}
function testReplace() {
  var r = new CodeRefactor();
  var res = r.replace('a b c', 'b', 'X');
  assertEq(res.success, true, 'CR: replace');
  assertEq(res.replacements, 1, 'CR: 1');
  assertEq(res.refactored, 'a X c', 'CR: result');
  // errors
  var e1 = r.replace(null, 'x', 'y');
  assertEq(e1.error, 'invalid_source', 'CR: null');
  var e2 = r.replace('a', 123, 'y');
  assertEq(e2.error, 'invalid_search', 'CR: !search');
  var e3 = r.replace('a', 'b', 123);
  assertEq(e3.error, 'invalid_replace', 'CR: !replace');
}
function testExtractConstant() {
  var r = new CodeRefactor();
  var res = r.extractConstant('var x = 3.14; var y = 3.14;', 3.14, 'PI');
  assertEq(res.success, true, 'CR: const');
  assertEq(res.replacements, 2, 'CR: 2');
  // errors
  var e1 = r.extractConstant(null, 1, 'X');
  assertEq(e1.error, 'invalid_source', 'CR: null');
  var e2 = r.extractConstant('code', 1, null);
  assertEq(e2.error, 'invalid_name', 'CR: !name');
}
function testDiff() {
  var r = new CodeRefactor();
  var res = r.diff('a\nb\nc', 'a\nB\nc');
  assertEq(res.modified, 1, 'CR: 1 mod');
  // not strings
  var e = r.diff(null, null);
  assertEq(e.error, 'invalid_input', 'CR: null');
}
function testHistory() {
  var r = new CodeRefactor();
  r.rename('a b', 'a', 'c');
  r.replace('x', 'x', 'y');
  var h = r.getHistory();
  assertEq(h.length, 2, 'CR: 2');
  assertEq(h[0].type, 'rename', 'CR: rename first');
}
function testMetrics() {
  var r = new CodeRefactor();
  r.rename('a', 'a', 'b');
  r.replace('c', 'c', 'd');
  var m = r.getMetrics();
  assertEq(m.performed, 2, 'CR: 2');
}
function testClear() {
  var r = new CodeRefactor();
  r.rename('a', 'a', 'b');
  r.clear();
  assertEq(r.getMetrics().performed, 0, 'CR: 0');
  assertEq(r.getHistory().length, 0, 'CR: 0 hist');
}

testEmpty(); testRename(); testRenameRegex(); testExtractFunction(); testInlineVariable(); testFormat(); testMoveLines(); testReplace(); testExtractConstant(); testDiff(); testHistory(); testMetrics(); testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
