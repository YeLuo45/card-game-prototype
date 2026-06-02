// ============================================================================
// Federated Strategy Cloud — V263 Direction A Iteration 9/9
// CloudDashboard: 云端数据可视化 + 趋势分析 + 热力图
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var CHART_TYPES = {
    LINE: 'line',
    BAR: 'bar',
    PIE: 'pie',
    HEATMAP: 'heatmap',
    SCATTER: 'scatter'
  };

  var TIME_BUCKETS = {
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000
  };

  function CloudDashboard(syncManager, options) {
    options = options || {};
    this.sync = syncManager || null;
    this.storageKey = options.storageKey || 'dashboard_data';
    this.refreshInterval = options.refreshInterval || 60000;
    this.maxDataPoints = options.maxDataPoints || 1000;
    this.deviceId = options.deviceId || ((syncManager && syncManager.deviceId) || 'unknown');
    this.widgets = {};
    this.snapshots = [];
    this.alerts = [];
    this.trends = {};
    this._lastRefresh = null;
  }

  CloudDashboard.prototype.registerWidget = function (widgetId, config) {
    if (typeof widgetId !== 'string') return { error: 'invalid_widget_id' };
    if (!config || typeof config !== 'object') return { error: 'invalid_config' };
    this.widgets[widgetId] = {
      id: widgetId,
      type: config.type || 'bar',
      title: config.title || widgetId,
      dataSource: config.dataSource || null,
      config: config.config || {},
      lastUpdate: Date.now()
    };
    return { success: true, widgetId: widgetId };
  };

  CloudDashboard.prototype.unregisterWidget = function (widgetId) {
    if (!this.widgets[widgetId]) return { error: 'not_found' };
    delete this.widgets[widgetId];
    return { success: true };
  };

  CloudDashboard.prototype.getWidget = function (widgetId) {
    return this.widgets[widgetId] || null;
  };

  CloudDashboard.prototype.listWidgets = function () {
    var arr = [];
    for (var k in this.widgets) {
      if (Object.prototype.hasOwnProperty.call(this.widgets, k)) {
        arr.push(this.widgets[k]);
      }
    }
    return arr;
  };

  CloudDashboard.prototype.updateWidgetData = function (widgetId, data) {
    if (!this.widgets[widgetId]) return { error: 'not_found' };
    if (!Array.isArray(data)) return { error: 'data_must_be_array' };
    this.widgets[widgetId].data = data;
    this.widgets[widgetId].lastUpdate = Date.now();
    if (data.length > this.maxDataPoints) {
      this.widgets[widgetId].data = data.slice(-this.maxDataPoints);
    }
    return { success: true, count: this.widgets[widgetId].data.length };
  };

  // -------- Trend Analysis --------
  CloudDashboard.prototype.computeTrend = function (values, window) {
    if (typeof window !== 'number' || window <= 0) window = 7;
    if (!Array.isArray(values) || values.length < 2) {
      return { direction: 'unknown', change: 0, slope: 0, window: window };
    }
    var recent = values.slice(-window);
    var sum = 0;
    for (var i = 0; i < recent.length; i++) sum += recent[i];
    var avg = sum / recent.length;
    var first = recent[0];
    var last = recent[recent.length - 1];
    var change = last - first;
    var slope = recent.length > 1 ? (last - first) / (recent.length - 1) : 0;
    var direction = change > 0 ? 'up' : (change < 0 ? 'down' : 'flat');
    return { direction: direction, change: change, slope: slope, average: avg, window: window };
  };

  CloudDashboard.prototype.computeMovingAverage = function (values, period) {
    if (typeof period !== 'number' || period <= 0) period = 7;
    if (!Array.isArray(values) || values.length === 0) return [];
    var result = [];
    for (var i = 0; i < values.length; i++) {
      var start = Math.max(0, i - period + 1);
      var sum = 0;
      var count = 0;
      for (var j = start; j <= i; j++) {
        sum += values[j];
        count++;
      }
      result.push(sum / count);
    }
    return result;
  };

  CloudDashboard.prototype.bucketByTime = function (dataPoints, bucketSize) {
    if (typeof bucketSize !== 'number' || bucketSize <= 0) bucketSize = TIME_BUCKETS.DAY;
    if (!Array.isArray(dataPoints)) return [];
    var buckets = {};
    for (var i = 0; i < dataPoints.length; i++) {
      var dp = dataPoints[i];
      if (!dp || typeof dp.ts !== 'number' || typeof dp.value !== 'number') continue;
      var bucketTs = Math.floor(dp.ts / bucketSize) * bucketSize;
      if (!buckets[bucketTs]) buckets[bucketTs] = { ts: bucketTs, count: 0, sum: 0, min: Infinity, max: -Infinity };
      buckets[bucketTs].count++;
      buckets[bucketTs].sum += dp.value;
      if (dp.value < buckets[bucketTs].min) buckets[bucketTs].min = dp.value;
      if (dp.value > buckets[bucketTs].max) buckets[bucketTs].max = dp.value;
    }
    var arr = [];
    for (var k in buckets) {
      if (Object.prototype.hasOwnProperty.call(buckets, k)) {
        var b = buckets[k];
        arr.push({ ts: b.ts, count: b.count, sum: b.sum, avg: b.sum / b.count, min: b.min, max: b.max });
      }
    }
    arr.sort(function (a, b) { return a.ts - b.ts; });
    return arr;
  };

  CloudDashboard.prototype.computeHeatmap = function (matrix, options) {
    options = options || {};
    if (!Array.isArray(matrix) || matrix.length === 0) return [];
    var max = -Infinity, min = Infinity;
    for (var i = 0; i < matrix.length; i++) {
      for (var j = 0; j < matrix[i].length; j++) {
        var v = matrix[i][j];
        if (typeof v === 'number') {
          if (v > max) max = v;
          if (v < min) min = v;
        }
      }
    }
    if (max === min) max = min + 1;
    var result = [];
    for (var i2 = 0; i2 < matrix.length; i2++) {
      var row = [];
      for (var j2 = 0; j2 < matrix[i2].length; j2++) {
        var v2 = matrix[i2][j2];
        var intensity = typeof v2 === 'number' ? (v2 - min) / (max - min) : 0;
        row.push({ value: v2, intensity: intensity, heat: Math.floor(intensity * 100) });
      }
      result.push(row);
    }
    return { matrix: result, min: min, max: max, range: [min, max] };
  };

  // -------- Data Source Aggregation --------
  CloudDashboard.prototype.aggregateFromSources = function (sources) {
    if (!Array.isArray(sources)) return { error: 'invalid_sources' };
    var aggregated = { count: 0, totalValue: 0, bySource: {} };
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];
      if (!src || !src.name) continue;
      var data = Array.isArray(src.data) ? src.data : [];
      var srcSum = 0;
      for (var k = 0; k < data.length; k++) {
        if (typeof data[k] === 'number') srcSum += data[k];
      }
      aggregated.bySource[src.name] = { count: data.length, sum: srcSum };
      aggregated.count += data.length;
      aggregated.totalValue += srcSum;
    }
    return aggregated;
  };

  // -------- Alerts --------
  CloudDashboard.prototype.addAlert = function (alert) {
    if (!alert || typeof alert !== 'object') return { error: 'invalid_alert' };
    var entry = {
      id: 'a_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      level: alert.level || 'info',
      message: alert.message || '',
      ts: alert.ts || Date.now(),
      source: alert.source || 'unknown',
      acknowledged: false
    };
    this.alerts.push(entry);
    if (this.alerts.length > 100) this.alerts = this.alerts.slice(-100);
    return { success: true, alertId: entry.id };
  };

  CloudDashboard.prototype.acknowledgeAlert = function (alertId) {
    for (var i = 0; i < this.alerts.length; i++) {
      if (this.alerts[i].id === alertId) {
        this.alerts[i].acknowledged = true;
        return { success: true };
      }
    }
    return { error: 'not_found' };
  };

  CloudDashboard.prototype.getAlerts = function (includeAcknowledged) {
    if (includeAcknowledged) return this.alerts.slice();
    return this.alerts.filter(function (a) { return !a.acknowledged; });
  };

  // -------- Snapshots --------
  CloudDashboard.prototype.takeSnapshot = function (name, data) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    var snap = {
      name: name,
      ts: Date.now(),
      data: data || {},
      deviceId: this.deviceId
    };
    this.snapshots.push(snap);
    if (this.snapshots.length > 50) this.snapshots = this.snapshots.slice(-50);
    this._lastRefresh = snap.ts;
    return { success: true, name: name, ts: snap.ts };
  };

  CloudDashboard.prototype.getSnapshots = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.snapshots.slice(-limit);
    }
    return this.snapshots.slice();
  };

  CloudDashboard.prototype.compareSnapshots = function (name1, name2) {
    var s1 = null, s2 = null;
    for (var i = 0; i < this.snapshots.length; i++) {
      if (this.snapshots[i].name === name1) s1 = this.snapshots[i];
      if (this.snapshots[i].name === name2) s2 = this.snapshots[i];
    }
    if (!s1 || !s2) return { error: 'snapshot_not_found' };
    return { snapshot1: s1, snapshot2: s2, timeDelta: s2.ts - s1.ts };
  };

  // -------- Refresh --------
  CloudDashboard.prototype.refresh = function (dataSources) {
    this._lastRefresh = Date.now();
    if (dataSources && typeof dataSources === 'object') {
      for (var widgetId in dataSources) {
        if (Object.prototype.hasOwnProperty.call(dataSources, widgetId) && this.widgets[widgetId]) {
          this.updateWidgetData(widgetId, dataSources[widgetId]);
        }
      }
    }
    this.takeSnapshot('auto_refresh', { widgets: Object.keys(this.widgets).length });
    return { success: true, ts: this._lastRefresh, widgetsRefreshed: Object.keys(this.widgets).length };
  };

  CloudDashboard.prototype.getLastRefresh = function () {
    return this._lastRefresh;
  };

  // -------- Trends persistence --------
  CloudDashboard.prototype.setTrend = function (key, trend) {
    if (typeof key !== 'string') return { error: 'invalid_key' };
    this.trends[key] = { value: trend, ts: Date.now() };
    return { success: true };
  };

  CloudDashboard.prototype.getTrend = function (key) {
    return this.trends[key] || null;
  };

  CloudDashboard.prototype.getAllTrends = function () {
    var arr = [];
    for (var k in this.trends) {
      if (Object.prototype.hasOwnProperty.call(this.trends, k)) {
        arr.push({ key: k, value: this.trends[k].value, ts: this.trends[k].ts });
      }
    }
    return arr;
  };

  // -------- Persistence --------
  CloudDashboard.prototype.publishToCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    return this.sync.backup(this.storageKey, {
      widgets: this.widgets,
      snapshots: this.snapshots.slice(-10),
      alerts: this.alerts.slice(-20),
      trends: this.trends
    }, { type: 'dashboard' });
  };

  CloudDashboard.prototype.loadFromCloud = function () {
    if (!this.sync) return { error: 'no_sync' };
    var r = this.sync.restore(this.storageKey);
    if (r.success && r.value) {
      if (r.value.widgets) this.widgets = r.value.widgets;
      if (r.value.snapshots) this.snapshots = r.value.snapshots;
      if (r.value.alerts) this.alerts = r.value.alerts;
      if (r.value.trends) this.trends = r.value.trends;
    }
    return r;
  };

  CloudDashboard.prototype.exportDashboard = function () {
    return JSON.stringify({
      format: 'cloud-dashboard-v1',
      exportedAt: Date.now(),
      deviceId: this.deviceId,
      widgets: this.widgets,
      snapshots: this.snapshots,
      alerts: this.alerts,
      trends: this.trends
    });
  };

  CloudDashboard.prototype.importDashboard = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'cloud-dashboard-v1') return { error: 'unknown_format' };
      this.widgets = parsed.widgets || {};
      this.snapshots = parsed.snapshots || [];
      this.alerts = parsed.alerts || [];
      this.trends = parsed.trends || {};
      return { success: true, widgetCount: Object.keys(this.widgets).length };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  CloudDashboard.prototype.getSummary = function () {
    return {
      deviceId: this.deviceId,
      widgetCount: Object.keys(this.widgets).length,
      snapshotCount: this.snapshots.length,
      alertCount: this.alerts.length,
      unacknowledgedAlerts: this.alerts.filter(function (a) { return !a.acknowledged; }).length,
      trendCount: Object.keys(this.trends).length,
      lastRefresh: this._lastRefresh
    };
  };

  CloudDashboard.prototype.clear = function () {
    this.widgets = {};
    this.snapshots = [];
    this.alerts = [];
    this.trends = {};
    this._lastRefresh = null;
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.CloudDashboard = CloudDashboard;
    window.DASHBOARD_CHART_TYPES = CHART_TYPES;
    window.DASHBOARD_TIME_BUCKETS = TIME_BUCKETS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CloudDashboard: CloudDashboard, DASHBOARD_CHART_TYPES: CHART_TYPES, DASHBOARD_TIME_BUCKETS: TIME_BUCKETS };
  }
})();
