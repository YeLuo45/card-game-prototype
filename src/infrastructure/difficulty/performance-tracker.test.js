'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'performance-tracker.js'), 'utf8'));
var PerformanceTracker = window.PerformanceTracker;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) <= (eps || 0.01), msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  // 1. Init
  var t = new PerformanceTracker();
  assertEq(typeof t.recordBattle, 'function', 'Tracker: init has recordBattle');
  assertEq(t.totalBattles, 0, 'Tracker: 0 battles initially');
  assertEq(t.totalWins, 0, 'Tracker: 0 wins initially');
  var initStats = t.getStats();
  assertEq(initStats.count, 0, 'Tracker: init stats count=0');
  assertClose(initStats.winRate, 0, 0.01, 'Tracker: init winRate=0');

  // 2. Record battles (chapters)
  t.recordBattle({ won: true, damage: 50, turns: 5, timeMs: 30000, chapter: 'ch1' });
  t.recordBattle({ won: false, damage: 0, turns: 3, timeMs: 15000, chapter: 'ch1' });
  t.recordBattle({ won: true, damage: 80, turns: 7, timeMs: 45000, chapter: 'ch2' });
  assertEq(t.totalBattles, 3, 'Tracker: 3 battles recorded');
  assertEq(t.totalWins, 2, 'Tracker: 2 wins');
  assertClose(t.getStats().winRate, 2/3, 0.01, 'Tracker: overall winRate=2/3');

  // Chapter stats
  var ch1Stats = t.getStats('ch1');
  assertEq(ch1Stats.count, 2, 'Tracker: ch1 has 2 battles');
  assertClose(ch1Stats.winRate, 0.5, 0.01, 'Tracker: ch1 winRate=0.5');
  assertClose(ch1Stats.avgDamage, 25, 0.01, 'Tracker: ch1 avgDmg=(50+0)/2=25');

  var ch2Stats = t.getStats('ch2');
  assertEq(ch2Stats.count, 1, 'Tracker: ch2 has 1 battle');
  assertClose(ch2Stats.avgDamage, 80, 0.01, 'Tracker: ch2 avgDmg=80');

  // 3. Invalid result
  var r1 = t.recordBattle(null);
  assertEq(r1.success, false, 'Tracker: null result rejected');
  var r2 = t.recordBattle({});
  assertEq(r2.success, true, 'Tracker: empty object accepted (defaults applied)');

  // 4. Rolling stats
  t.reset();
  for (var i = 0; i < 10; i++) {
    t.recordBattle({ won: i % 2 === 0, damage: 10 + i, turns: 3 + i, timeMs: 1000 * (i + 1) });
  }
  assertEq(t.battles.length, 10, 'Tracker: 10 in window');
  var roll5 = t.getRollingStats(5);
  assertEq(roll5.count, 5, 'Tracker: rolling window=5');
  // Last 5 battles: i=5..9 → damage 15,16,17,18,19 → avg=17
  assertClose(roll5.avgDamage, 17, 0.01, 'Tracker: rolling avgDmg last 5 = (15+16+17+18+19)/5=17');
  var rollDefault = t.getRollingStats();
  assertEq(rollDefault.count, 10, 'Tracker: rolling window default=windowSize=20');

  // 5. Struggling detection
  t.reset();
  assertEq(t.isStruggling(), false, 'Tracker: empty = not struggling');
  for (var j = 0; j < 4; j++) t.recordBattle({ won: false, damage: 10, turns: 5, timeMs: 5000 });
  assertEq(t.isStruggling(), false, 'Tracker: < 5 battles = not struggling');
  t.recordBattle({ won: false, damage: 10, turns: 5, timeMs: 5000 });
  assertEq(t.isStruggling(), true, 'Tracker: 5+ battles + 0% winRate = struggling');

  // 6. Signal
  t.reset();
  var sig0 = t.getSignal();
  assertEq(sig0.signal, 0, 'Tracker: empty signal=0');
  assertEq(sig0.reason, 'insufficient_data', 'Tracker: insufficient_data reason');

  t.reset();
  for (var k = 0; k < 6; k++) t.recordBattle({ won: false });
  var sigLow = t.getSignal();
  assertEq(sigLow.signal, -1, 'Tracker: 0% winRate signal=-1 (lower)');
  assertEq(sigLow.reason, 'low_winrate', 'Tracker: low_winrate reason');

  t.reset();
  for (var m = 0; m < 6; m++) t.recordBattle({ won: true });
  var sigHigh = t.getSignal();
  assertEq(sigHigh.signal, +1, 'Tracker: 100% winRate signal=+1 (raise)');
  assertEq(sigHigh.reason, 'high_winrate', 'Tracker: high_winrate reason');

  // 7. Report + reset
  t.reset();
  t.recordBattle({ won: true, damage: 100, turns: 4, chapter: 'chA' });
  var report = t.getReport();
  assertEq(report.totalBattles, 1, 'Tracker: report totalBattles=1');
  assertEq(report.chapters.length, 1, 'Tracker: report has 1 chapter');
  assertEq(report.chapters[0].chapter, 'chA', 'Tracker: chapter name chA');
  t.reset();
  assertEq(t.totalBattles, 0, 'Tracker: reset clears totalBattles');
  assertEq(Object.keys(t.byChapter).length, 0, 'Tracker: reset clears byChapter');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
