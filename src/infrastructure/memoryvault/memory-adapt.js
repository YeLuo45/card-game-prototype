// V337 MemoryAdapt: 上下文感知调整
'use strict';
(function () {
  function MemoryAdapt() {
    this.adaptations = [];
    this.currentProfile = null;
  }
  MemoryAdapt.prototype.detectContext = function (signals) {
    if (!signals || typeof signals !== 'object') return { context: 'unknown' };
    if (signals.battleHp != null) {
      if (signals.battleHp < 30) return { context: 'critical', urgency: 0.9 };
      if (signals.battleHp < 60) return { context: 'warning', urgency: 0.5 };
    }
    if (signals.timeOfDay === 'night') return { context: 'night', urgency: 0.2 };
    if (signals.questActive) return { context: 'quest', urgency: 0.4 };
    return { context: 'normal', urgency: 0.1 };
  };
  MemoryAdapt.prototype.adapt = function (context) {
    this.currentProfile = context;
    var params = {};
    if (context.context === 'critical') { params.urgency = 'high'; params.showTips = true; }
    else if (context.context === 'warning') { params.urgency = 'medium'; params.showTips = true; }
    else if (context.context === 'night') { params.dimming = true; params.theme = 'dark'; }
    else if (context.context === 'quest') { params.theme = 'quest'; }
    else { params.theme = 'default'; }
    this.adaptations.push({ context: context, params: params, at: Date.now() });
    return params;
  };
  MemoryAdapt.prototype.getStats = function () {
    return { adaptations: this.adaptations.length, currentContext: this.currentProfile };
  };
  window.MemoryAdapt = MemoryAdapt;
})();
