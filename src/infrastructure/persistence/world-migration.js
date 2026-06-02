// ============================================================================
// Persistent World — V4: WorldMigrationManager + ChunkLoader
// generic-agent autonomous migration + ruflo hierarchical decomposition
// ============================================================================
'use strict';

var ChunkLoader = function(worldSeed, chunkSize) {
  this.worldSeed = worldSeed;
  this.chunkSize = chunkSize || 16;
  this.loadedChunks = {};
  this.loadOrder = [];
  this.maxChunksInMemory = 50;
};

ChunkLoader.prototype._getChunkKey = function(cx, cy) { return cx + ',' + cy; };

ChunkLoader.prototype.getChunk = function(cx, cy) {
  var key = this._getChunkKey(cx, cy);
  if (this.loadedChunks[key]) {
    this._touchChunk(key);
    return this.loadedChunks[key];
  }
  return this._loadChunk(cx, cy);
};

ChunkLoader.prototype._loadChunk = function(cx, cy) {
  var key = this._getChunkKey(cx, cy);
  if (Object.keys(this.loadedChunks).length >= this.maxChunksInMemory) {
    var oldestKey = this.loadOrder.shift();
    delete this.loadedChunks[oldestKey];
  }
  var tiles = [];
  for (var ly = 0; ly < this.chunkSize; ly++) {
    var row = [];
    for (var lx = 0; lx < this.chunkSize; lx++) {
      var worldX = cx * this.chunkSize + lx;
      var worldY = cy * this.chunkSize + ly;
      var tile = this.worldSeed.getTile(worldX, worldY);
      row.push(tile ? { terrain: tile.terrain, elevation: tile.elevation } : { terrain: 'unknown', elevation: 0 });
    }
    tiles.push(row);
  }
  this.loadedChunks[key] = { cx: cx, cy: cy, tiles: tiles, loadedAt: Date.now() };
  this.loadOrder.push(key);
  return this.loadedChunks[key];
};

ChunkLoader.prototype._touchChunk = function(key) {
  var idx = this.loadOrder.indexOf(key);
  if (idx >= 0) { this.loadOrder.splice(idx, 1); this.loadOrder.push(key); }
};

ChunkLoader.prototype.getLoadedChunkCount = function() { return Object.keys(this.loadedChunks).length; };

ChunkLoader.prototype.unloadChunk = function(cx, cy) {
  var key = this._getChunkKey(cx, cy);
  if (this.loadedChunks[key]) { delete this.loadedChunks[key]; return { success: true }; }
  return { error: 'chunk_not_loaded' };
};

var WorldMigrationManager = function(worldSeed, chunkLoader) {
  this.worldSeed = worldSeed;
  this.chunkLoader = chunkLoader || new ChunkLoader(worldSeed);
  this.activeMigrations = {};
  this.migrationHistory = [];
  this.worldState = null;
  this.checkpointInterval = 60000;
  this.lastCheckpoint = null;
};

WorldMigrationManager.prototype.setWorldState = function(state) {
  this.worldState = state;
  return { success: true };
};

WorldMigrationManager.prototype.createCheckpoint = function(label) {
  var checkpoint = {
    id: 'cp_' + Date.now(),
    label: label || 'auto',
    timestamp: Date.now(),
    state: this.worldState ? this.worldState.serialize() : null,
    loadedChunks: this.chunkLoader.getLoadedChunkCount(),
    activeMigrations: Object.keys(this.activeMigrations).length
  };
  this.lastCheckpoint = checkpoint;
  return checkpoint;
};

WorldMigrationManager.prototype.restoreCheckpoint = function(checkpointId) {
  var checkpoint = this.migrationHistory.find(function(c) { return c.id === checkpointId; });
  if (!checkpoint) return { error: 'checkpoint_not_found' };
  if (checkpoint.state) {
    var ps = new PersistentGameState(checkpoint.state.worldId);
    Object.keys(checkpoint.state.playerStates).forEach(function(pid) {
      ps.playerStates[pid] = checkpoint.state.playerStates[pid];
    });
    ps.worldModifications = checkpoint.state.worldModifications || [];
    ps.questStates = checkpoint.state.questStates || {};
    ps.timeOfDay = checkpoint.state.timeOfDay;
    ps.season = checkpoint.state.season;
    ps.globalFlags = checkpoint.state.globalFlags || {};
    this.worldState = ps;
  }
  return { success: true, checkpoint: checkpoint };
};

WorldMigrationManager.prototype.startMigration = function(fromSeedId, toSeedId, playerId) {
  var migrationId = 'mig_' + Date.now();
  this.activeMigrations[migrationId] = {
    migrationId: migrationId,
    fromSeedId: fromSeedId,
    toSeedId: toSeedId,
    playerId: playerId,
    startedAt: Date.now(),
    phase: 'planning',
    progress: 0
  };
  return { success: true, migrationId: migrationId };
};

WorldMigrationManager.prototype.advanceMigration = function(migrationId, progressDelta) {
  var mig = this.activeMigrations[migrationId];
  if (!mig) return { error: 'migration_not_found' };
  mig.progress = Math.min(100, mig.progress + (progressDelta || 10));
  if (mig.progress < 30) mig.phase = 'planning';
  else if (mig.progress < 60) mig.phase = 'transferring';
  else if (mig.progress < 100) mig.phase = 'finalizing';
  else mig.phase = 'completed';
  return { success: true, migration: mig };
};

WorldMigrationManager.prototype.completeMigration = function(migrationId) {
  var mig = this.activeMigrations[migrationId];
  if (!mig) return { error: 'migration_not_found' };
  mig.phase = 'completed';
  mig.progress = 100;
  mig.completedAt = Date.now();
  this.migrationHistory.push(mig);
  delete this.activeMigrations[migrationId];
  return { success: true, migration: mig };
};

WorldMigrationManager.prototype.getMigration = function(migrationId) {
  return this.activeMigrations[migrationId] || null;
};

WorldMigrationManager.prototype.getActiveMigrations = function() {
  return Object.keys(this.activeMigrations).map(function(id) { return this.activeMigrations[id]; }.bind(this));
};

window.ChunkLoader = ChunkLoader;
window.WorldMigrationManager = WorldMigrationManager;