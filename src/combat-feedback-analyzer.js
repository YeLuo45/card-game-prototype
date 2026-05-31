/**
 * V257 Combat Feedback Analyzer (Iteration 3/9)
 * 战斗反馈分析系统: CombatFeedbackAnalyzer | PerformanceTracker | CardEffectivenessMatrix
 * 
 * 概念：分析战斗反馈数据，提供卡牌有效性矩阵，识别优化空间
 * 设计来源: ruflo hierarchical decomposition | claude-code feedback | thunderbolt pipeline
 * 
 * 跨系统协同 (Cross-System Integration):
 * - 基于 battle-simulator 获取战斗数据
 * - 基于 combat-strategy-optimizer 提供优化建议
 * - 基于 synergy-cascade 分析协同效应
 */

class CardEffectivenessMatrix {
  constructor() {
    this.matrix = new Map(); // cardId -> effectiveness data
    this.aggregatedStats = {
      totalPlays: 0,
      totalDamage: 0,
      totalHealing: 0,
      totalArmor: 0,
      winRateWithCard: 0
    };
  }

  /**
   * 注册卡牌到矩阵
   * @param {object} card - 卡牌数据
   */
  registerCard(card) {
    if (!card.id && !card.name) return false;
    
    const cardId = card.id || card.name;
    if (this.matrix.has(cardId)) return false;

    this.matrix.set(cardId, {
      cardId,
      name: card.name || cardId,
      plays: 0,
      damageDealt: 0,
      healingDone: 0,
      armorGained: 0,
      wins: 0,
      losses: 0,
      avgDamagePerPlay: 0,
      avgHealingPerPlay: 0,
      avgArmorPerPlay: 0,
      winRate: 0,
      effectivenessScore: 0
    });
    return true;
  }

  /**
   * 记录卡牌使用
   * @param {object} card - 卡牌
   * @param {object} usageData - 使用数据 { damage, healing, armor, victory }
   */
  recordCardUsage(card, usageData) {
    const cardId = card.id || card.name;
    let entry = this.matrix.get(cardId);
    
    if (!entry) {
      this.registerCard(card);
      entry = this.matrix.get(cardId);
    }

    entry.plays++;
    entry.damageDealt += usageData.damage || 0;
    entry.healingDone += usageData.healing || 0;
    entry.armorGained += usageData.armor || 0;
    
    if (usageData.victory) {
      entry.wins++;
    } else {
      entry.losses++;
    }

    // 更新平均值
    entry.avgDamagePerPlay = entry.damageDealt / entry.plays;
    entry.avgHealingPerPlay = entry.healingDone / entry.plays;
    entry.avgArmorPerPlay = entry.armorGained / entry.plays;
    entry.winRate = entry.wins / entry.plays;

    // 计算有效性分数
    entry.effectivenessScore = this.calculateEffectiveness(entry);
    
    return entry;
  }

  /**
   * 计算卡牌有效性分数
   * @param {object} entry - 矩阵条目
   * @returns {number} 有效性分数
   */
  calculateEffectiveness(entry) {
    const damageWeight = 0.5;
    const healingWeight = 0.2;
    const armorWeight = 0.15;
    const winRateWeight = 0.15;

    const normalizedDamage = Math.min(entry.avgDamagePerPlay / 20, 1);
    const normalizedHealing = Math.min(entry.avgHealingPerPlay / 10, 1);
    const normalizedArmor = Math.min(entry.avgArmorPerPlay / 8, 1);

    const score = 
      (normalizedDamage * damageWeight) +
      (normalizedHealing * healingWeight) +
      (normalizedArmor * armorWeight) +
      (entry.winRate * winRateWeight);

    return Math.round(score * 100) / 100;
  }

  /**
   * 获取卡牌有效性数据
   * @param {string} cardId - 卡牌ID
   * @returns {object|null}
   */
  getCardEffectiveness(cardId) {
    return this.matrix.get(cardId) || null;
  }

  /**
   * 获取所有卡牌按有效性排序
   * @param {string} sortBy - 排序字段
   * @returns {object[]} 排序后的卡牌列表
   */
  getSortedCards(sortBy = 'effectivenessScore') {
    return Array.from(this.matrix.values())
      .filter(e => e.plays > 0)
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }

  /**
   * 获取top N 最有效卡牌
   * @param {number} n - 数量
   * @returns {object[]}
   */
  getTopCards(n = 5) {
    return this.getSortedCards('effectivenessScore').slice(0, n);
  }

  /**
   * 获取bottom N 最无效卡牌
   * @param {number} n - 数量
   * @returns {object[]}
   */
  getBottomCards(n = 5) {
    const sorted = this.getSortedCards('effectivenessScore');
    return sorted.slice(-n);
  }

  /**
   * 清除矩阵数据
   */
  clear() {
    this.matrix.clear();
  }

  /**
   * 获取矩阵大小
   * @returns {number}
   */
  getSize() {
    return this.matrix.size;
  }
}

