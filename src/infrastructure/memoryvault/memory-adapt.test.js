'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-adapt.js'), 'utf8'));
var MemoryAdapt = window.MemoryAdapt;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }
{
  var a = new MemoryAdapt();
  assertEq(typeof a.detectContext, 'function', 'Adapt: init');
  var c1 = a.detectContext({ battleHp: 20 });
  assertEq(c1.context, 'critical', 'Adapt: critical');
  assertClose(c1.urgency, 0.9, 0.01, 'Adapt: urgency 0.9');
  var c2 = a.detectContext({ battleHp: 50 });
  assertEq(c2.context, 'warning', 'Adapt: warning');
  var c3 = a.detectContext({ timeOfDay: 'night' });
  assertEq(c3.context, 'night', 'Adapt: night');
  var c4 = a.detectContext({ questActive: true });
  assertEq(c4.context, 'quest', 'Adapt: quest');
  var c5 = a.detectContext({});
  assertEq(c5.context, 'normal', 'Adapt: normal');
  // Adapt
  var p1 = a.adapt(c1);
  assertEq(p1.urgency, 'high', 'Adapt: high urgency');
  var p3 = a.adapt(c3);
  assertEq(p3.theme, 'dark', 'Adapt: dark theme');
  // Invalid
  var cBad = a.detectContext(null);
  assertEq(cBad.context, 'unknown', 'Adapt: unknown');
  // Stats
  var st = a.getStats();
  assert(st.adaptations > 0, 'Adapt: stats adaptations>0');
  assertEq(st.currentContext.context, 'night', 'Adapt: current=night');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
