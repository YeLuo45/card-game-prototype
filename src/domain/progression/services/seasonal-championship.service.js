// ============================================================================
// Card Game Seasonal Championship — V248 Direction C
// Seasonal Championship System: thunderbolt PowerSync + generic-agent self-evolution + chatdev role specialization
// Season management, ELO ranking, championship brackets, and rewards
// ============================================================================
'use strict';

(function () {
  // ------ Models ------
  var Season = function(seasonId, name, startDate, endDate, config) {
    this.seasonId = seasonId;
    this.name = name || 'Season ' + seasonId;
    this.startDate = startDate || Date.now();
    this.endDate = endDate || (this.startDate + 90 * 24 * 60 * 60 * 1000); // 90 days
    this.config = config || { maxRank: 5000, eloKFactor: 32, placementMatches: 5 };
    this.status = 'upcoming'; // upcoming, active, completed
    this.participants = {};  // playerId -> SeasonParticipant
    this.brackets = {};      // bracketId -> Bracket
    this.rewards = {};       // tier -> Reward
    this.matches = [];       // match results
    this.leaderboard = [];   // sorted playerIds
  };

  var SeasonParticipant = function(playerId, playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.elo = 1500;         // starting ELO
    this.rank = null;
    this.matchesPlayed = 0;
    this.wins = 0;
    this.losses = 0;
    this.streak = 0;         // current win/loss streak
    this.bestStreak = 0;
    this.placementCompleted = false;
    this.rewardsClaimed = [];
    this.lastMatchAt = null;
    this.region = 'global';
  };

  var MatchResult = function(resultId, seasonId, player1Id, player2Id, winnerId, player1EloAfter, player2EloAfter, score) {
    this.resultId = resultId;
    this.seasonId = seasonId;
    this.player1Id = player1Id;
    this.player2Id = player2Id;
    this.winnerId = winnerId;
    this.player1EloAfter = player1EloAfter;
    this.player2EloAfter = player2EloAfter;
    this.score = score || { p1: 0, p2: 0 };
    this.playedAt = Date.now();
  };

  // ------ Season Methods ------
  Season.prototype.startSeason = function() {
    if (this.status !== 'upcoming') return { error: 'season_not_upcoming' };
    this.status = 'active';
    this._rebuildLeaderboard();
    return { success: true, seasonId: this.seasonId, participantCount: Object.keys(this.participants).length };
  };

  Season.prototype.endSeason = function() {
    if (this.status !== 'active') return { error: 'season_not_active' };
    this.status = 'completed';
    this._rebuildLeaderboard();
    return { success: true, seasonId: this.seasonId, finalParticipantCount: Object.keys(this.participants).length };
  };

  Season.prototype.registerParticipant = function(playerId, playerName, region) {
    if (this.status === 'completed') return { error: 'season_completed' };
    if (this.participants[playerId]) return { error: 'already_registered' };
    this.participants[playerId] = new SeasonParticipant(playerId, playerName);
    if (region) this.participants[playerId].region = region;
    this._rebuildLeaderboard();
    return { success: true, participant: this.participants[playerId] };
  };

  Season.prototype.recordMatch = function(player1Id, player2Id, winnerId, score) {
    if (this.status !== 'active') return { error: 'season_not_active' };
    if (!this.participants[player1Id] || !this.participants[player2Id]) return { error: 'participant_not_found' };
    if (winnerId !== player1Id && winnerId !== player2Id && winnerId !== 'draw') return { error: 'invalid_winner' };

    var p1 = this.participants[player1Id];
    var p2 = this.participants[player2Id];
    var kFactor = this.config.eloKFactor || 32;

    // Calculate ELO change
    var expected1 = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400));
    var expected2 = 1 - expected1;

    var actual1 = winnerId === player1Id ? 1 : (winnerId === 'draw' ? 0.5 : 0);
    var actual2 = winnerId === player2Id ? 1 : (winnerId === 'draw' ? 0.5 : 0);

    var delta1 = Math.round(kFactor * (actual1 - expected1));
    var delta2 = Math.round(kFactor * (actual2 - expected2));

    p1.elo += delta1;
    p2.elo += delta2;
    p1.elo = Math.max(100, Math.min(5000, p1.elo));
    p2.elo = Math.max(100, Math.min(5000, p2.elo));

    // Update stats
    p1.matchesPlayed++;
    p2.matchesPlayed++;
    p1.lastMatchAt = Date.now();
    p2.lastMatchAt = Date.now();

    if (winnerId === player1Id) {
      p1.wins++; p2.losses++;
      p1.streak++; p2.streak = 0;
      p1.bestStreak = Math.max(p1.bestStreak, p1.streak);
    } else if (winnerId === player2Id) {
      p2.wins++; p1.losses++;
      p2.streak++; p1.streak = 0;
      p2.bestStreak = Math.max(p2.bestStreak, p2.streak);
    } else {
      p1.streak = 0; p2.streak = 0;
    }

    // Record match
    var resultId = 'mr_' + Date.now();
    var match = new MatchResult(resultId, this.seasonId, player1Id, player2Id, winnerId, p1.elo, p2.elo, score);
    this.matches.push(match);
    this._rebuildLeaderboard();

    return { success: true, matchId: resultId, delta1: delta1, delta2: delta2, newElo1: p1.elo, newElo2: p2.elo };
  };

  Season.prototype.getLeaderboard = function(n, offset) {
    n = n || 100;
    offset = offset || 0;
    return this.leaderboard.slice(offset, offset + n).map(function(playerId) {
      var p = this.participants[playerId];
      return { playerId: playerId, playerName: p.playerName, elo: p.elo, rank: p.rank, wins: p.wins, losses: p.losses, streak: p.streak };
    }, this);
  };

  Season.prototype.getPlayerRank = function(playerId) {
    var p = this.participants[playerId];
    if (!p) return null;
    return { playerId: playerId, playerName: p.playerName, elo: p.elo, rank: p.rank, wins: p.wins, losses: p.losses, matchesPlayed: p.matchesPlayed, streak: p.streak, bestStreak: p.bestStreak };
  };

  Season.prototype.getSeasonStats = function() {
    var ps = Object.values(this.participants);
    var totalMatches = ps.reduce(function(s, p) { return s + p.matchesPlayed; }, 0);
    var topElo = ps.reduce(function(max, p) { return Math.max(max, p.elo); }, 0);
    return { seasonId: this.seasonId, name: this.name, status: this.status, participantCount: ps.length, totalMatches: totalMatches, topElo: topElo, matchesPlayed: this.matches.length };
  };

  Season.prototype._rebuildLeaderboard = function() {
    var self = this;
    this.leaderboard = Object.keys(this.participants).sort(function(a, b) {
      if (self.participants[a].elo !== self.participants[b].elo) {
        return self.participants[b].elo - self.participants[a].elo;
      }
      return self.participants[b].matchesPlayed - self.participants[a].matchesPlayed;
    });
    this.leaderboard.forEach(function(playerId, idx) {
      self.participants[playerId].rank = idx + 1;
    });
  };

  Season.prototype.getRecentMatches = function(n) {
    n = n || 10;
    return this.matches.slice(-n).reverse();
  };

  // ------ Expose globally ------
  window.Season = window.Season || Season;
  window.SeasonParticipant = window.SeasonParticipant || SeasonParticipant;
  window.MatchResult = window.MatchResult || MatchResult;

})();
