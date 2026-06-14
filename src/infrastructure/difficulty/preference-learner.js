// V357 PreferenceLearner: 多臂老虎机追踪卡牌偏好 + 衰减
'use strict';
(function () {
  function PreferenceLearner(options) {
    this.decay = (options && options.decay) || 0.95;
    this.lr = (options && options.lr) || 0.2;
    this.prefs = {};
    this.maxItems = (options && options.maxItems) || 200;
  }
  PreferenceLearner.prototype.observe = function (playerId, item, reward) {
    if (!playerId || !item) return false;
    if (!this.prefs[playerId]) this.prefs[playerId] = {};
    var p = this.prefs[playerId];
    if (!p[item]) p[item] = { score: 0, count: 0, lastTs: 0 };
    var entry = p[item];
    var now = Date.now();
    if (entry.lastTs > 0) {
      var dt = (now - entry.lastTs) / (1000 * 60 * 60 * 24);
      entry.score *= Math.pow(this.decay, dt);
    }
    entry.score = entry.score + this.lr * (reward - entry.score);
    entry.count++;
    entry.lastTs = now;
    var keys = Object.keys(p);
    if (keys.length > this.maxItems) {
      keys.sort(function (a, b) { return p[a].score - p[b].score; });
      delete p[keys[0]];
    }
    return true;
  };
  PreferenceLearner.prototype.getPreference = function (playerId, item) {
    var p = this.prefs[playerId];
    if (!p || !p[item]) return 0;
    return Math.round(p[item].score * 100) / 100;
  };
  PreferenceLearner.prototype.recommend = function (playerId, n) {
    var p = this.prefs[playerId];
    if (!p) return [];
    var arr = Object.keys(p).map(function (k) { return { item: k, score: p[k].score, count: p[k].count }; });
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr.slice(0, n || 5);
  };
  PreferenceLearner.prototype.getReport = function () {
    return { playerCount: Object.keys(this.prefs).length, totalItems: Object.keys(this.prefs).reduce(function (s, k) { return s + Object.keys(this.prefs[k]).length; }, 0) };
  };
  if (typeof window !== 'undefined') window.PreferenceLearner = PreferenceLearner;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { PreferenceLearner: PreferenceLearner };
})();
