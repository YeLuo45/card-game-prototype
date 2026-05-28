// ============================================================================
// Card Lab Enhancement System — V118 Direction L
// ============================================================================
// Crafting system: combine cards, upgrade properties, discover new card
// variants through experimentation. Integrates: ruflo hook system
// (craft events, discovery) + nanobot tool registry + thunderbolt offline-first.
// ============================================================================

'use strict';

class Material {
  constructor(materialId, name, type, rarity, quantity) {
    this.materialId = materialId;
    this.name = name;
    this.type = type; // 'essence' | 'fragment' | 'dust' | 'crystal'
    this.rarity = rarity; // 1-5
    this.quantity = quantity;
    this.createdAt = Date.now();
  }
}

class Recipe {
  constructor(recipeId, name, input, output, requiredLevel) {
    this.recipeId = recipeId;
    this.name = name;
    this.input = input; // [{materialId, quantity}]
    this.output = output; // { cardId?, materialId?, quantity? }
    this.requiredLevel = requiredLevel; // crafting level required
    this.discoveredAt = null;
    this.uses = 0;
  }

  canCraft(level, inventory) {
    if (level < this.requiredLevel) return { allowed: false, reason: 'level_too_low' };
    for (const req of this.input) {
      const have = inventory.get(req.materialId) || 0;
      if (have < req.quantity) return { allowed: false, reason: 'insufficient_material' };
    }
    return { allowed: true };
  }
}

class CraftedCard {
  constructor(cardId, baseCardId, enhancements, createdAt) {
    this.cardId = cardId;
    this.baseCardId = baseCardId;
    this.enhancements = enhancements; // [{type, value, source}]
    this.createdAt = createdAt || Date.now();
    this.stars = 1; // 1-5 stars
  }

  addEnhancement(type, value, source) {
    this.enhancements.push({ type, value, source });
    // Recalculate stars based on enhancement count
    this.stars = Math.min(5, 1 + Math.floor(this.enhancements.length / 2));
  }
}

class CraftingSystem {
  constructor() {
    this.materials = new Map(); // materialId → Material
    this.recipes = new Map(); // recipeId → Recipe
    this.craftedCards = new Map(); // cardId → CraftedCard
    this.playerInventory = new Map(); // materialId → quantity
    this.craftingLevel = 1;
    this.craftingXP = 0;
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('crafting_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [mid, mdata] of Object.entries(data.materials || {})) {
          const m = new Material(mdata.materialId, mdata.name, mdata.type, mdata.rarity, mdata.quantity);
          m.createdAt = mdata.createdAt || Date.now();
          this.materials.set(mid, m);
        }
        for (const [rid, rdata] of Object.entries(data.recipes || {})) {
          const r = new Recipe(rdata.recipeId, rdata.name, rdata.input, rdata.output, rdata.requiredLevel);
          r.discoveredAt = rdata.discoveredAt || null;
          r.uses = rdata.uses || 0;
          this.recipes.set(rid, r);
        }
        for (const [cid, cdata] of Object.entries(data.craftedCards || {})) {
          const cc = new CraftedCard(cdata.cardId, cdata.baseCardId, cdata.enhancements || [], cdata.createdAt);
          cc.stars = cdata.stars || 1;
          this.craftedCards.set(cid, cc);
        }
        this.playerInventory = new Map(Object.entries(data.playerInventory || {}));
        this.craftingLevel = data.craftingLevel || 1;
        this.craftingXP = data.craftingXP || 0;
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        materials: Object.fromEntries(Array.from(this.materials.entries()).map(([k, v]) => [k, {
          materialId: v.materialId, name: v.name, type: v.type,
          rarity: v.rarity, quantity: v.quantity, createdAt: v.createdAt
        }])),
        recipes: Object.fromEntries(Array.from(this.recipes.entries()).map(([k, v]) => [k, {
          recipeId: v.recipeId, name: v.name, input: v.input, output: v.output,
          requiredLevel: v.requiredLevel, discoveredAt: v.discoveredAt, uses: v.uses
        }])),
        craftedCards: Object.fromEntries(Array.from(this.craftedCards.entries()).map(([k, v]) => [k, {
          cardId: v.cardId, baseCardId: v.baseCardId, enhancements: v.enhancements,
          createdAt: v.createdAt, stars: v.stars
        }])),
        playerInventory: Object.fromEntries(this.playerInventory.entries()),
        craftingLevel: this.craftingLevel,
        craftingXP: this.craftingXP
      };
      localStorage.setItem('crafting_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  addMaterial(materialId, name, type, rarity) {
    if (this.materials.has(materialId)) return { error: 'material_exists' };
    const m = new Material(materialId, name, type, rarity, 0);
    this.materials.set(materialId, m);
    this._save();
    return m;
  }

  getMaterial(materialId) {
    return this.materials.get(materialId) || null;
  }

  addRecipe(recipeId, name, input, output, requiredLevel) {
    if (this.recipes.has(recipeId)) return { error: 'recipe_exists' };
    const r = new Recipe(recipeId, name, input, output, requiredLevel);
    this.recipes.set(recipeId, r);
    this._save();
    return r;
  }

