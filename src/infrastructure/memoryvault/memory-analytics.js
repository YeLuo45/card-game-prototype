// ============================================================================
// Distributed Memory Vault — V308 Direction F Iteration 9/30
// MemoryAnalytics: 记忆使用分析（频次/热度/访问模式/可观测性）
// 来源：thunderbolt PowerSync (实时反馈循环) + ruflo 层次管理
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // ANALYTICS_DIMENSION — supported aggregation dimensions
  // --------------------------------------------------------------------------
  var ANALYTICS_DIMENSION = {
    LAYER: 'layer',     // 按 L0-L4 分组
    TYPE: 'type',       // 按 memory type 分组
    SESSION: 'session', // 按 sessionId 分组
    HOUR: 'hour',       // 按小时分桶
    DAY: 'day'          // 按天分桶
  };

  // --------------------------------------------------------------------------
  // MemoryAnalytics — observe and aggregate memory store usage
  // --------------------------------------------------------------------------
  function MemoryAnalytics(options) {
    this.store = (options && options.store) || null;
    this.recall = (options && options.recall) || null;  // optional CrossSessionRecall
    this.accessLog = [];        // timestamped events: {ts, action, id, type, layer}
    this.maxLogSize = (options && options.maxLogSize) || 1000;
    this.heatCache = {};        // id -> heat score
    this.aggregations = [];     // history of computed reports
  }

  // Record an access event
  MemoryAnalytics.prototype.record = function (action, entry) {
    if (!entry) return;
    this.accessLog.push({
      ts: Date.now(),
      action: action,
      id: entry.id,
      type: entry.type,
      layer: entry.layer
    });
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog = this.accessLog.slice(-this.maxLogSize);
    }
    if (action === 'read' || action === 'recall') {
      this.heatCache[entry.id] = (this.heatCache[entry.id] || 0) + 1;
    }
  };

  // Get heat score (access count) for an entry
  MemoryAnalytics.prototype.heat = function (entryId) {
    return this.heatCache[entryId] || 0;
  };

  // Top N hottest entries
  MemoryAnalytics.prototype.topHot = function (n) {
    var entries = [];
    for (var k in this.heatCache) {
      if (Object.prototype.hasOwnProperty.call(this.heatCache, k)) {
        entries.push({ id: k, heat: this.heatCache[k] });
      }
    }
    entries.sort(function (a, b) { return b.heat - a.heat; });
    return entries.slice(0, n || 10);
  };

  // Cold entries (heat=0)
  MemoryAnalytics.prototype.cold = function (n) {
    if (!this.store || typeof store.listByLayer !== 'function') return [];
    var all = [];
    var layers = ['L0', 'L1', 'L2', 'L3', 'L4'];
    for (var i = 0; i < layers.length; i++) {
      var arr = this.store.listByLayer(layers[i]);
      for (var j = 0; j < arr.length; j++) all.push(arr[j]);
    }
    var cold = [];
    for (var k = 0; k < all.length; k++) {
      if (!this.heatCache[all[k].id]) cold.push(all[k]);
    }
    return cold.slice(0, n || 10);
  };

  // Group access log by dimension
  MemoryAnalytics.prototype.groupBy = function (dimension) {
    var groups = {};
    for (var i = 0; i < this.accessLog.length; i++) {
      var ev = this.accessLog[i];
      var key;
      switch (dimension) {
        case ANALYTICS_DIMENSION.LAYER:
          key = ev.layer || 'unknown';
          break;
        case ANALYTICS_DIMENSION.TYPE:
          key = ev.type || 'unknown';
          break;
        case ANALYTICS_DIMENSION.SESSION:
          key = (ev.id && this._sessionOf(ev.id)) || 'unknown';
          break;
        case ANALYTICS_DIMENSION.HOUR:
          var d = new Date(ev.ts);
          key = d.getHours();
          break;
        case ANALYTICS_DIMENSION.DAY:
          var d2 = new Date(ev.ts);
          key = d2.toISOString().substring(0, 10);
          break;
        default:
          key = 'all';
      }
      if (!groups[key]) groups[key] = 0;
      groups[key]++;
    }
    return groups;
  };

  MemoryAnalytics.prototype._sessionOf = function (id) {
    if (!this.store || typeof this.store.peek !== 'function') return null;
    var entry = this.store.peek(id);
    if (entry && entry.metadata) return entry.metadata.sessionId;
    return null;
  };

  // Most accessed layer
  MemoryAnalytics.prototype.hotLayer = function () {
    var groups = this.groupBy(ANALYTICS_DIMENSION.LAYER);
    var maxCount = 0, maxLayer = null;
    for (var k in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, k)) {
        if (groups[k] > maxCount) {
          maxCount = groups[k];
          maxLayer = k;
        }
      }
    }
    return { layer: maxLayer, count: maxCount };
  };

  // Most accessed type
  MemoryAnalytics.prototype.hotType = function () {
    var groups = this.groupBy(ANALYTICS_DIMENSION.TYPE);
    var maxCount = 0, maxType = null;
    for (var k in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, k)) {
        if (groups[k] > maxCount) {
          maxCount = groups[k];
          maxType = k;
        }
      }
    }
    return { type: maxType, count: maxCount };
  };

  // Peak activity hour
  MemoryAnalytics.prototype.peakHour = function () {
    var groups = this.groupBy(ANALYTICS_DIMENSION.HOUR);
    var maxCount = 0, maxHour = -1;
    for (var h = 0; h < 24; h++) {
      if ((groups[h] || 0) > maxCount) {
        maxCount = groups[h];
        maxHour = h;
      }
    }
    return { hour: maxHour, count: maxCount };
  };

  // Recall hit rate (if recall is wired)
  MemoryAnalytics.prototype.recallHitRate = function () {
    if (!this.recall) return null;
    var log = this.accessLog.filter(function (e) { return e.action === 'recall' || e.action === 'miss'; });
    if (log.length === 0) return null;
    var hits = log.filter(function (e) { return e.action === 'recall'; }).length;
    return hits / log.length;
  };

  // Get store health snapshot
  MemoryAnalytics.prototype.healthSnapshot = function () {
    if (!this.store) return { error: 'no_store' };
    var total = 0, byLayer = {};
    var layers = ['L0', 'L1', 'L2', 'L3', 'L4'];
    for (var i = 0; i < layers.length; i++) {
      var arr = this.store.listByLayer(layers[i]);
      byLayer[layers[i]] = arr.length;
      total += arr.length;
    }
    return {
      totalEntries: total,
      byLayer: byLayer,
      accessEvents: this.accessLog.length,
      uniqueAccessed: Object.keys(this.heatCache).length,
      hotRatio: total > 0 ? Object.keys(this.heatCache).length / total : 0
    };
  };

  // Generate full report
  MemoryAnalytics.prototype.generateReport = function () {
    var report = {
      at: Date.now(),
      health: this.healthSnapshot(),
      byLayer: this.groupBy(ANALYTICS_DIMENSION.LAYER),
      byType: this.groupBy(ANALYTICS_DIMENSION.TYPE),
      byHour: this.groupBy(ANALYTICS_DIMENSION.HOUR),
      topHot: this.topHot(5),
      hotLayer: this.hotLayer(),
      hotType: this.hotType(),
      peakHour: this.peakHour()
    };
    if (this.recall) report.recallHitRate = this.recallHitRate();
    this.aggregations.push(report);
    if (this.aggregations.length > 50) this.aggregations = this.aggregations.slice(-50);
    return report;
  };

  MemoryAnalytics.prototype.getStats = function () {
    return {
      accessLogSize: this.accessLog.length,
      uniqueAccessed: Object.keys(this.heatCache).length,
      reports: this.aggregations.length
    };
  };

  // Clear logs
  MemoryAnalytics.prototype.reset = function () {
    this.accessLog = [];
    this.heatCache = {};
    return this;
  };

  // Exports
  window.MemoryAnalytics = MemoryAnalytics;
  window.ANALYTICS_DIMENSION = ANALYTICS_DIMENSION;

})();
