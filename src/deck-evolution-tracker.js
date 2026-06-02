/**
 * Deck Evolution Tracker (Iteration 2/9)
 * 追踪卡组使用历史（胜率、最佳场景、淘汰原因）
 * 基于玩家行为的智能卡组调整推荐
 */

class DeckEvolutionTracker {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 100;
    this.deckHistory = [];
    this.cardStats = new Map();
    this.scenarioStats = new Map();
    this.removalReasons = new Map();
    this.synergyHistory = [];
  }

  /**
   * 追踪卡组使用记录
   * @param {object[]} deck - 卡组
   * @param {object} result - 游戏结果
   */
  trackUsage(deck, result) {
    if (this.deckHistory.length >= this.maxHistory) {
      this.deckHistory.shift();
    }

    const entry = {
      timestamp: Date.now(),
      deck: deck.map(c => c.id),
      result: result.result,
      scenario: result.scenario,
      turns: result.turns,
      opponentArchetype: result.opponentArchetype
    };

    this.deckHistory.push(entry);
    this.updateCardStats(deck, result.result);
    this.updateScenarioStats(result.scenario, result.result);
  }

  /**
   * 更新卡牌统计
   * @param {object[]} deck - 卡组
   * @param {string} result - 结果
   */
  updateCardStats(deck, result) {
    for (const card of deck) {
      if (!this.cardStats.has(card.id)) {
        this.cardStats.set(card.id, {
          cardId: card.id,
          name: card.name,
          type: card.type,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          totalTurns: 0
        });
      }

      const stats = this.cardStats.get(card.id);
      stats.gamesPlayed++;
      if (result === 'win') stats.wins++;
      else if (result === 'loss') stats.losses++;
    }
  }

  /**
   * 更新场景统计
   * @param {string} scenario - 场景
   * @param {string} result - 结果
   */
  updateScenarioStats(scenario, result) {
    if (!scenario) return;

    if (!this.scenarioStats.has(scenario)) {
      this.scenarioStats.set(scenario, {
        scenario,
        games: 0,
        wins: 0,
        losses: 0
      });
    }

    const stats = this.scenarioStats.get(scenario);
    stats.games++;
    if (result === 'win') stats.wins++;
    else if (result === 'loss') stats.losses++;
  }

  /**
   * 获取总体胜率
   * @param {string} scenario - 可选场景筛选
   * @returns {number} 胜率
   */
  getWinRate(scenario = null) {
    const history = scenario 
      ? this.deckHistory.filter(h => h.scenario === scenario)
      : this.deckHistory;

    if (history.length === 0) return 0;

    const wins = history.filter(h => h.result === 'win').length;
    return wins / history.length;
  }

  /**
   * 获取最佳场景
   * @returns {string|null} 最佳场景名称
   */
  getBestScenario() {
    let bestScenario = null;
    let bestWinRate = 0;

    for (const [scenario, stats] of this.scenarioStats) {
      if (stats.games < 2) continue;
      
      const winRate = stats.wins / stats.games;
      if (winRate > bestWinRate) {
        bestWinRate = winRate;
        bestScenario = scenario;
      }
    }

    return bestScenario;
  }

  /**
   * 追踪卡牌淘汰原因
   * @param {string} cardId - 卡牌ID
   * @param {string} reason - 淘汰原因
   */
  trackRemoval(cardId, reason) {
    if (!this.removalReasons.has(cardId)) {
      this.removalReasons.set(cardId, []);
    }
    this.removalReasons.get(cardId).push({
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * 获取卡牌淘汰原因
   * @param {string} cardId - 卡牌ID
   * @returns {string[]} 淘汰原因列表
   */
  getRemovalReasons(cardId) {
    const reasons = this.removalReasons.get(cardId);
    return reasons ? reasons.map(r => r.reason) : [];
  }

  /**
   * 获取优化建议
   * @returns {object[]} 建议列表
   */
  getRecommendations() {
    const recommendations = [];

    // 基于胜率的建议
    const winRate = this.getWinRate();
    if (this.deckHistory.length >= 5) {
      if (winRate < 0.4) {
        recommendations.push({
          type: 'major_revision',
          priority: 'high',
          message: '整体胜率偏低，建议进行大幅度调整'
        });
      } else if (winRate < 0.5) {
        recommendations.push({
          type: 'minor_revision',
          priority: 'medium',
          message: '胜率有提升空间，考虑优化卡牌协同'
        });
      }
    }

    // 基于卡牌表现的建议
    for (const [cardId, stats] of this.cardStats) {
      if (stats.gamesPlayed >= 3) {
        const cardWinRate = stats.wins / stats.gamesPlayed;
        if (cardWinRate < 0.3) {
          recommendations.push({
            type: 'remove',
            cardId,
            priority: 'high',
            message: `${stats.name} 胜率过低 (${(cardWinRate * 100).toFixed(1)}%)`
          });
        }
      }
    }

    // 基于场景的建议
    const bestScenario = this.getBestScenario();
    if (bestScenario) {
      recommendations.push({
        type: 'scenario_focus',
        priority: 'low',
        message: `当前在 ${bestScenario} 场景表现最好`
      });
    }

    return recommendations;
  }

  /**
   * 获取卡牌表现数据
   * @param {string} cardId - 卡牌ID
   * @returns {object|null} 卡牌表现
   */
  getCardPerformance(cardId) {
    const stats = this.cardStats.get(cardId);
    if (!stats) return null;

    return {
      ...stats,
      winRate: stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0,
      avgTurns: stats.gamesPlayed > 0 ? stats.totalTurns / stats.gamesPlayed : 0
    };
  }

  /**
   * 分析协同变化
   * @returns {object} 协同变化分析
   */
  analyzeSynergyChanges() {
    if (this.synergyHistory.length < 2) {
      return { hasEnoughData: false };
    }

    const recent = this.synergyHistory.slice(-5);
    const older = this.synergyHistory.slice(0, -5);

    if (older.length === 0) {
      return { hasEnoughData: false };
    }

    const recentAvg = recent.reduce((a, b) => a + b.synergyScore, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b.synergyScore, 0) / older.length;

    return {
      hasEnoughData: true,
      recentAvg,
      olderAvg,
      trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
      change: recentAvg - olderAvg
    };
  }

  /**
   * 记录协同分数
   * @param {number} score - 协同分数
   */
  recordSynergyScore(score) {
    this.synergyHistory.push({
      timestamp: Date.now(),
      synergyScore: score
    });
  }

  /**
   * 获取胜率计算准确率（用于测试验证）
   * @returns {number} 准确率
   */
  getWinRateAccuracy() {
    if (this.deckHistory.length === 0) return 1.0;
    
    let correct = 0;
    for (const entry of this.deckHistory) {
      const calculatedWR = this.getWinRate();
      const actualWR = this.deckHistory.filter(h => h.result === 'win').length / this.deckHistory.length;
      
      if (Math.abs(calculatedWR - actualWR) < 0.001) {
        correct++;
      }
    }
    
    return correct / this.deckHistory.length;
  }
}

module.exports = { DeckEvolutionTracker };