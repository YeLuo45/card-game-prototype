// ============================================================================
// Federated Strategy Cloud — V257 Direction A Iteration 3/9
// MetaGameSync: 元数据云 (全局卡牌使用率/banlist/段位/补丁元数据)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var TIERS = { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', F: 'F' };
  var TIER_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 };
  var SORT_KEYS = { USES: 'uses', WIN_RATE: 'winRate', POPULARITY: 'popularity' };

  function MetaGameSync(syncManager, options) {
    options = options || {};
    this.sync = syncManager || null;
    this.storageKey = options.storageKey || 'meta_game';
    this.localStats = {};
    this.globalStats = {};
    this.banlist = [];
    this.tierList = {};
    this.patches = [];
    this.lastSync = null;
    this.version = 0;
    this.deviceId = (syncManager && syncManager.deviceId) || 'unknown';
    if (this.sync) {
      this._loadFromSync();
    }
  }

  MetaGameSync.prototype._loadFromSync = function () {
    if (!this.sync) return;
    var stored = this.sync.localStore.get(this.storageKey);
    if (stored && stored.value) {
      this.localStats = stored.value.localStats || {};
      this.banlist = stored.value.banlist || [];
      this.tierList = stored.value.tierList || {};
      this.patches = stored.value.patches || [];
      this.lastSync = stored.value.lastSync || null;
      this.version = stored.value.version || 0;
    }
  };

  MetaGameSync.prototype._saveToSync = function () {
    if (!this.sync) return { success: false, reason: 'no_sync' };
    var data = {
      localStats: this.localStats,
      banlist: this.banlist,
      tierList: this.tierList,
      patches: this.patches,
      lastSync: this.lastSync,
      version: this.version
    };
    return this.sync.localStore.set(this.storageKey, data, { type: 'meta_game' });
  };

  MetaGameSync.prototype.recordUsage = function (cardId, result) {
    if (typeof cardId !== 'string' || cardId.length === 0) return { error: 'invalid_card' };
    if (!this.localStats[cardId]) {
      this.localStats[cardId] = { cardId: cardId, uses: 0, wins: 0, losses: 0, draws: 0, lastUsed: 0 };
    }
    var s = this.localStats[cardId];
    s.uses++;
    s.lastUsed = Date.now();
    if (result === 'win') s.wins++;
    else if (result === 'loss') s.losses++;
    else if (result === 'draw') s.draws++;
    this._saveToSync();
    return { success: true, cardId: cardId, uses: s.uses, winRate: s.uses > 0 ? s.wins / s.uses : 0 };
  };

  MetaGameSync.prototype.getCardUsage = function (cardId) {
    if (!this.localStats[cardId]) return null;
    var s = this.localStats[cardId];
    return {
      cardId: s.cardId,
      uses: s.uses,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      winRate: s.uses > 0 ? s.wins / s.uses : 0,
      lastUsed: s.lastUsed
    };
  };

  MetaGameSync.prototype.getTopCards = function (limit, sortBy) {
    if (typeof limit !== 'number' || limit <= 0) limit = 10;
    if (!sortBy) sortBy = SORT_KEYS.USES;
    var arr = [];
    var stats = this.localStats;
    for (var k in stats) {
      if (Object.prototype.hasOwnProperty.call(stats, k)) {
        var s = stats[k];
        var pop = s.uses;
        var wr = s.uses > 0 ? s.wins / s.uses : 0;
        arr.push({
          cardId: s.cardId,
          uses: s.uses,
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
          winRate: wr,
          popularity: pop,
          lastUsed: s.lastUsed
        });
      }
    }
    arr.sort(function (a, b) {
      if (sortBy === SORT_KEYS.WIN_RATE) return b.winRate - a.winRate;
      if (sortBy === SORT_KEYS.POPULARITY) return b.popularity - a.popularity;
      return b.uses - a.uses;
    });
    return arr.slice(0, limit);
  };

  MetaGameSync.prototype.publishToCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    this.version++;
    var data = {
      localStats: this.localStats,
      banlist: this.banlist,
      tierList: this.tierList,
      patches: this.patches,
      lastSync: Date.now(),
      version: this.version,
      publisherId: this.deviceId
    };
    return this.sync.backup(this.storageKey, data, { type: 'meta_game_publish' });
  };

  MetaGameSync.prototype.loadFromCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    var r = this.sync.restore(this.storageKey);
    if (r.success && r.value) {
      this.globalStats = r.value.localStats || {};
      this.banlist = r.value.banlist || [];
      this.tierList = r.value.tierList || {};
      this.patches = r.value.patches || [];
      this.lastSync = r.value.lastSync || null;
      this.version = r.value.version || 0;
    }
    return r;
  };

  MetaGameSync.prototype.mergeWithGlobal = function (globalData) {
    if (!globalData || typeof globalData !== 'object') return { error: 'invalid_global' };
    var stats = globalData.localStats || {};
    for (var k in stats) {
      if (Object.prototype.hasOwnProperty.call(stats, k)) {
        if (!this.globalStats[k]) {
          this.globalStats[k] = { cardId: k, uses: 0, wins: 0, losses: 0, draws: 0, contributors: 0 };
        }
        var g = this.globalStats[k];
        var inc = stats[k];
        g.uses += inc.uses;
        g.wins += inc.wins;
        g.losses += inc.losses;
        g.draws += inc.draws || 0;
        g.contributors++;
      }
    }
    this.lastSync = Date.now();
    return { success: true, cardsTracked: Object.keys(this.globalStats).length };
  };

  MetaGameSync.prototype.banCard = function (cardId, reason) {
    if (typeof cardId !== 'string' || cardId.length === 0) return { error: 'invalid_card' };
    if (this.banlist.indexOf(cardId) === -1) {
      this.banlist.push(cardId);
    }
    this.patches.push({
      ts: Date.now(),
      type: 'ban',
      cardId: cardId,
      reason: reason || '',
      by: this.deviceId
    });
    this._saveToSync();
    return { success: true, cardId: cardId, banned: true, banlistSize: this.banlist.length };
  };

  MetaGameSync.prototype.unbanCard = function (cardId) {
    var idx = this.banlist.indexOf(cardId);
    if (idx === -1) return { error: 'not_banned' };
    this.banlist.splice(idx, 1);
    this.patches.push({ ts: Date.now(), type: 'unban', cardId: cardId, by: this.deviceId });
    this._saveToSync();
    return { success: true, cardId: cardId, banned: false, banlistSize: this.banlist.length };
  };

  MetaGameSync.prototype.getBanlist = function () {
    return this.banlist.slice();
  };

  MetaGameSync.prototype.isBanned = function (cardId) {
    return this.banlist.indexOf(cardId) !== -1;
  };

  MetaGameSync.prototype.setTier = function (cardId, tier) {
    if (typeof cardId !== 'string' || cardId.length === 0) return { error: 'invalid_card' };
    if (TIER_RANK[tier] === undefined) return { error: 'invalid_tier' };
    this.tierList[cardId] = tier;
    this._saveToSync();
    return { success: true, cardId: cardId, tier: tier };
  };

  MetaGameSync.prototype.getTierList = function () {
    var arr = [];
    for (var k in this.tierList) {
      if (Object.prototype.hasOwnProperty.call(this.tierList, k)) {
        arr.push({ cardId: k, tier: this.tierList[k] });
      }
    }
    arr.sort(function (a, b) { return (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0); });
    return arr;
  };

  MetaGameSync.prototype.getCardsByTier = function (tier) {
    if (TIER_RANK[tier] === undefined) return { error: 'invalid_tier' };
    var out = [];
    for (var k in this.tierList) {
      if (Object.prototype.hasOwnProperty.call(this.tierList, k) && this.tierList[k] === tier) {
        out.push(k);
      }
    }
    return out;
  };

  MetaGameSync.prototype.getMetaReport = function () {
    var top = this.getTopCards(10, SORT_KEYS.USES);
    var topWR = this.getTopCards(5, SORT_KEYS.WIN_RATE);
    var tierList = this.getTierList();
    var tierCounts = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (var i = 0; i < tierList.length; i++) {
      var t = tierList[i].tier;
      if (tierCounts[t] !== undefined) tierCounts[t]++;
    }
    return {
      version: this.version,
      lastSync: this.lastSync,
      totalCardsTracked: Object.keys(this.localStats).length,
      totalBanned: this.banlist.length,
      patchesCount: this.patches.length,
      topCardsByUsage: top,
      topCardsByWinRate: topWR,
      tierCounts: tierCounts,
      tierListSize: tierList.length
    };
  };

  MetaGameSync.prototype.exportMeta = function () {
    return JSON.stringify({
      format: 'meta-game-v1',
      exportedAt: Date.now(),
      localStats: this.localStats,
      globalStats: this.globalStats,
      banlist: this.banlist,
      tierList: this.tierList,
      patches: this.patches,
      version: this.version
    });
  };

  MetaGameSync.prototype.importMeta = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'meta-game-v1') return { error: 'unknown_format' };
      this.localStats = parsed.localStats || {};
      this.globalStats = parsed.globalStats || {};
      this.banlist = parsed.banlist || [];
      this.tierList = parsed.tierList || {};
      this.patches = parsed.patches || [];
      this.version = parsed.version || 0;
      this._saveToSync();
      return { success: true, version: this.version };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  MetaGameSync.prototype.getPatches = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.patches.slice(-limit);
    }
    return this.patches.slice();
  };

  MetaGameSync.prototype.clear = function () {
    this.localStats = {};
    this.globalStats = {};
    this.banlist = [];
    this.tierList = {};
    this.patches = [];
    this.version = 0;
    this.lastSync = null;
    this._saveToSync();
    return { success: true };
  };

  MetaGameSync.prototype.getSummary = function () {
    return {
      deviceId: this.deviceId,
      version: this.version,
      lastSync: this.lastSync,
      localCardCount: Object.keys(this.localStats).length,
      globalCardCount: Object.keys(this.globalStats).length,
      banlistSize: this.banlist.length,
      tierListSize: Object.keys(this.tierList).length,
      patchesCount: this.patches.length
    };
  };

  if (typeof window !== 'undefined') {
    window.MetaGameSync = MetaGameSync;
    window.META_TIERS = TIERS;
    window.META_SORT_KEYS = SORT_KEYS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MetaGameSync: MetaGameSync, META_TIERS: TIERS, META_SORT_KEYS: SORT_KEYS };
  }
})();
