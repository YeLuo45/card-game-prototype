/**
 * Efficiency Analyzer Tests
 * Tests EfficiencyAnalyzer: energy waste detection, historical comparison
 */

const { EfficiencyAnalyzer } = require('../../src/efficiency-analyzer.js');

describe('EfficiencyAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new EfficiencyAnalyzer();
  });

  describe('constructor', () => {
    test('initializes with default settings', () => {
      expect(analyzer.wasteThreshold).toBe(0.2);
      expect(analyzer.historySize).toBe(50);
    });

    test('initializes with custom options', () => {
      const custom = new EfficiencyAnalyzer({ wasteThreshold: 0.3, historySize: 100 });
      expect(custom.wasteThreshold).toBe(0.3);
      expect(custom.historySize).toBe(100);
    });
  });

  describe('analyzeEnergyWaste', () => {
    test('detects wasted energy', () => {
      const result = analyzer.analyzeEnergyWaste(3, 5);
      expect(result.wasted).toBe(2);
      expect(result.utilization).toBe(0.6);
    });

    test('detects no waste when energy fully used', () => {
      const result = analyzer.analyzeEnergyWaste(5, 5);
      expect(result.wasted).toBe(0);
      expect(result.utilization).toBe(1);
    });

    test('identifies waste threshold breach', () => {
      const result = analyzer.analyzeEnergyWaste(1, 5);
      expect(result.wasted).toBe(4);
      expect(result.overWasteThreshold).toBe(true);
    });
  });

  describe('analyzeUnusedAbilities', () => {
    test('identifies unused abilities from battle log', () => {
      const battleLog = {
        events: [
          { type: 'card_played', cardId: 'strike' },
          { type: 'card_played', cardId: 'defend' }
        ]
      };
      const availableAbilities = ['strike', 'defend', 'bash', 'heal'];
      
      const result = analyzer.analyzeUnusedAbilities(battleLog, availableAbilities);
      
      expect(result.unused).toContain('bash');
      expect(result.unused).toContain('heal');
      expect(result.unused).not.toContain('strike');
    });

    test('returns empty when all abilities used', () => {
      const battleLog = {
        events: [
          { type: 'card_played', cardId: 'strike' },
          { type: 'card_played', cardId: 'defend' }
        ]
      };
      const availableAbilities = ['strike', 'defend'];
      
      const result = analyzer.analyzeUnusedAbilities(battleLog, availableAbilities);
      
      expect(result.unused).toHaveLength(0);
    });
  });

  describe('compareToHistory', () => {
    test('compares current performance to historical average', () => {
      analyzer.addToHistory({ damage: 100, energy: 10, victory: true });
      analyzer.addToHistory({ damage: 80, energy: 8, victory: true });
      
      const comparison = analyzer.compareToHistory({ damage: 120, energy: 10 });
      
      expect(comparison.damageDelta).toBe(30); // 120 - avg(90)
      expect(comparison.performanceLevel).toBe('above_average');
    });

    test('returns below_average when performance drops', () => {
      analyzer.addToHistory({ damage: 100, energy: 10, victory: true });
      analyzer.addToHistory({ damage: 100, energy: 10, victory: true });
      
      const comparison = analyzer.compareToHistory({ damage: 50, energy: 10 });
      
      expect(comparison.damageDelta).toBe(-50);
      expect(comparison.performanceLevel).toBe('below_average');
    });

    test('returns insufficient_data for new analyzer', () => {
      const comparison = analyzer.compareToHistory({ damage: 100, energy: 10 });
      
      expect(comparison.performanceLevel).toBe('insufficient_data');
    });
  });

  describe('identifyInefficiencies', () => {
    test('identifies high energy cost with low damage cards', () => {
      const cardPerformance = {
        'strike': { damage: 6, energyCost: 1 },
        'inefficient_attack': { damage: 5, energyCost: 3 },
        'block': { damage: 0, energyCost: 1, blocking: 5 }
      };
      
      const result = analyzer.identifyInefficiencies(cardPerformance);
      
      expect(result.inefficientCards).toContain('inefficient_attack');
      expect(result.inefficientCards).not.toContain('strike');
      expect(result.inefficientCards).not.toContain('block');
    });

    test('returns recommendations', () => {
      const cardPerformance = {
        'waste': { damage: 3, energyCost: 3 }
      };
      
      const result = analyzer.identifyInefficiencies(cardPerformance);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('addToHistory', () => {
    test('adds battle to history', () => {
      analyzer.addToHistory({ damage: 100, energy: 10, victory: true });
      expect(analyzer.history.length).toBe(1);
    });

    test('enforces history size limit', () => {
      const smallHistory = new EfficiencyAnalyzer({ historySize: 3 });
      smallHistory.addToHistory({ damage: 100 });
      smallHistory.addToHistory({ damage: 100 });
      smallHistory.addToHistory({ damage: 100 });
      smallHistory.addToHistory({ damage: 100 });
      
      expect(smallHistory.history.length).toBe(3);
    });
  });

  describe('calculateEfficiencyScore', () => {
    test('calculates score based on damage per energy', () => {
      const score = analyzer.calculateEfficiencyScore(50, 10);
      expect(score).toBe(5);
    });

    test('returns 0 for zero energy', () => {
      const score = analyzer.calculateEfficiencyScore(50, 0);
      expect(score).toBe(0);
    });
  });

  describe('reset', () => {
    test('clears history', () => {
      analyzer.addToHistory({ damage: 100 });
      analyzer.reset();
      expect(analyzer.history.length).toBe(0);
    });
  });
});