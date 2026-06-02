// ============================================================================
// Card Crafting Master — V136 Direction D
// ============================================================================
// Craft rare cards from materials, upgrade cards, disenchant for essence.
// nanobot tool registry + ruflo hook system (before/after craft hooks).
// ============================================================================

'use strict';

class Material {
  constructor(id, name, rarity, category) {
    this.id = id; this.name = name; this.rarity = rarity; this.category = category;
    this.quantity = 0;
  }
  add(n) { this.quantity += n; }
  consume(n) { if (this.quantity >= n) { this.quantity -= n; return true; } return false; }
}

class Recipe {
  constructor(recipeId, outputCardId, materials, successRate) {
    this.recipeId = recipeId;
    this.outputCardId = outputCardId;
    this.materials = materials; // [{ materialId, quantity }]
    this.successRate = successRate; // 0.0 - 1.0
    this.enchantLevel = 0;
  }
}

class CraftedCard {
  constructor(cardId, baseId, enchantLevel, materials) {
    this.cardId = cardId; this.baseId = baseId;
    this.enchantLevel = enchantLevel; this.materials = materials;
    this.stats = { attack: 0, defense: 0, ability: 0 };
    this.createdAt = Date.now();
    this.isEnhanced = enchantLevel > 0;
  }
}

class CraftingSystem {
  constructor() {
    this.materials = new Map(); // materialId → Material
    this.recipes = new Map(); // recipeId → Recipe
    this.craftedCards = new Map(); // cardId → CraftedCard
    this.essence = { common: 0, rare: 0, epic: 0, legendary: 0 };
    this.hooks = [];
    this._initMaterials();
    this._initRecipes();
    this._load();
  }

  _initMaterials() {
    const mats = [
      ['m_fire_essence', 'Fire Essence', 'common', 'element'],
      ['m_water_essence', 'Water Essence', 'common', 'element'],
      ['m_earth_essence', 'Earth Essence', 'common', 'element'],
      ['m_wind_essence', 'Wind Essence', 'common', 'element'],
      ['m_arcane_shard', 'Arcane Shard', 'rare', 'magic'],
      ['m_celestial_dust', 'Celestial Dust', 'epic', 'celestial'],
      ['m_dragon_scale', 'Dragon Scale', 'legendary', 'dragon'],
      ['m_phoenix_feather', 'Phoenix Feather', 'legendary', 'mythic'],
    ];
    for (const [id, name, rarity, cat] of mats) {
      this.materials.set(id, new Material(id, name, rarity, cat));
    }
  }

