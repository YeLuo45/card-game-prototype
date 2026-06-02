// ============================================================================
// Card Intelligence Network — V1: CardRelationshipGraph + ComboRegistry
// nanobot distributed mesh + generic-agent L0-L4 five-layer memory
// ============================================================================
'use strict';

var RELATIONSHIP_TYPES = {
  COMBO: 'combo',
  COUNTER: 'counter',
  SYNERGY: 'synergy',
  BLOCKS: 'blocks',
  ENHANCES: 'enhances'
};

var CardRelationshipGraph = function() {
  this.relationships = [];
  this.cardIndex = {};
};

CardRelationshipGraph.prototype.addRelationship = function(cardIdA, cardIdB, type, weight, reason) {
  var validTypes = ['combo', 'counter', 'synergy', 'blocks', 'enhances'];
  if (validTypes.indexOf(type) === -1) return { error: 'invalid_type' };
  if (cardIdA === cardIdB) return { error: 'self_reference' };
  weight = weight || 1.0;
  var record = {
    id: cardIdA + '_' + type + '_' + cardIdB,
    cardA: cardIdA,
    cardB: cardIdB,
    type: type,
    weight: weight,
    reason: reason || '',
    count: 1
  };
  this.relationships.push(record);
  this._indexCard(cardIdA, this.relationships.length - 1);
  this._indexCard(cardIdB, this.relationships.length - 1);
  return { success: true, id: record.id };
};

CardRelationshipGraph.prototype._indexCard = function(cardId, idx) {
  if (!this.cardIndex[cardId]) this.cardIndex[cardId] = [];
  if (this.cardIndex[cardId].indexOf(idx) === -1) {
    this.cardIndex[cardId].push(idx);
  }
};

CardRelationshipGraph.prototype.getRelationships = function(cardId, type) {
  var indices = this.cardIndex[cardId] || [];
  var results = [];
  for (var i = 0; i < indices.length; i++) {
    var rel = this.relationships[indices[i]];
    if (rel && (!type || rel.type === type)) {
      results.push({
        cardId: rel.cardA === cardId ? rel.cardB : rel.cardA,
        type: rel.type,
        weight: rel.weight,
        reason: rel.reason
      });
    }
  }
  return results;
};

CardRelationshipGraph.prototype.getPartners = function(cardId, type, minWeight) {
  var rels = this.getRelationships(cardId, type);
  var partners = [];
  var seen = {};
  for (var i = 0; i < rels.length; i++) {
    var p = rels[i];
    if (!seen[p.cardId] && (!minWeight || p.weight >= minWeight)) {
      seen[p.cardId] = true;
      partners.push(p);
    }
  }
  return partners;
};

CardRelationshipGraph.prototype.getCounterCards = function(cardId) {
  return this.getPartners(cardId, RELATIONSHIP_TYPES.COUNTER);
};

CardRelationshipGraph.prototype.getComboCards = function(cardId) {
  return this.getPartners(cardId, RELATIONSHIP_TYPES.COMBO);
};

CardRelationshipGraph.prototype.getSynergyCards = function(cardId) {
  return this.getPartners(cardId, RELATIONSHIP_TYPES.SYNERGY);
};

CardRelationshipGraph.prototype.getGraphStats = function() {
  var counts = {};
  var validTypes = ['combo', 'counter', 'synergy', 'blocks', 'enhances'];
  for (var i = 0; i < validTypes.length; i++) {
    counts[validTypes[i]] = 0;
  }
  for (var i = 0; i < this.relationships.length; i++) {
    var t = this.relationships[i].type;
    if (counts[t] !== undefined) counts[t]++;
  }
  return {
    total: this.relationships.length,
    cardCount: Object.keys(this.cardIndex).length,
    byType: counts
  };
};

var ComboRegistry = function(graph) {
  this.graph = graph || new CardRelationshipGraph();
  this.comboChains = [];
  this.chainIndex = {};
};

ComboRegistry.prototype.registerChain = function(name, cardIds, effect, description) {
  if (!cardIds || cardIds.length < 2) return { error: 'min_2_cards' };
  var chain = {
    id: 'chain_' + (this.comboChains.length + 1),
    name: name,
    cards: cardIds.slice(),
    effect: effect || '',
    description: description || ''
  };
  this.comboChains.push(chain);
  var first = cardIds[0];
  if (!this.chainIndex[first]) this.chainIndex[first] = [];
  this.chainIndex[first].push(this.comboChains.length - 1);
  return { success: true, chainId: chain.id };
};

