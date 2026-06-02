/**
 * Meta Adaptation Engine Tests
 * Tests MetaAdaptationEngine: analyzeMeta() / generateRecommendations() / predictMetaTrend()
 */

const { MetaAdaptationEngine } = require('../../src/meta-adaptation-engine.js');

describe('MetaAdaptationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MetaAdaptationEngine();
  });

  describe('constructor', () => {
    test('initializes with default state', () => {
      expect(engine.currentMeta).toBeDefined();
      expect(engine.metaHistory).toEqual([]);
      expect(engine.topArchetypes).toEqual([]);
    });

    test('initializes with custom options', () => {
      const options = { analysisDepth: 10 };
      const customEngine = new MetaAdaptationEngine(options);
      expect(customEngine.analysisDepth).toBe(10);
    });
  });

  describe('analyzeMeta', () => {
    test('analyzes meta from match history', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', turns: 8 },
        { archetype: 'control', result: 'loss', turns: 15 },
        { archetype: 'aggressive', result: 'win', turns: 10 }
      ];
      
      const analysis = engine.analyzeMeta(matchHistory);
      
      expect(analysis).toBeDefined();
      expect(analysis.topArchetypes).toBeDefined();
    });

    test('handles empty match history', () => {
      const analysis = engine.analyzeMeta([]);
      
      expect(analysis).toBeDefined();
      expect(analysis.topArchetypes).toEqual([]);
    });

    test('calculates archetype win rates', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', turns: 8 },
        { archetype: 'aggressive', result: 'win', turns: 10 },
        { archetype: 'aggressive', result: 'loss', turns: 12 },
        { archetype: 'control', result: 'win', turns: 15 }
      ];
      
      const analysis = engine.analyzeMeta(matchHistory);
      const aggressiveArchetype = analysis.topArchetypes.find(a => a.archetype === 'aggressive');
      
      expect(aggressiveArchetype.winRate).toBeCloseTo(0.667, 2);
    });

    test('detects emerging archetypes', () => {
      const matchHistory = [
        { archetype: 'new_archetype', result: 'win', turns: 8 },
        { archetype: 'new_archetype', result: 'win', turns: 10 },
        { archetype: 'new_archetype', result: 'win', turns: 10 }
      ];
      
      const analysis = engine.analyzeMeta(matchHistory);
      
      expect(analysis.emergingArchetypes).toBeDefined();
    });

    test('identifies counters', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', opponentArchetype: 'control' },
        { archetype: 'aggressive', result: 'win', opponentArchetype: 'control' },
        { archetype: 'control', result: 'loss', opponentArchetype: 'aggressive' }
      ];
      
      const analysis = engine.analyzeMeta(matchHistory);
      
      expect(analysis.counters).toBeDefined();
    });
  });

  describe('generateRecommendations', () => {
    test('generates non-empty recommendations', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', turns: 8 },
        { archetype: 'control', result: 'loss', turns: 15 }
      ];
      
      engine.analyzeMeta(matchHistory);
      const recommendations = engine.generateRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('recommends counter archetype', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', opponentArchetype: 'control' },
        { archetype: 'aggressive', result: 'win', opponentArchetype: 'control' }
      ];
      
      engine.analyzeMeta(matchHistory);
      const recommendations = engine.generateRecommendations();
      
      const counterRecs = recommendations.filter(r => r.type === 'counter');
      expect(counterRecs.length).toBeGreaterThan(0);
    });

    test('recommends deck adjustments', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'loss', turns: 20 }
      ];
      
      engine.analyzeMeta(matchHistory);
      const recommendations = engine.generateRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('returns empty for insufficient data', () => {
      const matchHistory = [];
      engine.analyzeMeta(matchHistory);
      const recommendations = engine.generateRecommendations();
      expect(recommendations).toEqual([]);
    });
  });

  describe('predictMetaTrend', () => {
    test('predicts meta trend based on history', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', turns: 8 },
        { archetype: 'control', result: 'win', turns: 15 },
        { archetype: 'aggressive', result: 'win', turns: 10 },
        { archetype: 'control', result: 'win', turns: 12 },
        { archetype: 'aggressive', result: 'win', turns: 9 }
      ];
      
      engine.analyzeMeta(matchHistory);
      const trend = engine.predictMetaTrend();
      
      expect(trend).toBeDefined();
      expect(trend.direction).toBeDefined();
    });

    test('returns stable for insufficient data', () => {
      const trend = engine.predictMetaTrend();
      
      expect(trend.direction).toBe('stable');
    });

    test('calculates win rate trend', () => {
      const matchHistory = [
        { archetype: 'arch1', result: 'loss', turns: 8 },
        { archetype: 'arch1', result: 'loss', turns: 10 },
        { archetype: 'arch1', result: 'loss', turns: 10 },
        { archetype: 'arch1', result: 'win', turns: 10 },
        { archetype: 'arch1', result: 'win', turns: 10 },
        { archetype: 'arch2', result: 'win', turns: 8 },
        { archetype: 'arch2', result: 'win', turns: 10 },
        { archetype: 'arch2', result: 'win', turns: 9 },
        { archetype: 'arch2', result: 'win', turns: 11 },
        { archetype: 'arch2', result: 'win', turns: 10 }
      ];
      
      engine.analyzeMeta(matchHistory);
      const trend = engine.predictMetaTrend();
      
      expect(trend).toBeDefined();
      expect(trend.direction).toBeDefined();
    });
  });

  describe('getMetaSnapshot', () => {
    test('returns current meta snapshot', () => {
      const snapshot = engine.getMetaSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
    });
  });

  describe('analyzeMatchup', () => {
    test('analyzes matchup between archetypes', () => {
      const analysis = engine.analyzeMatchup('aggressive', 'control');
      
      expect(analysis).toBeDefined();
      expect(analysis.favorability).toBeDefined();
    });

    test('returns neutral for unknown archetypes', () => {
      const analysis = engine.analyzeMatchup('unknown1', 'unknown2');
      
      expect(analysis.favorability).toBe('neutral');
    });
  });

  describe('getTierList', () => {
    test('generates tier list', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', turns: 8 },
        { archetype: 'aggressive', result: 'win', turns: 10 },
        { archetype: 'aggressive', result: 'loss', turns: 12 },
        { archetype: 'control', result: 'win', turns: 15 },
        { archetype: 'control', result: 'win', turns: 12 },
        { archetype: 'control', result: 'win', turns: 14 }
      ];
      
      engine.analyzeMeta(matchHistory);
      const tierList = engine.getTierList();
      
      expect(tierList).toBeDefined();
      expect(tierList.s).toBeDefined();
    });
  });

  describe('adaptToMeta', () => {
    test('adapts deck recommendations to current meta', () => {
      const matchHistory = [
        { archetype: 'aggressive', result: 'win', turns: 8 },
        { archetype: 'control', result: 'loss', turns: 15 }
      ];
      
      engine.analyzeMeta(matchHistory);
      const adapted = engine.adaptToMeta({ type: 'balanced', cost: 3 });
      
      expect(adapted).toBeDefined();
      expect(adapted.recommendedArchetype).toBeDefined();
    });
  });
});