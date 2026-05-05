// ==========================================
// Card Game Prototype - DBG (Slay the Slime)
// V53: 天赋石+状态系统+意图预测
// ==========================================

// --- Card Definitions ---
const CARD_TYPES = { ATTACK: 'attack', SKILL: 'skill', POWER: 'power' };

// 等级升级倍率表
const LEVEL_MULTIPLIERS = {
  1: 1.00,  2: 1.15,  3: 1.30,  4: 1.50,  5: 1.75
};

// 等级升级费用（同名卡数量）
const LEVEL_UP_COSTS = [0, 2, 3, 5, 8];
// 星级升级费用
const STAR_UP_COSTS = { 2: 3, 3: 5 };

// instanceId计数器
let nextInstanceId = 1;

// ========== V53: 天赋石系统 ==========
const TALENT_TYPES = {
  FIERY: 'fiery',      // 炽焰: 攻击时附加灼烧
  FROST: 'frost',      // 寒霜: 攻击时可能冻结
  THUNDER: 'thunder',  // 雷霆: 麻痹敌人
  POISON: 'poison',    // 剧毒: 持续中毒
  PIERCE: 'pierce',    // 护穿: 无视护甲
  LIFESTEAL: 'lifesteal', // 吸血: 攻击回血
  SWIFT: 'swift',      // 疾风: 抽卡加速
  FORTIFY: 'fortify',  // 坚韧: 额外护甲
  RAGE: 'rage',        // 狂暴: 攻击加成
  LUCKY: 'lucky'       // 幸运: 暴击/额外奖励
};

const TALENT_INFO = {
  [TALENT_TYPES.FIERY]:   { name: '炽焰', color: '#ff4500', icon: '🔥', desc: '攻击附加灼烧' },
  [TALENT_TYPES.FROST]:   { name: '寒霜', color: '#00bfff', icon: '❄️', desc: '攻击可能冻结' },
  [TALENT_TYPES.THUNDER]:  { name: '雷霆', color: '#ffff00', icon: '⚡', desc: '攻击附加麻痹' },
  [TALENT_TYPES.POISON]:   { name: '剧毒', color: '#32cd32', icon: '☠️', desc: '持续造成中毒' },
  [TALENT_TYPES.PIERCE]:   { name: '护穿', color: '#c0c0c0', icon: '🗡️', desc: '无视护甲伤害' },
  [TALENT_TYPES.LIFESTEAL]:{ name: '吸血', color: '#dc143c', icon: '🩸', desc: '攻击回复生命' },
  [TALENT_TYPES.SWIFT]:   { name: '疾风', color: '#00fa9a', icon: '💨', desc: '额外抽牌' },
  [TALENT_TYPES.FORTIFY]: { name: '坚韧', color: '#daa520', icon: '🛡️', desc: '回合结束护甲' },
  [TALENT_TYPES.RAGE]:    { name: '狂暴', color: '#ff6347', icon: '😈', desc: '攻击伤害提升' },
  [TALENT_TYPES.LUCKY]:   { name: '幸运', color: '#ffd700', icon: '🎰', desc: '额外奖励机会' }
};

// 天赋石背包
const talentInventory = {
  [TALENT_TYPES.FIERY]: 2,
  [TALENT_TYPES.FROST]: 1,
  [TALENT_TYPES.THUNDER]: 1,
  [TALENT_TYPES.POISON]: 2,
  [TALENT_TYPES.PIERCE]: 1,
  [TALENT_TYPES.LIFESTEAL]: 1,
  [TALENT_TYPES.SWIFT]: 2,
  [TALENT_TYPES.FORTIFY]: 1,
  [TALENT_TYPES.RAGE]: 2,
  [TALENT_TYPES.LUCKY]: 1
};

// ========== V53: 状态系统 ==========
const STATUS_TYPES = {
  BURNING: 'burning',       // 灼烧
  POISONED: 'poisoned',    // 中毒
  FROZEN: 'frozen',        // 冻结
  PARALYZED: 'paralyzed',  // 麻痹
  VULNERABLE: 'vulnerable', // 易伤
  WEAKENED: 'weakened',     // 虚弱
  SHIELDED: 'shielded',    // 护盾强化
  REGENERATING: 'regenerating' // 再生
};

const STATUS_INFO = {
  [STATUS_TYPES.BURNING]:      { name: '灼烧', color: '#ff4500', icon: '🔥', desc: '每回合损失HP' },
  [STATUS_TYPES.POISONED]:     { name: '中毒', color: '#32cd32', icon: '☠️', desc: '持续伤害' },
  [STATUS_TYPES.FROZEN]:       { name: '冻结', color: '#00bfff', icon: '❄️', desc: '无法行动' },
  [STATUS_TYPES.PARALYZED]:    { name: '麻痹', color: '#ffff00', icon: '⚡', desc: '减少行动' },
  [STATUS_TYPES.VULNERABLE]:   { name: '易伤', color: '#ff6347', icon: '💔', desc: '受伤增加' },
  [STATUS_TYPES.WEAKENED]:     { name: '虚弱', color: '#808080', icon: '😵', desc: '攻击减弱' },
  [STATUS_TYPES.SHIELDED]:     { name: '护盾', color: '#daa520', icon: '🛡️', desc: '额外护甲' },
  [STATUS_TYPES.REGENERATING]:{ name: '再生', color: '#ff69b4', icon: '💖', desc: '回合回血' }
};

