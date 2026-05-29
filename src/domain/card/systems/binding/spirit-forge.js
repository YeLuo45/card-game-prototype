// ============================================================================
// Card Spirit Forge — V206 Direction B
// Spirit forging with essence binding, soul crafting, and spirit summoning
// chatdev role specialization + generic-agent autonomous goal
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // SoulEssence: A captured soul essence
  // -----------------------------------------------------------------------
  function SoulEssence(essenceId, name, element, power, bound) {
    this.essenceId = essenceId;
    this.name = name || essenceId;
    this.element = element || 'neutral';
    this.power = power || 10; // 1-100
    this.bound = bound || false;
    this.awakened = false;
  }

  SoulEssence.prototype.bind = function () {
    if (this.bound) return { error: 'already_bound' };
    this.bound = true;
    return { success: true };
  };

  SoulEssence.prototype.awaken = function () {
    if (!this.bound) return { error: 'not_bound' };
    if (this.awakened) return { error: 'already_awakened' };
    this.awakened = true;
    return { success: true, element: this.element, power: this.power };
  };

  SoulEssence.prototype.getPower = function () {
    return this.awakened ? this.power : Math.floor(this.power * 0.5);
  };

  SoulEssence.prototype.merge = function (other) {
    if (!this.bound || !other.bound) return { error: 'not_bound' };
    if (this.element !== other.element) return { error: 'element_mismatch' };
    this.power = Math.min(100, this.power + other.power);
    return { success: true, power: this.power };
  };

  // -----------------------------------------------------------------------
  // Spirit: A summoned spirit
  // -----------------------------------------------------------------------
  function Spirit(spiritId, name, essence, level) {
    this.spiritId = spiritId;
    this.name = name || spiritId;
    this.essence = essence; // SoulEssence ref
    this.level = level || 1; // 1-10
    this.loyalty = 50; // 0-100
    this.skills = [];
    this.summonerId = null;
  }

  Spirit.prototype.setLoyalty = function (loyalty) {
    this.loyalty = Math.max(0, Math.min(100, loyalty));
    return { success: true, loyalty: this.loyalty };
  };

  Spirit.prototype.addSkill = function (skill) {
    if (this.skills.indexOf(skill) !== -1) return { error: 'skill_exists' };
    this.skills.push(skill);
    return { success: true, skillCount: this.skills.length };
  };

  Spirit.prototype.getPower = function () {
    var basePower = this.essence ? this.essence.getPower() : 0;
    return Math.floor(basePower * this.level);
  };

  Spirit.prototype.getLoyaltyPercent = function () { return this.loyalty; };

  // -----------------------------------------------------------------------
  // SpiritForge: Main forge manager
  // -----------------------------------------------------------------------
  function SpiritForge(forgeId, name, maxEssences) {
    this.forgeId = forgeId || ('forge_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Spirit Forge';
    this.essences = {}; // essenceId -> SoulEssence
    this.spirits = {};   // spiritId -> Spirit
    this.essenceCounter = 0;
    this.spiritCounter = 0;
    this.maxEssences = maxEssences || 50;
    this.forgeXP = 0;
    this.forgeLevel = 1;
  }

  SpiritForge.prototype.captureEssence = function (essence) {
    if (Object.keys(this.essences).length >= this.maxEssences) return { error: 'storage_full' };
    this.essences[essence.essenceId] = essence;
    return { success: true, count: Object.keys(this.essences).length };
  };

  SpiritForge.prototype.summonSpirit = function (spirit) {
    this.spirits[spirit.spiritId] = spirit;
    return { success: true, count: Object.keys(this.spirits).length };
  };

  SpiritForge.prototype.getEssence = function (id) { return this.essences[id] || null; };
  SpiritForge.prototype.getSpirit = function (id) { return this.spirits[id] || null; };

  SpiritForge.prototype.getEssenceCount = function () { return Object.keys(this.essences).length; };
  SpiritForge.prototype.getSpiritCount = function () { return Object.keys(this.spirits).length; };

  SpiritForge.prototype.addXP = function (amount) {
    this.forgeXP += amount;
    var thresholds = [0, 200, 500, 1000, 2000];
    var levels = [1, 2, 3, 4, 5];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (this.forgeXP >= thresholds[i]) { this.forgeLevel = levels[i]; break; }
    }
    return { success: true, forgeXP: this.forgeXP, forgeLevel: this.forgeLevel };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.SoulEssence = SoulEssence;
  window.Spirit = Spirit;
  window.SpiritForge = SpiritForge;
})();