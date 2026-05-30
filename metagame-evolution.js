/**
 * V101 Metagame Evolution Season System
 * 卡牌meta自动进化系统：MetagameTracker | EvolutionEngine | SeasonManager | HonorReward
 * 
 * 概念：卡牌/卡组随实战数据自动进化（动态buff/nerf），赛季结束后结算荣耀奖励
 * 设计来源：generic-agent Self-Evolution | thunderbolt feedback loops | chatdev multi-agent
 */

// ===== MetagameTracker - 卡牌/卡组使用数据追踪 =====
class MetagameTracker {
  constructor() {
    this.CARD_PREFIX = 'metagame_card_';
    this.DECK_PREFIX = 'metagame_deck_';
  }

  /**
   * 记录卡牌使用数据
   * @param {string} cardId - 卡牌ID
   * @param {object} stats - 统计数据 { wins, losses, damageDealt, turnsPlayed, gamesPlayed }
   */
  trackCardUsage(cardId, stats) {
    if (!cardId || !stats) return;
    const key = this.CARD_PREFIX + cardId;
    const existing = this.getCardStats(cardId);
    
    const updated = {
      playCount: (existing.playCount || 0) + (stats.gamesPlayed || 1),
      winCount: (existing.winCount || 0) + (stats.wins || 0),
      totalDamage: (existing.totalDamage || 0) + (stats.damageDealt || 0),
      totalTurns: (existing.totalTurns || 0) + (stats.turnsPlayed || 0),
      lastUpdated: Date.now()
    };
    
    // 计算胜率
    updated.winRate = updated.playCount > 0 ? updated.winCount / updated.playCount : 0;
    // 计算平均伤害
    updated.avgDamage = updated.playCount > 0 ? updated.totalDamage / updated.playCount : 0;
    // 计算平均回合数
    updated.avgTurns = updated.playCount > 0 ? updated.totalTurns / updated.playCount : 0;
    
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('MetagameTracker save failed:', e);
    }
  }

  /**
   * 记录卡组使用数据
   * @param {string} deckId - 卡组ID
   * @param {object} stats - 统计数据
   */
  trackDeckUsage(deckId, stats) {
    if (!deckId || !stats) return;
    const key = this.DECK_PREFIX + deckId;
    const existing = this.getDeckStats(deckId);
    
    const updated = {
      playCount: (existing.playCount || 0) + (stats.gamesPlayed || 1),
      winCount: (existing.winCount || 0) + (stats.wins || 0),
      totalDamage: (existing.totalDamage || 0) + (stats.damageDealt || 0),
      lastUpdated: Date.now()
    };
    
    updated.winRate = updated.playCount > 0 ? updated.winCount / updated.playCount : 0;
    
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('MetagameTracker deck save failed:', e);
    }
  }

  /**
   * 获取卡牌统计数据
   * @param {string} cardId - 卡牌ID
   * @returns {object} 卡牌统计数据
   */
  getCardStats(cardId) {
    if (!cardId) return null;
    try {
      const data = localStorage.getItem(this.CARD_PREFIX + cardId);
      return data ? JSON.parse(data) : {
        playCount: 0,
        winCount: 0,
        totalDamage: 0,
        totalTurns: 0,
        winRate: 0,
        avgDamage: 0,
        avgTurns: 0,
        lastUpdated: null
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取卡组统计数据
   * @param {string} deckId - 卡组ID
   * @returns {object} 卡组统计数据
   */
  getDeckStats(deckId) {
    if (!deckId) return null;
    try {
      const data = localStorage.getItem(this.DECK_PREFIX + deckId);
      return data ? JSON.parse(data) : {
        playCount: 0,
        winCount: 0,
        totalDamage: 0,
        winRate: 0,
        lastUpdated: null
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取所有卡牌的使用统计（用于meta分析）
   * @returns {object} 所有卡牌统计
   */
  getAllCardStats() {
    const result = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CARD_PREFIX)) {
          const cardId = key.replace(this.CARD_PREFIX, '');
          result[cardId] = this.getCardStats(cardId);
        }
      }
    } catch (e) {
      console.warn('MetagameTracker getAllCardStats failed:', e);
    }
    return result;
  }

  /**
   * 重置卡牌追踪数据
   * @param {string} cardId - 卡牌ID，不传则重置所有
   */
  resetCardStats(cardId) {
    if (cardId) {
      localStorage.removeItem(this.CARD_PREFIX + cardId);
    } else {
      // 重置所有卡牌数据
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CARD_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    }
  }

  /**
   * 重置卡组追踪数据
   * @param {string} deckId - 卡组ID，不传则重置所有
   */
  resetDeckStats(deckId) {
    if (deckId) {
      localStorage.removeItem(this.DECK_PREFIX + deckId);
    } else {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.DECK_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}

// ===== EvolutionEngine - meta分析与自动进化 =====
class EvolutionEngine {
  constructor(metagameTracker) {
    this.tracker = metagameTracker || new MetagameTracker();
    this.EVOLUTION_THRESHOLD = 10; // 使用次数 >=10 时触发分析
    this.BUFF_THRESHOLD = 0.55;    // 胜率 >55% → buff
    this.NERF_THRESHOLD = 0.45;    // 胜率 <45% → nerf
    this.MIN_EVOLUTION = 0.10;     // 最小进化幅度 10%
    this.MAX_EVOLUTION = 0.20;     // 最大进化幅度 20%
    this.evolutionCache = new Map(); // 缓存进化后的卡牌数据
  }

  /**
   * 分析当前meta，决定哪些卡牌需要进化
   * @returns {object} meta分析结果 { cardsToBuff, cardsToNerf, analysisDetails }
   */
  analyzeMeta() {
    const allStats = this.tracker.getAllCardStats();
    const cardsToBuff = [];
    const cardsToNerf = [];
    const analysisDetails = [];

    for (const [cardId, stats] of Object.entries(allStats)) {
      if (stats.playCount < this.EVOLUTION_THRESHOLD) {
        continue; // 使用次数不足，跳过
      }

      const analysis = {
        cardId,
        playCount: stats.playCount,
        winRate: stats.winRate,
        avgDamage: stats.avgDamage,
        recommendation: null,
        evolutionMagnitude: 0
      };

      if (stats.winRate > this.BUFF_THRESHOLD) {
        // 高胜率卡牌 → buff
        analysis.recommendation = 'buff';
        // 进化幅度与胜率成正比，胜率越高buff越多
        const magnitude = this.MIN_EVOLUTION + (stats.winRate - this.BUFF_THRESHOLD) * (this.MAX_EVOLUTION - this.MIN_EVOLUTION) / (1 - this.BUFF_THRESHOLD);
        analysis.evolutionMagnitude = Math.min(this.MAX_EVOLUTION, magnitude);
        cardsToBuff.push(cardId);
      } else if (stats.winRate < this.NERF_THRESHOLD) {
        // 低胜率卡牌 → nerf
        analysis.recommendation = 'nerf';
        const magnitude = this.MIN_EVOLUTION + (this.NERF_THRESHOLD - stats.winRate) * (this.MAX_EVOLUTION - this.MIN_EVOLUTION) / this.NERF_THRESHOLD;
        analysis.evolutionMagnitude = Math.min(this.MAX_EVOLUTION, magnitude);
        cardsToNerf.push(cardId);
      }

      if (analysis.recommendation) {
        analysisDetails.push(analysis);
      }
    }

    return {
      cardsToBuff,
      cardsToNerf,
      analysisDetails,
      timestamp: Date.now()
    };
  }

  /**
   * 应用进化到卡牌数据（临时修改，不影响原卡牌）
   * @param {string} cardId - 卡牌ID
   * @param {object} originalCard - 原始卡牌数据
   * @returns {object} 进化后的卡牌数据
   */
  applyEvolutionToCard(cardId, originalCard) {
    if (!cardId || !originalCard) return originalCard;
    
    const stats = this.tracker.getCardStats(cardId);
    if (!stats || stats.playCount < this.EVOLUTION_THRESHOLD) {
      return originalCard; // 不足以触发进化
    }

    const cacheKey = cardId + '_' + JSON.stringify(originalCard);
    if (this.evolutionCache.has(cacheKey)) {
      return this.evolutionCache.get(cacheKey);
    }

    let evolutionMagnitude = 0;
    let recommendation = null;

    if (stats.winRate > this.BUFF_THRESHOLD) {
      recommendation = 'buff';
      evolutionMagnitude = this.MIN_EVOLUTION + (stats.winRate - this.BUFF_THRESHOLD) * (this.MAX_EVOLUTION - this.MIN_EVOLUTION) / (1 - this.BUFF_THRESHOLD);
    } else if (stats.winRate < this.NERF_THRESHOLD) {
      recommendation = 'nerf';
      evolutionMagnitude = this.MIN_EVOLUTION + (this.NERF_THRESHOLD - stats.winRate) * (this.MAX_EVOLUTION - this.MIN_EVOLUTION) / this.NERF_THRESHOLD;
    } else {
      return originalCard; // 无需进化
    }

    evolutionMagnitude = Math.min(this.MAX_EVOLUTION, Math.max(0, evolutionMagnitude));

    // 创建进化后的卡牌副本
    const evolved = JSON.parse(JSON.stringify(originalCard));
    evolved._evolution = {
      recommendation,
      magnitude: evolutionMagnitude,
      originalStats: { ...stats },
      appliedAt: Date.now()
    };

    // 应用进化效果
    if (evolved.damage !== undefined) {
      if (recommendation === 'buff') {
        evolved.damage = Math.round(evolved.damage * (1 + evolutionMagnitude));
      } else {
        evolved.damage = Math.round(evolved.damage * (1 - evolutionMagnitude));
      }
    }

    if (evolved.cost !== undefined) {
      const costChange = Math.round(evolved.cost * evolutionMagnitude);
      if (costChange === 0) {
        evolved.cost = recommendation === 'buff' ? Math.max(0, evolved.cost - 1) : evolved.cost + 1;
      } else if (recommendation === 'buff') {
        // buff时降低cost（更有价值）
        evolved.cost = Math.max(0, evolved.cost - costChange);
      } else {
        // nerf时提高cost
        evolved.cost = evolved.cost + costChange;
      }
    }

    if (evolved.effect) {
      // 可以扩展效果数值
      evolved._evolution.effectMultiplier = recommendation === 'buff' ? (1 + evolutionMagnitude) : (1 - evolutionMagnitude);
    }

    this.evolutionCache.set(cacheKey, evolved);
    return evolved;
  }

  /**
   * 获取进化后的卡牌（不影响原卡牌）
   * @param {string} cardId - 卡牌ID
   * @returns {object|null} 进化后的卡牌数据或null
   */
  getEvolvedCard(cardId) {
    // 尝试从游戏数据中获取原卡牌
    if (typeof window !== 'undefined' && window.ALL_CARDS) {
      const originalCard = window.ALL_CARDS[cardId];
      if (originalCard) {
        return this.applyEvolutionToCard(cardId, originalCard);
      }
    }
    return null;
  }

  /**
   * 清除进化缓存
   */
  clearCache() {
    this.evolutionCache.clear();
  }

  /**
   * 获取当前进化状态
   * @returns {object} 当前buff/nerf状态
   */
  getEvolutionStatus() {
    const analysis = this.analyzeMeta();
    return {
      totalCardsAnalyzed: analysis.analysisDetails.length,
      buffedCards: analysis.cardsToBuff,
      nerfedCards: analysis.cardsToNerf,
      lastAnalysis: analysis.timestamp
    };
  }
}

// ===== SeasonManager - 赛季生命周期管理 =====
class SeasonManager {
  constructor() {
    this.CURRENT_KEY = 'metagame_season_current';
    this.SEASON_PREFIX = 'metagame_season_';
    this.DEFAULT_DURATION_DAYS = 7;
  }

  /**
   * 开始新赛季
   * @param {string} seasonId - 赛季ID
   * @param {number} durationDays - 持续天数（默认7天）
   * @returns {object} 赛季信息
   */
  startSeason(seasonId, durationDays = this.DEFAULT_DURATION_DAYS) {
    if (!seasonId) return null;

    const season = {
      id: seasonId,
      startTime: Date.now(),
      endTime: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
      durationDays,
      status: 'active',
      stats: {
        totalGames: 0,
        totalWins: 0,
        uniquePlayers: 0,
        topDeck: null,
        topCard: null
      }
    };

    try {
      localStorage.setItem(this.CURRENT_KEY, JSON.stringify(season));
      localStorage.setItem(this.SEASON_PREFIX + seasonId, JSON.stringify(season));
    } catch (e) {
      console.warn('SeasonManager startSeason failed:', e);
      return null;
    }

    return season;
  }

  /**
   * 获取当前赛季信息
   * @returns {object|null} 当前赛季信息
   */
  getCurrentSeason() {
    try {
      const data = localStorage.getItem(this.CURRENT_KEY);
      if (!data) return null;
      
      const season = JSON.parse(data);
      // 检查赛季是否过期
      if (season.status === 'active' && Date.now() > season.endTime) {
        season.status = 'expired';
        localStorage.setItem(this.CURRENT_KEY, JSON.stringify(season));
      }
      return season;
    } catch {
      return null;
    }
  }

  /**
   * 获取指定赛季的统计数据
   * @param {string} seasonId - 赛季ID
   * @returns {object|null} 赛季统计数据
   */
  getSeasonStats(seasonId) {
    if (!seasonId) return null;
    try {
      const data = localStorage.getItem(this.SEASON_PREFIX + seasonId);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * 更新赛季统计
   * @param {object} gameResult - 游戏结果 { playerId, deckId, cardUsage, won }
   */
  updateSeasonStats(gameResult) {
    const season = this.getCurrentSeason();
    if (!season || season.status !== 'active') return;

    season.stats.totalGames++;
    if (gameResult.won) {
      season.stats.totalWins++;
    }

    // 追踪使用最多的卡牌和卡组
    if (gameResult.cardUsage) {
      for (const [cardId, count] of Object.entries(gameResult.cardUsage)) {
        if (!season.stats.cardUsage) season.stats.cardUsage = {};
        season.stats.cardUsage[cardId] = (season.stats.cardUsage[cardId] || 0) + count;
      }
    }

    if (gameResult.deckId) {
      if (!season.stats.deckUsage) season.stats.deckUsage = {};
      season.stats.deckUsage[gameResult.deckId] = (season.stats.deckUsage[gameResult.deckId] || 0) + 1;
    }

    try {
      localStorage.setItem(this.CURRENT_KEY, JSON.stringify(season));
      localStorage.setItem(this.SEASON_PREFIX + season.id, JSON.stringify(season));
    } catch (e) {
      console.warn('SeasonManager updateSeasonStats failed:', e);
    }
  }

  /**
   * 结束当前赛季
   * @returns {object|null} 赛季最终统计
   */
  endSeason() {
    const season = this.getCurrentSeason();
    if (!season) return null;

    season.status = 'ended';
    season.endTime = Date.now();

    // 计算赛季胜率
    season.stats.winRate = season.stats.totalGames > 0 
      ? season.stats.totalWins / season.stats.totalGames 
      : 0;

    // 找出使用最多的卡牌和卡组
    if (season.stats.cardUsage) {
      const sorted = Object.entries(season.stats.cardUsage).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        season.stats.topCard = sorted[0][0];
      }
    }

    if (season.stats.deckUsage) {
      const sorted = Object.entries(season.stats.deckUsage).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        season.stats.topDeck = sorted[0][0];
      }
    }

    try {
      localStorage.setItem(this.CURRENT_KEY, JSON.stringify(season));
      localStorage.setItem(this.SEASON_PREFIX + season.id, JSON.stringify(season));
    } catch (e) {
      console.warn('SeasonManager endSeason failed:', e);
    }

    return season;
  }

  /**
   * 获取赛季剩余时间（毫秒）
   * @returns {number} 剩余时间，-1表示无 active 赛季
   */
  getSeasonTimeRemaining() {
    const season = this.getCurrentSeason();
    if (!season || season.status !== 'active') return -1;
    return Math.max(0, season.endTime - Date.now());
  }

  /**
   * 获取赛季进度百分比
   * @returns {number} 进度 0-100，-1表示无 active 赛季
   */
  getSeasonProgress() {
    const season = this.getCurrentSeason();
    if (!season || season.status !== 'active') return -1;
    const total = season.endTime - season.startTime;
    const elapsed = Date.now() - season.startTime;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  /**
   * 获取所有历史赛季
   * @returns {array} 历史赛季列表
   */
  getAllSeasons() {
    const seasons = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.SEASON_PREFIX) && key !== this.CURRENT_KEY) {
          const data = localStorage.getItem(key);
          if (data) {
            seasons.push(JSON.parse(data));
          }
        }
      }
    } catch (e) {
      console.warn('SeasonManager getAllSeasons failed:', e);
    }
    return seasons.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * 重置赛季数据
   */
  resetSeasons() {
    localStorage.removeItem(this.CURRENT_KEY);
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.SEASON_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }
}

// ===== HonorReward - 荣耀奖励系统 =====
class HonorReward {
  constructor(seasonManager) {
    this.seasonMgr = seasonManager || new SeasonManager();
    this.REWARD_KEY = 'metagame_honor_rewards';
    this.TIER_THRESHOLDS = {
      legendary: 0.10,  // 前10% → legendary
      epic: 0.25,       // 前25% → epic
      rare: 0.50        // 前50% → rare
    };
  }

  /**
   * 计算荣耀奖励
   * @param {string} playerId - 玩家ID
   * @param {string} seasonId - 赛季ID
   * @returns {object} 奖励详情
   */
  calculateRewards(playerId, seasonId) {
    if (!playerId || !seasonId) return null;

    const season = this.seasonMgr.getSeasonStats(seasonId);
    if (!season) return null;

    // 简单排名计算：基于胜率和游戏数
    const playerScore = this.calculatePlayerScore(playerId, seasonId);
    const totalPlayers = season.stats.uniquePlayers || 1;
    const rank = this.calculateRank(playerId, seasonId);
    const percentile = rank / totalPlayers;

    const rewards = {
      playerId,
      seasonId,
      rank,
      percentile,
      tier: this.determineTier(percentile),
      rewards: this.generateRewards(percentile, season),
      calculatedAt: Date.now()
    };

    // 保存奖励记录
    this.saveRewardRecord(rewards);

    return rewards;
  }

  /**
   * 计算玩家分数
   * @param {string} playerId - 玩家ID
   * @param {string} seasonId - 赛季ID
   * @returns {number} 玩家分数
   */
  calculatePlayerScore(playerId, seasonId) {
    try {
      const key = 'metagame_player_' + playerId + '_' + seasonId;
      const data = localStorage.getItem(key);
      if (data) {
        const stats = JSON.parse(data);
        // 分数 = 胜率 * 100 + 游戏数 * 2
        return (stats.winRate || 0) * 100 + (stats.gamesPlayed || 0) * 2;
      }
    } catch (e) {
      console.warn('HonorReward calculatePlayerScore failed:', e);
    }
    return 0;
  }

  /**
   * 计算玩家排名
   * @param {string} playerId - 玩家ID
   * @param {string} seasonId - 赛季ID
   * @returns {number} 排名（1为最高）
   */
  calculateRank(playerId, seasonId) {
    const playerScore = this.calculatePlayerScore(playerId, seasonId);
    let rank = 1;
    
    // 遍历所有玩家计算排名
    try {
      const allPlayerKey = 'metagame_season_' + seasonId + '_players';
      const allPlayers = localStorage.getItem(allPlayerKey);
      if (allPlayers) {
        const players = JSON.parse(allPlayers);
        for (const p of players) {
          if (p.id !== playerId) {
            const pScore = this.calculatePlayerScore(p.id, seasonId);
            if (pScore > playerScore) {
              rank++;
            }
          }
        }
      }
    } catch (e) {
      // 排名默认为1
    }
    
    return rank;
  }

  /**
   * 确定奖励等级
   * @param {number} percentile - 百分位（0-1）
   * @returns {string} tier名称
   */
  determineTier(percentile) {
    if (percentile <= this.TIER_THRESHOLDS.legendary) return 'legendary';
    if (percentile <= this.TIER_THRESHOLDS.epic) return 'epic';
    if (percentile <= this.TIER_THRESHOLDS.rare) return 'rare';
    return 'common';
  }

  /**
   * 生成奖励内容
   * @param {number} percentile - 百分位
   * @param {object} season - 赛季数据
   * @returns {object} 奖励详情
   */
  generateRewards(percentile, season) {
    const tier = this.determineTier(percentile);
    const baseRewards = {
      cardExperience: 0,
      title: '',
      avatarFrame: '',
      specialCards: []
    };

    switch (tier) {
      case 'legendary':
        baseRewards.cardExperience = 1000;
        baseRewards.title = '传奇大师';
        baseRewards.avatarFrame = 'legendary_frame';
        baseRewards.specialCards = ['legendary_card_1', 'legendary_card_2'];
        break;
      case 'epic':
        baseRewards.cardExperience = 500;
        baseRewards.title = '史诗勇士';
        baseRewards.avatarFrame = 'epic_frame';
        baseRewards.specialCards = ['epic_card_1'];
        break;
      case 'rare':
        baseRewards.cardExperience = 200;
        baseRewards.title = '精英选手';
        baseRewards.avatarFrame = 'rare_frame';
        baseRewards.specialCards = [];
        break;
      default:
        baseRewards.cardExperience = 50;
        baseRewards.title = '参赛选手';
        baseRewards.avatarFrame = 'common_frame';
        baseRewards.specialCards = [];
    }

    // 根据赛季排名加成
    if (season && season.stats) {
      baseRewards.seasonBonus = {
        topCard: season.stats.topCard,
        topDeck: season.stats.topDeck,
        totalGames: season.stats.totalGames
      };
    }

    return baseRewards;
  }

  /**
   * 发放奖励
   * @param {string} playerId - 玩家ID
   * @param {string} seasonId - 赛季ID
   * @returns {object|null} 发放结果
   */
  distributeRewards(playerId, seasonId) {
    const rewards = this.calculateRewards(playerId, seasonId);
    if (!rewards) return null;

    // 保存到玩家档案
    const playerKey = 'metagame_player_honor_' + playerId;
    try {
      const existing = localStorage.getItem(playerKey);
      const honor档案 = existing ? JSON.parse(existing) : { rewards: [], totalExp: 0 };
      
      honor档案.rewards.push({
        seasonId,
        tier: rewards.tier,
        exp: rewards.rewards.cardExperience,
        title: rewards.rewards.title,
        avatarFrame: rewards.rewards.avatarFrame,
        receivedAt: Date.now()
      });
      
      honor档案.totalExp += rewards.rewards.cardExperience;
      honor档案.lastUpdated = Date.now();
      
      localStorage.setItem(playerKey, JSON.stringify(honor档案));
      rewards.distributed = true;
      rewards.distributedAt = Date.now();
    } catch (e) {
      console.warn('HonorReward distributeRewards failed:', e);
      rewards.distributed = false;
    }

    return rewards;
  }

  /**
   * 获取玩家荣耀档案
   * @param {string} playerId - 玩家ID
   * @returns {object} 荣耀档案
   */
  getHonorProfile(playerId) {
    if (!playerId) return null;
    try {
      const key = 'metagame_player_honor_' + playerId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : { rewards: [], totalExp: 0 };
    } catch {
      return { rewards: [], totalExp: 0 };
    }
  }

  /**
   * 保存奖励记录
   * @param {object} rewards - 奖励信息
   */
  saveRewardRecord(rewards) {
    try {
      const key = this.REWARD_KEY + '_' + rewards.seasonId;
      const existing = localStorage.getItem(key);
      const records = existing ? JSON.parse(existing) : [];
      
      // 更新或添加记录
      const existingIndex = records.findIndex(r => r.playerId === rewards.playerId);
      if (existingIndex >= 0) {
        records[existingIndex] = rewards;
      } else {
        records.push(rewards);
      }
      
      localStorage.setItem(key, JSON.stringify(records));
    } catch (e) {
      console.warn('HonorReward saveRewardRecord failed:', e);
    }
  }

  /**
   * 获取赛季奖励记录
   * @param {string} seasonId - 赛季ID
   * @returns {array} 奖励记录列表
   */
  getSeasonRewards(seasonId) {
    if (!seasonId) return [];
    try {
      const key = this.REWARD_KEY + '_' + seasonId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * 重置奖励数据
   */
  resetRewards() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(this.REWARD_KEY) || key.includes('metagame_player_honor_'))) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }
}

