/**
 * V101 Deck Archetype Evolution System (Direction C - Iteration 8/9)
 * 卡组特性进化系统：ArchetypeEngine | CardEvolution | ArchetypeRegistry
 * 
 * 概念：玩家使用特定协同组合时，触发卡组特性进化（卡牌外观/属性升级）
 * 进化后的卡牌获得 synergy-cascade 的协同加成和 metagame-evolution 的赛季增益
 * 与 season-tournament 的 ELO 系统联动，进化等级影响战斗属性
 * 与 chronicle-campaign 的章节进度联动，特定章节解锁进化路线
 * 与 energy-tuning 的能量曲线联动，进化消耗动态能量
 * 
 * 设计来源：generic-agent Self-Evolution | thunderbolt feedback loops | chatdev multi-agent
 */

// Forward declarations for cross-system integration (avoids circular dependency)
class SynergyRegistry {}
class MetagameTracker {}
class ELORating {}
class EnergyTuner {}

/**
 * ArchetypeRegistry - 卡组特性注册表
 * 管理所有卡组特性的注册、查询和特性链
 */
class ArchetypeRegistry {
  constructor() {
    this.archetypes = new Map();           // archetypeId -> archetypeDef
    this.cardArchetypes = new Map();        // cardId -> [archetypeId]
    this.evolutionPaths = new Map();        // archetypeId -> [evolutionMilestones]
    this.unlockedArchetypes = new Set();    // 已解锁的特性集合
  }

  /**
   * 注册卡组特性
   * @param {object} archetypeDef - 特性定义
   * @param {string} archetypeDef.id - 特性唯一ID
   * @param {string} archetypeDef.name - 特性名称
   * @param {string} archetypeDef.description - 特性描述
   * @param {string[]} archetypeDef.coreCards - 核心卡牌ID列表
   * @param {string} archetypeDef.triggerSynergy - 触发所需的协同效果ID
   * @param {number} archetypeDef.threshold - 触发阈值（使用次数）
   * @param {object} archetypeDef.bonuses - 特性加成 { stat, multiplier }
   * @returns {boolean} 注册是否成功
   */
  registerArchetype(archetypeDef) {
    if (!archetypeDef || !archetypeDef.id || !archetypeDef.name) {
      return false;
    }

    const id = archetypeDef.id;
    const coreCards = archetypeDef.coreCards || [];

    this.archetypes.set(id, {
      id: id,
      name: archetypeDef.name,
      description: archetypeDef.description || '',
      coreCards: coreCards,
      triggerSynergy: archetypeDef.triggerSynergy || null,
      threshold: archetypeDef.threshold || 10,
      bonuses: archetypeDef.bonuses || {},
      evolutionLevel: 0,
      maxEvolutionLevel: archetypeDef.maxEvolutionLevel || 5,
      unlocked: false,
      createdAt: Date.now()
    });

    // 建立卡牌到特性的索引
    for (const cardId of coreCards) {
      if (!this.cardArchetypes.has(cardId)) {
        this.cardArchetypes.set(cardId, []);
      }
      this.cardArchetypes.get(cardId).push(id);
    }

    return true;
  }

  /**
   * 获取卡组特性
   * @param {string} archetypeId - 特性ID
   * @returns {object|null} 特性定义
   */
  getArchetype(archetypeId) {
    return this.archetypes.get(archetypeId) || null;
  }

  /**
   * 获取卡牌关联的所有特性
   * @param {string} cardId - 卡牌ID
   * @returns {object[]} 特性定义数组
   */
  getArchetypesForCard(cardId) {
    const archetypeIds = this.cardArchetypes.get(cardId) || [];
    return archetypeIds.map(id => this.archetypes.get(id)).filter(Boolean);
  }

  /**
   * 获取所有已注册的卡组特性
   * @returns {object[]} 所有特性定义
   */
  getAllArchetypes() {
    return Array.from(this.archetypes.values());
  }

  /**
   * 检查卡组是否满足特定特性的触发条件
   * @param {string} archetypeId - 特性ID
   * @param {string[]} deckCardIds - 卡组中的卡牌ID数组
   * @returns {boolean} 是否满足条件
   */
  checkArchetypeCondition(archetypeId, deckCardIds) {
    const archetype = this.archetypes.get(archetypeId);
    if (!archetype) return false;

    const coreCards = archetype.coreCards;
    if (!coreCards || coreCards.length === 0) return true;

    // 检查核心卡牌是否都在卡组中
    return coreCards.every(cardId => deckCardIds.includes(cardId));
  }

