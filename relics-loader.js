/**
 * V62 Roguelike Relics System
 * 遗物系统核心模块
 */

// 遗物数据结构 - 基于PRD定义的遗物
const RELICS_V62 = {
  "relic_ankh": {
    id: "relic_ankh",
    name: "生命之符",
    description: "战斗开始时，回复3点生命",
    rarity: "rare",
    icon: "☥",
    onStartOfCombat: function() {
      gameState.playerHp = Math.min(gameState.playerHp + 3, gameState.playerMaxHp);
      addLog(`遗物 ${this.name} 回复3点生命`, 'heal');
    }
  },
  "relic_skull": {
    id: "relic_skull",
    name: "骨杖",
    description: "每回合开始时，获得1点额外能量",
    rarity: "uncommon",
    icon: "💀",
    onTurnStart: function() {
      gameState.energy += 1;
      addLog(`遗物 ${this.name} 提供1能量`, 'info');
    }
  },
  "relic_shield": {
    id: "relic_shield",
    name: "铁壁护符",
    description: "战斗开始时，获得5点护甲",
    rarity: "common",
    icon: "🛡",
    onStartOfCombat: function() {
      gameState.playerShield += 5;
      addLog(`遗物 ${this.name} 提供5点护甲`, 'block');
    }
  },
  "relic_potion": {
    id: "relic_potion",
    name: "治疗药水",
    description: "战斗结束时，回复10点生命",
    rarity: "common",
    icon: "🧪",
    onBattleEnd: function() {
      gameState.playerHp = Math.min(gameState.playerHp + 10, gameState.playerMaxHp);
      addLog(`遗物 ${this.name} 战斗结束回复10点生命`, 'heal');
    }
  },
  "relic_staff": {
    id: "relic_staff",
    name: "充能法杖",
    description: "每回合开始时，获得1点额外能量",
    rarity: "uncommon",
    icon: "⚡",
    onTurnStart: function() {
      gameState.energy += 1;
      addLog(`遗物 ${this.name} 提供1能量`, 'info');
    }
  },
  // 额外遗物：龙心（Boss奖励）
  "relic_dragon_heart": {
    id: "relic_dragon_heart",
    name: "龙心",
    description: "攻击伤害+10，每回合回复5点生命",
    rarity: "legendary",
    icon: "🐉",
    effect: { damageBonus: 10, perTurnHeal: 5 }
  },
  // 额外遗物：治疗护符
  "relic_healing_charm": {
    id: "relic_healing_charm",
    name: "治疗护符",
    description: "战斗开始时，回复5点生命",
    rarity: "common",
    icon: "💚",
    onStartOfCombat: function() {
      gameState.playerHp = Math.min(gameState.playerHp + 5, gameState.playerMaxHp);
      addLog(`遗物 ${this.name} 回复5点生命`, 'heal');
    }
  },
  // 额外遗物：力量护符
  "relic_strength_charm": {
    id: "relic_strength_charm",
    name: "力量护符",
    description: "攻击伤害+5",
    rarity: "uncommon",
    icon: "⚔️",
    effect: { damageBonus: 5 }
  },
  // 额外遗物：能量护符
  "relic_energy_charm": {
    id: "relic_energy_charm",
    name: "能量护符",
    description: "战斗开始时，获得2点能量",
    rarity: "rare",
    icon: "💎",
    onStartOfCombat: function() {
      gameState.energy += 2;
      addLog(`遗物 ${this.name} 提供2能量`, 'info');
    }
  },

  // ========== V67 新增遗物 ==========

  // 普通遗物：锈铁戒指
  "rustyRing": {
    id: "rustyRing",
    name: "锈铁戒指",
    description: "每次攻击+1伤害",
    rarity: "common",
    icon: "💍",
    effect: { attackBonus: 1 },
    onAttackDealt: function(card, damage) {
      return damage + 1;
    }
  },

  // 普通遗物：生命符咒
  "lifeCharm": {
    id: "lifeCharm",
    name: "生命符咒",
    description: "每场战斗开始时+3生命",
    rarity: "common",
    icon: "📿",
    effect: { healOnCombatStart: 3 },
    onStartOfCombat: function() {
      gameState.playerHp = Math.min(gameState.playerHp + 3, gameState.playerMaxHp);
      addLog(`遗物 ${this.name} 回复3点生命`, 'heal');
    }
  },

  // 普通遗物：迅捷之靴
  "swiftBoots": {
    id: "swiftBoots",
    name: "迅捷之靴",
    description: "首次出牌时+1能量",
    rarity: "common",
    icon: "👢",
    effect: { energyOnFirstCard: 1 },
    onFirstCardPlayed: function() {
      gameState.energy += 1;
      addLog(`遗物 ${this.name} 首次出牌提供1能量`, 'info');
    }
  },

  // 稀有遗物：燃烧之核
  "burningCore": {
    id: "burningCore",
    name: "燃烧之核",
    description: "攻击附带灼烧，伤害+20%",
    rarity: "rare",
    icon: "🔥",
    effect: { attackBonusPercent: 20, burn: true },
    onAttackDealt: function(card, damage) {
      return Math.floor(damage * 1.2);
    }
  },

  // 稀有遗物：诅咒之瓶
  "cursedBottle": {
    id: "cursedBottle",
    name: "诅咒之瓶",
    description: "攻击有15%几率施加虚弱",
    rarity: "rare",
    icon: "🧴",
    effect: { weakChance: 0.15 },
    onAttackDealt: function(card, damage) {
      if (Math.random() < 0.15) {
        addLog(`遗物 ${this.name} 施加虚弱状态`, 'debuff');
      }
      return damage;
    }
  },

  // 传奇遗物：黑暗心脏
  "darkHeart": {
    id: "darkHeart",
    name: "黑暗心脏",
    description: "击杀敌人恢复5生命，攻击+2",
    rarity: "legendary",
    icon: "🖤",
    effect: { attackBonus: 2, healOnKill: 5 },
    onEnemyKilled: function() {
      gameState.playerHp = Math.min(gameState.playerHp + 5, gameState.playerMaxHp);
      addLog(`遗物 ${this.name} 击杀回复5点生命`, 'heal');
    }
  }
};

