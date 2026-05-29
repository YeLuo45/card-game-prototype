// ===== V62 elite-loader.js 测试套件 =====
// 测试环境: Node.js

'use strict';

const fs = require('fs');
const path = require('path');

// ===== Mock Browser Globals =====

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

global.window = {
  ELITE_ENEMIES: null,
  BOSS_ENEMIES: null,
  CHAPTER_1_NODES: null,
  startEliteBattle: null,
  startBossBattle: null,
  showBossIntro: null,
  initBattleStateForCombat: null,
  checkBossPhaseTransition: null,
  getNodeColor: null,
  enterNodeV62: null,
  handleEliteReward: null,
  handleBossReward: null,
  onBossDefeated: null,
  isEliteBattle: null,
  isBossBattle: null,
  getCurrentBattleType: null
};

// Global state
const gameState = {
  hand: [],
  drawPile: [],
  discardPile: [],
  turn: 1,
  energy: 3,
  maxEnergy: 3,
  isPlayerTurn: true,
  battleLog: [],
  playerHp: 80,
  playerMaxHp: 100,
  playerShield: 0,
  deck: [
    { id: 'strike', name: '打击', cost: 1, type: 'attack', effect: { damage: 6 } },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', effect: { block: 5 } }
  ],
  relics: [],
  enemy: null,
  enemyHp: 0,
  enemyMaxHp: 0,
  enemyArmor: 0,
  enemyIntent: null,
  enemyIntentValue: 0,
  isEliteBattle: false,
  isBossBattle: false,
  bossPhase: 1,
  bossPhase2Triggered: false,
  bossPhase3Triggered: false,
  bossDefeated: false,
  enemyAI: null
};

global.gameState = gameState;

// Mock RELICS
const RELICS = {
  relic_ankh: { id: 'relic_ankh', name: '生命之符' },
  relic_skull: { id: 'relic_skull', name: '骷髅徽章' },
  relic_shield: { id: 'relic_shield', name: '护盾遗物' },
  relic_potion: { id: 'relic_potion', name: '治疗药水' },
  relic_staff: { id: 'relic_staff', name: '法师之杖' },
  relic_dragon_heart: { id: 'relic_dragon_heart', name: '龙心' }
};

const RELICS_V62 = {};

global.RELICS = RELICS;
global.RELICS_V62 = RELICS_V62;
global.CARDS = {};
global.EnemyAI = null;

// Mock functions
let addLogCalls = [];
global.addLog = (msg, type) => { addLogCalls.push({ msg, type }); };
global.shuffleDeck = () => {};
global.drawCard = () => {};
global.updateBattleUI = () => {};
global.renderEnemy = () => {};
global.rollEnemyIntent = () => {};
global.updateHandDisplay = () => {};
global.triggerRelicHook = () => {};
global.openShop = () => {};
global.returnToMap = () => {};
global.showNotification = () => {};
global.showVictoryScreen = () => {};
global.hideNodePreview = () => {};
global.document = {
  body: { appendChild: () => {}, removeChild: () => {} },
  createElement: (tag) => ({ tag, id: '', innerHTML: '', style: {}, appendChild: () => {}, remove: () => {} }),
  getElementById: () => null
};

// Load EnemyAI first
const enemyAiCode = fs.readFileSync(path.join(__dirname, 'enemy-ai.js'), 'utf8');
eval(enemyAiCode);

// Load elite-loader.js
const code = fs.readFileSync(path.join(__dirname, 'elite-loader.js'), 'utf8');
eval(code);

// ===== Tests =====

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

function resetState() {
  gameState.hand = [];
  gameState.drawPile = [...gameState.deck];
  gameState.discardPile = [];
  gameState.turn = 1;
  gameState.energy = 3;
  gameState.maxEnergy = 3;
  gameState.isPlayerTurn = true;
  gameState.battleLog = [];
  gameState.playerHp = 80;
  gameState.playerShield = 0;
  gameState.enemy = null;
  gameState.enemyHp = 0;
  gameState.enemyMaxHp = 0;
  gameState.enemyArmor = 0;
  gameState.enemyIntent = null;
  gameState.enemyIntentValue = 0;
  gameState.isEliteBattle = false;
  gameState.isBossBattle = false;
  gameState.bossPhase = 1;
  gameState.bossPhase2Triggered = false;
  gameState.bossPhase3Triggered = false;
  gameState.bossDefeated = false;
  gameState.enemyAI = null;
  addLogCalls = [];
}

console.log('\n=== ELITE_ENEMIES Export Tests ===');

