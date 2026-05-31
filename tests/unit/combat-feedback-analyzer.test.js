/**
 * V257 Combat Feedback Analyzer Tests (Iteration 3/9)
 */

const {
  CombatFeedbackAnalyzer,
  CardEffectivenessMatrix,
  PerformanceTracker
} = require('../../src/combat-feedback-analyzer');

describe('CardEffectivenessMatrix', () => {
  let matrix;

  beforeEach(() => {
    matrix = new CardEffectivenessMatrix();
  });

  afterEach(() => {
    matrix.clear();
  });

  describe('registerCard', () => {
    test('should register a card successfully', () => {
      const card = { id: 'strike_001', name: 'Strike', damage: 6, cost: 1 };
      const result = matrix.registerCard(card);

      expect(result).toBe(true);
      expect(matrix.getSize()).toBe(1);
    });

    test('should not register duplicate card', () => {
      const card = { id: 'strike_001', name: 'Strike', damage: 6, cost: 1 };
      matrix.registerCard(card);
      const result = matrix.registerCard(card);

      expect(result).toBe(false);
      expect(matrix.getSize()).toBe(1);
    });

    test('should register card without id using name', () => {
      const card = { name: 'Defend', damage: 0, cost: 1 };
      const result = matrix.registerCard(card);

      expect(result).toBe(true);
      expect(matrix.getCardEffectiveness('Defend')).toBeDefined();
    });

    test('should return false for card without id or name', () => {
      const card = { damage: 6, cost: 1 };
      const result = matrix.registerCard(card);

      expect(result).toBe(false);
    });
  });

  describe('recordCardUsage', () => {
    test('should record card usage with damage', () => {
      const card = { id: 'strike_001', name: 'Strike', damage: 6, cost: 1 };
      matrix.registerCard(card);
      
      const entry = matrix.recordCardUsage(card, { damage: 10, victory: true });

      expect(entry.plays).toBe(1);
      expect(entry.damageDealt).toBe(10);
      expect(entry.wins).toBe(1);
      expect(entry.avgDamagePerPlay).toBe(10);
    });

    test('should record healing done', () => {
      const card = { id: 'heal_001', name: 'Heal', damage: 0, cost: 2 };
      matrix.registerCard(card);
      
      const entry = matrix.recordCardUsage(card, { healing: 5, victory: false });

      expect(entry.healingDone).toBe(5);
      expect(entry.avgHealingPerPlay).toBe(5);
      expect(entry.losses).toBe(1);
    });

    test('should record armor gained', () => {
      const card = { id: 'defend_001', name: 'Defend', damage: 0, cost: 1 };
      matrix.registerCard(card);
      
      const entry = matrix.recordCardUsage(card, { armor: 8, victory: true });

      expect(entry.armorGained).toBe(8);
      expect(entry.avgArmorPerPlay).toBe(8);
    });

    test('should auto-register unregistered card', () => {
      const card = { id: 'new_card', name: 'New Card', damage: 5, cost: 1 };
      
      const entry = matrix.recordCardUsage(card, { damage: 5 });

      expect(matrix.getSize()).toBe(1);
      expect(entry.plays).toBe(1);
    });

    test('should calculate effectiveness score', () => {
      const card = { id: 'test_card', name: 'Test Card', damage: 10, cost: 2 };
      matrix.registerCard(card);
      
      matrix.recordCardUsage(card, { damage: 15, healing: 5, armor: 3, victory: true });
      const entry = matrix.getCardEffectiveness('test_card');

      expect(entry.effectivenessScore).toBeGreaterThan(0);
      expect(entry.effectivenessScore).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateEffectiveness', () => {
    test('should weight damage heavily', () => {
      const entry = {
        avgDamagePerPlay: 20,
        avgHealingPerPlay: 0,
        avgArmorPerPlay: 0,
        winRate: 0,
        plays: 10,
        wins: 5
      };

      const score = matrix.calculateEffectiveness(entry);

      // damage at max (20/20=1) * 0.5 = 0.5, rest is 0
      expect(score).toBeGreaterThanOrEqual(0.4);
    });

    test('should handle low performing cards', () => {
      const entry = {
        avgDamagePerPlay: 2,
        avgHealingPerPlay: 0,
        avgArmorPerPlay: 0,
        winRate: 0.1,
        plays: 10,
        wins: 1
      };

      const score = matrix.calculateEffectiveness(entry);

      expect(score).toBeLessThan(0.3);
    });
  });

  describe('getCardEffectiveness', () => {
    test('should return null for unknown card', () => {
      const result = matrix.getCardEffectiveness('unknown_card');
      expect(result).toBeNull();
    });

    test('should return card data if exists', () => {
      const card = { id: 'test', name: 'Test', damage: 5 };
      matrix.registerCard(card);

      const result = matrix.getCardEffectiveness('test');

      expect(result).toBeDefined();
      expect(result.cardId).toBe('test');
    });
  });

  describe('getSortedCards', () => {
    test('should return empty array when no plays recorded', () => {
      const card = { id: 'test', name: 'Test', damage: 5 };
      matrix.registerCard(card);

      const result = matrix.getSortedCards();

      expect(result.length).toBe(0);
    });

    test('should sort by effectiveness score by default', () => {
      matrix.recordCardUsage({ id: 'weak', name: 'Weak', damage: 3, cost: 2 }, { damage: 5 });
      matrix.recordCardUsage({ id: 'strong', name: 'Strong', damage: 15, cost: 3 }, { damage: 15 });

      const result = matrix.getSortedCards();

      expect(result[0].name).toBe('Strong');
    });

    test('should sort by damage when specified', () => {
      matrix.recordCardUsage({ id: 'low', name: 'Low', damage: 3, cost: 1 }, { damage: 3 });
      matrix.recordCardUsage({ id: 'high', name: 'High', damage: 20, cost: 4 }, { damage: 20 });

      const result = matrix.getSortedCards('damageDealt');

      expect(result[0].name).toBe('High');
    });
  });

  describe('getTopCards', () => {
    test('should return top N cards', () => {
      for (let i = 1; i <= 10; i++) {
        matrix.recordCardUsage(
          { id: `card_${i}`, name: `Card ${i}`, damage: i * 2 },
          { damage: i * 2 }
        );
      }

      const result = matrix.getTopCards(3);

      expect(result.length).toBe(3);
      expect(result[0].damageDealt).toBeGreaterThan(result[1].damageDealt);
    });

    test('should return all cards if N exceeds available', () => {
      matrix.recordCardUsage({ id: 'c1', name: 'Card 1', damage: 5 }, { damage: 5 });
      matrix.recordCardUsage({ id: 'c2', name: 'Card 2', damage: 10 }, { damage: 10 });

      const result = matrix.getTopCards(10);

      expect(result.length).toBe(2);
    });
  });

  describe('getBottomCards', () => {
    test('should return bottom N cards', () => {
      for (let i = 1; i <= 5; i++) {
        matrix.recordCardUsage(
          { id: `card_${i}`, name: `Card ${i}`, damage: i * 5 },
          { damage: i * 5 }
        );
      }

      const result = matrix.getBottomCards(2);

      expect(result.length).toBe(2);
      // Bottom cards are least effective, so they come last in sorted order
      expect(result[result.length - 1].name).toBe('Card 1');
    });
  });

  describe('clear', () => {
    test('should clear all card data', () => {
      matrix.recordCardUsage({ id: 'c1', name: 'Card 1', damage: 5 }, { damage: 5 });
      matrix.recordCardUsage({ id: 'c2', name: 'Card 2', damage: 10 }, { damage: 10 });

      matrix.clear();

      expect(matrix.getSize()).toBe(0);
    });
  });
});

describe('PerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  afterEach(() => {
    tracker.reset();
  });

  describe('recordBattlePerformance', () => {
    test('should record basic battle data', () => {
      const battleData = {
        battleId: 'battle_001',
        victory: true,
        turnsElapsed: 8,
        playerHPChange: -20,
        enemyHPChange: -80,
        metrics: { energySpent: 10, energyEfficiency: 75 }
      };

      const metrics = tracker.recordBattlePerformance(battleData);

      expect(metrics.totalBattles).toBe(1);
      expect(metrics.totalWins).toBe(1);
      expect(metrics.totalLosses).toBe(0);
    });

    test('should track loss correctly', () => {
      const battleData = {
        victory: false,
        defeat: true,
        turnsElapsed: 5,
        playerHPChange: -50,
        enemyHPChange: -30
      };

      tracker.recordBattlePerformance(battleData);
      const metrics = tracker.getMetrics();

      expect(metrics.totalLosses).toBe(1);
      expect(metrics.currentWinStreak).toBe(0);
    });

    test('should calculate average damage per battle', () => {
      tracker.recordBattlePerformance({
        victory: true,
        turnsElapsed: 5,
        enemyHPChange: -30
      });
      tracker.recordBattlePerformance({
        victory: true,
        turnsElapsed: 6,
        enemyHPChange: -50
      });

      const metrics = tracker.getMetrics();
      expect(metrics.avgDamagePerBattle).toBe(40);
    });

    test('should calculate average turns per battle', () => {
      tracker.recordBattlePerformance({ victory: true, turnsElapsed: 5, enemyHPChange: -30 });
      tracker.recordBattlePerformance({ victory: true, turnsElapsed: 10, enemyHPChange: -30 });

      const metrics = tracker.getMetrics();
      expect(metrics.avgTurnsPerBattle).toBe(7.5);
    });

    test('should track win streak correctly', () => {
      tracker.recordBattlePerformance({ victory: true });
      tracker.recordBattlePerformance({ victory: true });
      tracker.recordBattlePerformance({ victory: false });

      const metrics = tracker.getMetrics();
      expect(metrics.currentWinStreak).toBe(0);
      expect(metrics.bestWinStreak).toBe(2);
    });

    test('should limit history size', () => {
      const smallTracker = new PerformanceTracker({ maxHistorySize: 3 });

      for (let i = 0; i < 5; i++) {
        smallTracker.recordBattlePerformance({ victory: i % 2 === 0 });
      }

      expect(smallTracker.getHistory().length).toBe(3);
    });
  });

  describe('getPerformanceTrend', () => {
    test('should return neutral trend for insufficient data', () => {
      const trend = tracker.getPerformanceTrend();

      expect(trend.winRate).toBe(0);
      expect(trend.trend).toBe('neutral');
    });

    test('should return improving trend for high win rate', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordBattlePerformance({
          victory: true,
          turnsElapsed: 5,
          playerHPChange: -10,
          enemyHPChange: -30
        });
      }

      const trend = tracker.getPerformanceTrend();
      expect(trend.trend).toBe('improving');
      expect(trend.winRate).toBe(1);
    });

    test('should return declining trend for low win rate', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordBattlePerformance({
          victory: false,
          defeat: true,
          turnsElapsed: 5,
          playerHPChange: -50,
          enemyHPChange: -10
        });
      }

      const trend = tracker.getPerformanceTrend();
      expect(trend.trend).toBe('declining');
      expect(trend.winRate).toBe(0);
    });

    test('should respect window size', () => {
      for (let i = 0; i < 20; i++) {
        tracker.recordBattlePerformance({
          victory: i < 15,
          turnsElapsed: 5,
          enemyHPChange: -30
        });
      }

      const trend = tracker.getPerformanceTrend(5);
      expect(trend.sampleSize).toBe(5);
    });
  });

  describe('getHistory', () => {
    test('should return copy of history', () => {
      tracker.recordBattlePerformance({ victory: true });
      tracker.recordBattlePerformance({ victory: false });

      const history = tracker.getHistory();
      history.push({ test: 'modification' });

      expect(tracker.getHistory().length).toBe(2);
    });
  });

  describe('getMetrics', () => {
    test('should return copy of metrics', () => {
      tracker.recordBattlePerformance({ victory: true });

      const metrics = tracker.getMetrics();
      metrics.totalBattles = 999;

      expect(tracker.getMetrics().totalBattles).toBe(1);
    });
  });

  describe('reset', () => {
    test('should reset all metrics', () => {
      tracker.recordBattlePerformance({ victory: true });
      tracker.recordBattlePerformance({ victory: true });
      tracker.recordBattlePerformance({ victory: false });

      tracker.reset();

      const metrics = tracker.getMetrics();
      expect(metrics.totalBattles).toBe(0);
      expect(metrics.totalWins).toBe(0);
      expect(metrics.totalLosses).toBe(0);
    });
  });
});

