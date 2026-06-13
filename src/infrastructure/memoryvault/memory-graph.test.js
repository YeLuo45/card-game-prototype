'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-graph.js'), 'utf8'));
var MemoryGraph = window.MemoryGraph;
var RELATION_TYPE = window.RELATION_TYPE;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  // Init
  var g = new MemoryGraph();
  assertEq(typeof g.addNode, 'function', 'Graph: init');
  assertEq(g.hasNode('m1'), false, 'Graph: empty');

  // Add nodes
  var n1 = g.addNode('m1', 'episodic', 'L4');
  var n2 = g.addNode('m2', 'episodic', 'L4');
  var n3 = g.addNode('m3', 'semantic', 'L2');
  assertEq(g.hasNode('m1'), true, 'Graph: m1 added');
  assertEq(Object.keys(g.nodes).length, 3, 'Graph: 3 nodes');

  // Idempotent add
  var n1b = g.addNode('m1', 'episodic', 'L4', { foo: 'bar' });
  assertEq(n1b.getProperty('foo'), 'bar', 'Graph: idempotent add merges props');
  assertEq(Object.keys(g.nodes).length, 3, 'Graph: still 3 nodes');

  // Add edge: missing node
  var r0 = g.addEdge('m1', 'unknown', 'causal');
  assertEq(r0.error, 'to_not_found', 'Graph: to_not_found');

  var r1 = g.addEdge('unknown', 'm2', 'causal');
  assertEq(r1.error, 'from_not_found', 'Graph: from_not_found');

  // Self loop
  var r2 = g.addEdge('m1', 'm1', 'causal');
  assertEq(r2.error, 'self_loop', 'Graph: self_loop rejected');

  // Valid edge
  var r3 = g.addEdge('m1', 'm2', 'causal', 0.8);
  assertEq(r3.success, true, 'Graph: causal edge added');
  assertEq(g.edges.length, 1, 'Graph: 1 edge');

  // Multiple edges
  g.addEdge('m1', 'm3', 'semantic', 0.5);
  g.addEdge('m2', 'm3', 'causal', 0.7);
  assertEq(g.edges.length, 3, 'Graph: 3 edges');

  // getEdges from m1
  var e1 = g.getEdges('m1');
  assertEq(e1.length, 2, 'Graph: m1 has 2 outgoing');
  var eM3 = g.getIncomingEdges('m3');
  assertEq(eM3.length, 2, 'Graph: m3 has 2 incoming');

  // Cycle detection
  var g2 = new MemoryGraph();
  g2.addNode('a').constructor.name; // touch
  g2.addNode('a');
  g2.addNode('b');
  g2.addNode('c');
  g2.addEdge('a', 'b', 'causal');
  g2.addEdge('b', 'c', 'causal');
  var cycTry = g2.addEdge('c', 'a', 'causal');
  assertEq(cycTry.error, 'cycle_detected', 'Graph: cycle rejected');

  // Cycle allowed
  var g3 = new MemoryGraph({ allowCycles: true });
  g3.addNode('a');
  g3.addNode('b');
  g3.addEdge('a', 'b', 'causal');
  g3.addEdge('b', 'a', 'causal');
  assertEq(g3.edges.length, 2, 'Graph: cycles allowed when configured');

  // BFS traversal
  var g4 = new MemoryGraph();
  g4.addNode('a');
  g4.addNode('b');
  g4.addNode('c');
  g4.addNode('d');
  g4.addEdge('a', 'b', 'causal');
  g4.addEdge('b', 'c', 'causal');
  g4.addEdge('a', 'd', 'temporal');
  var tra = g4.traverse('a', { maxDepth: 2 });
  assertEq(tra[0], 'a', 'Graph: traverse starts at a');
  assert(tra.indexOf('b') !== -1, 'Graph: traverse includes b');
  assert(tra.indexOf('c') !== -1, 'Graph: traverse includes c at depth 2');
  assertEq(tra.indexOf('d') !== -1, true, 'Graph: traverse includes d');

  // Traverse with relation filter
  var traR = g4.traverse('a', { maxDepth: 2, relation: 'temporal' });
  assertEq(traR.indexOf('b'), -1, 'Graph: filter excludes b');
  assert(traR.indexOf('d') !== -1, 'Graph: filter includes d');

  // findPath
  var path = g4.findPath('a', 'c');
  assert(path !== null, 'Graph: path a->c exists');
  assertEq(path[0], 'a', 'Graph: path starts at a');
  assertEq(path[path.length - 1], 'c', 'Graph: path ends at c');

  var noPath = g4.findPath('d', 'a');
  assertEq(noPath, null, 'Graph: no path d->a');

  // getNeighbors grouped
  var neighbors = g4.getNeighbors('a');
  assertEq(Object.keys(neighbors.causal).length, 1, 'Graph: a has 1 causal neighbor');
  assertEq(neighbors.causal[0], 'b', 'Graph: a.causal = b');

  // findRelated (excludes self)
  var related = g4.findRelated('a', 1);
  assert(related.indexOf('a') === -1, 'Graph: related excludes self');
  assert(related.length === 2, 'Graph: a has 2 related at depth 1');

  // Remove edge
  var removed = g4.removeEdge('a', 'b', 'causal');
  assertEq(removed, 1, 'Graph: 1 edge removed');
  assertEq(g4.edges.length, 2, 'Graph: 2 edges left');

  // Remove node
  var rN = g4.removeNode('d');
  assertEq(rN, true, 'Graph: node removed');
  assertEq(g4.hasNode('d'), false, 'Graph: d gone');
  assertEq(g4.edges.length, 1, 'Graph: edges with d removed');

  // Stats
  var s = g4.getStats();
  assertEq(s.nodeCount, 3, 'Graph: stats nodeCount');
  assertEq(s.edgeCount, 1, 'Graph: stats edgeCount');

  // toJSON
  var j = g4.toJSON();
  assertEq(j.nodes.length, 3, 'Graph: JSON 3 nodes');
  assertEq(j.edges.length, 1, 'Graph: JSON 1 edge');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
