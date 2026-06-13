'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-reflect.js'), 'utf8'));
var MemoryReflect = window.MemoryReflect;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }
{
  var r = new MemoryReflect();
  assertEq(typeof r.record, 'function', 'Reflect: init');
  r.record('battle:low-hp', 'attack', 'died', false);
  r.record('battle:low-hp', 'attack', 'died', false);
  r.record('battle:full-hp', 'attack', 'won', true);
  assertEq(r.outcomes.length, 3, 'Reflect: 3 outcomes');
  assertEq(r.reflections.length, 2, 'Reflect: 2 reflections (failures)');
  // Get reflections
  var refl = r.getReflections();
  assertEq(refl[0].badDecision, 'attack', 'Reflect: bad decision');
  assert(refl[0].suggestedFix.indexOf('attack') !== -1, 'Reflect: suggested fix mentions attack');
  // Success rate
  assertClose(r.successRate(), 1/3, 0.01, 'Reflect: success rate ~ 1/3');
  // Stats
  var st = r.getStats();
  assertEq(st.outcomes, 3, 'Reflect: stats outcomes=3');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
