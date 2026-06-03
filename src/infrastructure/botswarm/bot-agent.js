// ============================================================================
// Bot Swarm Arena — V264 Direction B Iteration 1/9
// BotAgent: 基础AI代理 (状态+动作+记忆+学习+通信)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var ACTION_TYPES = {
    PLAY: 'play',
    PASS: 'pass',
    ATTACK: 'attack',
    DEFEND: 'defend',
    SIGNAL: 'signal',
    IDLE: 'idle'
  };

  var ROLE_LEVELS = {
    L0_WORKER: 'worker',     // 简单执行
    L1_SCOUT: 'scout',       // 探索观察
    L2_TACTIC: 'tactic',     // 局部战术
    L3_STRATEGIST: 'strategist', // 战略决策
    L4_QUEEN: 'queen'        // 全局控制
  };

  function BotAgent(id, options) {
    options = options || {};
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('BotAgent: id required');
    }
    this.id = id;
    this.name = options.name || ('Bot-' + id);
    this.role = options.role || ROLE_LEVELS.L0_WORKER;
    this.state = {};
    this.memory = {
      observations: [],
      actions: [],
      rewards: [],
      maxSize: options.memorySize || 100
    };
    this.qTable = {};            // Q-learning 简易表
    this.learningRate = options.learningRate || 0.1;
    this.discountFactor = options.discountFactor || 0.9;
    this.explorationRate = options.explorationRate || 0.1;
    this.swarm = options.swarm || null;
    this.blackboard = options.blackboard || null;
    this.alive = true;
    this.energy = options.energy || 100;
    this.creationTime = Date.now();
    this.lastActionTime = null;
    this.metrics = {
      actionsPlayed: 0,
      signalsSent: 0,
      signalsReceived: 0,
      rewardsTotal: 0,
      learningEpisodes: 0
    };
  }

  BotAgent.prototype.observe = function (observation) {
    if (!observation || typeof observation !== 'object') return { error: 'invalid_observation' };
    var entry = { ts: Date.now(), data: JSON.parse(JSON.stringify(observation)) };
    this.memory.observations.push(entry);
    if (this.memory.observations.length > this.memory.maxSize) {
      this.memory.observations = this.memory.observations.slice(-this.memory.maxSize);
    }
    // merge into state
    for (var k in observation) {
      if (Object.prototype.hasOwnProperty.call(observation, k)) {
        this.state[k] = observation[k];
      }
    }
    return { success: true, stateSize: Object.keys(this.state).length };
  };

  BotAgent.prototype.act = function (action, params) {
    if (!this.alive) return { error: 'agent_dead' };
    if (typeof action !== 'string' || action.length === 0) return { error: 'invalid_action' };
    var entry = { ts: Date.now(), action: action, params: params || {} };
    this.memory.actions.push(entry);
    if (this.memory.actions.length > this.memory.maxSize) {
      this.memory.actions = this.memory.actions.slice(-this.memory.maxSize);
    }
    this.lastActionTime = entry.ts;
    this.metrics.actionsPlayed++;
    this.energy = Math.max(0, this.energy - 1);
    if (this.energy === 0) this.alive = false;
    return { success: true, action: action, energy: this.energy };
  };

  BotAgent.prototype.learn = function (stateKey, action, reward) {
    if (typeof stateKey !== 'string') return { error: 'invalid_state_key' };
    if (typeof action !== 'string') return { error: 'invalid_action' };
    if (typeof reward !== 'number') return { error: 'invalid_reward' };
    if (!this.qTable[stateKey]) this.qTable[stateKey] = {};
    var oldQ = this.qTable[stateKey][action] || 0;
    var newQ = oldQ + this.learningRate * (reward - oldQ);
    this.qTable[stateKey][action] = newQ;
    this.memory.rewards.push({ ts: Date.now(), stateKey: stateKey, action: action, reward: reward, qValue: newQ });
    if (this.memory.rewards.length > this.memory.maxSize) {
      this.memory.rewards = this.memory.rewards.slice(-this.memory.maxSize);
    }
    this.metrics.rewardsTotal += reward;
    this.metrics.learningEpisodes++;
    return { success: true, oldQ: oldQ, newQ: newQ, delta: newQ - oldQ };
  };

  BotAgent.prototype.chooseAction = function (stateKey, availableActions) {
    if (typeof stateKey !== 'string') return { error: 'invalid_state_key' };
    if (!Array.isArray(availableActions) || availableActions.length === 0) return { error: 'no_actions' };
    // epsilon-greedy
    if (Math.random() < this.explorationRate) {
      var pick = availableActions[Math.floor(Math.random() * availableActions.length)];
      return { action: pick, exploration: true };
    }
    var qVals = this.qTable[stateKey] || {};
    var best = availableActions[0];
    var bestQ = qVals[best] || 0;
    for (var i = 1; i < availableActions.length; i++) {
      var a = availableActions[i];
      var q = qVals[a] || 0;
      if (q > bestQ) { bestQ = q; best = a; }
    }
    return { action: best, exploration: false, qValue: bestQ };
  };

  BotAgent.prototype.signal = function (message, channel) {
    if (typeof message !== 'object' || message === null) return { error: 'invalid_message' };
    var ch = channel || 'default';
    if (this.blackboard && typeof this.blackboard.write === 'function') {
      this.blackboard.write(ch, { from: this.id, message: message, ts: Date.now() });
    }
    this.metrics.signalsSent++;
    return { success: true, channel: ch, message: message };
  };

  BotAgent.prototype.readSignals = function (channel, since) {
    if (!this.blackboard || typeof this.blackboard.read !== 'function') return [];
    var msgs = this.blackboard.read(channel || 'default', since || 0);
    this.metrics.signalsReceived += msgs.length;
    return msgs;
  };

  BotAgent.prototype.rest = function (amount) {
    if (typeof amount !== 'number') amount = 10;
    this.energy = Math.min(100, this.energy + amount);
    if (this.energy > 0) this.alive = true;
    return { success: true, energy: this.energy };
  };

  BotAgent.prototype.die = function (reason) {
    this.alive = false;
    this.metrics.deathReason = reason || 'unknown';
    this.metrics.deathTime = Date.now();
    return { success: true };
  };

  BotAgent.prototype.getState = function () {
    return JSON.parse(JSON.stringify(this.state));
  };

  BotAgent.prototype.getMemory = function (type) {
    if (type) return this.memory[type].slice();
    return {
      observations: this.memory.observations.slice(),
      actions: this.memory.actions.slice(),
      rewards: this.memory.rewards.slice()
    };
  };

  BotAgent.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  BotAgent.prototype.getQTable = function () {
    return JSON.parse(JSON.stringify(this.qTable));
  };

  BotAgent.prototype.getSummary = function () {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      alive: this.alive,
      energy: this.energy,
      stateKeys: Object.keys(this.state).length,
      memorySize: this.memory.observations.length + this.memory.actions.length + this.memory.rewards.length,
      qTableSize: Object.keys(this.qTable).length,
      metrics: this.metrics
    };
  };

  BotAgent.prototype.clone = function (newId) {
    var c = new BotAgent(newId || (this.id + '_clone'), {
      name: this.name + '-clone',
      role: this.role,
      energy: this.energy,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      explorationRate: this.explorationRate,
      memorySize: this.memory.maxSize
    });
    c.qTable = JSON.parse(JSON.stringify(this.qTable));
    c.state = JSON.parse(JSON.stringify(this.state));
    return c;
  };

  if (typeof window !== 'undefined') {
    window.BotAgent = BotAgent;
    window.BOT_ACTION_TYPES = ACTION_TYPES;
    window.BOT_ROLE_LEVELS = ROLE_LEVELS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotAgent: BotAgent, BOT_ACTION_TYPES: ACTION_TYPES, BOT_ROLE_LEVELS: ROLE_LEVELS };
  }
})();