class PerformanceTracker {
  constructor(options = {}) {
    this.performanceHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.metrics = {
      totalBattles: 0,
      totalWins: 0,
      totalLosses: 0,
      avgTurnsPerBattle: 0,
      avgDamagePerBattle: 0,
      avgArmorPerBattle: 0,
      avgWinStreak: 0,
      currentWinStreak: 0,
      bestWinStreak: 0
    };
  }

  /**
   * 记录战斗性能
   * @param {object} battleData - 战斗数据
   * @returns {object} 更新的指标
   */
  recordBattlePerformance(battleData) {
    const entry = {
      battleId: battleData.battleId || Date.now(),
      victory: battleData.victory || false,
      defeat: battleData.defeat || false,
      turnsElapsed: battleData.turnsElapsed || 0,
      playerHPChange: battleData.playerHPChange || 0,
      enemyHPChange: battleData.enemyHPChange || 0,
      damageDealt: Math.abs(battleData.enemyHPChange || 0),
      damageTaken: Math.abs(battleData.playerHPChange || 0),
      armorGained: battleData.armorGained || 0,
      energySpent: battleData.metrics?.energySpent || 0,
      energyEfficiency: battleData.metrics?.energyEfficiency || 0,
      timestamp: Date.now()
    };

    this.performanceHistory.push(entry);
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    this.updateMetrics(entry);
    return this.metrics;
  }

  /**
   * 更新聚合指标
   * @param {object} entry - 战斗条目
   */
  updateMetrics(entry) {
    this.metrics.totalBattles++;
    
    if (entry.victory) {
      this.metrics.totalWins++;
      this.metrics.currentWinStreak++;
      this.metrics.bestWinStreak = Math.max(this.metrics.bestWinStreak, this.metrics.currentWinStreak);
    } else {
      this.metrics.totalLosses++;
      this.metrics.currentWinStreak = 0;
    }

    // 计算平均值
    const n = this.metrics.totalBattles;
    this.metrics.avgTurnsPerBattle = (
      (this.metrics.avgTurnsPerBattle * (n - 1) + entry.turnsElapsed) / n
    );
    this.metrics.avgDamagePerBattle = (
      (this.metrics.avgDamagePerBattle * (n - 1) + entry.damageDealt) / n
    );
    this.metrics.avgArmorPerBattle = (
      (this.metrics.avgArmorPerBattle * (n - 1) + entry.armorGained) / n
    );
    this.metrics.avgWinStreak = this.metrics.bestWinStreak / 2;
  }

  /**
   * 获取性能趋势
   * @param {number} windowSize - 窗口大小
   * @returns {object} 趋势数据
   */
  getPerformanceTrend(windowSize = 10) {
    const recent = this.performanceHistory.slice(-windowSize);
    
    if (recent.length === 0) {
      return { winRate: 0, avgDamage: 0, avgTurns: 0, trend: 'neutral' };
    }

    const wins = recent.filter(e => e.victory).length;
    const avgDamage = recent.reduce((sum, e) => sum + e.damageDealt, 0) / recent.length;
    const avgTurns = recent.reduce((sum, e) => sum + e.turnsElapsed, 0) / recent.length;
    const winRate = wins / recent.length;

    let trend = 'neutral';
    if (winRate >= 0.7) trend = 'improving';
    else if (winRate <= 0.3) trend = 'declining';

    return {
      winRate: Math.round(winRate * 100) / 100,
      avgDamage: Math.round(avgDamage * 10) / 10,
      avgTurns: Math.round(avgTurns * 10) / 10,
      trend,
      sampleSize: recent.length
    };
  }

  /**
   * 获取性能历史
   * @returns {object[]}
   */
  getHistory() {
    return [...this.performanceHistory];
  }

  /**
   * 获取当前指标
   * @returns {object}
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 重置追踪器
   */
  reset() {
    this.performanceHistory = [];
    this.metrics = {
      totalBattles: 0,
      totalWins: 0,
      totalLosses: 0,
      avgTurnsPerBattle: 0,
      avgDamagePerBattle: 0,
      avgArmorPerBattle: 0,
      avgWinStreak: 0,
      currentWinStreak: 0,
      bestWinStreak: 0
    };
  }
}

class CombatFeedbackAnalyzer {
  constructor(options = {}) {
    this.effectivenessMatrix = new CardEffectivenessMatrix();
    this.performanceTracker = new PerformanceTracker(options.tracker);
    this.feedbackCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    this.analysisPatterns = {
      aggressive: [],
      defensive: [],
      balanced: []
    };
  }

  /**
   * 分析战斗反馈
   * @param {object} battleData - 战斗数据
   * @param {object[]} deck - 使用的牌组
   * @returns {object} 反馈分析结果
   */
  analyzeBattleFeedback(battleData, deck = []) {
    const cacheKey = `feedback_${battleData.battleId || Date.now()}`;
    
    // 检查缓存
    const cached = this.getCachedFeedback(cacheKey);
    if (cached) return cached;

    // 记录性能
    this.performanceTracker.recordBattlePerformance(battleData);

    // 记录卡牌使用
    if (deck.length > 0) {
      this.recordDeckUsage(deck, battleData);
    }

    // 生成反馈
    const feedback = this.generateFeedback(battleData);
    
    // 缓存结果
    this.cacheFeedback(cacheKey, feedback);

    return feedback;
  }

