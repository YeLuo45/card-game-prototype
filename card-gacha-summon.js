// ============================================================================
// Card Gacha/Summon System — V160 Direction V
// Gacha-based card summoning with rarity tiers and pity system
// thunderbolt feedback loops + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // SummonPool: A pool of cards with rarity weights
  // ========================================================================
  function SummonPool(id, name, cardPool, rarityWeights) {
    this.id = id || '';
    this.name = name || '';
    this.cardPool = cardPool || []; // array of cardIds available
    this.rarityWeights = rarityWeights || {
      common: 60,
      uncommon: 25,
      rare: 10,
      epic: 4,
      legendary: 1
    };
    this.summonCount = 0;
    this.lastSummonedCardId = null;
  }

  SummonPool.prototype.getRandomRarity = function () {
    var total = 0;
    for (var r in this.rarityWeights) total += this.rarityWeights[r];
    var rand = Math.random() * total;
    var cumulative = 0;
    for (var r in this.rarityWeights) {
      cumulative += this.rarityWeights[r];
      if (rand <= cumulative) return r;
    }
    return 'common';
  };

  SummonPool.prototype.summon = function (cardRegistry) {
    var rarity = this.getRandomRarity();
    // Get cards of that rarity from registry
    var available = [];
    for (var i = 0; i < this.cardPool.length; i++) {
      var card = cardRegistry.getCard(this.cardPool[i]);
      if (card && card.rarity === rarity) available.push(card.id);
    }
    if (available.length === 0) return null; // no card of that rarity
    var chosenId = available[Math.floor(Math.random() * available.length)];
    this.summonCount++;
    this.lastSummonedCardId = chosenId;
    return cardRegistry.getCard(chosenId);
  };

  // --------------------------------------------------------------------===
  // PitySystem: Pity counter to guarantee rare pulls
  // ========================================================================
  function PitySystem(pityThreshold, bonusRarityBoost) {
    this.pityThreshold = pityThreshold || 10; // guaranteed rare after N summons
    this.bonusRarityBoost = bonusRarityBoost || 2; // how many rarity levels to boost
    this.counter = 0;
    this.lastBonusRarity = null;
  }

  PitySystem.prototype.recordSummon = function (rarity) {
    this.counter++;
    this.lastBonusRarity = null;
    if (this.counter >= this.pityThreshold) {
      this.lastBonusRarity = this._boostRarity(rarity);
      this.counter = 0;
    }
  };

  PitySystem.prototype._boostRarity = function (rarity) {
    var order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    var idx = order.indexOf(rarity);
    var boostIdx = Math.min(idx + this.bonusRarityBoost, order.length - 1);
    return order[boostIdx];
  };

  PitySystem.prototype.getCounter = function () { return this.counter; };

  PitySystem.prototype.reset = function () { this.counter = 0; };

  // --------------------------------------------------------------------===
  // SummonHistory: Tracks summon history
  // ========================================================================
  function SummonHistory(storageKey) {
    this.storageKey = storageKey || 'summon_history';
    this._history = [];
    this._totalSummons = 0;
    this._rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    this._load();
  }

  SummonHistory.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._history = data.history || [];
          this._totalSummons = data.totalSummons || 0;
          this._rarityCounts = data.rarityCounts || this._rarityCounts;
        }
      }
    } catch (e) {}
  };

  SummonHistory.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          history: this._history,
          totalSummons: this._totalSummons,
          rarityCounts: this._rarityCounts
        }));
      }
    } catch (e) {}
  };

  SummonHistory.prototype.record = function (cardId, cardRarity, poolId) {
    this._history.unshift({ cardId: cardId, rarity: cardRarity, poolId: poolId, at: Date.now() });
    this._totalSummons++;
    if (this._rarityCounts[cardRarity] !== undefined) this._rarityCounts[cardRarity]++;
    this._save();
  };

  SummonHistory.prototype.getHistory = function (limit) {
    return this._history.slice(0, limit || 10);
  };

  SummonHistory.prototype.getRarityCounts = function () {
    return this._rarityCounts;
  };

  SummonHistory.prototype.getTotalSummons = function () { return this._totalSummons; };

  // --------------------------------------------------------------------===
  // CardRegistry: Registry of all summonable cards
  // ========================================================================
  function CardRegistry() {
    this._cards = {};
    this._init();
  }

  CardRegistry.prototype._init = function () {
    // Default cards
    var cards = [
      { id: 'sword_1', name: 'Iron Sword', type: 'weapon', rarity: 'common', attack: 5, health: 0 },
      { id: 'shield_1', name: 'Wooden Shield', type: 'armor', rarity: 'common', attack: 0, health: 8 },
      { id: 'potion_1', name: 'Health Potion', type: 'item', rarity: 'common', attack: 0, health: 20 },
      { id: 'fire_spell', name: 'Fire Ball', type: 'spell', rarity: 'uncommon', attack: 12, health: 0 },
      { id: 'ice_spell', name: 'Ice Shard', type: 'spell', rarity: 'uncommon', attack: 8, health: 0 },
      { id: 'dragon', name: 'Baby Dragon', type: 'creature', rarity: 'rare', attack: 15, health: 20 },
      { id: 'phoenix', name: 'Phoenix', type: 'creature', rarity: 'rare', attack: 18, health: 15 },
      { id: 'god_sword', name: 'Divine Blade', type: 'weapon', rarity: 'epic', attack: 30, health: 5 },
      { id: 'archangel', name: 'Archangel', type: 'creature', rarity: 'epic', attack: 25, health: 25 },
      { id: 'world_dragon', name: 'World Dragon', type: 'creature', rarity: 'legendary', attack: 50, health: 50 }
    ];
    for (var i = 0; i < cards.length; i++) {
      this._cards[cards[i].id] = cards[i];
    }
  };

  CardRegistry.prototype.getCard = function (id) { return this._cards[id] || null; };

  CardRegistry.prototype.registerCard = function (card) {
    this._cards[card.id] = card;
    return { success: true };
  };

  CardRegistry.prototype.listByRarity = function (rarity) {
    var result = [];
    for (var id in this._cards) {
      if (this._cards[id].rarity === rarity) result.push(this._cards[id]);
    }
    return result;
  };

  // --------------------------------------------------------------------===
  // GachaSummon: Main gacha/summon system
  // ========================================================================
  function GachaSummon(storageKey) {
    this.storageKey = storageKey || 'gacha_summon';
    this._pools = {};
    this._registry = new CardRegistry();
    this._history = new SummonHistory(storageKey + '_history');
    this._pity = new PitySystem(10, 2);
    this._multiSummonSize = 10; // standard multi-summon size
    this._init();
  }

  GachaSummon.prototype._init = function () {
    this._load();
    if (Object.keys(this._pools).length === 0) this._generateDefaultPools();
  };

  GachaSummon.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._pools = data.pools || {};
        }
      }
    } catch (e) {}
  };

  GachaSummon.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          pools: this._pools
        }));
      }
    } catch (e) {}
  };

  GachaSummon.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[GachaSummon] ' + msg);
  };

  GachaSummon.prototype._generateDefaultPools = function () {
    var basicPool = new SummonPool('basic', 'Basic Pool', ['sword_1', 'shield_1', 'potion_1', 'fire_spell', 'ice_spell', 'dragon', 'phoenix'], {
      common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1
    });
    this._pools['basic'] = basicPool;

    var premiumPool = new SummonPool('premium', 'Premium Pool', ['sword_1', 'shield_1', 'potion_1', 'fire_spell', 'ice_spell', 'dragon', 'phoenix', 'god_sword', 'archangel', 'world_dragon'], {
      common: 20, uncommon: 35, rare: 30, epic: 12, legendary: 3
    });
    this._pools['premium'] = premiumPool;

    this._log('Generated default summon pools');
  };

  // Single summon
  GachaSummon.prototype.summon = function (poolId) {
    var pool = this._pools[poolId];
    if (!pool) return { error: 'pool_not_found' };

    var rarity = pool.getRandomRarity();
    // Apply pity boost if active
    var effectiveRarity = this._pity.lastBonusRarity || rarity;
    
    // Get cards of effective rarity
    var available = [];
    for (var i = 0; i < pool.cardPool.length; i++) {
      var card = this._registry.getCard(pool.cardPool[i]);
      if (card && card.rarity === effectiveRarity) available.push(card.id);
    }
    if (available.length === 0) return null;

    var chosenId = available[Math.floor(Math.random() * available.length)];
    pool.summonCount++;
    pool.lastSummonedCardId = chosenId;
    this._pity.recordSummon(rarity);
    this._history.record(chosenId, effectiveRarity, poolId);

    return { success: true, card: this._registry.getCard(chosenId), rarity: effectiveRarity, pityBoosted: !!this._pity.lastBonusRarity };
  };

  // Multi summon (10x)
  GachaSummon.prototype.multiSummon = function (poolId) {
    var pool = this._pools[poolId];
    if (!pool) return { error: 'pool_not_found' };

    var results = [];
    for (var i = 0; i < this._multiSummonSize; i++) {
      var r = this.summon(poolId);
      if (r && r.success) results.push(r);
    }
    return { success: true, results: results };
  };

  // Get pity counter
  GachaSummon.prototype.getPityCounter = function () {
    return { counter: this._pity.getCounter(), threshold: this._pity.pityThreshold };
  };

  // Get summon history
  GachaSummon.prototype.getHistory = function (limit) {
    return this._history.getHistory(limit);
  };

  // Get rarity stats
  GachaSummon.prototype.getRarityStats = function () {
    return {
      counts: this._history.getRarityCounts(),
      total: this._history.getTotalSummons()
    };
  };

  // Add pool
  GachaSummon.prototype.addPool = function (id, name, cardIds, rarityWeights) {
    if (this._pools[id]) return { error: 'pool_exists' };
    this._pools[id] = new SummonPool(id, name, cardIds, rarityWeights);
    this._save();
    return { success: true };
  };

  // List pools
  GachaSummon.prototype.listPools = function () {
    var result = [];
    for (var id in this._pools) result.push(this._pools[id]);
    return result;
  };

  // Get pool
  GachaSummon.prototype.getPool = function (poolId) {
    return this._pools[poolId] || null;
  };

  // Reset pity
  GachaSummon.prototype.resetPity = function () {
    this._pity.reset();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.SummonPool = SummonPool;
  window.PitySystem = PitySystem;
  window.SummonHistory = SummonHistory;
  window.CardRegistry = CardRegistry;
  window.GachaSummon = GachaSummon;
})();