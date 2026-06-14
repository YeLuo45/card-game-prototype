// V362 ChurnPreventor: 高风险玩家推送个性化内容 + 难度回退 + 奖励
'use strict';
(function () {
  var ACTIONS = { high: ['personalized_offer', 'difficulty_revert', 'free_relic'], medium: ['bonus_event', 'reminder'], low: [] };
  function ChurnPreventor(options) {
    this.lastRewardTs = 0;
    this.cooldownMs = (options && options.cooldownMs) || 86400000;
    this.interventions = [];
    this.risk = 'low';
  }
  ChurnPreventor.prototype.update = function (data) {
    if (!data || typeof data !== 'object') return false;
    this.risk = data.riskLevel || 'low';
    if (typeof data.daysInactive === 'number') this.daysInactive = data.daysInactive;
    if (typeof data.lastRewardTs === 'number') this.lastRewardTs = data.lastRewardTs;
    return true;
  };
  ChurnPreventor.prototype.shouldIntervene = function () {
    var canReward = (Date.now() - this.lastRewardTs) >= this.cooldownMs;
    return { priority: this.risk, recommended: this.risk !== 'low' && canReward, canReward: canReward };
  };
  ChurnPreventor.prototype.getAction = function () {
    var s = this.shouldIntervene();
    if (!s.recommended) return { applied: false, reason: 'no_intervention' };
    var acts = ACTIONS[this.risk] || [];
    var action = acts[0] || 'none';
    this.interventions.push({ risk: this.risk, action: action, ts: Date.now() });
    this.lastRewardTs = Date.now();
    return { applied: true, action: action, priority: this.risk };
  };
  ChurnPreventor.prototype.getReport = function () { return { risk: this.risk, interventionCount: this.interventions.length, lastRewardTs: this.lastRewardTs }; };
  ChurnPreventor.prototype.reset = function () { this.lastRewardTs = 0; this.interventions = []; this.risk = 'low'; };
  if (typeof window !== 'undefined') window.ChurnPreventor = ChurnPreventor;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { ChurnPreventor: ChurnPreventor };
})();
