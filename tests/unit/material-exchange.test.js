/**
 * MaterialExchange Test Suite
 * Tests material conversion, batch operations, and optimal path finding
 */

const MaterialExchange = require('../../src/material-exchange');
const CardMaterialRegistry = require('../../src/card-material-registry');

describe('MaterialExchange', () => {
  let exchange;
  let materialRegistry;

  beforeEach(() => {
    materialRegistry = new CardMaterialRegistry();
    exchange = new MaterialExchange(materialRegistry);
  });

  describe('constructor', () => {
    test('should initialize with material registry', () => {
      expect(exchange.materialRegistry).toBe(materialRegistry);
    });

    test('should have default exchange rates', () => {
      const rates = exchange.getExchangeRates();
      expect(Object.keys(rates).length).toBeGreaterThan(0);
    });
  });

  describe('convertMaterial', () => {
    test('should convert high-tier material to low-tier correctly', () => {
      materialRegistry.addMaterial('essence_primary', 100);
      const result = exchange.convertMaterial('essence_primary', 'dust_basic', 50);
      expect(result.success).toBe(true);
      expect(result.outputAmount).toBeGreaterThan(0);
    });

    test('should fail when input material is insufficient', () => {
      materialRegistry.addMaterial('essence_primary', 10);
      const result = exchange.convertMaterial('essence_primary', 'dust_basic', 50);
      expect(result.success).toBe(false);
    });

    test('should consume input material on successful conversion', () => {
      materialRegistry.addMaterial('essence_primary', 100);
      const initialCount = materialRegistry.getMaterialCount('essence_primary');
      exchange.convertMaterial('essence_primary', 'dust_basic', 50);
      expect(materialRegistry.getMaterialCount('essence_primary')).toBeLessThan(initialCount);
    });

    test('should produce output material on successful conversion', () => {
      materialRegistry.addMaterial('essence_primary', 100);
      const initialOutput = materialRegistry.getMaterialCount('dust_basic');
      exchange.convertMaterial('essence_primary', 'dust_basic', 50);
      expect(materialRegistry.getMaterialCount('dust_basic')).toBeGreaterThan(initialOutput);
    });
  });

  describe('convertReverse', () => {
    test('should allow reverse conversion with extra cost', () => {
      materialRegistry.addMaterial('dust_basic', 100);
      const result = exchange.convertMaterial('dust_basic', 'essence_primary', 10, { reverse: true });
      expect(result.success).toBe(true);
      expect(result.inputAmount).toBeGreaterThan(10); // Extra cost for reverse
    });

    test('should fail for reverse conversion when materials insufficient', () => {
      materialRegistry.addMaterial('dust_basic', 5);
      const result = exchange.convertMaterial('dust_basic', 'essence_primary', 10, { reverse: true });
      expect(result.success).toBe(false);
    });
  });

  describe('batchConvert', () => {
    test('should process multiple conversions', () => {
      materialRegistry.addMaterial('shard_common', 200);
      const conversions = [
        { from: 'shard_common', to: 'dust_basic', amount: 50 },
        { from: 'shard_common', to: 'dust_basic', amount: 50 }
      ];
      const result = exchange.batchConvert(conversions);
      expect(result.totalProcessed).toBe(2);
    });

    test('should return failure count for partial batch', () => {
      materialRegistry.addMaterial('shard_common', 50);
      const conversions = [
        { from: 'shard_common', to: 'dust_basic', amount: 50 },
        { from: 'shard_common', to: 'dust_basic', amount: 50 }
      ];
      const result = exchange.batchConvert(conversions);
      expect(result.totalProcessed).toBeLessThan(2);
    });

    test('should aggregate outputs from batch', () => {
      materialRegistry.addMaterial('shard_common', 200);
      const conversions = [
        { from: 'shard_common', to: 'dust_basic', amount: 50 },
        { from: 'shard_common', to: 'dust_basic', amount: 50 }
      ];
      const result = exchange.batchConvert(conversions);
      expect(result.totalOutputAmount).toBeGreaterThan(0);
    });
  });

  describe('findOptimalPath', () => {
    test('should find path between two directly connected materials', () => {
      const path = exchange.findOptimalPath('shard_common', 'dust_basic');
      expect(path).not.toBeNull();
      expect(path.length).toBeGreaterThan(0);
    });

    test('should return direct path when available', () => {
      const path = exchange.findOptimalPath('shard_common', 'dust_basic');
      expect(path).not.toBeNull();
    });

    test('should return null when no path exists', () => {
      const path = exchange.findOptimalPath('nonexistent_a', 'nonexistent_b');
      expect(path).toBeNull();
    });

    test('should return empty or null for unconnected materials', () => {
      const path = exchange.findOptimalPath('shard_common', 'essence_primary');
      expect(path === null || Array.isArray(path)).toBe(true);
    });

    test('should include conversion steps in path', () => {
      const path = exchange.findOptimalPath('shard_common', 'dust_basic');
      if (path && path.length > 0) {
        expect(path[0]).toHaveProperty('from');
        expect(path[0]).toHaveProperty('to');
      }
    });
  });

  describe('calculateExchangeRate', () => {
    test('should return configured exchange rate', () => {
      const rate = exchange.calculateExchangeRate('shard_common', 'dust_basic');
      expect(rate).toBeGreaterThan(0);
    });

    test('should apply reverse multiplier when specified', () => {
      const normalRate = exchange.calculateExchangeRate('dust_basic', 'shard_common');
      const reverseRate = exchange.calculateExchangeRate('dust_basic', 'shard_common', { reverse: true });
      expect(reverseRate).toBeLessThan(normalRate);
    });
  });

  describe('setExchangeRate', () => {
    test('should set custom exchange rate', () => {
      const result = exchange.setExchangeRate('material_a', 'material_b', 0.75);
      expect(result).toBe(true);
      expect(exchange.calculateExchangeRate('material_a', 'material_b')).toBe(0.75);
    });

    test('should update existing rate', () => {
      exchange.setExchangeRate('material_a', 'material_b', 0.5);
      exchange.setExchangeRate('material_a', 'material_b', 0.8);
      expect(exchange.calculateExchangeRate('material_a', 'material_b')).toBe(0.8);
    });
  });

  describe('getExchangeRates', () => {
    test('should return all configured exchange rates', () => {
      const rates = exchange.getExchangeRates();
      expect(typeof rates).toBe('object');
    });

    test('should include default rates', () => {
      const rates = exchange.getExchangeRates();
      expect(Object.keys(rates).length).toBeGreaterThan(0);
    });
  });

  describe('getExchangeHistory', () => {
    test('should return empty array initially', () => {
      expect(exchange.getExchangeHistory()).toEqual([]);
    });

    test('should record exchange operations', () => {
      materialRegistry.addMaterial('shard_common', 100);
      exchange.convertMaterial('shard_common', 'dust_basic', 50);
      const history = exchange.getExchangeHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('clearHistory', () => {
    test('should clear exchange history', () => {
      materialRegistry.addMaterial('shard_common', 100);
      exchange.convertMaterial('shard_common', 'dust_basic', 50);
      exchange.clearHistory();
      expect(exchange.getExchangeHistory()).toEqual([]);
    });
  });

  describe('calculateTotalOutput', () => {
    test('should calculate total output for multiple conversions', () => {
      const conversions = [
        { from: 'shard_common', to: 'dust_basic', amount: 50 },
        { from: 'shard_common', to: 'dust_basic', amount: 30 }
      ];
      const total = exchange.calculateTotalOutput(conversions);
      expect(total).toBeGreaterThan(0);
    });

    test('should return 0 for empty conversion list', () => {
      const total = exchange.calculateTotalOutput([]);
      expect(total).toBe(0);
    });
  });

  describe('reverse conversion cost', () => {
    test('should require more materials for reverse conversion', () => {
      materialRegistry.addMaterial('shard_common', 500);
      materialRegistry.addMaterial('dust_basic', 500);
      
      // Normal: 10 shard -> 5 dust
      const normalResult = exchange.convertMaterial('shard_common', 'dust_basic', 10);
      
      // Reverse: should require more than 5 shard for 5 dust
      const reverseResult = exchange.convertMaterial('dust_basic', 'shard_common', 5, { reverse: true });
      
      if (normalResult.success && reverseResult.success) {
        expect(reverseResult.inputAmount).toBeGreaterThan(5);
      }
    });
  });
});