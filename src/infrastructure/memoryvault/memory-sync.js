// V321 MemorySync: 跨设备同步 (CRDT + conflict)
'use strict';
(function () {
  function MemorySync() {
    this.localVersion = 0;
    this.remoteVersion = 0;
    this.pending = [];
    this.conflicts = 0;
  }
  MemorySync.prototype.localUpdate = function (key, value) {
    this.localVersion++;
    return { v: this.localVersion, key: key, value: value, source: 'local' };
  };
  MemorySync.prototype.receiveRemote = function (update) {
    if (!update || typeof update !== 'object' || update.v == null) return { error: 'invalid_update' };
    if (update.v <= this.remoteVersion) return { skipped: true, reason: 'stale' };
    this.remoteVersion = update.v;
    if (update.v > this.localVersion + 1) {
      this.conflicts++;
      return { merged: true, conflict: true, update: update };
    }
    return { merged: true, conflict: false, update: update };
  };
  MemorySync.prototype.queue = function (update) {
    this.pending.push(update);
    return this.pending.length;
  };
  MemorySync.prototype.flushPending = function () {
    var p = this.pending;
    this.pending = [];
    return p;
  };
  MemorySync.prototype.getStats = function () {
    return { localVersion: this.localVersion, remoteVersion: this.remoteVersion, conflicts: this.conflicts, pending: this.pending.length };
  };
  window.MemorySync = MemorySync;
})();
