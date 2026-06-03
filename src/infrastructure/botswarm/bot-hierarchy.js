// ============================================================================
// Bot Swarm Arena — V271 Direction B Iteration 8/9
// BotHierarchy: 角色分层 (worker/scout/leader/queen + 监督链/晋升/降级)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var ROLES = {
    WORKER: 'worker',       // L0
    SCOUT: 'scout',         // L1
    TACTIC: 'tactic',       // L2
    LEADER: 'leader',       // L3
    QUEEN: 'queen'          // L4
  };

  var ROLE_RANK = { worker: 0, scout: 1, tactic: 2, leader: 3, queen: 4 };

  function BotHierarchy(options) {
    options = options || {};
    this.swarm = options.swarm || null;
    this.assignments = {};  // agentId -> role
    this.supervisors = {};  // agentId -> supervisorId
    this.subordinates = {}; // agentId -> [subordinateIds]
    this.history = [];      // role changes
    this.metrics = {
      promotions: 0,
      demotions: 0,
      roleChanges: 0
    };
  }

  BotHierarchy.prototype.assign = function (agentId, role, supervisorId) {
    if (typeof agentId !== 'string') return { error: 'invalid_agent' };
    if (!ROLE_RANK.hasOwnProperty(role)) return { error: 'invalid_role' };
    var oldRole = this.assignments[agentId];
    this.assignments[agentId] = role;
    // supervisor
    if (supervisorId) {
      if (ROLE_RANK[supervisorId] !== undefined) {
        // supervisor is itself a role, not an id
        return { error: 'supervisor_must_be_id' };
      }
      // remove old supervisor link
      var oldSup = this.supervisors[agentId];
      if (oldSup && this.subordinates[oldSup]) {
        var idx = this.subordinates[oldSup].indexOf(agentId);
        if (idx !== -1) this.subordinates[oldSup].splice(idx, 1);
      }
      this.supervisors[agentId] = supervisorId;
      if (!this.subordinates[supervisorId]) this.subordinates[supervisorId] = [];
      if (this.subordinates[supervisorId].indexOf(agentId) === -1) {
        this.subordinates[supervisorId].push(agentId);
      }
    }
    if (oldRole !== role) {
      this.metrics.roleChanges++;
      if (ROLE_RANK[role] > ROLE_RANK[oldRole || 'worker']) this.metrics.promotions++;
      else this.metrics.demotions++;
      this.history.push({ agentId: agentId, from: oldRole, to: role, ts: Date.now() });
    }
    return { success: true, agentId: agentId, role: role, previous: oldRole };
  };

  BotHierarchy.prototype.unassign = function (agentId) {
    if (!this.assignments[agentId]) return { error: 'not_assigned' };
    var oldRole = this.assignments[agentId];
    delete this.assignments[agentId];
    var sup = this.supervisors[agentId];
    if (sup && this.subordinates[sup]) {
      var idx = this.subordinates[sup].indexOf(agentId);
      if (idx !== -1) this.subordinates[sup].splice(idx, 1);
    }
    delete this.supervisors[agentId];
    return { success: true, agentId: agentId, previousRole: oldRole };
  };

  BotHierarchy.prototype.getRole = function (agentId) {
    return this.assignments[agentId] || null;
  };

  BotHierarchy.prototype.getRank = function (agentId) {
    var role = this.assignments[agentId];
    return role ? ROLE_RANK[role] : -1;
  };

  BotHierarchy.prototype.getSupervisor = function (agentId) {
    return this.supervisors[agentId] || null;
  };

  BotHierarchy.prototype.getSubordinates = function (agentId) {
    return (this.subordinates[agentId] || []).slice();
  };

  BotHierarchy.prototype.getChain = function (agentId) {
    var chain = [];
    var current = this.supervisors[agentId];
    var seen = {};
    while (current && !seen[current]) {
      seen[current] = true;
      chain.push(current);
      current = this.supervisors[current];
    }
    return chain;
  };

  BotHierarchy.prototype.getChainOfCommand = function (agentId) {
    var chain = this.getChain(agentId).reverse();
    chain.push(agentId);
    return chain;
  };

  // ---- Promotion / Demotion ----
  BotHierarchy.prototype.promote = function (agentId) {
    var cur = this.assignments[agentId];
    if (!cur) return { error: 'not_assigned' };
    var rank = ROLE_RANK[cur];
    if (rank >= 4) return { error: 'already_top' };
    var ranks = Object.keys(ROLE_RANK);
    var newRole = ranks[rank + 1];
    return this.assign(agentId, newRole, this.supervisors[agentId]);
  };

  BotHierarchy.prototype.demote = function (agentId) {
    var cur = this.assignments[agentId];
    if (!cur) return { error: 'not_assigned' };
    var rank = ROLE_RANK[cur];
    if (rank <= 0) return { error: 'already_bottom' };
    var ranks = Object.keys(ROLE_RANK);
    var newRole = ranks[rank - 1];
    return this.assign(agentId, newRole, this.supervisors[agentId]);
  };

  // ---- Layer queries ----
  BotHierarchy.prototype.getLayer = function (role) {
    var arr = [];
    for (var k in this.assignments) {
      if (Object.prototype.hasOwnProperty.call(this.assignments, k) && this.assignments[k] === role) {
        arr.push(k);
      }
    }
    return arr;
  };

  BotHierarchy.prototype.getLayerByRank = function (rank) {
    var arr = [];
    for (var k in this.assignments) {
      if (Object.prototype.hasOwnProperty.call(this.assignments, k) && ROLE_RANK[this.assignments[k]] === rank) {
        arr.push(k);
      }
    }
    return arr;
  };

  // ---- Subtree ----
  BotHierarchy.prototype.getSubtree = function (rootId) {
    var result = [];
    var stack = [rootId];
    var visited = {};
    while (stack.length > 0) {
      var id = stack.pop();
      if (visited[id]) continue;
      visited[id] = true;
      result.push(id);
      var subs = this.subordinates[id] || [];
      for (var i = 0; i < subs.length; i++) {
        if (!visited[subs[i]]) stack.push(subs[i]);
      }
    }
    return result;
  };

  // ---- Validation ----
  BotHierarchy.prototype.validate = function () {
    var issues = [];
    // check no cycles in supervisor chain
    for (var k in this.supervisors) {
      if (Object.prototype.hasOwnProperty.call(this.supervisors, k)) {
        var visited = {};
        var current = this.supervisors[k];
        while (current) {
          if (visited[current]) {
            issues.push({ type: 'cycle', agentId: k, supervisor: current });
            break;
          }
          visited[current] = true;
          current = this.supervisors[current];
        }
      }
    }
    // check rank ordering: supervisor should have higher rank
    for (var k2 in this.supervisors) {
      if (Object.prototype.hasOwnProperty.call(this.supervisors, k2)) {
        var sup = this.supervisors[k2];
        var subRank = ROLE_RANK[this.assignments[k2]];
        var supRank = ROLE_RANK[this.assignments[sup]];
        if (subRank !== undefined && supRank !== undefined && supRank <= subRank) {
          issues.push({ type: 'rank_order', agentId: k2, subRank: subRank, supRank: supRank });
        }
      }
    }
    // check one queen
    var queens = this.getLayer(ROLES.QUEEN);
    if (queens.length > 1) {
      issues.push({ type: 'multiple_queens', count: queens.length });
    }
    return { valid: issues.length === 0, issues: issues };
  };

  // ---- Snapshot ----
  BotHierarchy.prototype.snapshot = function () {
    return {
      assignments: JSON.parse(JSON.stringify(this.assignments)),
      supervisors: JSON.parse(JSON.stringify(this.supervisors)),
      subordinates: JSON.parse(JSON.stringify(this.subordinates)),
      ts: Date.now()
    };
  };

  BotHierarchy.prototype.restore = function (snap) {
    if (!snap) return { error: 'invalid_snapshot' };
    this.assignments = JSON.parse(JSON.stringify(snap.assignments || {}));
    this.supervisors = JSON.parse(JSON.stringify(snap.supervisors || {}));
    this.subordinates = JSON.parse(JSON.stringify(snap.subordinates || {}));
    return { success: true };
  };

  // ---- Stats ----
  BotHierarchy.prototype.getDistribution = function () {
    var dist = { worker: 0, scout: 0, tactic: 0, leader: 0, queen: 0, unassigned: 0 };
    for (var k in this.assignments) {
      if (Object.prototype.hasOwnProperty.call(this.assignments, k)) {
        dist[this.assignments[k]]++;
      }
    }
    dist.unassigned = 0;  // only count assigned
    return dist;
  };

  BotHierarchy.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  BotHierarchy.prototype.getHistory = function (limit) {
    if (typeof limit === 'number' && limit > 0) return this.history.slice(-limit);
    return this.history.slice();
  };

  BotHierarchy.prototype.getSummary = function () {
    return {
      totalAssigned: Object.keys(this.assignments).length,
      distribution: this.getDistribution(),
      metrics: this.metrics,
      valid: this.validate().valid
    };
  };

  BotHierarchy.prototype.clear = function () {
    this.assignments = {};
    this.supervisors = {};
    this.subordinates = {};
    this.history = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.BotHierarchy = BotHierarchy;
    window.HIERARCHY_ROLES = ROLES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotHierarchy: BotHierarchy, HIERARCHY_ROLES: ROLES };
  }
})();
