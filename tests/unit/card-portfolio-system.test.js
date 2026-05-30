/**
 * Card Portfolio System Tests
 * V261 - Iteration 6/9
 */

const {
  CardPortfolioSystem,
  PortfolioAnalyzer,
  PortfolioOptimizer,
  PortfolioValidator
} = require('../../src/card-portfolio-system');

describe('PortfolioValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new PortfolioValidator();
  });

  describe('validate', () => {
    test('returns true for valid card', () => {
      const card = { id: 'card1', name: 'Test Card' };
      expect(validator.validate(card)).toBe(true);
    });

    test('returns false for null', () => {
      expect(validator.validate(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(validator.validate(undefined)).toBe(false);
    });

    test('returns false for non-object', () => {
      expect(validator.validate('string')).toBe(false);
      expect(validator.validate(123)).toBe(false);
    });

    test('returns false for card without id', () => {
      const card = { name: 'Test Card' };
      expect(validator.validate(card)).toBe(false);
    });

    test('returns false for card without name', () => {
      const card = { id: 'card1' };
      expect(validator.validate(card)).toBe(false);
    });
  });

  describe('validateDeck', () => {
    test('returns true for valid deck', () => {
      const deck = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' }
      ];
      expect(validator.validateDeck(deck)).toBe(true);
    });

    test('returns false for empty array', () => {
      expect(validator.validateDeck([])).toBe(false);
    });

    test('returns false for non-array', () => {
      expect(validator.validateDeck({})).toBe(false);
      expect(validator.validateDeck('deck')).toBe(false);
    });

    test('returns false if any card is invalid', () => {
      const deck = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2' }
      ];
      expect(validator.validateDeck(deck)).toBe(false);
    });
  });
});

describe('PortfolioAnalyzer', () => {
  let analyzer;
  const sampleDeck = [
    { id: 'c1', name: 'C1', cost: 2, power: 3, type: 'creature' },
    { id: 'c2', name: 'C2', cost: 3, power: 4, type: 'creature' },
    { id: 'c3', name: 'C3', cost: 4, power: 5, type: 'creature' },
    { id: 's1', name: 'S1', cost: 1, power: 0, type: 'spell' }
  ];

  beforeEach(() => {
    analyzer = new PortfolioAnalyzer();
  });

  describe('analyze', () => {
    test('returns valid result for valid deck', () => {
      const result = analyzer.analyze(sampleDeck);
      expect(result.valid).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.diversity).toBeDefined();
      expect(result.curve).toBeDefined();
    });

    test('calculates correct metrics', () => {
      const result = analyzer.analyze(sampleDeck);
      expect(result.metrics.totalCards).toBe(4);
      expect(result.metrics.avgCost).toBe(2.5);
      expect(result.metrics.avgPower).toBe(3);
    });

    test('returns invalid for bad deck', () => {
      const result = analyzer.analyze([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculateAvgCost', () => {
    test('calculates average correctly', () => {
      expect(analyzer.calculateAvgCost(sampleDeck)).toBe(2.5);
    });

    test('returns 0 for empty deck', () => {
      expect(analyzer.calculateAvgCost([])).toBe(0);
    });
  });

  describe('calculateAvgPower', () => {
    test('calculates average correctly', () => {
      expect(analyzer.calculateAvgPower(sampleDeck)).toBe(3);
    });
  });

  describe('calculateDiversity', () => {
    test('counts unique types', () => {
      expect(analyzer.calculateDiversity(sampleDeck)).toBe(2);
    });

    test('returns 0 for empty deck', () => {
      expect(analyzer.calculateDiversity([])).toBe(0);
    });
  });

  describe('analyzeManaCurve', () => {
    test('distributes cards into correct buckets', () => {
      const curve = analyzer.analyzeManaCurve(sampleDeck);
      expect(curve[1]).toBe(1);
      expect(curve[2]).toBe(1);
      expect(curve[3]).toBe(1);
      expect(curve[4]).toBe(1);
      expect(curve['6+']).toBe(0);
    });
  });
});

describe('PortfolioOptimizer', () => {
  let optimizer;
  const sampleDeck = [
    { id: 'c1', name: 'C1', cost: 2, power: 3, type: 'creature' },
    { id: 'c2', name: 'C2', cost: 3, power: 4, type: 'creature' }
  ];
  const cardPool = [
    { id: 'c3', name: 'C3', cost: 4, power: 5, type: 'creature' },
    { id: 's1', name: 'S1', cost: 1, power: 0, type: 'spell' },
    { id: 'a1', name: 'A1', cost: 5, power: 0, type: 'artifact' }
  ];

  beforeEach(() => {
    const analyzer = new PortfolioAnalyzer();
    optimizer = new PortfolioOptimizer(analyzer);
  });

  describe('suggest', () => {
    test('returns suggestions for valid deck', () => {
      const result = optimizer.suggest(cardPool, sampleDeck, 'midrange');
      expect(result.suggestions).toBeDefined();
      expect(result.strategy).toBe('midrange');
    });

    test('defaults to midrange for invalid strategy', () => {
      const result = optimizer.suggest(cardPool, sampleDeck, 'invalid');
      expect(result.strategy).toBe('midrange');
    });

    test('returns empty suggestions for invalid deck', () => {
      const result = optimizer.suggest(cardPool, [], 'midrange');
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('findMissingPieces', () => {
    test('finds cards matching strategy needs', () => {
      const suggestions = optimizer.findMissingPieces(cardPool, sampleDeck, 'aggro');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('getStrategyNeeds', () => {
    test('returns correct needs for aggro', () => {
      const needs = optimizer.getStrategyNeeds('aggro');
      expect(needs).toContain('creature');
      expect(needs).toContain('spell');
    });

    test('returns correct needs for control', () => {
      const needs = optimizer.getStrategyNeeds('control');
      expect(needs).toContain('spell');
      expect(needs).toContain('artifact');
    });

    test('returns correct needs for midrange', () => {
      const needs = optimizer.getStrategyNeeds('midrange');
      expect(needs).toContain('creature');
      expect(needs).toContain('spell');
      expect(needs).toContain('artifact');
    });
  });
});

describe('CardPortfolioSystem', () => {
  let system;
  const sampleDeck = [
    { id: 'c1', name: 'C1', cost: 2, power: 3, type: 'creature' },
    { id: 'c2', name: 'C2', cost: 3, power: 4, type: 'creature' }
  ];
  const cardPool = [
    { id: 'c3', name: 'C3', cost: 4, power: 5, type: 'creature' },
    { id: 's1', name: 'S1', cost: 1, power: 0, type: 'spell' }
  ];

  beforeEach(() => {
    system = new CardPortfolioSystem();
  });

  describe('analyzeDeck', () => {
    test('analyzes and stores in history', () => {
      const result = system.analyzeDeck(sampleDeck);
      expect(result.valid).toBe(true);
      expect(system.getHistory()).toHaveLength(1);
    });
  });

  describe('suggestImprovements', () => {
    test('returns suggestions', () => {
      const result = system.suggestImprovements(cardPool, sampleDeck, 'midrange');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('getHistory', () => {
    test('returns history array', () => {
      expect(Array.isArray(system.getHistory())).toBe(true);
    });

    test('stores analysis results with timestamp', () => {
      system.analyzeDeck(sampleDeck);
      const history = system.getHistory();
      expect(history[0].result).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    });
  });
});
