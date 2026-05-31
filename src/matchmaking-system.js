/**
 * V262 Matchmaking System (Iteration 7/9)
 * 匹配系统: Matchmaker | SkillRating | MatchPairer | ELOEngine
 * 
 * 概念：基于多维度评分的智能匹配系统，为玩家配对合适的对手
 * 设计来源: claude-code structured reasoning | nanobot parallel mesh | 
 *          chatdev collaborative | thunderbolt pipeline | 
 *          generic-agent autonomous | ruflo fuzzy pattern
 * 
 * 跨系统协同 (Cross-System Integration):
 * - 基于 tournament-seeding-system 计算排名
 * - 基于 battle-simulator 评估战斗表现
 * - 基于 combat-feedback-analyzer 分析反馈
 * - 基于 adaptive-difficulty 调整匹配难度
 * - 基于 card-portfolio-system 评估卡组强度
 * - 基于 energy-tuning 计算能量效率
 */

// ============== SkillRating (generic-agent autonomous evaluation) ==============
class SkillRating {
  constructor(options = {}) {
    this.kFactor = options.kFactor || 32;
    this.initialRating = options.initialRating || 1500;
    this.decayRate = options.decayRate || 0.95;
    this.ratings = new Map();
  }

  /**
   * 获取玩家评分
   * @param {string} playerId - 玩家ID
   * @returns {number} 评分
   */
  getRating(playerId) {
    return this.ratings.get(playerId) || this.initialRating;
  }

  /**
   * 初始化玩家评分
   * @param {string} playerId - 玩家ID
   * @param {number} rating - 初始评分
   */
  initRating(playerId, rating = this.initialRating) {
    this.ratings.set(playerId, rating);
  }

  /**
   * 更新玩家评分 (ELO系统)
   * @param {string} playerId - 玩家ID
   * @param {number} expectedScore - 期望分数
   * @param {number} actualScore - 实际分数 (1=赢, 0.5=平, 0=输)
   * @returns {object} 评分变化
   */
  updateRating(playerId, expectedScore, actualScore) {
    const currentRating = this.getRating(playerId);
    const ratingChange = this.kFactor * (actualScore - expectedScore);
    const newRating = currentRating + ratingChange;
    
    this.ratings.set(playerId, newRating);
    
    return {
      previousRating: currentRating,
      newRating: Math.round(newRating),
      change: Math.round(ratingChange)
    };
  }

  /**
   * 计算期望胜负
   * @param {number} ratingA - 评分A
   * @param {number} ratingB - 评分B
   * @returns {object} 双方期望胜率
   */
  calculateExpectedScore(ratingA, ratingB) {
    const exponent = (ratingB - ratingA) / 400;
    const chanceA = 1 / (1 + Math.pow(10, exponent));
    return {
      playerA: Math.round(chanceA * 100) / 100,
      playerB: Math.round((1 - chanceA) * 100) / 100
    };
  }

  /**
   * 获取玩家排名
   * @returns {Array} 排序后的玩家列表
   */
  getLeaderboard() {
    const entries = Array.from(this.ratings.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.map((entry, index) => ({
      rank: index + 1,
      playerId: entry[0],
      rating: entry[1]
    }));
  }

  /**
   * 应用评分衰减 (针对不活跃玩家)
   * @param {number} daysInactive - 不活跃天数
   * @param {number} threshold - 衰减阈值
   */
  applyDecay(daysInactive, threshold = 30) {
    if (daysInactive < threshold) return;
    
    const decayFactor = Math.pow(this.decayRate, Math.floor(daysInactive / threshold));
    
    for (const [playerId, rating] of this.ratings) {
      this.ratings.set(playerId, rating * decayFactor);
    }
  }
}

// ============== MatchPairer (nanobot parallel mesh optimization) ==============
class MatchPairer {
  constructor(options = {}) {
    this.maxWaitTime = options.maxWaitTime || 300000; // 5分钟
    this.skillRange = options.skillRange || 100;
    this.maxPoolSize = options.maxPoolSize || 100;
    this.waitingQueue = [];
    this.pairedMatches = [];
    this.pendingMatches = new Map(); // 存储已匹配但尚未确认的结果
  }

