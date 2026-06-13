// V334 MemoryLearn: 从历史预测重要度
'use strict';
(function () {
  function MemoryLearn() {
    this.accessLog = []; // {id, action, ts}
    this.predictions = {};
  }
  MemoryLearn.prototype.record = function (id, action) {
    this.accessLog.push({ id: id, action: action, ts: Date.now() });
  };
  MemoryLearn.prototype.predictImportance = function (id) {
    var count = 0;
    for (var i = 0; i < this.accessLog.length; i++) if (this.accessLog[i].id === id) count++;
    // Score: log2(count+1) / 10, capped at 1
    var score = Math.log2(count + 1) / 10;
    if (score > 1) score = 1;
    this.predictions[id] = score;
    return score;
  };
  MemoryLearn.prototype.topImportant = function (n) {
    var ids = {};
    for (var i = 0; i < this.accessLog.length; i++) ids[this.accessLog[i].id] = true;
    var scores = [];
    for (var k in ids) scores.push({ id: k, score: this.predictImportance(k) });
    scores.sort(function (a, b) { return b.score - a.score; });
    return scores.slice(0, n || 5);
  };
  MemoryLearn.prototype.getStats = function () {
    return { accessLogSize: this.accessLog.length, predictionsCached: Object.keys(this.predictions).length };
  };
  window.MemoryLearn = MemoryLearn;
})();
