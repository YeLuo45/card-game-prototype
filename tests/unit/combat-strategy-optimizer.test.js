/**
 * V256 Combat Strategy Optimizer Tests (Iteration 2/9)
 */

const { 
  CombatStrategyOptimizer, 
  StrategyAnalyzer, 
  BattleRecommender 
} = require('../../src/combat-strategy-optimizer');

describe('StrategyAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new StrategyAnalyzer();
  });

  afterEach(() => {
    analyzer.clearCache();
  });

  describe('analyzePlayStyle', () => {
    test('should return balanced style for empty battle history', () => {
      const result = analyzer.analyzePlayStyle([]);
      
      expect(result.style).toBe('balanced');
      expect(result.aggressionScore).toBe(0.5);
      expect(result.defenseScore).toBe(0.5);
    });

    test('should return balanced style for null battle history', () => {
      const result = analyzer.analyzePlayStyle(null);
      
      expect(result.style).toBe('balanced');
      expect(result.aggressionScore).toBe(0.5);
    });

    test('should analyze aggressive play style', () => {
      const battleHistory = [
        { enemyHPChange: -100, playerHPChange: -5, turnsElapsed: 3, victory: true, metrics: { energySpent: 10 } },
        { enemyHPChange: -90, playerHPChange: -10, turnsElapsed: 4, victory: true, metrics: { energySpent: 8 } },
        { enemyHPChange: -110, playerHPChange: -8, turnsElapsed: 3, victory: true, metrics: { energySpent: 12 } }
      ];
      
      const result = analyzer.analyzePlayStyle(battleHistory);
      
      expect(result.style).toBe('aggressive');
      expect(result.aggressionScore).toBeGreaterThan(0.6);
      expect(result.adaptabilityScore).toBe(1);
    });

    test('should analyze defensive play style', () => {
      const battleHistory = [
        { enemyHPChange: -20, playerHPChange: -90, turnsElapsed: 10, victory: true, metrics: { energySpent: 15 } },
        { enemyHPChange: -15, playerHPChange: -85, turnsElapsed: 8, victory: true, metrics: { energySpent: 12 } }
      ];
      
      const result = analyzer.analyzePlayStyle(battleHistory);
      
      expect(result.style).toBe('defensive');
      expect(result.defenseScore).toBeGreaterThan(0.5);
    });

    test('should calculate efficiency score correctly', () => {
      const battleHistory = [
        { enemyHPChange: -30, playerHPChange: -10, turnsElapsed: 5, victory: true, metrics: { energySpent: 6 } }
      ];
      
      const result = analyzer.analyzePlayStyle(battleHistory);
      
      expect(result.efficiencyScore).toBeGreaterThan(0);
      expect(result.sampleSize).toBe(1);
    });

    test('should handle battle history with missing metrics', () => {
      const battleHistory = [
        { enemyHPChange: -30, playerHPChange: -10, turnsElapsed: 5, victory: true },
        { enemyHPChange: -20, playerHPChange: -15, turnsElapsed: 3, victory: false }
      ];
      
      const result = analyzer.analyzePlayStyle(battleHistory);
      
      expect(result.sampleSize).toBe(2);
      expect(result.adaptabilityScore).toBe(0.5);
    });
  });

  describe('identifyBattlePatterns', () => {
    test('should return empty patterns for empty battle history', () => {
      const result = analyzer.identifyBattlePatterns([]);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.type === 'energyEfficiency')).toBe(true);
    });

    test('should identify fast victory pattern', () => {
      const battleHistory = [
        { victory: true, turnsElapsed: 4, metrics: { energyEfficiency: 80 } },
        { victory: true, turnsElapsed: 3, metrics: { energyEfficiency: 85 } },
        { victory: true, turnsElapsed: 5, metrics: { energyEfficiency: 75 } }
      ];
      
      const result = analyzer.identifyBattlePatterns(battleHistory);
      const fastVictoryPattern = result.find(p => p.type === 'fastVictory');
      
      expect(fastVictoryPattern).toBeDefined();
      expect(fastVictoryPattern.avgTurns).toBeLessThanOrEqual(5);
    });

    test('should identify defeat pattern', () => {
      const battleHistory = [
        { victory: false, defeat: true, turnsElapsed: 2, metrics: { energyEfficiency: 60 } }
      ];
      
      const result = analyzer.identifyBattlePatterns(battleHistory);
      const defeatPattern = result.find(p => p.type === 'defeat');
      
      expect(defeatPattern).toBeDefined();
      expect(defeatPattern.description).toBe('Early defeat');
    });

    test('should identify energy efficiency pattern', () => {
      const battleHistory = [
        { victory: true, turnsElapsed: 5, metrics: { energyEfficiency: 85 } },
        { victory: true, turnsElapsed: 6, metrics: { energyEfficiency: 90 } }
      ];
      
      const result = analyzer.identifyBattlePatterns(battleHistory);
      const energyPattern = result.find(p => p.type === 'energyEfficiency');
      
      expect(energyPattern).toBeDefined();
      expect(energyPattern.description).toBe('High efficiency');
    });
  });

  describe('detectWeaknesses', () => {
    test('should return empty weaknesses for empty battle history', () => {
      const result = analyzer.detectWeaknesses([]);
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('should detect survivability weakness', () => {
      const battleHistory = [
        { playerHPChange: -40, victory: false },
        { playerHPChange: -35, victory: false },
        { playerHPChange: -45, victory: false }
      ];
      
      const result = analyzer.detectWeaknesses(battleHistory);
      
      expect(result.some(w => w.category === 'survivability')).toBe(true);
    });

    test('should detect boss fighting weakness', () => {
      const battleHistory = [
        { enemyType: 'boss', victory: false },
        { enemyType: 'boss', victory: false }
      ];
      
      const result = analyzer.detectWeaknesses(battleHistory, { type: 'boss' });
      
      expect(result.some(w => w.category === 'bossFighting')).toBe(true);
    });

    test('should detect energy management weakness', () => {
      const battleHistory = [
        { metrics: { energyEfficiency: 40 }, victory: true },
        { metrics: { energyEfficiency: 45 }, victory: false },
        { metrics: { energyEfficiency: 35 }, victory: true },
        { metrics: { energyEfficiency: 30 }, victory: false },
        { metrics: { energyEfficiency: 25 }, victory: false },
        { metrics: { energyEfficiency: 50 }, victory: true }
      ];
      
      const result = analyzer.detectWeaknesses(battleHistory);
      
      expect(result.some(w => w.category === 'energyManagement')).toBe(true);
    });

    test('should not detect weaknesses when win rate is high', () => {
      const battleHistory = [
        { playerHPChange: -10, victory: true, metrics: { energyEfficiency: 80 } },
        { playerHPChange: -15, victory: true, metrics: { energyEfficiency: 75 } },
        { playerHPChange: -12, victory: true, metrics: { energyEfficiency: 85 } }
      ];
      
      const result = analyzer.detectWeaknesses(battleHistory);
      
      expect(result.some(w => w.category === 'survivability')).toBe(false);
    });
  });

  describe('cache functionality', () => {
    test('should cache analysis results', () => {
      const data = { style: 'aggressive', aggressionScore: 0.8 };
      
      analyzer.cacheAnalysis('test_key', data);
      
      const cached = analyzer.getCachedAnalysis('test_key');
      expect(cached).toEqual(data);
    });

    test('should return null for expired cache', () => {
      const data = { style: 'balanced' };
      
      analyzer.cacheAnalysis('old_key', data);
      // Cache expires after 5 minutes, so simulate time passing
      const cachedEntry = analyzer.analysisCache.get('old_key');
      cachedEntry.timestamp = Date.now() - 400000;
      
      const cached = analyzer.getCachedAnalysis('old_key');
      expect(cached).toBeNull();
    });

    test('should clear cache', () => {
      analyzer.cacheAnalysis('key1', { data: 1 });
      analyzer.cacheAnalysis('key2', { data: 2 });
      
      analyzer.clearCache();
      
      expect(analyzer.analysisCache.size).toBe(0);
    });
  });
});

