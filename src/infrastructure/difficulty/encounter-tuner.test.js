'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'encounter-tuner.js'), 'utf8'));
var EncounterTuner = window.EncounterTuner;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var t = new EncounterTuner();
  assertEq(typeof t.rollEncounter, 'function', 'Tuner: init has rollEncounter');

  // 1. Roll single encounter
  var enc = t.rollEncounter(1);
  assert(typeof enc === 'string', 'Tuner: single roll returns string');
  assertEq(t.lastEncounters.length, 1, 'Tuner: encounters tracked');

  // 2. Roll multiple encounters
  var encs = t.rollEncounter(10);
  assertEq(Array.isArray(encs), true, 'Tuner: 10 rolls returns array');
  assertEq(encs.length, 10, 'Tuner: 10 rolls length=10');
  assertEq(t.lastEncounters.length, 11, 'Tuner: total encounters=11');

  // 3. Set player skill
  t.setPlayerSkill(80);
  assertEq(t.playerSkill, 80, 'Tuner: skill updated');
  var adapted = t.getCurrentWeights();
  assert(adapted.elite >= 0.10, 'Tuner: high skill → elite weight >= base');

  // 4. Adapted weights sum to 1
  var sum = Object.values(adapted).reduce(function (a, b) { return a + b; }, 0);
  assert(Math.abs(sum - 1.0) < 0.01, 'Tuner: weights sum to ~1');

  // 5. Encounter stats
  t.rollEncounter(20);
  var stats = t.getEncounterStats();
  var total = Object.values(stats).reduce(function (a, b) { return a + b; }, 0);
  assert(total > 0, 'Tuner: stats have encounters');

  // 6. Lower skill → more rest
  t.reset();
  t.setPlayerSkill(20);
  var lowAdapted = t.getCurrentWeights();
  assert(lowAdapted.rest >= 0.15, 'Tuner: low skill → rest >= base');

  // 7. Report + reset
  var rep = t.getReport();
  assert(rep.baseWeights !== undefined, 'Tuner: report has baseWeights');
  t.reset();
  assertEq(t.lastEncounters.length, 0, 'Tuner: reset clears encounters');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
