// V328 MemoryQuota: 配额管理
'use strict';
(function () {
  function MemoryQuota(options) {
    this.maxEntries = (options && options.maxEntries) || 100;
    this.maxBytes = (options && options.maxBytes) || 1024 * 1024;
    this.entries = {};
    this.bytes = 0;
    this.evictions = 0;
  }
  MemoryQuota.prototype.add = function (id, size) {
    if (!id) return { error: 'no_id' };
    var s = size || 100;
    if (Object.keys(this.entries).length >= this.maxEntries) {
      this._evictOldest();
    }
    if (this.bytes + s > this.maxBytes) {
      return { error: 'quota_exceeded', success: false };
    }
    this.entries[id] = { addedAt: Date.now(), size: s };
    this.bytes += s;
    return { success: true, id: id, size: s };
  };
  MemoryQuota.prototype._evictOldest = function () {
    var oldestId = null, oldestAt = Infinity;
    for (var id in this.entries) {
      if (this.entries[id].addedAt < oldestAt) { oldestAt = this.entries[id].addedAt; oldestId = id; }
    }
    if (oldestId) {
      this.bytes -= this.entries[oldestId].size;
      delete this.entries[oldestId];
      this.evictions++;
    }
  };
  MemoryQuota.prototype.remove = function (id) {
    if (!this.entries[id]) return false;
    this.bytes -= this.entries[id].size;
    delete this.entries[id];
    return true;
  };
  MemoryQuota.prototype.getStats = function () {
    return { entries: Object.keys(this.entries).length, bytes: this.bytes, evictions: this.evictions, maxEntries: this.maxEntries, maxBytes: this.maxBytes };
  };
  window.MemoryQuota = MemoryQuota;
})();
