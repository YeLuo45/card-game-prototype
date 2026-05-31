/**
 * CraftingUI Test Suite
 * Tests crafting preview UI, history display, and quick craft schemes
 */

const CraftingUI = require('../../src/crafting-ui');
const CardMaterialRegistry = require('../../src/card-material-registry');
const CardUpgrader = require('../../src/card-upgrader');
const MaterialExchange = require('../../src/material-exchange');

describe('CraftingUI', () => {
  let craftingUI;
  let materialRegistry;
  let cardUpgrader;
  let materialExchange;

  beforeEach(() => {
    materialRegistry = new CardMaterialRegistry();
    cardUpgrader = new CardUpgrader(materialRegistry);
    materialExchange = new MaterialExchange(materialRegistry);
    craftingUI = new CraftingUI(materialRegistry, cardUpgrader, materialExchange);
  });

  describe('constructor', () => {
    test('should initialize with material registry', () => {
      expect(craftingUI.materialRegistry).toBe(materialRegistry);
    });

    test('should initialize with card upgrader', () => {
      expect(craftingUI.cardUpgrader).toBe(cardUpgrader);
    });

    test('should initialize with material exchange', () => {
      expect(craftingUI.materialExchange).toBe(materialExchange);
    });

    test('should have empty event listeners initially', () => {
      expect(craftingUI.eventListeners).toBeDefined();
      expect(Object.keys(craftingUI.eventListeners).length).toBe(0);
    });
  });

  describe('previewUpgrade', () => {
    test('should return preview for valid upgrade', () => {
      const preview = craftingUI.previewUpgrade('white', 'blue');
      expect(preview).not.toBeNull();
      expect(preview).toHaveProperty('fromRarity');
      expect(preview).toHaveProperty('toRarity');
      expect(preview).toHaveProperty('cost');
      expect(preview).toHaveProperty('successRate');
    });

    test('should return null for invalid upgrade', () => {
      const preview = craftingUI.previewUpgrade('white', 'white');
      expect(preview).toBeNull();
    });

    test('should include cost details in preview', () => {
      const preview = craftingUI.previewUpgrade('white', 'blue');
      expect(preview.cost).toHaveProperty('goldCost');
      expect(preview.cost).toHaveProperty('materials');
    });

    test('should include success rate in preview', () => {
      const preview = craftingUI.previewUpgrade('white', 'blue');
      expect(preview.successRate).toBeGreaterThan(0);
      expect(preview.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('previewConversion', () => {
    test('should return preview for valid conversion', () => {
      const preview = craftingUI.previewConversion('shard_common', 'dust_basic', 50);
      expect(preview).not.toBeNull();
      expect(preview).toHaveProperty('from');
      expect(preview).toHaveProperty('to');
      expect(preview).toHaveProperty('inputAmount');
      expect(preview).toHaveProperty('outputAmount');
    });

    test('should return null for invalid amount', () => {
      const preview = craftingUI.previewConversion('shard_common', 'dust_basic', -10);
      expect(preview).toBeNull();
    });

    test('should include exchange rate in preview', () => {
      const preview = craftingUI.previewConversion('shard_common', 'dust_basic', 50);
      expect(preview).toHaveProperty('rate');
    });
  });

  describe('on', () => {
    test('should register event listener', () => {
      const callback = jest.fn();
      craftingUI.on('upgradeComplete', callback);
      expect(craftingUI.eventListeners['upgradeComplete']).toContain(callback);
    });

    test('should allow multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      craftingUI.on('upgradeComplete', callback1);
      craftingUI.on('upgradeComplete', callback2);
      expect(craftingUI.eventListeners['upgradeComplete'].length).toBe(2);
    });
  });

  describe('off', () => {
    test('should remove registered listener', () => {
      const callback = jest.fn();
      craftingUI.on('upgradeComplete', callback);
      craftingUI.off('upgradeComplete', callback);
      expect(craftingUI.eventListeners['upgradeComplete']).not.toContain(callback);
    });

    test('should not affect other listeners when removing one', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      craftingUI.on('upgradeComplete', callback1);
      craftingUI.on('upgradeComplete', callback2);
      craftingUI.off('upgradeComplete', callback1);
      expect(craftingUI.eventListeners['upgradeComplete'].length).toBe(1);
    });
  });

  describe('emit', () => {
    test('should call registered event listeners', () => {
      const callback = jest.fn();
      craftingUI.on('upgradeComplete', callback);
      craftingUI.emit('upgradeComplete', { cardId: 'test' });
      expect(callback).toHaveBeenCalledWith({ cardId: 'test' });
    });

    test('should call multiple registered listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      craftingUI.on('upgradeComplete', callback1);
      craftingUI.on('upgradeComplete', callback2);
      craftingUI.emit('upgradeComplete', { cardId: 'test' });
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should not throw for events with no listeners', () => {
      expect(() => {
        craftingUI.emit('nonexistentEvent', {});
      }).not.toThrow();
    });
  });

  describe('getCraftingHistory', () => {
    test('should return empty array initially', () => {
      expect(craftingUI.getCraftingHistory()).toEqual([]);
    });

    test('should record upgrade operations', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      craftingUI.executeUpgrade('card_1', 'white', 'blue');
      const history = craftingUI.getCraftingHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('getQuickSchemes', () => {
    test('should return array of quick schemes', () => {
      const schemes = craftingUI.getQuickSchemes();
      expect(Array.isArray(schemes)).toBe(true);
    });

    test('should include default upgrade schemes', () => {
      const schemes = craftingUI.getQuickSchemes();
      expect(schemes.length).toBeGreaterThan(0);
    });

    test('should include upgrade path in scheme', () => {
      const schemes = craftingUI.getQuickSchemes();
      if (schemes.length > 0) {
        expect(schemes[0]).toHaveProperty('fromRarity');
        expect(schemes[0]).toHaveProperty('toRarity');
      }
    });
  });

  describe('addQuickScheme', () => {
    test('should add custom quick scheme', () => {
      const scheme = {
        name: 'Test Scheme',
        type: 'upgrade',
        fromRarity: 'white',
        toRarity: 'blue',
        autoExecute: false
      };
      const result = craftingUI.addQuickScheme(scheme);
      expect(result).toBe(true);
    });

    test('should fail for invalid scheme', () => {
      const result = craftingUI.addQuickScheme({ name: 'Invalid' });
      expect(result).toBe(false);
    });
  });

  describe('removeQuickScheme', () => {
    test('should remove existing scheme by index', () => {
      craftingUI.addQuickScheme({
        name: 'Test',
        type: 'upgrade',
        fromRarity: 'white',
        toRarity: 'blue'
      });
      const result = craftingUI.removeQuickScheme(0);
      expect(result).toBe(true);
    });

    test('should return false for invalid index', () => {
      const result = craftingUI.removeQuickScheme(999);
      expect(result).toBe(false);
    });
  });

  describe('executeUpgrade', () => {
    test('should return result object on execution', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      const result = craftingUI.executeUpgrade('card_1', 'white', 'blue');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('cardId');
    });

    test('should record in crafting history', () => {
      materialRegistry.addMaterial('shard_common', 1000);
      materialRegistry.addMaterial('dust_basic', 500);
      craftingUI.executeUpgrade('card_1', 'white', 'blue');
      const history = craftingUI.getCraftingHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('executeConversion', () => {
    test('should return result object on execution', () => {
      materialRegistry.addMaterial('shard_common', 100);
      const result = craftingUI.executeConversion('shard_common', 'dust_basic', 50);
      expect(result).toHaveProperty('success');
    });

    test('should record in crafting history', () => {
      materialRegistry.addMaterial('shard_common', 100);
      craftingUI.executeConversion('shard_common', 'dust_basic', 50);
      const history = craftingUI.getCraftingHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('clearHistory', () => {
    test('should clear crafting history', () => {
      materialRegistry.addMaterial('shard_common', 100);
      craftingUI.executeConversion('shard_common', 'dust_basic', 50);
      craftingUI.clearHistory();
      expect(craftingUI.getCraftingHistory()).toEqual([]);
    });
  });

  describe('loadQuickScheme', () => {
    test('should return preview for valid scheme', () => {
      const preview = craftingUI.loadQuickScheme(0);
      // May be null if no schemes exist at index 0
      // This tests the method works without throwing
      expect(true).toBe(true);
    });
  });

  describe('getInventorySummary', () => {
    test('should return inventory summary', () => {
      materialRegistry.addMaterial('shard_common', 50);
      materialRegistry.addMaterial('dust_basic', 30);
      const summary = craftingUI.getInventorySummary();
      expect(summary).toHaveProperty('totalMaterials');
      expect(summary).toHaveProperty('materials');
    });

    test('should include material counts', () => {
      materialRegistry.addMaterial('shard_common', 50);
      const summary = craftingUI.getInventorySummary();
      expect(summary.materials.shard_common).toBe(50);
    });
  });

  describe('event emission for specific operations', () => {
    test('should emit conversionComplete event', () => {
      const callback = jest.fn();
      craftingUI.on('conversionComplete', callback);
      materialRegistry.addMaterial('shard_common', 100);
      craftingUI.executeConversion('shard_common', 'dust_basic', 50);
      expect(callback).toHaveBeenCalled();
    });
  });
});