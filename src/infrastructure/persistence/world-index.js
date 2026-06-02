// ============================================================================
// Persistent World — V5: WorldIndex + PersistentWorld unified API
// nanobot mesh + chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

var PersistentWorld = function(worldSeed, options) {
  this.worldSeed = worldSeed;
  this.gameState = new PersistentGameState(worldSeed.seedId);
  this.eventBus = new WorldEventBus();
  this.eventQueue = new DynamicEventQueue(this.eventBus);
  this.chunkLoader = new ChunkLoader(worldSeed, options && options.chunkSize ? options.chunkSize : 16);
  this.migrationManager = new WorldMigrationManager(worldSeed, this.chunkLoader);
  this.migrationManager.setWorldState(this.gameState);
  this.options = options || {};
  this.createdAt = Date.now();
  this.tickCount = 0;
};

PersistentWorld.prototype.addPlayer = function(playerId, playerData) {
  return this.gameState.addPlayer(playerId, playerData);
};

PersistentWorld.prototype.updatePlayer = function(playerId, updates) {
  var result = this.gameState.updatePlayer(playerId, updates);
  if (result.success) {
    this.eventBus.publish(new WorldEvent('player:updated', { playerId: playerId, updates: updates }));
  }
  return result;
};

PersistentWorld.prototype.getPlayer = function(playerId) {
  return this.gameState.getPlayer(playerId);
};

PersistentWorld.prototype.getWorldTile = function(x, y) {
  return this.worldSeed.getTile(x, y);
};

PersistentWorld.prototype.getChunk = function(cx, cy) {
  return this.chunkLoader.getChunk(cx, cy);
};

PersistentWorld.prototype.publishEvent = function(type, data) {
  return this.eventBus.publish(new WorldEvent(type, data));
};

PersistentWorld.prototype.subscribe = function(eventType, handler, handlerId) {
  return this.eventBus.subscribe(eventType, handler, handlerId);
};

PersistentWorld.prototype.tick = function(now) {
  this.tickCount++;
  var queueResult = this.eventQueue.tick(now);
  return { tickCount: this.tickCount, queueProcessed: queueResult.processed };
};

PersistentWorld.prototype.createCheckpoint = function(label) {
  return this.migrationManager.createCheckpoint(label);
};

PersistentWorld.prototype.save = function(saveId) {
  if (!this.internalSaveManager) this.internalSaveManager = new SaveLoadManager();
  return this.internalSaveManager.save(saveId, this.gameState);
};

PersistentWorld.prototype.load = function(saveId, saveManager) {
  saveManager = saveManager || this.internalSaveManager || new SaveLoadManager();
  var result = saveManager.load(saveId);
  if (!result.success) return result;
  var data = result.gameState;
  this.gameState = new PersistentGameState(data.worldId);
  Object.keys(data.playerStates).forEach(function(pid) {
    this.gameState.playerStates[pid] = data.playerStates[pid];
  }.bind(this));
  this.gameState.worldModifications = data.worldModifications || [];
  this.gameState.questStates = data.questStates || {};
  this.gameState.timeOfDay = data.timeOfDay;
  this.gameState.season = data.season;
  this.gameState.globalFlags = data.globalFlags || {};
  this.eventBus.publish(new WorldEvent('world:loaded', { saveId: saveId }));
  return { success: true, loaded: true };
};

PersistentWorld.prototype.getStatistics = function() {
  return {
    worldId: this.worldSeed.seedId,
    tickCount: this.tickCount,
    playerCount: Object.keys(this.gameState.playerStates).length,
    eventDispatchCount: this.eventBus.dispatchCount,
    loadedChunks: this.chunkLoader.getLoadedChunkCount(),
    activeMigrations: Object.keys(this.migrationManager.activeMigrations).length
  };
};

window.PersistentWorld = PersistentWorld;