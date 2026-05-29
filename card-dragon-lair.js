// ============================================================================
// Card Dragon Lair — V234 Direction M
// Dragon lair with hoard treasures, wyrm bonds, and flame forges
// nanobot distributed + thunderbolt feedback
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // HoardTreasure: A dragon's hoard
  // -----------------------------------------------------------------------
  function HoardTreasure(tid, name, treasureValue, rarity) {
    this.tid = tid; this.name = name || tid;
    this.treasureValue = (treasureValue !== undefined) ? treasureValue : 50;
    this.rarity = (rarity !== undefined) ? rarity : 3;
    this.appraised = false;
  }
  HoardTreasure.prototype.appraise = function () {
    if (this.appraised) return { error: 'already_appraised' };
    this.appraised = true;
    return { success: true, value: this.treasureValue * this.rarity };
  };
  HoardTreasure.prototype.getTreasurePower = function () {
    if (!this.appraised) return 0;
    return this.treasureValue * this.rarity;
  };

  // -----------------------------------------------------------------------
  // WyrmBond: Bond with a dragon
  // -----------------------------------------------------------------------
  function WyrmBond(bid, name, bondStrength, dragonAge) {
    this.bid = bid; this.name = name || bid;
    this.bondStrength = (bondStrength !== undefined) ? bondStrength : 40;
    this.dragonAge = (dragonAge !== undefined) ? dragonAge : 100;
    this.bonded = false;
  }
  WyrmBond.prototype.bind = function () {
    if (this.bonded) return { error: 'already_bonded' };
    this.bonded = true;
    return { success: true, power: this.getBondPower() };
  };
  WyrmBond.prototype.getBondPower = function () {
    if (!this.bonded) return 0;
    return this.bondStrength + Math.floor(this.dragonAge / 10);
  };

  // -----------------------------------------------------------------------
  // FlameForge: Forge powered by dragon fire
  // -----------------------------------------------------------------------
  function FlameForge(fid, name, forgeHeat, fuelLevel) {
    this.fid = fid; this.name = name || fid;
    this.forgeHeat = (forgeHeat !== undefined) ? forgeHeat : 60;
    this.fuelLevel = (fuelLevel !== undefined) ? fuelLevel : 30;
    this.forgeActive = false;
  }
  FlameForge.prototype.stoke = function (fuel) {
    if (this.forgeActive) return { error: 'forge_active' };
    this.fuelLevel = Math.min(100, this.fuelLevel + fuel);
    this.forgeHeat = Math.min(100, this.forgeHeat + Math.floor(fuel / 10));
    return { success: true, heat: this.forgeHeat, fuel: this.fuelLevel };
  };
  FlameForge.prototype.ignite = function () {
    if (this.fuelLevel < 50) return { error: 'insufficient_fuel' };
    this.forgeActive = true;
    return { success: true, power: this.getForgePower() };
  };
  FlameForge.prototype.getForgePower = function () {
    if (!this.forgeActive) return 0;
    return this.forgeHeat + this.fuelLevel;
  };

  // -----------------------------------------------------------------------
  // DragonLair: Main lair system
  // -----------------------------------------------------------------------
  function DragonLair(lid, name, lairRank) {
    this.lid = lid; this.name = name || 'Dragon Lair';
    this.lairRank = lairRank || 1;
    this.treasures = {}; this.bonds = {}; this.forges = {};
  }
  DragonLair.prototype.addTreasure = function (t) { this.treasures[t.tid] = t; return { success: true }; };
  DragonLair.prototype.addBond = function (b) { this.bonds[b.bid] = b; return { success: true }; };
  DragonLair.prototype.addForge = function (f) { this.forges[f.fid] = f; return { success: true }; };
  DragonLair.prototype.getLairPower = function () {
    var total = 0;
    for (var id in this.treasures) total += this.treasures[id].getTreasurePower();
    for (var id in this.bonds) total += this.bonds[id].getBondPower();
    for (var id in this.forges) total += this.forges[id].getForgePower();
    total += this.lairRank * 20;
    return total;
  };

  window.HoardTreasure = HoardTreasure;
  window.WyrmBond = WyrmBond;
  window.FlameForge = FlameForge;
  window.DragonLair = DragonLair;
})();