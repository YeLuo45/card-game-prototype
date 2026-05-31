/**
 * Challenge UI Tests
 * Tests ChallengeUI: challenge list display / progress tracking / reward claim interface
 */

const { ChallengeUI } = require('../../src/challenge-ui.js');

describe('ChallengeUI', () => {
  let ui;
  let mockManager;

  beforeEach(() => {
    mockManager = {
      challenges: [],
      progress: new Map(),
      getActiveChallenges: (includeCompleted = true) => {
        if (includeCompleted) return [...mockManager.challenges];
        return mockManager.challenges.filter(c => !mockManager.isCompleted(c.id));
      },
      getChallengeById: (id) => mockManager.challenges.find(c => c.id === id) || null,
      getProgress: (id) => mockManager.progress.get(id) || 0,
      isCompleted: (id) => {
        const c = mockManager.getChallengeById(id);
        return c ? mockManager.getProgress(id) >= c.target : false;
      },
      getCompletionPercentage: (id) => {
        const c = mockManager.getChallengeById(id);
        if (!c) return 0;
        const prog = mockManager.getProgress(id);
        return Math.min(Math.round((prog / c.target) * 100), 100);
      },
      claimReward: () => ({}),
      isClaimed: () => false,
      getChallengesByType: (type) => mockManager.challenges.filter(c => c.type === type)
    };

    ui = new ChallengeUI(mockManager);
  });

  describe('constructor', () => {
    test('initializes with manager reference', () => {
      expect(ui.manager).toBe(mockManager);
    });

    test('initializes with empty rendered content', () => {
      expect(ui.rendered).toBe(false);
    });
  });

  describe('render', () => {
    test('renders challenge list', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily', title: 'Win 3 Games', target: 3 }
      ];
      mockManager.progress.set('daily_1', 1);

      ui.render();
      expect(ui.rendered).toBe(true);
    });

    test('renders empty when no challenges', () => {
      ui.render();
      expect(ui.rendered).toBe(true);
    });
  });

  describe('renderChallengeCard', () => {
    test('renders challenge card HTML', () => {
      const challenge = {
        id: 'daily_1', type: 'daily', title: 'Win 3 Games', description: 'Win 3 games today',
        target: 3,
        rewards: [{ type: 'card', id: 'fireball' }]
      };
      mockManager.challenges.push(challenge);
      mockManager.progress.set('daily_1', 2);

      const html = ui.renderChallengeCard(challenge);
      expect(html).toContain('daily_1');
      expect(html).toContain('Win 3 Games');
      expect(html).toContain('67%');
    });

    test('shows completed state', () => {
      const challenge = {
        id: 'daily_1', type: 'daily', title: 'Win 3 Games',
        target: 3
      };
      mockManager.challenges.push(challenge);
      mockManager.progress.set('daily_1', 3);
      mockManager.isCompleted = (id) => id === 'daily_1';
      mockManager.isClaimed = () => false;

      const html = ui.renderChallengeCard(challenge);
      expect(html).toContain('completed');
    });
  });

  describe('renderProgressBar', () => {
    test('renders progress bar with percentage', () => {
      const html = ui.renderProgressBar(75);
      expect(html).toContain('75%');
      expect(html).toContain('width');
    });

    test('caps at 100%', () => {
      const html = ui.renderProgressBar(150);
      expect(html).toContain('100%');
    });
  });

  describe('renderRewardSection', () => {
    test('renders reward items', () => {
      const rewards = [
        { type: 'card', id: 'fireball' },
        { type: 'material', id: 'gold', quantity: 50 }
      ];

      const html = ui.renderRewardSection(rewards);
      expect(html).toContain('fireball');
      expect(html).toContain('gold');
    });

    test('renders empty for no rewards', () => {
      const html = ui.renderRewardSection([]);
      expect(html).toContain('No rewards');
    });
  });

  describe('filterByType', () => {
    test('filters daily challenges', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily' },
        { id: 'weekly_1', type: 'weekly' }
      ];

      ui.filterByType('daily');
      expect(ui.filteredType).toBe('daily');
    });

    test('filters weekly challenges', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily' },
        { id: 'weekly_1', type: 'weekly' }
      ];

      ui.filterByType('weekly');
      expect(ui.filteredType).toBe('weekly');
    });

    test('shows all when filter cleared', () => {
      ui.filterByType('all');
      expect(ui.filteredType).toBe('all');
    });
  });

  describe('showClaimModal', () => {
    test('displays claim modal for completed challenge', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily', target: 1, rewards: [{ type: 'card' }] }
      ];
      mockManager.progress.set('daily_1', 1);
      mockManager.claimReward = () => [{ type: 'card', id: 'fireball' }];

      ui.showClaimModal('daily_1');
      expect(ui.modalShown).toBe(true);
    });

    test('does not show modal for incomplete challenge', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily', target: 3 }
      ];
      mockManager.progress.set('daily_1', 2);

      ui.showClaimModal('daily_1');
      expect(ui.modalShown).toBe(false);
    });
  });

  describe('hideModal', () => {
    test('hides modal', () => {
      ui.modalShown = true;
      ui.hideModal();
      expect(ui.modalShown).toBe(false);
    });
  });

  describe('updateChallengeDisplay', () => {
    test('refreshes challenge display', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily', target: 3 }
      ];
      mockManager.progress.set('daily_1', 2);

      ui.render();
      ui.updateChallengeDisplay('daily_1');
      expect(ui.lastUpdated).not.toBeNull();
    });
  });

  describe('getChallengeIcon', () => {
    test('returns correct icon for daily', () => {
      const icon = ui.getChallengeIcon('daily');
      expect(icon).toBe('📅');
    });

    test('returns correct icon for weekly', () => {
      const icon = ui.getChallengeIcon('weekly');
      expect(icon).toBe('📆');
    });

    test('returns correct icon for seasonal', () => {
      const icon = ui.getChallengeIcon('seasonal');
      expect(icon).toBe('🏆');
    });
  });

  describe('getRewardIcon', () => {
    test('returns card icon', () => {
      const icon = ui.getRewardIcon({ type: 'card' });
      expect(icon).toBe('🃏');
    });

    test('returns material icon', () => {
      const icon = ui.getRewardIcon({ type: 'material' });
      expect(icon).toBe('💎');
    });

    test('returns title icon', () => {
      const icon = ui.getRewardIcon({ type: 'title' });
      expect(icon).toBe('👑');
    });
  });

  describe('animateProgress', () => {
    test('animates progress change', () => {
      ui.animateProgress('daily_1', 0, 100);
      expect(ui.animationActive).toBe(true);
    });
  });

  describe('showNotification', () => {
    test('displays notification', () => {
      ui.showNotification('Reward claimed!', 'success');
      expect(ui.notification).toEqual({
        message: 'Reward claimed!',
        type: 'success'
      });
    });
  });

  describe('clearNotification', () => {
    test('clears notification', () => {
      ui.notification = { message: 'test', type: 'info' };
      ui.clearNotification();
      expect(ui.notification).toBeNull();
    });
  });

  describe('refreshUI', () => {
    test('refreshes entire UI', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily', title: 'Test', target: 1 }
      ];
      mockManager.progress.set('daily_1', 1);

      ui.render();
      ui.refreshUI();

      expect(ui.lastUpdated).not.toBeNull();
    });
  });

  describe('getFilteredChallenges', () => {
    test('returns filtered challenge list', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily' },
        { id: 'weekly_1', type: 'weekly' }
      ];

      ui.filteredType = 'daily';
      const filtered = ui.getFilteredChallenges();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('daily_1');
    });

    test('returns all when filter is all', () => {
      mockManager.challenges = [
        { id: 'daily_1', type: 'daily' },
        { id: 'weekly_1', type: 'weekly' }
      ];

      ui.filteredType = 'all';
      const filtered = ui.getFilteredChallenges();
      expect(filtered.length).toBe(2);
    });
  });
});