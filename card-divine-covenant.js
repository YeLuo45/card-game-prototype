// ============================================================================
// Card Divine Covenant — V222 Direction A
// Divine covenant with sacred oaths, divine favor, and holy bindings
// nanobot distributed mesh + generic-agent autonomous pursuit
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // SacredOath: A sacred oath bound to a card
  // ----------------------------------------------------------------=======
  function SacredOath(oathId, name, divineRank, bindingStrength) {
    this.oathId = oathId;
    this.name = name || oathId;
    this.divineRank = divineRank || 1; // 1-5
    this.bindingStrength = bindingStrength || 50; // 0-100
    this.active = true;
    this.broken = false;
    this.blessings = [];
  }

  SacredOath.prototype.invoke = function () {
    if (!this.active) return { error: 'oath_inactive' };
    if (this.broken) return { error: 'oath_broken' };
    var blessing = this.divineRank * 10 + Math.floor(this.bindingStrength / 10);
    this.blessings.push(blessing);
    return { success: true, blessing: blessing, total: this.blessings.length };
  };

  SacredOath.prototype.break = function () {
    this.broken = true;
    this.active = false;
    return { success: true, broken: true };
  };

  SacredOath.prototype.getOathPower = function () {
    if (this.broken) return 0;
    return this.divineRank * 30 + this.bindingStrength + this.blessings.reduce(function (s, b) { return s + b; }, 0);
  };

  // ----------------------------------------------------------------=======
  // DivineFavor: Accumulated divine favor
  // ----------------------------------------------------------------=======
  function DivineFavor(favorId, name, grace, maxGrace) {
    this.favorId = favorId;
    this.name = name || favorId;
    this.grace = grace || 0;
    this.maxGrace = maxGrace || 100;
    this.divineSpark = 0;
    this.blessing = 0;
  }

  DivineFavor.prototype.earn = function (amount) {
    this.grace = Math.min(this.maxGrace, this.grace + amount);
    var spark = Math.floor(this.grace / 25);
    this.divineSpark = Math.min(5, spark);
    return { success: true, grace: this.grace, spark: this.divineSpark };
  };

  DivineFavor.prototype.bestow = function (cardId) {
    if (this.grace < 10) return { error: 'insufficient_grace' };
    this.grace -= 10;
    this.blessing++;
    return { success: true, blessing: this.blessing, cardId: cardId };
  };

  DivineFavor.prototype.getFavorPower = function () {
    return this.grace + this.divineSpark * 20 + this.blessing * 15;
  };

  // ----------------------------------------------------------------=======
  // HolyBinding: A binding that links cards together
  // ----------------------------------------------------------------=======
  function HolyBinding(bindingId, name, strength, linkedCards) {
    this.bindingId = bindingId;
    this.name = name || bindingId;
    this.strength = (strength !== undefined) ? strength : 75; // use nullish coalescing
    this.linkedCards = linkedCards || [];
    this.activated = false;
  }

  HolyBinding.prototype.link = function (cardId) {
    if (this.linkedCards.length >= 5) return { error: 'max_links_reached' };
    if (this.linkedCards.indexOf(cardId) !== -1) return { error: 'already_linked' };
    this.linkedCards.push(cardId);
    return { success: true, count: this.linkedCards.length };
  };

  HolyBinding.prototype.activate = function () {
    if (this.linkedCards.length < 2) return { error: 'insufficient_links' };
    this.activated = true;
    return { success: true, power: this.getBindingPower() };
  };

  HolyBinding.prototype.getBindingPower = function () {
    return this.activated ? this.strength * this.linkedCards.length : 0;
  };

  // ----------------------------------------------------------------=======
  // DivineCovenant: Main covenant system
  // ----------------------------------------------------------------=======
  function DivineCovenant(covenantId, name, covenantLevel) {
    this.covenantId = covenantId;
    this.name = name || 'Divine Covenant';
    this.covenantLevel = covenantLevel || 1;
    this.oaths = {}; // oathId -> SacredOath
    this.favors = {}; // favorId -> DivineFavor
    this.bindings = {}; // bindingId -> HolyBinding
  }

  DivineCovenant.prototype.addOath = function (o) {
    this.oaths[o.oathId] = o;
    return { success: true, count: Object.keys(this.oaths).length };
  };

  DivineCovenant.prototype.addFavor = function (f) {
    this.favors[f.favorId] = f;
    return { success: true, count: Object.keys(this.favors).length };
  };

  DivineCovenant.prototype.addBinding = function (b) {
    this.bindings[b.bindingId] = b;
    return { success: true, count: Object.keys(this.bindings).length };
  };

  DivineCovenant.prototype.getCovenantPower = function () {
    var total = 0;
    for (var id in this.oaths) total += this.oaths[id].getOathPower();
    for (var id in this.favors) total += this.favors[id].getFavorPower();
    for (var id in this.bindings) total += this.bindings[id].getBindingPower();
    total += this.covenantLevel * 25;
    return total;
  };

  DivineCovenant.prototype.getOath = function (id) { return this.oaths[id] || null; };
  DivineCovenant.prototype.getFavor = function (id) { return this.favors[id] || null; };
  DivineCovenant.prototype.getBinding = function (id) { return this.bindings[id] || null; };

  window.SacredOath = SacredOath;
  window.DivineFavor = DivineFavor;
  window.HolyBinding = HolyBinding;
  window.DivineCovenant = DivineCovenant;
})();