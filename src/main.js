// ==========================================
// Card Game Prototype - DBG (Slay the Slime)
// ==========================================

// --- Card Definitions ---
const CARD_TYPES = { ATTACK: 'attack', SKILL: 'skill', POWER: 'power' };

function createCard(name, cost, type, value, description) {
  return { name, cost, type, value, description };
}

const STARTING_DECK = [
  ...Array(5).fill(null).map(() => createCard('Strike', 1, CARD_TYPES.ATTACK, 6, 'Deal 6 damage')),
  ...Array(5).fill(null).map(() => createCard('Defend', 1, CARD_TYPES.SKILL, 5, 'Gain 5 block')),
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
  state.drawPile = shuffle([...STARTING_DECK]);
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
    el.className = 'card';
    el.innerHTML = `
      <div class="card-cost">${card.cost}</div>
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

// Expose startGame globally for HTML onclick
window.startGame = startGame;