  /**
   * 解锁卡组特性
   * @param {string} archetypeId - 特性ID
   * @returns {boolean} 解锁是否成功
   */
  unlockArchetype(archetypeId) {
    const archetype = this.archetypes.get(archetypeId);
    if (!archetype || archetype.unlocked) return false;

    archetype.unlocked = true;
    this.unlockedArchetypes.add(archetypeId);
    return true;
  }

  /**
   * 锁定卡组特性
   * @param {string} archetypeId - 特性ID
   * @returns {boolean} 锁定是否成功
   */
  lockArchetype(archetypeId) {
    const archetype = this.archetypes.get(archetypeId);
    if (!archetype || !archetype.unlocked) return false;

    archetype.unlocked = false;
    this.unlockedArchetypes.delete(archetypeId);
    return true;
  }

  /**
   * 设置特性进化等级
   * @param {string} archetypeId - 特性ID
   * @param {number} level - 进化等级
   * @returns {boolean} 设置是否成功
   */
  setEvolutionLevel(archetypeId, level) {
    const archetype = this.archetypes.get(archetypeId);
    if (!archetype) return false;

    const clampedLevel = Math.max(0, Math.min(level, archetype.maxEvolutionLevel));
    archetype.evolutionLevel = clampedLevel;
    return true;
  }

  /**
   * 增加特性进化等级
   * @param {string} archetypeId - 特性ID
   * @param {number} increment - 增量（默认1）
   * @returns {boolean} 是否成功提升
   */
  incrementEvolutionLevel(archetypeId, increment = 1) {
    const archetype = this.archetypes.get(archetypeId);
    if (!archetype) return false;

    const newLevel = Math.min(archetype.evolutionLevel + increment, archetype.maxEvolutionLevel);
    archetype.evolutionLevel = newLevel;
    return true;
  }

  /**
   * 获取特性的当前进化等级
   * @param {string} archetypeId - 特性ID
   * @returns {number} 进化等级，-1表示特性不存在
   */
  getEvolutionLevel(archetypeId) {
    const archetype = this.archetypes.get(archetypeId);
    return archetype ? archetype.evolutionLevel : -1;
  }

  /**
   * 注册进化路径（里程碑）
   * @param {string} archetypeId - 特性ID
   * @param {object[]} milestones - 进化里程碑数组
   * @returns {boolean} 注册是否成功
   */
  registerEvolutionPath(archetypeId, milestones) {
    if (!archetypeId || !milestones || !Array.isArray(milestones)) {
      return false;
    }

    this.evolutionPaths.set(archetypeId, milestones);
    return true;
  }

  /**
   * 获取特性的进化路径
   * @param {string} archetypeId - 特性ID
   * @returns {object[]} 进化里程碑数组
   */
  getEvolutionPath(archetypeId) {
    return this.evolutionPaths.get(archetypeId) || [];
  }

  /**
   * 获取特性数量
   * @returns {number}
   */
  getArchetypeCount() {
    return this.archetypes.size;
  }

  /**
   * 获取协同效果数量
   * @returns {number}
   */
  getSynergyCount() {
    return this.archetypes.size;
  }

  /**
   * 清除所有特性数据
   */
  clear() {
    this.archetypes.clear();
    this.cardArchetypes.clear();
    this.evolutionPaths.clear();
    this.unlockedArchetypes.clear();
  }

  /**
   * 获取已解锁的特性数量
   * @returns {number}
   */
  getUnlockedCount() {
    return this.unlockedArchetypes.size;
  }
}

/**
 * CardEvolution - 卡牌进化逻辑
 * 处理卡牌的进化判定、属性计算和效果应用
 */
class CardEvolution {
  constructor(archetypeRegistry) {
    this.registry = archetypeRegistry;
    this.evolutionCache = new Map();     // cardId -> evolved card data
    this.evolutionHistory = [];          // 进化历史记录
  }

  /**
   * 检查卡牌是否满足进化条件
   * @param {string} cardId - 卡牌ID
   * @param {string} archetypeId - 特性ID
   * @param {object} gameState - 游戏状态
   * @returns {object} 进化检查结果 { canEvolve, reason, requiredSynergies }
   */
  checkEvolutionCondition(cardId, archetypeId, gameState) {
    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) {
      return { canEvolve: false, reason: 'archetype_not_found', requiredSynergies: [] };
    }

