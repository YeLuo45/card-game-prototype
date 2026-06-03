'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'code-generator.js'), 'utf8'));
var CodeGenerator = window.CodeGenerator;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var g = new CodeGenerator();
  var m = g.getMetrics();
  assertEq(m.generated, 0, 'CG: 0');
}

function testSetLanguage() {
  var g = new CodeGenerator();
  var r = g.setLanguage('typescript');
  assertEq(r.success, true, 'CG: set');
  assertEq(g.language, 'typescript', 'CG: ts');
}

function testSetIndent() {
  var g = new CodeGenerator();
  g.setIndent('\t');
  assertEq(g.indent, '\t', 'CG: tab');
}

function testGenerateModule() {
  var g = new CodeGenerator();
  var code = g.generateModule({
    name: 'test',
    body: ['var x = 1;', 'var y = 2;'],
    exports: ['x', 'y']
  });
  assert(code.indexOf('module.exports') !== -1, 'CG: has exports');
  assert(code.indexOf('x = 1') !== -1, 'CG: has x');
}

function testGenerateClass() {
  var g = new CodeGenerator();
  var code = g.generateClass({
    name: 'Person',
    properties: [{ name: 'firstName', value: '' }, { name: 'age', value: 0 }],
    methods: [
      { name: 'greet', params: [], body: 'return "hi";' },
      { name: 'setAge', params: ['n'], body: 'this.age = n;' }
    ]
  });
  assert(code.indexOf('function Person') !== -1, 'CG: ctor');
  assert(code.indexOf('this.firstName') !== -1, 'CG: prop');
  assert(code.indexOf('Person.prototype.greet') !== -1, 'CG: method');
  assert(code.indexOf('Person.prototype.setAge') !== -1, 'CG: method 2');
}

function testGenerateClassExtends() {
  var g = new CodeGenerator();
  var code = g.generateClass({ name: 'Child', parent: 'Parent' });
  assert(code.indexOf('Child extends Parent') !== -1, 'CG: extends');
}

function testGenerateFunction() {
  var g = new CodeGenerator();
  var code = g.generateFunction({
    name: 'add',
    params: ['a', 'b'],
    body: 'return a + b;'
  });
  assertEq(code, 'function add (a, b) {\n  return a + b;\n}', 'CG: fn');
}

function testGenerateInterface() {
  var g = new CodeGenerator();
  var code = g.generateInterface({
    name: 'User',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'nickname', type: 'string', required: false, description: 'display name' }
    ]
  });
  assert(code.indexOf('@typedef {Object} User') !== -1, 'CG: typedef');
  assert(code.indexOf('@property {string} id') !== -1, 'CG: id');
  assert(code.indexOf('[optional]') !== -1, 'CG: optional');
}

function testGenerateCrud() {
  var g = new CodeGenerator();
  var code = g.generateCrud({
    name: 'User',
    fields: ['email', 'name']
  });
  assert(code.indexOf('function createUser') !== -1, 'CG: create');
  assert(code.indexOf('function getUser') !== -1, 'CG: get');
  assert(code.indexOf('function listUsers') !== -1, 'CG: list');
  assert(code.indexOf('function updateUser') !== -1, 'CG: update');
  assert(code.indexOf('function deleteUser') !== -1, 'CG: delete');
  assert(code.indexOf('users.push') !== -1, 'CG: push');
  assert(code.indexOf('module.exports') !== -1, 'CG: exports');
}

function testGenerateBatch() {
  var g = new CodeGenerator();
  var results = g.generateBatch([
    { name: 'A' },
    { name: 'B' }
  ], 'class');
  assertEq(results.length, 2, 'CG: 2');
  assert(results[0].code.indexOf('A') !== -1, 'CG: A in code');
  assert(results[1].code.indexOf('B') !== -1, 'CG: B in code');
  // invalid
  var e = g.generateBatch(null, 'class');
  assertEq(e.error, 'invalid_input', 'CG: null');
}

function testGenerateFile() {
  var g = new CodeGenerator();
  var code = g.generateFile({
    comment: 'helper file',
    class: { name: 'Helper' },
    functions: [{ name: 'util', params: [], body: 'return 1;' }],
    exports: ['Helper', 'util']
  });
  assert(code.indexOf('helper file') !== -1, 'CG: comment');
  assert(code.indexOf('Helper') !== -1, 'CG: helper');
  assert(code.indexOf('module.exports') !== -1, 'CG: exports');
}

function testFormatValue() {
  var g = new CodeGenerator();
  assertEq(g._formatValue('hi'), "'hi'", 'CG: str');
  assertEq(g._formatValue(42), '42', 'CG: num');
  assertEq(g._formatValue(true), 'true', 'CG: bool');
  assertEq(g._formatValue(null), 'null', 'CG: null');
  assertEq(g._formatValue([1, 2]), '[1, 2]', 'CG: arr');
  assertEq(g._formatValue({ a: 1 }), "{ a: 1 }", 'CG: obj');
  assertEq(g._formatValue(undefined), 'undefined', 'CG: undef');
}

function testMetrics() {
  var g = new CodeGenerator();
  g.generateFunction({ name: 'f' });
  g.generateClass({ name: 'C' });
  var m = g.getMetrics();
  assertEq(m.generated, 2, 'CG: 2');
  assert(m.lines > 0, 'CG: lines');
}

function testClear() {
  var g = new CodeGenerator();
  g.generateFunction({ name: 'f' });
  g.clear();
  assertEq(g.getMetrics().generated, 0, 'CG: 0');
}

function testGenerateModuleEmpty() {
  var g = new CodeGenerator();
  var code = g.generateModule({ name: 'm' });
  assert(code.indexOf('m.js') !== -1, 'CG: m.js');
}

testEmpty(); testSetLanguage(); testSetIndent(); testGenerateModule(); testGenerateClass(); testGenerateClassExtends(); testGenerateFunction(); testGenerateInterface(); testGenerateCrud(); testGenerateBatch(); testGenerateFile(); testFormatValue(); testMetrics(); testClear(); testGenerateModuleEmpty();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
