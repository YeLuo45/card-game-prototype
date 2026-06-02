// ============================================================================
// Collab Arena — V4: CollabBroadcast + TurnNotificationSystem
// thunderbolt feedback pipeline + nanobot mesh communication
// ============================================================================
'use strict';

var BroadcastChannel = function(sessionId, collabManager) {
  this.sessionId = sessionId;
  this.collabManager = collabManager;
  this.listeners = [];
  this.messageQueue = [];
  this.pendingDeliveries = {};
  this.broadcastLog = [];
};

BroadcastChannel.prototype.subscribe = function(playerId, callback) {
  var id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  this.listeners.push({ id: id, playerId: playerId, callback: callback });
  return { success: true, subscriptionId: id, listenerCount: this.listeners.length };
};

BroadcastChannel.prototype.unsubscribe = function(subscriptionId) {
  var idx = -1;
  for (var i = 0; i < this.listeners.length; i++) {
    if (this.listeners[i].id === subscriptionId) { idx = i; break; }
  }
  if (idx === -1) return { error: 'subscription_not_found' };
  this.listeners.splice(idx, 1);
  return { success: true, listenerCount: this.listeners.length };
};

BroadcastChannel.prototype.broadcast = function(eventType, data, excludePlayerId) {
  var msg = { eventType: eventType, data: data, sessionId: this.sessionId, timestamp: Date.now(), broadcastId: 'bc_' + Date.now() };
  this.broadcastLog.push(msg);
  var delivered = 0;
  for (var i = 0; i < this.listeners.length; i++) {
    var listener = this.listeners[i];
    if (excludePlayerId && listener.playerId === excludePlayerId) continue;
    try {
      if (typeof listener.callback === 'function') {
        listener.callback(msg);
        delivered++;
      }
    } catch (e) {
      console.error('Broadcast callback error:', e);
    }
  }
  return { success: true, deliveredCount: delivered, totalListeners: this.listeners.length, broadcastId: msg.broadcastId };
};

BroadcastChannel.prototype.getListeners = function() {
  return this.listeners.map(function(l) { return { id: l.id, playerId: l.playerId }; });
};

var TurnNotificationSystem = function(broadcastChannel) {
  this.broadcastChannel = broadcastChannel;
  this.notificationHistory = [];
};

TurnNotificationSystem.prototype.notifyTurnStart = function(sessionId, playerId, turnNumber) {
  var msg = { type: 'turn_start', playerId: playerId, turnNumber: turnNumber, timeLimit: 30000 };
  var result = this.broadcastChannel.broadcast('turn_start', msg, null);
  this.notificationHistory.push({ event: 'turn_start', sessionId: sessionId, playerId: playerId, turnNumber: turnNumber, timestamp: Date.now() });
  return result;
};

TurnNotificationSystem.prototype.notifyTurnEnd = function(sessionId, playerId, turnNumber, action) {
  var msg = { type: 'turn_end', playerId: playerId, turnNumber: turnNumber, action: action, nextPlayer: null };
  this.notificationHistory.push({ event: 'turn_end', sessionId: sessionId, playerId: playerId, turnNumber: turnNumber, action: action, timestamp: Date.now() });
  return this.broadcastChannel.broadcast('turn_end', msg, null);
};

TurnNotificationSystem.prototype.notifyPhaseChange = function(sessionId, phase, phaseData) {
  var msg = { type: 'phase_change', phase: phase, data: phaseData };
  this.notificationHistory.push({ event: 'phase_change', sessionId: sessionId, phase: phase, timestamp: Date.now() });
  return this.broadcastChannel.broadcast('phase_change', msg, null);
};

TurnNotificationSystem.prototype.notifyGameEnd = function(sessionId, result, rankings) {
  var msg = { type: 'game_end', result: result, rankings: rankings };
  this.notificationHistory.push({ event: 'game_end', sessionId: sessionId, result: result, timestamp: Date.now() });
  return this.broadcastChannel.broadcast('game_end', msg, null);
};

TurnNotificationSystem.prototype.getNotificationHistory = function(sessionId) {
  return this.notificationHistory.filter(function(n) { return n.sessionId === sessionId; });
};

var CollabBroadcastManager = function() {
  this.channels = {};
  this.notificationSystems = {};
};

CollabBroadcastManager.prototype.getOrCreateChannel = function(sessionId, collabManager) {
  if (!this.channels[sessionId]) {
    this.channels[sessionId] = new BroadcastChannel(sessionId, collabManager);
    this.notificationSystems[sessionId] = new TurnNotificationSystem(this.channels[sessionId]);
  }
  return this.channels[sessionId];
};

CollabBroadcastManager.prototype.getNotificationSystem = function(sessionId) {
  return this.notificationSystems[sessionId] || null;
};

window.BroadcastChannel = BroadcastChannel;
window.TurnNotificationSystem = TurnNotificationSystem;
window.CollabBroadcastManager = CollabBroadcastManager;