    if (!archetype.unlocked) {
      return { canEvolve: false, reason: 'archetype_locked', requiredSynergies: [] };
    }

    // 检查核心卡牌是否在游戏中使用
    const playedCards = gameState.playedCards || [];
    const hasPlayedCoreCard = archetype.coreCards.some(coreId => 
      playedCards.includes(coreId)
    );

    if (!hasPlayedCoreCard) {
      return { 
        canEvolve: false, 
        reason: 'core_card_not_played', 
        requiredSynergies: archetype.coreCards 
      };
    }

    // 检查协同效果是否触发
    const triggeredSynergies = gameState.triggeredSynergies || [];
    const hasSynergy = !archetype.triggerSynergy || 
      triggeredSynergies.includes(archetype.triggerSynergy);

    if (!hasSynergy) {
      return { 
        canEvolve: false, 
        reason: 'synergy_not_triggered', 
        requiredSynergies: [archetype.triggerSynergy].filter(Boolean)
      };
    }

    return { 
      canEvolve: true, 
      reason: 'all_conditions_met', 
      requiredSynergies: [] 
    };
  }

  /**
   * 计算卡牌进化后的属性
   * @param {string} cardId - 卡牌ID
   * @param {object} originalCard - 原始卡牌数据
   * @param {string} archetypeId - 特性ID
   * @param {object} options - 额外选项 { synergyBonus, seasonBonus, eloRating }
   * @returns {object} 进化后的卡牌数据
   */
  calculateEvolvedStats(cardId, originalCard, archetypeId, options = {}) {
    if (!cardId || !originalCard || !archetypeId) {
      return originalCard;
    }

    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) {
      return originalCard;
    }

    const evolutionLevel = archetype.evolutionLevel;
    const bonuses = archetype.bonuses || {};

    // 创建进化后的卡牌副本
    const evolved = JSON.parse(JSON.stringify(originalCard));
    
    // 记录进化信息
    evolved._evolution = {
      archetypeId,
      evolutionLevel,
      evolvedAt: Date.now(),
      originalStats: {}
    };

    // 保存原始属性
    if (evolved.damage !== undefined) {
      evolved._evolution.originalStats.damage = evolved.damage;
    }
    if (evolved.cost !== undefined) {
      evolved._evolution.originalStats.cost = evolved.cost;
    }
    if (evolved.block !== undefined) {
      evolved._evolution.originalStats.block = evolved.block;
    }

    // 应用基础进化加成
    const baseMultiplier = 1 + (evolutionLevel * 0.1); // 每级+10%

    if (evolved.damage !== undefined && bonuses.damage) {
      const bonusDamage = Math.round(evolved.damage * bonuses.damage * baseMultiplier);
      evolved.damage += bonusDamage;
    }

    if (evolved.cost !== undefined && bonuses.costReduction) {
      const costReduction = Math.round(evolved.cost * bonuses.costReduction * baseMultiplier);
      evolved.cost = Math.max(0, evolved.cost - costReduction);
    }

    if (evolved.block !== undefined && bonuses.block) {
      const bonusBlock = Math.round(evolved.block * bonuses.block * baseMultiplier);
      evolved.block += bonusBlock;
    }

    // 应用协同加成 (synergy-cascade)
    if (options.synergyBonus && options.synergyBonus > 0) {
      const synergyMultiplier = 1 + (options.synergyBonus * 0.01);
      if (evolved.damage !== undefined) {
        evolved.damage = Math.round(evolved.damage * synergyMultiplier);
      }
      evolved._evolution.synergyBonusApplied = options.synergyBonus;
    }

    // 应用赛季加成 (metagame-evolution)
    if (options.seasonBonus && options.seasonBonus > 0) {
      const seasonMultiplier = 1 + (options.seasonBonus * 0.01);
      if (evolved.damage !== undefined) {
        evolved.damage = Math.round(evolved.damage * seasonMultiplier);
      }
      if (evolved.cost !== undefined) {
        evolved.cost = Math.max(0, evolved.cost - Math.round(options.seasonBonus * 0.05));
      }
      evolved._evolution.seasonBonusApplied = options.seasonBonus;
    }

    // 应用 ELO 加成 (season-tournament)
    if (options.eloRating && options.eloRating > 1500) {
      const eloBonus = Math.floor((options.eloRating - 1500) / 100) * 0.02;
      if (evolved.damage !== undefined) {
        evolved.damage = Math.round(evolved.damage * (1 + eloBonus));
      }
      evolved._evolution.eloBonusApplied = eloBonus * 100;
    }

    return evolved;
  }

  /**
   * 获取进化后的卡牌（带缓存）
   * @param {string} cardId - 卡牌ID
   * @param {object} originalCard - 原始卡牌数据
   * @param {string} archetypeId - 特性ID
   * @param {object} options - 额外选项
   * @returns {object} 进化后的卡牌数据
   */
  getEvolvedCard(cardId, originalCard, archetypeId, options = {}) {
    const cacheKey = `${cardId}_${archetypeId}_${JSON.stringify(options)}`;
    
    if (this.evolutionCache.has(cacheKey)) {
      return this.evolutionCache.get(cacheKey);
    }

    const evolved = this.calculateEvolvedStats(cardId, originalCard, archetypeId, options);
    this.evolutionCache.set(cacheKey, evolved);
    return evolved;
  }

  /**
   * 执行卡牌进化
   * @param {string} cardId - 卡牌ID
   * @param {string} archetypeId - 特性ID
   * @param {object} gameState - 游戏状态
   * @param {object} options - 额外选项
   * @returns {object} 进化结果 { success, evolvedCard, message }
   */
  performEvolution(cardId, archetypeId, gameState, options = {}) {
    const checkResult = this.checkEvolutionCondition(cardId, archetypeId, gameState);
    
    if (!checkResult.canEvolve) {
      return { 
        success: false, 
        evolvedCard: null, 
        message: checkResult.reason 
      };
    }

    const originalCard = options.originalCard || gameState.cards?.[cardId];
    if (!originalCard) {
      return { 
        success: false, 
        evolvedCard: null, 
        message: 'card_not_found' 
      };
    }

    const evolved = this.getEvolvedCard(
      cardId, 
      originalCard, 
      archetypeId, 
      {
        synergyBonus: options.synergyBonus,
        seasonBonus: options.seasonBonus,
        eloRating: options.eloRating
      }
    );

    // 记录进化历史
    this.evolutionHistory.push({
      cardId,
      archetypeId,
      evolutionLevel: this.registry.getEvolutionLevel(archetypeId),
      timestamp: Date.now(),
      triggeredBy: gameState.playerId || 'unknown'
    });

    return {
      success: true,
      evolvedCard: evolved,
      message: 'evolution_success'
    };
  }

  /**
   * 获取进化历史
   * @param {number} limit - 返回记录数量限制
   * @returns {object[]} 进化历史记录
   */
  getEvolutionHistory(limit = 50) {
    const history = [...this.evolutionHistory];
    return history.slice(-limit);
  }

  /**
   * 清除进化缓存
   */
  clearCache() {
    this.evolutionCache.clear();
  }

  /**
   * 重置进化历史
   */
  resetHistory() {
    this.evolutionHistory = [];
  }
}

