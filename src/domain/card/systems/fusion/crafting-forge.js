// ============================================================================
// Card Crafting Forge — V153 Direction E
// Card crafting system with material fusion and stat enhancement
// ruflo hook system + thunderbolt offline-first + generic-agent L0-L4
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Material: Crafting ingredient
  // -----------------------------------------------------------------------
  function Material(id, name, rarity, quantity) {
    this.id = id || '';
    this.name = name || '';
    this.rarity = rarity || 'common'; // common | uncommon | rare | epic | legendary
    this.quantity = quantity || 1;
    this.attributes = {}; // e.g. { attack: 5, defense: 3 }
  }

  Material.prototype.consume = function (amount) {
    amount = amount || 1;
    this.quantity = Math.max(0, this.quantity - amount);
    return this.quantity;
  };

  Material.prototype.add = function (amount) {
    this.quantity += (amount || 1);
  };

  Material.prototype.getEffectiveRarity = function () {
    var mults = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    return mults[this.rarity] || 1;
  };

  // --------------------------------------------------------------------===
  // CraftedCard: Result of a crafting operation
  // ========================================================================
  function CraftedCard(baseCard, materials, bonuses) {
    this.id = baseCard.id + '_crafted_' + Date.now();
    this.name = baseCard.name + ' (Crafted)';
    this.baseId = baseCard.id;
    this.materials = materials || []; // array of material ids used
    this.bonuses = bonuses || {}; // e.g. { attack: +2, health: +1 }
    this.level = 1;
    this.power = baseCard.power;
    this.cost = baseCard.cost;
    this.craftedAt = Date.now();
    this.enhancementSlots = 0;
    this.appliedEffects = [];
  }

  CraftedCard.prototype.enhance = function (attribute, amount) {
    this.bonuses[attribute] = (this.bonuses[attribute] || 0) + amount;
    this.appliedEffects.push({ attribute: attribute, amount: amount, at: Date.now() });
    this.enhancementSlots++;
  };

  CraftedCard.prototype.levelUp = function () {
    this.level++;
  };

  CraftedCard.prototype.getPowerBonus = function () {
    var total = 0;
    for (var attr in this.bonuses) total += this.bonuses[attr];
    return total;
  };

  // --------------------------------------------------------------------===
  // Recipe: Crafting recipe definition
  // ========================================================================
  function Recipe(id, name, resultCardId, materialRequirements, difficulty, bonuses) {
    this.id = id || 'recipe_' + Date.now();
    this.name = name || '';
    this.resultCardId = resultCardId || '';
    this.materialRequirements = materialRequirements || {}; // { materialId: quantity }
    this.difficulty = difficulty || 1; // 1-5
    this.bonuses = bonuses || {};
    this.isSecret = false;
    this.unlocked = false;
  }

  Recipe.prototype.unlock = function () { this.unlocked = true; };
  Recipe.prototype.setSecret = function (v) { this.isSecret = v; };

  Recipe.prototype.getTotalDifficulty = function () {
    return this.difficulty;
  };

  Recipe.prototype.canCraft = function (inventory) {
    for (var matId in this.materialRequirements) {
      var needed = this.materialRequirements[matId];
      var have = inventory[matId] || 0;
      if (have < needed) return false;
    }
    return true;
  };

  // --------------------------------------------------------------------===
  // CraftingForge: Main crafting system
  // ========================================================================
  function CraftingForge(storageKey) {
    this.storageKey = storageKey || 'crafting_forge';
    this._materials = {}; // materialId -> Material
    this._recipes = {};   // recipeId -> Recipe
    this._craftedCards = {}; // cardId -> CraftedCard
    this._stats = { totalCrafts: 0, successfulCrafts: 0, failedCrafts: 0, legendaryCrafts: 0 };
    this._init();
  }

  CraftingForge.prototype._init = function () { this._load(); if (Object.keys(this._recipes).length === 0) this._generateDefaultRecipes(); };

  CraftingForge.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._materials = data.materials || {};
          this._recipes = data.recipes || {};
          this._craftedCards = data.craftedCards || {};
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  CraftingForge.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          materials: this._materials,
          recipes: this._recipes,
          craftedCards: this._craftedCards,
          stats: this._stats
        }));
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[CraftingForge] _save failed:', e.message);
    }
  };

  CraftingForge.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[CraftingForge] ' + msg);
  };

  CraftingForge.prototype._generateDefaultRecipes = function () {
    var recipes = [
      { id: 'recipe_fire_sword', name: 'Fire Sword', resultCardId: 'fire_sword', materialRequirements: { iron_ingot: 5, fire_essence: 2 }, difficulty: 2, bonuses: { attack: 3 } },
      { id: 'recipe_ice_shield', name: 'Ice Shield', resultCardId: 'ice_shield', materialRequirements: { ice_crystal: 5, frost_essence: 2 }, difficulty: 2, bonuses: { defense: 3 } },
      { id: 'recipe_dragon_armor', name: 'Dragon Armor', resultCardId: 'dragon_armor', materialRequirements: { dragon_scale: 10, iron_ingot: 8 }, difficulty: 5, bonuses: { defense: 5, health: 5 } }
    ];
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i];
      this._recipes[r.id] = new Recipe(r.id, r.name, r.resultCardId, r.materialRequirements, r.difficulty, r.bonuses);
      this._recipes[r.id].unlock();
    }
    this._log('Generated ' + recipes.length + ' default recipes');
  };

  // Add material to inventory
  CraftingForge.prototype.addMaterial = function (id, name, rarity, quantity) {
    if (this._materials[id]) {
      this._materials[id].add(quantity);
    } else {
      this._materials[id] = new Material(id, name, rarity, quantity);
    }
    this._save();
    return { success: true };
  };

  // Get material count
  CraftingForge.prototype.getMaterialCount = function (id) {
    return this._materials[id] ? this._materials[id].quantity : 0;
  };

  // List all materials
  CraftingForge.prototype.listMaterials = function () {
    var result = [];
    for (var id in this._materials) result.push(this._materials[id]);
    return result;
  };

  // Craft a card using a recipe
  CraftingForge.prototype.craft = function (recipeId, baseCard) {
    var recipe = this._recipes[recipeId];
    if (!recipe) return { error: 'recipe_not_found' };
    if (!recipe.unlocked) return { error: 'recipe_locked' };

    // Build inventory map
    var inventory = {};
    for (var id in this._materials) inventory[id] = this._materials[id].quantity;

    if (!recipe.canCraft(inventory)) return { error: 'insufficient_materials' };

    // Consume materials
    for (var matId in recipe.materialRequirements) {
      var needed = recipe.materialRequirements[matId];
      this._materials[matId].consume(needed);
    }

    // Create crafted card
    var bonuses = {};
    for (var b in recipe.bonuses) bonuses[b] = recipe.bonuses[b];
    var crafted = new CraftedCard(baseCard, Object.keys(recipe.materialRequirements), bonuses);
    crafted.power = baseCard.power + (bonuses.attack || 0);

    this._craftedCards[crafted.id] = crafted;
    this._stats.totalCrafts++;
    this._stats.successfulCrafts++;
    this._save();
    this._log('Crafted ' + crafted.name + ' using recipe ' + recipe.name);
    return { success: true, card: crafted };
  };

  // Enhance a crafted card
  CraftingForge.prototype.enhanceCard = function (cardId, attribute, amount) {
    var card = this._craftedCards[cardId];
    if (!card) return { error: 'card_not_found' };
    if (card.enhancementSlots >= 5) return { error: 'max_enhancements' };

    card.enhance(attribute, amount);
    this._save();
    return { success: true, bonuses: card.bonuses };
  };

  // Get stats
  CraftingForge.prototype.getStats = function () {
    return {
      totalCrafts: this._stats.totalCrafts,
      successfulCrafts: this._stats.successfulCrafts,
      failedCrafts: this._stats.failedCrafts,
      legendaryCrafts: this._stats.legendaryCrafts
    };
  };

  // List recipes
  CraftingForge.prototype.listRecipes = function (includeSecret) {
    var result = [];
    for (var id in this._recipes) {
      var r = this._recipes[id];
      if (!includeSecret && r.isSecret && !r.unlocked) continue;
      result.push(r);
    }
    return result;
  };

  // Get crafted card
  CraftingForge.prototype.getCraftedCard = function (cardId) {
    return this._craftedCards[cardId] || null;
  };

  // List crafted cards
  CraftingForge.prototype.listCraftedCards = function () {
    var result = [];
    for (var id in this._craftedCards) result.push(this._craftedCards[id]);
    return result;
  };

  // Add custom recipe
  CraftingForge.prototype.addRecipe = function (id, name, resultCardId, materialRequirements, difficulty, bonuses) {
    if (this._recipes[id]) {
      var r = { error: 'recipe_exists' };
      return r;
    }
    this._recipes[id] = new Recipe(id, name, resultCardId, materialRequirements, difficulty, bonuses);
    var result = { success: true };
    return result;
  };

  // Unlock recipe
  CraftingForge.prototype.unlockRecipe = function (recipeId) {
    var r = this._recipes[recipeId];
    if (!r) return { error: 'recipe_not_found' };
    r.unlock();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // --------------------------------------------------------------------===
  window.Material = Material;
  window.CraftedCard = CraftedCard;
  window.Recipe = Recipe;
  window.CraftingForge = CraftingForge;
})();