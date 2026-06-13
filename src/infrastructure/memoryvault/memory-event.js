// V325 MemoryEvent: 事件溯源
'use strict';
(function () {
  function MemoryEvent() {
    this.events = [];
    this.snapshots = [];
  }
  MemoryEvent.prototype.append = function (type, data) {
    var e = { id: 'evt_' + this.events.length, type: type, data: data, at: Date.now() };
    this.events.push(e);
    return e;
  };
  MemoryEvent.prototype.replay = function (filterType) {
    var state = {};
    for (var i = 0; i < this.events.length; i++) {
      var e = this.events[i];
      if (filterType && e.type !== filterType) continue;
      if (typeof state[e.type] === 'number') state[e.type]++;
      else if (Array.isArray(state[e.type])) state[e.type].push(e.data);
      else state[e.type] = e.data;
    }
    return state;
  };
  MemoryEvent.prototype.project = function (fn) {
    return this.events.map(fn);
  };
  MemoryEvent.prototype.snapshot = function () {
    var snap = { at: Date.now(), state: this.replay() };
    this.snapshots.push(snap);
    return snap;
  };
  MemoryEvent.prototype.getStats = function () {
    var byType = {};
    for (var i = 0; i < this.events.length; i++) byType[this.events[i].type] = (byType[this.events[i].type] || 0) + 1;
    return { eventCount: this.events.length, snapshotCount: this.snapshots.length, byType: byType };
  };
  window.MemoryEvent = MemoryEvent;
})();
