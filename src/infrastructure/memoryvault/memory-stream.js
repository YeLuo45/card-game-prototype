// V320 MemoryStream: 流式接口
'use strict';
(function () {
  function MemoryStream(options) {
    this.subscribers = [];
    this.buffer = [];
    this.backpressure = (options && options.backpressure) || 100;
  }
  MemoryStream.prototype.subscribe = function (fn) {
    if (typeof fn !== 'function') return { error: 'invalid_subscriber' };
    this.subscribers.push(fn);
    return { id: this.subscribers.length - 1, fn: fn };
  };
  MemoryStream.prototype.unsubscribe = function (id) {
    if (id < 0 || id >= this.subscribers.length) return false;
    this.subscribers[id] = null;
    return true;
  };
  MemoryStream.prototype.emit = function (event) {
    this.buffer.push(event);
    if (this.buffer.length > this.backpressure) this.buffer.shift();
    for (var i = 0; i < this.subscribers.length; i++) {
      if (this.subscribers[i]) {
        try { this.subscribers[i](event); } catch (e) { /* swallow */ }
      }
    }
    return event;
  };
  MemoryStream.prototype.flush = function () {
    var b = this.buffer;
    this.buffer = [];
    return b;
  };
  MemoryStream.prototype.getStats = function () {
    var active = 0;
    for (var i = 0; i < this.subscribers.length; i++) if (this.subscribers[i]) active++;
    return { subscribers: active, buffered: this.buffer.length, backpressure: this.backpressure };
  };
  window.MemoryStream = MemoryStream;
})();
