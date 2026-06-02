const { DeckOptimizer } = require('./src/deck-optimizer.js');
const opt = new DeckOptimizer();

const deck = [
  { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
  { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
];

const opponentDeck = [
  { id: 'enemy_strike', name: 'Enemy Strike', type: 'attack', cost: 1 }
];

const deckScore = opt.scoreDeck(deck);
const opponentScore = opt.scoreDeck(opponentDeck);

console.log('deck score:', deckScore);
console.log('opponent score:', opponentScore);
console.log('winRate:', opt.simulateWinRate(deck, opponentDeck));

// Test good deck vs poor deck
const goodDeck = [
  { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
  { id: 'strike2', name: 'Strike', type: 'attack', cost: 1 },
  { id: 'strike3', name: 'Strike', type: 'attack', cost: 1 },
  { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
];

const poorDeck = [
  { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 5 },
  { id: 'heavy_strike2', name: 'Heavy Strike', type: 'attack', cost: 6 }
];

const goodScore = opt.scoreDeck(goodDeck);
const poorScore = opt.scoreDeck(poorDeck);

console.log('good deck score:', goodScore);
console.log('poor deck score:', poorScore);
console.log('good > poor:', goodScore > poorScore);