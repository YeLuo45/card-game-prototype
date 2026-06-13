'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-share.js'), 'utf8'));
var MemoryShare = window.MemoryShare;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var s = new MemoryShare();
  assertEq(typeof s.grant, 'function', 'Share: init');
  s.grant('a1', 'm1', 'read');
  s.grant('a2', 'm1', 'write');
  s.grant('a3', '*', 'read');
  assertEq(s.canAccess('a1', 'm1', 'read'), true, 'Share: a1 read m1');
  assertEq(s.canAccess('a1', 'm1', 'write'), false, 'Share: a1 cannot write m1');
  assertEq(s.canAccess('a2', 'm1', 'write'), true, 'Share: a2 write m1');
  assertEq(s.canAccess('a3', 'anything', 'read'), true, 'Share: a3 wildcard read');
  assertEq(s.canAccess('unknown', 'm1', 'read'), false, 'Share: unknown no access');
  // Deny
  s.grant('a4', 'm1', 'deny');
  assertEq(s.canAccess('a4', 'm1', 'read'), false, 'Share: a4 denied');
  // Revoke
  assertEq(s.revoke('a1', 'm1'), true, 'Share: revoke');
  assertEq(s.canAccess('a1', 'm1', 'read'), false, 'Share: post-revoke denied');
  assertEq(s.revoke('a1', 'm1'), false, 'Share: revoke missing');
  // Lock
  var l1 = s.lock('a2', 'm1');
  assertEq(l1.success, true, 'Share: lock by a2');
  var l2 = s.lock('a3', 'm1');
  assertEq(l2.error, 'locked_by_other', 'Share: lock conflict');
  var ul = s.unlock('a2', 'm1');
  assertEq(ul.success, true, 'Share: unlock');
  var ulBad = s.unlock('a3', 'm1');
  assertEq(ulBad.error, 'not_owner', 'Share: unlock not owner');
  // Stats
  var st = s.getStats();
  assert(st.agents >= 1, 'Share: stats agents');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
