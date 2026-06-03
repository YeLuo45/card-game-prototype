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
var BotAgent = window.BotAgent;
var BOT_ACTION_TYPES = window.BOT_ACTION_TYPES;
var BOT_ROLE_LEVELS = window.BOT_ROLE_LEVELS;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testConstruction() {
  var b = new BotAgent('b1');
  assertEq(b.id, 'b1', 'BA: id b1');
  assertEq(b.alive, true, 'BA: alive');
  assertEq(b.energy, 100, 'BA: 100 energy');
  assertEq(b.role, 'worker', 'BA: default worker');
  assertEq(Object.keys(b.state).length, 0, 'BA: empty state');
  assertEq(b.metrics.actionsPlayed, 0, 'BA: 0 actions');
  // custom options
  var b2 = new BotAgent('b2', { name: 'Alice', role: 'queen', energy: 50, learningRate: 0.2 });
  assertEq(b2.name, 'Alice', 'BA: name Alice');
  assertEq(b2.role, 'queen', 'BA: role queen');
  assertEq(b2.energy, 50, 'BA: energy 50');
  assertEq(b2.learningRate, 0.2, 'BA: lr 0.2');
  // invalid id
  try {
    new BotAgent('');
    assert(false, 'BA: should throw on empty id');
  } catch (e) {
    assert(true, 'BA: empty id throws');
  }
  try {
    new BotAgent(null);
    assert(false, 'BA: should throw on null id');
  } catch (e) {
    assert(true, 'BA: null id throws');
  }
}

function testObserve() {
  var b = new BotAgent('b1');
  var r = b.observe({ hand: ['c1', 'c2'], hp: 30 });
  assertEq(r.success, true, 'BA: observe success');
  assertEq(b.state.hand.length, 2, 'BA: 2 cards');
  assertEq(b.state.hp, 30, 'BA: hp 30');
  // multi observe merges
  b.observe({ mp: 5 });
  assertEq(b.state.hp, 30, 'BA: hp preserved');
  assertEq(b.state.mp, 5, 'BA: mp added');
  // memory
  assertEq(b.memory.observations.length, 2, 'BA: 2 obs');
  // errors
  var e1 = b.observe(null);
  assertEq(e1.error, 'invalid_observation', 'BA: null obs');
  var e2 = b.observe('not obj');
  assertEq(e2.error, 'invalid_observation', 'BA: str obs');
}

function testAct() {
  var b = new BotAgent('b1');
  var r = b.act('play', { card: 'c1' });
  assertEq(r.success, true, 'BA: act success');
  assertEq(r.energy, 99, 'BA: energy 99');
  assertEq(b.metrics.actionsPlayed, 1, 'BA: 1 action');
  assertEq(b.lastActionTime > 0, true, 'BA: last action time');
  // errors
  var e1 = b.act(null);
  assertEq(e1.error, 'invalid_action', 'BA: null action');
  var e2 = b.act('');
  assertEq(e2.error, 'invalid_action', 'BA: empty action');
  // dead agent
  var b2 = new BotAgent('b2', { energy: 1 });
  b2.act('play');
  assertEq(b2.alive, false, 'BA: dead after energy 0');
  var e3 = b2.act('play');
  assertEq(e3.error, 'agent_dead', 'BA: dead cant act');
}

function testLearn() {
  var b = new BotAgent('b1');
  var r = b.learn('stateA', 'play', 10);
  assertEq(r.success, true, 'BA: learn success');
  assertEq(r.newQ, 1, 'BA: q=1 (lr=0.1, reward=10, old=0)');
  // learn again
  var r2 = b.learn('stateA', 'play', 20);
  assertEq(r2.oldQ, 1, 'BA: old q 1');
  // different state
  b.learn('stateB', 'pass', -5);
  assertEq(b.qTable.stateB.pass, -0.5, 'BA: stateB q -0.5');
  // errors
  var e1 = b.learn(null, 'play', 1);
  assertEq(e1.error, 'invalid_state_key', 'BA: null state');
  var e2 = b.learn('s', null, 1);
  assertEq(e2.error, 'invalid_action', 'BA: null action');
  var e3 = b.learn('s', 'a', 'not num');
  assertEq(e3.error, 'invalid_reward', 'BA: str reward');
  // metrics
  assertEq(b.metrics.learningEpisodes, 3, 'BA: 3 episodes');
}