// ===== MetaBalancePanel - UI组件 =====
class MetaBalancePanel {
  constructor(tracker, engine, seasonMgr, honorReward) {
    this.tracker = tracker || new MetagameTracker();
    this.engine = engine || new EvolutionEngine(this.tracker);
    this.seasonMgr = seasonMgr || new SeasonManager();
    this.honorReward = honorReward || new HonorReward(this.seasonMgr);
    this.panelId = 'meta-balance-panel';
    this.isVisible = false;
  }

  /**
   * 渲染面板HTML
   * @returns {string} HTML字符串
   */
  render() {
    const season = this.seasonMgr.getCurrentSeason();
    const evolutionStatus = this.engine.getEvolutionStatus();
    
    const html = `
      <div id="${this.panelId}" class="meta-balance-panel" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        background: rgba(20, 20, 40, 0.98);
        border: 2px solid #ffd700;
        border-radius: 15px;
        padding: 20px;
        z-index: 10000;
        overflow-y: auto;
        display: ${this.isVisible ? 'block' : 'none'};
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h2 style="color: #ffd700; margin: 0;">⚔️ Meta Evolution Season</h2>
          <button onclick="window.metaBalancePanel?.toggle()" style="
            background: #ff4757;
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
          ">×</button>
        </div>
        
        ${this.renderSeasonInfo(season)}
        ${this.renderEvolutionStatus(evolutionStatus)}
        ${this.renderCardStats()}
        ${this.renderActions()}
      </div>
    `;
    
    return html;
  }

