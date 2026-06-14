// ============================================================================
// Adaptive Difficulty Engine — V351 Direction A Iter 13/30
// EncounterTuner: 房间生成权重动态调 + 精英/Boss 出现频率
// 来源：nanobot 分布式 mesh（遭遇权重自适应）
// ============================================================================
'use strict';

(function () {

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  var DEFAULT_WEIGHTS = {
    battle: 0.55,
    elite: 0.10,
    rest: 0.15,
    shop: 0.08,
    event: 0.10,
    treasure: 0.02
  };

  function EncounterTuner(options) {
    this.weights = Object.assign({}, DEFAULT_WEIGHTS, options && options.weights);
    this.smoothing = (options && options.smoothing) || 0.15;
    this.playerSkill = 50;
    this.lastEncounters = [];
    this.weightHistory = [];
  }

  EncounterTuner.prototype.setPlayerSkill = function (skill) {
    if (typeof skill !== 'number') return false;
    this.playerSkill = clamp(skill, 0, 100);
    return true;
  };

  EncounterTuner.prototype._adaptWeights = function () {
    // Higher skill → more elite/battle; lower skill → more rest/event
    var skillFactor = (this.playerSkill - 50) / 100;  // -0.5..0.5
    var adapted = Object.assign({}, this.weights);
    adapted.elite = clamp(adapted.elite + skillFactor * 0.05, 0.05, 0.30);
    adapted.battle = clamp(adapted.battle + skillFactor * 0.03, 0.30, 0.70);
    adapted.rest = clamp(adapted.rest - skillFactor * 0.04, 0.05, 0.25);
    // Normalize to sum=1
    var sum = Object.values(adapted).reduce(function (a, b) { return a + b; }, 0);
    var keys = Object.keys(adapted);
    for (var i = 0; i < keys.length; i++) {
      adapted[keys[i]] = Math.round((adapted[keys[i]] / sum) * 1000) / 1000;
    }
    return adapted;
  };

  EncounterTuner.prototype.rollEncounter = function (count) {
    var weights = this._adaptWeights();
    var entries = Object.entries(weights);
    var roll = (seed) => ((seed * 9301 + 49297) % 233280) / 233280;
    var n = (typeof count === 'number' && count > 0) ? count : 1;
    var results = [];
    for (var i = 0; i < n; i++) {
      var seed = (this.lastEncounters.length + i + 1) * 7919 + Math.floor(Math.random() * 1000);
      var r = roll(seed);
      var cum = 0;
      var chosen = entries[0][0];
      for (var e = 0; e < entries.length; e++) {
        cum += entries[e][1];
        if (r <= cum) { chosen = entries[e][0]; break; }
      }
      results.push(chosen);
      this.lastEncounters.push({ type: chosen, ts: Date.now() });
    }
    if (this.lastEncounters.length > 50) this.lastEncounters.shift();
    this.weightHistory.push({ weights: weights, ts: Date.now() });
    if (this.weightHistory.length > 20) this.weightHistory.shift();
    return results.length === 1 ? results[0] : results;
  };

  EncounterTuner.prototype.getEncounterStats = function () {
    var stats = {};
    Object.keys(DEFAULT_WEIGHTS).forEach(function (k) { stats[k] = 0; });
    this.lastEncounters.forEach(function (e) {
      stats[e.type] = (stats[e.type] || 0) + 1;
    });
    return stats;
  };

  EncounterTuner.prototype.getCurrentWeights = function () {
    return this._adaptWeights();
  };

  EncounterTuner.prototype.getReport = function () {
    return {
      baseWeights: this.weights,
      adaptedWeights: this.getCurrentWeights(),
      playerSkill: this.playerSkill,
      encounterStats: this.getEncounterStats(),
      recentEncounters: this.lastEncounters.slice(-10),
      weightHistory: this.weightHistory.length
    };
  };

  EncounterTuner.prototype.reset = function () {
    this.weights = Object.assign({}, DEFAULT_WEIGHTS);
    this.lastEncounters = [];
    this.weightHistory = [];
  };

  if (typeof window !== 'undefined') {
    window.EncounterTuner = EncounterTuner;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EncounterTuner: EncounterTuner };
  }

})();
