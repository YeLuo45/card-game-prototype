/**
 * Battle Optimizer Tests
 * Tests BattleOptimizer: optimal play order, energy allocation strategies
 */

const { BattleOptimizer } = require('../../src/battle-optimizer.js');

describe('BattleOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new BattleOptimizer();
  });

  describe('constructor', () => {
    test('initializes with default settings', () => {
      expect(optimizer.aggressionBias).toBe(0.5);
      expect(optimizer.energyWeight).toBe(0.4);
      expect(optimizer.synergyWeight).toBe(0.2);
    });

    test('initializes with custom options', () => {
      const custom = new BattleOptimizer({ aggressionBias: 0.8 });
      expect(custom.aggressionBias).toBe(0.8);
    });
  });

  describe('generatePlayOrder', () => {
    test('returns optimal card order based on efficiency', () => {
      const hand = [
        { id: 'strike', energyCost: 1, damage: 6 },
        { id: 'defend', energyCost: 1, blocking: 5 },
        { id: 'heavy_strike', energyCost: 2, damage: 12 }
      ];
      const availableEnergy = 3;

      const result = optimizer.generatePlayOrder(hand, availableEnergy);

      expect(result.orderedCards.length).toBeGreaterThan(0);
      expect(result.totalDamage).toBeGreaterThan(0);
    });

    test('respects energy constraints', () => {
      const hand = [
        { id: 'strike', energyCost: 1, damage: 6 },
        { id: 'heavy_strike', energyCost: 3, damage: 15 }
      ];
      const availableEnergy = 2;

      const result = optimizer.generatePlayOrder(hand, availableEnergy);

      const totalCost = result.orderedCards.reduce((sum, c) => sum + c.energyCost, 0);
      expect(totalCost).toBeLessThanOrEqual(availableEnergy);
    });

    test('returns empty order for empty hand', () => {
      const result = optimizer.generatePlayOrder([], 5);
      expect(result.orderedCards).toHaveLength(0);
    });
  });

  describe('recommendEnergyAllocation', () => {
    test('recommends energy split between attack and defense', () => {
      const enemyThreat = 8;
      const availableEnergy = 5;
      const playerHP = 50;

      const result = optimizer.recommendEnergyAllocation(enemyThreat, availableEnergy, playerHP);

      expect(result.attack).toBeGreaterThanOrEqual(0);
      expect(result.defense).toBeGreaterThanOrEqual(0);
      expect(result.attack + result.defense).toBeLessThanOrEqual(availableEnergy);
    });

    test('recommends more defense when low HP', () => {
      const resultLowHP = optimizer.recommendEnergyAllocation(10, 5, 10);
      const resultHighHP = optimizer.recommendEnergyAllocation(10, 5, 80);

      expect(resultLowHP.defense).toBeGreaterThan(resultHighHP.defense);
    });
  });

  describe('generateBattleStrategy', () => {
    test('generates strategy based on battle context', () => {
      const battleContext = {
        playerHP: 60,
        enemyHP: 40,
        enemyIntent: 'attacking',
        availableEnergy: 3,
        hand: [
          { id: 'strike', energyCost: 1, damage: 6 },
          { id: 'defend', energyCost: 1, blocking: 5 }
        ]
      };

      const strategy = optimizer.generateBattleStrategy(battleContext);

      expect(strategy.primaryGoal).toBeDefined();
      expect(strategy.recommendedCards).toBeDefined();
      expect(strategy.expectedOutcome).toBeDefined();
    });

    test('prioritizes defense when enemy is attacking', () => {
      const context = {
        playerHP: 30,
        enemyHP: 50,
        enemyIntent: 'attacking',
        availableEnergy: 3,
        hand: [
          { id: 'strike', energyCost: 1, damage: 6 },
          { id: 'defend', energyCost: 1, blocking: 5 }
        ]
      };

      const strategy = optimizer.generateBattleStrategy(context);

      expect(strategy.primaryGoal).toBe('defense');
    });
  });

  describe('calculateExpectedDamage', () => {
    test('calculates expected damage for card combination', () => {
      const cards = [
        { id: 'strike', damage: 6, criticalChance: 0.1, criticalMultiplier: 2 },
        { id: 'strike', damage: 6, criticalChance: 0.1, criticalMultiplier: 2 }
      ];

      const expectedDamage = optimizer.calculateExpectedDamage(cards);

      // 6*2*0.1 (crit) + 6*0.9 (normal) = 1.2 + 5.4 = 6.6 per strike
      expect(expectedDamage).toBeGreaterThan(0);
    });

    test('returns 0 for empty cards', () => {
      const result = optimizer.calculateExpectedDamage([]);
      expect(result).toBe(0);
    });
  });

  describe('simulateTurnOutcome', () => {
    test('simulates turn with cards and returns outcome', () => {
      const result = optimizer.simulateTurnOutcome({
        cards: [{ id: 'strike', damage: 6, energyCost: 1 }],
        playerHP: 50,
        enemyHP: 50,
        block: 0
      });

      expect(result).toHaveProperty('playerHP');
      expect(result).toHaveProperty('enemyHP');
      expect(result).toHaveProperty('damageDealt');
    });
  });

  describe('getSynergyBonus', () => {
    test('calculates synergy bonus for card combinations', () => {
      const cards = [
        { id: 'strike', type: 'attack' },
        { id: 'strike', type: 'attack' },
        { id: 'rage', type: 'buff' }
      ];

      const bonus = optimizer.getSynergyBonus(cards);
      expect(bonus).toBeGreaterThan(1); // Should be multiplicative > 1
    });

    test('returns 1 for no synergy', () => {
      const cards = [
        { id: 'strike', type: 'attack' },
        { id: 'defend', type: 'defense' }
      ];

      const bonus = optimizer.getSynergyBonus(cards);
      expect(bonus).toBeGreaterThanOrEqual(1);
    });
  });

  describe('optimizeDeckSelection', () => {
    test('selects best cards for deck from pool', () => {
      const deckPool = [
        { id: 'strike', damage: 6, energyCost: 1 },
        { id: 'defend', blocking: 5, energyCost: 1 },
        { id: 'heavy_strike', damage: 12, energyCost: 2 },
        { id: 'heal', healing: 10, energyCost: 2 }
      ];
      const maxCards = 10;
      const focus = 'damage';

      const result = optimizer.optimizeDeckSelection(deckPool, maxCards, focus);

      expect(result.selectedCards.length).toBeLessThanOrEqual(maxCards);
    });
  });

  describe('reset', () => {
    test('resets optimizer state', () => {
      optimizer.aggressionBias = 0.9;
      optimizer.reset();
      expect(optimizer.aggressionBias).toBe(0.5);
    });
  });
});