'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-index.js'), 'utf8'));
var MemoryIndex = window.MemoryIndex;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var idx = new MemoryIndex();
  assertEq(typeof idx.add, 'function', 'Index: init');
  idx.add({ id: 'd1', content: 'dragon attack wins' });
  idx.add({ id: 'd2', content: 'dragon lore' });
  idx.add({ id: 'd3', content: 'unrelated text' });
  assertEq(Object.keys(idx.docs).length, 3, 'Index: 3 docs');
  assertEq(idx.query('dragon').length, 2, 'Index: dragon=2');
  assertEq(idx.query('attack').length, 1, 'Index: attack=1');
  assertEq(idx.query('missing').length, 0, 'Index: missing=0');
  var qa = idx.queryAll(['dragon', 'attack']);
  assertEq(qa[0].doc.id, 'd1', 'Index: multi-term top d1');
  assertEq(idx.getDoc('d1').content, 'dragon attack wins', 'Index: getDoc');
  assertEq(idx.remove('d1'), true, 'Index: remove d1');
  assertEq(idx.query('dragon').length, 1, 'Index: post-remove dragon=1');
  assertEq(idx.remove('nonexist'), false, 'Index: remove nonexist');
  assertEq(idx.add({ content: 'no id' }), false, 'Index: no id fails');
  idx.build();
  assertEq(idx.getStats().builds, 1, 'Index: build counter');
  var st = idx.getStats();
  assertEq(st.docs, 2, 'Index: stats docs=2');
  assert(st.terms > 0, 'Index: stats terms>0');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
