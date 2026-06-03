// ============================================================================
// Plugin Marketplace — V281 Direction C Iteration 9/9
// PluginStats: 统计评分 (下载/使用/健康分/趋势/Top N)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function PluginStats(options) {
    options = options || {};
    this.registry = options.registry || null;
    this.marketplace = options.marketplace || null;
    this.usage = {};       // pluginId -> {runs, lastUsed, totalTime}
    this.errors = {};      // pluginId -> {count, lastError}
    this.feedback = {};    // pluginId -> [feedback]
    this.healthScores = {};
    this.trends = {};      // pluginId -> [{date, downloads, rating}]
  }

  // ---- Usage tracking ----
  PluginStats.prototype.recordUsage = function (pluginId, durationMs) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (!this.usage[pluginId]) this.usage[pluginId] = { runs: 0, lastUsed: null, totalTime: 0, avgTime: 0 };
    var u = this.usage[pluginId];
    u.runs++;
    u.lastUsed = Date.now();
    if (typeof durationMs === 'number' && durationMs >= 0) {
      u.totalTime += durationMs;
      u.avgTime = u.totalTime / u.runs;
    }
    return { success: true, usage: u };
  };

  PluginStats.prototype.getUsage = function (pluginId) {
    return this.usage[pluginId] ? JSON.parse(JSON.stringify(this.usage[pluginId])) : null;
  };

  PluginStats.prototype.getMostUsed = function (limit) {
    var arr = [];
    for (var k in this.usage) {
      if (Object.prototype.hasOwnProperty.call(this.usage, k)) {
        arr.push({ pluginId: k, runs: this.usage[k].runs, totalTime: this.usage[k].totalTime });
      }
    }
    arr.sort(function (a, b) { return b.runs - a.runs; });
    return typeof limit === 'number' && limit > 0 ? arr.slice(0, limit) : arr;
  };

  // ---- Error tracking ----
  PluginStats.prototype.recordError = function (pluginId, error) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (!this.errors[pluginId]) this.errors[pluginId] = { count: 0, lastError: null, lastTs: null, errors: [] };
    var e = this.errors[pluginId];
    e.count++;
    e.lastError = typeof error === 'string' ? error : (error && error.message) || 'unknown';
    e.lastTs = Date.now();
    e.errors.push({ message: e.lastError, ts: Date.now() });
    if (e.errors.length > 50) e.errors = e.errors.slice(-50);
    return { success: true };
  };

  PluginStats.prototype.getErrors = function (pluginId, limit) {
    var e = this.errors[pluginId];
    if (!e) return null;
    if (typeof limit === 'number' && limit > 0) {
      return { count: e.count, lastError: e.lastError, errors: e.errors.slice(-limit) };
    }
    return JSON.parse(JSON.stringify(e));
  };

  PluginStats.prototype.getMostErrored = function (limit) {
    var arr = [];
    for (var k in this.errors) {
      if (Object.prototype.hasOwnProperty.call(this.errors, k)) {
        arr.push({ pluginId: k, count: this.errors[k].count, lastError: this.errors[k].lastError });
      }
    }
    arr.sort(function (a, b) { return b.count - a.count; });
    return typeof limit === 'number' && limit > 0 ? arr.slice(0, limit) : arr;
  };

  // ---- Feedback ----
  PluginStats.prototype.addFeedback = function (pluginId, feedback) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (!feedback || typeof feedback !== 'object') return { error: 'invalid_feedback' };
    var entry = {
      author: feedback.author || 'anonymous',
      type: feedback.type || 'comment',  // comment, suggestion, issue, praise
      message: feedback.message || '',
      rating: typeof feedback.rating === 'number' ? feedback.rating : null,
      ts: Date.now()
    };
    if (!this.feedback[pluginId]) this.feedback[pluginId] = [];
    this.feedback[pluginId].push(entry);
    if (this.feedback[pluginId].length > 200) this.feedback[pluginId] = this.feedback[pluginId].slice(-200);
    return { success: true, entry: entry };
  };

  PluginStats.prototype.getFeedback = function (pluginId, type) {
    var arr = this.feedback[pluginId] || [];
    if (type) arr = arr.filter(function (f) { return f.type === type; });
    return arr.slice();
  };

  PluginStats.prototype.feedbackCount = function (pluginId) {
    return (this.feedback[pluginId] || []).length;
  };

  // ---- Health score ----
  PluginStats.prototype.computeHealth = function (pluginId) {
    var score = 100;
    var breakdown = {};
    // usage factor: more usage = healthier (up to +20)
    var u = this.usage[pluginId];
    if (u && u.runs > 0) {
      var usageBonus = Math.min(20, Math.log10(u.runs + 1) * 10);
      score += usageBonus;
      breakdown.usage = { runs: u.runs, bonus: usageBonus };
    } else {
      score -= 10;
      breakdown.usage = { runs: 0, penalty: -10 };
    }
    // error factor: errors reduce
    var e = this.errors[pluginId];
    if (e && e.count > 0) {
      var errPenalty = Math.min(50, e.count * 5);
      score -= errPenalty;
      breakdown.errors = { count: e.count, penalty: -errPenalty };
    }
    // rating factor
    if (this.marketplace && typeof this.marketplace.getRating === 'function') {
      var r = this.marketplace.getRating(pluginId);
      if (r.count > 0) {
        var ratingBonus = (r.average - 3) * 10;  // 5 stars = +20, 3 stars = 0
        score += ratingBonus;
        breakdown.rating = { average: r.average, count: r.count, bonus: ratingBonus };
      }
    }
    // download factor
    if (this.marketplace && typeof this.marketplace.getDownloadCount === 'function') {
      var dl = this.marketplace.getDownloadCount(pluginId);
      var dlBonus = Math.min(20, Math.log10(dl + 1) * 5);
      score += dlBonus;
      breakdown.downloads = { count: dl, bonus: dlBonus };
    }
    score = Math.max(0, Math.min(150, score));  // clamp
    this.healthScores[pluginId] = { score: score, breakdown: breakdown, ts: Date.now() };
    return this.healthScores[pluginId];
  };

  PluginStats.prototype.getHealth = function (pluginId) {
    if (!this.healthScores[pluginId]) {
      return this.computeHealth(pluginId);
    }
    return this.healthScores[pluginId];
  };

  PluginStats.prototype.getTopHealth = function (limit) {
    var arr = [];
    for (var k in this.healthScores) {
      if (Object.prototype.hasOwnProperty.call(this.healthScores, k)) {
        arr.push({ pluginId: k, score: this.healthScores[k].score });
      }
    }
    arr.sort(function (a, b) { return b.score - a.score; });
    return typeof limit === 'number' && limit > 0 ? arr.slice(0, limit) : arr;
  };

  // ---- Trends ----
  PluginStats.prototype.recordTrend = function (pluginId, dataPoint) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (typeof dataPoint !== 'object') return { error: 'invalid_data' };
    var dp = {
      date: dataPoint.date || new Date().toISOString().substring(0, 10),
      downloads: typeof dataPoint.downloads === 'number' ? dataPoint.downloads : 0,
      rating: typeof dataPoint.rating === 'number' ? dataPoint.rating : 0,
      usage: typeof dataPoint.usage === 'number' ? dataPoint.usage : 0
    };
    if (!this.trends[pluginId]) this.trends[pluginId] = [];
    this.trends[pluginId].push(dp);
    if (this.trends[pluginId].length > 365) this.trends[pluginId] = this.trends[pluginId].slice(-365);
    return { success: true };
  };

  PluginStats.prototype.getTrend = function (pluginId, days) {
    var arr = this.trends[pluginId] || [];
    if (typeof days === 'number' && days > 0) return arr.slice(-days);
    return arr.slice();
  };

  PluginStats.prototype.computeMovingAverage = function (pluginId, window) {
    var arr = this.trends[pluginId] || [];
    if (arr.length === 0) return null;
    if (typeof window !== 'number' || window <= 0) window = 7;
    var w = Math.min(window, arr.length);
    var sum = 0;
    for (var i = arr.length - w; i < arr.length; i++) {
      sum += arr[i].downloads;
    }
    return sum / w;
  };

  // ---- Comparison ----
  PluginStats.prototype.compare = function (pluginIds) {
    if (!Array.isArray(pluginIds)) return { error: 'invalid_input' };
    var results = [];
    for (var i = 0; i < pluginIds.length; i++) {
      var pid = pluginIds[i];
      var h = this.getHealth(pid);
      var u = this.getUsage(pid);
      var e = this.getErrors(pid);
      var dls = 0;
      if (this.marketplace && typeof this.marketplace.getDownloadCount === 'function') {
        dls = this.marketplace.getDownloadCount(pid);
      }
      results.push({
        pluginId: pid,
        health: h ? h.score : null,
        runs: u ? u.runs : 0,
        errors: e ? e.count : 0,
        downloads: dls
      });
    }
    return results;
  };

  // ---- Stats ----
  PluginStats.prototype.getMetrics = function () {
    return {
      trackedPlugins: Object.keys(this.usage).length,
      erroredPlugins: Object.keys(this.errors).length,
      feedbackPlugins: Object.keys(this.feedback).length,
      healthScored: Object.keys(this.healthScores).length,
      trendPlugins: Object.keys(this.trends).length
    };
  };

  PluginStats.prototype.getSummary = function () {
    return {
      metrics: this.getMetrics(),
      topUsed: this.getMostUsed(5),
      topErrored: this.getMostErrored(5),
      topHealth: this.getTopHealth(5)
    };
  };

  PluginStats.prototype.clear = function () {
    this.usage = {};
    this.errors = {};
    this.feedback = {};
    this.healthScores = {};
    this.trends = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginStats = PluginStats;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginStats: PluginStats };
  }
})();