/**
 * ArchetypeEngine - 动态卡组特性进化引擎
 * 核心引擎，管理卡组特性的触发判定、进化流程和跨系统联动
 */
class ArchetypeEngine {
  constructor() {
    this.registry = new ArchetypeRegistry();
    this.cardEvolution = new CardEvolution(this.registry);
    this.activeEvolutions = new Map();     // gameId -> active evolution state
    this.evolutionQueue = [];               // 待处理的进化队列
    this.maxEvolutionLevel = 5;
    this.energyCostPerEvolution = 3;       // 每次进化消耗的能量
  }

  /**
   * 初始化引擎（可注入依赖）
   * @param {object} dependencies - 依赖的系统
   * @param {SynergyRegistry} dependencies.synergyRegistry - 协同效果注册表
   * @param {MetagameTracker} dependencies.metagameTracker - meta数据追踪器
   * @param {ELORating} dependencies.eloRating - ELO评分系统
   * @param {EnergyTuner} dependencies.energyTuner - 能量调优系统
   */
  initialize(dependencies = {}) {
    if (dependencies.synergyRegistry) {
      this.synergyRegistry = dependencies.synergyRegistry;
    }
    if (dependencies.metagameTracker) {
      this.metagameTracker = dependencies.metagameTracker;
    }
    if (dependencies.eloRating) {
      this.eloRating = dependencies.eloRating;
    }
    if (dependencies.energyTuner) {
      this.energyTuner = dependencies.energyTuner;
    }
  }

  /**
   * 检查卡组是否满足进化条件
   * @param {string} archetypeId - 特性ID
   * @param {object} gameState - 游戏状态
   * @returns {object} 检查结果
   */
  checkEvolutionTrigger(archetypeId, gameState) {
    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) {
      return { triggered: false, reason: 'archetype_not_found' };
    }

