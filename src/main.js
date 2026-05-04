// ==========================================
// Card Game Prototype - DBG (Slay the Slime)
// ==========================================

// --- Card Definitions ---
const CARD_TYPES = { ATTACK: 'attack', SKILL: 'skill', POWER: 'power' };

// 等级升级倍率表
const LEVEL_MULTIPLIERS = {
  1: 1.00,  // Lv1 base
  2: 1.15,  // Lv1→Lv2
  3: 1.30,  // Lv2→Lv3
  4: 1.50,  // Lv3→Lv4
  5: 1.75   // Lv4→Lv5
};

// 等级升级费用（同名卡数量）
const LEVEL_UP_COSTS = [0, 2, 3, 5, 8]; // index = 目标等级-1, Lv2需要2张, Lv3需要3张...

// 星级升级费用
const STAR_UP_COSTS = { 2: 3, 3: 5 }; // 升到2星需3张, 升到3星需5张

// instanceId计数器
let nextInstanceId = 1;

// 创建带升级系统的卡牌模板
function createCard(name, cost, type, value, description, maxLevel = 5, maxStar = 3, starEffects = []) {
  return {
    name, cost, type, value, description,
    maxLevel,    // 最大等级
    maxStar,     // 最大星级
    starEffects, // 星级特效数组，starEffects[0]=1星基础效果, starEffects[1]=2星效果...
    // 模板的原始值
    baseValue: value,
    baseCost: cost
  };
}

// 创建卡牌实例（玩家手中的卡）
function createCardInstance(template) {
  return {
    instanceId: nextInstanceId++,
    name: template.name,
    cost: template.cost,
    type: template.type,
    value: template.value,
    description: template.description,
    level: 1,         // 当前等级
    star: 1,          // 当前星级
    maxLevel: template.maxLevel,
    maxStar: template.maxStar,
    starEffects: [...template.starEffects],
    // 原始模板数据
    baseValue: template.baseValue,
    baseCost: template.baseCost,
    templateId: template.name // 用于匹配同名卡
  };
}

// 计算卡牌实际效果值（根据等级）
function getCardValue(instance) {
  const multiplier = LEVEL_MULTIPLIERS[instance.level] || 1.0;
  return Math.floor(instance.baseValue * multiplier);
}

// 获取卡牌实际费用
function getCardCost(instance) {
  if (instance.level >= 2) {
    // 2级后每级费用-1，最低0
    const reduction = instance.level - 1;
    return Math.max(0, instance.baseCost - reduction);
  }
  return instance.baseCost;
}

// 等级升级（消耗同名卡）
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
  
  // 移除同名卡（先找到deck中的实例）
  let removed = 0;
  for (let i = deck.length - 1; i >= 0 && removed < check.cost; i--) {
    if (deck[i].name === instance.name && deck[i].instanceId !== instance.instanceId) {
      deck.splice(i, 1);
      removed++;
    }
  }
  
  // 升级
  instance.level++;
  instance.value = getCardValue(instance);
  instance.cost = getCardCost(instance);
  return true;
}

// 星级升级（消耗同名卡）
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
  
  // 移除同名卡
  let removed = 0;
  for (let i = deck.length - 1; i >= 0 && removed < check.cost; i--) {
    if (deck[i].name === instance.name && deck[i].instanceId !== instance.instanceId) {
      deck.splice(i, 1);
      removed++;
    }
  }
  
  // 升星
  instance.star++;
  return true;
}

// 获取星级显示
function getStarDisplay(star, maxStar) {
  return '★'.repeat(star) + '☆'.repeat(maxStar - star);
}

// 获取等级边框颜色
function getLevelBorderColor(level) {
  const colors = {
    0: '#555',  // 灰
    1: '#2ecc71', // 绿
    2: '#3498db', // 蓝
    3: '#9b59b6', // 紫
    4: '#e74c3c', // 红
    5: '#f39c12'  // 橙
  };
  return colors[level] || colors[0];
}

