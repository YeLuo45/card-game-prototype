// ============================================================================
// Card Hero League — V156 Direction C
// Seasonal competitive league with rankings, rewards, and playoffs
// thunderbolt offline-first + chatdev multi-agent + generic-agent L0-L4
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // LeagueSeason: A single competitive season
  // ========================================================================
  function LeagueSeason(id, name, startDate, endDate, status) {
    this.id = id || '';
    this.name = name || '';
    this.startDate = startDate || Date.now();
    this.endDate = endDate || (startDate + 86400000 * 30);
    this.status = status || 'upcoming'; // upcoming | active | completed
    this.divisions = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    this.standings = {};
    this.rewards = {};
    this.matches = [];
    this.playoffs = null;
  }

  LeagueSeason.prototype.getStatus = function () { return this.status; };

  LeagueSeason.prototype.isActive = function () { return this.status === 'active'; };

  LeagueSeason.prototype.getDaysRemaining = function () {
    var now = Date.now();
    if (now > this.endDate) return 0;
    if (now < this.startDate) return Math.floor((this.endDate - this.startDate) / 86400000);
    return Math.max(0, Math.floor((this.endDate - now) / 86400000));
  };

  LeagueSeason.prototype.addMatch = function (match) {
    this.matches.push(match);
  };

  // --------------------------------------------------------------------===
  // LeagueStanding: Player ranking within a season
  // ========================================================================
  function LeagueStanding(playerId, division, rank, rating, wins, losses) {
    this.playerId = playerId || '';
    this.division = division || 'bronze';
    this.rank = rank || 1;
    this.rating = rating || 1000;
    this.wins = wins || 0;
    this.losses = losses || 0;
    this.streak = 0; // positive = win streak, negative = loss streak
    this.bestStreak = 0;
    this.matchesPlayed = 0;
    this.lastMatchAt = null;
  }

  LeagueStanding.prototype.recordWin = function (ratingChange) {
    this.wins++;
    this.streak = this.streak > 0 ? this.streak + 1 : 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.rating += ratingChange || 25;
    this.matchesPlayed++;
    this.lastMatchAt = Date.now();
  };

  LeagueStanding.prototype.recordLoss = function (ratingChange) {
    this.losses++;
    this.streak = this.streak < 0 ? this.streak - 1 : -1;
    this.rating = Math.max(100, this.rating - (ratingChange || 25));
    this.matchesPlayed++;
    this.lastMatchAt = Date.now();
  };

  LeagueStanding.prototype.getWinRate = function () {
    var total = this.wins + this.losses;
    return total > 0 ? this.wins / total : 0;
  };

  // --------------------------------------------------------------------===
  // LeagueMatch: A single ranked match
  // ========================================================================
  function LeagueMatch(id, seasonId, player1Id, player2Id, winner, player1RatingChange, player2RatingChange, timestamp) {
    this.id = id || '';
    this.seasonId = seasonId || '';
    this.player1Id = player1Id || '';
    this.player2Id = player2Id || '';
    this.winner = winner || null;
    this.player1RatingChange = player1RatingChange || 0;
    this.player2RatingChange = player2RatingChange || 0;
    this.timestamp = timestamp || Date.now();
  }

  // --------------------------------------------------------------------===
  // HeroLeague: Main league management system
  // ========================================================================
  function HeroLeague(storageKey) {
    this.storageKey = storageKey || 'hero_league';
    this._seasons = {};
    this._currentSeasonId = null;
    this._standings = {}; // seasonId -> playerId -> LeagueStanding
    this._init();
  }

  HeroLeague.prototype._init = function () {
    this._load();
    if (!this._currentSeasonId) this._createNewSeason();
  };

  HeroLeague.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._seasons = data.seasons || {};
          this._currentSeasonId = data.currentSeasonId || null;
          this._standings = data.standings || {};
        }
      }
    } catch (e) {}
  };

  HeroLeague.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          seasons: this._seasons,
          currentSeasonId: this._currentSeasonId,
          standings: this._standings
        }));
      }
    } catch (e) {}
  };

  HeroLeague.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[HeroLeague] ' + msg);
  };

  HeroLeague.prototype._createNewSeason = function () {
    var id = 'season_' + Date.now();
    var season = new LeagueSeason(id, 'Season ' + (Object.keys(this._seasons).length + 1), Date.now(), Date.now() + 86400000 * 30, 'active');
    this._seasons[id] = season;
    this._currentSeasonId = id;
    this._standings[id] = {};
    this._save();
    this._log('Created new season: ' + id);
    return id;
  };

  // Get current season
  HeroLeague.prototype.getCurrentSeason = function () {
    return this._seasons[this._currentSeasonId] || null;
  };

  // Get or create standing for a player in current season
  HeroLeague.prototype.getStanding = function (playerId) {
    var sid = this._currentSeasonId;
    if (!this._standings[sid]) this._standings[sid] = {};
    if (!this._standings[sid][playerId]) {
      this._standings[sid][playerId] = new LeagueStanding(playerId, 'bronze', 1, 1000, 0, 0);
    }
    return this._standings[sid][playerId];
  };

  // Record a match result
  HeroLeague.prototype.recordMatch = function (player1Id, player2Id, winner) {
    var sid = this._currentSeasonId;
    var season = this._seasons[sid];
    if (!season || !season.isActive()) return { error: 'season_not_active' };

    var p1Standing = this.getStanding(player1Id);
    var p2Standing = this.getStanding(player2Id);

    var matchId = 'match_' + Date.now();
    var p1Change = winner === player1Id ? 25 : -20;
    var p2Change = winner === player2Id ? 25 : -20;

    var match = new LeagueMatch(matchId, sid, player1Id, player2Id, winner, p1Change, p2Change, Date.now());
    season.addMatch(match);

    if (winner === player1Id) {
      p1Standing.recordWin(p1Change);
      p2Standing.recordLoss(Math.abs(p2Change));
    } else if (winner === player2Id) {
      p2Standing.recordWin(p2Change);
      p1Standing.recordLoss(Math.abs(p1Change));
    } else {
      return { error: 'invalid_winner' };
    }

    this._save();
    return { success: true, match: match };
  };

  // Get all standings sorted by rating
  HeroLeague.prototype.getStandings = function () {
    var sid = this._currentSeasonId;
    var standings = this._standings[sid] || {};
    var result = [];
    for (var pid in standings) result.push(standings[pid]);
    result.sort(function (a, b) { return b.rating - a.rating; });
    return result;
  };

  // Get player rank
  HeroLeague.prototype.getPlayerRank = function (playerId) {
    var standings = this.getStandings();
    for (var i = 0; i < standings.length; i++) {
      if (standings[i].playerId === playerId) return i + 1;
    }
    return -1;
  };

  // Get top N players
  HeroLeague.prototype.getTopPlayers = function (n) {
    var all = this.getStandings();
    return all.slice(0, n || 10);
  };

  // Add season reward definition
  HeroLeague.prototype.setSeasonRewards = function (seasonId, rewards) {
    var season = this._seasons[seasonId];
    if (!season) return { error: 'season_not_found' };
    season.rewards = rewards;
    this._save();
    return { success: true };
  };

  // End current season
  HeroLeague.prototype.endSeason = function () {
    var sid = this._currentSeasonId;
    var season = this._seasons[sid];
    if (!season) return { error: 'season_not_found' };
    if (season.status !== 'active') return { error: 'season_not_active' };
    season.status = 'completed';
    this._save();
    return { success: true };
  };

  // Start new season
  HeroLeague.prototype.startNewSeason = function () {
    var newId = this._createNewSeason();
    this._currentSeasonId = newId;
    this._save();
    return { success: true, seasonId: newId };
  };

  // Get player stats summary
  HeroLeague.prototype.getPlayerStats = function (playerId) {
    var standing = this.getStanding(playerId);
    return {
      rating: standing.rating,
      rank: this.getPlayerRank(playerId),
      division: standing.division,
      wins: standing.wins,
      losses: standing.losses,
      winRate: standing.getWinRate(),
      streak: standing.streak,
      bestStreak: standing.bestStreak,
      matchesPlayed: standing.matchesPlayed
    };
  };

  // --------------------------------------------------------------------===
  // Exports
  // --------------------------------------------------------------------===
  window.LeagueSeason = LeagueSeason;
  window.LeagueStanding = LeagueStanding;
  window.LeagueMatch = LeagueMatch;
  window.HeroLeague = HeroLeague;
})();