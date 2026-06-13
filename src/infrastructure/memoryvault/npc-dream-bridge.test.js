'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'npc-dream-bridge.js'), 'utf8'));
var DreamMemoryStore = window.DreamMemoryStore;
var NPCDreamBridge = window.NPCDreamBridge;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var b = new NPCDreamBridge();
  assertEq(typeof b.share, 'function', 'Bridge: init');
  var ps = new DreamMemoryStore();
  var ns1 = new DreamMemoryStore();
  var bridge = new NPCDreamBridge(ps, { npcA: ns1 });
  bridge.registerNPC('npcB', new DreamMemoryStore());
  var r = bridge.share('unknownNPC', 'mem_x');
  assertEq(r.error, 'npc_not_found', 'Bridge: unknown npc');
  var mem = ps.save('episodic', 'L4', 'hello npc');
  var r2 = bridge.share('npcA', mem.id);
  assertEq(r2.success, true, 'Bridge: share success');
  assertEq(ns1.size(), 1, 'Bridge: npc got memory');
  var shared = bridge.getSharedMemories('npcA');
  assertEq(shared.length, 1, 'Bridge: 1 shared');
  var all = bridge.shareAll('npcA');
  assertEq(all.success, true, 'Bridge: shareAll success');
  bridge.setSharingEnabled(false);
  var blocked = bridge.share('npcA', mem.id);
  assertEq(blocked.error, 'sharing_disabled', 'Bridge: sharing disabled');
  var stats = bridge.getStats();
  assertEq(stats.npcCount, 2, 'Bridge: 2 NPCs');
  assert(stats.shareEvents > 0, 'Bridge: log has events');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
