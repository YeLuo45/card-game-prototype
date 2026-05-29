// ============================================================================
// Card Spirit Conclave — V229 Direction H
// Spirit conclave with spirit communion, ancestral memories, and spirit totems
// ruflo hierarchical decomposition + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // SpiritCommunion: A communion of spirits
  // -----------------------------------------------------------------------
  function SpiritCommunion(commId, name, communionSize, spiritHarmony) {
    this.commId = commId;
    this.name = name || commId;
    this.communionSize = (communionSize !== undefined) ? communionSize : 6; // nullish coalescing
    this.spiritHarmony = (spiritHarmony !== undefined) ? spiritHarmony : 50; // nullish coalescing
    this.joinedSpirits = [];
    this.communionActive = false;
  }

  SpiritCommunion.prototype.join = function (spiritId) {
    for (var i = 0; i < this.joinedSpirits.length; i++) {
      if (this.joinedSpirits[i] === spiritId) return { error: 'already_joined' };
    }
    if (this.joinedSpirits.length >= this.communionSize) return { error: 'communion_full' };
    this.joinedSpirits.push(spiritId);
    return { success: true, count: this.joinedSpirits.length };
  };

  SpiritCommunion.prototype.activate = function () {
    if (this.joinedSpirits.length < 3) return { error: 'insufficient_spirits' };
    this.communionActive = true;
    return { success: true, power: this.getCommunionPower() };
  };

  SpiritCommunion.prototype.getCommunionPower = function () {
    if (!this.communionActive) return 0;
    return this.joinedSpirits.length * this.spiritHarmony;
  };

  // -----------------------------------------------------------------------
  // AncestralMemory: Memory inherited from ancestors
  // -----------------------------------------------------------------------
  function AncestralMemory(memId, name, memoryStrength, generation) {
    this.memId = memId;
    this.name = name || memId;
    this.memoryStrength = (memoryStrength !== undefined) ? memoryStrength : 40; // nullish coalescing
    this.generation = (generation !== undefined) ? generation : 1; // nullish coalescing
    this.inherited = false;
    this.inheritanceCount = 0;
  }

  AncestralMemory.prototype.inherit = function () {
    this.inherited = true;
    this.inheritanceCount++;
    this.memoryStrength = Math.min(100, this.memoryStrength + 5);
    return { success: true, strength: this.memoryStrength };
  };

  AncestralMemory.prototype.getMemoryPower = function () {
    if (!this.inherited) return 0;
    return this.memoryStrength * this.generation;
  };

  // -----------------------------------------------------------------------
  // SpiritTotem: A totem channeling spirit energy
  // -----------------------------------------------------------------------
  function SpiritTotem(totemId, name, totemPower, channeledEnergy) {
    this.totemId = totemId;
    this.name = name || totemId;
    this.totemPower = (totemPower !== undefined) ? totemPower : 30; // nullish coalescing
    this.channeledEnergy = (channeledEnergy !== undefined) ? channeledEnergy : 0; // nullish coalescing
    this.totemActive = false;
  }

  SpiritTotem.prototype.channel = function (amount) {
    if (this.totemActive) return { error: 'totem_already_active' };
    this.channeledEnergy += amount;
    this.totemPower = Math.min(100, this.totemPower + Math.floor(amount / 20));
    return { success: true, energy: this.channeledEnergy, power: this.totemPower };
  };

  SpiritTotem.prototype.activate = function () {
    if (this.channeledEnergy < 30) return { error: 'insufficient_energy' };
    this.totemActive = true;
    return { success: true, power: this.getTotemPower() };
  };

  SpiritTotem.prototype.getTotemPower = function () {
    return this.totemActive ? this.totemPower * 3 + this.channeledEnergy : 0;
  };

  // -----------------------------------------------------------------------
  // SpiritConclave: Main conclave system
  // -----------------------------------------------------------------------
  function SpiritConclave(conclaveId, name, conclaveRank) {
    this.conclaveId = conclaveId;
    this.name = name || 'Spirit Conclave';
    this.conclaveRank = conclaveRank || 1;
    this.communion = null;
    this.memories = {};
    this.totems = {};
  }

  SpiritConclave.prototype.setCommunion = function (c) {
    this.communion = c;
    return { success: true };
  };

  SpiritConclave.prototype.addMemory = function (m) {
    this.memories[m.memId] = m;
    return { success: true, count: Object.keys(this.memories).length };
  };

  SpiritConclave.prototype.addTotem = function (t) {
    this.totems[t.totemId] = t;
    return { success: true, count: Object.keys(this.totems).length };
  };

  SpiritConclave.prototype.getConclavePower = function () {
    var total = 0;
    if (this.communion) total += this.communion.getCommunionPower();
    for (var id in this.memories) total += this.memories[id].getMemoryPower();
    for (var id in this.totems) total += this.totems[id].getTotemPower();
    total += this.conclaveRank * 25;
    return total;
  };

  window.SpiritCommunion = SpiritCommunion;
  window.AncestralMemory = AncestralMemory;
  window.SpiritTotem = SpiritTotem;
  window.SpiritConclave = SpiritConclave;
})();