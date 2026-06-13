// ============================================================================
// Adaptive Difficulty Engine — V340 Direction A Iter 2/30
// PerformanceTracker: 战斗表现追踪 (winRate / avgDmg / avgTurns / clearTime)
// 来源：thunderbolt 反馈循环（实时表现→难度调整信号）
// ============================================================================
'use strict';

(function () {

  // Struggle detection thresholds
  var STRUGGLE_WINRATE = 0.30;   // win rate < 30% = struggling
  var STRUGGLE_MIN_BATTLES = 5;  // need >= 5 battles for signal
  var DEFAULT_WINDOW = 20;       // rolling window default

  // chapter聚合
  function PerformanceTracker(options) {
    this.windowSize = (options && options.windowSize) || DEFAULT_WINDOW;
    this.battles = [];           // all battle results (sliding window)
    this.byChapter = {};         // chapter -> array of results
    this.totalBattles = 0;
    this.totalWins = 0;
  }

  PerformanceTracker.prototype.recordBattle = function (result) {
    if (!result || typeof result !== 'object') {
      return { success: false, error: 'invalid_result' };
    }
    var won = result.won === true;
    var dmg = (typeof result.damage === 'number' && result.damage >= 0) ? result.damage : 0;
    var turns = (typeof result.turns === 'number' && result.turns >= 0) ? result.turns : 0;
    var time = (typeof result.timeMs === 'number' && result.timeMs >= 0) ? result.timeMs : 0;
    var chapter = (typeof result.chapter === 'string') ? result.chapter : 'default';
    var entry = {
      won: won,
      damage: dmg,
      turns: turns,
      timeMs: time,
      chapter: chapter,
      ts: Date.now()
    };
    this.battles.push(entry);
    if (this.battles.length > this.windowSize) {
      this.battles.shift();
    }
    if (!this.byChapter[chapter]) {
      this.byChapter[chapter] = [];
    }
    this.byChapter[chapter].push(entry);
    this.totalBattles++;
    if (won) this.totalWins++;
    return { success: true, entry: entry };
  };

  PerformanceTracker.prototype._statsFromArray = function (arr) {
    if (!arr || arr.length === 0) {
      return {
        count: 0, winRate: 0, avgDamage: 0, avgTurns: 0, avgTimeMs: 0,
        maxDamage: 0, minTurns: Infinity, fastestClearMs: Infinity
      };
    }
    var wins = 0, sumDmg = 0, sumTurns = 0, sumTime = 0;
    var maxDmg = 0, minTurns = Infinity, fastest = Infinity;
    var i;
    for (i = 0; i < arr.length; i++) {
      var b = arr[i];
      if (b.won) wins++;
      sumDmg += b.damage;
      sumTurns += b.turns;
      sumTime += b.timeMs;
      if (b.damage > maxDmg) maxDmg = b.damage;
      if (b.turns > 0 && b.turns < minTurns) minTurns = b.turns;
      if (b.timeMs > 0 && b.timeMs < fastest) fastest = b.timeMs;
    }
    return {
      count: arr.length,
      winRate: wins / arr.length,
      avgDamage: sumDmg / arr.length,
      avgTurns: sumTurns / arr.length,
      avgTimeMs: sumTime / arr.length,
      maxDamage: maxDmg,
      minTurns: minTurns === Infinity ? 0 : minTurns,
      fastestClearMs: fastest === Infinity ? 0 : fastest
    };
  };

  PerformanceTracker.prototype.getStats = function (chapter) {
    if (chapter && this.byChapter[chapter]) {
      return this._statsFromArray(this.byChapter[chapter]);
    }
    return this._statsFromArray(this.battles);
  };

  PerformanceTracker.prototype.getRollingStats = function (window) {
    var n = (typeof window === 'number' && window > 0) ? window : this.windowSize;
    var slice = this.battles.slice(-n);
    return this._statsFromArray(slice);
  };

  PerformanceTracker.prototype.isStruggling = function () {
    var stats = this.getStats();
    return stats.count >= STRUGGLE_MIN_BATTLES && stats.winRate < STRUGGLE_WINRATE;
  };

  PerformanceTracker.prototype.getSignal = function () {
    // Returns difficulty adjustment signal: -1 (lower), 0 (maintain), +1 (raise)
    var stats = this.getStats();
    if (stats.count < STRUGGLE_MIN_BATTLES) return { signal: 0, reason: 'insufficient_data', stats: stats };
    if (stats.winRate < STRUGGLE_WINRATE) return { signal: -1, reason: 'low_winrate', stats: stats };
    if (stats.winRate > 0.85) return { signal: +1, reason: 'high_winrate', stats: stats };
    return { signal: 0, reason: 'optimal_range', stats: stats };
  };

  PerformanceTracker.prototype.getReport = function () {
    return {
      totalBattles: this.totalBattles,
      totalWins: this.totalWins,
      overallWinRate: this.totalBattles > 0 ? this.totalWins / this.totalBattles : 0,
      currentWindow: this._statsFromArray(this.battles),
      chapters: Object.keys(this.byChapter).map(function (c) {
        return { chapter: c, stats: this._statsFromArray(this.byChapter[c]) };
      }.bind(this)),
      struggling: this.isStruggling(),
      signal: this.getSignal()
    };
  };

  PerformanceTracker.prototype.reset = function () {
    this.battles = [];
    this.byChapter = {};
    this.totalBattles = 0;
    this.totalWins = 0;
  };

  // Expose
  if (typeof window !== 'undefined') {
    window.PerformanceTracker = PerformanceTracker;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceTracker: PerformanceTracker };
  }

})();
