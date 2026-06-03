// ============================================================================
// PvP Co-op — V286 Direction D Iteration 5/9
// CoopMission: 合作任务 (目标/进度/奖励/协调/触发)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var MISSION_STATUS = {
    LOCKED: 'locked',
    AVAILABLE: 'available',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    EXPIRED: 'expired'
  };

  var OBJECTIVE_TYPE = {
    KILL: 'kill',
    COLLECT: 'collect',
    SURVIVE: 'survive',
    ESCORT: 'escort',
    DEFEAT_BOSS: 'defeat_boss',
    REACH_LOCATION: 'reach_location'
  };

  function CoopMission(options) {
    options = options || {};
    this.missions = {};
    this.missionCounter = 0;
    this.metrics = {
      created: 0,
      started: 0,
      completed: 0,
      failed: 0,
      objectivesCompleted: 0
    };
  }

  CoopMission.prototype.create = function (config) {
    config = config || {};
    if (!config.name) return { error: 'name_required' };
    if (!Array.isArray(config.objectives) || config.objectives.length === 0) return { error: 'objectives_required' };
    var missionId = 'm_' + (++this.missionCounter) + '_' + Date.now();
    var mission = {
      missionId: missionId,
      name: config.name,
      description: config.description || '',
      status: MISSION_STATUS.AVAILABLE,
      objectives: config.objectives.map(function (o) {
        return {
          id: o.id || 'obj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: o.type || OBJECTIVE_TYPE.KILL,
          target: o.target || null,
          count: o.count || 1,
          progress: 0,
          completed: false,
          contributors: {}
        };
      }),
      rewards: config.rewards || {},
      minPlayers: config.minPlayers || 1,
      maxPlayers: config.maxPlayers || 4,
      participants: [],
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      timeLimit: config.timeLimit || null
    };
    this.missions[missionId] = mission;
    this.metrics.created++;
    return { success: true, missionId: missionId, mission: mission };
  };

  CoopMission.prototype.start = function (missionId, playerIds) {
    var m = this.missions[missionId];
    if (!m) return { error: 'not_found' };
    if (m.status !== MISSION_STATUS.AVAILABLE) return { error: 'invalid_state', current: m.status };
    if (!Array.isArray(playerIds)) return { error: 'invalid_players' };
    if (playerIds.length < m.minPlayers) return { error: 'not_enough_players' };
    if (playerIds.length > m.maxPlayers) return { error: 'too_many_players' };
    m.participants = playerIds.slice();
    m.status = MISSION_STATUS.IN_PROGRESS;
    m.startedAt = Date.now();
    this.metrics.started++;
    return { success: true };
  };

  CoopMission.prototype.contribute = function (missionId, objectiveId, playerId, amount) {
    var m = this.missions[missionId];
    if (!m) return { error: 'not_found' };
    if (m.status !== MISSION_STATUS.IN_PROGRESS) return { error: 'invalid_state' };
    if (typeof amount !== 'number' || amount <= 0) return { error: 'invalid_amount' };
    var obj = null;
    for (var i = 0; i < m.objectives.length; i++) {
      if (m.objectives[i].id === objectiveId) { obj = m.objectives[i]; break; }
    }
    if (!obj) return { error: 'objective_not_found' };
    if (obj.completed) return { error: 'already_completed' };
    obj.progress = Math.min(obj.count, obj.progress + amount);
    if (!obj.contributors[playerId]) obj.contributors[playerId] = 0;
    obj.contributors[playerId] += amount;
    if (obj.progress >= obj.count) {
      obj.completed = true;
      this.metrics.objectivesCompleted++;
    }
    return { success: true, progress: obj.progress, completed: obj.completed };
  };

  CoopMission.prototype.complete = function (missionId) {
    var m = this.missions[missionId];
    if (!m) return { error: 'not_found' };
    if (m.status !== MISSION_STATUS.IN_PROGRESS) return { error: 'invalid_state' };
    var allDone = m.objectives.every(function (o) { return o.completed; });
    if (!allDone) {
      m.status = MISSION_STATUS.FAILED;
      this.metrics.failed++;
      return { success: false, error: 'objectives_incomplete' };
    }
    m.status = MISSION_STATUS.COMPLETED;
    m.completedAt = Date.now();
    this.metrics.completed++;
    return { success: true, rewards: m.rewards };
  };

  CoopMission.prototype.fail = function (missionId, reason) {
    var m = this.missions[missionId];
    if (!m) return { error: 'not_found' };
    if (m.status !== MISSION_STATUS.IN_PROGRESS) return { error: 'invalid_state' };
    m.status = MISSION_STATUS.FAILED;
    m.failedAt = Date.now();
    m.failReason = reason || null;
    this.metrics.failed++;
    return { success: true };
  };

  CoopMission.prototype.getProgress = function (missionId) {
    var m = this.missions[missionId];
    if (!m) return null;
    var total = m.objectives.length;
    var completed = m.objectives.filter(function (o) { return o.completed; }).length;
    return {
      missionId: missionId,
      status: m.status,
      totalObjectives: total,
      completedObjectives: completed,
      percent: total > 0 ? completed / total : 0
    };
  };

  CoopMission.prototype.getMission = function (missionId) {
    return this.missions[missionId] || null;
  };

  CoopMission.prototype.listMissions = function (filter) {
    var arr = [];
    for (var k in this.missions) {
      if (Object.prototype.hasOwnProperty.call(this.missions, k)) {
        var m = this.missions[k];
        if (filter && filter.status && m.status !== filter.status) continue;
        arr.push(m);
      }
    }
    return arr;
  };

  CoopMission.prototype.getContributors = function (missionId, objectiveId) {
    var m = this.missions[missionId];
    if (!m) return null;
    var obj = m.objectives.find(function (o) { return o.id === objectiveId; });
    if (!obj) return null;
    return JSON.parse(JSON.stringify(obj.contributors));
  };

  CoopMission.prototype.distributeRewards = function (missionId) {
    var m = this.missions[missionId];
    if (!m) return { error: 'not_found' };
    if (m.status !== MISSION_STATUS.COMPLETED) return { error: 'mission_not_completed' };
    var distribution = {};
    var share = {};
    if (m.rewards.exp) share.exp = Math.floor(m.rewards.exp / m.participants.length);
    if (m.rewards.gold) share.gold = Math.floor(m.rewards.gold / m.participants.length);
    if (m.rewards.items && Array.isArray(m.rewards.items)) {
      share.items = m.rewards.items.slice();
    }
    for (var i = 0; i < m.participants.length; i++) {
      distribution[m.participants[i]] = JSON.parse(JSON.stringify(share));
    }
    return { success: true, distribution: distribution, total: m.rewards };
  };

  CoopMission.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  CoopMission.prototype.getSummary = function () {
    return {
      total: Object.keys(this.missions).length,
      byStatus: this.listMissions().reduce(function (acc, m) {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {}),
      metrics: this.metrics
    };
  };

  CoopMission.prototype.clear = function () {
    this.missions = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.CoopMission = CoopMission;
    window.MISSION_STATUS = MISSION_STATUS;
    window.OBJECTIVE_TYPE = OBJECTIVE_TYPE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CoopMission: CoopMission, MISSION_STATUS: MISSION_STATUS, OBJECTIVE_TYPE: OBJECTIVE_TYPE };
  }
})();
