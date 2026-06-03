// ============================================================================
// Bot Swarm Arena — V269 Direction B Iteration 6/9
// BotMatchmaker: 智能匹配 (ELO相近/多样性/队列管理/历史)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var MATCH_STRATEGY = {
    RANDOM: 'random',
    ELO: 'elo',
    DIVERSE: 'diverse',
    BALANCED: 'balanced'
  };

  function BotMatchmaker(options) {
    options = options || {};
    this.elo = options.elo || { defaultRating: 1000, kFactor: 32 };
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.avoidRematch = options.avoidRematch !== false;
    this.rematchWindow = options.rematchWindow || 5;  // last N matches
    this.queue = [];
    this.matches = [];
    this.activeMatches = {};
    this.history = [];  // last N matches per pair
    this.eloRatings = {};
    this.matchCounter = 0;
  }

  // ---- Queue management ----
  BotMatchmaker.prototype.joinQueue = function (botId, options) {
    options = options || {};
    if (typeof botId !== 'string' || botId.length === 0) return { error: 'invalid_bot' };
    if (this.queue.length >= this.maxQueueSize) return { error: 'queue_full' };
    if (this._isInQueue(botId)) return { error: 'already_in_queue' };
    var entry = {
      botId: botId,
      elo: this._getElo(botId),
      strategy: options.strategy || 'any',
      tags: options.tags || [],
      joinedAt: Date.now(),
      preferences: options.preferences || {}
    };
    this.queue.push(entry);
    return { success: true, position: this.queue.length, entry: entry };
  };

  BotMatchmaker.prototype.leaveQueue = function (botId) {
    for (var i = 0; i < this.queue.length; i++) {
      if (this.queue[i].botId === botId) {
        this.queue.splice(i, 1);
        return { success: true };
      }
    }
    return { error: 'not_in_queue' };
  };

  BotMatchmaker.prototype._isInQueue = function (botId) {
    for (var i = 0; i < this.queue.length; i++) {
      if (this.queue[i].botId === botId) return true;
    }
    return false;
  };

  BotMatchmaker.prototype.getQueue = function () {
    return this.queue.slice();
  };

  BotMatchmaker.prototype.getQueueSize = function () {
    return this.queue.length;
  };

  // ---- ELO management ----
  BotMatchmaker.prototype._getElo = function (botId) {
    if (typeof this.eloRatings[botId] !== 'number') {
      this.eloRatings[botId] = this.elo.defaultRating;
    }
    return this.eloRatings[botId];
  };

  BotMatchmaker.prototype.setElo = function (botId, rating) {
    if (typeof rating !== 'number') return { error: 'invalid_rating' };
    this.eloRatings[botId] = rating;
    return { success: true };
  };

  BotMatchmaker.prototype._updateElo = function (winnerId, loserId, draw) {
    var wElo = this._getElo(winnerId);
    var lElo = this._getElo(loserId);
    if (draw) {
      var expectedDraw = 1 / (1 + Math.pow(10, (lElo - wElo) / 400));
      this.eloRatings[winnerId] = wElo + this.elo.kFactor * (0.5 - expectedDraw);
      this.eloRatings[loserId] = lElo + this.elo.kFactor * (0.5 - (1 - expectedDraw));
    } else {
      var expectedW = 1 / (1 + Math.pow(10, (lElo - wElo) / 400));
      var expectedL = 1 - expectedW;
      this.eloRatings[winnerId] = wElo + this.elo.kFactor * (1 - expectedW);
      this.eloRatings[loserId] = lElo + this.elo.kFactor * (0 - expectedL);
    }
    return { winnerElo: this.eloRatings[winnerId], loserElo: this.eloRatings[loserId] };
  };

  BotMatchmaker.prototype.getElo = function (botId) {
    return this._getElo(botId);
  };

  BotMatchmaker.prototype.getAllElos = function () {
    return JSON.parse(JSON.stringify(this.eloRatings));
  };

  // ---- Find match ----
  BotMatchmaker.prototype.findMatch = function (botId, strategy) {
    var strat = strategy || MATCH_STRATEGY.ELO;
    if (!this._isInQueue(botId)) return { error: 'bot_not_in_queue' };
    var candidates = this.queue.filter(function (e) { return e.botId !== botId; });
    if (candidates.length === 0) return { error: 'no_opponents' };
    if (strat === MATCH_STRATEGY.RANDOM) {
      return this._matchRandom(botId, candidates);
    } else if (strat === MATCH_STRATEGY.ELO) {
      return this._matchElo(botId, candidates);
    } else if (strat === MATCH_STRATEGY.DIVERSE) {
      return this._matchDiverse(botId, candidates);
    } else if (strat === MATCH_STRATEGY.BALANCED) {
      return this._matchBalanced(botId, candidates);
    }
    return { error: 'invalid_strategy' };
  };

  BotMatchmaker.prototype._matchRandom = function (botId, candidates) {
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (this.avoidRematch && this._recentMatch(botId, pick.botId)) {
      return { error: 'recent_match' };
    }
    return { success: true, opponent: pick.botId, strategy: 'random' };
  };

  BotMatchmaker.prototype._matchElo = function (botId, candidates) {
    var myElo = this._getElo(botId);
    var best = null;
    var bestDiff = Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (this.avoidRematch && this._recentMatch(botId, c.botId)) continue;
      var diff = Math.abs(c.elo - myElo);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }
    if (!best) return { error: 'no_valid_opponent' };
    return { success: true, opponent: best.botId, eloDiff: bestDiff, strategy: 'elo' };
  };

  BotMatchmaker.prototype._matchDiverse = function (botId, candidates) {
    var myElo = this._getElo(botId);
    var best = null;
    var bestDiff = -1;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (this.avoidRematch && this._recentMatch(botId, c.botId)) continue;
      var diff = Math.abs(c.elo - myElo);
      if (diff > bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }
    if (!best) return { error: 'no_valid_opponent' };
    return { success: true, opponent: best.botId, eloDiff: bestDiff, strategy: 'diverse' };
  };

  BotMatchmaker.prototype._matchBalanced = function (botId, candidates) {
    // balance: prefer ELO close, but with some diversity
    var myElo = this._getElo(botId);
    var best = null;
    var bestScore = Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (this.avoidRematch && this._recentMatch(botId, c.botId)) continue;
      var diff = Math.abs(c.elo - myElo);
      // prefer mid-range (200-400 ELO diff for challenge but not stomping)
      var target = 300;
      var score = Math.abs(diff - target);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) return { error: 'no_valid_opponent' };
    return { success: true, opponent: best.botId, score: bestScore, strategy: 'balanced' };
  };

  // ---- Recent match check ----
  BotMatchmaker.prototype._recentMatch = function (botId1, botId2) {
    var key = this._pairKey(botId1, botId2);
    var hist = this.history.filter(function (h) { return h.pairKey === key; });
    return hist.length > 0;
  };

  BotMatchmaker.prototype._pairKey = function (a, b) {
    return [a, b].sort().join(':');
  };

  // ---- Create match ----
  BotMatchmaker.prototype.createMatch = function (bot1Id, bot2Id, options) {
    if (typeof bot1Id !== 'string' || typeof bot2Id !== 'string') return { error: 'invalid_bots' };
    if (bot1Id === bot2Id) return { error: 'same_bot' };
    var matchId = 'm_' + (++this.matchCounter) + '_' + Date.now();
    var match = {
      matchId: matchId,
      bot1: bot1Id,
      bot2: bot2Id,
      bot1EloBefore: this._getElo(bot1Id),
      bot2EloBefore: this._getElo(bot2Id),
      startedAt: Date.now(),
      status: 'active',
      options: options || {}
    };
    this.activeMatches[matchId] = match;
    // remove from queue
    this.leaveQueue(bot1Id);
    this.leaveQueue(bot2Id);
    return { success: true, matchId: matchId, match: match };
  };

  BotMatchmaker.prototype.completeMatch = function (matchId, result) {
    if (!this.activeMatches[matchId]) return { error: 'not_found' };
    var m = this.activeMatches[matchId];
    m.result = result;  // {winner: botId, draw: bool, score1, score2}
    m.completedAt = Date.now();
    // ELO update
    if (result.draw) {
      this._updateElo(m.bot1, m.bot2, true);
    } else if (result.winner === m.bot1) {
      this._updateElo(m.bot1, m.bot2, false);
    } else if (result.winner === m.bot2) {
      this._updateElo(m.bot2, m.bot1, false);
    }
    // history
    var key = this._pairKey(m.bot1, m.bot2);
    this.history.push({ pairKey: key, matchId: matchId, winner: result.winner, draw: result.draw, ts: Date.now() });
    if (this.history.length > 1000) this.history = this.history.slice(-1000);
    // move to matches
    m.status = 'completed';
    this.matches.push(m);
    if (this.matches.length > 500) this.matches = this.matches.slice(-500);
    delete this.activeMatches[matchId];
    return { success: true, match: m };
  };

  BotMatchmaker.prototype.getActiveMatch = function (matchId) {
    return this.activeMatches[matchId] || null;
  };

  BotMatchmaker.prototype.getActiveMatches = function () {
    var arr = [];
    for (var k in this.activeMatches) {
      if (Object.prototype.hasOwnProperty.call(this.activeMatches, k)) {
        arr.push(this.activeMatches[k]);
      }
    }
    return arr;
  };

  BotMatchmaker.prototype.getMatches = function (botId, limit) {
    var arr = this.matches;
    if (botId) {
      arr = arr.filter(function (m) { return m.bot1 === botId || m.bot2 === botId; });
    }
    if (typeof limit === 'number' && limit > 0) {
      return arr.slice(-limit);
    }
    return arr.slice();
  };

  // ---- Stats ----
  BotMatchmaker.prototype.getBotStats = function (botId) {
    var elo = this._getElo(botId);
    var wins = 0, losses = 0, draws = 0;
    for (var i = 0; i < this.matches.length; i++) {
      var m = this.matches[i];
      if (m.bot1 !== botId && m.bot2 !== botId) continue;
      if (m.result && m.result.draw) draws++;
      else if (m.result && m.result.winner === botId) wins++;
      else losses++;
    }
    var total = wins + losses + draws;
    return {
      botId: botId,
      elo: elo,
      wins: wins,
      losses: losses,
      draws: draws,
      totalMatches: total,
      winRate: total > 0 ? wins / total : 0
    };
  };

  BotMatchmaker.prototype.getLeaderboard = function (limit) {
    var entries = [];
    for (var k in this.eloRatings) {
      if (Object.prototype.hasOwnProperty.call(this.eloRatings, k)) {
        entries.push({ botId: k, elo: this.eloRatings[k] });
      }
    }
    entries.sort(function (a, b) { return b.elo - a.elo; });
    if (typeof limit === 'number' && limit > 0) {
      return entries.slice(0, limit);
    }
    return entries;
  };

  BotMatchmaker.prototype.getStats = function () {
    return {
      queueSize: this.queue.length,
      activeMatches: Object.keys(this.activeMatches).length,
      totalMatches: this.matches.length,
      ratedBots: Object.keys(this.eloRatings).length,
      historySize: this.history.length,
      matchCounter: this.matchCounter
    };
  };

  BotMatchmaker.prototype.clear = function () {
    this.queue = [];
    this.matches = [];
    this.activeMatches = {};
    this.history = [];
    this.eloRatings = {};
    this.matchCounter = 0;
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.BotMatchmaker = BotMatchmaker;
    window.MATCH_STRATEGY = MATCH_STRATEGY;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotMatchmaker: BotMatchmaker, MATCH_STRATEGY: MATCH_STRATEGY };
  }
})();
