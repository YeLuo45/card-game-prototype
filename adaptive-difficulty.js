/**
 * V102 Adaptive Difficulty & Player Progression System (Iteration 9/9 - Final)
 * 核心模块: AdaptiveDifficultyEngine | PlayerProgression | DifficultyCurve | AICoachAdvisor
 * 
 * 概念：整合所有系统构建统一的玩家进度与自适应难度引擎
 * - 基于 metagame-evolution 赛季数据 + tournament ELO 建立动态难度曲线
 * - 基于 chronicle-campaign 章节进度调整 AI 对手强度
 * - 基于 synergy-cascade 和 deck-archetype-evolution 协同效果动态调整敌人抗性
 * - 基于 energy-tuning 能量消耗曲线设计关卡难度
 * - ReplayAnalysis 的 AI Coach 根据失败回放生成针对性训练建议
 * - 玩家进度数据通过 localStorage 持久化
 * 
 * 设计来源：generic-agent Self-Evolution | thunderbolt feedback loops | chatdev multi-agent
 */

// Forward declarations for cross-system integration
class MetagameTracker {}
class SeasonManager {}
class ELORating {}
class ChronicleRegistry {}
class StoryMemory {}
class ReplayAnalyzer {}
class EnergyTuner {}
class ArchetypeRegistry {}
class SynergyRegistry {}

/**
 * DifficultyCurve - 动态难度曲线
 * 基于赛季数据和ELO建立动态难度曲线
 */
class DifficultyCurve {
  constructor() {
    this.CURVE_KEY = 'difficulty_curve_data';
    this.MIN_DIFFICULTY = 1;
    this.MAX_DIFFICULTY = 10;
    this.DEFAULT_SLOPE = 0.15;
    this.curves = new Map();
  }

  /**
   * 计算当前难度等级
   * @param {object} context - 上下文 { elo, seasonProgress, winRate, gamesPlayed }
   * @returns {number} 难度等级 1-10
   */
  calculateDifficulty(context = {}) {
    const {
      elo = 1500,
      seasonProgress = 0,
      winRate = 0.5,
      gamesPlayed = 0,
      chronicleChapter = 0,
      archetypeLevel = 0
    } = context;

    // 基础难度
    let baseDifficulty = this.MIN_DIFFICULTY;

    // ELO 影响：1500为基准，每高100增加0.5难度
    const eloContribution = Math.max(0, (elo - 1500) / 200);

    // 赛季进度影响：每10%进度增加0.3难度
    const seasonContribution = (seasonProgress / 100) * 3;

    // 胜率影响：低于50%降低难度，高于50%增加难度
    const winRateContribution = (winRate - 0.5) * 10;

    // 游戏经验影响：每50场增加0.2难度
    const experienceContribution = (gamesPlayed / 50) * 0.2;

    // 章节进度加成：每章增加0.15难度
    const chapterContribution = chronicleChapter * 0.15;

    // 特性等级加成：每级增加0.3难度
    const archetypeContribution = archetypeLevel * 0.3;

    // 计算最终难度
    const finalDifficulty = baseDifficulty 
      + eloContribution 
      + seasonContribution 
      + winRateContribution 
      + experienceContribution 
      + chapterContribution 
      + archetypeContribution;

    // 限制在 1-10 范围内
    return Math.max(
      this.MIN_DIFFICULTY, 
      Math.min(this.MAX_DIFFICULTY, Math.round(finalDifficulty * 10) / 10)
    );
  }

