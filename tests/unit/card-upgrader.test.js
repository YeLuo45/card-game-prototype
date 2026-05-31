/**
 * CardUpgrader Test Suite
 * Tests card upgrade paths and success rate calculations
 */

const CardUpgrader = require('../../src/card-upgrader');
const CardMaterialRegistry = require('../../src/card-material-registry');

describe('CardUpgrader', () => {
  let upgrader;
  let materialRegistry;

  beforeEach(() => {
    materialRegistry = new CardMaterialRegistry();
    upgrader = new CardUpgrader(materialRegistry);
  });

  describe('constructor', () => {
    test('should initialize with default upgrade paths', () => {
      expect(upgrader.getUpgradePath('white')).toContain('blue');
    });

    test('should accept custom material registry', () => {
      const customRegistry = new CardMaterialRegistry();
      const customUpgrader = new CardUpgrader(customRegistry);
      expect(customUpgrader.materialRegistry).toBe(customRegistry);
    });

    test('should have predefined rarity tiers', () => {
      expect(upgrader.getRarityTiers()).toContain('white');
      expect(upgrader.getRarityTiers()).toContain('blue');
      expect(upgrader.getRarityTiers()).toContain('purple');
      expect(upgrader.getRarityTiers()).toContain('gold');
      expect(upgrader.getRarityTiers()).toContain('red');
    });
  });

  describe('RARITY_TIERS constant', () => {
    test('should define correct tier order', () => {
      const tiers = upgrader.getRarityTiers();
      expect(tiers.indexOf('white')).toBeLessThan(tiers.indexOf('blue'));
      expect(tiers.indexOf('blue')).toBeLessThan(tiers.indexOf('purple'));
      expect(tiers.indexOf('purple')).toBeLessThan(tiers.indexOf('gold'));
      expect(tiers.indexOf('gold')).toBeLessThan(tiers.indexOf('red'));
    });
  });

  describe('getNextRarity', () => {
    test('should return blue for white card', () => {
      expect(upgrader.getNextRarity('white')).toBe('blue');
    });

    test('should return purple for blue card', () => {
      expect(upgrader.getNextRarity('blue')).toBe('purple');
    });

    test('should return gold for purple card', () => {
      expect(upgrader.getNextRarity('purple')).toBe('gold');
    });

    test('should return red for gold card', () => {
      expect(upgrader.getNextRarity('gold')).toBe('red');
    });

    test('should return null for red card (max tier)', () => {
      expect(upgrader.getNextRarity('red')).toBeNull();
    });

    test('should return null for unknown rarity', () => {
      expect(upgrader.getNextRarity('unknown')).toBeNull();
    });
  });

  describe('calculateUpgradeCost', () => {
    test('should return cost for white to blue upgrade', () => {
      const cost = upgrader.calculateUpgradeCost('white', 'blue');
      expect(cost).toHaveProperty('materials');
      expect(cost).toHaveProperty('goldCost');
      expect(cost.goldCost).toBeGreaterThan(0);
    });

    test('should return higher cost for higher tier upgrades', () => {
      const costBlue = upgrader.calculateUpgradeCost('white', 'blue');
      const costPurple = upgrader.calculateUpgradeCost('blue', 'purple');
      expect(costPurple.goldCost).toBeGreaterThan(costBlue.goldCost);
    });

    test('should include material requirements in cost', () => {
      const cost = upgrader.calculateUpgradeCost('white', 'blue');
      expect(Array.isArray(cost.materials)).toBe(true);
    });

    test('should return null for invalid upgrade path', () => {
      const cost = upgrader.calculateUpgradeCost('gold', 'white');
      expect(cost).toBeNull();
    });

    test('should return null for same rarity upgrade', () => {
      const cost = upgrader.calculateUpgradeCost('blue', 'blue');
      expect(cost).toBeNull();
    });
  });

  describe('calculateSuccessRate', () => {
    test('should return configured success rate for upgrade', () => {
      const rate = upgrader.calculateSuccessRate('white', 'blue');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    test('should return lower rate for higher tier upgrades', () => {
      const rateBlue = upgrader.calculateSuccessRate('white', 'blue');
      const rateRed = upgrader.calculateSuccessRate('gold', 'red');
      expect(rateRed).toBeLessThan(rateBlue);
    });

    test('should return 0 for invalid upgrade', () => {
      const rate = upgrader.calculateSuccessRate('red', 'red');
      expect(rate).toBe(0);
    });
  });

  describe('canUpgrade', () => {
    test('should return true when materials are sufficient', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      expect(upgrader.canUpgrade('white', 'blue')).toBe(true);
    });

    test('should return false when materials are insufficient', () => {
      materialRegistry.addMaterial('shard_common', 1);
      materialRegistry.addMaterial('dust_basic', 1);
      expect(upgrader.canUpgrade('white', 'blue')).toBe(false);
    });

    test('should return false for invalid upgrade path', () => {
      expect(upgrader.canUpgrade('white', 'white')).toBe(false);
    });
  });

  describe('upgrade', () => {
    test('should successfully upgrade when materials are sufficient', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      const result = upgrader.upgrade('card_1', 'white', 'blue');
      expect(result.success).toBe(true);
    });

    test('should return failure when materials are insufficient', () => {
      materialRegistry.addMaterial('shard_common', 1);
      const result = upgrader.upgrade('card_1', 'white', 'blue');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient');
    });

    test('should return upgrade info in result', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      const result = upgrader.upgrade('card_1', 'white', 'blue');
      expect(result.cardId).toBe('card_1');
      expect(result.fromRarity).toBe('white');
      expect(result.toRarity).toBe('blue');
    });

    test('should consume materials on successful upgrade', () => {
      const initialCount = 1000;
      materialRegistry.addMaterial('shard_common', initialCount);
      materialRegistry.addMaterial('dust_basic', 500);
      upgrader.upgrade('card_1', 'white', 'blue');
      expect(materialRegistry.getMaterialCount('shard_common')).toBeLessThan(initialCount);
    });
  });

  describe('rollbackUpgrade', () => {
    test('should refund partial materials on upgrade failure', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      
      // Simulate a failed upgrade - first upgrade then rollback
      const result = upgrader.upgrade('card_1', 'white', 'blue');
      if (!result.success) {
        upgrader.rollbackUpgrade(result);
        // Should have some materials refunded
      }
    });
  });

  describe('setCustomSuccessRate', () => {
    test('should set custom success rate for upgrade path', () => {
      const result = upgrader.setCustomSuccessRate('white', 'blue', 0.95);
      expect(result).toBe(true);
      expect(upgrader.calculateSuccessRate('white', 'blue')).toBe(0.95);
    });

    test('should update existing success rate', () => {
      upgrader.setCustomSuccessRate('white', 'blue', 0.8);
      upgrader.setCustomSuccessRate('white', 'blue', 0.95);
      expect(upgrader.calculateSuccessRate('white', 'blue')).toBe(0.95);
    });
  });

  describe('getUpgradePath', () => {
    test('should return upgrade path for valid rarity', () => {
      const path = upgrader.getUpgradePath('white');
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(0);
    });

    test('should return empty array for red rarity (max)', () => {
      const path = upgrader.getUpgradePath('red');
      expect(path).toEqual([]);
    });

    test('should return empty array for unknown rarity', () => {
      const path = upgrader.getUpgradePath('unknown');
      expect(path).toEqual([]);
    });
  });

  describe('getUpgradeHistory', () => {
    test('should return empty array initially', () => {
      expect(upgrader.getUpgradeHistory()).toEqual([]);
    });

    test('should record upgrade attempts', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      upgrader.upgrade('card_1', 'white', 'blue');
      const history = upgrader.getUpgradeHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('getRarityTiers', () => {
    test('should return ordered array of rarity tiers', () => {
      const tiers = upgrader.getRarityTiers();
      expect(tiers).toEqual(['white', 'blue', 'purple', 'gold', 'red']);
    });
  });
});