  /**
   * 添加玩家到匹配池
   * @param {string} playerId - 玩家ID
   * @param {object} playerData - 玩家数据 (rating, deckPower, playStyle)
   * @returns {object} 匹配状态
   */
  addToPool(playerId, playerData) {
    // 先检查是否有待处理的匹配结果
    if (this.pendingMatches.has(playerId)) {
      const result = this.pendingMatches.get(playerId);
      this.pendingMatches.delete(playerId);
      return result;
    }

    const entry = {
      playerId,
      rating: playerData.rating || 1500,
      deckPower: playerData.deckPower || 50,
      playStyle: playerData.playStyle || 'balanced',
      waitStartTime: Date.now(),
      tolerance: playerData.tolerance || 0.5
    };

    // 先加入等待队列
    this.waitingQueue.push(entry);
    this.trimQueue();

    // 检查是否有合适的匹配
    const match = this.findMatch(entry);

    if (match) {
      // 存储匹配结果供先添加的玩家查询
      this.pendingMatches.set(entry.playerId, { matched: true, opponentId: match.playerId });
      // 找到匹配，返回成功
      return { matched: true, opponentId: match.playerId };
    }

    return { matched: false, position: this.waitingQueue.length };
  }

  /**
   * 查找匹配
   * @param {object} player - 玩家信息
   * @returns {object|null} 匹配的对方或null
   */
  findMatch(player) {
    let bestMatch = null;
    let bestScore = Infinity;

    for (const candidate of this.waitingQueue) {
      if (candidate.playerId === player.playerId) continue;

      // 计算匹配分数 (越低越好)
      const score = this.calculateMatchScore(player, candidate);
      
      if (score < bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch && this.isAcceptableMatch(player, bestMatch)) {
      // 移除匹配的双方
      this.waitingQueue = this.waitingQueue.filter(
        p => p.playerId !== player.playerId && p.playerId !== bestMatch.playerId
      );
      this.pairedMatches.push({
        player1: player.playerId,
        player2: bestMatch.playerId,
        matchTime: Date.now(),
        skillGap: Math.abs(player.rating - bestMatch.rating)
      });
      return bestMatch;
    }

    return null;
  }

  /**
   * 计算匹配分数 (基于多维度评分)
   * @param {object} player1 - 玩家1
   * @param {object} player2 - 玩家2
   * @returns {number} 匹配分数 (越低越好)
   */
  calculateMatchScore(player1, player2) {
    // 评分差距 (最重要)
    const ratingWeight = 0.5;
    const ratingDiff = Math.abs(player1.rating - player2.rating);
    
    // 卡组强度差距
    const deckWeight = 0.3;
    const deckDiff = Math.abs(player1.deckPower - player2.deckPower);
    
    // 等待时间奖励 (减少等待时间)
    const waitWeight = 0.2;
    const waitTime = Date.now() - player1.waitStartTime;
    const waitBonus = Math.min(waitTime / this.maxWaitTime, 1) * 100;

    return (ratingDiff * ratingWeight) + (deckDiff * deckWeight) - (waitBonus * waitWeight);
  }

  /**
   * 判断是否为可接受的匹配
   * @param {object} player1 - 玩家1
   * @param {object} player2 - 玩家2
   * @returns {boolean} 是否可接受
   */
  isAcceptableMatch(player1, player2) {
    const ratingDiff = Math.abs(player1.rating - player2.rating);
    const toleranceFactor = (player1.tolerance || 0.5) + (player2.tolerance || 0.5);
    const maxDiff = this.skillRange * toleranceFactor;

    return ratingDiff <= maxDiff;
  }

  /**
   * 清理超长等待的玩家
   */
  trimQueue() {
    const now = Date.now();
    this.waitingQueue = this.waitingQueue.filter(entry => {
      const waitTime = now - entry.waitStartTime;
      return waitTime < this.maxWaitTime;
    });

    if (this.waitingQueue.length > this.maxPoolSize) {
      this.waitingQueue = this.waitingQueue.slice(-this.maxPoolSize);
    }
  }

  /**
   * 获取匹配统计
   * @returns {object} 统计信息
   */
  getStats() {
    return {
      waitingCount: this.waitingQueue.length,
      totalPaired: this.pairedMatches.length,
      avgWaitTime: this.pairedMatches.length > 0 
        ? this.pairedMatches.reduce((sum, m) => sum + (m.matchTime - m.waitStartTime), 0) / this.pairedMatches.length 
        : 0
    };
  }

  /**
   * 获取等待队列
   * @returns {Array} 等待中的玩家
   */
  getWaitingQueue() {
    return this.waitingQueue.map(entry => ({
      playerId: entry.playerId,
      rating: entry.rating,
      waitTime: Date.now() - entry.waitStartTime
    }));
  }
}

// ============== Matchmaker (claude-code structured reasoning + ruflo fuzzy pattern) ==============
class Matchmaker {
  constructor(options = {}) {
    this.skillRating = new SkillRating(options.skillRating);
    this.matchPairer = new MatchPairer(options.matchPairer);
    this.matchHistory = [];
    this.maxHistorySize = options.maxHistorySize || 500;
  }