  _initRecipes() {
    const recs = [
      new Recipe('recipe_fire_sword', 'card_fire_sword', [{ materialId: 'm_fire_essence', quantity: 5 }, { materialId: 'm_arcane_shard', quantity: 2 }], 0.85),
      new Recipe('recipe_ice_shield', 'card_ice_shield', [{ materialId: 'm_water_essence', quantity: 5 }, { materialId: 'm_arcane_shard', quantity: 2 }], 0.80),
      new Recipe('recipe_dragon_blade', 'card_dragon_blade', [{ materialId: 'm_dragon_scale', quantity: 3 }, { materialId: 'm_celestial_dust', quantity: 2 }], 0.60),
      new Recipe('recipe_phoenix_staff', 'card_phoenix_staff', [{ materialId: 'm_phoenix_feather', quantity: 2 }, { materialId: 'm_celestial_dust', quantity: 3 }], 0.55),
    ];
    for (const r of recs) this.recipes.set(r.recipeId, r);
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('crafting_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [mid, mdata] of Object.entries(data.materials || {})) {
          if (this.materials.has(mid)) this.materials.get(mid).quantity = mdata.quantity || 0;
        }
        this.essence = data.essence || { common: 0, rare: 0, epic: 0, legendary: 0 };
        for (const [cid, cdata] of Object.entries(data.craftedCards || {})) {
          const cc = new CraftedCard(cid, cdata.baseId, cdata.enchantLevel, cdata.materials);
          cc.stats = cdata.stats || { attack: 0, defense: 0, ability: 0 };
          cc.isEnhanced = cdata.isEnhanced || false;
          this.craftedCards.set(cid, cc);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        materials: Object.fromEntries(Array.from(this.materials.entries()).map(([k, v]) => [k, { quantity: v.quantity }])),
        essence: this.essence,
        craftedCards: Object.fromEntries(Array.from(this.craftedCards.entries()).map(([k, v]) => [k, { baseId: v.baseId, enchantLevel: v.enchantLevel, materials: v.materials, stats: v.stats, isEnhanced: v.isEnhanced }]))
      };
      localStorage.setItem('crafting_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  addMaterial(playerId, materialId, quantity) {
    const mat = this.materials.get(materialId);
    if (!mat) return { error: 'material_not_found' };
    mat.add(quantity);
    this._save();
    this._emit('material_added', { materialId, quantity });
    return { success: true, quantity: mat.quantity };
  }

  craft(recipeId, playerId) {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return { error: 'recipe_not_found' };

    // Check materials
    for (const req of recipe.materials) {
      const mat = this.materials.get(req.materialId);
      if (!mat || mat.quantity < req.quantity) return { error: 'insufficient_materials' };
    }

    // Consume materials
    for (const req of recipe.materials) {
      this.materials.get(req.materialId).consume(req.quantity);
    }

    // Determine success
    const roll = Math.random();
    const success = roll <= recipe.successRate;
    const craftedId = `crafted_${recipeId}_${Date.now()}`;

    if (success) {
      const card = new CraftedCard(craftedId, recipe.outputCardId, 0, recipe.materials.map(r => r.materialId));
      card.stats = {
        attack: recipe.outputCardId.includes('sword') || recipe.outputCardId.includes('blade') ? 10 : 5,
        defense: recipe.outputCardId.includes('shield') ? 10 : 5,
        ability: 5 + Math.floor(Math.random() * 5)
      };
      this.craftedCards.set(craftedId, card);
      this._save();
      this._emit('craft_success', { cardId: craftedId, recipeId });
      return { success: true, cardId: craftedId, enchanted: false };
    } else {
      // Partial refund (50% materials)
      for (const req of recipe.materials) {
        const mat = this.materials.get(req.materialId);
        if (mat) mat.add(Math.floor(req.quantity * 0.5));
      }
      this._save();
      this._emit('craft_failed', { recipeId });
      return { success: false, error: 'craft_failed' };
    }
  }

  enhance(cardId) {
    const card = this.craftedCards.get(cardId);
    if (!card) return { error: 'card_not_found' };
    if (card.enchantLevel >= 5) return { error: 'max_level' };

    // Check essence
    const cost = this._getEnhanceCost(card.enchantLevel);
    if (this.essence[card.rarity || 'common'] < cost) return { error: 'insufficient_essence' };

    this.essence[card.rarity || 'common'] -= cost;
    card.enchantLevel++;
    card.isEnhanced = card.enchantLevel > 0;
    card.stats.attack = Math.floor(card.stats.attack * 1.2);
    card.stats.defense = Math.floor(card.stats.defense * 1.2);
    card.stats.ability = Math.floor(card.stats.ability * 1.15);
    this._save();
    this._emit('card_enhanced', { cardId, newLevel: card.enchantLevel });
    return { success: true, newLevel: card.enchantLevel };
  }

  _getEnhanceCost(level) { return [0, 50, 100, 200, 400, 800][level] || 0; }

  disenchant(cardId) {
    const card = this.craftedCards.get(cardId);
    if (!card) return { error: 'card_not_found' };
    const essenceType = 'rare'; // simplified
    const refund = 20 + card.enchantLevel * 10;
    this.essence[essenceType] += refund;
    this.craftedCards.delete(cardId);
    this._save();
    this._emit('card_disenchanted', { cardId, essenceType, refund });
    return { success: true, refund, essenceType };
  }

  getMaterials(playerId) {
    return Array.from(this.materials.values()).map(m => ({
      id: m.id, name: m.name, rarity: m.rarity, quantity: m.quantity
    }));
  }

  getRecipes() {
    return Array.from(this.recipes.values()).map(r => ({
      recipeId: r.recipeId, outputCardId: r.outputCardId,
      materials: r.materials, successRate: r.successRate
    }));
  }

  getCraftedCard(cardId) {
    const c = this.craftedCards.get(cardId);
    if (!c) return null;
    return { cardId: c.cardId, baseId: c.baseId, enchantLevel: c.enchantLevel, stats: c.stats, isEnhanced: c.isEnhanced };
  }

  listCraftedCards() {
    return Array.from(this.craftedCards.values()).map(c => ({
      cardId: c.cardId, baseId: c.baseId, enchantLevel: c.enchantLevel, isEnhanced: c.isEnhanced
    }));
  }

  getEssence() { return { ...this.essence }; }
}

const CraftingTools = {
  'craft.add_material': {
    description: 'Add material to inventory',
    parameters: { type: 'object', properties: { materialId: { type: 'string' }, quantity: { type: 'number' } }, required: ['materialId', 'quantity'] },
    handler(args) {
      if (!window._craftingSystem) window._craftingSystem = new CraftingSystem();
      return window._craftingSystem.addMaterial('default', args.materialId, args.quantity);
    }
  },
  'craft.craft': {
    description: 'Craft a card using recipe',
    parameters: { type: 'object', properties: { recipeId: { type: 'string' } } },
    handler(args) {
      if (!window._craftingSystem) return { error: 'not_init' };
      return window._craftingSystem.craft(args.recipeId, 'default');
    }
  },
  'craft.enhance': {
    description: 'Enhance a crafted card',
    parameters: { type: 'object', properties: { cardId: { type: 'string' } } },
    handler(args) {
      if (!window._craftingSystem) return { error: 'not_init' };
      return window._craftingSystem.enhance(args.cardId);
    }
  },
  'craft.disenchant': {
    description: 'Disenchant a card for essence',
    parameters: { type: 'object', properties: { cardId: { type: 'string' } } },
    handler(args) {
      if (!window._craftingSystem) return { error: 'not_init' };
      return window._craftingSystem.disenchant(args.cardId);
    }
  },
  'craft.materials': {
    description: 'Get all materials',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._craftingSystem) window._craftingSystem = new CraftingSystem();
      return window._craftingSystem.getMaterials('default');
    }
  },
  'craft.recipes': {
    description: 'Get all recipes',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._craftingSystem) window._craftingSystem = new CraftingSystem();
      return window._craftingSystem.getRecipes();
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