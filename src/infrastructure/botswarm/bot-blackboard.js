// ============================================================================
// Bot Swarm Arena — V266 Direction B Iteration 3/9
// BotBlackboard: stigmergy 共享黑板 (环境信号/TTL/模式匹配/衰减)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var MATCH_MODE = {
    EXACT: 'exact',
    PREFIX: 'prefix',
    REGEX: 'regex',
    WILDCARD: 'wildcard'
  };

  function BotBlackboard(options) {
    options = options || {};
    this.id = options.id || ('bb_' + Date.now());
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTtl = options.defaultTtl || 3600000;  // 1 hour
    this.decayEnabled = options.decayEnabled !== false;
    this.entries = [];
    this.subscriptions = [];
    this.accessLog = [];
    this.metrics = {
      writes: 0,
      reads: 0,
      evictions: 0,
      decayRuns: 0,
      subscriptionHits: 0
    };
  }

  // ---- Core Write/Read ----
  BotBlackboard.prototype.write = function (key, value, options) {
    options = options || {};
    if (typeof key !== 'string' || key.length === 0) return { error: 'invalid_key' };
    var entry = {
      id: 'e_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      key: key,
      value: value,
      ts: Date.now(),
      ttl: typeof options.ttl === 'number' ? options.ttl : this.defaultTtl,
      author: options.author || 'unknown',
      tags: options.tags || [],
      accessCount: 0,
      version: 1
    };
    // upsert by key
    var existingIdx = -1;
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].key === key) { existingIdx = i; break; }
    }
    if (existingIdx !== -1) {
      this.entries[existingIdx].value = value;
      this.entries[existingIdx].ts = Date.now();
      this.entries[existingIdx].version++;
      this.entries[existingIdx].author = entry.author;
      this.entries[existingIdx].tags = entry.tags;
      this.entries[existingIdx].ttl = entry.ttl;
      entry = this.entries[existingIdx];
    } else {
      this.entries.push(entry);
    }
    if (this.entries.length > this.maxEntries) {
      this._evictOldest();
    }
    this.metrics.writes++;
    this._logAccess('write', key, entry.author);
    this._notifySubscriptions(key, value, entry);
    return { success: true, entry: entry, version: entry.version };
  };

  BotBlackboard.prototype.read = function (key, options) {
    if (typeof key !== 'string') return { error: 'invalid_key' };
    var now = Date.now();
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (e.key === key) {
        if (now - e.ts > e.ttl) {
          this.entries.splice(i, 1);
          this.metrics.evictions++;
          return { error: 'expired' };
        }
        e.accessCount++;
        this.metrics.reads++;
        this._logAccess('read', key, (options && options.reader) || 'unknown');
        return { success: true, value: e.value, entry: e };
      }
    }
    return { error: 'not_found' };
  };

  BotBlackboard.prototype.delete = function (key, requester) {
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].key === key) {
        var removed = this.entries.splice(i, 1);
        this._logAccess('delete', key, requester || 'unknown');
        return { success: true, removed: removed[0] };
      }
    }
    return { error: 'not_found' };
  };

  BotBlackboard.prototype.has = function (key) {
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].key === key) {
        if (Date.now() - this.entries[i].ts > this.entries[i].ttl) {
          this.entries.splice(i, 1);
          this.metrics.evictions++;
          return false;
        }
        return true;
      }
    }
    return false;
  };

  // ---- Pattern matching ----
  BotBlackboard.prototype.query = function (pattern, mode) {
    var m = mode || MATCH_MODE.EXACT;
    var results = [];
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (Date.now() - e.ts > e.ttl) continue;
      if (this._matchKey(e.key, pattern, m)) {
        results.push({ key: e.key, value: e.value, ts: e.ts, version: e.version, author: e.author, tags: e.tags });
      }
    }
    this.metrics.reads++;
    return { success: true, results: results, count: results.length };
  };

  BotBlackboard.prototype._matchKey = function (key, pattern, mode) {
    if (mode === MATCH_MODE.EXACT) return key === pattern;
    if (mode === MATCH_MODE.PREFIX) return key.indexOf(pattern) === 0;
    if (mode === MATCH_MODE.WILDCARD) {
      var regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp('^' + regexStr + '$').test(key);
    }
    if (mode === MATCH_MODE.REGEX) {
      try { return new RegExp(pattern).test(key); } catch (e) { return false; }
    }
    return false;
  };

  // ---- Tag filtering ----
  BotBlackboard.prototype.queryByTag = function (tag) {
    var results = [];
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (Date.now() - e.ts > e.ttl) continue;
      if (e.tags && e.tags.indexOf(tag) !== -1) {
        results.push({ key: e.key, value: e.value, ts: e.ts, tags: e.tags });
      }
    }
    return { success: true, results: results, count: results.length };
  };

  // ---- Subscriptions ----
  BotBlackboard.prototype.subscribe = function (pattern, callback, mode) {
    if (typeof pattern !== 'string') return { error: 'invalid_pattern' };
    if (typeof callback !== 'function') return { error: 'invalid_callback' };
    var sub = {
      id: 's_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      pattern: pattern,
      mode: mode || MATCH_MODE.EXACT,
      callback: callback,
      hits: 0
    };
    this.subscriptions.push(sub);
    return { success: true, subscriptionId: sub.id };
  };

  BotBlackboard.prototype.unsubscribe = function (subscriptionId) {
    for (var i = 0; i < this.subscriptions.length; i++) {
      if (this.subscriptions[i].id === subscriptionId) {
        this.subscriptions.splice(i, 1);
        return { success: true };
      }
    }
    return { error: 'not_found' };
  };

  BotBlackboard.prototype._notifySubscriptions = function (key, value, entry) {
    for (var i = 0; i < this.subscriptions.length; i++) {
      var s = this.subscriptions[i];
      if (this._matchKey(key, s.pattern, s.mode)) {
        try {
          s.callback(key, value, entry);
          s.hits++;
          this.metrics.subscriptionHits++;
        } catch (e) {
          // ignore callback errors
        }
      }
    }
  };

  // ---- Decay / Cleanup ----
  BotBlackboard.prototype.runDecay = function () {
    var now = Date.now();
    var initial = this.entries.length;
    this.entries = this.entries.filter(function (e) {
      return (now - e.ts) <= e.ttl;
    });
    var removed = initial - this.entries.length;
    this.metrics.evictions += removed;
    this.metrics.decayRuns++;
    return { success: true, removed: removed, remaining: this.entries.length };
  };

  BotBlackboard.prototype._evictOldest = function () {
    if (this.entries.length === 0) return;
    var oldestIdx = 0;
    var oldestTs = this.entries[0].ts;
    for (var i = 1; i < this.entries.length; i++) {
      if (this.entries[i].ts < oldestTs) {
        oldestTs = this.entries[i].ts;
        oldestIdx = i;
      }
    }
    this.entries.splice(oldestIdx, 1);
    this.metrics.evictions++;
  };

  // ---- Snapshot / Stigmergy gradient ----
  BotBlackboard.prototype.leaveTrail = function (key, intensity) {
    // Increase access count for a key (simulating pheromone deposit)
    if (typeof intensity !== 'number') intensity = 1;
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].key === key) {
        this.entries[i].trail = (this.entries[i].trail || 0) + intensity;
        return { success: true, trail: this.entries[i].trail };
      }
    }
    return { error: 'not_found' };
  };

  BotBlackboard.prototype.followTrail = function (pattern) {
    var results = [];
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (Date.now() - e.ts > e.ttl) continue;
      if (e.trail && (!pattern || e.key.indexOf(pattern) === 0)) {
        results.push({ key: e.key, trail: e.trail, value: e.value });
      }
    }
    results.sort(function (a, b) { return b.trail - a.trail; });
    return { success: true, results: results };
  };

  BotBlackboard.prototype.evaporateTrails = function (rate) {
    if (typeof rate !== 'number' || rate <= 0 || rate > 1) rate = 0.1;
    var removed = 0;
    for (var i = 0; i < this.entries.length; i++) {
      if (this.entries[i].trail) {
        this.entries[i].trail *= (1 - rate);
        if (this.entries[i].trail < 0.01) {
          delete this.entries[i].trail;
          removed++;
        }
      }
    }
    return { success: true, evaporated: removed };
  };

  // ---- Stats / Logs ----
  BotBlackboard.prototype._logAccess = function (op, key, who) {
    this.accessLog.push({ op: op, key: key, who: who, ts: Date.now() });
    if (this.accessLog.length > 500) this.accessLog = this.accessLog.slice(-500);
  };

  BotBlackboard.prototype.getAccessLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.accessLog.slice(-limit);
    }
    return this.accessLog.slice();
  };

  BotBlackboard.prototype.listKeys = function () {
    var keys = [];
    var now = Date.now();
    for (var i = 0; i < this.entries.length; i++) {
      if (now - this.entries[i].ts <= this.entries[i].ttl) {
        keys.push(this.entries[i].key);
      }
    }
    return keys;
  };

  BotBlackboard.prototype.size = function () {
    return this.entries.length;
  };

  BotBlackboard.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  BotBlackboard.prototype.exportState = function () {
    return JSON.stringify({
      id: this.id,
      entries: this.entries,
      subscriptions: this.subscriptions.map(function (s) { return { id: s.id, pattern: s.pattern, mode: s.mode, hits: s.hits }; }),
      exportedAt: Date.now()
    });
  };

  BotBlackboard.prototype.importState = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      this.entries = parsed.entries || [];
      // Note: subscriptions are NOT imported (callbacks can't be serialized)
      this.metrics.imports = (this.metrics.imports || 0) + 1;
      return { success: true, entries: this.entries.length };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  BotBlackboard.prototype.clear = function () {
    this.entries = [];
    this.subscriptions = [];
    this.accessLog = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.BotBlackboard = BotBlackboard;
    window.BLACKBOARD_MATCH_MODE = MATCH_MODE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotBlackboard: BotBlackboard, BLACKBOARD_MATCH_MODE: MATCH_MODE };
  }
})();
