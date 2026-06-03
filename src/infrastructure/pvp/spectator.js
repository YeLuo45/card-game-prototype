// ============================================================================
// PvP Co-op — V288 Direction D Iteration 7/9
// Spectator: 观战 (加入/离开/视角切换/聊天/统计)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function Spectator(options) {
    options = options || {};
    this.sessions = {};
    this.maxSpectators = options.maxSpectators || 100;
    this.sessionCounter = 0;
    this.metrics = {
      sessionsCreated: 0,
      joined: 0,
      left: 0,
      viewSwitches: 0,
      messages: 0
    };
  }

  Spectator.prototype.createSession = function (matchId, options) {
    options = options || {};
    var sessionId = 's_' + (++this.sessionCounter) + '_' + Date.now();
    this.sessions[sessionId] = {
      sessionId: sessionId,
      matchId: matchId,
      spectators: [],
      maxSpectators: options.maxSpectators || this.maxSpectators,
      chat: [],
      cameraFocus: options.cameraFocus || 'overview',
      delayedSeconds: options.delayedSeconds || 0,
      allowChat: options.allowChat !== false,
      createdAt: Date.now(),
      endedAt: null
    };
    this.metrics.sessionsCreated++;
    return { success: true, sessionId: sessionId, session: this.sessions[sessionId] };
  };

  Spectator.prototype.endSession = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    s.endedAt = Date.now();
    return { success: true };
  };

  Spectator.prototype.join = function (sessionId, spectatorId, options) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (s.endedAt) return { error: 'session_ended' };
    if (s.spectators.length >= s.maxSpectators) return { error: 'session_full' };
    for (var i = 0; i < s.spectators.length; i++) {
      if (s.spectators[i].spectatorId === spectatorId) return { error: 'already_joined' };
    }
    s.spectators.push({
      spectatorId: spectatorId,
      joinedAt: Date.now(),
      cameraFocus: s.cameraFocus,
      preferences: options || {}
    });
    this.metrics.joined++;
    return { success: true };
  };

  Spectator.prototype.leave = function (sessionId, spectatorId) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    for (var i = 0; i < s.spectators.length; i++) {
      if (s.spectators[i].spectatorId === spectatorId) {
        s.spectators.splice(i, 1);
        this.metrics.left++;
        return { success: true };
      }
    }
    return { error: 'not_in_session' };
  };

  Spectator.prototype.switchCamera = function (sessionId, spectatorId, target) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    for (var i = 0; i < s.spectators.length; i++) {
      if (s.spectators[i].spectatorId === spectatorId) {
        s.spectators[i].cameraFocus = target;
        this.metrics.viewSwitches++;
        return { success: true };
      }
    }
    return { error: 'not_in_session' };
  };

  Spectator.prototype.sendChat = function (sessionId, spectatorId, message) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    if (!s.allowChat) return { error: 'chat_disabled' };
    if (typeof message !== 'string' || message.length === 0) return { error: 'invalid_message' };
    // check spectator
    var found = false;
    for (var i = 0; i < s.spectators.length; i++) {
      if (s.spectators[i].spectatorId === spectatorId) { found = true; break; }
    }
    if (!found) return { error: 'not_in_session' };
    var entry = { spectatorId: spectatorId, message: message, ts: Date.now() };
    s.chat.push(entry);
    if (s.chat.length > 500) s.chat = s.chat.slice(-500);
    this.metrics.messages++;
    return { success: true, entry: entry };
  };

  Spectator.prototype.getChat = function (sessionId, limit) {
    var s = this.sessions[sessionId];
    if (!s) return null;
    if (typeof limit === 'number' && limit > 0) return s.chat.slice(-limit);
    return s.chat.slice();
  };

  Spectator.prototype.setAllowChat = function (sessionId, allow) {
    var s = this.sessions[sessionId];
    if (!s) return { error: 'not_found' };
    s.allowChat = !!allow;
    return { success: true };
  };

  Spectator.prototype.kick = function (sessionId, spectatorId) {
    return this.leave(sessionId, spectatorId);
  };

  Spectator.prototype.getSession = function (sessionId) {
    return this.sessions[sessionId] || null;
  };

  Spectator.prototype.getSpectatorCount = function (sessionId) {
    var s = this.sessions[sessionId];
    return s ? s.spectators.length : 0;
  };

  Spectator.prototype.listSpectators = function (sessionId) {
    var s = this.sessions[sessionId];
    if (!s) return null;
    return s.spectators.slice();
  };

  Spectator.prototype.listSessions = function () {
    var arr = [];
    for (var k in this.sessions) {
      if (Object.prototype.hasOwnProperty.call(this.sessions, k)) {
        arr.push(this.sessions[k]);
      }
    }
    return arr;
  };

  Spectator.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  Spectator.prototype.getSummary = function () {
    return {
      totalSessions: Object.keys(this.sessions).length,
      totalSpectators: Object.keys(this.sessions).reduce(function (sum, k) {
        return sum + this.sessions[k].spectators.length;
      }.bind(this), 0),
      metrics: this.metrics
    };
  };

  Spectator.prototype.clear = function () {
    this.sessions = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.Spectator = Spectator;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Spectator: Spectator };
  }
})();
