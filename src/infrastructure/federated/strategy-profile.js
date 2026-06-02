// ============================================================================
// Federated Strategy Cloud — V256 Direction A Iteration 2/9
// StrategyProfile: 玩家策略画像 (卡组使用/胜率/combo统计/段位)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var ARCHETYPES = {
    AGGRO: 'aggro',
    CONTROL: 'control',
    COMBO: 'combo',
    MIDRANGE: 'midrange',
    UNKNOWN: 'unknown'
  };

  var RATING_CONSTANTS = {
    K_FACTOR: 32,
    DEFAULT_RATING: 1000,
    RATING_FLOOR: 0,
    RATING_CEILING: 3000
  };

  function clampRating(r) {
    if (r < RATING_CONSTANTS.RATING_FLOOR) return RATING_CONSTANTS.RATING_FLOOR;
    if (r > RATING_CONSTANTS.RATING_CEILING) return RATING_CONSTANTS.RATING_CEILING;
    return r;
  }

  function StrategyProfile(syncManager, options) {
    options = options || {};
    this.sync = syncManager || null;
    this.storageKey = options.storageKey || 'strategy_profile';
    this.profile = this._emptyProfile(options.playerId);
    this.matchLog = [];
    this.maxLog = options.maxLog || 200;
    if (this.sync) {
      this._loadFromSync();
    }
  }

  StrategyProfile.prototype._emptyProfile = function (playerId) {
    return {
      playerId: playerId || 'unknown_player',
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      decks: {},
      combos: {},
      archetype: ARCHETYPES.UNKNOWN,
      archetypeConfidence: 0,
      rating: {
        mmr: RATING_CONSTANTS.DEFAULT_RATING,
        peak: RATING_CONSTANTS.DEFAULT_RATING,
        lowest: RATING_CONSTANTS.DEFAULT_RATING,
        gamesPlayed: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  StrategyProfile.prototype._loadFromSync = function () {
    if (!this.sync) return;
    var stored = this.sync.localStore.get(this.storageKey);
    if (stored && stored.value) {
      this.profile = stored.value;
      this.profile.updatedAt = Date.now();
    }
  };

  StrategyProfile.prototype._saveToSync = function () {
    if (!this.sync) return { success: false, reason: 'no_sync' };
    this.profile.updatedAt = Date.now();
    return this.sync.localStore.set(this.storageKey, this.profile, { type: 'strategy_profile' });
  };

  StrategyProfile.prototype.recordMatch = function (deckId, deckName, result, combosUsed) {
    if (!deckId) return { error: 'deck_id_required' };
    var validResults = ['win', 'loss', 'draw'];
    if (validResults.indexOf(result) === -1) return { error: 'invalid_result' };
    if (!this.profile.decks[deckId]) {
      this.profile.decks[deckId] = {
        id: deckId,
        name: deckName || deckId,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        combosUsed: {},
        firstUsed: Date.now(),
        lastUsed: Date.now()
      };
    }
    var deck = this.profile.decks[deckId];
    deck.name = deckName || deck.name;
    deck.games++;
    deck.lastUsed = Date.now();
    if (result === 'win') deck.wins++;
    else if (result === 'loss') deck.losses++;
    else deck.draws++;
    deck.winRate = deck.games > 0 ? (deck.wins / deck.games) : 0;
    this.profile.totalGames++;
    if (result === 'win') this.profile.totalWins++;
    else if (result === 'loss') this.profile.totalLosses++;
    else this.profile.totalDraws++;
    // combos
    if (combosUsed && Array.isArray(combosUsed)) {
      for (var i = 0; i < combosUsed.length; i++) {
        var c = combosUsed[i];
        if (!c || !c.id) continue;
        if (!deck.combosUsed[c.id]) deck.combosUsed[c.id] = { name: c.name || c.id, count: 0, wins: 0 };
        deck.combosUsed[c.id].count++;
        if (result === 'win') deck.combosUsed[c.id].wins++;
        if (!this.profile.combos[c.id]) {
          this.profile.combos[c.id] = { id: c.id, name: c.name || c.id, uses: 0, wins: 0, losses: 0, draws: 0 };
        }
        this.profile.combos[c.id].uses++;
        if (result === 'win') this.profile.combos[c.id].wins++;
        else if (result === 'loss') this.profile.combos[c.id].losses++;
        else this.profile.combos[c.id].draws++;
      }
    }
    // match log
    this.matchLog.push({
      ts: Date.now(),
      deckId: deckId,
      deckName: deck.name,
      result: result,
      combos: combosUsed ? combosUsed.map(function (x) { return x.id; }) : []
    });
    if (this.matchLog.length > this.maxLog) {
      this.matchLog = this.matchLog.slice(this.matchLog.length - this.maxLog);
    }
    this.profile.rating.gamesPlayed = this.profile.totalGames;
    this._saveToSync();
    this._recomputeArchetype();
    return { success: true, totalGames: this.profile.totalGames, winRate: this._overallWinRate() };
  };

  StrategyProfile.prototype._overallWinRate = function () {
    if (this.profile.totalGames === 0) return 0;
    return this.profile.totalWins / this.profile.totalGames;
  };

  StrategyProfile.prototype._recomputeArchetype = function () {
    if (this.profile.totalGames < 5) {
      this.profile.archetype = ARCHETYPES.UNKNOWN;
      this.profile.archetypeConfidence = 0;
      return;
    }
    var winRate = this._overallWinRate();
    var avgGameLength = 0;
    var log = this.matchLog;
    for (var i = 0; i < log.length; i++) {
      avgGameLength += (log[i].ts - (i > 0 ? log[i - 1].ts : log[i].ts));
    }
    avgGameLength = log.length > 1 ? avgGameLength / (log.length - 1) : 0;
    var comboCount = Object.keys(this.profile.combos).length;
    var deckCount = Object.keys(this.profile.decks).length;
    if (winRate >= 0.55 && avgGameLength < 60000 && comboCount < 3) {
      this.profile.archetype = ARCHETYPES.AGGRO;
      this.profile.archetypeConfidence = Math.min(1, winRate);
    } else if (comboCount >= 5 && winRate >= 0.5) {
      this.profile.archetype = ARCHETYPES.COMBO;
      this.profile.archetypeConfidence = Math.min(1, comboCount / 10);
    } else if (winRate < 0.4 && deckCount >= 3) {
      this.profile.archetype = ARCHETYPES.CONTROL;
      this.profile.archetypeConfidence = Math.min(1, 0.4 + (1 - winRate));
    } else {
      this.profile.archetype = ARCHETYPES.MIDRANGE;
      this.profile.archetypeConfidence = 0.5;
    }
  };

  StrategyProfile.prototype.getDeckStats = function (deckId) {
    if (!this.profile.decks[deckId]) return null;
    var d = this.profile.decks[deckId];
    return {
      id: d.id,
      name: d.name,
      games: d.games,
      wins: d.wins,
      losses: d.losses,
      draws: d.draws,
      winRate: d.winRate,
      combosUsed: d.combosUsed,
      firstUsed: d.firstUsed,
      lastUsed: d.lastUsed
    };
  };

  StrategyProfile.prototype.getAllDecks = function () {
    var arr = [];
    var decks = this.profile.decks;
    for (var k in decks) {
      if (Object.prototype.hasOwnProperty.call(decks, k)) {
        arr.push(this.getDeckStats(k));
      }
    }
    return arr;
  };

  StrategyProfile.prototype.getTopDecks = function (limit) {
    if (typeof limit !== 'number' || limit <= 0) limit = 5;
    var arr = this.getAllDecks();
    arr.sort(function (a, b) { return b.games - a.games; });
    return arr.slice(0, limit);
  };

  StrategyProfile.prototype.getTopCombos = function (limit) {
    if (typeof limit !== 'number' || limit <= 0) limit = 5;
    var arr = [];
    var combos = this.profile.combos;
    for (var k in combos) {
      if (Object.prototype.hasOwnProperty.call(combos, k)) {
        var c = combos[k];
        arr.push({ id: c.id, name: c.name, uses: c.uses, wins: c.wins, losses: c.losses, draws: c.draws, winRate: c.uses > 0 ? c.wins / c.uses : 0 });
      }
    }
    arr.sort(function (a, b) { return b.uses - a.uses; });
    return arr.slice(0, limit);
  };

  StrategyProfile.prototype.detectArchetype = function () {
    this._recomputeArchetype();
    return { archetype: this.profile.archetype, confidence: this.profile.archetypeConfidence };
  };

  StrategyProfile.prototype.updateRating = function (result, opponentRating) {
    if (typeof opponentRating !== 'number') opponentRating = RATING_CONSTANTS.DEFAULT_RATING;
    var expected = 1 / (1 + Math.pow(10, (opponentRating - this.profile.rating.mmr) / 400));
    var actual = result === 'win' ? 1 : (result === 'loss' ? 0 : 0.5);
    var change = Math.round(RATING_CONSTANTS.K_FACTOR * (actual - expected));
    this.profile.rating.mmr = clampRating(this.profile.rating.mmr + change);
    if (this.profile.rating.mmr > this.profile.rating.peak) this.profile.rating.peak = this.profile.rating.mmr;
    if (this.profile.rating.mmr < this.profile.rating.lowest || this.profile.rating.lowest === RATING_CONSTANTS.DEFAULT_RATING) {
      this.profile.rating.lowest = this.profile.rating.mmr;
    }
    this._saveToSync();
    return { newMmr: this.profile.rating.mmr, change: change, peak: this.profile.rating.peak };
  };

  StrategyProfile.prototype.getProfile = function () {
    return JSON.parse(JSON.stringify(this.profile));
  };

  StrategyProfile.prototype.getStats = function () {
    return {
      totalGames: this.profile.totalGames,
      totalWins: this.profile.totalWins,
      totalLosses: this.profile.totalLosses,
      totalDraws: this.profile.totalDraws,
      winRate: this._overallWinRate(),
      deckCount: Object.keys(this.profile.decks).length,
      comboCount: Object.keys(this.profile.combos).length,
      archetype: this.profile.archetype,
      mmr: this.profile.rating.mmr,
      peak: this.profile.rating.peak
    };
  };

  StrategyProfile.prototype.getMatchLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.matchLog.slice(-limit);
    }
    return this.matchLog.slice();
  };

  StrategyProfile.prototype.getMatchLogByDeck = function (deckId) {
    if (!deckId) return { error: 'deck_id_required' };
    return this.matchLog.filter(function (m) { return m.deckId === deckId; });
  };

  StrategyProfile.prototype.syncToCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    var r = this.sync.backup(this.storageKey, this.profile, { type: 'strategy_profile' });
    return r;
  };

  StrategyProfile.prototype.loadFromCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    var r = this.sync.restore(this.storageKey);
    if (r.success) {
      this.profile = r.value;
    }
    return r;
  };

  StrategyProfile.prototype.exportProfile = function () {
    return JSON.stringify({
      format: 'strategy-profile-v1',
      exportedAt: Date.now(),
      profile: this.profile
    });
  };

  StrategyProfile.prototype.importProfile = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'strategy-profile-v1') return { error: 'unknown_format' };
      if (!parsed.profile || typeof parsed.profile !== 'object') return { error: 'invalid_profile' };
      this.profile = parsed.profile;
      this._saveToSync();
      return { success: true, totalGames: this.profile.totalGames };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  StrategyProfile.prototype.mergeProfiles = function (otherInnerProfile) {
    if (!otherInnerProfile || typeof otherInnerProfile !== 'object') return { error: 'invalid_other' };
    if (typeof otherInnerProfile.totalGames !== 'number') return { error: 'missing_totalGames' };
    var o = otherInnerProfile;
    this.profile.totalGames += (o.totalGames || 0);
    this.profile.totalWins += (o.totalWins || 0);
    this.profile.totalLosses += (o.totalLosses || 0);
    this.profile.totalDraws += (o.totalDraws || 0);
    if (o.decks) {
      for (var dk in o.decks) {
        if (Object.prototype.hasOwnProperty.call(o.decks, dk)) {
          if (!this.profile.decks[dk]) {
            this.profile.decks[dk] = o.decks[dk];
          } else {
            var cur = this.profile.decks[dk];
            var inc = o.decks[dk];
            cur.games += inc.games;
            cur.wins += inc.wins;
            cur.losses += inc.losses;
            cur.draws += inc.draws;
            cur.winRate = cur.games > 0 ? cur.wins / cur.games : 0;
          }
        }
      }
    }
    if (o.combos) {
      for (var ck in o.combos) {
        if (Object.prototype.hasOwnProperty.call(o.combos, ck)) {
          if (!this.profile.combos[ck]) this.profile.combos[ck] = o.combos[ck];
          else {
            var ccur = this.profile.combos[ck];
            var cinc = o.combos[ck];
            ccur.uses += cinc.uses;
            ccur.wins += cinc.wins;
            ccur.losses += cinc.losses;
            ccur.draws += cinc.draws;
          }
        }
      }
    }
    if (o.rating && o.rating.mmr > this.profile.rating.peak) {
      this.profile.rating.peak = o.rating.mmr;
    }
    this._recomputeArchetype();
    this._saveToSync();
    return { success: true, totalGames: this.profile.totalGames };
  };

  StrategyProfile.prototype.clear = function () {
    var oldId = this.profile.playerId;
    this.profile = this._emptyProfile(oldId);
    this.matchLog = [];
    this._saveToSync();
    return { success: true };
  };

  StrategyProfile.prototype.deleteDeck = function (deckId) {
    if (!this.profile.decks[deckId]) return { error: 'not_found' };
    delete this.profile.decks[deckId];
    this._saveToSync();
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.StrategyProfile = StrategyProfile;
    window.STRATEGY_ARCHETYPES = ARCHETYPES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StrategyProfile: StrategyProfile, STRATEGY_ARCHETYPES: ARCHETYPES };
  }
})();
