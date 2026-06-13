'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-audit.js'), 'utf8'));
var MemoryAudit = window.MemoryAudit;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var a = new MemoryAudit();
  assertEq(typeof a.log, 'function', 'Audit: init');
  a.log('login', 'user1', { ip: '127.0.0.1' });
  a.log('view', 'user1', { id: 'm1' });
  a.log('edit', 'user2', { id: 'm1', delta: '+1' });
  assertEq(a.entries.length, 3, 'Audit: 3 entries');
  assertEq(a.chain.length, 3, 'Audit: chain 3');
  // Verify integrity
  var v = a.verify();
  assertEq(v.valid, true, 'Audit: verify OK');
  assertEq(v.count, 3, 'Audit: verify count=3');
  // Tamper
  a.entries[1].action = 'tampered';
  var vt = a.verify();
  assertEq(vt.valid, false, 'Audit: tamper detected');
  // Filter
  a.entries[1].action = 'view';
  var logins = a.filter('login');
  assertEq(logins.length, 1, 'Audit: filter login=1');
  // Stats
  var st = a.getStats();
  assertEq(st.total, 3, 'Audit: stats total=3');
  assertEq(st.byAction.login, 1, 'Audit: byAction login=1');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
