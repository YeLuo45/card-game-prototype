// ============================================================================
// Adaptive Difficulty Engine — V341 Direction A Iter 3/30
// SkillEstimator: Elo-like 评级 + 段位映射 + 不确定度
// 来源：thunderbolt 反馈循环（玩家表现→技能评估）
// ============================================================================
'use strict';

(function () {

  var DEFAULT_RATING = 1200;
  var DEFAULT_K = 32;
  var MIN_RATING = 0;
  var MAX_RATING = 3000;

  // 8 tiers (bronze → challenger)
  var RANK_TIERS = [
    { min: 0,     name: 'bronze',       ordinal: 1 },
    { min: 800,   name: 'silver',       ordinal: 2 },
    { min: 1200,  name: 'gold',         ordinal: 3 },
    { min: 1600,  name: 'platinum',     ordinal: 4 },
    { min: 2000,  name: 'diamond',      ordinal: 5 },
    { min: 2300,  name: 'master',       ordinal: 6 },
    { min: 2600,  name: 'grandmaster',  ordinal: 7 },
    { min: 2800,  name: 'challenger',   ordinal: 8 }
  ];

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function SkillEstimator(options) {
    this.rating = (options && options.rating) || DEFAULT_RATING;
    this.uncertainty = (options && options.uncertainty) || 350;
    this.battlesPlayed = (options && options.battlesPlayed) || 0;
    this.history = [];
  }

  // Standard Elo expected score
  SkillEstimator.prototype._expected = function (self, opponent) {
    return 1 / (1 + Math.pow(10, (opponent - self) / 400));
  };

  SkillEstimator.prototype.updateRating = function (opponentRating, won, options) {
    var opp = (typeof opponentRating === 'number') ? opponentRating : DEFAULT_RATING;
    var wonNum = won ? 1 : 0;
    var k = (options && typeof options.k === 'number') ? options.k : DEFAULT_K;
    // K-factor decays with experience
    if (this.battlesPlayed > 30) k = Math.max(16, k * 0.75);
    var expected = this._expected(this.rating, opp);
    var delta = k * (wonNum - expected);
    this.rating = clamp(Math.round(this.rating + delta), MIN_RATING, MAX_RATING);
    this.uncertainty = Math.max(20, this.uncertainty - 5);
    this.battlesPlayed++;
    var entry = { opp: opp, won: won, delta: Math.round(delta), ratingAfter: this.rating, ts: Date.now() };
    this.history.push(entry);
    if (this.history.length > 100) this.history.shift();
    return { success: true, rating: this.rating, delta: entry.delta, uncertainty: this.uncertainty };
  };

  SkillEstimator.prototype.getRank = function () {
    var i;
    var current = RANK_TIERS[0];
    for (i = 0; i < RANK_TIERS.length; i++) {
      if (this.rating >= RANK_TIERS[i].min) {
        current = RANK_TIERS[i];
      }
    }
    return { name: current.name, ordinal: current.ordinal, rating: this.rating };
  };

  SkillEstimator.prototype.getProgress = function () {
    // Progress to next tier (0-1)
    var current = this.getRank();
    var idx = current.ordinal - 1;
    if (idx >= RANK_TIERS.length - 1) return 1.0;  // already max
    var next = RANK_TIERS[idx + 1];
    var span = next.min - current.rating;
    var total = next.min - (idx > 0 ? RANK_TIERS[idx].min : 0);
    return span > 0 ? clamp(1 - (this.rating - (idx > 0 ? RANK_TIERS[idx].min : 0)) / total, 0, 1) : 0;
  };

  SkillEstimator.prototype.getUncertainty = function () {
    return this.uncertainty;
  };

  SkillEstimator.prototype.getConfidence = function () {
    // 0-1: how confident we are in the rating (low uncertainty = high confidence)
    return clamp(1 - (this.uncertainty / 400), 0, 1);
  };

  SkillEstimator.prototype.getReport = function () {
    return {
      rating: this.rating,
      rank: this.getRank(),
      progress: this.getProgress(),
      uncertainty: this.uncertainty,
      confidence: this.getConfidence(),
      battlesPlayed: this.battlesPlayed,
      recentHistory: this.history.slice(-5)
    };
  };

  SkillEstimator.prototype.reset = function () {
    this.rating = DEFAULT_RATING;
    this.uncertainty = 350;
    this.battlesPlayed = 0;
    this.history = [];
  };

  // Expose
  if (typeof window !== 'undefined') {
    window.SkillEstimator = window.SkillEstimator || SkillEstimator;
    if (typeof window.SkillEstimator !== 'function') window.SkillEstimator = SkillEstimator;
    window.SKILL_RANK_TIERS = RANK_TIERS;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SkillEstimator: SkillEstimator, RANK_TIERS: RANK_TIERS };
  }

})();
