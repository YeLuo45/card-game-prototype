// ============================================================================
// Collab Arena Manager — V2: RoleSystem + RoleAssignmentEngine
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

var PLAYER_ROLES = {
  TANK: 'tank',
  DPS: 'dps',
  SUPPORT: 'support',
  CONTROLLER: 'controller',
  FLEX: 'flex'
};

var RoleSystem = function() {
  this.roles = Object.keys(PLAYER_ROLES);
  this.roleDefinitions = {};
  this._initRoleDefinitions();
};

RoleSystem.prototype._initRoleDefinitions = function() {
  this.roleDefinitions[PLAYER_ROLES.TANK] = {
    name: 'Tank',
    healthBonus: 1.5,
    damageReduction: 0.3,
    tauntRadius: 3,
    canProtect: true
  };
  this.roleDefinitions[PLAYER_ROLES.DPS] = {
    name: 'Damage Dealer',
    healthBonus: 0.8,
    damageReduction: 0.0,
    damageMultiplier: 1.5,
    canProtect: false
  };
  this.roleDefinitions[PLAYER_ROLES.SUPPORT] = {
    name: 'Support',
    healthBonus: 1.0,
    healMultiplier: 2.0,
    canRevive: true,
    canProtect: true
  };
  this.roleDefinitions[PLAYER_ROLES.CONTROLLER] = {
    name: 'Controller',
    healthBonus: 1.0,
    crowdControlBonus: 1.5,
    canDebuff: true,
    canProtect: false
  };
  this.roleDefinitions[PLAYER_ROLES.FLEX] = {
    name: 'Flex',
    healthBonus: 1.0,
    damageMultiplier: 1.1,
    healMultiplier: 1.1,
    canProtect: true
  };
};

RoleSystem.prototype.getRoleDefinition = function(role) {
  return this.roleDefinitions[role] || null;
};

RoleSystem.prototype.getAllRoles = function() {
  return this.roles.slice();
};

RoleSystem.prototype.getCompatibleRoles = function(playerArchetype) {
  var compat = {};
  if (playerArchetype === 'aggro') compat = [PLAYER_ROLES.DPS, PLAYER_ROLES.TANK, PLAYER_ROLES.FLEX];
  else if (playerArchetype === 'control') compat = [PLAYER_ROLES.SUPPORT, PLAYER_ROLES.CONTROLLER, PLAYER_ROLES.FLEX];
  else if (playerArchetype === 'combo') compat = [PLAYER_ROLES.DPS, PLAYER_ROLES.CONTROLLER, PLAYER_ROLES.FLEX];
  else compat = [PLAYER_ROLES.FLEX];
  return compat;
};

var RoleAssignmentEngine = function(roleSystem) {
  this.roleSystem = roleSystem || new RoleSystem();
  this.assignments = {};
  this.assignmentHistory = [];
};

RoleAssignmentEngine.prototype.suggestRole = function(playerId, playerArchetype, currentTeam) {
  var compatibleRoles = this.roleSystem.getCompatibleRoles(playerArchetype);
  var takenRoles = {};
  for (var i = 0; i < currentTeam.length; i++) {
    if (currentTeam[i].role) takenRoles[currentTeam[i].role] = true;
  }
  var suggestedRole = null;
  for (var j = 0; j < compatibleRoles.length; j++) {
    var role = compatibleRoles[j];
    if (!takenRoles[role]) {
      suggestedRole = role;
      break;
    }
  }
  if (!suggestedRole) suggestedRole = PLAYER_ROLES.FLEX;
  return {
    playerId: playerId,
    suggestedRole: suggestedRole,
    alternatives: compatibleRoles.filter(function(r) { return r !== suggestedRole; }),
    reason: this._getRoleReason(suggestedRole, playerArchetype)
  };
};

RoleAssignmentEngine.prototype._getRoleReason = function(role, archetype) {
  if (role === PLAYER_ROLES.TANK && archetype === 'aggro') return 'high health for aggressive play';
  if (role === PLAYER_ROLES.DPS && archetype === 'aggro') return 'maximize damage output';
  if (role === PLAYER_ROLES.SUPPORT && archetype === 'control') return 'healing for control style';
  return 'balanced team composition';
};

RoleAssignmentEngine.prototype.assignRole = function(sessionId, playerId, role) {
  if (!this.assignments[sessionId]) this.assignments[sessionId] = {};
  var prevRole = this.assignments[sessionId][playerId];
  this.assignments[sessionId][playerId] = role;
  this.assignmentHistory.push({
    sessionId: sessionId,
    playerId: playerId,
    role: role,
    previousRole: prevRole,
    timestamp: Date.now()
  });
  return { success: true, role: role, previousRole: prevRole };
};

RoleAssignmentEngine.prototype.getPlayerRole = function(sessionId, playerId) {
  if (!this.assignments[sessionId]) return null;
  var role = this.assignments[sessionId][playerId];
  return role !== undefined ? role : null;
};

RoleAssignmentEngine.prototype.getTeamComposition = function(sessionId) {
  var sessionRoles = this.assignments[sessionId] || {};
  var composition = {};
  for (var pid in sessionRoles) {
    var role = sessionRoles[pid];
    if (!composition[role]) composition[role] = [];
    composition[role].push(pid);
  }
  return composition;
};

RoleAssignmentEngine.prototype.isBalancedTeam = function(sessionId) {
  var comp = this.getTeamComposition(sessionId);
  var roleCount = Object.keys(comp).length;
  return roleCount >= 2;
};

window.PLAYER_ROLES = PLAYER_ROLES;
window.RoleSystem = RoleSystem;
window.RoleAssignmentEngine = RoleAssignmentEngine;
