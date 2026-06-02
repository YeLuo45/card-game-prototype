// ============================================================================
// Card Intelligence Network — V6: CardBalanceAdvisor
// generic-agent data-driven decision making + ruflo hierarchical analysis
// ============================================================================
'use strict';

var CardBalanceAdvisor = function(metaTracker) {
  this.metaTracker = metaTracker;
  this.buffCandidates = [];
  this.nerfCandidates = [];
};

CardBalanceAdvisor.prototype.analyzeCardBalance = function(cardId, playRate, winRate) {
  var recommendation = { cardId: cardId, action: 'none', reason: '' };
  if (playRate > 0.15 && winRate > 0.58) {
    recommendation.action = 'nerf';
    recommendation.reason = 'overpowered_overplayed';
    this.nerfCandidates.push(cardId);
  } else if (playRate > 0.05 && winRate < 0.38) {
    recommendation.action = 'buff';
    recommendation.reason = 'underpowered';
    this.buffCandidates.push(cardId);
  } else if (playRate < 0.02 && winRate < 0.42) {
    recommendation.action = 'redesign';
    recommendation.reason = 'never_played';
  }
  return recommendation;
};

CardBalanceAdvisor.prototype.getBalanceSuggestions = function(cardDataList) {
  var suggestions = [];
  for (var i = 0; i < cardDataList.length; i++) {
    var cd = cardDataList[i];
    var sugg = this.analyzeCardBalance(cd.cardId, cd.playRate || 0.1, cd.winRate || 0.5);
    if (sugg.action !== 'none') suggestions.push(sugg);
  }
  return suggestions;
};

CardBalanceAdvisor.prototype.getTopBuffs = function(limit) {
  return this.buffCandidates.slice(0, limit || 5);
};

CardBalanceAdvisor.prototype.getTopNerfs = function(limit) {
  return this.nerfCandidates.slice(0, limit || 5);
};

var DraftRecommendationEngine = function(network, correlationMatrix) {
  this.network = network;
  this.correlationMatrix = correlationMatrix;
  this.draftHistory = [];
};

DraftRecommendationEngine.prototype.suggestPick = function(currentDeck, availableCards, position) {
  var scored = [];
  for (var i = 0; i < availableCards.length; i++) {
    var card = availableCards[i];
    var synergyScore = 0;
    if (currentDeck.length > 0) {
      var partners = this.network.graph.getSynergyCards(card);
      synergyScore = partners.length > 0 ? partners[0].weight : 0;
    }
    var deckWithCard = currentDeck.concat([card]);
    var similarDecks = this.correlationMatrix.findSimilarDecks(deckWithCard, 3);
    var historicalWinRate = 0.5;
    if (similarDecks.length > 0) {
      historicalWinRate = similarDecks[0].winRate;
    }
    scored.push({
      cardId: card,
      score: synergyScore * 0.4 + historicalWinRate * 0.6,
      synergyScore: synergyScore,
      historicalWinRate: historicalWinRate
    });
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  this.draftHistory.push({ deck: currentDeck, picked: scored[0] ? scored[0].cardId : null, ts: Date.now() });
  return scored.slice(0, 3);
};

DraftRecommendationEngine.prototype.getDraftStats = function() {
  return { totalPicks: this.draftHistory.length };
};

window.CardBalanceAdvisor = CardBalanceAdvisor;
window.DraftRecommendationEngine = DraftRecommendationEngine;
