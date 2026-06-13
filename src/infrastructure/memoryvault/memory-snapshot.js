// V316 MemorySnapshot: 状态快照
'use strict';
(function () {
  function MemorySnapshot(options) {
    this.snapshots = [];
    this.maxSnapshots = (options && options.maxSnapshots) || 50;
  }
  MemorySnapshot.prototype.capture = function (state, label) {
    var snap = {
      id: 'snap_' + Date.now() + '_' + this.snapshots.length,
      at: Date.now(),
      label: label || 'auto',
      state: JSON.parse(JSON.stringify(state || {}))
    };
    this.snapshots.push(snap);
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
    return snap;
  };
  MemorySnapshot.prototype.restore = function (snapId) {
    for (var i = 0; i < this.snapshots.length; i++) {
      if (this.snapshots[i].id === snapId) return JSON.parse(JSON.stringify(this.snapshots[i].state));
    }
    return null;
  };
  MemorySnapshot.prototype.diff = function (aId, bId) {
    var a = this.restore(aId);
    var b = this.restore(bId);
    if (!a || !b) return null;
    var changes = { added: [], removed: [], changed: [] };
    for (var k in b) {
      if (!Object.prototype.hasOwnProperty.call(a, k)) changes.added.push(k);
      else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changes.changed.push(k);
    }
    for (var k2 in a) {
      if (!Object.prototype.hasOwnProperty.call(b, k2)) changes.removed.push(k2);
    }
    return changes;
  };
  MemorySnapshot.prototype.list = function () {
    return this.snapshots.map(function (s) { return { id: s.id, label: s.label, at: s.at }; });
  };
  MemorySnapshot.prototype.delete = function (snapId) {
    var before = this.snapshots.length;
    this.snapshots = this.snapshots.filter(function (s) { return s.id !== snapId; });
    return this.snapshots.length < before;
  };
  MemorySnapshot.prototype.getStats = function () {
    return { count: this.snapshots.length, max: this.maxSnapshots };
  };
  window.MemorySnapshot = MemorySnapshot;
})();
