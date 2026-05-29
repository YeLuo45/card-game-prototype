// ============================================================================
// Card Alchemy Lab — V204 Direction E
// Alchemy lab with potions, transmutation, catalysts, and essence extraction
// ruflo hierarchical decomposition + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Potion: A brewed potion
  // -----------------------------------------------------------------------
  function Potion(potionId, name, type, potency, ingredients) {
    this.potionId = potionId;
    this.name = name || potionId;
    this.type = type || 'healing'; // healing, mana, speed, strength, invisible
    this.potency = potency || 1; // 1-5
    this.ingredients = ingredients || [];
    this.brewed = false;
    this.brewTime = 0;
    this.quality = 'normal'; // normal, good, excellent
  }

  Potion.prototype.brew = function (minutes) {
    if (this.brewed) return { error: 'already_brewed' };
    this.brewTime = minutes;
    this.brewed = true;
    var q = 'normal';
    if (this.potency >= 4) q = 'excellent';
    else if (this.potency >= 2) q = 'good';
    this.quality = q;
    return { success: true, quality: this.quality, brewTime: minutes };
  };

  Potion.prototype.getEffect = function () {
    if (!this.brewed) return 0;
    var base = { healing: 50, mana: 40, speed: 30, strength: 60, invisible: 25 };
    var mult = { normal: 1, good: 1.5, excellent: 2 };
    return Math.floor((base[this.type] || 20) * this.potency * (mult[this.quality] || 1));
  };

  // -----------------------------------------------------------------------
  // Catalyst: A catalyst that speeds up reactions
  // -----------------------------------------------------------------------
  function Catalyst(catalystId, name, boost, element) {
    this.catalystId = catalystId;
    this.name = name || catalystId;
    this.boost = boost || 0.2; // 20% speed boost
    this.element = element || 'neutral';
    this.charges = 3;
    this.usedCount = 0;
  }

  Catalyst.prototype.apply = function (potion) {
    if (this.charges <= 0) return { error: 'no_charges' };
    this.charges--;
    this.usedCount++;
    potion.potency = Math.min(5, potion.potency + 1);
    return { success: true, chargesLeft: this.charges, newPotency: potion.potency };
  };

  Catalyst.prototype.recharge = function () {
    this.charges = 3;
    return { success: true, charges: this.charges };
  };

  // -----------------------------------------------------------------------
  // Essence: An extracted essence
  // -----------------------------------------------------------------------
  function Essence(essenceId, name, element, purity, volume) {
    this.essenceId = essenceId;
    this.name = name || essenceId;
    this.element = element || 'neutral'; // fire, water, earth, air, neutral
    this.purity = purity || 0.5; // 0-1
    this.volume = volume || 10; // ml
    this.extracted = false;
  }

  Essence.prototype.extract = function () {
    if (this.extracted) return { error: 'already_extracted' };
    this.extracted = true;
    return { success: true, volume: this.volume, purity: this.purity };
  };

  Essence.prototype.getConcentration = function () {
    return this.extracted ? this.purity * this.volume : 0;
  };

  Essence.prototype.dilute = function (waterAmount) {
    var totalVol = this.volume + waterAmount;
    this.purity = (this.purity * this.volume) / totalVol;
    this.volume = totalVol;
    return { success: true, volume: this.volume, purity: this.purity };
  };

  // -----------------------------------------------------------------------
  // AlchemyLab: Main lab manager
  // -----------------------------------------------------------------------
  function AlchemyLab(labId, name, maxShelves) {
    this.labId = labId || ('lab_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Alchemy Lab';
    this.potions = {}; // potionId -> Potion
    this.catalysts = {};
    this.essences = {};
    this.brewQueue = [];
    this.labLevel = 1;
    this.xp = 0;
    this.maxShelves = maxShelves || 20;
  }

  AlchemyLab.prototype.addPotion = function (potion) {
    this.potions[potion.potionId] = potion;
    return { success: true, count: Object.keys(this.potions).length };
  };

  AlchemyLab.prototype.addCatalyst = function (catalyst) {
    this.catalysts[catalyst.catalystId] = catalyst;
    return { success: true, count: Object.keys(this.catalysts).length };
  };

  AlchemyLab.prototype.addEssence = function (essence) {
    this.essences[essence.essenceId] = essence;
    return { success: true, count: Object.keys(this.essences).length };
  };

  AlchemyLab.prototype.getPotion = function (id) { return this.potions[id] || null; };
  AlchemyLab.prototype.getCatalyst = function (id) { return this.catalysts[id] || null; };
  AlchemyLab.prototype.getEssence = function (id) { return this.essences[id] || null; };

  AlchemyLab.prototype.addXP = function (amount) {
    this.xp += amount;
    var thresholds = [0, 100, 300, 600, 1000];
    var levels = [1, 2, 3, 4, 5];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (this.xp >= thresholds[i]) {
        this.labLevel = levels[i];
        break;
      }
    }
    return { success: true, xp: this.xp, level: this.labLevel };
  };

  AlchemyLab.prototype.getPotionCount = function () { return Object.keys(this.potions).length; };
  AlchemyLab.prototype.getLabLevel = function () { return this.labLevel; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Potion = Potion;
  window.Catalyst = Catalyst;
  window.Essence = Essence;
  window.AlchemyLab = AlchemyLab;
})();