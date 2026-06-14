'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'enemy-scaler.js'), 'utf8'));
var EnemyScaler = window.EnemyScaler;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var s = new EnemyScaler();
  assertEq(s.baseHp, 30, 'Scaler: default baseHp=30');

  // 1. Scale at difficulty 0
  var easy = s.scale('goblin', 0);
  assertEq(easy.hp, 15, 'Scaler: difficulty 0 → hp 0.5x=15');
  assertEq(easy.multiplier, 0.5, 'Scaler: multiplier=0.5 at diff 0');

  // 2. Scale at difficulty 100
  var hard = s.scale('goblin', 100);
  assertEq(hard.hp, 60, 'Scaler: difficulty 100 → hp 2x=60');

  // 3. Scale at difficulty 50 → multiplier 1.25, hp = round(30*1.25)=38 (JS round)
  var med = s.scale('goblin', 50);
  assertEq(med.multiplier, 1.25, 'Scaler: multiplier=1.25 at diff 50');
  assert(med.hp >= 37 && med.hp <= 38, 'Scaler: difficulty 50 → hp ~37-38');

  // 4. Batch scaling
  var batch = s.scaleBatch([
    { type: 'goblin', hp: 30, damage: 8 },
    { type: 'orc', hp: 50, damage: 12 }
  ], 70);
  assertEq(batch.length, 2, 'Scaler: batch length=2');
  assert(batch[0].hp > 30, 'Scaler: batch enemy 1 hp scaled up');

  // 5. Quadratic curve
  s.difficultyCurve = 'quadratic';
  var quad = s.scale('dragon', 50);
  assert(quad.multiplier < 1.25, 'Scaler: quadratic at 50 < linear (1.25)');
  s.difficultyCurve = 'linear';

  // 6. Get level
  assertEq(s.getLevel(15), 2, 'Scaler: level 15→2');
  assertEq(s.getLevel(95), 10, 'Scaler: level 95→10');
  assertEq(s.getLevel(0), 1, 'Scaler: level 0→1');

  // 7. Report
  var rep = s.getReport();
  assert(rep.scalingSamples.medium !== undefined, 'Scaler: report has medium sample');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
