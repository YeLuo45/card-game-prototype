'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-delegate.js'), 'utf8'));
var MemoryDelegate = window.MemoryDelegate;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var d = new MemoryDelegate();
  assertEq(typeof d.register, 'function', 'Delegate: init');
  var storeA = { _data: {}, save: function (id, v) { this._data[id] = v; return { id: id }; }, load: function (id) { return this._data[id]; } };
  var storeB = { _data: {}, save: function (id, v) { this._data[id] = 'B:' + v; return { id: id }; }, load: function (id) { return this._data[id]; } };
  d.register('player', storeA);
  d.register('npc', storeB);
  d.setDefault(storeA);
  // Route to player
  var r1 = d.route('player', 'm1', 'save', 'hello');
  assertEq(r1.id, 'm1', 'Delegate: routed to player');
  // Route to npc
  var r2 = d.route('npc', 'm1', 'save', 'world');
  assertEq(storeB._data['m1'], 'B:world', 'Delegate: npc store');
  // Default role
  var r3 = d.route('unknown', 'm2', 'save', 'default');
  assertEq(storeA._data['m2'], 'default', 'Delegate: default store');
  // No route
  var d2 = new MemoryDelegate();
  var r4 = d2.route('x', 'm1', 'save', 'v');
  assertEq(r4.error, 'no_route', 'Delegate: no route');
  // Invalid op
  var r5 = d.route('player', 'm1', 'delete_everything', 'v');
  assertEq(r5.error, 'invalid_op', 'Delegate: invalid op');
  // Stats
  var st = d.getStats();
  assertEq(st.roles, 2, 'Delegate: stats roles=2');
  assertEq(st.hasDefault, true, 'Delegate: has default');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
