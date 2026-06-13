'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-retrieval.js'), 'utf8'));
var MemoryRetrieval = window.MemoryRetrieval;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var r = new MemoryRetrieval();
  assertEq(typeof r.retrieve, 'function', 'Retrieval: init');
  assertEq(r.k, 10, 'Retrieval: default k=10');
  var docs = [
    { id: 'd1', content: 'dragon attack wins battle' },
    { id: 'd2', content: 'dragon lore and history' },
    { id: 'd3', content: 'unrelated text about cats' }
  ];
  var res = r.retrieve('dragon', docs);
  assertEq(res.length, 2, 'Retrieval: 2 matches (score>0)');
  assertEq(res[0].doc.id, 'd1', 'Retrieval: top by score');
  // 'no match' query (truly unrelated) with minScore > 0
  var rNoMin = new MemoryRetrieval({ minScore: 0.01 });
  var noRes = rNoMin.retrieve('xyzzy', docs);
  assertEq(noRes.length, 0, 'Retrieval: no match');
  var r2 = new MemoryRetrieval({ k: 1 });
  assertEq(r2.retrieve('dragon', docs).length, 1, 'Retrieval: k=1 limits');
  var r3 = new MemoryRetrieval({ minScore: 0.5 });
  assert(r3.retrieve('dragon', docs).length <= 2, 'Retrieval: minScore filters');
  var fused = r.fuse({
    lexical: [{ doc: docs[0], score: 0.8 }],
    semantic: [{ doc: docs[0], score: 0.6 }, { doc: docs[1], score: 0.5 }]
  });
  assert(fused.length > 0, 'Retrieval: fuse result');
  assertEq(fused[0].doc.id, 'd1', 'Retrieval: fused top d1');
  assertEq(r.retrieve('x', null).length, 0, 'Retrieval: null docs');
  r.retrieve('q', docs);
  assertEq(r.getStats().queries, 2, 'Retrieval: stats queries=2');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
