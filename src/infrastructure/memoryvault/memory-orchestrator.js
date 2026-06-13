// V338 MemoryOrchestrator: 跨引擎编排 — 整合前 29 引擎 master 指标
// 来源：generic-agent Self-Evolution + R/S/T/U 域轴编排模板
'use strict';
(function () {
  // The 29 engines to orchestrate
  var ENGINES = [
    'MemoryEncoder','MemoryStorage','MemoryRetrieval','MemoryIndex','MemorySchema',
    'MemoryType','MemoryRelation','MemorySnapshot',
    'MemoryQuery','MemoryShard','MemoryReplica','MemoryStream','MemorySync','MemoryCache','MemoryQueue',
    'MemoryLifecycle','MemoryEvent','MemoryWatcher','MemoryAudit','MemoryQuota','MemoryRetention',
    'MemoryShare','MemoryConsensus','MemoryDelegate','MemoryConflict',
    'MemoryLearn','MemoryReflect','MemoryEvolve','MemoryAdapt'
  ];
  function MemoryOrchestrator(options) {
    this.engines = {};
    this.snapshots = [];
    this.adapted = 0;
  }
  MemoryOrchestrator.prototype.register = function (name, engine) {
    if (ENGINES.indexOf(name) === -1) return { error: 'unknown_engine' };
    this.engines[name] = engine;
    return { success: true, name: name };
  };
  MemoryOrchestrator.prototype._metric = function (engine) {
    if (!engine || typeof engine.getStats !== 'function') return 0;
    var st = engine.getStats();
    // Heuristic: each engine contributes its own "vitality" measure
    if (engine instanceof window.MemoryEncoder) return (st.byMode && Object.keys(st.byMode).length) || 0;
    if (engine instanceof window.MemoryStorage) return (st.writes + st.reads) || 0;
    if (engine instanceof window.MemoryIndex) return st.terms || 0;
    if (engine instanceof window.MemorySchema) return (st.validations - st.failures) || 0;
    if (engine instanceof window.MemorySnapshot) return st.count || 0;
    if (engine instanceof window.MemoryCache) return st.hits || 0;
    if (engine instanceof window.MemorySync) return st.localVersion || 0;
    if (engine instanceof window.MemoryAudit) return st.total || 0;
    if (engine instanceof window.MemoryEvent) return st.eventCount || 0;
    if (engine instanceof window.MemoryLearn) return st.accessLogSize || 0;
    return Object.keys(st).length; // fallback: number of stat fields
  };
  MemoryOrchestrator.prototype.snapshot = function () {
    var snap = { at: Date.now(), values: {}, engines: Object.keys(this.engines).length };
    for (var name in this.engines) snap.values[name] = this._metric(this.engines[name]);
    this.snapshots.push(snap);
    if (this.snapshots.length > 100) this.snapshots.shift();
    return snap;
  };
  MemoryOrchestrator.prototype.mastery = function () {
    var snap = this.snapshot();
    var vals = Object.values(snap.values);
    if (vals.length === 0) return { mastery: 0, density: 0, coherence: 0, resonance: 0 };
    var sum = 0;
    var max = 0;
    for (var i = 0; i < vals.length; i++) {
      sum += vals[i];
      if (vals[i] > max) max = vals[i];
    }
    var mean = sum / vals.length;
    // Coherence: 1 - normalized stddev
    var sqDiff = 0;
    for (var j = 0; j < vals.length; j++) sqDiff += (vals[j] - mean) * (vals[j] - mean);
    var stdDev = Math.sqrt(sqDiff / vals.length);
    var coherence = max > 0 ? 1 - (stdDev / (max + 1)) : 0;
    // Density: fraction of engines with non-zero contribution
    var nonZero = 0;
    for (var k = 0; k < vals.length; k++) if (vals[k] > 0) nonZero++;
    var density = nonZero / vals.length;
    // Resonance: average vitality
    var resonance = mean / (max + 1);
    // Mastery: weighted blend
    var mastery = density * 0.4 + coherence * 0.3 + resonance * 0.3;
    return {
      mastery: mastery,
      density: density,
      coherence: coherence,
      resonance: resonance,
      engineCount: vals.length,
      topEngine: this._topEngine(snap.values)
    };
  };
  MemoryOrchestrator.prototype._topEngine = function (values) {
    var top = null, topVal = -1;
    for (var k in values) if (values[k] > topVal) { topVal = values[k]; top = k; }
    return top;
  };
  MemoryOrchestrator.prototype.adapt = function (signal) {
    this.adapted++;
    var m = this.mastery();
    var action;
    if (m.mastery < 0.3) action = 'bootstrap'; // engines barely used → load more
    else if (m.coherence < 0.4) action = 'balance'; // unbalanced → equalize
    else if (m.density < 0.5) action = 'activate'; // some engines inactive → wake them
    else action = 'maintain';
    return { signal: signal, action: action, mastery: m };
  };
  MemoryOrchestrator.prototype.getStats = function () {
    return {
      registeredEngines: Object.keys(this.engines).length,
      snapshotCount: this.snapshots.length,
      adaptations: this.adapted
    };
  };
  window.MemoryOrchestrator = MemoryOrchestrator;
  window.MEMORYVAULT_ENGINES = ENGINES;
})();
