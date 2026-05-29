// ============================================================================
// Card Fusion System — V140 Direction B
// Fuse two cards to create a powerful evolved card
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // CardFusionEngine: Core fusion logic
  // -----------------------------------------------------------------------
  function CardFusionEngine() {
    this.state = { initialized: false };
    // In-memory cooldown fallback when localStorage unavailable
    this._cooldowns = {};
    this._fusionHistory = {};
    this._init();
  }

  CardFusionEngine.prototype._init = function () {
    this.state.initialized = true;
  };

  CardFusionEngine.prototype._log = function (msg, data) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[CardFusionEngine] ' + msg, data || '');
    }
  };

  // Attempt to fuse two cards
  CardFusionEngine.prototype.fuse = function (playerId, card1, card2, slot) {
    if (!card1 || !card2) return { error: 'missing_card' };
    if (!card1.id || !card2.id) return { error: 'invalid_card' };
    if (card1.id === card2.id) return { error: 'same_card' };
    if (slot !== 0 && slot !== 1 && slot !== 2) return { error: 'invalid_slot' };

    // Check fusion rules
    var check = this._checkFusionRules(card1, card2);
    if (!check.valid) return { error: check.reason };

    // Calculate fused card stats
    var fused = this._calculateFusedCard(card1, card2);

    // Check cooldown
    if (!this._checkCooldown(playerId, slot)) {
      return { error: 'cooldown_active', remaining: this._getCooldownRemaining(playerId, slot) };
    }

    // Execute fusion
    this._recordFusion(playerId, slot, card1, card2, fused);

    return {
      success: true,
      fused: fused,
      slot: slot,
      materials: [card1.id, card2.id],
      powerGain: fused.power - Math.max(card1.power || 0, card2.power || 0),
      tier: fused.tier
    };
  };

  CardFusionEngine.prototype._checkFusionRules = function (card1, card2) {
    var rarityTier = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    var t1 = rarityTier[card1.rarity] || 1;
    var t2 = rarityTier[card2.rarity] || 1;

    // Legendary + Legendary not allowed
    if (t1 === 5 && t2 === 5) return { valid: false, reason: 'legendary_combo_forbidden' };

    // Same rarity always OK
    if (card1.rarity === card2.rarity) return { valid: true };

    // Max 2 tier difference
    var diff = Math.abs(t1 - t2);
    if (diff > 2) return { valid: false, reason: 'rarity_mismatch' };

    return { valid: true };
  };

  CardFusionEngine.prototype._calculateFusedCard = function (card1, card2) {
    var p1 = card1.power || 0, p2 = card2.power || 0;
    var t1 = card1.toughness || 0, t2 = card2.toughness || 0;
    var c1 = card1.cost || 0, c2 = card2.cost || 0;

    var rarityTier = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    var r1 = rarityTier[card1.rarity] || 1;
    var r2 = rarityTier[card2.rarity] || 1;
    var maxRarity = Math.max(r1, r2);

    // Power: average of both + synergy bonus
    var power = Math.round((p1 + p2) / 2 + 10);
    // Toughness: average
    var toughness = Math.round((t1 + t2) / 2 + 5);
    // Cost: average, rounded up
    var cost = Math.ceil((c1 + c2) / 2);
    // HP: average
    var hp = Math.round(((card1.hp || 100) + (card2.hp || 100)) / 2);

    // Tier increases with rarity and power
    var tier = Math.min(5, maxRarity + Math.floor((p1 + p2) / 200));

    var rarityNames = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    var rarity = rarityNames[Math.min(4, maxRarity - 1)];

    // Merge tags
    var tags = [];
    var tagSet = {};
    var allTags = (card1.tags || []).concat(card2.tags || []);
    for (var i = 0; i < allTags.length; i++) {
      if (!tagSet[allTags[i]]) { tagSet[allTags[i]] = true; tags.push(allTags[i]); }
    }

    return {
      id: 'fused_' + (card1.id || 'c1') + '_' + (card2.id || 'c2'),
      name: (card1.name || 'Card') + '+' + (card2.name || 'Card'),
      power: power,
      toughness: toughness,
      cost: cost,
      hp: hp,
      tier: tier,
      rarity: rarity,
      tags: tags,
      isFused: true,
      materials: [card1.id, card2.id]
    };
  };

  CardFusionEngine.prototype._checkCooldown = function (playerId, slot) {
    var key = playerId + '_' + slot;
    if (this._cooldowns[key]) {
      if (Date.now() - this._cooldowns[key] < 60000) return false;
      delete this._cooldowns[key];
    }
    var last = this._tryGetItem('fusion_cd_' + key);
    if (last) {
      if (Date.now() - parseInt(last) < 60000) return false;
    }
    return true;
  };

  CardFusionEngine.prototype._getCooldownRemaining = function (playerId, slot) {
    var key = playerId + '_' + slot;
    if (this._cooldowns[key]) {
      return Math.max(0, Math.ceil((60000 - (Date.now() - this._cooldowns[key])) / 1000));
    }
    var last = this._tryGetItem('fusion_cd_' + key);
    if (last) {
      var remaining = 60000 - (Date.now() - parseInt(last));
      return Math.max(0, Math.ceil(remaining / 1000));
    }
    return 0;
  };

  CardFusionEngine.prototype._trySetItem = function (key, value) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {}
    return false;
  };

  CardFusionEngine.prototype._tryGetItem = function (key) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {}
    return null;
  };

  CardFusionEngine.prototype._recordFusion = function (playerId, slot, card1, card2, fused) {
    var key = playerId + '_' + slot;
    this._cooldowns[key] = Date.now();

    // Set cooldown in storage
    this._trySetItem('fusion_cd_' + key, Date.now().toString());

    // Record history
    var historyKey = 'fusion_history_' + playerId;
    var raw = this._tryGetItem(historyKey);
    var history = raw ? JSON.parse(raw) : [];
    history.push({ slot: slot, card1: card1.id, card2: card2.id, fused: fused.id, ts: Date.now() });
    if (history.length > 20) history.shift();
    this._trySetItem(historyKey, JSON.stringify(history));

    // In-memory fallback
    if (!this._fusionHistory[playerId]) this._fusionHistory[playerId] = [];
    this._fusionHistory[playerId].push({ slot: slot, card1: card1.id, card2: card2.id, fused: fused.id, ts: Date.now() });

    this.state.lastFusion = Date.now();
  };

  // Get fusion history
  CardFusionEngine.prototype.getHistory = function (playerId, limit) {
    var raw = this._tryGetItem('fusion_history_' + playerId);
    if (raw) {
      var hist = JSON.parse(raw);
      return hist.slice(-limit || 10);
    }
    // Fallback to in-memory
    if (this._fusionHistory[playerId]) {
      return this._fusionHistory[playerId].slice(-limit || 10);
    }
    return [];
  };

  // Check if slot available
  CardFusionEngine.prototype.isSlotAvailable = function (playerId, slot) {
    return this._checkCooldown(playerId, slot);
  };

  // Cancel fusion (refund)
  CardFusionEngine.prototype.cancelFusion = function (playerId, slot) {
    var key = playerId + '_' + slot;
    delete this._cooldowns[key];
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem('fusion_cd_' + key);
      }
    } catch (e) {}
    return { success: true, slot: slot };
  };

  // -----------------------------------------------------------------------
  // FusionSlotManager: Manages fusion slots per player
  // -----------------------------------------------------------------------
  function FusionSlotManager() {
    this.slots = {}; // playerId -> [slot0, slot1, slot2]
  }

  FusionSlotManager.prototype.getSlots = function (playerId) {
    if (!this.slots[playerId]) {
      this.slots[playerId] = [
        { id: 0, occupied: false, fusedCard: null, cooldownUntil: null },
        { id: 1, occupied: false, fusedCard: null, cooldownUntil: null },
        { id: 2, occupied: false, fusedCard: null, cooldownUntil: null }
      ];
    }
    return this.slots[playerId];
  };

  FusionSlotManager.prototype.occupySlot = function (playerId, slotId, fusedCard) {
    var slots = this.getSlots(playerId);
    var slot = slots[slotId];
    slot.occupied = true;
    slot.fusedCard = fusedCard;
    slot.cooldownUntil = Date.now() + 60000;
  };

  FusionSlotManager.prototype.releaseSlot = function (playerId, slotId) {
    var slots = this.getSlots(playerId);
    slots[slotId].occupied = false;
    slots[slotId].fusedCard = null;
    slots[slotId].cooldownUntil = null;
  };

  FusionSlotManager.prototype.getSlotInfo = function (playerId, slotId) {
    var slots = this.getSlots(playerId);
    var slot = slots[slotId];
    var cooldownRemaining = slot.cooldownUntil ? Math.max(0, slot.cooldownUntil - Date.now()) : 0;
    return {
      id: slot.id,
      occupied: slot.occupied,
      fusedCard: slot.fusedCard,
      cooldownActive: cooldownRemaining > 0,
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000)
    };
  };

  // -----------------------------------------------------------------------
  // FusionRecipeBook: Pre-defined fusion recipes
  // -----------------------------------------------------------------------
  function FusionRecipeBook() {
    this.recipes = [
      {
        inputs: ['fire_sword', 'fire_shield'],
        output: { id: 'flame_guard', name: 'Flame Guard', power: 150, cost: 5, rarity: 'epic' }
      },
      {
        inputs: ['ice_shard', 'windblade'],
        output: { id: 'storm_caller', name: 'Storm Caller', power: 140, cost: 4, rarity: 'epic' }
      },
      {
        inputs: ['dark_orb', 'light_orb'],
        output: { id: 'neutral_caster', name: 'Neutral Caster', power: 130, cost: 4, rarity: 'rare' }
      }
    ];
  }

  FusionRecipeBook.prototype.findRecipe = function (card1Id, card2Id) {
    for (var i = 0; i < this.recipes.length; i++) {
      var r = this.recipes[i];
      if ((r.inputs[0] === card1Id && r.inputs[1] === card2Id) ||
          (r.inputs[0] === card2Id && r.inputs[1] === card1Id)) {
        return r;
      }
    }
    return null;
  };

  FusionRecipeBook.prototype.applyRecipe = function (playerId, card1Id, card2Id) {
    var recipe = this.findRecipe(card1Id, card2Id);
    if (!recipe) return null;
    return {
      success: true,
      output: recipe.output,
      isRecipe: true
    };
  };

  // -----------------------------------------------------------------------
  // FusionStore: Persistent storage (thunderbolt offline-first)
  // -----------------------------------------------------------------------
  function FusionStore(namespace) {
    this.ns = namespace || 'fusion';
    this._load();
  }

  FusionStore.prototype._load = function () {
    this.data = {};
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(this.ns);
        if (raw) this.data = JSON.parse(raw);
      }
    } catch (e) { this.data = {}; }
    this.data.history = this.data.history || [];
    this.data.recipes = this.data.recipes || [];
  };

  FusionStore.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.ns, JSON.stringify(this.data));
      }
    } catch (e) {}
  };

  FusionStore.prototype.addCustomRecipe = function (playerId, recipe) {
    this.data.recipes.push({ playerId: playerId, recipe: recipe, ts: Date.now() });
    this._save();
  };

  FusionStore.prototype.getCustomRecipes = function (playerId) {
    return this.data.recipes.filter(function (r) { return r.playerId === playerId; });
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.CardFusionEngine = CardFusionEngine;
  window.FusionSlotManager = FusionSlotManager;
  window.FusionRecipeBook = FusionRecipeBook;
  window.FusionStore = FusionStore;
})();