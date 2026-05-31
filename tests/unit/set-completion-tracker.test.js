/**
 * Set Completion Tracker Tests
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 */

const {
  SetCompletionTracker
} = require('../../src/set-completion-tracker');

describe('SetCompletionTracker', () => {
  let tracker;
  const cardSets = {
    core: {
      name: 'Core Set',
      cards: [
        { id: 'c1', name: 'Card 1', rarity: 'common' },
        { id: 'c2', name: 'Card 2', rarity: 'common' },
        { id: 'r1', name: 'Rare 1', rarity: 'rare' }
      ],
      rewards: {
        complete: { dust: 100, gold: 50 }
      }
    },
    expansion: {
      name: 'Expansion Set',
      cards: [
        { id: 'e1', name: 'Epic 1', rarity: 'epic' },
        { id: 'l1', name: 'Legendary 1', rarity: 'legendary' }
      ],
      rewards: {
        complete: { dust: 200, gold: 100 }
      }
    }
  };

  beforeEach(() => {
    tracker = new SetCompletionTracker();
  });

  describe('addSet', () => {
    test('adds a card set to track', () => {
      tracker.addSet('core', cardSets.core);
      expect(tracker.getSetCompletion('core')).toBeDefined();
    });

    test('throws error for duplicate set name', () => {
      tracker.addSet('core', cardSets.core);
      expect(() => tracker.addSet('core', cardSets.core)).toThrow();
    });
  });

  describe('getSetCompletion', () => {
    test('returns 0% for set with no owned cards', () => {
      tracker.addSet('core', cardSets.core);
      const completion = tracker.getSetCompletion('core');
      expect(completion.percentage).toBe(0);
      expect(completion.owned).toBe(0);
      expect(completion.total).toBe(3);
    });

    test('calculates correct percentage', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.addOwnedCard('c2');
      const completion = tracker.getSetCompletion('core');
      expect(completion.percentage).toBeCloseTo(66.67, 1);
    });

    test('returns 100% when set is complete', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.addOwnedCard('c2');
      tracker.addOwnedCard('r1');
      const completion = tracker.getSetCompletion('core');
      expect(completion.percentage).toBe(100);
    });

    test('throws error for unknown set', () => {
      expect(() => tracker.getSetCompletion('unknown')).toThrow();
    });
  });

  describe('addOwnedCard', () => {
    test('marks card as owned and associates with set', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      expect(tracker.isCardOwned('c1')).toBe(true);
    });

    test('can be called multiple times without error', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.addOwnedCard('c1');
      expect(tracker.isCardOwned('c1')).toBe(true);
    });
  });

  describe('removeOwnedCard', () => {
    test('removes card from owned collection', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.removeOwnedCard('c1');
      expect(tracker.isCardOwned('c1')).toBe(false);
    });

    test('returns false for card that was not owned', () => {
      expect(tracker.removeOwnedCard('unknown')).toBe(false);
    });
  });

  describe('isCardOwned', () => {
    test('returns true for owned card', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      expect(tracker.isCardOwned('c1')).toBe(true);
    });

    test('returns false for unowned card', () => {
      expect(tracker.isCardOwned('unknown')).toBe(false);
    });
  });

  describe('getSetRewards', () => {
    test('returns rewards for incomplete set as 0', () => {
      tracker.addSet('core', cardSets.core);
      const rewards = tracker.getSetRewards('core');
      expect(rewards.dust).toBe(0);
      expect(rewards.gold).toBe(0);
    });

    test('returns full rewards when set is complete', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.addOwnedCard('c2');
      tracker.addOwnedCard('r1');
      const rewards = tracker.getSetRewards('core');
      expect(rewards.dust).toBe(100);
      expect(rewards.gold).toBe(50);
    });
  });

  describe('getAllSetCompletions', () => {
    test('returns completion status for all sets', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addSet('expansion', cardSets.expansion);
      const allCompletions = tracker.getAllSetCompletions();
      
      expect(allCompletions.core).toBeDefined();
      expect(allCompletions.expansion).toBeDefined();
    });

    test('calculates overall completion', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addSet('expansion', cardSets.expansion);
      const allCompletions = tracker.getAllSetCompletions();
      
      expect(allCompletions.overall).toBeDefined();
      expect(allCompletions.overall.total).toBe(5);
    });
  });

  describe('getProgressVisualization', () => {
    test('returns bar chart data', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      const viz = tracker.getProgressVisualization();
      
      expect(viz.sets).toBeDefined();
      expect(Array.isArray(viz.sets)).toBe(true);
    });

    test('includes percentage in visualization', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      const viz = tracker.getProgressVisualization();
      
      expect(viz.sets[0].percentage).toBeDefined();
      expect(viz.sets[0].filledBars).toBeDefined();
      expect(viz.sets[0].emptyBars).toBeDefined();
    });

    test('shows 0 bars filled for incomplete set', () => {
      tracker.addSet('core', cardSets.core);
      const viz = tracker.getProgressVisualization();
      
      expect(viz.sets[0].filledBars).toBe(0);
      expect(viz.sets[0].emptyBars).toBe(10); // totalBars is always 10
    });
  });

  describe('reset', () => {
    test('clears all owned cards', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.addOwnedCard('c2');
      tracker.reset();
      
      const completion = tracker.getSetCompletion('core');
      expect(completion.percentage).toBe(0);
    });

    test('keeps sets defined', () => {
      tracker.addSet('core', cardSets.core);
      tracker.addOwnedCard('c1');
      tracker.reset();
      
      expect(() => tracker.getSetCompletion('core')).not.toThrow();
    });
  });
});