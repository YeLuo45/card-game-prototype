// ============================================================================
// Persistent World — V2: PersistentGameState + SaveLoadManager
// generic-agent autonomous state persistence + thunderbolt feedback loops
// ============================================================================
'use strict';

var PersistentGameState = function(worldId) {
  this.worldId = worldId;
  this.version = '1.0.0';
  this.savedAt = null;
  this.playerStates = {};
  this.worldModifications = [];
  this.questStates = {};
  this.timeOfDay = 0;
  this.season = 'spring';
  this.day = 0;
  this.globalFlags = {};
};

PersistentGameState.prototype.addPlayer = function(playerId, playerData) {
  playerData = playerData || {};
  playerData = playerData || {};
  this.playerStates[playerId] = {
    playerId: playerId,
    position: playerData.position || { x: 0, y: 0 },
    health: playerData.health || 100,
    maxHealth: playerData.maxHealth || 100,
    inventory: playerData.inventory || [],
    equipment: playerData.equipment || {},
    skills: playerData.skills || {},
    experience: playerData.experience || 0,
    level: playerData.level || 1,
    joinedAt: Date.now(),
    lastSeen: Date.now()
  };
  return { success: true, player: this.playerStates[playerId] };
};

PersistentGameState.prototype.updatePlayer = function(playerId, updates) {
  if (!this.playerStates[playerId]) return { error: 'player_not_found' };
  var player = this.playerStates[playerId];
  var leveledUp = false;
  for (var key in updates) {
    if (key === 'position') {
      player.position = { x: updates.position.x, y: updates.position.y };
    } else if (key === 'inventory') {
      player.inventory = updates.inventory.slice();
    } else if (key === 'experience') {
      player.experience = updates.experience;
      var levelResult = this._checkLevelUp(player);
      if (levelResult.leveledUp) leveledUp = true;
    } else {
      player[key] = updates[key];
    }
  }
  player.lastSeen = Date.now();
  return { success: true, player: player, leveledUp: leveledUp };
};

PersistentGameState.prototype._checkLevelUp = function(player) {
  var expThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
  var newLevel = 1;
  for (var i = 1; i < expThresholds.length; i++) {
    if (player.experience >= expThresholds[i]) newLevel = i + 1;
  }
  if (newLevel > player.level) {
    player.level = newLevel;
    player.maxHealth = 100 + (newLevel - 1) * 20;
    player.health = Math.min(player.health, player.maxHealth);
    return { leveledUp: true, newLevel: newLevel };
  }
  return { leveledUp: false };
};

PersistentGameState.prototype.getPlayer = function(playerId) {
  return this.playerStates[playerId] || null;
};

PersistentGameState.prototype.removePlayer = function(playerId) {
  if (!this.playerStates[playerId]) return { error: 'player_not_found' };
  delete this.playerStates[playerId];
  return { success: true };
};

PersistentGameState.prototype.addWorldModification = function(modType, position, data) {
  var mod = {
    id: 'mod_' + Date.now(),
    type: modType,
    position: position,
    data: data || {},
    timestamp: Date.now()
  };
  this.worldModifications.push(mod);
  return { success: true, modification: mod };
};

PersistentGameState.prototype.getModificationsInRegion = function(x, y, radius) {
  var mods = [];
  for (var i = 0; i < this.worldModifications.length; i++) {
    var mod = this.worldModifications[i];
    var dx = mod.position.x - x;
    var dy = mod.position.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) mods.push(mod);
  }
  return mods;
};

PersistentGameState.prototype.setQuestState = function(questId, state, progress) {
  this.questStates[questId] = { state: state, progress: progress || 0, updatedAt: Date.now() };
  return { success: true, quest: this.questStates[questId] };
};

PersistentGameState.prototype.getQuestState = function(questId) {
  return this.questStates[questId] || null;
};

PersistentGameState.prototype.setGlobalFlag = function(flagKey, value) {
  this.globalFlags[flagKey] = value;
  return { success: true };
};

PersistentGameState.prototype.getGlobalFlag = function(flagKey) {
  return this.globalFlags[flagKey] !== undefined ? this.globalFlags[flagKey] : null;
};

PersistentGameState.prototype.advanceTime = function(hours) {
  if (this.day === undefined) this.day = 0;
  var prevTime = this.timeOfDay;
  this.timeOfDay = (this.timeOfDay + hours) % 24;
  if (prevTime + hours >= 24) this.day++;
  if (this.timeOfDay >= 0 && this.timeOfDay < 6) this.season = 'spring';
  else if (this.timeOfDay >= 6 && this.timeOfDay < 12) this.season = 'summer';
  else if (this.timeOfDay >= 12 && this.timeOfDay < 18) this.season = 'autumn';
  else this.season = 'winter';
  return { timeOfDay: this.timeOfDay, season: this.season };
};

PersistentGameState.prototype.serialize = function() {
  return JSON.parse(JSON.stringify({
    worldId: this.worldId,
    version: this.version,
    savedAt: Date.now(),
    playerStates: this.playerStates,
    worldModifications: this.worldModifications,
    questStates: this.questStates,
    timeOfDay: this.timeOfDay,
    season: this.season,
    globalFlags: this.globalFlags
  }));
};

var SaveLoadManager = function() {
  this.saves = {};
  this.saveSlots = 10;
  this.activeSaveId = null;
};

SaveLoadManager.prototype.save = function(saveId, gameState) {
  if (Object.keys(this.saves).length >= this.saveSlots && !this.saves[saveId]) {
    return { error: 'save_slots_full' };
  }
  this.saves[saveId] = {
    saveId: saveId,
    gameState: gameState.serialize(),
    savedAt: Date.now(),
    sizeBytes: JSON.stringify(gameState.serialize()).length
  };
  this.activeSaveId = saveId;
  return { success: true, saveId: saveId, sizeBytes: this.saves[saveId].sizeBytes };
};

SaveLoadManager.prototype.load = function(saveId) {
  var save = this.saves[saveId];
  if (!save) return { error: 'save_not_found' };
  return { success: true, gameState: save.gameState, savedAt: save.savedAt };
};

SaveLoadManager.prototype.deleteSave = function(saveId) {
  if (!this.saves[saveId]) return { error: 'save_not_found' };
  delete this.saves[saveId];
  if (this.activeSaveId === saveId) this.activeSaveId = null;
  return { success: true };
};

SaveLoadManager.prototype.listSaves = function() {
  var saves = [];
  for (var id in this.saves) {
    saves.push({ saveId: id, savedAt: this.saves[id].savedAt, sizeBytes: this.saves[id].sizeBytes });
  }
  return saves.sort(function(a, b) { return b.savedAt - a.savedAt; });
};

SaveLoadManager.prototype.hasSave = function(saveId) {
  return !!this.saves[saveId];
};

SaveLoadManager.prototype.getActiveSave = function() {
  return this.activeSaveId ? { saveId: this.activeSaveId, save: this.saves[this.activeSaveId] } : null;
};

window.PersistentGameState = PersistentGameState;
window.SaveLoadManager = SaveLoadManager;