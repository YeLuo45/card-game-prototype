// ============================================================================
// PvP Co-op — V287 Direction D Iteration 6/9
// Leaderboard: 排行榜 (排名/赛季/时段/类型)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var PERIOD = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', ALL_TIME: 'all_time', SEASON: 'season' };

  function Leaderboard(options) {
    options = options || {};
    this.scores = {};  // playerId -> {rating, wins, losses, currentStreak, lastPlayed, seasonStats: {}}
    this.history = [];  // [{playerId, change, ts, opponent, result}]
    this.seasons = {};  // seasonId -> {start, end, finalRankings: []}
    this.currentSeason = options.currentSeason || 'season_1';
    this.metrics = {
      updates: 0,
      matches: 0
    };
  }

  Leaderboard.prototype.getOrCreate = function (playerId) {
    if (!this.scores[playerId]) {
      this.scores[playerId] = {
        playerId: playerId,
        rating: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayed: null,
        seasonStats: {}
      };
    }
    return this.scores[playerId];
  };

  Leaderboard.prototype.recordMatch = function (winnerId, loserId, options) {
    options = options || {};
    var w = this.getOrCreate(winnerId);
    var l = this.getOrCreate(loserId);
    w.wins++;
    l.losses++;
    // ELO update
    var k = options.kFactor || 32;
    var expectedW = 1 / (1 + Math.pow(10, (l.rating - w.rating) / 400));
    var expectedL = 1 - expectedW;
    w.rating = Math.round(w.rating + k * (1 - expectedW));
    l.rating = Math.round(l.rating + k * (0 - expectedL));
    // streaks
    w.currentStreak = w.currentStreak >= 0 ? w.currentStreak + 1 : 1;
    l.currentStreak = l.currentStreak <= 0 ? l.currentStreak - 1 : -1;
    if (w.currentStreak > w.bestStreak) w.bestStreak = w.currentStreak;
    if (Math.abs(l.currentStreak) > l.bestStreak) l.bestStreak = Math.abs(l.currentStreak);
    w.lastPlayed = Date.now();
    l.lastPlayed = Date.now();
    this.metrics.matches++;
    this.metrics.updates += 2;
    this.history.push({ winner: winnerId, loser: loserId, winnerRatingAfter: w.rating, loserRatingAfter: l.rating, ts: Date.now() });
    if (this.history.length > 1000) this.history = this.history.slice(-1000);
    return { winner: w, loser: l, ratingChange: k * (1 - expectedW) };
  };

  Leaderboard.prototype.recordDraw = function (player1Id, player2Id) {
    var p1 = this.getOrCreate(player1Id);
    var p2 = this.getOrCreate(player2Id);
    p1.draws++;
    p2.draws++;
    var k = 32;
    var expected1 = 1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
    p1.rating = Math.round(p1.rating + k * (0.5 - expected1));
    p2.rating = Math.round(p2.rating + k * (0.5 - (1 - expected1)));
    p1.currentStreak = 0;
    p2.currentStreak = 0;
    p1.lastPlayed = Date.now();
    p2.lastPlayed = Date.now();
    this.metrics.matches++;
    this.metrics.updates += 2;
    this.history.push({ draw: true, player1: player1Id, player2: player2Id, ts: Date.now() });
    return { player1: p1, player2: p2 };
  };

  Leaderboard.prototype.getRank = function (playerId) {
    var sorted = this.getSortedRatings();
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].playerId === playerId) return { rank: i + 1, total: sorted.length, rating: sorted[i].rating };
    }
    return null;
  };

  Leaderboard.prototype.getSortedRatings = function () {
    var arr = [];
    for (var k in this.scores) {
      if (Object.prototype.hasOwnProperty.call(this.scores, k)) {
        arr.push(JSON.parse(JSON.stringify(this.scores[k])));
      }
    }
    arr.sort(function (a, b) { return b.rating - a.rating; });
    return arr;
  };

  Leaderboard.prototype.getTop = function (limit) {
    var sorted = this.getSortedRatings();
    if (typeof limit === 'number' && limit > 0) return sorted.slice(0, limit);
    return sorted;
  };

  Leaderboard.prototype.getPlayer = function (playerId) {
    return this.scores[playerId] ? JSON.parse(JSON.stringify(this.scores[playerId])) : null;
  };

  Leaderboard.prototype.setRating = function (playerId, rating) {
    var p = this.getOrCreate(playerId);
    p.rating = rating;
    this.metrics.updates++;
    return { success: true };
  };

  // ---- Time-based filters (simulated) ----
  Leaderboard.prototype.getRecent = function (since) {
    var arr = [];
    var cutoff = since || (Date.now() - 86400000);
    var recent = this.history.filter(function (h) { return h.ts >= cutoff; });
    var counts = {};
    for (var i = 0; i < recent.length; i++) {
      var h = recent[i];
      if (h.winner) {
        counts[h.winner] = (counts[h.winner] || 0) + 1;
      }
    }
    var arr2 = [];
    for (var k in counts) {
      if (Object.prototype.hasOwnProperty.call(counts, k)) {
        arr2.push({ playerId: k, recentWins: counts[k] });
      }
    }
    arr2.sort(function (a, b) { return b.recentWins - a.recentWins; });
    return arr2;
  };

  // ---- Seasons ----
  Leaderboard.prototype.startSeason = function (seasonId) {
    if (this.seasons[seasonId]) return { error: 'season_exists' };
    this.seasons[seasonId] = {
      seasonId: seasonId,
      start: Date.now(),
      end: null,
      finalRankings: null
    };
    this.currentSeason = seasonId;
    return { success: true };
  };

  Leaderboard.prototype.endSeason = function (seasonId) {
    var s = this.seasons[seasonId];
    if (!s) return { error: 'not_found' };
    s.end = Date.now();
    s.finalRankings = this.getTop();
    // reset all ratings to 1000 (new season)
    for (var k in this.scores) {
      if (Object.prototype.hasOwnProperty.call(this.scores, k)) {
        var stats = { finalRating: this.scores[k].rating, finalRank: this.getRank(k).rank };
        this.scores[k].seasonStats[seasonId] = stats;
        this.scores[k].rating = 1000;
        this.scores[k].wins = 0;
        this.scores[k].losses = 0;
        this.scores[k].draws = 0;
        this.scores[k].currentStreak = 0;
      }
    }
    return { success: true, rankings: s.finalRankings };
  };

  Leaderboard.prototype.getSeason = function (seasonId) {
    return this.seasons[seasonId] || null;
  };

  Leaderboard.prototype.getHistory = function (playerId, limit) {
    var arr = this.history.filter(function (h) { return h.winner === playerId || h.loser === playerId || h.player1 === playerId || h.player2 === playerId; });
    if (typeof limit === 'number' && limit > 0) return arr.slice(-limit);
    return arr;
  };

  Leaderboard.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  Leaderboard.prototype.getSummary = function () {
    return {
      totalPlayers: Object.keys(this.scores).length,
      currentSeason: this.currentSeason,
      matchesRecorded: this.metrics.matches,
      top3: this.getTop(3).map(function (p) { return { playerId: p.playerId, rating: p.rating }; }),
      metrics: this.metrics
    };
  };

  Leaderboard.prototype.clear = function () {
    this.scores = {};
    this.history = [];
    this.seasons = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.Leaderboard = window.Leaderboard || Leaderboard;
    if (typeof window.Leaderboard === 'undefined') {
      // re-bind since 'Leaderboard' may shadow
    }
    Object.defineProperty(window, 'Leaderboard', { value: Leaderboard, writable: true });
    window.PERIOD = PERIOD;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Leaderboard: Leaderboard, PERIOD: PERIOD };
  }
})();
