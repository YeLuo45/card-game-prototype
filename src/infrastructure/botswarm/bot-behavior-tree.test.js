'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'bot-behavior-tree.js'), 'utf8'));
var BT_STATUS = window.BT_STATUS;
var BTAction = window.BTAction;
var BTCondition = window.BTCondition;
var BTSelector = window.BTSelector;
var BTSequence = window.BTSequence;
var BTInverter = window.BTInverter;
var BTRepeater = window.BTRepeater;
var BTUntilSuccess = window.BTUntilSuccess;
var BehaviorTreeBuilder = window.BehaviorTreeBuilder;
var BehaviorTreeRunner = window.BehaviorTreeRunner;
var btCountNodes = window.btCountNodes;
var btWalkTree = window.btWalkTree;
var btToJSON = window.btToJSON;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testStatus() {
  assertEq(BT_STATUS.SUCCESS, 'success', 'BT: STATUS.SUCCESS');
  assertEq(BT_STATUS.FAILURE, 'failure', 'BT: STATUS.FAILURE');
  assertEq(BT_STATUS.RUNNING, 'running', 'BT: STATUS.RUNNING');
}

function testAction() {
  var executed = 0;
  var a = new BTAction('act', function (s) { executed++; return BT_STATUS.SUCCESS; });
  var r = a.tick({});
  assertEq(r, 'success', 'BT: action success');
  assertEq(executed, 1, 'BT: executed 1');
  // returns non-status defaults to success
  var a2 = new BTAction('act2', function (s) { return 'whatever'; });
  assertEq(a2.tick({}), 'success', 'BT: non-status default success');
  // throws = failure
  var a3 = new BTAction('act3', function () { throw new Error('boom'); });
  assertEq(a3.tick({}), 'failure', 'BT: throw = failure');
  // errors
  try { new BTAction('', function () {}); assert(false, 'BT: should throw'); } catch (e) { assert(true, 'BT: empty name throws'); }
  try { new BTAction('x', null); assert(false, 'BT: should throw'); } catch (e) { assert(true, 'BT: null fn throws'); }
}

function testCondition() {
  var c = new BTCondition('c', function (s) { return s.hp > 0; });
  assertEq(c.tick({ hp: 10 }), 'success', 'BT: cond true');
  assertEq(c.tick({ hp: 0 }), 'failure', 'BT: cond false');
  // throws = failure
  var c2 = new BTCondition('c2', function () { throw new Error(); });
  assertEq(c2.tick({}), 'failure', 'BT: throw = failure');
  // errors
  try { new BTCondition('', function () {}); assert(false, 'BT: should throw'); } catch (e) { assert(true, 'BT: empty name'); }
  try { new BTCondition('x', null); assert(false, 'BT: should throw'); } catch (e) { assert(true, 'BT: null fn'); }
}

function testSelector() {
  // OR: any success returns success
  var s = new BTSelector('s', [
    new BTCondition('c1', function () { return false; }),
    new BTCondition('c2', function () { return true; }),
    new BTAction('a', function () { return BT_STATUS.SUCCESS; })
  ]);
  assertEq(s.tick({}), 'success', 'BT: selector first success');
  // all fail
  var s2 = new BTSelector('s2', [
    new BTCondition('c1', function () { return false; }),
    new BTCondition('c2', function () { return false; })
  ]);
  assertEq(s2.tick({}), 'failure', 'BT: all fail');
  // empty children
  var s3 = new BTSelector('s3', []);
  assertEq(s3.tick({}), 'failure', 'BT: empty failure');
  // running
  var s4 = new BTSelector('s4', [
    new BTAction('a', function () { return BT_STATUS.RUNNING; })
  ]);
  assertEq(s4.tick({}), 'running', 'BT: running');
  // errors
  try { new BTSelector('s', null); assert(false, 'BT: should throw'); } catch (e) { assert(true, 'BT: null children'); }
}