const STARTING_DECK_TEMPLATES = [
  createCard('Strike', 1, CARD_TYPES.ATTACK, 6, 'Deal 6 damage'),
  createCard('Defend', 1, CARD_TYPES.SKILL, 5, 'Gain 5 block'),
  createCard('Heavy Strike', 2, CARD_TYPES.ATTACK, 12, 'Deal 12 damage'),
  createCard('Bash', 2, CARD_TYPES.ATTACK, 8, 'Deal 8 damage. Vulnerable 1'),
  createCard('Shrug It Off', 1, CARD_TYPES.SKILL, 8, 'Gain 8 block. Draw 1'),
];

// --- Game State ---
const state = {
  phase: 'idle', // idle, player_turn, enemy_turn, victory, defeat
  player: { hp: 80, maxHp: 80, block: 0, energy: 3, maxEnergy: 3 },
  enemy: { hp: 50, maxHp: 50, block: 0, intent: null, intentValue: 0 },
  drawPile: [],
  discardPile: [],
  hand: [],
  turn: 0,
  playerDeck: [], // 玩家卡组（卡牌实例）
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
  // 从模板创建卡牌实例
  state.playerDeck = [
    ...Array(5).fill(null).map(() => createCardInstance(STARTING_DECK_TEMPLATES[0])), // Strike x5
    ...Array(5).fill(null).map(() => createCardInstance(STARTING_DECK_TEMPLATES[1])), // Defend x5
    createCardInstance(STARTING_DECK_TEMPLATES[2]), // Heavy Strike
    createCardInstance(STARTING_DECK_TEMPLATES[3]), // Bash
    createCardInstance(STARTING_DECK_TEMPLATES[4]), // Shrug It Off
  ];
  // 混合卡组用于战斗抽牌
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
  renderHand();
  updateDeckInfo();
}

function discardHand() {
  state.discardPile.push(...state.hand);
  state.hand = [];
  renderHand();
  updateDeckInfo();
}

// --- Enemy AI ---
const INTENTS = {
  ATTACK: 'attack',
  DEFEND: 'defend',
  BUFF: 'buff',
};

function rollEnemyIntent() {
  const roll = Math.random();
  if (roll < 0.70) {
    state.enemy.intent = INTENTS.ATTACK;
    state.enemy.intentValue = 8 + Math.floor(Math.random() * 6); // 8-13
  } else if (roll < 0.90) {
    state.enemy.intent = INTENTS.DEFEND;
    state.enemy.intentValue = 6 + Math.floor(Math.random() * 4); // 6-9
  } else {
    state.enemy.intent = INTENTS.BUFF;
    state.enemy.intentValue = 2 + Math.floor(Math.random() * 2); // 2-3
  }
}

function executeEnemyIntent() {
  const { intent, intentValue } = state.enemy;
  if (intent === INTENTS.ATTACK) {
    const dmg = Math.max(0, intentValue - state.player.block);
    state.player.hp = Math.max(0, state.player.hp - dmg);
    state.player.block = 0;
    showMessage(`Enemy attacks for ${intentValue}! (${dmg} pierces block)`);
  } else if (intent === INTENTS.DEFEND) {
    state.enemy.block += intentValue;
    showMessage(`Enemy gains ${intentValue} block!`);
  } else if (intent === INTENTS.BUFF) {
    state.enemy.intentValue += intentValue;
    showMessage(`Enemy grows stronger! +${intentValue} power`);
  }
  updateUI();
}

// --- Battle Flow ---
function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  state.player = { hp: 80, maxHp: 80, block: 0, energy: 3, maxEnergy: 3 };
  state.enemy = { hp: 50, maxHp: 50, block: 0, intent: null, intentValue: 0 };
  state.turn = 0;
  initializeDeck();
  startPlayerTurn();
}

function startPlayerTurn() {
  state.phase = 'player_turn';
  state.turn++;
  state.player.energy = state.player.maxEnergy;
  state.player.block = 0;
  rollEnemyIntent();
  drawCards(5);
  updateUI();
  document.getElementById('end-turn-btn').disabled = false;
  document.getElementById('intent-label').textContent = `Turn ${state.turn} - Your Turn`;
}

