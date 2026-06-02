/**
 * Deck Optimizer (Iteration 2/9)
 * 基于约束（能量曲线、类型分布）的卡组优化
 * 模拟不同对手的胜率预测
 * 生成分步优化路径
 */

class DeckOptimizer {
  constructor(constraints = {}) {
    this.constraints = {
      maxCards: constraints.maxCards || 20,
      minCards: constraints.minCards || 10,
      maxCost: constraints.maxCost || 10,
      idealLowCostRatio: constraints.idealLowCostRatio || 0.4,
      idealMidCostRatio: constraints.idealMidCostRatio || 0.35,
      idealHighCostRatio: constraints.idealHighCostRatio || 0.25,
      maxTypeRatio: constraints.maxTypeRatio || 0.6,
      targetWinRate: constraints.targetWinRate || 0.5
    };
  }

  /**
   * 优化卡组
   * @param {object[]} deck - 卡组
   * @param {object} options - 优化选项
   * @returns {object} 优化结果
   */
  optimize(deck, options = {}) {
    const targetWinRate = options.targetWinRate || this.constraints.targetWinRate;
    const maxCards = options.maxCards || this.constraints.maxCards;
    
    // 验证约束
    const validation = this.validateConstraints(deck);
    if (validation !== true) {
      return {
        optimizedDeck: deck,
        validationErrors: validation,
        improvements: 0
      };
    }

    // 计算当前分数
    const currentScore = this.scoreDeck(deck);
    
    // 生成优化路径
    const optimizationPath = this.generateOptimizationPath(deck);
    
    // 应用最优优化
    let optimizedDeck = [...deck];
    let bestScore = currentScore;
    
    for (const step of optimizationPath) {
      const newDeck = this.applyOptimizationStep(optimizedDeck, step);
      const newScore = this.scoreDeck(newDeck);
      
      if (newScore > bestScore) {
        bestScore = newScore;
        optimizedDeck = newDeck;
      }
    }

    // 限制卡牌数量
    if (optimizedDeck.length > maxCards) {
      optimizedDeck = this.trimDeck(optimizedDeck, maxCards);
    }

    return {
      optimizedDeck,
      originalScore: currentScore,
      optimizedScore: bestScore,
      improvements: bestScore - currentScore,
      optimizationPath
    };
  }

  /**
   * 验证约束
   * @param {object[]} deck - 卡组
   * @returns {boolean|object} 验证结果
   */
  validateConstraints(deck) {
    const errors = [];

    // 卡牌数量限制
    if (deck.length > this.constraints.maxCards) {
      errors.push({ type: 'max_cards', value: deck.length, limit: this.constraints.maxCards });
    }
    if (deck.length < this.constraints.minCards) {
      errors.push({ type: 'min_cards', value: deck.length, limit: this.constraints.minCards });
    }

    // 能量曲线验证
    const curveValidation = this.validateManaCurve(deck);
    if (curveValidation !== true) {
      errors.push(curveValidation);
    }

    // 类型分布验证
    const typeValidation = this.validateTypeDistribution(deck);
    if (typeValidation !== true) {
      errors.push(typeValidation);
    }

    return errors.length === 0 ? true : errors;
  }

  /**
   * 验证能量曲线
   * @param {object[]} deck - 卡组
   * @returns {boolean|object} 验证结果
   */
  validateManaCurve(deck) {
    if (deck.length === 0) return true;

    const costDist = this.getCostDistribution(deck);
    const lowRatio = costDist.low / deck.length;
    const midRatio = costDist.mid / deck.length;
    const highRatio = costDist.high / deck.length;

    // 验证能量曲线是否合理
    if (lowRatio > 0.7) {
      return { type: 'mana_curve', issue: 'too_many_low_cost', value: lowRatio };
    }
    if (highRatio > 0.4) {
      return { type: 'mana_curve', issue: 'too_many_high_cost', value: highRatio };
    }

    return true;
  }

