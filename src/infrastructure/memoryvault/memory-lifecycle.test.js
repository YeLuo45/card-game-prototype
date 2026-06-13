'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-lifecycle.js'), 'utf8'));
var MemoryLifecycle = window.MemoryLifecycle;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var lc = new MemoryLifecycle();
  assertEq(typeof lc.create, 'function', 'LC: init');
  var c = lc.create('m1', { content: 'hello' });
  assertEq(c.success, true, 'LC: create success');
  assertEq(c.entry.state, 'active', 'LC: state active');
  var r = lc.read('m1');
  assertEq(r.content, 'hello', 'LC: read content');
  var u = lc.update('m1', { content: 'updated' });
  assertEq(u.success, true, 'LC: update success');
  assertEq(lc.read('m1').content, 'updated', 'LC: post-update read');
  lc.archive('m1');
  var archived = lc.listByState('archived');
  assertEq(archived.indexOf('m1') !== -1, true, 'LC: m1 archived');
  // Update archived fails
  var uf = lc.update('m1', { content: 'try' });
  assertEq(uf.error, 'not_active', 'LC: update archived fails');
  // Delete
  lc.create('m2', { content: 'to delete' });
  assertEq(lc.delete('m2'), true, 'LC: delete m2');
  assertEq(lc.read('m2'), null, 'LC: deleted read null');
  // No id
  assertEq(lc.create(null, {}).error, 'no_id', 'LC: no_id');
  // Stats
  lc.create('m3', {});
  var st = lc.getStats();
  assert(st.total >= 1, 'LC: stats total>=1');
  assert(st.historyCount > 0, 'LC: history tracked');
  // Delete missing
  assertEq(lc.delete('nope'), false, 'LC: delete missing');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
