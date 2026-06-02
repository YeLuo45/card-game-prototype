// ============================================================================
// Federated Strategy Cloud — V259 Direction A Iteration 5/9
// LeaderboardCloud: 天梯云端 (全球玩家分数同步/排名/分时段)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var TIME_WINDOWS = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    ALL_TIME: 'all_time'
  };

  var REGIONS = { GLOBAL: 'global', NA: 'na', EU: 'eu', ASIA: 'asia', SA: 'sa' };

  var VALID_PERIODS = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    all_time: Infinity
  };

  function LeaderboardCloud(syncManager, options) {
    options = options || {};
    this.sync = syncManager || null;
    this.storageKey = options.storageKey || 'leaderboard';
    this.localPlayerId = options.localPlayerId || ((syncManager && syncManager.deviceId) || 'unknown');
    this.maxEntries = options.maxEntries || 10000;
    this.entries = {};
    this.submissions = [];
    this.seasons = {};
    this.currentSeason = options.currentSeason || 's1';
    this.deviceId = this.localPlayerId;
    if (this.sync) {
      this._loadFromSync();
    }
  }

  LeaderboardCloud.prototype._loadFromSync = function () {
    if (!this.sync) return;
    var stored = this.sync.localStore.get(this.storageKey);
    if (stored && stored.value) {
      this.entries = stored.value.entries || {};
      this.submissions = stored.value.submissions || [];
      this.seasons = stored.value.seasons || {};
    }
  };

  LeaderboardCloud.prototype._saveToSync = function () {
    if (!this.sync) return { success: false, reason: 'no_sync' };
    return this.sync.localStore.set(this.storageKey, {
      entries: this.entries,
      submissions: this.submissions,
      seasons: this.seasons
    }, { type: 'leaderboard' });
  };

  LeaderboardCloud.prototype._validateScore = function (score) {
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) return { error: 'invalid_score' };
    if (score < 0) return { error: 'negative_score' };
    if (score > 10000000) return { error: 'score_too_high' };
    return { success: true };
  };

  LeaderboardCloud.prototype.submitScore = function (playerId, playerName, score, region) {
    if (typeof playerId !== 'string' || playerId.length === 0) return { error: 'invalid_player' };
    var v = this._validateScore(score);
    if (v.error) return v;
    if (region && Object.keys(REGIONS).map(function (k) { return REGIONS[k]; }).indexOf(region) === -1) {
      return { error: 'invalid_region' };
    }
    var entry = {
      playerId: playerId,
      playerName: playerName || playerId,
      score: score,
      region: region || REGIONS.GLOBAL,
      season: this.currentSeason,
      ts: Date.now()
    };
    if (!this.entries[playerId]) {
      this.entries[playerId] = { playerId: playerId, playerName: entry.playerName, bestScore: score, totalScore: 0, gamesPlayed: 0, region: entry.region, lastPlayed: entry.ts, season: this.currentSeason };
    }
    var p = this.entries[playerId];
    if (score > p.bestScore) p.bestScore = score;
    p.totalScore += score;
    p.gamesPlayed++;
    p.lastPlayed = entry.ts;
    p.playerName = entry.playerName;
    p.region = entry.region;
    p.season = this.currentSeason;
    this.submissions.push(entry);
    if (this.submissions.length > this.maxEntries) {
      this.submissions = this.submissions.slice(-this.maxEntries);
    }
    if (!this.seasons[this.currentSeason]) {
      this.seasons[this.currentSeason] = { name: this.currentSeason, startedAt: Date.now(), playerCount: 0 };
    }
    this.seasons[this.currentSeason].playerCount = Object.keys(this.entries).length;
    this._saveToSync();
    return { success: true, playerId: playerId, bestScore: p.bestScore, rank: this.getPlayerRank(playerId) };
  };

  LeaderboardCloud.prototype.getPlayerRank = function (playerId, timeWindow) {
    var sorted = this._getSortedEntries(timeWindow || TIME_WINDOWS.ALL_TIME);
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].playerId === playerId) {
        return { rank: i + 1, total: sorted.length, score: sorted[i].bestScore, playerName: sorted[i].playerName };
      }
    }
    return null;
  };

  LeaderboardCloud.prototype._getSortedEntries = function (timeWindow) {
    var window = VALID_PERIODS[timeWindow] !== undefined ? timeWindow : TIME_WINDOWS.ALL_TIME;
    var windowMs = VALID_PERIODS[window];
    var cutoff = windowMs === Infinity ? 0 : Date.now() - windowMs;
    var entries = [];
    for (var k in this.entries) {
      if (Object.prototype.hasOwnProperty.call(this.entries, k)) {
        var e = this.entries[k];
        if (e.lastPlayed >= cutoff) {
          entries.push({
            playerId: e.playerId,
            playerName: e.playerName,
            bestScore: e.bestScore,
            totalScore: e.totalScore,
            gamesPlayed: e.gamesPlayed,
            region: e.region,
            lastPlayed: e.lastPlayed,
            season: e.season
          });
        }
      }
    }
    entries.sort(function (a, b) { return b.bestScore - a.bestScore; });
    return entries;
  };

  LeaderboardCloud.prototype.getTopN = function (limit, timeWindow, region) {
    if (typeof limit !== 'number' || limit <= 0) limit = 10;
    var sorted = this._getSortedEntries(timeWindow);
    if (region && region !== REGIONS.GLOBAL) {
      sorted = sorted.filter(function (e) { return e.region === region; });
    }
    return sorted.slice(0, limit).map(function (e, i) {
      return { rank: i + 1, playerId: e.playerId, playerName: e.playerName, score: e.bestScore, region: e.region };
    });
  };

  LeaderboardCloud.prototype.getPlayer = function (playerId) {
    if (!this.entries[playerId]) return null;
    var p = this.entries[playerId];
    return {
      playerId: p.playerId,
      playerName: p.playerName,
      bestScore: p.bestScore,
      totalScore: p.totalScore,
      gamesPlayed: p.gamesPlayed,
      region: p.region,
      lastPlayed: p.lastPlayed,
      season: p.season
    };
  };

  LeaderboardCloud.prototype.getRegionLeaderboard = function (region, limit) {
    if (typeof region !== 'string') return { error: 'invalid_region' };
    return this.getTopN(limit || 10, TIME_WINDOWS.ALL_TIME, region);
  };

  LeaderboardCloud.prototype.getSeasonLeaderboard = function (season, limit) {
    if (typeof season !== 'string' || season.length === 0) return { error: 'invalid_season' };
    if (typeof limit !== 'number' || limit <= 0) limit = 10;
    var arr = [];
    for (var k in this.entries) {
      if (Object.prototype.hasOwnProperty.call(this.entries, k)) {
        var e = this.entries[k];
        if (e.season === season) {
          arr.push({ playerId: e.playerId, playerName: e.playerName, score: e.bestScore, region: e.region });
        }
      }
    }
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr.slice(0, limit).map(function (e, i) {
      return { rank: i + 1, playerId: e.playerId, playerName: e.playerName, score: e.score, region: e.region };
    });
  };

  LeaderboardCloud.prototype.startNewSeason = function (seasonName) {
    if (typeof seasonName !== 'string' || seasonName.length === 0) return { error: 'invalid_season' };
    if (this.seasons[seasonName]) return { error: 'season_exists' };
    this.seasons[seasonName] = { name: seasonName, startedAt: Date.now(), playerCount: 0 };
    this.currentSeason = seasonName;
    this._saveToSync();
    return { success: true, season: seasonName, startedAt: this.seasons[seasonName].startedAt };
  };

  LeaderboardCloud.prototype.getCurrentSeason = function () {
    return this.currentSeason;
  };

  LeaderboardCloud.prototype.getSeasons = function () {
    var arr = [];
    for (var k in this.seasons) {
      if (Object.prototype.hasOwnProperty.call(this.seasons, k)) {
        arr.push(this.seasons[k]);
      }
    }
    arr.sort(function (a, b) { return b.startedAt - a.startedAt; });
    return arr;
  };

  LeaderboardCloud.prototype.publishToCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    return this.sync.backup(this.storageKey, {
      entries: this.entries,
      submissions: this.submissions,
      seasons: this.seasons
    }, { type: 'leaderboard_publish' });
  };

  LeaderboardCloud.prototype.loadFromCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    var r = this.sync.restore(this.storageKey);
    if (r.success && r.value) {
      this.entries = r.value.entries || {};
      this.submissions = r.value.submissions || [];
      this.seasons = r.value.seasons || {};
    }
    return r;
  };

  LeaderboardCloud.prototype.mergeEntries = function (otherEntries) {
    if (!otherEntries || typeof otherEntries !== 'object') return { error: 'invalid_other' };
    var added = 0;
    for (var k in otherEntries) {
      if (Object.prototype.hasOwnProperty.call(otherEntries, k)) {
        if (!this.entries[k]) {
          this.entries[k] = otherEntries[k];
          added++;
        } else {
          var cur = this.entries[k];
          var inc = otherEntries[k];
          if (inc.bestScore > cur.bestScore) cur.bestScore = inc.bestScore;
          cur.totalScore += inc.totalScore;
          cur.gamesPlayed += inc.gamesPlayed;
          if (inc.lastPlayed > cur.lastPlayed) cur.lastPlayed = inc.lastPlayed;
        }
      }
    }
    this._saveToSync();
    return { success: true, added: added, total: Object.keys(this.entries).length };
  };

  LeaderboardCloud.prototype.getSubmissions = function (playerId, limit) {
    var subs = this.submissions;
    if (playerId) {
      subs = subs.filter(function (s) { return s.playerId === playerId; });
    }
    if (typeof limit === 'number' && limit > 0) {
      return subs.slice(-limit);
    }
    return subs.slice();
  };

  LeaderboardCloud.prototype.exportLeaderboard = function () {
    return JSON.stringify({
      format: 'leaderboard-v1',
      exportedAt: Date.now(),
      entries: this.entries,
      submissions: this.submissions,
      seasons: this.seasons,
      currentSeason: this.currentSeason
    });
  };

  LeaderboardCloud.prototype.importLeaderboard = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'leaderboard-v1') return { error: 'unknown_format' };
      this.entries = parsed.entries || {};
      this.submissions = parsed.submissions || [];
      this.seasons = parsed.seasons || {};
      this.currentSeason = parsed.currentSeason || 's1';
      this._saveToSync();
      return { success: true, totalEntries: Object.keys(this.entries).length };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  LeaderboardCloud.prototype.getStats = function () {
    return {
      totalPlayers: Object.keys(this.entries).length,
      totalSubmissions: this.submissions.length,
      totalSeasons: Object.keys(this.seasons).length,
      currentSeason: this.currentSeason
    };
  };

  LeaderboardCloud.prototype.clear = function () {
    this.entries = {};
    this.submissions = [];
    this.seasons = {};
    this._saveToSync();
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.LeaderboardCloud = LeaderboardCloud;
    window.LEADERBOARD_WINDOWS = TIME_WINDOWS;
    window.LEADERBOARD_REGIONS = REGIONS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LeaderboardCloud: LeaderboardCloud, LEADERBOARD_WINDOWS: TIME_WINDOWS, LEADERBOARD_REGIONS: REGIONS };
  }
})();