  /**
   * 验证类型分布
   * @param {object[]} deck - 卡组
   * @returns {boolean|object} 验证结果
   */
  validateTypeDistribution(deck) {
    if (deck.length === 0) return true;

    const typeCounts = {};
    for (const card of deck) {
      const type = card.type || 'attack';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    const maxRatio = Math.max(...Object.values(typeCounts)) / deck.length;
    
    if (maxRatio > this.constraints.maxTypeRatio) {
      return { type: 'type_distribution', issue: 'type_imbalance', value: maxRatio };
    }

    return true;
  }

  /**
   * 生成优化路径
   * @param {object[]} deck - 卡组
   * @returns {object[]} 优化步骤列表
   */
  generateOptimizationPath(deck) {
    const steps = [];
    let stepNumber = 1;
    let cumulativeScore = this.scoreDeck(deck);

    // 分析当前卡组问题
    const issues = this.identifyIssues(deck);

    // 生成添加卡牌步骤
    for (const issue of issues.missingSynergies || []) {
      steps.push({
        step: stepNumber++,
        action: 'add',
        card: issue.suggestedCard,
        reason: issue.reason,
        improvement: issue.potentialImprovement,
        cumulativeScore: cumulativeScore + issue.potentialImprovement
      });
      cumulativeScore += issue.potentialImprovement;
    }

    // 生成替换卡牌步骤
    for (const issue of issues.poorSynergies || []) {
      steps.push({
        step: stepNumber++,
        action: 'replace',
        remove: issue.card,
        add: issue.suggestedReplacement,
        reason: issue.reason,
        improvement: issue.potentialImprovement,
        cumulativeScore: cumulativeScore + issue.potentialImprovement
      });
      cumulativeScore += issue.potentialImprovement;
    }

    // 生成移除卡牌步骤
    for (const issue of issues.redundancies || []) {
      steps.push({
        step: stepNumber++,
        action: 'remove',
        card: issue.card,
        reason: issue.reason,
        improvement: issue.potentialImprovement,
        cumulativeScore: cumulativeScore + issue.potentialImprovement
      });
      cumulativeScore += issue.potentialImprovement;
    }

    return steps;
  }

  /**
   * 识别卡组问题
   * @param {object[]} deck - 卡组
   * @returns {object} 问题列表
   */
  identifyIssues(deck) {
    const issues = {
      missingSynergies: [],
      poorSynergies: [],
      redundancies: []
    };

    // 检查协同缺失
    const synergyAnalysis = this.analyzeDeckSynergies(deck);
    if (synergyAnalysis.score < 40) {
      issues.missingSynergies.push({
        suggestedCard: { id: 'suggested', name: 'Suggested Card', type: 'attack', cost: 2 },
        reason: 'low_synergy',
        potentialImprovement: 15
      });
    }

    // 检查冗余
    const cardCounts = {};
    for (const card of deck) {
      const id = card.id;
      if (!cardCounts[id]) cardCounts[id] = 0;
      cardCounts[id]++;
    }

    for (const [id, count] of Object.entries(cardCounts)) {
      if (count > 3) {
        const card = deck.find(c => c.id === id);
        issues.redundancies.push({
          card,
          reason: 'too_many_copies',
          potentialImprovement: 5
        });
      }
    }

    return issues;
  }

  /**
   * 分析卡组协同
   * @param {object[]} deck - 卡组
   * @returns {object} 协同分析
   */
  analyzeDeckSynergies(deck) {
    if (deck.length === 0) return { score: 0 };
    if (deck.length === 1) return { score: 50 }; // Single card has neutral synergy

    let synergyScore = 0;

    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const type1 = deck[i].type || 'attack';
        const type2 = deck[j].type || 'attack';
        const key = `${type1}-${type2}`;
        const reverseKey = `${type2}-${type1}`;
        
        const synergyMap = {
          'attack-attack': 15,
          'skill-skill': 18,
          'power-power': 25,
          'attack-skill': 10,
          'attack-power': 12,
          'skill-power': 20
        };

        synergyScore += synergyMap[key] || synergyMap[reverseKey] || 5;
      }
    }

    const pairCount = deck.length * (deck.length - 1) / 2;
    if (pairCount === 0) return { score: 50 };
    
    const maxSynergy = pairCount * 25;
    const normalizedScore = (synergyScore / maxSynergy) * 100;

