/**
 * V256 Combat Strategy Optimizer (Iteration 2/9)
 * 战斗策略优化器: CombatStrategyOptimizer | StrategyAnalyzer | BattleRecommender
 * 
 * 概念：基于历史战斗数据分析和机器学习推理，优化战斗策略
 * 设计来源: generic-agent reasoning | thunderbolt pipeline | nanobot mesh
 * 
 * 跨系统协同 (Cross-System Integration):
 * - 基于 battle-simulator 获取战斗数据
 * - 基于 synergy-cascade 分析协同效应
 * - 基于 energy-tuning 优化能量分配
 * - 基于 deck-archetype-evolution 调整卡牌策略
 */

class StrategyAnalyzer {
  constructor() {
    this.analysisCache = new Map();
    this.patterns = {
      aggressive: [],
      defensive: [],
      balanced: []
    };
  }

  /**
   * 分析玩家战斗风格
   * @param {object[]} battleHistory - 战斗历史
   * @returns {object} 风格分析结果
   */
  analyzePlayStyle(battleHistory) {
    if (!battleHistory || battleHistory.length === 0) {
      return {
        style: 'balanced',
        aggressionScore: 0.5,
        defenseScore: 0.5,
        efficiencyScore: 0.5,
        adaptabilityScore: 0.5
      };
    }

    let totalDamageDealt = 0;
    let totalDamageTaken = 0;
    let totalEnergySpent = 0;
    let totalTurns = 0;
    let wins = 0;

    for (const battle of battleHistory) {
      totalDamageDealt += Math.abs(battle.enemyHPChange || 0);
      totalDamageTaken += Math.abs(battle.playerHPChange || 0);
      totalEnergySpent += battle.metrics?.energySpent || 0;
      totalTurns += battle.turnsElapsed || 1;
      if (battle.victory) wins++;
    }

    const avgDamageRatio = totalTurns > 0 ? totalDamageDealt / totalTurns : 0;
    const avgDamageTakenRatio = totalTurns > 0 ? totalDamageTaken / totalTurns : 0;
    const winRate = battleHistory.length > 0 ? wins / battleHistory.length : 0;

    // 计算风格分数
    const aggressionScore = Math.min(1, avgDamageRatio / 20);
    const defenseScore = Math.min(1, avgDamageTakenRatio / 15);
    const efficiencyScore = totalEnergySpent > 0 ? totalDamageDealt / totalEnergySpent : 0;
    const adaptabilityScore = winRate;

    let style = 'balanced';
    if (aggressionScore > 0.6 && defenseScore < 0.4) {
      style = 'aggressive';
    } else if (defenseScore > 0.6 && aggressionScore < 0.4) {
      style = 'defensive';
    }

    return {
      style,
      aggressionScore: Math.round(aggressionScore * 100) / 100,
      defenseScore: Math.round(defenseScore * 100) / 100,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100,
      adaptabilityScore: Math.round(adaptabilityScore * 100) / 100,
      sampleSize: battleHistory.length
    };
  }

  /**
   * 识别战斗模式
   * @param {object[]} battleHistory - 战斗历史
   * @returns {object[]} 识别的模式
   */
  identifyBattlePatterns(battleHistory) {
    const patterns = [];

    // 分析胜利模式
    const winBattles = battleHistory.filter(b => b.victory);
    if (winBattles.length > 0) {
      const avgTurnsToWin = winBattles.reduce((sum, b) => sum + b.turnsElapsed, 0) / winBattles.length;
      patterns.push({
        type: 'fastVictory',
        description: avgTurnsToWin <= 5 ? 'Quick finish wins' : 'Prolonged victory',
        occurrence: winBattles.length,
        avgTurns: Math.round(avgTurnsToWin * 10) / 10
      });
    }

    // 分析失败模式
    const lossBattles = battleHistory.filter(b => b.defeat);
    if (lossBattles.length > 0) {
      const avgTurnsToLoss = lossBattles.reduce((sum, b) => sum + b.turnsElapsed, 0) / lossBattles.length;
      patterns.push({
        type: 'defeat',
        description: avgTurnsToLoss <= 3 ? 'Early defeat' : 'Gradual defeat',
        occurrence: lossBattles.length,
        avgTurns: Math.round(avgTurnsToLoss * 10) / 10
      });
    }

    // 分析能量效率模式
    const avgEnergyEff = battleHistory.reduce((sum, b) => {
      const eff = b.metrics?.energyEfficiency || 0;
      return sum + eff;
    }, 0) / Math.max(battleHistory.length, 1);

    patterns.push({
      type: 'energyEfficiency',
      description: avgEnergyEff >= 80 ? 'High efficiency' : avgEnergyEff >= 60 ? 'Moderate efficiency' : 'Low efficiency',
      average: Math.round(avgEnergyEff * 10) / 10
    });

    return patterns;
  }