  /**
   * 记录牌组使用
   * @param {object[]} deck - 牌组
   * @param {object} battleData - 战斗数据
   */
  recordDeckUsage(deck, battleData) {
    for (const card of deck) {
      const usageData = {
        damage: card.damage || 0,
        healing: 0,
        armor: 0,
        victory: battleData.victory || false
      };

      if (card.effects) {
        for (const effect of card.effects) {
          if (effect.type === 'heal') usageData.healing += effect.value || 0;
          if (effect.type === 'armor') usageData.armor += effect.value || 0;
        }
      }

      this.effectivenessMatrix.recordCardUsage(card, usageData);
    }
  }

  /**
   * 生成反馈
   * @param {object} battleData - 战斗数据
   * @returns {object} 反馈结果
   */
  generateFeedback(battleData) {
    const performance = this.performanceTracker.getMetrics();
    const trend = this.performanceTracker.getPerformanceTrend();
    const topCards = this.effectivenessMatrix.getTopCards(3);
    const bottomCards = this.effectivenessMatrix.getBottomCards(3);

    const feedback = {
      performance,
      trend,
      topCards,
      bottomCards,
      insights: this.generateInsights(battleData, performance, trend),
      recommendations: this.generateRecommendations(trend, topCards, bottomCards),
      timestamp: Date.now()
    };

    return feedback;
  }

  /**
   * 生成洞察
   * @param {object} battleData - 战斗数据
   * @param {object} performance - 性能指标
   * @param {object} trend - 趋势
   * @returns {object[]} 洞察列表
   */
  generateInsights(battleData, performance, trend) {
    const insights = [];

    // 胜率洞察
    if (performance.totalBattles >= 5) {
      const winRate = performance.totalWins / performance.totalBattles;
      if (winRate >= 0.7) {
        insights.push({
          type: 'success',
          category: 'winRate',
          message: `High win rate: ${Math.round(winRate * 100)}%`,
          severity: 'positive'
        });
      } else if (winRate <= 0.3) {
        insights.push({
          type: 'concern',
          category: 'winRate',
          message: `Low win rate: ${Math.round(winRate * 100)}%`,
          severity: 'negative'
        });
      }
    }

    // 战斗时长洞察
    if (performance.avgTurnsPerBattle > 15) {
      insights.push({
        type: 'efficiency',
        category: 'battleLength',
        message: 'Battles are taking longer than average',
        severity: 'warning'
      });
    }

    // 能量效率洞察
    if (battleData.metrics?.energyEfficiency < 60) {
      insights.push({
        type: 'efficiency',
        category: 'energyManagement',
        message: 'Energy efficiency could be improved',
        severity: 'warning'
      });
    }

    return insights;
  }

  /**
   * 生成建议
   * @param {object} trend - 趋势
   * @param {object[]} topCards - 高效卡牌
   * @param {object[]} bottomCards - 低效卡牌
   * @returns {object[]} 建议列表
   */
  generateRecommendations(trend, topCards, bottomCards) {
    const recommendations = [];

    if (trend.trend === 'declining') {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Recover Performance',
        description: 'Win rate declining, consider deck revision',
        actions: ['Review recent losses', 'Analyze opponent patterns']
      });
    }

    if (bottomCards.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Replace Low Performers',
        description: `Consider replacing ${bottomCards[0].name}`,
        actions: ['Find higher damage alternatives', 'Check synergy compatibility']
      });
    }

    if (topCards.length > 0) {
      recommendations.push({
        type: 'strategy',
        priority: 'medium',
        title: 'Leverage Top Performers',
        description: `Maximize ${topCards[0].name} usage`,
        actions: ['Build deck around strong cards', 'Optimize draw order']
      });
    }

    return recommendations;
  }

  /**
   * 缓存反馈
   * @param {string} key - 缓存键
   * @param {object} feedback - 反馈数据
   */
  cacheFeedback(key, feedback) {
    this.feedbackCache.set(key, {
      data: feedback,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存的反馈
   * @param {string} key - 缓存键
   * @returns {object|null}
   */
  getCachedFeedback(key) {
    const cached = this.feedbackCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.feedbackCache.clear();
  }

  /**
   * 获取有效性矩阵
   * @returns {CardEffectivenessMatrix}
   */
  getEffectivenessMatrix() {
    return this.effectivenessMatrix;
  }

  /**
   * 获取性能追踪器
   * @returns {PerformanceTracker}
   */
  getPerformanceTracker() {
    return this.performanceTracker;
  }

  /**
   * 重置分析器
   */
  reset() {
    this.effectivenessMatrix.clear();
    this.performanceTracker.reset();
    this.clearCache();
  }
}

// 导出
module.exports = {
  CombatFeedbackAnalyzer,
  CardEffectivenessMatrix,
  PerformanceTracker
};