function testSequence() {
  // AND: all success = success
  var s = new BTSequence('s', [
    new BTCondition('c1', function () { return true; }),
    new BTCondition('c2', function () { return true; })
  ]);
  assertEq(s.tick({}), 'success', 'BT: seq all success');
  // one fail = fail
  var s2 = new BTSequence('s2', [
    new BTCondition('c1', function () { return true; }),
    new BTCondition('c2', function () { return false; })
  ]);
  assertEq(s2.tick({}), 'failure', 'BT: seq one fail');
  // short-circuit: second not executed
  var c2Called = 0;
  var s3 = new BTSequence('s3', [
    new BTCondition('c1', function () { return false; }),
    new BTCondition('c2', function () { c2Called++; return true; })
  ]);
  s3.tick({});
  assertEq(c2Called, 0, 'BT: short circuit');
  // running
  var s4 = new BTSequence('s4', [
    new BTAction('a', function () { return BT_STATUS.RUNNING; })
  ]);
  assertEq(s4.tick({}), 'running', 'BT: running');
  // empty
  var s5 = new BTSequence('s5', []);
  assertEq(s5.tick({}), 'success', 'BT: empty success');
}

function testInverter() {
  var inv = new BTInverter('inv', new BTCondition('c', function () { return true; }));
  assertEq(inv.tick({}), 'failure', 'BT: invert true to fail');
  var inv2 = new BTInverter('inv2', new BTCondition('c', function () { return false; }));
  assertEq(inv2.tick({}), 'success', 'BT: invert false to success');
  // running passthrough
  var inv3 = new BTInverter('inv3', new BTAction('a', function () { return BT_STATUS.RUNNING; }));
  assertEq(inv3.tick({}), 'running', 'BT: invert running');
}

function testRepeater() {
  var count = 0;
  var rep = new BTRepeater('rep', new BTAction('a', function () { count++; return BT_STATUS.SUCCESS; }), 3);
  // first tick: child returns success, count=1, _count=1, returns running
  assertEq(rep.tick({}), 'running', 'BT: rep 1st');
  assertEq(count, 1, 'BT: count 1');
  assertEq(rep.tick({}), 'running', 'BT: rep 2nd');
  assertEq(count, 2, 'BT: count 2');
  assertEq(rep.tick({}), 'success', 'BT: rep done');
  assertEq(count, 3, 'BT: count 3');
  // reset
  rep.reset();
  // infinite
  var rep2 = new BTRepeater('rep2', new BTAction('a2', function () { return BT_STATUS.SUCCESS; }));
  assertEq(rep2.tick({}), 'running', 'BT: infinite rep');
}

function testUntilSuccess() {
  var count = 0;
  var us = new BTUntilSuccess('us', new BTAction('a', function () {
    count++;
    return count < 3 ? BT_STATUS.FAILURE : BT_STATUS.SUCCESS;
  }));
  assertEq(us.tick({}), 'running', 'BT: until 1 fail');
  assertEq(us.tick({}), 'running', 'BT: until 2 fail');
  assertEq(us.tick({}), 'success', 'BT: until 3 success');
}

function testBuilder() {
  var b = new BehaviorTreeBuilder();
  b.selector('root', [
    new BTCondition('c1', function () { return false; }),
    new BTSequence('seq', [
      new BTCondition('c2', function () { return true; }),
      new BTAction('a', function () { return BT_STATUS.SUCCESS; })
    ])
  ]);
  assert(b.root !== null, 'BT: builder root set');
  assertEq(b.root.type, 'selector', 'BT: root selector');
}
function testBuilderMethods() {
  var b = new BehaviorTreeBuilder();
  var a = b.action('act', function () { return BT_STATUS.SUCCESS; });
  assertEq(a.type, 'action', 'BT: builder action');
  var c = b.condition('cond', function () { return true; });
  assertEq(c.type, 'condition', 'BT: builder condition');
  var inv = b.inverter('inv', c);
  assertEq(inv.type, 'inverter', 'BT: builder inverter');
  var rep = b.repeater('rep', c, 2);
  assertEq(rep.type, 'repeater', 'BT: builder repeater');
  assertEq(rep.maxRepeats, 2, 'BT: max repeats 2');
  var us = b.untilSuccess('us', c);
  assertEq(us.type, 'until_success', 'BT: builder until success');
  var sel = b.selector('sel', [a, c]);
  assertEq(sel.type, 'selector', 'BT: builder selector');
  var seq = b.sequence('seq', [a, c]);
  assertEq(seq.type, 'sequence', 'BT: builder sequence');
}