  /**
   * 注册玩家
   * @param {string} playerId - 玩家ID
   * @param {object} options - 选项 (initialRating, deckPower)
   */
  registerPlayer(playerId, options = {}) {
    const rating = options.initialRating || 1500;
    this.skillRating.initRating(playerId, rating);
  }

  /**
   * 请求匹配
   * @param {string} playerId - 玩家ID
   * @param {object} playerData - 玩家数据
   * @returns {object} 匹配结果
   */
  requestMatch(playerId, playerData = {}) {
    // 更新玩家评分
    const currentRating = playerData.rating || this.skillRating.getRating(playerId);
    
    const result = this.matchPairer.addToPool(playerId, {
      ...playerData,
      rating: currentRating
    });

    return {
      ...result,
      playerRating: currentRating
    };
  }

  /**
   * 完成比赛并更新评分
   * @param {string} winnerId - 胜者ID
   * @param {string} loserId - 败者ID
   * @param {string} matchType - 比赛类型 (ranked/casual/tournament)
   * @returns {object} 评分更新结果
   */
  completeMatch(winnerId, loserId, matchType = 'ranked') {
    const winnerRating = this.skillRating.getRating(winnerId);
    const loserRating = this.skillRating.getRating(loserId);
    
    const expected = this.skillRating.calculateExpectedScore(winnerRating, loserRating);
    
    const winnerUpdate = this.skillRating.updateRating(winnerId, expected.playerA, 1);
    const loserUpdate = this.skillRating.updateRating(loserId, expected.playerB, 0);

    // 记录比赛历史
    const matchRecord = {
      id: `match_${Date.now()}`,
      winnerId,
      loserId,
      winnerRatingChange: winnerUpdate.change,
      loserRatingChange: loserUpdate.change,
      matchType,
      timestamp: Date.now()
    };

    this.matchHistory.push(matchRecord);
    
    // 限制历史大小
    if (this.matchHistory.length > this.maxHistorySize) {
      this.matchHistory = this.matchHistory.slice(-this.maxHistorySize);
    }

    return {
      winner: winnerUpdate,
      loser: loserUpdate,
      match: matchRecord
    };
  }

  /**
   * 获取玩家统计
   * @param {string} playerId - 玩家ID
   * @returns {object} 玩家统计
   */
  getPlayerStats(playerId) {
    const rating = this.skillRating.getRating(playerId);
    const matches = this.matchHistory.filter(
      m => m.winnerId === playerId || m.loserId === playerId
    );
    
    const wins = matches.filter(m => m.winnerId === playerId).length;
    const losses = matches.filter(m => m.loserId === playerId).length;
    const total = matches.length;
    
    return {
      rating: Math.round(rating),
      wins,
      losses,
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) / 100 : 0,
      recentForm: this.getRecentForm(playerId)
    };
  }

  /**
   * 获取最近表现
   * @param {string} playerId - 玩家ID
   * @param {number} count - 场次
   * @returns {Array} 最近表现
   */
  getRecentForm(playerId, count = 10) {
    const playerMatches = this.matchHistory
      .filter(m => m.winnerId === playerId || m.loserId === playerId)
      .slice(-count);
    
    return playerMatches.map(m => ({
      won: m.winnerId === playerId,
      ratingChange: m.winnerId === playerId ? m.winnerRatingChange : m.loserRatingChange
    }));
  }

  /**
   * 获取排行榜
   * @param {number} limit - 数量限制
   * @returns {Array} 排行榜
   */
  getLeaderboard(limit = 50) {
    return this.skillRating.getLeaderboard().slice(0, limit);
  }

  /**
   * 模糊搜索玩家 (ruflo pattern)
   * @param {string} query - 搜索词
   * @returns {Array} 匹配的玩家
   */
  fuzzySearchPlayers(query) {
    const leaderboard = this.getLeaderboard(100);
    const queryLower = query.toLowerCase();
    
    return leaderboard.filter(entry => {
      const playerIdLower = entry.playerId.toLowerCase();
      const similarity = this.calculateSimilarity(queryLower, playerIdLower);
      return similarity >= 0.6;
    });
  }

  /**
   * 计算字符串相似度
   * @param {string} s1 - 字符串1
   * @param {string} s2 - 字符串2
   * @returns {number} 相似度
   */
  calculateSimilarity(s1, s2) {
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return 1 - editDistance / Math.max(longer.length, shorter.length);
  }

