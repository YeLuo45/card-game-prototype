// V360 MotivationTracker: SDT 理论 3 维度 (autonomy/competence/relatedness)
'use strict';
(function () {
  function MotivationTracker(options) {
    this.scores = { autonomy: 0.5, competence: 0.5, relatedness: 0.5 };
    this.history = [];
    this.maxHistory = (options && options.maxHistory) || 30;
  }
  MotivationTracker.prototype.record = function (dimension, score) {
    if (typeof dimension !== 'string' || typeof score !== 'number') return false;
    if (!this.scores.hasOwnProperty(dimension)) return false;
    this.scores[dimension] = Math.max(0, Math.min(1, score));
    this.history.push({ dimension: dimension, score: score, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
    return true;
  };
  MotivationTracker.prototype.getMotivation = function () {
    var s = this.scores;
    return { autonomy: s.autonomy, competence: s.competence, relatedness: s.relatedness, overall: (s.autonomy + s.competence + s.relatedness) / 3 };
  };
  MotivationTracker.prototype.classify = function () {
    var m = this.getMotivation();
    if (m.overall > 0.7) return 'intrinsic';
    if (m.overall > 0.4) return 'extrinsic';
    return 'amotivated';
  };
  MotivationTracker.prototype.getDimensionTrend = function (dimension) {
    var recent = [];
    for (var i = this.history.length - 1; i >= 0; i--) if (this.history[i].dimension === dimension) recent.push(this.history[i].score);
    if (recent.length < 2) return 0;
    return recent[0] - recent[recent.length - 1];
  };
  MotivationTracker.prototype.getReport = function () {
    var self = this;
    return { scores: this.scores, motivation: this.getMotivation(), classification: this.classify(), trends: { autonomy: this.getDimensionTrend('autonomy'), competence: this.getDimensionTrend('competence'), relatedness: this.getDimensionTrend('relatedness') } };
  };
  if (typeof window !== 'undefined') window.MotivationTracker = MotivationTracker;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { MotivationTracker: MotivationTracker };
})();
