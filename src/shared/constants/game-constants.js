// ============================================================================
// shared/constants/game-constants.js — 游戏全局常量
// ============================================================================
'use strict';

var GameConstants = {
  // 稀有度
  RARITY: {
    COMMON:    'common',
    UNCOMMON:  'uncommon',
    RARE:      'rare',
    EPIC:      'epic',
    LEGENDARY: 'legendary'
  },

  // 元素属性
  ELEMENT: {
    FIRE:    'fire',
    WATER:   'water',
    EARTH:   'earth',
    WIND:    'wind',
    LIGHT:   'light',
    SHADOW:  'shadow',
    ARCANE:  'arcane',
    NATURE:  'nature'
  },

  // 战斗阶段
  PHASE: {
    DRAW:       'draw',
    MAIN:       'main',
    BATTLE:     'battle',
    END:        'end',
    TRIGGER:    'trigger'
  },

  // 卡牌类型
  CARD_TYPE: {
    CREATURE:  'creature',
    SPELL:     'spell',
    ARTIFACT:  'artifact',
    ENCHANT:   'enchant',
    TRAP:      'trap'
  },

  // 社交行为
  SOCIAL_ACTION: {
    CHALLENGE:  'challenge',
    TRADE:      'trade',
    GUILD_INVITE: 'guild_invite',
    FRIEND_ADD:  'friend_add'
  },

  // 默认数值
  DEFAULTS: {
    MAX_HAND_SIZE:      10,
    MAX_DECK_SIZE:      60,
    MIN_DECK_SIZE:      30,
    STARTING_HP:        30,
    STARTING_MANA:      3,
    MAX_MANA:           10,
    MAX_RUNE_SLOTS:     3,
    EVOLUTION_LEVELS:  5
  },

  // 存储 Keys
  STORAGE_KEYS: {
    PLAYER_DATA:    'player_data',
    DECK_DATA:      'deck_data',
    CARD_INVENTORY: 'card_inventory',
    ACHIEVEMENTS:   'achievements',
    SOCIAL_DATA:    'social_data',
    META_DATA:      'meta_data'
  },

  // 版本
  GAME_VERSION: '2.42.0'
};

module.exports = GameConstants;
window.GameConstants = GameConstants;