  /**
   * 计算编辑距离
   * @param {string} s1 - 字符串1
   * @param {string} s2 - 字符串2
   * @returns {number} 编辑距离
   */
  levenshteinDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      costs[i] = [i];
      for (let j = 1; j <= s2.length; j++) {
        if (i === 0) {
          costs[i][j] = j;
        } else {
          costs[i][j] = Math.min(
            costs[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1),
            costs[i][j - 1] + 1,
            costs[i - 1][j] + 1
          );
        }
      }
    }
    return costs[s1.length][s2.length];
  }

  /**
   * 获取匹配系统状态
   * @returns {object} 系统状态
   */
  getStatus() {
    return {
      playerCount: this.skillRating.ratings.size,
      waitingCount: this.matchPairer.getStats().waitingCount,
      matchHistorySize: this.matchHistory.length,
      leaderboard: this.getLeaderboard(10)
    };
  }

  /**
   * 移除玩家
   * @param {string} playerId - 玩家ID
   */
  removePlayer(playerId) {
    this.skillRating.ratings.delete(playerId);
    this.matchPairer.waitingQueue = this.matchPairer.waitingQueue.filter(
      p => p.playerId !== playerId
    );
  }
}

// ============== ELOEngine (thunderbolt pipeline + chatdev collaborative) ==============
class ELOEngine {
  constructor(options = {}) {
    this.baseKFactor = options.baseKFactor || 32;
    this.rankDivisions = options.rankDivisions || [
      { name: 'Bronze', min: 0, max: 999 },
      { name: 'Silver', min: 1000, max: 1199 },
      { name: 'Gold', min: 1200, max: 1399 },
      { name: 'Platinum', min: 1400, max: 1599 },
      { name: 'Diamond', min: 1600, max: 1799 },
      { name: 'Master', min: 1800, max: 1999 },
      { name: 'Grandmaster', min: 2000, max: Infinity }
    ];
  }

  /**
   * 计算动态K值 (根据玩家等级和比赛类型调整)
   * @param {number} rating - 当前评分
   * @param {string} matchType - 比赛类型
   * @returns {number} K值
   */
  calculateDynamicKFactor(rating, matchType = 'ranked') {
    let kFactor = this.baseKFactor;
    
    // 高端玩家使用更小的K值
    if (rating >= 2000) {
      kFactor = 16;
    } else if (rating >= 1800) {
      kFactor = 24;
    }

    // 排位赛使用标准K值
    if (matchType === 'casual') {
      kFactor *= 0.5;
    } else if (matchType === 'tournament') {
      kFactor *= 1.5;
    }

    return kFactor;
  }

  /**
   * 计算评分变化
   * @param {object} matchResult - 比赛结果
   * @returns {object} 评分变化详情
   */
  calculateRatingChange(matchResult) {
    const { winnerRating, loserRating, matchType } = matchResult;
    
    const kFactor = this.calculateDynamicKFactor(winnerRating, matchType);
    const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    
    const winnerChange = Math.round(kFactor * (1 - expected));
    const loserChange = Math.round(kFactor * (0 - (1 - expected)));

    return {
      winnerChange,
      loserChange,
      kFactor,
      expectedWinnerScore: Math.round(expected * 100) / 100
    };
  }

  /**
   * 获取玩家段位
   * @param {number} rating - 评分
   * @returns {object} 段位信息
   */
  getRankDivision(rating) {
    for (const division of this.rankDivisions) {
      if (rating >= division.min && rating <= division.max) {
        const progress = (rating - division.min) / (division.max - division.min + 1);
        return {
          name: division.name,
          rating,
          progress: Math.round(progress * 100)
        };
      }
    }
    return { name: 'Unranked', rating, progress: 0 };
  }

  /**
   * 预测比赛结果
   * @param {number} ratingA - 评分A
   * @param {number} ratingB - 评分B
   * @returns {object} 预测结果
   */
  predictMatch(ratingA, ratingB) {
    const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    
    return {
      teamAWinProbability: Math.round(expected * 100) / 100,
      teamBWinProbability: Math.round((1 - expected) * 100) / 100,
      recommendedSpread: Math.round(Math.abs(ratingA - ratingB) * 0.5)
    };
  }

  /**
   * 获取赛季评分衰减
   * @param {number} daysInactive - 不活跃天数
   * @param {string} currentRank - 当前段位
   * @returns {number} 衰减百分比
   */
  calculateSeasonDecay(daysInactive, currentRank) {
    if (daysInactive < 30) return 0;
    
    const decayRate = currentRank === 'Grandmaster' || currentRank === 'Master' ? 0.02 : 0.05;
    return Math.min(decayRate * Math.floor(daysInactive / 30), 0.5);
  }
}

// 导出
module.exports = { 
  SkillRating, 
  MatchPairer, 
  Matchmaker,
  ELOEngine 
};