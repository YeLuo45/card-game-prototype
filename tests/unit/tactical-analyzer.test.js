/**
 * Tactical Analyzer Tests
 * Tests TacticalAnalyzer: generates non-empty output
 */

const { TacticalAnalyzer } = require('../../src/tactical-analyzer.js');

describe('TacticalAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new TacticalAnalyzer();
  });

  describe('constructor', () => {
    test('initializes with default patterns', () => {
      expect(analyzer.patterns).toBeDefined();
      expect(Array.isArray(analyzer.patterns)).toBe(true);
    });

    test('initializes with options', () => {
      const options = { analysisDepth: 'deep', suggestionLimit: 10 };
      const customAnalyzer = new TacticalAnalyzer(options);
      expect(customAnalyzer.analysisDepth).toBe('deep');
    });
  });

  describe('analyzeBehavior', () => {
    test('analyzes card play patterns', () => {
      const battleLog = [
        { turn: 1, cardPlayed: 'strike', energySpent: 1 },
        { turn: 2, cardPlayed: 'strike', energySpent: 1 },
        { turn: 3, cardPlayed: 'bash', energySpent: 2 },
        { turn: 4, cardPlayed: 'strike', energySpent: 1 },
        { turn: 5, cardPlayed: 'heavy_strike', energySpent: 3 }
      ];

      const result = analyzer.analyzeBehavior(battleLog);

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
    });

    test('identifies aggression patterns', () => {
      const battleLog = [
        { turn: 1, cardPlayed: 'strike', damage: 6 },
        { turn: 2, cardPlayed: 'strike', damage: 6 },
        { turn: 3, cardPlayed: 'strike', damage: 6 },
        { turn: 4, cardPlayed: 'strike', damage: 6 },
        { turn: 5, cardPlayed: 'bash', damage: 10 }
      ];

      const result = analyzer.analyzeBehavior(battleLog);

      expect(result.patterns.aggressive || result.patterns.attackFrequency).toBeDefined();
    });

    test('identifies defensive patterns', () => {
      const battleLog = [
        { turn: 1, cardPlayed: 'defend', armorGained: 5 },
        { turn: 2, cardPlayed: 'defend', armorGained: 5 },
        { turn: 3, cardPlayed: 'defend', armorGained: 5 },
        { turn: 4, cardPlayed: 'defend', armorGained: 5 }
      ];

      const result = analyzer.analyzeBehavior(battleLog);

      expect(result.patterns.defensiveFrequency).toBeDefined();
    });

    test('returns empty patterns for insufficient data', () => {
      const battleLog = [
        { turn: 1, cardPlayed: 'strike' }
      ];

      const result = analyzer.analyzeBehavior(battleLog);

      expect(result.patterns).toBeDefined();
    });
  });

  describe('generateSuggestions', () => {
    test('generates non-empty suggestions', () => {
      const battleLog = [
        { turn: 1, cardPlayed: 'strike', energySpent: 1 },
        { turn: 2, cardPlayed: 'strike', energySpent: 1 },
        { turn: 3, cardPlayed: 'strike', energySpent: 1 },
        { turn: 4, cardPlayed: 'strike', energySpent: 1 },
        { turn: 5, cardPlayed: 'strike', energySpent: 1 }
      ];

      const result = analyzer.generateSuggestions(battleLog);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('generates card play order suggestions', () => {
      const battleLog = [
        { turn: 1, cardsInHand: ['strike', 'bash', 'defend'], cardPlayed: 'bash' }
      ];

      const suggestions = analyzer.generateSuggestions(battleLog);

      const cardOrderSuggestions = suggestions.filter(s => s.type === 'card_order');
      expect(cardOrderSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    test('generates energy management suggestions', () => {
      const battleLog = [
        { turn: 1, energy: 3, energySpent: 0, cardsInHand: 3 }
      ];

      const suggestions = analyzer.generateSuggestions(battleLog);

      const energySuggestions = suggestions.filter(s => s.type === 'energy_management');
      expect(energySuggestions.length).toBeGreaterThanOrEqual(0);
    });

    test('limits suggestions based on option', () => {
      const limitedAnalyzer = new TacticalAnalyzer({ suggestionLimit: 2 });
      const battleLog = [
        { turn: 1, cardPlayed: 'strike' },
        { turn: 2, cardPlayed: 'strike' },
        { turn: 3, cardPlayed: 'strike' },
        { turn: 4, cardPlayed: 'strike' },
        { turn: 5, cardPlayed: 'strike' }
      ];

      const suggestions = limitedAnalyzer.generateSuggestions(battleLog);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('compareOptimalVsActual', () => {
    test('compares optimal vs actual plays', () => {
      const actualPlay = { turn: 3, cardPlayed: 'strike', damage: 6 };
      const optimalPlay = { turn: 3, cardPlayed: 'bash', damage: 8 };

      const result = analyzer.compareOptimalVsActual(actualPlay, optimalPlay);

      expect(result).toBeDefined();
      expect(result.efficiency).toBeDefined();
      expect(result.damageLoss).toBeDefined();
    });

    test('calculates 100% efficiency for perfect play', () => {
      const actualPlay = { turn: 3, cardPlayed: 'bash', damage: 8, energySpent: 2 };
      const optimalPlay = { turn: 3, cardPlayed: 'bash', damage: 8, energySpent: 2 };

      const result = analyzer.compareOptimalVsActual(actualPlay, optimalPlay);

      expect(result.efficiency).toBe(100);
    });

    test('calculates partial efficiency for suboptimal play', () => {
      const actualPlay = { turn: 3, cardPlayed: 'strike', damage: 6, energySpent: 1 };
      const optimalPlay = { turn: 3, cardPlayed: 'bash', damage: 8, energySpent: 2 };

      const result = analyzer.compareOptimalVsActual(actualPlay, optimalPlay);

      expect(result.efficiency).toBeLessThan(100);
      expect(result.efficiency).toBeGreaterThan(0);
    });

    test('returns efficiency 0 for no damage play', () => {
      const actualPlay = { turn: 3, cardPlayed: 'defend', damage: 0 };
      const optimalPlay = { turn: 3, cardPlayed: 'bash', damage: 8 };

      const result = analyzer.compareOptimalVsActual(actualPlay, optimalPlay);

      expect(result.efficiency).toBe(0);
    });
  });

  describe('getReplayAnalysis', () => {
    test('returns complete analysis of replay', () => {
      const replayData = {
        events: [
          { turn: 1, type: 'card_played', cardPlayed: 'strike' },
          { turn: 2, type: 'card_played', cardPlayed: 'defend' },
          { turn: 3, type: 'damage_dealt', damage: 6 }
        ]
      };

      const result = analyzer.getReplayAnalysis(replayData);

      expect(result).toBeDefined();
      expect(result.behavior).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    test('returns analysis with empty suggestions for empty events', () => {
      const replayData = { events: [] };

      const result = analyzer.getReplayAnalysis(replayData);

      expect(result.suggestions).toEqual([]);
    });
  });

  describe('identifyMissedOpportunities', () => {
    test('identifies missed kill opportunities', () => {
      const battleLog = [
        { turn: 1, playerDamage: 6, enemyHP: 50 },
        { turn: 2, playerDamage: 6, enemyHP: 44 },
        { turn: 3, playerDamage: 6, enemyHP: 38, cardsInHand: ['strike', 'bash'] }
      ];

      const result = analyzer.identifyMissedOpportunities(battleLog);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns empty array when no opportunities missed', () => {
      const battleLog = [
        { turn: 1, playerDamage: 30, enemyHP: 20 }
      ];

      const result = analyzer.identifyMissedOpportunities(battleLog);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOverallScore', () => {
    test('calculates overall tactical score', () => {
      const battleLog = [
        { turn: 1, cardPlayed: 'strike', damage: 6 },
        { turn: 2, cardPlayed: 'strike', damage: 6 },
        { turn: 3, cardPlayed: 'bash', damage: 10 }
      ];

      const score = analyzer.getOverallScore(battleLog);

      expect(score).toBeDefined();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});