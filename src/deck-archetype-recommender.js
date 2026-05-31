/**
 * V264 Deck Archetype Recommender System (Iteration 9/9 - Final)
 * 卡组原型推荐系统: ArchetypeRecommender | MetaAnalyzer | DraftOptimizer | SynergyScorer
 * 
 * 概念：基于玩家风格和环境趋势推荐最优卡组配置
 * 设计来源: claude-code structured reasoning | nanobot parallel mesh | chatdev collaborative |
 *          thunderbolt pipeline | generic-agent autonomous | ruflo fuzzy pattern
 * 
 * 跨系统协同 (Cross-System Integration):
 * - 基于 metagame-evolution 分析环境趋势
 * - 基于 synergy-cascade 计算协同效果
 * - 基于 deck-archetype-evolution 计算卡组进化阶段
 * - 基于 battle-simulator 模拟对战表现
 * - 基于 card-draft-advisor 进行卡牌推荐
 * - 基于 replay-analysis 分析历史对战
 * - 基于 energy-tuning 计算能量曲线
 */

class MetaAnalyzer {
  constructor() {
    this.metaSnapshot = {
      timestamp: Date.now(),
      topArchetypes: [],
      winRates: new Map(),
      playRates: new Map(),
      emergingPatterns: []
    };
    this.analysisCache = new Map();
  }

  /**
   * 分析当前环境趋势
   * @param {object[]} recentMatches - 最近比赛数据
   * @returns {object} 环境分析结果
   */
  analyzeMetaTrend(recentMatches) {
    if (!recentMatches || recentMatches.length === 0) {
      return this.getDefaultMetaAnalysis();
    }

    const archetypeStats = this.calculateArchetypeStats(recentMatches);
    const emergingPatterns = this.detectEmergingPatterns(recentMatches);
    const counters = this.calculateCounterRelationships(archetypeStats);

    return {
      timestamp: Date.now(),
      topArchetypes: archetypeStats.sort((a, b) => b.winRate - a.winRate).slice(0, 5),
      winRateTrend: this.calculateWinRateTrend(recentMatches),
      pickRateTrend: this.calculatePickRateTrend(recentMatches),
      counters,
      emergingPatterns,
      recommendation: this.generateMetaRecommendation(archetypeStats, counters)
    };
  }

  /**
   * 计算卡组统计数据
   * @param {object[]} matches - 比赛数据
   * @returns {object[]} 卡组统计
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
          avgTurns: 0,
          totalTurns: 0
        });
      }
      
      const stats = statsMap.get(archetype);
      stats.totalGames++;
      if (match.result === 'win') stats.wins++;
      else stats.losses++;
      stats.totalTurns += match.turns || 0;
      stats.avgTurns = stats.totalTurns / stats.totalGames;
    }

    return Array.from(statsMap.values()).map(stats => ({
      ...stats,
      winRate: stats.totalGames > 0 ? stats.wins / stats.totalGames : 0,
      playRate: matches.filter(m => m.archetype === stats.archetype).length / matches.length
    }));
  }

  /**
   * 检测新兴模式
   * @param {object[]} matches - 比赛数据
   * @returns {object[]} 新兴模式列表
   */
  detectEmergingPatterns(matches) {
    const patterns = [];
    const recentMatches = matches.slice(-20);
    const archetypeCounts = {};
    
    for (const match of recentMatches) {
      const archetype = match.archetype || 'unknown';
      archetypeCounts[archetype] = (archetypeCounts[archetype] || 0) + 1;
    }

    for (const [archetype, count] of Object.entries(archetypeCounts)) {
      if (count >= 3 && count / recentMatches.length > 0.15) {
        patterns.push({
          archetype,
          frequency: count / recentMatches.length,
          trend: 'rising'
        });
      }
    }

    return patterns;
  }

  /**
   * 计算克制关系
   * @param {object[]} archetypeStats - 卡组统计
   * @returns {Map} 克制关系映射
   */
  calculateCounterRelationships(archetypeStats) {
    const counters = new Map();
    
    for (const arch1 of archetypeStats) {
      for (const arch2 of archetypeStats) {
        if (arch1.archetype === arch2.archetype) continue;
        
        // 基于胜率差计算克制关系
        const advantage = arch1.winRate - arch2.winRate;
        if (advantage > 0.1) {
          if (!counters.has(arch1.archetype)) {
            counters.set(arch1.archetype, []);
          }
          counters.get(arch1.archetype).push({
            counters: arch2.archetype,
            advantage: (advantage * 100).toFixed(1) + '%'
          });
        }
      }
    }

    return counters;
  }

