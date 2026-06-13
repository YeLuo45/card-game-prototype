// V323 MemoryQueue: 异步队列
'use strict';
(function () {
  function MemoryQueue(options) {
    this.items = [];
    this.processed = 0;
    this.failed = 0;
    this.mode = (options && options.mode) || 'fifo'; // fifo, lifo
  }
  MemoryQueue.prototype.enqueue = function (item) {
    this.items.push(item);
    return this.items.length;
  };
  MemoryQueue.prototype.dequeue = function () {
    if (this.items.length === 0) return null;
    var item = (this.mode === 'lifo') ? this.items.pop() : this.items.shift();
    return item;
  };
  MemoryQueue.prototype.process = function (fn) {
    while (this.items.length > 0) {
      var item = this.dequeue();
      try {
        fn(item);
        this.processed++;
      } catch (e) {
        this.failed++;
      }
    }
  };
  MemoryQueue.prototype.peek = function () { return this.items[0] || null; };
  MemoryQueue.prototype.size = function () { return this.items.length; };
  MemoryQueue.prototype.clear = function () { this.items = []; };
  MemoryQueue.prototype.getStats = function () {
    return { size: this.items.length, processed: this.processed, failed: this.failed, mode: this.mode };
  };
  window.MemoryQueue = MemoryQueue;
})();
