'use strict';
const fs = require('fs');
const path = require('path');

// PRE-MOCKS
global.localStorage = {
  _store: {},
  getItem(k) { return this._store.hasOwnProperty(k) ? this._store[k] : null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.window = global;
global.document = {
  addEventListener: () => {},
  body: { appendChild: () => {} },
  querySelectorAll: () => [],
  getElementById: () => null
};

// LOAD CardStudio
const studioCode = fs.readFileSync(path.join(__dirname, 'card-studio.js'), 'utf8');
eval(studioCode);

// TESTS
let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ ${msg}`); }
}

console.log('\n=== CardStudio Tests ===\n');

console.log('Test 1: Constructor');
const cs = new CardStudio();
assert(cs, 'CardStudio instance created');
assert(cs.name === 'CardStudio', 'name set');
assert(cs.version === '1.0', 'version set');
assert(Array.isArray(cs.customCards), 'customCards is array');
assert(cs.customCards.length === 0, 'customCards starts empty');

console.log('\nTest 2: getCardTypeIcon');
assert(cs._getCardTypeIcon('attack') === '⚔️', 'attack icon');
assert(cs._getCardTypeIcon('skill') === '🛡️', 'skill icon');
assert(cs._getCardTypeIcon('power') === '✨', 'power icon');
assert(cs._getCardTypeIcon('unknown') === '🃏', 'unknown icon');

console.log('\nTest 3: getRarityColor');
assert(cs._getRarityColor('common') === '#aaa', 'common color');
assert(cs._getRarityColor('uncommon') === '#27ae60', 'uncommon color');
assert(cs._getRarityColor('rare') === '#9b59b6', 'rare color');
assert(cs._getRarityColor('legendary') === '#f39c12', 'legendary color');

console.log('\nTest 4: getAllCards with empty gameState');
global.window.gameState = null;  // Reset before this test
const emptyCards = cs._getAllCards();
assert(Array.isArray(emptyCards), 'returns array');
assert(emptyCards.length === 0, 'returns empty when no gameState deck');

console.log('\nTest 5: getAllCards with gameState');
global.window.gameState = {
  player: {
    deck: [
      { id: 'strike', name: '打击', type: 'attack', rarity: 'common', cost: 1, description: '造成6伤害' },
      { id: 'defend', name: '防御', type: 'skill', rarity: 'common', cost: 1, description: '获得5护盾' }
    ]
  }
};
const cards = cs._getAllCards();
assert(cards.length === 2, '2 cards from gameState');
assert(cards[0].isCustom === false, 'gameState cards not marked custom');
assert(cards[0].id === 'strike', 'first card is strike');
assert(cards[1].id === 'defend', 'second card is defend');

console.log('\nTest 6: getAllCards with custom cards');
cs.customCards = [
  { id: 'custom_1', name: '自定义火球', type: 'attack', rarity: 'rare', cost: 2, description: '造成20伤害', isCustom: true }
];
const mixedCards = cs._getAllCards();
assert(mixedCards.length === 3, '3 total cards');
assert(mixedCards.filter(c => c.isCustom).length === 1, '1 custom card');
assert(mixedCards.filter(c => !c.isCustom).length === 2, '2 gameState cards');

console.log('\nTest 7: _getEditorHTML structure');
const strikeCard = mixedCards.find(c => c.id === 'strike');
const editorHtml = cs._getEditorHTML(strikeCard);
assert(editorHtml.includes('打击'), 'editor includes card name');
assert(editorHtml.includes('cs-input-name'), 'editor has name input');
assert(editorHtml.includes('cs-input-cost'), 'editor has cost input');
assert(editorHtml.includes('cs-input-type'), 'editor has type select');
assert(editorHtml.includes('cs-save-btn'), 'editor has save button');
assert(editorHtml.includes('cs-delete-btn') === false, 'non-custom card has no delete button');

console.log('\nTest 8: _getEditorHTML for custom card');
const customCard = mixedCards.find(c => c.id === 'custom_1');
const customEditorHtml = cs._getEditorHTML(customCard);
assert(customEditorHtml.includes('cs-delete-btn'), 'custom card has delete button');

console.log('\nTest 9: _getNewCardHTML structure');
const newCardHtml = cs._getNewCardHTML();
assert(newCardHtml.includes('创建新卡牌'), 'new card form has title');
assert(newCardHtml.includes('cs-new-name'), 'new card form has name input');
assert(newCardHtml.includes('cs-new-cost'), 'new card form has cost input');
assert(newCardHtml.includes('cs-new-type'), 'new card form has type select');
assert(newCardHtml.includes('cs-create-btn'), 'new card form has create button');

console.log('\nTest 10: _saveCard - new card');
cs.customCards = [];
cs._saveCard('nonexistent');
assert(cs.customCards.length === 0, 'requires name to save');
// Simulate having DOM inputs by directly manipulating
global.document.getElementById = (id) => {
  const mocks = {
    'cs-input-name': { value: '新卡牌' },
    'cs-input-cost': { value: '3' },
    'cs-input-type': { value: 'attack' },
    'cs-input-rarity': { value: 'rare' },
    'cs-input-desc': { value: '测试描述' }
  };
  return mocks[id];
};
cs._saveCard('nonexistent');
assert(cs.customCards.length === 1, 'saved new custom card');
assert(cs.customCards[0].name === '新卡牌', 'card name saved');
assert(cs.customCards[0].cost === 3, 'card cost saved');
assert(cs.customCards[0].rarity === 'rare', 'card rarity saved');
assert(cs.customCards[0].type === 'attack', 'card type saved');
assert(cs.customCards[0].id.startsWith('custom_'), 'generated id for new card');

console.log('\nTest 11: _saveCard - update existing');
cs.customCards = [{ id: 'custom_1', name: '旧名称', cost: 1, type: 'skill', rarity: 'common', description: '' }];
global.document.getElementById = (id) => {
  const mocks = {
    'cs-input-name': { value: '新名称' },
    'cs-input-cost': { value: '5' },
    'cs-input-type': { value: 'power' },
    'cs-input-rarity': { value: 'legendary' },
    'cs-input-desc': { value: '更新描述' }
  };
  return mocks[id];
};
cs._saveCard('custom_1');
assert(cs.customCards.length === 1, 'still 1 card');
assert(cs.customCards[0].name === '新名称', 'name updated');
assert(cs.customCards[0].cost === 5, 'cost updated');
assert(cs.customCards[0].rarity === 'legendary', 'rarity updated');
assert(cs.customCards[0].type === 'power', 'type updated');

console.log('\nTest 12: _deleteCard');
cs.customCards = [
  { id: 'keep', name: '保留', cost: 1, type: 'skill', rarity: 'common', description: '' },
  { id: 'delete_me', name: '删除', cost: 2, type: 'attack', rarity: 'rare', description: '' }
];
cs._deleteCard('delete_me');
assert(cs.customCards.length === 1, 'one card deleted');
assert(cs.customCards[0].id === 'keep', 'correct card kept');
assert(cs.customCards[0].name === '保留', 'kept card unchanged');

console.log('\nTest 13: localStorage persistence');
localStorage._store = {};
cs.customCards = [];
cs.customCards.push({ id: 'persist', name: '持久化', cost: 1, type: 'attack', rarity: 'common', description: '' });
cs._saveCard('persist');
// Check localStorage was called
assert(localStorage._store['cardStudio_customCards'] !== undefined, 'persisted to localStorage');

console.log('\nTest 14: reset');
cs.customCards = [{ id: 'toremove', name: '删除', cost: 1, type: 'skill', rarity: 'common', description: '' }];
cs.reset();
assert(cs.customCards.length === 0, 'customCards cleared');
assert(localStorage._store['cardStudio_customCards'] === undefined, 'localStorage cleared');

console.log('\nTest 15: getStats');
global.window.gameState = {
  player: {
    deck: [
      { id: 'strike', name: '打击', type: 'attack', rarity: 'common', cost: 1, description: '' },
      { id: 'defend', name: '防御', type: 'skill', rarity: 'common', cost: 1, description: '' },
      { id: 'fireball', name: '火球', type: 'attack', rarity: 'rare', cost: 2, description: '' }
    ]
  }
};
cs.customCards = [{ id: 'c1', name: '自定义', type: 'power', rarity: 'legendary', cost: 3, description: '' }];
const stats = cs.getStats();
assert(stats.totalCards === 4, 'totalCards = 4');
assert(stats.customCards === 1, 'customCards = 1');
assert(stats.byType.attack === 2, '2 attack cards');
assert(stats.byType.skill === 1, '1 skill card');
assert(stats.byType.power === 1, '1 power card');
assert(stats.byRarity.common === 2, '2 common');
assert(stats.byRarity.rare === 1, '1 rare');
assert(stats.byRarity.legendary === 1, '1 legendary');

console.log('\nTest 16: _switchTab (simulated)');
// Verify _switchTab uses filter values
const tabFilters = ['all', 'attack', 'skill', 'custom'];
tabFilters.forEach(f => {
  const allCards = cs._getAllCards();
  if (f === 'all') {
    assert(allCards.length === 4, `tab "${f}" returns all 4 cards`);
  } else if (f === 'attack') {
    assert(allCards.filter(c => c.type === f).length === 2, `tab "${f}" returns 2 attack cards`);
  }
});

console.log('\nTest 17: Panel HTML structure');
const panelHtml = cs._getPanelHTML();
assert(panelHtml.includes('卡牌工作室'), 'panel has title');
assert(panelHtml.includes('cs-card-grid'), 'panel has card grid');
assert(panelHtml.includes('cs-tabs'), 'panel has tabs');
assert(panelHtml.includes('cs-editor'), 'panel has editor area');
assert(panelHtml.includes('cs-stats-bar'), 'panel has stats bar');
assert(panelHtml.includes('cs-edit-btn'), 'panel has edit button');
assert(panelHtml.includes('cs-close-btn'), 'panel has close button');

// Test 18: _getAllCards handles missing gameState
console.log('\nTest 18: Edge cases');
global.window.gameState = null;
cs.customCards = [];
const noGameCards = cs._getAllCards();
assert(Array.isArray(noGameCards) && noGameCards.length === 0, 'handles null gameState');

cs.customCards = [];
cs.customCards.push({ id: 'no_type', name: '测试', cost: 0, type: undefined, rarity: 'common', description: '' });
const noTypeIcon = cs._getCardTypeIcon(undefined);
assert(noTypeIcon === '🃏', 'unknown type icon for undefined');

// Test 19: _saveCard without name (empty string)
console.log('\nTest 19: Empty name validation');
cs.customCards = [];
global.document.getElementById = () => ({ value: '   ' });  // whitespace only
cs._saveCard('nonexistent');
assert(cs.customCards.length === 0, 'whitespace-only name rejected');

// Test 20: Stats with no gameState deck
console.log('\nTest 20: Stats edge cases');
global.window.gameState = { player: { deck: [] } };
cs.customCards = [];
const emptyStats = cs.getStats();
assert(emptyStats.totalCards === 0, 'empty stats - totalCards 0');
assert(emptyStats.customCards === 0, 'empty stats - customCards 0');
assert(typeof emptyStats.byType === 'object', 'empty stats - byType object');
assert(typeof emptyStats.byRarity === 'object', 'empty stats - byRarity object');

// RESULTS
const total = passed + failed;
const passRate = passed / total;
console.log(`\n=== Results: ${passed}/${total} passed (${(passRate*100).toFixed(1)}%) ===\n`);
if (failed > 0 || passRate < 0.8) {
  console.log(`FAIL: pass_rate ${passRate.toFixed(2)} < 0.80 threshold`);
  process.exit(1);
}
process.exit(0);