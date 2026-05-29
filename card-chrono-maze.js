// ============================================================================
// Card Chrono Maze — V191 Direction A
// Time-bending maze with temporal rifts, time-locks and chrono portals
// nanobot distributed mesh + generic-agent autonomous pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TimeRift: A temporal rift in the maze
  // -----------------------------------------------------------------------
  function TimeRift(riftId, name, era, stability, power) {
    this.riftId = riftId;
    this.name = name || 'Rift ' + riftId;
    this.era = era || 'present'; // past, present, future, ancient
    this.stability = stability || 100; // 0-100
    this.power = power || 1;
    this.active = true;
    this.connectedRifts = [];
  }

  TimeRift.prototype.connect = function (targetRift) {
    if (!this.active || !targetRift.active) return { error: 'rift_not_active' };
    if (this.connectedRifts.indexOf(targetRift.riftId) !== -1) return { error: 'already_connected' };
    this.connectedRifts.push(targetRift.riftId);
    targetRift.connectedRifts.push(this.riftId);
    return { success: true, connections: this.connectedRifts.length };
  };

  TimeRift.prototype.destabilize = function (amount) {
    this.stability = Math.max(0, this.stability - amount);
    if (this.stability <= 0) this.active = false;
    return { success: true, stability: this.stability, active: this.active };
  };

  TimeRift.prototype.getStabilityLevel = function () {
    if (this.stability >= 75) return 'stable';
    if (this.stability >= 50) return 'unstable';
    if (this.stability >= 25) return 'dangerous';
    return 'critical';
  };

  // -----------------------------------------------------------------------
  // TimeLock: A locked section of the maze
  // -----------------------------------------------------------------------
  function TimeLock(lockId, name, requiredEra, difficulty, unlocked) {
    this.lockId = lockId;
    this.name = name || 'Lock ' + lockId;
    this.requiredEra = requiredEra || 'present';
    this.difficulty = difficulty || 1;
    this.unlocked = unlocked || false;
    this.unlockAttempts = 0;
  }

  TimeLock.prototype.attemptUnlock = function (era) {
    this.unlockAttempts++;
    if (this.unlocked) return { success: true, already: true };
    if (era === this.requiredEra) {
      this.unlocked = true;
      return { success: true, unlocked: true };
    }
    return { success: false, reason: 'era_mismatch' };
  };

  TimeLock.prototype.getDifficultyRating = function () {
    var mult = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    return this.difficulty * (mult[this.requiredEra] || 1);
  };

  // --------------------------------------------------------------------===
  // ChronoPortal: A portal that warps through time
  // --------------------------------------------------------------------===
  function ChronoPortal(portalId, name, fromEra, toEra, energyCost) {
    this.portalId = portalId;
    this.name = name || 'Portal ' + portalId;
    this.fromEra = fromEra || 'present';
    this.toEra = toEra || 'future';
    this.energyCost = energyCost || 50;
    this.timesUsed = 0;
    this.active = true;
  }

  ChronoPortal.prototype.use = function (availableEnergy) {
    if (!this.active) return { error: 'portal_inactive' };
    if (availableEnergy < this.energyCost) return { error: 'insufficient_energy' };
    this.timesUsed++;
    return { success: true, era: this.toEra, uses: this.timesUsed };
  };

  ChronoPortal.prototype.deactivate = function () {
    this.active = false;
    return { success: true };
  };

  ChronoPortal.prototype.getUsageCount = function () { return this.timesUsed; };

  // --------------------------------------------------------------------===
  // ChronoMaze: The main maze manager
  // --------------------------------------------------------------------===
  function ChronoMaze(mazeId, name) {
    this.mazeId = mazeId || ('maze_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Chrono Maze';
    this.rifts = {};
    this.locks = {};
    this.portals = {};
    this.currentEra = 'present';
    this.riftCounter = 0;
    this.lockCounter = 0;
    this.portalCounter = 0;
    this._seedDefault();
  }

  ChronoMaze.prototype._seedDefault = function () {
    var rift = new TimeRift('rift_default', 'Ancient Rift', 'ancient', 80, 10);
    this.rifts['rift_default'] = rift;
    var lock = new TimeLock('lock_default', 'Present Lock', 'present', 1, true);
    this.locks['lock_default'] = lock;
    var portal = new ChronoPortal('portal_default', 'Time Portal', 'present', 'future', 30);
    this.portals['portal_default'] = portal;
  };

  ChronoMaze.prototype.addRift = function (rift) {
    this.rifts[rift.riftId] = rift;
    return { success: true, riftCount: Object.keys(this.rifts).length };
  };

  ChronoMaze.prototype.addLock = function (lock) {
    this.locks[lock.lockId] = lock;
    return { success: true, lockCount: Object.keys(this.locks).length };
  };

  ChronoMaze.prototype.addPortal = function (portal) {
    this.portals[portal.portalId] = portal;
    return { success: true, portalCount: Object.keys(this.portals).length };
  };

  ChronoMaze.prototype.getRift = function (riftId) { return this.rifts[riftId] || null; };
  ChronoMaze.prototype.getLock = function (lockId) { return this.locks[lockId] || null; };
  ChronoMaze.prototype.getPortal = function (portalId) { return this.portals[portalId] || null; };

  ChronoMaze.prototype.shiftEra = function (era) {
    var validEras = ['past', 'present', 'future', 'ancient'];
    if (validEras.indexOf(era) === -1) return { error: 'invalid_era' };
    this.currentEra = era;
    return { success: true, era: this.currentEra };
  };

  ChronoMaze.prototype.getAllRifts = function () {
    return Object.keys(this.rifts).map(function (k) { return this.rifts[k]; }.bind(this));
  };

  // --------------------------------------------------------------------===
  // Exports
  // --------------------------------------------------------------------===
  window.TimeRift = TimeRift;
  window.TimeLock = TimeLock;
  window.ChronoPortal = ChronoPortal;
  window.ChronoMaze = ChronoMaze;
})();