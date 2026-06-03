// ============================================================================
// Bot Swarm Arena — V265 Direction B Iteration 2/9
// BotSwarm: 群体mesh协调 (注册/发现/消息路由/广播/拓扑)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var TOPOLOGY = {
    MESH: 'mesh',         // 全连接
    RING: 'ring',         // 环形
    STAR: 'star',         // 中心辐射
    HIERARCHY: 'hierarchy' // 树形
  };

  var MSG_TYPES = {
    BROADCAST: 'broadcast',
    DIRECT: 'direct',
    MULTICAST: 'multicast'
  };

  function BotSwarm(options) {
    options = options || {};
    this.id = options.id || ('swarm_' + Date.now());
    this.topology = options.topology || TOPOLOGY.MESH;
    this.maxAgents = options.maxAgents || 100;
    this.agents = {};
    this.index = [];
    this.channels = {};        // pub/sub
    this.routingLog = [];
    this.metrics = {
      messagesRouted: 0,
      broadcasts: 0,
      directMessages: 0,
      registrations: 0,
      deregistrations: 0
    };
    this.createdAt = Date.now();
  }

  BotSwarm.prototype.register = function (agent) {
    if (!agent || !agent.id) return { error: 'invalid_agent' };
    if (this.agents[agent.id]) return { error: 'already_registered' };
    if (this.index.length >= this.maxAgents) return { error: 'swarm_full' };
    this.agents[agent.id] = agent;
    this.index.push(agent.id);
    this.metrics.registrations++;
    agent.swarm = this;
    return { success: true, agentId: agent.id, swarmSize: this.index.length };
  };

  BotSwarm.prototype.deregister = function (agentId) {
    if (!this.agents[agentId]) return { error: 'not_found' };
    delete this.agents[agentId];
    var idx = this.index.indexOf(agentId);
    if (idx !== -1) this.index.splice(idx, 1);
    this.metrics.deregistrations++;
    return { success: true, swarmSize: this.index.length };
  };

  BotSwarm.prototype.get = function (agentId) {
    return this.agents[agentId] || null;
  };

  BotSwarm.prototype.has = function (agentId) {
    return !!this.agents[agentId];
  };

  BotSwarm.prototype.size = function () {
    return this.index.length;
  };

  BotSwarm.prototype.list = function () {
    return this.index.slice();
  };

  BotSwarm.prototype.listByRole = function (role) {
    var out = [];
    for (var i = 0; i < this.index.length; i++) {
      var a = this.agents[this.index[i]];
      if (a && a.role === role) out.push(a.id);
    }
    return out;
  };

  // ----- Pub/Sub -----
  BotSwarm.prototype.subscribe = function (channel, agentId) {
    if (typeof channel !== 'string' || channel.length === 0) return { error: 'invalid_channel' };
    if (!this.agents[agentId]) return { error: 'agent_not_registered' };
    if (!this.channels[channel]) this.channels[channel] = [];
    if (this.channels[channel].indexOf(agentId) === -1) {
      this.channels[channel].push(agentId);
    }
    return { success: true, channel: channel, agentId: agentId, subscribers: this.channels[channel].length };
  };

  BotSwarm.prototype.unsubscribe = function (channel, agentId) {
    if (!this.channels[channel]) return { error: 'channel_not_found' };
    var idx = this.channels[channel].indexOf(agentId);
    if (idx === -1) return { error: 'not_subscribed' };
    this.channels[channel].splice(idx, 1);
    // keep channel alive even with 0 subs
    return { success: true, channel: channel, subscribers: this.channels[channel].length };
  };

  BotSwarm.prototype.publish = function (channel, message, senderId) {
    if (!this.channels[channel]) {
      this.metrics.messagesRouted++;
      return { success: true, delivered: 0, channel: channel };
    }
    var delivered = 0;
    var subs = this.channels[channel].slice();
    for (var i = 0; i < subs.length; i++) {
      var agentId = subs[i];
      if (agentId === senderId) continue;
      var a = this.agents[agentId];
      if (a && typeof a.signal === 'function') {
        // direct delivery
        a.signal({ channel: channel, body: message, from: senderId, ts: Date.now() }, '__swarm_' + channel);
        delivered++;
      }
    }
    this.metrics.messagesRouted++;
    this.metrics.broadcasts++;
    this._log({ type: MSG_TYPES.BROADCAST, channel: channel, sender: senderId, delivered: delivered, ts: Date.now() });
    return { success: true, channel: channel, delivered: delivered };
  };

  // ----- Direct message -----
  BotSwarm.prototype.send = function (fromId, toId, message) {
    if (!this.agents[fromId]) return { error: 'sender_not_found' };
    if (!this.agents[toId]) return { error: 'recipient_not_found' };
    var target = this.agents[toId];
    if (typeof target.signal === 'function') {
      target.signal({ from: fromId, body: message, direct: true, ts: Date.now() }, '__direct');
    }
    this.metrics.messagesRouted++;
    this.metrics.directMessages++;
    this._log({ type: MSG_TYPES.DIRECT, from: fromId, to: toId, ts: Date.now() });
    return { success: true, delivered: true };
  };

  // ----- Multicast -----
  BotSwarm.prototype.multicast = function (fromId, toIds, message) {
    if (!this.agents[fromId]) return { error: 'sender_not_found' };
    if (!Array.isArray(toIds)) return { error: 'invalid_recipients' };
    var delivered = 0;
    for (var i = 0; i < toIds.length; i++) {
      var target = this.agents[toIds[i]];
      if (target && typeof target.signal === 'function') {
        target.signal({ from: fromId, body: message, multicast: true, ts: Date.now() }, '__multicast');
        delivered++;
      }
    }
    this.metrics.messagesRouted++;
    this._log({ type: MSG_TYPES.MULTICAST, from: fromId, count: toIds.length, delivered: delivered, ts: Date.now() });
    return { success: true, delivered: delivered, requested: toIds.length };
  };

  // ----- Topology operations -----
  BotSwarm.prototype.getTopology = function () {
    return this.topology;
  };

  BotSwarm.prototype.setTopology = function (topology) {
    var validTops = Object.keys(TOPOLOGY).map(function (k) { return TOPOLOGY[k]; });
    if (validTops.indexOf(topology) === -1) return { error: 'invalid_topology' };
    this.topology = topology;
    return { success: true, topology: topology };
  };

  BotSwarm.prototype.getNeighbors = function (agentId) {
    if (!this.agents[agentId]) return { error: 'not_found' };
    var all = this.index.filter(function (id) { return id !== agentId; });
    if (this.topology === TOPOLOGY.MESH) {
      return { neighbors: all, type: 'full' };
    } else if (this.topology === TOPOLOGY.RING) {
      if (all.length === 0) return { neighbors: [], type: 'ring' };
      var idx = this.index.indexOf(agentId);
      var prev = idx === 0 ? this.index[this.index.length - 1] : this.index[idx - 1];
      var next = idx === this.index.length - 1 ? this.index[0] : this.index[idx + 1];
      return { neighbors: [prev, next], type: 'ring' };
    } else if (this.topology === TOPOLOGY.STAR) {
      // first agent is hub
      var hub = this.index[0];
      if (agentId === hub) return { neighbors: all, type: 'star_hub' };
      return { neighbors: [hub], type: 'star_leaf' };
    } else if (this.topology === TOPOLOGY.HIERARCHY) {
      // by role level
      var me = this.agents[agentId];
      if (!me) return { neighbors: [], type: 'hierarchy' };
      var roleRank = { worker: 0, scout: 1, tactic: 2, strategist: 3, queen: 4 };
      var myRank = roleRank[me.role] || 0;
      var neighbors = [];
      for (var i = 0; i < this.index.length; i++) {
        var other = this.agents[this.index[i]];
        if (!other || other.id === agentId) continue;
        var oRank = roleRank[other.role] || 0;
        if (oRank === myRank + 1) neighbors.push(other.id); // direct supervisor
        if (oRank === myRank - 1) neighbors.push(other.id); // direct report
      }
      return { neighbors: neighbors, type: 'hierarchy' };
    }
    return { neighbors: [], type: 'unknown' };
  };

  BotSwarm.prototype.routePath = function (fromId, toId) {
    if (fromId === toId) return { path: [fromId], length: 1 };
    if (!this.agents[fromId] || !this.agents[toId]) return { error: 'not_found' };
    // BFS
    var visited = {};
    var queue = [[fromId]];
    visited[fromId] = true;
    while (queue.length > 0) {
      var path = queue.shift();
      var node = path[path.length - 1];
      if (node === toId) return { path: path, length: path.length };
      var n = this.getNeighbors(node);
      if (n.neighbors) {
        for (var i = 0; i < n.neighbors.length; i++) {
          var next = n.neighbors[i];
          if (!visited[next]) {
            visited[next] = true;
            queue.push(path.concat([next]));
          }
        }
      }
    }
    return { path: null, length: -1 };
  };

  // ----- Quorum / consensus -----
  BotSwarm.prototype.vote = function (proposal, voterIds) {
    if (typeof proposal !== 'object') return { error: 'invalid_proposal' };
    if (!Array.isArray(voterIds)) voterIds = this.index.slice();
    var votes = { yes: 0, no: 0, abstain: 0, voters: [] };
    for (var i = 0; i < voterIds.length; i++) {
      var a = this.agents[voterIds[i]];
      if (!a) continue;
      var v;
      if (typeof a.vote === 'function') {
        v = a.vote(proposal);
      } else {
        v = 'abstain';
      }
      if (votes[v] !== undefined) votes[v]++;
      else votes.abstain++;
      votes.voters.push(a.id);
    }
    var decision = votes.yes > votes.no ? 'passed' : (votes.no > votes.yes ? 'rejected' : 'tie');
    return { success: true, proposal: proposal, votes: votes, decision: decision };
  };

  // ----- Logging -----
  BotSwarm.prototype._log = function (entry) {
    this.routingLog.push(entry);
    if (this.routingLog.length > 200) this.routingLog = this.routingLog.slice(-200);
  };

  BotSwarm.prototype.getLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.routingLog.slice(-limit);
    }
    return this.routingLog.slice();
  };

  // ----- Stats -----
  BotSwarm.prototype.getStats = function () {
    var roleCounts = {};
    var aliveCount = 0;
    for (var i = 0; i < this.index.length; i++) {
      var a = this.agents[this.index[i]];
      if (!a) continue;
      if (a.alive !== false) aliveCount++;
      roleCounts[a.role] = (roleCounts[a.role] || 0) + 1;
    }
    return {
      id: this.id,
      topology: this.topology,
      totalAgents: this.index.length,
      aliveAgents: aliveCount,
      roleDistribution: roleCounts,
      channels: Object.keys(this.channels).length,
      metrics: this.metrics
    };
  };

  BotSwarm.prototype.clear = function () {
    this.agents = {};
    this.index = [];
    this.channels = {};
    this.routingLog = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.BotSwarm = BotSwarm;
    window.SWARM_TOPOLOGY = TOPOLOGY;
    window.SWARM_MSG_TYPES = MSG_TYPES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotSwarm: BotSwarm, SWARM_TOPOLOGY: TOPOLOGY, SWARM_MSG_TYPES: MSG_TYPES };
  }
})();
