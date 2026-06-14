// V359 ABDifficultyTester: 双组实验 (control vs adaptive) + 显著性检验
'use strict';
(function () {
  function ABDifficultyTester(options) {
    this.groups = { control: { outcomes: [] }, adaptive: { outcomes: [] } };
    this.minSampleSize = (options && options.minSampleSize) || 10;
  }
  ABDifficultyTester.prototype.assignPlayer = function (playerId, group) {
    if (!this.groups[group]) return false;
    if (!this.groups[group].players) this.groups[group].players = [];
    this.groups[group].players.push(playerId);
    return true;
  };
  ABDifficultyTester.prototype.recordOutcome = function (group, outcome) {
    if (!this.groups[group]) return false;
    this.groups[group].outcomes.push(outcome);
    return true;
  };
  ABDifficultyTester.prototype._winRate = function (outcomes) {
    if (!outcomes || outcomes.length === 0) return 0;
    var w = 0; for (var i=0;i<outcomes.length;i++) if (outcomes[i].won) w++;
    return w / outcomes.length;
  };
  ABDifficultyTester.prototype._avgTime = function (outcomes) {
    if (!outcomes || outcomes.length === 0) return 0;
    var sum = 0, cnt = 0;
    for (var i=0;i<outcomes.length;i++) if (typeof outcomes[i].timeMs === 'number') { sum += outcomes[i].timeMs; cnt++; }
    return cnt > 0 ? sum / cnt : 0;
  };
  ABDifficultyTester.prototype.getSignificance = function () {
    var c = this.groups.control.outcomes, a = this.groups.adaptive.outcomes;
    if (c.length < this.minSampleSize || a.length < this.minSampleSize) return null;
    var cWin = this._winRate(c), aWin = this._winRate(a);
    var diff = Math.abs(aWin - cWin);
    var significant = diff > 0.10;
    return { controlWinRate: Math.round(cWin * 100) / 100, adaptiveWinRate: Math.round(aWin * 100) / 100, diff: Math.round(diff * 100) / 100, significant: significant, samplesControl: c.length, samplesAdaptive: a.length };
  };
  ABDifficultyTester.prototype.getReport = function () {
    var c = this.groups.control, a = this.groups.adaptive;
    return { control: { count: c.outcomes.length, winRate: this._winRate(c.outcomes), avgTimeMs: this._avgTime(c.outcomes) }, adaptive: { count: a.outcomes.length, winRate: this._winRate(a.outcomes), avgTimeMs: this._avgTime(a.outcomes) }, significance: this.getSignificance() };
  };
  if (typeof window !== 'undefined') window.ABDifficultyTester = ABDifficultyTester;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { ABDifficultyTester: ABDifficultyTester };
})();