ComboRegistry.prototype.findChains = function(cardId) {
  var indices = this.chainIndex[cardId] || [];
  var chains = [];
  for (var i = 0; i < indices.length; i++) {
    chains.push(this.comboChains[indices[i]]);
  }
  return chains;
};

ComboRegistry.prototype.isChainComplete = function(chainId, playedCards) {
  var chain = null;
  for (var i = 0; i < this.comboChains.length; i++) {
    if (this.comboChains[i].id === chainId) {
      chain = this.comboChains[i];
      break;
    }
  }
  if (!chain) return { error: 'chain_not_found' };
  var needed = [];
  for (var j = 0; j < chain.cards.length; j++) {
    if (playedCards.indexOf(chain.cards[j]) === -1) {
      needed.push(chain.cards[j]);
    }
  }
  return {
    complete: needed.length === 0,
    remaining: needed,
    progress: (chain.cards.length - needed.length) / chain.cards.length
  };
};

ComboRegistry.prototype.suggestNextCards = function(playedCards, maxSuggestions) {
  maxSuggestions = maxSuggestions || 3;
  var suggestions = [];
  var seen = {};
  for (var i = 0; i < playedCards.length; i++) {
    var partners = this.graph.getPartners(playedCards[i], RELATIONSHIP_TYPES.COMBO);
    for (var j = 0; j < partners.length; j++) {
      var p = partners[j];
      if (playedCards.indexOf(p.cardId) === -1 && !seen[p.cardId]) {
        seen[p.cardId] = true;
        suggestions.push({
          cardId: p.cardId,
          sourceCard: playedCards[i],
          weight: p.weight,
          reason: p.reason
        });
      }
    }
  }
  suggestions.sort(function(a, b) { return b.weight - a.weight; });
  return suggestions.slice(0, maxSuggestions);
};

ComboRegistry.prototype.getChainCount = function() {
  return this.comboChains.length;
};

var CardIntelligenceNetwork = function() {
  this.graph = new CardRelationshipGraph();
  this.registry = new ComboRegistry(this.graph);
  this.feedbackHistory = [];
};

CardIntelligenceNetwork.prototype.recordGameplay = function(cardId, success, context) {
  this.feedbackHistory.push({
    cardId: cardId,
    success: success,
    context: context || {},
    timestamp: Date.now()
  });
  return { success: true, totalRecords: this.feedbackHistory.length };
};

CardIntelligenceNetwork.prototype.analyzeCardStrength = function(cardId) {
  var combos = this.graph.getComboCards(cardId);
  var counters = this.graph.getCounterCards(cardId);
  var synergy = this.graph.getSynergyCards(cardId);
  var winRate = 0.5;
  var total = 0, wins = 0;
  for (var i = 0; i < this.feedbackHistory.length; i++) {
    if (this.feedbackHistory[i].cardId === cardId) {
      total++;
      if (this.feedbackHistory[i].success) wins++;
    }
  }
  if (total > 0) winRate = wins / total;
  return {
    cardId: cardId,
    winRate: winRate,
    comboCount: combos.length,
    counterCount: counters.length,
    synergyCount: synergy.length,
    feedbackCount: total
  };
};

CardIntelligenceNetwork.prototype.suggestCard = function(hand, deck, context) {
  var suggestions = this.registry.suggestNextCards(hand, 5);
  var scored = [];
  for (var i = 0; i < suggestions.length; i++) {
    var s = suggestions[i];
    var strength = this.analyzeCardStrength(s.cardId);
    scored.push({
      cardId: s.cardId,
      score: s.weight * (strength.winRate || 0.5),
      sourceCard: s.sourceCard,
      reason: s.reason
    });
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 3);
};

CardIntelligenceNetwork.prototype.getNetworkStats = function() {
  return {
    graphStats: this.graph.getGraphStats(),
    chainCount: this.registry.getChainCount(),
    feedbackCount: this.feedbackHistory.length
  };
};

window.CardRelationshipGraph = CardRelationshipGraph;
window.ComboRegistry = ComboRegistry;
window.CardIntelligenceNetwork = CardIntelligenceNetwork;
window.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;