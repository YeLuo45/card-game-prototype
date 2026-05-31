/**
 * V256 Talent Forge System (Iteration 2/9)
 * 天赋锻造系统: TalentForge | TalentRegistry | ForgeHooks
 * 
 * 概念：卡牌天赋锻造，融合多个设计系统的精华
 * 设计来源: claude-code reasoning | nanobot mesh | chatdev collaboration 
 *          thunderbolt pipeline | generic-agent inference | ruflo pattern
 * 
 * 跨系统协同 (Cross-System Integration):
 * - 基于 synergy-cascade 计算协同加成
 * - 基于 energy-tuning 计算能量效率
 * - 基于 deck-archetype-evolution 计算卡牌进化路线
 */

class TalentRegistry {
  constructor() {
    this.talents = {
      FIERY: { id: 'fiery', name: '炽焰', color: '#ff4500', icon: '🔥', 
               desc: '攻击附加灼烧', weight: 1.0, type: 'offensive' },
      FROST: { id: 'frost', name: '寒霜', color: '#00bfff', icon: '❄️', 
               desc: '攻击可能冻结', weight: 0.9, type: 'control' },
      THUNDER: { id: 'thunder', name: '雷霆', color: '#ffff00', icon: '⚡', 
                 desc: '攻击附加麻痹', weight: 0.85, type: 'control' },
      POISON: { id: 'poison', name: '剧毒', color: '#32cd32', icon: '☠️', 
                desc: '持续造成中毒', weight: 0.95, type: 'dot' },
      PIERCE: { id: 'pierce', name: '护穿', color: '#c0c0c0', icon: '🗡️', 
                desc: '无视护甲伤害', weight: 0.8, type: 'penetration' },
      LIFESTEAL: { id: 'lifesteal', name: '吸血', color: '#dc143c', icon: '🩸', 
                   desc: '攻击回复生命', weight: 0.9, type: 'sustain' },
      SWIFT: { id: 'swift', name: '疾风', color: '#00fa9a', icon: '💨', 
               desc: '额外抽牌', weight: 1.0, type: 'utility' },
      FORTIFY: { id: 'fortify', name: '坚韧', color: '#daa520', icon: '🛡️', 
                 desc: '回合结束护甲', weight: 0.95, type: 'defensive' },
      RAGE: { id: 'rage', name: '狂暴', color: '#ff6347', icon: '😈', 
              desc: '攻击伤害提升', weight: 1.1, type: 'offensive' },
      LUCKY: { id: 'lucky', name: '幸运', color: '#ffd700', icon: '🎰', 
               desc: '额外奖励机会', weight: 0.75, type: 'utility' }
    };
    this.affinityBonus = {
      'fire': { 'fiery': 1.2, 'thunder': 1.1, 'lucky': 0.9 },
      'ice': { 'frost': 1.2, 'poison': 0.9, 'fortify': 1.1 },
      'lightning': { 'thunder': 1.3, 'pierce': 1.1, 'swift': 1.05 },
      'nature': { 'poison': 1.2, 'lifestealer': 1.1, 'fortify': 1.05 }
    };
  }

  /**
   * 获取天赋信息
   * @param {string} talentId - 天赋ID
   * @returns {object} 天赋信息
   */
  getTalent(talentId) {
    const key = talentId.toUpperCase();
    return this.talents[key] || null;
  }

  /**
   * 获取所有天赋
   * @returns {object} 所有天赋
   */
  getAllTalents() {
    return { ...this.talents };
  }

  /**
   * 获取天赋类型
   * @param {string} talentId - 天赋ID
   * @returns {string} 类型
   */
  getTalentType(talentId) {
    const talent = this.getTalent(talentId);
    return talent ? talent.type : 'unknown';
  }

  /**
   * 计算亲和性加成
   * @param {string} affinity - 亲和属性
   * @param {string} talentId - 天赋ID
   * @returns {number} 加成倍率
   */
  calculateAffinityBonus(affinity, talentId) {
    const affinityLower = affinity.toLowerCase();
    const talentLower = talentId.toLowerCase();
    if (this.affinityBonus[affinityLower]) {
      return this.affinityBonus[affinityLower][talentLower] || 1.0;
    }
    return 1.0;
  }

