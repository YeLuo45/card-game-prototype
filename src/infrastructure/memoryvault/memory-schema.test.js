'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-schema.js'), 'utf8'));
var MemorySchema = window.MemorySchema;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var s = new MemorySchema({ id: { type: 'string', required: true }, level: { type: 'number', min: 0, max: 100 } });
  assertEq(typeof s.validate, 'function', 'Schema: init');
  assertEq(s.validate({ id: 'm1', level: 50 }).valid, true, 'Schema: valid');
  assertEq(s.validate({ id: 'm1', level: 200 }).valid, false, 'Schema: max violation');
  assertEq(s.validate({ id: 'm1', level: -5 }).valid, false, 'Schema: min violation');
  assertEq(s.validate({ level: 50 }).valid, false, 'Schema: missing required');
  assertEq(s.validate({ id: 'm1' }).valid, true, 'Schema: optional missing OK');
  assertEq(s.validate({ id: 123, level: 50 }).valid, false, 'Schema: type mismatch');
  var s2 = new MemorySchema({ type: { type: 'string', enum: ['episodic', 'semantic'] } });
  assertEq(s2.validate({ type: 'episodic' }).valid, true, 'Schema: enum OK');
  assertEq(s2.validate({ type: 'invalid' }).valid, false, 'Schema: enum violation');
  var s3 = new MemorySchema({ name: { type: 'string', minLength: 3 } });
  assertEq(s3.validate({ name: 'ab' }).valid, false, 'Schema: minLength violation');
  assertEq(s3.validate({ name: 'abc' }).valid, true, 'Schema: minLength OK');
  assertEq(s.validate(null).valid, false, 'Schema: null invalid');
  s.validate({ id: 'x' });
  s.validate({});
  var st = s.getStats();
  assert(st.validations > 0, 'Schema: validations>0');
  assert(st.successRate < 1, 'Schema: successRate<1');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
