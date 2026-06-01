// ============================================================================
// Collab Arena — V7: CollabArena unified API
// nanobot mesh + chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

var CollabArena = function() {
  this.sessionManager = new (function() {
    this.sessions = {};
    this.create = function(id, config) {
      if (this.sessions[id]) return { error: 'exists' };
      this.sessions[id] = { sessionId: id, state: 'waiting', players: [], config: config || {} };
      return { success: true, sessionId: id };
    };
    this.get = function(id) { return this.sessions[id] || null; };
    this.getActive = function() { return Object.values(this.sessions).filter(function(s) { return s.state === 'waiting' || s.state === 'in_progress'; }); };
  })();
  
  this.roleSystem = new (function() {
    var PLAYER_ROLES = { TANK: 'tank', DPS: 'dps', SUPPORT: 'support', CONTROLLER: 'controller', FLEX: 'flex' };
    this.roles = Object.keys(PLAYER_ROLES);
    this.assignments = {};
    this.assign = function(sessionId, playerId, role) {
      if (!this.assignments[sessionId]) this.assignments[sessionId] = {};
      this.assignments[sessionId][playerId] = role;
      return { success: true, role: role };
    };
    this.getRole = function(sessionId, playerId) {
      return (this.assignments[sessionId] && this.assignments[sessionId][playerId]) || null;
    };
    this.getTeam = function(sessionId) {
      var comp = {};
      var session = this.assignments[sessionId] || {};
      for (var pid in session) { var r = session[pid]; if (!comp[r]) comp[r] = []; comp[r].push(pid); }
      return comp;
    };
  })();
  
  this.resourceManager = new (function() {
    var ResourceType = { HEALTH_PACK: 'hp', SHIELD_CHARGE: 'sh', ENERGY: 'en', SPECIAL: 'sp' };
    var pools = {};
    pools[ResourceType.HEALTH_PACK] = { capacity: 3, available: 3 };
    pools[ResourceType.SHIELD_CHARGE] = { capacity: 4, available: 4 };
    this.locks = {};
    this.acquire = function(sessionId, playerId, rt) {
      if (!pools[rt] || pools[rt].available <= 0) return { error: 'depleted' };
      var lockKey = sessionId + ':' + playerId + ':' + rt;
      if (this.locks[lockKey]) return { error: 'locked' };
      pools[rt].available--;
      this.locks[lockKey] = true;
      return { success: true, available: pools[rt].available };
    };
    this.release = function(lockKey) {
      delete this.locks[lockKey];
      return { success: true };
    };
    this.status = function(rt) { return pools[rt] ? { available: pools[rt].available, capacity: pools[rt].capacity } : null; };
  })();
  
  this.broadcastManager = new (function() {
    this.channels = {};
    this.getChannel = function(sessionId) {
      if (!this.channels[sessionId]) this.channels[sessionId] = { listeners: [], messages: [] };
      return this.channels[sessionId];
    };
    this.subscribe = function(sessionId, playerId) {
      var ch = this.getChannel(sessionId);
      ch.listeners.push({ playerId: playerId });
      return { success: true, count: ch.listeners.length };
    };
    this.broadcast = function(sessionId, event, data) {
      var ch = this.getChannel(sessionId);
      var delivered = ch.listeners.length;
      ch.messages.push({ event: event, data: data, ts: Date.now() });
      return { deliveredCount: delivered, totalListeners: ch.listeners.length };
    };
  })();
  
  this.bracketManager = new (function() {
    this.brackets = {};
    this.build = function(tournamentId, participantIds) {
      var n = participantIds.length;
      var rounds = Math.ceil(Math.log2(n));
      this.brackets[tournamentId] = { tournamentId: tournamentId, rounds: rounds, participants: participantIds, matches: {}, state: 'pending' };
      return { rounds: rounds, totalParticipants: n };
    };
    this.get = function(tournamentId) { return this.brackets[tournamentId] || null; };
  })();
  
  this.reputationTracker = new (function() {
    this.players = {};
    this.record = function(playerId, eventType, delta) {
      if (!this.players[playerId]) this.players[playerId] = { playerId: playerId, score: 0, level: 'bronze' };
      this.players[playerId].score += delta;
      if (this.players[playerId].score >= 1000) this.players[playerId].level = 'gold';
      else if (this.players[playerId].score >= 100) this.players[playerId].level = 'silver';
      return { success: true, score: this.players[playerId].score };
    };
    this.get = function(playerId) { return this.players[playerId] || null; };
  })();
};

CollabArena.prototype.createSession = function(sessionId, config) { return this.sessionManager.create(sessionId, config); };
CollabArena.prototype.getSession = function(sessionId) { return this.sessionManager.get(sessionId); };
CollabArena.prototype.getActiveSessions = function() { return this.sessionManager.getActive(); };
CollabArena.prototype.assignRole = function(sessionId, playerId, role) { return this.roleSystem.assign(sessionId, playerId, role); };
CollabArena.prototype.getPlayerRole = function(sessionId, playerId) { return this.roleSystem.getRole(sessionId, playerId); };
CollabArena.prototype.getTeamComposition = function(sessionId) { return this.roleSystem.getTeam(sessionId); };
CollabArena.prototype.acquireResource = function(sessionId, playerId, resourceType) { return this.resourceManager.acquire(sessionId, playerId, resourceType); };
CollabArena.prototype.releaseResource = function(lockKey) { return this.resourceManager.release(lockKey); };
CollabArena.prototype.getResourceStatus = function(resourceType) { return this.resourceManager.status(resourceType); };
CollabArena.prototype.subscribeToSession = function(sessionId, playerId) { return this.broadcastManager.subscribe(sessionId, playerId); };
CollabArena.prototype.broadcast = function(sessionId, event, data) { return this.broadcastManager.broadcast(sessionId, event, data); };
CollabArena.prototype.buildTournament = function(tournamentId, participantIds) { return this.bracketManager.build(tournamentId, participantIds); };
CollabArena.prototype.getTournament = function(tournamentId) { return this.bracketManager.get(tournamentId); };
CollabArena.prototype.recordReputation = function(playerId, eventType, delta) { return this.reputationTracker.record(playerId, eventType, delta); };
CollabArena.prototype.getPlayerReputation = function(playerId) { return this.reputationTracker.get(playerId); };

window.CollabArena = CollabArena;
