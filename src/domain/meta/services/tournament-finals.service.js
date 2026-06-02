// ============================================================================
// Card Tournament Finals — V172 Direction B
// Championship tournament finals with bracket trees and seeding
// chatdev role specialization: bracket, seeding, finals roles
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // SeedSlot: A seeded slot in the tournament
  // ========================================================================
  function SeedSlot(seedNumber, playerId) {
    this.seedNumber = seedNumber || 0;
    this.playerId = playerId || null;
  }

  SeedSlot.prototype.assign = function (playerId) {
    this.playerId = playerId;
    return { success: true };
  };

  SeedSlot.prototype.isAssigned = function () {
    return this.playerId !== null;
  };

  // --------------------------------------------------------------------===
  // FinalBracket: Championship bracket with multi-stage progression
  // ========================================================================
  function FinalBracket(bracketId, size) {
    this.bracketId = bracketId || 'finals';
    this.size = size || 8;
    this.rounds = []; // array of rounds, each round has matches
    this.seededSlots = []; // array of SeedSlot
    this.champion = null;
    this.isComplete = false;
    this._init();
  }

  FinalBracket.prototype._init = function () {
    // Initialize seeded slots (size/2 for top half)
    for (var i = 0; i < this.size / 2; i++) {
      this.seededSlots.push(new SeedSlot(i + 1));
    }
    // Build rounds
    var numRounds = Math.log2(this.size);
    for (var r = 0; r < numRounds; r++) {
      var matchCount = this.size / Math.pow(2, r + 1);
      var round = { roundNumber: r, matches: [] };
      for (var m = 0; m < matchCount; m++) {
        round.matches.push({
          matchId: r + '_' + m,
          player1: null,
          player2: null,
          winner: null,
          score1: 0,
          score2: 0
        });
      }
      this.rounds.push(round);
    }
  };

  FinalBracket.prototype.assignSeed = function (seedNumber, playerId) {
    var slot = this._getSeedSlot(seedNumber);
    if (!slot) return { error: 'seed_not_found' };
    var r = slot.assign(playerId);
    return r;
  };

  FinalBracket.prototype._getSeedSlot = function (seedNumber) {
    for (var i = 0; i < this.seededSlots.length; i++) {
      if (this.seededSlots[i].seedNumber === seedNumber) return this.seededSlots[i];
    }
    return null;
  };

  FinalBracket.prototype.proceedRound = function (roundNumber) {
    if (roundNumber <= 0 || roundNumber >= this.rounds.length) return { error: 'invalid_round' };
    var prevRound = this.rounds[roundNumber - 1];
    var currentRound = this.rounds[roundNumber];
    for (var i = 0; i < currentRound.matches.length; i++) {
      var m1 = prevRound.matches[i * 2];
      var m2 = prevRound.matches[i * 2 + 1];
      var winner1 = m1 ? m1.winner : null;
      var winner2 = m2 ? m2.winner : null;
      currentRound.matches[i].player1 = winner1;
      currentRound.matches[i].player2 = winner2;
    }
    return { success: true };
  };

  FinalBracket.prototype.setMatchWinner = function (roundNumber, matchIndex, winnerId) {
    var round = this.rounds[roundNumber];
    if (!round) return { error: 'round_not_found' };
    var match = round.matches[matchIndex];
    if (!match) return { error: 'match_not_found' };
    if (match.player1 !== winnerId && match.player2 !== winnerId) {
      return { error: 'invalid_winner' };
    }
    if (match.winner) return { error: 'match_already_decided' };
    match.winner = winnerId;
    if (roundNumber === this.rounds.length - 1) {
      this.champion = winnerId;
      this.isComplete = true;
    }
    return { success: true };
  };

  FinalBracket.prototype.getRoundMatches = function (roundNumber) {
    var round = this.rounds[roundNumber];
    return round ? round.matches.slice() : [];
  };

  FinalBracket.prototype.getRoundName = function (roundNumber) {
    var names = ['Finals', 'Semifinals', 'Quarterfinals', 'Round of 16', 'Round of 32'];
    var idx = this.rounds.length - 1 - roundNumber;
    return names[idx] || 'Round ' + (roundNumber + 1);
  };

  FinalBracket.prototype.getChampion = function () {
    return this.champion;
  };

  FinalBracket.prototype.getBracketTree = function () {
    return this.rounds.map(function (r) {
      return { roundNumber: r.roundNumber, matches: r.matches.slice() };
    });
  };

  // ----------------------------------------------------------------=======
  // TournamentFinals: Manages the championship finals
  // ========================================================================
  function TournamentFinals(storageKey) {
    this.storageKey = storageKey || 'tournament_finals';
    this._brackets = {};
    this._finalsHistory = [];
    this._init();
  }

  TournamentFinals.prototype._init = function () {
    this._load();
    if (Object.keys(this._brackets).length === 0) {
      this.createBracket(8);
    }
  };

  TournamentFinals.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          // Reconstruct from serialized data if needed
        }
      }
    } catch (e) {}
  };

  TournamentFinals.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({}));
      }
    } catch (e) {}
  };

  TournamentFinals.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[TournamentFinals] ' + msg);
    }
  };

  TournamentFinals.prototype.createBracket = function (size) {
    if (size < 4 || size > 64 || (size & (size - 1)) !== 0) {
      return { error: 'invalid_size' };
    }
    var bracketId = 'bracket_' + Date.now();
    this._brackets[bracketId] = new FinalBracket(bracketId, size);
    return { success: true, bracketId: bracketId };
  };

  TournamentFinals.prototype.getBracket = function (bracketId) {
    return this._brackets[bracketId] || null;
  };

  TournamentFinals.prototype.getAllBrackets = function () {
    return Object.keys(this._brackets).map(function (k) { return this._brackets[k]; }.bind(this));
  };

  TournamentFinals.prototype.getFinalsHistory = function () {
    return this._finalsHistory.slice();
  };

  TournamentFinals.prototype.recordFinals = function (bracketId, championId, runnerUpId, score) {
    var bracket = this._brackets[bracketId];
    if (!bracket) return { error: 'bracket_not_found' };
    if (!bracket.isComplete) return { error: 'bracket_incomplete' };
    this._finalsHistory.push({
      bracketId: bracketId,
      championId: championId,
      runnerUpId: runnerUpId,
      score: score,
      timestamp: Date.now()
    });
    return { success: true, historyLength: this._finalsHistory.length };
  };

  TournamentFinals.prototype.getTotalFinalsCount = function () {
    return this._finalsHistory.length;
  };

  TournamentFinals.prototype.getRecentFinals = function (limit) {
    var hist = this._finalsHistory.slice();
    hist.reverse();
    if (limit) hist = hist.slice(0, limit);
    return hist;
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.SeedSlot = SeedSlot;
  window.FinalBracket = FinalBracket;
  window.TournamentFinals = TournamentFinals;
})();