// ============================================================================
// PvP Co-op — V284 Direction D Iteration 3/9
// RealTimeSync: 实时同步 (action broadcast/latency/sync state/conflict resolution)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var SYNC_STATE = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    SYNCING: 'syncing',
    IN_SYNC: 'in_sync',
    ERROR: 'error'
  };

  function RealTimeSync(options) {
    options = options || {};
    this.channels = {};
    this.maxLatencyMs = options.maxLatencyMs || 200;
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.sessions = {};
    this.actionLog = [];
    this.metrics = {
      broadcasts: 0,
      receptions: 0,
      conflicts: 0,
      drops: 0,
      avgLatency: 0,
      maxLatency: 0
    };
    this._latencySum = 0;
    this._latencyCount = 0;
  }

  RealTimeSync.prototype.createSession = function (sessionId, options) {
    if (typeof sessionId !== 'string') return { error: 'invalid_id' };
    if (this.sessions[sessionId]) return { error: 'already_exists' };
    this.sessions[sessionId] = {
      sessionId: sessionId,
      state: SYNC_STATE.CONNECTED,
      participants: [],
      lastTick: Date.now(),
      tickRate: (options && options.tickRate) || 30,
      createdAt: Date.now()
    };
    return { success: true, session: this.sessions[sessionId] };
  };

  RealTimeSync.prototype.joinSession = function (sessionId, participantId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (s.participants.indexOf(participantId) !== -1) return { error: 'already_joined' };
    s.participants.push(participantId);
    return { success: true };
  };

  RealTimeSync.prototype.leaveSession = function (sessionId, participantId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    var idx = s.participants.indexOf(participantId);
    if (idx === -1) return { error: 'not_joined' };
    s.participants.splice(idx, 1);
    return { success: true };
  };

  RealTimeSync.prototype.broadcast = function (sessionId, action, options) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (!action || typeof action !== 'object') return { error: 'invalid_action' };
    options = options || {};
    var entry = {
      sessionId: sessionId,
      action: action,
      senderId: options.senderId || null,
      ts: Date.now(),
      seq: this.metrics.broadcasts + 1,
      delivered: 0
    };
    this.actionLog.push(entry);
    if (this.actionLog.length > this.maxBufferSize) {
      this.actionLog = this.actionLog.slice(-this.maxBufferSize);
      this.metrics.drops++;
    }
    this.metrics.broadcasts++;
    s.state = SYNC_STATE.SYNCING;
    s.lastTick = entry.ts;
    return { success: true, seq: entry.seq, timestamp: entry.ts };
  };

  RealTimeSync.prototype.receive = function (sessionId, action, latencyMs, options) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    this.metrics.receptions++;
    if (typeof latencyMs === 'number' && latencyMs >= 0) {
      this._latencySum += latencyMs;
      this._latencyCount++;
      this.metrics.avgLatency = this._latencySum / this._latencyCount;
      if (latencyMs > this.metrics.maxLatency) this.metrics.maxLatency = latencyMs;
      if (latencyMs > this.maxLatencyMs) {
        s.state = SYNC_STATE.SYNCING;  // lag detected
        this.metrics.drops++;
      } else {
        s.state = SYNC_STATE.IN_SYNC;
      }
    }
    return { success: true };
  };

  RealTimeSync.prototype.detectConflict = function (sessionId, actions) {
    if (!Array.isArray(actions)) return { error: 'invalid_input' };
    if (actions.length < 2) return { success: true, conflict: false };
    // simple conflict: same targetId with different values within short window
    var conflicts = [];
    for (var i = 0; i < actions.length; i++) {
      for (var j = i + 1; j < actions.length; j++) {
        var a = actions[i];
        var b = actions[j];
        if (a.targetId && b.targetId && a.targetId === b.targetId) {
          if (JSON.stringify(a.value) !== JSON.stringify(b.value)) {
            var tsDiff = Math.abs((a.ts || 0) - (b.ts || 0));
            if (tsDiff < 100) {
              conflicts.push({ actionA: a, actionB: b, targetId: a.targetId, tsDiff: tsDiff });
            }
          }
        }
      }
    }
    this.metrics.conflicts += conflicts.length;
    return { success: true, conflict: conflicts.length > 0, conflicts: conflicts };
  };

  RealTimeSync.prototype.getSession = function (sessionId) {
    return this.sessions[sessionId] || null;
  };

  RealTimeSync.prototype.getSessionState = function (sessionId) {
    var s = this.sessions[sessionId];
    return s ? s.state : null;
  };

  RealTimeSync.prototype.setSessionState = function (sessionId, state) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    s.state = state;
    return { success: true };
  };

  RealTimeSync.prototype.getActionLog = function (sessionId, limit) {
    var arr = sessionId ? this.actionLog.filter(function (a) { return a.sessionId === sessionId; }) : this.actionLog;
    if (typeof limit === 'number' && limit > 0) return arr.slice(-limit);
    return arr.slice();
  };

  RealTimeSync.prototype.getLatencyStats = function () {
    return {
      average: this.metrics.avgLatency,
      max: this.metrics.maxLatency,
      samples: this._latencyCount
    };
  };

  RealTimeSync.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  RealTimeSync.prototype.getSummary = function () {
    return {
      totalSessions: Object.keys(this.sessions).length,
      totalParticipants: Object.keys(this.sessions).reduce(function (sum, k) {
        return sum + this.sessions[k].participants.length;
      }.bind(this), 0),
      actionLogSize: this.actionLog.length,
      metrics: this.metrics,
      latencyStats: this.getLatencyStats()
    };
  };

  RealTimeSync.prototype.clear = function () {
    this.sessions = {};
    this.actionLog = [];
    this.metrics = { broadcasts: 0, receptions: 0, conflicts: 0, drops: 0, avgLatency: 0, maxLatency: 0 };
    this._latencySum = 0;
    this._latencyCount = 0;
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.RealTimeSync = RealTimeSync;
    window.SYNC_STATE = SYNC_STATE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealTimeSync: RealTimeSync, SYNC_STATE: SYNC_STATE };
  }
})();
