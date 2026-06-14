// V356 PersonalizationEngine: style → 推荐卡组/遗物/角色/商店商品
'use strict';
(function () {
  // 5 archetypes → recommendations
  var PERSONALIZATION = {
    aggressive: { cards: ['berserk', 'whirlwind', 'execute'], relics: ['blood_axe', 'war_cry'], shop: ['damage_potion'] },
    defensive:  { cards: ['armor_up', 'heal', 'shield_wall'], relics: ['iron_curtain', 'guardian_aegis'], shop: ['block_potion'] },
    economist:  { cards: ['gold_rush', 'shop_discount'], relics: ['money_belt', 'merchant_charm'], shop: ['rare_card_token'] },
    explorer:   { cards: ['reveal_map', 'lucky_find'], relics: ['compass', 'treasure_map'], shop: ['key_token'] },
    social:     { cards: ['ally_recruit', 'team_buff'], relics: ['friendship_coin', 'guild_banner'], shop: ['co_op_charm'] },
    balanced:   { cards: ['versatile_strike', 'balanced_block'], relics: ['adaptive_stone'], shop: ['wildcard_charm'] }
  };
  function PersonalizationEngine(options) {
    this.history = [];
    this.maxHistory = (options && options.maxHistory) || 50;
  }
  PersonalizationEngine.prototype.recommend = function (archetype, options) {
    var a = (archetype && PERSONALIZATION[archetype]) ? archetype : 'balanced';
    var rec = PERSONALIZATION[a];
    var extraCards = (options && options.extraCards) || [];
    return {
      archetype: a,
      cards: rec.cards.concat(extraCards),
      relics: rec.relics.slice(),
      shop: rec.shop.slice(),
      rationale: this._rationale(a)
    };
  };
  PersonalizationEngine.prototype._rationale = function (archetype) {
    var map = {
      aggressive: 'High damage output preferred; recommend burst cards',
      defensive: 'Survivability focus; recommend block + heal',
      economist: 'Resource efficiency; recommend gold/shop synergies',
      explorer: 'Discovery preference; recommend reveal/treasure',
      social: 'Multiplayer affinity; recommend team buffs',
      balanced: 'No clear preference; recommend versatile options'
    };
    return map[archetype] || map.balanced;
  };
  PersonalizationEngine.prototype.recordAccept = function (recId) {
    this.history.push({ recId: recId, accepted: true, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
  };
  PersonalizationEngine.prototype.recordReject = function (recId) {
    this.history.push({ recId: recId, accepted: false, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
  };
  PersonalizationEngine.prototype.getAcceptRate = function () {
    if (this.history.length === 0) return 0;
    var accepted = 0;
    for (var i = 0; i < this.history.length; i++) if (this.history[i].accepted) accepted++;
    return accepted / this.history.length;
  };
  PersonalizationEngine.prototype.listArchetypes = function () { return Object.keys(PERSONALIZATION); };
  PersonalizationEngine.prototype.getReport = function () {
    return { historyLen: this.history.length, acceptRate: this.getAcceptRate(), archetypes: this.listArchetypes() };
  };
  if (typeof window !== 'undefined') window.PersonalizationEngine = PersonalizationEngine;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { PersonalizationEngine: PersonalizationEngine };
})();
