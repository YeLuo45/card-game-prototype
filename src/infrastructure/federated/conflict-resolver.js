// ============================================================================
// Federated Strategy Cloud — V261 Direction A Iteration 7/9
// ConflictResolver: CRDT 冲突解决 (LWW Register / MV Register / Vector Clock / GCounter / ORSet)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  // ===========================================================================
  // VectorClock — tracks causality across replicas
  // ===========================================================================
  function VectorClock(clocks) {
    this.clocks = clocks || {};
  }

  VectorClock.prototype.increment = function (replicaId) {
    this.clocks[replicaId] = (this.clocks[replicaId] || 0) + 1;
  };

  VectorClock.prototype.get = function (replicaId) {
    return this.clocks[replicaId] || 0;
  };

  VectorClock.prototype.merge = function (other) {
    var result = {};
    var keys = {};
    for (var k in this.clocks) if (Object.prototype.hasOwnProperty.call(this.clocks, k)) keys[k] = true;
    for (var k2 in other.clocks) if (Object.prototype.hasOwnProperty.call(other.clocks, k2)) keys[k2] = true;
    for (var r in keys) {
      if (Object.prototype.hasOwnProperty.call(keys, r)) {
        result[r] = Math.max(this.clocks[r] || 0, other.clocks[r] || 0);
      }
    }
    return new VectorClock(result);
  };

  VectorClock.prototype.compare = function (other) {
    var thisGreater = false, otherGreater = false;
    var keys = {};
    for (var k in this.clocks) if (Object.prototype.hasOwnProperty.call(this.clocks, k)) keys[k] = true;
    for (var k2 in other.clocks) if (Object.prototype.hasOwnProperty.call(other.clocks, k2)) keys[k2] = true;
    for (var r in keys) {
      if (!Object.prototype.hasOwnProperty.call(keys, r)) continue;
      var a = this.clocks[r] || 0;
      var b = other.clocks[r] || 0;
      if (a > b) thisGreater = true;
      if (b > a) otherGreater = true;
    }
    if (thisGreater && !otherGreater) return 'after';
    if (otherGreater && !thisGreater) return 'before';
    if (!thisGreater && !otherGreater) return 'equal';
    return 'concurrent';
  };

  VectorClock.prototype.serialize = function () {
    return JSON.stringify(this.clocks);
  };

  VectorClock.deserialize = function (str) {
    try { return new VectorClock(JSON.parse(str)); } catch (e) { return new VectorClock({}); }
  };

  VectorClock.prototype.clone = function () {
    return new VectorClock(JSON.parse(JSON.stringify(this.clocks)));
  };

  // ===========================================================================
  // LWWRegister — last-write-wins register
  // ===========================================================================
  function LWWRegister(value, replicaId, timestamp) {
    this.value = value;
    this.replicaId = replicaId || 'unknown';
    this.timestamp = typeof timestamp === 'number' ? timestamp : Date.now();
  }

  LWWRegister.prototype.set = function (value, replicaId, timestamp) {
    this.value = value;
    this.replicaId = replicaId || this.replicaId;
    this.timestamp = typeof timestamp === 'number' ? timestamp : Date.now();
  };

  LWWRegister.prototype.merge = function (other) {
    if (other.timestamp > this.timestamp) {
      return new LWWRegister(other.value, other.replicaId, other.timestamp);
    }
    return new LWWRegister(this.value, this.replicaId, this.timestamp);
  };

  LWWRegister.prototype.get = function () {
    return this.value;
  };

  LWWRegister.prototype.serialize = function () {
    return JSON.stringify({ value: this.value, replicaId: this.replicaId, timestamp: this.timestamp, type: 'lww' });
  };

  LWWRegister.deserialize = function (str) {
    try {
      var p = JSON.parse(str);
      return new LWWRegister(p.value, p.replicaId, p.timestamp);
    } catch (e) {
      return new LWWRegister(null);
    }
  };

  // ===========================================================================
  // MVRegister — multi-value register (preserves concurrent values)
  // ===========================================================================
  function MVRegister(values) {
    this.values = values || [];
  }

  MVRegister.prototype.add = function (value, replicaId, timestamp) {
    var entry = { value: value, replicaId: replicaId || 'unknown', timestamp: timestamp || Date.now() };
    this.values.push(entry);
  };

  MVRegister.prototype.resolve = function (resolverFn) {
    if (this.values.length === 0) return undefined;
    if (this.values.length === 1) return this.values[0].value;
    if (this.values.length > 1) {
      // concurrent — apply resolver
      if (typeof resolverFn === 'function') {
        return resolverFn(this.values.map(function (e) { return e.value; }));
      }
    }
    return this.values[this.values.length - 1].value;
  };

  MVRegister.prototype.merge = function (other) {
    var combined = this.values.concat(other.values || []);
    return new MVRegister(combined);
  };

  MVRegister.prototype.getConcurrent = function () {
    return this.values.map(function (e) { return e.value; });
  };

  MVRegister.prototype.size = function () {
    return this.values.length;
  };

  MVRegister.prototype.serialize = function () {
    return JSON.stringify({ values: this.values, type: 'mv' });
  };

  MVRegister.deserialize = function (str) {
    try {
      var p = JSON.parse(str);
      return new MVRegister(p.values || []);
    } catch (e) {
      return new MVRegister([]);
    }
  };

  // ===========================================================================
  // GCounter — grow-only counter (per-replica counters)
  // ===========================================================================
  function GCounter(counts) {
    this.counts = counts || {};
  }

  GCounter.prototype.increment = function (replicaId, amount) {
    if (typeof amount === 'undefined') amount = 1;
    if (typeof amount !== 'number' || amount <= 0) return false;
    this.counts[replicaId] = (this.counts[replicaId] || 0) + amount;
    return true;
  };

  GCounter.prototype.value = function () {
    var total = 0;
    for (var k in this.counts) {
      if (Object.prototype.hasOwnProperty.call(this.counts, k)) {
        total += this.counts[k];
      }
    }
    return total;
  };

  GCounter.prototype.merge = function (other) {
    var result = {};
    var keys = {};
    for (var k in this.counts) if (Object.prototype.hasOwnProperty.call(this.counts, k)) keys[k] = true;
    for (var k2 in other.counts) if (Object.prototype.hasOwnProperty.call(other.counts, k2)) keys[k2] = true;
    for (var r in keys) {
      if (Object.prototype.hasOwnProperty.call(keys, r)) {
        result[r] = Math.max(this.counts[r] || 0, other.counts[r] || 0);
      }
    }
    return new GCounter(result);
  };

  GCounter.prototype.serialize = function () {
    return JSON.stringify({ counts: this.counts, type: 'gcounter' });
  };

  GCounter.deserialize = function (str) {
    try {
      var p = JSON.parse(str);
      return new GCounter(p.counts || {});
    } catch (e) {
      return new GCounter({});
    }
  };

  // ===========================================================================
  // PNCounter — positive-negative counter
  // ===========================================================================
  function PNCounter(p, n) {
    this.p = p || new GCounter();
    this.n = n || new GCounter();
  }

  PNCounter.prototype.increment = function (replicaId, amount) {
    this.p.increment(replicaId, amount);
  };

  PNCounter.prototype.decrement = function (replicaId, amount) {
    this.n.increment(replicaId, amount);
  };

  PNCounter.prototype.value = function () {
    return this.p.value() - this.n.value();
  };

  PNCounter.prototype.merge = function (other) {
    return new PNCounter(this.p.merge(other.p), this.n.merge(other.n));
  };

  PNCounter.prototype.serialize = function () {
    return JSON.stringify({ p: JSON.parse(this.p.serialize()), n: JSON.parse(this.n.serialize()), type: 'pncounter' });
  };

  PNCounter.deserialize = function (str) {
    try {
      var p = JSON.parse(str);
      return new PNCounter(GCounter.deserialize(JSON.stringify(p.p)), GCounter.deserialize(JSON.stringify(p.n)));
    } catch (e) {
      return new PNCounter();
    }
  };

  // ===========================================================================
  // ORSet — observed-remove set (add/remove with tombstones)
  // ===========================================================================
  function ORSet() {
    this.added = {};    // entryId -> { value, replicas: { rid: count } }
    this.removed = {};  // entryId -> { replicas: { rid: count } }
    this._tagCounter = 0;
  }

  ORSet.prototype._genTag = function (replicaId) {
    this._tagCounter++;
    return 't_' + (replicaId || 'x') + '_' + Date.now() + '_' + this._tagCounter + '_' + Math.floor(Math.random() * 100000);
  };

  ORSet.prototype.add = function (value, replicaId) {
    var tag = this._genTag(replicaId);
    if (!this.added[tag]) {
      this.added[tag] = { value: value, replicas: {} };
    }
    this.added[tag].replicas[replicaId || 'unknown'] = (this.added[tag].replicas[replicaId || 'unknown'] || 0) + 1;
    return tag;
  };

  ORSet.prototype.remove = function (value, replicaId) {
    var rid = replicaId || 'unknown';
    var found = [];
    for (var tag in this.added) {
      if (Object.prototype.hasOwnProperty.call(this.added, tag) && this.added[tag].value === value) {
        found.push(tag);
      }
    }
    for (var i = 0; i < found.length; i++) {
      var t = found[i];
      if (!this.removed[t]) this.removed[t] = { replicas: {} };
      this.removed[t].replicas[rid] = (this.removed[t].replicas[rid] || 0) + 1;
    }
    return found.length;
  };

  ORSet.prototype._isLive = function (tag) {
    if (!this.added[tag]) return false;
    var addedReps = this.added[tag].replicas || {};
    var removedReps = (this.removed[tag] && this.removed[tag].replicas) || {};
    for (var r in addedReps) {
      if (Object.prototype.hasOwnProperty.call(addedReps, r)) {
        if ((addedReps[r] || 0) > (removedReps[r] || 0)) return true;
      }
    }
    return false;
  };

  ORSet.prototype.has = function (value) {
    for (var tag in this.added) {
      if (Object.prototype.hasOwnProperty.call(this.added, tag) && this.added[tag].value === value) {
        if (this._isLive(tag)) return true;
      }
    }
    return false;
  };

  ORSet.prototype.values = function () {
    var seen = {};
    var out = [];
    for (var tag in this.added) {
      if (Object.prototype.hasOwnProperty.call(this.added, tag) && this._isLive(tag)) {
        var v = this.added[tag].value;
        if (!seen[v]) { seen[v] = true; out.push(v); }
      }
    }
    return out;
  };

  ORSet.prototype.size = function () {
    return this.values().length;
  };

  ORSet.prototype.merge = function (other) {
    var result = new ORSet();
    result._tagCounter = Math.max(this._tagCounter, other._tagCounter);
    for (var t1 in this.added) {
      if (Object.prototype.hasOwnProperty.call(this.added, t1)) {
        result.added[t1] = JSON.parse(JSON.stringify(this.added[t1]));
      }
    }
    for (var t2 in other.added) {
      if (Object.prototype.hasOwnProperty.call(other.added, t2)) {
        if (!result.added[t2]) {
          result.added[t2] = JSON.parse(JSON.stringify(other.added[t2]));
        } else {
          for (var r in other.added[t2].replicas) {
            if (Object.prototype.hasOwnProperty.call(other.added[t2].replicas, r)) {
              result.added[t2].replicas[r] = (result.added[t2].replicas[r] || 0) + other.added[t2].replicas[r];
            }
          }
        }
      }
    }
    for (var tr1 in this.removed) {
      if (Object.prototype.hasOwnProperty.call(this.removed, tr1)) {
        if (!result.removed[tr1]) result.removed[tr1] = { replicas: {} };
        for (var rr1 in this.removed[tr1].replicas) {
          if (Object.prototype.hasOwnProperty.call(this.removed[tr1].replicas, rr1)) {
            result.removed[tr1].replicas[rr1] = (result.removed[tr1].replicas[rr1] || 0) + this.removed[tr1].replicas[rr1];
          }
        }
      }
    }
    for (var tr2 in other.removed) {
      if (Object.prototype.hasOwnProperty.call(other.removed, tr2)) {
        if (!result.removed[tr2]) result.removed[tr2] = { replicas: {} };
        for (var rr2 in other.removed[tr2].replicas) {
          if (Object.prototype.hasOwnProperty.call(other.removed[tr2].replicas, rr2)) {
            result.removed[tr2].replicas[rr2] = (result.removed[tr2].replicas[rr2] || 0) + other.removed[tr2].replicas[rr2];
          }
        }
      }
    }
    return result;
  };

  ORSet.prototype.serialize = function () {
    return JSON.stringify({ added: this.added, removed: this.removed, type: 'orset' });
  };

  ORSet.deserialize = function (str) {
    try {
      var p = JSON.parse(str);
      var s = new ORSet();
      s.added = p.added || {};
      s.removed = p.removed || {};
      return s;
    } catch (e) {
      return new ORSet();
    }
  };

  // ===========================================================================
  // ConflictResolver — orchestrator
  // ===========================================================================
  function ConflictResolver(replicaId) {
    this.replicaId = replicaId || 'unknown';
    this.vectorClock = new VectorClock();
    this.vectorClock.increment(this.replicaId);
    this.resolutions = [];
  }

  ConflictResolver.prototype.tick = function () {
    this.vectorClock.increment(this.replicaId);
  };

  ConflictResolver.prototype.lww = function (initialValue) {
    return new LWWRegister(initialValue, this.replicaId, Date.now());
  };

  ConflictResolver.prototype.mv = function (initialValue) {
    var r = new MVRegister();
    if (initialValue !== undefined) r.add(initialValue, this.replicaId, Date.now());
    return r;
  };

  ConflictResolver.prototype.gcounter = function () {
    var c = new GCounter();
    return c;
  };

  ConflictResolver.prototype.pncounter = function () {
    return new PNCounter();
  };

  ConflictResolver.prototype.orset = function () {
    return new ORSet();
  };

  ConflictResolver.prototype.mergeLWW = function (a, b) {
    var merged = a.merge(b);
    this._recordResolution('lww', a.get(), b.get(), merged.get());
    this.tick();
    return merged;
  };

  ConflictResolver.prototype.mergeMV = function (a, b, resolverFn) {
    var merged = a.merge(b);
    var resolved = merged.resolve(resolverFn);
    this._recordResolution('mv', a.size(), b.size(), resolved);
    this.tick();
    return { merged: merged, resolved: resolved };
  };

  ConflictResolver.prototype.mergeGCounter = function (a, b) {
    var merged = a.merge(b);
    this._recordResolution('gcounter', a.value(), b.value(), merged.value());
    this.tick();
    return merged;
  };

  ConflictResolver.prototype.mergePNCounter = function (a, b) {
    var merged = a.merge(b);
    this._recordResolution('pncounter', a.value(), b.value(), merged.value());
    this.tick();
    return merged;
  };

  ConflictResolver.prototype.mergeORSet = function (a, b) {
    var merged = a.merge(b);
    this._recordResolution('orset', a.size(), b.size(), merged.size());
    this.tick();
    return merged;
  };

  ConflictResolver.prototype._recordResolution = function (type, a, b, result) {
    this.resolutions.push({
      ts: Date.now(),
      type: type,
      a: a,
      b: b,
      result: result,
      replicaId: this.replicaId,
      vectorClock: this.vectorClock.serialize()
    });
    if (this.resolutions.length > 100) this.resolutions = this.resolutions.slice(-100);
  };

  ConflictResolver.prototype.getResolutions = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.resolutions.slice(-limit);
    }
    return this.resolutions.slice();
  };

  ConflictResolver.prototype.detectConflict = function (localVersion, remoteVersion) {
    if (!localVersion || !remoteVersion) return 'unknown';
    if (typeof localVersion.compare === 'function') {
      return localVersion.compare(remoteVersion);
    }
    return this.vectorClock.compare(remoteVersion);
  };

  if (typeof window !== 'undefined') {
    window.VectorClock = VectorClock;
    window.LWWRegister = LWWRegister;
    window.MVRegister = MVRegister;
    window.GCounter = GCounter;
    window.PNCounter = PNCounter;
    window.ORSet = ORSet;
    window.ConflictResolver = ConflictResolver;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      VectorClock: VectorClock, LWWRegister: LWWRegister, MVRegister: MVRegister,
      GCounter: GCounter, PNCounter: PNCounter, ORSet: ORSet, ConflictResolver: ConflictResolver
    };
  }
})();