describe('CombatFeedbackAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CombatFeedbackAnalyzer();
  });

  afterEach(() => {
    analyzer.reset();
  });

  describe('analyzeBattleFeedback', () => {
    test('should analyze battle feedback with deck', () => {
      const battleData = {
        battleId: 'feedback_001',
        victory: true,
        turnsElapsed: 8,
        playerHPChange: -15,
        enemyHPChange: -70,
        metrics: { energySpent: 10, energyEfficiency: 80 }
      };
      const deck = [
        { id: 'strike', name: 'Strike', damage: 6, cost: 1 },
        { id: 'defend', name: 'Defend', damage: 0, cost: 1, effects: [{ type: 'armor', value: 5 }] }
      ];

      const feedback = analyzer.analyzeBattleFeedback(battleData, deck);

      expect(feedback.performance).toBeDefined();
      expect(feedback.trend).toBeDefined();
      expect(feedback.topCards).toBeDefined();
      expect(feedback.bottomCards).toBeDefined();
      expect(feedback.insights).toBeDefined();
      expect(feedback.recommendations).toBeDefined();
      expect(feedback.timestamp).toBeDefined();
    });

    test('should record performance from battle', () => {
      const battleData = {
        victory: true,
        turnsElapsed: 6,
        enemyHPChange: -50
      };

      analyzer.analyzeBattleFeedback(battleData, []);
      const metrics = analyzer.getPerformanceTracker().getMetrics();

      expect(metrics.totalBattles).toBe(1);
    });

    test('should record deck card usage', () => {
      const battleData = { victory: true };
      const deck = [
        { id: 'strike', name: 'Strike', damage: 10, cost: 1 }
      ];

      analyzer.analyzeBattleFeedback(battleData, deck);
      const matrix = analyzer.getEffectivenessMatrix();

      expect(matrix.getSize()).toBe(1);
    });

    test('should cache feedback results', () => {
      const battleData = { battleId: 'cached_battle', victory: true };

      analyzer.analyzeBattleFeedback(battleData, []);
      const cached = analyzer.getCachedFeedback('feedback_cached_battle');

      expect(cached).toBeDefined();
      expect(cached.performance.totalBattles).toBe(1);
    });

    test('should return cached result on second call', () => {
      const battleData = { battleId: 'test_battle', victory: true };

      analyzer.analyzeBattleFeedback(battleData, []);
      analyzer.getPerformanceTracker().reset();

      const cached = analyzer.analyzeBattleFeedback(battleData, []);

      expect(cached.performance.totalBattles).toBe(1);
    });
  });

  describe('recordDeckUsage', () => {
    test('should record card with healing effect', () => {
      const battleData = { victory: true };
      const deck = [
        { id: 'heal', name: 'Heal', damage: 0, cost: 2, effects: [{ type: 'heal', value: 8 }] }
      ];

      analyzer.analyzeBattleFeedback(battleData, deck);
      const entry = analyzer.getEffectivenessMatrix().getCardEffectiveness('heal');

      expect(entry.healingDone).toBe(8);
    });

    test('should record card with armor effect', () => {
      const battleData = { victory: true };
      const deck = [
        { id: 'defend', name: 'Defend', damage: 0, cost: 1, effects: [{ type: 'armor', value: 6 }] }
      ];

      analyzer.analyzeBattleFeedback(battleData, deck);
      const entry = analyzer.getEffectivenessMatrix().getCardEffectiveness('defend');

      expect(entry.armorGained).toBe(6);
    });
  });

  describe('generateInsights', () => {
    test('should generate positive insight for high win rate', () => {
      const battleData = { victory: true };
      const performance = { totalBattles: 10, totalWins: 8 };
      const trend = { winRate: 0.8 };

      const insights = analyzer.generateInsights(battleData, performance, trend);

      expect(insights.some(i => i.severity === 'positive')).toBe(true);
    });

    test('should generate negative insight for low win rate', () => {
      const battleData = { victory: false };
      const performance = { totalBattles: 10, totalWins: 2 };
      const trend = { winRate: 0.2 };

      const insights = analyzer.generateInsights(battleData, performance, trend);

      expect(insights.some(i => i.severity === 'negative')).toBe(true);
    });

    test('should generate warning for long battles', () => {
      const battleData = { metrics: { energyEfficiency: 50 } };
      const performance = { avgTurnsPerBattle: 20, totalBattles: 5, totalWins: 3 };
      const trend = { winRate: 0.5 };

      const insights = analyzer.generateInsights(battleData, performance, trend);

      expect(insights.some(i => i.category === 'battleLength')).toBe(true);
    });

    test('should generate warning for low energy efficiency', () => {
      const battleData = { metrics: { energyEfficiency: 40 } };
      const performance = { totalBattles: 5, totalWins: 2 };
      const trend = { winRate: 0.4 };

      const insights = analyzer.generateInsights(battleData, performance, trend);

      expect(insights.some(i => i.category === 'energyManagement')).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    test('should recommend deck revision when declining', () => {
      const trend = { trend: 'declining', winRate: 0.2 };
      const topCards = [];
      const bottomCards = [];

      const recommendations = analyzer.generateRecommendations(trend, topCards, bottomCards);

      expect(recommendations.some(r => r.title === 'Recover Performance')).toBe(true);
    });

    test('should recommend replacing low performers', () => {
      const trend = { trend: 'neutral' };
      const topCards = [];
      const bottomCards = [{ name: 'Weak Card', effectivenessScore: 0.1 }];

      const recommendations = analyzer.generateRecommendations(trend, topCards, bottomCards);

      expect(recommendations.some(r => r.title === 'Replace Low Performers')).toBe(true);
    });

    test('should recommend leveraging top performers', () => {
      const trend = { trend: 'improving' };
      const topCards = [{ name: 'Strong Card', effectivenessScore: 0.9 }];
      const bottomCards = [];

      const recommendations = analyzer.generateRecommendations(trend, topCards, bottomCards);

      expect(recommendations.some(r => r.title === 'Leverage Top Performers')).toBe(true);
    });
  });

  describe('cacheFeedback', () => {
    test('should cache feedback with timestamp', () => {
      const feedback = { performance: { totalBattles: 1 } };
      analyzer.cacheFeedback('test_key', feedback);

      const cached = analyzer.getCachedFeedback('test_key');
      expect(cached.performance.totalBattles).toBe(1);
    });

    test('should return null for expired cache', () => {
      analyzer.cacheTimeout = 100;
      const feedback = { performance: { totalBattles: 1 } };
      analyzer.cacheFeedback('expired_key', feedback);

      // Simulate time passing
      const cacheEntry = analyzer.feedbackCache.get('expired_key');
      cacheEntry.timestamp = Date.now() - 200;

      const cached = analyzer.getCachedFeedback('expired_key');
      expect(cached).toBeNull();
    });
  });

  describe('clearCache', () => {
    test('should clear all cached feedback', () => {
      analyzer.cacheFeedback('key1', { data: 1 });
      analyzer.cacheFeedback('key2', { data: 2 });

      analyzer.clearCache();

      expect(analyzer.feedbackCache.size).toBe(0);
    });
  });

  describe('getters', () => {
    test('should return effectiveness matrix instance', () => {
      const matrix = analyzer.getEffectivenessMatrix();
      expect(matrix).toBeInstanceOf(CardEffectivenessMatrix);
    });

    test('should return performance tracker instance', () => {
      const tracker = analyzer.getPerformanceTracker();
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });
  });

  describe('reset', () => {
    test('should reset all internal state', () => {
      analyzer.analyzeBattleFeedback(
        { battleId: 'reset_test', victory: true },
        [{ id: 'card1', name: 'Card 1', damage: 5 }]
      );

      analyzer.reset();

      expect(analyzer.getEffectivenessMatrix().getSize()).toBe(0);
      expect(analyzer.getPerformanceTracker().getMetrics().totalBattles).toBe(0);
    });
  });
});

