// ============================================================================
// Card Shadow Vault — V217 Direction A
// Shadow vault with dark artifacts, shadow bonds, and void storage
// nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // DarkArtifact: A dark artifact with power and corruption
  // -----------------------------------------------------------------------
  function DarkArtifact(artifactId, name, power, corruption, realm) {
    this.artifactId = artifactId;
    this.name = name || artifactId;
    this.power = power || 10;
    this.corruption = corruption || 0; // 0-100
    this.realm = realm || 'shadow'; // shadow, void, abyss
    this.sealed = true;
    this.boundTo = null;
  }

  DarkArtifact.prototype.unseal = function () {
    if (!this.sealed) return { error: 'already_unsealed' };
    this.sealed = false;
    return { success: true };
  };

  DarkArtifact.prototype.bind = function (ownerId) {
    if (this.boundTo) return { error: 'already_bound' };
    this.boundTo = ownerId;
    return { success: true };
  };

  DarkArtifact.prototype.infuse = function (amount) {
    this.power += amount;
    return { success: true, power: this.power };
  };

  DarkArtifact.prototype.getCorruptionRisk = function () {
    if (this.corruption >= 80) return 'critical';
    if (this.corruption >= 50) return 'high';
    if (this.corruption >= 20) return 'moderate';
    return 'low';
  };

  // --------------------------------------------------------------------===
  // ShadowBond: A bond to a dark artifact
  // ----------------------------------------------------------------=======
  function ShadowBond(bondId, artifactId, ownerId, strength) {
    this.bondId = bondId;
    this.artifactId = artifactId;
    this.ownerId = ownerId;
    this.strength = (strength !== undefined) ? strength : 50; // use nullish coalescing
    this.active = true;
    this.broken = false;
  }

  ShadowBond.prototype.strengthen = function (amount) {
    this.strength = Math.min(100, this.strength + amount);
    return { success: true, strength: this.strength };
  };

  ShadowBond.prototype.break = function () {
    if (this.broken) return { error: 'already_broken' };
    this.broken = true;
    this.active = false;
    return { success: true, previousStrength: this.strength };
  };

  ShadowBond.prototype.isActive = function () {
    return this.active && !this.broken && this.strength > 0;
  };

  // --------------------------------------------------------------------===
  // VoidStorage: Storage for artifacts
  // ----------------------------------------------------------------=======
  function VoidStorage(storageId, name, capacity) {
    this.storageId = storageId;
    this.name = name || storageId;
    this.capacity = capacity || 20;
    this.artifacts = {}; // artifactId -> DarkArtifact
    this.usedSlots = 0;
  }

  VoidStorage.prototype.store = function (artifact) {
    if (this.usedSlots >= this.capacity) return { error: 'storage_full' };
    if (this.artifacts[artifact.artifactId]) return { error: 'artifact_exists' };
    this.artifacts[artifact.artifactId] = artifact;
    this.usedSlots++;
    return { success: true, slots: this.usedSlots };
  };

  VoidStorage.prototype.withdraw = function (artifactId) {
    if (!this.artifacts[artifactId]) return { error: 'artifact_not_found' };
    delete this.artifacts[artifactId];
    this.usedSlots--;
    return { success: true, slots: this.usedSlots };
  };

  VoidStorage.prototype.getArtifact = function (id) { return this.artifacts[id] || null; };
  VoidStorage.prototype.getArtifactCount = function () { return Object.keys(this.artifacts).length; };

  VoidStorage.prototype.findByRealm = function (realm) {
    var result = [];
    for (var id in this.artifacts) { if (this.artifacts[id].realm === realm) result.push(id); }
    return result;
  };

  // --------------------------------------------------------------------===
  // ShadowVault: Main vault
  // ----------------------------------------------------------------=======
  function ShadowVault(vaultId, name, maxBonds) {
    this.vaultId = vaultId || ('vault_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Shadow Vault';
    this.storage = new VoidStorage(vaultId + '_storage', 'Main Storage', 50);
    this.bonds = {}; // bondId -> ShadowBond
    this.maxBonds = maxBonds || 30;
    this.vaultPower = 0;
    this.corruptionLevel = 0;
  }

  ShadowVault.prototype.getBond = function (id) { return this.bonds[id] || null; };
  ShadowVault.prototype.getBondCount = function () { return Object.keys(this.bonds).length; };
  ShadowVault.prototype.getTotalPower = function () { return this.vaultPower; };

  ShadowVault.prototype.createBond = function (bond) {
    if (Object.keys(this.bonds).length >= this.maxBonds) return { error: 'max_bonds' };
    this.bonds[bond.bondId] = bond;
    return { success: true, count: Object.keys(this.bonds).length };
  };

  ShadowVault.prototype.recalculatePower = function () {
    var total = 0;
    for (var id in this.bonds) {
      if (this.bonds[id].isActive()) total += this.bonds[id].strength;
    }
    var storagePower = 0;
    for (var aid in this.storage.artifacts) {
      storagePower += this.storage.artifacts[aid].power;
    }
    this.vaultPower = total + storagePower;
    return this.vaultPower;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.DarkArtifact = DarkArtifact;
  window.ShadowBond = ShadowBond;
  window.VoidStorage = VoidStorage;
  window.ShadowVault = ShadowVault;
})();