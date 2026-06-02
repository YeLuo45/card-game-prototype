/**
 * Meta Adaptation Engine (Iteration 2/9)
 * 根据当前 meta 分析卡组强度
 * 推荐针对当前环境的卡组调整
 * 预测 meta 变化趋势
 */

class MetaAdaptationEngine {
  constructor(options = {}) {
    this.analysisDepth = options.analysisDepth || 20;
    this.currentMeta = {
      timestamp: Date.now(),
      topArchetypes: [],
      winRates: new Map(),
      playRates: new Map(),
      emergingPatterns: [],
      counters: new Map()
    };
    this.metaHistory = [];
    this.topArchetypes = [];
  }

  /**
   * 分析当前 meta
   * @param {object[]} matchHistory - 比赛历史
   * @returns {object} meta 分析结果
   */
  analyzeMeta(matchHistory) {
    if (!matchHistory || matchHistory.length === 0) {
      return this.getDefaultMetaAnalysis();
    }

    const recentMatches = matchHistory.slice(-this.analysisDepth);
    
    // 计算各卡组胜率
    const archetypeStats = this.calculateArchetypeStats(recentMatches);
    
    // 检测新兴卡组
    const emergingArchetypes = this.detectEmergingArchetypes(recentMatches);
    
    // 计算克制关系
    const counters = this.calculateCounterRelationships(recentMatches);

    // 更新当前 meta
    this.currentMeta = {
      timestamp: Date.now(),
      topArchetypes: archetypeStats,
      emergingPatterns: emergingArchetypes,
      counters
    };

    // 记录历史
    this.metaHistory.push({
      timestamp: Date.now(),
      archetypeStats,
      emergingArchetypes
    });

    return {
      topArchetypes: archetypeStats,
      emergingArchetypes,
      counters,
      pickRate: this.calculatePickRates(recentMatches),
      winRateTrend: this.calculateWinRateTrend(recentMatches)
    };
  }

