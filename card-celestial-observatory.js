// ============================================================================
// Card Celestial Observatory — V216 Direction E
// Celestial observatory with star charts, cosmic predictions, and astral mapping
// ruflo hierarchical decomposition + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // StarChart: A chart of stars and constellations
  // -----------------------------------------------------------------------
  function StarChart(chartId, name, stars, accuracy) {
    this.chartId = chartId;
    this.name = name || chartId;
    this.stars = stars || []; // array of {name, x, y, brightness}
    this.accuracy = accuracy || 50; // 0-100
    this.mapped = false;
    this.constellations = [];
  }

  StarChart.prototype.addStar = function (star) {
    this.stars.push(star);
    return { success: true, count: this.stars.length };
  };

  StarChart.prototype.mapConstellation = function (name, starIndices) {
    if (this.mapped) return { error: 'chart_already_mapped' };
    this.constellations.push({ name: name, stars: starIndices });
    return { success: true, constellations: this.constellations.length };
  };

  StarChart.prototype.finalize = function () {
    if (this.mapped) return { error: 'already_finalized' };
    this.mapped = true;
    return { success: true };
  };

  StarChart.prototype.getBrightness = function () {
    var total = 0;
    for (var i = 0; i < this.stars.length; i++) total += this.stars[i].brightness || 0;
    return this.stars.length > 0 ? total / this.stars.length : 0;
  };

  // -----------------------------------------------------------------------
  // CosmicPrediction: A prediction derived from star charts
  // -----------------------------------------------------------------------
  function CosmicPrediction(predId, name, chart, forecast, reliability) {
    this.predId = predId;
    this.name = name || predId;
    this.chartId = chart || null;
    this.forecast = forecast || 'unknown';
    this.reliability = reliability || 50; // 0-100
    this.fulfilled = false;
    this.fulfilledAt = null;
  }

  CosmicPrediction.prototype.fulfill = function () {
    if (this.fulfilled) return { error: 'already_fulfilled' };
    this.fulfilled = true;
    this.fulfilledAt = Date.now();
    return { success: true, fulfilledAt: this.fulfilledAt };
  };

  CosmicPrediction.prototype.getReliability = function () {
    return this.fulfilled ? Math.floor(this.reliability * 0.5) : this.reliability;
  };

  // --------------------------------------------------------------------===
  // AstralMap: A map of celestial bodies
  // ----------------------------------------------------------------=======
  function AstralMap(mapId, name, maxCharts) {
    this.mapId = mapId;
    this.name = name || mapId;
    this.maxCharts = maxCharts || 20;
    this.charts = {}; // chartId -> StarChart
    this.predictions = {}; // predId -> CosmicPrediction
    this.mapLevel = 1;
    this.totalStars = 0;
  }

  AstralMap.prototype.addChart = function (chart) {
    if (Object.keys(this.charts).length >= this.maxCharts) return { error: 'max_charts' };
    this.charts[chart.chartId] = chart;
    this.totalStars += chart.stars.length;
    return { success: true, count: Object.keys(this.charts).length };
  };

  AstralMap.prototype.getChart = function (id) { return this.charts[id] || null; };
  AstralMap.prototype.getChartCount = function () { return Object.keys(this.charts).length; };

  AstralMap.prototype.createPrediction = function (pred) {
    this.predictions[pred.predId] = pred;
    return { success: true, count: Object.keys(this.predictions).length };
  };

  AstralMap.prototype.getPrediction = function (id) { return this.predictions[id] || null; };
  AstralMap.prototype.getPredictionCount = function () { return Object.keys(this.predictions).length; };

  AstralMap.prototype.getMapLevel = function () {
    var thresholds = [0, 50, 150, 300, 500];
    for (var i = thresholds.length - 1; i >= 0; i--) {
      if (this.totalStars >= thresholds[i]) { this.mapLevel = i + 1; break; }
    }
    return this.mapLevel;
  };

  // --------------------------------------------------------------------===
  // CelestialObservatory: Main observatory
  // ----------------------------------------------------------------=======
  function CelestialObservatory(obsId, name, maxMaps) {
    this.obsId = obsId || ('obs_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Celestial Observatory';
    this.maps = {};
    this.maxMaps = maxMaps || 10;
    this.observers = {}; // observerId -> {name, discoveries, xp}
  }

  CelestialObservatory.prototype.createMap = function (map) {
    this.maps[map.mapId] = map;
    return { success: true, count: Object.keys(this.maps).length };
  };

  CelestialObservatory.prototype.registerObserver = function (observerId, name) {
    this.observers[observerId] = { name: name || observerId, discoveries: 0, xp: 0 };
    return { success: true };
  };

    CelestialObservatory.prototype.addXP = function (observerId, amount) {
    var o = this.observers[observerId];
    if (!o) return { error: 'observer_not_found' };
    o.xp += amount;
    o.discoveries = Math.floor(o.xp / 50);
    return { success: true, xp: o.xp, discoveries: o.discoveries };
  };

  CelestialObservatory.prototype.getMap = function (id) { return this.maps[id] || null; };
  CelestialObservatory.prototype.getObserver = function (id) { return this.observers[id] || null; };
  CelestialObservatory.prototype.getMapCount = function () { return Object.keys(this.maps).length; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.StarChart = StarChart;
  window.CosmicPrediction = CosmicPrediction;
  window.AstralMap = AstralMap;
  window.CelestialObservatory = CelestialObservatory;
})();