  /**
   * 获取难度曲线的时间点
   * @param {number} totalTurns - 总回合数
   * @param {number} difficulty - 难度等级
   * @returns {array} 难度曲线数组
   */
  generateCurve(totalTurns = 20, difficulty = 5) {
    const curve = [];
    const midpoint = totalTurns / 2;
    const steepness = 0.15 * difficulty;

    for (let turn = 1; turn <= totalTurns; turn++) {
      // S型曲线：早期平稳，中期上升，后期趋于平稳
      const progress = turn / totalTurns;
      const sigmoid = 1 / (1 + Math.exp(-steepness * totalTurns * (progress - 0.5)));
      
      // 难度缩放
      const turnDifficulty = Math.max(1, Math.min(10, difficulty * (0.5 + sigmoid)));
      
      curve.push({
        turn,
        difficulty: Math.round(turnDifficulty * 10) / 10,
        phase: turn <= midpoint ? 'early' : turn <= totalTurns * 0.75 ? 'mid' : 'late'
      });
    }

    return curve;
  }

  /**
   * 获取指定回合的推荐能量
   * @param {number} turn - 当前回合
   * @param {number} difficulty - 难度等级
   * @returns {number} 推荐的每回合能量
   */
  getRecommendedEnergy(turn, difficulty = 5) {
    // 难度越高，能量曲线越保守
    const baseEnergy = 3;
    const difficultyBonus = (difficulty - 5) * 0.2;
    const turnBonus = Math.floor(turn / 5) * 0.3;
    
    return Math.max(2, Math.min(5, Math.round(baseEnergy + difficultyBonus + turnBonus)));
  }

  /**
   * 保存难度曲线数据
   * @param {string} playerId - 玩家ID
   * @param {object} curveData - 曲线数据
   */
  saveCurveData(playerId, curveData) {
    try {
      const key = this.CURVE_KEY + '_' + playerId;
      const existing = this.curves.get(playerId) || {};
      const updated = { ...existing, ...curveData, updatedAt: Date.now() };
      this.curves.set(playerId, updated);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('[DifficultyCurve] saveCurveData failed:', e);
    }
  }

  /**
   * 加载难度曲线数据
   * @param {string} playerId - 玩家ID
   * @returns {object} 曲线数据
   */
  loadCurveData(playerId) {
    try {
      if (this.curves.has(playerId)) {
        return this.curves.get(playerId);
      }
      const key = this.CURVE_KEY + '_' + playerId;
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : {};
      this.curves.set(playerId, parsed);
      return parsed;
    } catch (e) {
      return {};
    }
  }

  /**
   * 重置信难度数据
   * @param {string} playerId - 玩家ID
   */
  resetCurveData(playerId) {
    this.curves.delete(playerId);
    try {
      localStorage.removeItem(this.CURVE_KEY + '_' + playerId);
    } catch (e) {
      console.warn('[DifficultyCurve] resetCurveData failed:', e);
    }
  }
}

/**
 * PlayerProgression - 玩家成长系统
 * 基于 chronicle-campaign 章节进度调整玩家成长
 */
class PlayerProgression {
  constructor() {
    this.PROGRESSION_KEY = 'player_progression_';
    this.MAX_LEVEL = 100;
    this.BASE_XP = 100;
  }

  /**
   * 获取玩家进度数据
   * @param {string} playerId - 玩家ID
   * @returns {object} 玩家进度数据
   */
  getProgression(playerId) {
    if (!playerId) return null;
    
    try {
      const key = this.PROGRESSION_KEY + playerId;
      const data = localStorage.getItem(key);
      
      if (!data) {
        return this.createDefaultProgression(playerId);
      }
      
      return JSON.parse(data);
    } catch (e) {
      console.warn('[PlayerProgression] getProgression failed:', e);
      return this.createDefaultProgression(playerId);
    }
  }

