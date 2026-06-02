// ============================================================================
// Collab Arena — V5: TournamentBracket + MatchScheduler
// ruflo hierarchical decomposition + generic-agent autonomous scheduling
// ============================================================================
'use strict';

var BracketNode = function(id, type, metadata) {
  this.id = id;
  this.type = type; // 'match' | 'round' | 'stage'
  this.metadata = metadata || {};
  this.children = [];
  this.parent = null;
  this.winner = null;
  this.participants = [];
  this.state = 'pending'; // pending, in_progress, completed
  this.scheduledTime = null;
  this.completedAt = null;
};

BracketNode.prototype.addChild = function(node) {
  node.parent = this;
  this.children.push(node);
  return this;
};

BracketNode.prototype.setParticipants = function(participantIds) {
  this.participants = participantIds.slice();
  return this;
};

BracketNode.prototype.complete = function(winnerId) {
  this.winner = winnerId;
  this.state = 'completed';
  this.completedAt = Date.now();
  return this;
};

BracketNode.prototype.getMatchInfo = function() {
  return {
    id: this.id,
    type: this.type,
    participants: this.participants,
    winner: this.winner,
    state: this.state,
    scheduledTime: this.scheduledTime
  };
};

var TournamentBracket = function(tournamentId, config) {
  this.tournamentId = tournamentId;
  this.config = config || {};
  this.bracket = null;
  this.allNodes = {};
  this.participants = [];
  this.currentRound = 0;
  this.totalRounds = 0;
};

TournamentBracket.prototype.buildSingleElimination = function(participantIds) {
  this.participants = participantIds.slice();
  var n = participantIds.length;
  var rounds = Math.ceil(Math.log2(n));
  this.totalRounds = rounds;
  this.currentRound = 0;
  var root = new BracketNode('root', 'stage', { name: 'championship' });
  this.allNodes['root'] = root;
  this.bracket = root;
  var roundNodes = [];
  for (var i = 0; i < n; i += 2) {
    var matchId = 'match_r0_' + i;
    var match = new BracketNode(matchId, 'match', { round: 0 });
    match.setParticipants([participantIds[i], participantIds[i + 1] || null]);
    this.allNodes[matchId] = match;
    roundNodes.push(match);
  }
  for (var j = 0; j < roundNodes.length; j++) {
    root.addChild(roundNodes[j]);
  }
  var prevRound = roundNodes;
  for (var r = 1; r < rounds; r++) {
    var nextRoundNodes = [];
    for (var k = 0; k < prevRound.length; k += 2) {
      var roundNodeId = 'round_' + r + '_node_' + k;
      var roundNode = new BracketNode(roundNodeId, 'round', { round: r });
      this.allNodes[roundNodeId] = roundNode;
      prevRound[k].parent = roundNode;
      prevRound[k + 1].parent = roundNode;
      roundNode.children = [prevRound[k], prevRound[k + 1]];
      nextRoundNodes.push(roundNode);
    }
    prevRound = nextRoundNodes;
  }
  if (prevRound.length === 1) {
    prevRound[0].parent = root;
    root.children = [prevRound[0]];
  }
  return { rounds: rounds, totalParticipants: n };
};

TournamentBracket.prototype.getNode = function(nodeId) {
  return this.allNodes[nodeId] || null;
};

TournamentBracket.prototype.advanceWinner = function(nodeId, winnerId) {
  var node = this.allNodes[nodeId];
  if (!node) return { error: 'node_not_found' };
  if (node.state !== 'pending') return { error: 'node_not_pending' };
  node.complete(winnerId);
  if (node.parent && node.parent.type !== 'stage') {
    var sibling = node.parent.children.filter(function(c) { return c.id !== nodeId; })[0];
    if (sibling && sibling.state === 'completed') {
      var parentWinner = this._determineParentWinner(node.parent);
      this.advanceWinner(node.parent.id, parentWinner);
    }
  }
  return { success: true, winner: winnerId };
};

TournamentBracket.prototype._determineParentWinner = function(parentNode) {
  if (!parentNode || !parentNode.children || parentNode.children.length < 2) return null;
  var completed = parentNode.children.filter(function(c) { return c.state === 'completed'; });
  if (completed.length < 2) return null;
  var winners = completed.map(function(c) { return c.winner; });
  return winners[0];
};

TournamentBracket.prototype.getUpcomingMatches = function() {
  var matches = [];
  for (var id in this.allNodes) {
    var node = this.allNodes[id];
    if (node.type === 'match' && node.state === 'pending' && node.participants.filter(function(p) { return p !== null; }).length === 2) {
      matches.push(node.getMatchInfo());
    }
  }
  return matches;
};

TournamentBracket.prototype.getResults = function() {
  var results = [];
  for (var id in this.allNodes) {
    var node = this.allNodes[id];
    if (node.state === 'completed') {
      results.push(node.getMatchInfo());
    }
  }
  return results;
};

var MatchScheduler = function() {
  this.scheduledMatches = {};
  this.schedulerLog = [];
};

MatchScheduler.prototype.scheduleMatch = function(matchId, time, duration) {
  if (this.scheduledMatches[matchId]) return { error: 'already_scheduled' };
  this.scheduledMatches[matchId] = { matchId: matchId, time: time, duration: duration || 300000, state: 'scheduled' };
  this.schedulerLog.push({ action: 'schedule', matchId: matchId, time: time, timestamp: Date.now() });
  return { success: true, scheduledTime: time };
};

MatchScheduler.prototype.cancelMatch = function(matchId) {
  if (!this.scheduledMatches[matchId]) return { error: 'match_not_found' };
  this.scheduledMatches[matchId].state = 'cancelled';
  this.schedulerLog.push({ action: 'cancel', matchId: matchId, timestamp: Date.now() });
  return { success: true };
};

MatchScheduler.prototype.getScheduledMatches = function(beforeTime) {
  var matches = [];
  for (var mid in this.scheduledMatches) {
    var m = this.scheduledMatches[mid];
    if (!beforeTime || m.time <= beforeTime) matches.push(m);
  }
  return matches;
};

window.BracketNode = BracketNode;
window.TournamentBracket = TournamentBracket;
window.MatchScheduler = MatchScheduler;
