'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'difficulty-curve.js'), 'utf8'));
var DifficultyCurve = window.DifficultyCurve;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var c = new DifficultyCurve();
  assertEq(c.chapters, 10, 'Curve: default 10 chapters');
  assertEq(c.curveType, 'linear', 'Curve: default linear');

  // 1. Linear curve: chapter 1 = start, chapter 10 = end
  var ch1 = c.getTargetDifficulty(1, 50);
  assertEq(ch1, 25, 'Curve: ch1 linear=25');
  var ch10 = c.getTargetDifficulty(10, 50);
  assertEq(ch10, 90, 'Curve: ch10 linear=90');

  // 2. Skill adjustment: high skill → target = base * (skill/50)
  var ch5High = c.getTargetDifficulty(5, 100);
  assert(ch5High > 50, 'Curve: high skill boosts target');

  // 3. Exponential curve
  c.curveType = 'exponential';
  var exp5 = c.getTargetDifficulty(5, 50);
  var exp10 = c.getTargetDifficulty(10, 50);
  assertEq(exp10, 90, 'Curve: exponential ch10=90');

  // 4. Sigmoid curve
  c.curveType = 'sigmoid';
  var sig1 = c.getTargetDifficulty(1, 50);
  var sig10 = c.getTargetDifficulty(10, 50);
  assert(sig1 < sig10, 'Curve: sigmoid monotonic');

  // 5. Flow computation: skill 50, challenge 50 → flow
  var flow1 = c.computeFlow(50, 50);
  assertEq(flow1.state, 'flow', 'Curve: skill=challenge → flow');
  assertEq(flow1.isFlow, true, 'Curve: isFlow=true');

  // 6. Frustration: skill 30, challenge 100
  var flow2 = c.computeFlow(30, 100);
  assertEq(flow2.state, 'frustration', 'Curve: skill<<challenge → frustration');
  assertEq(flow2.recommendation, 'decrease_difficulty', 'Curve: recommendation=decrease');

  // 7. Boredom: skill 90, challenge 30
  var flow3 = c.computeFlow(90, 30);
  assertEq(flow3.state, 'boredom', 'Curve: skill>>challenge → boredom');

  // 8. Report
  var rep = c.getReport();
  assertEq(rep.fullCurve.length, 10, 'Curve: report has 10 chapters');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
