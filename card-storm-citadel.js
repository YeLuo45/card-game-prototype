// ============================================================================
// Card Storm Citadel — V220 Direction D
// Storm citadel with lightning rods, wind channels, and thunder invocations
// generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // LightningRod: Collects and channels lightning
  // -----------------------------------------------------------------------
  function LightningRod(rodId, name, capacity, chargeRate) {
    this.rodId = rodId;
    this.name = name || rodId;
    this.capacity = capacity || 100;
    this.charge = 0;
    this.chargeRate = chargeRate || 10;
    this.grounded = false;
    this.linkedChannels = [];
  }

  LightningRod.prototype.collect = function (amount) {
    if (this.grounded) return { error: 'rod_grounded' };
    var collected = Math.min(this.capacity - this.charge, amount);
    this.charge += collected;
    return { success: true, collected: collected, charge: this.charge };
  };

  LightningRod.prototype.discharge = function (amount) {
    if (this.charge < amount) return { error: 'insufficient_charge' };
    this.charge -= amount;
    return { success: true, discharged: amount, remaining: this.charge };
  };

  LightningRod.prototype.ground = function () {
    this.grounded = true;
    this.charge = 0;
    return { success: true };
  };

  LightningRod.prototype.linkChannel = function (channelId) {
    if (this.linkedChannels.indexOf(channelId) !== -1) return { error: 'already_linked' };
    this.linkedChannels.push(channelId);
    return { success: true, channels: this.linkedChannels.length };
  };

  // --------------------------------------------------------------------===
  // WindChannel: Channels wind energy
  // ----------------------------------------------------------------=======
  function WindChannel(channelId, name, strength, direction) {
    this.channelId = channelId;
    this.name = name || channelId;
    this.strength = strength || 30; // 0-100
    this.direction = direction || 'north'; // north, south, east, west, up, down
    this.active = true;
    this.linkedRods = [];
  }

  WindChannel.prototype.boost = function (amount) {
    this.strength = Math.min(100, this.strength + amount);
    return { success: true, strength: this.strength };
  };

  WindChannel.prototype.reverse = function () {
    var opposites = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };
    this.direction = opposites[this.direction] || this.direction;
    return { success: true, direction: this.direction };
  };

  WindChannel.prototype.getFlowRate = function () {
    if (!this.active) return 0;
    return this.strength;
  };

  WindChannel.prototype.linkRod = function (rodId) {
    if (this.linkedRods.indexOf(rodId) !== -1) return { error: 'already_linked' };
    this.linkedRods.push(rodId);
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // ThunderInvocation: A thunder spell invocation
  // ----------------------------------------------------------------=======
  function ThunderInvocation(invocationId, name, power, cooldown, damage) {
    this.invocationId = invocationId;
    this.name = name || invocationId;
    this.power = power || 50;
    this.cooldown = cooldown || 3; // turns until available again
    this.currentCooldown = 0;
    this.damage = damage || 30;
    this.used = false;
  }

  ThunderInvocation.prototype.invoke = function () {
    if (this.currentCooldown > 0) return { error: 'on_cooldown', remaining: this.currentCooldown };
    this.used = true;
    this.currentCooldown = this.cooldown;
    return { success: true, damage: this.damage };
  };

  ThunderInvocation.prototype.tick = function () {
    if (this.currentCooldown > 0) this.currentCooldown--;
  };

  ThunderInvocation.prototype.getEffectivePower = function () {
    var mult = (this.power / 50);
    return Math.floor(this.damage * mult);
  };

  // --------------------------------------------------------------------===
  // StormCitadel: Main citadel
  // ----------------------------------------------------------------=======
  function StormCitadel(citadelId, name, maxRods) {
    this.citadelId = citadelId || ('citadel_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Storm Citadel';
    this.rods = {}; // rodId -> LightningRod
    this.channels = {}; // channelId -> WindChannel
    this.invocations = {}; // invocationId -> ThunderInvocation
    this.maxRods = maxRods || 20;
    this.citadelPower = 0;
  }

  StormCitadel.prototype.addRod = function (rod) {
    this.rods[rod.rodId] = rod;
    return { success: true, count: Object.keys(this.rods).length };
  };

  StormCitadel.prototype.addChannel = function (channel) {
    this.channels[channel.channelId] = channel;
    return { success: true, count: Object.keys(this.channels).length };
  };

  StormCitadel.prototype.addInvocation = function (inv) {
    this.invocations[inv.invocationId] = inv;
    return { success: true, count: Object.keys(this.invocations).length };
  };

  StormCitadel.prototype.getCitadelPower = function () {
    var total = 0;
    for (var id in this.rods) total += this.rods[id].charge;
    for (var id in this.channels) total += this.channels[id].getFlowRate();
    for (var id in this.invocations) total += this.invocations[id].getEffectivePower();
    this.citadelPower = total;
    return total;
  };

  StormCitadel.prototype.getRod = function (id) { return this.rods[id] || null; };
  StormCitadel.prototype.getChannel = function (id) { return this.channels[id] || null; };
  StormCitadel.prototype.getInvocation = function (id) { return this.invocations[id] || null; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.LightningRod = LightningRod;
  window.WindChannel = WindChannel;
  window.ThunderInvocation = ThunderInvocation;
  window.StormCitadel = StormCitadel;
})();