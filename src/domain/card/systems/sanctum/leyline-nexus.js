// ============================================================================
// Card Leyline Nexus — V227 Direction F
// Leyline nexus with ley line channels, mana wells, and energy ley mapping
// claude-code feedback + thunderbolt feedback pipelines
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // LeyLineChannel: A channel connecting ley points
  // -----------------------------------------------------------------------
  function LeyLineChannel(channelId, name, capacity, flowRate) {
    this.channelId = channelId;
    this.name = name || channelId;
    this.capacity = (capacity !== undefined) ? capacity : 40; // nullish coalescing
    this.flowRate = (flowRate !== undefined) ? flowRate : 15; // nullish coalescing
    this.connected = false;
    this.channelFlow = 0;
  }

  LeyLineChannel.prototype.connect = function () {
    if (this.connected) return { error: 'already_connected' };
    this.connected = true;
    this.channelFlow = this.capacity * this.flowRate / 10;
    return { success: true, flow: this.channelFlow };
  };

  LeyLineChannel.prototype.getChannelPower = function () {
    return this.connected ? Math.floor(this.channelFlow) : 0;
  };

  // -----------------------------------------------------------------------
  // ManaWell: A well of accumulated mana
  // -----------------------------------------------------------------------
  function ManaWell(wellId, name, mana, maxMana) {
    this.wellId = wellId;
    this.name = name || wellId;
    this.mana = (mana !== undefined) ? mana : 0; // nullish coalescing
    this.maxMana = maxMana || 200;
    this.wellRadius = 0;
  }

  ManaWell.prototype.fill = function (amount) {
    this.mana = Math.min(this.maxMana, this.mana + amount);
    this.wellRadius = Math.floor(this.mana / 50);
    return { success: true, mana: this.mana, radius: this.wellRadius };
  };

  ManaWell.prototype.drain = function (amount) {
    if (this.mana < amount) return { error: 'insufficient_mana' };
    this.mana -= amount;
    return { success: true, mana: this.mana };
  };

  ManaWell.prototype.getWellPower = function () {
    return this.mana + this.wellRadius * 25;
  };

  // -----------------------------------------------------------------------
  // EnergyLeyMap: Map of ley line energy distribution
  // -----------------------------------------------------------------------
  function EnergyLeyMap(mapId, name, leyDensity, mappedPoints) {
    this.mapId = mapId;
    this.name = name || mapId;
    this.leyDensity = (leyDensity !== undefined) ? leyDensity : 50; // nullish coalescing
    this.mappedPoints = mappedPoints || [];
    this.mapCompleteness = 0;
  }

  EnergyLeyMap.prototype.addPoint = function (x, y, energy) {
    for (var i = 0; i < this.mappedPoints.length; i++) {
      var p = this.mappedPoints[i];
      if (p[0] === x && p[1] === y) return { error: 'point_exists' };
    }
    this.mappedPoints.push([x, y, energy]);
    this.mapCompleteness = Math.min(100, this.mappedPoints.length * 20);
    return { success: true, count: this.mappedPoints.length };
  };

  EnergyLeyMap.prototype.getMapPower = function () {
    return this.leyDensity + this.mapCompleteness + this.mappedPoints.reduce(function (s, p) { return s + p[2]; }, 0);
  };

  // -----------------------------------------------------------------------
  // LeylineNexus: Main nexus system
  // -----------------------------------------------------------------------
  function LeylineNexus(nexusId, name, nexusRank) {
    this.nexusId = nexusId;
    this.name = name || 'Leyline Nexus';
    this.nexusRank = nexusRank || 1;
    this.channels = {};
    this.wells = {};
    this.maps = {};
  }

  LeylineNexus.prototype.addChannel = function (c) {
    this.channels[c.channelId] = c;
    return { success: true, count: Object.keys(this.channels).length };
  };

  LeylineNexus.prototype.addWell = function (w) {
    this.wells[w.wellId] = w;
    return { success: true, count: Object.keys(this.wells).length };
  };

  LeylineNexus.prototype.addMap = function (m) {
    this.maps[m.mapId] = m;
    return { success: true, count: Object.keys(this.maps).length };
  };

  LeylineNexus.prototype.getNexusPower = function () {
    var total = 0;
    for (var id in this.channels) total += this.channels[id].getChannelPower();
    for (var id in this.wells) total += this.wells[id].getWellPower();
    for (var id in this.maps) total += this.maps[id].getMapPower();
    total += this.nexusRank * 20;
    return total;
  };

  window.LeyLineChannel = LeyLineChannel;
  window.ManaWell = ManaWell;
  window.EnergyLeyMap = EnergyLeyMap;
  window.LeylineNexus = LeylineNexus;
})();