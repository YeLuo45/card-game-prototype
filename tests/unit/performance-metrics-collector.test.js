/**
 * Performance Metrics Collector Tests
 * Tests PerformanceMetricsCollector: data collection, efficiency metrics, trends
 */

const { PerformanceMetricsCollector } = require('../../src/performance-metrics-collector.js');

describe('PerformanceMetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new PerformanceMetricsCollector();
  });

  describe('constructor', () => {
    test('initializes with empty metrics', () => {
      expect(collector.totalDamage).toBe(0);
      expect(collector.totalHealing).toBe(0);
      expect(collector.totalBlocking).toBe(0);
      expect(collector.totalEnergyUsed).toBe(0);
      expect(collector.battlesCount).toBe(0);
    });

    test('initializes with options', () => {
      const customCollector = new PerformanceMetricsCollector({ maxBattles: 100 });
      expect(customCollector.maxBattles).toBe(100);
    });
  });

  describe('recordDamage', () => {
    test('records damage dealt', () => {
      collector.recordDamage(10, 'strike');
      expect(collector.totalDamage).toBe(10);
      expect(collector.damageByCard.strike).toBe(10);
    });

    test('accumulates damage for same card', () => {
      collector.recordDamage(5, 'strike');
      collector.recordDamage(7, 'strike');
      expect(collector.damageByCard.strike).toBe(12);
    });

    test('tracks critical hits', () => {
      collector.recordDamage(15, 'strike', { critical: true });
      expect(collector.criticalHits).toBe(1);
      expect(collector.criticalDamage).toBe(15);
    });
  });

  describe('recordHealing', () => {
    test('records healing done', () => {
      collector.recordHealing(5);
      expect(collector.totalHealing).toBe(5);
    });

    test('accumulates healing', () => {
      collector.recordHealing(3);
      collector.recordHealing(4);
      expect(collector.totalHealing).toBe(7);
    });
  });

  describe('recordBlocking', () => {
    test('records damage blocked', () => {
      collector.recordBlocking(8);
      expect(collector.totalBlocking).toBe(8);
    });

    test('tracks block timing', () => {
      collector.recordBlocking(10, { turn: 3 });
      expect(collector.blocksByTurn[3]).toBe(10);
    });
  });

  describe('recordEnergyUsage', () => {
    test('records energy spent', () => {
      collector.recordEnergyUsage(2);
      expect(collector.totalEnergyUsed).toBe(2);
    });

    test('tracks energy by card', () => {
      collector.recordEnergyUsage(2, 'strike');
      expect(collector.energyByCard.strike).toBe(2);
    });

    test('detects wasted energy when card not played', () => {
      collector.recordEnergyWasted(1);
      expect(collector.wastedEnergy).toBe(1);
    });
  });

  describe('startBattle', () => {
    test('starts tracking a new battle', () => {
      collector.startBattle('battle_1');
      expect(collector.currentBattleId).toBe('battle_1');
      expect(collector.battlesCount).toBe(1);
    });

    test('initializes battle metrics', () => {
      collector.startBattle('battle_1');
      expect(collector.currentBattleMetrics.damage).toBe(0);
      expect(collector.currentBattleMetrics.energyUsed).toBe(0);
    });
  });

  describe('endBattle', () => {
    test('finalizes battle and calculates metrics', () => {
      collector.startBattle('battle_1');
      collector.recordDamage(20, 'strike');
      collector.recordEnergyUsage(3, 'strike');
      const result = collector.endBattle({ victory: true, turns: 10 });

      expect(result.victory).toBe(true);
      expect(result.damage).toBe(20);
      expect(collector.battleHistory.length).toBe(1);
    });

    test('calculates DPS for battle', () => {
      collector.startBattle('battle_1');
      collector.recordDamage(60, 'strike');
      const result = collector.endBattle({ victory: true, duration: 30000 });

      expect(result.dps).toBe(2); // 60 damage / 30 seconds
    });

    test('calculates energy efficiency', () => {
      collector.startBattle('battle_1');
      collector.recordDamage(30, 'strike');
      collector.recordEnergyUsage(5, 'strike');
      const result = collector.endBattle({ victory: true, turns: 5 });

      expect(result.energyEfficiency).toBe(6); // 30 damage / 5 energy
    });
  });

  describe('calculateEfficiency', () => {
    test('calculates overall efficiency score', () => {
      collector.totalDamage = 100;
      collector.totalHealing = 20;
      collector.totalBlocking = 30;
      collector.totalEnergyUsed = 10;

      const efficiency = collector.calculateEfficiency();

      expect(efficiency.damagePerEnergy).toBe(10);
      expect(efficiency.healingPerEnergy).toBe(2);
    });
  });

  describe('getPerformanceTrends', () => {
    test('returns trend data over battles', () => {
      collector.startBattle('b1');
      collector.recordDamage(50);
      collector.endBattle({ victory: true });

      collector.startBattle('b2');
      collector.recordDamage(70);
      collector.endBattle({ victory: true });

      const trends = collector.getPerformanceTrends();

      expect(trends.battleCount).toBe(2);
      expect(trends.averageDamage).toBe(60);
    });
  });

  describe('getCardPerformance', () => {
    test('returns performance for specific card', () => {
      collector.recordDamage(25, 'strike');
      collector.recordEnergyUsage(2, 'strike');

      const perf = collector.getCardPerformance('strike');

      expect(perf.damage).toBe(25);
      expect(perf.energyCost).toBe(2);
      expect(perf.damagePerEnergy).toBe(12.5);
    });
  });

  describe('reset', () => {
    test('resets all metrics', () => {
      collector.recordDamage(10, 'strike');
      collector.recordHealing(5);
      collector.battlesCount = 2;

      collector.reset();

      expect(collector.totalDamage).toBe(0);
      expect(collector.totalHealing).toBe(0);
      expect(collector.battlesCount).toBe(0);
    });
  });
});