// ========== V53: 意图预测系统 ==========
// 敌人未来意图队列
let enemyIntentQueue = []; // 存储未来几回合的意图

function rollEnemyIntent() {
  const roll = Math.random();
  if (roll < 0.70) {
    return { intent: INTENTS.ATTACK, intentValue: 8 + Math.floor(Math.random() * 6) };
  } else if (roll < 0.90) {
    return { intent: INTENTS.DEFEND, intentValue: 6 + Math.floor(Math.random() * 4) };
  } else {
    return { intent: INTENTS.BUFF, intentValue: 2 + Math.floor(Math.random() * 2) };
  }
}

function initEnemyIntentQueue() {
  enemyIntentQueue = [];
  // 预生成接下来3回合的意图
  for (let i = 0; i < 3; i++) {
    enemyIntentQueue.push(rollEnemyIntent());
  }
}

function updateEnemyIntentQueue() {
  // 移除当前意图，添加新的
  if (enemyIntentQueue.length > 0) {
    enemyIntentQueue.shift();
  }
  enemyIntentQueue.push(rollEnemyIntent());
}

function getPredictedIntents(count = 2) {
  // 返回接下来count回合的意图预测
  return enemyIntentQueue.slice(0, count);
}

// 创建带升级系统的卡牌模板
function createCard(name, cost, type, value, description, maxLevel = 5, maxStar = 3, starEffects = [], talent = null) {
  return {
    name, cost, type, value, description,
    maxLevel, maxStar, starEffects,
    baseValue: value, baseCost: cost,
    talent: talent  // V53: 天赋石装备槽
  };
}

// 创建卡牌实例
function createCardInstance(template) {
  return {
    instanceId: nextInstanceId++,
    name: template.name,
    cost: template.cost,
    type: template.type,
    value: template.value,
    description: template.description,
    level: 1, star: 1,
    maxLevel: template.maxLevel,
    maxStar: template.maxStar,
    starEffects: [...template.starEffects],
    baseValue: template.baseValue,
    baseCost: template.baseCost,
    templateId: template.name,
    talent: template.talent ? { ...template.talent } : null  // V53: 复制天赋
  };
}

// 计算卡牌实际效果值
function getCardValue(instance) {
  const multiplier = LEVEL_MULTIPLIERS[instance.level] || 1.0;
  let value = Math.floor(instance.baseValue * multiplier);
  
  // V53: 狂暴天赋加成
  if (instance.talent === TALENT_TYPES.RAGE) {
    value = Math.floor(value * 1.2);
  }
  return value;
}

function getCardCost(instance) {
  if (instance.level >= 2) {
    const reduction = instance.level - 1;
    return Math.max(0, instance.baseCost - reduction);
  }
  return instance.baseCost;
}

function canLevelUp(instance, deck) {
  if (instance.level >= instance.maxLevel) return { can: false, reason: '已达最高等级' };
  const cost = LEVEL_UP_COSTS[instance.level];
  const sameNameCount = deck.filter(c => c.name === instance.name && c.instanceId !== instance.instanceId).length;
  if (sameNameCount < cost) return { can: false, reason: `需要${cost}张同名卡，当前${sameNameCount}张` };
  return { can: true, cost };
}

function performLevelUp(instance, deck) {
  const check = canLevelUp(instance, deck);
  if (!check.can) return false;
  let removed = 0;
  for (let i = deck.length - 1; i >= 0 && removed < check.cost; i--) {
    if (deck[i].name === instance.name && deck[i].instanceId !== instance.instanceId) {
      deck.splice(i, 1); removed++;
    }
  }
  instance.level++;
  instance.value = getCardValue(instance);
  instance.cost = getCardCost(instance);
  return true;
}

function canStarUp(instance, deck) {
  if (instance.star >= instance.maxStar) return { can: false, reason: '已达最高星级' };
  const cost = STAR_UP_COSTS[instance.star + 1];
  const sameNameCount = deck.filter(c => c.name === instance.name && c.instanceId !== instance.instanceId).length;
  if (sameNameCount < cost) return { can: false, reason: `需要${cost}张同名卡` };
  return { can: true, cost };
}

function performStarUp(instance, deck) {
  const check = canStarUp(instance, deck);
  if (!check.can) return false;
  let removed = 0;
  for (let i = deck.length - 1; i >= 0 && removed < check.cost; i--) {
    if (deck[i].name === instance.name && deck[i].instanceId !== instance.instanceId) {
      deck.splice(i, 1); removed++;
    }
  }
  instance.star++;
  return true;
}

function getStarDisplay(star, maxStar) {
  return '★'.repeat(star) + '☆'.repeat(maxStar - star);
}

function getLevelBorderColor(level) {
  const colors = { 0: '#555', 1: '#2ecc71', 2: '#3498db', 3: '#9b59b6', 4: '#e74c3c', 5: '#f39c12' };
  return colors[level] || colors[0];
}