  /**
   * 创建默认进度
   * @param {string} playerId - 玩家ID
   * @returns {object} 默认进度数据
   */
  createDefaultProgression(playerId) {
    return {
      playerId,
      level: 1,
      experience: 0,
      totalXpEarned: 0,
      chaptersCompleted: [],
      archetypesUnlocked: [],
      achievements: [],
      stats: {
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        perfectGames: 0,
        fastestWin: null,
        highestDamage: 0,
        highestHealing: 0
      },
      skills: {
        attack: 1,
        defense: 1,
        resource: 1,
        strategy: 1
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * 奖励经验值
   * @param {string} playerId - 玩家ID
   * @param {number} xp - 经验值
   * @param {string} source - 来源 'game_win' | 'chapter_complete' | 'achievement' | 'tutorial'
   * @returns {object} 升级信息
   */
  rewardXP(playerId, xp, source = 'game_win') {
    if (!playerId || xp <= 0) return null;

    const progression = this.getProgression(playerId);
    const oldLevel = progression.level;

    // 添加经验
    progression.experience += xp;
    progression.totalXpEarned += xp;

    // 检查升级
    let levelsGained = 0;
    while (progression.experience >= this.xpRequiredForLevel(progression.level + 1)) {
      progression.experience -= this.xpRequiredForLevel(progression.level + 1);
      progression.level++;
      levelsGained++;
    }

    // 保存并返回
    progression.updatedAt = Date.now();
    this.saveProgression(playerId, progression);

    return {
      xpAwarded: xp,
      source,
      oldLevel,
      newLevel: progression.level,
      levelsGained,
      xpRemaining: progression.experience,
      xpToNextLevel: this.xpRequiredForLevel(progression.level + 1)
    };
  }

  /**
   * 计算指定等级需要的经验值
   * @param {number} level - 等级
   * @returns {number} 需要总经验值
   */
  xpRequiredForLevel(level) {
    if (level <= 1) return 0;
    // 指数增长曲线
    return Math.floor(this.BASE_XP * Math.pow(1.15, level - 1));
  }

  /**
   * 增加技能等级
   * @param {string} playerId - 玩家ID
   * @param {string} skill - 技能 'attack' | 'defense' | 'resource' | 'strategy'
   * @param {number} amount - 增加量
   * @returns {object} 技能更新结果
   */
  increaseSkill(playerId, skill, amount = 1) {
    const validSkills = ['attack', 'defense', 'resource', 'strategy'];
    if (!validSkills.includes(skill)) return null;

    const progression = this.getProgression(playerId);
    const oldValue = progression.skills[skill] || 1;
    const newValue = Math.min(10, oldValue + amount);
    progression.skills[skill] = newValue;
    progression.updatedAt = Date.now();
    
    this.saveProgression(playerId, progression);

    return {
      skill,
      oldValue,
      newValue,
      increase: amount
    };
  }

  /**
   * 更新游戏统计
   * @param {string} playerId - 玩家ID
   * @param {object} gameResult - 游戏结果
   */
  updateGameStats(playerId, gameResult) {
    const progression = this.getProgression(playerId);
    
    progression.stats.totalGames++;
    if (gameResult.won) {
      progression.stats.totalWins++;
    } else {
      progression.stats.totalLosses++;
    }

    if (gameResult.perfect) {
      progression.stats.perfectGames++;
    }

    if (gameResult.turns && (!progression.stats.fastestWin || gameResult.turns < progression.stats.fastestWin)) {
      progression.stats.fastestWin = gameResult.turns;
    }

    if (gameResult.damage && gameResult.damage > progression.stats.highestDamage) {
      progression.stats.highestDamage = gameResult.damage;
    }

    if (gameResult.healing && gameResult.healing > progression.stats.highestHealing) {
      progression.stats.highestHealing = gameResult.healing;
    }

    progression.updatedAt = Date.now();
    this.saveProgression(playerId, progression);
  }

  /**
   * 解锁成就
   * @param {string} playerId - 玩家ID
   * @param {string} achievementId - 成就ID
   * @returns {boolean} 是否成功
   */
  unlockAchievement(playerId, achievementId) {
    if (!playerId || !achievementId) return false;

    const progression = this.getProgression(playerId);
    if (progression.achievements.includes(achievementId)) {
      return false; // 已经解锁
    }

    progression.achievements.push(achievementId);
    progression.updatedAt = Date.now();
    this.saveProgression(playerId, progression);

    return true;
  }

  /**
   * 完成章节
   * @param {string} playerId - 玩家ID
   * @param {string} chapterId - 章节ID
   * @returns {boolean} 是否成功
   */
  completeChapter(playerId, chapterId) {
    if (!playerId || !chapterId) return false;

    const progression = this.getProgression(playerId);
    if (progression.chaptersCompleted.includes(chapterId)) {
      return false;
    }

    progression.chaptersCompleted.push(chapterId);
    progression.updatedAt = Date.now();
    this.saveProgression(playerId, progression);

    return true;
  }

  /**
   * 解锁特性
   * @param {string} playerId - 玩家ID
   * @param {string} archetypeId - 特性ID
   * @returns {boolean} 是否成功
   */
  unlockArchetype(playerId, archetypeId) {
    if (!playerId || !archetypeId) return false;

    const progression = this.getProgression(playerId);
    if (progression.archetypesUnlocked.includes(archetypeId)) {
      return false;
    }

    progression.archetypesUnlocked.push(archetypeId);
    progression.updatedAt = Date.now();
    this.saveProgression(playerId, progression);

    return true;
  }

  /**
   * 获取玩家总体评价
   * @param {string} playerId - 玩家ID
   * @returns {object} 玩家评价数据
   */
  getPlayerRating(playerId) {
    const progression = this.getProgression(playerId);
    const stats = progression.stats;

    // 计算胜率
    const winRate = stats.totalGames > 0 ? stats.totalWins / stats.totalGames : 0;
    
    // 计算综合评分
    const levelScore = progression.level * 10;
    const skillScore = Object.values(progression.skills).reduce((a, b) => a + b, 0) * 5;
    const achievementScore = progression.achievements.length * 20;
    const winScore = winRate * 100;

    const overallScore = levelScore + skillScore + achievementScore + winScore;

    // 确定等级
    let grade = 'F';
    if (overallScore >= 2000) grade = 'S';
    else if (overallScore >= 1500) grade = 'A';
    else if (overallScore >= 1000) grade = 'B';
    else if (overallScore >= 500) grade = 'C';
    else if (overallScore >= 200) grade = 'D';

    return {
      playerId,
      level: progression.level,
      experience: progression.experience,
      xpToNextLevel: this.xpRequiredForLevel(progression.level + 1),
      winRate: Math.round(winRate * 100) / 100,
      totalGames: stats.totalGames,
      overallScore,
      grade,
      skills: progression.skills,
      achievementsCount: progression.achievements.length,
      chaptersCompleted: progression.chaptersCompleted.length,
      archetypesUnlocked: progression.archetypesUnlocked.length
    };
  }

  /**
   * 保存进度
   * @param {string} playerId - 玩家ID
   * @param {object} progression - 进度数据
   */
  saveProgression(playerId, progression) {
    try {
      const key = this.PROGRESSION_KEY + playerId;
      localStorage.setItem(key, JSON.stringify(progression));
    } catch (e) {
      console.warn('[PlayerProgression] saveProgression failed:', e);
    }
  }

  /**
   * 重置玩家进度
   * @param {string} playerId - 玩家ID
   */
  resetProgression(playerId) {
    try {
      const key = this.PROGRESSION_KEY + playerId;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[PlayerProgression] resetProgression failed:', e);
    }
  }
}

/**
 * AICoachAdvisor - AI教练建议系统
 * 基于 ReplayAnalysis 的失败回放生成针对性训练建议
 */
class AICoachAdvisor {
  constructor(replayAnalyzer) {
    this.replayAnalyzer = replayAnalyzer || null;
    this.adviceHistory = [];
    this.PRIORITY_THRESHOLDS = {
      critical: 3,
      high: 5,
      medium: 8,
      low: 10
    };
  }

  /**
   * 设置回放分析器
   * @param {object} replayAnalyzer - ReplayAnalyzer实例
   */
  setReplayAnalyzer(replayAnalyzer) {
    this.replayAnalyzer = replayAnalyzer;
  }

  /**
   * 分析失败并生成建议
   * @param {string} playerId - 玩家ID
   * @param {array} failedReplayIds - 失败回放ID数组
   * @returns {array} 建议列表
   */
  generateAdviceFromFailures(playerId, failedReplayIds) {
    if (!playerId || !failedReplayIds || failedReplayIds.length === 0) {
      return [];
    }

    const allAdvice = [];
    
    for (const replayId of failedReplayIds) {
      if (this.replayAnalyzer) {
        const analysis = this.replayAnalyzer.analyzeReplay(replayId);
        if (analysis && analysis.improvements) {
          allAdvice.push(...analysis.improvements);
        }
      }
    }

    // 合并类似建议
    const mergedAdvice = this.mergeSimilarAdvice(allAdvice);
    
    // 排序并添加优先级
    const prioritizedAdvice = this.prioritizeAdvice(mergedAdvice);

    // 记录到历史
    this.recordAdvice(playerId, prioritizedAdvice);

    return prioritizedAdvice;
  }

  /**
   * 根据上下文生成建议
   * @param {object} context - 上下文 { playerId, recentGames, currentDifficulty, archetypeBonuses }
   * @returns {array} 建议列表
   */
  generateContextAdvice(context) {
    const { playerId, recentGames = [], currentDifficulty = 5, archetypeBonuses = {} } = context;
    
    const advice = [];

    // 分析最近游戏
    const losses = recentGames.filter(g => !g.won);
    if (losses.length >= 3) {
      advice.push({
        type: 'persistence',
        priority: 'medium',
        message: '连续失败可能表明需要调整策略或休息一下',
        suggestion: '考虑更换卡组或降低难度'
      });
    }

    // 检查难度适应性
    if (currentDifficulty > 7 && losses.length >= 2) {
      advice.push({
        type: 'difficulty',
        priority: 'high',
        message: '当前难度过高，建议适当降低',
        suggestion: '使用难度调整功能或选择更简单的对手'
      });
    }

    // 检查特性协同
    if (Object.keys(archetypeBonuses).length > 0) {
      advice.push({
        type: 'synergy',
        priority: 'medium',
        message: '您有可用的特性加成，考虑激活它们',
        suggestion: '在卡组中选择具有协同效果的卡牌'
      });
    }

    // 记录并返回
    if (advice.length > 0) {
      this.recordAdvice(playerId, advice);
    }

    return advice;
  }

  /**
   * 合并类似建议
   * @param {array} adviceList - 建议列表
   * @returns {array} 合并后的建议
   */
  mergeSimilarAdvice(adviceList) {
    const merged = [];
    const seen = new Map();

    for (const advice of adviceList) {
      const key = advice.type + '_' + advice.message;
      
      if (seen.has(key)) {
        // 合并优先级
        const existing = seen.get(key);
        const currentPriority = this.PRIORITY_THRESHOLDS[advice.priority] || 5;
        const existingPriority = this.PRIORITY_THRESHOLDS[existing.priority] || 5;
        
        if (currentPriority < existingPriority) {
          existing.priority = advice.priority;
          existing.count = (existing.count || 1) + 1;
        }
      } else {
        seen.set(key, { ...advice, count: 1 });
        merged.push(seen.get(key));
      }
    }

    return merged;
  }

  /**
   * 优先级排序建议
   * @param {array} adviceList - 建议列表
   * @returns {array} 排序后的建议
   */
  prioritizeAdvice(adviceList) {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return [...adviceList].sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.count || 1) - (a.count || 1);
    });
  }

