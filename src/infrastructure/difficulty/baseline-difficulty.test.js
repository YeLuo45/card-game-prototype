'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'baseline-difficulty.js'), 'utf8'));
var BaselineDifficulty = window.BaselineDifficulty;
var MODES = window.DIFFICULTY_MODES;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var b = new BaselineDifficulty();
  assertEq(b.mode, 'normal', 'Baseline: default mode=normal');
  assertEq(b.listModes().length, 4, 'Baseline: 4 modes');

  // 1. Chapter 1 default
  var r1 = b.getChapterDifficulty(1);
  assertEq(r1.base, 25, 'Baseline: ch1 base=25');
  assertEq(r1.score, 25, 'Baseline: ch1 normal score=25');

  // 2. Chapter 10
  var r2 = b.getChapterDifficulty(10);
  assertEq(r2.base, 90, 'Baseline: ch10 base=90');

  // 3. Mode change → easy
  b.setMode('easy');
  assertEq(b.mode, 'easy', 'Baseline: setMode easy');
  var r3 = b.getChapterDifficulty(5);
  assert(r3.score < 52, 'Baseline: easy mode lowers score');

  // 4. Mode change → expert
  b.setMode('expert');
  var r4 = b.getChapterDifficulty(5);
  assert(r4.score > 52, 'Baseline: expert mode raises score');

  // 5. Override
  b.setOverride(5, 80);
  var r5 = b.getChapterDifficulty(5);
  assertEq(r5.base, 80, 'Baseline: override applied');

  // 6. Invalid mode
  assertEq(b.setMode('impossible'), false, 'Baseline: invalid mode rejected');

  // 7. Report
  var rep = b.getReport();
  assertEq(rep.chapters[1].base, 25, 'Baseline: report has chapter 1');
  assertEq(rep.overrides[5], 80, 'Baseline: report has override');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
