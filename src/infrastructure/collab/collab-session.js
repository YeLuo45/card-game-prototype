// ============================================================================
// Collab Arena Manager — V1: CollabArenaSession + SessionState
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

var SessionState = function(sessionId) {
  this.sessionId = sessionId || 'session_' + Date.now();
  this.players = [];
  this.maxPlayers = 4;
  this.minPlayers = 2;
  this.state = 'waiting'; // waiting, ready, in_progress, completed, abandoned
  this.currentTurn = 0;
  this.turnOrder = [];
  this.sharedResources = {};
  this.sessionData = {};
  this.createdAt = Date.now();
  this.startedAt = null;
  this.endedAt = null;
};

SessionState.prototype.addPlayer = function(playerId, playerData) {
  if (this.state !== 'waiting') return { error: 'session_not_joinable' };
  if (this.players.length >= this.maxPlayers) return { error: 'session_full' };
  if (this.players.some(function(p) { return p.playerId === playerId; })) return { error: 'already_joined' };
  var player = {
    playerId: playerId,
    playerData: playerData || {},
    joinedAt: Date.now(),
    ready: false,
    role: null,
    health: 100,
    score: 0,
    contributions: 0
  };
  this.players.push(player);
  return { success: true, playerCount: this.players.length };
};

SessionState.prototype.removePlayer = function(playerId) {
  var idx = -1;
  for (var i = 0; i < this.players.length; i++) {
    if (this.players[i].playerId === playerId) { idx = i; break; }
  }
  if (idx === -1) return { error: 'player_not_found' };
  this.players.splice(idx, 1);
  return { success: true, playerCount: this.players.length };
};

SessionState.prototype.setPlayerReady = function(playerId, ready) {
  var player = this._getPlayer(playerId);
  if (!player) return { error: 'player_not_found' };
  player.ready = !!ready;
  return { success: true, readyCount: this._getReadyCount() };
};

SessionState.prototype.canStart = function() {
  return this.state === 'waiting' && 
         this.players.length >= this.minPlayers && 
         this._getReadyCount() === this.players.length;
};

SessionState.prototype.startSession = function() {
  if (!this.canStart()) return { error: 'cannot_start' };
  this.state = 'in_progress';
  this.startedAt = Date.now();
  this.turnOrder = this.players.map(function(p) { return p.playerId; });
  this.currentTurn = 0;
  return { success: true, turnOrder: this.turnOrder };
};

SessionState.prototype.endSession = function(result) {
  this.state = 'completed';
  this.endedAt = Date.now();
  this.sessionData.result = result || 'unknown';
  return { success: true };
};

SessionState.prototype.getActivePlayer = function() {
  if (this.state !== 'in_progress') return null;
  return this.turnOrder[this.currentTurn % this.turnOrder.length];
};

SessionState.prototype.advanceTurn = function() {
  if (this.state !== 'in_progress') return { error: 'session_not_active' };
  this.currentTurn++;
  return { success: true, currentTurn: this.currentTurn, activePlayer: this.getActivePlayer() };
};

SessionState.prototype.getPlayer = function(playerId) {
  return this._getPlayer(playerId);
};

SessionState.prototype._getPlayer = function(playerId) {
  for (var i = 0; i < this.players.length; i++) {
    if (this.players[i].playerId === playerId) return this.players[i];
  }
  return null;
};

SessionState.prototype._getReadyCount = function() {
  var count = 0;
  for (var i = 0; i < this.players.length; i++) { if (this.players[i].ready) count++; }
  return count;
};

SessionState.prototype.getSessionInfo = function() {
  return {
    sessionId: this.sessionId,
    state: this.state,
    playerCount: this.players.length,
    maxPlayers: this.maxPlayers,
    currentTurn: this.currentTurn,
    activePlayer: this.getActivePlayer(),
    readyCount: this._getReadyCount(),
    canStart: this.canStart()
  };
};

var CollabArenaManager = function() {
  this.sessions = {};
  this.sessionHistory = [];
};

CollabArenaManager.prototype.createSession = function(sessionId, config) {
  var id = sessionId || 'arena_' + Date.now();
  if (this.sessions[id]) return { error: 'session_exists' };
  var session = new SessionState(id);
  if (config) {
    if (config.maxPlayers) session.maxPlayers = config.maxPlayers;
    if (config.minPlayers) session.minPlayers = config.minPlayers;
    if (config.sharedResources) session.sharedResources = config.sharedResources;
  }
  this.sessions[id] = session;
  return { success: true, sessionId: id };
};

CollabArenaManager.prototype.getSession = function(sessionId) {
  return this.sessions[sessionId] || null;
};

CollabArenaManager.prototype.getActiveSessions = function() {
  var active = [];
  for (var id in this.sessions) {
    if (this.sessions[id].state === 'waiting' || this.sessions[id].state === 'in_progress') {
      active.push(this.sessions[id].getSessionInfo());
    }
  }
  return active;
};

CollabArenaManager.prototype.endSession = function(sessionId, result) {
  var session = this.sessions[sessionId];
  if (!session) return { error: 'session_not_found' };
  var r = session.endSession(result);
  this.sessionHistory.push({
    sessionId: sessionId,
    result: result,
    endedAt: Date.now(),
    playerCount: session.players.length
  });
  return r;
};

window.SessionState = SessionState;
window.CollabArenaManager = CollabArenaManager;