  /**
   * 检测弱点
   * @param {object[]} battleHistory - 战斗历史
   * @param {object} enemyProfile - 敌人配置
   * @returns {object[]} 弱点列表
   */
  detectWeaknesses(battleHistory, enemyProfile = {}) {
    const weaknesses = [];

    // 分析 HP 损失模式
    const avgHPLoss = battleHistory.reduce((sum, b) => sum + Math.abs(b.playerHPChange || 0), 0) / Math.max(battleHistory.length, 1);
    if (avgHPLoss > 30) {
      weaknesses.push({
        category: 'survivability',
        severity: 'high',
        description: 'Taking excessive damage',
        suggestion: 'Consider defensive cards or armor'
      });
    }

    // 分析特定敌人类型
    if (enemyProfile.type === 'boss') {
      const bossBattles = battleHistory.filter(b => b.enemyType === 'boss');
      if (bossBattles.length > 0 && bossBattles.filter(b => b.victory).length === 0) {
        weaknesses.push({
          category: 'bossFighting',
          severity: 'critical',
          description: 'Cannot defeat boss enemies',
          suggestion: 'Build specialized boss-killing deck'
        });
      }
    }

    // 分析能量管理
    const lowEnergyBattles = battleHistory.filter(b => (b.metrics?.energyEfficiency || 0) < 50);
    if (lowEnergyBattles.length > battleHistory.length * 0.3) {
      weaknesses.push({
        category: 'energyManagement',
        severity: 'medium',
        description: 'Frequent energy waste',
        suggestion: 'Optimize card cost distribution'
      });
    }

    return weaknesses;
  }

  /**
   * 缓存分析结果
   * @param {string} key - 缓存键
   * @param {object} data - 数据
   */
  cacheAnalysis(key, data) {
    this.analysisCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存分析
   * @param {string} key - 缓存键
   * @returns {object|null}
   */
  getCachedAnalysis(key) {
    const cached = this.analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5分钟缓存
      return cached.data;
    }
    return null;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.analysisCache.clear();
  }
}

class BattleRecommender {
  constructor() {
    this.recommendations = [];
    this.strategyWeights = {
      aggression: 0.3,
      defense: 0.3,
      efficiency: 0.4
    };
  }