assert(typeof window.ELITE_ENEMIES !== 'undefined', 'ELITE_ENEMIES exported to window');
assert(typeof window.BOSS_ENEMIES !== 'undefined', 'BOSS_ENEMIES exported to window');
assert(typeof window.CHAPTER_1_NODES !== 'undefined', 'CHAPTER_1_NODES exported to window');

console.log('\n=== ELITE_ENEMIES Structure Tests ===');

const eliteKeys = Object.keys(window.ELITE_ENEMIES);
assert(eliteKeys.length === 5, `ELITE_ENEMIES has 5 elites, got ${eliteKeys.length}`);
assert(eliteKeys.includes('elite_skeleton_lord'), 'elite_skeleton_lord exists');
assert(eliteKeys.includes('elite_orc_chief'), 'elite_orc_chief exists');
assert(eliteKeys.includes('elite_werewolf_alpha'), 'elite_werewolf_alpha exists');
assert(eliteKeys.includes('elite_slime_king'), 'elite_slime_king exists');
assert(eliteKeys.includes('elite_dark_mage'), 'elite_dark_mage exists');

const skeletonLord = window.ELITE_ENEMIES.elite_skeleton_lord;
assert(skeletonLord.id === 'elite_skeleton_lord', 'elite_skeleton_lord id');
assert(skeletonLord.name === '骷髅领主', 'elite_skeleton_lord name');
assert(skeletonLord.maxHp === 80, 'elite_skeleton_lord maxHp');
assert(skeletonLord.attack === 18, 'elite_skeleton_lord attack');
assert(skeletonLord.armor === 10, 'elite_skeleton_lord armor');
assert(skeletonLord.isElite === true, 'elite_skeleton_lord isElite');
assert(skeletonLord.aiType === 'aggressive', 'elite_skeleton_lord aiType');
assert(skeletonLord.difficulty === 1.2, 'elite_skeleton_lord difficulty');
assert(Array.isArray(skeletonLord.intents), 'elite_skeleton_lord intents is array');

console.log('\n=== BOSS_ENEMIES Structure Tests ===');

const bossKeys = Object.keys(window.BOSS_ENEMIES);
assert(bossKeys.length === 2, `BOSS_ENEMIES has 2 bosses, got ${bossKeys.length}`);
assert(bossKeys.includes('boss_dragon'), 'boss_dragon exists');
assert(bossKeys.includes('boss_abyss_lord'), 'boss_abyss_lord exists');

const dragon = window.BOSS_ENEMIES.boss_dragon;
assert(dragon.id === 'boss_dragon', 'boss_dragon id');
assert(dragon.name === '远古巨龙', 'boss_dragon name');
assert(dragon.maxHp === 200, 'boss_dragon maxHp');
assert(dragon.isBoss === true, 'boss_dragon isBoss');
assert(dragon.phases === 2, 'boss_dragon phases');
assert(dragon.phase2Attack === 45, 'boss_dragon phase2Attack');
assert(dragon.phase2Threshold === 0.5, 'boss_dragon phase2Threshold');
assert(dragon.difficulty === 1.5, 'boss_dragon difficulty');
assert(Array.isArray(dragon.intents), 'boss_dragon intents is array');

const abyssLord = window.BOSS_ENEMIES.boss_abyss_lord;
assert(abyssLord.phases === 3, 'boss_abyss_lord has 3 phases');
assert(abyssLord.phase3Threshold === 0.25, 'boss_abyss_lord phase3Threshold');

console.log('\n=== CHAPTER_1_NODES Structure Tests ===');

assert(Array.isArray(window.CHAPTER_1_NODES), 'CHAPTER_1_NODES is array');
assert(window.CHAPTER_1_NODES.length === 10, `CHAPTER_1_NODES has 10 nodes, got ${window.CHAPTER_1_NODES.length}`);

// Check node types
const nodeTypes = window.CHAPTER_1_NODES.map(n => n.type);
assert(nodeTypes.filter(t => t === 'combat').length === 5, '5 combat nodes');
assert(nodeTypes.filter(t => t === 'elite').length === 2, '2 elite nodes');
assert(nodeTypes.filter(t => t === 'boss').length === 1, '1 boss node');
assert(nodeTypes.filter(t => t === 'shop').length === 1, '1 shop node');
assert(nodeTypes.filter(t => t === 'rest').length === 1, '1 rest node');

console.log('\n=== Function Export Tests ===');