  /**
   * 记录建议到历史
   * @param {string} playerId - 玩家ID
   * @param {array} adviceList - 建议列表
   */
  recordAdvice(playerId, adviceList) {
    this.adviceHistory.push({
      playerId,
      advice: adviceList,
      timestamp: Date.now()
    });

    // 限制历史大小
    if (this.adviceHistory.length > 100) {
      this.adviceHistory = this.adviceHistory.slice(-100);
    }

    // 尝试保存到 localStorage
    try {
      const key = 'ai_coach_advice_' + playerId;
      localStorage.setItem(key, JSON.stringify(this.adviceHistory.slice(-50)));
    } catch (e) {
      console.warn('[AICoachAdvisor] recordAdvice failed:', e);
    }
  }

  /**
   * 获取建议历史
   * @param {string} playerId - 玩家ID
   * @param {number} limit - 限制数量
   * @returns {array} 建议历史
   */
  getAdviceHistory(playerId, limit = 20) {
    try {
      const key = 'ai_coach_advice_' + playerId;
      const data = localStorage.getItem(key);
      const history = data ? JSON.parse(data) : [];
      return history.slice(-limit);
    } catch (e) {
      return this.adviceHistory.filter(h => h.playerId === playerId).slice(-limit);
    }
  }

  /**
   * 清除建议历史
   * @param {string} playerId - 玩家ID
   */
  clearAdviceHistory(playerId) {
    this.adviceHistory = this.adviceHistory.filter(h => h.playerId !== playerId);
    try {
      localStorage.removeItem('ai_coach_advice_' + playerId);
    } catch (e) {
      console.warn('[AICoachAdvisor] clearAdviceHistory failed:', e);
    }
  }
}

