'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'doc-generator.js'), 'utf8'));
var DocGenerator = window.DocGenerator;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var d = new DocGenerator(); assertEq(d.getSummary().total, 0, 'DG: 0'); }
function testAdd() {
  var d = new DocGenerator();
  var r = d.add({ name: 'greet', type: 'function' });
  assertEq(r.success, true, 'DG: add');
  // errors
  var e1 = d.add(null);
  assertEq(e1.error, 'invalid_entry', 'DG: null');
  var e2 = d.add({});
  assertEq(e2.error, 'name_required', 'DG: !name');
}
function testRemove() {
  var d = new DocGenerator();
  var r = d.add({ name: 'a' });
  d.remove(r.id);
  assertEq(d.get(r.id), null, 'DG: gone');
  var r2 = d.remove('not_in');
  assertEq(r2.error, 'not_found', 'DG: !found');
}
function testGet() {
  var d = new DocGenerator();
  d.add({ id: 'x', name: 'foo' });
  assertEq(d.get('x').name, 'foo', 'DG: foo');
  assertEq(d.get('nope'), null, 'DG: null');
}
function testList() {
  var d = new DocGenerator();
  d.add({ name: 'a', type: 'function' });
  d.add({ name: 'b', type: 'class' });
  assertEq(d.list().length, 2, 'DG: 2');
  assertEq(d.list({ type: 'function' }).length, 1, 'DG: 1 type');
}
function testSearch() {
  var d = new DocGenerator();
  d.add({ name: 'greet', description: 'say hello', tags: ['intro'] });
  d.add({ name: 'farewell', description: 'say bye', tags: ['end'] });
  assertEq(d.search('greet').length, 1, 'DG: 1');
  assertEq(d.search('say').length, 2, 'DG: 2');
  assertEq(d.search('intro').length, 1, 'DG: 1 tag');
  assertEq(d.search('nothing').length, 0, 'DG: 0');
}
function testGenerateJSDoc() {
  var d = new DocGenerator();
  d.add({
    name: 'add',
    type: 'function',
    description: 'add two numbers',
    params: [
      { name: 'a', type: 'number', description: 'first' },
      { name: 'b', type: 'number', description: 'second' }
    ],
    returns: { type: 'number', description: 'sum' },
    throws: [{ type: 'TypeError', description: 'if not numbers' }],
    examples: ['add(1, 2) // 3']
  });
  var jsdoc = d.generateJSDoc(d.list()[0].id);
  assert(jsdoc.indexOf('@param {number} a') !== -1, 'DG: param a');
  assert(jsdoc.indexOf('@param {number} b') !== -1, 'DG: param b');
  assert(jsdoc.indexOf('@returns {number}') !== -1, 'DG: returns');
  assert(jsdoc.indexOf('@throws {TypeError}') !== -1, 'DG: throws');
  assert(jsdoc.indexOf('@example') !== -1, 'DG: example');
  // null
  assertEq(d.generateJSDoc('nope'), null, 'DG: null');
}
function testGenerateMarkdown() {
  var d = new DocGenerator();
  d.add({ name: 'add', type: 'function', description: 'add', params: [{ name: 'a', type: 'number' }] });
  var md = d.generateMarkdown(d.list()[0].id);
  assert(md.indexOf('### add') !== -1, 'DG: h3');
  assert(md.indexOf('| a | number |') !== -1, 'DG: table');
}
function testGenerateIndex() {
  var d = new DocGenerator();
  d.add({ name: 'greet', type: 'function' });
  d.add({ name: 'User', type: 'class' });
  var idx = d.generateIndex();
  assert(idx.indexOf('# Documentation Index') !== -1, 'DG: title');
  assert(idx.indexOf('## function') !== -1, 'DG: type function');
  assert(idx.indexOf('## class') !== -1, 'DG: type class');
  // text format
  var idx2 = d.generateIndex({ format: 'text' });
  assert(idx2.indexOf('greet (function)') !== -1, 'DG: text');
}
function testListTypes() {
  var d = new DocGenerator();
  d.add({ name: 'a', type: 'function' });
  d.add({ name: 'b', type: 'class' });
  var t = d.listTypes();
  assertEq(t.length, 2, 'DG: 2');
}
function testMetrics() {
  var d = new DocGenerator();
  d.add({ name: 'a' });
  d.generateJSDoc(d.list()[0].id);
  var m = d.getMetrics();
  assertEq(m.entries, 1, 'DG: 1');
  assertEq(m.generated, 1, 'DG: 1 gen');
}
function testSummary() {
  var d = new DocGenerator();
  d.add({ name: 'a', type: 'function' });
  var s = d.getSummary();
  assertEq(s.total, 1, 'DG: 1');
}
function testClear() {
  var d = new DocGenerator();
  d.add({ name: 'a' });
  d.clear();
  assertEq(d.getSummary().total, 0, 'DG: 0');
}
function testMaxReached() {
  var d = new DocGenerator({ maxEntries: 2 });
  d.add({ name: 'a' });
  d.add({ name: 'b' });
  var r = d.add({ name: 'c' });
  assertEq(r.error, 'max_reached', 'DG: max');
}
function testJSDocWithDeprecated() {
  var d = new DocGenerator();
  d.add({ name: 'oldFn', deprecated: true, since: '1.0.0' });
  var jsdoc = d.generateJSDoc(d.list()[0].id);
  assert(jsdoc.indexOf('@deprecated') !== -1, 'DG: deprecated');
  assert(jsdoc.indexOf('@since 1.0.0') !== -1, 'DG: since');
}
function testJSDocSee() {
  var d = new DocGenerator();
  d.add({ name: 'a', see: ['Other.fn', 'Module.link'] });
  var jsdoc = d.generateJSDoc(d.list()[0].id);
  assert(jsdoc.indexOf('@see Other.fn') !== -1, 'DG: see 1');
  assert(jsdoc.indexOf('@see Module.link') !== -1, 'DG: see 2');
}

testEmpty(); testAdd(); testRemove(); testGet(); testList(); testSearch(); testGenerateJSDoc(); testGenerateMarkdown(); testGenerateIndex(); testListTypes(); testMetrics(); testSummary(); testClear(); testMaxReached(); testJSDocWithDeprecated(); testJSDocSee();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
