// ============================================================================
// Card Elemental Sanctum — V214 Direction C
// Elemental sanctum with primal essences, resonance, and elemental bonding
// thunderbolt feedback loops + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // PrimalEssence: A primal elemental essence
  // -----------------------------------------------------------------------
  function PrimalEssence(essenceId, name, element, purity, potency) {
    this.essenceId = essenceId;
    this.name = name || essenceId;
    this.element = element || 'neutral'; // fire, water, earth, air, spirit, neutral
    this.purity = purity || 50; // 0-100
    this.potency = potency || 10; // power multiplier
    this.bonded = false;
    this.bondedTo = null;
  }

  PrimalEssence.prototype.purify = function (amount) {
    this.purity = Math.min(100, this.purity + amount);
    return { success: true, purity: this.purity };
  };

  PrimalEssence.prototype.bond = function (targetEssenceId) {
    if (this.bonded) return { error: 'already_bonded' };
    this.bonded = true;
    this.bondedTo = targetEssenceId;
    return { success: true };
  };

  PrimalEssence.prototype.breakBond = function () {
    if (!this.bonded) return { error: 'not_bonded' };
    this.bonded = false;
    var prev = this.bondedTo;
    this.bondedTo = null;
    return { success: true, previous: prev };
  };

  PrimalEssence.prototype.getPower = function () {
    var base = this.potency * (this.purity / 100);
    return this.bonded ? base * 1.5 : base;
  };

  // -----------------------------------------------------------------------
  // ResonanceChain: A chain of resonant essences
  // -----------------------------------------------------------------------
  function ResonanceChain(chainId, name, maxEssences) {
    this.chainId = chainId;
    this.name = name || chainId;
    this.maxEssences = maxEssences || 6;
    this.essences = []; // ordered array of essenceIds
    this.chainPower = 0;
    this.resonanceBonus = 0;
  }

  ResonanceChain.prototype.addEssence = function (essenceId) {
    if (this.essences.length >= this.maxEssences) return { error: 'max_essences' };
    if (this.essences.indexOf(essenceId) !== -1) return { error: 'duplicate_essence' };
    this.essences.push(essenceId);
    return { success: true, count: this.essences.length };
  };

  ResonanceChain.prototype.removeEssence = function (essenceId) {
    var idx = this.essences.indexOf(essenceId);
    if (idx === -1) return { error: 'essence_not_in_chain' };
    this.essences.splice(idx, 1);
    return { success: true, count: this.essences.length };
  };

  ResonanceChain.prototype.calculateResonance = function (essencesMap) {
    // essencesMap: essenceId -> PrimalEssence
    var total = 0;
    var elementCounts = {};
    for (var i = 0; i < this.essences.length; i++) {
      var e = essencesMap[this.essences[i]];
      if (e) { total += e.getPower(); elementCounts[e.element] = (elementCounts[e.element] || 0) + 1; }
    }
    this.chainPower = total;
    // Resonance bonus: if 3+ same element
    var maxCount = 0;
    for (var el in elementCounts) { if (elementCounts[el] > maxCount) maxCount = elementCounts[el]; }
    this.resonanceBonus = maxCount >= 3 ? (maxCount - 2) * 10 : 0;
    return { chainPower: this.chainPower, resonanceBonus: this.resonanceBonus };
  };

  ResonanceChain.prototype.getChainLength = function () { return this.essences.length; };

  // --------------------------------------------------------------------===
  // ElementalSanctum: Main sanctum
  // ----------------------------------------------------------------=======
  function ElementalSanctum(sanctumId, name, maxChains) {
    this.sanctumId = sanctumId || ('sanctum_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Elemental Sanctum';
    this.essences = {};
    this.chains = {};
    this.maxChains = maxChains || 10;
    this.resonanceLevel = 1;
  }

  ElementalSanctum.prototype.registerEssence = function (essence) {
    this.essences[essence.essenceId] = essence;
    return { success: true, count: Object.keys(this.essences).length };
  };

  ElementalSanctum.prototype.createChain = function (chain) {
    this.chains[chain.chainId] = chain;
    return { success: true, count: Object.keys(this.chains).length };
  };

  ElementalSanctum.prototype.getEssence = function (id) { return this.essences[id] || null; };
  ElementalSanctum.prototype.getChain = function (id) { return this.chains[id] || null; };
  ElementalSanctum.prototype.getEssenceCount = function () { return Object.keys(this.essences).length; };
  ElementalSanctum.prototype.getChainCount = function () { return Object.keys(this.chains).length; };

  ElementalSanctum.prototype.getTotalPower = function () {
    var total = 0;
    for (var cid in this.chains) {
      total += this.chains[cid].chainPower + this.chains[cid].resonanceBonus;
    }
    return total;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.PrimalEssence = PrimalEssence;
  window.ResonanceChain = ResonanceChain;
  window.ElementalSanctum = ElementalSanctum;
})();