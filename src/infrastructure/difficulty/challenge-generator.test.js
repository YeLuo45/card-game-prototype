'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'challenge-generator.js'), 'utf8'));
var ChallengeGenerator = window.ChallengeGenerator;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var g = new ChallengeGenerator({ seed: 42 });
  assertEq(typeof g.generate, 'function', 'Gen: init has generate');

  // 1. Generate layout
  var layout = g.generate(50, 8);
  assertEq(layout.length, 8, 'Gen: length=8');
  assertEq(layout.nodes.length, 8, 'Gen: 8 nodes');
  assertEq(layout.nodes[layout.nodes.length - 1].type, 'boss', 'Gen: last node is boss');

  // 2. Valid types
  var validTypes = ['battle', 'elite', 'rest', 'shop', 'event', 'treasure', 'boss'];
  layout.nodes.forEach(function (n) {
    if (!validTypes.includes(n.type)) console.log('  INVALID TYPE: ' + n.type);
  });

  // 3. Validation
  var v1 = g.validateLayout(layout);
  assertEq(v1.valid, true, 'Gen: layout valid');

  // 4. Invalid: no boss at end
  var badLayout = { nodes: [{ type: 'battle' }, { type: 'rest' }, { type: 'battle' }] };
  var v2 = g.validateLayout(badLayout);
  assertEq(v2.valid, false, 'Gen: layout without boss rejected');

  // 5. Higher difficulty → more elites
  var easyLayout = g.generate(20, 10);
  var hardLayout = g.generate(80, 10);
  var easyElites = easyLayout.counts.elite || 0;
  var hardElites = hardLayout.counts.elite || 0;
  assert(hardElites >= easyElites, 'Gen: harder difficulty has more elites');

  // 6. Set seed
  g.setSeed(123);
  assertEq(g.seed, 123, 'Gen: setSeed ok');
  var l1 = g.generate(50, 8);
  g.setSeed(123);
  var l2 = g.generate(50, 8);
  assertEq(l1.nodes[0].type, l2.nodes[0].type, 'Gen: same seed → same layout');

  // 7. Report
  var rep = g.getReport();
  assert(rep.sampleLayout !== undefined, 'Gen: report has sample layout');
  assert(rep.validation !== undefined, 'Gen: report has validation');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
