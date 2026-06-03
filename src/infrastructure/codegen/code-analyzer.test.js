'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'code-analyzer.js'), 'utf8'));
var CodeAnalyzer = window.CodeAnalyzer;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var a = new CodeAnalyzer(); assertEq(a.getMetrics().analyses, 0, 'CA: 0'); }
function testCountLines() {
  var a = new CodeAnalyzer();
  var r = a.countLines('a\nb\n\nc');
  assertEq(r.total, 4, 'CA: 4');
  assertEq(r.nonEmpty, 3, 'CA: 3');
  // comments
  var r2 = a.countLines('// comment\nvar x = 1;');
  assertEq(r2.comments, 1, 'CA: 1 comment');
  // null
  var e = a.countLines(null);
  assertEq(e.error, 'invalid_source', 'CA: null');
}
function testCyclomaticComplexity() {
  var a = new CodeAnalyzer();
  var r = a.cyclomaticComplexity('function f() { if (x) { return 1; } else { return 2; } }');
  assert(r.complexity >= 2, 'CA: > 1');
  // low
  var r2 = a.cyclomaticComplexity('function g() { return 1; }');
  assertEq(r2.level, 'low', 'CA: low');
  // high
  var complex = 'function h() { if (a) {} else if (b) {} for (i=0;i<10;i++) {} while (1) {} try {} catch (e) {} }';
  var r3 = a.cyclomaticComplexity(complex);
  assert(r3.complexity >= 5, 'CA: ' + r3.complexity);
  // not string/function
  var e = a.cyclomaticComplexity(123);
  assertEq(e.error, 'invalid_input', 'CA: !input');
}
function testFindFunctions() {
  var a = new CodeAnalyzer();
  var r = a.findFunctions('function foo() {} function bar(a, b) {}');
  assertEq(r.length, 2, 'CA: 2');
  assertEq(r[0].name, 'foo', 'CA: foo');
  assertEq(r[1].params.length, 2, 'CA: 2 params');
  // errors
  var e = a.findFunctions(null);
  assertEq(e.error, 'invalid_source', 'CA: null');
}
function testFindVariables() {
  var a = new CodeAnalyzer();
  var r = a.findVariables('var x = 1; let y = 2; const z = 3;');
  assertEq(r.length, 3, 'CA: 3');
  assertEq(r[0].keyword, 'var', 'CA: var');
}
function testFindImports() {
  var a = new CodeAnalyzer();
  var src = 'import { foo, bar } from "module1";\nimport Baz from "module2";';
  var r = a.findImports(src);
  assertEq(r.length, 2, 'CA: 2');
  assertEq(r[0].source, 'module1', 'CA: m1');
  assertEq(r[0].named[0], 'foo', 'CA: foo');
  assertEq(r[1].default, 'Baz', 'CA: Baz');
}
function testFindRequires() {
  var a = new CodeAnalyzer();
  var r = a.findRequires('var x = require("fs"); var y = require(\'./local\');');
  assertEq(r.length, 2, 'CA: 2');
  assertEq(r[0].source, 'fs', 'CA: fs');
  assertEq(r[1].source, './local', 'CA: local');
}
function testFindExports() {
  var a = new CodeAnalyzer();
  var r = a.findExports('module.exports = { a: 1 }; exports.foo = function () {};');
  assertEq(r[0].type, 'default', 'CA: default');
  assertEq(r[1].type, 'named', 'CA: named');
  assertEq(r[1].name, 'foo', 'CA: foo');
}
function testFindDependencies() {
  var a = new CodeAnalyzer();
  var r = a.findDependencies('import x from "es-mod"; var y = require("cjs-mod");');
  assertEq(r.length, 2, 'CA: 2');
  assertEq(r[0].kind, 'import', 'CA: import');
  assertEq(r[1].kind, 'require', 'CA: require');
}
function testQualityScore() {
  var a = new CodeAnalyzer();
  var r = a.qualityScore('var x = 1;\nvar y = 2;\nfunction f() { return x + y; }');
  assert(r.score > 0, 'CA: ' + r.score);
  // bad code
  var r2 = a.qualityScore('console.log("a");\n' + 'x'.repeat(200) + '\n// missing decomposition\n' + 'var unusedA = 1;\n' + 'var usedB = 2;');
  assert(r2.score < 100, 'CA: < 100');
  assertEq(r2.unusedVariables >= 1, true, 'CA: 1+ unused');
}
function testFindIssues() {
  var a = new CodeAnalyzer();
  var src = 'console.log("debug");\ndebugger;\n// TODO: fix\n' + 'x'.repeat(201);
  var issues = a.findIssues(src);
  assert(issues.length >= 3, 'CA: ' + issues.length);
  var types = issues.map(function (i) { return i.type; });
  assert(types.indexOf('console_log') !== -1, 'CA: log');
  assert(types.indexOf('debugger') !== -1, 'CA: debug');
  assert(types.indexOf('long_line') !== -1, 'CA: long');
}
function testEmptyCatch() {
  var a = new CodeAnalyzer();
  var src = 'try { doStuff(); } catch (e) {}';
  var issues = a.findIssues(src);
  var empty = issues.find(function (i) { return i.type === 'empty_catch'; });
  assert(empty, 'CA: empty catch');
}
function testAnalyze() {
  var a = new CodeAnalyzer();
  var src = 'var x = 1;\nfunction f() { return x; }\nmodule.exports = f;';
  var r = a.analyze(src);
  assertEq(r.success, true, 'CA: analyze');
  assert(r.result.lines.total >= 3, 'CA: lines');
  assert(r.result.functions.length > 0, 'CA: funcs');
  assert(r.result.exports.length > 0, 'CA: exports');
  // with complexity
  var r2 = a.analyze('function a() { if (x) return 1; }', { includeComplexity: true });
  assert(r2.result.complexity, 'CA: complexity');
  // invalid
  var e = a.analyze(null);
  assertEq(e.error, 'invalid_source', 'CA: null');
}
function testGetAnalysis() {
  var a = new CodeAnalyzer();
  var r = a.analyze('var x = 1;');
  assert(a.getAnalysis(r.id), 'CA: got');
  assertEq(a.getAnalysis('nope'), null, 'CA: null');
}
function testListAnalyses() {
  var a = new CodeAnalyzer();
  a.analyze('var x = 1;');
  a.analyze('var y = 2;');
  var l = a.listAnalyses();
  assertEq(l.length, 2, 'CA: 2');
}
function testMetrics() {
  var a = new CodeAnalyzer();
  a.analyze('var x = 1;');
  var m = a.getMetrics();
  assertEq(m.analyses, 1, 'CA: 1');
  assert(m.lines > 0, 'CA: lines');
}
function testClear() {
  var a = new CodeAnalyzer();
  a.analyze('x');
  a.clear();
  assertEq(a.getMetrics().analyses, 0, 'CA: 0');
  assertEq(a.listAnalyses().length, 0, 'CA: 0 list');
}

testEmpty(); testCountLines(); testCyclomaticComplexity(); testFindFunctions(); testFindVariables(); testFindImports(); testFindRequires(); testFindExports(); testFindDependencies(); testQualityScore(); testFindIssues(); testEmptyCatch(); testAnalyze(); testGetAnalysis(); testListAnalyses(); testMetrics(); testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