  /**
   * 计算卡组统计
   * @param {object[]} matches - 比赛数据
   * @returns {object[]} 卡组统计列表
   */
  calculateArchetypeStats(matches) {
    const statsMap = new Map();

    for (const match of matches) {
      const archetype = match.archetype || 'unknown';
      
      if (!statsMap.has(archetype)) {
        statsMap.set(archetype, {
          archetype,
          wins: 0,
          losses: 0,
          totalGames: 0,
          totalTurns: 0
        });
      }

      const stats = statsMap.get(archetype);
      stats.totalGames++;
      if (match.result === 'win') stats.wins++;
      else stats.losses++;
      stats.totalTurns += match.turns || 0;
    }

    return Array.from(statsMap.values()).map(stats => ({
      archetype: stats.archetype,
      winRate: stats.totalGames > 0 ? stats.wins / stats.totalGames : 0,
      playRate: stats.totalGames / matches.length,
      avgTurns: stats.totalGames > 0 ? stats.totalTurns / stats.totalGames : 0,
      gamesPlayed: stats.totalGames
    })).sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * 检测新兴卡组
   * @param {object[]} matches - 比赛数据
   * @returns {object[]} 新兴卡组列表
   */
  detectEmergingArchetypes(matches) {
    const recentWindow = matches.slice(-10);
    const olderWindow = matches.slice(-20, -10);
    
    const recentCounts = this.countArchetypes(recentWindow);
    const olderCounts = this.countArchetypes(olderWindow);
    
    const emerging = [];
    
    for (const [archetype, recentCount] of Object.entries(recentCounts)) {
      const olderCount = olderCounts[archetype] || 0;
      const growth = recentCount - olderCount;
      
      if (recentCount >= 3 && growth >= 2) {
        emerging.push({
          archetype,
          growth,
          frequency: recentCount / recentWindow.length,
          trend: 'rising'
        });
      }
    }
    
    return emerging.sort((a, b) => b.growth - a.growth);
  }

  /**
   * 计算卡组出现次数
   * @param {object[]} matches - 比赛数据
   * @returns {object} 卡组计数
   */
  countArchetypes(matches) {
    const counts = {};
    for (const match of matches) {
      const archetype = match.archetype || 'unknown';
      counts[archetype] = (counts[archetype] || 0) + 1;
    }
    return counts;
  }

  /**
   * 计算克制关系
   * @param {object[]} matches - 比赛数据
   * @returns {Map} 克制关系映射
   */
  calculateCounterRelationships(matches) {
    const counters = new Map();
    
    for (const match of matches) {
      const playerArchetype = match.archetype || 'unknown';
      const opponentArchetype = match.opponentArchetype || 'unknown';
      
      if (!counters.has(playerArchetype)) {
        counters.set(playerArchetype, { vs: new Map(), games: 0 });
      }
      
      const counterData = counters.get(playerArchetype);
      counterData.games++;
      
      if (!counterData.vs.has(opponentArchetype)) {
        counterData.vs.set(opponentArchetype, { wins: 0, games: 0 });
      }
      
      const vsStats = counterData.vs.get(opponentArchetype);
      vsStats.games++;
      if (match.result === 'win') vsStats.wins++;
    }
    
    return counters;
  }

  /**
   * 计算pick率
   * @param {object[]} matches - 比赛数据
   * @returns {object} pick率
   */
  calculatePickRates(matches) {
    const counts = this.countArchetypes(matches);
    return Object.entries(counts).map(([archetype, count]) => ({
      archetype,
      pickRate: count / matches.length
    }));
  }

  /**
   * 计算胜率趋势
   * @param {object[]} matches - 比赛数据
   * @returns {string} 趋势描述
   */
  calculateWinRateTrend(matches) {
    if (matches.length < 10) return 'stable';
    
    const recentHalf = matches.slice(-5);
    const olderHalf = matches.slice(-10, -5);
    
    const recentWR = this.calculateWinRate(recentHalf);
    const olderWR = this.calculateWinRate(olderHalf);
    
    const diff = recentWR - olderWR;
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * 计算胜率
   * @param {object[]} matches - 比赛数据
   * @returns {number} 胜率
   */
  calculateWinRate(matches) {
    if (matches.length === 0) return 0;
    return matches.filter(m => m.result === 'win').length / matches.length;
  }

  /**
   * 生成卡组调整建议
   * @returns {object[]} 建议列表
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.currentMeta.topArchetypes.length === 0) {
      return recommendations;
    }

    const topArchetype = this.currentMeta.topArchetypes[0];
    const bottomArchetypes = this.currentMeta.topArchetypes.filter(a => a.winRate < 0.4);

    // 建议针对top卡组
    if (topArchetype && topArchetype.winRate > 0.55) {
      recommendations.push({
        type: 'counter',
        priority: 'high',
        message: `当前环境最强卡组是 ${topArchetype.archetype}，建议准备克制卡组`,
        targetArchetype: topArchetype.archetype
      });
    }

    // 建议使用表现好的卡组
    const wellPerforming = this.currentMeta.topArchetypes.filter(a => a.winRate > 0.5);
    if (wellPerforming.length > 0) {
      recommendations.push({
        type: 'adopt',
        priority: 'medium',
        message: `以下卡组表现良好: ${wellPerforming.map(a => a.archetype).join(', ')}`,
        archetypes: wellPerforming.map(a => a.archetype)
      });
    }

    // 警告使用表现差的卡组
    if (bottomArchetypes.length > 0) {
      recommendations.push({
        type: 'avoid',
        priority: 'high',
        message: `以下卡组表现不佳: ${bottomArchetypes.map(a => a.archetype).join(', ')}`,
        archetypes: bottomArchetypes.map(a => a.archetype)
      });
    }

    // 基于新兴卡组的建议
    if (this.currentMeta.emergingPatterns.length > 0) {
      recommendations.push({
        type: 'meta_aware',
        priority: 'medium',
        message: `检测到新兴卡组: ${this.currentMeta.emergingPatterns[0].archetype}`,
        emergingArchetype: this.currentMeta.emergingPatterns[0]
      });
    }

    return recommendations;
  }

  /**
   * 预测meta趋势
   * @returns {object} 趋势预测
   */
  predictMetaTrend() {
    if (this.metaHistory.length < 3) {
      return { direction: 'stable', confidence: 'low' };
    }

    const recentMeta = this.metaHistory.slice(-3);
    const olderMeta = this.metaHistory.slice(0, -3);
    
    if (olderMeta.length === 0) {
      return { direction: 'stable', confidence: 'low' };
    }

    // 分析变化趋势
    const recentAvgWinRate = this.averageWinRate(recentMeta);
    const olderAvgWinRate = this.averageWinRate(olderMeta);
    
    const change = recentAvgWinRate - olderAvgWinRate;
    
    let direction = 'stable';
    if (change > 0.05) direction = 'rising';
    else if (change < -0.05) direction = 'declining';

    return {
      direction,
      change,
      confidence: this.metaHistory.length >= 5 ? 'high' : 'medium',
      projectedMeta: this.projectMetaChange(change)
    };
  }

  /**
   * 计算平均胜率
   * @param {object[]} metaHistory - meta历史
   * @returns {number} 平均胜率
   */
  averageWinRate(metaHistory) {
    if (metaHistory.length === 0) return 0;
    
    let totalWR = 0;
    for (const meta of metaHistory) {
      if (meta.archetypeStats && meta.archetypeStats.length > 0) {
        totalWR += meta.archetypeStats[0].winRate;
      }
    }
    
    return totalWR / metaHistory.length;
  }

  /**
   * 预测meta变化
   * @param {number} change - 变化量
   * @returns {object} 预测的meta
   */
  projectMetaChange(change) {
    // 基于变化趋势预测未来meta
    const projectedTopArchetypes = this.currentMeta.topArchetypes.map(a => ({
      ...a,
      projectedWinRate: a.winRate + change
    }));

    return {
      topArchetypes: projectedTopArchetypes,
      predictedChange: change
    };
  }

  /**
   * 获取当前meta快照
   * @returns {object} meta快照
   */
  getMetaSnapshot() {
    return {
      timestamp: this.currentMeta.timestamp,
      topArchetypes: this.currentMeta.topArchetypes,
      emergingPatterns: this.currentMeta.emergingPatterns,
      counters: Array.from(this.currentMeta.counters.entries())
    };
  }

  /**
   * 分析对战
   * @param {string} playerArchetype - 玩家卡组
   * @param {string} opponentArchetype - 对手卡组
   * @returns {object} 对战分析
   */
  analyzeMatchup(playerArchetype, opponentArchetype) {
    const counterData = this.currentMeta.counters.get(playerArchetype);
    
    if (!counterData) {
      return { favorability: 'neutral', winRate: 0.5 };
    }

    const vsStats = counterData.vs.get(opponentArchetype);
    
    if (!vsStats) {
      return { favorability: 'neutral', winRate: 0.5 };
    }

    const winRate = vsStats.wins / vsStats.games;
    let favorability = 'neutral';
    
    if (winRate > 0.6) favorability = 'favorable';
    else if (winRate < 0.4) favorability = 'unfavorable';

    return { favorability, winRate, games: vsStats.games };
  }

  /**
   * 获取tier list
   * @returns {object} tier list
   */
  getTierList() {
    const archetypes = this.currentMeta.topArchetypes;
    
    return {
      s: archetypes.filter(a => a.winRate >= 0.6),
      a: archetypes.filter(a => a.winRate >= 0.5 && a.winRate < 0.6),
      b: archetypes.filter(a => a.winRate >= 0.4 && a.winRate < 0.5),
      c: archetypes.filter(a => a.winRate < 0.4)
    };
  }

  /**
   * 适配到meta的卡组建议
   * @param {object} deckProfile - 卡组档案
   * @returns {object} 适配建议
   */
  adaptToMeta(deckProfile) {
    const recommendations = this.generateRecommendations();
    
    let recommendedArchetype = 'balanced';
    
    if (recommendations.length > 0) {
      const topRec = recommendations.find(r => r.type === 'adopt' || r.type === 'counter');
      if (topRec) {
        recommendedArchetype = topRec.archetypes?.[0] || topRec.targetArchetype || 'balanced';
      }
    }

    return {
      recommendedArchetype,
      adjustments: this.suggestAdjustments(deckProfile),
      recommendations
    };
  }

  /**
   * 建议调整
   * @param {object} deckProfile - 卡组档案
   * @returns {object[]} 调整建议
   */
  suggestAdjustments(deckProfile) {
    const adjustments = [];
    
    // 基于费用曲线的建议
    if (deckProfile.avgCost > 3) {
      adjustments.push({
        type: 'reduce_cost',
        priority: 'medium',
        message: '建议降低卡组平均费用'
      });
    }
    
    // 基于类型分布的建议
    if (deckProfile.typeDistribution) {
      const attackRatio = deckProfile.typeDistribution.attack || 0;
      const skillRatio = deckProfile.typeDistribution.skill || 0;
      
      if (attackRatio > 0.8) {
        adjustments.push({
          type: 'add_skill',
          priority: 'high',
          message: '卡组攻击牌过多，建议添加技能牌'
        });
      }
      
      if (skillRatio > 0.7) {
        adjustments.push({
          type: 'add_attack',
          priority: 'high',
          message: '卡组技能牌过多，建议添加攻击牌'
        });
      }
    }

    return adjustments;
  }

  /**
   * 获取默认meta分析
   * @returns {object} 默认分析
   */
  getDefaultMetaAnalysis() {
    return {
      topArchetypes: [],
      emergingArchetypes: [],
      counters: new Map(),
      pickRate: [],
      winRateTrend: 'stable'
    };
  }
}

module.exports = { MetaAdaptationEngine };