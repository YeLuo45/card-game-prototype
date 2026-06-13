// ============================================================================
// Distributed Memory Vault — V310 Direction F Round 2 Iter 2/30
// MemoryStorage: 存储后端抽象 (localStorage / IndexedDB / in-memory shim)
// 来源：thunderbolt PowerSync 离线优先
// ============================================================================
'use strict';

(function () {

  var BACKEND = {
    MEMORY: 'memory',
    LOCAL_STORAGE: 'localStorage',
    SESSION_STORAGE: 'sessionStorage',
    INDEXED_DB: 'indexedDB'
  };

  // localStorage shim for Node/test
  function memoryBackend() {
    var store = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear: function () { store = {}; }
    };
  }

  function MemoryStorage(options) {
    this.backend = (options && options.backend) || BACKEND.MEMORY;
    this.namespace = (options && options.namespace) || 'memory_storage';
    this.maxBytes = (options && options.maxBytes) || 5 * 1024 * 1024; // 5MB default
    this.writes = 0;
    this.reads = 0;
    this._initBackend();
  }

  MemoryStorage.prototype._initBackend = function () {
    if (this.backend === BACKEND.MEMORY) {
      this._store = memoryBackend();
    } else if (this.backend === BACKEND.LOCAL_STORAGE && typeof localStorage !== 'undefined') {
      this._store = localStorage;
    } else if (this.backend === BACKEND.SESSION_STORAGE && typeof sessionStorage !== 'undefined') {
      this._store = sessionStorage;
    } else {
      this._store = memoryBackend();
    }
  };

  MemoryStorage.prototype._key = function (id) { return this.namespace + ':' + id; };

  MemoryStorage.prototype.save = function (id, data) {
    if (!id) return { error: 'no_id', success: false };
    var serialized = typeof data === 'string' ? data : JSON.stringify(data);
    if (serialized.length > this.maxBytes) {
      return { error: 'too_large', success: false, size: serialized.length };
    }
    try {
      this._store.setItem(this._key(id), serialized);
      this.writes++;
      return { success: true, id: id, size: serialized.length };
    } catch (e) {
      return { error: 'write_failed', success: false, message: (e && e.message) || 'unknown' };
    }
  };

  MemoryStorage.prototype.load = function (id) {
    if (!id) return null;
    var raw = this._store.getItem(this._key(id));
    this.reads++;
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  };

  MemoryStorage.prototype.remove = function (id) {
    if (!id) return false;
    this._store.removeItem(this._key(id));
    return true;
  };

  MemoryStorage.prototype.has = function (id) {
    return this._store.getItem(this._key(id)) != null;
  };

  MemoryStorage.prototype.clear = function () {
    if (typeof this._store.clear === 'function') this._store.clear();
  };

  MemoryStorage.prototype.list = function () {
    var prefix = this.namespace + ':';
    var out = [];
    if (typeof this._store.length !== 'undefined') {
      for (var i = 0; i < this._store.length; i++) {
        var k = this._store.key(i);
        if (k && k.indexOf(prefix) === 0) out.push(k.substring(prefix.length));
      }
    } else {
      // memory backend — enumerate via getItem would miss; we keep a side index
      // fallback: nothing enumerable
    }
    return out;
  };

  MemoryStorage.prototype.getStats = function () {
    return {
      backend: this.backend,
      namespace: this.namespace,
      writes: this.writes,
      reads: this.reads,
      maxBytes: this.maxBytes
    };
  };

  window.MemoryStorage = MemoryStorage;
  window.BACKEND = BACKEND;

})();