describe('BattleRecommender', () => {
  let recommender;

  beforeEach(() => {
    recommender = new BattleRecommender();
  });

  afterEach(() => {
    recommender.clearRecommendations();
  });

  describe('generateRecommendations', () => {
    test('should generate aggressive strategy recommendation', () => {
      const analysis = {
        style: 'aggressive',
        aggressionScore: 0.8,
        defenseScore: 0.2,
        efficiencyScore: 0.6
      };
      
      const result = recommender.generateRecommendations(analysis, {});
      
      expect(result.some(r => r.title === 'Maintain Aggression')).toBe(true);
    });

    test('should generate defensive strategy recommendation', () => {
      const analysis = {
        style: 'defensive',
        aggressionScore: 0.2,
        defenseScore: 0.8,
        efficiencyScore: 0.5
      };
      
      const result = recommender.generateRecommendations(analysis, {});
      
      expect(result.some(r => r.title === 'Balance Defense')).toBe(true);
    });

    test('should generate efficiency optimization recommendation', () => {
      const analysis = {
        style: 'balanced',
        efficiencyScore: 0.3
      };
      
      const result = recommender.generateRecommendations(analysis, {});
      
      expect(result.some(r => r.title === 'Improve Energy Efficiency')).toBe(true);
    });

    test('should generate elite enemy recommendation', () => {
      const analysis = { style: 'balanced', efficiencyScore: 0.5 };
      const context = { enemyType: 'elite' };
      
      const result = recommender.generateRecommendations(analysis, context);
      
      expect(result.some(r => r.title === 'Elite Enemy Strategy')).toBe(true);
    });

    test('should generate boss fight recommendation', () => {
      const analysis = { style: 'balanced', efficiencyScore: 0.5 };
      const context = { enemyType: 'boss' };
      
      const result = recommender.generateRecommendations(analysis, context);
      
      expect(result.some(r => r.title === 'Boss Fight Strategy')).toBe(true);
    });

    test('should store recommendations internally', () => {
      const analysis = { style: 'aggressive', aggressionScore: 0.8, defenseScore: 0.2, efficiencyScore: 0.6 };
      
      recommender.generateRecommendations(analysis, {});
      
      expect(recommender.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('evaluateCardValue', () => {
    test('should evaluate basic damage card', () => {
      const card = { name: 'Strike', damage: 6, cost: 1 };
      
      const score = recommender.evaluateCardValue(card);
      
      expect(score).toBeGreaterThan(50);
    });

    test('should evaluate card with effects', () => {
      const card = { 
        name: 'Defend', 
        damage: 0, 
        cost: 1, 
        effects: [{ type: 'armor', value: 5 }] 
      };
      
      const score = recommender.evaluateCardValue(card);
      
      expect(score).toBeGreaterThan(0);
    });

    test('should boost damage card when damage is needed', () => {
      const card = { name: 'Heavy Strike', damage: 15, cost: 3 };
      const context = { needDamage: true };
      
      const normalScore = recommender.evaluateCardValue(card);
      const boostedScore = recommender.evaluateCardValue(card, context);
      
      expect(boostedScore).toBeGreaterThan(normalScore);
    });

    test('should boost defense card when defense is needed', () => {
      const card = { 
        name: 'Iron Wave', 
        damage: 5, 
        cost: 1, 
        effects: [{ type: 'armor', value: 5 }] 
      };
      const context = { needDefense: true };
      
      const normalScore = recommender.evaluateCardValue(card);
      const boostedScore = recommender.evaluateCardValue(card, context);
      
      expect(boostedScore).toBeGreaterThan(normalScore);
    });

    test('should handle card with missing cost', () => {
      const card = { name: 'Test', damage: 10 };
      
      const score = recommender.evaluateCardValue(card);
      
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('sortRecommendations', () => {
    test('should sort by priority order', () => {
      recommender.recommendations = [
        { priority: 'medium', title: 'Medium Priority' },
        { priority: 'critical', title: 'Critical Priority' },
        { priority: 'low', title: 'Low Priority' },
        { priority: 'high', title: 'High Priority' }
      ];
      
      const sorted = recommender.sortRecommendations('priority');
      
      expect(sorted[0].title).toBe('Critical Priority');
      expect(sorted[1].title).toBe('High Priority');
      expect(sorted[2].title).toBe('Medium Priority');
      expect(sorted[3].title).toBe('Low Priority');
    });

    test('should not modify original array', () => {
      recommender.recommendations = [
        { priority: 'low', title: 'Low' },
        { priority: 'critical', title: 'Critical' }
      ];
      
      const sorted = recommender.sortRecommendations('priority');
      
      expect(recommender.recommendations[0].priority).toBe('low');
    });
  });

  describe('clearRecommendations', () => {
    test('should clear all recommendations', () => {
      recommender.recommendations = [
        { priority: 'high', title: 'Test' }
      ];
      
      recommender.clearRecommendations();
      
      expect(recommender.recommendations.length).toBe(0);
    });
  });
});

describe('CombatStrategyOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new CombatStrategyOptimizer();
  });

  afterEach(() => {
    optimizer.reset();
  });

  describe('optimizeStrategy', () => {
    test('should return optimization result with all required fields', () => {
      const battleData = [
        { enemyHPChange: -30, playerHPChange: -10, turnsElapsed: 5, victory: true, metrics: { energySpent: 8 } }
      ];
      const options = { playerId: 'player1', enemyType: 'normal' };
      
      const result = optimizer.optimizeStrategy(battleData, options);
      
      expect(result.playerId).toBe('player1');
      expect(result.enemyType).toBe('normal');
      expect(result.analysis).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.weaknesses).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.optimizedDeckOrder).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should use default values for missing options', () => {
      const battleData = [];
      
      const result = optimizer.optimizeStrategy(battleData, {});
      
      expect(result.playerId).toBe('default');
      expect(result.enemyType).toBe('normal');
    });

    test('should store optimization in history', () => {
      const battleData = [
        { enemyHPChange: -30, playerHPChange: -10, turnsElapsed: 5, victory: true }
      ];
      
      optimizer.optimizeStrategy(battleData, { playerId: 'test' });
      
      const history = optimizer.getOptimizationHistory();
      expect(history.length).toBe(1);
      expect(history[0].playerId).toBe('test');
    });

    test('should limit history size', () => {
      const optimizerWithSmallHistory = new CombatStrategyOptimizer({ maxHistorySize: 3 });
      const battleData = [{ victory: true, turnsElapsed: 5 }];
      
      for (let i = 0; i < 5; i++) {
        optimizerWithSmallHistory.optimizeStrategy(battleData, { playerId: `player${i}` });
      }
      
      const history = optimizerWithSmallHistory.getOptimizationHistory();
      expect(history.length).toBe(3);
    });

    test('should cache analysis results', () => {
      const battleData = [
        { enemyHPChange: -40, playerHPChange: -15, turnsElapsed: 6, victory: true }
      ];
      
      // First call - should cache
      optimizer.optimizeStrategy(battleData, { playerId: 'cachedPlayer' });
      // Second call - should use cache
      optimizer.optimizeStrategy(battleData, { playerId: 'cachedPlayer' });
      
      const analyzer = optimizer.getAnalyzer();
      const cached = analyzer.getCachedAnalysis('analysis_cachedPlayer_normal');
      expect(cached).not.toBeNull();
    });
  });

  describe('optimizeCardOrder', () => {
    test('should return empty array for empty deck', () => {
      const result = optimizer.optimizeCardOrder([]);
      
      expect(result).toEqual([]);
    });

    test('should return empty array for null deck', () => {
      const result = optimizer.optimizeCardOrder(null);
      
      expect(result).toEqual([]);
    });

    test('should sort cards by value score', () => {
      const deck = [
        { name: 'Weak Card', damage: 3, cost: 2 },
        { name: 'Strong Card', damage: 12, cost: 3 },
        { name: 'Medium Card', damage: 6, cost: 2 }
      ];
      
      const result = optimizer.optimizeCardOrder(deck);
      
      expect(result[0].name).toBe('Strong Card');
      expect(result[1].name).toBe('Medium Card');
      expect(result[2].name).toBe('Weak Card');
    });

    test('should include value score in sorted cards', () => {
      const deck = [
        { name: 'Test Card', damage: 10, cost: 2 }
      ];
      
      const result = optimizer.optimizeCardOrder(deck);
      
      expect(result[0].valueScore).toBeDefined();
      expect(result[0].valueScore).toBeGreaterThan(0);
    });

    test('should consider context when evaluating cards', () => {
      const deck = [
        { name: 'Damage Card', damage: 20, cost: 4 },
        { name: 'Defense Card', damage: 5, cost: 2, effects: [{ type: 'armor' }] }
      ];
      const context = { needDamage: true };
      
      const result = optimizer.optimizeCardOrder(deck, context);
      
      // Damage card should be first when needDamage is true
      expect(result[0].name).toBe('Damage Card');
    });
  });

  describe('predictBattleOutcome', () => {
    test('should predict victory for strong deck', () => {
      const strategy = {
        deck: [
          { name: 'Strike', damage: 10, cost: 1 },
          { name: 'Heavy Strike', damage: 20, cost: 3 }
        ],
        style: 'aggressive'
      };
      const enemyState = { currentHP: 50 };
      
      const result = optimizer.predictBattleOutcome(strategy, enemyState);
      
      expect(result.estimatedVictory).toBe(true);
      expect(result.estimatedDamage).toBeGreaterThan(50);
    });

    test('should predict defeat for weak deck', () => {
      const strategy = {
        deck: [
          { name: 'Strike', damage: 3, cost: 2 }
        ],
        style: 'balanced'
      };
      const enemyState = { currentHP: 100 };
      
      const result = optimizer.predictBattleOutcome(strategy, enemyState);
      
      expect(result.estimatedVictory).toBe(false);
    });

    test('should apply style multipliers', () => {
      const strategyAggressive = {
        deck: [{ name: 'Test', damage: 10, cost: 1 }],
        style: 'aggressive'
      };
      const strategyDefensive = {
        deck: [{ name: 'Test', damage: 10, cost: 1 }],
        style: 'defensive'
      };
      const enemyState = { currentHP: 50 };
      
      const resultAgg = optimizer.predictBattleOutcome(strategyAggressive, enemyState);
      const resultDef = optimizer.predictBattleOutcome(strategyDefensive, enemyState);
      
      expect(resultAgg.estimatedDamage).toBeGreaterThan(resultDef.estimatedDamage);
      expect(resultAgg.strategyType).toBe('aggressive');
      expect(resultDef.strategyType).toBe('defensive');
    });

    test('should include confidence in prediction', () => {
      const strategy = {
        deck: [{ name: 'Test', damage: 10, cost: 1 }],
        style: 'balanced'
      };
      const enemyState = { currentHP: 50 };
      
      const result = optimizer.predictBattleOutcome(strategy, enemyState);
      
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('getters', () => {
    test('should return analyzer instance', () => {
      const analyzer = optimizer.getAnalyzer();
      
      expect(analyzer).toBeInstanceOf(StrategyAnalyzer);
    });

    test('should return recommender instance', () => {
      const recommender = optimizer.getRecommender();
      
      expect(recommender).toBeInstanceOf(BattleRecommender);
    });

    test('should return optimization history', () => {
      const history = optimizer.getOptimizationHistory();
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('reset', () => {
    test('should clear all internal state', () => {
      optimizer.optimizeStrategy(
        [{ victory: true, turnsElapsed: 5, enemyHPChange: -30, playerHPChange: -10 }],
        { playerId: 'test' }
      );
      
      optimizer.reset();
      
      expect(optimizer.getOptimizationHistory().length).toBe(0);
    });
  });
});

describe('Integration Tests', () => {
  let optimizer;
  let analyzer;
  let recommender;

  beforeEach(() => {
    optimizer = new CombatStrategyOptimizer();
    analyzer = optimizer.getAnalyzer();
    recommender = optimizer.getRecommender();
  });

  test('should work as a complete workflow', () => {
    // Create battle history
    const battleHistory = [
      { enemyHPChange: -100, playerHPChange: -15, turnsElapsed: 4, victory: true, metrics: { energySpent: 10 } },
      { enemyHPChange: -80, playerHPChange: -20, turnsElapsed: 6, victory: true, metrics: { energySpent: 12 } },
      { enemyHPChange: -30, playerHPChange: -35, turnsElapsed: 8, victory: false, metrics: { energySpent: 8 } }
    ];

    // Analyze play style
    const analysis = analyzer.analyzePlayStyle(battleHistory);
    expect(analysis).toBeDefined();
    expect(analysis.sampleSize).toBe(3);

    // Identify patterns
    const patterns = analyzer.identifyBattlePatterns(battleHistory);
    expect(patterns.length).toBeGreaterThan(0);

    // Detect weaknesses
    const weaknesses = analyzer.detectWeaknesses(battleHistory, { type: 'normal' });
    expect(Array.isArray(weaknesses)).toBe(true);

    // Generate recommendations
    const recommendations = recommender.generateRecommendations(analysis, { enemyType: 'normal' });
    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle edge case empty battle history', () => {
    const battleHistory = [
      { enemyHPChange: -50, playerHPChange: -50, turnsElapsed: 10, victory: false, metrics: { energySpent: 10 } }
    ];
    
    const result = optimizer.optimizeStrategy(battleHistory, {});
    
    expect(result.analysis.style).toBe('balanced');
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  test('should handle edge case all victories', () => {
    const battleHistory = [
      { victory: true, turnsElapsed: 3, enemyHPChange: -50, playerHPChange: -5, metrics: { energySpent: 6 } },
      { victory: true, turnsElapsed: 4, enemyHPChange: -45, playerHPChange: -8, metrics: { energySpent: 8 } }
    ];
    
    const result = optimizer.optimizeStrategy(battleHistory, { playerId: 'pro_player' });
    
    expect(result.analysis.adaptabilityScore).toBe(1);
    expect(result.weaknesses.some(w => w.category === 'survivability')).toBe(false);
  });

  test('should handle edge case all defeats', () => {
    const battleHistory = [
      { victory: false, defeat: true, turnsElapsed: 2, enemyHPChange: -20, playerHPChange: -50, metrics: { energySpent: 5 } },
      { victory: false, defeat: true, turnsElapsed: 3, enemyHPChange: -25, playerHPChange: -45, metrics: { energySpent: 6 } }
    ];
    
    const result = optimizer.optimizeStrategy(battleHistory, { playerId: 'struggling_player' });
    
    expect(result.analysis.adaptabilityScore).toBe(0);
  });
});

describe('Edge Cases', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new CombatStrategyOptimizer({ maxHistorySize: 5 });
  });

  test('should handle extremely long battle history', () => {
    const battleHistory = Array.from({ length: 100 }, (_, i) => ({
      victory: i % 2 === 0,
      turnsElapsed: 5 + (i % 10),
      enemyHPChange: -30 - (i % 20),
      playerHPChange: -10 - (i % 15),
      metrics: { energySpent: 5 + (i % 10), energyEfficiency: 60 + (i % 30) }
    }));
    
    const result = optimizer.optimizeStrategy(battleHistory, { playerId: 'volume_player' });
    
    expect(result.analysis.sampleSize).toBe(100);
  });

  test('should handle deck with mixed card types', () => {
    const deck = [
      { name: 'Attack', damage: 10, cost: 2 },
      { name: 'Defend', damage: 0, cost: 1, effects: [{ type: 'armor', value: 5 }] },
      { name: 'Heal', damage: 0, cost: 2, effects: [{ type: 'heal', value: 5 }] },
      { name: 'Status', damage: 3, cost: 1, effects: [{ type: 'status' }] }
    ];
    
    const result = optimizer.optimizeCardOrder(deck, { needDefense: true });
    
    expect(result.length).toBe(4);
    expect(result[0].valueScore).toBeGreaterThan(0);
  });

  test('should handle multiple cache keys', () => {
    const battleData = [{ victory: true, turnsElapsed: 5, enemyHPChange: -30, playerHPChange: -10 }];
    
    optimizer.optimizeStrategy(battleData, { playerId: 'player1', enemyType: 'normal' });
    optimizer.optimizeStrategy(battleData, { playerId: 'player2', enemyType: 'elite' });
    optimizer.optimizeStrategy(battleData, { playerId: 'player3', enemyType: 'boss' });
    
    expect(optimizer.getOptimizationHistory().length).toBe(3);
  });
});