describe('Integration Tests', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CombatFeedbackAnalyzer();
  });

  afterEach(() => {
    analyzer.reset();
  });

  test('should work as complete workflow', () => {
    // Simulate multiple battles with different decks
    const battles = [
      {
        battleId: 'battle_1',
        victory: true,
        turnsElapsed: 6,
        playerHPChange: -15,
        enemyHPChange: -60,
        metrics: { energySpent: 8, energyEfficiency: 75 }
      },
      {
        battleId: 'battle_2',
        victory: true,
        turnsElapsed: 8,
        playerHPChange: -25,
        enemyHPChange: -70,
        metrics: { energySpent: 12, energyEfficiency: 65 }
      },
      {
        battleId: 'battle_3',
        victory: false,
        defeat: true,
        turnsElapsed: 4,
        playerHPChange: -80,
        enemyHPChange: -30,
        metrics: { energySpent: 6, energyEfficiency: 50 }
      }
    ];

    const deck = [
      { id: 'strike', name: 'Strike', damage: 6, cost: 1 },
      { id: 'defend', name: 'Defend', damage: 0, cost: 1, effects: [{ type: 'armor', value: 5 }] },
      { id: 'heal', name: 'Heal', damage: 0, cost: 2, effects: [{ type: 'heal', value: 8 }] }
    ];

    for (const battle of battles) {
      analyzer.analyzeBattleFeedback(battle, deck);
    }

    const feedback = analyzer.analyzeBattleFeedback(
      { battleId: 'battle_4', victory: true },
      deck
    );

    expect(feedback.performance.totalBattles).toBeGreaterThanOrEqual(4);
    expect(feedback.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty deck', () => {
    const battleData = { victory: true, turnsElapsed: 5 };

    const feedback = analyzer.analyzeBattleFeedback(battleData, []);

    expect(feedback.performance).toBeDefined();
  });

  test('should handle performance spike', () => {
    const tracker = analyzer.getPerformanceTracker();
    
    // Record several losses first
    for (let i = 0; i < 5; i++) {
      tracker.recordBattlePerformance({
        victory: false,
        defeat: true,
        turnsElapsed: 4,
        playerHPChange: -50,
        enemyHPChange: -10
      });
    }

    // Then record several wins
    for (let i = 0; i < 7; i++) {
      tracker.recordBattlePerformance({
        victory: true,
        turnsElapsed: 6,
        playerHPChange: -15,
        enemyHPChange: -60
      });
    }

    // Check the most recent battles - last 5 should all be wins
    const history = tracker.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(5);
    
    // Verify last 5 are wins
    const last5 = history.slice(-5);
    expect(last5.every(e => e.victory === true)).toBe(true);
    
    // Recent trend should show improvement
    const trend = tracker.getPerformanceTrend(5);
    expect(trend.winRate).toBe(1);
  });
});

