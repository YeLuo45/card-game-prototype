/**
 * Performance Report Generator Tests
 * Tests PerformanceReportGenerator: periodic reports, visualization, milestones
 */

const { PerformanceReportGenerator } = require('../../src/performance-report-generator.js');

describe('PerformanceReportGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new PerformanceReportGenerator();
  });

  describe('constructor', () => {
    test('initializes with default settings', () => {
      expect(generator.reportInterval).toBe(5);
      expect(generator.milestones).toEqual({});
    });

    test('initializes with custom options', () => {
      const custom = new PerformanceReportGenerator({ reportInterval: 10 });
      expect(custom.reportInterval).toBe(10);
    });
  });

  describe('generateReport', () => {
    test('generates report from metrics', () => {
      const metrics = {
        totalDamage: 1000,
        totalHealing: 200,
        totalBlocking: 300,
        battlesCount: 10,
        victories: 7,
        averageDamagePerBattle: 100
      };
      const efficiency = {
        damagePerEnergy: 5,
        healingPerEnergy: 2
      };

      const report = generator.generateReport(metrics, efficiency);

      expect(report.summary.totalDamage).toBe(1000);
      expect(report.summary.winRate).toBe(70);
      expect(report.efficiency.damagePerEnergy).toBe(5);
    });

    test('includes all required sections', () => {
      const report = generator.generateReport({}, {});

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('efficiency');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('timestamp');
    });
  });

  describe('generateVisualization', () => {
    test('returns chart-ready data', () => {
      const battleHistory = [
        { battleId: 'b1', damage: 50, energy: 5, victory: true },
        { battleId: 'b2', damage: 70, energy: 6, victory: true },
        { battleId: 'b3', damage: 40, energy: 4, victory: false }
      ];

      const viz = generator.generateVisualization(battleHistory);

      expect(viz.labels).toHaveLength(3);
      expect(viz.datasets).toBeDefined();
      expect(viz.datasets[0].data).toHaveLength(3);
    });

    test('returns empty for no history', () => {
      const viz = generator.generateVisualization([]);
      expect(viz.labels).toHaveLength(0);
    });
  });

  describe('trackMilestone', () => {
    test('tracks first victory milestone', () => {
      generator.trackMilestone('firstVictory', 1);
      expect(generator.milestones.firstVictory).toBe(1);
    });

    test('tracks damage milestone', () => {
      generator.trackMilestone('damage1000', 1000);
      expect(generator.milestones.damage1000).toBe(1000);
    });

    test('detects new milestones', () => {
      generator.trackMilestone('damage500', 500);
      generator.trackMilestone('damage1000', 1000);

      const newMilestones = generator.getNewMilestones(500);
      expect(newMilestones).toContain('damage1000');
      expect(newMilestones).not.toContain('damage500');
    });
  });

  describe('getAchievements', () => {
    test('returns list of achievements', () => {
      generator.milestones = {
        firstVictory: true,
        damage1000: true,
        winStreak5: true
      };

      const achievements = generator.getAchievements();

      expect(achievements.length).toBe(3);
    });

    test('returns empty when no milestones', () => {
      const achievements = generator.getAchievements();
      expect(achievements).toHaveLength(0);
    });
  });

  describe('generateComparisonReport', () => {
    test('compares two time periods', () => {
      const period1 = { damage: 100, energy: 20, victories: 3 };
      const period2 = { damage: 150, energy: 20, victories: 5 };

      const comparison = generator.generateComparisonReport(period1, period2);

      expect(comparison.damageChange).toBe(50);
      expect(comparison.victoriesChange).toBe(2);
      expect(comparison.efficiencyChange).toBe(2.5); // (150/20) - (100/20) = 7.5 - 5 = 2.5
    });

    test('handles zero values', () => {
      const comparison = generator.generateComparisonReport({ damage: 0 }, { damage: 100 });
      expect(comparison.damageChange).toBe(100);
    });
  });

  describe('exportReport', () => {
    test('exports report as JSON', () => {
      const report = generator.generateReport({ battlesCount: 5 }, {});
      const json = generator.exportReport(report);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.summary.battlesCount).toBe(5);
    });
  });

  describe('reset', () => {
    test('resets generator state', () => {
      generator.milestones = { firstVictory: true };
      generator.battleCount = 10;

      generator.reset();

      expect(generator.milestones).toEqual({});
      expect(generator.battleCount).toBe(0);
    });
  });
});