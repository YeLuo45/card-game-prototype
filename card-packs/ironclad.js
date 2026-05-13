// card-packs/ironclad.js - V60 铁甲流派包插件
// 铁甲战士职业卡，含高护甲和反击机制

window.CARD_PACKS = window.CARD_PACKS || {};
window.CARD_PACKS['ironclad'] = {
  id: 'ironclad',
  name: '铁甲流派包',
  version: '1.0.0',
  author: '官方',
  description: '铁甲战士职业卡牌包，包含高护甲、荆棘和反击机制',
  portrait: '🛡️',
  compatible: [],
  cards: [
    // --- 攻击牌 ---
    // 反射打击 - 造成伤害同时获得荆棘
    { id: 'reflectStrike', name: '反击打击', cost: 2, type: 'attack', rarity: 'rare', effect: { damage: 9, reflectGain: 4 }, description: '造成9点伤害，获得4点荆棘' },
    // 狂暴打击 - HP低时伤害增加
    { id: 'enrageStrike', name: '狂暴打击', cost: 2, type: 'attack', rarity: 'rare', effect: { damage: 8, enrageMult: 1.8 }, description: '造成8点伤害，若HP≤50%则伤害+80%' },

    // --- 技能牌 ---
    // 强化防御 - 获得大量护甲，下回合护甲+50%
    { id: 'fortifyDefense', name: '强化防御', cost: 2, type: 'skill', rarity: 'rare', archetype: 'ironclad', effect: { block: 15, fortifyBonus: true }, description: '获得15点护甲，下回合护甲+50%' },
    // 灼热护盾 - 护甲附带灼烧
    { id: 'burningShield', name: '灼热护盾', cost: 2, type: 'skill', rarity: 'rare', archetype: 'inferno', effect: { block: 10, burnReflect: 2 }, description: '获得10点护甲，受攻击时敌人受2层灼烧' },
    // 紧急护盾 - 获得等同于缺失生命的护甲
    { id: 'emergencyShield', name: '紧急护盾', cost: 1, type: 'skill', rarity: 'rare', archetype: 'ironclad', effect: { blockScaling: true }, description: '获得等同于缺失生命的护甲' },

    // --- 能力牌 ---
    // 激怒光环 - HP低时攻击增强
    { id: 'enrageAura', name: '激怒光环', cost: 2, type: 'power', rarity: 'rare', effect: { enrageAura: true, enrageThreshold: 0.5, enrageBonus: 0.5 }, description: 'HP≤50%时，攻击伤害+50%' },
    // 荆棘光环 - 受到攻击时反弹伤害
    { id: 'reflectAura', name: '荆棘光环', cost: 2, type: 'power', rarity: 'rare', effect: { reflectAura: 6 }, description: '受到攻击时反弹6点伤害' },
    // 钢化光环 - 每回合护甲增加
    { id: 'fortifyAura', name: '钢化光环', cost: 2, type: 'power', rarity: 'rare', archetype: 'ironclad', effect: { fortifyAura: 3, fortifyDuration: 99 }, description: '每回合开始获得3点护甲' },
    // 护甲灵魂 - 回合结束获得护甲和荆棘
    { id: 'armoredSoul', name: '护甲灵魂', cost: 1, type: 'power', rarity: 'rare', archetype: 'ironclad', effect: { thornsAura: 4, blockAura: 3 }, description: '回合结束获得3护甲和4点荆棘' },

    // --- 稀有攻击牌 ---
    // 斩杀打击
    { id: 'executeStrike', name: '斩杀打击', cost: 2, type: 'attack', rarity: 'rare', effect: { damage: 10, executeThreshold: 0.3 }, description: '造成10点伤害，若敌人≤30%血量则斩杀' },
    // 背水一战 - HP越低伤害越高
    { id: 'lastStandStrike', name: '背水一战', cost: 1, type: 'attack', rarity: 'rare', effect: { damage: 5, lastStandBonus: true }, description: '基础5点伤害，每损失10%HP+3伤害' },
    // 连环打击 - 伤害在敌人间传递
    { id: 'chainStrike', name: '连环打击', cost: 2, type: 'attack', rarity: 'rare', effect: { damage: 6, chainHits: 3, chainMult: 0.7 }, description: '造成6点伤害，70%连锁至下一敌人' },

    // --- 稀有技能牌 ---
    // 铁卫 - 获得护甲和荆棘
    { id: 'ironGuard', name: '铁卫', cost: 1, type: 'skill', rarity: 'rare', archetype: 'ironclad', effect: { block: 8, thorns: 3 }, description: '获得8点护甲和3点荆棘' },
    // 盾墙 - 大量护甲，下回合额外获得
    { id: 'shieldWall', name: '盾墙', cost: 2, type: 'skill', rarity: 'rare', archetype: 'ironclad', effect: { block: 18, nextTurnBlockBonus: 8 }, description: '获得18点护甲，下回合额外获得8点' },

    // === V67 Ironclad职业卡 (5张) ===
    // 铁壁 - 获得15护盾
    { id: 'ironWall2', name: '铁壁', cost: 2, type: 'skill', rarity: 'common', archetype: 'ironclad', effect: { block: 15 }, description: '获得15点护甲。' },
    // 血祭 - 失去3生命造成5伤害
    { id: 'bloodSacrifice', name: '血祭', cost: 1, type: 'attack', rarity: 'rare', archetype: 'ironclad', effect: { sacrificeHp: 3, damage: 5 }, description: '牺牲3点生命，造成5点伤害。' },
    // 战吼 - +1能量，抽1张牌
    { id: 'warCry2', name: '战吼', cost: 0, type: 'skill', rarity: 'common', effect: { gainEnergy: 1, draw: 1 }, description: '获得1能量，抽1张牌。' },
    // 狂暴 - 本回合+3攻击+1能量
    { id: 'berserk', name: '狂暴', cost: 2, type: 'attack', rarity: 'rare', archetype: 'ironclad', effect: { strength: 3, gainEnergy: 1 }, description: '本回合获得3层力量和1能量。' },
    // 不屈 - 获得20护盾
    { id: 'unbreakable', name: '不屈', cost: 3, type: 'skill', rarity: 'legendary', archetype: 'ironclad', effect: { block: 20 }, description: '获得20点护甲。' },
  ],
  relics: [
    {
      id: 'ironCore',
      name: '铁甲核心',
      icon: '⚙️',
      rarity: 'rare',
      description: '战斗开始时获得6点护甲',
      effect: { startOfCombatBlock: 6 },
    },
    {
      id: 'thornsArmor',
      name: '荆棘护甲',
      icon: '🌵',
      rarity: 'rare',
      description: '受到攻击时反弹3点伤害',
      effect: { reflectDamage: 3 },
    },
  ],
  enemies: [],
  events: [],
};

// 主动注册到注册表
if (window.CardPackRegistry) {
  window.CardPackRegistry.register(window.CARD_PACKS['ironclad']);
}