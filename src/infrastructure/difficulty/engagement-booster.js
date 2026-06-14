// V355 EngagementBooster: 心流偏离时插入限时奖励 + 难度脉冲
'use strict';
(function () {
  var BOOST_TYPES = ['bonus_gold', 'free_relic', 'xp_boost', 'skip_elite', 'preview_next'];
  function EngagementBooster(options) {
    this.cooldownMs = (options && options.cooldownMs) || 60000;
    this.lastBoostAt = 0;
    this.activeBoosts = [];
    this.boostCount = 0;
  }
  EngagementBooster.prototype.canBoost = function () {
    return Date.now() - this.lastBoostAt >= this.cooldownMs;
  };
  EngagementBooster.prototype.suggestBoost = function (flowState) {
    var type;
    if (flowState === 'boredom') type = 'skip_elite';
    else if (flowState === 'frustration') type = 'bonus_gold';
    else if (flowState === 'arousal') type = 'xp_boost';
    else if (flowState === 'relaxed') type = 'preview_next';
    else type = null;
    if (!type) return { recommended: false, reason: 'in_flow_state' };
    if (!this.canBoost()) return { recommended: false, reason: 'cooldown', cooldownRemainingMs: this.cooldownMs - (Date.now() - this.lastBoostAt) };
    return { recommended: true, type: type, label: type.replace(/_/g, ' ') };
  };
  EngagementBooster.prototype.applyBoost = function (type, durationMs) {
    if (BOOST_TYPES.indexOf(type) < 0) return { success: false, error: 'invalid_type' };
    if (!this.canBoost()) return { success: false, error: 'cooldown' };
    var expiresAt = Date.now() + (durationMs || 30000);
    var boost = { type: type, expiresAt: expiresAt, ts: Date.now() };
    this.activeBoosts.push(boost);
    this.lastBoostAt = Date.now();
    this.boostCount++;
    return { success: true, boost: boost };
  };
  EngagementBooster.prototype.getActiveBoosts = function () {
    var now = Date.now();
    this.activeBoosts = this.activeBoosts.filter(function (b) { return b.expiresAt > now; });
    return this.activeBoosts.slice();
  };
  EngagementBooster.prototype.listBoostTypes = function () { return BOOST_TYPES.slice(); };
  EngagementBooster.prototype.getReport = function () {
    return { totalBoosts: this.boostCount, active: this.getActiveBoosts().length, canBoost: this.canBoost(), types: BOOST_TYPES };
  };
  EngagementBooster.prototype.reset = function () {
    this.lastBoostAt = 0; this.activeBoosts = []; this.boostCount = 0;
  };
  if (typeof window !== 'undefined') window.EngagementBooster = EngagementBooster;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { EngagementBooster: EngagementBooster };
})();
