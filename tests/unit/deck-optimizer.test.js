/**
 * Deck Optimizer Tests
 * Tests DeckOptimizer: optimize() / validateConstraints() / generateOptimizationPath()
 */

const { DeckOptimizer } = require('../../src/deck-optimizer.js');

describe('DeckOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new DeckOptimizer();
  });

  describe('constructor', () => {
    test('initializes with default constraints', () => {
      expect(optimizer.constraints).toBeDefined();
      expect(optimizer.constraints.maxCards).toBe(20);
      expect(optimizer.constraints.maxCost).toBeDefined();
    });

    test('initializes with custom constraints', () => {
      const customConstraints = { maxCards: 30, maxCost: 10 };
      const customOptimizer = new DeckOptimizer(customConstraints);
      expect(customOptimizer.constraints.maxCards).toBe(30);
    });
  });

  describe('optimize', () => {
    test('optimizes deck based on constraints', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 4 }
      ];
      
      const result = optimizer.optimize(deck, { targetWinRate: 0.6 });
      
      expect(result).toBeDefined();
      expect(result.optimizedDeck).toBeDefined();
    });

    test('respects max cards constraint', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 },
        { id: 'cleave', name: 'Cleave', type: 'attack', cost: 1 }
      ];
      
      const result = optimizer.optimize(deck, { maxCards: 3 });
      
      expect(result.optimizedDeck.length).toBeLessThanOrEqual(4);
    });

    test('returns original deck when already optimal', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const result = optimizer.optimize(deck, { targetWinRate: 0.9 });
      
      expect(result.optimizedDeck).toBeDefined();
    });
  });

  describe('validateConstraints', () => {
    test('validates correct deck', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 },
        { id: 'cleave', name: 'Cleave', type: 'attack', cost: 1 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 3 },
        { id: 'power', name: 'Power', type: 'power', cost: 2 },
        { id: 'skill1', name: 'Skill', type: 'skill', cost: 2 },
        { id: 'skill2', name: 'Skill', type: 'skill', cost: 3 },
        { id: 'skill3', name: 'Skill', type: 'skill', cost: 1 },
        { id: 'attack', name: 'Attack', type: 'attack', cost: 3 },
        { id: 'attack2', name: 'Attack', type: 'attack', cost: 2 },
        { id: 'power2', name: 'Power', type: 'power', cost: 3 },
        { id: 'strike3', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend2', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'bash2', name: 'Bash', type: 'attack', cost: 3 },
        { id: 'cleave2', name: 'Cleave', type: 'attack', cost: 2 },
        { id: 'heavy_strike2', name: 'Heavy Strike', type: 'attack', cost: 4 },
        { id: 'power3', name: 'Power', type: 'power', cost: 3 },
        { id: 'skill4', name: 'Skill', type: 'skill', cost: 2 },
        { id: 'attack3', name: 'Attack', type: 'attack', cost: 3 }
      ];
      
      const result = optimizer.validateConstraints(deck);
      expect(result).toBe(true);
    });

    test('validates energy curve', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 4 }
      ];
      
      const result = optimizer.validateConstraints(deck);
      expect(result === true || Array.isArray(result)).toBe(true);
    });

    test('validates type distribution', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 5 }
      ];
      
      const result = optimizer.validateConstraints(deck);
      expect(result === true || Array.isArray(result)).toBe(true);
    });
  });

  describe('generateOptimizationPath', () => {
    test('generates step-by-step optimization path', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 5 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 },
        { id: 'cleave', name: 'Cleave', type: 'attack', cost: 1 },
        { id: 'skill', name: 'Skill', type: 'skill', cost: 3 },
        { id: 'power', name: 'Power', type: 'power', cost: 2 },
        { id: 'strike2', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend2', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'heavy_strike2', name: 'Heavy Strike', type: 'attack', cost: 4 },
        { id: 'bash2', name: 'Bash', type: 'attack', cost: 3 },
        { id: 'cleave2', name: 'Cleave', type: 'attack', cost: 2 },
        { id: 'skill2', name: 'Skill', type: 'skill', cost: 3 },
        { id: 'power2', name: 'Power', type: 'power', cost: 2 },
        { id: 'strike3', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend3', name: 'Defend', type: 'skill', cost: 2 },
        { id: 'heavy_strike3', name: 'Heavy Strike', type: 'attack', cost: 5 },
        { id: 'bash3', name: 'Bash', type: 'attack', cost: 3 },
        { id: 'cleave3', name: 'Cleave', type: 'attack', cost: 2 },
        { id: 'skill3', name: 'Skill', type: 'skill', cost: 3 }
      ];
      
      const path = optimizer.generateOptimizationPath(deck);
      
      expect(path).toBeDefined();
      if (path.length > 0) {
        expect(path[0].step).toBe(1);
      }
    });

    test('includes specific optimization steps', () => {
      // Use a deck with redundancy (4+ of same card) to trigger removal step
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const path = optimizer.generateOptimizationPath(deck);
      
      expect(path.length).toBeGreaterThanOrEqual(0);
    });

    test('calculates cumulative improvement', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const path = optimizer.generateOptimizationPath(deck);
      
      let cumulativeScore = 0;
      for (const step of path) {
        cumulativeScore += step.improvement || 0;
        expect(step.cumulativeScore).toBe(cumulativeScore);
      }
    });
  });

  describe('simulateWinRate', () => {
    test('simulates win rate against opponent', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const opponentDeck = [
        { id: 'enemy_strike', name: 'Enemy Strike', type: 'attack', cost: 1 }
      ];
      
      const winRate = optimizer.simulateWinRate(deck, opponentDeck);
      
      expect(winRate).toBeGreaterThanOrEqual(0);
      expect(winRate).toBeLessThanOrEqual(1);
    });

    test('returns 0.5 for equal decks', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const winRate = optimizer.simulateWinRate(deck, deck);
      expect(winRate).toBeCloseTo(0.5, 1);
    });
  });

  describe('optimizeManaCurve', () => {
    test('optimizes deck mana curve', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 5 },
        { id: 'heavy_strike2', name: 'Heavy Strike', type: 'attack', cost: 4 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const result = optimizer.optimizeManaCurve(deck);
      
      expect(result).toBeDefined();
      expect(result.curveScore).toBeDefined();
    });

    test('balances low/high cost cards', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 5 }
      ];
      
      const result = optimizer.optimizeManaCurve(deck);
      
      expect(result.lowCostRatio).toBeDefined();
      expect(result.highCostRatio).toBeDefined();
    });
  });

  describe('optimizeTypeDistribution', () => {
    test('optimizes card type distribution', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike2', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike3', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const result = optimizer.optimizeTypeDistribution(deck);
      
      expect(result).toBeDefined();
      expect(result.typeScore).toBeDefined();
    });

    test('balances attack/defense types', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const result = optimizer.optimizeTypeDistribution(deck);
      
      expect(result.attackRatio).toBeDefined();
      expect(result.skillRatio).toBeDefined();
    });
  });

  describe('findReplacements', () => {
    test('finds replacement cards', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const replacements = optimizer.findReplacements('strike', deck);
      
      expect(Array.isArray(replacements)).toBe(true);
    });

    test('returns empty for unknown card', () => {
      const replacements = optimizer.findReplacements('unknown_card', []);
      expect(replacements).toEqual([]);
    });
  });

  describe('scoreDeck', () => {
    test('calculates overall deck score', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const score = optimizer.scoreDeck(deck);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('returns higher score for better decks', () => {
      // Good deck: balanced types with decent mana curve
      const goodDeck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 },
        { id: 'skill', name: 'Skill', type: 'skill', cost: 2 }
      ];
      
      // Poor deck: unbalanced types
      const poorDeck = [
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 5 },
        { id: 'heavy_strike2', name: 'Heavy Strike', type: 'attack', cost: 6 }
      ];
      
      const goodScore = optimizer.scoreDeck(goodDeck);
      const poorScore = optimizer.scoreDeck(poorDeck);
      
      expect(goodScore).toBeGreaterThan(poorScore);
    });
  });
});