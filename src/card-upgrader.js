/**
 * CardUpgrader - Card Upgrade System
 * Handles card rarity upgrades: white -> blue -> purple -> gold -> red
 * Calculates upgrade costs, success rates, and manages upgrade history
 */

const CardUpgrader = class CardUpgrader {
  static RARITY_TIERS = ['white', 'blue', 'purple', 'gold', 'red'];

  static SUCCESS_RATES = {
    'white_blue': 0.95,
    'blue_purple': 0.85,
    'purple_gold': 0.70,
    'gold_red': 0.50
  };

  static BASE_COSTS = {
    'white_blue': { gold: 100, materials: [
      { material: 'shard_common', amount: 50 },
      { material: 'dust_basic', amount: 20 }
    ]},
    'blue_purple': { gold: 500, materials: [
      { material: 'shard_uncommon', amount: 30 },
      { material: 'dust_fine', amount: 15 }
    ]},
    'purple_gold': { gold: 2000, materials: [
      { material: 'shard_rare', amount: 20 },
      { material: 'essence_primary', amount: 10 }
    ]},
    'gold_red': { gold: 10000, materials: [
      { material: 'shard_rare', amount: 50 },
      { material: 'essence_secondary', amount: 20 }
    ]}
  };

  constructor(materialRegistry = null) {
    this.materialRegistry = materialRegistry;
    this.customSuccessRates = {};
    this.upgradeHistory = [];
    this.upgradedCards = new Map();
  }

  getRarityTiers() {
    return [...CardUpgrader.RARITY_TIERS];
  }

  getNextRarity(currentRarity) {
    const tiers = CardUpgrader.RARITY_TIERS;
    const currentIndex = tiers.indexOf(currentRarity);

    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return null;
    }

    return tiers[currentIndex + 1];
  }

  getUpgradePath(fromRarity) {
    const tiers = CardUpgrader.RARITY_TIERS;
    const startIndex = tiers.indexOf(fromRarity);

    if (startIndex === -1) {
      return [];
    }

    return tiers.slice(startIndex + 1);
  }

  calculateSuccessRate(fromRarity, toRarity) {
    const pathKey = `${fromRarity}_${toRarity}`;
    const tiers = CardUpgrader.RARITY_TIERS;

    if (!tiers.includes(fromRarity) || !tiers.includes(toRarity)) {
      return 0;
    }

    const currentIndex = tiers.indexOf(fromRarity);
    const nextIndex = tiers.indexOf(toRarity);

    if (nextIndex !== currentIndex + 1) {
      return 0;
    }

    if (this.customSuccessRates[pathKey] !== undefined) {
      return this.customSuccessRates[pathKey];
    }

    return CardUpgrader.SUCCESS_RATES[pathKey] || 0.5;
  }

  calculateUpgradeCost(fromRarity, toRarity) {
    const tiers = CardUpgrader.RARITY_TIERS;

    if (!tiers.includes(fromRarity) || !tiers.includes(toRarity)) {
      return null;
    }

    const currentIndex = tiers.indexOf(fromRarity);
    const nextIndex = tiers.indexOf(toRarity);

    if (nextIndex !== currentIndex + 1) {
      return null;
    }

    const pathKey = `${fromRarity}_${toRarity}`;
    const baseCost = CardUpgrader.BASE_COSTS[pathKey];

    if (!baseCost) {
      return null;
    }

    // Scale cost based on tier difference
    const scaleFactor = 1 + (nextIndex - 1) * 0.25;

    return {
      goldCost: Math.floor(baseCost.gold * scaleFactor),
      materials: baseCost.materials.map(m => ({
        material: m.material,
        amount: Math.floor(m.amount * scaleFactor)
      }))
    };
  }

  canUpgrade(fromRarity, toRarity) {
    const cost = this.calculateUpgradeCost(fromRarity, toRarity);

    if (!cost) {
      return false;
    }

    if (this.materialRegistry) {
      for (const mat of cost.materials) {
        if (!this.materialRegistry.hasMaterial(mat.material, mat.amount)) {
          return false;
        }
      }
    }

    return true;
  }

  upgrade(cardId, fromRarity, toRarity) {
    const cost = this.calculateUpgradeCost(fromRarity, toRarity);

    if (!cost) {
      return {
        success: false,
        message: 'Invalid upgrade path',
        cardId,
        fromRarity,
        toRarity
      };
    }

    if (!this.canUpgrade(fromRarity, toRarity)) {
      return {
        success: false,
        message: 'Insufficient materials',
        cardId,
        fromRarity,
        toRarity,
        required: cost
      };
    }

    // Consume materials
    if (this.materialRegistry) {
      for (const mat of cost.materials) {
        this.materialRegistry.consumeMaterial(mat.material, mat.amount);
      }
    }

    // Roll dice for success
    const successRate = this.calculateSuccessRate(fromRarity, toRarity);
    const roll = Math.random();
    const upgradeSuccess = roll < successRate;

    const result = {
      success: upgradeSuccess,
      cardId,
      fromRarity,
      toRarity,
      successRate,
      roll,
      timestamp: Date.now()
    };

    this.upgradeHistory.push(result);

    if (upgradeSuccess) {
      this.upgradedCards.set(cardId, toRarity);
      result.message = 'Upgrade successful';
    } else {
      result.message = 'Upgrade failed - materials consumed';
    }

    return result;
  }

  rollbackUpgrade(upgradeResult) {
    if (upgradeResult.success) {
      return { success: false, message: 'Cannot rollback successful upgrade' };
    }

    if (upgradeResult.rolledBack) {
      return { success: false, message: 'Already rolled back' };
    }

    const cost = this.calculateUpgradeCost(upgradeResult.fromRarity, upgradeResult.toRarity);

    if (cost && this.materialRegistry) {
      for (const mat of cost.materials) {
        // Refund 50% of materials on rollback
        const refundAmount = Math.floor(mat.amount * 0.5);
        this.materialRegistry.addMaterial(mat.material, refundAmount);
      }
    }

    upgradeResult.rolledBack = true;
    upgradeResult.rollbackTimestamp = Date.now();

    return {
      success: true,
      message: 'Rollback complete',
      refundedMaterials: cost ? cost.materials.map(m => ({
        material: m.material,
        amount: Math.floor(m.amount * 0.5)
      })) : []
    };
  }

  setCustomSuccessRate(fromRarity, toRarity, rate) {
    const pathKey = `${fromRarity}_${toRarity}`;
    this.customSuccessRates[pathKey] = Math.max(0, Math.min(1, rate));
    return true;
  }

  getUpgradeHistory() {
    return [...this.upgradeHistory];
  }

  getUpgradedCardRarity(cardId) {
    return this.upgradedCards.get(cardId) || null;
  }
};

module.exports = CardUpgrader;