// ============================================================================
// Card Mana Siphon — V201 Direction B
// Mana siphoning with wells, conduits, flow control, and mana storms
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ManaWell: A mana source well
  // -----------------------------------------------------------------------
  function ManaWell(wellId, name, maxMana, element) {
    this.wellId = wellId;
    this.name = name || wellId;
    this.maxMana = maxMana || 100;
    this.currentMana = maxMana;
    this.element = element || 'neutral'; // fire, water, earth, air, neutral
    this.connected = false;
    this.flowRate = 1; // units per tick
  }

  ManaWell.prototype.siphon = function (amount) {
    var taken = Math.min(this.currentMana, amount);
    this.currentMana -= taken;
    return { success: true, taken: taken, remaining: this.currentMana };
  };

  ManaWell.prototype.fill = function (amount) {
    this.currentMana = Math.min(this.maxMana, this.currentMana + amount);
    return { success: true, current: this.currentMana };
  };

  ManaWell.prototype.connect = function () {
    this.connected = true;
    return { success: true };
  };

  ManaWell.prototype.disconnect = function () {
    this.connected = false;
    return { success: true };
  };

  ManaWell.prototype.getManaPercent = function () {
    return this.maxMana > 0 ? (this.currentMana / this.maxMana * 100) : 0;
  };

  // -----------------------------------------------------------------------
  // ManaConduit: A conduit connecting wells to sinks
  // -----------------------------------------------------------------------
  function ManaConduit(conduitId, name, capacity) {
    this.conduitId = conduitId;
    this.name = name || conduitId;
    this.capacity = capacity || 50;
    this.flow = 0; // current flow amount
    this.active = false;
    this.element = 'neutral';
  }

  ManaConduit.prototype.open = function (flow) {
    this.flow = Math.min(this.capacity, flow || this.capacity);
    this.active = true;
    return { success: true, flow: this.flow };
  };

  ManaConduit.prototype.close = function () {
    this.active = false;
    this.flow = 0;
    return { success: true };
  };

  ManaConduit.prototype.setFlow = function (flow) {
    this.flow = Math.min(this.capacity, Math.max(0, flow));
    return { success: true, flow: this.flow };
  };

  ManaConduit.prototype.getFlowPercent = function () {
    return this.capacity > 0 ? (this.flow / this.capacity * 100) : 0;
  };

  // -----------------------------------------------------------------------
  // ManaSink: A consumer of mana
  // -----------------------------------------------------------------------
  function ManaSink(sinkId, name, maxStorage) {
    this.sinkId = sinkId;
    this.name = name || sinkId;
    this.maxStorage = maxStorage || 100;
    this.storedMana = 0;
    this.consumedTotal = 0;
    this.connected = false;
  }

  ManaSink.prototype.receiveMana = function (amount) {
    var received = Math.min(this.maxStorage - this.storedMana, amount);
    this.storedMana += received;
    this.consumedTotal += received;
    return { success: true, received: received, stored: this.storedMana };
  };

  ManaSink.prototype.consume = function (amount) {
    var consumed = Math.min(this.storedMana, amount);
    this.storedMana -= consumed;
    return { success: true, consumed: consumed };
  };

  ManaSink.prototype.connect = function () { this.connected = true; return { success: true }; };
  ManaSink.prototype.disconnect = function () { this.connected = false; return { success: true }; };

  ManaSink.prototype.getStoredMana = function () { return this.storedMana; };
  ManaSink.prototype.getConsumedTotal = function () { return this.consumedTotal; };
  ManaSink.prototype.getStoragePercent = function () {
    return this.maxStorage > 0 ? (this.storedMana / this.maxStorage * 100) : 0;
  };

  // -----------------------------------------------------------------------
  // ManaStorm: A storm event that boosts mana
  // -----------------------------------------------------------------------
  function ManaStorm(stormId, name, intensity, element) {
    this.stormId = stormId;
    this.name = name || stormId;
    this.intensity = intensity || 1; // 1-5
    this.element = element || 'neutral';
    this.active = false;
    this.duration = 0;
    this.maxDuration = 10;
    this.boostAmount = 0;
  }

  ManaStorm.prototype.activate = function (duration) {
    this.active = true;
    this.duration = duration || this.maxDuration;
    this.boostAmount = this.intensity * 20;
    return { success: true, duration: this.duration, boost: this.boostAmount };
  };

  ManaStorm.prototype.tick = function () {
    if (!this.active) return { active: false };
    this.duration--;
    if (this.duration <= 0) {
      this.active = false;
      return { active: false, ended: true, boost: this.boostAmount };
    }
    return { active: true, remaining: this.duration };
  };

  ManaStorm.prototype.isActive = function () { return this.active; };
  ManaStorm.prototype.getBoost = function () { return this.active ? this.boostAmount : 0; };

  // -----------------------------------------------------------------------
  // ManaNetwork: Manages the entire mana network
  // -----------------------------------------------------------------------
  function ManaNetwork(networkId, name) {
    this.networkId = networkId || ('net_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Mana Network';
    this.wells = {};
    this.conduits = {};
    this.sinks = {};
    this.storms = {};
    this.wellCounter = 0;
    this.conduitCounter = 0;
    this.sinkCounter = 0;
    this.stormCounter = 0;
  }

  ManaNetwork.prototype.addWell = function (well) {
    this.wells[well.wellId] = well;
    return { success: true, count: Object.keys(this.wells).length };
  };

  ManaNetwork.prototype.addConduit = function (conduit) {
    this.conduits[conduit.conduitId] = conduit;
    return { success: true, count: Object.keys(this.conduits).length };
  };

  ManaNetwork.prototype.addSink = function (sink) {
    this.sinks[sink.sinkId] = sink;
    return { success: true, count: Object.keys(this.sinks).length };
  };

  ManaNetwork.prototype.addStorm = function (storm) {
    this.storms[storm.stormId] = storm;
    return { success: true, count: Object.keys(this.storms).length };
  };

  ManaNetwork.prototype.getWell = function (id) { return this.wells[id] || null; };
  ManaNetwork.prototype.getConduit = function (id) { return this.conduits[id] || null; };
  ManaNetwork.prototype.getSink = function (id) { return this.sinks[id] || null; };
  ManaNetwork.prototype.getStorm = function (id) { return this.storms[id] || null; };

  ManaNetwork.prototype.tickStorms = function () {
    var events = [];
    for (var sid in this.storms) {
      var storm = this.storms[sid];
      if (!storm.active) continue;
      var r = storm.tick();
      if (r.ended === true) events.push({ stormId: sid, event: 'ended', boost: r.boost });
    }
    return events;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.ManaWell = ManaWell;
  window.ManaConduit = ManaConduit;
  window.ManaSink = ManaSink;
  window.ManaStorm = ManaStorm;
  window.ManaNetwork = ManaNetwork;
})();