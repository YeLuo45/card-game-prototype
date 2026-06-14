// V358 DifficultyAnalytics: 全服难度分布 + 玩家通过率热图 + 异常关卡报警
'use strict';
(function () {
  function DifficultyAnalytics(options) {
    this.chapterData = {};
    this.alertThreshold = (options && options.alertThreshold) || 0.30;
  }
  DifficultyAnalytics.prototype.recordChapterCompletion = function (chapter, passed, timeMs) {
    if (!this.chapterData[chapter]) this.chapterData[chapter] = { attempts: 0, passes: 0, totalTime: 0 };
    var d = this.chapterData[chapter];
    d.attempts++;
    if (passed) d.passes++;
    if (typeof timeMs === 'number') d.totalTime += timeMs;
    return d;
  };
  DifficultyAnalytics.prototype.getPassRate = function (chapter) {
    var d = this.chapterData[chapter];
    if (!d || d.attempts === 0) return 0;
    return d.passes / d.attempts;
  };
  DifficultyAnalytics.prototype.getChapterStats = function (chapter) {
    var d = this.chapterData[chapter];
    if (!d) return null;
    return { chapter: chapter, attempts: d.attempts, passes: d.passes, passRate: d.passes / d.attempts, avgTimeMs: d.attempts > 0 ? Math.round(d.totalTime / d.attempts) : 0 };
  };
  DifficultyAnalytics.prototype.getHeatmap = function () {
    return Object.keys(this.chapterData).sort().map(function (c) { return this.getChapterStats(parseInt(c)); }.bind(this));
  };
  DifficultyAnalytics.prototype.getAnomalousChapters = function () {
    var anomalies = [];
    var self = this;
    Object.keys(this.chapterData).forEach(function (c) {
      var rate = self.getPassRate(c);
      if (rate < self.alertThreshold) anomalies.push({ chapter: parseInt(c), passRate: Math.round(rate * 100) / 100, severity: 'too_hard' });
      else if (rate > 0.95) anomalies.push({ chapter: parseInt(c), passRate: Math.round(rate * 100) / 100, severity: 'too_easy' });
    });
    return anomalies;
  };
  DifficultyAnalytics.prototype.getReport = function () {
    var self = this;
    var chapterStats = {};
    Object.keys(this.chapterData).forEach(function (c) { chapterStats[c] = self.getChapterStats(parseInt(c)); });
    return { chapterStats: chapterStats, anomalies: this.getAnomalousChapters(), heatmap: this.getHeatmap() };
  };
  if (typeof window !== 'undefined') window.DifficultyAnalytics = DifficultyAnalytics;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { DifficultyAnalytics: DifficultyAnalytics };
})();