const STARTING_DECK_TEMPLATES = [
  createCard('Strike', 1, CARD_TYPES.ATTACK, 6, 'Deal 6 damage', 5, 3, [], TALENT_TYPES.FIERY),
  createCard('Defend', 1, CARD_TYPES.SKILL, 5, 'Gain 5 block', 5, 3, [], TALENT_TYPES.FORTIFY),
  createCard('Heavy Strike', 2, CARD_TYPES.ATTACK, 12, 'Deal 12 damage', 5, 3, [], TALENT_TYPES.RAGE),
  createCard('Bash', 2, CARD_TYPES.ATTACK, 8, 'Deal 8 damage. Apply Vulnerable', 5, 3, [], TALENT_TYPES.THUNDER),
  createCard('Shrug It Off', 1, CARD_TYPES.SKILL, 8, 'Gain 8 block. Draw 1', 5, 3, [], TALENT_TYPES.SWIFT),
];

// --- Game State ---
const state = {
  phase: 'idle',
  player: { hp: 80, maxHp: 80, block: 0, energy: 3, maxEnergy: 3 },
  enemy: { hp: 50, maxHp: 50, block: 0, intent: null, intentValue: 0 },
  playerStatus: {},   // V53: 玩家状态
  enemyStatus: {},    // V53: 敌人状态
  drawPile: [],
  discardPile: [],
  hand: [],
  turn: 0,
  playerDeck: [],
};

// --- Utility ---
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showMessage(text, duration = 1500) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// --- Deck Operations ---
function initializeDeck() {
  state.playerDeck = [
    ...Array(5).fill(null).map(() => createCardInstance(STARTING_DECK_TEMPLATES[0])),
    ...Array(5).fill(null).map(() => createCardInstance(STARTING_DECK_TEMPLATES[1])),
    createCardInstance(STARTING_DECK_TEMPLATES[2]),
    createCardInstance(STARTING_DECK_TEMPLATES[3]),
    createCardInstance(STARTING_DECK_TEMPLATES[4]),
  ];
  state.drawPile = shuffle([...state.playerDeck]);
  state.discardPile = [];
  state.hand = [];
}

function drawCards(n = 5) {
  for (let i = 0; i < n; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break;
      state.drawPile = shuffle([...state.discardPile]);
      state.discardPile = [];
    }
    if (state.drawPile.length > 0) {
      state.hand.push(state.drawPile.pop());
    }
  }
  // V53: 疾风天赋额外抽牌
  checkSwiftTalentDraw();
  renderHand();
  updateDeckInfo();
}

function checkSwiftTalentDraw() {
  const swiftCount = state.hand.filter(c => c.talent === TALENT_TYPES.SWIFT).length;
  for (let i = 0; i < swiftCount; i++) {
    if (state.drawPile.length > 0) {
      state.hand.push(state.drawPile.pop());
      showMessage('疾风天赋额外抽牌!', 800);
    }
  }
}

function discardHand() {
  state.discardPile.push(...state.hand);
  state.hand = [];
  renderHand();
  updateDeckInfo();
}

// --- Enemy AI ---
const INTENTS = { ATTACK: 'attack', DEFEND: 'defend', BUFF: 'buff' };

function rollEnemyIntent() {
  const roll = Math.random();
  if (roll < 0.70) {
    state.enemy.intent = INTENTS.ATTACK;
    state.enemy.intentValue = 8 + Math.floor(Math.random() * 6);
  } else if (roll < 0.90) {
    state.enemy.intent = INTENTS.DEFEND;
    state.enemy.intentValue = 6 + Math.floor(Math.random() * 4);
  } else {
    state.enemy.intent = INTENTS.BUFF;
    state.enemy.intentValue = 2 + Math.floor(Math.random() * 2);
  }
}

function executeEnemyIntent() {
  const { intent, intentValue } = state.enemy;
  if (intent === INTENTS.ATTACK) {
    let dmg = intentValue;
    // V53: 虚弱状态
    if (state.enemyStatus[STATUS_TYPES.WEAKENED]) {
      dmg = Math.floor(dmg * 0.75);
    }
    // V53: 易伤状态(玩家受到的伤害增加)
    if (state.playerStatus[STATUS_TYPES.VULNERABLE]) {
      dmg = Math.floor(dmg * 1.5);
    }
    const actualDmg = Math.max(0, dmg - state.player.block);
    state.player.hp = Math.max(0, state.player.hp - actualDmg);
    state.player.block = 0;
    showMessage(`Enemy attacks for ${dmg}! (${actualDmg} pierces block)`);
  } else if (intent === INTENTS.DEFEND) {
    state.enemy.block += intentValue;
    showMessage(`Enemy gains ${intentValue} block!`);
  } else if (intent === INTENTS.BUFF) {
    state.enemy.intentValue += intentValue;
    showMessage(`Enemy grows stronger! +${intentValue} power`);
  }
  // V53: 护盾强化状态
  if (state.enemyStatus[STATUS_TYPES.SHIELDED]) {
    state.enemy.block += 3;
  }
  updateUI();
}

// ========== V53: 状态系统 ==========
function applyStatus(target, statusType, stacks = 1) {
  if (target === 'enemy') {
    state.enemyStatus[statusType] = (state.enemyStatus[statusType] || 0) + stacks;
  } else {
    state.playerStatus[statusType] = (state.playerStatus[statusType] || 0) + stacks;
  }
}

