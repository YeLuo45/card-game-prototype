// ============================================================================
// Card Astral Rift — V223 Direction B
// Astral rift with dimensional tears, rift energy, and realm traversal
// chatdev role specialization + thunderbolt feedback pipelines
// ============================================================================
'use strict';

(function () {
  // ----------------------------------------------------------------=======
  // DimensionalTear: A tear in dimensional fabric
  // ----------------------------------------------------------------=======
  function DimensionalTear(tearId, name, stability, energy) {
    this.tearId = tearId;
    this.name = name || tearId;
    this.stability = (stability !== undefined) ? stability : 50; // 0-100, nullish coalescing
    this.energy = energy || 0; // 0-500
    this.linkedRealms = [];
    this.active = false;
  }

  DimensionalTear.prototype.expand = function (amount) {
    if (this.stability < 20) return { error: 'unstable_tear' };
    this.energy += amount;
    this.stability = Math.max(0, this.stability - Math.floor(amount / 50));
    return { success: true, energy: this.energy, stability: this.stability };
  };

  DimensionalTear.prototype.stabilize = function (amount) {
    this.stability = Math.min(100, this.stability + amount);
    return { success: true, stability: this.stability };
  };

  DimensionalTear.prototype.linkRealm = function (realm) {
    if (this.linkedRealms.length >= 3) return { error: 'max_realms' };
    if (this.linkedRealms.indexOf(realm) !== -1) return { error: 'already_linked' };
    this.linkedRealms.push(realm);
    return { success: true, count: this.linkedRealms.length };
  };

  DimensionalTear.prototype.activate = function () {
    if (this.energy < 50) return { error: 'insufficient_energy' };
    if (this.linkedRealms.length < 2) return { error: 'insufficient_links' };
    this.active = true;
    return { success: true, power: this.getTearPower() };
  };

  DimensionalTear.prototype.getTearPower = function () {
    if (!this.active) return 0;
    return Math.floor(this.energy / 10) + this.stability + this.linkedRealms.length * 15;
  };

  // ----------------------------------------------------------------=======
  // RiftEnergy: Accumulated dimensional energy
  // ----------------------------------------------------------------=======
  function RiftEnergy(energyId, name, charge, maxCharge) {
    this.energyId = energyId;
    this.name = name || energyId;
    this.charge = (charge !== undefined) ? charge : 0; // nullish coalescing
    this.maxCharge = maxCharge || 200;
    this.riftResonance = 0;
  }

  RiftEnergy.prototype.absorb = function (amount) {
    this.charge = Math.min(this.maxCharge, this.charge + amount);
    this.riftResonance = Math.floor(this.charge / 40);
    return { success: true, charge: this.charge, resonance: this.riftResonance };
  };

  RiftEnergy.prototype.discharge = function (amount) {
    if (this.charge < amount) return { error: 'insufficient_charge' };
    this.charge -= amount;
    return { success: true, charge: this.charge };
  };

  RiftEnergy.prototype.getEnergyPower = function () {
    return this.charge + this.riftResonance * 25;
  };

  // ----------------------------------------------------------------=======
  // RealmTraversal: Travel between linked realms
  // ----------------------------------------------------------------=======
  function RealmTraversal(traversalId, name, strength, realmPairs) {
    this.traversalId = traversalId;
    this.name = name || traversalId;
    this.strength = (strength !== undefined) ? strength : 60; // nullish coalescing
    this.realmPairs = realmPairs || []; // [[realmA, realmB], ...]
    this.traversals = 0;
  }

  RealmTraversal.prototype.addPair = function (realmA, realmB) {
    if (realmA === realmB) return { error: 'same_realm' };
    var key = [realmA, realmB].sort().join('|');
    for (var i = 0; i < this.realmPairs.length; i++) {
      var k = this.realmPairs[i].sort().join('|');
      if (k === key) return { error: 'pair_exists' };
    }
    this.realmPairs.push([realmA, realmB]);
    return { success: true, count: this.realmPairs.length };
  };

  RealmTraversal.prototype.traverse = function (realmA, realmB) {
    var key = [realmA, realmB].sort().join('|');
    var found = false;
    for (var i = 0; i < this.realmPairs.length; i++) {
      if (this.realmPairs[i].sort().join('|') === key) { found = true; break; }
    }
    if (!found) return { error: 'no_connection' };
    this.traversals++;
    return { success: true, traversals: this.traversals };
  };

  RealmTraversal.prototype.getTraversalPower = function () {
    return this.strength * this.realmPairs.length + this.traversals * 10;
  };

  // ----------------------------------------------------------------=======
  // AstralRift: Main rift system
  // ----------------------------------------------------------------=======
  function AstralRift(riftId, name, riftLevel) {
    this.riftId = riftId;
    this.name = name || 'Astral Rift';
    this.riftLevel = riftLevel || 1;
    this.tears = {};
    this.energies = {};
    this.traversals = {};
  }

  AstralRift.prototype.addTear = function (t) {
    this.tears[t.tearId] = t;
    return { success: true, count: Object.keys(this.tears).length };
  };

  AstralRift.prototype.addEnergy = function (e) {
    this.energies[e.energyId] = e;
    return { success: true, count: Object.keys(this.energies).length };
  };

  AstralRift.prototype.addTraversal = function (t) {
    this.traversals[t.traversalId] = t;
    return { success: true, count: Object.keys(this.traversals).length };
  };

  AstralRift.prototype.getRiftPower = function () {
    var total = 0;
    for (var id in this.tears) total += this.tears[id].getTearPower();
    for (var id in this.energies) total += this.energies[id].getEnergyPower();
    for (var id in this.traversals) total += this.traversals[id].getTraversalPower();
    total += this.riftLevel * 30;
    return total;
  };

  window.DimensionalTear = DimensionalTear;
  window.RiftEnergy = RiftEnergy;
  window.RealmTraversal = RealmTraversal;
  window.AstralRift = AstralRift;
})();