/**
 * AdaptiveDifficultyEngine - 自适应难度引擎
 * 整合所有系统，根据多因素动态调整难度
 */
class AdaptiveDifficultyEngine {
  constructor(options = {}) {
    this.difficultyCurve = new DifficultyCurve();
    this.playerProgression = new PlayerProgression();
    this.aiCoachAdvisor = new AICoachAdvisor(options.replayAnalyzer || null);
    
    // 外部系统引用
    this.metagameTracker = options.metagameTracker || null;
    this.seasonManager = options.seasonManager || null;
    this.eloRating = options.eloRating || null;
    this.chronicleRegistry = options.chronicleRegistry || null;
    this.storyMemory = options.storyMemory || null;
    this.energyTuner = options.energyTuner || null;
    this.archetypeRegistry = options.archetypeRegistry || null;
    
    this.currentDifficulty = 5;
    this.difficultyHistory = [];
  }

  /**
   * 计算自适应难度
   * @param {string} playerId - 玩家ID
   * @param {object} context - 额外上下文
   * @returns {object} 难度计算结果
   */
  calculateAdaptiveDifficulty(playerId, context = {}) {
    const elo = this.getPlayerELO(playerId);
    const seasonProgress = this.getSeasonProgress();
    const winRate = this.getPlayerWinRate(playerId);
    const gamesPlayed = this.getGamesPlayed(playerId);
    const chronicleChapter = this.getChapterProgress(playerId);
    const archetypeLevel = this.getArchetypeLevel(playerId);

    const difficultyContext = {
      elo,
      seasonProgress,
      winRate,
      gamesPlayed,
      chronicleChapter,
      archetypeLevel,
      ...context
    };

    const newDifficulty = this.difficultyCurve.calculateDifficulty(difficultyContext);
    const previousDifficulty = this.currentDifficulty;
    
    // 更新当前难度
    this.currentDifficulty = newDifficulty;

    // 记录历史
    this.difficultyHistory.push({
      playerId,
      difficulty: newDifficulty,
      previousDifficulty,
      context: difficultyContext,
      timestamp: Date.now()
    });

    // 限制历史大小
    if (this.difficultyHistory.length > 100) {
      this.difficultyHistory = this.difficultyHistory.slice(-100);
    }

    return {
      difficulty: newDifficulty,
      previousDifficulty,
      change: newDifficulty - previousDifficulty,
      context: difficultyContext,
      curve: this.difficultyCurve.generateCurve(20, newDifficulty),
      recommendedEnergy: this.difficultyCurve.getRecommendedEnergy(
        context.turn || 1, 
        newDifficulty
      )
    };
  }

