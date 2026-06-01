// ============================================================================
// Collab Arena — V3: SharedResourceManager + ResourcePool
// thunderbolt pipeline/feedback loops + generic-agent autonomous goals
// ============================================================================
'use strict';

var ResourceType = {
  HEALTH_PACK: 'health_pack',
  SHIELD_CHARGE: 'shield_charge',
  ENERGY: 'energy',
  SPECIAL: 'special'
};

var SharedResourceManager = function() {
  this.pools = {};
  this.locks = {};
  this.allocationLog = [];
  this._initDefaultPools();
};

SharedResourceManager.prototype._initDefaultPools = function() {
  this.pools[ResourceType.HEALTH_PACK] = { capacity: 3, available: 3, respawnTime: 30000 };
  this.pools[ResourceType.SHIELD_CHARGE] = { capacity: 4, available: 4, respawnTime: 20000 };
  this.pools[ResourceType.ENERGY] = { capacity: 5, available: 5, respawnTime: 10000 };
  this.pools[ResourceType.SPECIAL] = { capacity: 1, available: 1, respawnTime: 60000 };
};

SharedResourceManager.prototype.acquire = function(sessionId, playerId, resourceType) {
  var pool = this.pools[resourceType];
  if (!pool) return { error: 'invalid_resource_type' };
  if (pool.available <= 0) return { error: 'resource_depleted' };
  var lockKey = sessionId + ':' + playerId + ':' + resourceType;
  if (this.locks[lockKey]) return { error: 'already_locked' };
  pool.available--;
  this.locks[lockKey] = { sessionId: sessionId, playerId: playerId, resourceType: resourceType, acquiredAt: Date.now() };
  this.allocationLog.push({ action: 'acquire', sessionId: sessionId, playerId: playerId, resourceType: resourceType, timestamp: Date.now() });
  return { success: true, available: pool.available, lockKey: lockKey };
};

SharedResourceManager.prototype.release = function(lockKey) {
  var lock = this.locks[lockKey];
  if (!lock) return { error: 'lock_not_found' };
  var pool = this.pools[lock.resourceType];
  if (pool) pool.available++;
  delete this.locks[lockKey];
  this.allocationLog.push({ action: 'release', lockKey: lockKey, resourceType: lock.resourceType, timestamp: Date.now() });
  return { success: true };
};

SharedResourceManager.prototype.getResourceStatus = function(sessionId, resourceType) {
  var pool = this.pools[resourceType];
  if (!pool) return null;
  var locks = [];
  for (var k in this.locks) {
    if (k.indexOf(sessionId + ':') === 0 && this.locks[k].resourceType === resourceType) {
      locks.push(this.locks[k].playerId);
    }
  }
  return { available: pool.available, capacity: pool.capacity, lockedBy: locks };
};

SharedResourceManager.prototype.getSessionResources = function(sessionId) {
  var result = {};
  for (var rt in this.pools) {
    result[rt] = this.getResourceStatus(sessionId, rt);
  }
  return result;
};

SharedResourceManager.prototype.isAvailable = function(resourceType) {
  var pool = this.pools[resourceType];
  return pool && pool.available > 0;
};

SharedResourceManager.prototype.respawnResources = function() {
  var now = Date.now();
  var respawned = 0;
  for (var rt in this.pools) {
    var pool = this.pools[rt];
    if (pool.available < pool.capacity) {
      var locked = 0;
      for (var k in this.locks) {
        if (this.locks[k].resourceType === rt) locked++;
      }
      var canRespawn = pool.capacity - locked;
      if (canRespawn > pool.available) {
        var diff = canRespawn - pool.available;
        pool.available += diff;
        respawned += diff;
      }
    }
  }
  return { respawned: respawned, timestamp: now };
};

window.ResourceType = ResourceType;
window.SharedResourceManager = SharedResourceManager;
