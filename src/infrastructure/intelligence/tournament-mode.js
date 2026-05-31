// ============================================================================
// Card Intelligence Network — V8: TournamentModeSupport + MatchSimulator
// chatdev role specialization + thunderbolt feedback pipelines
// ============================================================================
'use strict';

var TournamentModeSupport = function(network, opponentTracker, strategyEngine) {
  this.network = network;
  this.opponentTracker = opponentTracker;
  this.strategyEngine = strategyEngine;
  this.tournaments = {};
  this.currentTournament = null;
};

TournamentModeSupport.prototype.createTournament = function(name, format, participants) {
  var id = 't_' + Date.now();
  this.tournaments[id] = {
    id: id,
    name: name,
    format: format || 'single_elimination',
    participants: participants || [],
    matches: [],
    results: {},
    createdAt: Date.now()
  };
  return { success: true, tournamentId: id };
};

TournamentModeSupport.prototype.recordTournamentMatch = function(tournamentId, playerId, opponentId, result, games) {
  var t = this.tournaments[tournamentId];
  if (!t) return { error: 'tournament_not_found' };
  var matchRecord = {
    playerId: playerId,
    opponentId: opponentId,
    result: result,
    games: games || 1,
    timestamp: Date.now()
  };
  t.matches.push(matchRecord);
  if (!t.results[playerId]) t.results[playerId] = { wins: 0, losses: 0 };
  if (result === 'win') t.results[playerId].wins++;
  else if (result === 'loss') t.results[playerId].losses++;
  return { success: true };
};

TournamentModeSupport.prototype.getTournamentStandings = function(tournamentId) {
  var t = this.tournaments[tournamentId];
  if (!t) return { error: 'tournament_not_found' };
  var standings = [];
  for (var p in t.results) {
    var r = t.results[p];
    standings.push({
      playerId: p,
      wins: r.wins,
      losses: r.losses,
      winRate: r.wins + r.losses > 0 ? r.wins / (r.wins + r.losses) : 0
    });
  }
  standings.sort(function(a, b) { return b.wins - a.wins || b.winRate - a.winRate; });
  return standings;
};

TournamentModeSupport.prototype.getTournamentStats = function(tournamentId) {
  var t = this.tournaments[tournamentId];
  if (!t) return { error: 'tournament_not_found' };
  return {
    tournamentId: tournamentId,
    name: t.name,
    format: t.format,
    participantCount: t.participants.length,
    matchCount: t.matches.length,
    createdAt: t.createdAt
  };
};

var MatchSimulator = function(intelligenceNetwork, opponentTracker) {
  this.network = intelligenceNetwork;
  this.opponentTracker = opponentTracker;
  this.simulationHistory = [];
};

MatchSimulator.prototype.simulateMatch = function(playerDeck, opponentDeck, iterations) {
  iterations = iterations || 100;
  var wins = 0, losses = 0;
  for (var i = 0; i < iterations; i++) {
    var outcome = this._simulateSingleGame(playerDeck, opponentDeck);
    if (outcome === 'win') wins++;
    else losses++;
  }
  var result = { wins: wins, losses: losses, iterations: iterations, winRate: wins / iterations };
  this.simulationHistory.push({ playerDeck: playerDeck, opponentDeck: opponentDeck, result: result, ts: Date.now() });
  return result;
};

MatchSimulator.prototype._simulateSingleGame = function(playerDeck, opponentDeck) {
  var pwr = 0.5;
  var cardSynergy = 0;
  for (var i = 0; i < playerDeck.length; i++) {
    var partners = this.network.graph.getPartners(playerDeck[i], 'combo');
    cardSynergy += partners.length * 0.05;
  }
  pwr += Math.min(cardSynergy, 0.3);
  var oppStrength = this.opponentTracker ? 0.5 : 0.5;
  return Math.random() < pwr ? 'win' : 'loss';
};

MatchSimulator.prototype.getSimulationHistory = function(limit) {
  limit = limit || 10;
  return this.simulationHistory.slice(-limit);
};

window.TournamentModeSupport = TournamentModeSupport;
window.MatchSimulator = MatchSimulator;
