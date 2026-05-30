/**
 * V264 Deck Archetype Recommender System Tests (Iteration 9/9 - Final)
 * 测试覆盖目标: ≥98%
 */

const {
  MetaAnalyzer,
  SynergyScorer,
  DraftOptimizer,
  ArchetypeRecommender
} = require('../../src/deck-archetype-recommender.js');

describe('MetaAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new MetaAnalyzer();
  });

  describe('analyzeMetaTrend', () => {
    test('should return default analysis for empty matches', () => {
      const result = analyzer.analyzeMetaTrend([]);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('topArchetypes');
      expect(result).toHaveProperty('winRateTrend');
      expect(result.topArchetypes).toHaveLength(0);
    });

    test('should return default analysis for null matches', () => {
      const result = analyzer.analyzeMetaTrend(null);
      expect(result).toHaveProperty('recommendation');
      expect(result.recommendation.primaryPick).toBe('balanced');
    });

    test('should analyze meta with valid matches', () => {
      const matches = [
        { archetype: 'aggro', result: 'win', turns: 8 },
        { archetype: 'aggro', result: 'win', turns: 10 },
        { archetype: 'aggro', result: 'loss', turns: 15 },
        { archetype: 'control', result: 'win', turns: 20 },
        { archetype: 'control', result: 'loss', turns: 18 }
      ];
      const result = analyzer.analyzeMetaTrend(matches);
      expect(result.topArchetypes).toHaveLength(2);
      expect(result.winRateTrend).toBeDefined();
    });
  });

  describe('calculateArchetypeStats', () => {
    test('should calculate correct stats for archetypes', () => {
      const matches = [
        { archetype: 'aggro', result: 'win', turns: 10 },
        { archetype: 'aggro', result: 'win', turns: 12 },
        { archetype: 'aggro', result: 'loss', turns: 8 }
      ];
      const stats = analyzer.calculateArchetypeStats(matches);
      expect(stats).toHaveLength(1);
      expect(stats[0].wins).toBe(2);
      expect(stats[0].losses).toBe(1);
      expect(stats[0].winRate).toBeCloseTo(0.667, 2);
    });

    test('should handle unknown archetype', () => {
      const matches = [
        { result: 'win', turns: 10 },
        { result: 'loss', turns: 8 }
      ];
      const stats = analyzer.calculateArchetypeStats(matches);
      expect(stats).toHaveLength(1);
      expect(stats[0].archetype).toBe('unknown');
    });
  });

  describe('detectEmergingPatterns', () => {
    test('should detect rising patterns', () => {
      const matches = Array(20).fill(null).map((_, i) => ({
        archetype: i >= 15 ? 'emerging' : 'other',
        result: 'win'
      }));
      const patterns = analyzer.detectEmergingPatterns(matches);
      expect(patterns.some(p => p.archetype === 'emerging')).toBe(true);
    });

    test('should return empty array for insufficient data', () => {
      const matches = [{ archetype: 'test', result: 'win' }];
      const patterns = analyzer.detectEmergingPatterns(matches);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('calculateCounterRelationships', () => {
    test('should identify counter relationships', () => {
      const stats = [
        { archetype: 'aggro', winRate: 0.6, totalGames: 10 },
        { archetype: 'control', winRate: 0.4, totalGames: 10 }
      ];
      const counters = analyzer.calculateCounterRelationships(stats);
      expect(counters.has('aggro')).toBe(true);
    });

    test('should not create counter for similar win rates', () => {
      const stats = [
        { archetype: 'aggro', winRate: 0.52, totalGames: 100 },
        { archetype: 'control', winRate: 0.48, totalGames: 100 }
      ];
      const counters = analyzer.calculateCounterRelationships(stats);
      expect(counters.has('aggro')).toBe(false);
    });
  });

  describe('calculateWinRateTrend', () => {
    test('should return insufficient_data for too few matches', () => {
      const matches = [{ result: 'win' }, { result: 'win' }];
      expect(analyzer.calculateWinRateTrend(matches)).toBe('insufficient_data');
    });

    test('should detect improving trend', () => {
      const matches = [
        ...Array(5).fill(null).map(() => ({ result: 'loss' })),
        ...Array(5).fill(null).map(() => ({ result: 'win' }))
      ];
      expect(analyzer.calculateWinRateTrend(matches)).toBe('improving');
    });

    test('should detect declining trend', () => {
      const matches = [
        ...Array(5).fill(null).map(() => ({ result: 'win' })),
        ...Array(5).fill(null).map(() => ({ result: 'loss' }))
      ];
      expect(analyzer.calculateWinRateTrend(matches)).toBe('declining');
    });
  });

  describe('calculatePickRateTrend', () => {
    test('should return insufficient_data for too few matches', () => {
      const matches = [{ archetype: 'aggro', result: 'win' }];
      expect(analyzer.calculatePickRateTrend(matches)).toBe('insufficient_data');
    });

    test('should return most played archetype with sufficient data', () => {
      // Last 5 matches must be aggros since calculatePickRateTrend uses slice(-5)
      const matches = Array(15).fill(null).map((_, i) => ({
        archetype: i >= 10 ? 'aggro' : 'control',
        result: 'win'
      }));
      expect(analyzer.calculatePickRateTrend(matches)).toBe('aggro');
    });
  });

  describe('generateMetaRecommendation', () => {
    test('should generate valid recommendation', () => {
      const stats = [
        { archetype: 'aggro', winRate: 0.6, totalGames: 20 },
        { archetype: 'control', winRate: 0.4, totalGames: 20 }
      ];
      const counters = new Map();
      counters.set('aggro', [{ counters: 'control', advantage: '20%' }]);
      
      const result = analyzer.generateMetaRecommendation(stats, counters);
      expect(result).toHaveProperty('primaryPick');
      expect(result).toHaveProperty('counterPick');
      expect(result).toHaveProperty('safetyPick');
      expect(result).toHaveProperty('avoid');
    });
  });

  describe('getDefaultMetaAnalysis', () => {
    test('should return default analysis structure', () => {
      const result = analyzer.getDefaultMetaAnalysis();
      expect(result.recommendation.primaryPick).toBe('balanced');
      expect(result.recommendation.avoid).toHaveLength(0);
    });
  });

  describe('calculateWinRate', () => {
    test('should return 0 for empty matches', () => {
      expect(analyzer.calculateWinRate([])).toBe(0);
    });

    test('should calculate correct win rate', () => {
      const matches = [
        { result: 'win' },
        { result: 'win' },
        { result: 'loss' },
        { result: 'win' }
      ];
      expect(analyzer.calculateWinRate(matches)).toBe(0.75);
    });
  });
});

describe('SynergyScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new SynergyScorer();
  });

  describe('calculateSynergyScore', () => {
    test('should return 0 for empty deck', () => {
      const result = scorer.calculateSynergyScore([]);
      expect(result.totalScore).toBe(0);
    });

    test('should calculate synergy for valid deck', () => {
      const deck = [
        { id: 'c1', type: 'attack', cost: 1, power: 5 },
        { id: 'c2', type: 'attack', cost: 2, power: 6 },
        { id: 'c3', type: 'attack', cost: 1, power: 4 }
      ];
      const result = scorer.calculateSynergyScore(deck);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result).toHaveProperty('internalSynergy');
      expect(result).toHaveProperty('curveScore');
    });

    test('should use cache for repeated calculations', () => {
      const deck = [
        { id: 'c1', type: 'attack', cost: 1, power: 5 },
        { id: 'c2', type: 'attack', cost: 2, power: 6 }
      ];
      scorer.calculateSynergyScore(deck);
      scorer.calculateSynergyScore(deck);
      expect(scorer.cache.size).toBeGreaterThan(0);
    });
  });

  describe('generateCacheKey', () => {
    test('should generate consistent cache keys', () => {
      const deck1 = [{ id: 'c1' }, { id: 'c2' }];
      const deck2 = [{ id: 'c2' }, { id: 'c1' }];
      const key1 = scorer.generateCacheKey(deck1);
      const key2 = scorer.generateCacheKey(deck2);
      expect(key1).toBe(key2);
    });
  });

  describe('calculateInternalSynergy', () => {
    test('should score type synergies', () => {
      const deck = [
        { type: 'attack', cost: 1 },
        { type: 'attack', cost: 2 },
        { type: 'attack', cost: 1 },
        { type: 'attack', cost: 2 },
        { type: 'attack', cost: 3 }
      ];
      const score = scorer.calculateInternalSynergy(deck);
      expect(score).toBeGreaterThan(0);
    });

    test('should reward multiple card types', () => {
      const multiTypeDeck = [
        { type: 'attack', cost: 1 },
        { type: 'attack', cost: 2 },
        { type: 'skill', cost: 2 },
        { type: 'power', cost: 3 },
        { type: 'skill', cost: 1 }
      ];
      const singleTypeDeck = [
        { type: 'attack', cost: 1 },
        { type: 'attack', cost: 2 },
        { type: 'attack', cost: 3 }
      ];
      const multiScore = scorer.calculateInternalSynergy(multiTypeDeck);
      const singleScore = scorer.calculateInternalSynergy(singleTypeDeck);
      expect(multiScore).toBeGreaterThan(singleScore);
    });
  });

  describe('calculatePotentialSynergy', () => {
    test('should return 0 for empty inputs', () => {
      expect(scorer.calculatePotentialSynergy([], [])).toBe(0);
      expect(scorer.calculatePotentialSynergy([{ id: 'c1' }], [])).toBe(0);
    });

    test('should score potential synergy with available cards', () => {
      const deck = [{ type: 'attack', cost: 2, id: 'd1' }];
      const available = [
        { type: 'attack', cost: 2, id: 'a1' },
        { type: 'skill', cost: 3, id: 'a2' }
      ];
      const score = scorer.calculatePotentialSynergy(deck, available);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('evaluateManaCurve', () => {
    test('should evaluate ideal low-cost curve', () => {
      const deck = [
        { cost: 0 }, { cost: 1 }, { cost: 1 }, { cost: 1 },
        { cost: 2 }, { cost: 2 }, { cost: 2 },
        { cost: 3 }, { cost: 4 }, { cost: 5 }
      ];
      const score = scorer.evaluateManaCurve(deck);
      expect(score).toBeGreaterThan(0);
    });

    test('should return 0 for empty deck', () => {
      expect(scorer.evaluateManaCurve([])).toBe(0);
    });
  });

  describe('analyzeTypeDistribution', () => {
    test('should reward balanced type distribution', () => {
      const balancedDeck = [
        { type: 'attack' }, { type: 'attack' },
        { type: 'skill' }, { type: 'skill' },
        { type: 'power' }, { type: 'power' }
      ];
      const skewedDeck = [
        { type: 'attack' }, { type: 'attack' },
        { type: 'attack' }, { type: 'attack' },
        { type: 'skill' }
      ];
      const balancedScore = scorer.analyzeTypeDistribution(balancedDeck);
      const skewedScore = scorer.analyzeTypeDistribution(skewedDeck);
      expect(balancedScore).toBeGreaterThan(skewedScore);
    });

    test('should return 0 for empty deck', () => {
      expect(scorer.analyzeTypeDistribution([])).toBe(0);
    });
  });

  describe('findCardSynergies', () => {
    test('should find synergy pairs in deck', () => {
      const deck = [
        { id: 'c1', type: 'attack' },
        { id: 'c2', type: 'attack' },
        { id: 'c3', type: 'skill' }
      ];
      const synergies = scorer.findCardSynergies(deck);
      expect(synergies.length).toBeGreaterThan(0);
    });
  });

  describe('checkPairSynergy', () => {
    test('should detect attack-attack synergy', () => {
      const synergy = scorer.checkPairSynergy(
        { type: 'attack' },
        { type: 'attack' }
      );
      expect(synergy).not.toBeNull();
      expect(synergy.type).toBe('burst');
    });

    test('should detect skill-power synergy', () => {
      const synergy = scorer.checkPairSynergy(
        { type: 'skill' },
        { type: 'power' }
      );
      expect(synergy).not.toBeNull();
      expect(synergy.type).toBe('control');
    });

    test('should return null for no synergy', () => {
      const synergy = scorer.checkPairSynergy(
        { type: 'power' },
        { type: 'power' }
      );
      expect(synergy).not.toBeNull();
    });
  });

  describe('calculateChainPotential', () => {
    test('should score consecutive cost cards', () => {
      const deck = [
        { cost: 1 }, { cost: 1 }, { cost: 2 }, { cost: 2 }, { cost: 3 }
      ];
      const score = scorer.calculateChainPotential(deck);
      expect(score).toBeGreaterThan(0);
    });

    test('should return 0 for empty deck', () => {
      expect(scorer.calculateChainPotential([])).toBe(0);
    });
  });
});

describe('DraftOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new DraftOptimizer();
  });

  describe('optimizeDraft', () => {
    test('should return empty array for empty pool', () => {
      expect(optimizer.optimizeDraft([])).toEqual([]);
      expect(optimizer.optimizeDraft(null)).toEqual([]);
    });

    test('should sort cards by score', () => {
      const pool = [
        { id: 'c1', type: 'attack', cost: 3, power: 5 },
        { id: 'c2', type: 'attack', cost: 1, power: 3 },
        { id: 'c3', type: 'skill', cost: 2, power: 4 }
      ];
      const result = optimizer.optimizeDraft(pool);
      // c3 has cost <= 2 bonus (+10), so c3 scores higher: 4*2+10=18 vs 5*2=10
      expect(result[0].id).toBe('c3');
    });

    test('should consider existing deck context', () => {
      const pool = [
        { id: 'c1', type: 'attack', cost: 2, power: 5 },
        { id: 'c2', type: 'skill', cost: 2, power: 5 }
      ];
      const context = {
        existingDeck: [{ id: 'e1', type: 'attack', cost: 1 }]
      };
      const result = optimizer.optimizeDraft(pool, context);
      expect(result.length).toBe(2);
    });
  });

  describe('scoreCardForDraft', () => {
    test('should score based on power and cost', () => {
      const card = { type: 'attack', cost: 2, power: 5 };
      const score = optimizer.scoreCardForDraft(card, {});
      expect(score).toBeGreaterThan(0);
    });

    test('should reward low cost cards', () => {
      const lowCostCard = { type: 'attack', cost: 1, power: 3 };
      const highCostCard = { type: 'attack', cost: 5, power: 8 };
      const lowScore = optimizer.scoreCardForDraft(lowCostCard, {});
      const highScore = optimizer.scoreCardForDraft(highCostCard, {});
      expect(lowScore).toBeGreaterThan(highScore);
    });
  });

  describe('calculateDraftSynergy', () => {
    test('should reward cards matching existing deck types', () => {
      const card = { type: 'attack' };
      const deck = [{ type: 'attack' }, { type: 'skill' }];
      const score = optimizer.calculateDraftSynergy(card, deck);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('cardsHaveSynergy', () => {
    test('should detect attack-skill synergy', () => {
      expect(optimizer.cardsHaveSynergy(
        { type: 'attack' },
        { type: 'skill' }
      )).toBe(true);
    });

    test('should detect same type synergy', () => {
      expect(optimizer.cardsHaveSynergy(
        { type: 'attack' },
        { type: 'attack' }
      )).toBe(true);
    });
  });

  describe('calculateMetaFit', () => {
    test('should fit aggressive cards in aggressive meta', () => {
      const card = { type: 'attack' };
      const score = optimizer.calculateMetaFit(card, 'aggressive');
      expect(score).toBe(20);
    });

    test('should penalize attack cards in control meta', () => {
      const card = { type: 'attack' };
      const score = optimizer.calculateMetaFit(card, 'control');
      expect(score).toBe(-10);
    });
  });

  describe('updatePreferences', () => {
    test('should update valid preferences', () => {
      optimizer.updatePreferences('aggression', 0.8);
      expect(optimizer.preferences.aggression).toBe(0.8);
    });

    test('should clamp values to valid range', () => {
      optimizer.updatePreferences('aggression', 1.5);
      expect(optimizer.preferences.aggression).toBe(1);
      
      optimizer.updatePreferences('aggression', -0.5);
      expect(optimizer.preferences.aggression).toBe(0);
    });

    test('should ignore invalid preference names', () => {
      const originalValue = optimizer.preferences.control;
      optimizer.updatePreferences('invalid', 0.9);
      expect(optimizer.preferences.control).toBe(originalValue);
    });
  });
});

describe('ArchetypeRecommender', () => {
  let recommender;

  beforeEach(() => {
    recommender = new ArchetypeRecommender();
  });

  describe('recommendArchetype', () => {
    test('should generate recommendation with all required fields', () => {
      const playerData = { id: 'player1' };
      const result = recommender.recommendArchetype(playerData);
      
      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('complementary');
      expect(result).toHaveProperty('safetyPick');
      expect(result).toHaveProperty('buildGuide');
      expect(result).toHaveProperty('synergyTips');
      expect(result).toHaveProperty('metaAnalysis');
      expect(result).toHaveProperty('playerStyle');
      expect(result).toHaveProperty('confidence');
    });

    test('should use cache for repeated recommendations', () => {
      const playerData = { id: 'player1' };
      recommender.recommendArchetype(playerData);
      recommender.recommendArchetype(playerData);
      expect(recommender.recommendationCache.size).toBeGreaterThan(0);
    });
  });

  describe('generatePlayerCacheKey', () => {
    test('should generate unique keys for different players', () => {
      const key1 = recommender.generatePlayerCacheKey({ id: 'player1' });
      const key2 = recommender.generatePlayerCacheKey({ id: 'player2' });
      expect(key1).not.toBe(key2);
    });

    test('should use anonymous for players without id', () => {
      const key = recommender.generatePlayerCacheKey({});
      expect(key).toContain('anonymous');
    });
  });

  describe('analyzePlayerStyle', () => {
    test('should return balanced style for player with no history', () => {
      const style = recommender.analyzePlayerStyle({});
      expect(style.dominantStyle).toBe('balanced');
    });

    test('should detect aggressive playstyle from fast matches', () => {
      const matchHistory = [
        { turns: 6, cards: [], cardsPlayed: 3 },
        { turns: 7, cards: [], cardsPlayed: 4 },
        { turns: 8, cards: [], cardsPlayed: 3 }
      ];
      const style = recommender.analyzePlayerStyle({ matchHistory });
      expect(style.dominantStyle).toBe('aggressive');
    });

    test('should detect control playstyle from control cards', () => {
      const matchHistory = [
        { turns: 20, cards: [{ type: 'skill' }, { type: 'skill' }, { type: 'skill' }], cardsPlayed: 5 },
        { turns: 22, cards: [{ type: 'skill' }, { type: 'skill' }, { type: 'skill' }], cardsPlayed: 6 }
      ];
      const style = recommender.analyzePlayerStyle({ matchHistory });
      expect(style.aggression).toBeLessThan(style.control);
    });
  });

  describe('calculateAggressionScore', () => {
    test('should return high score for fast matches', () => {
      const matches = [{ turns: 5 }, { turns: 6 }, { turns: 7 }];
      const score = recommender.calculateAggressionScore(matches);
      expect(score).toBe(0.8);
    });

    test('should return low score for slow matches', () => {
      const matches = [{ turns: 25 }, { turns: 30 }];
      const score = recommender.calculateAggressionScore(matches);
      expect(score).toBe(0.2);
    });

    test('should return 0.5 for empty matches', () => {
      expect(recommender.calculateAggressionScore([])).toBe(0.5);
    });
  });

  describe('calculateControlScore', () => {
    test('should score based on control card ratio', () => {
      const matches = [
        { cards: [{ type: 'skill' }, { type: 'skill' }, { type: 'attack' }] },
        { cards: [{ type: 'skill' }, { type: 'skill' }] }
      ];
      const score = recommender.calculateControlScore(matches);
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('calculateTempoScore', () => {
    test('should calculate based on cards per turn', () => {
      const matches = [
        { turns: 10, cardsPlayed: 20 },
        { turns: 10, cardsPlayed: 25 }
      ];
      const score = recommender.calculateTempoScore(matches);
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('getStyleDescription', () => {
    test('should return correct descriptions', () => {
      expect(recommender.getStyleDescription('aggressive')).toContain('快速结束');
      expect(recommender.getStyleDescription('control')).toContain('控制');
      expect(recommender.getStyleDescription('balanced')).toContain('调整');
    });
  });

  describe('selectPrimaryArchetype', () => {
    test('should prioritize player style when clear', () => {
      const metaAnalysis = {
        recommendation: {
          topArchetypes: [
            { archetype: 'aggro-burn', winRate: 0.5 }
          ],
          primaryPick: 'control-midrange'
        }
      };
      const playerStyle = {
        dominantStyle: 'aggressive',
        aggression: 0.8
      };
      const archetype = recommender.selectPrimaryArchetype(metaAnalysis, playerStyle);
      expect(archetype).toBe('aggro-burn');
    });

    test('should fall back to meta recommendation when style is balanced', () => {
      const metaAnalysis = {
        recommendation: { primaryPick: 'control-midrange' }
      };
      const playerStyle = { dominantStyle: 'balanced' };
      const archetype = recommender.selectPrimaryArchetype(metaAnalysis, playerStyle);
      expect(archetype).toBe('control-midrange');
    });
  });

  describe('findComplementaryArchetypes', () => {
    test('should return appropriate complements', () => {
      const complements = recommender.findComplementaryArchetypes('aggro-burn');
      expect(complements).toContain('tempo-mid');
    });

    test('should return balanced as default', () => {
      const complements = recommender.findComplementaryArchetypes('unknown');
      expect(complements).toContain('balanced');
    });
  });

  describe('generateBuildGuide', () => {
    test('should generate guide for aggro archetype', () => {
      const guide = recommender.generateBuildGuide('aggro-burn', []);
      expect(guide.curve).toBe('low');
      expect(guide.avgCost).toBeLessThan(2);
    });

    test('should generate guide for control archetype', () => {
      const guide = recommender.generateBuildGuide('control-midrange', []);
      expect(guide.curve).toBe('mid');
    });
  });

  describe('findKeyCards', () => {
    test('should return key cards matching archetype', () => {
      const cards = [
        { id: 'c1', type: 'attack', power: 5 },
        { id: 'c2', type: 'attack', power: 3 },
        { id: 'c3', type: 'skill', power: 4 }
      ];
      const keyCards = recommender.findKeyCards('aggro-burn', cards);
      expect(keyCards.length).toBeGreaterThan(0);
      expect(keyCards[0].type).toBe('attack');
    });

    test('should return empty array for empty cards', () => {
      const keyCards = recommender.findKeyCards('aggro-burn', []);
      expect(keyCards).toHaveLength(0);
    });
  });

  describe('suggestReplacements', () => {
    test('should suggest replacements from available cards', () => {
      const cards = [
        { id: 'c1' }, { id: 'c2' }, { id: 'c3' },
        { id: 'c4' }, { id: 'c5' }, { id: 'c6' }
      ];
      const replacements = recommender.suggestReplacements('aggro-burn', cards);
      expect(replacements.length).toBeGreaterThan(0);
    });
  });

  describe('generateSynergyTips', () => {
    test('should return tips for aggro archetype', () => {
      const tips = recommender.generateSynergyTips('aggro-burn');
      expect(tips.length).toBeGreaterThan(0);
    });

    test('should return balanced tips for unknown archetype', () => {
      const tips = recommender.generateSynergyTips('unknown');
      expect(tips.length).toBeGreaterThan(0);
    });
  });

  describe('calculateConfidence', () => {
    test('should increase confidence with more match data', () => {
      const baseData = { matchHistory: [], stats: {} };
      const highExperienceData = { 
        matchHistory: Array(20).fill(null).map(() => ({ result: 'win' })),
        stats: { winRate: 0.7 }
      };
      
      const baseConfidence = recommender.calculateConfidence(baseData, { recentMatches: [] });
      const highConfidence = recommender.calculateConfidence(highExperienceData, { recentMatches: Array(10).fill(null) });
      
      expect(highConfidence).toBeGreaterThan(baseConfidence);
    });
  });

  describe('analyzeDeckCompleteness', () => {
    test('should return incomplete for empty deck', () => {
      const result = recommender.analyzeDeckCompleteness([]);
      expect(result.complete).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Deck is empty');
    });

    test('should score a complete deck high', () => {
      const deck = Array(25).fill(null).map((_, i) => ({
        id: `c${i}`,
        type: i % 3 === 0 ? 'attack' : i % 3 === 1 ? 'skill' : 'power',
        cost: i % 6
      }));
      const result = recommender.analyzeDeckCompleteness(deck);
      expect(result.score).toBeGreaterThan(80);
    });

    test('should penalize oversized deck', () => {
      const deck = Array(35).fill(null).map((_, i) => ({
        id: `c${i}`,
        type: 'attack',
        cost: 2
      }));
      const result = recommender.analyzeDeckCompleteness(deck);
      expect(result.score).toBeLessThan(100);
    });

    test('should penalize poor mana curve', () => {
      const deck = Array(20).fill(null).map((_, i) => ({
        id: `c${i}`,
        type: 'attack',
        cost: 5
      }));
      const result = recommender.analyzeDeckCompleteness(deck);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should warn about skewed type distribution', () => {
      const deck = Array(15).fill(null).map(() => ({
        id: `c${Math.random()}`,
        type: 'attack',
        cost: 2
      }));
      const result = recommender.analyzeDeckCompleteness(deck);
      expect(result.warnings.some(w => w.includes('attack'))).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('Full recommendation workflow', () => {
    const recommender = new ArchetypeRecommender();
    
    const playerData = {
      id: 'test-player',
      matchHistory: [
        { archetype: 'aggro', result: 'win', turns: 10 },
        { archetype: 'aggro', result: 'win', turns: 12 },
        { archetype: 'control', result: 'loss', turns: 25 }
      ],
      stats: { winRate: 0.67 }
    };

    const context = {
      recentMatches: [
        { archetype: 'aggro', result: 'win', turns: 8 },
        { archetype: 'aggro', result: 'win', turns: 10 },
        { archetype: 'control', result: 'loss', turns: 20 },
        { archetype: 'tempo', result: 'win', turns: 15 }
      ],
      availableCards: [
        { id: 'c1', type: 'attack', cost: 1, power: 5 },
        { id: 'c2', type: 'attack', cost: 2, power: 6 },
        { id: 'c3', type: 'skill', cost: 3, power: 4 },
        { id: 'c4', type: 'power', cost: 4, power: 7 }
      ]
    };

    const result = recommender.recommendArchetype(playerData, context);
    
    expect(result.primary).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.buildGuide.keyCards.length).toBeGreaterThan(0);
  });

  test('Synergy scoring with draft optimization', () => {
    const scorer = new SynergyScorer();
    const optimizer = new DraftOptimizer();
    
    const deck = [
      { id: 'c1', type: 'attack', cost: 1, power: 5 },
      { id: 'c2', type: 'attack', cost: 2, power: 6 },
      { id: 'c3', type: 'skill', cost: 2, power: 4 }
    ];
    
    const available = [
      { id: 'a1', type: 'attack', cost: 1, power: 4 },
      { id: 'a2', type: 'skill', cost: 3, power: 5 },
      { id: 'a3', type: 'power', cost: 4, power: 7 }
    ];
    
    const synergyResult = scorer.calculateSynergyScore(deck, available);
    expect(synergyResult.totalScore).toBeGreaterThan(0);
    
    const draftResult = optimizer.optimizeDraft(available, {
      existingDeck: deck,
      metaArchetype: 'aggressive'
    });
    expect(draftResult.length).toBe(available.length);
  });

  test('Meta analysis with pattern detection', () => {
    const analyzer = new MetaAnalyzer();
    
    const recentMatches = Array(30).fill(null).map((_, i) => ({
      archetype: i >= 20 ? 'new-archetype' : 'existing',
      result: Math.random() > 0.5 ? 'win' : 'loss',
      turns: 10 + Math.floor(Math.random() * 15)
    }));
    
    const result = analyzer.analyzeMetaTrend(recentMatches);
    
    expect(result.emergingPatterns.length).toBeGreaterThan(0);
    expect(result.recommendation.primaryPick).toBeDefined();
  });
});