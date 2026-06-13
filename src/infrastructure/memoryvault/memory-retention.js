// V329 MemoryRetention: 滚动窗口 + 归档
'use strict';
(function () {
  function MemoryRetention(options) {
    this.windowMs = (options && options.windowMs) || 7 * 24 * 60 * 60 * 1000;
    this.archiveAfter = (options && options.archiveAfter) || 30 * 24 * 60 * 60 * 1000;
    this.entries = {};
    this.archived = [];
    this.now = (options && options.now) || function () { return Date.now(); };
  }
  MemoryRetention.prototype.add = function (id, data) {
    this.entries[id] = Object.assign({ addedAt: this.now() }, data || {});
    return { success: true, id: id };
  };
  MemoryRetention.prototype.sweep = function () {
    var now = this.now();
    var toArchive = [];
    for (var id in this.entries) {
      var age = now - this.entries[id].addedAt;
      if (age > this.archiveAfter) toArchive.push(id);
    }
    for (var i = 0; i < toArchive.length; i++) {
      this.archived.push(Object.assign({ archivedAt: now }, this.entries[toArchive[i]]));
      delete this.entries[toArchive[i]];
    }
    return { archived: toArchive.length };
  };
  MemoryRetention.prototype.active = function () {
    return Object.keys(this.entries);
  };
  MemoryRetention.prototype.getArchive = function () { return this.archived.slice(); };
  MemoryRetention.prototype.getStats = function () {
    return { active: Object.keys(this.entries).length, archived: this.archived.length, windowMs: this.windowMs };
  };
  window.MemoryRetention = MemoryRetention;
})();
