// ============================================================================
// Card Void Realm — V194 Direction D
// Void realm with shadow mechanics, void energy, and dimensional rifts
// generic-agent + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ShadowMechanic: Shadow state and behavior
  // -----------------------------------------------------------------------
  function ShadowMechanic(mechanicId, name, shadowLevel, influence, source) {
    this.mechanicId = mechanicId;
    this.name = name || mechanicId;
    this.shadowLevel = shadowLevel || 0; // 0-100
    this.influence = influence || 1;
    this.source = source || 'unknown'; // void, dark, eclipse, abyssal
  }

  ShadowMechanic.prototype.amplify = function (amount) {
    this.shadowLevel = Math.min(100, this.shadowLevel + amount);
    this.influence *= 1 + (amount / 100);
    return { success: true, shadowLevel: this.shadowLevel, influence: this.influence };
  };

  ShadowMechanic.prototype.dim = function (amount) {
    this.shadowLevel = Math.max(0, this.shadowLevel - amount);
    this.influence = Math.max(1, this.influence - (amount / 100));
    return { success: true, shadowLevel: this.shadowLevel, influence: this.influence };
  };

  ShadowMechanic.prototype.isFullyShadowed = function () {
    return this.shadowLevel >= 80;
  };

  ShadowMechanic.prototype.getShadowCategory = function () {
    if (this.shadowLevel >= 80) return 'deep_shadow';
    if (this.shadowLevel >= 50) return 'mid_shadow';
    if (this.shadowLevel >= 20) return 'light_shadow';
    return 'dawn';
  };

  // -----------------------------------------------------------------------
  // VoidEnergy: Energy from the void
  // -----------------------------------------------------------------------
  function VoidEnergy(energyId, name, polarity, intensity, capacity) {
    this.energyId = energyId;
    this.name = name || energyId;
    this.polarity = polarity || 'neutral'; // negative, positive, neutral
    this.intensity = intensity || 50; // 0-100
    this.capacity = capacity || 100;
  }

  VoidEnergy.prototype.absorb = function (amount) {
    this.intensity = Math.min(this.capacity, this.intensity + amount);
    return { success: true, intensity: this.intensity };
  };

  VoidEnergy.prototype.release = function (amount) {
    var released = Math.min(this.intensity, amount);
    this.intensity = Math.max(0, this.intensity - released);
    return { success: true, released: released, remaining: this.intensity };
  };

  VoidEnergy.prototype.getPolarityEffect = function (targetPolarity) {
    if (this.polarity === targetPolarity) return 1.5;
    if (this.polarity === 'neutral' || targetPolarity === 'neutral') return 1;
    return 0.5;
  };

  // -----------------------------------------------------------------------
  // DimensionalRift: A rift between dimensions
  // -----------------------------------------------------------------------
  function DimensionalRift(riftId, name, depth, stability, connectedRealm) {
    this.riftId = riftId;
    this.name = name || 'Rift ' + riftId;
    this.depth = depth || 1;
    this.stability = stability || 50;
    this.connectedRealm = connectedRealm || null;
    this.active = true;
    this.uses = 0;
  }

  DimensionalRift.prototype.traverse = function () {
    if (!this.active) return { error: 'rift_inactive' };
    if (this.stability < 20) return { error: 'rift_unstable' };
    this.uses++;
    return { success: true, realm: this.connectedRealm, depth: this.depth, uses: this.uses };
  };

  DimensionalRift.prototype.collapse = function () {
    this.active = false;
    return { success: true };
  };

  DimensionalRift.prototype.getStabilityRating = function () {
    if (this.stability >= 70) return 'stable';
    if (this.stability >= 40) return 'moderate';
    if (this.stability >= 20) return 'unstable';
    return 'critical';
  };

  // -----------------------------------------------------------------------
  // VoidRealmManager: Manages the void realm
  // -----------------------------------------------------------------------
  function VoidRealmManager(realmId, name) {
    this.realmId = realmId || ('realm_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Void Realm';
    this.mechanics = {};
    this.energySources = {};
    this.rifts = {};
    this.mechanicCounter = 0;
    this.energyCounter = 0;
    this.riftCounter = 0;
    this._seedDefault();
  }

  VoidRealmManager.prototype._seedDefault = function () {
    var m = new ShadowMechanic('mech_default', 'Deep Shadow', 60, 2, 'void');
    this.mechanics['mech_default'] = m;
    var e = new VoidEnergy('energy_default', 'Void Core', 'negative', 80, 100);
    this.energySources['energy_default'] = e;
    var r = new DimensionalRift('rift_default', 'Abyss Rift', 5, 70, 'shadow_realm');
    this.rifts['rift_default'] = r;
  };

  VoidRealmManager.prototype.addMechanic = function (mechanic) {
    this.mechanics[mechanic.mechanicId] = mechanic;
    return { success: true, count: Object.keys(this.mechanics).length };
  };

  VoidRealmManager.prototype.addEnergySource = function (source) {
    this.energySources[source.energyId] = source;
    return { success: true, count: Object.keys(this.energySources).length };
  };

  VoidRealmManager.prototype.addRift = function (rift) {
    this.rifts[rift.riftId] = rift;
    return { success: true, count: Object.keys(this.rifts).length };
  };

  VoidRealmManager.prototype.getMechanic = function (id) { return this.mechanics[id] || null; };
  VoidRealmManager.prototype.getEnergySource = function (id) { return this.energySources[id] || null; };
  VoidRealmManager.prototype.getRift = function (id) { return this.rifts[id] || null; };

  VoidRealmManager.prototype.getAllRifts = function () {
    return Object.keys(this.rifts).map(function (k) { return this.rifts[k]; }.bind(this));
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.ShadowMechanic = ShadowMechanic;
  window.VoidEnergy = VoidEnergy;
  window.DimensionalRift = DimensionalRift;
  window.VoidRealmManager = VoidRealmManager;
})();