// ============================================================================
// Card Void Nexus — V212 Direction A
// Void nexus with dark matter, void portals, and entropy management
// nanobot distributed mesh + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // DarkMatter: Dark matter particle
  // -----------------------------------------------------------------------
  function DarkMatter(matterId, name, mass, stability) {
    this.matterId = matterId;
    this.name = name || matterId;
    this.mass = mass || 10;
    this.stability = stability || 50; // 0-100
    this.energy = 0;
    this.phase = 'solid'; // solid, liquid, plasma
    this.decayed = false;
  }

  DarkMatter.prototype.extract = function (amount) {
    if (this.decayed) return { error: 'matter_decayed' };
    var extracted = Math.min(this.mass, amount);
    this.mass -= extracted;
    this.energy += extracted * 2;
    if (this.mass <= 0) this.decayed = true;
    return { success: true, extracted: extracted, mass: this.mass, energy: this.energy };
  };

  DarkMatter.prototype.decay = function () {
    if (this.decayed) return { error: 'already_decayed' };
    this.decayed = true;
    this.mass = 0;
    this.energy = 0;
    return { success: true };
  };

  DarkMatter.prototype.getEnergy = function () {
    return this.decayed ? 0 : this.energy;
  };

  // -----------------------------------------------------------------------
  // VoidPortal: A portal to the void
  // -----------------------------------------------------------------------
  function VoidPortal(portalId, name, stability, capacity) {
    this.portalId = portalId;
    this.name = name || portalId;
    this.stability = stability || 50;
    this.capacity = capacity || 100;
    this.linkedTo = null;
    this.active = false;
    this.entropy = 0;
  }

  VoidPortal.prototype.open = function () {
    if (this.active) return { error: 'already_open' };
    if (this.stability < 10) return { error: 'unstable_portal' };
    this.active = true;
    return { success: true };
  };

  VoidPortal.prototype.link = function (otherPortalId) {
    if (!this.active) return { error: 'portal_not_open' };
    this.linkedTo = otherPortalId;
    return { success: true, linkedTo: otherPortalId };
  };

  VoidPortal.prototype.addEntropy = function (amount) {
    this.entropy = Math.min(100, this.entropy + amount);
    this.stability = Math.max(0, this.stability - amount * 0.2);
    return { entropy: this.entropy, stability: this.stability };
  };

  VoidPortal.prototype.close = function () {
    this.active = false;
    this.linkedTo = null;
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // VoidCore: Central void controller
  // ----------------------------------------------------------------=======
  function VoidCore(coreId, name, maxPortals) {
    this.coreId = coreId || ('core_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Void Core';
    this.portals = {};
    this.matter = {};
    this.maxPortals = maxPortals || 15;
    this.coreEnergy = 0;
    this.entropyThreshold = 80;
  }

  VoidCore.prototype.createPortal = function (portal) {
    this.portals[portal.portalId] = portal;
    return { success: true, count: Object.keys(this.portals).length };
  };

  VoidCore.prototype.registerMatter = function (matter) {
    this.matter[matter.matterId] = matter;
    return { success: true, count: Object.keys(this.matter).length };
  };

  VoidCore.prototype.getPortal = function (id) { return this.portals[id] || null; };
  VoidCore.prototype.getMatter = function (id) { return this.matter[id] || null; };
  VoidCore.prototype.getPortalCount = function () { return Object.keys(this.portals).length; };
  VoidCore.prototype.getMatterCount = function () { return Object.keys(this.matter).length; };

  VoidCore.prototype.getCoreEnergy = function () {
    var total = 0;
    for (var mid in this.matter) total += this.matter[mid].getEnergy();
    return total;
  };

  VoidCore.prototype.checkEntropy = function () {
    var total = 0;
    for (var pid in this.portals) total += this.portals[pid].entropy;
    var avg = Object.keys(this.portals).length > 0 ? total / Object.keys(this.portals).length : 0;
    return { total: total, average: avg, threshold: this.entropyThreshold, critical: avg >= this.entropyThreshold };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.DarkMatter = DarkMatter;
  window.VoidPortal = VoidPortal;
  window.VoidCore = VoidCore;
})();