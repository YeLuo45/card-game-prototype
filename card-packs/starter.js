// card-packs/starter.js - V60 初始卡组插件
// 包含原10张基础卡：打击x5、防御x5

window.CARD_PACKS = window.CARD_PACKS || {};
window.CARD_PACKS['starter'] = {
  id: 'starter',
  name: '初始卡组',
  version: '1.0.0',
  author: '官方',
  description: '游戏初始卡组，包含基础攻击和防御卡牌',
  portrait: '🃏',
  compatible: [],
  cards: [
    { id: 'strike', name: '打击', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 6 }, description: '造成6点伤害' },
    { id: 'strike', name: '打击', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 6 }, description: '造成6点伤害' },
    { id: 'strike', name: '打击', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 6 }, description: '造成6点伤害' },
    { id: 'strike', name: '打击', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 6 }, description: '造成6点伤害' },
    { id: 'strike', name: '打击', cost: 1, type: 'attack', rarity: 'common', effect: { damage: 6 }, description: '造成6点伤害' },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'common', effect: { block: 5 }, description: '获得5点护甲' },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'common', effect: { block: 5 }, description: '获得5点护甲' },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'common', effect: { block: 5 }, description: '获得5点护甲' },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'common', effect: { block: 5 }, description: '获得5点护甲' },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'common', effect: { block: 5 }, description: '获得5点护甲' },
  ],
  relics: [
    {
      id: 'brokenChain',
      name: '断裂的锁链',
      icon: '⛓',
      rarity: 'starting',
      description: '战斗开始时获得1点能量',
      effect: { startOfCombatEnergy: 1 },
    },
  ],
  enemies: [],
  events: [],
};

// 主动注册到注册表
if (window.CardPackRegistry) {
  window.CardPackRegistry.register(window.CARD_PACKS['starter']);
}