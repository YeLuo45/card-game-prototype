'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
})();
eval(fs.readFileSync(path.join(__dirname, 'bot-agent.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'bot-swarm.js'), 'utf8'));
var BotAgent = window.BotAgent;
var BotSwarm = window.BotSwarm;
var SWARM_TOPOLOGY = window.SWARM_TOPOLOGY;
var SWARM_MSG_TYPES = window.SWARM_MSG_TYPES;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function makeAgent(id, role) {
  return new BotAgent(id, { role: role || 'worker' });
}

function testEmpty() {
  var s = new BotSwarm();
  assertEq(s.size(), 0, 'BS: empty');
  assertEq(s.list().length, 0, 'BS: list empty');
  var stats = s.getStats();
  assertEq(stats.totalAgents, 0, 'BS: stats 0');
}

function testRegister() {
  var s = new BotSwarm();
  var a1 = makeAgent('a1');
  var r1 = s.register(a1);
  assertEq(r1.success, true, 'BS: register a1');
  assertEq(s.size(), 1, 'BS: size 1');
  assertEq(a1.swarm, s, 'BS: agent.swarm set');
  // duplicate
  var r2 = s.register(a1);
  assertEq(r2.error, 'already_registered', 'BS: dup');
  // errors
  var e1 = s.register(null);
  assertEq(e1.error, 'invalid_agent', 'BS: null agent');
  var e2 = s.register({});
  assertEq(e2.error, 'invalid_agent', 'BS: no id');
}

function testMaxAgents() {
  var s = new BotSwarm({ maxAgents: 2 });
  s.register(makeAgent('a1'));
  s.register(makeAgent('a2'));
  var r = s.register(makeAgent('a3'));
  assertEq(r.error, 'swarm_full', 'BS: full');
}

function testDeregister() {
  var s = new BotSwarm();
  s.register(makeAgent('a1'));
  s.register(makeAgent('a2'));
  var r = s.deregister('a1');
  assertEq(r.success, true, 'BS: deregister');
  assertEq(s.size(), 1, 'BS: size 1');
  assert(!s.has('a1'), 'BS: a1 gone');
  var e = s.deregister('nonexistent');
  assertEq(e.error, 'not_found', 'BS: not found');
}

function testGet() {
  var s = new BotSwarm();
  var a = makeAgent('a1');
  s.register(a);
  assertEq(s.get('a1'), a, 'BS: get a1');
  assert(s.has('a1'), 'BS: has a1');
  assert(!s.has('x'), 'BS: no x');
  assertEq(s.get('x'), null, 'BS: get null');
}

function testListByRole() {
  var s = new BotSwarm();
  s.register(makeAgent('a1', 'worker'));
  s.register(makeAgent('a2', 'queen'));
  s.register(makeAgent('a3', 'worker'));
  var workers = s.listByRole('worker');
  assertEq(workers.length, 2, 'BS: 2 workers');
  var queens = s.listByRole('queen');
  assertEq(queens.length, 1, 'BS: 1 queen');
  var none = s.listByRole('nonexistent');
  assertEq(none.length, 0, 'BS: 0 nonexistent');
}

function testPubSub() {
  var s = new BotSwarm();
  var a1 = makeAgent('a1');
  var a2 = makeAgent('a2');
  s.register(a1);
  s.register(a2);
  var sub1 = s.subscribe('alerts', 'a1');
  assertEq(sub1.success, true, 'BS: subscribe');
  var pub = s.publish('alerts', { msg: 'low_hp' }, 'a2');
  assertEq(pub.success, true, 'BS: publish');
  // a1 should have received it via signal
  var sigs = a1.readInbox('__swarm_alerts', 0);
  assert(sigs.length > 0, 'BS: a1 received');
  // a2 (sender) should not receive
  var sigs2 = a2.readInbox('__swarm_alerts', 0);
  assertEq(sigs2.length, 0, 'BS: a2 no receive');
  // errors
  var e1 = s.subscribe('', 'a1');
  assertEq(e1.error, 'invalid_channel', 'BS: empty channel');
  var e2 = s.subscribe('x', 'not_registered');
  assertEq(e2.error, 'agent_not_registered', 'BS: not registered');
  // empty channel publish
  var p2 = s.publish('no_channel', { x: 1 });
  assertEq(p2.delivered, 0, 'BS: empty channel 0');
  // unsubscribe
  var u1 = s.unsubscribe('alerts', 'a1');
  assertEq(u1.success, true, 'BS: unsub');
  var u2 = s.unsubscribe('alerts', 'a1');
  assertEq(u2.error, 'not_subscribed', 'BS: not subscribed');
  var u3 = s.unsubscribe('no_channel', 'a1');
  assertEq(u3.error, 'channel_not_found', 'BS: no channel');
}

function testDirectMessage() {
  var s = new BotSwarm();
  var a1 = makeAgent('a1');
  var a2 = makeAgent('a2');
  s.register(a1);
  s.register(a2);
  var r = s.send('a1', 'a2', { cmd: 'attack' });
  assertEq(r.success, true, 'BS: send');
  var sigs = a2.readInbox('__direct', 0);
  assert(sigs.length > 0, 'BS: a2 received direct');
  // errors
  var e1 = s.send('not', 'a2', {});
  assertEq(e1.error, 'sender_not_found', 'BS: no sender');
  var e2 = s.send('a1', 'not', {});
  assertEq(e2.error, 'recipient_not_found', 'BS: no recipient');
}

function testMulticast() {
  var s = new BotSwarm();
  s.register(makeAgent('a1'));
  s.register(makeAgent('a2'));
  s.register(makeAgent('a3'));
  var r = s.multicast('a1', ['a2', 'a3'], { cmd: 'defend' });
  assertEq(r.success, true, 'BS: multicast');
  assertEq(r.delivered, 2, 'BS: 2 delivered');
  // empty recipients
  var r2 = s.multicast('a1', [], {});
  assertEq(r2.delivered, 0, 'BS: 0 delivered');
  // invalid
  var e1 = s.multicast('a1', 'not array', {});
  assertEq(e1.error, 'invalid_recipients', 'BS: invalid');
  var e2 = s.multicast('not', ['a2'], {});
  assertEq(e2.error, 'sender_not_found', 'BS: no sender');
}

function testTopology() {
  var s = new BotSwarm();
  assertEq(s.getTopology(), 'mesh', 'BS: default mesh');
  var r = s.setTopology('star');
  assertEq(r.success, true, 'BS: set star');
  var r2 = s.setTopology('invalid');
  assertEq(r2.error, 'invalid_topology', 'BS: invalid');
  // neighbors
  s.register(makeAgent('a1'));
  s.register(makeAgent('a2'));
  s.register(makeAgent('a3'));
  var n = s.getNeighbors('a1');
  assertEq(n.neighbors.length, 2, 'BS: mesh 2 neighbors');
  s.setTopology('ring');
  var nr = s.getNeighbors('a1');
  assertEq(nr.neighbors.length, 2, 'BS: ring 2 neighbors');
  s.setTopology('star');
  var ns = s.getNeighbors('a1');
  // a1 is hub
  assertEq(ns.neighbors.length, 2, 'BS: star hub 2');
  var ns2 = s.getNeighbors('a2');
  assertEq(ns2.neighbors.length, 1, 'BS: star leaf 1');
  // hierarchy
  s.setTopology('hierarchy');
  s.register(makeAgent('a4', 'queen'));
  var nh = s.getNeighbors('a4');
  // queen is L4, no L5, so empty
  // a1 worker is L0, L1 is scout
  var nh2 = s.getNeighbors('a1');
  // a1 is worker, scouts (L1) are reports
  // hmm logic: L+1 = direct supervisor, L-1 = direct report
  // worker L0 → looks for L1 scouts (supervisor) and L-1 (none)
  // but we have no scouts
  // let's add one
  s.register(makeAgent('a5', 'scout'));
  var nh3 = s.getNeighbors('a1');
  assert(nh3.neighbors.indexOf('a5') !== -1, 'BS: hierarchy worker-scout');
}

function testRoutePath() {
  var s = new BotSwarm();
  s.register(makeAgent('a1'));
  s.register(makeAgent('a2'));
  s.register(makeAgent('a3'));
  s.setTopology('mesh');
  var r1 = s.routePath('a1', 'a3');
  assertEq(r1.length, 2, 'BS: mesh 1 hop');
  assertEq(r1.path[0], 'a1', 'BS: path start');
  // ring topology
  s.setTopology('ring');
  var r2 = s.routePath('a1', 'a2');
  assert(r2.length > 0, 'BS: ring route found');
  // not found
  var r3 = s.routePath('a1', 'not_found');
  assertEq(r3.error, 'not_found', 'BS: not found');
  // self
  var r4 = s.routePath('a1', 'a1');
  assertEq(r4.length, 1, 'BS: self');
}

function testVote() {
  var s = new BotSwarm();
  s.register({ id: 'a1', role: 'worker', vote: function (p) { return 'yes'; } });
  s.register({ id: 'a2', role: 'worker', vote: function (p) { return 'yes'; } });
  s.register({ id: 'a3', role: 'worker', vote: function (p) { return 'no'; } });
  var r = s.vote({ action: 'attack' });
  assertEq(r.decision, 'passed', 'BS: vote passed');
  assertEq(r.votes.yes, 2, 'BS: 2 yes');
  assertEq(r.votes.no, 1, 'BS: 1 no');
  // no vote method
  s.register({ id: 'a4', role: 'worker' });
  var r2 = s.vote({});
  assertEq(r2.votes.abstain, 1, 'BS: abstain default');
  // custom voters
  var r3 = s.vote({}, ['a1', 'a2']);
  assertEq(r3.votes.yes, 2, 'BS: custom 2');
  // invalid
  var e1 = s.vote('not obj');
  assertEq(e1.error, 'invalid_proposal', 'BS: invalid');
}

function testLog() {
  var s = new BotSwarm();
  s.register(makeAgent('a1'));
  s.register(makeAgent('a2'));
  s.send('a1', 'a2', { x: 1 });
  var log = s.getLog();
  assert(log.length > 0, 'BS: log has entries');
  var limited = s.getLog(1);
  assertEq(limited.length, 1, 'BS: limited log');
}

function testStats() {
  var s = new BotSwarm();
  s.register(makeAgent('a1', 'worker'));
  s.register(makeAgent('a2', 'queen'));
  s.subscribe('alerts', 'a1');
  s.send('a1', 'a2', {});
  var stats = s.getStats();
  assertEq(stats.totalAgents, 2, 'BS: 2 total');
  assertEq(stats.aliveAgents, 2, 'BS: 2 alive');
  assertEq(stats.channels, 1, 'BS: 1 channel');
  assert(stats.metrics.directMessages >= 1, 'BS: msgs routed');
}

function testClear() {
  var s = new BotSwarm();
  s.register(makeAgent('a1'));
  s.subscribe('ch', 'a1');
  var c = s.clear();
  assertEq(c.success, true, 'BS: clear');
  assertEq(s.size(), 0, 'BS: 0 size');
  assertEq(Object.keys(s.channels).length, 0, 'BS: 0 channels');
}

function testConstants() {
  assertEq(SWARM_TOPOLOGY.MESH, 'mesh', 'BS: TOPO.MESH');
  assertEq(SWARM_MSG_TYPES.BROADCAST, 'broadcast', 'BS: MSG.BROADCAST');
}

testEmpty();
testRegister();
testMaxAgents();
testDeregister();
testGet();
testListByRole();
testPubSub();
testDirectMessage();
testMulticast();
testTopology();
testRoutePath();
testVote();
testLog();
testStats();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
