// ============================================================================
// Card Leaderboard Seasons — V170 Direction E
// Seasonal leaderboard with resets, tier ranks, and rewards
// ruflo hierarchical decomposition + generic-agent + thunderbolt
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // TierRank: Defines a tier
  // ========================================================================
  function TierRank(tierId, name, minRating, maxRating, rewardBonus) {
    this.tierId = tierId;
    this.name = name || tierId;
    this.minRating = minRating || 0;
    this.maxRating = maxRating || 9999;
    this.rewardBonus = rewardBonus || 1.0;
  }

  TierRank.prototype.isInTier = function (rating) {
    return rating >= this.minRating && rating <= this.maxRating;
  };

  TierRank.prototype.getTierIcon = function () {
    var icons = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '💠', master: '👑' };
    return icons[this.tierId] || '⭐';
  };

  // --------------------------------------------------------------------===
  // Season: A single competitive season
  // ========================================================================
  function Season(seasonId, name, startDate, endDate) {
    this.seasonId = seasonId;
    this.name = name || 'Season ' + seasonId;
    this.startDate = startDate || Date.now();
    this.endDate = endDate || (this.startDate + 30 * 24 * 60 * 60 * 1000);
    this.standings = []; // array of { playerId, rating, wins, losses, streak }
    this._ratingMap = {}; // playerId -> index in standings
  }

  Season.prototype.isActive = function () {
    var now = Date.now();
    return now >= this.startDate && now <= this.endDate;
  };

  Season.prototype.isExpired = function () {
    return Date.now() > this.endDate;
  };

  Season.prototype.registerPlayer = function (playerId, initialRating) {
    if (this._ratingMap[playerId] !== undefined) return { error: 'already_registered' };
    var entry = { playerId: playerId, rating: initialRating || 1500, wins: 0, losses: 0, streak: 0 };
    this._ratingMap[playerId] = this.standings.length;
    this.standings.push(entry);
    return { success: true, playerCount: this.standings.length };
  };

  Season.prototype.getPlayerEntry = function (playerId) {
    var idx = this._ratingMap[playerId];
    return idx !== undefined ? this.standings[idx] : null;
  };

  Season.prototype.updatePlayerRating = function (playerId, newRating, isWin) {
    var entry = this.getPlayerEntry(playerId);
    if (!entry) return { error: 'player_not_found' };
    entry.rating = newRating;
    if (isWin) {
      entry.wins++;
      entry.streak = entry.streak > 0 ? entry.streak + 1 : 1;
    } else {
      entry.losses++;
      entry.streak = entry.streak < 0 ? entry.streak - 1 : -1;
    }
    return { success: true, entry: entry };
  };

  Season.prototype.getStandings = function (limit) {
    var sorted = this.standings.slice();
    sorted.sort(function (a, b) {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.wins - b.losses) - (a.wins - a.losses);
    });
    if (limit) sorted = sorted.slice(0, limit);
    return sorted;
  };

  Season.prototype.getPlayerRank = function (playerId) {
    var sorted = this.getStandings();
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].playerId === playerId) return i + 1;
    }
    return null;
  };

  // --------------------------------------------------------------------===
  // SeasonalLeaderboard: Manages multiple seasons
  // ========================================================================
  function SeasonalLeaderboard(storageKey) {
    this.storageKey = storageKey || 'seasonal_leaderboard';
    this._tiers = [];
    this._seasons = {}; // seasonId -> Season
    this._currentSeasonId = null;
    this._init();
  }

  SeasonalLeaderboard.prototype._init = function () {
    this._loadTiers();
    this._load();
  };

  SeasonalLeaderboard.prototype._loadTiers = function () {
    this._tiers = [
      new TierRank('bronze', 'Bronze', 0, 1199, 1.0),
      new TierRank('silver', 'Silver', 1200, 1499, 1.2),
      new TierRank('gold', 'Gold', 1500, 1799, 1.5),
      new TierRank('platinum', 'Platinum', 1800, 2099, 2.0),
      new TierRank('diamond', 'Diamond', 2100, 2399, 3.0),
      new TierRank('master', 'Master', 2400, 9999, 5.0)
    ];
  };

  SeasonalLeaderboard.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._currentSeasonId = data.currentSeasonId;
        }
      }
    } catch (e) {}
    if (!this._currentSeasonId) this.createNewSeason('Season 1');
  };

  SeasonalLeaderboard.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          currentSeasonId: this._currentSeasonId
        }));
      }
    } catch (e) {}
  };

  SeasonalLeaderboard.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[SeasonalLeaderboard] ' + msg);
    }
  };

  SeasonalLeaderboard.prototype.createNewSeason = function (name) {
    var seasonId = 's' + Date.now();
    var season = new Season(seasonId, name);
    this._seasons[seasonId] = season;
    this._currentSeasonId = seasonId;
    this._save();
    return { success: true, seasonId: seasonId };
  };

  SeasonalLeaderboard.prototype.getCurrentSeason = function () {
    return this._seasons[this._currentSeasonId] || null;
  };

  SeasonalLeaderboard.prototype.getSeason = function (seasonId) {
    return this._seasons[seasonId] || null;
  };

  SeasonalLeaderboard.prototype.getTierForRating = function (rating) {
    for (var i = 0; i < this._tiers.length; i++) {
      if (this._tiers[i].isInTier(rating)) return this._tiers[i];
    }
    return this._tiers[0];
  };

  SeasonalLeaderboard.prototype.getTiers = function () {
    return this._tiers.slice();
  };

  SeasonalLeaderboard.prototype.registerPlayerInCurrentSeason = function (playerId, initialRating) {
    var season = this.getCurrentSeason();
    if (!season) return { error: 'no_active_season' };
    return season.registerPlayer(playerId, initialRating);
  };

  SeasonalLeaderboard.prototype.getPlayerStats = function (playerId) {
    var season = this.getCurrentSeason();
    if (!season) return null;
    var entry = season.getPlayerEntry(playerId);
    if (!entry) return null;
    var rank = season.getPlayerRank(playerId);
    var tier = this.getTierForRating(entry.rating);
    return {
      playerId: playerId,
      rating: entry.rating,
      rank: rank,
      wins: entry.wins,
      losses: entry.losses,
      streak: entry.streak,
      tier: tier.name,
      tierIcon: tier.getTierIcon()
    };
  };

  SeasonalLeaderboard.prototype.getTopPlayers = function (limit) {
    var season = this.getCurrentSeason();
    if (!season) return [];
    return season.getStandings(limit);
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.TierRank = TierRank;
  window.Season = Season;
  window.SeasonalLeaderboard = SeasonalLeaderboard;
})();