function processStatusEffects() {
  // 玩家状态效果
  if (state.playerStatus[STATUS_TYPES.BURNING]) {
    const dmg = state.playerStatus[STATUS_TYPES.BURNING];
    state.player.hp = Math.max(0, state.player.hp - dmg);
    showMessage(`灼烧造成 ${dmg} 伤害!`, 800);
  }
  if (state.playerStatus[STATUS_TYPES.POISONED]) {
    const dmg = state.playerStatus[STATUS_TYPES.POISONED];
    state.player.hp = Math.max(0, state.player.hp - dmg);
    showMessage(`中毒造成 ${dmg} 伤害!`, 800);
  }
  if (state.playerStatus[STATUS_TYPES.REGENERATING]) {
    const heal = state.playerStatus[STATUS_TYPES.REGENERATING];
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    showMessage(`再生回复 ${heal} HP!`, 800);
  }
  if (state.playerStatus[STATUS_TYPES.FROZEN]) {
    showMessage('被冻结了! 无法行动!', 800);
    return false; // 冻结时跳过回合
  }
  if (state.playerStatus[STATUS_TYPES.PARALYZED]) {
    state.player.energy = Math.max(1, state.player.energy - 1);
    showMessage('麻痹减少了能量!', 800);
  }
  // 回合结束时坚韧护甲
  if (state.playerStatus[STATUS_TYPES.FORTIFY]) {
    // 这个在回合结束时应用
  }
  
  // 敌人状态效果
  if (state.enemyStatus[STATUS_TYPES.BURNING]) {
    const dmg = state.enemyStatus[STATUS_TYPES.BURNING];
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    showMessage(`敌人灼烧受到 ${dmg} 伤害!`, 800);
  }
  if (state.enemyStatus[STATUS_TYPES.POISONED]) {
    const dmg = state.enemyStatus[STATUS_TYPES.POISONED];
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    showMessage(`敌人中毒受到 ${dmg} 伤害!`, 800);
  }
  if (state.enemyStatus[STATUS_TYPES.REGENERATING]) {
    const heal = state.enemyStatus[STATUS_TYPES.REGENERATING];
    state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + heal);
    showMessage(`敌人再生回复 ${heal} HP!`, 800);
  }
  
  // 消耗状态
  decayStatus(state.playerStatus);
  decayStatus(state.enemyStatus);
  
  return true;
}

function decayStatus(statusObj) {
  for (const key in statusObj) {
    // 冻结和麻痹不自动减少
    if (key !== STATUS_TYPES.FROZEN && key !== STATUS_TYPES.PARALYZED) {
      // 状态持续回合-1 (简化处理，每回合减1)
    }
  }
}

function clearStatus(target) {
  if (target === 'enemy') {
    state.enemyStatus = {};
  } else {
    state.playerStatus = {};
  }
}

// --- Battle Flow ---
function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  state.player = { hp: 80, maxHp: 80, block: 0, energy: 3, maxEnergy: 3 };
  state.enemy = { hp: 50, maxHp: 50, block: 0, intent: null, intentValue: 0 };
  state.playerStatus = {};
  state.enemyStatus = {};
  state.turn = 0;
  initializeDeck();
  initEnemyIntentQueue(); // V53: 初始化意图预测队列
  startPlayerTurn();
}

function startPlayerTurn() {
  state.phase = 'player_turn';
  state.turn++;
  state.player.energy = state.player.maxEnergy;
  state.player.block = 0;
  
  // V53: 回合开始时处理状态
  if (state.playerStatus[STATUS_TYPES.FROZEN] && state.playerStatus[STATUS_TYPES.FROZEN] > 0) {
    state.playerStatus[STATUS_TYPES.FROZEN]--;
    if (state.playerStatus[STATUS_TYPES.FROZEN] > 0) {
      showMessage('你被冻结了! 跳过回合!', 1000);
      setTimeout(() => endTurn(), 1000);
      return;
    }
  }
  
  rollEnemyIntent();
  updateEnemyIntentQueue(); // V53: 更新意图预测
  drawCards(5);
  updateUI();
  updateIntentPrediction(); // V53: 更新意图预测显示
  document.getElementById('end-turn-btn').disabled = false;
  document.getElementById('intent-label').textContent = `Turn ${state.turn} - Your Turn`;
}

function endTurn() {
  if (state.phase !== 'player_turn') return;
  
  // V53: 回合结束处理状态
  processStatusEffects();
  
  // V53: 坚韧天赋 - 回合结束护甲
  const fortifyCount = state.hand.filter(c => c.talent === TALENT_TYPES.FORTIFY).length;
  if (fortifyCount > 0) {
    state.player.block += fortifyCount * 3;
    showMessage(`坚韧天赋提供 ${fortifyCount * 3} 护甲!`, 800);
  }
  
  document.getElementById('end-turn-btn').disabled = true;
  discardHand();
  state.phase = 'enemy_turn';
  document.getElementById('intent-label').textContent = 'Enemy Turn...';

  setTimeout(() => {
    executeEnemyIntent();
    if (state.player.hp <= 0) {
      endBattle(false);
      return;
    }
    setTimeout(() => startPlayerTurn(), 800);
  }, 600);
}

