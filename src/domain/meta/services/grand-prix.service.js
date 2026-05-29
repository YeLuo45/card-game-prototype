// ============================================================================
// Card Grand Prix — V181 Direction B
// Racing-style tournament bracket with circuit tracks and lap counts
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // GPEntry: A racer's performance in a Grand Prix
  // ========================================================================
  function GPEntry(racerId, name, carClass, lapTimes, position) {
    this.racerId = racerId;
    this.name = name || racerId;
    this.carClass = carClass || 'standard'; // standard, sports, super
    this.lapTimes = lapTimes || []; // array of milliseconds
    this.position = position || null;
    this.fastestLap = null;
    this.dnf = false; // did not finish
  }

  GPEntry.prototype.addLapTime = function (ms) {
    this.lapTimes.push(ms);
    if (this.fastestLap === null || ms < this.fastestLap) {
      this.fastestLap = ms;
    }
    return { success: true, fastestLap: this.fastestLap };
  };

  GPEntry.prototype.getTotalTime = function () {
    if (this.dnf || this.lapTimes.length === 0) return null;
    var total = 0;
    for (var i = 0; i < this.lapTimes.length; i++) total += this.lapTimes[i];
    return total;
  };

  GPEntry.prototype.setPosition = function (pos) {
    this.position = pos;
  };

  GPEntry.prototype.markDNF = function () {
    this.dnf = true;
  };

  GPEntry.prototype.getAverageLap = function () {
    if (this.lapTimes.length === 0) return null;
    var total = 0;
    for (var i = 0; i < this.lapTimes.length; i++) total += this.lapTimes[i];
    return total / this.lapTimes.length;
  };

  // --------------------------------------------------------------------===
  // GrandPrix: A single Grand Prix race event
  // ========================================================================
  function GrandPrix(gpId, name, trackName, totalLaps) {
    this.gpId = gpId || ('gp_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Grand Prix ' + this.gpId;
    this.trackName = trackName || 'Unknown Track';
    this.totalLaps = totalLaps || 3;
    this.entries = {}; // racerId -> GPEntry
    this.startedAt = null;
    this.finishedAt = null;
    this.status = 'registered'; // registered, in_progress, completed
  }

  GrandPrix.prototype.registerRacer = function (racerId, name, carClass) {
    if (this.entries[racerId]) return { error: 'already_registered' };
    this.entries[racerId] = new GPEntry(racerId, name, carClass);
    return { success: true, racerCount: Object.keys(this.entries).length };
  };

  GrandPrix.prototype.startRace = function () {
    if (this.status !== 'registered') return { error: 'already_started' };
    this.status = 'in_progress';
    this.startedAt = Date.now();
    return { success: true };
  };

  GrandPrix.prototype.recordLap = function (racerId, lapTimeMs) {
    if (!this.entries[racerId]) return { error: 'racer_not_found' };
    if (this.entries[racerId].dnf) return { error: 'racer_dnf' };
    var r = this.entries[racerId].addLapTime(lapTimeMs);
    return r;
  };

  GrandPrix.prototype.markDNF = function (racerId) {
    if (!this.entries[racerId]) return { error: 'racer_not_found' };
    this.entries[racerId].markDNF();
    return { success: true };
  };

  GrandPrix.prototype.finishRace = function () {
    if (this.status !== 'in_progress') return { error: 'not_in_progress' };
    this.status = 'completed';
    this.finishedAt = Date.now();
    this._sortByPosition();
    return { success: true };
  };

  GrandPrix.prototype._sortByPosition = function () {
    var racers = Object.keys(this.entries).map(function (k) {
      var e = this.entries[k];
      e.racerId = k;
      return e;
    }.bind(this));
    racers.sort(function (a, b) {
      if (a.dnf && !b.dnf) return 1;
      if (!a.dnf && b.dnf) return -1;
      var aTime = a.getTotalTime();
      var bTime = b.getTotalTime();
      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return aTime - bTime;
    });
    for (var i = 0; i < racers.length; i++) {
      this.entries[racers[i].racerId].setPosition(i + 1);
    }
  };

  GrandPrix.prototype.getResults = function () {
    var results = [];
    for (var racerId in this.entries) {
      var e = this.entries[racerId];
      e.racerId = racerId;
      results.push(e);
    }
    results.sort(function (a, b) {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position;
    });
    return results;
  };

  GrandPrix.prototype.getWinner = function () {
    var results = this.getResults();
    for (var i = 0; i < results.length; i++) {
      if (!results[i].dnf && results[i].position === 1) return results[i];
    }
    return null;
  };

  // ----------------------------------------------------------------=======
  // GrandPrixManager: Manages Grand Prix circuits and seasons
  // ========================================================================
  function GrandPrixManager(storageKey) {
    this.storageKey = storageKey || 'grand_prix_manager';
    this._races = {}; // gpId -> GrandPrix
    this._gpIdCounter = 0;
    this._init();
  }

  GrandPrixManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._races).length === 0) {
      this._seedDefault();
    }
  };

  GrandPrixManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._gpIdCounter = data.counter || 0;
        }
      }
    } catch (e) {}
  };

  GrandPrixManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ counter: this._gpIdCounter }));
      }
    } catch (e) {}
  };

  GrandPrixManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[GrandPrixManager] ' + msg);
    }
  };

  GrandPrixManager.prototype._seedDefault = function () {
    var gp = new GrandPrix('gp_default', 'Monaco Grand Prix', 'Monaco Circuit', 3);
    gp.status = 'registered';
    this._races['gp_default'] = gp;
  };

  GrandPrixManager.prototype.createRace = function (name, trackName, totalLaps) {
    var gpId = 'gp_' + (++this._gpIdCounter);
    this._races[gpId] = new GrandPrix(gpId, name, trackName, totalLaps);
    this._save();
    return { success: true, gpId: gpId };
  };

  GrandPrixManager.prototype.getRace = function (gpId) {
    return this._races[gpId] || null;
  };

  GrandPrixManager.prototype.getAllRaces = function () {
    return Object.keys(this._races).map(function (k) { return this._races[k]; }.bind(this));
  };

  GrandPrixManager.prototype.getCompletedRaces = function () {
    return Object.keys(this._races).map(function (k) { return this._races[k]; }.bind(this))
      .filter(function (gp) { return gp.status === 'completed'; });
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.GPEntry = GPEntry;
  window.GrandPrix = GrandPrix;
  window.GrandPrixManager = GrandPrixManager;
})();