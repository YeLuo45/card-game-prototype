// ============================================================================
// Card Storm Spire — V232 Direction K
// Storm spire with lightning rods, wind channels, and thunder charges
// thunderbolt feedback loops + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // LightningRod: Captures lightning energy
  // -----------------------------------------------------------------------
  function LightningRod(rodId, name, rodHeight, lightningCharge) {
    this.rodId = rodId;
    this.name = name || rodId;
    this.rodHeight = (rodHeight !== undefined) ? rodHeight : 30; // nullish coalescing
    this.lightningCharge = (lightningCharge !== undefined) ? lightningCharge : 0; // nullish coalescing
    this.grounded = false;
    this.discharged = false;
  }

  LightningRod.prototype.absorb = function (chargeAmount) {
    if (this.discharged) return { error: 'already_discharged' };
    this.lightningCharge = Math.min(100, this.lightningCharge + chargeAmount);
    return { success: true, charge: this.lightningCharge };
  };

  LightningRod.prototype.ground = function () {
    if (this.grounded) return { error: 'already_grounded' };
    this.grounded = true;
    return { success: true, grounded: true };
  };

  LightningRod.prototype.discharge = function () {
    if (this.discharged) return { error: 'already_discharged' };
    if (!this.grounded) return { error: 'not_grounded' };
    this.discharged = true;
    return { success: true, power: this.getRodPower() };
  };

  LightningRod.prototype.getRodPower = function () {
    if (!this.discharged) return 0;
    return this.rodHeight * 2 + this.lightningCharge;
  };

  // -----------------------------------------------------------------------
  // WindChannel: Channel for wind energy
  // -----------------------------------------------------------------------
  function WindChannel(chanId, name, channelWidth, windSpeed) {
    this.chanId = chanId;
    this.name = name || chanId;
    this.channelWidth = (channelWidth !== undefined) ? channelWidth : 20; // nullish coalescing
    this.windSpeed = (windSpeed !== undefined) ? windSpeed : 30; // nullish coalescing
    this.open = false;
    this.flowRate = 0;
  }

  WindChannel.prototype.openChannel = function () {
    if (this.open) return { error: 'already_open' };
    this.open = true;
    this.flowRate = this.channelWidth * this.windSpeed / 10;
    return { success: true, flowRate: this.flowRate };
  };

  WindChannel.prototype.closeChannel = function () {
    if (!this.open) return { error: 'not_open' };
    this.open = false;
    this.flowRate = 0;
    return { success: true };
  };

  WindChannel.prototype.getChannelPower = function () {
    return this.open ? this.flowRate : 0;
  };

  // -----------------------------------------------------------------------
  // ThunderCharge: Accumulated thunder charge
  // -----------------------------------------------------------------------
  function ThunderCharge(chargeId, name, chargeCapacity, accumulatedCharge) {
    this.chargeId = chargeId;
    this.name = name || chargeId;
    this.chargeCapacity = (chargeCapacity !== undefined) ? chargeCapacity : 80; // nullish coalescing
    this.accumulatedCharge = (accumulatedCharge !== undefined) ? accumulatedCharge : 0; // nullish coalescing
    this.chargeLevel = 1;
  }

  ThunderCharge.prototype.addCharge = function (amount) {
    this.accumulatedCharge = Math.min(this.chargeCapacity, this.accumulatedCharge + amount);
    this.chargeLevel = Math.min(10, Math.floor(this.accumulatedCharge / 20) + 1);
    return { success: true, charge: this.accumulatedCharge, level: this.chargeLevel };
  };

  ThunderCharge.prototype.release = function (amount) {
    if (this.accumulatedCharge < amount) return { error: 'insufficient_charge' };
    this.accumulatedCharge -= amount;
    return { success: true, released: amount };
  };

  ThunderCharge.prototype.getChargePower = function () {
    return this.accumulatedCharge + this.chargeLevel * 10;
  };

  // -----------------------------------------------------------------------
  // StormSpire: Main spire system
  // -----------------------------------------------------------------------
  function StormSpire(spireId, name, spireRank) {
    this.spireId = spireId;
    this.name = name || 'Storm Spire';
    this.spireRank = spireRank || 1;
    this.rods = {};
    this.channels = {};
    this.charges = {};
  }

  StormSpire.prototype.addRod = function (r) {
    this.rods[r.rodId] = r;
    return { success: true, count: Object.keys(this.rods).length };
  };

  StormSpire.prototype.addChannel = function (c) {
    this.channels[c.chanId] = c;
    return { success: true, count: Object.keys(this.channels).length };
  };

  StormSpire.prototype.addCharge = function (c) {
    this.charges[c.chargeId] = c;
    return { success: true, count: Object.keys(this.charges).length };
  };

  StormSpire.prototype.getSpirePower = function () {
    var total = 0;
    for (var id in this.rods) total += this.rods[id].getRodPower();
    for (var id in this.channels) total += this.channels[id].getChannelPower();
    for (var id in this.charges) total += this.charges[id].getChargePower();
    total += this.spireRank * 25;
    return total;
  };

  window.LightningRod = LightningRod;
  window.WindChannel = WindChannel;
  window.ThunderCharge = ThunderCharge;
  window.StormSpire = StormSpire;
})();