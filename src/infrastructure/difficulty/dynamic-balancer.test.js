'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'dynamic-balancer.js'), 'utf8'));
var DynamicBalancer = window.DynamicBalancer;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) <= (eps || 0.01), msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  var b = new DynamicBalancer();
  assertEq(b.currentEnemyHpMult, 1.0, 'Balancer: initial hpMult=1');
  assertEq(b.currentRewardMult, 1.0, 'Balancer: initial rewardMult=1');

  // 1. Player finds it too easy (pDiff < target) → enemy up, reward down
  b.balance(20);
  var m1 = b.getMultipliers();
  assert(m1.enemyHpMult > 1.0, 'Balancer: easy content → enemy HP > 1');
  assert(m1.rewardMult < 1.0, 'Balancer: easy content → reward < 1');

  // 2. Player finds it too hard (pDiff > target) → enemy down, reward up
  b.reset();
  b.balance(80);
  var m2 = b.getMultipliers();
  assert(m2.enemyHpMult < 1.0, 'Balancer: hard content → enemy HP < 1');
  assert(m2.rewardMult > 1.0, 'Balancer: hard content → reward > 1');

  // 3. Multipliers clamped
  b.reset();
  for (var i = 0; i < 100; i++) b.balance(0);
  var m3 = b.getMultipliers();
  assert(m3.enemyHpMult <= 2.0, 'Balancer: hpMult clamped at 2.0');
  assert(m3.rewardMult >= 0.5, 'Balancer: rewardMult clamped at 0.5');

  // 4. Apply to enemy (hard content → enemy down)
  b.reset();
  b.balance(80);
  var scaled = b.applyToEnemy({ name: 'goblin', hp: 30, damage: 8 });
  assert(scaled.hp < 30 || scaled.hp === 30, 'Balancer: hard content reduces or keeps enemy hp');
  assert(scaled.damage < 8 || scaled.damage === 8, 'Balancer: hard content reduces or keeps enemy damage');

  // 5. Apply to reward
  var scaledR = b.applyToReward({ type: 'gold', amount: 50, dropChance: 0.5 });
  assert(scaledR.amount > 50, 'Balancer: hard content boosts reward');

  // 6. Set target difficulty
  var ok = b.setTargetDifficulty(75);
  assertEq(ok, true, 'Balancer: setTarget ok');
  assertEq(b.targetDifficulty, 75, 'Balancer: targetDifficulty updated');

  // 7. Report + reset
  var rep = b.getReport();
  assert(rep.multipliers !== undefined, 'Balancer: report has multipliers');
  b.reset();
  assertEq(b.currentEnemyHpMult, 1.0, 'Balancer: reset restores hpMult');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