assert(typeof window.startEliteBattle === 'function', 'startEliteBattle exported');
assert(typeof window.startBossBattle === 'function', 'startBossBattle exported');
assert(typeof window.showBossIntro === 'function', 'showBossIntro exported');
assert(typeof window.initBattleStateForCombat === 'function', 'initBattleStateForCombat exported');
assert(typeof window.checkBossPhaseTransition === 'function', 'checkBossPhaseTransition exported');
assert(typeof window.getNodeColor === 'function', 'getNodeColor exported');
assert(typeof window.enterNodeV62 === 'function', 'enterNodeV62 exported');
assert(typeof window.handleEliteReward === 'function', 'handleEliteReward exported');
assert(typeof window.handleBossReward === 'function', 'handleBossReward exported');
assert(typeof window.onBossDefeated === 'function', 'onBossDefeated exported');
assert(typeof window.isEliteBattle === 'function', 'isEliteBattle exported');
assert(typeof window.isBossBattle === 'function', 'isBossBattle exported');
assert(typeof window.getCurrentBattleType === 'function', 'getCurrentBattleType exported');

console.log('\n=== getNodeColor Tests ===');

assert(window.getNodeColor('combat') === '#cc3333', 'combat node color');
assert(window.getNodeColor('elite') === '#8b0000', 'elite node color');
assert(window.getNodeColor('boss') === '#ffd700', 'boss node color');
assert(window.getNodeColor('shop') === '#3366cc', 'shop node color');
assert(window.getNodeColor('rest') === '#228b22', 'rest node color');
assert(window.getNodeColor('unknown') === '#888', 'unknown node color');

console.log('\n=== isEliteBattle / isBossBattle Tests ===');

resetState();
assert(window.isEliteBattle() === false, 'isEliteBattle false initially');
assert(window.isBossBattle() === false, 'isBossBattle false initially');
assert(window.getCurrentBattleType() === 'normal', 'getCurrentBattleType normal initially');

gameState.isEliteBattle = true;
assert(window.isEliteBattle() === true, 'isEliteBattle true after setting');
assert(window.getCurrentBattleType() === 'elite', 'getCurrentBattleType elite');

gameState.isEliteBattle = false;
gameState.isBossBattle = true;
assert(window.isBossBattle() === true, 'isBossBattle true after setting');
assert(window.getCurrentBattleType() === 'boss', 'getCurrentBattleType boss');

console.log('\n=== handleEliteReward Tests ===');

resetState();
gameState.relics = [];
const elite1 = window.ELITE_ENEMIES.elite_skeleton_lord;
window.handleEliteReward(elite1);
assert(gameState.relics.includes('relic_ankh'), 'elite reward relic_ankh added');
assert(addLogCalls.some(l => l.msg.includes('生命之符')), 'log contains relic name');

// Don't add duplicate
window.handleEliteReward(elite1);
assert(gameState.relics.filter(r => r === 'relic_ankh').length === 1, 'no duplicate relic');

console.log('\n=== handleBossReward Tests ===');

resetState();
gameState.relics = [];
const boss1 = window.BOSS_ENEMIES.boss_dragon;
window.handleBossReward(boss1);
assert(gameState.relics.includes('relic_dragon_heart'), 'boss reward relic_dragon_heart added');
assert(gameState.bossDefeated === true, 'bossDefeated set to true after reward');

console.log('\n=== checkBossPhaseTransition Tests ===');

resetState();
gameState.isBossBattle = true;
gameState.bossPhase = 1;
gameState.bossPhase2Triggered = false;
gameState.bossPhase3Triggered = false;
gameState.enemy = { ...window.BOSS_ENEMIES.boss_dragon, attack: 30 };
gameState.enemyMaxHp = 200;
gameState.enemyHp = 200; // Full HP

// Not triggered at full HP
window.checkBossPhaseTransition();
assert(gameState.bossPhase === 1, 'phase 1 at full HP');

// Trigger phase 2 at 50%
gameState.enemyHp = 99; // 99/200 = 49.5% < 50%
window.checkBossPhaseTransition();
assert(gameState.bossPhase === 2, 'phase 2 triggered at 49.5% HP');
assert(gameState.bossPhase2Triggered === true, 'bossPhase2Triggered set');
assert(gameState.enemy.attack === 45, 'attack upgraded to phase2Attack');

// Phase 3 boss
resetState();
gameState.isBossBattle = true;
gameState.enemy = { ...window.BOSS_ENEMIES.boss_abyss_lord, phases: 3, attack: 25 };
gameState.enemyMaxHp = 180;
gameState.enemyHp = 44; // 44/180 = 24.4% < 25%

