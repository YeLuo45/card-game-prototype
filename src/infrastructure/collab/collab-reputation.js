// ============================================================================
// Collab Arena — V6: PlayerReputation + ContributionTracker
// generic-agent autonomous goal tracking + thunderbolt feedback loops
// ============================================================================
'use strict';

var ReputationEvent = {
  TEAMWORK_BONUS: 'teamwork_bonus',
  LEADERSHIP: 'leadership',
  COMEBACK: 'comeback',
  FAIR_PLAY: 'fair_play',
  AFK: 'afk',
  TOXICITY: 'toxicity'
};

var ReputationLevel = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

var PlayerReputation = function(playerId) {
  this.playerId = playerId;
  this.scores = {};
  for (var i = 0; i < ReputationLevel.length; i++) {
    this.scores[ReputationLevel[i]] = 0;
  }
  this.totalScore = 0;
  this.level = ReputationLevel[0];
  this.events = [];
  this.history = [];
};

PlayerReputation.prototype.addEvent = function(eventType, delta, context) {
  this.events.push({ type: eventType, delta: delta, context: context, timestamp: Date.now() });
  this.history.push({ type: eventType, delta: delta, context: context, timestamp: Date.now() });
  this._recalculate();
};

PlayerReputation.prototype._recalculate = function() {
  var total = 0;
  for (var i = 0; i < this.events.length; i++) {
    total += this.events[i].delta;
  }
  var avgPerEvent = this.events.length > 0 ? total / this.events.length : 0;
  var base = Math.max(0, total);
  this.totalScore = Math.floor(base);
  var newLevelIdx = 0;
  if (this.totalScore >= 2000) newLevelIdx = 4;
  else if (this.totalScore >= 1000) newLevelIdx = 3;
  else if (this.totalScore >= 500) newLevelIdx = 2;
  else if (this.totalScore >= 100) newLevelIdx = 1;
  this.level = ReputationLevel[newLevelIdx];
};

PlayerReputation.prototype.getReputation = function() {
  return {
    playerId: this.playerId,
    totalScore: this.totalScore,
    level: this.level,
    eventCount: this.events.length,
    recentEvents: this.events.slice(-5)
  };
};

PlayerReputation.prototype.getHistory = function(limit) {
  return this.history.slice(-(limit || 50));
};

var ContributionTracker = function() {
  this.playerContributions = {};
  this.sessionContributions = {};
  this.leaderboard = [];
};

ContributionTracker.prototype.getOrCreatePlayer = function(playerId) {
  if (!this.playerContributions[playerId]) {
    this.playerContributions[playerId] = {
      playerId: playerId,
      damageDealt: 0,
      healingDone: 0,
      objectivesTaken: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      teamworkScore: 0
    };
  }
  return this.playerContributions[playerId];
};

ContributionTracker.prototype.recordAction = function(sessionId, playerId, actionType, value) {
  var p = this.getOrCreatePlayer(playerId);
  if (!this.sessionContributions[sessionId]) this.sessionContributions[sessionId] = {};
  if (!this.sessionContributions[sessionId][playerId]) {
    this.sessionContributions[sessionId][playerId] = {playerId: playerId, damageDealt: 0, healingDone: 0, objectivesTaken: 0, gamesPlayed: 0, gamesWon: 0, teamworkScore: 0};
  }
  if (actionType === 'damage_dealt') { p.damageDealt += value; this.sessionContributions[sessionId][playerId].damageDealt += value; }
  else if (actionType === 'healing_done') { p.healingDone += value; this.sessionContributions[sessionId][playerId].healingDone += value; }
  else if (actionType === 'objectives_taken') { p.objectivesTaken += value; this.sessionContributions[sessionId][playerId].objectivesTaken += value; }
  return { success: true, updated: p };
};

ContributionTracker.prototype.recordGameResult = function(sessionId, playerId, won) {
  var p = this.getOrCreatePlayer(playerId);
  p.gamesPlayed++;
  if (won) p.gamesWon++;
  if (!this.sessionContributions[sessionId]) this.sessionContributions[sessionId] = {};
  if (!this.sessionContributions[sessionId][playerId]) this.sessionContributions[sessionId][playerId] = {};
  this.sessionContributions[sessionId][playerId].gamesPlayed = (this.sessionContributions[sessionId][playerId].gamesPlayed || 0) + 1;
  if (won) this.sessionContributions[sessionId][playerId].gamesWon = (this.sessionContributions[sessionId][playerId].gamesWon || 0) + 1;
  return { success: true, gamesPlayed: p.gamesPlayed, gamesWon: p.gamesWon };
};

ContributionTracker.prototype.getPlayerStats = function(playerId) {
  return this.getOrCreatePlayer(playerId);
};

ContributionTracker.prototype.getSessionStats = function(sessionId) {
  var result = {};
  var session = this.sessionContributions[sessionId] || {};
  for (var pid in session) {
    result[pid] = session[pid];
  }
  return result;
};

ContributionTracker.prototype.getLeaderboard = function(limit) {
  var players = [];
  for (var pid in this.playerContributions) {
    players.push(this.playerContributions[pid]);
  }
  players.sort(function(a, b) {
    var aScore = a.damageDealt + a.healingDone * 2 + a.objectivesTaken * 100 + (a.gamesWon * 50);
    var bScore = b.damageDealt + b.healingDone * 2 + b.objectivesTaken * 100 + (b.gamesWon * 50);
    return bScore - aScore;
  });
  return players.slice(0, limit || 10);
};

window.ReputationEvent = ReputationEvent;
window.ReputationLevel = ReputationLevel;
window.PlayerReputation = PlayerReputation;
window.ContributionTracker = ContributionTracker;
