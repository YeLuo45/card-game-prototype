/**
 * V101 Dynamic Energy Tuning System (Direction E)
 * 动态能量调优系统：EnergyTuner | EnergyHook | BalanceFeedback
 * 
 * 概念：根据牌组能量消耗分布动态调节每回合能量分配，平衡性反馈调优
 * 设计来源：thunderbolt PowerSync | ruflo Hook System | claude-code Budget Mode
 */

// ===== EnergyTuner - 能量分布分析与调优 =====
class EnergyTuner {
  constructor() {
    this.DECK_ENERGY_PREFIX = 'energy_deck_';
    this.TUNING_STATS_KEY = 'energy_tuning_stats';
    this.energyCurve = [];
    this.deckProfiles = new Map();
  }

  /**
   * 分析卡组能量分布
   * @param {string} deckId - 卡组ID
   * @param {Array} cards - 卡组中的卡牌数组 [{id, cost, name, ...}, ...]
   * @returns {object} 能量分布分析结果
   */
  analyzeDeckEnergy(deckId, cards = []) {
    if (!deckId) return null;

    // 如果没有提供cards，尝试从存储获取
    if (!cards || cards.length === 0) {
      cards = this.loadDeckCards(deckId);
    }

    if (!cards || cards.length === 0) {
      return this.getDefaultEnergyProfile();
    }

    // 计算能量分布统计
    const energyDistribution = this.calculateEnergyDistribution(cards);
    const avgCost = this.calculateAverageCost(cards);
    const costVariance = this.calculateCostVariance(cards, avgCost);
    const peakCost = this.findPeakCost(energyDistribution);
    const curveShape = this.analyzeCurveShape(energyDistribution);

    const profile = {
      deckId,
      cardCount: cards.length,
      avgCost: avgCost.toFixed(2),
      costVariance: costVariance.toFixed(2),
      peakCost,
      curveShape,
      distribution: energyDistribution,
      analyzedAt: Date.now()
    };

    // 缓存profile
    this.deckProfiles.set(deckId, profile);
    this.saveDeckProfile(deckId, profile);

    return profile;
  }

  /**
   * 计算最优能量分配
   * @param {number} turn - 当前回合
   * @param {object} gameState - 游戏状态 { deckId, hand, energy, boardState, ... }
   * @returns {object} 最优能量分配方案
   */
  calculateOptimalEnergyAlloc(turn, gameState = {}) {
    const { deckId, hand = [], currentEnergy = 3, maxEnergy = 3 } = gameState;

    // 获取卡组能量曲线
    const energyCurve = this.getEnergyCurve(deckId);
    const curveIndex = Math.min(turn - 1, energyCurve.length - 1);
    const targetCost = energyCurve[curveIndex] || this.estimateTargetCost(turn);

    // 计算手牌中可打的牌
    const playableCards = hand.filter(card => (card.cost || 0) <= currentEnergy);
    const expensiveCards = hand.filter(card => (card.cost || 0) > currentEnergy);

    // 计算能量效率
    const energyEfficiency = this.calculateEnergyEfficiency(playableCards, currentEnergy);
    
    // 生成分配建议
    const allocation = {
      turn,
      targetCost,
      currentEnergy,
      maxEnergy,
      playableCount: playableCards.length,
      energySurplus: currentEnergy - (playableCards.reduce((sum, c) => sum + (c.cost || 0), 0) / Math.max(playableCards.length, 1)),
      wastePercentage: this.calculateWastePercentage(playableCards, currentEnergy),
      recommendations: this.generateRecommendations(playableCards, expensiveCards, currentEnergy, targetCost),
      efficiency: energyEfficiency
    };

    return allocation;
  }