  /**
   * 基于分析生成推荐
   * @param {object} analysis - 策略分析结果
   * @param {object} gameContext - 游戏上下文
   * @returns {object[]} 推荐列表
   */
  generateRecommendations(analysis, gameContext = {}) {
    const recommendations = [];

    // 基于风格生成推荐
    if (analysis.style === 'aggressive') {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Maintain Aggression',
        description: 'Continue aggressive playstyle with high-damage cards',
        actions: ['Use high-damage cards early', 'Apply pressure before enemy setup']
      });
    } else if (analysis.style === 'defensive') {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Balance Defense',
        description: 'Maintain defensive position while looking for counterattack opportunities',
        actions: ['Build armor early', 'Save defensive cards for enemy burst turns']
      });
    }

    // 基于效率分数推荐
    if (analysis.efficiencyScore < 0.5) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Improve Energy Efficiency',
        description: 'Focus on cost-effective cards',
        actions: ['Prioritize low-cost high-damage cards', 'Avoid energy waste']
      });
    }

    // 基于敌人类型推荐
    if (gameContext.enemyType === 'elite') {
      recommendations.push({
        type: 'combat',
        priority: 'critical',
        title: 'Elite Enemy Strategy',
        description: 'Adjust for elite enemy encounters',
        actions: ['Save powerful cards', 'Prioritize survival']
      });
    }

    if (gameContext.enemyType === 'boss') {
      recommendations.push({
        type: 'combat',
        priority: 'critical',
        title: 'Boss Fight Strategy',
        description: 'Prepare for extended boss battle',
        actions: ['Build for sustained damage', 'Include healing', 'Manage armor']
      });
    }

    this.recommendations = recommendations;
    return recommendations;
  }

  /**
   * 评估卡牌价值
   * @param {object} card - 卡牌
   * @param {object} context - 上下文
   * @returns {number} 价值分数
   */
  evaluateCardValue(card, context = {}) {
    let score = 0;

    // 基础伤害分数
    const damagePerCost = (card.damage || 0) / Math.max(card.cost || 1, 1);
    score += damagePerCost * 10;

    // 添加效果分数
    if (card.effects) {
      for (const effect of card.effects) {
        if (effect.type === 'armor') score += 5;
        if (effect.type === 'heal') score += 3;
        if (effect.type === 'status') score += 4;
      }
    }

    // 基于上下文的调整
    if (context.needDamage && card.damage > 10) {
      score *= 1.2;
    }
    if (context.needDefense && card.effects?.some(e => e.type === 'armor')) {
      score *= 1.3;
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * 排序推荐
   * @param {string} sortBy - 排序字段
   * @returns {object[]} 排序后的推荐
   */
  sortRecommendations(sortBy = 'priority') {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return [...this.recommendations].sort((a, b) => {
      if (sortBy === 'priority') {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });
  }

  /**
   * 清除推荐
   */
  clearRecommendations() {
    this.recommendations = [];
  }
}

class CombatStrategyOptimizer {
  constructor(options = {}) {
    this.analyzer = new StrategyAnalyzer();
    this.recommender = new BattleRecommender();
    this.optimizationHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  /**
   * 优化战斗策略
   * @param {object} battleData - 战斗数据
   * @param {object} options - 优化选项
   * @returns {object} 优化结果
   */
  optimizeStrategy(battleData, options = {}) {
    const {
      playerId = 'default',
      enemyType = 'normal',
      deck = [],
      gameContext = {}
    } = options;

    // 分析战斗历史
    const cacheKey = `analysis_${playerId}_${enemyType}`;
    let analysis = this.analyzer.getCachedAnalysis(cacheKey);
    
    if (!analysis) {
      analysis = this.analyzer.analyzePlayStyle(battleData);
      this.analyzer.cacheAnalysis(cacheKey, analysis);
    }

    // 识别模式
    const patterns = this.analyzer.identifyBattlePatterns(battleData);
    
    // 检测弱点
    const weaknesses = this.analyzer.detectWeaknesses(battleData, { type: enemyType });

    // 生成推荐
    const recommendations = this.recommender.generateRecommendations(analysis, {
      ...gameContext,
      enemyType
    });

    // 计算最优卡牌顺序
    const optimizedDeckOrder = this.optimizeCardOrder(deck, gameContext);

    // 构建优化结果
    const result = {
      playerId,
      enemyType,
      analysis,
      patterns,
      weaknesses,
      recommendations: this.recommender.sortRecommendations(),
      optimizedDeckOrder,
      timestamp: Date.now()
    };

    // 记录历史
    this.optimizationHistory.push(result);
    if (this.optimizationHistory.length > this.maxHistorySize) {
      this.optimizationHistory.shift();
    }

    return result;
  }

  /**
   * 优化卡牌顺序
   * @param {object[]} deck - 卡牌组
   * @param {object} context - 上下文
   * @returns {object[]} 优化后的顺序
   */
  optimizeCardOrder(deck, context = {}) {
    if (!deck || deck.length === 0) return [];

    // 评估每张卡牌
    const evaluatedCards = deck.map(card => ({
      ...card,
      valueScore: this.recommender.evaluateCardValue(card, context)
    }));

    // 按价值排序
    return evaluatedCards.sort((a, b) => b.valueScore - a.valueScore);
  }

  /**
   * 预测战斗结果
   * @param {object} strategy - 策略
   * @param {object} enemyState - 敌人状态
   * @returns {object} 预测结果
   */
  predictBattleOutcome(strategy, enemyState) {
    const { deck = [], style = 'balanced' } = strategy;
    
    let damageMultiplier = 1;
    if (style === 'aggressive') damageMultiplier = 1.3;
    if (style === 'defensive') damageMultiplier = 0.8;

    const avgCardDamage = deck.reduce((sum, c) => sum + (c.damage || 0), 0) / Math.max(deck.length, 1);
    const estimatedDamage = avgCardDamage * damageMultiplier * 15; // 15 turns estimate
    
    const estimatedVictory = estimatedDamage >= enemyState.currentHP;

    return {
      estimatedDamage: Math.round(estimatedDamage),
      estimatedVictory,
      confidence: 0.7,
      strategyType: style
    };
  }

  /**
   * 获取优化历史
   * @returns {object[]} 优化历史
   */
  getOptimizationHistory() {
    return this.optimizationHistory;
  }

  /**
   * 获取分析器
   * @returns {StrategyAnalyzer}
   */
  getAnalyzer() {
    return this.analyzer;
  }

  /**
   * 获取推荐器
   * @returns {BattleRecommender}
   */
  getRecommender() {
    return this.recommender;
  }

  /**
   * 重置优化器状态
   */
  reset() {
    this.analyzer.clearCache();
    this.recommender.clearRecommendations();
    this.optimizationHistory = [];
  }
}

// 导出
module.exports = { 
  CombatStrategyOptimizer, 
  StrategyAnalyzer, 
  BattleRecommender 
};