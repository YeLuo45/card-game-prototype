// ============================================================================
// Card Necropolis Graveyard — V225 Direction D
// Necropolis graveyard with undead legions, crypt bonds, and death energy
// nanobot distributed mesh + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // ----------------------------------------------------------------=======
  // UndeadLegion: A legion of undead warriors
  // ----------------------------------------------------------------=======
  function UndeadLegion(legionId, name, size, vitality) {
    this.legionId = legionId;
    this.name = name || legionId;
    this.size = (size !== undefined) ? size : 10; // nullish coalescing
    this.vitality = (vitality !== undefined) ? vitality : 50; // nullish coalescing
    this.risen = false;
    this.deaths = 0;
  }

  UndeadLegion.prototype.rise = function () {
    if (this.risen) return { error: 'already_risen' };
    this.risen = true;
    return { success: true, size: this.size };
  };

  UndeadLegion.prototype.fall = function () {
    if (!this.risen) return { error: 'not_yet_risen' };
    this.deaths++;
    this.vitality = Math.max(0, this.vitality - 10);
    return { success: true, deaths: this.deaths, vitality: this.vitality };
  };

  UndeadLegion.prototype.getLegionPower = function () {
    if (!this.risen) return 0;
    return this.size * 5 + this.vitality - this.deaths * 5;
  };

  // ----------------------------------------------------------------=======
  // CryptBond: A bond linking cards to a crypt
  // ----------------------------------------------------------------=======
  function CryptBond(bondId, name, strength, cryptCards) {
    this.bondId = bondId;
    this.name = name || bondId;
    this.strength = (strength !== undefined) ? strength : 60; // nullish coalescing
    this.cryptCards = cryptCards || [];
    this.activated = false;
  }

  CryptBond.prototype.bind = function (cardId) {
    if (this.cryptCards.length >= 8) return { error: 'max_crypt_cards' };
    if (this.cryptCards.indexOf(cardId) !== -1) return { error: 'already_bound' };
    this.cryptCards.push(cardId);
    return { success: true, count: this.cryptCards.length };
  };

  CryptBond.prototype.activate = function () {
    if (this.cryptCards.length < 2) return { error: 'insufficient_cards' };
    this.activated = true;
    return { success: true, power: this.getBondPower() };
  };

  CryptBond.prototype.getBondPower = function () {
    return this.activated ? this.strength * this.cryptCards.length : 0;
  };

  // ----------------------------------------------------------------=======
  // DeathEnergy: Accumulated death energy
  // ----------------------------------------------------------------=======
  function DeathEnergy(energyId, name, energy, maxEnergy) {
    this.energyId = energyId;
    this.name = name || energyId;
    this.energy = (energy !== undefined) ? energy : 0; // nullish coalescing
    this.maxEnergy = maxEnergy || 150;
    this.deathAura = 0;
  }

  DeathEnergy.prototype.harvest = function (amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    this.deathAura = Math.floor(this.energy / 30);
    return { success: true, energy: this.energy, aura: this.deathAura };
  };

  DeathEnergy.prototype.drain = function (amount) {
    if (this.energy < amount) return { error: 'insufficient_energy' };
    this.energy -= amount;
    return { success: true, energy: this.energy };
  };

  DeathEnergy.prototype.getDeathPower = function () {
    return this.energy + this.deathAura * 20;
  };

  // ----------------------------------------------------------------=======
  // NecropolisGraveyard: Main graveyard system
  // ----------------------------------------------------------------=======
  function NecropolisGraveyard(graveId, name, graveRank) {
    this.graveId = graveId;
    this.name = name || 'Necropolis Graveyard';
    this.graveRank = graveRank || 1;
    this.legions = {};
    this.bonds = {};
    this.energies = {};
  }

  NecropolisGraveyard.prototype.addLegion = function (l) {
    this.legions[l.legionId] = l;
    return { success: true, count: Object.keys(this.legions).length };
  };

  NecropolisGraveyard.prototype.addBond = function (b) {
    this.bonds[b.bondId] = b;
    return { success: true, count: Object.keys(this.bonds).length };
  };

  NecropolisGraveyard.prototype.addEnergy = function (e) {
    this.energies[e.energyId] = e;
    return { success: true, count: Object.keys(this.energies).length };
  };

  NecropolisGraveyard.prototype.getGraveyardPower = function () {
    var total = 0;
    for (var id in this.legions) total += this.legions[id].getLegionPower();
    for (var id in this.bonds) total += this.bonds[id].getBondPower();
    for (var id in this.energies) total += this.energies[id].getDeathPower();
    total += this.graveRank * 15;
    return total;
  };

  window.UndeadLegion = UndeadLegion;
  window.CryptBond = CryptBond;
  window.DeathEnergy = DeathEnergy;
  window.NecropolisGraveyard = NecropolisGraveyard;
})();