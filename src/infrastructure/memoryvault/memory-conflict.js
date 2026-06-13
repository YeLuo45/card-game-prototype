// V333 MemoryConflict: LWW/CRDT/手动 merge
'use strict';
(function () {
  var STRATEGY = { LWW: 'lww', CRDT: 'crdt', MANUAL: 'manual' };
  function MemoryConflict(options) {
    this.strategy = (options && options.strategy) || STRATEGY.LWW;
    this.conflicts = 0;
    this.merges = 0;
  }
  MemoryConflict.prototype._lww = function (a, b) {
    if (!a || !b) return b || a;
    return (b.ts || 0) > (a.ts || 0) ? b : a;
  };
  MemoryConflict.prototype._crdt = function (a, b) {
    if (!a) return b;
    if (!b) return a;
    var merged = {};
    var keys = {};
    for (var k in a) keys[k] = true;
    for (var k2 in b) keys[k2] = true;
    for (var k3 in keys) {
      if (a[k3] && b[k3] && typeof a[k3] === 'object' && typeof b[k3] === 'object') {
        merged[k3] = this._crdt(a[k3], b[k3]);
      } else if (a[k3] === b[k3]) {
        merged[k3] = a[k3];
      } else {
        // Take newer
        merged[k3] = (a[k3] != null) ? a[k3] : b[k3];
      }
    }
    return merged;
  };
  MemoryConflict.prototype.resolve = function (a, b) {
    this.conflicts++;
    var s = this.strategy;
    var result;
    if (s === STRATEGY.CRDT) result = this._crdt(a, b);
    else if (s === STRATEGY.MANUAL) result = { a: a, b: b, needsReview: true };
    else result = this._lww(a, b);
    this.merges++;
    return { strategy: s, merged: result, conflict: a && b && JSON.stringify(a) !== JSON.stringify(b) };
  };
  MemoryConflict.prototype.getStats = function () {
    return { conflicts: this.conflicts, merges: this.merges, strategy: this.strategy };
  };
  window.MemoryConflict = MemoryConflict;
})();
