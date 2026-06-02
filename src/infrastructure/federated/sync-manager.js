// ============================================================================
// Federated Strategy Cloud — V255 Direction A Iteration 1/9
// FederatedSyncManager: 双向同步核心 (LocalStore ↔ CloudStore)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // SYNC_STATUS — state machine values
  // --------------------------------------------------------------------------
  var SYNC_STATUS = {
    OFFLINE: 'offline',
    SYNCING: 'syncing',
    ONLINE: 'online',
    ERROR: 'error',
    CONFLICT: 'conflict'
  };

  var CONFLICT_STRATEGIES = {
    NEWEST_WINS: 'newest_wins',
    LOCAL_WINS: 'local_wins',
    CLOUD_WINS: 'cloud_wins',
    MANUAL: 'manual'
  };

  var QUEUE_OP_TYPES = {
    UPSERT: 'upsert',
    DELETE: 'delete',
    META: 'meta'
  };

  // --------------------------------------------------------------------------
  // LocalStore — local persistence with in-memory + localStorage shim
  // --------------------------------------------------------------------------
  function LocalStore(persistence) {
    this.data = {};
    this.meta = {};
    this.persistence = persistence || null; // optional persistence (e.g. localStorage)
    this._loadFromPersistence();
  }

  LocalStore.prototype._loadFromPersistence = function () {
    if (!this.persistence || typeof this.persistence.getItem !== 'function') return;
    var raw = this.persistence.getItem('federated_local');
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      this.data = parsed.data || {};
      this.meta = parsed.meta || {};
    } catch (e) {
      this.data = {};
      this.meta = {};
    }
  };

  LocalStore.prototype._saveToPersistence = function () {
    if (!this.persistence || typeof this.persistence.setItem !== 'function') return;
    try {
      this.persistence.setItem('federated_local', JSON.stringify({ data: this.data, meta: this.meta }));
    } catch (e) {
      // storage may be full — silently drop
    }
  };

  LocalStore.prototype.set = function (key, value, meta) {
    if (typeof key !== 'string' || key.length === 0) return { error: 'invalid_key' };
    this.data[key] = value;
    this.meta[key] = {
      version: (this.meta[key] ? this.meta[key].version : 0) + 1,
      timestamp: Date.now(),
      dirty: true
    };
    if (meta && typeof meta === 'object') {
      for (var k in meta) {
        if (Object.prototype.hasOwnProperty.call(meta, k)) {
          this.meta[key][k] = meta[k];
        }
      }
    }
    this._saveToPersistence();
    return { success: true, version: this.meta[key].version };
  };

  LocalStore.prototype.get = function (key) {
    if (!Object.prototype.hasOwnProperty.call(this.data, key)) return null;
    return { key: key, value: this.data[key], meta: this.meta[key] || null };
  };

  LocalStore.prototype.has = function (key) {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  };

  LocalStore.prototype.delete = function (key) {
    if (!Object.prototype.hasOwnProperty.call(this.data, key)) return { error: 'not_found' };
    delete this.data[key];
    delete this.meta[key];
    this._saveToPersistence();
    return { success: true };
  };

  LocalStore.prototype.list = function () {
    var keys = Object.keys(this.data);
    var out = [];
    for (var i = 0; i < keys.length; i++) {
      out.push({ key: keys[i], value: this.data[keys[i]], meta: this.meta[keys[i]] || null });
    }
    return out;
  };

  LocalStore.prototype.size = function () {
    return Object.keys(this.data).length;
  };

  LocalStore.prototype.exportAll = function () {
    return { data: this.data, meta: this.meta };
  };

  LocalStore.prototype.importAll = function (snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return { error: 'invalid_snapshot' };
    this.data = snapshot.data || {};
    this.meta = snapshot.meta || {};
    this._saveToPersistence();
    return { success: true, count: Object.keys(this.data).length };
  };

  LocalStore.prototype.markSynced = function (key) {
    if (!this.meta[key]) return { error: 'not_found' };
    this.meta[key].dirty = false;
    this._saveToPersistence();
    return { success: true };
  };

  LocalStore.prototype.getDirty = function () {
    var keys = Object.keys(this.meta);
    var dirty = [];
    for (var i = 0; i < keys.length; i++) {
      if (this.meta[keys[i]] && this.meta[keys[i]].dirty) {
        dirty.push({ key: keys[i], meta: this.meta[keys[i]], value: this.data[keys[i]] });
      }
    }
    return dirty;
  };

  LocalStore.prototype.clear = function () {
    this.data = {};
    this.meta = {};
    this._saveToPersistence();
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // InMemoryCloudStore — abstracted cloud backend (can be swapped for Gist)
  // --------------------------------------------------------------------------
  function InMemoryCloudStore() {
    this.blobs = {};
    this.versions = {};
    this.timestamps = {};
    this.metadata = {};
    this.failMode = 'none'; // 'none' | 'push' | 'pull' | 'all'
    this.delayMs = 0;
  }

  InMemoryCloudStore.prototype.push = function (id, payload, version, timestamp, meta) {
    if (this.failMode === 'push' || this.failMode === 'all') {
      return { error: 'cloud_unavailable' };
    }
    if (typeof id !== 'string' || id.length === 0) return { error: 'invalid_id' };
    this.blobs[id] = payload;
    this.versions[id] = version || 1;
    this.timestamps[id] = timestamp || Date.now();
    this.metadata[id] = meta || {};
    return { success: true, version: this.versions[id], timestamp: this.timestamps[id] };
  };

  InMemoryCloudStore.prototype.pull = function (id) {
    if (this.failMode === 'pull' || this.failMode === 'all') {
      return { error: 'cloud_unavailable' };
    }
    if (!Object.prototype.hasOwnProperty.call(this.blobs, id)) return { error: 'not_found' };
    return {
      success: true,
      id: id,
      payload: this.blobs[id],
      version: this.versions[id],
      timestamp: this.timestamps[id],
      meta: this.metadata[id] || {}
    };
  };

  InMemoryCloudStore.prototype.exists = function (id) {
    return Object.prototype.hasOwnProperty.call(this.blobs, id);
  };

  InMemoryCloudStore.prototype.list = function () {
    var ids = Object.keys(this.blobs);
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      out.push({ id: ids[i], version: this.versions[ids[i]], timestamp: this.timestamps[ids[i]] });
    }
    return out;
  };

  InMemoryCloudStore.prototype.delete = function (id) {
    if (!Object.prototype.hasOwnProperty.call(this.blobs, id)) return { error: 'not_found' };
    delete this.blobs[id];
    delete this.versions[id];
    delete this.timestamps[id];
    delete this.metadata[id];
    return { success: true };
  };

  InMemoryCloudStore.prototype.size = function () {
    return Object.keys(this.blobs).length;
  };

  InMemoryCloudStore.prototype.setFailMode = function (mode) {
    var valid = ['none', 'push', 'pull', 'all'];
    if (valid.indexOf(mode) === -1) return { error: 'invalid_mode' };
    this.failMode = mode;
    return { success: true };
  };

  InMemoryCloudStore.prototype.clear = function () {
    this.blobs = {};
    this.versions = {};
    this.timestamps = {};
    this.metadata = {};
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // FederatedSyncManager — orchestrator
  // --------------------------------------------------------------------------
  function FederatedSyncManager(options) {
    options = options || {};
    this.localStore = options.localStore || new LocalStore();
    this.cloudStore = options.cloudStore || new InMemoryCloudStore();
    this.queue = [];
    this.status = SYNC_STATUS.OFFLINE;
    this.lastSyncTime = null;
    this.listeners = {};
    this.deviceId = options.deviceId || ('dev_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.syncInterval = options.syncInterval || 5000;
    this.conflictStrategy = options.conflictStrategy || CONFLICT_STRATEGIES.NEWEST_WINS;
    this.autoSync = false;
    this._autoTimer = null;
    this.syncHistory = [];
    this.maxHistory = options.maxHistory || 50;
    this.metrics = { syncs: 0, conflicts: 0, errors: 0, bytes: 0, pushes: 0, pulls: 0 };
    this.conflicts = []; // unresolved conflicts
  }

  FederatedSyncManager.prototype.subscribe = function (event, callback) {
    if (typeof event !== 'string' || event.length === 0 || typeof callback !== 'function') return { error: 'invalid_args' };
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return { success: true, count: this.listeners[event].length };
  };

  FederatedSyncManager.prototype.unsubscribe = function (event, callback) {
    if (!this.listeners[event]) return { error: 'no_listeners' };
    var idx = this.listeners[event].indexOf(callback);
    if (idx === -1) return { error: 'callback_not_found' };
    this.listeners[event].splice(idx, 1);
    return { success: true };
  };

  FederatedSyncManager.prototype._emit = function (event, data) {
    if (!this.listeners[event]) return { success: true, count: 0 };
    for (var i = 0; i < this.listeners[event].length; i++) {
      try {
        this.listeners[event][i]({ event: event, data: data, timestamp: Date.now() });
      } catch (e) {
        // swallow listener errors
      }
    }
    return { success: true, count: this.listeners[event].length };
  };

  FederatedSyncManager.prototype.enqueue = function (payload, type) {
    if (this.queue.length >= this.maxQueueSize) {
      this.metrics.errors++;
      return { error: 'queue_full' };
    }
    var op = {
      id: 'op_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      type: type || QUEUE_OP_TYPES.UPSERT,
      payload: payload,
      enqueuedAt: Date.now(),
      deviceId: this.deviceId
    };
    this.queue.push(op);
    this._emit('enqueued', op);
    return { success: true, opId: op.id, queueLength: this.queue.length };
  };

  FederatedSyncManager.prototype.getQueue = function () {
    return this.queue.slice();
  };

  FederatedSyncManager.prototype.getQueueLength = function () {
    return this.queue.length;
  };

  FederatedSyncManager.prototype.clearQueue = function () {
    var n = this.queue.length;
    this.queue = [];
    return { success: true, cleared: n };
  };

  FederatedSyncManager.prototype.processQueue = function () {
    if (this.queue.length === 0) return { success: true, processed: 0, failed: 0 };
    var processed = 0;
    var failed = 0;
    for (var i = 0; i < this.queue.length; i++) {
      var op = this.queue[i];
      if (op.type === QUEUE_OP_TYPES.UPSERT) {
        var key = op.payload && op.payload.key;
        if (key) {
          var r = this.localStore.set(key, op.payload.value, op.payload.meta);
          if (r.success) processed++; else failed++;
        } else {
          failed++;
        }
      } else if (op.type === QUEUE_OP_TYPES.DELETE) {
        var key2 = op.payload && op.payload.key;
        if (key2) {
          var r2 = this.localStore.delete(key2);
          if (r2.success) processed++; else failed++;
        } else {
          failed++;
        }
      } else if (op.type === QUEUE_OP_TYPES.META) {
        processed++;
      }
    }
    this.queue = [];
    this._emit('processed', { processed: processed, failed: failed });
    return { success: true, processed: processed, failed: failed };
  };

  FederatedSyncManager.prototype._detectConflict = function (localMeta, cloudVersion, cloudTimestamp) {
    if (localMeta == null) return false;
    if (typeof cloudVersion !== 'number') return false;
    if (localMeta.version > cloudVersion) return true;
    if (localMeta.version === cloudVersion && localMeta.timestamp > cloudTimestamp) return true;
    return false;
  };

  FederatedSyncManager.prototype._resolveConflict = function (localValue, localMeta, cloudValue, cloudVersion, cloudTimestamp) {
    var strategy = this.conflictStrategy;
    if (strategy === CONFLICT_STRATEGIES.LOCAL_WINS) {
      return { resolution: 'local_kept', value: localValue, version: localMeta.version, timestamp: localMeta.timestamp };
    }
    if (strategy === CONFLICT_STRATEGIES.CLOUD_WINS) {
      return { resolution: 'cloud_kept', value: cloudValue, version: cloudVersion, timestamp: cloudTimestamp };
    }
    if (strategy === CONFLICT_STRATEGIES.NEWEST_WINS) {
      if (localMeta.timestamp >= cloudTimestamp) {
        return { resolution: 'local_newer', value: localValue, version: localMeta.version, timestamp: localMeta.timestamp };
      }
      return { resolution: 'cloud_newer', value: cloudValue, version: cloudVersion, timestamp: cloudTimestamp };
    }
    // MANUAL: keep both, add to conflicts list
    this.conflicts.push({
      key: localMeta.key || '?',
      local: { value: localValue, version: localMeta.version, timestamp: localMeta.timestamp },
      cloud: { value: cloudValue, version: cloudVersion, timestamp: cloudTimestamp }
    });
    return { resolution: 'manual', value: localValue, version: localMeta.version, timestamp: localMeta.timestamp };
  };

  FederatedSyncManager.prototype.setConflictStrategy = function (strategy) {
    var valid = ['newest_wins', 'local_wins', 'cloud_wins', 'manual'];
    if (valid.indexOf(strategy) === -1) return { error: 'invalid_strategy' };
    this.conflictStrategy = strategy;
    return { success: true, strategy: this.conflictStrategy };
  };

  FederatedSyncManager.prototype.backup = function (key, value, meta) {
    var setRes = this.localStore.set(key, value, meta);
    if (setRes.error) return setRes;
    var localMeta = this.localStore.meta[key];
    var pushRes = this.cloudStore.push(key, value, localMeta.version, localMeta.timestamp, { deviceId: this.deviceId });
    if (pushRes.error) {
      this.metrics.errors++;
      this._emit('error', { op: 'backup', key: key, error: pushRes.error });
      this.status = SYNC_STATUS.ERROR;
      return { error: pushRes.error, local: 'saved', cloud: 'failed' };
    }
    this.localStore.markSynced(key);
    this.metrics.pushes++;
    this.metrics.bytes += JSON.stringify(value).length;
    this._emit('backed_up', { key: key, version: localMeta.version });
    return { success: true, key: key, version: localMeta.version, cloudVersion: pushRes.version };
  };

  FederatedSyncManager.prototype.restore = function (key) {
    var pullRes = this.cloudStore.pull(key);
    if (pullRes.error) {
      this.metrics.errors++;
      this._emit('error', { op: 'restore', key: key, error: pullRes.error });
      this.status = SYNC_STATUS.ERROR;
      return { error: pullRes.error };
    }
    var localMeta = this.localStore.meta[key];
    if (localMeta && this._detectConflict(localMeta, pullRes.version, pullRes.timestamp)) {
      this.metrics.conflicts++;
      this.status = SYNC_STATUS.CONFLICT;
      var resolved = this._resolveConflict(this.localStore.data[key], localMeta, pullRes.payload, pullRes.version, pullRes.timestamp);
      this._emit('conflict', { key: key, resolution: resolved });
      if (resolved.resolution === 'cloud_kept' || resolved.resolution === 'cloud_newer') {
        this.localStore.data[key] = resolved.value;
        this.localStore.meta[key] = { version: resolved.version, timestamp: resolved.timestamp, dirty: false };
      }
      return { success: true, key: key, conflict: true, resolution: resolved };
    }
    this.localStore.data[key] = pullRes.payload;
    this.localStore.meta[key] = { version: pullRes.version, timestamp: pullRes.timestamp, dirty: false };
    this.localStore._saveToPersistence();
    this.metrics.pulls++;
    this._emit('restored', { key: key, version: pullRes.version });
    return { success: true, key: key, version: pullRes.version, value: pullRes.payload };
  };

  FederatedSyncManager.prototype.sync = function () {
    this.status = SYNC_STATUS.SYNCING;
    this._emit('sync_started', { timestamp: Date.now() });
    var dirty = this.localStore.getDirty();
    var pushed = 0;
    var failed = 0;
    for (var i = 0; i < dirty.length; i++) {
      var item = dirty[i];
      var pushRes = this.cloudStore.push(item.key, item.value, item.meta.version, item.meta.timestamp, { deviceId: this.deviceId });
      if (pushRes.error) {
        failed++;
        this.metrics.errors++;
      } else {
        this.localStore.markSynced(item.key);
        this.metrics.pushes++;
        this.metrics.bytes += JSON.stringify(item.value).length;
        pushed++;
      }
    }
    var cloudList = this.cloudStore.list();
    var pulled = 0;
    for (var j = 0; j < cloudList.length; j++) {
      var cid = cloudList[j].id;
      var localMeta = this.localStore.meta[cid];
      if (!localMeta) {
        // cloud-only key, pull it
        var pullRes0 = this.cloudStore.pull(cid);
        if (!pullRes0.error) {
          this.localStore.data[cid] = pullRes0.payload;
          this.localStore.meta[cid] = { version: pullRes0.version, timestamp: pullRes0.timestamp, dirty: false };
          this.localStore._saveToPersistence();
          this.metrics.pulls++;
          pulled++;
        }
      } else if (localMeta.version < cloudList[j].version) {
        // cloud ahead, pull
        var pullRes = this.cloudStore.pull(cid);
        if (!pullRes.error) {
          if (this._detectConflict(localMeta, pullRes.version, pullRes.timestamp)) {
            this.metrics.conflicts++;
            this.status = SYNC_STATUS.CONFLICT;
            var resolved = this._resolveConflict(this.localStore.data[cid], localMeta, pullRes.payload, pullRes.version, pullRes.timestamp);
            this._emit('conflict', { key: cid, resolution: resolved });
            if (resolved.resolution === 'cloud_kept' || resolved.resolution === 'cloud_newer') {
              this.localStore.data[cid] = resolved.value;
              this.localStore.meta[cid] = { version: resolved.version, timestamp: resolved.timestamp, dirty: false };
            }
          } else {
            this.localStore.data[cid] = pullRes.payload;
            this.localStore.meta[cid] = { version: pullRes.version, timestamp: pullRes.timestamp, dirty: false };
          }
          this.localStore._saveToPersistence();
          this.metrics.pulls++;
          pulled++;
        }
      } else if (localMeta.version > cloudList[j].version) {
        // local ahead — push local to cloud, no conflict (local is authoritative)
        var pushLocal = this.cloudStore.push(cid, this.localStore.data[cid], localMeta.version, localMeta.timestamp, { deviceId: this.deviceId });
        if (!pushLocal.error) {
          this.localStore.markSynced(cid);
          this.metrics.pushes++;
          this.metrics.bytes += JSON.stringify(this.localStore.data[cid]).length;
          pushed++;
        } else {
          failed++;
          this.metrics.errors++;
        }
      }
    }
    var status = failed > 0 ? SYNC_STATUS.ERROR : SYNC_STATUS.ONLINE;
    this.status = status;
    this.metrics.syncs++;
    this.lastSyncTime = Date.now();
    this._recordHistory({ type: 'sync', pushed: pushed, pulled: pulled, failed: failed, timestamp: this.lastSyncTime });
    this._emit('sync_completed', { pushed: pushed, pulled: pulled, failed: failed, timestamp: this.lastSyncTime });
    return { success: true, pushed: pushed, pulled: pulled, failed: failed, status: status };
  };

  FederatedSyncManager.prototype._recordHistory = function (entry) {
    this.syncHistory.push(entry);
    if (this.syncHistory.length > this.maxHistory) {
      this.syncHistory = this.syncHistory.slice(this.syncHistory.length - this.maxHistory);
    }
  };

  FederatedSyncManager.prototype.getHistory = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.syncHistory.slice(-limit);
    }
    return this.syncHistory.slice();
  };

  FederatedSyncManager.prototype.getStatus = function () {
    return {
      status: this.status,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.queue.length,
      localSize: this.localStore.size(),
      cloudSize: this.cloudStore.size(),
      deviceId: this.deviceId,
      autoSync: this.autoSync,
      conflictStrategy: this.conflictStrategy
    };
  };

  FederatedSyncManager.prototype.getMetrics = function () {
    return {
      syncs: this.metrics.syncs,
      conflicts: this.metrics.conflicts,
      errors: this.metrics.errors,
      bytes: this.metrics.bytes,
      pushes: this.metrics.pushes,
      pulls: this.metrics.pulls
    };
  };

  FederatedSyncManager.prototype.getConflicts = function () {
    return this.conflicts.slice();
  };

  FederatedSyncManager.prototype.clearConflicts = function () {
    var n = this.conflicts.length;
    this.conflicts = [];
    return { success: true, cleared: n };
  };

  FederatedSyncManager.prototype.startAutoSync = function () {
    if (this._autoTimer) return { error: 'already_running' };
    this.autoSync = true;
    var self = this;
    this._autoTimer = setInterval(function () {
      try { self.sync(); } catch (e) { self.metrics.errors++; }
    }, this.syncInterval);
    return { success: true, interval: this.syncInterval };
  };

  FederatedSyncManager.prototype.stopAutoSync = function () {
    if (!this._autoTimer) return { error: 'not_running' };
    clearInterval(this._autoTimer);
    this._autoTimer = null;
    this.autoSync = false;
    return { success: true };
  };

  FederatedSyncManager.prototype.exportForGist = function () {
    var snapshot = this.localStore.exportAll();
    return JSON.stringify({
      format: 'federated-gist-v1',
      deviceId: this.deviceId,
      timestamp: Date.now(),
      snapshot: snapshot
    });
  };

  FederatedSyncManager.prototype.importFromGist = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'federated-gist-v1') return { error: 'unknown_format' };
      if (!parsed.snapshot || typeof parsed.snapshot !== 'object') return { error: 'invalid_snapshot' };
      var r = this.localStore.importAll(parsed.snapshot);
      if (r.error) return r;
      this._emit('imported', { count: r.count, source: parsed.deviceId, timestamp: parsed.timestamp });
      return { success: true, count: r.count, source: parsed.deviceId };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  FederatedSyncManager.prototype.clear = function () {
    this.localStore.clear();
    this.cloudStore.clear();
    this.queue = [];
    this.conflicts = [];
    this.syncHistory = [];
    this.metrics = { syncs: 0, conflicts: 0, errors: 0, bytes: 0, pushes: 0, pulls: 0 };
    this.status = SYNC_STATUS.OFFLINE;
    this.lastSyncTime = null;
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------
  if (typeof window !== 'undefined') {
    window.FederatedSyncManager = FederatedSyncManager;
    window.LocalStore = LocalStore;
    window.InMemoryCloudStore = InMemoryCloudStore;
    window.SYNC_STATUS = SYNC_STATUS;
    window.CONFLICT_STRATEGIES = CONFLICT_STRATEGIES;
    window.QUEUE_OP_TYPES = QUEUE_OP_TYPES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FederatedSyncManager: FederatedSyncManager, LocalStore: LocalStore, InMemoryCloudStore: InMemoryCloudStore, SYNC_STATUS: SYNC_STATUS, CONFLICT_STRATEGIES: CONFLICT_STRATEGIES, QUEUE_OP_TYPES: QUEUE_OP_TYPES };
  }
})();
