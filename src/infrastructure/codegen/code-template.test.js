'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'code-template.js'), 'utf8'));
var CodeTemplate = window.CodeTemplate;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var t = new CodeTemplate();
  assertEq(t.listTemplates().length, 0, 'CT: 0 templates');
}

function testRegister() {
  var t = new CodeTemplate();
  var r = t.register('greet', 'Hello {{name}}');
  assertEq(r.success, true, 'CT: register');
  assertEq(t.get('greet'), 'Hello {{name}}', 'CT: stored');
  // errors
  var e1 = t.register('', 'x');
  assertEq(e1.error, 'invalid_name', 'CT: !name');
  var e2 = t.register('a', 123);
  assertEq(e2.error, 'invalid_template', 'CT: !tpl');
}

function testUnregister() {
  var t = new CodeTemplate();
  t.register('a', 'x');
  var r = t.unregister('a');
  assertEq(r.success, true, 'CT: unregister');
  assertEq(t.get('a'), null, 'CT: gone');
  var r2 = t.unregister('not_in');
  assertEq(r2.error, 'not_found', 'CT: not found');
}

function testRender() {
  var t = new CodeTemplate();
  var r = t.render('Hello {{name}}', { name: 'World' });
  assertEq(r.success, true, 'CT: render');
  assertEq(r.text, 'Hello World', 'CT: text');
  // nested
  var r2 = t.render('{{a.b.c}}', { a: { b: { c: 'deep' } } });
  assertEq(r2.text, 'deep', 'CT: deep');
  // missing
  var r3 = t.render('Hi {{missing}}', {});
  assertEq(r3.text, 'Hi ', 'CT: empty missing');
}

function testRenderTemplate() {
  var t = new CodeTemplate();
  t.register('greet', 'Hello {{name}}');
  var r = t.renderTemplate('greet', { name: 'X' });
  assertEq(r.text, 'Hello X', 'CT: template');
  var r2 = t.renderTemplate('not_in', {});
  assertEq(r2.error, 'template_not_found', 'CT: not found');
}

function testRenderString() {
  var t = new CodeTemplate();
  var r = t.renderString('Hi {{n}}', { n: 'bob' });
  assertEq(r, 'Hi bob', 'CT: renderString');
}

function testFilters() {
  var t = new CodeTemplate();
  assertEq(t.render('{{x | upper}}', { x: 'hi' }).text, 'HI', 'CT: upper');
  assertEq(t.render('{{x | lower}}', { x: 'HI' }).text, 'hi', 'CT: lower');
  assertEq(t.render('{{x | trim}}', { x: '  hi  ' }).text, 'hi', 'CT: trim');
  assertEq(t.render('{{x | length}}', { x: 'abc' }).text, '3', 'CT: length');
  assertEq(t.render('{{x | json}}', { x: { a: 1 } }).text, '{"a":1}', 'CT: json');
  // chained
  assertEq(t.render('{{x | upper | trim}}', { x: '  hi  ' }).text, 'HI', 'CT: chained');
}

function testRegisterFilter() {
  var t = new CodeTemplate();
  var r = t.registerFilter('reverse', function (s) { return String(s).split('').reverse().join(''); });
  assertEq(r.success, true, 'CT: registerFilter');
  assertEq(t.render('{{x | reverse}}', { x: 'abc' }).text, 'cba', 'CT: reverse');
  // errors
  var e1 = t.registerFilter(null, function () {});
  assertEq(e1.error, 'invalid_name', 'CT: !name');
  var e2 = t.registerFilter('x', 'not fn');
  assertEq(e2.error, 'invalid_fn', 'CT: !fn');
}

function testHelpers() {
  var t = new CodeTemplate();
  t.registerHelper('double', function (x) { return x * 2; });
  assertEq(t.listHelpers()[0], 'double', 'CT: helper listed');
  var r = t.registerHelper('', function () {});
  assertEq(r.error, 'invalid_name', 'CT: !name');
  var r2 = t.registerHelper('x', null);
  assertEq(r2.error, 'invalid_fn', 'CT: !fn');
}

function testComments() {
  var t = new CodeTemplate();
  var r = t.render('a{# this is a comment #}b', {});
  assertEq(r.text, 'ab', 'CT: comment stripped');
}

function testListTemplates() {
  var t = new CodeTemplate();
  t.register('a', 'x');
  t.register('b', 'y');
  t.register('c', 'z');
  assertEq(t.listTemplates().length, 3, 'CT: 3');
}

function testGetMetrics() {
  var t = new CodeTemplate();
  t.register('a', 'x');
  t.registerHelper('h', function () {});
  var m = t.getMetrics();
  assertEq(m.templates, 1, 'CT: 1 tpl');
  assertEq(m.helpers, 1, 'CT: 1 helper');
  assert(m.filters > 0, 'CT: builtin filters');
}

function testClear() {
  var t = new CodeTemplate();
  t.register('a', 'x');
  t.registerFilter('rev', function (s) { return s.split('').reverse().join(''); });
  t.clear();
  assertEq(t.listTemplates().length, 0, 'CT: 0 tpl');
  // filters reset but builtin kept
  assertEq(t.render('{{x | upper}}', { x: 'hi' }).text, 'HI', 'CT: builtin kept');
  // custom filter gone
  assertEq(t.render('{{x | rev}}', { x: 'hi' }).text, 'hi', 'CT: rev pass-through (gone)');
}

function testNestedAccess() {
  var t = new CodeTemplate();
  var r = t.render('{{a.b}}', { a: { b: 'val' } });
  assertEq(r.text, 'val', 'CT: a.b');
  // undefined intermediate
  var r2 = t.render('{{a.x.y}}', { a: {} });
  assertEq(r2.text, '', 'CT: empty undefined');
}

function testInclude() {
  var t = new CodeTemplate();
  t.register('header', '=={{title}}==');
  var r = t.render('{% include header %}', { title: 'Hi' });
  assertEq(r.text, '==Hi==', 'CT: include');
}

function testMaxDepth() {
  var t = new CodeTemplate({ maxDepth: 3 });
  var tpl = '{% for x in items %}{{x}}{% endfor %}';
  var r = t.render(tpl, { items: [1, 2, 3, 4, 5] });
  // shallow case shouldn't hit limit
  assertEq(r.success, true, 'CT: !maxed');
}

testEmpty(); testRegister(); testUnregister(); testRender(); testRenderTemplate(); testRenderString(); testFilters(); testRegisterFilter(); testHelpers(); testComments(); testListTemplates(); testGetMetrics(); testClear(); testNestedAccess(); testInclude(); testMaxDepth();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
