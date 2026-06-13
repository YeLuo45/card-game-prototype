'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-learn.js'), 'utf8'));
var MemoryLearn = window.MemoryLearn;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }
{
  var l = new MemoryLearn();
  assertEq(typeof l.predictImportance, 'function', 'Learn: init');
  // No access → 0
  assertClose(l.predictImportance('m1'), 0, 0.01, 'Learn: 0 access = 0');
  l.record('m1', 'read');
  l.record('m1', 'read');
  l.record('m1', 'read');
  var s = l.predictImportance('m1');
  assert(s > 0, 'Learn: 3 access > 0');
  // More accesses → higher
  l.record('m1', 'read');
  l.record('m1', 'read');
  l.record('m1', 'read');
  l.record('m1', 'read');
  l.record('m1', 'read');
  l.record('m1', 'read');
  l.record('m1', 'read'); // total 10
  var s10 = l.predictImportance('m1');
  assert(s10 > s, 'Learn: more access → higher score');
  // Caching
  var s10b = l.predictImportance('m1');
  assertEq(s10, s10b, 'Learn: cached');
  // Top N
  l.record('m2', 'read');
  l.record('m3', 'read');
  l.record('m3', 'read');
  var top = l.topImportant(2);
  assertEq(top.length, 2, 'Learn: top 2');
  assertEq(top[0].id, 'm1', 'Learn: m1 most accessed');
  // Stats — m1:10 + m2:1 + m3:2 = 13
  var st = l.getStats();
  assertEq(st.accessLogSize, 13, 'Learn: stats size=13');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
