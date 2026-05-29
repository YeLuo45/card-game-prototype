// ============================================================================
// Card Phoenix Shrine — V221 Direction E
// Phoenix shrine with rebirth rituals, ember forges, and resurrection wards
// ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // EmberForge: Forges items with phoenix fire
  // -----------------------------------------------------------------------
  function EmberForge(forgeId, name, temperature, capacity) {
    this.forgeId = forgeId;
    this.name = name || forgeId;
    this.temperature = temperature || 800; // celsius
    this.capacity = capacity || 10;
    this.embers = 0;
    this.forgeLevel = 1;
    this.activeItem = null;
  }

  EmberForge.prototype.addEmbers = function (amount) {
    this.embers = Math.min(this.capacity, this.embers + amount);
    return { success: true, embers: this.embers };
  };

  EmberForge.prototype.heat = function (amount) {
    this.temperature += amount;
    return { success: true, temperature: this.temperature };
  };

  EmberForge.prototype.forge = function (item) {
    if (this.embers < 5) return { error: 'insufficient_embers' };
    if (this.temperature < 1000) return { error: 'temperature_too_low' };
    this.embers -= 5;
    this.forgeLevel = Math.min(5, this.forgeLevel + 1);
    this.activeItem = item;
    return { success: true, level: this.forgeLevel };
  };

  EmberForge.prototype.getForgePower = function () {
    var emberBonus = this.embers * 10;
    return this.temperature + emberBonus + (this.forgeLevel * 100);
  };

  // --------------------------------------------------------------------===
  // RebirthRitual: A rebirth ritual for cards
  // ----------------------------------------------------------------=======
  function RebirthRitual(ritualId, name, cost, requiredEssence) {
    this.ritualId = ritualId;
    this.name = name || ritualId;
    this.cost = cost || 30;
    this.requiredEssence = requiredEssence || 20;
    this.essence = 0;
    this.completed = false;
    this.revivedCards = [];
  }

  RebirthRitual.prototype.addEssence = function (amount) {
    this.essence += amount;
    return { success: true, essence: this.essence };
  };

  RebirthRitual.prototype.perform = function () {
    if (this.essence < this.requiredEssence) return { error: 'insufficient_essence' };
    if (this.completed) return { error: 'already_completed' };
    this.completed = true;
    return { success: true, essenceUsed: this.requiredEssence };
  };

  RebirthRitual.prototype.revive = function (cardId) {
    if (!this.completed) return { error: 'ritual_not_complete' };
    this.revivedCards.push(cardId);
    return { success: true, revived: cardId, total: this.revivedCards.length };
  };

  // --------------------------------------------------------------------===
  // ResurrectionWard: A ward that prevents death
  // ----------------------------------------------------------------=======
  function ResurrectionWard(wardId, name, strength, duration) {
    this.wardId = wardId;
    this.name = name || wardId;
    this.strength = strength || 70;
    this.maxStrength = strength || 70;
    this.duration = duration || 5; // turns
    this.turnsRemaining = duration;
    this.active = true;
    this.triggered = false;
  }

  ResurrectionWard.prototype.absorb = function (damage) {
    if (!this.active) return { error: 'ward_inactive' };
    if (this.strength <= 0) { this.active = false; return { error: 'ward_depleted' }; }
    var consumed = Math.min(this.strength, damage);
    this.strength -= consumed;
    if (this.strength <= 0) this.active = false;
    return { success: true, consumed: consumed };
  };

  ResurrectionWard.prototype.tick = function () {
    if (!this.active) return;
    this.turnsRemaining--;
    if (this.turnsRemaining <= 0) this.active = false;
  };

  ResurrectionWard.prototype.getStatus = function () {
    if (this.triggered) return 'triggered';
    if (!this.active) return 'expired';
    if (this.turnsRemaining <= 1) return 'critical';
    return 'active';
  };

  // --------------------------------------------------------------------===
  // PhoenixShrine: Main shrine
  // ----------------------------------------------------------------=======
  function PhoenixShrine(shrineId, name, blessingLevel) {
    this.shrineId = shrineId || ('shrine_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Phoenix Shrine';
    this.blessingLevel = blessingLevel || 1; // 1-5
    this.forges = {}; // forgeId -> EmberForge
    this.rituals = {}; // ritualId -> RebirthRitual
    this.wards = {}; // wardId -> ResurrectionWard
    this.totalRevivals = 0;
  }

  PhoenixShrine.prototype.addForge = function (f) {
    this.forges[f.forgeId] = f;
    return { success: true, count: Object.keys(this.forges).length };
  };

  PhoenixShrine.prototype.addRitual = function (r) {
    this.rituals[r.ritualId] = r;
    return { success: true, count: Object.keys(this.rituals).length };
  };

  PhoenixShrine.prototype.addWard = function (w) {
    this.wards[w.wardId] = w;
    return { success: true, count: Object.keys(this.wards).length };
  };

  PhoenixShrine.prototype.getShrinePower = function () {
    var total = 0;
    for (var id in this.forges) total += this.forges[id].getForgePower();
    for (var id in this.rituals) {
      var r = this.rituals[id];
      total += r.completed ? r.requiredEssence : 0;
    }
    for (var id in this.wards) total += this.wards[id].strength;
    total += this.blessingLevel * 50;
    return total;
  };

  PhoenixShrine.prototype.getForge = function (id) { return this.forges[id] || null; };
  PhoenixShrine.prototype.getRitual = function (id) { return this.rituals[id] || null; };
  PhoenixShrine.prototype.getWard = function (id) { return this.wards[id] || null; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.EmberForge = EmberForge;
  window.RebirthRitual = RebirthRitual;
  window.ResurrectionWard = ResurrectionWard;
  window.PhoenixShrine = PhoenixShrine;
})();