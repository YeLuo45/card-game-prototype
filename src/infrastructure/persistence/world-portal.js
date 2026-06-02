// ============================================================================
// Persistent World — V6: WorldPortal + InterWorldBridge
// nanobot distributed mesh + thunderbolt feedback loops
// ============================================================================
'use strict';

var PortalState = { INACTIVE: 'inactive', ACTIVE: 'active', COOLDOWN: 'cooldown', TRANSITIONING: 'transitioning' };

var WorldPortal = function(portalId, sourceWorldId, targetWorldId, position, config) {
  this.portalId = portalId;
  this.sourceWorldId = sourceWorldId;
  this.targetWorldId = targetWorldId;
  this.position = position || { x: 0, y: 0 };
  this.config = config || {};
  this.state = PortalState.INACTIVE;
  this.cooldownUntil = null;
  this.cooldownMs = this.config.cooldownMs || 30000;
  this.linkedPortalId = null;
  this.activationCount = 0;
  this.lastActivatedAt = null;
};

WorldPortal.prototype.activate = function() {
  if (this.state === PortalState.ACTIVE) return { error: 'already_active' };
  if (this.state === PortalState.COOLDOWN) return { error: 'in_cooldown', cooldownRemaining: this.cooldownUntil - Date.now() };
  this.state = PortalState.ACTIVE;
  this.lastActivatedAt = Date.now();
  this.activationCount++;
  return { success: true, portalId: this.portalId, targetWorldId: this.targetWorldId };
};

WorldPortal.prototype.deactivate = function() {
  this.state = PortalState.INACTIVE;
  return { success: true };
};

WorldPortal.prototype.startCooldown = function() {
  this.state = PortalState.COOLDOWN;
  this.cooldownUntil = Date.now() + this.cooldownMs;
  return { success: true, cooldownMs: this.cooldownMs };
};

WorldPortal.prototype.checkCooldown = function() {
  if (this.state !== PortalState.COOLDOWN) return { inCooldown: false };
  if (Date.now() >= this.cooldownUntil) {
    this.state = PortalState.INACTIVE;
    this.cooldownUntil = null;
    return { inCooldown: false };
  }
  return { inCooldown: true, remaining: this.cooldownUntil - Date.now() };
};

WorldPortal.prototype.canTransition = function() {
  return this.state === PortalState.ACTIVE;
};

WorldPortal.prototype.linkTo = function(portalId) {
  this.linkedPortalId = portalId;
  return { success: true, linkedTo: portalId };
};

var InterWorldBridge = function(bridgeId) {
  this.bridgeId = bridgeId;
  this.portals = {};
  this.worldConnections = {};
  this.activeTransitions = [];
  this.transitionHistory = [];
  this.maxConcurrentTransitions = 10;
};

InterWorldBridge.prototype.registerPortal = function(portal) {
  this.portals[portal.portalId] = portal;
  if (!this.worldConnections[portal.sourceWorldId]) this.worldConnections[portal.sourceWorldId] = [];
  this.worldConnections[portal.sourceWorldId].push(portal.portalId);
  return { success: true, registeredPortals: Object.keys(this.portals).length };
};

InterWorldBridge.prototype.getPortal = function(portalId) {
  return this.portals[portalId] || null;
};

InterWorldBridge.prototype.getPortalsForWorld = function(worldId) {
  var ids = this.worldConnections[worldId] || [];
  return ids.map(function(id) { return this.portals[id]; }.bind(this));
};

InterWorldBridge.prototype.initiateTransition = function(playerId, fromPortalId, toPortalId) {
  var fromPortal = this.portals[fromPortalId];
  var toPortal = this.portals[toPortalId];
  if (!fromPortal || !toPortal) return { error: 'portal_not_found' };
  if (!fromPortal.canTransition()) return { error: 'source_not_active' };
  if (this.activeTransitions.length >= this.maxConcurrentTransitions) return { error: 'bridge_full' };
  var transitionId = 'trans_' + Date.now();
  this.activeTransitions.push({
    transitionId: transitionId,
    playerId: playerId,
    fromPortalId: fromPortalId,
    toPortalId: toPortalId,
    startedAt: Date.now(),
    phase: 'initiating'
  });
  fromPortal.state = PortalState.TRANSITIONING;
  toPortal.state = PortalState.TRANSITIONING;
  return { success: true, transitionId: transitionId };
};

InterWorldBridge.prototype.advanceTransition = function(transitionId, progress) {
  var trans = this.activeTransitions.find(function(t) { return t.transitionId === transitionId; });
  if (!trans) return { error: 'transition_not_found' };
  trans.progress = Math.min(100, progress || 0);
  if (trans.progress < 30) trans.phase = 'initiating';
  else if (trans.progress < 70) trans.phase = 'transferring';
  else trans.phase = 'finalizing';
  return { success: true, transition: trans };
};

InterWorldBridge.prototype.completeTransition = function(transitionId) {
  var idx = -1;
  var trans = null;
  for (var i = 0; i < this.activeTransitions.length; i++) {
    if (this.activeTransitions[i].transitionId === transitionId) { idx = i; trans = this.activeTransitions[i]; break; }
  }
  if (idx === -1) return { error: 'transition_not_found' };
  this.activeTransitions.splice(idx, 1);
  trans.completedAt = Date.now();
  trans.phase = 'completed';
  this.transitionHistory.push(trans);
  var fromPortal = this.portals[trans.fromPortalId];
  var toPortal = this.portals[trans.toPortalId];
  if (fromPortal) fromPortal.startCooldown();
  if (toPortal) toPortal.startCooldown();
  return { success: true, transition: trans };
};

InterWorldBridge.prototype.cancelTransition = function(transitionId) {
  var idx = -1;
  var trans = null;
  for (var i = 0; i < this.activeTransitions.length; i++) {
    if (this.activeTransitions[i].transitionId === transitionId) { idx = i; trans = this.activeTransitions[i]; break; }
  }
  if (idx === -1) return { error: 'transition_not_found' };
  this.activeTransitions.splice(idx, 1);
  if (this.portals[trans.fromPortalId]) this.portals[trans.fromPortalId].deactivate();
  if (this.portals[trans.toPortalId]) this.portals[trans.toPortalId].deactivate();
  return { success: true };
};

InterWorldBridge.prototype.getActiveTransitionCount = function() { return this.activeTransitions.length; };

InterWorldBridge.prototype.getTransitionHistory = function(limit) {
  return this.transitionHistory.slice(-(limit || 20));
};

window.PortalState = PortalState;
window.WorldPortal = WorldPortal;
window.InterWorldBridge = InterWorldBridge;