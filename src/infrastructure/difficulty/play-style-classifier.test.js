'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'play-style-classifier.js'), 'utf8'));
var PlayStyleClassifier = window.PlayStyleClassifier;
var ARCHETYPES = window.PLAY_STYLE_ARCHETYPES;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var c = new PlayStyleClassifier();
  assertEq(typeof c.classify, 'function', 'Style: init has classify');
  assertEq(c.listArchetypes().length, 5, 'Style: 5 archetypes');

  // 1. Classify aggressive radar
  var res1 = c.classify({ skill: 40, aggression: 90, caution: 30, economy: 50, exploration: 60, social: 40 });
  assertEq(res1.archetype, 'aggressive', 'Style: aggression 90 → aggressive');
  assert(res1.confidence > 0, 'Style: aggressive confidence > 0');

  // 2. Classify defensive radar
  var res2 = c.classify({ skill: 60, aggression: 25, caution: 90, economy: 55, exploration: 40, social: 60 });
  assertEq(res2.archetype, 'defensive', 'Style: caution 90 → defensive');

  // 3. Classify economist
  var res3 = c.classify({ skill: 55, aggression: 45, caution: 55, economy: 90, exploration: 50, social: 50 });
  assertEq(res3.archetype, 'economist', 'Style: economy 90 → economist');

  // 4. Classify explorer
  var res4 = c.classify({ skill: 50, aggression: 60, caution: 40, economy: 45, exploration: 90, social: 70 });
  assertEq(res4.archetype, 'explorer', 'Style: exploration 90 → explorer');

  // 5. Classify social
  var res5 = c.classify({ skill: 45, aggression: 35, caution: 55, economy: 50, exploration: 55, social: 90 });
  assertEq(res5.archetype, 'social', 'Style: social 90 → social');

  // 6. Learn samples + report
  c.reset();
  c.learn({ skill: 50, aggression: 90, caution: 30, economy: 50, exploration: 60, social: 40 });
  c.learn({ skill: 60, aggression: 25, caution: 90, economy: 55, exploration: 40, social: 60 });
  var rep = c.getReport();
  assertEq(rep.sampleSize, 2, 'Style: report sampleSize=2');
  assertEq(rep.archetypes.length, 5, 'Style: report has 5 archetypes');

  // 7. Get archetype profile + reset
  var profile = c.getArchetypeProfile('aggressive');
  assertEq(profile.name, 'aggressive', 'Style: profile.name correct');
  c.reset();
  assertEq(c.samples.length, 0, 'Style: reset clears samples');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
