'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-type.js'), 'utf8'));
var MemoryType = window.MemoryType;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var t = new MemoryType();
  assertEq(t.isValid('episodic'), true, 'Type: episodic valid');
  assertEq(t.isValid('bogus'), false, 'Type: bogus invalid');
  assertEq(t.isLayer('L0'), true, 'Type: L0 valid');
  assertEq(t.isLayer('L9'), false, 'Type: L9 invalid');
  assertEq(t.assign('m1', 'semantic', 'L2').success, true, 'Type: assign');
  assertEq(t.assign('m2', 'bogus', 'L2').error, 'invalid_type', 'Type: invalid type');
  assertEq(t.assign('m3', 'semantic', 'L9').error, 'invalid_layer', 'Type: invalid layer');
  var a = t.getAssignment('m1');
  assertEq(a.type, 'semantic', 'Type: getAssignment type');
  assertEq(a.layer, 'L2', 'Type: getAssignment layer');
  assertEq(t.getAssignment('nope'), null, 'Type: missing');
  assert(JSON.stringify(t.filterByType('semantic', ['m1', 'm2', 'm3'])) === JSON.stringify(['m1']), 'Type: filterByType');
  assert(JSON.stringify(t.filterByLayer('L2', ['m1'])) === JSON.stringify(['m1']), 'Type: filterByLayer');
  assert(t.filterByType('bogus', []).length === 0, 'Type: invalid filter');
  var t2 = new MemoryType({ types: ['foo'] });
  assertEq(t2.isValid('foo'), true, 'Type: custom');
  t.assign('m4', 'emotional', 'L4');
  var st = t.getStats();
  assertEq(st.total, 2, 'Type: stats total=2');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
