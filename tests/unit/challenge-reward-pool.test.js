/**
 * Challenge Reward Pool Tests
 * Tests ChallengeRewardPool: reward pool management / rarity weighting / reward distribution
 */

const { ChallengeRewardPool } = require('../../src/challenge-reward-pool.js');

describe('ChallengeRewardPool', () => {
  let pool;

  beforeEach(() => {
    pool = new ChallengeRewardPool();
  });

  describe('constructor', () => {
    test('initializes with empty pools', () => {
      expect(pool.cardPool).toEqual([]);
      expect(pool.materialPool).toEqual([]);
      expect(pool.titlePool).toEqual([]);
    });

    test('initializes with custom config', () => {
      const customPool = new ChallengeRewardPool({
        cardPool: [{ id: 'fireball', rarity: 'legendary' }],
        materialPool: [{ id: 'gem', quantity: 10 }]
      });
      expect(customPool.cardPool.length).toBe(1);
    });
  });

  describe('addCardReward', () => {
    test('adds a card to pool', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'rare' });
      expect(pool.cardPool.length).toBe(1);
      expect(pool.cardPool[0].id).toBe('fireball');
    });

    test('adds multiple cards', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'rare' });
      pool.addCardReward({ id: 'iceblast', rarity: 'epic' });
      expect(pool.cardPool.length).toBe(2);
    });
  });

  describe('addMaterialReward', () => {
    test('adds material to pool', () => {
      pool.addMaterialReward({ id: 'gold', quantity: 100 });
      expect(pool.materialPool.length).toBe(1);
      expect(pool.materialPool[0].id).toBe('gold');
    });
  });

  describe('addTitleReward', () => {
    test('adds title to pool', () => {
      pool.addTitleReward({ id: 'champion', name: 'Season Champion' });
      expect(pool.titlePool.length).toBe(1);
      expect(pool.titlePool[0].id).toBe('champion');
    });
  });

  describe('getRandomReward', () => {
    test('returns null when pool is empty', () => {
      expect(pool.getRandomReward()).toBeNull();
    });

    test('returns card reward', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'common' });
      const reward = pool.getRandomReward('card');
      expect(reward).not.toBeNull();
      expect(reward.id).toBe('fireball');
    });

    test('returns material reward', () => {
      pool.addMaterialReward({ id: 'gold', quantity: 50 });
      const reward = pool.getRandomReward('material');
      expect(reward).not.toBeNull();
      expect(reward.id).toBe('gold');
    });

    test('returns title reward', () => {
      pool.addTitleReward({ id: 'champion', name: 'Champion' });
      const reward = pool.getRandomReward('title');
      expect(reward).not.toBeNull();
      expect(reward.id).toBe('champion');
    });
  });

  describe('getRewardByRarity', () => {
    test('returns common rewards with higher probability', () => {
      pool.addCardReward({ id: 'common_card', rarity: 'common', weight: 100 });
      pool.addCardReward({ id: 'legendary_card', rarity: 'legendary', weight: 1 });

      const reward = pool.getRewardByRarity('card', 'common');
      expect(reward).not.toBeNull();
      expect(reward.rarity).toBe('common');
    });

    test('returns rewards by specific rarity', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'rare' });
      pool.addCardReward({ id: 'dragon', rarity: 'legendary' });

      const rareReward = pool.getRewardByRarity('card', 'rare');
      expect(rareReward.rarity).toBe('rare');
    });
  });

  describe('calculateRewardValue', () => {
    test('returns 0 for null reward', () => {
      expect(pool.calculateRewardValue(null)).toBe(0);
    });

    test('calculates card value by rarity', () => {
      pool.addCardReward({ id: 'common_card', rarity: 'common' });
      pool.addCardReward({ id: 'legendary_card', rarity: 'legendary' });

      const commonCard = pool.getRewardByRarity('card', 'common');
      const legendaryCard = pool.getRewardByRarity('card', 'legendary');

      expect(pool.calculateRewardValue(commonCard)).toBeLessThan(
        pool.calculateRewardValue(legendaryCard)
      );
    });

    test('calculates material value', () => {
      pool.addMaterialReward({ id: 'gold', quantity: 100 });
      const material = pool.getRandomReward('material');
      const value = pool.calculateRewardValue(material);
      expect(value).toBeGreaterThan(0);
    });
  });

  describe('distributeRewards', () => {
    test('distributes single reward', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'rare' });
      const rewards = pool.distributeRewards(1);
      expect(rewards.length).toBe(1);
    });

    test('distributes multiple rewards', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'rare' });
      pool.addCardReward({ id: 'iceblast', rarity: 'rare' });
      pool.addMaterialReward({ id: 'gold', quantity: 50 });
      const rewards = pool.distributeRewards(3);
      expect(rewards.length).toBeGreaterThanOrEqual(2);
    });

    test('respects rarity weights', () => {
      pool.addCardReward({ id: 'common', rarity: 'common', weight: 1000 });
      pool.addCardReward({ id: 'legendary', rarity: 'legendary', weight: 1 });

      let commonCount = 0;
      let legendaryCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const reward = pool.getRewardByRarity('card', 'common');
        if (reward && reward.id === 'common') commonCount++;
        else if (reward && reward.id === 'legendary') legendaryCount++;
      }

      expect(commonCount).toBeGreaterThan(legendaryCount);
    });
  });

  describe('getPoolSize', () => {
    test('returns 0 for empty pool', () => {
      expect(pool.getPoolSize()).toBe(0);
    });

    test('counts all reward types', () => {
      pool.addCardReward({ id: 'card1', rarity: 'common' });
      pool.addMaterialReward({ id: 'gold', quantity: 50 });
      pool.addTitleReward({ id: 'title1', name: 'Title' });

      expect(pool.getPoolSize()).toBe(3);
    });
  });

  describe('clearPool', () => {
    test('clears card pool', () => {
      pool.addCardReward({ id: 'fireball', rarity: 'rare' });
      pool.clearPool('card');
      expect(pool.cardPool.length).toBe(0);
    });

    test('clears material pool', () => {
      pool.addMaterialReward({ id: 'gold', quantity: 50 });
      pool.clearPool('material');
      expect(pool.materialPool.length).toBe(0);
    });

    test('clears title pool', () => {
      pool.addTitleReward({ id: 'champion', name: 'Champion' });
      pool.clearPool('title');
      expect(pool.titlePool.length).toBe(0);
    });

    test('clears all pools', () => {
      pool.addCardReward({ id: 'card1', rarity: 'common' });
      pool.addMaterialReward({ id: 'gold', quantity: 50 });
      pool.addTitleReward({ id: 'title1', name: 'Title' });
      pool.clearPool();
      expect(pool.getPoolSize()).toBe(0);
    });
  });

  describe('getRewardSummary', () => {
    test('returns empty summary for empty pool', () => {
      const summary = pool.getRewardSummary();
      expect(summary.cardCount).toBe(0);
      expect(summary.materialCount).toBe(0);
      expect(summary.titleCount).toBe(0);
    });

    test('returns correct counts', () => {
      pool.addCardReward({ id: 'card1', rarity: 'common' });
      pool.addCardReward({ id: 'card2', rarity: 'rare' });
      pool.addMaterialReward({ id: 'gold', quantity: 50 });
      pool.addTitleReward({ id: 'title1', name: 'Title' });

      const summary = pool.getRewardSummary();
      expect(summary.cardCount).toBe(2);
      expect(summary.materialCount).toBe(1);
      expect(summary.titleCount).toBe(1);
    });
  });
});