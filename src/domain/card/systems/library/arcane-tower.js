// ============================================================================
// Card Arcane Tower — V218 Direction B
// Arcane tower with spell research, mana batteries, and ward enchantments
// chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // SpellResearch: Research a spell
  // -----------------------------------------------------------------------
  function SpellResearch(researchId, name, school, manaCost, power) {
    this.researchId = researchId;
    this.name = name || researchId;
    this.school = school || 'arcane'; // fire, frost, arcane, holy, shadow, nature
    this.manaCost = manaCost || 20;
    this.power = power || 30;
    this.discovered = false;
    this.mastered = false;
  }

  SpellResearch.prototype.discover = function () {
    this.discovered = true;
    return { success: true };
  };

  SpellResearch.prototype.master = function () {
    if (!this.discovered) return { error: 'not_discovered' };
    this.mastered = true;
    return { success: true };
  };

  SpellResearch.prototype.getPowerLevel = function () {
    var base = this.power;
    if (this.mastered) base *= 2;
    return base;
  };

  // --------------------------------------------------------------------===
  // ManaBattery: Store and release mana
  // ----------------------------------------------------------------=======
  function ManaBattery(batteryId, name, capacity, regenRate) {
    this.batteryId = batteryId;
    this.name = name || batteryId;
    this.capacity = capacity || 100;
    this.current = capacity; // start full
    this.regenRate = regenRate || 5;
    this.chargeLevel = 100; // percentage
    this.connected = false;
  }

  ManaBattery.prototype.draw = function (amount) {
    if (this.current < amount) return { error: 'insufficient_mana', drawn: 0 };
    this.current -= amount;
    this.chargeLevel = Math.floor((this.current / this.capacity) * 100);
    return { success: true, drawn: amount, remaining: this.current };
  };

  ManaBattery.prototype.recharge = function (amount) {
    this.current = Math.min(this.capacity, this.current + amount);
    this.chargeLevel = Math.floor((this.current / this.capacity) * 100);
    return { success: true, current: this.current, chargeLevel: this.chargeLevel };
  };

  ManaBattery.prototype.regenerate = function () {
    if (this.current >= this.capacity) return { success: true, current: this.current };
    this.current = Math.min(this.capacity, this.current + this.regenRate);
    this.chargeLevel = Math.floor((this.current / this.capacity) * 100);
    return { success: true, current: this.current };
  };

  ManaBattery.prototype.getChargeLevel = function () { return this.chargeLevel; };

  // --------------------------------------------------------------------===
  // WardEnchantment: An enchantment ward
  // ----------------------------------------------------------------=======
  function WardEnchantment(wardId, name, school, strength, duration) {
    this.wardId = wardId;
    this.name = name || wardId;
    this.school = school || 'arcane';
    this.strength = strength || 50;
    this.maxStrength = 80; // fixed cap independent of initial strength
    this.duration = duration || -1; // -1 = permanent
    this.active = true;
    this.absorbed = 0;
  }

  WardEnchantment.prototype.absorb = function (damage) {
    if (!this.active) return { error: 'ward_inactive' };
    if (this.strength <= 0) { this.active = false; return { error: 'ward_depleted', absorbed: this.absorbed }; }
    var consumed = Math.min(this.strength, damage);
    this.strength -= consumed;
    this.absorbed += consumed;
    if (this.strength <= 0) this.active = false;
    return { success: true, consumed: consumed, remaining: this.strength };
  };

  WardEnchantment.prototype.amplify = function (amount) {
    this.strength = Math.min(this.maxStrength, this.strength + amount);
    return { success: true, strength: this.strength };
  };

  WardEnchantment.prototype.getDefenseRating = function () {
    return this.active ? Math.floor(this.strength * 1.5) : 0;
  };

  // --------------------------------------------------------------------===
  // ArcaneTower: Main tower
  // ----------------------------------------------------------------=======
  function ArcaneTower(towerId, name, floors) {
    this.towerId = towerId || ('tower_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Arcane Tower';
    this.floors = floors || 10;
    this.research = {}; // researchId -> SpellResearch
    this.batteries = {}; // batteryId -> ManaBattery
    this.wards = {}; // wardId -> WardEnchantment
    this.totalPower = 0;
  }

  ArcaneTower.prototype.addResearch = function (r) {
    this.research[r.researchId] = r;
    return { success: true, count: Object.keys(this.research).length };
  };

  ArcaneTower.prototype.addBattery = function (b) {
    this.batteries[b.batteryId] = b;
    return { success: true, count: Object.keys(this.batteries).length };
  };

  ArcaneTower.prototype.addWard = function (w) {
    this.wards[w.wardId] = w;
    return { success: true, count: Object.keys(this.wards).length };
  };

  ArcaneTower.prototype.getResearch = function (id) { return this.research[id] || null; };
  ArcaneTower.prototype.getBattery = function (id) { return this.batteries[id] || null; };
  ArcaneTower.prototype.getWard = function (id) { return this.wards[id] || null; };

  ArcaneTower.prototype.calculatePower = function () {
    var total = 0;
    for (var id in this.research) total += this.research[id].getPowerLevel();
    for (var id in this.batteries) total += this.batteries[id].current;
    for (var id in this.wards) total += this.wards[id].getDefenseRating();
    this.totalPower = total;
    return total;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.SpellResearch = SpellResearch;
  window.ManaBattery = ManaBattery;
  window.WardEnchantment = WardEnchantment;
  window.ArcaneTower = ArcaneTower;
})();