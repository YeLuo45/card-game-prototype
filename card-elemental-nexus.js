// ============================================================================
// Card Elemental Nexus — V231 Direction J
// Elemental nexus with elemental cores, resonance bonds, and catalyst fusion
// claude-code feedback + nanobot mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ElementalCore: Core element with affinity
  // -----------------------------------------------------------------------
  function ElementalCore(coreId, name, elementType, coreStrength) {
    this.coreId = coreId;
    this.name = name || coreId;
    this.elementType = (elementType !== undefined) ? elementType : 'Fire'; // nullish coalescing
    this.coreStrength = (coreStrength !== undefined) ? coreStrength : 50; // nullish coalescing
    this.activated = false;
    this.affinityBonus = 0;
  }

  ElementalCore.prototype.activate = function () {
    if (this.activated) return { error: 'already_activated' };
    this.activated = true;
    this.affinityBonus = Math.floor(this.coreStrength / 10);
    return { success: true, bonus: this.affinityBonus };
  };

  ElementalCore.prototype.getCorePower = function () {
    if (!this.activated) return 0;
    return this.coreStrength + this.affinityBonus * 5;
  };

  // -----------------------------------------------------------------------
  // ResonanceBond: Bond between elemental cores
  // -----------------------------------------------------------------------
  function ResonanceBond(bondId, name, bondStrength, bondedCores) {
    this.bondId = bondId;
    this.name = name || bondId;
    this.bondStrength = (bondStrength !== undefined) ? bondStrength : 40; // nullish coalescing
    this.bondedCores = bondedCores || [];
    this.bondActive = false;
  }

  ResonanceBond.prototype.addCore = function (coreId) {
    for (var i = 0; i < this.bondedCores.length; i++) {
      if (this.bondedCores[i] === coreId) return { error: 'core_already_bonded' };
    }
    this.bondedCores.push(coreId);
    return { success: true, count: this.bondedCores.length };
  };

  ResonanceBond.prototype.form = function () {
    if (this.bondedCores.length < 2) return { error: 'insufficient_cores' };
    this.bondActive = true;
    return { success: true, power: this.getBondPower() };
  };

  ResonanceBond.prototype.getBondPower = function () {
    if (!this.bondActive) return 0;
    return this.bondStrength * this.bondedCores.length;
  };

  // -----------------------------------------------------------------------
  // CatalystFusion: Fusion of catalysts
  // -----------------------------------------------------------------------
  function CatalystFusion(fusionId, name, catalystPurity, fusedCatalysts) {
    this.fusionId = fusionId;
    this.name = name || fusionId;
    this.catalystPurity = (catalystPurity !== undefined) ? catalystPurity : 60; // nullish coalescing
    this.fusedCatalysts = (fusedCatalysts !== undefined) ? fusedCatalysts : 0; // nullish coalescing
    this.fusionActive = false;
    this.fusionPower = 0;
  }

  CatalystFusion.prototype.addCatalyst = function (purity) {
    this.catalystPurity = Math.min(100, (this.catalystPurity + purity) / 2);
    this.fusedCatalysts++;
    this.fusionPower = this.fusedCatalysts * this.catalystPurity;
    return { success: true, purity: this.catalystPurity, catalysts: this.fusedCatalysts };
  };

  CatalystFusion.prototype.getFusionPower = function () {
    if (!this.fusionActive) return 0;
    return this.fusionPower;
  };

  // -----------------------------------------------------------------------
  // ElementalNexus: Main nexus system
  // -----------------------------------------------------------------------
  function ElementalNexus(nexusId, name, nexusRank) {
    this.nexusId = nexusId;
    this.name = name || 'Elemental Nexus';
    this.nexusRank = nexusRank || 1;
    this.cores = {};
    this.bonds = {};
    this.fusions = {};
  }

  ElementalNexus.prototype.addCore = function (c) {
    this.cores[c.coreId] = c;
    return { success: true, count: Object.keys(this.cores).length };
  };

  ElementalNexus.prototype.addBond = function (b) {
    this.bonds[b.bondId] = b;
    return { success: true, count: Object.keys(this.bonds).length };
  };

  ElementalNexus.prototype.addFusion = function (f) {
    this.fusions[f.fusionId] = f;
    return { success: true, count: Object.keys(this.fusions).length };
  };

  ElementalNexus.prototype.getNexusPower = function () {
    var total = 0;
    for (var id in this.cores) total += this.cores[id].getCorePower();
    for (var id in this.bonds) total += this.bonds[id].getBondPower();
    for (var id in this.fusions) total += this.fusions[id].getFusionPower();
    total += this.nexusRank * 20;
    return total;
  };

  window.ElementalCore = ElementalCore;
  window.ResonanceBond = ResonanceBond;
  window.CatalystFusion = CatalystFusion;
  window.ElementalNexus = ElementalNexus;
})();