// V361 RetentionPredictor: 7/30 天 churn 模型 + 风险评分 + 干预触发
'use strict';
(function () {
  function RetentionPredictor(options) {
    this.weights = (options && options.weights) || { daysActive: 0.30, sessionsPerDay: 0.25, winRate: 0.20, progression: 0.25 };
    this.features = null;
  }
  RetentionPredictor.prototype.update = function (features) {
    if (!features || typeof features !== 'object') return false;
    this.features = {
      daysActive: typeof features.daysActive === 'number' ? Math.max(0, Math.min(1, features.daysActive / 7)) : 0,
      sessionsPerDay: typeof features.sessionsPerDay === 'number' ? Math.max(0, Math.min(1, features.sessionsPerDay / 5)) : 0,
      winRate: typeof features.winRate === 'number' ? Math.max(0, Math.min(1, features.winRate)) : 0,
      progression: typeof features.progression === 'number' ? Math.max(0, Math.min(1, features.progression)) : 0
    };
    return true;
  };
  RetentionPredictor.prototype._engagementScore = function () {
    if (!this.features) return 0;
    var f = this.features, w = this.weights;
    return f.daysActive * w.daysActive + f.sessionsPerDay * w.sessionsPerDay + f.winRate * w.winRate + f.progression * w.progression;
  };
  RetentionPredictor.prototype.predictChurn = function (days) {
    var e = this._engagementScore();
    var baseRetention = Math.pow(e, 0.5);
    if (days === 7) return Math.round((1 - baseRetention * 0.8) * 100) / 100;
    if (days === 30) return Math.round((1 - baseRetention * 0.5) * 100) / 100;
    return Math.round((1 - baseRetention) * 100) / 100;
  };
  RetentionPredictor.prototype.getRiskLevel = function () {
    var churn7 = this.predictChurn(7);
    if (churn7 < 0.3) return 'low';
    if (churn7 < 0.7) return 'medium';
    return 'high';
  };
  RetentionPredictor.prototype.getReport = function () {
    return { features: this.features, engagementScore: this._engagementScore(), churn7: this.predictChurn(7), churn30: this.predictChurn(30), risk: this.getRiskLevel() };
  };
  if (typeof window !== 'undefined') window.RetentionPredictor = RetentionPredictor;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { RetentionPredictor: RetentionPredictor };
})();
