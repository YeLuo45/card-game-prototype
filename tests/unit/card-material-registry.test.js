/**
 * CardMaterialRegistry Test Suite
 * Tests material registration, counting, recipes and conversion rates
 */

const CardMaterialRegistry = require('../../src/card-material-registry');

describe('CardMaterialRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new CardMaterialRegistry();
  });

  describe('constructor', () => {
    test('should initialize with default materials', () => {
      expect(registry.getMaterialCount('shard_common')).toBe(0);
      expect(registry.getMaterialCount('dust_basic')).toBe(0);
      expect(registry.getMaterialCount('essence_primary')).toBe(0);
    });

    test('should have predefined material types', () => {
      expect(registry.getMaterialTypes()).toContain('shard');
      expect(registry.getMaterialTypes()).toContain('dust');
      expect(registry.getMaterialTypes()).toContain('essence');
    });

    test('should initialize with default recipes', () => {
      const recipes = registry.getRecipes();
      expect(Object.keys(recipes).length).toBeGreaterThan(0);
    });
  });

  describe('registerMaterial', () => {
    test('should register a new material type', () => {
      const result = registry.registerMaterial('crystal_rare', {
        type: 'crystal',
        tier: 4,
        value: 100
      });
      expect(result).toBe(true);
      expect(registry.getMaterialCount('crystal_rare')).toBe(0);
    });

    test('should not allow duplicate material registration', () => {
      registry.registerMaterial('test_material', { type: 'test', tier: 1 });
      const result = registry.registerMaterial('test_material', { type: 'test', tier: 1 });
      expect(result).toBe(false);
    });

    test('should store material metadata', () => {
      registry.registerMaterial('gem_epic', {
        type: 'gem',
        tier: 5,
        value: 500,
        tradable: true
      });
      const metadata = registry.getMaterialMetadata('gem_epic');
      expect(metadata.tier).toBe(5);
      expect(metadata.value).toBe(500);
      expect(metadata.tradable).toBe(true);
    });
  });

  describe('addMaterial / consumeMaterial', () => {
    test('should add material count correctly', () => {
      registry.addMaterial('shard_common', 10);
      expect(registry.getMaterialCount('shard_common')).toBe(10);
    });

    test('should accumulate material count on multiple adds', () => {
      registry.addMaterial('shard_common', 5);
      registry.addMaterial('shard_common', 8);
      expect(registry.getMaterialCount('shard_common')).toBe(13);
    });

    test('should consume material count correctly', () => {
      registry.addMaterial('dust_basic', 20);
      const result = registry.consumeMaterial('dust_basic', 5);
      expect(result).toBe(true);
      expect(registry.getMaterialCount('dust_basic')).toBe(15);
    });

    test('should fail when consuming more than available', () => {
      registry.addMaterial('essence_primary', 10);
      const result = registry.consumeMaterial('essence_primary', 15);
      expect(result).toBe(false);
      expect(registry.getMaterialCount('essence_primary')).toBe(10);
    });

    test('should return false when consuming from zero balance', () => {
      const result = registry.consumeMaterial('nonexistent_material', 5);
      expect(result).toBe(false);
    });
  });

  describe('hasMaterial', () => {
    test('should return true when material is sufficient', () => {
      registry.addMaterial('shard_common', 10);
      expect(registry.hasMaterial('shard_common', 5)).toBe(true);
    });

    test('should return false when material is insufficient', () => {
      registry.addMaterial('shard_common', 3);
      expect(registry.hasMaterial('shard_common', 5)).toBe(false);
    });

    test('should return false for nonexistent materials', () => {
      expect(registry.hasMaterial('fake_material', 1)).toBe(false);
    });
  });

  describe('registerRecipe', () => {
    test('should register a valid recipe', () => {
      const recipe = {
        output: { material: 'essence_primary', amount: 1 },
        inputs: [
          { material: 'shard_common', amount: 10 },
          { material: 'dust_basic', amount: 5 }
        ],
        conversionRate: 1.0
      };
      const result = registry.registerRecipe('craft_essence', recipe);
      expect(result).toBe(true);
    });

    test('should store recipe with all components', () => {
      const recipe = {
        output: { material: 'gem_rare', amount: 1 },
        inputs: [
          { material: 'shard_common', amount: 50 },
          { material: 'dust_basic', amount: 20 }
        ],
        conversionRate: 0.8
      };
      registry.registerRecipe('craft_gem', recipe);
      const stored = registry.getRecipe('craft_gem');
      expect(stored.output.material).toBe('gem_rare');
      expect(stored.inputs.length).toBe(2);
      expect(stored.conversionRate).toBe(0.8);
    });

    test('should fail for invalid recipe without output', () => {
      const recipe = {
        inputs: [{ material: 'shard_common', amount: 10 }]
      };
      const result = registry.registerRecipe('invalid_recipe', recipe);
      expect(result).toBe(false);
    });

    test('should fail for invalid recipe without inputs', () => {
      const recipe = {
        output: { material: 'essence_primary', amount: 1 }
      };
      const result = registry.registerRecipe('invalid_recipe2', recipe);
      expect(result).toBe(false);
    });
  });

  describe('getRecipe', () => {
    test('should return recipe by id', () => {
      registry.registerRecipe('test_recipe', {
        output: { material: 'test_output', amount: 1 },
        inputs: [{ material: 'test_input', amount: 5 }]
      });
      const recipe = registry.getRecipe('test_recipe');
      expect(recipe).not.toBeNull();
      expect(recipe.output.material).toBe('test_output');
    });

    test('should return null for nonexistent recipe', () => {
      expect(registry.getRecipe('nonexistent')).toBeNull();
    });
  });

  describe('getRecipes', () => {
    test('should return all registered recipes', () => {
      const initialCount = Object.keys(registry.getRecipes()).length;
      registry.registerRecipe('recipe1', {
        output: { material: 'out1', amount: 1 },
        inputs: [{ material: 'in1', amount: 1 }]
      });
      registry.registerRecipe('recipe2', {
        output: { material: 'out2', amount: 1 },
        inputs: [{ material: 'in2', amount: 1 }]
      });
      const recipes = registry.getRecipes();
      expect(Object.keys(recipes).length).toBe(initialCount + 2);
    });
  });

  describe('getConversionRate', () => {
    test('should return correct conversion rate for material pair', () => {
      registry.setConversionRate('shard_common', 'dust_basic', 0.5);
      expect(registry.getConversionRate('shard_common', 'dust_basic')).toBe(0.5);
    });

    test('should return configured default rate when set', () => {
      // Default rate for shard_common -> dust_basic is 0.5
      expect(registry.getConversionRate('shard_common', 'dust_basic')).toBe(0.5);
    });

    test('should use custom rate for reverse conversion when set', () => {
      registry.setConversionRate('dust_basic', 'shard_common', 2.0);
      expect(registry.getConversionRate('dust_basic', 'shard_common')).toBe(2.0);
    });
  });

  describe('setConversionRate', () => {
    test('should set conversion rate between materials', () => {
      const result = registry.setConversionRate('shard_common', 'essence_primary', 0.1);
      expect(result).toBe(true);
      expect(registry.getConversionRate('shard_common', 'essence_primary')).toBe(0.1);
    });

    test('should update existing conversion rate', () => {
      registry.setConversionRate('material_a', 'material_b', 0.5);
      registry.setConversionRate('material_a', 'material_b', 0.8);
      expect(registry.getConversionRate('material_a', 'material_b')).toBe(0.8);
    });
  });

  describe('calculateOutput', () => {
    test('should calculate correct output for given inputs', () => {
      registry.addMaterial('shard_common', 100);
      const output = registry.calculateOutput('shard_common', 50, 'dust_basic');
      expect(output).toBe(25); // 50 * 0.5 conversion rate
    });

    test('should return 0 when input is zero', () => {
      const output = registry.calculateOutput('shard_common', 0, 'dust_basic');
      expect(output).toBe(0);
    });

    test('should return 0 when input is negative', () => {
      const output = registry.calculateOutput('shard_common', -10, 'dust_basic');
      expect(output).toBe(0);
    });
  });

  describe('getInventory', () => {
    test('should return current inventory state', () => {
      registry.addMaterial('shard_common', 50);
      registry.addMaterial('dust_basic', 30);
      const inv = registry.getInventory();
      expect(inv.shard_common).toBe(50);
      expect(inv.dust_basic).toBe(30);
    });

    test('should return empty object when inventory is empty', () => {
      const inv = registry.getInventory();
      expect(Object.keys(inv).length).toBe(0);
    });
  });

  describe('clearInventory', () => {
    test('should clear all materials from inventory', () => {
      registry.addMaterial('shard_common', 50);
      registry.addMaterial('dust_basic', 30);
      registry.clearInventory();
      expect(registry.getMaterialCount('shard_common')).toBe(0);
      expect(registry.getMaterialCount('dust_basic')).toBe(0);
    });
  });

  describe('getMaterialTypes', () => {
    test('should return array of material types', () => {
      const types = registry.getMaterialTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('getMaterialMetadata', () => {
    test('should return metadata for registered material', () => {
      registry.registerMaterial('special_material', {
        type: 'special',
        tier: 3,
        value: 75
      });
      const meta = registry.getMaterialMetadata('special_material');
      expect(meta.tier).toBe(3);
      expect(meta.value).toBe(75);
    });

    test('should return null for unregistered material', () => {
      expect(registry.getMaterialMetadata('fake')).toBeNull();
    });
  });
});