// ============================================================================
// Bot Swarm Arena — V267 Direction B Iteration 4/9
// BotBehaviorTree: 行为树 (Selector/Sequence/Condition/Action/Decorator)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var STATUS = {
    SUCCESS: 'success',
    FAILURE: 'failure',
    RUNNING: 'running'
  };

  // ----- Leaf nodes -----
  function Action(name, fn) {
    if (typeof name !== 'string' || name.length === 0) throw new Error('Action: name required');
    if (typeof fn !== 'function') throw new Error('Action: fn required');
    this.type = 'action';
    this.name = name;
    this.fn = fn;
  }

  Action.prototype.tick = function (state) {
    try {
      var r = this.fn(state);
      if (r === STATUS.SUCCESS || r === STATUS.FAILURE || r === STATUS.RUNNING) return r;
      return STATUS.SUCCESS;
    } catch (e) {
      return STATUS.FAILURE;
    }
  };

  function Condition(name, fn) {
    if (typeof name !== 'string' || name.length === 0) throw new Error('Condition: name required');
    if (typeof fn !== 'function') throw new Error('Condition: fn required');
    this.type = 'condition';
    this.name = name;
    this.fn = fn;
  }

  Condition.prototype.tick = function (state) {
    try {
      var r = this.fn(state);
      return r ? STATUS.SUCCESS : STATUS.FAILURE;
    } catch (e) {
      return STATUS.FAILURE;
    }
  };

  // ----- Composite nodes -----
  function Selector(name, children) {
    if (typeof name !== 'string') throw new Error('Selector: name required');
    if (!Array.isArray(children)) throw new Error('Selector: children array required');
    this.type = 'selector';
    this.name = name;
    this.children = children;
  }

  Selector.prototype.tick = function (state) {
    for (var i = 0; i < this.children.length; i++) {
      var r = this.children[i].tick(state);
      if (r === STATUS.SUCCESS) return STATUS.SUCCESS;
      if (r === STATUS.RUNNING) return STATUS.RUNNING;
    }
    return STATUS.FAILURE;
  };

  function Sequence(name, children) {
    if (typeof name !== 'string') throw new Error('Sequence: name required');
    if (!Array.isArray(children)) throw new Error('Sequence: children array required');
    this.type = 'sequence';
    this.name = name;
    this.children = children;
  }

  Sequence.prototype.tick = function (state) {
    for (var i = 0; i < this.children.length; i++) {
      var r = this.children[i].tick(state);
      if (r === STATUS.FAILURE) return STATUS.FAILURE;
      if (r === STATUS.RUNNING) return STATUS.RUNNING;
    }
    return STATUS.SUCCESS;
  };

  // ----- Decorators -----
  function Inverter(name, child) {
    if (typeof name !== 'string') throw new Error('Inverter: name required');
    if (!child) throw new Error('Inverter: child required');
    this.type = 'inverter';
    this.name = name;
    this.child = child;
  }

  Inverter.prototype.tick = function (state) {
    var r = this.child.tick(state);
    if (r === STATUS.SUCCESS) return STATUS.FAILURE;
    if (r === STATUS.FAILURE) return STATUS.SUCCESS;
    return STATUS.RUNNING;
  };

  function Repeater(name, child, maxRepeats) {
    if (typeof name !== 'string') throw new Error('Repeater: name required');
    if (!child) throw new Error('Repeater: child required');
    this.type = 'repeater';
    this.name = name;
    this.child = child;
    this.maxRepeats = typeof maxRepeats === 'number' ? maxRepeats : -1;  // -1 = infinite
    this._count = 0;
  }

  Repeater.prototype.tick = function (state) {
    if (this.maxRepeats !== -1 && this._count >= this.maxRepeats) {
      this._count = 0;
      return STATUS.SUCCESS;
    }
    var r = this.child.tick(state);
    if (r === STATUS.RUNNING) return STATUS.RUNNING;
    this._count++;
    if (this.maxRepeats !== -1 && this._count >= this.maxRepeats) {
      this._count = 0;
      return STATUS.SUCCESS;
    }
    return STATUS.RUNNING;  // not done yet
  };

  Repeater.prototype.reset = function () {
    this._count = 0;
  };

  function UntilSuccess(name, child) {
    if (typeof name !== 'string') throw new Error('UntilSuccess: name required');
    if (!child) throw new Error('UntilSuccess: child required');
    this.type = 'until_success';
    this.name = name;
    this.child = child;
  }

  UntilSuccess.prototype.tick = function (state) {
    var r = this.child.tick(state);
    if (r === STATUS.SUCCESS) return STATUS.SUCCESS;
    if (r === STATUS.FAILURE) return STATUS.RUNNING;  // try again
    return STATUS.RUNNING;
  };

  // ----- Builder -----
  function BehaviorTreeBuilder() {
    this.root = null;
    this._stack = [];
  }

  BehaviorTreeBuilder.prototype.selector = function (name, children) {
    var node = new Selector(name, children);
    return this._add(node);
  };

  BehaviorTreeBuilder.prototype.sequence = function (name, children) {
    var node = new Sequence(name, children);
    return this._add(node);
  };

  BehaviorTreeBuilder.prototype.action = function (name, fn) {
    return this._add(new Action(name, fn));
  };

  BehaviorTreeBuilder.prototype.condition = function (name, fn) {
    return this._add(new Condition(name, fn));
  };

  BehaviorTreeBuilder.prototype.inverter = function (name, child) {
    return this._add(new Inverter(name, child));
  };

  BehaviorTreeBuilder.prototype.repeater = function (name, child, maxRepeats) {
    return this._add(new Repeater(name, child, maxRepeats));
  };

  BehaviorTreeBuilder.prototype.untilSuccess = function (name, child) {
    return this._add(new UntilSuccess(name, child));
  };

  BehaviorTreeBuilder.prototype._add = function (node) {
    if (!this.root) this.root = node;
    return node;
  };

  // ----- Tree runner -----
  function BehaviorTreeRunner(root) {
    this.root = root;
    this.tickCount = 0;
    this.history = [];
    this.maxHistory = 100;
  }

  BehaviorTreeRunner.prototype.tick = function (state) {
    this.tickCount++;
    if (!this.root) return STATUS.FAILURE;
    var r = this.root.tick(state);
    this.history.push({ tick: this.tickCount, status: r, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory);
    return r;
  };

  BehaviorTreeRunner.prototype.reset = function () {
    this.tickCount = 0;
    this.history = [];
    if (this.root && this.root.type === 'repeater') this.root.reset();
  };

  BehaviorTreeRunner.prototype.getStats = function () {
    var stats = { total: this.history.length, success: 0, failure: 0, running: 0 };
    for (var i = 0; i < this.history.length; i++) {
      stats[this.history[i].status]++;
    }
    return stats;
  };

  // ----- Tree introspection -----
  function countNodes(node) {
    if (!node) return 0;
    if (node.type === 'action' || node.type === 'condition') return 1;
    var count = 1;
    var children = node.children || (node.child ? [node.child] : []);
    for (var i = 0; i < children.length; i++) {
      count += countNodes(children[i]);
    }
    return count;
  }

  function walkTree(node, fn, depth) {
    depth = depth || 0;
    if (!node) return;
    fn(node, depth);
    var children = node.children || (node.child ? [node.child] : []);
    for (var i = 0; i < children.length; i++) {
      walkTree(children[i], fn, depth + 1);
    }
  }

  function toJSON(node) {
    if (!node) return null;
    var json = { type: node.type, name: node.name };
    if (node.children) json.children = node.children.map(toJSON);
    if (node.child) json.child = toJSON(node.child);
    if (typeof node.maxRepeats === 'number' && node.maxRepeats !== -1) json.maxRepeats = node.maxRepeats;
    return json;
  }

  if (typeof window !== 'undefined') {
    window.BT_STATUS = STATUS;
    window.BTAction = Action;
    window.BTCondition = Condition;
    window.BTSelector = Selector;
    window.BTSequence = Sequence;
    window.BTInverter = Inverter;
    window.BTRepeater = Repeater;
    window.BTUntilSuccess = UntilSuccess;
    window.BehaviorTreeBuilder = BehaviorTreeBuilder;
    window.BehaviorTreeRunner = BehaviorTreeRunner;
    window.btCountNodes = countNodes;
    window.btWalkTree = walkTree;
    window.btToJSON = toJSON;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      BT_STATUS: STATUS, BTAction: Action, BTCondition: Condition,
      BTSelector: Selector, BTSequence: Sequence, BTInverter: Inverter,
      BTRepeater: Repeater, BTUntilSuccess: UntilSuccess,
      BehaviorTreeBuilder: BehaviorTreeBuilder, BehaviorTreeRunner: BehaviorTreeRunner,
      btCountNodes: countNodes, btWalkTree: walkTree, btToJSON: toJSON
    };
  }
})();