  /**
   * 应用能量调优
   * @param {object} gameState - 游戏状态
   * @returns {object} 调优后的游戏状态
   */
  applyTuning(gameState) {
    const { turn = 1, deckId, energy = 3, maxEnergy = 3 } = gameState;
    
    // 计算最优分配
    const allocation = this.calculateOptimalEnergyAlloc(turn, gameState);
    
    // 计算调优修正值
    const tuningModifier = this.calculateTuningModifier(allocation);
    
    // 应用调优到游戏状态
    const tunedState = {
      ...gameState,
      energy: Math.min(energy + tuningModifier.bonusEnergy, maxEnergy + tuningModifier.bonusMaxEnergy),
      maxEnergy: maxEnergy + tuningModifier.bonusMaxEnergy,
      tuningActive: true,
      tuningTurn: turn,
      lastTuning: {
        modifier: tuningModifier,
        allocation,
        appliedAt: Date.now()
      }
    };

    // 记录调优统计
    this.recordTuningStat(turn, tuningModifier);

    return tunedState;
  }

  /**
   * 获取调优统计数据
   * @returns {object} 调优统计
   */
  getTuningStats() {
    try {
      const data = localStorage.getItem(this.TUNING_STATS_KEY);
      return data ? JSON.parse(data) : this.getDefaultTuningStats();
    } catch {
      return this.getDefaultTuningStats();
    }
  }

  /**
   * 重置信计数据
   */
  resetTuningStats() {
    try {
      localStorage.removeItem(this.TUNING_STATS_KEY);
    } catch (e) {
      console.warn('[EnergyTuner] resetTuningStats failed:', e);
    }
  }

  // ===== 内部辅助方法 =====

  calculateEnergyDistribution(cards) {
    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    for (const card of cards) {
      const cost = Math.min(card.cost || 0, 8);
      distribution[cost]++;
    }
    return distribution;
  }

  calculateAverageCost(cards) {
    if (!cards || cards.length === 0) return 0;
    const totalCost = cards.reduce((sum, card) => sum + (card.cost || 0), 0);
    return totalCost / cards.length;
  }