function testChooseAction() {
  var b = new BotAgent('b1', { explorationRate: 0 });
  // empty Q table
  var r = b.chooseAction('s1', ['a', 'b', 'c']);
  assert(['a', 'b', 'c'].indexOf(r.action) !== -1, 'BA: valid action');
  assertEq(r.exploration, false, 'BA: not exploration');
  // trained
  b.learn('s1', 'a', 100);
  b.learn('s1', 'b', 50);
  b.learn('s1', 'c', 10);
  var r2 = b.chooseAction('s1', ['a', 'b', 'c']);
  assertEq(r2.action, 'a', 'BA: best a');
  assertEq(r2.exploration, false, 'BA: not exploration');
  // errors
  var e1 = b.chooseAction(null, ['a']);
  assertEq(e1.error, 'invalid_state_key', 'BA: null state');
  var e2 = b.chooseAction('s', null);
  assertEq(e2.error, 'no_actions', 'BA: null actions');
  var e3 = b.chooseAction('s', []);
  assertEq(e3.error, 'no_actions', 'BA: empty actions');
  // exploration
  var b2 = new BotAgent('b2', { explorationRate: 1.0 });
  var r3 = b2.chooseAction('s1', ['x']);
  assertEq(r3.exploration, true, 'BA: explore');
}

function testSignal() {
  var bb = { write: function (ch, msg) { this._store = this._store || {}; this._store[ch] = this._store[ch] || []; this._store[ch].push(msg); }, read: function (ch, since) { return (this._store && this._store[ch]) ? this._store[ch].filter(function (m) { return m.ts >= (since || 0); }) : []; } };
  var b = new BotAgent('b1', { blackboard: bb });
  var r = b.signal({ type: 'help', pos: { x: 1, y: 2 } });
  assertEq(r.success, true, 'BA: signal success');
  assertEq(b.metrics.signalsSent, 1, 'BA: sent 1');
  // read
  var msgs = b.readSignals('default', 0);
  assertEq(msgs.length, 1, 'BA: read 1');
  assertEq(msgs[0].from, 'b1', 'BA: from b1');
  assertEq(b.metrics.signalsReceived, 1, 'BA: received 1');
  // channel
  b.signal({ alert: 'low_hp' }, 'alert');
  var alerts = b.readSignals('alert', 0);
  assertEq(alerts.length, 1, 'BA: alert 1');
  // no blackboard
  var b2 = new BotAgent('b2');
  var r2 = b2.signal({ test: 1 });
  assertEq(r2.success, true, 'BA: no bb signal still success');
  // invalid message
  var e1 = b.signal(null);
  assertEq(e1.error, 'invalid_message', 'BA: null msg');
  var e2 = b.signal('str');
  assertEq(e2.error, 'invalid_message', 'BA: str msg');
}

function testRest() {
  var b = new BotAgent('b1', { energy: 50 });
  var r = b.rest(30);
  assertEq(r.success, true, 'BA: rest');
  assertEq(b.energy, 80, 'BA: 80 energy');
  // over max
  b.rest(50);
  assertEq(b.energy, 100, 'BA: max 100');
  // default amount
  var b2 = new BotAgent('b2', { energy: 50 });
  b2.rest();
  assertEq(b2.energy, 60, 'BA: rest 10 default');
  // revives dead
  var b3 = new BotAgent('b3', { energy: 0 });
  b3.die();
  assertEq(b3.alive, false, 'BA: dead');
  b3.rest(10);
  assertEq(b3.alive, true, 'BA: revived');
}

