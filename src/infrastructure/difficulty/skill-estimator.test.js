'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'skill-estimator.js'), 'utf8'));
var SkillEstimator = window.SkillEstimator;
var RANK_TIERS = window.SKILL_RANK_TIERS;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) <= (eps || 1), msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  // 1. Init
  var s = new SkillEstimator();
  assertEq(s.rating, 1200, 'Skill: default rating=1200');
  assertEq(s.battlesPlayed, 0, 'Skill: 0 battles');
  assertEq(s.uncertainty, 350, 'Skill: default uncertainty=350');

  // 2. Update rating — beat lower opponent → small gain; lose to higher → small loss
  var beforeRating = s.rating;
  var r1 = s.updateRating(1000, true);  // win vs weaker
  assertEq(r1.success, true, 'Skill: updateRating returns success');
  assert(s.rating > beforeRating, 'Skill: win vs weaker raises rating');
  assertClose(s.rating, beforeRating + Math.round(32 * (1 - s._expected(beforeRating, 1000))), 2, 'Skill: rating delta matches Elo formula');

  // Lose to stronger
  var r2 = s.updateRating(1500, false);
  assert(s.rating < r1.rating, 'Skill: loss to stronger lowers rating');

  // Win vs equal — +16 (k=32 × 0.5)
  s.reset();
  var r3 = s.updateRating(1200, true);
  assertClose(r3.rating, 1216, 1, 'Skill: win vs equal = +16 (k=32 × 0.5)');

  // 3. Rank mapping
  s.reset();
  assertEq(s.getRank().name, 'gold', 'Skill: rating 1200 = gold');
  s.rating = 500;
  assertEq(s.getRank().name, 'bronze', 'Skill: rating 500 = bronze');
  s.rating = 1700;
  assertEq(s.getRank().name, 'platinum', 'Skill: rating 1700 = platinum');
  s.rating = 2500;
  assertEq(s.getRank().name, 'master', 'Skill: rating 2500 = master');
  s.rating = 2900;
  assertEq(s.getRank().name, 'challenger', 'Skill: rating 2900 = challenger');

  // 4. Uncertainty decay
  s.reset();
  var u0 = s.uncertainty;
  s.updateRating(1200, true);
  assertEq(s.uncertainty, u0 - 5, 'Skill: uncertainty -5 per battle');
  for (var i = 0; i < 100; i++) s.updateRating(1200, true);
  assert(s.uncertainty >= 20, 'Skill: uncertainty clamped at >= 20');

  // 5. K-factor decay (after 30 battles)
  s.reset();
  for (var j = 0; j < 30; j++) s.updateRating(1200, true);
  var ratingAt30 = s.rating;
  s.updateRating(1200, true);  // 31st battle
  var delta31 = s.rating - ratingAt30;
  assert(delta31 < 16, 'Skill: K-factor decays after 30 battles (delta < 16)');

  // 6. Progress to next tier
  s.reset();
  s.rating = 1000;
  var prog1 = s.getProgress();
  assert(prog1 > 0 && prog1 < 1, 'Skill: progress 0-1 for non-max tier');
  s.rating = 2900;
  assertEq(s.getProgress(), 1.0, 'Skill: max tier progress=1.0');

  // 7. Confidence + Report + reset
  s.reset();
  assertEq(s.getConfidence(), 1 - 350/400, 'Skill: confidence=1-uncertainty/400');
  var report = s.getReport();
  assertEq(report.rank.ordinal, 3, 'Skill: report has rank with ordinal');
  assertEq(report.recentHistory.length, 0, 'Skill: empty history');
  s.updateRating(1200, true);
  s.updateRating(1300, false);
  report = s.getReport();
  assertEq(report.recentHistory.length, 2, 'Skill: report includes last 2 battles');
  assertEq(report.battlesPlayed, 2, 'Skill: 2 battles played');
  s.reset();
  assertEq(s.rating, 1200, 'Skill: reset returns to default');
  assertEq(s.battlesPlayed, 0, 'Skill: reset clears battles');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