  /**
   * 获取敌人属性调整
   * @param {string} playerId - 玩家ID
   * @param {object} baseEnemy - 基础敌人属性
   * @returns {object} 调整后的敌人属性
   */
  getEnemyAdjustment(playerId, baseEnemy = {}) {
    const difficulty = this.currentDifficulty;
    
    // 基于难度调整敌人属性
    const difficultyMultiplier = 1 + (difficulty - 5) * 0.1;
    
    const adjusted = {
      ...baseEnemy,
      health: Math.round((baseEnemy.health || 100) * difficultyMultiplier),
      damage: Math.round((baseEnemy.damage || 10) * difficultyMultiplier),
      armor: Math.round((baseEnemy.armor || 5) * difficultyMultiplier),
      speed: Math.round((baseEnemy.speed || 1) * (1 + (difficulty - 5) * 0.05)),
      resistance: this.calculateEnemyResistance(difficulty)
    };

    return adjusted;
  }

  /**
   * 计算敌人抗性
   * @param {number} difficulty - 难度等级
   * @returns {object} 抗性数据
   */
  calculateEnemyResistance(difficulty) {
    // 难度越高，敌人对特定效果的抗性越强
    const baseResistance = 0;
    const resistancePerDifficulty = 0.05;
    
    return {
      physical: Math.min(0.5, baseResistance + (difficulty - 1) * resistancePerDifficulty),
      magical: Math.min(0.5, baseResistance + (difficulty - 1) * resistancePerDifficulty * 0.8),
      special: Math.min(0.4, baseResistance + (difficulty - 1) * resistancePerDifficulty * 0.5)
    };
  }

