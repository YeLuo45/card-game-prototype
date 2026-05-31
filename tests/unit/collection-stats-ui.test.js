/**
 * Collection Stats UI Tests
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 */

const {
  CollectionStatsUI
} = require('../../src/collection-stats-ui');

describe('CollectionStatsUI', () => {
  let ui;
  const mockRegistry = {
    getOwnedCardIds: () => ['c1', 'c2'],
    getCollectionProgress: (allCards) => ({
      owned: 2,
      total: 5,
      percentage: 40
    }),
    getRarityDistribution: (allCards) => ({
      common: 2,
      rare: 0,
      epic: 0,
      legendary: 0
    })
  };
  const mockRecommender = {
    getRecommendations: (allCards, ownedIds, options) => [
      {
        card: { id: 'r1', name: 'Rare 1', rarity: 'rare' },
        priority: 8,
        reasons: ['High power', 'Control synergy']
      }
    ],
    getCompletionEstimate: (allCards, ownedIds) => ({
      missingCount: 3,
      totalCost: { dust: 300, gold: 150 },
      percentage: 40
    })
  };
  const mockTracker = {
    getAllSetCompletions: () => ({
      core: { owned: 2, total: 3, percentage: 66.67 },
      expansion: { owned: 0, total: 2, percentage: 0 },
      overall: { owned: 2, total: 5, percentage: 40 }
    }),
    getProgressVisualization: () => ({
      sets: [
        { name: 'core', percentage: 66.67, filledBars: 2, emptyBars: 1 },
        { name: 'expansion', percentage: 0, filledBars: 0, emptyBars: 2 }
      ]
    })
  };

  beforeEach(() => {
    ui = new CollectionStatsUI(mockRegistry, mockRecommender, mockTracker);
  });

  describe('constructor', () => {
    test('initializes with registry, recommender, and tracker', () => {
      expect(ui.registry).toBe(mockRegistry);
      expect(ui.recommender).toBe(mockRecommender);
      expect(ui.tracker).toBe(mockTracker);
    });
  });

  describe('renderStatsPanel', () => {
    test('returns a stats panel element', () => {
      const panel = ui.renderStatsPanel();
      expect(panel).toBeDefined();
      expect(panel.tagName || panel.element).toBeDefined();
    });

    test('includes progress information', () => {
      const panel = ui.renderStatsPanel();
      const html = panel.innerHTML || panel;
      expect(html).toContain('40');
    });

    test('returns object with expected structure', () => {
      const panel = ui.renderStatsPanel();
      expect(panel.progress).toBeDefined();
      expect(panel.stats).toBeDefined();
    });
  });

  describe('renderProgressBar', () => {
    test('returns progress bar element', () => {
      const bar = ui.renderProgressBar(50);
      expect(bar).toBeDefined();
    });

    test('reflects percentage correctly', () => {
      const bar = ui.renderProgressBar(75);
      const html = bar.innerHTML || bar;
      expect(html).toContain('75');
    });

    test('handles 0% correctly', () => {
      const bar = ui.renderProgressBar(0);
      const html = bar.innerHTML || bar;
      expect(html).toContain('0');
    });

    test('handles 100% correctly', () => {
      const bar = ui.renderProgressBar(100);
      const html = bar.innerHTML || bar;
      expect(html).toContain('100');
    });
  });

  describe('renderRarityBreakdown', () => {
    test('returns rarity breakdown element', () => {
      const breakdown = ui.renderRarityBreakdown();
      expect(breakdown).toBeDefined();
    });

    test('includes all rarity categories', () => {
      const breakdown = ui.renderRarityBreakdown();
      const html = breakdown.innerHTML || breakdown;
      expect(html).toContain('common');
      expect(html).toContain('rare');
      expect(html).toContain('epic');
      expect(html).toContain('legendary');
    });

    test('displays correct counts', () => {
      const breakdown = ui.renderRarityBreakdown();
      const html = breakdown.innerHTML || breakdown;
      expect(html).toContain('2');
    });
  });

  describe('renderRecommendationsList', () => {
    test('returns recommendations list element', () => {
      const list = ui.renderRecommendationsList();
      expect(list).toBeDefined();
    });

    test('includes recommendation items', () => {
      const list = ui.renderRecommendationsList();
      const html = list.innerHTML || list;
      expect(html).toContain('Rare 1');
    });

    test('handles empty recommendations', () => {
      const emptyRecommender = {
        getRecommendations: () => []
      };
      const emptyUI = new CollectionStatsUI(mockRegistry, emptyRecommender, mockTracker);
      const list = emptyUI.renderRecommendationsList();
      expect(list).toBeDefined();
    });
  });

  describe('renderSetProgress', () => {
    test('returns set progress visualization', () => {
      const progress = ui.renderSetProgress();
      expect(progress).toBeDefined();
    });

    test('includes all tracked sets', () => {
      const progress = ui.renderSetProgress();
      const html = progress.innerHTML || progress;
      expect(html).toContain('core');
      expect(html).toContain('expansion');
    });

    test('shows bar representation', () => {
      const progress = ui.renderSetProgress();
      const html = progress.innerHTML || progress;
      // Uses █ (filled) and ░ (empty) block characters
      expect(html).toMatch(/[█░]/);
    });
  });

  describe('renderCompletionEstimate', () => {
    test('returns completion estimate element', () => {
      const estimate = ui.renderCompletionEstimate();
      expect(estimate).toBeDefined();
    });

    test('includes missing card count', () => {
      const estimate = ui.renderCompletionEstimate();
      const html = estimate.innerHTML || estimate;
      expect(html).toContain('3');
    });

    test('includes resource cost', () => {
      const estimate = ui.renderCompletionEstimate();
      const html = estimate.innerHTML || estimate;
      expect(html).toContain('dust') || html.includes('300');
    });
  });

  describe('getFullCollectionReport', () => {
    test('returns comprehensive report', () => {
      const report = ui.getFullCollectionReport();
      expect(report).toBeDefined();
      expect(report.progress).toBeDefined();
      expect(report.rarity).toBeDefined();
      expect(report.sets).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.estimate).toBeDefined();
    });

    test('includes timestamp', () => {
      const report = ui.getFullCollectionReport();
      expect(report.timestamp).toBeDefined();
    });
  });

  describe('updateDisplay', () => {
    test('updates the display with new data', () => {
      const display = ui.updateDisplay();
      expect(display).toBeDefined();
    });

    test('refreshes all sections', () => {
      const display = ui.updateDisplay();
      expect(display.progress).toBeDefined();
      expect(display.rarity).toBeDefined();
      expect(display.recommendations).toBeDefined();
    });
  });
});