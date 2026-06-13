'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'memory-decay-policy.js'), 'utf8'));
var DreamMemoryStore = window.DreamMemoryStore;
var MemoryDecayPolicy = window.MemoryDecayPolicy;
var DECAY_CURVE = window.DECAY_CURVE;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  // Init
  var p = new MemoryDecayPolicy();
  assertEq(typeof p.applyTo, 'function', 'Decay: init');
  assertEq(p.curve, 'ebbinghaus', 'Decay: default curve');
  assertEq(p.getStats().layerCount, 5, 'Decay: 5 layer configs');

  // L0 never decays
  var l0 = { layer: 'L0', importance: 0.5, createdAt: 0 };
  var r0 = p.retentionAt(l0, 365 * 24 * 60 * 60 * 1000);
  assertEq(r0, 1.0, 'Decay: L0 stays at 1.0');

  // L4 (1 week) at age 1 week → retention = 0.5 (ebbinghaus)
  var l4 = { layer: 'L4', importance: 0.5, createdAt: 0 };
  var r4 = p.retentionAt(l4, 7 * 24 * 60 * 60 * 1000);
  assertClose(r4, 0.5, 0.01, 'Decay: L4 1week ≈ 0.5');

  // L4 at age 2 weeks → retention ≈ 0.25
  var r4b = p.retentionAt(l4, 14 * 24 * 60 * 60 * 1000);
  assertClose(r4b, 0.25, 0.01, 'Decay: L4 2week ≈ 0.25');

  // Importance weighting: high importance decays slower
  var hi = { layer: 'L4', importance: 1.0, createdAt: 0 };
  var lo = { layer: 'L4', importance: 0.0, createdAt: 0 };
  var rhi = p.retentionAt(hi, 7 * 24 * 60 * 60 * 1000);
  var rlo = p.retentionAt(lo, 7 * 24 * 60 * 60 * 1000);
  assert(rhi > rlo, 'Decay: high importance > low importance');

  // Floor
  var p2 = new MemoryDecayPolicy({ retentionFloor: 0.05 });
  var ancient = { layer: 'L4', importance: 0.0, createdAt: 0 };
  var rf = p2.retentionAt(ancient, 365 * 24 * 60 * 60 * 1000);
  assert(rf >= 0.05, 'Decay: floor respected');

  // applyTo mutates entry
  var ent = { layer: 'L4', importance: 0.5, createdAt: 0, decayFactor: 1.0 };
  p.applyTo(ent, 0);
  assertClose(ent.decayFactor, 1.0, 0.01, 'Decay: t=0 → 1.0');
  p.applyTo(ent, 7 * 24 * 60 * 60 * 1000);
  assertClose(ent.decayFactor, 0.5, 0.01, 'Decay: 1week → 0.5');

  // shouldForget
  assertEq(p.shouldForget(ent, 7 * 24 * 60 * 60 * 1000), false, 'Decay: half-life not forgotten');
  assertEq(p.shouldForget({ layer: 'L4', importance: 0.0, createdAt: 0 }, 1000 * 365 * 24 * 60 * 60 * 1000), true, 'Decay: very old forgotten');

  // applyToStore: integrates with DreamMemoryStore
  var store = new DreamMemoryStore();
  store.save('episodic', 'L4', 'm1', { sessionId: 's1' });
  store.save('episodic', 'L4', 'm2', { sessionId: 's1' });
  store.save('semantic', 'L2', 'm3');
  var rec = p.applyToStore(store);
  assertEq(rec.applied, 3, 'Decay: applied to 3 entries');
  assert(rec.removed === 0, 'Decay: fresh entries not removed');

  // Custom layer config
  p.setLayerConfig('L5', { halfLife: 1000, importanceFloor: 0.1, curve: DECAY_CURVE.LINEAR });
  assertEq(p.getLayerConfig('L5').curve, 'linear', 'Decay: custom layer');
  var l5 = { layer: 'L5', importance: 0.5, createdAt: 0 };
  var rl5 = p.retentionAt(l5, 500);
  assertClose(rl5, 0.5, 0.01, 'Decay: L5 linear half');

  // Curve variants
  var linear = new MemoryDecayPolicy({ curve: 'linear' });
  var lEnt = { layer: 'L4', importance: 0.5, createdAt: 0 };
  var rl = linear.retentionAt(lEnt, 3.5 * 24 * 60 * 60 * 1000);
  assertClose(rl, 0.5, 0.01, 'Decay: linear L4 half');

  var exp = new MemoryDecayPolicy({ curve: 'exponential' });
  var re = exp.retentionAt(lEnt, 7 * 24 * 60 * 60 * 1000);
  assertClose(re, 0.5, 0.01, 'Decay: exponential L4 half');

  var step = new MemoryDecayPolicy({ curve: 'step' });
  var rs1 = step.retentionAt(lEnt, 0.1 * 7 * 24 * 60 * 60 * 1000);
  assertEq(rs1, 1.0, 'Decay: step early = 1.0');
  var rs2 = step.retentionAt(lEnt, 0.6 * 7 * 24 * 60 * 60 * 1000);
  assertEq(rs2, 0.3, 'Decay: step mid = 0.3');

  var power = new MemoryDecayPolicy({ curve: 'power' });
  var rp = power.retentionAt(lEnt, 7 * 24 * 60 * 60 * 1000);
  assertClose(rp, 0.5, 0.01, 'Decay: power L4 half ≈ 0.5');

  // history
  assert(p.getPolicyHistory().length > 0, 'Decay: history tracked');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