function playCard(index) {
  if (state.phase !== 'player_turn') return;
  const card = state.hand[index];
  if (!card) return;
  if (state.player.energy < card.cost) {
    showMessage('Not enough energy!');
    return;
  }

  state.player.energy -= card.cost;
  state.hand.splice(index, 1);
  state.discardPile.push(card);

  // V53: 处理天赋石效果
  if (card.talent) {
    applyTalentEffect(card.talent, card);
  }

  // Apply card effect
  if (card.type === CARD_TYPES.ATTACK) {
    let dmg = card.value;
    
    // V53: 虚弱状态(敌人攻击减弱)
    if (state.enemyStatus[STATUS_TYPES.WEAKENED]) {
      dmg = Math.floor(dmg * 0.75);
    }
    // V53: 护穿天赋
    if (card.talent === TALENT_TYPES.PIERCE) {
      state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
      showMessage(`${card.name} 无视护甲造成 ${dmg} 伤害!`);
    } else {
      const actualDmg = Math.max(0, dmg - state.enemy.block);
      state.enemy.hp = Math.max(0, state.enemy.hp - actualDmg);
      state.enemy.block = 0;
      showMessage(`${card.name} deals ${actualDmg} damage!`);
    }
    
    // V53: 灼烧天赋
    if (card.talent === TALENT_TYPES.FIERY) {
      applyStatus('enemy', STATUS_TYPES.BURNING, 2);
      showMessage('附加灼烧效果!', 800);
    }
    // V53: 雷霆天赋
    if (card.talent === TALENT_TYPES.THUNDER) {
      applyStatus('enemy', STATUS_TYPES.PARALYZED, 1);
      showMessage('附加麻痹效果!', 800);
    }
    // V53: 寒霜天赋
    if (card.talent === TALENT_TYPES.FROST) {
      if (Math.random() < 0.3) {
        applyStatus('enemy', STATUS_TYPES.FROZEN, 1);
        showMessage('冻结敌人!', 800);
      }
    }
    // V53: 吸血天赋
    if (card.talent === TALENT_TYPES.LIFESTEAL) {
      const heal = Math.floor(dmg * 0.2);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      showMessage(`吸血回复 ${heal} HP!`, 800);
    }
    // V53: 狂暴天赋 (已在getCardValue处理)
    
  } else if (card.type === CARD_TYPES.SKILL) {
    state.player.block += card.value;
    if (card.name === 'Shrug It Off') {
      if (state.drawPile.length > 0) state.hand.push(state.drawPile.pop());
    }
    showMessage(`Gained ${card.value} block!`);
  }

  renderHand();
  updateUI();
  updateDeckInfo();
  updateStatusDisplay();

  if (state.enemy.hp <= 0) {
    // V53: 幸运天赋检查
    checkLuckyTalent();
    endBattle(true);
  }
}

function applyTalentEffect(talent, card) {
  switch (talent) {
    case TALENT_TYPES.POISON:
      // 剧毒在攻击时附加
      if (card.type === CARD_TYPES.ATTACK) {
        applyStatus('enemy', STATUS_TYPES.POISONED, 3);
      }
      break;
  }
}

function checkLuckyTalent() {
  const luckyCount = state.hand.filter(c => c.talent === TALENT_TYPES.LUCKY).length + 
                     state.playerDeck.filter(c => c.talent === TALENT_TYPES.LUCKY).length;
  if (luckyCount > 0 && Math.random() < 0.3 * luckyCount) {
    showMessage('幸运天赋触发! 额外奖励!', 1000);
    // 额外抽牌或回复
    if (state.drawPile.length > 0) {
      state.hand.push(state.drawPile.pop());
    }
  }
}

function endBattle(victory) {
  state.phase = victory ? 'victory' : 'defeat';
  document.getElementById('end-turn-btn').disabled = true;
  document.getElementById('intent-label').textContent = victory ? 'Victory!' : 'Defeat!';
  showMessage(victory ? 'Victory! Slime defeated!' : 'Defeat! You died...', 3000);

  setTimeout(() => {
    document.getElementById('start-screen').style.display = 'flex';
    const btn = document.querySelector('.start-screen .btn');
    btn.textContent = 'Play Again';
  }, 1500);
}

