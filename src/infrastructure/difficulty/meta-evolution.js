// V365 MetaEvolution: 难度模型参数在线演化 + 季节级 re-tune
'use strict';
(function () {
  function MetaEvolution(options) {
    this.season = null;
    this.weeks = [];
    this.params = { difficultyOffset: 0, rewardMultiplier: 1.0, encounterDensity: 1.0 };
  }
  MetaEvolution.prototype.setSeason = function (seasonId) { this.season = seasonId; this.weeks = []; return seasonId; };
  MetaEvolution.prototype.recordWeek = function (metrics) {
    if (!metrics) return false;
    this.weeks.push({ metrics: metrics, ts: Date.now() });
    if (this.weeks.length > 12) this.weeks.shift();
    return true;
  };
  MetaEvolution.prototype.getTrend = function () {
    if (this.weeks.length < 2) return { direction: null, change: 0 };
    var first = this.weeks[0].metrics; var last = this.weeks[this.weeks.length - 1].metrics;
    var dir;
    if (last.avgDifficulty > first.avgDifficulty) dir = 'increasing';
    else if (last.avgDifficulty < first.avgDifficulty) dir = 'decreasing';
    else dir = 'stable';
    return { direction: dir, difficultyChange: last.avgDifficulty - first.avgDifficulty, passRateChange: last.passRate - first.passRate };
  };
  MetaEvolution.prototype.evolve = function () {
    var t = this.getTrend();
    if (t.direction === 'increasing' && t.passRateChange < -0.05) {
      this.params.difficultyOffset = Math.max(-20, this.params.difficultyOffset - 5);
      this.params.encounterDensity = Math.max(0.5, this.params.encounterDensity - 0.05);
    } else if (t.direction === 'decreasing' && t.passRateChange > 0.10) {
      this.params.difficultyOffset = Math.min(20, this.params.difficultyOffset + 5);
      this.params.encounterDensity = Math.min(1.5, this.params.encounterDensity + 0.05);
    }
    return this.params;
  };
  MetaEvolution.prototype.getParams = function () { return Object.assign({}, this.params); };
  MetaEvolution.prototype.getReport = function () { return { season: this.season, weeks: this.weeks.length, params: this.getParams(), trend: this.getTrend() }; };
  if (typeof window !== 'undefined') window.MetaEvolution = MetaEvolution;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { MetaEvolution: MetaEvolution };
})();
