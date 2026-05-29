// ============================================================================
// Card Shadow Guild — V203 Direction D
// Shadow guild with clandestine missions, stealth ranks, and covert ops
// generic-agent autonomous + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Mission: A covert mission
  // -----------------------------------------------------------------------
  function Mission(missionId, name, difficulty, target, reward, timeLimit) {
    this.missionId = missionId;
    this.name = name || missionId;
    this.difficulty = difficulty || 1; // 1-5
    this.target = target || 'neutralize';
    this.reward = reward || { gold: 50, xp: 25, rankPoints: 10 };
    this.timeLimit = timeLimit || 60; // minutes
    this.status = 'available'; // available, active, completed, failed
    this.assignedTo = null;
    this.startedAt = null;
    this.completedAt = null;
    this.success = false;
  }

  Mission.prototype.assign = function (agentId) {
    if (this.status !== 'available') return { error: 'not_available' };
    this.status = 'active';
    this.assignedTo = agentId;
    this.startedAt = Date.now();
    return { success: true, agentId: agentId };
  };

  Mission.prototype.complete = function (success) {
    if (this.status !== 'active') return { error: 'not_active' };
    this.status = success ? 'completed' : 'failed';
    this.completedAt = Date.now();
    this.success = success;
    if (success) {
      return {
        success: true,
        rewards: this._computeReward(),
        rankPoints: this.reward.rankPoints
      };
    }
    return { success: true, rewards: { gold: 0, xp: 0, rankPoints: 0 }, rankPoints: 0 };
  };

  Mission.prototype._computeReward = function () {
    var mult = Math.max(0.1, 1 - (this.difficulty - 1) * 0.1);
    return {
      gold: Math.floor(this.reward.gold * mult),
      xp: Math.floor(this.reward.xp * mult),
      rankPoints: Math.floor(this.reward.rankPoints * mult)
    };
  };

  Mission.prototype.isExpired = function () {
    if (this.status !== 'active' || !this.startedAt) return false;
    var elapsed = Date.now() - this.startedAt;
    return elapsed > this.timeLimit * 60 * 1000;
  };

  Mission.prototype.getStatus = function () {
    if (this.status === 'active' && this.isExpired()) return 'expired';
    return this.status;
  };

  // -----------------------------------------------------------------------
  // ShadowAgent: A guild agent
  // -----------------------------------------------------------------------
  function ShadowAgent(agentId, name, rank) {
    this.agentId = agentId;
    this.name = name || agentId;
    this.rank = rank || ' initiate'; // initiate, agent, senior, master, shadowlord
    this.experience = 0;
    this.missionsCompleted = 0;
    this.missionsFailed = 0;
    this.currentMissions = []; // missionIds
    this.stealth = 1; // 1-5
    this.combat = 1;
    this.intel = 1;
  }

  ShadowAgent.prototype.assignMission = function (missionId) {
    if (this.currentMissions.length >= 3) return { error: 'max_missions_reached' };
    if (this.currentMissions.indexOf(missionId) !== -1) return { error: 'already_assigned' };
    this.currentMissions.push(missionId);
    return { success: true, count: this.currentMissions.length };
  };

  ShadowAgent.prototype.completeMission = function (missionId, success) {
    var idx = this.currentMissions.indexOf(missionId);
    if (idx === -1) return { error: 'not_assigned' };
    this.currentMissions.splice(idx, 1);
    if (success) this.missionsCompleted++;
    else this.missionsFailed++;
    return { success: true };
  };

  ShadowAgent.prototype.addExperience = function (amount) {
    this.experience += amount;
    this._checkPromotion();
    return { success: true, experience: this.experience, rank: this.rank };
  };

  ShadowAgent.prototype._checkPromotion = function () {
    var thresholds = { ' initiate': 0, agent: 100, senior: 300, master: 600, shadowlord: 1000 };
    var ranks = [' initiate', 'agent', 'senior', 'master', 'shadowlord'];
    for (var i = ranks.length - 1; i >= 0; i--) {
      if (this.experience >= thresholds[ranks[i]]) {
        if (this.rank !== ranks[i]) this.rank = ranks[i];
        break;
      }
    }
  };

  ShadowAgent.prototype.getRank = function () { return this.rank; };
  ShadowAgent.prototype.getExperience = function () { return this.experience; };

  // -----------------------------------------------------------------------
  // ShadowGuild: Main guild manager
  // -----------------------------------------------------------------------
  function ShadowGuild(guildId, name) {
    this.guildId = guildId || ('guild_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Shadow Guild';
    this.missions = {};
    this.agents = {};
    this.missionCounter = 0;
    this.agentCounter = 0;
    this.guildTreasury = 0;
  }

  ShadowGuild.prototype.createMission = function (mission) {
    this.missions[mission.missionId] = mission;
    return { success: true, count: Object.keys(this.missions).length };
  };

  ShadowGuild.prototype.recruitAgent = function (agent) {
    this.agents[agent.agentId] = agent;
    return { success: true, count: Object.keys(this.agents).length };
  };

  ShadowGuild.prototype.getMission = function (id) { return this.missions[id] || null; };
  ShadowGuild.prototype.getAgent = function (id) { return this.agents[id] || null; };

  ShadowGuild.prototype.getAvailableMissions = function () {
    var result = [];
    for (var mid in this.missions) {
      if (this.missions[mid].status === 'available') result.push(this.missions[mid]);
    }
    return result;
  };

  ShadowGuild.prototype.getGuildRank = function (agentId) {
    var agent = this.agents[agentId];
    if (!agent) return null;
    return { rank: agent.getRank(), experience: agent.getExperience() };
  };

  ShadowGuild.prototype.addTreasury = function (gold) {
    this.guildTreasury += gold;
    return { success: true, treasury: this.guildTreasury };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Mission = Mission;
  window.ShadowAgent = ShadowAgent;
  window.ShadowGuild = ShadowGuild;
})();