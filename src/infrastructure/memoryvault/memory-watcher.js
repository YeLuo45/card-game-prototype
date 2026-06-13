// V326 MemoryWatcher: 变化订阅 + 触发回调
'use strict';
(function () {
  function MemoryWatcher() {
    this.watchers = []; // {key, fn}
  }
  MemoryWatcher.prototype.watch = function (key, fn) {
    if (typeof fn !== 'function') return { error: 'invalid_callback' };
    this.watchers.push({ key: key, fn: fn });
    return { id: this.watchers.length - 1 };
  };
  MemoryWatcher.prototype.unwatch = function (id) {
    if (id < 0 || id >= this.watchers.length) return false;
    this.watchers[id] = null;
    return true;
  };
  MemoryWatcher.prototype.notify = function (key, value) {
    var fired = 0;
    for (var i = 0; i < this.watchers.length; i++) {
      if (this.watchers[i] && (this.watchers[i].key === key || this.watchers[i].key === '*')) {
        try { this.watchers[i].fn(value, key); fired++; } catch (e) {}
      }
    }
    return fired;
  };
  MemoryWatcher.prototype.getStats = function () {
    var active = 0;
    for (var i = 0; i < this.watchers.length; i++) if (this.watchers[i]) active++;
    return { watcherCount: active };
  };
  window.MemoryWatcher = MemoryWatcher;
})();