  getRecipe(recipeId) {
    return this.recipes.get(recipeId) || null;
  }

  addMaterialToInventory(materialId, quantity) {
    if (!this.materials.has(materialId)) return { error: 'material_not_found' };
    const current = this.playerInventory.get(materialId) || 0;
    this.playerInventory.set(materialId, current + quantity);
    this._save();
    return { materialId, quantity: this.playerInventory.get(materialId) };
  }

  getInventory(materialId) {
    return this.playerInventory.get(materialId) || 0;
  }

  craft(recipeId) {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return { error: 'recipe_not_found' };

    const check = recipe.canCraft(this.craftingLevel, this.playerInventory);
    if (!check.allowed) return check;

    // Deduct materials
    for (const req of recipe.input) {
      this.playerInventory.set(req.materialId, this.playerInventory.get(req.materialId) - req.quantity);
    }

    // Produce output
    const result = { ...recipe.output };
    if (result.cardId) {
      const crafted = new CraftedCard(result.cardId, result.baseCardId || result.cardId, result.enhancements || []);
      if (result.stars) crafted.stars = result.stars;
      this.craftedCards.set(result.cardId, crafted);
      result.craftedCard = crafted;
    }
    if (result.materialId && result.quantity) {
      this.addMaterialToInventory(result.materialId, result.quantity);
      result.newQuantity = this.getInventory(result.materialId);
    }

    // Award XP
    const xpGained = 10 + recipe.requiredLevel * 5;
    this.craftingXP += xpGained;
    if (this.craftingXP >= this.xpForNextLevel()) {
      this.craftingLevel++;
      this.craftingXP = this.craftingXP - this.xpForNextLevel();
      result.levelUp = this.craftingLevel;
    }

    recipe.uses++;
    this._save();
    this._emit('crafted', { recipeId, result });
    return result;
  }

  xpForNextLevel() {
    return this.craftingLevel * 50;
  }

  enhanceCard(cardId, enhancementType, value, source) {
    const card = this.craftedCards.get(cardId);
    if (!card) return { error: 'card_not_found' };
    card.addEnhancement(enhancementType, value, source);
    this._save();
    return card;
  }

  getCraftedCard(cardId) {
    return this.craftedCards.get(cardId) || null;
  }

  getPlayerLevel() {
    return { level: this.craftingLevel, xp: this.craftingXP, xpNeeded: this.xpForNextLevel() };
  }

  getStats() {
    return {
      totalMaterials: this.materials.size,
      totalRecipes: this.recipes.size,
      totalCraftedCards: this.craftedCards.size,
      craftingLevel: this.craftingLevel,
      craftingXP: this.craftingXP
    };
  }
}

const CraftingTools = {
  'crafting.add_material': {
    description: 'Add a crafting material',
    parameters: { type: 'object', properties: { materialId: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' }, rarity: { type: 'number' } }, required: ['materialId', 'name', 'type', 'rarity'] },
    handler(args) {
      if (!window._craftingSystem) window._craftingSystem = new CraftingSystem();
      return window._craftingSystem.addMaterial(args.materialId, args.name, args.type, args.rarity);
    }
  },
  'crafting.add_recipe': {
    description: 'Add a crafting recipe',
    parameters: { type: 'object', properties: { recipeId: { type: 'string' }, name: { type: 'string' }, input: { type: 'array' }, output: { type: 'object' }, requiredLevel: { type: 'number' } }, required: ['recipeId', 'name', 'input', 'output', 'requiredLevel'] },
    handler(args) {
      if (!window._craftingSystem) return { error: 'system_not_initialized' };
      return window._craftingSystem.addRecipe(args.recipeId, args.name, args.input, args.output, args.requiredLevel);
    }
  },
  'crafting.craft': {
    description: 'Craft using a recipe',
    parameters: { type: 'object', properties: { recipeId: { type: 'string' } }, required: ['recipeId'] },
    handler(args) {
      if (!window._craftingSystem) return { error: 'system_not_initialized' };
      return window._craftingSystem.craft(args.recipeId);
    }
  },
  'crafting.inventory': {
    description: 'Get material quantity',
    parameters: { type: 'object', properties: { materialId: { type: 'string' } }, required: ['materialId'] },
    handler(args) {
      if (!window._craftingSystem) return { error: 'system_not_initialized' };
      return { materialId: args.materialId, quantity: window._craftingSystem.getInventory(args.materialId) };
    }
  },
  'crafting.level': {
    description: 'Get crafting level',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._craftingSystem) window._craftingSystem = new CraftingSystem();
      return window._craftingSystem.getPlayerLevel();
    }
  },
  'crafting.stats': {
    description: 'Get crafting stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._craftingSystem) window._craftingSystem = new CraftingSystem();
      return window._craftingSystem.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Material, Recipe, CraftedCard, CraftingSystem, CraftingTools };
}
if (typeof window !== 'undefined') {
  window.Material = Material;
  window.Recipe = Recipe;
  window.CraftedCard = CraftedCard;
  window.CraftingSystem = CraftingSystem;
  window.CraftingTools = CraftingTools;
}