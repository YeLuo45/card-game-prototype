// ============================================================================
// Card Intelligence Network — V3: AdaptiveStrategyEngine
// thunderbolt feedback loops + generic-agent L0-L4 adaptive planning
// ============================================================================
'use strict';

var AdaptiveStrategyEngine = function(intelligenceNetwork, opponentTracker) {
  this.network = intelligenceNetwork;
  this.opponentTracker = opponentTracker;
  this.strategyHistory = [];
  this.currentStrategy = 'balanced';
};

AdaptiveStrategyEngine.prototype.suggestPlay = function(hand, deck, boardState, opponentId) {
  var suggestion = { cardId: null, reason: '', confidence: 0, strategy: this.currentStrategy };
  var networkSuggs = this.network.suggestCard(hand, deck, boardState);
  if (networkSuggs && networkSuggs.length > 0) {
    suggestion.cardId = networkSuggs[0].cardId;
    suggestion.reason = 'card_intelligence:' + (networkSuggs[0].reason || 'synergy');
    suggestion.confidence = Math.min(networkSuggs[0].score * 2, 1.0);
  }
  if (opponentId && this.opponentTracker) {
    var oppModel = this.opponentTracker.getOrCreateModel(opponentId);
    var oppPred = oppModel.predictPlay(boardState.turn || 1, hand);
    if (oppPred && oppPred.length > 0) {
      var counters = this.network.graph.getCounterCards(oppPred[0].cardId);
      for (var i = 0; i < counters.length; i++) {
        if (hand.indexOf(counters[i].cardId) !== -1) {
          suggestion.cardId = counters[i].cardId;
          suggestion.reason = 'counter_predict:' + oppPred[0].cardId;
          suggestion.confidence = 0.9;
          break;
        }
      }
    }
  }
  return suggestion;
};

AdaptiveStrategyEngine.prototype.adjustStrategy = function(outcome, context) {
  this.strategyHistory.push({ outcome: outcome, context: context, timestamp: Date.now() });
  if (outcome === 'win') {
    if (this.currentStrategy === 'control') this.currentStrategy = 'balanced';
    else if (this.currentStrategy === 'aggro') this.currentStrategy = 'midrange';
  } else if (outcome === 'loss') {
    if (this.currentStrategy === 'aggro') this.currentStrategy = 'control';
    else if (this.currentStrategy === 'midrange') this.currentStrategy = 'aggro';
  }
  return { success: true, newStrategy: this.currentStrategy };
};

AdaptiveStrategyEngine.prototype.getStrategyHint = function(opponentId, boardState) {
  if (!opponentId) return { strategy: this.currentStrategy, hint: 'default' };
  var oppSummary = this.opponentTracker ? this.opponentTracker.getOpponentSummary(opponentId) : null;
  if (!oppSummary) return { strategy: this.currentStrategy, hint: 'no_data' };
  var archetype = oppSummary.archetype;
  if (archetype === 'aggro') return { strategy: 'control', hint: 'opponent_aggro' };
  if (archetype === 'control') return { strategy: 'aggro', hint: 'opponent_control' };
  if (archetype === 'combo') return { strategy: 'control', hint: 'opponent_combo' };
  return { strategy: 'midrange', hint: 'opponent_midrange' };
};

AdaptiveStrategyEngine.prototype.getHistoryLength = function() {
  return this.strategyHistory.length;
};

window.AdaptiveStrategyEngine = AdaptiveStrategyEngine;