  calculateCostVariance(cards, avgCost) {
    if (!cards || cards.length === 0) return 0;
    const squaredDiffs = cards.map(card => Math.pow((card.cost || 0) - avgCost, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / cards.length;
    return Math.sqrt(avgSquaredDiff);
  }

  findPeakCost(distribution) {
    let peakCost = 0;
    let maxCount = 0;
    for (const [cost, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        peakCost = parseInt(cost);
      }
    }
    return peakCost;
  }

  analyzeCurveShape(distribution) {
    const costs = Object.entries(distribution).map(([k, v]) => ({ cost: parseInt(k), count: v }));
    const totalCards = costs.reduce((sum, c) => sum + c.count, 0);
    
    if (totalCards === 0) return 'empty';
    
    // 计算偏度和峰度
    const weightedSum = costs.reduce((sum, c) => sum + c.cost * c.count, 0);
    const mean = weightedSum / totalCards;
    
    if (mean <= 1.5) return 'low_cost';
    if (mean >= 3.5) return 'high_cost';
    
    // 检查是否集中在高费用
    const highCostCount = (distribution[4] || 0) + (distribution[5] || 0) + 
                          (distribution[6] || 0) + (distribution[7] || 0) + (distribution[8] || 0);
    if (highCostCount / totalCards > 0.5) return 'high_cost';
    
    // 检查是否集中在中等费用
    const midRangeCount = (distribution[2] || 0) + (distribution[3] || 0);
    if (midRangeCount / totalCards > 0.5) return 'mid_focus';
    
    return 'balanced';
  }

  getEnergyCurve(deckId) {
    if (!deckId) return [2, 3, 3, 4, 4, 5, 5, 6];
    
    const cached = this.energyCurveCache?.[deckId];
    if (cached) return cached;
    
    // 默认能量曲线：每回合递增
    const defaultCurve = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8];
    return defaultCurve;
  }

  estimateTargetCost(turn) {
    // 简单估算：每回合增加0.5能量
    return Math.floor(2 + turn * 0.5);
  }

  calculateEnergyEfficiency(playableCards, currentEnergy) {
    if (playableCards.length === 0) return 0;
    
    const totalCost = playableCards.reduce((sum, card) => sum + (card.cost || 0), 0);
    const potentialEnergyUse = Math.min(totalCost, currentEnergy);
    
    return potentialEnergyUse / currentEnergy;
  }

  calculateWastePercentage(playableCards, currentEnergy) {
    if (playableCards.length === 0) return 100;
    
    const totalCost = playableCards.reduce((sum, card) => sum + (card.cost || 0), 0);
    const waste = Math.max(0, currentEnergy - totalCost);
    
    return (waste / currentEnergy) * 100;
  }

  generateRecommendations(playableCards, expensiveCards, currentEnergy, targetCost) {
    const recommendations = [];
    
    // 优先打出符合能量曲线的牌
    const onCurveCards = playableCards.filter(c => (c.cost || 0) >= targetCost - 1 && (c.cost || 0) <= targetCost + 1);
    const offCurveCards = playableCards.filter(c => !onCurveCards.includes(c));
    
    if (onCurveCards.length > 0) {
      recommendations.push({
        type: 'prefer',
        cards: onCurveCards.map(c => c.id || c.name),
        reason: 'matches_energy_curve'
      });
    }
    
    // 建议保留高价值牌
    if (expensiveCards.length > 0) {
      recommendations.push({
        type: 'save',
        cards: expensiveCards.map(c => c.id || c.name),
        reason: 'waiting_for_energy'
      });
    }
    
    return recommendations;
  }

  calculateTuningModifier(allocation) {
    const { wastePercentage, efficiency, targetCost, currentEnergy } = allocation;
    
    // 根据能量浪费率计算奖励/惩罚
    let bonusEnergy = 0;
    let bonusMaxEnergy = 0;
    
    if (wastePercentage > 50) {
      // 高浪费：下回合奖励1点能量
      bonusEnergy = 1;
    }
    
    if (efficiency > 0.9) {
      // 高效率：可能奖励最大能量上限
      bonusMaxEnergy = 1;
    }
    
    // 根据目标费用调整
    if (targetCost > currentEnergy && allocation.playableCount === 0) {
      // 无法出牌时给1点能量补偿
      bonusEnergy = Math.max(bonusEnergy, 1);
    }
    
    return { bonusEnergy, bonusMaxEnergy, wastePercentage, efficiency };
  }

  recordTuningStat(turn, modifier) {
    try {
      const stats = this.getTuningStats();
      stats.totalTunings++;
      stats.turnsWithBonus.push({ turn, modifier });
      
      if (modifier.bonusEnergy > 0) stats.energyBonusesGiven++;
      if (modifier.bonusMaxEnergy > 0) stats.maxEnergyBonusesGiven++;
      
      localStorage.setItem(this.TUNING_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn('[EnergyTuner] recordTuningStat failed:', e);
    }
  }

  loadDeckCards(deckId) {
    try {
      const data = localStorage.getItem(this.DECK_ENERGY_PREFIX + deckId);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveDeckProfile(deckId, profile) {
    try {
      localStorage.setItem(this.DECK_ENERGY_PREFIX + deckId, JSON.stringify(profile));
    } catch (e) {
      console.warn('[EnergyTuner] saveDeckProfile failed:', e);
    }
  }

  getDefaultEnergyProfile() {
    return {
      deckId: null,
      cardCount: 0,
      avgCost: '0.00',
      costVariance: '0.00',
      peakCost: 0,
      curveShape: 'unknown',
      distribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
      analyzedAt: Date.now()
    };
  }

  getDefaultTuningStats() {
    return {
      totalTunings: 0,
      energyBonusesGiven: 0,
      maxEnergyBonusesGiven: 0,
      turnsWithBonus: []
    };
  }
}


// ===== EnergyHook - 能量流动钩子系统 =====
class EnergyHook {
  constructor(energyTuner) {
    this.tuner = energyTuner || new EnergyTuner();
    this.hooks = {
      onTurnStart: [],
      onEnergySpent: [],
      onCardPlayed: [],
      onTurnEnd: []
    };
    this.hookHistory = [];
  }

  /**
   * 注册回合开始钩子
   * @param {function} handler - 回调函数 (gameState) => void
   * @returns {function} 取消钩子的函数
   */
  onTurnStart(handler) {
    if (typeof handler !== 'function') return () => {};
    
    const id = 'turnStart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.hooks.onTurnStart.push({ id, handler });
    
    return () => this.removeHook('onTurnStart', id);
  }

  /**
   * 注册能量消耗钩子
   * @param {function} handler - 回调函数 (energyInfo) => void
   * @returns {function} 取消钩子的函数
   */
  onEnergySpent(handler) {
    if (typeof handler !== 'function') return () => {};
    
    const id = 'energySpent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.hooks.onEnergySpent.push({ id, handler });
    
    return () => this.removeHook('onEnergySpent', id);
  }

  /**
   * 注册卡牌打出钩子
   * @param {function} handler - 回调函数 (cardInfo) => void
   * @returns {function} 取消钩子的函数
   */
  onCardPlayed(handler) {
    if (typeof handler !== 'function') return () => {};
    
    const id = 'cardPlayed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.hooks.onCardPlayed.push({ id, handler });
    
    return () => this.removeHook('onCardPlayed', id);
  }

  /**
   * 注册回合结束钩子
   * @param {function} handler - 回调函数 (gameState) => void
   * @returns {function} 取消钩子的函数
   */
  onTurnEnd(handler) {
    if (typeof handler !== 'function') return () => {};
    
    const id = 'turnEnd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.hooks.onTurnEnd.push({ id, handler });
    
    return () => this.removeHook('onTurnEnd', id);
  }

  /**
   * 调整能量流动
   * @param {object} gameState - 游戏状态
   * @returns {object} 调整后的游戏状态
   */
  adjustEnergyFlow(gameState) {
    const { turn = 1, energy = 3, maxEnergy = 3, deckId } = gameState;
    
    // 创建能量流信息
    const energyFlow = {
      turn,
      startEnergy: energy,
      startMaxEnergy: maxEnergy,
      adjustments: [],
      finalEnergy: energy,
      finalMaxEnergy: maxEnergy
    };

    // 1. 触发回合开始钩子
    energyFlow.adjustments.push(...this.triggerTurnStartHooks(gameState));

    // 2. 分析卡组并计算调优
    if (deckId) {
      const profile = this.tuner.analyzeDeckEnergy(deckId);
      if (profile && profile.cardCount > 0) {
        // 根据卡组特性调整能量
        const curveAdjustment = this.calculateCurveAdjustment(profile, turn);
        energyFlow.adjustments.push(curveAdjustment);
        energyFlow.finalEnergy = Math.min(energy + curveAdjustment.bonus, maxEnergy + curveAdjustment.maxBonus);
        energyFlow.finalMaxEnergy = maxEnergy + curveAdjustment.maxBonus;
      }
    }

    // 3. 存储钩子历史
    this.hookHistory.push({
      turn,
      timestamp: Date.now(),
      adjustments: energyFlow.adjustments
    });

    // 限制历史记录大小
    if (this.hookHistory.length > 100) {
      this.hookHistory = this.hookHistory.slice(-100);
    }

    return {
      ...gameState,
      energy: energyFlow.finalEnergy,
      maxEnergy: energyFlow.finalMaxEnergy,
      energyFlowLog: energyFlow
    };
  }

  /**
   * 记录能量消耗
   * @param {object} energyInfo - 能量消耗信息 { amount, cardId, turn, ... }
   */
  recordEnergySpent(energyInfo) {
    if (!energyInfo) {
      energyInfo = {};
    }
    
    const record = {
      amount: energyInfo.amount || 0,
      cardId: energyInfo.cardId || 'unknown',
      turn: energyInfo.turn || 1,
      timestamp: Date.now()
    };

    // 触发能量消耗钩子
    for (const hook of this.hooks.onEnergySpent) {
      try {
        hook.handler(record);
      } catch (e) {
        console.warn('[EnergyHook] onEnergySpent handler error:', e);
      }
    }

    return record;
  }

  /**
   * 记录卡牌打出
   * @param {object} cardInfo - 卡牌信息 { cardId, cost, effect, turn, ... }
   */
  recordCardPlayed(cardInfo) {
    const record = {
      cardId: cardInfo.cardId || 'unknown',
      cost: cardInfo.cost || 0,
      effect: cardInfo.effect || 'none',
      turn: cardInfo.turn || 1,
      timestamp: Date.now()
    };

    // 触发卡牌打出钩子
    for (const hook of this.hooks.onCardPlayed) {
      try {
        hook.handler(record);
      } catch (e) {
        console.warn('[EnergyHook] onCardPlayed handler error:', e);
      }
    }

    return record;
  }

  /**
   * 触发回合结束钩子
   * @param {object} gameState - 游戏状态
   */
  triggerTurnEndHooks(gameState) {
    for (const hook of this.hooks.onTurnEnd) {
      try {
        hook.handler(gameState);
      } catch (e) {
        console.warn('[EnergyHook] onTurnEnd handler error:', e);
      }
    }
  }

  /**
   * 获取钩子历史
   * @param {number} limit - 返回最近N条记录
   * @returns {Array} 钩子历史记录
   */
  getHookHistory(limit = 10) {
    if (limit <= 0) return [];
    return this.hookHistory.slice(-limit);
  }

  /**
   * 清空钩子历史
   */
  clearHookHistory() {
    this.hookHistory = [];
  }

  /**
   * 清空所有钩子
   */
  clearAllHooks() {
    this.hooks = {
      onTurnStart: [],
      onEnergySpent: [],
      onCardPlayed: [],
      onTurnEnd: []
    };
  }

  // ===== 内部辅助方法 =====

  removeHook(hookType, id) {
    if (!this.hooks[hookType]) return;
    this.hooks[hookType] = this.hooks[hookType].filter(h => h.id !== id);
  }

  triggerTurnStartHooks(gameState) {
    const adjustments = [];
    for (const hook of this.hooks.onTurnStart) {
      try {
        const result = hook.handler(gameState);
        if (result && result.adjustment) {
          adjustments.push(result);
        }
      } catch (e) {
        console.warn('[EnergyHook] onTurnStart handler error:', e);
      }
    }
    return adjustments;
  }

  calculateCurveAdjustment(profile, turn) {
    const { curveShape, avgCost } = profile;
    let bonus = 0;
    let maxBonus = 0;

    switch (curveShape) {
      case 'low_cost':
        // 低成本卡组：早回合给额外能量
        if (turn <= 3) bonus = 1;
        else if (turn <= 6) bonus = 0;
        else bonus = -1;
        break;
        
      case 'high_cost':
        // 高成本卡组：晚回合给额外能量
        if (turn >= 5) bonus = 1;
        else if (turn >= 3) bonus = 0;
        else bonus = -1;
        break;
        
      case 'mid_focus':
        // 中成本聚焦：中间回合给奖励
        if (turn >= 3 && turn <= 6) {
          bonus = 1;
          maxBonus = 1;
        }
        break;
        
      case 'balanced':
      default:
        // 均衡卡组：保持稳定
        bonus = 0;
        maxBonus = 0;
        break;
    }

    return {
      type: 'curve_adjustment',
      curveShape,
      turn,
      bonus,
      maxBonus
    };
  }
}


// ===== BalanceFeedback - 平衡性反馈系统 =====
class BalanceFeedback {
  constructor(energyTuner) {
    this.tuner = energyTuner || new EnergyTuner();
    this.usageData = new Map();
    this.NERF_THRESHOLD = 0.65; // 胜率>65%建议nerf
    this.BUFF_THRESHOLD = 0.35; // 胜率<35%建议buff
    this.USE_THRESHOLD = 0.10;  // 使用率>10%才算热门
  }

  /**
   * 收集使用数据
   * @param {object} data - 使用数据 { cardId, gamesPlayed, wins, damageDealt, energySpent, ... }
   */
  collectUsageData(data) {
    if (!data || !data.cardId) return;

    const existing = this.usageData.get(data.cardId) || {
      cardId: data.cardId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalDamage: 0,
      totalEnergySpent: 0,
      timesPlayed: 0,
      avgDamagePerGame: 0,
      winRate: 0,
      lastUpdated: null
    };

    // 累加数据
    existing.gamesPlayed += data.gamesPlayed || 1;
    existing.wins += data.wins || 0;
    existing.losses += (data.gamesPlayed || 1) - (data.wins || 0);
    existing.totalDamage += data.damageDealt || 0;
    existing.totalEnergySpent += data.energySpent || 0;
    existing.timesPlayed += data.timesPlayed || 0;
    existing.lastUpdated = Date.now();

    // 计算派生指标
    existing.winRate = existing.gamesPlayed > 0 ? existing.wins / existing.gamesPlayed : 0;
    existing.avgDamagePerGame = existing.gamesPlayed > 0 ? existing.totalDamage / existing.gamesPlayed : 0;
    existing.energyEfficiency = existing.totalEnergySpent > 0 ? existing.totalDamage / existing.totalEnergySpent : 0;

    this.usageData.set(data.cardId, existing);
    this.saveUsageData(data.cardId, existing);
  }

  /**
   * 生成平衡报告
   * @param {object} options - 报告选项 { minGames, includeCards, ... }
   * @returns {object} 平衡报告
   */
  generateBalanceReport(options = {}) {
    const { minGames = 5, includeCards = [] } = options;
    
    // 获取usageData中的数据（内存优先）
    const usageDataCards = Array.from(this.usageData.values());
    // 也从localStorage加载作为补充
    const storageCards = this.loadAllTrackedCards();
    
    // 合并去重（storage数据可能比内存新）
    const allCardsMap = new Map();
    for (const card of usageDataCards) {
      allCardsMap.set(card.cardId, card);
    }
    for (const card of storageCards) {
      if (!allCardsMap.has(card.cardId)) {
        allCardsMap.set(card.cardId, card);
      }
    }
    const allCards = Array.from(allCardsMap.values());
    
    const filteredCards = allCards.filter(card => card.gamesPlayed >= minGames);
    
    // 计算统计数据
    const stats = {
      totalCardsTracked: allCards.length,
      cardsAboveThreshold: 0,
      cardsBelowThreshold: 0,
      averageWinRate: 0,
      averageUseRate: 0,
      nerfsRecommended: [],
      buffsRecommended: [],
      neutralCards: [],
      generatedAt: Date.now()
    };

    if (filteredCards.length === 0) {
      return stats;
    }

    // 计算平均胜率
    const totalWinRate = filteredCards.reduce((sum, card) => sum + (card.winRate || 0), 0);
    stats.averageWinRate = totalWinRate / filteredCards.length;

    // 分类卡片
    for (const card of filteredCards) {
      const winRate = card.winRate || 0;
      const useRate = (card.gamesPlayed || 0) / Math.max(this.getTotalGames(), 1);

      if (winRate > this.NERF_THRESHOLD && useRate > this.USE_THRESHOLD) {
        stats.nerfsRecommended.push(this.createCardAnalysis(card, 'nerf'));
        stats.cardsAboveThreshold++;
      } else if (winRate < this.BUFF_THRESHOLD && useRate > this.USE_THRESHOLD) {
        stats.buffsRecommended.push(this.createCardAnalysis(card, 'buff'));
        stats.cardsBelowThreshold++;
      } else {
        stats.neutralCards.push(this.createCardAnalysis(card, 'neutral'));
      }
    }

    // 按胜率排序
    stats.nerfsRecommended.sort((a, b) => b.winRate - a.winRate);
    stats.buffsRecommended.sort((a, b) => a.winRate - b.winRate);
    stats.neutralCards.sort((a, b) => b.winRate - a.winRate);

    return stats;
  }

  /**
   * 建议削弱/增强
   * @param {object} options - 选项 { topN, category, ... }
   * @returns {Array} 建议列表
   */
  suggestNerfsOrBuffs(options = {}) {
    const { topN = 5, category = 'all' } = options;
    
    const report = this.generateBalanceReport({ minGames: 5 });
    
    const suggestions = [];
    
    // 添加nerf建议
    for (const card of report.nerfsRecommended.slice(0, topN)) {
      suggestions.push({
        cardId: card.cardId,
        type: 'nerf',
        reason: this.generateNerfReason(card),
        priority: this.calculatePriority(card, 'nerf'),
        currentStats: card,
        suggestedChange: this.generateNerfSuggestion(card)
      });
    }
    
    // 添加buff建议
    for (const card of report.buffsRecommended.slice(0, topN)) {
      suggestions.push({
        cardId: card.cardId,
        type: 'buff',
        reason: this.generateBuffReason(card),
        priority: this.calculatePriority(card, 'buff'),
        currentStats: card,
        suggestedChange: this.generateBuffSuggestion(card)
      });
    }
    
    // 按优先级排序
    suggestions.sort((a, b) => b.priority - a.priority);
    
    // 按类别过滤
    if (category !== 'all') {
      return suggestions.filter(s => s.type === category);
    }
    
    return suggestions;
  }

  /**
   * 获取能量效率报告
   * @param {string} deckId - 卡组ID（可选）
   * @returns {object} 能量效率报告
   */
  getEnergyEfficiencyReport(deckId = null) {
    const report = {
      deckId,
      averageEfficiency: 0,
      cardsByEfficiency: [],
      wastePercentage: 0,
      generatedAt: Date.now()
    };

    // 获取usageData中的数据（内存优先）
    const usageDataCards = Array.from(this.usageData.values());
    // 也从localStorage加载作为补充
    const storageCards = this.loadAllTrackedCards();
    
    // 合并去重
    const allCardsMap = new Map();
    for (const card of usageDataCards) {
      allCardsMap.set(card.cardId, card);
    }
    for (const card of storageCards) {
      if (!allCardsMap.has(card.cardId)) {
        allCardsMap.set(card.cardId, card);
      }
    }
    const allCards = Array.from(allCardsMap.values());
    
    // 计算能量效率
    for (const card of allCards) {
      if (card.energyEfficiency !== undefined && card.energyEfficiency > 0) {
        report.cardsByEfficiency.push({
          cardId: card.cardId,
          energyEfficiency: card.energyEfficiency,
          avgDamage: card.avgDamagePerGame,
          gamesPlayed: card.gamesPlayed
        });
      }
    }

    // 按效率排序
    report.cardsByEfficiency.sort((a, b) => b.energyEfficiency - a.energyEfficiency);

    // 计算平均值
    if (report.cardsByEfficiency.length > 0) {
      const totalEfficiency = report.cardsByEfficiency.reduce((sum, c) => sum + c.energyEfficiency, 0);
      report.averageEfficiency = totalEfficiency / report.cardsByEfficiency.length;
    }

    // 计算能量浪费百分比
    const tuningStats = this.tuner.getTuningStats();
    if (tuningStats.totalTunings > 0) {
      const highWasteCount = tuningStats.turnsWithBonus.filter(t => t.modifier.wastePercentage > 50).length;
      report.wastePercentage = (highWasteCount / tuningStats.totalTunings) * 100;
    }

    return report;
  }

  /**
   * 重置使用数据
   */
  resetUsageData() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('balance_feedback_'));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      this.usageData.clear();
    } catch (e) {
      console.warn('[BalanceFeedback] resetUsageData failed:', e);
    }
  }

  // ===== 内部辅助方法 =====

  saveUsageData(cardId, data) {
    try {
      localStorage.setItem('balance_feedback_' + cardId, JSON.stringify(data));
    } catch (e) {
      console.warn('[BalanceFeedback] saveUsageData failed:', e);
    }
  }

  loadUsageData(cardId) {
    try {
      const data = localStorage.getItem('balance_feedback_' + cardId);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  loadAllTrackedCards() {
    const cards = [];
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('balance_feedback_'));
      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          cards.push(JSON.parse(data));
        }
      }
    } catch (e) {
      console.warn('[BalanceFeedback] loadAllTrackedCards failed:', e);
    }
    return cards;
  }

  getTotalGames() {
    const cards = this.loadAllTrackedCards();
    return cards.reduce((sum, card) => sum + (card.gamesPlayed || 0), 0) || 1;
  }

  createCardAnalysis(card, analysisType) {
    return {
      cardId: card.cardId,
      winRate: card.winRate || 0,
      avgDamage: card.avgDamagePerGame || 0,
      gamesPlayed: card.gamesPlayed || 0,
      energyEfficiency: card.energyEfficiency || 0,
      analysisType,
      analyzedAt: Date.now()
    };
  }

  generateNerfReason(card) {
    const reasons = [];
    if (card.winRate > 0.70) reasons.push('very_high_win_rate');
    if (card.avgDamage > 15) reasons.push('high_damage_output');
    if (card.gamesPlayed > 20) reasons.push('popular_card');
    return reasons.join(', ') || 'above_threshold';
  }

  generateBuffReason(card) {
    const reasons = [];
    if (card.winRate < 0.30) reasons.push('very_low_win_rate');
    if (card.avgDamage < 8) reasons.push('low_damage_output');
    if (card.energyEfficiency < 3) reasons.push('low_energy_efficiency');
    return reasons.join(', ') || 'below_threshold';
  }

  calculatePriority(card, type) {
    let priority = 0;
    
    // 基于胜率差计算优先级
    if (type === 'nerf') {
      priority = (card.winRate - this.NERF_THRESHOLD) * 100;
      priority += (card.gamesPlayed || 0) / 10;
    } else {
      priority = (this.BUFF_THRESHOLD - card.winRate) * 100;
      priority += (card.gamesPlayed || 0) / 10;
    }
    
    return Math.round(priority * 100) / 100;
  }

  generateNerfSuggestion(card) {
    const suggestions = [];
    
    if (card.winRate > 0.70) {
      suggestions.push({ type: 'cost_increase', value: 1 });
    }
    if (card.avgDamage > 15) {
      suggestions.push({ type: 'damage_reduction', value: Math.round(card.avgDamage * 0.15) });
    }
    
    return suggestions.length > 0 ? suggestions : [{ type: 'cost_increase', value: 1 }];
  }

  generateBuffSuggestion(card) {
    const suggestions = [];
    
    if (card.winRate < 0.30) {
      suggestions.push({ type: 'cost_decrease', value: 1 });
    }
    if (card.avgDamage < 8) {
      suggestions.push({ type: 'damage_increase', value: Math.round(card.avgDamage * 0.20) });
    }
    if (card.energyEfficiency < 3) {
      suggestions.push({ type: 'effect_boost', value: 15 });
    }
    
    return suggestions.length > 0 ? suggestions : [{ type: 'cost_decrease', value: 1 }];
  }
}


// ===== 导出模块 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnergyTuner, EnergyHook, BalanceFeedback };
}