  /**
   * 获取符合类型的随机天赋
   * @param {string} type - 天赋类型
   * @returns {object} 随机天赋
   */
  getRandomTalentByType(type) {
    const matching = Object.values(this.talents).filter(t => t.type === type);
    if (matching.length === 0) return null;
    return matching[Math.floor(Math.random() * matching.length)];
  }

  /**
   * 验证天赋是否有效
   * @param {string} talentId - 天赋ID
   * @returns {boolean} 是否有效
   */
  isValidTalent(talentId) {
    return this.getTalent(talentId) !== null;
  }
}

class ForgeHooks {
  constructor() {
    this.hooks = {
      onTalentApplied: [],
      onForgeComplete: [],
      onForgeFailed: [],
      onTalentRemoved: []
    };
    this.hookEnabled = true;
  }

  /**
   * 注册钩子
   * @param {string} event - 事件名
   * @param {function} handler - 处理器
   */
  register(event, handler) {
    if (this.hooks[event]) {
      this.hooks[event].push(handler);
    }
  }

  /**
   * 触发钩子
   * @param {string} event - 事件名
   * @param {object} data - 数据
   */
  trigger(event, data) {
    if (!this.hookEnabled) return;
    if (this.hooks[event]) {
      for (const handler of this.hooks[event]) {
        try {
          handler(data);
        } catch (e) {
          console.warn(`[ForgeHooks] ${event} handler error:`, e);
        }
      }
    }
  }

  /**
   * 启用/禁用钩子
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.hookEnabled = enabled;
  }

  /**
   * 清除所有钩子
   */
  clear() {
    for (const event in this.hooks) {
      this.hooks[event] = [];
    }
  }
}

class ForgeRecipe {
  constructor() {
    this.recipes = new Map();
    this.initializeRecipes();
  }

  /**
   * 初始化锻造配方
   */
  initializeRecipes() {
    // 基础天赋配方
    this.recipes.set('fiery+rage', {
      id: 'ember_blade',
      name: '烬焰之刃',
      talents: ['fiery', 'rage'],
      bonus: { damageBonus: 15, burnChance: 0.3 },
      cost: 50,
      description: '攻击附带灼烧，伤害+15%'
    });

    this.recipes.set('frost+fortify', {
      id: 'ice_shield',
      name: '寒冰护盾',
      talents: ['frost', 'fortify'],
      bonus: { armorBonus: 8, freezeChance: 0.2 },
      cost: 45,
      description: '回合结束获得护甲，可能冻结攻击者'
    });

    this.recipes.set('thunder+swift', {
      id: 'storm_wind',
      name: '风暴之翼',
      talents: ['thunder', 'swift'],
      bonus: { dodgeChance: 0.25, extraDraw: 1 },
      cost: 55,
      description: '额外抽牌，闪避+25%'
    });

    this.recipes.set('poison+lifesteal', {
      id: 'toxic_vampire',
      name: '剧毒吸血鬼',
      talents: ['poison', 'lifesteal'],
      bonus: { poisonDamage: 3, lifestealPercent: 0.3 },
      cost: 60,
      description: '中毒持续伤害，攻击回血30%'
    });

    this.recipes.set('pierce+rage', {
      id: 'void_blade',
      name: '虚空之刃',
      talents: ['pierce', 'rage'],
      bonus: { armorPenetration: 100, damageBonus: 20 },
      cost: 70,
      description: '无视护甲，伤害+20%'
    });

    this.recipes.set('lucky+swift', {
      id: 'fortune_seeker',
      name: '命运追寻者',
      talents: ['lucky', 'swift'],
      bonus: { extraReward: 0.4, extraDraw: 2 },
      cost: 65,
      description: '额外奖励40%，额外抽牌2张'
    });
  }

  /**
   * 获取配方
   * @param {string} key - 配方键
   * @returns {object} 配方
   */
  getRecipe(key) {
    return this.recipes.get(key) || null;
  }