  /**
   * 渲染赛季信息
   * @param {object} season - 赛季数据
   * @returns {string} HTML
   */
  renderSeasonInfo(season) {
    if (!season) {
      return `
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
          <p style="color: #aaa;">No active season. Start a new season to track meta evolution.</p>
        </div>
      `;
    }

    const progress = this.seasonMgr.getSeasonProgress();
    const timeRemaining = this.seasonMgr.getSeasonTimeRemaining();
    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return `
      <div style="background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05)); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid rgba(255,215,0,0.3);">
        <h3 style="color: #ffd700; margin: 0 0 10px 0;">Season ${season.id}</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #4ecdc4;">Progress: ${progress}%</span>
          <span style="color: #ff6b6b;">Time: ${days}d ${hours}h remaining</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #ffd700, #ff6b6b);"></div>
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: space-between; font-size: 12px; color: #888;">
          <span>Games: ${season.stats.totalGames || 0}</span>
          <span>Wins: ${season.stats.totalWins || 0}</span>
          <span>Win Rate: ${((season.stats.winRate || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染进化状态
   * @param {object} status - 进化状态
   * @returns {string} HTML
   */
  renderEvolutionStatus(status) {
    return `
      <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
        <h3 style="color: #fff; margin: 0 0 10px 0;">📊 Evolution Status</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="background: rgba(46, 204, 113, 0.2); padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; color: #2ecc71;">${status.buffedCards?.length || 0}</div>
            <div style="color: #2ecc71; font-size: 12px;">Buffed Cards</div>
          </div>
          <div style="background: rgba(231, 76, 60, 0.2); padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; color: #e74c3c;">${status.nerfedCards?.length || 0}</div>
            <div style="color: #e74c3c; font-size: 12px;">Nerfed Cards</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染卡牌统计
   * @returns {string} HTML
   */
  renderCardStats() {
    const allStats = this.tracker.getAllCardStats();
    const statsArray = Object.entries(allStats)
      .map(([cardId, stats]) => ({ cardId, ...stats }))
      .sort((a, b) => (b.winRate || 0) - (a.winRate || 0))
      .slice(0, 10);

    if (statsArray.length === 0) {
      return `
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
          <p style="color: #aaa;">No card stats yet. Play games to track card performance.</p>
        </div>
      `;
    }

    const rows = statsArray.map(card => {
      const evolution = this.engine.applyEvolutionToCard(card.cardId, { damage: 10, cost: 2 });
      const evoBadge = evolution._evolution ? 
        `<span style="background: ${evolution._evolution.recommendation === 'buff' ? '#2ecc71' : '#e74c3c'}; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${evolution._evolution.recommendation.toUpperCase()}</span>` 
        : '';
      
      return `
        <tr style="border-bottom: 1px solid #333;">
          <td style="padding: 8px; color: #ffd700;">${card.cardId}</td>
          <td style="padding: 8px; color: #4ecdc4;">${card.playCount || 0}</td>
          <td style="padding: 8px; color: ${(card.winRate || 0) > 0.5 ? '#2ecc71' : '#ff6b6b'};">${((card.winRate || 0) * 100).toFixed(1)}%</td>
          <td style="padding: 8px;">${evoBadge}</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
        <h3 style="color: #fff; margin: 0 0 10px 0;">🃏 Card Statistics (Top 10)</h3>
        <table style="width: 100%; font-size: 12px;">
          <thead>
            <tr style="color: #888; border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: left;">Card</th>
              <th style="padding: 8px; text-align: center;">Games</th>
              <th style="padding: 8px; text-align: center;">Win Rate</th>
              <th style="padding: 8px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * 渲染操作按钮
   * @returns {string} HTML
   */
  renderActions() {
    return `
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="window.metaBalancePanel?.startSeason()" style="
          background: linear-gradient(145deg, #2ecc71, #27ae60);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        ">Start Season</button>
        <button onclick="window.metaBalancePanel?.endSeason()" style="
          background: linear-gradient(145deg, #e74c3c, #c0392b);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        ">End Season</button>
        <button onclick="window.metaBalancePanel?.analyzeAndApply()" style="
          background: linear-gradient(145deg, #3498db, #2980b9);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        ">Analyze Meta</button>
        <button onclick="window.metaBalancePanel?.resetAll()" style="
          background: #555;
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        ">Reset All</button>
      </div>
    `;
  }

  /**
   * 创建并显示面板
   */
  show() {
    // 确保样式加载
    if (!document.getElementById(this.panelId)) {
      const container = document.createElement('div');
      container.id = this.panelId + '_container';
      container.innerHTML = this.render();
      document.body.appendChild(container);
      
      // 绑定全局引用
      window.metaBalancePanel = this;
    } else {
      document.getElementById(this.panelId).style.display = 'block';
    }
    this.isVisible = true;
  }

  /**
   * 隐藏面板
   */
  hide() {
    const panel = document.getElementById(this.panelId);
    if (panel) {
      panel.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * 切换面板显示状态
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 更新面板内容
   */
  update() {
    const container = document.getElementById(this.panelId + '_container');
    if (container) {
      container.innerHTML = this.render();
    }
  }

  /**
   * 开始新赛季
   */
  startSeason() {
    const seasonId = 'S' + Date.now();
    this.seasonMgr.startSeason(seasonId);
    this.update();
  }

  /**
   * 结束当前赛季
   */
  endSeason() {
    const ended = this.seasonMgr.endSeason();
    if (ended && typeof alert !== 'undefined') {
      alert(`Season ${ended.id} ended! Final stats:\nTotal Games: ${ended.stats.totalGames}\nWin Rate: ${(ended.stats.winRate * 100).toFixed(1)}%`);
    }
    this.update();
  }

  /**
   * 分析并应用进化
   */
  analyzeAndApply() {
    const analysis = this.engine.analyzeMeta();
    this.engine.clearCache();
    this.update();
    
    let message = `Meta Analysis Results:\n`;
    message += `Buffed: ${analysis.cardsToBuff.length} cards\n`;
    message += `Nerfed: ${analysis.cardsToNerf.length} cards\n`;
    if (analysis.cardsToBuff.length > 0) {
      message += `\nBuffed cards: ${analysis.cardsToBuff.join(', ')}`;
    }
    if (analysis.cardsToNerf.length > 0) {
      message += `\nNerfed cards: ${analysis.cardsToNerf.join(', ')}`;
    }
    if (typeof alert !== 'undefined') {
      alert(message);
    }
  }

  /**
   * 重置所有数据
   */
  resetAll() {
    if (typeof confirm === 'undefined' || confirm('Are you sure you want to reset all metagame data?')) {
      this.tracker.resetCardStats();
      this.tracker.resetDeckStats();
      this.seasonMgr.resetSeasons();
      this.honorReward.resetRewards();
      this.engine.clearCache();
      this.update();
      if (typeof alert !== 'undefined') {
        alert('All metagame data has been reset.');
      }
    }
  }
}

// 导出给测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MetagameTracker, EvolutionEngine, SeasonManager, HonorReward, MetaBalancePanel };
}