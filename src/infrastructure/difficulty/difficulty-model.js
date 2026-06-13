// ============================================================================
// Adaptive Difficulty Engine — V343 Direction A Iter 5/30
// DifficultyModel: 多项式拟合 (skill × style) → difficultyScore [0-100]
// 来源：thunderbolt 反馈循环（自适应评估玩家当前难度）
// ============================================================================
'use strict';

(function () {

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function DifficultyModel(options) {
    this.weights = (options && options.weights) || {
      skill: 0.40,
      aggression: 0.15,
      caution: -0.10,  // caution lowers difficulty (player prefers safety)
      economy: 0.05,
      exploration: 0.05,
      social: 0.00
    };
    this.bias = (options && options.bias) || -20;  // default bias
    this.interactionSkillAggression = 0.10;  // bonus when both high
    this.interactionSkillCaution = -0.05;    // malus for high skill + caution
    this.calibration = 0;  // runtime adjustment from AI tuner
  }

  DifficultyModel.prototype.compute = function (radar) {
    if (!radar || typeof radar !== 'object') return { score: 50, breakdown: {} };
    var s = radar.skill || 50;
    var a = radar.aggression || 50;
    var c = radar.caution || 50;
    var e = radar.economy || 50;
    var x = radar.exploration || 50;
    var so = radar.social || 50;
    var w = this.weights;
    var linear =
      s * w.skill +
      a * w.aggression +
      c * w.caution +
      e * w.economy +
      x * w.exploration +
      so * w.social +
      this.bias + this.calibration;
    var interaction = (s * a / 100) * this.interactionSkillAggression * 2
                    + (s * c / 100) * this.interactionSkillCaution * 2;
    var raw = linear + interaction;
    return {
      score: clamp(Math.round(raw), 0, 100),
      breakdown: {
        skillContribution: Math.round(s * w.skill),
        aggressionContribution: Math.round(a * w.aggression),
        cautionContribution: Math.round(c * w.caution),
        economyContribution: Math.round(e * w.economy),
        explorationContribution: Math.round(x * w.exploration),
        socialContribution: Math.round(so * w.social),
        interaction: Math.round(interaction),
        bias: this.bias,
        calibration: this.calibration
      }
    };
  };

  DifficultyModel.prototype.adjustCalibration = function (delta) {
    this.calibration = clamp(this.calibration + delta, -50, 50);
    return this.calibration;
  };

  DifficultyModel.prototype.setWeights = function (newWeights) {
    if (!newWeights || typeof newWeights !== 'object') return false;
    Object.keys(newWeights).forEach(function (k) {
      if (typeof newWeights[k] === 'number') this.weights[k] = newWeights[k];
    }.bind(this));
    return true;
  };

  DifficultyModel.prototype.getReport = function () {
    return {
      weights: this.weights,
      bias: this.bias,
      calibration: this.calibration,
      sample: this.compute({ skill: 50, aggression: 50, caution: 50, economy: 50, exploration: 50, social: 50 })
    };
  };

  if (typeof window !== 'undefined') {
    window.DifficultyModel = DifficultyModel;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DifficultyModel: DifficultyModel };
  }

})();
