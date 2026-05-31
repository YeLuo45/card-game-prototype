// ============================================================================
// Card Intelligence Network — V5: MetaGameTracker + OfflinePersistenceLayer
// thunderbolt feedback loops + chatdev role specialization
// ============================================================================
'use strict';

var MetaGameTracker = function() {
  this.globalStats = { totalMatches: 0, deckWins: {}, deckLosses: {}, cardWins: {}, cardGames: {} };
  this.trendData = [];
};

MetaGameTracker.prototype.recordGlobalMatch = function(deckArchetype, opponentArchetype, result) {
  this.globalStats.totalMatches++;
  if (result === 'win') {
    this.globalStats.deckWins[deckArchetype] = (this.globalStats.deckWins[deckArchetype] || 0) + 1;
  } else if (result === 'loss') {
    this.globalStats.deckLosses[deckArchetype] = (this.globalStats.deckLosses[deckArchetype] || 0) + 1;
  }
  this.trendData.push({ deck: deckArchetype, opponent: opponentArchetype, result: result, ts: Date.now() });
  if (this.trendData.length > 1000) this.trendData = this.trendData.slice(-500);
  return { success: true };
};

MetaGameTracker.prototype.getDeckTier = function(deckArchetype) {
  var wins = this.globalStats.deckWins[deckArchetype] || 0;
  var losses = this.globalStats.deckLosses[deckArchetype] || 0;
  var total = wins + losses;
  if (total < 10) return { tier: 'unknown', winRate: 0, sampleSize: total };
  var wr = wins / total;
  if (wr >= 0.55) return { tier: 'S', winRate: wr, sampleSize: total };
  if (wr >= 0.50) return { tier: 'A', winRate: wr, sampleSize: total };
  if (wr >= 0.45) return { tier: 'B', winRate: wr, sampleSize: total };
  return { tier: 'C', winRate: wr, sampleSize: total };
};

MetaGameTracker.prototype.getMetaSnapshot = function() {
  var archetypes = {};
  Object.keys(this.globalStats.deckWins).forEach(function(d) {
    if (!archetypes[d]) archetypes[d] = { wins: 0, losses: 0 };
    archetypes[d].wins = this.globalStats.deckWins[d];
  }.bind(this));
  Object.keys(this.globalStats.deckLosses).forEach(function(d) {
    if (!archetypes[d]) archetypes[d] = { wins: 0, losses: 0 };
    archetypes[d].losses = this.globalStats.deckLosses[d];
  }.bind(this));
  var tiers = [];
  for (var a in archetypes) {
    tiers.push({ archetype: a, tier: this.getDeckTier(a).tier });
  }
  tiers.sort(function(a, b) {
    var order = { S: 0, A: 1, B: 2, C: 3, unknown: 4 };
    return order[a.tier] - order[b.tier];
  });
  return { totalMatches: this.globalStats.totalMatches, tiers: tiers };
};

MetaGameTracker.prototype.getTrend = function(limit) {
  limit = limit || 50;
  return this.trendData.slice(-limit);
};

var OfflinePersistenceLayer = function(storageKey) {
  this.storageKey = storageKey || 'card_intel_data';
  this.memory = {};
  this.load();
};

OfflinePersistenceLayer.prototype.load = function() {
  if (typeof localStorage !== 'undefined') {
    var data = localStorage.getItem(this.storageKey);
    if (data) {
      try { this.memory = JSON.parse(data); } catch(e) { this.memory = {}; }
    }
  }
};

OfflinePersistenceLayer.prototype.save = function() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(this.storageKey, JSON.stringify(this.memory));
  }
  return { success: true };
};

OfflinePersistenceLayer.prototype.set = function(key, value) {
  this.memory[key] = value;
  return this.save();
};

OfflinePersistenceLayer.prototype.get = function(key) {
  return this.memory[key];
};

OfflinePersistenceLayer.prototype.clear = function() {
  this.memory = {};
  return this.save();
};

window.MetaGameTracker = MetaGameTracker;
window.OfflinePersistenceLayer = OfflinePersistenceLayer;