function endTurn() {
  if (state.phase !== 'player_turn') return;
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
  if (state.player.energy < card.cost) {
    showMessage('Not enough energy!');
    return;
  }

  state.player.energy -= card.cost;
  state.hand.splice(index, 1);
  state.discardPile.push(card);

  // Apply card effect
  if (card.type === CARD_TYPES.ATTACK) {
    const dmg = Math.max(0, card.value - state.enemy.block);
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    state.enemy.block = 0;
    showMessage(`${card.name} deals ${card.value} damage!`);
  } else if (card.type === CARD_TYPES.SKILL) {
    state.player.block += card.value;
    if (card.name === 'Shrug It Off') {
      // Draw 1 extra card
      if (state.drawPile.length > 0) state.hand.push(state.drawPile.pop());
    }
    showMessage(`Gained ${card.value} block!`);
  }

  renderHand();
  updateUI();
  updateDeckInfo();

  if (state.enemy.hp <= 0) {
    endBattle(true);
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
    
    el.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-stars">${starDisplay}</div>
      ${levelDisplay}
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.type}</div>
      <div class="card-effect">${card.description}</div>
    `;
    el.onclick = () => playCard(i);
    container.appendChild(el);
  });
}

function updateUI() {
  const { player, enemy } = state;
  // Player
  document.getElementById('player-hp-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('player-hp-text').textContent = `${player.hp}/${player.maxHp}`;
  document.getElementById('player-block').textContent = `Block: ${player.block}`;
  document.getElementById('energy-display').textContent = `${player.energy}/${player.maxEnergy}`;
  // Enemy
  document.getElementById('enemy-hp-fill').style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
  document.getElementById('enemy-hp-text').textContent = `${enemy.hp}/${enemy.maxHp}`;
  const intentStr = enemy.intent === INTENTS.ATTACK ? `Attack ${enemy.intentValue}`
    : enemy.intent === INTENTS.DEFEND ? `Defend ${enemy.intentValue}`
    : `Buff +${enemy.intentValue}`;
  document.getElementById('enemy-intent').textContent = enemy.intent ? intentStr : '???';
}

function updateDeckInfo() {
  document.getElementById('deck-info').textContent = `Draw: ${state.drawPile.length} | Discard: ${state.discardPile.length}`;
}

// --- Card Upgrade System (Level & Star) ---

// 打开升级面板
function openUpgradePanel(cardIndex) {
  const card = state.hand[cardIndex];
  if (!card) return;
  
  const overlay = document.getElementById('upgrade-panel-overlay');
  if (!overlay) return;
  
  const container = document.getElementById('upgrade-panel-cards');
  container.innerHTML = '';
  
  // 显示可升级的卡牌信息
  const levelCheck = canLevelUp(card, state.playerDeck);
  const starCheck = canStarUp(card, state.playerDeck);
  
  const cardEl = document.createElement('div');
  cardEl.className = `upgrade-panel-card ${card.type}`;
  cardEl.style.borderColor = getLevelBorderColor(card.level);
  
  cardEl.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-stars">${getStarDisplay(card.star, card.maxStar)}</div>
    <div class="card-level">Lv.${card.level}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-type">${card.type}</div>
    <div class="card-effect">${card.description}</div>
  `;
  
  // 等级升级按钮
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
  
  // 星级升级按钮
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

// 打开卡组管理界面
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
    
    cardEl.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-stars">${getStarDisplay(card.star, card.maxStar)}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.type}</div>
      <div class="card-effect">${card.description}</div>
      <div class="upgrade-level">${upgradeDots}</div>
      <div class="card-info">同名卡: ${state.playerDeck.filter(c => c.name === card.name).length}张</div>
    `;
    
    if (canLevel || canStar) {
      cardEl.style.cursor = 'pointer';
      cardEl.onclick = () => {
        // 打开该卡的升级面板
        // 先关闭当前管理界面，再打开具体卡的升级面板
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

// 显示单张卡的升级面板
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
  
  cardEl.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-stars">${getStarDisplay(card.star, card.maxStar)}</div>
    <div class="card-level">Lv.${card.level}</div>
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

// Expose functions globally
window.startGame = startGame;
window.openUpgradePanel = openUpgradePanel;
window.closeUpgradePanel = closeUpgradePanel;
window.openDeckManagement = openDeckManagement;
window.closeDeckManagement = closeDeckManagement;
window.showSingleCardUpgrade = showSingleCardUpgrade;