describe('Edge Cases', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CombatFeedbackAnalyzer();
  });

  afterEach(() => {
    analyzer.reset();
  });

  test('should handle battle with no metrics', () => {
    const battleData = { victory: true };

    const feedback = analyzer.analyzeBattleFeedback(battleData, []);

    expect(feedback.performance).toBeDefined();
  });

  test('should handle deck with many cards', () => {
    const battleData = { victory: true };
    const deck = Array.from({ length: 20 }, (_, i) => ({
      id: `card_${i}`,
      name: `Card ${i}`,
      damage: Math.floor(Math.random() * 15) + 1,
      cost: Math.floor(Math.random() * 3) + 1
    }));

    const feedback = analyzer.analyzeBattleFeedback(battleData, deck);

    expect(analyzer.getEffectivenessMatrix().getSize()).toBe(20);
  });

  test('should handle rapid cache expiry', () => {
    analyzer.cacheTimeout = 100;

    analyzer.cacheFeedback('quick_key', { data: 'quick' });
    
    // Manually expire the cache by setting timestamp in the past
    const cacheEntry = analyzer.feedbackCache.get('quick_key');
    cacheEntry.timestamp = Date.now() - 200;

    const cached = analyzer.getCachedFeedback('quick_key');
    expect(cached).toBeNull();
  });

  test('should handle missing battleId', () => {
    const battleData = { victory: true };

    const feedback1 = analyzer.analyzeBattleFeedback(battleData, []);
    const feedback2 = analyzer.analyzeBattleFeedback(battleData, []);

    expect(feedback1.timestamp).toBeDefined();
    expect(feedback2.timestamp).toBeDefined();
  });
});