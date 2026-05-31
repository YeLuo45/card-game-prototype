/**
 * Champion Title System (Iteration 9/9)
 * 冠军称号系统：铜/银/金/钻石/大师 + 展示
 */

class ChampionTitleSystem {
  constructor(options = {}) {
    this.titleLevels = {
      bronze: { level: 1, name: 'Bronze', icon: '♠', color: '#CD7F32' },
      silver: { level: 2, name: 'Silver', icon: '♣', color: '#C0C0C0' },
      gold: { level: 3, name: 'Gold', icon: '♥', color: '#FFD700' },
      diamond: { level: 4, name: 'Diamond', icon: '◆', color: '#B9F2FF' },
      master: { level: 5, name: 'Master', icon: '★', color: '#FF6B00' }
    };

    this.playerTitles = new Map();
    this.titleHistory = new Map();
  }

  /**
   * 授予称号
   * @param {string} playerId - 玩家ID
   * @param {string} titleLevel - 称号等级
   * @returns {boolean} 是否成功
   */
  grantTitle(playerId, titleLevel) {
    if (!this.titleLevels[titleLevel]) return false;

    const currentTitle = this.playerTitles.get(playerId);
    if (currentTitle) {
      const currentLevel = this.titleLevels[currentTitle].level;
      const newLevel = this.titleLevels[titleLevel].level;
      if (newLevel <= currentLevel) return false;
    }

    const previousTitle = this.playerTitles.get(playerId);
    this.playerTitles.set(playerId, titleLevel);

    // Record history
    if (!this.titleHistory.has(playerId)) {
      this.titleHistory.set(playerId, []);
    }
    this.titleHistory.get(playerId).push({
      title: titleLevel,
      timestamp: Date.now(),
      previous: previousTitle || null
    });

    return true;
  }

  /**
   * 获取玩家称号
   * @param {string} playerId - 玩家ID
   * @returns {string|null}
   */
  getTitle(playerId) {
    return this.playerTitles.get(playerId) || null;
  }

  /**
   * 获取称号等级
   * @param {string} titleLevel - 称号等级
   * @returns {number}
   */
  getTitleLevel(titleLevel) {
    const level = this.titleLevels[titleLevel];
    return level ? level.level : 0;
  }

  /**
   * 检查是否可以升级
   * @param {string} playerId - 玩家ID
   * @returns {boolean}
   */
  canUpgrade(playerId) {
    const currentTitle = this.playerTitles.get(playerId);
    if (!currentTitle) return false;

    const currentLevel = this.titleLevels[currentTitle].level;
    return currentLevel < 5; // Not master
  }

  /**
   * 升级称号
   * @param {string} playerId - 玩家ID
   * @returns {boolean} 是否成功
   */
  upgradeTitle(playerId) {
    const currentTitle = this.playerTitles.get(playerId);
    if (!currentTitle) return false;

    const currentLevel = this.titleLevels[currentTitle].level;
    if (currentLevel >= 5) return false;

    const titleOrder = ['bronze', 'silver', 'gold', 'diamond', 'master'];
    const nextTitle = titleOrder[currentLevel];
    return this.grantTitle(playerId, nextTitle);
  }

  /**
   * 获取称号展示
   * @param {string} playerId - 玩家ID
   * @returns {string}
   */
  getTitleDisplay(playerId) {
    const title = this.playerTitles.get(playerId);
    if (!title) return '';

    const titleInfo = this.titleLevels[title];
    return `${titleInfo.icon} ${titleInfo.name} Champion`;
  }

  /**
   * 获取称号颜色
   * @param {string} playerId - 玩家ID
   * @returns {string|null}
   */
  getTitleColor(playerId) {
    const title = this.playerTitles.get(playerId);
    if (!title) return null;

    return this.titleLevels[title].color;
  }

  /**
   * 获取所有玩家称号
   * @returns {Map}
   */
  getAllTitles() {
    return new Map(this.playerTitles);
  }

  /**
   * 获取玩家称号历史
   * @param {string} playerId - 玩家ID
   * @returns {object[]}
   */
  getTitleHistory(playerId) {
    return this.titleHistory.get(playerId) || [];
  }

  /**
   * 移除称号
   * @param {string} playerId - 玩家ID
   * @returns {boolean}
   */
  removeTitle(playerId) {
    if (!this.playerTitles.has(playerId)) return false;
    this.playerTitles.delete(playerId);
    return true;
  }

  /**
   * 获取最高称号玩家
   * @param {number} limit - 数量限制
   * @returns {object[]}
   */
  getTopChampions(limit = 10) {
    const champions = [];

    for (const [playerId, title] of this.playerTitles) {
      champions.push({
        playerId,
        title,
        level: this.titleLevels[title].level
      });
    }

    return champions
      .sort((a, b) => b.level - a.level)
      .slice(0, limit);
  }

  /**
   * 重置系统
   */
  reset() {
    this.playerTitles.clear();
    this.titleHistory.clear();
  }
}

module.exports = { ChampionTitleSystem };