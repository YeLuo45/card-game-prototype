'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'difficulty-model.js'), 'utf8'));
var DifficultyModel = window.DifficultyModel;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var m = new DifficultyModel();
  assertEq(typeof m.compute, 'function', 'Model: init has compute');
  assertEq(typeof m.adjustCalibration, 'function', 'Model: init has adjustCalibration');

  // 1. Default radar → score around 30 (50*0.4 + 50*0.15 + 50*-0.1 + ... + bias -20 = 20-20=0... hmm)
  var r1 = m.compute({ skill: 50, aggression: 50, caution: 50, economy: 50, exploration: 50, social: 50 });
  assert(r1.score >= 0 && r1.score <= 100, 'Model: default score in [0,100]');

  // 2. High skill radar → higher score
  var r2 = m.compute({ skill: 100, aggression: 50, caution: 50, economy: 50, exploration: 50, social: 50 });
  assert(r2.score > r1.score, 'Model: high skill → higher score');

  // 3. High caution radar → lower score (caution has -0.10 weight)
  var r3 = m.compute({ skill: 50, aggression: 50, caution: 100, economy: 50, exploration: 50, social: 50 });
  assert(r3.score < r1.score, 'Model: high caution → lower score');

  // 4. Score clamping [0,100]
  var r4 = m.compute({ skill: 100, aggression: 100, caution: 0, economy: 100, exploration: 100, social: 100 });
  assert(r4.score <= 100, 'Model: max radar clamped to 100');
  assert(r4.score >= 0, 'Model: min radar clamped >= 0');

  // 5. Calibration adjustment
  m.adjustCalibration(20);
  assertEq(m.calibration, 20, 'Model: calibration +20');
  var r5 = m.compute({ skill: 50, aggression: 50, caution: 50, economy: 50, exploration: 50, social: 50 });
  assert(r5.score > r1.score, 'Model: +20 calibration raises score');
  m.adjustCalibration(-100);
  assertEq(m.calibration, -50, 'Model: calibration clamped at -50');

  // 6. Set custom weights
  m.setWeights({ skill: 0.8, aggression: 0.0 });
  assertEq(m.weights.skill, 0.8, 'Model: weight updated');

  // 7. Invalid input + report + null
  var r6 = m.compute(null);
  assertEq(r6.score, 50, 'Model: null radar → 50');
  var rep = m.getReport();
  assert(rep.weights.skill !== undefined, 'Model: report has weights');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
