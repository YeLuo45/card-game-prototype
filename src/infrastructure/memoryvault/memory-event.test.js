'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-event.js'), 'utf8'));
var MemoryEvent = window.MemoryEvent;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var e = new MemoryEvent();
  assertEq(typeof e.append, 'function', 'Event: init');
  e.append('create', { id: 'm1' });
  e.append('update', { id: 'm1', val: 1 });
  e.append('delete', { id: 'm2' });
  assertEq(e.events.length, 3, 'Event: 3 events');
  // Replay
  var s = e.replay();
  assertEq(s.create.id, 'm1', 'Event: replay create');
  // Filter
  var sf = e.replay('create');
  assertEq(sf.update, undefined, 'Event: filter excludes update');
  // Project
  var types = e.project(function (evt) { return evt.type; });
  assertEq(types[0], 'create', 'Event: project types');
  // Snapshot
  var snap = e.snapshot();
  assertEq(typeof snap.at, 'number', 'Event: snapshot at');
  assertEq(snap.state.create.id, 'm1', 'Event: snapshot state');
  assertEq(e.snapshots.length, 1, 'Event: 1 snapshot');
  // Stats
  var st = e.getStats();
  assertEq(st.eventCount, 3, 'Event: stats count=3');
  assertEq(st.byType.create, 1, 'Event: byType create=1');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
