/**
 * CardMaterialRegistry - Material Registration and Management
 * Manages card crafting materials: shards, dust, essences
 * Provides recipe storage and conversion rate calculations
 */

const MATERIAL_TYPES = ['shard', 'dust', 'essence', 'crystal', 'gem'];

const DEFAULT_CONVERSION_RATES = {
  'shard_common': { 'dust_basic': 0.5 },
  'dust_basic': { 'shard_common': 2.0 },
  'essence_primary': { 'dust_basic': 5.0 }
};

class CardMaterialRegistry {
  constructor() {
    this.materials = new Map();
    this.recipes = {};
    this.conversionRates = new Map();
    this.metadata = new Map();

    this.initializeDefaultMaterials();
    this.initializeDefaultRecipes();
    this.initializeDefaultConversionRates();
  }

  initializeDefaultMaterials() {
    const defaults = [
      { id: 'shard_common', type: 'shard', tier: 1, value: 1 },
      { id: 'shard_uncommon', type: 'shard', tier: 2, value: 5 },
      { id: 'shard_rare', type: 'shard', tier: 3, value: 20 },
      { id: 'dust_basic', type: 'dust', tier: 1, value: 2 },
      { id: 'dust_fine', type: 'dust', tier: 2, value: 10 },
      { id: 'essence_primary', type: 'essence', tier: 1, value: 50 },
      { id: 'essence_secondary', type: 'essence', tier: 2, value: 200 }
    ];

    defaults.forEach(m => {
      this.materials.set(m.id, 0);
      this.metadata.set(m.id, { type: m.type, tier: m.tier, value: m.value });
    });
  }

  initializeDefaultRecipes() {
    this.recipes = {
      'craft_dust': {
        output: { material: 'dust_basic', amount: 1 },
        inputs: [
          { material: 'shard_common', amount: 10 }
        ],
        conversionRate: 1.0
      },
      'craft_essence': {
        output: { material: 'essence_primary', amount: 1 },
        inputs: [
          { material: 'dust_basic', amount: 10 },
          { material: 'shard_common', amount: 20 }
        ],
        conversionRate: 0.8
      },
      'upgrade_to_uncommon': {
        output: { material: 'shard_uncommon', amount: 1 },
        inputs: [
          { material: 'shard_common', amount: 10 }
        ],
        conversionRate: 0.7
      }
    };
  }

  initializeDefaultConversionRates() {
    Object.entries(DEFAULT_CONVERSION_RATES).forEach(([from, rates]) => {
      Object.entries(rates).forEach(([to, rate]) => {
        this.conversionRates.set(`${from}->${to}`, rate);
      });
    });
  }

  registerMaterial(materialId, metadata = {}) {
    if (this.materials.has(materialId)) {
      return false;
    }

    this.materials.set(materialId, 0);
    this.metadata.set(materialId, {
      type: metadata.type || 'unknown',
      tier: metadata.tier || 1,
      value: metadata.value || 0,
      tradable: metadata.tradable !== undefined ? metadata.tradable : true
    });

    return true;
  }

  addMaterial(materialId, amount) {
    if (!this.materials.has(materialId)) {
      this.materials.set(materialId, 0);
    }

    const current = this.materials.get(materialId);
    this.materials.set(materialId, current + amount);
    return true;
  }

  consumeMaterial(materialId, amount) {
    if (!this.materials.has(materialId)) {
      return false;
    }

    const current = this.materials.get(materialId);
    if (current < amount) {
      return false;
    }

    this.materials.set(materialId, current - amount);
    return true;
  }

  getMaterialCount(materialId) {
    return this.materials.get(materialId) || 0;
  }

  hasMaterial(materialId, requiredAmount) {
    return this.getMaterialCount(materialId) >= requiredAmount;
  }

  getMaterialTypes() {
    const types = new Set();
    this.metadata.forEach((meta) => {
      types.add(meta.type);
    });
    return Array.from(types);
  }

  getMaterialMetadata(materialId) {
    return this.metadata.get(materialId) || null;
  }

  registerRecipe(recipeId, recipe) {
    if (!recipe.output || !recipe.inputs) {
      return false;
    }

    this.recipes[recipeId] = {
      output: { ...recipe.output },
      inputs: recipe.inputs.map(i => ({ ...i })),
      conversionRate: recipe.conversionRate !== undefined ? recipe.conversionRate : 1.0
    };

    return true;
  }

  getRecipe(recipeId) {
    return this.recipes[recipeId] || null;
  }

  getRecipes() {
    return { ...this.recipes };
  }

  setConversionRate(fromMaterial, toMaterial, rate) {
    const key = `${fromMaterial}->${toMaterial}`;
    this.conversionRates.set(key, rate);
    return true;
  }

  getConversionRate(fromMaterial, toMaterial) {
    const key = `${fromMaterial}->${toMaterial}`;
    return this.conversionRates.get(key) || 1.0;
  }

  calculateOutput(fromMaterial, inputAmount, toMaterial) {
    if (inputAmount <= 0) {
      return 0;
    }

    const rate = this.getConversionRate(fromMaterial, toMaterial);
    return Math.floor(inputAmount * rate);
  }

  getInventory() {
    const inventory = {};
    this.materials.forEach((count, materialId) => {
      if (count > 0) {
        inventory[materialId] = count;
      }
    });
    return inventory;
  }

  clearInventory() {
    this.materials.forEach((_, key) => {
      this.materials.set(key, 0);
    });
  }
}

module.exports = CardMaterialRegistry;