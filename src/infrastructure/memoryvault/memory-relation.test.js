'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-relation.js'), 'utf8'));
var MemoryRelation = window.MemoryRelation;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var r = new MemoryRelation();
  assertEq(r.isValid('causal'), true, 'Rel: causal');
  assertEq(r.isValid('nonsense'), false, 'Rel: nonsense');
  assertEq(r.relations.length, 8, 'Rel: 8 relations');
  assertEq(r.validate('episodic', 'semantic', 'causal').valid, true, 'Rel: validate OK');
  assertEq(r.validate('episodic', 'semantic', 'nonsense').valid, false, 'Rel: invalid relation');
  r.allowTypePair('npc', 'npc', false);
  assertEq(r.validate('npc', 'npc', 'semantic').valid, false, 'Rel: pair rejected');
  r.allowTypePair('npc', 'episodic', true);
  assertEq(r.validate('npc', 'episodic', 'causal').valid, true, 'Rel: pair allowed');
  assertEq(r.add('m1', 'm2', 'causal').success, true, 'Rel: add success');
  assertEq(r.add('m1', 'm2', 'bogus').error, 'invalid_relation', 'Rel: invalid add');
  var r2 = new MemoryRelation({ relations: ['x', 'y'] });
  assertEq(r2.isValid('x'), true, 'Rel: custom');
  var st = r.getStats();
  assertEq(st.addCount, 1, 'Rel: stats addCount=1');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
