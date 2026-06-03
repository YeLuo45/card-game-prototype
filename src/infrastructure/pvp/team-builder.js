// ============================================================================
// PvP Co-op — V283 Direction D Iteration 2/9
// TeamBuilder: 队伍组建 (角色分配/平衡/阵型/自动组队)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var TEAM_SIDE = { ALPHA: 'alpha', BETA: 'beta', COOP: 'coop' };

  var ROLE_TYPE = {
    TANK: 'tank',
    HEALER: 'healer',
    DPS: 'dps',
    SUPPORT: 'support',
    SCOUT: 'scout',
    LEADER: 'leader'
  };

  function TeamBuilder(options) {
    options = options || {};
    this.teams = {};  // teamId -> {side, members, role}
    this.teamCounter = 0;
    this.metrics = {
      teamsCreated: 0,
      assignments: 0,
      autoBalances: 0
    };
  }

  TeamBuilder.prototype.createTeam = function (config) {
    config = config || {};
    var teamId = 't_' + (++this.teamCounter) + '_' + Date.now();
    var team = {
      teamId: teamId,
      side: config.side || TEAM_SIDE.ALPHA,
      name: config.name || ('Team ' + this.teamCounter),
      members: [],  // [{playerId, role, level, rating, ...}]
      maxSize: config.maxSize || 5,
      requiredRoles: config.requiredRoles || [],
      formation: config.formation || 'flexible',
      createdAt: Date.now()
    };
    this.teams[teamId] = team;
    this.metrics.teamsCreated++;
    return { success: true, teamId: teamId, team: team };
  };

  TeamBuilder.prototype.deleteTeam = function (teamId) {
    if (!this.teams[teamId]) return { error: 'not_found' };
    delete this.teams[teamId];
    return { success: true };
  };

  TeamBuilder.prototype.addMember = function (teamId, member) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    if (!member || !member.playerId) return { error: 'invalid_member' };
    if (team.members.length >= team.maxSize) return { error: 'team_full' };
    // check duplicate
    for (var i = 0; i < team.members.length; i++) {
      if (team.members[i].playerId === member.playerId) return { error: 'already_member' };
    }
    var entry = {
      playerId: member.playerId,
      role: member.role || ROLE_TYPE.DPS,
      level: member.level || 1,
      rating: member.rating || 1000,
      preferredRole: member.preferredRole || member.role || ROLE_TYPE.DPS,
      stats: member.stats || {}
    };
    team.members.push(entry);
    this.metrics.assignments++;
    return { success: true, member: entry };
  };

  TeamBuilder.prototype.removeMember = function (teamId, playerId) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    for (var i = 0; i < team.members.length; i++) {
      if (team.members[i].playerId === playerId) {
        team.members.splice(i, 1);
        return { success: true };
      }
    }
    return { error: 'not_in_team' };
  };

  TeamBuilder.prototype.assignRole = function (teamId, playerId, role) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    for (var i = 0; i < team.members.length; i++) {
      if (team.members[i].playerId === playerId) {
        team.members[i].role = role;
        this.metrics.assignments++;
        return { success: true };
      }
    }
    return { error: 'not_in_team' };
  };

  // ---- Auto-balance by rating ----
  TeamBuilder.prototype.autoBalance = function (players, options) {
    if (!Array.isArray(players)) return { error: 'invalid_players' };
    if (players.length === 0) return { error: 'no_players' };
    options = options || {};
    var teamSize = options.teamSize || 2;
    var numTeams = Math.ceil(players.length / teamSize);
    // sort by rating desc
    var sorted = players.slice().sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    // snake draft: 0,1,2...2,1,0,0,1,2...
    var teams = [];
    for (var i = 0; i < numTeams; i++) {
      teams.push({ name: 'Team ' + (i + 1), members: [] });
    }
    var direction = 1;
    var teamIdx = 0;
    for (var p = 0; p < sorted.length; p++) {
      teams[teamIdx].members.push(sorted[p]);
      if (numTeams > 1) {
        teamIdx += direction;
        if (teamIdx >= numTeams) { teamIdx = numTeams - 1; direction = -1; }
        else if (teamIdx < 0) { teamIdx = 0; direction = 1; }
      }
    }
    this.metrics.autoBalances++;
    return { success: true, teams: teams, teamCount: numTeams };
  };

  // ---- Formation: 1-1-1, 2-2, etc. ----
  TeamBuilder.prototype.applyFormation = function (teamId, formation) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    team.formation = formation;
    // parse formation: "1-1-1" or "2-2"
    var rows = formation.split('-').map(function (n) { return parseInt(n, 10); });
    if (rows.some(function (n) { return isNaN(n); })) return { error: 'invalid_formation' };
    var total = rows.reduce(function (a, b) { return a + b; }, 0);
    if (total > team.maxSize) return { error: 'formation_exceeds_max' };
    return { success: true, formation: formation, rows: rows, total: total };
  };

  TeamBuilder.prototype.getFormationSlots = function (teamId) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    if (!team.formation) return { slots: [], total: 0 };
    var rows = team.formation.split('-').map(function (n) { return parseInt(n, 10); });
    var slots = [];
    var idx = 0;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r]; c++) {
        slots.push({ row: r, col: c, position: idx, assigned: idx < team.members.length ? team.members[idx].playerId : null });
        idx++;
      }
    }
    return { slots: slots, total: idx, formation: team.formation };
  };

  // ---- Role requirements check ----
  TeamBuilder.prototype.checkRequirements = function (teamId) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    var missing = [];
    var filled = {};
    for (var i = 0; i < team.members.length; i++) {
      var r = team.members[i].role;
      filled[r] = (filled[r] || 0) + 1;
    }
    for (var j = 0; j < team.requiredRoles.length; j++) {
      var req = team.requiredRoles[j];
      if ((filled[req.role] || 0) < req.count) {
        missing.push({ role: req.role, required: req.count, filled: filled[req.role] || 0 });
      }
    }
    return { success: true, satisfied: missing.length === 0, missing: missing, filled: filled };
  };

  TeamBuilder.prototype.setRequiredRoles = function (teamId, requiredRoles) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    if (!Array.isArray(requiredRoles)) return { error: 'invalid_input' };
    team.requiredRoles = requiredRoles.slice();
    return { success: true };
  };

  // ---- Team stats ----
  TeamBuilder.prototype.getTeamStats = function (teamId) {
    var team = this.teams[teamId];
    if (!team) return { error: 'not_found' };
    var totalRating = 0;
    var totalLevel = 0;
    var roleCount = {};
    for (var i = 0; i < team.members.length; i++) {
      totalRating += team.members[i].rating;
      totalLevel += team.members[i].level;
      roleCount[team.members[i].role] = (roleCount[team.members[i].role] || 0) + 1;
    }
    return {
      teamId: teamId,
      side: team.side,
      size: team.members.length,
      maxSize: team.maxSize,
      averageRating: team.members.length > 0 ? totalRating / team.members.length : 0,
      averageLevel: team.members.length > 0 ? totalLevel / team.members.length : 0,
      roleDistribution: roleCount,
      formation: team.formation
    };
  };

  // ---- Balance between two teams ----
  TeamBuilder.prototype.compareBalance = function (teamId1, teamId2) {
    var t1 = this.teams[teamId1];
    var t2 = this.teams[teamId2];
    if (!t1 || !t2) return { error: 'not_found' };
    var s1 = this.getTeamStats(teamId1);
    var s2 = this.getTeamStats(teamId2);
    var ratingDiff = Math.abs(s1.averageRating - s2.averageRating);
    var sizeDiff = Math.abs(s1.size - s2.size);
    // strict: diff must be < 200 AND size diff < 1
    var balanced = ratingDiff < 200 && sizeDiff < 1;
    return { team1: s1, team2: s2, ratingDiff: ratingDiff, sizeDiff: sizeDiff, balanced: balanced };
  };

  TeamBuilder.prototype.getTeam = function (teamId) {
    return this.teams[teamId] || null;
  };

  TeamBuilder.prototype.listTeams = function (filter) {
    var arr = [];
    for (var k in this.teams) {
      if (Object.prototype.hasOwnProperty.call(this.teams, k)) {
        var t = this.teams[k];
        if (filter) {
          if (filter.side && t.side !== filter.side) continue;
          if (filter.hasSpace && t.members.length >= t.maxSize) continue;
        }
        arr.push(t);
      }
    }
    return arr;
  };

  TeamBuilder.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  TeamBuilder.prototype.getSummary = function () {
    return {
      totalTeams: Object.keys(this.teams).length,
      metrics: this.metrics
    };
  };

  TeamBuilder.prototype.clear = function () {
    this.teams = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.TeamBuilder = TeamBuilder;
    window.TEAM_SIDE = TEAM_SIDE;
    window.ROLE_TYPE = ROLE_TYPE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TeamBuilder: TeamBuilder, TEAM_SIDE: TEAM_SIDE, ROLE_TYPE: ROLE_TYPE };
  }
})();
