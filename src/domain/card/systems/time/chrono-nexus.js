// ============================================================================
// Card Chrono Nexus — V210 Direction A
// Chrono nexus with temporal rifts, time loops, and chrono energy management
// nanobot distributed mesh + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TemporalRift: A rift in time
  // -----------------------------------------------------------------------
  function TemporalRift(riftId, name, era, stability, energy) {
    this.riftId = riftId;
    this.name = name || riftId;
    this.era = era || 'unknown';
    this.stability = stability || 50; // 0-100
    this.energy = energy || 0; // chrono energy stored
    this.active = false;
    this.connectedTo = null;
  }

  TemporalRift.prototype.open = function () {
    if (this.active) return { error: 'already_open' };
    if (this.stability < 20) return { error: 'unstable_rift' };
    this.active = true;
    return { success: true, era: this.era };
  };

  TemporalRift.prototype.close = function () {
    this.active = false;
    this.connectedTo = null;
    return { success: true };
  };

  TemporalRift.prototype.connect = function (otherRiftId) {
    if (!this.active) return { error: 'rift_not_open' };
    this.connectedTo = otherRiftId;
    return { success: true, connectedTo: otherRiftId };
  };

  TemporalRift.prototype.injectEnergy = function (amount) {
    this.energy += amount;
    this.stability = Math.min(100, this.stability + amount * 0.5);
    return { success: true, energy: this.energy, stability: this.stability };
  };

  TemporalRift.prototype.drainEnergy = function (amount) {
    var drained = Math.min(this.energy, amount);
    this.energy -= drained;
    this.stability = Math.max(0, this.stability - drained * 0.3);
    return { drained: drained, energy: this.energy, stability: this.stability };
  };

  // -----------------------------------------------------------------------
  // TimeLoop: A time loop configuration
  // -----------------------------------------------------------------------
  function TimeLoop(loopId, name, iterations, period, effectPower) {
    this.loopId = loopId;
    this.name = name || loopId;
    this.iterations = iterations || 1;
    this.period = period || 10; // turns
    this.effectPower = effectPower || 10;
    this.currentIter = 0;
    this.active = false;
    this.totalTurns = 0;
  }

  TimeLoop.prototype.activate = function () {
    if (this.active) return { error: 'already_active' };
    this.active = true;
    this.currentIter = 1;
    return { success: true, iteration: 1, period: this.period };
  };

  TimeLoop.prototype.tick = function () {
    if (!this.active) return { active: false };
    this.totalTurns++;
    if (this.totalTurns % this.period === 0) {
      this.currentIter++;
      if (this.currentIter > this.iterations) {
        this.active = false;
        return { active: false, completed: true, totalTurns: this.totalTurns };
      }
      return { active: true, iteration: this.currentIter, turns: this.totalTurns };
    }
    return { active: true, iteration: this.currentIter, turns: this.totalTurns };
  };

  TimeLoop.prototype.getProgress = function () {
    return { currentIter: this.currentIter, totalIters: this.iterations, progress: this.currentIter / this.iterations };
  };

  // --------------------------------------------------------------------===
  // ChronoEnergy: Chrono energy management
  // ----------------------------------------------------------------=======
  function ChronoEnergy(energyId, name, capacity, current) {
    this.energyId = energyId || ('ce_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Chrono Energy';
    this.capacity = capacity || 100;
    this.current = current || 0;
    this.chargeRate = 1;
    this.drainRate = 0;
  }

  ChronoEnergy.prototype.charge = function (amount) {
    var added = Math.min(this.capacity - this.current, amount);
    this.current += added;
    return { success: true, current: this.current, added: added };
  };

  ChronoEnergy.prototype.drain = function (amount) {
    var drained = Math.min(this.current, amount);
    this.current -= drained;
    return { drained: drained, current: this.current };
  };

  ChronoEnergy.prototype.setRates = function (charge, drain) {
    this.chargeRate = charge || 0;
    this.drainRate = drain || 0;
    return { chargeRate: this.chargeRate, drainRate: this.drainRate };
  };

  ChronoEnergy.prototype.tick = function () {
    var net = this.chargeRate - this.drainRate;
    this.current = Math.max(0, Math.min(this.capacity, this.current + net));
    return { current: this.current, net: net };
  };

  ChronoEnergy.prototype.getPercent = function () {
    return this.capacity > 0 ? (this.current / this.capacity * 100) : 0;
  };

  // --------------------------------------------------------------------===
  // ChronoNexus: Main nexus controller
  // ----------------------------------------------------------------=======
  function ChronoNexus(nexusId, name, maxRifts) {
    this.nexusId = nexusId || ('nexus_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Chrono Nexus';
    this.rifts = {};
    this.loops = {};
    this.energySources = {};
    this.maxRifts = maxRifts || 20;
    this.nexusPower = 0;
  }

  ChronoNexus.prototype.createRift = function (rift) {
    this.rifts[rift.riftId] = rift;
    return { success: true, count: Object.keys(this.rifts).length };
  };

  ChronoNexus.prototype.registerLoop = function (loop) {
    this.loops[loop.loopId] = loop;
    return { success: true, count: Object.keys(this.loops).length };
  };

  ChronoNexus.prototype.registerEnergy = function (energy) {
    this.energySources[energy.energyId] = energy;
    return { success: true, count: Object.keys(this.energySources).length };
  };

  ChronoNexus.prototype.getRift = function (id) { return this.rifts[id] || null; };
  ChronoNexus.prototype.getLoop = function (id) { return this.loops[id] || null; };
  ChronoNexus.prototype.getEnergy = function (id) { return this.energySources[id] || null; };

  ChronoNexus.prototype.getRiftCount = function () { return Object.keys(this.rifts).length; };
  ChronoNexus.prototype.getLoopCount = function () { return Object.keys(this.loops).length; };

  ChronoNexus.prototype.getTotalPower = function () {
    var total = 0;
    for (var lid in this.loops) {
      if (this.loops[lid].active) total += this.loops[lid].effectPower;
    }
    return total;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.TemporalRift = TemporalRift;
  window.TimeLoop = TimeLoop;
  window.ChronoEnergy = ChronoEnergy;
  window.ChronoNexus = ChronoNexus;
})();