  /**
   * 获取能量调整
   * @param {number} turn - 当前回合
   * @param {string} playerId - 玩家ID
   * @returns {object} 能量调整结果
   */
  getEnergyAdjustment(turn, playerId) {
    const difficulty = this.currentDifficulty;
    
    // 难度越高，基础能量越低
    const baseEnergy = 3;
    const difficultyEnergyModifier = (5 - difficulty) * 0.2;
    const turnBonus = Math.floor(turn / 5) * 0.3;
    
    const energy = Math.max(2, Math.round(baseEnergy + difficultyEnergyModifier + turnBonus));
    const maxEnergy = energy;

    return {
      energy,
      maxEnergy,
      difficulty,
      turn
    };
  }

  /**
   * 获取敌人行为调整
   * @param {string} playerId - 玩家ID
   * @returns {object} 行为调整
   */
  getEnemyBehaviorAdjustment(playerId) {
    const difficulty = this.currentDifficulty;
    const playerProgression = this.playerProgression.getProgression(playerId);
    
    // 高难度敌人更aggressive
    const aggressionMultiplier = 1 + (difficulty - 5) * 0.1;
    
    // 敌人攻击倾向
    let attackTendency = 0.5; // 默认50%攻击
    if (difficulty >= 7) {
      attackTendency = 0.7; // 高难度更倾向攻击
    } else if (difficulty <= 3) {
      attackTendency = 0.3; // 低难度更保守
    }

    // 敌人使用特殊能力倾向
    const specialAbilityTendency = Math.min(0.8, 0.2 + difficulty * 0.06);

    // 敌人节奏控制
    const tempoControl = difficulty >= 6 ? 'aggressive' : 'normal';

    return {
      attackTendency,
      specialAbilityTendency,
      tempoControl,
      aggressionMultiplier,
      skillLevel: Math.min(100, 50 + difficulty * 5)
    };
  }

