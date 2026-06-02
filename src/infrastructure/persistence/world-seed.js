// ============================================================================
// Persistent World — V1: WorldSeed + SeededTerrainGenerator
// ruflo hierarchical decomposition + nanobot distributed mesh
// ============================================================================
'use strict';

var TerrainType = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  DESERT: 'desert',
  SWAMP: 'swamp',
  CAVE: 'cave',
  VILLAGE: 'village'
};

var ResourceNode = function(id, resourceType, quantity, position) {
  this.id = id;
  this.resourceType = resourceType;
  this.quantity = quantity;
  this.maxQuantity = quantity;
  this.position = position;
  this.respawnTime = null;
  this.lastHarvestedAt = null;
  this.depleted = false;
};

ResourceNode.prototype.harvest = function(amount) {
  if (this.depleted) return { error: 'node_depleted' };
  var extracted = Math.min(amount, this.quantity);
  this.quantity -= extracted;
  this.lastHarvestedAt = Date.now();
  if (this.quantity <= 0) {
    this.depleted = true;
    this.respawnTime = this.lastHarvestedAt + this._getRespawnTime();
  }
  return { extracted: extracted, remaining: this.quantity, depleted: this.depleted };
};

ResourceNode.prototype._getRespawnTime = function() {
  var times = { wood: 30000, stone: 60000, iron: 120000, gold: 300000, herb: 20000, fish: 15000 };
  return times[this.resourceType] || 60000;
};

ResourceNode.prototype.checkRespawn = function() {
  if (!this.depleted) return { respawned: false };
  var now = Date.now();
  if (now >= this.respawnTime) {
    this.quantity = this.maxQuantity;
    this.depleted = false;
    this.respawnTime = null;
    return { respawned: true, quantity: this.quantity };
  }
  return { respawned: false, timeRemaining: this.respawnTime - now };
};

var WorldSeed = function(seedId, width, height, config) {
  this.seedId = seedId;
  this.width = width || 64;
  this.height = height || 64;
  this.config = config || {};
  this.terrain = [];
  this.resourceNodes = [];
  this.spawnPoints = [];
  this.pois = [];
  this.seedValue = this._parseSeed(seedId);
  this.generated = false;
};

WorldSeed.prototype._parseSeed = function(seedId) {
  var hash = 0;
  var str = String(seedId);
  for (var i = 0; i < str.length; i++) {
    var chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

WorldSeed.prototype._random = function(x, y) {
  var n = Math.sin(x * 12.9898 + y * 78.233 + this.seedValue) * 43758.5453;
  return n - Math.floor(n);
};

WorldSeed.prototype._noise = function(x, y, octaves) {
  octaves = octaves || 4;
  var value = 0;
  var amplitude = 1;
  var frequency = 1;
  var maxValue = 0;
  for (var i = 0; i < octaves; i++) {
    value += amplitude * this._interpolatedNoise(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
};

WorldSeed.prototype._interpolatedNoise = function(x, y) {
  var intX = Math.floor(x);
  var intY = Math.floor(y);
  var fracX = x - intX;
  var fracY = y - intY;
  var v1 = this._random(intX, intY);
  var v2 = this._random(intX + 1, intY);
  var v3 = this._random(intX, intY + 1);
  var v4 = this._random(intX + 1, intY + 1);
  var i1 = this._lerp(v1, v2, fracX);
  var i2 = this._lerp(v3, v4, fracX);
  return this._lerp(i1, i2, fracY);
};

WorldSeed.prototype._lerp = function(a, b, t) { return a + (b - a) * t * (3 - 2 * t); };

WorldSeed.prototype.generate = function() {
  this.terrain = [];
  for (var y = 0; y < this.height; y++) {
    var row = [];
    for (var x = 0; x < this.width; x++) {
      var elevation = this._noise(x * 0.05, y * 0.05, 4);
      var moisture = this._noise(x * 0.08 + 100, y * 0.08 + 100, 3);
      var temperature = this._noise(x * 0.03 + 200, y * 0.03 + 200, 2);
      var terrainType = this._getTerrainType(elevation, moisture, temperature);
      row.push({ x: x, y: y, terrain: terrainType, elevation: elevation, moisture: moisture, temperature: temperature });
    }
    this.terrain.push(row);
  }
  this._placeResourceNodes();
  this._placeSpawnPoints();
  this._placePOIs();
  this.tileCount = this.width * this.height;
  this.generated = true;
  return this;
};

WorldSeed.prototype._getTerrainType = function(elevation, moisture, temperature) {
  if (elevation < 0.3) return TerrainType.WATER;
  if (elevation > 0.8) return TerrainType.MOUNTAIN;
  if (moisture > 0.7 && temperature > 0.3) return TerrainType.FOREST;
  if (moisture < 0.3 && temperature > 0.6) return TerrainType.DESERT;
  if (moisture > 0.5 && elevation > 0.4) return TerrainType.SWAMP;
  if (elevation > 0.6 && temperature < 0.4) return TerrainType.CAVE;
  return TerrainType.PLAINS;
};

WorldSeed.prototype._placeResourceNodes = function() {
  var resourceTypes = ['wood', 'stone', 'iron', 'gold', 'herb', 'fish'];
  for (var i = 0; i < 50; i++) {
    var x = Math.floor(this._random(i, 0) * this.width);
    var y = Math.floor(this._random(0, i) * this.height);
    var tile = this.terrain[y] && this.terrain[y][x];
    if (!tile) continue;
    var resourceType = resourceTypes[Math.floor(this._random(x, y) * resourceTypes.length)];
    var quantity = Math.floor(this._random(x + y, y - x) * 50) + 10;
    this.resourceNodes.push(new ResourceNode('res_' + i, resourceType, quantity, { x: x, y: y }));
  }
};

WorldSeed.prototype._placeSpawnPoints = function() {
  var spawnCount = Math.max(2, Math.floor(this.width * this.height / 400));
  for (var i = 0; i < spawnCount; i++) {
    var x = Math.floor(this._random(i * 7, i * 3) * this.width);
    var y = Math.floor(this._random(i * 5, i * 11) * this.height);
    this.spawnPoints.push({ x: x, y: y, id: 'spawn_' + i });
  }
};

WorldSeed.prototype._placePOIs = function() {
  var poiTypes = ['dungeon', 'shrine', 'trader', 'ruins'];
  for (var i = 0; i < 10; i++) {
    var x = Math.floor(this._random(i + 1, i * 3) * this.width);
    var y = Math.floor(this._random(i * 2, i + 1) * this.height);
    var tile = this.terrain[y] && this.terrain[y][x];
    if (tile) {
      this.pois.push({ id: 'poi_' + i, type: poiTypes[i % poiTypes.length], position: { x: x, y: y }, discovered: false });
    }
  }
};

WorldSeed.prototype.getTile = function(x, y) {
  if (y < 0 || y >= this.height || x < 0 || x >= this.width) return null;
  return this.terrain[y][x];
};

WorldSeed.prototype.getResourceNodesNear = function(x, y, radius) {
  var nodes = [];
  for (var i = 0; i < this.resourceNodes.length; i++) {
    var node = this.resourceNodes[i];
    var dx = node.position.x - x;
    var dy = node.position.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) nodes.push(node);
  }
  return nodes;
};

WorldSeed.prototype.getSpawnPoints = function() { return this.spawnPoints.slice(); };
WorldSeed.prototype.getPOIs = function() { return this.pois.slice(); };
WorldSeed.prototype.getTerrain = function() { return this.terrain; };

window.TerrainType = TerrainType;
window.ResourceNode = ResourceNode;
window.WorldSeed = WorldSeed;