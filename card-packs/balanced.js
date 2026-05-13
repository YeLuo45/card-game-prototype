// card-packs/balanced.js - V60 均衡包插件
// 包含重击、重拳、硬撑等均衡型卡牌

window.CARD_PACKS = window.CARD_PACKS || {};
window.CARD_PACKS['balanced'] = {
  id: 'balanced',
  name: '均衡包',
  version: '1.0.0',
  author: '官方',
  description: '均衡型卡牌包，包含各种攻击和防御手段',
  portrait: '⚖️',
  compatible: [],
  cards: [
    // --- 攻击牌 ---
    { id: 'heavyStrike', name: '重击', cost: 2, type: 'attack', rarity: 'common', effect: { damage: 14 }, description: '造成14点伤害' },
    { id: 'heavyHit', name: '重拳', cost: 2, type: 'attack', rarity: 'common', effect: { damage: 10, draw: 1 }, description: '造成10点伤害，抽1张牌' },
    { id: 'consecutiveStrike', name: '连续打击', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 4, hits: 2 }, description: '造成4点伤害2次' },
    { id: 'painfulStrike', name: '痛击', cost: 2, type: 'attack', rarity: 'common', effect: { damage: 10, vulnerableChance: 0.4 }, description: '造成10点伤害，40%几率易伤' },
    { id: 'behead', name: '斩首', cost: 3, type: 'attack', rarity: 'common', effect: { damage: 15, execute: 0.2 }, description: '造成15点伤害，若敌人≤20血则斩杀' },

    // --- 技能牌 ---
    { id: 'harden', name: '硬撑', cost: 1, type: 'skill', rarity: 'common', archetype: 'ironclad', effect: { block: 8, draw: 1 }, description: '获得8点护甲，抽1张牌' },
    { id: 'ironWall', name: '铁壁', cost: 1, type: 'skill', rarity: 'common', archetype: 'ironclad', effect: { block: 12 }, description: '获得12点护甲' },
    { id: 'firstAid', name: '急救', cost: 2, type: 'skill', rarity: 'common', archetype: 'swift', effect: { block: 8, heal: 6 }, description: '获得8点护甲，治疗6点' },
    { id: 'warCry', name: '战吼', cost: 1, type: 'skill', rarity: 'common', effect: { nextAttackMult: 1.5 }, description: '下次攻击伤害+50%' },
    { id: 'focus', name: '集中', cost: 0, type: 'skill', rarity: 'common', effect: { strength: 2, draw: 2 }, description: '获得2层充能，抽2张牌' },

    // --- 能力牌 ---
    { id: 'counterStance', name: '反击姿态', cost: 1, type: 'power', rarity: 'common', effect: { thorns: 5 }, description: '回合结束时受到攻击时，反伤5点' },
    { id: 'spikeShell', name: '尖刺外壳', cost: 2, type: 'power', rarity: 'common', effect: { aoeDamage: 3 }, description: '回合结束时对所有敌人造成3点伤害' },

    // --- 状态牌 ---
    { id: 'vulnerable', name: '易伤', cost: 0, type: 'status', rarity: 'common', effect: { vulnerable: 1 }, description: '受到伤害+50%，持续2回合', duration: 2 },
    { id: 'weak', name: '虚弱', cost: 0, type: 'status', rarity: 'common', effect: { weak: 1 }, description: '攻击力-50%，持续2回合', duration: 2 },

    // --- 诅咒牌 ---
    { id: 'painCurse', name: '痛苦诅咒', cost: 0, type: 'curse', rarity: 'common', effect: { curseMaxHp: -3 }, description: '诅咒: 最大生命-3' },
    { id: 'weakCurse', name: '虚弱诅咒', cost: 0, type: 'curse', rarity: 'common', effect: { curseWeak: 2 }, description: '诅咒: 回合开始时攻击力-50%持续2回合' },
    { id: 'darkCurse', name: '黑暗诅咒', cost: 0, type: 'curse', rarity: 'common', effect: { curseEnergy: -1 }, description: '诅咒: 回合开始时能量-1' },
    { id: 'deathCurse', name: '死亡诅咒', cost: 0, type: 'curse', rarity: 'common', effect: { curseDamage: 5 }, description: '诅咒: 受到5点伤害' },

    // --- 特殊牌 ---
    { id: 'demonContract', name: '恶魔契约', cost: 0, type: 'special', archetype: ['inferno', 'vampire'], effect: { sacrificeHp: 10, gainEnergy: 3 }, description: '牺牲10HP获得3能量' },
    { id: 'lightningReflex', name: '闪电动作', cost: 1, type: 'special', archetype: 'swift', effect: { dodge: 1, draw: 1 }, description: '闪避下次攻击,抽1张' },
    { id: 'deadlyPrecision', name: '致命精准', cost: 2, type: 'special', archetype: ['toxic', 'swift'], effect: { nextCrit: 2 }, description: '下次攻击伤害x2' },
    { id: 'meditation', name: '冥想', cost: 0, type: 'special', archetype: 'swift', effect: { gainEnergy: 2, selfWeak: 2 }, description: '获得2能量,获得虚弱2回合' },
    { id: 'vampiricTouch', name: '吸血', cost: 2, type: 'special', archetype: ['toxic', 'vampire'], effect: { lifesteal: 0.5, damage: 8 }, description: '造成8点伤害,回复50%伤害的生命' },

    // --- 中毒流血状态牌 ---
    { id: 'status_poison', name: '中毒', cost: 0, type: 'status', rarity: 'common', effect: { poison: 3 }, description: '每回合3点伤害，持续3回合', duration: 3, stackable: true },
    { id: 'status_bleed', name: '流血', cost: 0, type: 'status', rarity: 'common', effect: { bleed: 2 }, description: '回合开始2点伤害，持续2回合', duration: 2, stackable: true },

    // --- V64 新增卡牌 ---
    // 火球术 - 造成8点伤害 + 2层灼烧
    { id: 'fireball', name: '火球术', cost: 2, type: 'attack', rarity: 'common', effect: { damage: 8, burnStacks: 2, burnDuration: 2 }, description: '造成8点伤害，施加2层灼烧' },
    // 淬毒匕首 - 造成4点伤害 + 2层中毒
    { id: 'poison_dagger', name: '淬毒匕首', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 4, poisonStacks: 2, poisonDuration: 3 }, description: '造成4点伤害，施加2层中毒' },
    // 横扫 - 造成8点伤害
    { id: 'cleave', name: '横扫', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 8 }, description: '造成8点伤害' },
    // 强化防御 - 获得12点护甲 + 1层力量
    { id: 'fortify', name: '强化防御', cost: 1, type: 'skill', rarity: 'common', effect: { block: 12, strength: 1 }, description: '获得12点护甲，获得1层力量' },
    // 创伤 - 造成3点伤害 + 1层虚弱
    { id: 'wound', name: '创伤', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 3, weakStacks: 1, weakDuration: 1 }, description: '造成3点伤害，施加1层虚弱' },
    // 治疗 - 恢复5点生命
    { id: 'heal', name: '治疗', cost: 1, type: 'skill', rarity: 'common', effect: { heal: 5 }, description: '恢复5点生命' },
  ],
  relics: [
    {
      id: 'bloodChalice',
      name: '鲜血圣杯',
      icon: '🏆',
      rarity: 'common',
      description: '每回合回复2点生命',
      effect: { perTurnHeal: 2 },
    },
    {
      id: 'leatherArmor',
      name: '皮甲',
      icon: '🛡',
      rarity: 'common',
      description: '战斗开始时获得5点护甲',
      effect: { startOfCombatBlock: 5 },
    },
    {
      id: 'attackCharm',
      name: '攻击护符',
      icon: '⚔️',
      rarity: 'common',
      description: '攻击伤害+3',
      effect: { damageBonus: 3 },
    },
  ],
  enemies: [],
  events: [],
};

// 主动注册到注册表
if (window.CardPackRegistry) {
  window.CardPackRegistry.register(window.CARD_PACKS['balanced']);
}