window.checkBossPhaseTransition();
assert(gameState.bossPhase === 3, 'phase 3 triggered at 24.4% HP');
assert(gameState.enemy.attack === 50, 'attack upgraded to phase3Attack');

// Not boss battle - should do nothing
resetState();
gameState.isBossBattle = false;
window.checkBossPhaseTransition();
assert(gameState.bossPhase === 1, 'phase unchanged when not boss battle');

console.log('\n=== initBattleStateForCombat Tests ===');

resetState();
window.initBattleStateForCombat();

assert(Array.isArray(gameState.hand), 'hand is array');
assert(Array.isArray(gameState.drawPile), 'drawPile is array');
assert(Array.isArray(gameState.discardPile), 'discardPile is array');
assert(gameState.turn === 1, 'turn reset to 1');
assert(gameState.energy === 3, 'energy reset to 3');
assert(gameState.maxEnergy === 3, 'maxEnergy reset to 3');
assert(gameState.isPlayerTurn === true, 'isPlayerTurn true');
assert(Array.isArray(gameState.battleLog), 'battleLog is array');

console.log('\n=== startEliteBattle Tests ===');

resetState();
const initialEliteBattle = gameState.isEliteBattle;
window.startEliteBattle();

assert(gameState.isEliteBattle === true, 'isEliteBattle set to true');
assert(gameState.isBossBattle === false, 'isBossBattle set to false');
assert(gameState.enemy !== null, 'enemy is set');
assert(gameState.enemyHp > 0, 'enemyHp is set');
assert(gameState.enemyArmor >= 0, 'enemyArmor is set');
assert(gameState.enemy.isElite === true, 'enemy.isElite is true');
assert(typeof gameState.enemyAI !== 'undefined', 'enemyAI is initialized');
assert(addLogCalls.some(l => l.msg.includes('精英')), 'log contains elite encounter');

// Verify enemy is from ELITE_ENEMIES pool
const eliteEnemyIds = Object.keys(window.ELITE_ENEMIES);
assert(eliteEnemyIds.includes(gameState.enemy.id), 'enemy id is from ELITE_ENEMIES pool');

console.log('\n=== startBossBattle Tests ===');

resetState();
window.startBossBattle();

// Note: Boss battle is async (shows intro animation), so we test the state setup
assert(gameState.isBossBattle === true, 'isBossBattle set to true');
assert(gameState.isEliteBattle === false, 'isEliteBattle set to false');
assert(gameState.bossPhase === 1, 'bossPhase set to 1');
assert(gameState.bossPhase2Triggered === false, 'bossPhase2Triggered false initially');
assert(gameState.bossPhase3Triggered === false, 'bossPhase3Triggered false initially');
assert(gameState.enemy !== null, 'enemy is set');
assert(gameState.enemy.isBoss === true, 'enemy.isBoss is true');
assert(gameState.enemyHp === gameState.enemy.maxHp, 'enemyHp set to maxHp');

console.log('\n=== Battle Type Flow Tests ===');

resetState();
assert(window.getCurrentBattleType() === 'normal', 'initial battle type is normal');

gameState.isEliteBattle = true;
assert(window.getCurrentBattleType() === 'elite', 'elite battle type detected');

gameState.isEliteBattle = false;
gameState.isBossBattle = true;
assert(window.getCurrentBattleType() === 'boss', 'boss battle type detected');

console.log('\n=== Error Handling Tests ===');

// getNodeColor with invalid input
assert(window.getNodeColor(null) === '#888', 'null node type handled');
assert(window.getNodeColor(undefined) === '#888', 'undefined node type handled');

// handleEliteReward with no reward - resetState first to ensure clean slate
resetState();
gameState.relics = []; // explicitly ensure clean
window.handleEliteReward({ id: 'test', reward: null });
assert(gameState.relics.length === 0, 'no relic added when reward is null');

// handleBossReward with no reward
resetState();
window.handleBossReward({ id: 'test', reward: null });
assert(gameState.bossDefeated === true, 'bossDefeated true even without reward');

// ===== Summary =====

const rate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n=== elite-loader.js Tests Summary ===`);
console.log(`Passed: ${passed}/${passed + failed} (${rate}%)`);
console.log(`Required: 80%`);

if (passed / (passed + failed) >= 0.8 && failed === 0) {
  console.log('✅ All elite-loader.js tests PASSED!');
} else {
  console.log('❌ Some tests FAILED');
}