  /**
   * 计算胜率趋势
   * @param {object[]} matches - 比赛数据
   * @returns {string} 趋势描述
   */
  calculateWinRateTrend(matches) {
    if (matches.length < 5) return 'insufficient_data';
    
    const half = Math.floor(matches.length / 2);
    const recentMatches = matches.slice(-half);
    const olderMatches = matches.slice(0, half);
    
    const recentWR = this.calculateWinRate(recentMatches);
    const olderWR = this.calculateWinRate(olderMatches);
    
    const diff = recentWR - olderWR;
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * 计算 pick rate 趋势
   * @param {object[]} matches - 比赛数据
   * @returns {string} 趋势描述
   */
  calculatePickRateTrend(matches) {
    if (matches.length < 10) return 'insufficient_data';
    
    const recentMatches = matches.slice(-5);
    const archetypeCounts = {};
    
    for (const match of recentMatches) {
      const archetype = match.archetype || 'unknown';
      archetypeCounts[archetype] = (archetypeCounts[archetype] || 0) + 1;
    }

    const mostPlayed = Object.entries(archetypeCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    return mostPlayed ? mostPlayed[0] : 'unknown';
  }

  /**
   * 生成环境推荐
   * @param {object[]} archetypeStats - 卡组统计
   * @param {Map} counters - 克制关系
   * @returns {object} 推荐结果
   */
  generateMetaRecommendation(archetypeStats, counters) {
    const topArchetype = archetypeStats[0];
    const counterPick = counters.get(topArchetype?.archetype)?.[0];

    return {
      primaryPick: topArchetype?.archetype || 'balanced',
      counterPick: counterPick?.counters || 'balanced',
      safetyPick: 'balanced',
      avoid: archetypeStats.filter(a => a.winRate < 0.4).map(a => a.archetype)
    };
  }

  /**
   * 获取默认环境分析
   * @returns {object} 默认分析
   */
  getDefaultMetaAnalysis() {
    return {
      timestamp: Date.now(),
      topArchetypes: [],
      winRateTrend: 'stable',
      pickRateTrend: 'unknown',
      counters: new Map(),
      emergingPatterns: [],
      recommendation: {
        primaryPick: 'balanced',
        counterPick: 'aggressive',
        safetyPick: 'balanced',
        avoid: []
      }
    };
  }

  /**
   * 计算胜率
   * @param {object[]} matches - 比赛数据
   * @returns {number} 胜率
   */
  calculateWinRate(matches) {
    if (matches.length === 0) return 0;
    const wins = matches.filter(m => m.result === 'win').length;
    return wins / matches.length;
  }
}

class SynergyScorer {
  constructor() {
    this.synergyMatrix = new Map();
    this.cache = new Map();
  }

  /**
   * 计算协同效果评分
   * @param {object[]} deck - 卡组
   * @param {object[]} availableCards - 可用卡牌
   * @returns {object} 协同评分结果
   */
  calculateSynergyScore(deck, availableCards = []) {
    const cacheKey = this.generateCacheKey(deck);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const internalSynergy = this.calculateInternalSynergy(deck);
    const potentialSynergy = availableCards.length > 0 
      ? this.calculatePotentialSynergy(deck, availableCards) 
      : 0;
    const curveScore = this.evaluateManaCurve(deck);
    const typeDistribution = this.analyzeTypeDistribution(deck);

    const result = {
      totalScore: internalSynergy * 0.6 + potentialSynergy * 0.2 + curveScore * 0.1 + typeDistribution * 0.1,
      internalSynergy,
      potentialSynergy,
      curveScore,
      typeDistribution,
      breakdown: {
        cardSynergies: this.findCardSynergies(deck),
        chainPotential: this.calculateChainPotential(deck),
        curveRating: curveScore > 70 ? 'excellent' : curveScore > 50 ? 'good' : 'poor'
      }
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * 生成缓存键
   * @param {object[]} deck - 卡组
   * @returns {string} 缓存键
   */
  generateCacheKey(deck) {
    const ids = deck.map(c => c.id).sort().join(',');
    return `deck_${ids}`;
  }

  /**
   * 计算内部协同
   * @param {object[]} deck - 卡组
   * @returns {number} 内部协同评分
   */
  calculateInternalSynergy(deck) {
    if (deck.length === 0) return 0;

    let synergyScore = 0;
    const cardTypes = {};
    const cardCosts = {};

    for (const card of deck) {
      const type = card.type || 'attack';
      const cost = card.cost || 0;
      
      cardTypes[type] = (cardTypes[type] || 0) + 1;
      cardCosts[cost] = (cardCosts[cost] || 0) + 1;
    }

    // 类型协同
    const types = Object.values(cardTypes);
    if (types.some(c => c >= 3)) synergyScore += 20;
    if (types.some(c => c >= 5)) synergyScore += 30;

    // 费用曲线协同
    const sortedCosts = Object.values(cardCosts).sort((a, b) => b - a);
    if (sortedCosts[0] <= deck.length * 0.4) synergyScore += 25;

    // 卡牌间协同
    synergyScore += this.findCardSynergies(deck).length * 15;

    return Math.min(100, synergyScore);
  }

  /**
   * 计算潜在协同
   * @param {object[]} deck - 卡组
   * @param {object[]} availableCards - 可用卡牌
   * @returns {number} 潜在协同评分
   */
  calculatePotentialSynergy(deck, availableCards) {
    if (deck.length === 0 || availableCards.length === 0) return 0;

    let potentialScore = 0;
    const deckTypes = new Set(deck.map(c => c.type));
    const deckCosts = deck.map(c => c.cost || 0);
    const avgCost = deckCosts.reduce((a, b) => a + b, 0) / deckCosts.length;

    for (const card of availableCards) {
      // 与现有类型的协同
      if (deckTypes.has(card.type)) potentialScore += 5;
      
      // 填补费用曲线空缺
      const costDiff = Math.abs((card.cost || 0) - avgCost);
      if (costDiff <= 1) potentialScore += 3;
    }

    return Math.min(100, potentialScore / availableCards.length * 100);
  }

  /**
   * 评估费用曲线
   * @param {object[]} deck - 卡组
   * @returns {number} 曲线评分
   */
  evaluateManaCurve(deck) {
    if (deck.length === 0) return 0;

    const costDistribution = {};
    for (const card of deck) {
      const cost = card.cost || 0;
      costDistribution[cost] = (costDistribution[cost] || 0) + 1;
    }

    // 理想曲线: 0-1费占40%, 2-3费占35%, 4+费占25%
    const lowCost = (costDistribution[0] || 0) + (costDistribution[1] || 0);
    const midCost = (costDistribution[2] || 0) + (costDistribution[3] || 0);
    
    const lowRatio = lowCost / deck.length;
    const midRatio = midCost / deck.length;

    let score = 0;
    if (lowRatio >= 0.3 && lowRatio <= 0.5) score += 40;
    else if (lowRatio > 0.5) score += 20;
    
    if (midRatio >= 0.3 && midRatio <= 0.45) score += 35;
    else if (midRatio > 0.45) score += 15;

    return Math.min(100, score);
  }

  /**
   * 分析类型分布
   * @param {object[]} deck - 卡组
   * @returns {number} 类型分布评分
   */
  analyzeTypeDistribution(deck) {
    if (deck.length === 0) return 0;

    const typeCount = {};
    for (const card of deck) {
      const type = card.type || 'attack';
      typeCount[type] = (typeCount[type] || 0) + 1;
    }

    const types = Object.values(typeCount);
    const maxTypeRatio = Math.max(...types) / deck.length;

    // 理想: 单一类型不超过60%
    if (maxTypeRatio <= 0.6) return 100;
    if (maxTypeRatio <= 0.75) return 70;
    if (maxTypeRatio <= 0.9) return 40;
    return 10;
  }

  /**
   * 查找卡牌协同
   * @param {object[]} deck - 卡组
   * @returns {object[]} 协同列表
   */
  findCardSynergies(deck) {
    const synergies = [];
    
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const synergy = this.checkPairSynergy(deck[i], deck[j]);
        if (synergy) {
          synergies.push({
            card1: deck[i].id,
            card2: deck[j].id,
            type: synergy.type,
            bonus: synergy.bonus
          });
        }
      }
    }

    return synergies;
  }

  /**
   * 检查卡牌对的协同效果
   * @param {object} card1 - 卡牌1
   * @param {object} card2 - 卡牌2
   * @returns {object|null} 协同效果
   */
  checkPairSynergy(card1, card2) {
    const synergies = [
      { types: ['attack', 'attack'], type: 'burst', bonus: 15 },
      { types: ['skill', 'power'], type: 'control', bonus: 20 },
      { types: ['attack', 'skill'], type: 'balanced', bonus: 10 },
      { types: ['power', 'power'], type: 'bomb', bonus: 25 }
    ];

    for (const synergy of synergies) {
      if (synergy.types.includes(card1.type) && synergy.types.includes(card2.type)) {
        return synergy;
      }
    }

    return null;
  }

  /**
   * 计算连锁潜力
   * @param {object[]} deck - 卡组
   * @returns {number} 连锁潜力评分
   */
  calculateChainPotential(deck) {
    let chainScore = 0;
    const costSorted = [...deck].sort((a, b) => (a.cost || 0) - (b.cost || 0));
    
    for (let i = 0; i < costSorted.length - 1; i++) {
      const diff = (costSorted[i + 1].cost || 0) - (costSorted[i].cost || 0);
      if (diff <= 1) chainScore += 10;
      if (diff === 0) chainScore += 5;
    }

    return Math.min(100, chainScore);
  }
}

class DraftOptimizer {
  constructor() {
    this.draftHistory = [];
    this.preferences = {
      aggression: 0.5,
      control: 0.5,
      tempo: 0.5
    };
  }

  /**
   * 优化抽牌策略
   * @param {object[]} pool - 卡牌池
   * @param {object} context - 上下文信息
   * @returns {object[]} 最优抽牌顺序
   */
  optimizeDraft(pool, context = {}) {
    if (!pool || pool.length === 0) return [];

    const scoredCards = pool.map(card => ({
      card,
      score: this.scoreCardForDraft(card, context)
    }));

    return scoredCards
      .sort((a, b) => b.score - a.score)
      .map(s => s.card);
  }

  /**
   * 评估单张卡牌
   * @param {object} card - 卡牌
   * @param {object} context - 上下文
   * @returns {number} 评分
   */
  scoreCardForDraft(card, context) {
    let score = 0;
    const { existingDeck = [], metaArchetype = null } = context;

    // 基础评分
    score += (card.power || 0) * 2;
    score += (card.cost || 0) <= 2 ? 10 : 0;
    
    // 与现有卡组协同
    if (existingDeck.length > 0) {
      const synergy = this.calculateDraftSynergy(card, existingDeck);
      score += synergy;
    }

    // 环境适应
    if (metaArchetype) {
      score += this.calculateMetaFit(card, metaArchetype);
    }

    // 费用曲线适应
    const deckCosts = existingDeck.map(c => c.cost || 0);
    const avgCost = deckCosts.length > 0 
      ? deckCosts.reduce((a, b) => a + b, 0) / deckCosts.length 
      : 2;
    
    if (Math.abs((card.cost || 0) - avgCost) <= 1) {
      score += 15;
    }

    return score;
  }

  /**
   * 计算抽牌协同
   * @param {object} card - 卡牌
   * @param {object[]} deck - 现有卡组
   * @returns {number} 协同评分
   */
  calculateDraftSynergy(card, deck) {
    let synergyScore = 0;
    const deckTypes = new Set(deck.map(c => c.type));
    
    if (deckTypes.has(card.type)) {
      synergyScore += 10;
    }

    for (const existingCard of deck) {
      if (this.cardsHaveSynergy(card, existingCard)) {
        synergyScore += 15;
      }
    }

    return synergyScore;
  }

  /**
   * 检查卡牌间是否有协同
   * @param {object} card1 - 卡牌1
   * @param {object} card2 - 卡牌2
   * @returns {boolean} 是否有协同
   */
  cardsHaveSynergy(card1, card2) {
    const synergyPairs = [
      ['attack', 'attack'],
      ['skill', 'power'],
      ['attack', 'skill']
    ];

    return synergyPairs.some(pair => 
      pair.includes(card1.type) && pair.includes(card2.type)
    );
  }

  /**
   * 计算环境适应性
   * @param {object} card - 卡牌
   * @param {string} metaArchetype - 环境卡组类型
   * @returns {number} 适应性评分
   */
  calculateMetaFit(card, metaArchetype) {
    const metaFits = {
      aggressive: { attack: 20, skill: 5, power: -5 },
      control: { skill: 20, power: 15, attack: -10 },
      balanced: { attack: 10, skill: 10, power: 10 }
    };

    const fitTable = metaFits[metaArchetype] || metaFits.balanced;
    return fitTable[card.type] || 0;
  }

  /**
   * 更新偏好设置
   * @param {string} preference - 偏好类型
   * @param {number} value - 偏好值
   */
  updatePreferences(preference, value) {
    if (preference in this.preferences) {
      this.preferences[preference] = Math.max(0, Math.min(1, value));
    }
  }
}

class ArchetypeRecommender {
  constructor() {
    this.analyzer = new MetaAnalyzer();
    this.synergyScorer = new SynergyScorer();
    this.draftOptimizer = new DraftOptimizer();
    this.recommendationCache = new Map();
    this.playerProfile = {
      preferredArchetypes: [],
      playStyle: 'balanced',
      winRate: 0.5,
      totalGames: 0
    };
  }

  /**
   * 推荐卡组
   * @param {object} playerData - 玩家数据
   * @param {object} context - 上下文
   * @returns {object} 推荐结果
   */
  recommendArchetype(playerData, context = {}) {
    const cacheKey = this.generatePlayerCacheKey(playerData);
    
    if (this.recommendationCache.has(cacheKey)) {
      return this.recommendationCache.get(cacheKey);
    }

    const metaAnalysis = this.analyzer.analyzeMetaTrend(context.recentMatches || []);
    const playerStyle = this.analyzePlayerStyle(playerData);
    const availableCards = context.availableCards || [];

    // 基于环境和玩家风格生成推荐
    const primaryArchetype = this.selectPrimaryArchetype(metaAnalysis, playerStyle);
    const complementaryArchetypes = this.findComplementaryArchetypes(primaryArchetype);
    
    const result = {
      primary: primaryArchetype,
      complementary: complementaryArchetypes,
      safetyPick: 'balanced',
      buildGuide: this.generateBuildGuide(primaryArchetype, availableCards),
      synergyTips: this.generateSynergyTips(primaryArchetype),
      metaAnalysis,
      playerStyle,
      confidence: this.calculateConfidence(playerData, context)
    };

    this.recommendationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 生成玩家缓存键
   * @param {object} playerData - 玩家数据
   * @returns {string} 缓存键
   */
  generatePlayerCacheKey(playerData) {
    return `player_${playerData.id || 'anonymous'}_${Date.now().toString(36)}`;
  }

  /**
   * 分析玩家风格
   * @param {object} playerData - 玩家数据
   * @returns {object} 风格分析结果
   */
  analyzePlayerStyle(playerData) {
    const { matchHistory = [], stats = {} } = playerData;
    
    const aggression = this.calculateAggressionScore(matchHistory);
    const control = this.calculateControlScore(matchHistory);
    const tempo = this.calculateTempoScore(matchHistory);

    let dominantStyle = 'balanced';
    const maxScore = Math.max(aggression, control, tempo);
    
    if (maxScore === aggression && aggression > 0.6) dominantStyle = 'aggressive';
    else if (maxScore === control && control > 0.6) dominantStyle = 'control';
    else if (maxScore === tempo && tempo > 0.6) dominantStyle = 'tempo';

    return {
      aggression,
      control,
      tempo,
      dominantStyle,
      description: this.getStyleDescription(dominantStyle)
    };
  }

  /**
   * 计算攻击性评分
   * @param {object[]} matchHistory - 比赛历史
   * @returns {number} 攻击性评分
   */
  calculateAggressionScore(matchHistory) {
    if (matchHistory.length === 0) return 0.5;
    
    const avgTurns = matchHistory.reduce((sum, m) => sum + (m.turns || 0), 0) / matchHistory.length;
    
    if (avgTurns < 10) return 0.8;
    if (avgTurns < 15) return 0.6;
    if (avgTurns < 20) return 0.4;
    return 0.2;
  }

  /**
   * 计算控制性评分
   * @param {object[]} matchHistory - 比赛历史
   * @returns {number} 控制性评分
   */
  calculateControlScore(matchHistory) {
    if (matchHistory.length === 0) return 0.5;
    
    const controlCards = matchHistory.flatMap(m => m.cards || []).filter(c => c.type === 'skill');
    const controlRatio = controlCards.length / Math.max(1, matchHistory.length * 3);
    
    return Math.min(1, controlRatio * 2);
  }

  /**
   * 计算节奏性评分
   * @param {object[]} matchHistory - 比赛历史
   * @returns {number} 节奏性评分
   */
  calculateTempoScore(matchHistory) {
    if (matchHistory.length === 0) return 0.5;
    
    const avgCardsPerTurn = matchHistory.reduce((sum, m) => {
      return sum + ((m.cardsPlayed || 0) / Math.max(1, m.turns || 1));
    }, 0) / matchHistory.length;
    
    return Math.min(1, avgCardsPerTurn / 2);
  }

  /**
   * 获取风格描述
   * @param {string} style - 风格类型
   * @returns {string} 风格描述
   */
  getStyleDescription(style) {
    const descriptions = {
      aggressive: '偏好快速结束战斗，通过高伤害卡牌压制对手',
      control: '偏好资源控制和持久战，通过控制类卡牌掌握节奏',
      tempo: '偏好节奏掌控，在适当时机打出关键卡牌',
      balanced: '没有明显的偏好，根据对手调整策略'
    };
    return descriptions[style] || descriptions.balanced;
  }

  /**
   * 选择主要卡组类型
   * @param {object} metaAnalysis - 环境分析
   * @param {object} playerStyle - 玩家风格
   * @returns {string} 卡组类型
   */
  selectPrimaryArchetype(metaAnalysis, playerStyle) {
    const { recommendation } = metaAnalysis;
    
    // 如果有强烈风格倾向，优先考虑玩家风格
    if (playerStyle.dominantStyle !== 'balanced') {
      // 检查该风格在当前环境中的可行性
      const styleArchetypes = {
        aggressive: ['aggro-burn', 'aggro-weapons', 'rush'],
        control: ['control-midrange', 'control-combo', ' stall'],
        tempo: ['tempo-mid', 'tempo-aggro', 'midrange']
      };
      
      const validArchetypes = styleArchetypes[playerStyle.dominantStyle] || [];
      const topArchetypes = recommendation.topArchetypes || [];
      const viableArchetype = topArchetypes.find(a => 
        validArchetypes.includes(a.archetype)
      );
      
      if (viableArchetype) return viableArchetype.archetype;
    }

    // 否则使用环境推荐
    return recommendation.primaryPick || 'balanced';
  }

  /**
   * 查找互补卡组类型
   * @param {string} primaryArchetype - 主要卡组类型
   * @returns {string[]} 互补卡组类型
   */
  findComplementaryArchetypes(primaryArchetype) {
    const complementaries = {
      'aggro-burn': ['tempo-mid', 'control-midrange'],
      'control-midrange': ['aggro-burn', 'tempo-mid'],
      'tempo-mid': ['aggro-burn', 'control-combo'],
      'balanced': ['aggro-burn', 'control-midrange', 'tempo-mid']
    };

    return complementaries[primaryArchetype] || ['balanced'];
  }

  /**
   * 生成构建指南
   * @param {string} archetype - 卡组类型
   * @param {object[]} availableCards - 可用卡牌
   * @returns {object} 构建指南
   */
  generateBuildGuide(archetype, availableCards) {
    const archetypeConfigs = {
      'aggro-burn': {
        cardRatio: { attack: 0.6, skill: 0.3, power: 0.1 },
        avgCost: 1.5,
        curve: 'low',
        synergyFocus: 'direct-damage'
      },
      'control-midrange': {
        cardRatio: { attack: 0.3, skill: 0.4, power: 0.3 },
        avgCost: 3.0,
        curve: 'mid',
        synergyFocus: 'value-generation'
      },
      'tempo-mid': {
        cardRatio: { attack: 0.4, skill: 0.35, power: 0.25 },
        avgCost: 2.5,
        curve: 'balanced',
        synergyFocus: 'tempo-swing'
      },
      'balanced': {
        cardRatio: { attack: 0.4, skill: 0.3, power: 0.3 },
        avgCost: 2.5,
        curve: 'balanced',
        synergyFocus: 'general-purpose'
      }
    };

    const config = archetypeConfigs[archetype] || archetypeConfigs.balanced;
    
    return {
      ...config,
      keyCards: this.findKeyCards(archetype, availableCards),
      replacements: this.suggestReplacements(archetype, availableCards)
    };
  }

  /**
   * 查找关键卡牌
   * @param {string} archetype - 卡组类型
   * @param {object[]} availableCards - 可用卡牌
   * @returns {object[]} 关键卡牌
   */
  findKeyCards(archetype, availableCards) {
    if (availableCards.length === 0) return [];
    
    const keyCardTypes = {
      'aggro-burn': ['attack', 'attack', 'attack'],
      'control-midrange': ['skill', 'power', 'skill'],
      'tempo-mid': ['attack', 'skill', 'power'],
      'balanced': ['attack', 'skill', 'power']
    };

    const types = keyCardTypes[archetype] || keyCardTypes.balanced;
    
    return availableCards
      .filter(card => types.includes(card.type))
      .sort((a, b) => (b.power || 0) - (a.power || 0))
      .slice(0, 3);
  }

  /**
   * 建议替换卡牌
   * @param {string} archetype - 卡组类型
   * @param {object[]} availableCards - 可用卡牌
   * @returns {object[]} 替换建议
   */
  suggestReplacements(archetype, availableCards) {
    const replacements = [];
    
    for (const card of availableCards.slice(0, 5)) {
      replacements.push({
        card: card.id,
        reason: 'Versatile card that fits multiple archetypes'
      });
    }

    return replacements;
  }

  /**
   * 生成协同提示
   * @param {string} archetype - 卡组类型
   * @returns {string[]} 协同提示
   */
  generateSynergyTips(archetype) {
    const tips = {
      'aggro-burn': [
        '优先打出低费攻击牌建立优势',
        '保留关键伤害卡牌在适当时机爆发',
        '注意保持手牌数量避免断牌'
      ],
      'control-midrange': [
        '利用控制牌限制对手展开',
        '在中后期通过高质量卡牌积累优势',
        '注意节奏控制避免被对手压制'
      ],
      'tempo-mid': [
        '抓住对手节奏间隙打出关键牌',
        '保持场面控制和资源平衡',
        '适当时机转变为进攻态势'
      ],
      'balanced': [
        '根据对手调整出牌策略',
        '保持灵活的资源分配',
        '注意观察对手卡组类型针对性出牌'
      ]
    };

    return tips[archetype] || tips.balanced;
  }

  /**
   * 计算推荐置信度
   * @param {object} playerData - 玩家数据
   * @param {object} context - 上下文
   * @returns {number} 置信度
   */
  calculateConfidence(playerData, context) {
    let confidence = 0.5;
    
    const matchCount = playerData.matchHistory?.length || 0;
    if (matchCount >= 20) confidence += 0.2;
    else if (matchCount >= 10) confidence += 0.1;
    else if (matchCount >= 5) confidence += 0.05;

    const recentMatches = context.recentMatches || [];
    if (recentMatches.length >= 10) confidence += 0.15;
    else if (recentMatches.length >= 5) confidence += 0.1;

    if (playerData.stats?.winRate !== undefined) {
      const wrDiff = Math.abs(playerData.stats.winRate - 0.5);
      confidence += wrDiff * 0.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 分析卡组完整性
   * @param {object[]} deck - 卡组
   * @returns {object} 完整性分析
   */
  analyzeDeckCompleteness(deck) {
    if (deck.length === 0) {
      return {
        complete: false,
        score: 0,
        issues: ['Deck is empty']
      };
    }

    const issues = [];
    let score = 100;

    // 检查卡组大小
    if (deck.length < 20) {
      issues.push('Deck has fewer than 20 cards');
      score -= (20 - deck.length) * 2;
    } else if (deck.length > 30) {
      issues.push('Deck has more than 30 cards');
      score -= (deck.length - 30) * 2;
    }

    // 检查费用曲线
    const costs = deck.map(c => c.cost || 0);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    if (avgCost < 2) {
      issues.push('Average mana cost is too low');
      score -= 10;
    } else if (avgCost > 4) {
      issues.push('Average mana cost is too high');
      score -= 10;
    }

    // 检查类型分布
    const typeCount = {};
    for (const card of deck) {
      const type = card.type || 'attack';
      typeCount[type] = (typeCount[type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCount)) {
      const ratio = count / deck.length;
      if (ratio > 0.7) {
        issues.push(`${type} type is overrepresented (${(ratio * 100).toFixed(0)}%)`);
        score -= 15;
      }
    }

    return {
      complete: score >= 80 && issues.length === 0,
      score: Math.max(0, score),
      issues,
      warnings: score < 100 ? issues : []
    };
  }
}

module.exports = {
  MetaAnalyzer,
  SynergyScorer,
  DraftOptimizer,
  ArchetypeRecommender
};