  /**
   * 获取所有配方
   * @returns {Map} 所有配方
   */
  getAllRecipes() {
    return new Map(this.recipes);
  }

  /**
   * 检查配方是否匹配
   * @param {string[]} talents - 天赋数组
   * @returns {object|null} 匹配的配方
   */
  matchRecipe(talents) {
    if (talents.length !== 2) return null;
    const sorted = [...talents].sort().join('+');
    
    // 检查正序和反序
    const reverse = [...talents].sort().reverse().join('+');
    return this.recipes.get(sorted) || this.recipes.get(reverse) || null;
  }

  /**
   * 生成配方键
   * @param {string} talent1 - 天赋1
   * @param {string} talent2 - 天赋2
   * @returns {string} 配方键
   */
  static makeRecipeKey(talent1, talent2) {
    return [talent1, talent2].sort().join('+');
  }
}

class TalentForgeSystem {
  constructor(options = {}) {
    this.registry = new TalentRegistry();
    this.hooks = new ForgeHooks();
    this.recipe = new ForgeRecipe();
    this.forgeLevel = options.forgeLevel || 1;
    this.maxForgeLevel = options.maxForgeLevel || 10;
    this.forgeSuccessRate = options.forgeSuccessRate || 0.8;
    this.criticalForgeBonus = options.criticalForgeBonus || 0.1;
    this.forgeHistory = [];
  }

  /**
   * 锻造天赋到卡牌
   * @param {object} card - 卡牌实例
   * @param {string} talentId - 天赋ID
   * @param {object} options - 锻造选项
   * @returns {object} 锻造结果
   */
  forgeTalent(card, talentId, options = {}) {
    const talent = this.registry.getTalent(talentId);
    if (!talent) {
      this.hooks.trigger('onForgeFailed', { card, reason: 'invalid_talent', talentId });
      return { success: false, reason: 'invalid_talent' };
    }

    if (card.talent && card.talent.id) {
      this.hooks.trigger('onForgeFailed', { card, reason: 'already_has_talent', talentId });
      return { success: false, reason: 'already_has_talent' };
    }

    // 计算锻造成功率
    let successRate = this.forgeSuccessRate;
    if (options.affinity) {
      const affinityBonus = this.registry.calculateAffinityBonus(options.affinity, talentId);
      successRate *= affinityBonus;
    }
    successRate = Math.min(0.95, Math.max(0.5, successRate));

    // 检查是否暴击锻造
    const isCritical = Math.random() < this.criticalForgeBonus;
    
    // 执行锻造
    const success = Math.random() < successRate;

    if (success) {
      const forgedCard = { ...card };
      forgedCard.talent = {
        id: talent.id,
        name: talent.name,
        icon: talent.icon,
        color: talent.color,
        type: talent.type,
        level: isCritical ? 2 : 1
      };
      forgedCard.forged = true;
      forgedCard.forgeLevel = this.forgeLevel;

      this.hooks.trigger('onTalentApplied', { card: forgedCard, talent, isCritical });
      this.hooks.trigger('onForgeComplete', { card: forgedCard, talent, isCritical });

      this.forgeHistory.push({
        cardName: card.name,
        talent: talent.id,
        success: true,
        isCritical,
        timestamp: Date.now()
      });

      return {
        success: true,
        card: forgedCard,
        isCritical,
        talent
      };
    } else {
      this.hooks.trigger('onForgeFailed', { card, reason: 'forge_failed', talentId });
      return { success: false, reason: 'forge_failed' };
    }
  }

  /**
   * 升级天赋
   * @param {object} card - 卡牌实例
   * @returns {object} 升级结果
   */
  upgradeTalent(card) {
    if (!card.talent || !card.talent.id) {
      return { success: false, reason: 'no_talent' };
    }

    const talent = this.registry.getTalent(card.talent.id);
    if (!talent) {
      return { success: false, reason: 'invalid_talent' };
    }

    const currentLevel = card.talent.level || 1;
    if (currentLevel >= 3) {
      return { success: false, reason: 'max_level' };
    }

    const upgradeRate = 0.7 - (currentLevel - 1) * 0.1; // 等级越高成功率越低
    const success = Math.random() < upgradeRate;

    if (success) {
      const upgradedCard = { ...card };
      upgradedCard.talent = {
        ...card.talent,
        level: currentLevel + 1
      };

      this.hooks.trigger('onTalentApplied', { card: upgradedCard, talent, upgraded: true });

      return {
        success: true,
        card: upgradedCard,
        newLevel: currentLevel + 1
      };
    }

    return { success: false, reason: 'upgrade_failed' };
  }

