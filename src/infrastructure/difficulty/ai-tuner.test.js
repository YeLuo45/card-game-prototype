'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'ai-tuner.js'), 'utf8'));
var AITuner = window.AITuner;
var ARMS = window.DIFFICULTY_ARMS;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var t = new AITuner();
  assertEq(typeof t.chooseArm, 'function', 'Tuner: init has chooseArm');
  assertEq(ARMS.length, 8, 'Tuner: 8 arms');

  // 1. Choose arm returns valid object
  var arm = t.chooseArm([1.0, 1.0]);
  assert(arm !== null && typeof arm.delta === 'number', 'Tuner: chooseArm returns valid arm');
  assertEq(t.lastChosenArm.id, arm.id, 'Tuner: lastChosenArm set');

  // 2. Recommend delta
  var rec = t.recommendDelta([1.0, 0.5]);
  assert(typeof rec.delta === 'number', 'Tuner: recommendDelta has delta');

  // 3. Update arm with reward
  var ok = t.update('harder', 1.0, [1.0, 1.0]);
  assertEq(ok, true, 'Tuner: update returns true');
  assertEq(t.history.length, 1, 'Tuner: history grows');

  // 4. Multiple updates accumulate
  for (var i = 0; i < 49; i++) t.update('harder', 1.0, [1.0, 1.0]);
  assertEq(t.history.length, 50, 'Tuner: history capped (still 50, not 100)');

  // 5. Update invalid arm
  var bad = t.update('nonexistent', 0.5);
  assertEq(bad, false, 'Tuner: invalid arm returns false');

  // 6. After many positive rewards on 'harder', recommend harder
  for (var j = 0; j < 100; j++) t.update('harder', 1.0, [1.5, 0.8]);
  var rec2 = t.recommendDelta([1.5, 0.8]);
  assert(rec2.delta >= 0, 'Tuner: after positive rewards delta non-negative');

  // 7. Report + reset
  var rep = t.getReport();
  assertEq(rep.historySize, t.history.length, 'Tuner: report historySize');
  assert(rep.armStats.length === 8, 'Tuner: report has 8 armStats');
  t.reset();
  assertEq(t.history.length, 0, 'Tuner: reset clears history');
  assertEq(t.lastChosenArm, null, 'Tuner: reset clears lastChosen');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
