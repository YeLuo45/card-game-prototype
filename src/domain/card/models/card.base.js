// ============================================================================
// domain/card/models/card.base.js — 卡牌基础模型
// 所有卡牌实体的基类，定义通用属性和接口
// ============================================================================
'use strict';

var GameConstants = require('../../shared/constants/game-constants');

/**
 * CardBase — 卡牌基类
 * 所有具体卡牌都继承此类
 */
function CardBase(cid, name, type) {
  this.cid       = cid;
  this.name      = name || 'Unknown Card';
  this.type      = type || GameConstants.CARD_TYPE.CREATURE;
  this.element   = GameConstants.ELEMENT.ARCANE;
  this.rarity    = GameConstants.RARITY.COMMON;
  this.level     = 1;
  this.maxLevel  = 5;
  this.attack    = 0;
  this.defense   = 0;
  this.cost      = 0;
  this.effects   = [];
  this.enchantments = [];
  this.isFaceUp = true;
  this.isToken   = false;
  this.isLocked  = false;
}

CardBase.prototype.getId    = function() { return this.cid; };
CardBase.prototype.getName  = function() { return this.name; };
CardBase.prototype.getType  = function() { return this.type; };
CardBase.prototype.getElement = function() { return this.element; };
CardBase.prototype.getRarity = function() { return this.rarity; };
CardBase.prototype.getLevel = function() { return this.level; };
CardBase.prototype.getMaxLevel = function() { return this.maxLevel; };
CardBase.prototype.getAttack = function() { return this.attack; };
CardBase.prototype.getDefense = function() { return this.defense; };
CardBase.prototype.getCost  = function() { return this.cost; };

/** 升级卡牌 */
CardBase.prototype.levelUp = function() {
  if (this.level >= this.maxLevel) {
    return { error: 'max_level_reached' };
  }
  this.level++;
  return { success: true, newLevel: this.level };
};

/** 翻转面朝上/下（仅战斗可用） */
CardBase.prototype.flip = function() {
  this.isFaceUp = !this.isFaceUp;
  return { success: true, isFaceUp: this.isFaceUp };
};

/** 添加效果 */
CardBase.prototype.addEffect = function(effect) {
  this.effects.push(effect);
  return { success: true };
};

/** 锁定（防止被操作） */
CardBase.prototype.lock = function() {
  this.isLocked = true;
  return { success: true };
};

CardBase.prototype.unlock = function() {
  this.isLocked = false;
  return { success: true };
};

/** 序列化（用于存储） */
CardBase.prototype.toJSON = function() {
  return {
    cid:          this.cid,
    name:         this.name,
    type:         this.type,
    element:      this.element,
    rarity:       this.rarity,
    level:         this.level,
    maxLevel:      this.maxLevel,
    attack:        this.attack,
    defense:       this.defense,
    cost:          this.cost,
    effects:       this.effects,
    enchantments:  this.enchantments,
    isFaceUp:      this.isFaceUp,
    isToken:       this.isToken,
    isLocked:      this.isLocked
  };
};

/** 反序列化（从存储恢复） */
CardBase.fromJSON = function(data) {
  var card = new CardBase(data.cid, data.name, data.type);
  card.element      = data.element;
  card.rarity      = data.rarity;
  card.level       = data.level;
  card.maxLevel    = data.maxLevel;
  card.attack      = data.attack;
  card.defense     = data.defense;
  card.cost        = data.cost;
  card.effects     = data.effects || [];
  card.enchantments= data.enchantments || [];
  card.isFaceUp    = data.isFaceUp !== undefined ? data.isFaceUp : true;
  card.isToken    = data.isToken || false;
  card.isLocked    = data.isLocked || false;
  return card;
};

module.exports = CardBase;
window.CardBase = CardBase;