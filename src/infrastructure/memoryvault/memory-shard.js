// V318 MemoryShard: 分片策略
'use strict';
(function () {
  var STRATEGY = { HASH: 'hash', RANGE: 'range', CONSISTENT: 'consistent' };
  function MemoryShard(options) {
    this.shardCount = (options && options.shardCount) || 4;
    this.strategy = (options && options.strategy) || STRATEGY.HASH;
    this.shards = []; // map of shardId -> array of entries
    for (var i = 0; i < this.shardCount; i++) this.shards[i] = [];
  }
  MemoryShard.prototype._hash = function (key) {
    var h = 5381;
    var s = String(key);
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return (h & 0x7fffffff) % this.shardCount;
  };
  MemoryShard.prototype._consistentHash = function (key) {
    return this._hash(key);
  };
  MemoryShard.prototype.route = function (key) {
    if (this.strategy === STRATEGY.RANGE) {
      return Math.abs(parseInt(String(key).charCodeAt(0) || 0, 10)) % this.shardCount;
    }
    if (this.strategy === STRATEGY.CONSISTENT) {
      return this._consistentHash(key);
    }
    return this._hash(key);
  };
  MemoryShard.prototype.put = function (key, value) {
    var sid = this.route(key);
    this.shards[sid].push({ key: key, value: value });
    return { shard: sid, key: key };
  };
  MemoryShard.prototype.get = function (key) {
    var sid = this.route(key);
    var shard = this.shards[sid];
    for (var i = 0; i < shard.length; i++) if (shard[i].key === key) return shard[i].value;
    return null;
  };
  MemoryShard.prototype.getShardDistribution = function () {
    return this.shards.map(function (s, i) { return { shard: i, count: s.length }; });
  };
  MemoryShard.prototype.getStats = function () {
    return { shardCount: this.shardCount, strategy: this.strategy, total: this.shards.reduce(function (s, x) { return s + x.length; }, 0) };
  };
  window.MemoryShard = MemoryShard;
})();