  /**
   * 处理游戏结束
   * @param {string} playerId - 玩家ID
   * @param {object} gameResult - 游戏结果
   * @returns {object} 处理结果
   */
  processGameEnd(playerId, gameResult) {
    const { won, turns, damage, perfect, replayId } = gameResult;

    // 更新玩家进度统计
    this.playerProgression.updateGameStats(playerId, gameResult);

    // 奖励XP
    let xpResult = null;
    if (won) {
      const baseXp = perfect ? 200 : 100;
      xpResult = this.playerProgression.rewardXP(playerId, baseXp, 'game_win');
    }

    // 收集失败回放用于分析
    let advice = [];
    if (!won && replayId) {
      advice = this.aiCoachAdvisor.generateAdviceFromFailures(playerId, [replayId]);
    }

    // 重新计算难度
    const newDifficulty = this.calculateAdaptiveDifficulty(playerId, {
      turn: turns,
      damage,
      won
    });

    return {
      xpResult,
      advice,
      newDifficulty,
      gameStats: this.playerProgression.getPlayerRating(playerId)
    };
  }

  /**
   * 获取玩家状态摘要
   * @param {string} playerId - 玩家ID
   * @returns {object} 状态摘要
   */
  getPlayerStatusSummary(playerId) {
    const progression = this.playerProgression.getProgression(playerId);
    const elo = this.getPlayerELO(playerId);
    const difficulty = this.currentDifficulty;
    const rating = this.playerProgression.getPlayerRating(playerId);

    return {
      playerId,
      level: progression.level,
      experience: progression.experience,
      elo,
      currentDifficulty: difficulty,
      winRate: rating.winRate,
      totalGames: progression.stats.totalGames,
      skills: progression.skills,
      achievementsCount: progression.achievements.length,
      chaptersCompleted: progression.chaptersCompleted.length,
      archetypesUnlocked: progression.archetypesUnlocked.length,
      grade: rating.grade
    };
  }

  // ===== 内部辅助方法 =====

  getPlayerELO(playerId) {
    if (this.eloRating) {
      return this.eloRating.getPlayerRating(playerId)?.rating || 1500;
    }
    // 尝试从localStorage获取
    try {
      const data = localStorage.getItem('elo_rating_' + playerId);
      return data ? JSON.parse(data).rating || 1500 : 1500;
    } catch {
      return 1500;
    }
  }

  getSeasonProgress() {
    if (this.seasonManager) {
      return this.seasonManager.getSeasonProgress() || 0;
    }
    return 0;
  }

  getPlayerWinRate(playerId) {
    const progression = this.playerProgression.getProgression(playerId);
    const stats = progression.stats;
    return stats.totalGames > 0 ? stats.totalWins / stats.totalGames : 0.5;
  }

  getGamesPlayed(playerId) {
    const progression = this.playerProgression.getProgression(playerId);
    return progression.stats.totalGames;
  }

  getChapterProgress(playerId) {
    if (this.storyMemory) {
      const progress = this.storyMemory.loadStoryProgress(playerId);
      return progress ? progress.completedChapters.length : 0;
    }
    // 尝试从进度中获取
    const progression = this.playerProgression.getProgression(playerId);
    return progression.chaptersCompleted.length;
  }

  getArchetypeLevel(playerId) {
    const progression = this.playerProgression.getProgression(playerId);
    // 简单估算：特性解锁数量
    return progression.archetypesUnlocked.length;
  }

  /**
   * 获取难度曲线
   * @param {number} totalTurns - 总回合数
   * @returns {array} 难度曲线
   */
  getDifficultyCurve(totalTurns = 20) {
    return this.difficultyCurve.generateCurve(totalTurns, this.currentDifficulty);
  }

  /**
   * 重置玩家难度数据
   * @param {string} playerId - 玩家ID
   */
  resetPlayerDifficulty(playerId) {
    this.difficultyCurve.resetCurveData(playerId);
    this.playerProgression.resetProgression(playerId);
    this.aiCoachAdvisor.clearAdviceHistory(playerId);
    this.currentDifficulty = 5;
    this.difficultyHistory = [];
  }
}

// 导出所有类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AdaptiveDifficultyEngine,
    PlayerProgression,
    DifficultyCurve,
    AICoachAdvisor
  };
}