  /**
   * 移除天赋
   * @param {object} card - 卡牌实例
   * @returns {object} 移除结果
   */
  removeTalent(card) {
    if (!card.talent) {
      return { success: false, reason: 'no_talent' };
    }

    const removedTalent = card.talent;
    const newCard = { ...card };
    delete newCard.talent;
    newCard.forged = false;

    this.hooks.trigger('onTalentRemoved', { card: newCard, talent: removedTalent });

    return {
      success: true,
      card: newCard,
      removedTalent
    };
  }

  /**
   * 应用配方
   * @param {object} card - 卡牌实例
   * @param {string[]} talents - 天赋数组
   * @returns {object} 应用结果
   */
  applyRecipe(card, talents) {
    if (talents.length !== 2) {
      return { success: false, reason: 'invalid_talent_count' };
    }

    const recipe = this.recipe.matchRecipe(talents);
    if (!recipe) {
      return { success: false, reason: 'no_recipe_match' };
    }

    // 检查是否已有天赋
    if (card.talent && card.talent.id) {
      return { success: false, reason: 'already_has_talent' };
    }

    const forgedCard = { ...card };
    forgedCard.talent = {
      id: recipe.id,
      name: recipe.name,
      icon: '⚗️',
      color: '#9400d3',
      type: 'recipe',
      level: 1,
      recipeBonus: recipe.bonus
    };
    forgedCard.forged = true;
    forgedCard.forgeLevel = this.forgeLevel;
    forgedCard.recipeId = recipe.id;

    this.hooks.trigger('onForgeComplete', { card: forgedCard, recipe });

    return {
      success: true,
      card: forgedCard,
      recipe
    };
  }

  /**
   * 计算天赋协同加成
   * @param {object} card1 - 卡牌1
   * @param {object} card2 - 卡牌2
   * @returns {number} 协同加成
   */
  calculateSynergyBonus(card1, card2) {
    if (!card1.talent || !card2.talent) return 1.0;

    const type1 = card1.talent.type;
    const type2 = card2.talent.type;

    // 相同类型天赋协同加成
    if (type1 === type2) {
      return 1.15;
    }

    // 进攻+持续伤害协同
    if ((type1 === 'offensive' && type2 === 'dot') || 
        (type1 === 'dot' && type2 === 'offensive')) {
      return 1.2;
    }

    // 控制+防守协同
    if ((type1 === 'control' && type2 === 'defensive') || 
        (type1 === 'defensive' && type2 === 'control')) {
      return 1.1;
    }

    // 通用协同
    return 1.05;
  }

  /**
   * 获取锻造历史
   * @returns {object[]} 锻造历史
   */
  getForgeHistory() {
    return [...this.forgeHistory];
  }

  /**
   * 清除锻造历史
   */
  clearHistory() {
    this.forgeHistory = [];
  }

  /**
   * 获取系统状态
   * @returns {object} 系统状态
   */
  getStatus() {
    return {
      forgeLevel: this.forgeLevel,
      maxForgeLevel: this.maxForgeLevel,
      forgeSuccessRate: this.forgeSuccessRate,
      historyCount: this.forgeHistory.length
    };
  }

  /**
   * 升级锻造炉等级
   * @returns {boolean} 是否成功
   */
  levelUpForge() {
    if (this.forgeLevel >= this.maxForgeLevel) return false;
    this.forgeLevel++;
    this.forgeSuccessRate = Math.min(0.95, this.forgeSuccessRate + 0.02);
    return true;
  }
}

// 导出
module.exports = { TalentForgeSystem, TalentRegistry, ForgeHooks, ForgeRecipe };