function testDie() {
  var b = new BotAgent('b1');
  var r = b.die('test');
  assertEq(r.success, true, 'BA: die success');
  assertEq(b.alive, false, 'BA: dead');
  assertEq(b.metrics.deathReason, 'test', 'BA: reason');
  assert(b.metrics.deathTime > 0, 'BA: death time');
}

function testGetState() {
  var b = new BotAgent('b1');
  b.observe({ x: 1, y: 2 });
  var s = b.getState();
  assertEq(s.x, 1, 'BA: get x');
  // isolated
  s.x = 999;
  assertEq(b.state.x, 1, 'BA: state isolated');
}

function testGetMemory() {
  var b = new BotAgent('b1', { memorySize: 3 });
  b.observe({ a: 1 });
  b.observe({ a: 2 });
  b.observe({ a: 3 });
  b.observe({ a: 4 });
  assertEq(b.memory.observations.length, 3, 'BA: trimmed to 3');
  b.act('p');
  b.act('p');
  b.act('p');
  b.act('p');
  assertEq(b.memory.actions.length, 3, 'BA: actions trimmed');
  var all = b.getMemory();
  assertEq(all.observations.length, 3, 'BA: get all obs');
  var obs = b.getMemory('observations');
  assertEq(obs.length, 3, 'BA: get obs');
}

function testGetMetrics() {
  var b = new BotAgent('b1');
  b.act('play');
  b.act('pass');
  var m = b.getMetrics();
  assertEq(m.actionsPlayed, 2, 'BA: 2 actions');
  // isolated
  m.actionsPlayed = 999;
  assertEq(b.metrics.actionsPlayed, 2, 'BA: metrics isolated');
}

function testClone() {
  var b = new BotAgent('b1', { energy: 50 });
  b.learn('s1', 'a', 10);
  b.observe({ hand: ['c1'] });
  var c = b.clone();
  assertEq(c.id, 'b1_clone', 'BA: clone id');
  assertEq(c.energy, 50, 'BA: clone energy');
  assertEq(c.qTable.s1.a, 1, 'BA: clone q');
  assertEq(c.state.hand[0], 'c1', 'BA: clone state');
  // isolated mutation
  c.energy = 10;
  assertEq(b.energy, 50, 'BA: energy isolated');
  var c2 = b.clone('custom_id');
  assertEq(c2.id, 'custom_id', 'BA: custom id');
}

function testGetSummary() {
  var b = new BotAgent('b1', { role: 'queen' });
  b.observe({ x: 1 });
  b.act('play');
  b.learn('s', 'a', 5);
  var s = b.getSummary();
  assertEq(s.role, 'queen', 'BA: summary role');
  assertEq(s.alive, true, 'BA: summary alive');
  assertEq(s.stateKeys, 1, 'BA: 1 state key');
  assertEq(s.qTableSize, 1, 'BA: 1 q entry');
  assertEq(s.metrics.actionsPlayed, 1, 'BA: 1 action');
}

function testQTable() {
  var b = new BotAgent('b1');
  b.learn('s1', 'a', 10);
  b.learn('s1', 'b', 5);
  b.learn('s2', 'a', 20);
  var qt = b.getQTable();
  assertEq(qt.s1.a, 1, 'BA: q s1.a');
  assertEq(qt.s2.a, 2, 'BA: q s2.a');
  qt.s1.a = 999;
  assertEq(b.qTable.s1.a, 1, 'BA: qtable isolated');
}

function testConstants() {
  assertEq(BOT_ACTION_TYPES.PLAY, 'play', 'BA: ACTION.PLAY');
  assertEq(BOT_ROLE_LEVELS.L4_QUEEN, 'queen', 'BA: ROLE.QUEEN');
}

testConstruction();
testObserve();
testAct();
testLearn();
testChooseAction();
testSignal();
testRest();
testDie();
testGetState();
testGetMemory();
testGetMetrics();
testClone();
testGetSummary();
testQTable();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
