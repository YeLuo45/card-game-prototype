// V368 AdaptiveDifficultyOrchestrator: FINAL - 整合 29 引擎 + mastery 指标
// 来源: generic-agent Self-Evolution + 末轮 orchestrator pattern (V309-V338 验证)
// mastery = 0.4·density + 0.3·coherence + 0.3·resonance
'use strict';
(function () {
  function AdaptiveDifficultyOrchestrator(options) {
    this.enginesOrchestrated = 0;
    this.lastSnapshot = null;
  }
  AdaptiveDifficultyOrchestrator.prototype.orchestrate = function (engines) {
    var engines = engines || {};
    var snap = {};
    var keys = Object.keys(engines).sort();
    for (var i = 0; i < keys.length; i++) {
      var e = engines[keys[i]];
      var v = (e && typeof e.master === 'number') ? e.master : 0.5;
      snap[keys[i]] = Math.round(v * 100) / 100;
    }
    var values = Object.values(snap);
    var n = values.length;
    var mean = 0;
    for (var j = 0; j < n; j++) mean += values[j];
    mean = mean / Math.max(1, n);
    var variance = 0;
    for (var k = 0; k < n; k++) variance += Math.pow(values[k] - mean, 2);
    var stdDev = Math.sqrt(variance / Math.max(1, n));
    var density = mean;
    var coherence = Math.max(0, 1 - stdDev);
    // Resonance: weighted top-5 engines
    var top = values.slice().sort(function (a, b) { return b - a; }).slice(0, 5);
    var resonance = top.length > 0 ? top.reduce(function (a, b) { return a + b; }, 0) / top.length : 0;
    var mastery = density * 0.4 + coherence * 0.3 + resonance * 0.3;
    var result = {
      snapshot: snap,
      engineCount: n,
      density: Math.round(density * 100) / 100,
      coherence: Math.round(coherence * 100) / 100,
      resonance: Math.round(resonance * 100) / 100,
      mastery: Math.round(mastery * 100) / 100,
      ts: Date.now()
    };
    this.enginesOrchestrated = Math.max(this.enginesOrchestrated, n);
    this.lastSnapshot = result;
    return result;
  };
  AdaptiveDifficultyOrchestrator.prototype.adapt = function () {
    if (!this.lastSnapshot) return { action: 'bootstrap', reason: 'no_snapshot' };
    var m = this.lastSnapshot.mastery;
    if (m < 0.3) return { action: 'bootstrap', reason: 'low_mastery', mastery: m };
    if (this.lastSnapshot.coherence < 0.4) return { action: 'balance', reason: 'low_coherence', mastery: m };
    if (this.lastSnapshot.density < 0.5) return { action: 'activate', reason: 'low_density', mastery: m };
    return { action: 'maintain', reason: 'healthy_state', mastery: m };
  };
  AdaptiveDifficultyOrchestrator.prototype.getState = function () {
    return { enginesOrchestrated: this.enginesOrchestrated, lastSnapshot: this.lastSnapshot };
  };
  if (typeof window !== 'undefined') window.AdaptiveDifficultyOrchestrator = AdaptiveDifficultyOrchestrator;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { AdaptiveDifficultyOrchestrator: AdaptiveDifficultyOrchestrator };
})();
