/**
 * Challenge Reward Pool (Iteration 5/9)
 * 奖励池管理（卡牌/材料/称号）+ 稀有度权重 + 奖励发放逻辑
 */

class ChallengeRewardPool {
  constructor(options = {}) {
    this.cardPool = options.cardPool || [];
    this.materialPool = options.materialPool || [];
    this.titlePool = options.titlePool || [];
    this.rarityWeights = {
      common: 100,
      rare: 60,
      epic: 30,
      legendary: 10
    };
    this.rarityValues = {
      common: 10,
      rare: 30,
      epic: 70,
      legendary: 200
    };
  }

  /**
   * 添加卡牌奖励到奖励池
   * @param {object} card - 卡牌奖励
   */
  addCardReward(card) {
    this.cardPool.push({
      id: card.id,
      name: card.name || card.id,
      rarity: card.rarity || 'common',
      weight: card.weight || this.rarityWeights[card.rarity] || 50,
      type: 'card'
    });
  }

  /**
   * 添加材料奖励到奖励池
   * @param {object} material - 材料奖励
   */
  addMaterialReward(material) {
    this.materialPool.push({
      id: material.id,
      name: material.name || material.id,
      quantity: material.quantity || 1,
      value: material.value || 10,
      type: 'material'
    });
  }

  /**
   * 添加称号奖励到奖励池
   * @param {object} title - 称号奖励
   */
  addTitleReward(title) {
    this.titlePool.push({
      id: title.id,
      name: title.name || title.id,
      description: title.description || '',
      type: 'title'
    });
  }

  /**
   * 从奖励池获取随机奖励
   * @param {string} poolType - 池类型 (card/material/title)
   * @returns {object|null}
   */
  getRandomReward(poolType) {
    let pool;
    switch (poolType) {
      case 'card':
        pool = this.cardPool;
        break;
      case 'material':
        pool = this.materialPool;
        break;
      case 'title':
        pool = this.titlePool;
        break;
      default:
        pool = [];
    }

    if (pool.length === 0) return null;

    const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 50), 0);
    let random = Math.random() * totalWeight;

    for (const item of pool) {
      random -= (item.weight || 50);
      if (random <= 0) return item;
    }

    return pool[pool.length - 1];
  }

  /**
   * 根据稀有度获取奖励
   * @param {string} poolType - 池类型
   * @param {string} rarity - 稀有度
   * @returns {object|null}
   */
  getRewardByRarity(poolType, rarity) {
    let pool;
    switch (poolType) {
      case 'card':
        pool = this.cardPool.filter(c => c.rarity === rarity);
        break;
      case 'material':
        pool = this.materialPool;
        break;
      case 'title':
        pool = this.titlePool;
        break;
      default:
        pool = [];
    }

    if (pool.length === 0) return null;

    const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 50), 0);
    let random = Math.random() * totalWeight;

    for (const item of pool) {
      random -= (item.weight || 50);
      if (random <= 0) return item;
    }

    return pool[pool.length - 1];
  }

  /**
   * 计算奖励价值
   * @param {object} reward - 奖励对象
   * @returns {number}
   */
  calculateRewardValue(reward) {
    if (!reward) return 0;

    if (reward.type === 'card') {
      return this.rarityValues[reward.rarity] || 10;
    }

    if (reward.type === 'material') {
      return reward.value * reward.quantity;
    }

    if (reward.type === 'title') {
      return 100;
    }

    return 0;
  }

  /**
   * 发放奖励
   * @param {number} count - 奖励数量
   * @param {object} options - 选项 { cardCount, materialCount, titleCount }
   * @returns {object[]} 奖励列表
   */
  distributeRewards(count, options = {}) {
    const rewards = [];
    const cardCount = options.cardCount || Math.ceil(count * 0.5);
    const materialCount = options.materialCount || Math.floor(count * 0.3);
    const titleCount = options.titleCount || Math.min(1, count - cardCount - materialCount);

    for (let i = 0; i < cardCount; i++) {
      const reward = this.getRandomReward('card');
      if (reward) rewards.push(reward);
    }

    for (let i = 0; i < materialCount; i++) {
      const reward = this.getRandomReward('material');
      if (reward) rewards.push(reward);
    }

    for (let i = 0; i < titleCount; i++) {
      const reward = this.getRandomReward('title');
      if (reward) rewards.push(reward);
    }

    return rewards;
  }

  /**
   * 获取奖励池大小
   * @returns {number}
   */
  getPoolSize() {
    return this.cardPool.length + this.materialPool.length + this.titlePool.length;
  }

  /**
   * 清空奖励池
   * @param {string} poolType - 池类型，可选
   */
  clearPool(poolType) {
    switch (poolType) {
      case 'card':
        this.cardPool = [];
        break;
      case 'material':
        this.materialPool = [];
        break;
      case 'title':
        this.titlePool = [];
        break;
      default:
        this.cardPool = [];
        this.materialPool = [];
        this.titlePool = [];
    }
  }

  /**
   * 获取奖励池摘要
   * @returns {object}
   */
  getRewardSummary() {
    return {
      cardCount: this.cardPool.length,
      materialCount: this.materialPool.length,
      titleCount: this.titlePool.length,
      totalValue: this.calculateTotalValue()
    };
  }

  /**
   * 计算奖励池总价值
   * @returns {number}
   */
  calculateTotalValue() {
    let total = 0;

    for (const card of this.cardPool) {
      total += this.rarityValues[card.rarity] || 10;
    }

    for (const material of this.materialPool) {
      total += (material.value || 10) * (material.quantity || 1);
    }

    total += this.titlePool.length * 100;

    return total;
  }
}

module.exports = { ChallengeRewardPool };