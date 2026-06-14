// V353 FlowStateDetector: 心流检测 (skill≈challenge) + boredom/frustration 预警
'use strict';
(function () {
  var FLOW_LOW = 0.8, FLOW_HIGH = 1.2, BOREDOM = 0.6, FRUSTRATION = 1.5;
  function FlowStateDetector(options) {
    this.alertThreshold = (options && options.alertThreshold) || 3;
    this.recentStates = [];
    this.maxRecent = (options && options.maxRecent) || 20;
  }
  FlowStateDetector.prototype.detect = function (skill, challenge) {
    var s = (typeof skill === 'number') ? skill : 50;
    var c = (typeof challenge === 'number') ? challenge : 50;
    var ratio = c / Math.max(1, s);
    var state;
    if (ratio < BOREDOM) state = 'boredom';
    else if (ratio < FLOW_LOW) state = 'relaxed';
    else if (ratio <= FLOW_HIGH) state = 'flow';
    else if (ratio <= FRUSTRATION) state = 'arousal';
    else state = 'frustration';
    this.recentStates.push({ state: state, ratio: Math.round(ratio*100)/100, ts: Date.now() });
    if (this.recentStates.length > this.maxRecent) this.recentStates.shift();
    return { state: state, ratio: Math.round(ratio*100)/100, isFlow: state === 'flow' };
  };
  FlowStateDetector.prototype.shouldAlert = function () {
    var boredom = 0, frustration = 0;
    for (var i = 0; i < this.recentStates.length; i++) {
      if (this.recentStates[i].state === 'boredom') boredom++;
      else if (this.recentStates[i].state === 'frustration') frustration++;
    }
    return {
      boredom: boredom >= this.alertThreshold,
      frustration: frustration >= this.alertThreshold,
      boredomCount: boredom,
      frustrationCount: frustration,
      recentWindow: this.recentStates.length
    };
  };
  FlowStateDetector.prototype.getDistribution = function () {
    var d = { flow: 0, relaxed: 0, boredom: 0, arousal: 0, frustration: 0 };
    for (var i = 0; i < this.recentStates.length; i++) d[this.recentStates[i].state]++;
    return d;
  };
  FlowStateDetector.prototype.getReport = function () {
    return { recent: this.recentStates.length, distribution: this.getDistribution(), alerts: this.shouldAlert() };
  };
  FlowStateDetector.prototype.reset = function () { this.recentStates = []; };
  if (typeof window !== 'undefined') window.FlowStateDetector = FlowStateDetector;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { FlowStateDetector: FlowStateDetector };
})();
