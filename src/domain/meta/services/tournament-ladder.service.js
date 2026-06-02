// ============================================================================
// Card Tournament Ladder — V166 Direction A
// ELO rating system with ranked matchmaking ladder
// nanobot distributed mesh + generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // ELO Calculator
  // ========================================================================
  function EloCalculator(defaultRating, kFactor) {
    this.defaultRating = defaultRating || 1500;
    this.kFactor = kFactor || 32;
  }

  EloCalculator.prototype.getExpectedScore = function (ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  EloCalculator.prototype.getNewRatings = function (ratingA, ratingB, scoreA) {
    var expectedA = this.getExpectedScore(ratingA, ratingB);
    var newRatingA = ratingA + this.kFactor * (scoreA - expectedA);
    var newRatingB = ratingB + this.kFactor * ((1 - scoreA) - (1 - expectedA));
    return { ratingA: newRatingA, ratingB: newRatingB };
  };

  // --------------------------------------------------------------------===
  // Player: Player profile with rating
  // ========================================================================
  function Player(playerId, name, initialRating) {
    this.id = playerId;
    this.name = name || playerId;
    this.rating = initialRating || 1500;
    this.gamesPlayed = 0;
    this.wins = 0;
    this.losses = 0;
    this.streak = 0; // positive = win, negative = loss
    this.peakRating = this.rating;
    this.lowestRating = this.rating;
  }

  Player.prototype.recordWin = function (newRating) {
    this.gamesPlayed++;
    this.wins++;
    this.streak = this.streak > 0 ? this.streak + 1 : 1;
    this.rating = newRating;
    this.peakRating = Math.max(this.peakRating, newRating);
  };

  Player.prototype.recordLoss = function (newRating) {
    this.gamesPlayed++;
    this.losses++;
    this.streak = this.streak < 0 ? this.streak - 1 : -1;
    this.rating = newRating;
    this.lowestRating = Math.min(this.lowestRating, newRating);
  };

  Player.prototype.getWinRate = function () {
    if (this.gamesPlayed === 0) return 0;
    return this.wins / this.gamesPlayed;
  };

  Player.prototype.getStats = function () {
    return {
      rating: Math.round(this.rating),
      gamesPlayed: this.gamesPlayed,
      wins: this.wins,
      losses: this.losses,
      winRate: Math.round(this.getWinRate() * 100) / 100,
      streak: this.streak,
      peakRating: this.peakRating,
      lowestRating: this.lowestRating
    };
  };

  // --------------------------------------------------------------------===
  // TournamentLadder: Ranked ladder with ELO
  // ========================================================================
  function TournamentLadder(storageKey) {
    this.storageKey = storageKey || 'tournament_ladder';
    this._players = {}; // playerId -> Player
    this._elo = new EloCalculator();
    this._matchHistory = []; // array of { player1, player2, winner, timestamp }
    this._init();
  }

  TournamentLadder.prototype._init = function () {
    this._load();
  };

  TournamentLadder.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          if (data.players) {
            for (var id in data.players) {
              var p = data.players[id];
              this._players[id] = new Player(p.id, p.name, p.rating);
              this._players[id].gamesPlayed = p.gamesPlayed || 0;
              this._players[id].wins = p.wins || 0;
              this._players[id].losses = p.losses || 0;
              this._players[id].streak = p.streak || 0;
              this._players[id].peakRating = p.peakRating || p.rating;
              this._players[id].lowestRating = p.lowestRating || p.rating;
            }
          }
        }
      }
    } catch (e) {}
  };

  TournamentLadder.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var playersData = {};
        for (var id in this._players) {
          var p = this._players[id];
          playersData[id] = {
            id: p.id, name: p.name, rating: p.rating,
            gamesPlayed: p.gamesPlayed, wins: p.wins, losses: p.losses,
            streak: p.streak, peakRating: p.peakRating, lowestRating: p.lowestRating
          };
        }
        localStorage.setItem(this.storageKey, JSON.stringify({ players: playersData }));
      }
    } catch (e) {}
  };

  TournamentLadder.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[TournamentLadder] ' + msg);
    }
  };

  // Register player
  TournamentLadder.prototype.registerPlayer = function (playerId, name, initialRating) {
    if (this._players[playerId]) return { error: 'player_exists' };
    var p = new Player(playerId, name, initialRating);
    this._players[playerId] = p;
    this._save();
    return { success: true, playerCount: Object.keys(this._players).length };
  };

  // Get player
  TournamentLadder.prototype.getPlayer = function (playerId) {
    return this._players[playerId] || null;
  };

  // Record a match
  TournamentLadder.prototype.recordMatch = function (player1Id, player2Id, winnerId) {
    var p1 = this._players[player1Id];
    var p2 = this._players[player2Id];
    if (!p1) return { error: 'player1_not_found' };
    if (!p2) return { error: 'player2_not_found' };
    if (winnerId !== player1Id && winnerId !== player2Id) return { error: 'invalid_winner' };

    var scoreA = winnerId === player1Id ? 1 : 0;
    var result = this._elo.getNewRatings(p1.rating, p2.rating, scoreA);
    var newRating1 = result.ratingA;
    var newRating2 = result.ratingB;

    if (winnerId === player1Id) {
      p1.recordWin(newRating1);
      p2.recordLoss(newRating2);
    } else {
      p2.recordWin(newRating2);
      p1.recordLoss(newRating1);
    }

    this._matchHistory.push({
      player1: player1Id,
      player2: player2Id,
      winner: winnerId,
      timestamp: Date.now()
    });
    this._save();
    return {
      success: true,
      newRatings: { [player1Id]: Math.round(newRating1), [player2Id]: Math.round(newRating2) }
    };
  };

  // Get leaderboard
  TournamentLadder.prototype.getLeaderboard = function (limit) {
    var players = [];
    for (var id in this._players) players.push(this._players[id]);
    players.sort(function (a, b) { return b.rating - a.rating; });
    if (limit) players = players.slice(0, limit);
    return players.map(function (p) {
      return { id: p.id, name: p.name, rating: Math.round(p.rating), gamesPlayed: p.gamesPlayed, wins: p.wins, losses: p.losses, streak: p.streak };
    });
  };

  // Get match history
  TournamentLadder.prototype.getMatchHistory = function (limit) {
    var history = this._matchHistory.slice();
    history.reverse();
    if (limit) history = history.slice(0, limit);
    return history;
  };

  // Find nearby rated players
  TournamentLadder.prototype.findNearbyPlayers = function (playerId, range) {
    var player = this._players[playerId];
    if (!player) return [];
    var rangeVal = range || 100;
    var nearby = [];
    for (var id in this._players) {
      if (id === playerId) continue;
      var p = this._players[id];
      if (Math.abs(p.rating - player.rating) <= rangeVal) {
        nearby.push({ id: p.id, name: p.name, rating: Math.round(p.rating), diff: Math.round(p.rating - player.rating) });
      }
    }
    nearby.sort(function (a, b) { return Math.abs(a.diff) - Math.abs(b.diff); });
    return nearby;
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.EloCalculator = EloCalculator;
  window.Player = Player;
  window.TournamentLadder = TournamentLadder;
})();