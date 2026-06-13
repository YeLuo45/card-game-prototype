'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'player-profiler.js'), 'utf8'));
var PlayerProfiler = window.PlayerProfiler;
var DIMENSIONS = window.PLAYER_PROFILER_DIMENSIONS;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) <= (eps || 0.01), msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  // 1. Init default state
  var p = new PlayerProfiler();
  assertEq(typeof p.recordEvent, 'function', 'Profiler: init has recordEvent');
  assertEq(typeof p.getRadar, 'function', 'Profiler: init has getRadar');
  assertEq(DIMENSIONS.length, 6, 'Profiler: 6 dimensions');
  var initRadar = p.getRadar();
  assertEq(initRadar.skill, 50, 'Profiler: default skill=50');
  assertEq(initRadar.aggression, 50, 'Profiler: default aggression=50');
  assertEq(initRadar.caution, 50, 'Profiler: default caution=50');
  assertEq(initRadar.economy, 50, 'Profiler: default economy=50');
  assertEq(initRadar.exploration, 50, 'Profiler: default exploration=50');
  assertEq(initRadar.social, 50, 'Profiler: default social=50');

  // 2. Record events
  var r1 = p.recordEvent('battle_win');
  assertEq(r1.success, true, 'Profiler: recordEvent battle_win ok');
  assertEq(p.radar.skill, 53, 'Profiler: skill +3 from battle_win');
  assertEq(p.radar.aggression, 51, 'Profiler: aggression +1 from battle_win');

  p.recordEvent('boss_win');
  assertEq(p.radar.skill, 61, 'Profiler: skill +8 from boss_win (cumulative)');
  assertEq(p.radar.aggression, 55, 'Profiler: aggression +4 from boss_win');
  p.recordEvent('battle_win');
  p.recordEvent('battle_win');
  assertEq(p.radar.skill, 67, 'Profiler: skill 67 after 3 wins');

  // Unknown event
  var r2 = p.recordEvent('nonexistent_event');
  assertEq(r2.success, false, 'Profiler: unknown event rejected');
  assertEq(r2.error, 'unknown_event_type', 'Profiler: unknown_event_type error');

  // Invalid event type
  var r3 = p.recordEvent(null);
  assertEq(r3.success, false, 'Profiler: null event rejected');
  assertEq(r3.error, 'invalid_event_type', 'Profiler: invalid_event_type error');

  // 3. Radar integrity (returns copy)
  var radar = p.getRadar();
  assertEq(typeof radar, 'object', 'Profiler: radar is object');
  radar.skill = 999;
  assertEq(p.radar.skill, 67, 'Profiler: getRadar returns copy (not ref)');

  // 4. Archetype classification
  assertEq(p.classifyArchetype(), 'strategist', 'Profiler: skill-dominant = strategist');
  // Reset and test aggression archetype
  p.reset();
  for (var i = 0; i < 20; i++) p.recordEvent('card_attack');
  assertEq(p.radar.aggression, 70, 'Profiler: aggression 70 after 20 attacks');
  assertEq(p.classifyArchetype(), 'berserker', 'Profiler: aggression-dominant = berserker');

  // Balanced (no clear max)
  p.reset();
  assertEq(p.classifyArchetype(), 'balanced', 'Profiler: default = balanced');

  // 5. Segment by events + skill
  p.reset();
  assertEq(p.getSegment(), 'newcomer', 'Profiler: 0 events = newcomer');
  for (var ii = 0; ii < 35; ii++) p.recordEvent('battle_win');
  assertEq(p.totalRecorded, 35, 'Profiler: totalRecorded=35');
  assertEq(p.getSegment(), 'casual', 'Profiler: 30-99 events = casual');
  // Push to hardcore (>= 200 cumulative events + skill >= 75)
  for (var jj = 0; jj < 200; jj++) p.recordEvent('boss_win');
  assertEq(p.totalRecorded, 235, 'Profiler: totalRecorded=235');
  // Skill now 50 + (window capped boss_win × 8) = clamped to 100
  assertEq(p.radar.skill, 100, 'Profiler: skill clamped at 100');
  assertEq(p.getSegment(), 'hardcore', 'Profiler: 200+ events + skill 75+ = hardcore');

  // 6. Empty state report
  p.reset();
  var report = p.getReport();
  assertEq(report.eventCount, 0, 'Profiler: empty report eventCount=0');
  assertEq(report.archetype, 'balanced', 'Profiler: empty archetype=balanced');
  assertEq(report.segment, 'newcomer', 'Profiler: empty segment=newcomer');
  assertClose(report.mastery, 50, 0.01, 'Profiler: empty mastery=50');

  // 7. Reset clears all state
  p.reset();
  for (var k = 0; k < 5; k++) p.recordEvent('boss_win');
  assertEq(p.events.length, 5, 'Profiler: 5 events recorded');
  assertEq(p.radar.skill, 90, 'Profiler: skill=50+5*8=90');
  p.reset();
  assertEq(p.events.length, 0, 'Profiler: reset clears events');
  assertEq(p.radar.skill, 50, 'Profiler: reset clears radar');
  assertEq(p.radar.aggression, 50, 'Profiler: reset clears aggression');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
