// V335 MemoryReflect: 错误分析 + 修正
'use strict';
(function () {
  function MemoryReflect() {
    this.outcomes = []; // {context, decision, outcome, success}
    this.reflections = []; // lessons learned
  }
  MemoryReflect.prototype.record = function (context, decision, outcome, success) {
    var o = { id: 'o_' + this.outcomes.length, context: context, decision: decision, outcome: outcome, success: !!success, at: Date.now() };
    this.outcomes.push(o);
    if (!o.success) this._reflect(o);
    return o;
  };
  MemoryReflect.prototype._reflect = function (outcome) {
    var lesson = {
      id: 'r_' + this.reflections.length,
      at: Date.now(),
      failureContext: outcome.context,
      badDecision: outcome.decision,
      actualOutcome: outcome.outcome,
      suggestedFix: 'Avoid ' + outcome.decision + ' in similar contexts; prefer opposite'
    };
    this.reflections.push(lesson);
    return lesson;
  };
  MemoryReflect.prototype.getReflections = function () { return this.reflections.slice(); };
  MemoryReflect.prototype.successRate = function () {
    if (this.outcomes.length === 0) return 0;
    var s = 0;
    for (var i = 0; i < this.outcomes.length; i++) if (this.outcomes[i].success) s++;
    return s / this.outcomes.length;
  };
  MemoryReflect.prototype.getStats = function () {
    return { outcomes: this.outcomes.length, reflections: this.reflections.length, successRate: this.successRate() };
  };
  window.MemoryReflect = MemoryReflect;
})();
