// V352 FeedbackCollector: battle 反馈收集 (win/loss/quit/deathRound/quitRound)
'use strict';
(function () {
  var EVENT_TYPES = ['battle_win','battle_loss','quit_early','death','card_use','item_use','npc_interaction'];
  function FeedbackCollector(options) {
    this.maxEvents = (options && options.maxEvents) || 200;
    this.events = [];
    this.summary = {};
    EVENT_TYPES.forEach(function (t) { this.summary[t] = 0; }.bind(this));
  }
  FeedbackCollector.prototype.record = function (eventType, metadata) {
    if (!eventType || EVENT_TYPES.indexOf(eventType) < 0) return { success: false, error: 'unknown_event' };
    var entry = { type: eventType, ts: Date.now(), meta: metadata || {} };
    this.events.push(entry);
    this.summary[eventType] = (this.summary[eventType] || 0) + 1;
    if (this.events.length > this.maxEvents) this.events.shift();
    return { success: true, entry: entry };
  };
  FeedbackCollector.prototype.getStats = function () {
    var total = this.events.length;
    var wins = this.summary.battle_win || 0;
    var losses = this.summary.battle_loss || 0;
    var battles = wins + losses;
    return {
      total: total,
      summary: Object.assign({}, this.summary),
      winRate: battles > 0 ? wins / battles : 0,
      quitRate: total > 0 ? (this.summary.quit_early || 0) / total : 0,
      avgQuitRound: this._avgMeta('quitRound'),
      avgDeathRound: this._avgMeta('deathRound')
    };
  };
  FeedbackCollector.prototype._avgMeta = function (key) {
    var vals = [];
    for (var i = 0; i < this.events.length; i++) {
      var m = this.events[i].meta || {};
      if (typeof m[key] === 'number') vals.push(m[key]);
    }
    if (vals.length === 0) return 0;
    var sum = 0; for (var j = 0; j < vals.length; j++) sum += vals[j];
    return Math.round(sum / vals.length);
  };
  FeedbackCollector.prototype.getReport = function () { return { events: this.events.length, stats: this.getStats() }; };
  FeedbackCollector.prototype.reset = function () {
    this.events = [];
    var self = this;
    EVENT_TYPES.forEach(function (t) { self.summary[t] = 0; });
  };
  if (typeof window !== 'undefined') window.FeedbackCollector = FeedbackCollector;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { FeedbackCollector: FeedbackCollector };
})();