    const deckCardIds = gameState.deckCards || [];
    const hasRequiredCards = this.registry.checkArchetypeCondition(archetypeId, deckCardIds);
    
    if (!hasRequiredCards) {
      return { triggered: false, reason: 'missing_required_cards' };
    }

    // 检查协同是否触发
    if (this.synergyRegistry) {
      const triggeredSynergies = this.synergyRegistry.getSynergyChains(deckCardIds);
      if (triggeredSynergies.length === 0 && archetype.triggerSynergy) {
        return { triggered: false, reason: 'synergy_not_triggered' };
      }
    }

    // 检查能量是否足够
    const playerEnergy = gameState.player?.energy || 0;
    const energyCost = this.calculateEvolutionEnergyCost(archetypeId, gameState);
    
    if (playerEnergy < energyCost) {
      return { triggered: false, reason: 'insufficient_energy', energyCost };
    }

    return { triggered: true, reason: 'all_conditions_met', energyCost };
  }

  /**
   * 计算进化所需的能量成本
   * @param {string} archetypeId - 特性ID
   * @param {object} gameState - 游戏状态
   * @returns {number} 能量成本
   */
  calculateEvolutionEnergyCost(archetypeId, gameState) {
    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) return 0;

    // 基础能量成本
    let cost = this.energyCostPerEvolution;

    // 应用能量曲线调优 (energy-tuning)
    if (this.energyTuner && gameState.deckId) {
      const energyProfile = this.energyTuner.analyzeDeckEnergy(gameState.deckId, gameState.deckCards);
      if (energyProfile && energyProfile.curveShape === 'late_game_heavy') {
        cost = Math.round(cost * 1.2); // 晚截止型卡组额外消耗20%
      }
    }

    // 进化等级越高，成本越高
    const levelMultiplier = 1 + (archetype.evolutionLevel * 0.15);
    cost = Math.round(cost * levelMultiplier);

    return cost;
  }

  /**
   * 触发卡组特性进化
   * @param {string} gameId - 游戏ID
   * @param {string} archetypeId - 特性ID
   * @param {object} gameState - 游戏状态
   * @returns {object} 进化结果
   */
  triggerEvolution(gameId, archetypeId, gameState) {
    const checkResult = this.checkEvolutionTrigger(archetypeId, gameState);
    
    if (!checkResult.triggered) {
      return { 
        success: false, 
        reason: checkResult.reason,
        energyCost: checkResult.energyCost || 0
      };
    }

    // 消耗能量
    const energyCost = checkResult.energyCost;
    if (gameState.player) {
      gameState.player.energy = Math.max(0, (gameState.player.energy || 0) - energyCost);
    }

    // 解锁特性（如果尚未解锁）
    this.registry.unlockArchetype(archetypeId);

    // 提升进化等级
    const oldLevel = this.registry.getEvolutionLevel(archetypeId);
    this.registry.incrementEvolutionLevel(archetypeId);
    const newLevel = this.registry.getEvolutionLevel(archetypeId);

    // 获取卡牌并执行进化
    const deckCards = gameState.deckCards || [];
    const evolvedCards = [];

    for (const cardId of deckCards) {
      const card = gameState.cards?.[cardId] || { id: cardId };
      const evolutionResult = this.cardEvolution.performEvolution(
        cardId,
        archetypeId,
        gameState,
        {
          originalCard: card,
          synergyBonus: this.getSynergyBonus(gameState),
          seasonBonus: this.getSeasonBonus(),
          eloRating: this.getEloRating(gameState)
        }
      );

      if (evolutionResult.success) {
        evolvedCards.push(evolutionResult.evolvedCard);
      }
    }

    // 记录活跃进化状态
    this.activeEvolutions.set(gameId, {
      archetypeId,
      triggeredAt: Date.now(),
      energyCost,
      evolvedCardCount: evolvedCards.length
    });

    return {
      success: true,
      archetypeId,
      oldLevel,
      newLevel,
      energyCost,
      evolvedCards
    };
  }

  /**
   * 获取协同加成
   * @param {object} gameState - 游戏状态
   * @returns {number} 协同加成百分比
   */
  getSynergyBonus(gameState) {
    if (!this.synergyRegistry || !gameState.deckCards) {
      return 0;
    }

    const chains = this.synergyRegistry.getSynergyChains(gameState.deckCards);
    // 每条协同链提供5%加成
    return Math.min(chains.length * 5, 25); // 最多25%
  }

  /**
   * 获取赛季加成
   * @returns {number} 赛季加成百分比
   */
  getSeasonBonus() {
    if (!this.metagameTracker) {
      return 0;
    }

    const status = this.metagameTracker.getEvolutionStatus?.();
    if (status && status.buffedCards?.length > 0) {
      // 每个buffed卡牌提供2%加成
      return Math.min(status.buffedCards.length * 2, 10);
    }

    return 0;
  }

  /**
   * 获取ELO评分加成
   * @param {object} gameState - 游戏状态
   * @returns {number} ELO评分
   */
  getEloRating(gameState) {
    if (!this.eloRating) {
      return 1500; // 默认评分
    }

    const playerId = gameState.playerId;
    if (playerId && typeof this.eloRating.getRating === 'function') {
      return this.eloRating.getRating(playerId);
    }

    return 1500;
  }

  /**
   * 获取特性的当前进化信息
   * @param {string} archetypeId - 特性ID
   * @returns {object} 进化信息
   */
  getEvolutionInfo(archetypeId) {
    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) {
      return null;
    }

    return {
      id: archetype.id,
      name: archetype.name,
      level: archetype.evolutionLevel,
      maxLevel: archetype.maxEvolutionLevel,
      unlocked: archetype.unlocked,
      progress: archetype.evolutionLevel / archetype.maxEvolutionLevel
    };
  }

  /**
   * 获取所有特性的进化状态摘要
   * @returns {object[]} 进化状态数组
   */
  getAllEvolutionStatus() {
    const archetypes = this.registry.getAllArchetypes();
    return archetypes.map(archetype => ({
      id: archetype.id,
      name: archetype.name,
      level: archetype.evolutionLevel,
      maxLevel: archetype.maxEvolutionLevel,
      unlocked: archetype.unlocked
    }));
  }

  /**
   * 验证卡组特性完整性（用于检查章节解锁条件）
   * @param {string} archetypeId - 特性ID
   * @param {number} chapterProgress - 章节进度
   * @returns {boolean} 是否满足章节解锁条件
   */
  validateChapterUnlock(archetypeId, chapterProgress) {
    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) return false;

    // 如果特性没有章节要求，直接返回true
    if (!archetype.requiredChapter) return true;

    return chapterProgress >= archetype.requiredChapter;
  }

  /**
   * 设置特性的章节解锁要求
   * @param {string} archetypeId - 特性ID
   * @param {number} chapter - 所需章节
   * @returns {boolean} 设置是否成功
   */
  setChapterRequirement(archetypeId, chapter) {
    const archetype = this.registry.getArchetype(archetypeId);
    if (!archetype) return false;

    archetype.requiredChapter = chapter;
    return true;
  }

  /**
   * 获取活跃进化状态
   * @param {string} gameId - 游戏ID
   * @returns {object|null} 活跃进化状态
   */
  getActiveEvolution(gameId) {
    return this.activeEvolutions.get(gameId) || null;
  }

  /**
   * 清除活跃进化状态
   * @param {string} gameId - 游戏ID
   */
  clearActiveEvolution(gameId) {
    this.activeEvolutions.delete(gameId);
  }

  /**
   * 将进化加入队列（待稍后处理）
   * @param {string} gameId - 游戏ID
   * @param {string} archetypeId - 特性ID
   */
  queueEvolution(gameId, archetypeId) {
    this.evolutionQueue.push({ gameId, archetypeId, queuedAt: Date.now() });
  }

  /**
   * 处理进化队列
   * @param {object} gameState - 游戏状态
   * @returns {object[]} 处理结果数组
   */
  processEvolutionQueue(gameState) {
    const results = [];
    const remainingQueue = [];

    for (const item of this.evolutionQueue) {
      const result = this.triggerEvolution(item.gameId, item.archetypeId, gameState);
      results.push({ ...result, queuedAt: item.queuedAt });

      // 如果进化成功，不放回队列
      if (!result.success) {
        remainingQueue.push(item);
      }
    }

    this.evolutionQueue = remainingQueue;
    return results;
  }

  /**
   * 获取进化队列长度
   * @returns {number}
   */
  getQueueLength() {
    return this.evolutionQueue.length;
  }

  /**
   * 清除进化队列
   */
  clearQueue() {
    this.evolutionQueue = [];
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ArchetypeRegistry,
    CardEvolution,
    ArchetypeEngine
  };
}