    return { score: Math.min(100, Math.round(normalizedScore)) };
  }

  /**
   * 应用优化步骤
   * @param {object[]} deck - 卡组
   * @param {object} step - 优化步骤
   * @returns {object[]} 应用后的卡组
   */
  applyOptimizationStep(deck, step) {
    const newDeck = [...deck];

    switch (step.action) {
      case 'add':
        newDeck.push(step.card);
        break;
      case 'remove':
        const removeIndex = newDeck.findIndex(c => c.id === step.card.id);
        if (removeIndex !== -1) newDeck.splice(removeIndex, 1);
        break;
      case 'replace':
        const replaceIndex = newDeck.findIndex(c => c.id === step.remove.id);
        if (replaceIndex !== -1) {
          newDeck.splice(replaceIndex, 1, step.add);
        }
        break;
    }

    return newDeck;
  }

  /**
   * 精简卡组
   * @param {object[]} deck - 卡组
   * @param {number} maxSize - 最大 size
   * @returns {object[]} 精简后的卡组
   */
  trimDeck(deck, maxSize) {
    // 按优先级排序：保留高协同、高费用的卡牌
    const scored = deck.map((card, index) => ({
      card,
      index,
      score: (card.cost || 0) * 5 + (card.type === 'power' ? 20 : 0)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxSize).map(s => s.card);
  }

  /**
   * 模拟胜率
   * @param {object[]} deck - 玩家卡组
   * @param {object[]} opponentDeck - 对手卡组
   * @returns {number} 预测胜率
   */
  simulateWinRate(deck, opponentDeck) {
    if (deck.length === 0 || opponentDeck.length === 0) return 0.5;
    
    // 基于卡组分数和对手对比计算胜率
    const deckScore = this.scoreDeck(deck);
    const opponentScore = this.scoreDeck(opponentDeck);
    
    if (deckScore === 0 && opponentScore === 0) return 0.5;
    
    const scoreDiff = deckScore - opponentScore;
    
    // 使用 sigmoid 函数归一化
    const winRate = 1 / (1 + Math.exp(-scoreDiff / 30));
    
    return Math.round(winRate * 100) / 100;
  }

  /**
   * 优化能量曲线
   * @param {object[]} deck - 卡组
   * @returns {object} 优化结果
   */
  optimizeManaCurve(deck) {
    if (deck.length === 0) {
      return { lowCostRatio: 0, midCostRatio: 0, highCostRatio: 0, curveScore: 0, suggestions: [] };
    }
    
    const costDist = this.getCostDistribution(deck);
    
    const lowRatio = costDist.low / deck.length;
    const midRatio = costDist.mid / deck.length;
    const highRatio = costDist.high / deck.length;

    const idealLow = this.constraints.idealLowCostRatio;
    const idealMid = this.constraints.idealMidCostRatio;
    const idealHigh = this.constraints.idealHighCostRatio;

    // 计算曲线评分
    let curveScore = 100;
    curveScore -= Math.abs(lowRatio - idealLow) * 100;
    curveScore -= Math.abs(midRatio - idealMid) * 100;
    curveScore -= Math.abs(highRatio - idealHigh) * 100;
    curveScore = Math.max(0, curveScore);

    return {
      lowCostRatio: lowRatio,
      midCostRatio: midRatio,
      highCostRatio: highRatio,
      curveScore: Math.round(curveScore),
      suggestions: this.getManaCurveSuggestions(costDist, deck.length)
    };
  }

  /**
   * 获取费用分布
   * @param {object[]} deck - 卡组
   * @returns {object} 费用分布
   */
  getCostDistribution(deck) {
    const costs = { low: 0, mid: 0, high: 0 };
    
    for (const card of deck) {
      const cost = card.cost || 0;
      if (cost <= 1) costs.low++;
      else if (cost <= 3) costs.mid++;
      else costs.high++;
    }

    return costs;
  }

  /**
   * 获取能量曲线建议
   * @param {object} costDist - 费用分布
   * @param {number} deckSize - 卡组大小
   * @returns {object[]} 建议列表
   */
  getManaCurveSuggestions(costDist, deckSize) {
    if (deckSize === 0) return [];
    
    const suggestions = [];
    
    const lowRatio = costDist.low / deckSize;
    const midRatio = costDist.mid / deckSize;
    const highRatio = costDist.high / deckSize;

    if (lowRatio < 0.3) {
      suggestions.push({ type: 'add_low_cost', priority: 'high', message: '需要更多低费卡牌' });
    }
    if (midRatio < 0.25) {
      suggestions.push({ type: 'add_mid_cost', priority: 'medium', message: '需要更多中费卡牌' });
    }
    if (highRatio > 0.35) {
      suggestions.push({ type: 'reduce_high_cost', priority: 'high', message: '高费卡牌过多' });
    }

    return suggestions;
  }

  /**
   * 优化类型分布
   * @param {object[]} deck - 卡组
   * @returns {object} 优化结果
   */
  optimizeTypeDistribution(deck) {
    if (deck.length === 0) {
      return { attackRatio: 0, skillRatio: 0, powerRatio: 0, typeScore: 0, suggestions: [] };
    }
    
    const typeCounts = {};
    for (const card of deck) {
      const type = card.type || 'attack';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    const attackCount = typeCounts.attack || 0;
    const skillCount = typeCounts.skill || 0;
    const powerCount = typeCounts.power || 0;

    const attackRatio = attackCount / deck.length;
    const skillRatio = skillCount / deck.length;
    const powerRatio = powerCount / deck.length;

    // 计算类型评分
    let typeScore = 100;
    if (attackRatio > 0.7) typeScore -= 30;
    if (skillRatio > 0.6) typeScore -= 20;
    if (powerRatio > 0.3) typeScore -= 20;
    if (attackRatio < 0.2) typeScore -= 15;
    
    typeScore = Math.max(0, typeScore);

    return {
      attackRatio,
      skillRatio,
      powerRatio,
      typeScore: Math.round(typeScore),
      suggestions: this.getTypeDistributionSuggestions(typeCounts, deck.length)
    };
  }

  /**
   * 获取类型分布建议
   * @param {object} typeCounts - 类型计数
   * @param {number} deckSize - 卡组大小
   * @returns {object[]} 建议列表
   */
  getTypeDistributionSuggestions(typeCounts, deckSize) {
    if (deckSize === 0) return [];
    
    const suggestions = [];
    
    const attackRatio = (typeCounts.attack || 0) / deckSize;
    const skillRatio = (typeCounts.skill || 0) / deckSize;
    const powerRatio = (typeCounts.power || 0) / deckSize;

    if (attackRatio > 0.7) {
      suggestions.push({ type: 'add_skill', priority: 'high', message: '攻击牌过多，需要技能牌' });
    }
    if (skillRatio > 0.6) {
      suggestions.push({ type: 'add_attack', priority: 'high', message: '技能牌过多，需要攻击牌' });
    }
    if (powerRatio < 0.1 && deckSize > 10) {
      suggestions.push({ type: 'add_power', priority: 'medium', message: '缺少power牌' });
    }

    return suggestions;
  }

  /**
   * 查找替代卡牌
   * @param {string} cardId - 卡牌ID
   * @param {object[]} deck - 卡组
   * @returns {object[]} 替代卡牌列表
   */
  findReplacements(cardId, deck) {
    const card = deck.find(c => c.id === cardId);
    if (!card) return [];

    // 查找相似费用和类型的卡牌
    return deck
      .filter(c => c.id !== cardId && c.cost === card.cost)
      .map(c => ({
        card: c,
        similarity: c.type === card.type ? 100 : 50
      }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 评估卡组分数
   * @param {object[]} deck - 卡组
   * @returns {number} 卡组分数
   */
  scoreDeck(deck) {
    if (deck.length === 0) return 0;

    // 协同分数
    const synergyResult = this.analyzeDeckSynergies(deck);
    const synergyScore = synergyResult.score;
    
    // 能量曲线分数
    const curveResult = this.optimizeManaCurve(deck);
    const curveScore = curveResult.curveScore;
    
    // 类型分布分数
    const typeResult = this.optimizeTypeDistribution(deck);
    const typeScore = typeResult.typeScore;
    
    // 加权总分
    const totalScore = synergyScore * 0.4 + curveScore * 0.3 + typeScore * 0.3;
    
    return Math.round(totalScore);
  }
}

module.exports = { DeckOptimizer };