// V354 FrustrationHandler: 3 连败自动降难度 20% + 道具补偿 + 引导
'use strict';
(function () {
  function FrustrationHandler(options) {
    this.consecutiveLosses = 0;
    this.consecutiveQuits = 0;
    this.thresholdLosses = (options && options.thresholdLosses) || 3;
    this.thresholdQuits = (options && options.thresholdQuits) || 2;
    this.difficultyReduction = (options && options.difficultyReduction) || 0.20;
    this.compensationTier = 0;
    this.history = [];
  }
  FrustrationHandler.prototype.recordLoss = function (metadata) {
    this.consecutiveLosses++;
    this.consecutiveQuits = 0;
    var entry = { type: 'loss', count: this.consecutiveLosses, ts: Date.now(), meta: metadata || {} };
    this.history.push(entry);
    return entry;
  };
  FrustrationHandler.prototype.recordWin = function () {
    this.consecutiveLosses = 0;
    this.consecutiveQuits = 0;
    this.compensationTier = 0;
    this.history.push({ type: 'win', reset: true, ts: Date.now() });
  };
  FrustrationHandler.prototype.recordQuit = function () {
    this.consecutiveQuits++;
    this.history.push({ type: 'quit', count: this.consecutiveQuits, ts: Date.now() });
    return { shouldIntervene: this.consecutiveQuits >= this.thresholdQuits };
  };
  FrustrationHandler.prototype.shouldIntervene = function () {
    return {
      fromLosses: this.consecutiveLosses >= this.thresholdLosses,
      fromQuits: this.consecutiveQuits >= this.thresholdQuits,
      interventionLevel: Math.max(
        this.consecutiveLosses >= this.thresholdLosses ? Math.floor(this.consecutiveLosses / this.thresholdLosses) : 0,
        this.consecutiveQuits >= this.thresholdQuits ? Math.floor(this.consecutiveQuits / this.thresholdQuits) : 0
      )
    };
  };
  FrustrationHandler.prototype.applyIntervention = function () {
    var level = this.shouldIntervene().interventionLevel;
    if (level === 0) return { applied: false, reason: 'no_intervention_needed' };
    var reduction = Math.min(0.5, this.difficultyReduction * level);
    this.compensationTier = level;
    return { applied: true, level: level, difficultyReduction: reduction, compensation: this._compensationFor(level) };
  };
  FrustrationHandler.prototype._compensationFor = function (level) {
    return { goldBonus: level * 20, freePotion: level >= 1, hintCards: level >= 2, skipNext: level >= 3 };
  };
  FrustrationHandler.prototype.getReport = function () {
    return { consecutiveLosses: this.consecutiveLosses, consecutiveQuits: this.consecutiveQuits, compensationTier: this.compensationTier, intervention: this.shouldIntervene(), historyLen: this.history.length };
  };
  FrustrationHandler.prototype.reset = function () {
    this.consecutiveLosses = 0; this.consecutiveQuits = 0; this.compensationTier = 0; this.history = [];
  };
  if (typeof window !== 'undefined') window.FrustrationHandler = FrustrationHandler;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { FrustrationHandler: FrustrationHandler };
})();
