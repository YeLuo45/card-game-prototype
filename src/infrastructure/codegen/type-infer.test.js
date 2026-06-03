'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'type-infer.js'), 'utf8'));
var TypeInfer = window.TypeInfer;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var t = new TypeInfer(); assertEq(t.getSummary().totalTypes, 0, 'TI: 0'); }
function testInferPrimitive() {
  var t = new TypeInfer();
  assertEq(t.inferPrimitive('x'), 'string', 'TI: string');
  assertEq(t.inferPrimitive(42), 'integer', 'TI: integer');
  assertEq(t.inferPrimitive(3.14), 'number', 'TI: number');
  assertEq(t.inferPrimitive(true), 'boolean', 'TI: bool');
  assertEq(t.inferPrimitive(null), 'null', 'TI: null');
  assertEq(t.inferPrimitive(undefined), 'undefined', 'TI: undef');
  assertEq(t.inferPrimitive([]), 'array', 'TI: array');
  assertEq(t.inferPrimitive({}), 'object', 'TI: object');
  assertEq(t.inferPrimitive(function () {}), 'function', 'TI: fn');
}
function testInferFromValue() {
  var t = new TypeInfer();
  var r = t.inferFromValue({ a: 1, b: 'x' });
  assertEq(r.kind, 'object', 'TI: obj');
  assert(r.fields.a, 'TI: a');
  assert(r.fields.b, 'TI: b');
  // array
  var r2 = t.inferFromValue([1, 2, 3]);
  assertEq(r2.kind, 'array', 'TI: arr');
  assertEq(r2.element, 'integer', 'TI: int elem');
  // mixed array
  var r3 = t.inferFromValue([1, 'x']);
  assert(r3.element.indexOf('|') !== -1, 'TI: mixed');
  // nested
  var r4 = t.inferFromValue({ a: { b: 1 } });
  assertEq(r4.fields.a.kind, 'object', 'TI: nested');
  assertEq(r4.fields.a.fields.b.kind, 'integer', 'TI: deep');
}
function testInferFromFunction() {
  var t = new TypeInfer();
  var fn = function (a, b) { return a + b; };
  var r = t.inferFromFunction(fn);
  assertEq(r.kind, 'function', 'TI: fn');
  assertEq(r.params.length, 2, 'TI: 2 params');
  // no return
  var fn2 = function (x) { /* no return */ };
  var r2 = t.inferFromFunction(fn2);
  assertEq(r2.returns, 'unknown', 'TI: unknown ret');
  // not function
  var e = t.inferFromFunction(null);
  assertEq(e.error, 'invalid_function', 'TI: null');
}
function testDefine() {
  var t = new TypeInfer();
  var r = t.define('User', { kind: 'object', fields: { name: 'string' } });
  assertEq(r.success, true, 'TI: def');
  assertEq(t.get('User').kind, 'object', 'TI: kind');
  // errors
  var e1 = t.define('', {});
  assertEq(e1.error, 'invalid_name', 'TI: !name');
  var e2 = t.define('x', null);
  assertEq(e2.error, 'invalid_definition', 'TI: null def');
}
function testRemove() {
  var t = new TypeInfer();
  t.define('A', {});
  var r = t.remove('A');
  assertEq(r.success, true, 'TI: remove');
  assertEq(t.get('A'), null, 'TI: null');
  var r2 = t.remove('nope');
  assertEq(r2.error, 'not_found', 'TI: !found');
}
function testList() {
  var t = new TypeInfer();
  t.define('A', {});
  t.define('B', {});
  assertEq(t.list().length, 2, 'TI: 2');
}
function testCompatible() {
  var t = new TypeInfer();
  assertEq(t.compatible('string', 'string'), true, 'TI: same');
  assertEq(t.compatible('integer', 'number'), true, 'TI: int->num');
  assertEq(t.compatible('number', 'integer'), true, 'TI: num->int');
  assertEq(t.compatible('unknown', 'string'), true, 'TI: unknown');
  assertEq(t.compatible('any', 'string'), true, 'TI: any');
  assertEq(t.compatible('string', 'number'), false, 'TI: str!=num');
}
function testValidate() {
  var t = new TypeInfer();
  t.define('User', { kind: 'object', fields: { name: 'string', age: 'number' } });
  var r = t.validate({ name: 'a', age: 5 }, 'User');
  assertEq(r.valid, true, 'TI: valid');
  // missing
  var r2 = t.validate({ name: 'a' }, 'User');
  assertEq(r2.valid, false, 'TI: !valid');
  // type not found
  var r3 = t.validate({}, 'nope');
  assertEq(r3.error, 'type_not_found', 'TI: !type');
}
function testDefineInterface() {
  var t = new TypeInfer();
  var r = t.defineInterface('Config', {
    name: 'string',
    count: 'number',
    debug: { type: 'boolean', optional: true }
  });
  assertEq(r.success, true, 'TI: iface');
  assertEq(r.fields.name.type, 'string', 'TI: name str');
  assertEq(r.fields.debug.optional, true, 'TI: opt');
  // errors
  var e1 = t.defineInterface('', {});
  assertEq(e1.error, 'invalid_name', 'TI: !name');
  var e2 = t.defineInterface('x', null);
  assertEq(e2.error, 'invalid_schema', 'TI: !schema');
}
function testValidateInterface() {
  var t = new TypeInfer();
  t.defineInterface('User', { id: 'string', email: 'string', age: 'integer', admin: { type: 'boolean', optional: true } });
  var r = t.validateInterface({ id: '1', email: 'a@b.c', age: 5 }, 'User');
  assertEq(r.valid, true, 'TI: valid');
  // missing
  var r2 = t.validateInterface({ id: '1' }, 'User');
  assertEq(r2.valid, false, 'TI: !valid');
  assert(r2.errors[0].error === 'missing', 'TI: miss err');
  // type mismatch
  var r3 = t.validateInterface({ id: 1, email: 'a@b.c', age: 5 }, 'User');
  assertEq(r3.valid, false, 'TI: mismatch');
  // optional
  var r4 = t.validateInterface({ id: '1', email: 'a@b.c', age: 5 }, 'User');
  assertEq(r4.valid, true, 'TI: opt ok');
  // not found
  var r5 = t.validateInterface({}, 'nope');
  assertEq(r5.error, 'interface_not_found', 'TI: !found');
  // not object
  var r6 = t.validateInterface(null, 'User');
  assertEq(r6.valid, false, 'TI: !obj');
}
function testDefineGeneric() {
  var t = new TypeInfer();
  var r = t.defineGeneric('Container', ['T'], { kind: 'object' });
  assertEq(r.success, true, 'TI: generic');
  // errors
  var e1 = t.defineGeneric('', [], {});
  assertEq(e1.error, 'invalid_name', 'TI: !name');
  var e2 = t.defineGeneric('x', 'not arr', {});
  assertEq(e2.error, 'invalid_params', 'TI: !params');
  var e3 = t.defineGeneric('x', [], null);
  assertEq(e3.error, 'invalid_body', 'TI: !body');
}
function testMatchUnion() {
  var t = new TypeInfer();
  assertEq(t.matchUnion('x', ['string', 'number']), true, 'TI: str');
  assertEq(t.matchUnion(3.14, ['string', 'number']), true, 'TI: num');  // float, not int
  assertEq(t.matchUnion(true, ['string', 'number']), false, 'TI: bool');
  // not array
  assertEq(t.matchUnion('x', 'string'), false, 'TI: !arr');
}
function testMetrics() {
  var t = new TypeInfer();
  t.define('A', {});
  t.inferFromValue({ x: 1 });
  var m = t.getMetrics();
  assertEq(m.defined, 1, 'TI: 1 def');
  // inferences counts every inferFromValue call (including recursive on nested fields)
  // { x: 1 } -> outer object (1) + x field (1) = 2
  assertEq(m.inferences, 2, 'TI: 2 inf');
}
function testSummary() {
  var t = new TypeInfer();
  t.define('A', {});
  t.define('B', {});
  var s = t.getSummary();
  assertEq(s.totalTypes, 2, 'TI: 2');
}
function testClear() {
  var t = new TypeInfer();
  t.define('A', {});
  t.clear();
  assertEq(t.getSummary().totalTypes, 0, 'TI: 0');
}

testEmpty(); testInferPrimitive(); testInferFromValue(); testInferFromFunction(); testDefine(); testRemove(); testList(); testCompatible(); testValidate(); testDefineInterface(); testValidateInterface(); testDefineGeneric(); testMatchUnion(); testMetrics(); testSummary(); testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
