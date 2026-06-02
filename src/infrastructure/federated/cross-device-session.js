// ============================================================================
// Federated Strategy Cloud — V258 Direction A Iteration 4/9
// CrossDeviceSession: 跨设备会话接续 (战斗状态序列化/恢复/checkpoint)
// 来源：thunderbolt PowerSync + generic-agent L0-L4 + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  var SESSION_STATUS = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    EXPIRED: 'expired',
    ABANDONED: 'abandoned'
  };

  var SESSION_TYPES = {
    BATTLE: 'battle',
    MAP: 'map',
    SHOP: 'shop',
    DECK_BUILD: 'deck_build',
    TOURNAMENT: 'tournament'
  };

  function CrossDeviceSession(syncManager, options) {
    options = options || {};
    this.sync = syncManager || null;
    this.storageKey = options.storageKey || 'active_sessions';
    this.indexKey = options.indexKey || 'session_index';
    this.defaultTtl = options.defaultTtl || (24 * 60 * 60 * 1000);
    this.maxSessions = options.maxSessions || 20;
    this.checkpointInterval = options.checkpointInterval || 30000;
    this.sessions = {};
    this.index = [];
    this._checkpointTimers = {};
    this.deviceId = options.deviceId || (syncManager && syncManager.deviceId) || 'unknown';
    if (this.sync) {
      this._loadFromSync();
    }
  }

  CrossDeviceSession.prototype._loadFromSync = function () {
    if (!this.sync) return;
    var stored = this.sync.localStore.get(this.storageKey);
    if (stored && stored.value) {
      this.sessions = stored.value.sessions || {};
      this.index = stored.value.index || [];
    }
  };

  CrossDeviceSession.prototype._saveToSync = function () {
    if (!this.sync) return { success: false, reason: 'no_sync' };
    return this.sync.localStore.set(this.storageKey, {
      sessions: this.sessions,
      index: this.index
    }, { type: 'sessions' });
  };

  CrossDeviceSession.prototype.createSession = function (sessionId, sessionType, state) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return { error: 'invalid_session_id' };
    if (!sessionType) sessionType = SESSION_TYPES.BATTLE;
    var validTypes = Object.keys(SESSION_TYPES).map(function (k) { return SESSION_TYPES[k]; });
    if (validTypes.indexOf(sessionType) === -1) return { error: 'invalid_type' };
    if (this.sessions[sessionId]) return { error: 'session_exists' };
    var now = Date.now();
    var session = {
      id: sessionId,
      type: sessionType,
      status: SESSION_STATUS.ACTIVE,
      state: state || {},
      createdAt: now,
      updatedAt: now,
      lastCheckpoint: now,
      ttl: this.defaultTtl,
      deviceId: this.deviceId,
      checkpoints: [],
      history: [{ ts: now, action: 'create', deviceId: this.deviceId }]
    };
    this.sessions[sessionId] = session;
    if (this.index.indexOf(sessionId) === -1) this.index.push(sessionId);
    this._enforceMaxSessions();
    this._saveToSync();
    return { success: true, sessionId: sessionId, createdAt: now };
  };

  CrossDeviceSession.prototype._enforceMaxSessions = function () {
    if (this.index.length <= this.maxSessions) return;
    var arr = [];
    for (var i = 0; i < this.index.length; i++) {
      var s = this.sessions[this.index[i]];
      if (s && s.status === SESSION_STATUS.ACTIVE) {
        arr.push({ id: this.index[i], updatedAt: s.updatedAt });
      }
    }
    arr.sort(function (a, b) { return a.updatedAt - b.updatedAt; });
    var toRemove = arr.length - this.maxSessions;
    for (var k = 0; k < toRemove; k++) {
      this._evictSession(arr[k].id);
    }
  };

  CrossDeviceSession.prototype._evictSession = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return;
    s.status = SESSION_STATUS.ABANDONED;
    s.updatedAt = Date.now();
    s.history.push({ ts: s.updatedAt, action: 'evict', reason: 'max_sessions' });
    var idx = this.index.indexOf(sessionId);
    if (idx !== -1) this.index.splice(idx, 1);
    this._saveToSync();
  };

  CrossDeviceSession.prototype.updateState = function (sessionId, partialState) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (s.status === SESSION_STATUS.COMPLETED || s.status === SESSION_STATUS.ABANDONED) {
      return { error: 'session_inactive' };
    }
    if (!partialState || typeof partialState !== 'object') return { error: 'invalid_state' };
    for (var k in partialState) {
      if (Object.prototype.hasOwnProperty.call(partialState, k)) {
        s.state[k] = partialState[k];
      }
    }
    s.updatedAt = Date.now();
    s.history.push({ ts: s.updatedAt, action: 'update', keys: Object.keys(partialState) });
    if (s.history.length > 100) s.history = s.history.slice(-100);
    this._saveToSync();
    return { success: true, sessionId: sessionId, updatedAt: s.updatedAt };
  };

  CrossDeviceSession.prototype.checkpoint = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    var snap = {
      ts: Date.now(),
      state: JSON.parse(JSON.stringify(s.state)),
      deviceId: this.deviceId
    };
    s.checkpoints.push(snap);
    if (s.checkpoints.length > 10) s.checkpoints = s.checkpoints.slice(-10);
    s.lastCheckpoint = snap.ts;
    s.updatedAt = snap.ts;
    s.history.push({ ts: snap.ts, action: 'checkpoint' });
    this._saveToSync();
    return { success: true, ts: snap.ts, checkpointCount: s.checkpoints.length };
  };

  CrossDeviceSession.prototype.pauseSession = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (s.status !== SESSION_STATUS.ACTIVE) return { error: 'not_active' };
    s.status = SESSION_STATUS.PAUSED;
    s.updatedAt = Date.now();
    this.checkpoint(sessionId);
    s.history.push({ ts: s.updatedAt, action: 'pause' });
    this._saveToSync();
    return { success: true, sessionId: sessionId, status: s.status };
  };

  CrossDeviceSession.prototype.resumeSession = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (s.status !== SESSION_STATUS.PAUSED) return { error: 'not_paused' };
    s.status = SESSION_STATUS.ACTIVE;
    s.updatedAt = Date.now();
    s.history.push({ ts: s.updatedAt, action: 'resume', deviceId: this.deviceId });
    this._saveToSync();
    return { success: true, sessionId: sessionId, status: s.status };
  };

  CrossDeviceSession.prototype.completeSession = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    s.status = SESSION_STATUS.COMPLETED;
    s.updatedAt = Date.now();
    s.history.push({ ts: s.updatedAt, action: 'complete' });
    this._saveToSync();
    return { success: true, sessionId: sessionId, status: s.status };
  };

  CrossDeviceSession.prototype.abandonSession = function (sessionId, reason) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    s.status = SESSION_STATUS.ABANDONED;
    s.updatedAt = Date.now();
    s.history.push({ ts: s.updatedAt, action: 'abandon', reason: reason || 'manual' });
    this._saveToSync();
    return { success: true, sessionId: sessionId, status: s.status };
  };

  CrossDeviceSession.prototype.getSession = function (sessionId) {
    return this.sessions[sessionId] || null;
  };

  CrossDeviceSession.prototype.getState = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return null;
    return JSON.parse(JSON.stringify(s.state));
  };

  CrossDeviceSession.prototype.getLatestCheckpoint = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return null;
    if (s.checkpoints.length === 0) return null;
    return s.checkpoints[s.checkpoints.length - 1];
  };

  CrossDeviceSession.prototype.rollbackToCheckpoint = function (sessionId, checkpointIndex) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (s.checkpoints.length === 0) return { error: 'no_checkpoints' };
    var idx = typeof checkpointIndex === 'number' ? checkpointIndex : s.checkpoints.length - 1;
    if (idx < 0 || idx >= s.checkpoints.length) return { error: 'invalid_index' };
    var cp = s.checkpoints[idx];
    s.state = JSON.parse(JSON.stringify(cp.state));
    s.updatedAt = Date.now();
    s.history.push({ ts: s.updatedAt, action: 'rollback', toCheckpoint: idx });
    this._saveToSync();
    return { success: true, sessionId: sessionId, checkpointIndex: idx, state: s.state };
  };

  CrossDeviceSession.prototype.listSessions = function (status) {
    var result = [];
    var seen = {};
    // First, iterate index (active tracked sessions)
    for (var i = 0; i < this.index.length; i++) {
      var s = this.sessions[this.index[i]];
      if (!s) continue;
      seen[this.index[i]] = true;
      if (status && s.status !== status) continue;
      result.push({
        id: s.id,
        type: s.type,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        deviceId: s.deviceId,
        checkpointCount: s.checkpoints.length
      });
    }
    // Then, include abandoned/expired sessions not in index
    for (var k in this.sessions) {
      if (Object.prototype.hasOwnProperty.call(this.sessions, k) && !seen[k]) {
        var s2 = this.sessions[k];
        if (status && s2.status !== status) continue;
        result.push({
          id: s2.id,
          type: s2.type,
          status: s2.status,
          createdAt: s2.createdAt,
          updatedAt: s2.updatedAt,
          deviceId: s2.deviceId,
          checkpointCount: s2.checkpoints.length
        });
      }
    }
    result.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return result;
  };

  CrossDeviceSession.prototype.getActiveSessions = function () {
    return this.listSessions(SESSION_STATUS.ACTIVE);
  };

  CrossDeviceSession.prototype.serializeForTransfer = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    return JSON.stringify({
      format: 'cross-device-session-v1',
      exportedAt: Date.now(),
      sourceDevice: this.deviceId,
      session: s
    });
  };

  CrossDeviceSession.prototype.importFromTransfer = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'cross-device-session-v1') return { error: 'unknown_format' };
      if (!parsed.session || !parsed.session.id) return { error: 'invalid_session' };
      var s = parsed.session;
      s.history.push({ ts: Date.now(), action: 'import', fromDevice: parsed.sourceDevice });
      this.sessions[s.id] = s;
      if (this.index.indexOf(s.id) === -1) this.index.push(s.id);
      this._enforceMaxSessions();
      this._saveToSync();
      return { success: true, sessionId: s.id, fromDevice: parsed.sourceDevice };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  CrossDeviceSession.prototype.expireOldSessions = function () {
    var now = Date.now();
    var expired = [];
    for (var i = 0; i < this.index.length; i++) {
      var s = this.sessions[this.index[i]];
      if (!s) continue;
      if (s.status === SESSION_STATUS.ACTIVE || s.status === SESSION_STATUS.PAUSED) {
        if (now - s.updatedAt > s.ttl) {
          s.status = SESSION_STATUS.EXPIRED;
          s.history.push({ ts: now, action: 'expire' });
          expired.push(s.id);
        }
      }
    }
    if (expired.length > 0) this._saveToSync();
    return { success: true, expired: expired };
  };

  CrossDeviceSession.prototype.syncToCloud = function (sessionId) {
    if (!this.sync) return { error: 'no_sync' };
    if (sessionId) {
      var s = this.sessions[sessionId];
      if (!s) return { error: 'not_found' };
      return this.sync.backup(this.storageKey + '_' + sessionId, s, { type: 'session' });
    }
    return this.sync.backup(this.storageKey, { sessions: this.sessions, index: this.index }, { type: 'sessions' });
  };

  CrossDeviceSession.prototype.loadFromCloud = function (sessionId) {
    if (!this.sync) return { error: 'no_sync' };
    if (sessionId) {
      var r = this.sync.restore(this.storageKey + '_' + sessionId);
      if (r.success && r.value) {
        this.sessions[sessionId] = r.value;
        if (this.index.indexOf(sessionId) === -1) this.index.push(sessionId);
        this._saveToSync();
      }
      return r;
    }
    var r2 = this.sync.restore(this.storageKey);
    if (r2.success && r2.value) {
      this.sessions = r2.value.sessions || {};
      this.index = r2.value.index || [];
    }
    return r2;
  };

  CrossDeviceSession.prototype.startAutoCheckpoint = function (sessionId) {
    if (typeof sessionId !== 'string') return { error: 'invalid_session_id' };
    if (this._checkpointTimers[sessionId]) return { error: 'already_running' };
    var self = this;
    this._checkpointTimers[sessionId] = setInterval(function () {
      try {
        if (self.sessions[sessionId] && self.sessions[sessionId].status === SESSION_STATUS.ACTIVE) {
          self.checkpoint(sessionId);
        }
      } catch (e) { /* ignore */ }
    }, this.checkpointInterval);
    return { success: true, sessionId: sessionId, interval: this.checkpointInterval };
  };

  CrossDeviceSession.prototype.stopAutoCheckpoint = function (sessionId) {
    if (!this._checkpointTimers[sessionId]) return { error: 'not_running' };
    clearInterval(this._checkpointTimers[sessionId]);
    delete this._checkpointTimers[sessionId];
    return { success: true };
  };

  CrossDeviceSession.prototype.getHistory = function (sessionId, limit) {
    var s = this.sessions[sessionId];
    if (!s) return null;
    if (typeof limit === 'number' && limit > 0) {
      return s.history.slice(-limit);
    }
    return s.history.slice();
  };

  CrossDeviceSession.prototype.clear = function () {
    for (var k in this._checkpointTimers) {
      if (Object.prototype.hasOwnProperty.call(this._checkpointTimers, k)) {
        clearInterval(this._checkpointTimers[k]);
      }
    }
    this._checkpointTimers = {};
    this.sessions = {};
    this.index = [];
    this._saveToSync();
    return { success: true };
  };

  CrossDeviceSession.prototype.getSummary = function () {
    var counts = { active: 0, paused: 0, completed: 0, expired: 0, abandoned: 0 };
    for (var i = 0; i < this.index.length; i++) {
      var s = this.sessions[this.index[i]];
      if (s && counts[s.status] !== undefined) counts[s.status]++;
    }
    return {
      deviceId: this.deviceId,
      totalSessions: this.index.length,
      statusCounts: counts,
      checkpointTimers: Object.keys(this._checkpointTimers).length
    };
  };

  if (typeof window !== 'undefined') {
    window.CrossDeviceSession = CrossDeviceSession;
    window.SESSION_STATUS = SESSION_STATUS;
    window.SESSION_TYPES = SESSION_TYPES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrossDeviceSession: CrossDeviceSession, SESSION_STATUS: SESSION_STATUS, SESSION_TYPES: SESSION_TYPES };
  }
})();
