// ============================================================================
// Card Draft Tournament — V165 Direction D
// Draft tournament with bracket elimination and seeding
// thunderbolt feedback loops + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Bracket: Elimination bracket
  // ========================================================================
  function Bracket(size) {
    this.size = size || 8; // power of 2
    this.rounds = []; // array of arrays of matches
    this.byeSlots = this._calculateByes(size);
    this._generateBracket();
  }

  Bracket.prototype._calculateByes = function (n) {
    var nextPow2 = 1;
    while (nextPow2 < n) nextPow2 *= 2;
    return nextPow2 - n;
  };

  Bracket.prototype._generateBracket = function () {
    this.rounds = [];
    var numRounds = Math.log2(this.size);
    for (var r = 0; r < numRounds; r++) {
      var matchesInRound = this.size / Math.pow(2, r + 1);
      var round = [];
      for (var m = 0; m < matchesInRound; m++) {
        round.push({ id: 'r' + r + 'm' + m, player1: null, player2: null, winner: null, round: r });
      }
      this.rounds.push(round);
    }
  };

  Bracket.prototype.getMatches = function (round) {
    return this.rounds[round] || [];
  };

  Bracket.prototype.getMatch = function (round, matchIndex) {
    return (this.rounds[round] || [])[matchIndex] || null;
  };

  Bracket.prototype.setMatch = function (round, matchIndex, player1, player2) {
    var match = this.getMatch(round, matchIndex);
    if (!match) return { error: 'match_not_found' };
    match.player1 = player1;
    match.player2 = player2;
    return { success: true };
  };

  Bracket.prototype.setWinner = function (round, matchIndex, winnerId) {
    var match = this.getMatch(round, matchIndex);
    if (!match) return { error: 'match_not_found' };
    if (match.winner) return { error: 'match_already_decided' };
    if (winnerId !== match.player1 && winnerId !== match.player2) {
      return { error: 'invalid_winner' };
    }
    match.winner = winnerId;
    // Advance winner to next round
    if (round < this.rounds.length - 1) {
      var nextRound = this.rounds[round + 1];
      var nextMatchIndex = Math.floor(matchIndex / 2);
      var nextMatch = nextRound[nextMatchIndex];
      if (nextMatch) {
        if (matchIndex % 2 === 0) {
          nextMatch.player1 = winnerId;
        } else {
          nextMatch.player2 = winnerId;
        }
      }
    }
    return { success: true, match: match };
  };

  Bracket.prototype.isComplete = function () {
    var final = this.rounds[this.rounds.length - 1];
    return final && final.length > 0 && final[0].winner !== null;
  };

  Bracket.prototype.getChampion = function () {
    if (!this.isComplete()) return null;
    return this.rounds[this.rounds.length - 1][0].winner;
  };

  Bracket.prototype.getRoundName = function (round) {
    var names = ['Finals', 'Semifinals', 'Quarterfinals', 'Round of 16', 'Round of 32'];
    var idx = this.rounds.length - 1 - round;
    return names[idx] || ('Round ' + (round + 1));
  };

  // --------------------------------------------------------------------===
  // Seeding: Tournament seeding logic
  // ========================================================================
  function Seeding(playerCount, seedCount) {
    this.playerCount = playerCount || 8;
    this.seedCount = seedCount || seedCount;
    this.seeds = [];
  }

  Seeding.prototype.generateSeeds = function (playerIds) {
    this.seeds = [];
    var sorted = playerIds.slice();
    // Sort by rating descending
    sorted.sort(function (a, b) { return (b.rating || 1500) - (a.rating || 1500); });
    for (var i = 0; i < sorted.length; i++) {
      this.seeds.push({ playerId: sorted[i].id || sorted[i], seed: i + 1 });
    }
    return this.seeds;
  };

  Seeding.prototype.getSeed = function (playerId) {
    for (var i = 0; i < this.seeds.length; i++) {
      if (this.seeds[i].playerId === playerId) return this.seeds[i].seed;
    }
    return null;
  };

  Seeding.prototype.getBracketPosition = function (seed) {
    if (seed === 1) return { round: 0, match: 0 };
    // Standard 8-player bracket positions
    var positions = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [0, 3], 5: [1, 0], 6: [1, 1], 7: [1, 2], 8: [1, 3] };
    return positions[seed] || { round: 0, match: 0 };
  };

  // --------------------------------------------------------------------===
  // DraftTournament: Main tournament system
  // ========================================================================
  function DraftTournament(name, storageKey) {
    this.name = name || 'Draft Tournament';
    this.storageKey = storageKey || 'draft_tournament';
    this._players = {}; // playerId -> { id, name, rating, wins, losses, eliminated }
    this._bracket = null;
    this._currentRound = 0;
    this._status = 'registration'; // registration, active, complete
    this._winner = null;
    this._init();
  }

  DraftTournament.prototype._init = function () {
    this._load();
  };

  DraftTournament.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._status = data.status || 'registration';
          this._currentRound = data.currentRound || 0;
          this._winner = data.winner || null;
        }
      }
    } catch (e) {}
  };

  DraftTournament.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          status: this._status,
          currentRound: this._currentRound,
          winner: this._winner
        }));
      }
    } catch (e) {}
  };

  DraftTournament.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[DraftTournament] ' + msg);
    }
  };

  // Register a player
  DraftTournament.prototype.registerPlayer = function (id, name, rating) {
    if (this._players[id]) return { error: 'player_exists' };
    this._players[id] = { id: id, name: name || id, rating: rating || 1500, wins: 0, losses: 0, eliminated: false };
    return { success: true, playerCount: Object.keys(this._players).length };
  };

  // Start the tournament
  DraftTournament.prototype.startTournament = function () {
    var playerIds = Object.keys(this._players);
    if (playerIds.length < 2) return { error: 'not_enough_players' };
    var size = 8;
    while (size < playerIds.length) size *= 2;
    this._bracket = new Bracket(size);
    // Seed players
    var seeding = new Seeding(playerIds.length);
    var playerObjs = playerIds.map(function (id) { return this._players[id]; }, this);
    var seeds = seeding.generateSeeds(playerObjs);
    // Assign seeded players to bracket
    var round0Matches = this._bracket.getMatches(0);
    for (var i = 0; i < seeds.length && i < round0Matches.length * 2; i++) {
      var pos = seeding.getBracketPosition(seeds[i].seed);
      if (pos.round === 0) {
        if (i % 2 === 0) {
          round0Matches[Math.floor(i / 2)].player1 = seeds[i].playerId;
        } else {
          round0Matches[Math.floor(i / 2)].player2 = seeds[i].playerId;
        }
      }
    }
    // Players without bracket slots get byes if top seeds
    this._status = 'active';
    this._save();
    return { success: true, bracket: this._bracket };
  };

  // Record match result
  DraftTournament.prototype.recordMatch = function (round, matchIndex, winnerId) {
    if (!this._bracket) return { error: 'no_bracket' };
    var match = this._bracket.getMatch(round, matchIndex);
    if (!match) return { error: 'match_not_found' };
    if (match.winner) return { error: 'match_already_decided' };
    var result = this._bracket.setWinner(round, matchIndex, winnerId);
    if (!result.success) return result;
    // Update player stats
    var loserId = match.player1 === winnerId ? match.player2 : match.player1;
    if (this._players[winnerId]) this._players[winnerId].wins++;
    if (this._players[loserId]) {
      this._players[loserId].losses++;
      this._players[loserId].eliminated = true;
    }
    this._currentRound = Math.max(this._currentRound, round + 1);
    // Check if tournament complete
    if (this._bracket.isComplete()) {
      this._status = 'complete';
      this._winner = this._bracket.getChampion();
    }
    this._save();
    return { success: true, champion: this._winner };
  };

  // Get standings
  DraftTournament.prototype.getStandings = function () {
    var players = [];
    for (var id in this._players) players.push(this._players[id]);
    players.sort(function (a, b) {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.rating - a.rating;
    });
    return players;
  };

  // Get tournament info
  DraftTournament.prototype.getTournamentInfo = function () {
    return {
      name: this.name,
      status: this._status,
      playerCount: Object.keys(this._players).length,
      currentRound: this._currentRound,
      champion: this._winner,
      isComplete: this._status === 'complete'
    };
  };

  // Get bracket
  DraftTournament.prototype.getBracket = function () {
    if (!this._bracket) return null;
    var result = [];
    for (var r = 0; r < this._bracket.rounds.length; r++) {
      result.push({
        name: this._bracket.getRoundName(r),
        matches: this._bracket.rounds[r]
      });
    }
    return result;
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Bracket = Bracket;
  window.Seeding = Seeding;
  window.DraftTournament = DraftTournament;
})();