/**
 * 遗物触发钩子函数
 * @param {string} hookName - 钩子名称：onStartOfCombat, onTurnStart, onBattleEnd
 */
function triggerRelicHook(hookName) {
  if (!gameState.relics || !Array.isArray(gameState.relics)) return;
  
  gameState.relics.forEach(relicId => {
    // 首先检查 V62 钩子函数格式
    const v62Relic = RELICS_V62[relicId];
    if (v62Relic && typeof v62Relic[hookName] === 'function') {
      v62Relic[hookName]();
    }
    
    // 同时触发原有的 applyRelicEffect（向后兼容）
    // 注意：applyRelicEffect 的 trigger 格式是 'startOfCombat', 'startOfTurn', 'onVictory'
    const effectTrigger = hookName === 'onStartOfCombat' ? 'startOfCombat' : 
                          hookName === 'onTurnStart' ? 'startOfTurn' : 
                          hookName === 'onBattleEnd' ? 'onVictory' : null;
    if (effectTrigger) {
      // applyRelicEffect 会自动遍历 gameState.relics
    }
  });
}

/**
 * 获取遗物信息
 * @param {string} relicId - 遗物ID
 * @returns {object} 遗物对象
 */
function getRelicInfo(relicId) {
  return RELICS_V62[relicId] || RELICS[relicId] || null;
}

/**
 * 获取玩家当前装备的所有遗物
 * @returns {array} 遗物ID数组
 */
function getEquippedRelics() {
  return gameState.relics || [];
}

/**
 * 检查玩家是否拥有某个遗物
 * @param {string} relicId - 遗物ID
 * @returns {boolean}
 */
function hasRelicV62(relicId) {
  return gameState.relics && gameState.relics.includes(relicId);
}

/**
 * 添加遗物到玩家背包
 * @param {string} relicId - 遗物ID
 */
function addRelic(relicId) {
  if (!gameState.relics) {
    gameState.relics = [];
  }
  if (!gameState.relics.includes(relicId)) {
    gameState.relics.push(relicId);
    const relic = getRelicInfo(relicId);
    if (relic) {
      addLog(`获得遗物：${relic.name}`, 'success');
    }
  }
}

/**
 * 获取随机遗物（用于奖励）
 * @param {array} excludeIds - 排除的遗物ID数组
 * @returns {string} 遗物ID
 */
function getRandomRelicId(excludeIds = []) {
  const available = Object.keys(RELICS_V62).filter(id => 
    !excludeIds.includes(id) && !gameState.relics.includes(id)
  );
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * 获取遗物图标
 * @param {string} relicId - 遗物ID
 * @returns {string} 图标emoji
 */
function getRelicIcon(relicId) {
  const relic = getRelicInfo(relicId);
  return relic ? relic.icon : '❓';
}

/**
 * 获取遗物稀有度颜色
 * @param {string} rarity - 稀有度
 * @returns {string} CSS颜色
 */
function getRelicRarityColor(rarity) {
  switch(rarity) {
    case 'common': return '#aaa';
    case 'uncommon': return '#2ecc71';
    case 'rare': return '#3498db';
    case 'legendary': return '#f39c12';
    case 'boss': return '#e74c3c';
    default: return '#888';
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.RELICS_V62 = RELICS_V62;
  window.triggerRelicHook = triggerRelicHook;
  window.getRelicInfo = getRelicInfo;
  window.getEquippedRelics = getEquippedRelics;
  window.hasRelicV62 = hasRelicV62;
  window.addRelic = addRelic;
  window.getRandomRelicId = getRandomRelicId;
  window.getRelicIcon = getRelicIcon;
  window.getRelicRarityColor = getRelicRarityColor;

  // V67: 遗物稀有度CSS样式注入
  const relicStyle = document.createElement('style');
  relicStyle.textContent = `
    .relic.common { border: 2px solid #888; }
    .relic.rare { border: 2px solid #4488ff; box-shadow: 0 0 5px #4488ff; }
    .relic.legendary { border: 2px solid #ffcc00; animation: legendaryGlow 2s infinite; }
    @keyframes legendaryGlow {
      0%, 100% { box-shadow: 0 0 5px #ffcc00; }
      50% { box-shadow: 0 0 15px #ffcc00, 0 0 25px #ff6600; }
    }
  `;
  document.head.appendChild(relicStyle);
}
