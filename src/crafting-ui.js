/**
 * CraftingUI - Crafting Preview and User Interface
 * Provides crafting previews, history tracking, and quick schemes
 * Supports event-driven UI updates
 */

const CraftingUI = class CraftingUI {
  constructor(materialRegistry, cardUpgrader, materialExchange) {
    this.materialRegistry = materialRegistry;
    this.cardUpgrader = cardUpgrader;
    this.materialExchange = materialExchange;
    this.eventListeners = {};
    this.craftingHistory = [];
    this.quickSchemes = this.initializeDefaultSchemes();
  }

  initializeDefaultSchemes() {
    return [
      {
        name: 'Basic Upgrade',
        type: 'upgrade',
        fromRarity: 'white',
        toRarity: 'blue',
        autoExecute: false,
        description: 'Upgrade common card to uncommon'
      },
      {
        name: 'Intermediate Upgrade',
        type: 'upgrade',
        fromRarity: 'blue',
        toRarity: 'purple',
        autoExecute: false,
        description: 'Upgrade uncommon card to rare'
      },
      {
        name: 'Shard to Dust',
        type: 'conversion',
        fromMaterial: 'shard_common',
        toMaterial: 'dust_basic',
        amount: 100,
        autoExecute: false,
        description: 'Convert common shards to basic dust'
      },
      {
        name: 'Dust to Essence',
        type: 'conversion',
        fromMaterial: 'dust_basic',
        toMaterial: 'essence_primary',
        amount: 50,
        autoExecute: false,
        description: 'Convert dust to primary essence'
      }
    ];
  }

  previewUpgrade(fromRarity, toRarity) {
    const cost = this.cardUpgrader.calculateUpgradeCost(fromRarity, toRarity);
    const successRate = this.cardUpgrader.calculateSuccessRate(fromRarity, toRarity);

    if (!cost || successRate === 0) {
      return null;
    }

    const canUpgrade = this.cardUpgrader.canUpgrade(fromRarity, toRarity);

    return {
      fromRarity,
      toRarity,
      cost: {
        goldCost: cost.goldCost,
        materials: cost.materials
      },
      successRate,
      canExecute: canUpgrade,
      estimatedCost: this.estimateMaterialCost(cost.materials)
    };
  }

  previewConversion(fromMaterial, toMaterial, amount) {
    if (amount <= 0) {
      return null;
    }

    const rate = this.materialExchange.calculateExchangeRate(fromMaterial, toMaterial);
    const outputAmount = Math.floor(amount * rate);
    const available = this.materialRegistry.getMaterialCount(fromMaterial);

    return {
      from: fromMaterial,
      to: toMaterial,
      inputAmount: amount,
      outputAmount,
      rate,
      hasEnough: available >= amount,
      available
    };
  }

  estimateMaterialCost(materials) {
    let totalValue = 0;
    materials.forEach(mat => {
      const meta = this.materialRegistry.getMaterialMetadata(mat.material);
      if (meta) {
        totalValue += meta.value * mat.amount;
      }
    });
    return totalValue;
  }

  executeUpgrade(cardId, fromRarity, toRarity) {
    const preview = this.previewUpgrade(fromRarity, toRarity);

    if (!preview) {
      const result = {
        success: false,
        message: 'Invalid upgrade path',
        cardId,
        fromRarity,
        toRarity
      };
      this.recordHistory('upgrade', result);
      this.emit('upgradeComplete', result);
      return result;
    }

    if (!preview.canExecute) {
      const result = {
        success: false,
        message: 'Insufficient materials',
        cardId,
        fromRarity,
        toRarity,
        required: preview.cost
      };
      this.recordHistory('upgrade', result);
      this.emit('upgradeComplete', result);
      return result;
    }

    const result = this.cardUpgrader.upgrade(cardId, fromRarity, toRarity);
    result.cardId = cardId;
    this.recordHistory('upgrade', result);
    this.emit('upgradeComplete', result);
    return result;
  }

  executeConversion(fromMaterial, toMaterial, amount, options = {}) {
    const preview = this.previewConversion(fromMaterial, toMaterial, amount);

    if (!preview) {
      const result = {
        success: false,
        message: 'Invalid conversion parameters',
        fromMaterial,
        toMaterial,
        amount
      };
      this.recordHistory('conversion', result);
      this.emit('conversionComplete', result);
      return result;
    }

    if (!preview.hasEnough) {
      const result = {
        success: false,
        message: 'Insufficient materials',
        fromMaterial,
        toMaterial,
        amount,
        available: preview.available
      };
      this.recordHistory('conversion', result);
      this.emit('conversionComplete', result);
      return result;
    }

    const result = this.materialExchange.convertMaterial(fromMaterial, toMaterial, amount, options);
    this.recordHistory('conversion', result);
    this.emit('conversionComplete', result);
    return result;
  }

  recordHistory(type, result) {
    this.craftingHistory.push({
      type,
      result,
      timestamp: Date.now()
    });
  }

  getCraftingHistory() {
    return [...this.craftingHistory];
  }

  clearHistory() {
    this.craftingHistory = [];
  }

  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      return;
    }
    const index = this.eventListeners[eventName].indexOf(callback);
    if (index !== -1) {
      this.eventListeners[eventName].splice(index, 1);
    }
  }

  emit(eventName, data) {
    if (!this.eventListeners[eventName]) {
      return;
    }
    this.eventListeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event listener for ${eventName}:`, e);
      }
    });
  }

  getQuickSchemes() {
    return [...this.quickSchemes];
  }

  addQuickScheme(scheme) {
    if (!scheme.name || !scheme.type) {
      return false;
    }

    this.quickSchemes.push({
      name: scheme.name,
      type: scheme.type,
      fromRarity: scheme.fromRarity,
      toRarity: scheme.toRarity,
      fromMaterial: scheme.fromMaterial,
      toMaterial: scheme.toMaterial,
      amount: scheme.amount,
      autoExecute: scheme.autoExecute || false,
      description: scheme.description || ''
    });

    return true;
  }

  removeQuickScheme(index) {
    if (index < 0 || index >= this.quickSchemes.length) {
      return false;
    }
    this.quickSchemes.splice(index, 1);
    return true;
  }

  loadQuickScheme(index) {
    const scheme = this.quickSchemes[index];
    if (!scheme) {
      return null;
    }

    if (scheme.type === 'upgrade') {
      return this.previewUpgrade(scheme.fromRarity, scheme.toRarity);
    } else if (scheme.type === 'conversion') {
      return this.previewConversion(scheme.fromMaterial, scheme.toMaterial, scheme.amount);
    }

    return null;
  }

  getInventorySummary() {
    const inventory = this.materialRegistry.getInventory();
    let totalMaterials = 0;

    Object.values(inventory).forEach(count => {
      totalMaterials += count;
    });

    return {
      totalMaterials,
      materials: inventory
    };
  }
};

module.exports = CraftingUI;