// ============================================================================
// Card Void Sanctum — V228 Direction G
// Void sanctum with void rifts, shadow realms, and void echo absorption
// nanobot distributed mesh + generic-agent autonomous pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // VoidRift: A tear in void fabric
  // -----------------------------------------------------------------------
  function VoidRift(riftId, name, voidDepth, stability) {
    this.riftId = riftId;
    this.name = name || riftId;
    this.voidDepth = (voidDepth !== undefined) ? voidDepth : 30; // nullish coalescing
    this.stability = (stability !== undefined) ? stability : 50; // nullish coalescing
    this.absorbed = 0;
    this.riftActive = false;
  }

  VoidRift.prototype.absorb = function (amount) {
    if (this.riftActive) return { error: 'already_active' };
    this.absorbed += amount;
    this.stability = Math.max(0, this.stability - Math.floor(amount / 20));
    return { success: true, absorbed: this.absorbed, stability: this.stability };
  };

  VoidRift.prototype.open = function () {
    if (this.absorbed < 20) return { error: 'insufficient_absorbed' };
    this.riftActive = true;
    return { success: true, power: this.getRiftPower() };
  };

  VoidRift.prototype.getRiftPower = function () {
    return this.riftActive ? this.voidDepth * 2 + this.absorbed : 0;
  };

  // -----------------------------------------------------------------------
  // ShadowRealm: A realm of shadow
  // -----------------------------------------------------------------------
  function ShadowRealm(realmId, name, shadowDensity, realmPortals) {
    this.realmId = realmId;
    this.name = name || realmId;
    this.shadowDensity = (shadowDensity !== undefined) ? shadowDensity : 40; // nullish coalescing
    this.realmPortals = realmPortals || [];
    this.realmLevel = 1;
  }

  ShadowRealm.prototype.addPortal = function (portalId) {
    for (var i = 0; i < this.realmPortals.length; i++) {
      if (this.realmPortals[i] === portalId) return { error: 'portal_exists' };
    }
    this.realmPortals.push(portalId);
    this.realmLevel = Math.min(10, this.realmPortals.length);
    return { success: true, level: this.realmLevel };
  };

  ShadowRealm.prototype.getRealmPower = function () {
    return this.shadowDensity * this.realmLevel + this.realmPortals.length * 10;
  };

  // -----------------------------------------------------------------------
  // VoidEchoAbsorber: Absorb void echoes for power
  // -----------------------------------------------------------------------
  function VoidEchoAbsorber(absId, name, echoCapacity, absorbedEchoes) {
    this.absId = absId;
    this.name = name || absId;
    this.echoCapacity = (echoCapacity !== undefined) ? echoCapacity : 60; // nullish coalescing
    this.absorbedEchoes = (absorbedEchoes !== undefined) ? absorbedEchoes : []; // nullish coalescing
    this.absorberPower = 0;
  }

  VoidEchoAbsorber.prototype.absorbEcho = function (echoStrength) {
    if (this.absorbedEchoes.length >= this.echoCapacity) return { error: 'capacity_full' };
    this.absorbedEchoes.push(echoStrength);
    this.absorberPower = this.absorbedEchoes.reduce(function (s, e) { return s + e; }, 0);
    return { success: true, power: this.absorberPower };
  };

  VoidEchoAbsorber.prototype.getAbsorberPower = function () {
    return this.absorberPower;
  };

  // -----------------------------------------------------------------------
  // VoidSanctum: Main sanctum system
  // -----------------------------------------------------------------------
  function VoidSanctum(sanctumId, name, sanctumRank) {
    this.sanctumId = sanctumId;
    this.name = name || 'Void Sanctum';
    this.sanctumRank = sanctumRank || 1;
    this.rifts = {};
    this.realms = {};
    this.absorbers = {};
  }

  VoidSanctum.prototype.addRift = function (r) {
    this.rifts[r.riftId] = r;
    return { success: true, count: Object.keys(this.rifts).length };
  };

  VoidSanctum.prototype.addRealm = function (r) {
    this.realms[r.realmId] = r;
    return { success: true, count: Object.keys(this.realms).length };
  };

  VoidSanctum.prototype.addAbsorber = function (a) {
    this.absorbers[a.absId] = a;
    return { success: true, count: Object.keys(this.absorbers).length };
  };

  VoidSanctum.prototype.getSanctumPower = function () {
    var total = 0;
    for (var id in this.rifts) total += this.rifts[id].getRiftPower();
    for (var id in this.realms) total += this.realms[id].getRealmPower();
    for (var id in this.absorbers) total += this.absorbers[id].getAbsorberPower();
    total += this.sanctumRank * 15;
    return total;
  };

  window.VoidRift = VoidRift;
  window.ShadowRealm = ShadowRealm;
  window.VoidEchoAbsorber = VoidEchoAbsorber;
  window.VoidSanctum = VoidSanctum;
})();