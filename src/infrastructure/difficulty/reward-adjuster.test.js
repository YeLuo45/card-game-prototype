'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'reward-adjuster.js'), 'utf8'));
var RewardAdjuster = window.RewardAdjuster;
var REWARD_TYPES = window.REWARD_TYPES;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var r = new RewardAdjuster();
  assertEq(REWARD_TYPES.length, 5, 'Reward: 5 reward types');

  // 1. Default compute: gold = round(50 * 1.5 * 1.4 * 0.8) = 84
  var c1 = r.compute(50);
  assertEq(c1.gold, 84, 'Reward: difficulty 50, neutral → gold 84');
  assertEq(c1.cards, 3, 'Reward: difficulty 50, neutral → cards 3');

  // 2. Struggling player (low winRate) gets MORE rewards
  r.setPlayerPerformance(0.1);
  var c2 = r.compute(50);
  assert(c2.gold > 100, 'Reward: struggling → more gold');

  // 3. Dominating player gets FEWER rewards
  r.setPlayerPerformance(0.95);
  var c3 = r.compute(50);
  assert(c3.gold < 100, 'Reward: dominating → less gold');

  // 4. Higher difficulty → more rewards (boost)
  r.setPlayerPerformance(0.5);
  var c4High = r.compute(80);
  var c4Low = r.compute(20);
  assert(c4High.gold > c4Low.gold, 'Reward: higher difficulty → more gold');

  // 5. computeForType
  r.setPlayerPerformance(0.5);
  var goldVal = r.computeForType('gold', 50);
  assert(goldVal > 0, 'Reward: gold type returns positive');
  assertEq(r.computeForType('invalid', 50), 0, 'Reward: invalid type returns 0');

  // 6. Cards always >= 1
  r.setPlayerPerformance(0.99);
  var cMin = r.compute(50);
  assert(cMin.cards >= 1, 'Reward: cards floor=1');

  // 7. Report
  var rep = r.getReport();
  assert(rep.baseValues.gold === 50, 'Reward: report base gold=50');
  assert(rep.samples.neutral_d50 !== undefined, 'Reward: report has neutral sample');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
