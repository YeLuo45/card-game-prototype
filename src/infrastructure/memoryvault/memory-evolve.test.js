'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-evolve.js'), 'utf8'));
var MemoryEvolve = window.MemoryEvolve;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var e = new MemoryEvolve();
  assertEq(typeof e.learnSchema, 'function', 'Evolve: init');
  var entries = [
    { id: 'm1', type: 'episodic', value: 1 },
    { id: 'm2', type: 'semantic', value: 2 },
    { id: 'm3', type: 'episodic', value: 3 }
  ];
  var schema = e.learnSchema(entries);
  assertEq(schema.id.required, true, 'Evolve: id required');
  assertEq(schema.type.required, true, 'Evolve: type required');
  assertEq(schema.value.required, true, 'Evolve: value required');
  assertEq(e.generation, 1, 'Evolve: generation=1');
  // Re-learn
  e.learnSchema([{ x: 1, y: 2 }]);
  assertEq(e.generation, 2, 'Evolve: generation=2');
  // Empty
  assertEq(e.learnSchema([]), null, 'Evolve: empty = null');
  assertEq(e.learnSchema(null), null, 'Evolve: null = null');
  // Stats — 2 successful learnSchema (entries + [{x,y}])
  var st = e.getStats();
  assertEq(st.generation, 2, 'Evolve: stats gen=2');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