// --- UI Rendering ---
function renderHand() {
  const container = document.getElementById('hand-area');
  container.innerHTML = '';
  state.hand.forEach((card, i) => {
    const el = document.createElement('div');
    const borderColor = getLevelBorderColor(card.level);
    el.className = `card ${card.type}`;
    el.style.borderColor = borderColor;
    el.style.borderWidth = card.star > 1 ? `${2 + card.star}px` : '2px';
    
    const starDisplay = getStarDisplay(card.star, card.maxStar);
    const levelDisplay = card.level > 1 ? `<div class="card-level">Lv.${card.level}</div>` : '';
    
    // V53: 天赋石图标
    let talentHtml = '';
    if (card.talent) {
      const t = TALENT_INFO[card.talent];
      talentHtml = `<div class="card-talent" style="color:${t.color}" title="${t.name}: ${t.desc}">${t.icon}</div>`;
    }
    
    el.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-stars">${starDisplay}</div>
      ${levelDisplay}
      ${talentHtml}
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.type}</div>
      <div class="card-effect">${card.description}</div>
    `;
    el.onclick = () => playCard(i);
    container.appendChild(el);
  });
  updateStatusDisplay();
}

function updateUI() {
  const { player, enemy } = state;
  document.getElementById('player-hp-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('player-hp-text').textContent = `${player.hp}/${player.maxHp}`;
  document.getElementById('player-block').textContent = `Block: ${player.block}`;
  document.getElementById('energy-display').textContent = `${player.energy}/${player.maxEnergy}`;
  document.getElementById('enemy-hp-fill').style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
  document.getElementById('enemy-hp-text').textContent = `${enemy.hp}/${enemy.maxHp}`;
  const intentStr = enemy.intent === INTENTS.ATTACK ? `Attack ${enemy.intentValue}`
    : enemy.intent === INTENTS.DEFEND ? `Defend ${enemy.intentValue}`
    : `Buff +${enemy.intentValue}`;
  document.getElementById('enemy-intent').textContent = enemy.intent ? intentStr : '???';
  
  updateStatusDisplay();
  updateIntentPrediction();
}

// V53: 更新意图预测显示
function updateIntentPrediction() {
  const container = document.getElementById('intent-prediction');
  if (!container) return;
  
  const predicted = getPredictedIntents(2);
  container.innerHTML = '<div class="intent-pred-title">下回合预测:</div>';
  
  predicted.forEach((p, i) => {
    const intentStr = p.intent === INTENTS.ATTACK ? `⚔️ 攻击 ${p.intentValue}`
      : p.intent === INTENTS.DEFEND ? `🛡️ 防御 ${p.intentValue}`
      : `⬆️ 强化 +${p.intentValue}`;
    const el = document.createElement('div');
    el.className = 'intent-pred-item';
    el.textContent = `${i + 1}. ${intentStr}`;
    container.appendChild(el);
  });
}

// V53: 更新状态图标显示
function updateStatusDisplay() {
  // 玩家状态
  const playerStatusEl = document.getElementById('player-status-icons');
  if (playerStatusEl) {
    playerStatusEl.innerHTML = '';
    for (const [status, stacks] of Object.entries(state.playerStatus)) {
      if (stacks > 0) {
        const info = STATUS_INFO[status];
        const el = document.createElement('div');
        el.className = `status-icon`;
        el.style.background = info.color;
        el.innerHTML = `${info.icon}<span class="status-stacks">${stacks}</span>`;
        el.title = `${info.name}: ${info.desc}`;
        playerStatusEl.appendChild(el);
      }
    }
  }
  
  // 敌人状态
  const enemyStatusEl = document.getElementById('enemy-status-icons');
  if (enemyStatusEl) {
    enemyStatusEl.innerHTML = '';
    for (const [status, stacks] of Object.entries(state.enemyStatus)) {
      if (stacks > 0) {
        const info = STATUS_INFO[status];
        const el = document.createElement('div');
        el.className = `status-icon`;
        el.style.background = info.color;
        el.innerHTML = `${info.icon}<span class="status-stacks">${stacks}</span>`;
        el.title = `${info.name}: ${info.desc}`;
        enemyStatusEl.appendChild(el);
      }
    }
  }
}

function updateDeckInfo() {
  document.getElementById('deck-info').textContent = `Draw: ${state.drawPile.length} | Discard: ${state.discardPile.length}`;
}

// --- Card Upgrade System (Level & Star) ---
function openUpgradePanel(cardIndex) {
  const card = state.hand[cardIndex];
  if (!card) return;
  
  const overlay = document.getElementById('upgrade-panel-overlay');
  if (!overlay) return;
  
  const container = document.getElementById('upgrade-panel-cards');
  container.innerHTML = '';
  
  const levelCheck = canLevelUp(card, state.playerDeck);
  const starCheck = canStarUp(card, state.playerDeck);
  
  const cardEl = document.createElement('div');
  cardEl.className = `upgrade-panel-card ${card.type}`;
  cardEl.style.borderColor = getLevelBorderColor(card.level);
  
  // V53: 天赋显示
  let talentHtml = '';
  if (card.talent) {
    const t = TALENT_INFO[card.talent];
    talentHtml = `<div class="upgrade-talent" style="color:${t.color}">${t.icon} ${t.name}</div>`;
  }
  
  cardEl.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-stars">${getStarDisplay(card.star, card.maxStar)}</div>
    <div class="card-level">Lv.${card.level}</div>
    ${talentHtml}
    <div class="card-name">${card.name}</div>
    <div class="card-type">${card.type}</div>
    <div class="card-effect">${card.description}</div>
  `;
  
  const levelBtn = document.createElement('button');
  levelBtn.className = 'upgrade-action-btn';
  levelBtn.style.marginRight = '10px';
  if (levelCheck.can) {
    levelBtn.textContent = `等级升级 (消耗${levelCheck.cost}张同名卡)`;
    levelBtn.onclick = () => {
      if (performLevelUp(card, state.playerDeck)) {
        showMessage(`升级成功！${card.name}现在是Lv.${card.level}`);
        closeUpgradePanel();
        renderHand();
      }
    };
  } else {
    levelBtn.textContent = levelCheck.reason;
    levelBtn.disabled = true;
  }
  
  const starBtn = document.createElement('button');
  starBtn.className = 'upgrade-action-btn';
  if (starCheck.can) {
    starBtn.textContent = `星级升级 (消耗${starCheck.cost}张同名卡)`;
    starBtn.onclick = () => {
      if (performStarUp(card, state.playerDeck)) {
        showMessage(`升星成功！${card.name}现在是${getStarDisplay(card.star, card.maxStar)}`);
        closeUpgradePanel();
        renderHand();
      }
    };
  } else {
    starBtn.textContent = starCheck.reason;
    starBtn.disabled = true;
  }
  
  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.marginTop = '15px';
  btnContainer.appendChild(levelBtn);
  btnContainer.appendChild(starBtn);
  
  const infoDiv = document.createElement('div');
  infoDiv.style.textAlign = 'center';
  infoDiv.style.marginTop = '10px';
  infoDiv.style.color = '#aaa';
  infoDiv.style.fontSize = '12px';
  
  const sameNameCount = state.playerDeck.filter(c => c.name === card.name && c.instanceId !== card.instanceId).length;
  infoDiv.textContent = `当前同名卡数量: ${sameNameCount}张 | 等级: ${card.level}/${card.maxLevel} | 星级: ${card.star}/${card.maxStar}`;
  
  cardEl.appendChild(btnContainer);
  cardEl.appendChild(infoDiv);
  container.appendChild(cardEl);
  
  overlay.classList.add('show');
}

function closeUpgradePanel() {
  const overlay = document.getElementById('upgrade-panel-overlay');
  if (overlay) overlay.classList.remove('show');
}

function openDeckManagement() {
  const overlay = document.getElementById('deck-management-overlay');
  if (!overlay) return;
  
  const container = document.getElementById('deck-management-cards');
  container.innerHTML = '';
  
  state.playerDeck.forEach((card, index) => {
    const levelCheck = canLevelUp(card, state.playerDeck);
    const starCheck = canStarUp(card, state.playerDeck);
    const canLevel = levelCheck.can;
    const canStar = starCheck.can;
    
    const cardEl = document.createElement('div');
    cardEl.className = `management-card ${card.type}`;
    if (!canLevel && !canStar) {
      cardEl.style.opacity = '0.7';
    }
    
    cardEl.style.borderColor = getLevelBorderColor(card.level);
    cardEl.style.borderWidth = card.star > 1 ? `${2 + card.star}px` : '2px';
    
    const upgradeDots = Array(card.maxLevel).fill(0).map((_, i) => 
      `<div class="upgrade-dot ${i < card.level ? 'filled' : ''}"></div>`
    ).join('');
    
    // V53: 天赋显示
    let talentHtml = '';
    if (card.talent) {
      const t = TALENT_INFO[card.talent];
      talentHtml = `<div class="card-talent" style="color:${t.color}">${t.icon} ${t.name}</div>`;
    }
    
    cardEl.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-stars">${getStarDisplay(card.star, card.maxStar)}</div>
      ${talentHtml}
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.type}</div>
      <div class="card-effect">${card.description}</div>
      <div class="upgrade-level">${upgradeDots}</div>
      <div class="card-info">同名卡: ${state.playerDeck.filter(c => c.name === card.name).length}张</div>
    `;
    
    if (canLevel || canStar) {
      cardEl.style.cursor = 'pointer';
      cardEl.onclick = () => {
        closeDeckManagement();
        showSingleCardUpgrade(card, state.playerDeck.indexOf(card));
      };
    }
    
    container.appendChild(cardEl);
  });
  
  overlay.classList.add('show');
}

function closeDeckManagement() {
  const overlay = document.getElementById('deck-management-overlay');
  if (overlay) overlay.classList.remove('show');
}

function showSingleCardUpgrade(card, deckIndex) {
  const overlay = document.getElementById('upgrade-panel-overlay');
  if (!overlay) return;
  
  const container = document.getElementById('upgrade-panel-cards');
  container.innerHTML = '';
  
  const levelCheck = canLevelUp(card, state.playerDeck);
  const starCheck = canStarUp(card, state.playerDeck);
  
  const cardEl = document.createElement('div');
  cardEl.className = `upgrade-panel-card ${card.type}`;
  cardEl.style.borderColor = getLevelBorderColor(card.level);
  
  // V53: 天赋显示
  let talentHtml = '';
  if (card.talent) {
    const t = TALENT_INFO[card.talent];
    talentHtml = `<div class="upgrade-talent" style="color:${t.color}">${t.icon} ${t.name}</div>`;
  }
  
  cardEl.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-stars">${getStarDisplay(card.star, card.maxStar)}</div>
    <div class="card-level">Lv.${card.level}</div>
    ${talentHtml}
    <div class="card-name">${card.name}</div>
    <div class="card-type">${card.type}</div>
    <div class="card-effect">${card.description}</div>
  `;
  
  const levelBtn = document.createElement('button');
  levelBtn.className = 'upgrade-action-btn';
  levelBtn.style.marginRight = '10px';
  if (levelCheck.can) {
    levelBtn.textContent = `等级升级 (消耗${levelCheck.cost}张同名卡)`;
    levelBtn.onclick = () => {
      if (performLevelUp(card, state.playerDeck)) {
        showMessage(`升级成功！${card.name}现在是Lv.${card.level}`);
        closeUpgradePanel();
        openDeckManagement();
      }
    };
  } else {
    levelBtn.textContent = levelCheck.reason;
    levelBtn.disabled = true;
  }
  
  const starBtn = document.createElement('button');
  starBtn.className = 'upgrade-action-btn';
  if (starCheck.can) {
    starBtn.textContent = `星级升级 (消耗${starCheck.cost}张同名卡)`;
    starBtn.onclick = () => {
      if (performStarUp(card, state.playerDeck)) {
        showMessage(`升星成功！${card.name}现在是${getStarDisplay(card.star, card.maxStar)}`);
        closeUpgradePanel();
        openDeckManagement();
      }
    };
  } else {
    starBtn.textContent = starCheck.reason;
    starBtn.disabled = true;
  }
  
  const backBtn = document.createElement('button');
  backBtn.className = 'upgrade-action-btn';
  backBtn.style.marginLeft = '10px';
  backBtn.textContent = '返回卡组';
  backBtn.onclick = () => {
    closeUpgradePanel();
    openDeckManagement();
  };
  
  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.marginTop = '15px';
  btnContainer.appendChild(levelBtn);
  btnContainer.appendChild(starBtn);
  btnContainer.appendChild(backBtn);
  
  const infoDiv = document.createElement('div');
  infoDiv.style.textAlign = 'center';
  infoDiv.style.marginTop = '10px';
  infoDiv.style.color = '#aaa';
  infoDiv.style.fontSize = '12px';
  const sameNameCount = state.playerDeck.filter(c => c.name === card.name && c.instanceId !== card.instanceId).length;
  infoDiv.textContent = `当前同名卡数量: ${sameNameCount}张 | 等级: ${card.level}/${card.maxLevel} | 星级: ${card.star}/${card.maxStar}`;
  
  cardEl.appendChild(btnContainer);
  cardEl.appendChild(infoDiv);
  container.appendChild(cardEl);
  
  overlay.classList.add('show');
}

// ========== V53: 天赋石背包UI ==========
function openTalentInventory() {
  const overlay = document.getElementById('talent-inventory-overlay');
  if (!overlay) return;
  
  const container = document.getElementById('talent-inventory-items');
  container.innerHTML = '';
  
  for (const [talent, count] of Object.entries(talentInventory)) {
    const info = TALENT_INFO[talent];
    const el = document.createElement('div');
    el.className = 'talent-item';
    el.innerHTML = `
      <div class="talent-icon" style="background:${info.color}">${info.icon}</div>
      <div class="talent-name">${info.name}</div>
      <div class="talent-count">x${count}</div>
      <div class="talent-desc">${info.desc}</div>
    `;
    container.appendChild(el);
  }
  
  overlay.classList.add('show');
}

function closeTalentInventory() {
  const overlay = document.getElementById('talent-inventory-overlay');
  if (overlay) overlay.classList.remove('show');
}

// ========== V53: 天赋石装备UI ==========
function openTalentEquipModal(cardIndex) {
  const card = state.hand[cardIndex];
  if (!card) return;
  
  const modal = document.getElementById('talent-equip-modal');
  if (!modal) return;
  
  const cardDisplay = document.getElementById('equip-card-display');
  const talentList = document.getElementById('talent-equip-list');
  
  // 显示当前卡牌
  cardDisplay.innerHTML = `
    <div class="equip-card ${card.type}" style="border-color:${getLevelBorderColor(card.level)}">
      <div class="card-cost">${card.cost}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-effect">${card.description}</div>
    </div>
  `;
  
  // 当前天赋
  if (card.talent) {
    const currentTalent = TALENT_INFO[card.talent];
    cardDisplay.innerHTML += `<div class="current-talent" style="color:${currentTalent.color}">
      当前: ${currentTalent.icon} ${currentTalent.name}
    </div>`;
  } else {
    cardDisplay.innerHTML += `<div class="current-talent">无天赋</div>`;
  }
  
  // 显示可用天赋石
  talentList.innerHTML = '';
  for (const [talent, count] of Object.entries(talentInventory)) {
    if (count <= 0) continue;
    const info = TALENT_INFO[talent];
    const el = document.createElement('div');
    el.className = 'talent-option';
    el.innerHTML = `
      <div class="talent-icon" style="background:${info.color}">${info.icon}</div>
      <div class="talent-name">${info.name}</div>
      <div class="talent-count">x${count}</div>
    `;
    el.onclick = () => equipTalent(cardIndex, talent);
    talentList.appendChild(el);
  }
  
  modal.classList.add('show');
}

function closeTalentEquipModal() {
  const modal = document.getElementById('talent-equip-modal');
  if (modal) modal.classList.remove('show');
}

function equipTalent(cardIndex, talent) {
  const card = state.hand[cardIndex];
  if (!card) return;
  
  if (talentInventory[talent] > 0) {
    // 如果卡牌已有天赋，退还
    if (card.talent) {
      talentInventory[card.talent]++;
    }
    // 装备新天赋
    card.talent = talent;
    talentInventory[talent]--;
    showMessage(`已装备${TALENT_INFO[talent].name}天赋!`);
    closeTalentEquipModal();
    renderHand();
  }
}

// Expose functions globally
window.startGame = startGame;
window.openUpgradePanel = openUpgradePanel;
window.closeUpgradePanel = closeUpgradePanel;
window.openDeckManagement = openDeckManagement;
window.closeDeckManagement = closeDeckManagement;
window.showSingleCardUpgrade = showSingleCardUpgrade;
window.openTalentInventory = openTalentInventory;
window.closeTalentInventory = closeTalentInventory;
window.openTalentEquipModal = openTalentEquipModal;
window.closeTalentEquipModal = closeTalentEquipModal;
