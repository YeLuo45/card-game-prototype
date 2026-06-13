// V322 MemoryCache: LRU/LFU cache with TTL
'use strict';
(function () {
  var POLICY = { LRU: 'lru', LFU: 'lfu' };
  function MemoryCache(options) {
    this.maxSize = (options && options.maxSize) || 100;
    this.policy = (options && options.policy) || POLICY.LRU;
    this.ttl = (options && options.ttl) || 60000;
    this.cache = {};
    this.accessCount = {};
    this.insertionOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.now = (options && options.now) || function () { return Date.now(); };
  }
  MemoryCache.prototype.set = function (key, value, ttl) {
    if (!key) return false;
    var expires = this.now() + (ttl != null ? ttl : this.ttl);
    this.cache[key] = { value: value, expires: expires };
    this.accessCount[key] = 0;
    this.insertionOrder.push(key);
    if (Object.keys(this.cache).length > this.maxSize) this._evict();
    return true;
  };
  MemoryCache.prototype.get = function (key) {
    if (!this.cache[key]) { this.misses++; return null; }
    if (this.cache[key].expires < this.now()) { delete this.cache[key]; this.misses++; return null; }
    this.accessCount[key]++;
    this.hits++;
    return this.cache[key].value;
  };
  MemoryCache.prototype._evict = function () {
    var key = (this.policy === POLICY.LFU) ? this._lfuKey() : this._lruKey();
    if (key) { delete this.cache[key]; delete this.accessCount[key]; }
  };
  MemoryCache.prototype._lruKey = function () {
    return this.insertionOrder.shift();
  };
  MemoryCache.prototype._lfuKey = function () {
    var minKey = null, minCount = Infinity;
    for (var k in this.accessCount) {
      if (this.accessCount[k] < minCount) { minCount = this.accessCount[k]; minKey = k; }
    }
    return minKey;
  };
  MemoryCache.prototype.invalidate = function (key) {
    if (!this.cache[key]) return false;
    delete this.cache[key]; delete this.accessCount[key];
    return true;
  };
  MemoryCache.prototype.getStats = function () {
    return { size: Object.keys(this.cache).length, max: this.maxSize, hits: this.hits, misses: this.misses, hitRate: (this.hits + this.misses) > 0 ? this.hits / (this.hits + this.misses) : 0 };
  };
  window.MemoryCache = MemoryCache;
  window.CACHE_POLICY = POLICY;
})();