function testRunner() {
  var count = 0;
  var builder = new BehaviorTreeBuilder();
  builder.selector('root', [
    new BTAction('a', function () { count++; return BT_STATUS.SUCCESS; })
  ]);
  var r = new BehaviorTreeRunner(builder.root);
  assertEq(r.tick({}), 'success', 'BT: runner tick');
  assertEq(count, 1, 'BT: executed');
  assertEq(r.tickCount, 1, 'BT: tick count');
  // no root
  var r2 = new BehaviorTreeRunner(null);
  assertEq(r2.tick({}), 'failure', 'BT: no root fail');
  // reset
  r2.root = builder.root;
  r2.tick({});
  r2.tick({});
  r2.reset();
  assertEq(r2.tickCount, 0, 'BT: reset tick count');
  var stats = r.getStats();
  assert(stats.success >= 1, 'BT: stats success');
  // history limited
  for (var i = 0; i < 105; i++) r.tick({});
  assert(r.history.length <= 100, 'BT: history limited');
}

function testCountNodes() {
  var builder = new BehaviorTreeBuilder();
  builder.selector('root', [
    new BTCondition('c1', function () { return true; }),
    new BTSequence('seq', [
      new BTAction('a1', function () { return BT_STATUS.SUCCESS; }),
      new BTAction('a2', function () { return BT_STATUS.SUCCESS; })
    ])
  ]);
  var c = btCountNodes(builder.root);
  // selector(1) + condition(1) + sequence(1) + action1(1) + action2(1) = 5
  assertEq(c, 5, 'BT: 5 nodes');
  var c2 = btCountNodes(null);
  assertEq(c2, 0, 'BT: null 0');
}

function testWalkTree() {
  var builder = new BehaviorTreeBuilder();
  builder.selector('root', [
    new BTAction('a', function () { return BT_STATUS.SUCCESS; })
  ]);
  var names = [];
  btWalkTree(builder.root, function (node, depth) { names.push({ name: node.name, depth: depth }); });
  assertEq(names.length, 2, 'BT: 2 visited');
  assertEq(names[0].name, 'root', 'BT: root first');
  assertEq(names[0].depth, 0, 'BT: root depth 0');
  assertEq(names[1].depth, 1, 'BT: child depth 1');
}

function testToJSON() {
  var builder = new BehaviorTreeBuilder();
  builder.selector('root', [
    new BTAction('a', function () { return BT_STATUS.SUCCESS; })
  ]);
  var json = btToJSON(builder.root);
  assertEq(json.type, 'selector', 'BT: json type');
  assertEq(json.children.length, 1, 'BT: json 1 child');
  var json2 = btToJSON(null);
  assertEq(json2, null, 'BT: json null');
  // repeater with max
  var rep = new BTRepeater('rep', new BTAction('a', function () {}), 5);
  var json3 = btToJSON(rep);
  assertEq(json3.maxRepeats, 5, 'BT: json maxRepeats');
}

function testGameScenario() {
  // Real card-game-like scenario: bot decides to attack or defend
  var state = { hp: 30, enemyHp: 50, hand: ['attack1', 'defend1'], energy: 3 };
  var builder = new BehaviorTreeBuilder();
  builder.selector('decision', [
    // if low hp, defend
    new BTSequence('defend_path', [
      new BTCondition('low_hp', function (s) { return s.hp < 20; }),
      new BTAction('do_defend', function (s) { s.action = 'defend'; return BT_STATUS.SUCCESS; })
    ]),
    // if can attack, attack
    new BTSequence('attack_path', [
      new BTCondition('has_energy', function (s) { return s.energy > 0; }),
      new BTCondition('has_attack', function (s) { return s.hand.indexOf('attack1') !== -1; }),
      new BTAction('do_attack', function (s) { s.action = 'attack'; return BT_STATUS.SUCCESS; })
    ]),
    // fallback: pass
    new BTAction('do_pass', function (s) { s.action = 'pass'; return BT_STATUS.SUCCESS; })
  ]);
  var runner = new BehaviorTreeRunner(builder.root);
  runner.tick(state);
  assertEq(state.action, 'attack', 'BT: scenario attack');
  // now low hp
  var state2 = { hp: 10, enemyHp: 50, hand: ['attack1', 'defend1'], energy: 3 };
  runner.tick(state2);
  assertEq(state2.action, 'defend', 'BT: scenario defend');
  // no energy
  var state3 = { hp: 50, enemyHp: 50, hand: ['attack1'], energy: 0 };
  runner.tick(state3);
  assertEq(state3.action, 'pass', 'BT: scenario pass');
}

testStatus();
testAction();
testCondition();
testSelector();
testSequence();
testInverter();
testRepeater();
testUntilSuccess();
testBuilder();
testBuilderMethods();
testRunner();
testCountNodes();
testWalkTree();
testToJSON();
testGameScenario();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
