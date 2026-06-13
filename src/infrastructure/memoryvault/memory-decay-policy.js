// ============================================================================
// Distributed Memory Vault — V304 Direction F Iteration 5/30
// MemoryDecayPolicy: 艾宾浩斯遗忘曲线 + 分层差异化衰减
// 来源：generic-agent Self-Evolution (L0-L4) + thunderbolt PowerSync (优先级反馈)
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // DECAY_CURVE — supported curve shapes
  // --------------------------------------------------------------------------
  var DECAY_CURVE = {
    EBBINGHAUS: 'ebbinghaus',     // R(t) = e^(-t/S)  (经典艾宾浩斯)
    LINEAR: 'linear',             // R(t) = max(0, 1 - t/T)
    EXPONENTIAL: 'exponential',   // R(t) = e^(-k*t)
    STEP: 'step',                 // R(t) = piecewise constant
    POWER: 'power'                // R(t) = 1 / (1 + (t/T)^k)
  };

  // --------------------------------------------------------------------------
  // LAYER_DECAY_CONFIG — per-layer default half-life (ms)
  // --------------------------------------------------------------------------
  var LAYER_DECAY_CONFIG = {
    'L0': { halfLife: Number.POSITIVE_INFINITY, importanceFloor: 0.0, curve: null }, // 规则层：永不衰减 (curve 由 policy 控制)
    'L1': { halfLife: 365 * 24 * 60 * 60 * 1000, importanceFloor: 0.1, curve: null }, // 索引：1 年
    'L2': { halfLife: 90 * 24 * 60 * 60 * 1000, importanceFloor: 0.1, curve: null },  // 全局：3 月
    'L3': { halfLife: 30 * 24 * 60 * 60 * 1000, importanceFloor: 0.05, curve: null }, // 技能：1 月
    'L4': { halfLife: 7 * 24 * 60 * 60 * 1000, importanceFloor: 0.02, curve: null }   // 会话：1 周
  };

  // --------------------------------------------------------------------------
  // MemoryDecayPolicy — applies curve-based retention score
  // --------------------------------------------------------------------------
  function MemoryDecayPolicy(options) {
    this.curve = (options && options.curve) || DECAY_CURVE.EBBINGHAUS;
    this.layerConfig = (options && options.layerConfig) || JSON.parse(JSON.stringify(LAYER_DECAY_CONFIG));
    this.now = (options && options.now) || function () { return Date.now(); };
    this.retentionFloor = (options && options.retentionFloor) != null ? options.retentionFloor : 0.01;
    this.policies = []; // applied history
  }

  MemoryDecayPolicy.prototype._configFor = function (layer) {
    return this.layerConfig[layer] || this.layerConfig['L4'];
  };

  // Compute retention at given age (ms) for an entry with importance [0,1]
  MemoryDecayPolicy.prototype.retentionAt = function (entry, now) {
    if (!entry) return 0;
    var t = (now != null ? now : this.now()) - (entry.createdAt || 0);
    if (t < 0) t = 0;
    var cfg = this._configFor(entry.layer);
    var halfLife = cfg.halfLife;
    // curve priority: cfg override (if non-null) > policy.curve
    var curve = (cfg.curve != null) ? cfg.curve : this.curve;
    var r;
    switch (curve) {
      case DECAY_CURVE.LINEAR:
        r = Math.max(0, 1 - t / (halfLife || 1));
        break;
      case DECAY_CURVE.EXPONENTIAL:
        r = Math.exp(-t * Math.LN2 / (halfLife || 1));
        break;
      case DECAY_CURVE.POWER:
        r = 1 / (1 + Math.pow(t / (halfLife || 1), 2));
        break;
      case DECAY_CURVE.STEP:
        // 0-0.25T full, 0.25-0.5 0.6, 0.5-0.75 0.3, 0.75+ 0.1
        var f = t / (halfLife || 1);
        if (f < 0.25) r = 1.0;
        else if (f < 0.5) r = 0.6;
        else if (f < 0.75) r = 0.3;
        else r = 0.1;
        break;
      case DECAY_CURVE.EBBINGHAUS:
      default:
        r = Math.exp(-t * Math.LN2 / (halfLife || 1));
        break;
    }
    // L0 (or infinite half-life) is immune to decay — always full retention
    if (!isFinite(halfLife) || entry.layer === 'L0') {
      return 1.0;
    }
    // importance weighting: imp=0.5 is neutral, imp=1.0 boosts 1.5x, imp=0.0 drops 0.5x
    var imp = entry.importance != null ? entry.importance : 0.5;
    var impMul = 0.5 + imp; // range 0.5 - 1.5
    r = r * impMul;
    if (r > 1.0) r = 1.0;
    // floor
    if (r < cfg.importanceFloor) r = cfg.importanceFloor;
    if (r < this.retentionFloor) r = this.retentionFloor;
    return r;
  };

  // Apply decay to a single entry: update decayFactor
  MemoryDecayPolicy.prototype.applyTo = function (entry, now) {
    if (!entry) return false;
    var r = this.retentionAt(entry, now);
    entry.decayFactor = r;
    return r;
  };

  // Apply decay to all entries in a store (uses listByLayer for all known layers)
  MemoryDecayPolicy.prototype.applyToStore = function (store, now) {
    if (!store || typeof store.listByLayer !== 'function') return { applied: 0, removed: 0 };
    var layers = Object.keys(this.layerConfig);
    var all = [];
    var seen = {};
    for (var i = 0; i < layers.length; i++) {
      var arr = store.listByLayer(layers[i]) || [];
      for (var j = 0; j < arr.length; j++) {
        if (!seen[arr[j].id]) { seen[arr[j].id] = true; all.push(arr[j]); }
      }
    }
    var removed = 0;
    for (var k = 0; k < all.length; k++) {
      var r = this.applyTo(all[k], now);
      if (r <= this.retentionFloor * 1.01) {
        if (typeof store.remove === 'function') {
          store.remove(all[k].id);
          removed++;
        }
      }
    }
    var record = { at: this.now(), applied: all.length, removed: removed };
    this.policies.push(record);
    return record;
  };

  // Determine which entries should be forgotten (retention below floor)
  MemoryDecayPolicy.prototype.shouldForget = function (entry, now) {
    var cfg = this._configFor(entry.layer);
    var threshold = Math.max(this.retentionFloor, cfg.importanceFloor) * 1.01;
    return this.retentionAt(entry, now) <= threshold;
  };

  // Add or override layer config
  MemoryDecayPolicy.prototype.setLayerConfig = function (layer, cfg) {
    this.layerConfig[layer] = cfg;
    return this;
  };

  // Get layer config (or whole map)
  MemoryDecayPolicy.prototype.getLayerConfig = function (layer) {
    return layer ? this.layerConfig[layer] : this.layerConfig;
  };

  MemoryDecayPolicy.prototype.getPolicyHistory = function () { return this.policies.slice(); };
  MemoryDecayPolicy.prototype.getStats = function () {
    return {
      curve: this.curve,
      retentionFloor: this.retentionFloor,
      layerCount: Object.keys(this.layerConfig).length,
      appliedCount: this.policies.length
    };
  };

  // Exports
  window.MemoryDecayPolicy = MemoryDecayPolicy;
  window.DECAY_CURVE = DECAY_CURVE;
  window.LAYER_DECAY_CONFIG = LAYER_DECAY_CONFIG;

})();
